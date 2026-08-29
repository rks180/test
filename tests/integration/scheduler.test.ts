import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { startDb, stopDb, clearDb } from '../setup-db';
import { MessageScheduler } from '../../src/services/scheduler';
import { Message } from '../../src/models';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const scheduler = new MessageScheduler();
const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

describe('Task 2.2 -- delivery poller', () => {
  it('delivers only messages whose sendAt has passed', async () => {
    const due = await Message.create({ message: 'due', day: '2026-01-01', time: '09:00', sendAt: minutesFromNow(-5) });
    const later = await Message.create({ message: 'later', day: '2027-01-01', time: '09:00', sendAt: minutesFromNow(60) });

    await scheduler.tick();

    const delivered = await Message.findById(due._id);
    expect(delivered?.status).toBe('sent');
    expect(delivered?.sentAt).toBeInstanceOf(Date);
    expect((await Message.findById(later._id))?.status).toBe('scheduled');
  });

  it('claims each message once, so a second tick does not re-send it', async () => {
    const due = await Message.create({ message: 'once', day: '2026-01-01', time: '09:00', sendAt: minutesFromNow(-1) });

    await scheduler.tick();
    const firstSentAt = (await Message.findById(due._id))!.sentAt;

    await scheduler.tick();
    expect((await Message.findById(due._id))!.sentAt).toEqual(firstSentAt);
  });

  it('drains a backlog in one tick', async () => {
    await Message.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        message: `backlog ${i}`, day: '2026-01-01', time: '09:00', sendAt: minutesFromNow(-i - 1),
      }))
    );

    await scheduler.tick();
    expect(await Message.countDocuments({ status: 'sent' })).toBe(5);
  });

  it('never runs two ticks concurrently', async () => {
    await Message.create({ message: 'overlap', day: '2026-01-01', time: '09:00', sendAt: minutesFromNow(-1) });
    await Promise.all([scheduler.tick(), scheduler.tick()]);
    expect(await Message.countDocuments({ status: 'sent' })).toBe(1);
  });
});
