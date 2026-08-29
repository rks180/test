'use strict';

const { createJob, getJob, listJobs } = require('../services/importJobs');

// Task 1.1 -- POST /api/upload: returns 202 immediately, parsing runs in a background worker thread.
function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'A file is required (field name: "file")' });

  const jobId = createJob(req.file.path, req.file.originalname);

  res.status(202).json({
    message: 'Upload accepted, processing in a worker thread',
    jobId,
    statusUrl: `/api/upload/${jobId}`,
  });
}

function status(req, res) {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
}

function list(req, res) {
  res.json({ count: listJobs().length, jobs: listJobs() });
}

module.exports = { upload, status, list };
