const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

let server;

/**
 * Configure graceful shutdown for clean process termination.
 * @param {http.Server} httpServer
 */
function setupGracefulShutdown(httpServer) {
  let isShuttingDown = false;

  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

    // Enforce shutdown after 10-second timeout if closing hangs
    const forceExitTimeout = setTimeout(() => {
      console.error('[Server] Forcing shutdown after timeout (10s).');
      process.exit(1);
    }, 10000);
    forceExitTimeout.unref();

    try {
      if (httpServer && httpServer.listening) {
        await new Promise((resolve, reject) => {
          httpServer.close((err) => {
            if (err) return reject(err);
            console.log('[Server] HTTP server closed.');
            resolve();
          });
        });
      }

      await disconnectDB();
      console.log('[Server] Graceful shutdown completed successfully. Exiting.');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

/**
 * Bootstrap and start the Express HTTP server with MongoDB connectivity.
 */
async function startServer() {
  try {
    // Attempt database connection
    await connectDB();
  } catch (dbError) {
    console.error('[Bootstrap] Database connection failed on startup:', dbError.message);
    if (config.isProduction) {
      console.error('[Bootstrap] Exiting process due to critical database connection failure in production.');
      process.exit(1);
    }
  }

  server = http.createServer(app);

  server.listen(config.port, () => {
    console.log('====================================================');
    console.log('🚀 Project 01: Job Application Tracker API');
    console.log(`📡 Listening on Port : ${config.port}`);
    console.log(`🌱 Environment       : ${config.env}`);
    console.log(`❤️  Health Endpoint   : http://localhost:${config.port}/api/v1/health`);
    console.log('====================================================');
  });

  setupGracefulShutdown(server);
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, setupGracefulShutdown };
