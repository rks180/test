'use strict';

const path = require('path');
const { Worker } = require('worker_threads');

const { monitor } = require('../services/monitor');

/** GET /api/cpu -- live CPU + memory reading plus recent sample history. */
function cpu(req, res) {
  // Take a fresh sample at request time so the number is not stale.
  monitor.sample();
  res.json(monitor.snapshot());
}

// POST /api/cpu/stress { seconds } -- demo helper: pushes CPU past the threshold to show the restart.
function stress(req, res) {
  const seconds = Math.min(Math.max(Number(req.body?.seconds) || 10, 1), 30);

  const worker = new Worker(path.join(__dirname, '..', 'workers', 'stress.worker.js'), {
    workerData: { durationMs: seconds * 1000 },
  });
  worker.unref();

  res.json({
    message: `Applied CPU load for ${seconds}s (in a worker thread)`,
    threshold: monitor.threshold,
    watch: 'GET /api/cpu for the live reading',
  });
}

module.exports = { cpu, stress };
