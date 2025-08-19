// Base application error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// RPC communication errors
export class RPCError extends AppError {
  constructor(message: string, statusCode: number = 502) {
    super(message, statusCode);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

// Simulation errors
export class SimulationError extends AppError {
  constructor(message: string, statusCode: number = 422) {
    super(message, statusCode);
  }
}

// Contract metadata errors
export class ContractMetadataError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

// Rate limiting errors
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

// Error handler utility
export const handleError = (error: Error): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  // Handle axios errors
  if (error.name === 'AxiosError') {
    return new RPCError(`RPC request failed: ${error.message}`);
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message);
  }

  // Default to internal server error
  return new AppError(error.message, 500, false);
};
