import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Forwards a rejected promise from an async handler to the error middleware -- no try/catch per controller.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
