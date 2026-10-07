const User = require('../models/user.model');
const { verifyToken } = require('../utils/token');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication middleware to verify JWT tokens and authenticate requests.
 * Extracts Bearer token from the Authorization header, validates signature & expiration,
 * verifies user existence & active status in database, and attaches the user document to `req.user`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Verify Authorization header exists and follows Bearer scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required. Please provide a Bearer token in the Authorization header.');
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    throw ApiError.unauthorized('Authentication token is missing');
  }

  // Verify token signature, validity, and expiration (throws ApiError.unauthorized on failure)
  const decoded = verifyToken(token);

  const userId = decoded.id || decoded._id || decoded.sub;
  if (!userId) {
    throw ApiError.unauthorized('Invalid authentication token payload');
  }

  // Retrieve user from database (password excluded by default via schema select: false)
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('The user belonging to this authentication token no longer exists');
  }

  // Check if user account is active
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
  }

  // Attach user and token context to request object
  req.user = user;
  req.token = token;
  req.auth = decoded;

  next();
});

/**
 * Alias for authenticate middleware.
 */
const protect = authenticate;

/**
 * Role-based authorization middleware generator.
 * Restricts access to authenticated users who possess one of the allowed roles.
 *
 * @param {...string} roles - Allowed user roles (e.g. 'admin', 'user')
 * @returns {import('express').RequestHandler} Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required before authorization check'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden('You do not have permission to perform this action')
      );
    }

    next();
  };
};

/**
 * Alias for authorize middleware.
 */
const restrictTo = authorize;

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided, attaches the authenticated user to `req.user`.
 * If no token is provided or the token is invalid/expired, continues with `req.user = null` without failing.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const userId = decoded.id || decoded._id || decoded.sub;

    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      req.user = null;
      return next();
    }

    req.user = user;
    req.token = token;
    req.auth = decoded;
  } catch {
    // Silently proceed without user context for optional auth
    req.user = null;
  }

  next();
});

module.exports = {
  authenticate,
  protect,
  authorize,
  restrictTo,
  optionalAuth
};
