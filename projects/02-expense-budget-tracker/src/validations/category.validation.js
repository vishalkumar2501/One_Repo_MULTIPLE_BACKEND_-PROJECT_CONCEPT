const Joi = require('joi');

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Joi Validation Schemas for Category operations.
 */
const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Category name cannot be empty',
    'string.min': 'Category name must be at least 2 characters long',
    'string.max': 'Category name cannot exceed 50 characters',
    'any.required': 'Category name is required'
  }),
  type: Joi.string().valid('expense', 'income').default('expense').messages({
    'any.only': 'Category type must be either expense or income'
  }),
  icon: Joi.string().trim().max(30).default('tag').messages({
    'string.max': 'Icon identifier cannot exceed 30 characters'
  }),
  color: Joi.string().trim().pattern(HEX_COLOR_REGEX).default('#6B7280').messages({
    'string.pattern.base': 'Color must be a valid hex color code (e.g. #EF4444)'
  }),
  description: Joi.string().trim().max(200).allow('').default('').messages({
    'string.max': 'Description cannot exceed 200 characters'
  })
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  icon: Joi.string().trim().max(30),
  color: Joi.string().trim().pattern(HEX_COLOR_REGEX).messages({
    'string.pattern.base': 'Color must be a valid hex color code (e.g. #EF4444)'
  }),
  description: Joi.string().trim().max(200).allow(''),
  isActive: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for category update'
});

const queryCategorySchema = Joi.object({
  type: Joi.string().valid('expense', 'income'),
  includeInactive: Joi.boolean().default(false)
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  queryCategorySchema
};
