const express = require('express');
const applicationController = require('../controllers/application.controller');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  createApplicationSchema,
  applicationIdParamSchema,
  queryApplicationsSchema
} = require('../validations/application.validation');

const router = express.Router();

// All application routes require user authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/applications
 * @desc    Create a new job application for authenticated user
 * @access  Private (Bearer Token required)
 */
router.post(
  '/',
  validate(createApplicationSchema),
  applicationController.createApplication
);

/**
 * @route   GET /api/v1/applications
 * @desc    Get all job applications for authenticated user with filtering, pagination, and sorting
 * @access  Private (Bearer Token required)
 */
router.get(
  '/',
  validate(queryApplicationsSchema),
  applicationController.getApplications
);

/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get single job application by ID with user ownership check
 * @access  Private (Bearer Token required)
 */
router.get(
  '/:id',
  validate(applicationIdParamSchema),
  applicationController.getApplicationById
);

module.exports = router;
