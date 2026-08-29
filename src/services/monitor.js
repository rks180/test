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
      `(${monitor.consecutive} consecutive samples) -- restart required`
  );

  if (cluster.isWorker) {
    process.send({ type: 'cpu-threshold', ...point }); // primary does the zero-downtime restart
  } else {
    // Standalone mode can't self-restart; real restart happens under `npm start` (cluster).
    console.warn('[cpu] standalone mode -- use `npm start` (cluster) for an actual restart');
    restartRequested = false;
  }
});

module.exports = { monitor };
