'use strict';

/**
 * Production entry point (`npm start`). Primary just keeps a worker alive.
 * On CPU threshold the worker asks the primary to restart; primary forks a NEW
 * worker and kills the old one only once the replacement is "listening" -- zero downtime.
 */

require('dotenv').config();

const cluster = require('cluster');

if (cluster.isPrimary) {
  const THRESHOLD = Number(process.env.CPU_THRESHOLD || 70);
  console.log(`[master] pid ${process.pid} | CPU threshold ${THRESHOLD}%`);

  let restarts = 0;
  let restarting = false;

  cluster.fork();

  cluster.on('message', (worker, msg) => {
    if (!msg || msg.type !== 'cpu-threshold') return;
    if (restarting) return; // one restart at a time
    restarting = true;
    restarts++;

    console.warn(
      `[master] worker ${worker.process.pid} reported ${msg.processCpu}% CPU ` +
        `(>= ${THRESHOLD}%) -- restart #${restarts}`
    );

    const replacement = cluster.fork();

    replacement.once('listening', () => {
      console.log(`[master] new worker ${replacement.process.pid} ready -- shutting down old worker ${worker.process.pid}`);
      worker.kill('SIGTERM');

      // Force-kill if it does not exit gracefully within 5s.
      const force = setTimeout(() => {
        if (!worker.isDead()) worker.process.kill('SIGKILL');
      }, 5000);
      force.unref();

      restarting = false;
    });
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`[master] worker ${worker.process.pid} exit (${signal || 'code ' + code})`);

    // No worker left -> it crashed, fork a fresh one.
    if (Object.keys(cluster.workers).length === 0) {
      console.log('[master] no worker left -- forking a new one');
      cluster.fork();
    }
  });

  const shutdown = () => {
    console.log('\n[master] shutting down...');
    for (const w of Object.values(cluster.workers)) w.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} else {
  require('./server');
}
