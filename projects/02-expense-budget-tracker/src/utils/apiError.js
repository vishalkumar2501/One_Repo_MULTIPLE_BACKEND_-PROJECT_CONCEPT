/**
 * Custom application error class for standard operational errors.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Descriptive error message
   * @param {any} [details=null] - Optional detailed error context / validation issues
   * @param {boolean} [isOperational=true] - Distinguishes operational errors from programming bugs
   */
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized access', details = null) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = 'Forbidden access', details = null) {
    return new ApiError(403, message, details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new ApiError(404, message, details);
  }

  static conflict(message = 'Resource already exists or conflict occurred', details = null) {
    return new ApiError(409, message, details);
  }

  static internal(message = 'Internal server error', details = null) {
    return new ApiError(500, message, details, false);
  }
}

module.exports = ApiError;
