'use strict';

// Demo only -- burns CPU in a worker thread (main event loop stays free) to trigger the 70% restart.

const { workerData } = require('worker_threads');

const until = Date.now() + (workerData.durationMs || 10000);
let x = 0;
while (Date.now() < until) {
  x += Math.sqrt(Math.random() * 1e9);
}
process.exitCode = 0;
