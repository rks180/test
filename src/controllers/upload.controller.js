'use strict';

const { createJob, getJob, listJobs } = require('../services/importJobs');

/**
 * POST /api/upload
 * File le kar turant 202 return karta hai -- parsing worker thread me background me chalti hai.
 */
function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'File chahiye (field name: "file")' });

  const jobId = createJob(req.file.path, req.file.originalname);

  res.status(202).json({
    message: 'Upload accept ho gaya, worker thread me process ho raha hai',
    jobId,
    statusUrl: `/api/upload/${jobId}`,
  });
}

function status(req, res) {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job nahi mila' });
  res.json(job);
}

function list(req, res) {
  res.json({ count: listJobs().length, jobs: listJobs() });
}

module.exports = { upload, status, list };
