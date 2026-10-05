const Joi = require('joi');
const ApiError = require('../utils/apiError');

/**
 * Express middleware factory for validating incoming requests against Joi schemas.
 * Supports schemas containing `body`, `query`, and/or `params`.
 *
 * @param {Object} schema - Object containing Joi schemas for body, query, and/or params
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    // Determine schemas to evaluate (handling direct Joi schema or object containing body/query/params)
    const validSchema = {};
    if (Joi.isSchema(schema)) {
      validSchema.body = schema;
    } else {
      if (schema.body) validSchema.body = schema.body;
      if (schema.query) validSchema.query = schema.query;
      if (schema.params) validSchema.params = schema.params;
    }

    const errors = [];

    // Validate each specified target in the request
    for (const [key, joiSchema] of Object.entries(validSchema)) {
      const targetData = req[key] || {};
      const { error, value } = joiSchema.validate(targetData, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        error.details.forEach((detail) => {
          errors.push({
            field: detail.path.join('.'),
            message: detail.message.replace(/['"]/g, '')
          });
        });
      } else {
        // Assign cleaned and cast value back to request
        req[key] = value;
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest('Validation failed', errors));
    }

    next();
  };
};

module.exports = validate;
