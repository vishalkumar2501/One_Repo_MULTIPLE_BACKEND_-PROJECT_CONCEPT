/**
 * Higher-order utility function to wrap asynchronous Express route handlers
 * and pass any thrown errors or rejected promises directly to next().
 *
 * @param {Function} fn - Async express route handler (req, res, next)
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
