'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Worker } = require('worker_threads');

const WORKER_PATH = path.join(__dirname, '..', 'workers', 'import.worker.js');

// In-memory job registry, one upload = one worker thread (Redis/DB in production; fine for this scope).
const jobs = new Map();

const MAX_CONCURRENT = Number(process.env.MAX_IMPORT_WORKERS || 2);
let running = 0;
const queue = [];

function createJob(filePath, originalName) {
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

function drain() {
  while (running < MAX_CONCURRENT && queue.length) {
    const next = queue.shift();
    running++;
    spawn(next.id, next.filePath);
  }
}

function spawn(id, filePath) {
  const job = jobs.get(id);
  job.status = 'running';
  job.startedAt = new Date().toISOString();

  const worker = new Worker(WORKER_PATH, {
    workerData: {
      filePath,
      mongoUri: process.env.MONGO_URI,
      batchSize: Number(process.env.IMPORT_BATCH_SIZE || 500),
    },
  });

  worker.on('message', (msg) => {
    if (msg.type === 'progress') {
      job.stats = msg.stats;
    } else if (msg.type === 'done') {
      job.stats = msg.stats;
      job.status = 'completed';
      job.finishedAt = new Date().toISOString();
    } else if (msg.type === 'error') {
      job.status = 'failed';
      job.error = msg.message;
      job.finishedAt = new Date().toISOString();
    }
  });

  worker.on('error', (err) => {
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

const getJob = (id) => jobs.get(id) || null;
const listJobs = () => [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

module.exports = { createJob, getJob, listJobs };
