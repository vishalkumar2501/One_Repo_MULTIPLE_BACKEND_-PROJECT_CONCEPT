const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('./apiError');

/**
 * Generates a JSON Web Token (JWT) with the provided payload.
 *
 * @param {Object} payload - The data payload to sign into the token
 * @param {Object} [options={}] - Optional jwt sign options (e.g., expiresIn, subject, audience)
 * @returns {string} Signed JWT string
 */
const generateToken = (payload, options = {}) => {
  const secret = config.jwt.secret;
  const defaultOptions = {
    expiresIn: config.jwt.expiresIn
  };

  const signOptions = { ...defaultOptions, ...options };
  return jwt.sign(payload, secret, signOptions);
};

/**
 * Verifies a JSON Web Token (JWT) against the configured secret.
 *
 * @param {string} token - The JWT string to verify
 * @param {string} [secret=config.jwt.secret] - Optional override secret
 * @returns {Object} Decoded payload if valid
 * @throws {ApiError} 401 Unauthorized if token is expired, invalid, or malformed
 */
const verifyToken = (token, secret = config.jwt.secret) => {
  if (!token || typeof token !== 'string') {
    throw ApiError.unauthorized('Authentication token is required');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Authentication token has expired. Please log in again.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid authentication token');
    }
    throw ApiError.unauthorized('Token verification failed');
  }
};

/**
 * Decodes a JSON Web Token without verifying its signature.
 *
 * @param {string} token - The JWT string to decode
 * @returns {Object|null} Decoded token payload or null
 */
const decodeToken = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};
