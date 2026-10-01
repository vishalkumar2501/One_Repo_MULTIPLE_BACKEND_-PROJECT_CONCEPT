const config = require('./config/env');

/**
 * Bootstrap entry point for Project 01: Job Application Tracker API.
 * Full server and route lifecycle will be attached in Day 2.
 */
function initialize() {
  console.log('====================================================');
  console.log('Project 01: Job Application Tracker API');
  console.log(`Environment : ${config.env}`);
  console.log(`Target Port : ${config.port}`);
  console.log('Status      : Environment configuration loaded successfully.');
  console.log('====================================================');
}

if (require.main === module) {
  initialize();
}

module.exports = { initialize, config };
