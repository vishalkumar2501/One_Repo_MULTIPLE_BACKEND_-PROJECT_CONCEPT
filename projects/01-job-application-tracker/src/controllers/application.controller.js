const { Application } = require('../models/application.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  buildApplicationFilter,
  buildSortOptions,
  buildPaginationMetadata
} = require('../utils/queryBuilder');

/**
 * Controller handling Job Application lifecycle and querying operations.
 */
const applicationController = {
  /**
   * Create a new job application for the authenticated user.
   *
   * @route POST /api/v1/applications
   * @access Private
   */
  createApplication: asyncHandler(async (req, res) => {
    // Associate the new application with authenticated user
    const applicationData = {
      ...req.body,
      user: req.user._id
    };

    const application = await Application.create(applicationData);

    return ApiResponse.created(
      res,
      { application },
      'Job application created successfully'
    );
  }),

  /**
   * Get all job applications for the authenticated user with filtering, pagination, and sorting.
   *
   * @route GET /api/v1/applications
   * @access Private
   */
  getApplications: asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter with strict multi-tenant isolation
    const filter = buildApplicationFilter(req.query, req.user._id);

    // Build sort options and pagination parameters
    const sort = buildSortOptions(sortBy, sortOrder);
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    const skip = (parsedPage - 1) * parsedLimit;

    const [applications, total] = await Promise.all([
      Application.find(filter).sort(sort).skip(skip).limit(parsedLimit),
      Application.countDocuments(filter)
    ]);

    const pagination = buildPaginationMetadata(parsedPage, parsedLimit, total);

    return ApiResponse.ok(
      res,
      {
        applications,
        pagination
      },
      'Job applications retrieved successfully'
    );
  }),

  /**
   * Get a single job application by ID ensuring user ownership.
   *
   * @route GET /api/v1/applications/:id
   * @access Private
   */
  getApplicationById: asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Query application with user isolation constraint
    const application = await Application.findOne({
      _id: id,
      user: req.user._id
    });

    if (!application) {
      throw ApiError.notFound('Job application not found');
    }

    return ApiResponse.ok(
      res,
      { application },
      'Job application retrieved successfully'
    );
  }),

  /**
   * Update an existing job application by ID ensuring strict user ownership.
   *
   * @route PUT /api/v1/applications/:id
   * @route PATCH /api/v1/applications/:id
   * @access Private
   */
  updateApplication: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      user: req.user._id
    });

    if (!application) {
      throw ApiError.notFound('Job application not found');
    }

    // Apply partial updates while preserving nested subdocument integrity
    for (const [key, value] of Object.entries(req.body)) {
      if (key === 'salary' && typeof value === 'object' && value !== null) {
        const existingSalary = application.salary && application.salary.toObject
          ? application.salary.toObject()
          : (application.salary || {});
        application.salary = { ...existingSalary, ...value };
      } else if (key === 'contact' && typeof value === 'object' && value !== null) {
        const existingContact = application.contact && application.contact.toObject
          ? application.contact.toObject()
          : (application.contact || {});
        application.contact = { ...existingContact, ...value };
      } else {
        application[key] = value;
      }
    }

    // Lifecycle rule: clear rejectionReason if status is not 'rejected' and not explicitly provided
    if (req.body.status && req.body.status !== 'rejected' && !('rejectionReason' in req.body)) {
      application.rejectionReason = null;
    }

    await application.save();

    return ApiResponse.ok(
      res,
      { application },
      'Job application updated successfully'
    );
  }),

  /**
   * Delete a job application by ID ensuring strict user ownership.
   *
   * @route DELETE /api/v1/applications/:id
   * @access Private
   */
  deleteApplication: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const application = await Application.findOneAndDelete({
      _id: id,
      user: req.user._id
    });

    if (!application) {
      throw ApiError.notFound('Job application not found');
    }

    return ApiResponse.ok(
      res,
      { application },
      'Job application deleted successfully'
    );
  }),

  /**
   * Update application status directly with lifecycle rules.
   *
   * @route PATCH /api/v1/applications/:id/status
   * @access Private
   */
  updateApplicationStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const application = await Application.findOne({
      _id: id,
      user: req.user._id
    });

    if (!application) {
      throw ApiError.notFound('Job application not found');
    }

    application.updateStatus(status, rejectionReason);
    await application.save();

    return ApiResponse.ok(
      res,
      { application },
      'Application status updated successfully'
    );
  }),

  /**
   * Append an interview stage to an application with automatic status transition.
   *
   * @route POST /api/v1/applications/:id/interview-stages
   * @access Private
   */
  addInterviewStage: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      user: req.user._id
    });

    if (!application) {
      throw ApiError.notFound('Job application not found');
    }

    const stage = application.addInterviewStage(req.body);
    await application.save();

    return ApiResponse.created(
      res,
      { application, stage },
      'Interview stage added successfully'
    );
  }),

  /**
   * Soft-archive an application.
   *
   * @route PATCH /api/v1/applications/:id/archive
   * @access Private
   */
  archiveApplication: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      user: req.user._id
    });

    if (!application) {
      throw ApiError.notFound('Job application not found');
    }

    application.archive();
    await application.save();

    return ApiResponse.ok(
      res,
      { application },
      'Job application archived successfully'
    );
  }),

  /**
   * Restore an application from archive.
   *
   * @route PATCH /api/v1/applications/:id/unarchive
   * @access Private
   */
  unarchiveApplication: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      user: req.user._id
    });

    if (!application) {
      throw ApiError.notFound('Job application not found');
    }

    application.unarchive();
    await application.save();

    return ApiResponse.ok(
      res,
      { application },
      'Job application unarchived successfully'
    );
  }),

  /**
   * Get application pipeline statistics and analytics for the authenticated user.
   *
   * @route GET /api/v1/applications/stats
   * @access Private
   */
  getApplicationStats: asyncHandler(async (req, res) => {
    const stats = await Application.getApplicationAnalytics(req.user._id);

    return ApiResponse.ok(
      res,
      { stats },
      'Application statistics and analytics retrieved successfully'
    );
  })
};

module.exports = applicationController;
