const http = require('http');
const app = require('./app');
const config = require('./config/env');

let server;

/**
 * Configure graceful shutdown for clean process termination.
 * @param {http.Server} httpServer
 */
function setupGracefulShutdown(httpServer) {
  const shutdown = (signal) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

    httpServer.close((err) => {
      if (err) {
        console.error('[Server] Error during HTTP server close:', err);
        process.exit(1);
      }
      console.log('[Server] HTTP server closed gracefully. Exiting process.');
      process.exit(0);
    });

    // Enforce shutdown after 10-second timeout if connections remain open
    setTimeout(() => {
      console.error('[Server] Forcing shutdown after timeout (10s).');
      process.exit(1);
    }, 10000).unref();
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
 * Bootstrap and start the Express HTTP server.
 */
function startServer() {
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
