const path = require('path');
const dotenv = require('dotenv');

// Load .env file from project root if it exists
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates and exposes structured environment configuration.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/job_tracker_db',
  jwt: {
    secret: process.env.JWT_SECRET || 'default_dev_jwt_secret_key_12345',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
};

module.exports = Object.freeze(config);
