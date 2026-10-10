const express = require('express');
const config = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const applicationRoutes = require('./routes/application.routes');
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Development request logger
if (config.isDevelopment && config.env !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Root welcome endpoint
app.get('/', (req, res) => {
  ApiResponse.success(
    res,
    {
      project: '01-job-application-tracker',
      version: '1.0.0',
      status: 'Online',
      endpoints: {
        health: '/api/v1/health',
        apiRoot: '/api/v1',
        authRegister: '/api/v1/auth/register',
        authLogin: '/api/v1/auth/login',
        authMe: '/api/v1/auth/me',
        applications: '/api/v1/applications'
      }
    },
    'Welcome to Job Application Tracker API'
  );
});

// Health check endpoints
app.use('/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);

// Authentication endpoints
app.use('/api/v1/auth', authRoutes);

// Job Application endpoints
app.use('/api/v1/applications', applicationRoutes);

// Catch unhandled routes (404)
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
