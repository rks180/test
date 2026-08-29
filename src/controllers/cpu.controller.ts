import path from 'path';
import { Worker } from 'worker_threads';
import { Request, Response } from 'express';
import { monitor } from '../services/monitor';
import type { StressBody } from '../validators/cpu.schema';

const STRESS_WORKER = path.join(__dirname, '..', 'workers', 'stress.worker.js');

/** GET /api/cpu -- live CPU + memory reading plus recent sample history. */
export function cpu(_req: Request, res: Response): void {
  // Take a fresh sample at request time so the number is not stale.
  monitor.sample();
  res.json(monitor.snapshot());
}

// POST /api/cpu/stress { seconds } -- demo helper: pushes CPU past the threshold to show the restart.
export function stress(req: Request, res: Response): void {
  const { seconds } = req.valid!.body as StressBody;

  const worker = new Worker(STRESS_WORKER, { workerData: { durationMs: seconds * 1000 } });
  worker.unref();

  res.json({
    message: `Applied CPU load for ${seconds}s (in a worker thread)`,
    threshold: monitor.threshold,
    watch: 'GET /api/cpu for the live reading',
  });
}

export default { cpu, stress };
