const config = require('../config/env');

/**
 * Centralized global error handler middleware.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const errorResponse = {
    success: false,
    statusCode,
    message,
    ...(err.details && { details: err.details }),
    ...(!config.isProduction && { stack: err.stack })
  };

  if (statusCode >= 500 && config.env !== 'test') {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
