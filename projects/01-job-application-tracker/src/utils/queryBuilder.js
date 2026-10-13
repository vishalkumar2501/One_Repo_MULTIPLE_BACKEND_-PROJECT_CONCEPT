/**
 * Query builder utility for MongoDB querying, filtering, sorting, and pagination.
 */

/**
 * Escapes special regex characters to prevent regex injection (ReDoS) and syntax errors.
 *
 * @param {string} text
 * @returns {string}
 */
const escapeRegex = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * Parses comma-separated string or array into an array of trimmed, non-empty strings.
 *
 * @param {string|string[]} val
 * @returns {string[]}
 */
const parseCommaSeparated = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .flatMap((v) => (typeof v === 'string' ? v.split(',') : [v]))
      .map((s) => (typeof s === 'string' ? s.trim() : s))
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Builds a MongoDB filter query object enforcing multi-tenant user isolation.
 *
 * @param {Object} query - Validated request query parameters
 * @param {string|Object} userId - Authenticated user ID
 * @returns {Object} MongoDB query filter object
 */
const buildApplicationFilter = (query = {}, userId) => {
  if (!userId) {
    throw new Error('User ID is required to build application query filter');
  }

  // Enforce strict multi-tenant user isolation
  const filter = { user: userId };

  // Status filtering (supports single value or comma-separated list)
  if (query.status) {
    const statuses = parseCommaSeparated(query.status);
    if (statuses.length === 1) {
      filter.status = statuses[0];
    } else if (statuses.length > 1) {
      filter.status = { $in: statuses };
    }
  }

  // Job type filtering (supports single value or comma-separated list)
  if (query.jobType) {
    const types = parseCommaSeparated(query.jobType);
    if (types.length === 1) {
      filter.jobType = types[0];
    } else if (types.length > 1) {
      filter.jobType = { $in: types };
    }
  }

  // Work location filtering (supports single value or comma-separated list)
  if (query.workLocation) {
    const locations = parseCommaSeparated(query.workLocation);
    if (locations.length === 1) {
      filter.workLocation = locations[0];
    } else if (locations.length > 1) {
      filter.workLocation = { $in: locations };
    }
  }

  // Priority filtering (supports single value or comma-separated list)
  if (query.priority) {
    const priorities = parseCommaSeparated(query.priority);
    if (priorities.length === 1) {
      filter.priority = priorities[0];
    } else if (priorities.length > 1) {
      filter.priority = { $in: priorities };
    }
  }

  // Soft-archived state filtering
  if (typeof query.isArchived === 'boolean') {
    filter.isArchived = query.isArchived;
  }

  // Follow-up status filtering
  if (typeof query.hasFollowUp === 'boolean') {
    if (query.hasFollowUp) {
      filter.followUpDate = { $ne: null };
    } else {
      filter.followUpDate = null;
    }
  }

  // Dedicated company search/filter (case-insensitive substring)
  if (query.company && query.company.trim()) {
    filter.company = { $regex: escapeRegex(query.company.trim()), $options: 'i' };
  }

  // Dedicated position search/filter (case-insensitive substring)
  if (query.position && query.position.trim()) {
    filter.position = { $regex: escapeRegex(query.position.trim()), $options: 'i' };
  }

  // General search across company, position, notes, and location
  if (query.search && query.search.trim()) {
    const trimmedSearch = query.search.trim();
    if (query.searchType === 'text') {
      filter.$text = { $search: trimmedSearch };
    } else {
      const regex = new RegExp(escapeRegex(trimmedSearch), 'i');
      filter.$or = [
        { company: regex },
        { position: regex },
        { notes: regex },
        { location: regex }
      ];
    }
  }

  // Salary range filtering
  if (query.minSalary !== undefined || query.maxSalary !== undefined) {
    const salaryConditions = [];
    if (query.minSalary !== undefined) {
      const minVal = Number(query.minSalary);
      salaryConditions.push({
        $or: [
          { 'salary.max': { $gte: minVal } },
          { 'salary.min': { $gte: minVal } }
        ]
      });
    }
    if (query.maxSalary !== undefined) {
      const maxVal = Number(query.maxSalary);
      salaryConditions.push({
        $or: [
          { 'salary.min': { $lte: maxVal } },
          { 'salary.max': { $lte: maxVal } }
        ]
      });
    }

    if (salaryConditions.length === 1) {
      Object.assign(filter, salaryConditions[0]);
    } else if (salaryConditions.length > 1) {
      if (!filter.$and) {
        filter.$and = [];
      }
      filter.$and.push(...salaryConditions);
    }
  }

  // Date range filtering (applicationDate)
  if (query.fromDate || query.toDate || query.startDate || query.endDate) {
    const from = query.fromDate || query.startDate;
    const to = query.toDate || query.endDate;
    const dateFilter = {};

    if (from) {
      dateFilter.$gte = new Date(from);
    }
    if (to) {
      dateFilter.$lte = new Date(to);
    }
    filter.applicationDate = dateFilter;
  }

  return filter;
};

/**
 * Builds MongoDB sort options with whitelist protection.
 *
 * @param {string} [sortBy='createdAt']
 * @param {string} [sortOrder='desc']
 * @returns {Object} Sort object (e.g., { createdAt: -1 })
 */
const buildSortOptions = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const allowedSortFields = [
    'createdAt',
    'updatedAt',
    'applicationDate',
    'company',
    'position',
    'priority',
    'status',
    'salary.min',
    'salary.max',
    'followUpDate'
  ];

  const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder === 'asc' ? 1 : -1;

  return { [field]: order };
};

/**
 * Builds standard pagination metadata object.
 *
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @param {number} [total=0]
 * @returns {Object}
 */
const buildPaginationMetadata = (page = 1, limit = 10, total = 0) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const hasNextPage = parsedPage < totalPages;
  const hasPrevPage = parsedPage > 1;

  return {
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? parsedPage + 1 : null,
    prevPage: hasPrevPage ? parsedPage - 1 : null
  };
};

module.exports = {
  escapeRegex,
  parseCommaSeparated,
  buildApplicationFilter,
  buildSortOptions,
  buildPaginationMetadata
};
