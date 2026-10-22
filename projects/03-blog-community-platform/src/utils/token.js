const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a signed JWT token.
 *
 * @param {Object} payload - Claims to embed in the token
 * @param {Object} [options={}] - Optional overrides for jwt.sign (e.g., expiresIn)
 * @returns {string} Signed JWT string
 */
function generateToken(payload, options = {}) {
  const signOptions = {
    expiresIn: options.expiresIn || config.jwt.expiresIn,
    ...options
  };
  return jwt.sign(payload, config.jwt.secret, signOptions);
}

/**
 * Verify and decode a JWT token.
 *
 * @param {string} token - JWT string to verify
 * @returns {Object} Decoded payload on success
 * @throws {JsonWebTokenError|TokenExpiredError} If token is invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = {
  generateToken,
  verifyToken
};
