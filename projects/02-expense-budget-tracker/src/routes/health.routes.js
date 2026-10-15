const express = require('express');
const { getHealthStatus } = require('../controllers/health.controller');

const router = express.Router();

/**
 * @route   GET /health or /api/v1/health
 * @desc    Health check & uptime monitor
 * @access  Public
 */
router.get('/', getHealthStatus);

module.exports = router;
