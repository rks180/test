'use strict';

const cluster = require('cluster');
const { CpuMonitor } = require('../utils/cpuMonitor');

const monitor = new CpuMonitor({
  intervalMs: Number(process.env.CPU_SAMPLE_INTERVAL_MS || 2000),
  threshold: Number(process.env.CPU_THRESHOLD || 70),
  consecutive: Number(process.env.CPU_CONSECUTIVE_SAMPLES || 3),
});

let restartRequested = false;

monitor.on('threshold', (point) => {
  if (restartRequested) return;
  restartRequested = true;

  console.warn(
    `[cpu] ${point.processCpu}% >= ${monitor.threshold}% threshold ` +
      `(lagataar ${monitor.consecutive} samples) -- restart chahiye`
  );

  if (cluster.isWorker) {
    // Master ko bolo. Wo pehle naya worker uthayega, phir ise band karega (zero downtime).
    process.send({ type: 'cpu-threshold', ...point });
  } else {
    // Standalone mode: khud restart nahi kar sakte, isliye sirf warn karte hain.
    // `npm start` (cluster mode) me asli restart hota hai.
    console.warn('[cpu] standalone mode -- restart ke liye `npm start` (cluster) use karo');
    restartRequested = false;
  }
});

module.exports = { monitor };
