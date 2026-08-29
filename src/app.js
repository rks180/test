'use strict';

const path = require('path');
const express = require('express');

const uploadRoutes = require('./routes/upload.routes');
const statsRoutes = require('./routes/stats.routes');
const cpuRoutes = require('./routes/cpu.routes');
const policyRoutes = require('./routes/policy.routes');
const messageRoutes = require('./routes/message.routes');

const app = express();
app.use(express.json());

// Browser test console -> http://localhost:3000/
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), pid: process.pid });
});

app.use('/api', uploadRoutes); // Task 1.1
app.use('/api', policyRoutes); // Task 1.2, 1.3
app.use('/api', statsRoutes); // counts + collection browser
app.use('/api', cpuRoutes); // Task 2.1
app.use('/api', messageRoutes); // Task 2.2

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler (multer errors surface here too).
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 400).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
