const { Application } = require('../models/application.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

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
      search,
      status,
      jobType,
      workLocation,
      priority,
      isArchived,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Enforce strict multi-tenant user isolation
    const filter = { user: req.user._id };

    if (status) {
      filter.status = status;
    }
    if (jobType) {
      filter.jobType = jobType;
    }
    if (workLocation) {
      filter.workLocation = workLocation;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (typeof isArchived === 'boolean') {
      filter.isArchived = isArchived;
    }
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // Pagination bounds calculation
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [applications, total] = await Promise.all([
      Application.find(filter).sort(sort).skip(skip).limit(parsedLimit),
      Application.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parsedLimit) || 1;
    const hasNextPage = parsedPage < totalPages;
    const hasPrevPage = parsedPage > 1;

    return ApiResponse.ok(
      res,
      {
        applications,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
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
  })
};

module.exports = applicationController;
