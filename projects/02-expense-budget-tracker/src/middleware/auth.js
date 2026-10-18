const User = require('../models/user.model');
const { verifyToken } = require('../utils/token');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication middleware to verify JWT tokens and authenticate incoming requests.
 * Extracts Bearer token from Authorization header, validates signature & expiration,
 * verifies user existence & active status in database, and attaches user to `req.user`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required. Please provide a Bearer token in the Authorization header.');
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    throw ApiError.unauthorized('Authentication token is missing');
  }

  const decoded = verifyToken(token);
  const userId = decoded.id || decoded._id || decoded.sub;

  if (!userId) {
    throw ApiError.unauthorized('Invalid authentication token payload');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('The user belonging to this authentication token no longer exists');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
  }

  req.user = user;
  req.token = token;
  req.auth = decoded;

  next();
});

/**
 * Authorization middleware for Role-Based Access Control (RBAC).
 *
 * @param {...string} roles - Permitted user roles
 * @returns {Function} Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required before checking permissions'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Access forbidden. Role '${req.user.role}' is not authorized to access this resource.`)
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  protect: authenticate,
  authorize
};
