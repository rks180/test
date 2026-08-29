import 'dotenv/config';

import app from './app';
import { connectDB } from './config/db';
import { monitor } from './services/monitor';
import { scheduler } from './services/scheduler';

const PORT = Number(process.env.PORT) || 3000;

async function start(): Promise<void> {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT} (pid ${process.pid})`);
  });

  // Task 2.1 -- start real-time CPU tracking.
  monitor.start();
  console.log(`[cpu] monitor started | threshold ${monitor.threshold}% | every ${monitor.intervalMs}ms`);

  // Task 2.2 -- start the scheduled-message delivery poller.
  scheduler.start();

  // On SIGTERM stop accepting new connections and let in-flight requests finish.
  process.on('SIGTERM', () => {
    console.log(`[server] SIGTERM received (pid ${process.pid}) -- graceful shutdown`);
    monitor.stop();
    scheduler.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

start().catch((err: Error) => {
  console.error('[server] startup failed:', err.message);
  process.exit(1);
});
