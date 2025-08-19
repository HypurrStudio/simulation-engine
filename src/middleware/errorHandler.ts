import { Request, Response, NextFunction } from 'express';
import { AppError, handleError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Error handling middleware for Express
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Convert to AppError if it's not already
  const appError = handleError(error);

  // Send error response
  res.status(appError.statusCode).json({
    error: {
      message: appError.message,
      statusCode: appError.statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
