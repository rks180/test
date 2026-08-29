import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Worker } from 'worker_threads';

export interface ImportStats {
  rowsRead: number;
  rowsSkipped: number;
  agents: number;
  carriers: number;
  lobs: number;
  users: number;
  accounts: number;
  policies: number;
  errors: Array<Record<string, unknown>>;
}

export interface ImportJob {
  id: string;
  file: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stats: ImportStats | null;
  error: string | null;
  createdAt: string;
  startedAt?: string;
  finishedAt: string | null;
}

interface WorkerMessage {
  type: 'progress' | 'done' | 'error';
  stats?: ImportStats;
  message?: string;
}

// dev + prod both run from dist/, so this resolves the same either way.
const WORKER_PATH = path.join(__dirname, '..', 'workers', 'import.worker.js');

// In-memory job registry, one upload = one worker thread (Redis/DB in production; fine for this scope).
const jobs = new Map<string, ImportJob>();

const MAX_CONCURRENT = Number(process.env.MAX_IMPORT_WORKERS || 2);
let running = 0;
const queue: Array<{ id: string; filePath: string }> = [];

export function createJob(filePath: string, originalName: string): string {
  const id = crypto.randomUUID();
  jobs.set(id, {
    id,
    file: originalName,
    status: 'queued',
    stats: null,
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  });

  queue.push({ id, filePath });
  drain();
  return id;
}

function drain(): void {
  while (running < MAX_CONCURRENT && queue.length) {
    const next = queue.shift()!;
    running++;
    spawn(next.id, next.filePath);
  }
}

function spawn(id: string, filePath: string): void {
  const job = jobs.get(id)!;
  job.status = 'running';
  job.startedAt = new Date().toISOString();

  const worker = new Worker(WORKER_PATH, {
    workerData: {
      filePath,
      mongoUri: process.env.MONGO_URI,
      batchSize: Number(process.env.IMPORT_BATCH_SIZE || 500),
    },
  });

  worker.on('message', (msg: WorkerMessage) => {
    if (msg.type === 'progress') {
      job.stats = msg.stats ?? job.stats;
    } else if (msg.type === 'done') {
      job.stats = msg.stats ?? job.stats;
      job.status = 'completed';
      job.finishedAt = new Date().toISOString();
    } else if (msg.type === 'error') {
      job.status = 'failed';
      job.error = msg.message ?? 'unknown error';
      job.finishedAt = new Date().toISOString();
    }
  });

  worker.on('error', (err: Error) => {
    job.status = 'failed';
    job.error = err.message;
    job.finishedAt = new Date().toISOString();
  });

  worker.on('exit', (code) => {
    if (code !== 0 && job.status === 'running') {
      job.status = 'failed';
      job.error = `Worker exit code ${code}`;
    }
    if (job.status === 'running') job.status = 'completed';
    job.finishedAt = job.finishedAt || new Date().toISOString();

    // Clean up the uploaded file.
    fs.unlink(filePath, () => {});

    running--;
    drain();
  });
}

export const getJob = (id: string): ImportJob | null => jobs.get(id) || null;
export const listJobs = (): ImportJob[] =>
  [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
