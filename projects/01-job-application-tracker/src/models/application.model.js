const mongoose = require('mongoose');

/**
 * Enumeration constants for Application lifecycle and attributes
 */
const APPLICATION_STATUS = {
  APPLIED: 'applied',
  INTERVIEWING: 'interviewing',
  OFFERED: 'offered',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

const APPLICATION_STATUSES = Object.values(APPLICATION_STATUS);

const JOB_TYPE = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
  FREELANCE: 'freelance'
};

const JOB_TYPES = Object.values(JOB_TYPE);

const WORK_LOCATION = {
  REMOTE: 'remote',
  HYBRID: 'hybrid',
  ONSITE: 'onsite'
};

const WORK_LOCATIONS = Object.values(WORK_LOCATION);

const APPLICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

const APPLICATION_PRIORITIES = Object.values(APPLICATION_PRIORITY);

const SALARY_PERIOD = {
  YEARLY: 'yearly',
  MONTHLY: 'monthly',
  HOURLY: 'hourly'
};

const SALARY_PERIODS = Object.values(SALARY_PERIOD);

const INTERVIEW_STAGE_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PASSED: 'passed',
  FAILED: 'failed'
};

const INTERVIEW_STAGE_STATUSES = Object.values(INTERVIEW_STAGE_STATUS);

/**
 * Subdocument schema for individual interview stages within a job application.
 */
const interviewStageSchema = new mongoose.Schema(
  {
    stageName: {
      type: String,
      required: [true, 'Interview stage name is required'],
      trim: true,
      minlength: [2, 'Stage name must be at least 2 characters long'],
      maxlength: [100, 'Stage name cannot exceed 100 characters']
    },
    stageDate: {
      type: Date,
      default: Date.now
    },
    interviewer: {
      type: String,
      trim: true,
      maxlength: [100, 'Interviewer name cannot exceed 100 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: INTERVIEW_STAGE_STATUSES,
        message: 'Invalid interview stage status'
      },
      default: INTERVIEW_STAGE_STATUS.SCHEDULED
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
      default: ''
    }
  },
  {
    _id: true,
    timestamps: true
  }
);

/**
 * Job Application Schema definition for pipeline tracking.
 */
const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters long'],
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    position: {
      type: String,
      required: [true, 'Position title is required'],
      trim: true,
      minlength: [2, 'Position title must be at least 2 characters long'],
      maxlength: [100, 'Position title cannot exceed 100 characters']
    },
    jobType: {
      type: String,
      enum: {
        values: JOB_TYPES,
        message: 'Invalid job type'
      },
      default: JOB_TYPE.FULL_TIME
    },
    workLocation: {
      type: String,
      enum: {
        values: WORK_LOCATIONS,
        message: 'Invalid work location'
      },
      default: WORK_LOCATION.REMOTE
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location description cannot exceed 100 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: 'Invalid application status'
      },
      default: APPLICATION_STATUS.APPLIED,
      index: true
    },
    salary: {
      min: {
        type: Number,
        min: [0, 'Salary minimum cannot be negative'],
        default: null
      },
      max: {
        type: Number,
        min: [0, 'Salary maximum cannot be negative'],
        default: null
      },
      currency: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [3, 'Currency code must be 3 characters (e.g., USD, EUR, INR)'],
        default: 'USD'
      },
      period: {
        type: String,
        enum: {
          values: SALARY_PERIODS,
          message: 'Invalid salary period'
        },
        default: SALARY_PERIOD.YEARLY
      }
    },
    applicationDate: {
      type: Date,
      default: Date.now,
      required: [true, 'Application date is required']
    },
    jobUrl: {
      type: String,
      trim: true,
      default: ''
    },
    contact: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Contact name cannot exceed 100 characters'],
        default: ''
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
      },
      phone: {
        type: String,
        trim: true,
        maxlength: [30, 'Contact phone cannot exceed 30 characters'],
        default: ''
      }
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: ''
    },
    interviewStages: [interviewStageSchema],
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      default: null
    },
    followUpDate: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: {
        values: APPLICATION_PRIORITIES,
        message: 'Invalid priority level'
      },
      default: APPLICATION_PRIORITY.MEDIUM
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound Indexing for optimal multi-tenant querying and sorting
applicationSchema.index({ user: 1, status: 1 });
applicationSchema.index({ user: 1, applicationDate: -1 });
applicationSchema.index({ user: 1, createdAt: -1 });
applicationSchema.index({ user: 1, isArchived: 1 });

