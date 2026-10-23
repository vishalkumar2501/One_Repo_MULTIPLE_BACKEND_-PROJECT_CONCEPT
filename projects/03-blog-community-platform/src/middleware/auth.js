const User = require('../models/user.model');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');
const { ROLE_HIERARCHY } = require('../models/user.model');

// ── Granular RBAC Permissions Registry ──────────────────────────────────────

const ROLE_PERMISSIONS = Object.freeze({
  user: Object.freeze([
    'read:articles',
    'create:comment',
    'react:article',
    'react:comment'
  ]),
  author: Object.freeze([
    'read:articles',
    'create:comment',
    'react:article',
    'react:comment',
    'create:article',
    'edit:own_article',
    'delete:own_article',
    'publish:own_article'
  ]),
  moderator: Object.freeze([
    'read:articles',
    'create:comment',
    'react:article',
    'react:comment',
    'create:article',
    'edit:own_article',
    'delete:own_article',
    'publish:own_article',
    'moderate:comment',
    'delete:any_comment',
    'manage:tags'
  ]),
  admin: Object.freeze([
    'read:articles',
    'create:comment',
    'react:article',
    'react:comment',
    'create:article',
    'edit:own_article',
    'delete:own_article',
    'publish:own_article',
    'moderate:comment',
    'delete:any_comment',
    'manage:tags',
    'manage:categories',
    'manage:users',
    'assign:role',
    'delete:any_article'
  ])
});

/**
 * Checks whether a given role holds a specific permission.
 *
 * @param {string} role - RBAC role name
 * @param {string} permission - Permission identifier
 * @returns {boolean} True if permitted
 */
const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

// ── Authentication Middleware ───────────────────────────────────────────

/**
 * Verifies the Bearer JWT token from the Authorization header,
 * checks user existence & account status, and attaches the user context to `req.user`.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required. Please provide a valid Bearer token in the Authorization header.');
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
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

  const userId = decoded.id || decoded._id || decoded.sub;
  if (!userId) {
    throw ApiError.unauthorized('Invalid authentication token payload');
  }

  // Verify user still exists and is active
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists');
  }

  if (user.accountStatus !== 'active') {
    throw ApiError.forbidden('Your account has been suspended or deactivated');
  }

  // Attach user payload and auth context to request
  req.user = {
    id: user._id.toString(),
    _id: user._id,
    email: user.email,
    role: user.role,
    name: user.name,
    accountStatus: user.accountStatus
  };
  req.token = token;
  req.auth = decoded;

  next();
});

/**
 * Alias for authenticate middleware.
 */
const protect = authenticate;

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided, attaches `req.user`.
 * If no token or invalid token, sets `req.user = null` and proceeds without failing.
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
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
    if (!user || user.accountStatus !== 'active') {
      req.user = null;
      return next();
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      accountStatus: user.accountStatus
    };
    req.token = token;
    req.auth = decoded;
  } catch {
    req.user = null;
  }

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
 * Alias for authorize middleware.
 */
const restrictTo = authorize;

/**
 * Require the user's role to be at or above a minimum level
 * in the role hierarchy.
 *
 * @param {string} minRole - Minimum role required
 * @returns {Function} Express middleware
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

/**
 * Require the user to have a specific permission based on their RBAC role.
 *
 * @param {string} permission - Required permission string (e.g. 'create:article')
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.role) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!hasPermission(req.user.role, permission)) {
      throw ApiError.forbidden(
        `Access denied. Missing required permission: "${permission}"`
      );
    }

    next();
  };
};

/**
 * Restricts access to the resource owner or users with privileged roles (e.g. admin, moderator).
 * Compares `req.user.id` with `req.params[paramKey]`.
 *
 * @param {string} [paramKey='userId'] - URL parameter key representing owner's ID
 * @param {string[]} [allowedRoles=['admin']] - Privileged roles that bypass ownership
 * @returns {Function} Express middleware
 */
const requireOwnerOrRole = (paramKey = 'userId', allowedRoles = ['admin']) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.id) {
      throw ApiError.unauthorized('Authentication required');
    }

    const resourceOwnerId = req.params[paramKey];
    const isOwner = resourceOwnerId && (req.user.id === resourceOwnerId.toString());
    const hasPrivilegedRole = allowedRoles.includes(req.user.role);

    if (!isOwner && !hasPrivilegedRole) {
      throw ApiError.forbidden('Access denied. You can only access or modify your own resources.');
    }

    next();
  };
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  authenticate,
  protect,
  optionalAuth,
  authorize,
  restrictTo,
  requireMinRole,
  requirePermission,
  requireOwnerOrRole
};
