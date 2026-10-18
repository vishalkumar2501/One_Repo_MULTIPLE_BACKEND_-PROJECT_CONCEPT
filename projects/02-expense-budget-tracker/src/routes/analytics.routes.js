const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/category-breakdown', analyticsController.getCategoryBreakdown);
router.get('/monthly-cashflow', analyticsController.getMonthlyCashflow);
router.get('/summary', analyticsController.getSummaryDashboard);

module.exports = router;
