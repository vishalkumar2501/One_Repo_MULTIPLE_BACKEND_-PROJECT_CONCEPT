const Joi = require('joi');
const { SUPPORTED_CURRENCIES } = require('../models/user.model');

/**
 * Joi Validation Schemas for User authentication and account operations.
 */
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email cannot be empty',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Password cannot be empty',
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'any.required': 'Password is required'
  }),
  currency: Joi.string()
    .trim()
    .uppercase()
    .valid(...SUPPORTED_CURRENCIES)
    .default('USD')
    .messages({
      'any.only': `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`
    }),
  monthlyIncome: Joi.number().min(0).default(0).messages({
    'number.min': 'Monthly income cannot be negative'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  currency: Joi.string().trim().uppercase().valid(...SUPPORTED_CURRENCIES),
  monthlyIncome: Joi.number().min(0)
}).min(1).messages({
  'object.min': 'At least one field must be provided for profile update'
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(6).max(128).invalid(Joi.ref('currentPassword')).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'any.invalid': 'New password cannot be identical to current password',
    'any.required': 'New password is required'
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
};