// Text Index for full-text search capability
applicationSchema.index(
  {
    company: 'text',
    position: 'text',
    notes: 'text',
    location: 'text'
  },
  {
    weights: {
      company: 10,
      position: 8,
      location: 3,
      notes: 1
    },
    name: 'application_text_search_index'
  }
);

/**
 * Pre-validation hook to ensure salary.min does not exceed salary.max when both are specified.
 */
applicationSchema.pre('validate', function (next) {
  if (
    this.salary &&
    this.salary.min != null &&
    this.salary.max != null &&
    this.salary.min > this.salary.max
  ) {
    this.invalidate('salary.min', 'Minimum salary cannot be greater than maximum salary');
  }
  if (next) next();
});

/**
 * Instance method: Append an interview stage and automatically transition status to 'interviewing' if currently 'applied'.
 * @param {Object} stageData - Details of the interview stage
 * @returns {Object} Newly created interview stage subdocument
 */
applicationSchema.methods.addInterviewStage = function (stageData) {
  this.interviewStages.push(stageData);
  if (this.status === APPLICATION_STATUS.APPLIED) {
    this.status = APPLICATION_STATUS.INTERVIEWING;
  }
  return this.interviewStages[this.interviewStages.length - 1];
};

/**
 * Instance method: Update application status with optional rejection reason.
 * @param {string} newStatus - Target status from APPLICATION_STATUS
 * @param {string|null} [rejectionReason=null] - Reason if rejected
 */
applicationSchema.methods.updateStatus = function (newStatus, rejectionReason = null) {
  if (!APPLICATION_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status "${newStatus}". Must be one of: ${APPLICATION_STATUSES.join(', ')}`);
  }
  this.status = newStatus;
  if (newStatus === APPLICATION_STATUS.REJECTED) {
    this.rejectionReason = rejectionReason;
  } else {
    this.rejectionReason = null;
  }
};

/**
 * Instance method: Archive application.
 */
applicationSchema.methods.archive = function () {
  this.isArchived = true;
};

/**
 * Instance method: Restore application from archive.
 */
applicationSchema.methods.unarchive = function () {
  this.isArchived = false;
};

/**
 * Static method: Find applications for a specific user with optional filters and sorting.
 * @param {mongoose.Types.ObjectId|string} userId - ID of the user
 * @param {Object} [filter={}] - Additional query filter criteria
 * @param {Object} [options={}] - Query options like sort, limit, skip
 * @returns {Query} Mongoose query
 */
applicationSchema.statics.findByUser = function (userId, filter = {}, options = {}) {
  const query = { user: userId, ...filter };
  return this.find(query, null, options);
};

/**
 * Static method: Aggregate count of applications grouped by status for a specific user.
 * @param {mongoose.Types.ObjectId|string} userId - User ID
 * @returns {Promise<Object>} Aggregated status counts object
 */
applicationSchema.statics.getStatusCountsByUser = async function (userId) {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const results = await this.aggregate([
    { $match: { user: userObjectId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const statusMap = APPLICATION_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  results.forEach((item) => {
    if (statusMap[item._id] !== undefined) {
      statusMap[item._id] = item.count;
    }
  });

  const total = Object.values(statusMap).reduce((sum, count) => sum + count, 0);

  return {
    ...statusMap,
    total
  };
};

const Application = mongoose.model('Application', applicationSchema);

module.exports = {
  Application,
  APPLICATION_STATUS,
  APPLICATION_STATUSES,
  JOB_TYPE,
  JOB_TYPES,
  WORK_LOCATION,
  WORK_LOCATIONS,
  APPLICATION_PRIORITY,
  APPLICATION_PRIORITIES,
  SALARY_PERIOD,
  SALARY_PERIODS,
  INTERVIEW_STAGE_STATUS,
  INTERVIEW_STAGE_STATUSES
};
