import { describe, it, expect } from 'vitest';
import { CpuMonitor, CpuPoint } from '../../src/utils/cpuMonitor';

const reading = (processCpu: number): CpuPoint => ({
  at: new Date().toISOString(),
  processCpu,
  systemCpu: 0,
  rssMb: 0,
  heapUsedMb: 0,
  systemMemUsedPct: 0,
  pid: process.pid,
});

describe('CpuMonitor', () => {
  it('reports a usable sample', () => {
    const m = new CpuMonitor({});
    const p = m.sample();
    expect(p.processCpu).toBeGreaterThanOrEqual(0);
    expect(p.pid).toBe(process.pid);
    expect(m.latest()).toEqual(p);
  });

  it('fires "threshold" only after N consecutive breaching samples', () => {
    const m = new CpuMonitor({ threshold: 70, consecutive: 3 });
    const fired: number[] = [];
    m.on('threshold', (p) => fired.push(p.processCpu));

    const feed = (v: number) => m.track(reading(v));

    feed(95);
    feed(95);
    expect(fired).toHaveLength(0); // two breaches is not enough
    feed(10); // a dip resets the counter
    feed(95);
    feed(95);
    expect(fired).toHaveLength(0);
    feed(95);
    expect(fired).toEqual([95]);
  });

  it('caps history at historySize', () => {
    const m = new CpuMonitor({ historySize: 3 });
    for (let i = 0; i < 10; i++) m.sample();
    expect(m.history).toHaveLength(3);
  });

  it('exposes its config in the snapshot', () => {
    const m = new CpuMonitor({ threshold: 70, consecutive: 3, intervalMs: 2000 });
    const s = m.snapshot();
    expect(s).toMatchObject({ threshold: 70, consecutiveNeeded: 3, intervalMs: 2000 });
  });
});
