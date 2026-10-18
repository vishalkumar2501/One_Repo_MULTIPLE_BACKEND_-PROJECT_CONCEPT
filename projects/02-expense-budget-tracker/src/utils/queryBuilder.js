const mongoose = require('mongoose');

/**
 * Escapes characters with special meaning in Regular Expressions.
 * @param {string} str - Raw input string
 * @returns {string} Escaped string safe for RegExp
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Parses comma-delimited strings or array into clean string array.
 * @param {string|Array} input
 * @returns {Array<string>}
 */
const parseCommaSeparated = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  return String(input)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Compiles a secure, multi-tenant MongoDB filter object for transactions.
 *
 * @param {mongoose.Types.ObjectId|string} userId - Authenticated user's ID
 * @param {Object} query - Validated query parameters
 * @returns {Object} MongoDB filter object
 */
const buildExpenseFilter = (userId, query = {}) => {
  const filter = {
    user: new mongoose.Types.ObjectId(userId.toString())
  };

  // Transaction type filter
  if (query.type) {
    filter.type = query.type;
  }

  // Category filter
  if (query.category) {
    filter.category = new mongoose.Types.ObjectId(query.category.toString());
  }

  // Payment method filter
  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }

  // Status filter
  if (query.status) {
    filter.status = query.status;
  }

  // Tags filter
  if (query.tags) {
    const tagList = parseCommaSeparated(query.tags);
    if (tagList.length > 0) {
      filter.tags = { $in: tagList };
    }
  }

  // Recurring filter
  if (query.isRecurring !== undefined) {
    filter.isRecurring = query.isRecurring === true || query.isRecurring === 'true';
  }

  // Date range filtering
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) {
      filter.date.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.date.$lte = new Date(query.endDate);
    }
  }

  // Amount range filtering
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) {
      filter.amount.$gte = Number(query.minAmount);
    }
    if (query.maxAmount !== undefined) {
      filter.amount.$lte = Number(query.maxAmount);
    }
  }

  // Text search on title and notes
  if (query.search && query.search.trim()) {
    const safeRegex = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ title: safeRegex }, { notes: safeRegex }];
  }

  return filter;
};

/**
 * Validates and constructs MongoDB sort options.
 *
 * @param {Object} query
 * @param {string} [query.sortBy='date']
 * @param {string} [query.sortOrder='desc']
 * @returns {Object} MongoDB sort specification
 */
const buildSortOptions = (query = {}) => {
  const allowedSortFields = ['date', 'amount', 'title', 'createdAt'];
  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'date';
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

  return { [sortBy]: sortDirection };
};

/**
 * Calculates pagination metadata and traversal flags.
 *
 * @param {number} totalItems - Total count of matching records
 * @param {number} page - Current requested page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
const buildPaginationMetadata = (totalItems, page = 1, limit = 20) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const totalPages = Math.ceil(totalItems / parsedLimit) || 1;

  return {
    currentPage: parsedPage,
    totalPages,
    totalItems,
    itemsPerPage: parsedLimit,
    hasNextPage: parsedPage < totalPages,
    hasPrevPage: parsedPage > 1,
    nextPage: parsedPage < totalPages ? parsedPage + 1 : null,
    prevPage: parsedPage > 1 ? parsedPage - 1 : null
  };
};

module.exports = {
  escapeRegex,
  parseCommaSeparated,
  buildExpenseFilter,
  buildSortOptions,
  buildPaginationMetadata
};
