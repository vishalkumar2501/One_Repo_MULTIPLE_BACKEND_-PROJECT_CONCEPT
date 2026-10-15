const ApiError = require('../utils/apiError');

/**
 * 404 handler middleware for unmatched routes.
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Cannot find endpoint [${req.method}] ${req.originalUrl} on this server`));
};

module.exports = notFoundHandler;
