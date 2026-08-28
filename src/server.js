'use strict';

require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { monitor } = require('./services/monitor');

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT} (pid ${process.pid})`);
  });

  // Task 2.1 -- real-time CPU tracking chalu
  monitor.start();
  console.log(`[cpu] monitor chalu | threshold ${monitor.threshold}% | har ${monitor.intervalMs}ms`);

  // SIGTERM pe naye connections lena band karo, chalti requests poori hone do
  process.on('SIGTERM', () => {
    console.log(`[server] SIGTERM mila (pid ${process.pid}) -- graceful shutdown`);
    monitor.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

start().catch((err) => {
  console.error('[server] startup failed:', err.message);
  process.exit(1);
});
