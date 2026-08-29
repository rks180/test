import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Wraps an async route handler so a rejected promise reaches the error middleware
// instead of crashing the process -- no try/catch in every controller.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
