import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType, ZodError } from 'zod';
import { BadRequestError } from './http-error';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

// Validates + coerces req.body/query/params against zod schemas; parsed values land on req.valid.
export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.valid = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
      };
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new BadRequestError('Validation failed', err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }))));
        return;
      }
      next(err);
    }
  };
}
