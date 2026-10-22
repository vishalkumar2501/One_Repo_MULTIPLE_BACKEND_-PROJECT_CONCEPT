const User = require('../models/user.model');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');
const { ROLE_HIERARCHY } = require('../models/user.model');

// ── Authentication Middleware ───────────────────────────────────────────

/**
 * Verifies the Bearer JWT token from the Authorization header,
 * attaches the authenticated user to `req.user`.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required. Please provide a valid token.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw ApiError.unauthorized('Authentication token is missing');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid or malformed authentication token');
  }

  // Verify user still exists and is active
  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists');
  }

  if (user.accountStatus !== 'active') {
    throw ApiError.forbidden('Your account has been suspended or deactivated');
  }

  // Attach user payload to request
  req.user = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name
  };

  next();
});

// ── RBAC Authorization Middleware ───────────────────────────────────────

/**
 * Restrict access to specific roles.
 * Accepts one or more role strings. The user must have at least one of
 * the listed roles.
 *
 * @param {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 *
 * @example
 *   router.delete('/posts/:id', authenticate, authorize('admin', 'moderator'), deletePost);
 */
const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.role) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

/**
 * Require the user's role to be at or above a minimum level
 * in the role hierarchy.
 *
 * @param {string} minRole - Minimum role required
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get('/admin/dashboard', authenticate, requireMinRole('moderator'), dashboard);
 */
const requireMinRole = (minRole) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.role) {
      throw ApiError.unauthorized('Authentication required');
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      throw ApiError.forbidden(
        `Access denied. Minimum role required: ${minRole}. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requireMinRole
};
