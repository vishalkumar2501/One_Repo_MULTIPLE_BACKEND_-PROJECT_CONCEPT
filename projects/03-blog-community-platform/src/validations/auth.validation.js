const Joi = require('joi');
const { ROLES } = require('../models/user.model');

/**
 * Validation schema for user registration.
 */
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 60 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string().trim().lowercase().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string().min(6).max(128).required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required'
    }),
  bio: Joi.string().trim().max(500).allow('').optional(),
  avatar: Joi.string().trim().uri().allow('').optional()
});

/**
 * Validation schema for user login.
 */
const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string().required()
    .messages({
      'any.required': 'Password is required'
    })
});

/**
 * Validation schema for profile update (authenticated user).
 */
const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).optional(),
  bio: Joi.string().trim().max(500).allow('').optional(),
  avatar: Joi.string().trim().uri().allow('').optional(),
  socialLinks: Joi.object({
    website: Joi.string().trim().uri().allow('').optional(),
    twitter: Joi.string().trim().allow('').optional(),
    github: Joi.string().trim().allow('').optional(),
    linkedin: Joi.string().trim().uri().allow('').optional()
  }).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for password change.
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({ 'any.required': 'Current password is required' }),
  newPassword: Joi.string().min(6).max(128).required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'any.required': 'New password is required'
    })
});

/**
 * Validation schema for admin role assignment.
 */
const assignRoleSchema = Joi.object({
  role: Joi.string().valid(...ROLES).required()
    .messages({
      'any.only': `Role must be one of: ${ROLES.join(', ')}`,
      'any.required': 'Role is required'
    })
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  assignRoleSchema
};
