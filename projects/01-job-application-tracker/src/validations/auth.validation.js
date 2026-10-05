const Joi = require('joi');

/**
 * Validation schema for user registration endpoint.
 */
const registerSchema = {
  body: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.base': 'Name must be a string',
        'string.empty': 'Name cannot be empty',
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string()
      .trim()
      .email({ tlds: { allow: false } })
      .lowercase()
      .required()
      .messages({
        'string.base': 'Email must be a string',
        'string.empty': 'Email cannot be empty',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.base': 'Password must be a string',
        'string.empty': 'Password cannot be empty',
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
      }),
    role: Joi.string()
      .valid('user', 'admin')
      .default('user')
      .messages({
        'any.only': 'Role must be either "user" or "admin"'
      })
  })
};

module.exports = {
  registerSchema
};
