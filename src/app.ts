import path from 'path';
import express, { Request, Response, NextFunction } from 'express';

import uploadRoutes from './routes/upload.routes';
import statsRoutes from './routes/stats.routes';
import cpuRoutes from './routes/cpu.routes';
import policyRoutes from './routes/policy.routes';
import messageRoutes from './routes/message.routes';
import { HttpError } from './lib/http-error';

const app = express();
app.use(express.json());

// Browser test console -> http://localhost:3000/
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), pid: process.pid });
});

app.use('/api', uploadRoutes); // Task 1.1
app.use('/api', policyRoutes); // Task 1.2, 1.3
app.use('/api', statsRoutes); // counts + collection browser
app.use('/api', cpuRoutes); // Task 2.1
app.use('/api', messageRoutes); // Task 2.2

// 404
app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Route not found' }));

// Central error handler -- HttpError -> its status; anything else -> 500.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[error]', message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
