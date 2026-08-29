import cron, { ScheduledTask } from 'node-cron';
import { Message } from '../models';

/**
 * Task 2.2 delivery poller. Runs every minute, marks due messages as "sent".
 * DB-backed (not per-message timers) so it survives restarts; the atomic
 * findOneAndUpdate claim means a clustered deployment never sends one twice.
 */
export class MessageScheduler {
  readonly expression: string;
  private task: ScheduledTask | null = null;
  private running = false;

  constructor({ expression = process.env.MESSAGE_POLL_CRON || '* * * * *' }: { expression?: string } = {}) {
    this.expression = expression;
  }

  start(): this {
    if (this.task) return this;
    this.task = cron.schedule(this.expression, () => this.tick());
    console.log(`[scheduler] message poller started (cron "${this.expression}")`);
    void this.tick(); // catch anything already due at boot
    return this;
  }

  stop(): void {
    void this.task?.stop();
    this.task = null;
  }

  async tick(): Promise<void> {
    if (this.running) return; // never overlap runs
    this.running = true;
    try {
      let delivered = 0;
      // Claim one due message at a time so concurrent workers cannot collide.
      for (;;) {
        const claimed = await Message.findOneAndUpdate(
          { status: 'scheduled', sendAt: { $lte: new Date() } },
          { $set: { status: 'sent', sentAt: new Date() } },
          { sort: { sendAt: 1 }, returnDocument: 'after' }
        );
        if (!claimed) break;
        delivered++;
        console.log(
          `[scheduler] delivered message ${claimed._id.toString()} (scheduled for ${claimed.sendAt.toISOString()})`
        );
      }
      if (delivered) console.log(`[scheduler] tick complete -- ${delivered} message(s) delivered`);
    } catch (err) {
      console.error('[scheduler] tick failed:', (err as Error).message);
    } finally {
      this.running = false;
    }
  }
}

export const scheduler = new MessageScheduler();
export default { scheduler, MessageScheduler };
