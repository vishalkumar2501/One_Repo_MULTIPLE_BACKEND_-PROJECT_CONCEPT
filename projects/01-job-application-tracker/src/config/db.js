const mongoose = require('mongoose');
const config = require('./env');

/**
 * Maps Mongoose readyState numerical values to human-readable strings.
 */
const readyStateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized'
};

let isEventListenersRegistered = false;
let isIntentionallyClosed = false;

/**
 * Registers one-time lifecycle event listeners on the active Mongoose connection.
 */
function registerConnectionEventListeners() {
  if (isEventListenersRegistered) return;

  mongoose.connection.on('connected', () => {
    console.log(`[MongoDB] Connected successfully -> Host: ${mongoose.connection.host}, Database: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('open', () => {
    console.log('[MongoDB] Connection handle opened and operational.');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Connection error encountered: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    if (!isIntentionallyClosed) {
      console.warn('[MongoDB] Connection lost or disconnected unexpectedly.');
    } else {
      console.log('[MongoDB] Connection closed gracefully.');
    }
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Connection re-established.');
  });

  isEventListenersRegistered = true;
}

/**
 * Establishes a connection to MongoDB with automated retry and exponential backoff.
 * 
 * @param {string} [uri] - MongoDB Connection URI (defaults to config.mongoUri)
 * @param {object} [options] - Additional retry and connection options
 * @param {number} [options.maxRetries=5] - Maximum number of retry attempts
 * @param {number} [options.initialDelayMs=2000] - Initial delay before first retry in milliseconds
 * @param {number} [options.backoffMultiplier=1.5] - Multiplier applied to delay after each failed attempt
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB(uri = config.mongoUri, options = {}) {
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 5;
  const initialDelayMs = options.initialDelayMs || 2000;
  const backoffMultiplier = options.backoffMultiplier || 1.5;

  registerConnectionEventListeners();
  isIntentionallyClosed = false;

  const mongooseOptions = {
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
    autoIndex: config.isDevelopment, // Build indexes automatically in development only
    ...options.mongooseOptions
  };

  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (attempt < maxRetries) {
    attempt += 1;
    try {
      console.log(`[MongoDB] Connecting to database (Attempt ${attempt}/${maxRetries})...`);
      const conn = await mongoose.connect(uri, mongooseOptions);
      return conn.connection;
    } catch (error) {
      console.error(`[MongoDB] Connection attempt ${attempt} failed: ${error.message}`);

      if (attempt >= maxRetries) {
        console.error(`[MongoDB] Exhausted all ${maxRetries} connection attempts.`);
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts: ${error.message}`);
      }

      console.log(`[MongoDB] Retrying in ${currentDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay = Math.round(currentDelay * backoffMultiplier);
    }
  }
}

/**
 * Gracefully terminates the Mongoose connection and clears driver topology monitors.
 * 
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  isIntentionallyClosed = true;
  try {
    await mongoose.disconnect();
  } catch (err) {
    console.error(`[MongoDB] Error while disconnecting: ${err.message}`);
    throw err;
  }
}

/**
 * Returns diagnostic metadata about the current database connection state.
 * 
 * @returns {{ readyState: number, status: string, host: string|null, name: string|null }}
 */
function getConnectionState() {
  const readyState = mongoose.connection.readyState;
  return {
    readyState,
    status: readyStateMap[readyState] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionState,
  registerConnectionEventListeners,
  readyStateMap
};
