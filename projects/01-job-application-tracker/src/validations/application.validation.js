const Joi = require('joi');
const {
  APPLICATION_STATUSES,
  JOB_TYPES,
  WORK_LOCATIONS,
  APPLICATION_PRIORITIES,
  SALARY_PERIODS,
  INTERVIEW_STAGE_STATUSES
} = require('../models/application.model');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdValidator = Joi.string()
  .regex(OBJECT_ID_REGEX)
  .messages({
    'string.pattern.base': 'Must be a valid 24-character hexadecimal MongoDB ObjectId'
  });

/**
 * Validation schema for creating a new job application.
 */
const createApplicationSchema = {
  body: Joi.object({
    company: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Company name cannot be empty',
        'string.min': 'Company name must be at least 2 characters long',
        'string.max': 'Company name cannot exceed 100 characters',
        'any.required': 'Company name is required'
      }),
    position: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Position title cannot be empty',
        'string.min': 'Position title must be at least 2 characters long',
        'string.max': 'Position title cannot exceed 100 characters',
        'any.required': 'Position title is required'
      }),
    jobType: Joi.string()
      .valid(...JOB_TYPES)
      .default('full-time')
      .messages({
        'any.only': `Job type must be one of: ${JOB_TYPES.join(', ')}`
      }),
    workLocation: Joi.string()
      .valid(...WORK_LOCATIONS)
      .default('remote')
      .messages({
        'any.only': `Work location must be one of: ${WORK_LOCATIONS.join(', ')}`
      }),
    location: Joi.string()
      .trim()
      .max(100)
      .allow('', null)
      .default('')
      .messages({
        'string.max': 'Location description cannot exceed 100 characters'
      }),
    status: Joi.string()
      .valid(...APPLICATION_STATUSES)
      .default('applied')
      .messages({
        'any.only': `Application status must be one of: ${APPLICATION_STATUSES.join(', ')}`
      }),
    salary: Joi.object({
      min: Joi.number().min(0).allow(null).default(null),
      max: Joi.number().min(0).allow(null).default(null),
      currency: Joi.string().trim().length(3).uppercase().default('USD'),
      period: Joi.string().valid(...SALARY_PERIODS).default('yearly')
    }).default(),
    applicationDate: Joi.date().iso().default(Date.now),
    jobUrl: Joi.string()
      .trim()
      .uri({ scheme: ['http', 'https'] })
      .allow('', null)
      .messages({
        'string.uri': 'Job URL must be a valid http or https URL'
      }),
    contact: Joi.object({
      name: Joi.string().trim().max(100).allow('').default(''),
      email: Joi.string().trim().email({ tlds: { allow: false } }).lowercase().allow('').default(''),
      phone: Joi.string().trim().max(30).allow('').default('')
    }).default(),
    notes: Joi.string()
      .trim()
      .max(2000)
      .allow('', null)
      .default(''),
    rejectionReason: Joi.string()
      .trim()
      .max(500)
      .allow('', null)
      .default(null),
    followUpDate: Joi.date().iso().allow(null).default(null),
    priority: Joi.string()
      .valid(...APPLICATION_PRIORITIES)
      .default('medium')
      .messages({
        'any.only': `Priority must be one of: ${APPLICATION_PRIORITIES.join(', ')}`
      }),
    isArchived: Joi.boolean().default(false)
  })
};

/**
 * Validation schema for updating an existing job application.
 */
const updateApplicationSchema = {
  params: Joi.object({
    id: objectIdValidator.required().messages({
      'any.required': 'Application ID parameter is required'
    })
  }),
  body: Joi.object({
    company: Joi.string().trim().min(2).max(100),
    position: Joi.string().trim().min(2).max(100),
    jobType: Joi.string().valid(...JOB_TYPES),
    workLocation: Joi.string().valid(...WORK_LOCATIONS),
    location: Joi.string().trim().max(100).allow('', null),
    status: Joi.string().valid(...APPLICATION_STATUSES),
    salary: Joi.object({
      min: Joi.number().min(0).allow(null),
      max: Joi.number().min(0).allow(null),
      currency: Joi.string().trim().length(3).uppercase(),
      period: Joi.string().valid(...SALARY_PERIODS)
    }),
    applicationDate: Joi.date().iso(),
    jobUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).allow('', null),
    contact: Joi.object({
      name: Joi.string().trim().max(100).allow(''),
      email: Joi.string().trim().email({ tlds: { allow: false } }).lowercase().allow(''),
      phone: Joi.string().trim().max(30).allow('')
    }),
    notes: Joi.string().trim().max(2000).allow('', null),
    rejectionReason: Joi.string().trim().max(500).allow('', null),
    followUpDate: Joi.date().iso().allow(null),
    priority: Joi.string().valid(...APPLICATION_PRIORITIES),
    isArchived: Joi.boolean()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

/**
 * Validation schema for retrieving or deleting a single job application by ID.
 */
const applicationIdParamSchema = {
  params: Joi.object({
    id: objectIdValidator.required().messages({
      'any.required': 'Application ID parameter is required'
    })
  })
};

/**
 * Validation schema for appending an interview stage to an application.
 */
const addInterviewStageSchema = {
  params: Joi.object({
    id: objectIdValidator.required().messages({
      'any.required': 'Application ID parameter is required'
    })
  }),
  body: Joi.object({
    stageName: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Stage name cannot be empty',
        'string.min': 'Stage name must be at least 2 characters long',
        'string.max': 'Stage name cannot exceed 100 characters',
        'any.required': 'Stage name is required'
      }),
    stageDate: Joi.date().iso().default(Date.now),
    interviewer: Joi.string().trim().max(100).allow('').default(''),
    status: Joi.string()
      .valid(...INTERVIEW_STAGE_STATUSES)
      .default('scheduled')
      .messages({
        'any.only': `Interview stage status must be one of: ${INTERVIEW_STAGE_STATUSES.join(', ')}`
      }),
    feedback: Joi.string().trim().max(1000).allow('').default('')
  })
};

/**
 * Validation schema for updating status directly.
 */
const updateStatusSchema = {
  params: Joi.object({
    id: objectIdValidator.required().messages({
      'any.required': 'Application ID parameter is required'
    })
  }),
  body: Joi.object({
    status: Joi.string()
      .valid(...APPLICATION_STATUSES)
      .required()
      .messages({
        'any.only': `Application status must be one of: ${APPLICATION_STATUSES.join(', ')}`,
        'any.required': 'Status is required'
      }),
    rejectionReason: Joi.string()
      .trim()
      .max(500)
      .allow('', null)
      .default(null)
  })
};

/**
 * Validation schema for listing / filtering / searching applications.
 */
const queryApplicationsSchema = {
  query: Joi.object({
    search: Joi.string().trim().allow(''),
    status: Joi.string().valid(...APPLICATION_STATUSES),
    jobType: Joi.string().valid(...JOB_TYPES),
    workLocation: Joi.string().valid(...WORK_LOCATIONS),
    priority: Joi.string().valid(...APPLICATION_PRIORITIES),
    isArchived: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'applicationDate', 'company', 'position', 'priority').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

module.exports = {
  objectIdValidator,
  createApplicationSchema,
  updateApplicationSchema,
  applicationIdParamSchema,
  addInterviewStageSchema,
  updateStatusSchema,
  queryApplicationsSchema
};
