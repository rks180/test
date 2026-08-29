import os from 'os';
import { EventEmitter } from 'events';

export interface CpuPoint {
  at: string;
  processCpu: number;
  systemCpu: number;
  rssMb: number;
  heapUsedMb: number;
  systemMemUsedPct: number;
  pid: number;
}

export interface CpuSnapshot {
  threshold: number;
  intervalMs: number;
  consecutiveNeeded: number;
  consecutiveBreaches: number;
  cores: number;
  pid: number;
  uptimeSec: number;
  current: CpuPoint | null;
  history: CpuPoint[];
}

export interface CpuMonitorOptions {
  intervalMs?: number;
  threshold?: number;
  consecutive?: number;
  historySize?: number;
}

// Task 2.1 -- CPU tracking. processCpu = this process (% of one core); threshold fires after `consecutive` breaching samples, not a one-off spike.
export class CpuMonitor extends EventEmitter {
  readonly intervalMs: number;
  readonly threshold: number;
  readonly consecutive: number;
  readonly historySize: number;

  history: CpuPoint[] = [];
  breaches = 0;
  private timer: NodeJS.Timeout | null = null;

  private lastCpuUsage: NodeJS.CpuUsage;
  private lastHrTime: bigint;
  private lastSystem: { idle: number; total: number };

  constructor({ intervalMs = 5000, threshold = 70, consecutive = 3, historySize = 60 }: CpuMonitorOptions = {}) {
    super();
    this.intervalMs = intervalMs;
    this.threshold = threshold;
    this.consecutive = consecutive;
    this.historySize = historySize;

    this.lastCpuUsage = process.cpuUsage();
    this.lastHrTime = process.hrtime.bigint();
    this.lastSystem = this.systemTimes();
  }

  private systemTimes(): { idle: number; total: number } {
    let idle = 0;
    let total = 0;
    for (const cpu of os.cpus()) {
      for (const t of Object.values(cpu.times)) total += t;
      idle += cpu.times.idle;
    }
    return { idle, total };
  }

  sample(): CpuPoint {
    // ---- process CPU (% of one core) ----
    const usage = process.cpuUsage(this.lastCpuUsage); // microseconds
    const nowHr = process.hrtime.bigint();
    const elapsedUs = Number(nowHr - this.lastHrTime) / 1000;

    this.lastCpuUsage = process.cpuUsage();
    this.lastHrTime = nowHr;

    const processCpu = elapsedUs > 0 ? ((usage.user + usage.system) / elapsedUs) * 100 : 0;

    // ---- system CPU (% of all cores) ----
    const nowSys = this.systemTimes();
    const idleDelta = nowSys.idle - this.lastSystem.idle;
    const totalDelta = nowSys.total - this.lastSystem.total;
    this.lastSystem = nowSys;

    const systemCpu = totalDelta > 0 ? (1 - idleDelta / totalDelta) * 100 : 0;

    // ---- memory ----
    const mem = process.memoryUsage();

    const point: CpuPoint = {
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
      this.breaches = 0; // must be consecutive, otherwise reset
    }

    return point;
  }

  start(): this {
    if (this.timer) return this;
    this.timer = setInterval(() => this.sample(), this.intervalMs);
    this.timer.unref(); // the monitor alone should not keep the process alive
    return this;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  latest(): CpuPoint | null {
    return this.history[this.history.length - 1] ?? null;
  }

  snapshot(): CpuSnapshot {
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
