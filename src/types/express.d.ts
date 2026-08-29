// Adds req.valid, populated by the validate() middleware.
declare global {
  namespace Express {
    interface Request {
      valid?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
