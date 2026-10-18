const Joi = require('joi');
const {
  PAYMENT_METHODS,
  RECURRING_FREQUENCIES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES
} = require('../models/expense.model');
const { SUPPORTED_CURRENCIES } = require('../models/user.model');

// Custom Joi validator for MongoDB ObjectId
const objectIdValidator = (value, helpers) => {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

/**
 * Schema for creating a new expense or income transaction
 */
const createExpenseSchema = Joi.object({
  title: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title must be at least 2 characters long',
    'string.max': 'Title cannot exceed 100 characters',
    'any.required': 'Title is required'
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Amount must be a valid number',
    'number.positive': 'Amount must be greater than zero',
    'any.required': 'Amount is required'
  }),
  category: Joi.string().custom(objectIdValidator, 'ObjectId validation').required().messages({
    'any.invalid': 'Category must be a valid 24-character hexadecimal ObjectId',
    'any.required': 'Category is required'
  }),
  type: Joi.string().valid(...TRANSACTION_TYPES).default('expense').messages({
    'any.only': `Type must be one of: ${TRANSACTION_TYPES.join(', ')}`
  }),
  currency: Joi.string().trim().uppercase().valid(...SUPPORTED_CURRENCIES).default('USD'),
  paymentMethod: Joi.string().valid(...PAYMENT_METHODS).default('cash').messages({
    'any.only': `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`
  }),
  date: Joi.date().iso().default(Date.now).messages({
    'date.format': 'Date must follow ISO 8601 format (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'
  }),
  notes: Joi.string().trim().max(500).allow('').default(''),
  receiptUrl: Joi.string().trim().allow('').default(''),
  tags: Joi.array().items(Joi.string().trim().lowercase().max(30)).default([]),
  isRecurring: Joi.boolean().default(false),
  recurring: Joi.object({
    frequency: Joi.string().valid(...RECURRING_FREQUENCIES).required(),
    nextDueDate: Joi.date().iso(),
    endDate: Joi.date().iso()
  }).when('isRecurring', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  status: Joi.string().valid(...TRANSACTION_STATUSES).default('completed')
});

/**
 * Schema for updating an existing transaction
 */
const updateExpenseSchema = Joi.object({
  title: Joi.string().trim().min(2).max(100),
  amount: Joi.number().positive().precision(2),
  category: Joi.string().custom(objectIdValidator, 'ObjectId validation'),
  type: Joi.string().valid(...TRANSACTION_TYPES),
  currency: Joi.string().trim().uppercase().valid(...SUPPORTED_CURRENCIES),
  paymentMethod: Joi.string().valid(...PAYMENT_METHODS),
  date: Joi.date().iso(),
  notes: Joi.string().trim().max(500).allow(''),
  receiptUrl: Joi.string().trim().allow(''),
  tags: Joi.array().items(Joi.string().trim().lowercase().max(30)),
  isRecurring: Joi.boolean(),
  recurring: Joi.object({
    frequency: Joi.string().valid(...RECURRING_FREQUENCIES),
    nextDueDate: Joi.date().iso(),
    endDate: Joi.date().iso()
  }),
  status: Joi.string().valid(...TRANSACTION_STATUSES)
}).min(1).messages({
  'object.min': 'At least one field must be provided to update transaction'
});

/**
 * Schema for querying and filtering transactions
 */
const queryExpenseSchema = Joi.object({
  type: Joi.string().valid(...TRANSACTION_TYPES),
  category: Joi.string().custom(objectIdValidator, 'ObjectId validation'),
  paymentMethod: Joi.string().valid(...PAYMENT_METHODS),
  status: Joi.string().valid(...TRANSACTION_STATUSES),
  tags: Joi.string().trim(), // Comma-delimited list or single tag
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  minAmount: Joi.number().min(0),
  maxAmount: Joi.number().min(0),
  isRecurring: Joi.boolean(),
  search: Joi.string().trim(),
  sortBy: Joi.string().valid('date', 'amount', 'title', 'createdAt').default('date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  queryExpenseSchema
};
