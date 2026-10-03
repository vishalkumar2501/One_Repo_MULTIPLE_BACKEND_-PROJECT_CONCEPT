const config = require('../config/env');
const { getConnectionState } = require('../config/db');
const ApiResponse = require('../utils/apiResponse');

/**
 * Health check controller returning service health status and metrics.
 */
const getHealthStatus = (req, res) => {
  const memoryUsage = process.memoryUsage();
  const dbState = getConnectionState();

  const healthData = {
    status: 'UP',
    service: '01-job-application-tracker',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.env,
    database: {
      status: dbState.status,
      readyState: dbState.readyState,
      name: dbState.name
    },
    memory: {
      rssMb: parseFloat((memoryUsage.rss / 1024 / 1024).toFixed(2)),
      heapUsedMb: parseFloat((memoryUsage.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: parseFloat((memoryUsage.heapTotal / 1024 / 1024).toFixed(2))
    }
  };

  return ApiResponse.success(res, healthData, 'Service is healthy and operational');
};

module.exports = {
  getHealthStatus
};
