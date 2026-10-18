const Joi = require('joi');
const { SUPPORTED_CURRENCIES } = require('../models/user.model');

// Custom Joi validator for MongoDB ObjectId
const objectIdValidator = (value, helpers) => {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

/**
 * Schema for creating a monthly budget limit
 */
const createBudgetSchema = Joi.object({
  category: Joi.string().custom(objectIdValidator, 'ObjectId validation').allow(null).default(null).messages({
    'any.invalid': 'Category must be a valid 24-character hexadecimal ObjectId or null'
  }),
  month: Joi.number().integer().min(1).max(12).required().messages({
    'number.base': 'Month must be an integer between 1 and 12',
    'number.min': 'Month must be between 1 and 12',
    'number.max': 'Month must be between 1 and 12',
    'any.required': 'Month is required'
  }),
  year: Joi.number().integer().min(2000).max(2100).required().messages({
    'number.base': 'Year must be a valid 4-digit integer',
    'number.min': 'Year must be 2000 or later',
    'number.max': 'Year must be 2100 or earlier',
    'any.required': 'Year is required'
  }),
  limit: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Budget limit must be greater than zero',
    'any.required': 'Budget limit is required'
  }),
  currency: Joi.string().trim().uppercase().valid(...SUPPORTED_CURRENCIES).default('USD'),
  alertThreshold: Joi.number().integer().min(1).max(100).default(80).messages({
    'number.min': 'Alert threshold must be at least 1%',
    'number.max': 'Alert threshold cannot exceed 100%'
  }),
  notes: Joi.string().trim().max(300).allow('').default('')
});

/**
 * Schema for updating an existing budget limit
 */
const updateBudgetSchema = Joi.object({
  limit: Joi.number().positive().precision(2),
  alertThreshold: Joi.number().integer().min(1).max(100),
  currency: Joi.string().trim().uppercase().valid(...SUPPORTED_CURRENCIES),
  notes: Joi.string().trim().max(300).allow('')
}).min(1).messages({
  'object.min': 'At least one field must be provided to update budget'
});

/**
 * Schema for querying budgets
 */
const queryBudgetSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().min(2000).max(2100),
  category: Joi.string().custom(objectIdValidator, 'ObjectId validation').allow(null)
});

module.exports = {
  createBudgetSchema,
  updateBudgetSchema,
  queryBudgetSchema
};
