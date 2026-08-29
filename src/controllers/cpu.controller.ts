import path from 'path';
import { Worker } from 'worker_threads';
import { Request, Response } from 'express';
import { monitor } from '../services/monitor';

// Always run the compiled worker (see note in services/importJobs.ts).
const WORKERS_DIR = __filename.endsWith('.ts')
  ? path.join(__dirname, '..', '..', 'dist', 'workers')
  : path.join(__dirname, '..', 'workers');
const STRESS_WORKER = path.join(WORKERS_DIR, 'stress.worker.js');

/** GET /api/cpu -- live CPU + memory reading plus recent sample history. */
export function cpu(_req: Request, res: Response): void {
  // Take a fresh sample at request time so the number is not stale.
  monitor.sample();
  res.json(monitor.snapshot());
}

// POST /api/cpu/stress { seconds } -- demo helper: pushes CPU past the threshold to show the restart.
export function stress(req: Request, res: Response): void {
  const seconds = Math.min(Math.max(Number(req.body?.seconds) || 10, 1), 30);

  const worker = new Worker(STRESS_WORKER, { workerData: { durationMs: seconds * 1000 } });
  worker.unref();

  res.json({
    message: `Applied CPU load for ${seconds}s (in a worker thread)`,
    threshold: monitor.threshold,
    watch: 'GET /api/cpu for the live reading',
  });
}

export default { cpu, stress };
