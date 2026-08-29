import type { Request, Response } from 'express';
import { createJob, getJob, listJobs } from '../services/importJobs';
import { BadRequestError, NotFoundError } from '../lib/http-error';

// Task 1.1 -- POST /api/upload: returns 202 immediately, parsing runs in a background worker thread.
export function upload(req: Request, res: Response): void {
  if (!req.file) throw new BadRequestError('A file is required (field name: "file")');

  const jobId = createJob(req.file.path, req.file.originalname);
  res.status(202).json({
    message: 'Upload accepted, processing in a worker thread',
    jobId,
    statusUrl: `/api/upload/${jobId}`,
  });
}

export function status(req: Request, res: Response): void {
  const job = getJob(String(req.params.jobId));
  if (!job) throw new NotFoundError('Job not found');
  res.json(job);
}

export function list(_req: Request, res: Response): void {
  const jobs = listJobs();
  res.json({ count: jobs.length, jobs });
}
