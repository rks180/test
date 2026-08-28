'use strict';

const os = require('os');
const EventEmitter = require('events');

/**
 * Node server ki real-time CPU utilization track karta hai.
 *
 * Do alag numbers nikaalte hain:
 *   processCpu -- IS node process ne kitna CPU khaya, ek core ke % me (jaise `top` dikhata hai).
 *                 Assignment "CPU utilization of the node server" yahi maang raha hai.
 *   systemCpu  -- poori machine ka CPU, saare cores milakar.
 *
 * Threshold sirf tab fire hota hai jab lagataar `consecutive` samples limit ke upar hon --
 * ek pal ka spike (jaise GC ya ek bhaari request) server ko restart nahi karega.
 */
class CpuMonitor extends EventEmitter {
  constructor({ intervalMs = 5000, threshold = 70, consecutive = 3, historySize = 60 } = {}) {
    super();
    this.intervalMs = intervalMs;
    this.threshold = threshold;
    this.consecutive = consecutive;
    this.historySize = historySize;

    this.history = [];
    this.breaches = 0;
    this.timer = null;

    this.lastCpuUsage = process.cpuUsage();
    this.lastHrTime = process.hrtime.bigint();
    this.lastSystem = this._systemTimes();
  }

  _systemTimes() {
    let idle = 0;
    let total = 0;
    for (const cpu of os.cpus()) {
      for (const t of Object.values(cpu.times)) total += t;
      idle += cpu.times.idle;
    }
    return { idle, total };
  }

  sample() {
    // ---- process CPU (% of one core) ----
    const usage = process.cpuUsage(this.lastCpuUsage); // microseconds
    const nowHr = process.hrtime.bigint();
    const elapsedUs = Number(nowHr - this.lastHrTime) / 1000;

    this.lastCpuUsage = process.cpuUsage();
    this.lastHrTime = nowHr;

    const processCpu = elapsedUs > 0 ? ((usage.user + usage.system) / elapsedUs) * 100 : 0;

    // ---- system CPU (% of all cores) ----
    const nowSys = this._systemTimes();
    const idleDelta = nowSys.idle - this.lastSystem.idle;
    const totalDelta = nowSys.total - this.lastSystem.total;
    this.lastSystem = nowSys;

    const systemCpu = totalDelta > 0 ? (1 - idleDelta / totalDelta) * 100 : 0;

    // ---- memory ----
    const mem = process.memoryUsage();

    const point = {
      at: new Date().toISOString(),
      processCpu: Number(processCpu.toFixed(2)),
      systemCpu: Number(systemCpu.toFixed(2)),
      rssMb: Number((mem.rss / 1048576).toFixed(1)),
      heapUsedMb: Number((mem.heapUsed / 1048576).toFixed(1)),
      systemMemUsedPct: Number((((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1)),
      pid: process.pid,
    };

    this.history.push(point);
    if (this.history.length > this.historySize) this.history.shift();

    this.emit('sample', point);

    // ---- threshold check ----
    if (point.processCpu >= this.threshold) {
      this.breaches++;
      if (this.breaches >= this.consecutive) {
        this.breaches = 0;
        this.emit('threshold', point);
      }
    } else {
      this.breaches = 0; // lagataar hona chahiye, warna reset
    }

    return point;
  }

  start() {
    if (this.timer) return this;
    this.timer = setInterval(() => this.sample(), this.intervalMs);
    this.timer.unref(); // monitor akela process ko zinda na rakhe
    return this;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  latest() {
    return this.history[this.history.length - 1] || null;
  }

  snapshot() {
    return {
      threshold: this.threshold,
      intervalMs: this.intervalMs,
      consecutiveNeeded: this.consecutive,
      consecutiveBreaches: this.breaches,
      cores: os.cpus().length,
      pid: process.pid,
      uptimeSec: Number(process.uptime().toFixed(1)),
      current: this.latest(),
      history: this.history,
    };
  }
}

module.exports = { CpuMonitor };
