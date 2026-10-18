const express = require('express');
const config = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const expenseRoutes = require('./routes/expense.routes');
const budgetRoutes = require('./routes/budget.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const exportRoutes = require('./routes/export.routes');
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
      project: '02-expense-budget-tracker',
      version: '1.0.0',
      status: 'Online',
      endpoints: {
        health: '/api/v1/health',
        apiRoot: '/api/v1',
        authRegister: '/api/v1/auth/register',
        authLogin: '/api/v1/auth/login',
        authMe: '/api/v1/auth/me',
        categories: '/api/v1/categories',
        expenses: '/api/v1/expenses',
        recurringExpenses: '/api/v1/expenses/recurring',
        budgets: '/api/v1/budgets',
        budgetStatus: '/api/v1/budgets/status',
        analyticsCategoryBreakdown: '/api/v1/analytics/category-breakdown',
        analyticsMonthlyCashflow: '/api/v1/analytics/monthly-cashflow',
        analyticsSummary: '/api/v1/analytics/summary',
        exportCsv: '/api/v1/export/csv',
        exportJson: '/api/v1/export/json'
      }
    },
    'Welcome to Expense & Budget Tracker API'
  );
});

// Health check endpoints
app.use('/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);

// Authentication & Account endpoints
app.use('/api/v1/auth', authRoutes);

// Category Management endpoints
app.use('/api/v1/categories', categoryRoutes);

// Expense & Transaction endpoints
app.use('/api/v1/expenses', expenseRoutes);

// Budget & Threshold Alert endpoints
app.use('/api/v1/budgets', budgetRoutes);

// Financial Analytics & Aggregation endpoints
app.use('/api/v1/analytics', analyticsRoutes);

// Data Export endpoints
app.use('/api/v1/export', exportRoutes);

// Catch unhandled routes (404)
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
