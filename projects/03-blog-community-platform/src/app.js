const express = require('express');
const config = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// Body parsers
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

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
      project: '03-blog-community-platform',
      version: '1.0.0',
      status: 'Online',
      concepts: [
        'Role-Based Access Control (RBAC)',
        'Nested Comments & Threading',
        'SEO-Friendly Unique Slugs',
        'Full-Text Search & Relevance Scoring',
        'Sliding-Window Rate Limiting'
      ],
      endpoints: {
        health: '/api/v1/health',
        apiRoot: '/api/v1',
        authRegister: '/api/v1/auth/register',
        authLogin: '/api/v1/auth/login',
        authMe: '/api/v1/auth/me',
        articles: '/api/v1/articles',
        articlesSearch: '/api/v1/articles/search',
        categories: '/api/v1/categories',
        tags: '/api/v1/tags',
        comments: '/api/v1/comments'
      }
    },
    'Welcome to Blog & Community Platform API'
  );
});

// Health check endpoints
app.use('/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);

// Authentication & user management routes
app.use('/api/v1/auth', authRoutes);

// Catch unhandled routes (404)
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
