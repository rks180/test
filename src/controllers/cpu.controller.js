'use strict';

const path = require('path');
const { Worker } = require('worker_threads');

const { monitor } = require('../services/monitor');

/** GET /api/cpu -- live CPU + memory reading aur pichhle samples ki history. */
function cpu(req, res) {
  // response ke waqt ek fresh sample le lo, taaki number stale na ho
  monitor.sample();
  res.json(monitor.snapshot());
}

/**
 * POST /api/cpu/stress { seconds }
 * Demo helper: CPU ko threshold ke upar le jata hai taaki restart dikhaya ja sake.
 */
function stress(req, res) {
  const seconds = Math.min(Math.max(Number(req.body?.seconds) || 10, 1), 30);

  const worker = new Worker(path.join(__dirname, '..', 'workers', 'stress.worker.js'), {
    workerData: { durationMs: seconds * 1000 },
  });
  worker.unref();

  res.json({
    message: `${seconds}s ke liye CPU load daala gaya (worker thread me)`,
    threshold: monitor.threshold,
    watch: 'GET /api/cpu se live reading dekho',
  });
}

module.exports = { cpu, stress };
