'use strict';

/**
 * Sirf demo/test ke liye -- CPU ko jaan-boojh kar garam karta hai taaki 70% wala
 * restart trigger hote hue dekha ja sake.
 *
 * Ye worker thread me chalta hai, isliye main thread ka event loop block nahi hota:
 * server requests serve karta rehta hai jabki process CPU chadhta hai.
 * (process.cpuUsage() saare threads ka CPU ginti hai.)
 */

const { workerData } = require('worker_threads');

const until = Date.now() + (workerData.durationMs || 10000);
let x = 0;
while (Date.now() < until) {
  x += Math.sqrt(Math.random() * 1e9);
}
process.exitCode = 0;
