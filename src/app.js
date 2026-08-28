'use strict';

const path = require('path');
const express = require('express');

const uploadRoutes = require('./routes/upload.routes');
const statsRoutes = require('./routes/stats.routes');
const cpuRoutes = require('./routes/cpu.routes');

const app = express();
app.use(express.json());

// Browser test console -> http://localhost:3000/
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), pid: process.pid });
});

app.use('/api', uploadRoutes);
app.use('/api', statsRoutes);
app.use('/api', cpuRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler (multer ke errors bhi yahi aate hain)
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 400).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
