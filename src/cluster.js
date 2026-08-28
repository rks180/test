'use strict';

/**
 * Production entry point (`npm start`).
 *
 * Master process koi request handle nahi karta -- wo sirf worker ko zinda rakhta hai.
 * Worker khud apna CPU monitor karta hai; threshold cross hone pe master ko batata hai,
 * master pehle NAYA worker uthata hai aur uske "listening" hone ke baad hi purana
 * band karta hai -- isliye restart ke dauran koi request drop nahi hoti.
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
    if (restarting) return; // ek waqt me ek hi restart
    restarting = true;
    restarts++;

    console.warn(
      `[master] worker ${worker.process.pid} ne ${msg.processCpu}% CPU report kiya ` +
        `(>= ${THRESHOLD}%) -- restart #${restarts}`
    );

    const replacement = cluster.fork();

    replacement.once('listening', () => {
      console.log(`[master] naya worker ${replacement.process.pid} ready -- purana ${worker.process.pid} band kar rahe hain`);
      worker.kill('SIGTERM');

      // agar 5s me graceful exit na ho to force kill
      const force = setTimeout(() => {
        if (!worker.isDead()) worker.process.kill('SIGKILL');
      }, 5000);
      force.unref();

      restarting = false;
    });
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`[master] worker ${worker.process.pid} exit (${signal || 'code ' + code})`);

    // koi worker nahi bacha -> crash tha, naya utha do
    if (Object.keys(cluster.workers).length === 0) {
      console.log('[master] koi worker nahi bacha -- naya fork kar rahe hain');
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
