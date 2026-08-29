import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import uploadRoutes from './routes/upload.routes';
import statsRoutes from './routes/stats.routes';
import cpuRoutes from './routes/cpu.routes';
import policyRoutes from './routes/policy.routes';
import messageRoutes from './routes/message.routes';
import specRoutes from './routes/spec.routes';
import { HttpError } from './lib/http-error';

const app = express();

app.set('trust proxy', 1); // correct client IP behind a proxy, so rate limiting counts the right one

// Security headers. CSP allows inline script/style because the bundled test console is a single file.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Blunt abuse guard -- generous enough that polling clients and the smoke test never hit it.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX || 1000),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many requests, please try again later' },
  })
);

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

app.use('/', specRoutes); // /upload /search /aggregate /scheduleMessage -- the brief's exact URLs

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
