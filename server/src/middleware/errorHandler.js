import { ZodError } from 'zod';

export const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to standard Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      error: 'Data validation failed',
      details: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: `Duplicate value for ${field}. Value already exists.`,
    });
  }

  // Mongoose bad ObjectId CastError
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid identifier format: ${err.value}`,
    });
  }

  console.error('[Unhandled Error]', err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
