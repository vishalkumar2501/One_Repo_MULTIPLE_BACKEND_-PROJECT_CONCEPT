const express = require('express');
const applicationController = require('../controllers/application.controller');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  createApplicationSchema,
  updateApplicationSchema,
  applicationIdParamSchema,
  addInterviewStageSchema,
  updateStatusSchema,
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
 * @route   GET /api/v1/applications/stats
 * @desc    Get aggregated statistics and analytics for authenticated user's job pipeline
 * @access  Private (Bearer Token required)
 */
router.get(
  '/stats',
  applicationController.getApplicationStats
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

/**
 * @route   PUT /api/v1/applications/:id
 * @desc    Update an existing job application by ID with user ownership check
 * @access  Private (Bearer Token required)
 */
router.put(
  '/:id',
  validate(updateApplicationSchema),
  applicationController.updateApplication
);

/**
 * @route   PATCH /api/v1/applications/:id
 * @desc    Partially update an existing job application by ID with user ownership check
 * @access  Private (Bearer Token required)
 */
router.patch(
  '/:id',
  validate(updateApplicationSchema),
  applicationController.updateApplication
);

/**
 * @route   DELETE /api/v1/applications/:id
 * @desc    Delete job application by ID with user ownership check
 * @access  Private (Bearer Token required)
 */
router.delete(
  '/:id',
  validate(applicationIdParamSchema),
  applicationController.deleteApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/status
 * @desc    Update application status directly with lifecycle rules
 * @access  Private (Bearer Token required)
 */
router.patch(
  '/:id/status',
  validate(updateStatusSchema),
  applicationController.updateApplicationStatus
);

/**
 * @route   POST /api/v1/applications/:id/interview-stages
 * @desc    Append an interview stage to application
 * @access  Private (Bearer Token required)
 */
router.post(
  '/:id/interview-stages',
  validate(addInterviewStageSchema),
  applicationController.addInterviewStage
);

/**
 * @route   PATCH /api/v1/applications/:id/archive
 * @desc    Soft-archive a job application
 * @access  Private (Bearer Token required)
 */
router.patch(
  '/:id/archive',
  validate(applicationIdParamSchema),
  applicationController.archiveApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/unarchive
 * @desc    Restore a job application from archive
 * @access  Private (Bearer Token required)
 */
router.patch(
  '/:id/unarchive',
  validate(applicationIdParamSchema),
  applicationController.unarchiveApplication
);

module.exports = router;
