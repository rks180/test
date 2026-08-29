// Typed HTTP errors -- controllers `throw` these, the central error handler turns them into JSON.

export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.details = details;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found', details?: unknown) {
    super(404, message, details);
  }
}
