const path = require('path');
const dotenv = require('dotenv');

// Load .env file from project root if it exists
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates and exposes structured environment configuration for Project 03.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5002', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/blog_community_db',
  jwt: {
    secret: process.env.JWT_SECRET || 'default_dev_blog_community_jwt_secret_key_13579',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins default
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
};

module.exports = Object.freeze(config);
