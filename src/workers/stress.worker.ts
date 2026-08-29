// Demo only -- burns CPU in a worker thread (main event loop stays free) to trigger the 70% restart.
import { workerData } from 'worker_threads';

const durationMs: number = (workerData?.durationMs as number) || 10000;
const until = Date.now() + durationMs;
let x = 0;
while (Date.now() < until) {
  x += Math.sqrt(Math.random() * 1e9);
}
void x;
process.exitCode = 0;
