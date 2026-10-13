const { describe, test } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const {
  escapeRegex,
  parseCommaSeparated,
  buildApplicationFilter,
  buildSortOptions,
  buildPaginationMetadata
} = require('../src/utils/queryBuilder');

describe('QueryBuilder Unit Tests', () => {
  const dummyUserId = new mongoose.Types.ObjectId();

  describe('escapeRegex', () => {
    test('should properly escape regex metacharacters', () => {
      const input = 'Node.js (Backend) [Senior] + C++? * $ ^';
      const escaped = escapeRegex(input);
      assert.strictEqual(
        escaped,
        'Node\\.js\\ \\(Backend\\)\\ \\[Senior\\]\\ \\+\\ C\\+\\+\\?\\ \\*\\ \\$\\ \\^'
      );
    });

    test('should return empty string for non-string inputs', () => {
      assert.strictEqual(escapeRegex(null), '');
      assert.strictEqual(escapeRegex(undefined), '');
      assert.strictEqual(escapeRegex(123), '');
    });
  });

  describe('parseCommaSeparated', () => {
    test('should parse comma-separated string into clean trimmed array', () => {
      const input = ' applied , interviewing,offered ';
      const result = parseCommaSeparated(input);
      assert.deepStrictEqual(result, ['applied', 'interviewing', 'offered']);
    });

    test('should handle array inputs with comma elements', () => {
      const input = ['applied,interviewing', 'offered'];
      const result = parseCommaSeparated(input);
      assert.deepStrictEqual(result, ['applied', 'interviewing', 'offered']);
    });

    test('should return empty array for empty, null, or undefined inputs', () => {
      assert.deepStrictEqual(parseCommaSeparated(''), []);
      assert.deepStrictEqual(parseCommaSeparated(null), []);
      assert.deepStrictEqual(parseCommaSeparated(undefined), []);
    });
  });

  describe('buildApplicationFilter', () => {
    test('should throw error when userId is missing', () => {
      assert.throws(() => {
        buildApplicationFilter({}, null);
      }, /User ID is required/);
    });

    test('should construct base filter with user isolation', () => {
      const filter = buildApplicationFilter({}, dummyUserId);
      assert.strictEqual(filter.user.toString(), dummyUserId.toString());
      assert.strictEqual(Object.keys(filter).length, 1);
    });

    test('should handle single status filter', () => {
      const filter = buildApplicationFilter({ status: 'interviewing' }, dummyUserId);
      assert.strictEqual(filter.status, 'interviewing');
    });

    test('should handle multiple comma-separated statuses with $in operator', () => {
      const filter = buildApplicationFilter({ status: 'applied,interviewing' }, dummyUserId);
      assert.deepStrictEqual(filter.status, { $in: ['applied', 'interviewing'] });
    });

    test('should handle single and multiple job types', () => {
      const singleFilter = buildApplicationFilter({ jobType: 'full-time' }, dummyUserId);
      assert.strictEqual(singleFilter.jobType, 'full-time');

      const multiFilter = buildApplicationFilter({ jobType: 'full-time,contract' }, dummyUserId);
      assert.deepStrictEqual(multiFilter.jobType, { $in: ['full-time', 'contract'] });
    });

    test('should handle single and multiple work locations', () => {
      const singleFilter = buildApplicationFilter({ workLocation: 'remote' }, dummyUserId);
      assert.strictEqual(singleFilter.workLocation, 'remote');

      const multiFilter = buildApplicationFilter({ workLocation: 'remote,hybrid' }, dummyUserId);
      assert.deepStrictEqual(multiFilter.workLocation, { $in: ['remote', 'hybrid'] });
    });

    test('should handle single and multiple priorities', () => {
      const singleFilter = buildApplicationFilter({ priority: 'high' }, dummyUserId);
      assert.strictEqual(singleFilter.priority, 'high');

      const multiFilter = buildApplicationFilter({ priority: 'high,medium' }, dummyUserId);
      assert.deepStrictEqual(multiFilter.priority, { $in: ['high', 'medium'] });
    });

    test('should handle isArchived boolean filter', () => {
      const archivedFilter = buildApplicationFilter({ isArchived: true }, dummyUserId);
      assert.strictEqual(archivedFilter.isArchived, true);

      const activeFilter = buildApplicationFilter({ isArchived: false }, dummyUserId);
      assert.strictEqual(activeFilter.isArchived, false);
    });

    test('should handle hasFollowUp boolean filter', () => {
      const withFollowUp = buildApplicationFilter({ hasFollowUp: true }, dummyUserId);
      assert.deepStrictEqual(withFollowUp.followUpDate, { $ne: null });

      const withoutFollowUp = buildApplicationFilter({ hasFollowUp: false }, dummyUserId);
      assert.strictEqual(withoutFollowUp.followUpDate, null);
    });

    test('should handle specific company and position filters with case-insensitive regex', () => {
      const filter = buildApplicationFilter(
        { company: 'Google', position: 'Senior Backend' },
        dummyUserId
      );
      assert.deepStrictEqual(filter.company, { $regex: 'Google', $options: 'i' });
      assert.deepStrictEqual(filter.position, { $regex: 'Senior\\ Backend', $options: 'i' });
    });

    test('should handle general search with regex across multiple fields', () => {
      const filter = buildApplicationFilter({ search: 'Engineer' }, dummyUserId);
      assert.ok(Array.isArray(filter.$or));
      assert.strictEqual(filter.$or.length, 4);
      assert.deepStrictEqual(filter.$or[0].company, /Engineer/i);
      assert.deepStrictEqual(filter.$or[1].position, /Engineer/i);
      assert.deepStrictEqual(filter.$or[2].notes, /Engineer/i);
      assert.deepStrictEqual(filter.$or[3].location, /Engineer/i);
    });

    test('should handle general search with MongoDB $text when searchType=text', () => {
      const filter = buildApplicationFilter(
        { search: 'Engineer', searchType: 'text' },
        dummyUserId
      );
      assert.deepStrictEqual(filter.$text, { $search: 'Engineer' });
    });

    test('should handle salary range filters (minSalary and maxSalary)', () => {
      const filter = buildApplicationFilter({ minSalary: 100000, maxSalary: 150000 }, dummyUserId);
      assert.ok(Array.isArray(filter.$and));
      assert.strictEqual(filter.$and.length, 2);
    });

    test('should handle applicationDate range filters (fromDate and toDate)', () => {
      const from = '2026-01-01T00:00:00.000Z';
      const to = '2026-12-31T23:59:59.999Z';
      const filter = buildApplicationFilter({ fromDate: from, toDate: to }, dummyUserId);
      assert.deepStrictEqual(filter.applicationDate, {
        $gte: new Date(from),
        $lte: new Date(to)
      });
    });
  });

  describe('buildSortOptions', () => {
    test('should default to createdAt desc', () => {
      const sort = buildSortOptions();
      assert.deepStrictEqual(sort, { createdAt: -1 });
    });

    test('should support asc order on whitelisted fields', () => {
      assert.deepStrictEqual(buildSortOptions('company', 'asc'), { company: 1 });
      assert.deepStrictEqual(buildSortOptions('position', 'asc'), { position: 1 });
      assert.deepStrictEqual(buildSortOptions('applicationDate', 'asc'), { applicationDate: 1 });
      assert.deepStrictEqual(buildSortOptions('salary.min', 'desc'), { 'salary.min': -1 });
    });

    test('should fallback to createdAt for non-whitelisted sort fields', () => {
      const sort = buildSortOptions('password', 'asc');
      assert.deepStrictEqual(sort, { createdAt: 1 });
    });
  });

  describe('buildPaginationMetadata', () => {
    test('should compute correct pagination metadata for middle page', () => {
      const meta = buildPaginationMetadata(2, 10, 35);
      assert.strictEqual(meta.total, 35);
      assert.strictEqual(meta.page, 2);
      assert.strictEqual(meta.limit, 10);
      assert.strictEqual(meta.totalPages, 4);
      assert.strictEqual(meta.hasNextPage, true);
      assert.strictEqual(meta.hasPrevPage, true);
      assert.strictEqual(meta.nextPage, 3);
      assert.strictEqual(meta.prevPage, 1);
    });

    test('should compute boundary metadata for first page', () => {
      const meta = buildPaginationMetadata(1, 10, 5);
      assert.strictEqual(meta.total, 5);
      assert.strictEqual(meta.page, 1);
      assert.strictEqual(meta.limit, 10);
      assert.strictEqual(meta.totalPages, 1);
      assert.strictEqual(meta.hasNextPage, false);
      assert.strictEqual(meta.hasPrevPage, false);
      assert.strictEqual(meta.nextPage, null);
      assert.strictEqual(meta.prevPage, null);
    });

    test('should compute boundary metadata for last page', () => {
      const meta = buildPaginationMetadata(3, 10, 25);
      assert.strictEqual(meta.totalPages, 3);
      assert.strictEqual(meta.hasNextPage, false);
      assert.strictEqual(meta.hasPrevPage, true);
      assert.strictEqual(meta.nextPage, null);
      assert.strictEqual(meta.prevPage, 2);
    });

    test('should gracefully handle empty or zero results', () => {
      const meta = buildPaginationMetadata(1, 10, 0);
      assert.strictEqual(meta.total, 0);
      assert.strictEqual(meta.totalPages, 1);
      assert.strictEqual(meta.hasNextPage, false);
      assert.strictEqual(meta.hasPrevPage, false);
      assert.strictEqual(meta.nextPage, null);
      assert.strictEqual(meta.prevPage, null);
    });
  });
});
