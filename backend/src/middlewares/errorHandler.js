import logger from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error('Unhandled error occurred during request:', err);

  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific MongoDB errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Database Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate key error: A record with this unique value already exists.'
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  res.status(statusCode).json({
    success: false,
    message
  });
}
