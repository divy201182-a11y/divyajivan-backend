import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { config } from '../config';

// ── AppError ───────────────────────────────────────────────────────

/**
 * Custom error class for application-level errors.
 *
 * - `statusCode`    — HTTP status code (e.g. 400, 404, 500)
 * - `errorCode`     — Machine-readable code (e.g. "VALIDATION_ERROR")
 * - `isOperational` — true = expected error whose message is safe to show;
 *                     false = unexpected / programmer error.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    // Maintain proper prototype chain (needed when targeting ES5)
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture the stack trace, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Error handler (must have 4 params so Express treats it as error MW) ──

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Defaults for unknown errors
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred.';
  let isOperational = false;

  // If it's our custom AppError, use its properties
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Always log the error
  logger.error(`[${errorCode}] ${err?.message ?? 'Unknown error'}`, {
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Build the response body
  const responseBody: Record<string, unknown> = {
    success: false,
    error: {
      code: errorCode,
      // In production, hide details for non-operational (unexpected) errors
      message: isOperational || config.nodeEnv === 'development' ? message : 'An unexpected error occurred.',
    },
  };

  // In development, include the stack trace for easier debugging
  if (config.nodeEnv === 'development') {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

// ── 404 handler ────────────────────────────────────────────────────

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

// ── Async handler wrapper ──────────────────────────────────────────

/**
 * Wraps an async route handler so that any rejected promise is
 * automatically forwarded to Express's error-handling middleware.
 *
 * Usage:
 *   router.get('/items', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
