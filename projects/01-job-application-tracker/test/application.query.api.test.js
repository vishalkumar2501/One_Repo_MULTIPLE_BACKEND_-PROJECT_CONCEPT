const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Application } = require('../src/models/application.model');
const { generateToken } = require('../src/utils/token');

describe('Job Application Advanced Querying API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalUserFindById;
  let originalAppFind;
  let originalAppCountDocuments;

  const userA = new User({
    _id: '6650a2b8e3f41234567890aa',
    name: 'Alice Developer',
    email: 'alice@example.com',
    role: 'user',
    isActive: true
  });

  const tokenUserA = generateToken({
    id: '6650a2b8e3f41234567890aa',
    email: 'alice@example.com',
    role: 'user'
  });

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });

  beforeEach(() => {
    originalUserFindById = User.findById;
    originalAppFind = Application.find;
    originalAppCountDocuments = Application.countDocuments;

    User.findById = async (id) => {
      if (id.toString() === '6650a2b8e3f41234567890aa') return userA;
      return null;
    };
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Application.find = originalAppFind;
    Application.countDocuments = originalAppCountDocuments;
  });

  // Helper to setup mock Application.find and countDocuments
  const setupMockFind = (mockResults = [], totalCount = 0) => {
    let capturedFilter = null;
    let capturedSort = null;
    let capturedSkip = null;
    let capturedLimit = null;

    Application.find = (filter) => {
      capturedFilter = filter;
      return {
        sort: (sort) => {
          capturedSort = sort;
          return {
            skip: (skip) => {
              capturedSkip = skip;
              return {
                limit: async (limit) => {
                  capturedLimit = limit;
                  return mockResults;
                }
              };
            }
          };
        }
      };
    };

    Application.countDocuments = async (filter) => {
      return totalCount !== undefined ? totalCount : mockResults.length;
    };

    return {
      getFilter: () => capturedFilter,
      getSort: () => capturedSort,
      getSkip: () => capturedSkip,
      getLimit: () => capturedLimit
    };
  };

  describe('Search Functionality', () => {
    test('should apply general regex search across company, position, notes, and location', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?search=Engineer`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      const filter = mock.getFilter();
      assert.strictEqual(filter.user.toString(), userA._id.toString());
      assert.ok(Array.isArray(filter.$or));
      assert.strictEqual(filter.$or.length, 4);
    });

    test('should apply MongoDB text search when searchType=text', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?search=Netflix&searchType=text`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      const filter = mock.getFilter();
      assert.deepStrictEqual(filter.$text, { $search: 'Netflix' });
    });

    test('should search by specific company name with case-insensitive regex', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?company=Stripe`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      const filter = mock.getFilter();
      assert.deepStrictEqual(filter.company, { $regex: 'Stripe', $options: 'i' });
    });

    test('should search by specific position title with case-insensitive regex', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?position=Staff Backend`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      const filter = mock.getFilter();
      assert.deepStrictEqual(filter.position, { $regex: 'Staff\\ Backend', $options: 'i' });
    });

    test('should safely escape regex special characters in search query', async () => {
      const mock = setupMockFind();

      const res = await fetch(
        `${baseUrl}/api/v1/applications?search=${encodeURIComponent('C++ (Backend) [Senior]')}`,
        {
          headers: { Authorization: `Bearer ${tokenUserA}` }
        }
      );

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      const filter = mock.getFilter();
      assert.ok(Array.isArray(filter.$or));
    });
  });

  describe('Filtering Functionality', () => {
    test('should filter by single status and multiple comma-separated statuses', async () => {
      const mock = setupMockFind();

      // Test multiple comma-separated statuses
      const res = await fetch(`${baseUrl}/api/v1/applications?status=applied,interviewing`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);

      const filter = mock.getFilter();
      assert.deepStrictEqual(filter.status, { $in: ['applied', 'interviewing'] });
    });

    test('should filter by multiple comma-separated job types', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?jobType=full-time,contract`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);

      const filter = mock.getFilter();
      assert.deepStrictEqual(filter.jobType, { $in: ['full-time', 'contract'] });
    });

    test('should filter by multiple work locations and priorities', async () => {
      const mock = setupMockFind();

      const res = await fetch(
        `${baseUrl}/api/v1/applications?workLocation=remote,hybrid&priority=high,medium`,
        {
          headers: { Authorization: `Bearer ${tokenUserA}` }
        }
      );

      const body = await res.json();
      assert.strictEqual(res.status, 200);

      const filter = mock.getFilter();
      assert.deepStrictEqual(filter.workLocation, { $in: ['remote', 'hybrid'] });
      assert.deepStrictEqual(filter.priority, { $in: ['high', 'medium'] });
    });

    test('should filter by isArchived state', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?isArchived=true`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);

      const filter = mock.getFilter();
      assert.strictEqual(filter.isArchived, true);
    });

    test('should filter by hasFollowUp boolean flag', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?hasFollowUp=true`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);

      const filter = mock.getFilter();
      assert.deepStrictEqual(filter.followUpDate, { $ne: null });
    });

    test('should filter by salary range (minSalary and maxSalary)', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?minSalary=120000&maxSalary=180000`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);

      const filter = mock.getFilter();
      assert.ok(Array.isArray(filter.$and));
      assert.strictEqual(filter.$and.length, 2);
    });

    test('should filter by applicationDate range (fromDate and toDate)', async () => {
      const mock = setupMockFind();
      const from = '2026-01-01T00:00:00.000Z';
      const to = '2026-06-30T23:59:59.999Z';

      const res = await fetch(`${baseUrl}/api/v1/applications?fromDate=${from}&toDate=${to}`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);

      const filter = mock.getFilter();
      assert.deepStrictEqual(filter.applicationDate, {
        $gte: new Date(from),
        $lte: new Date(to)
      });
    });
  });

  describe('Sorting Functionality', () => {
    test('should sort by company ascending', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?sortBy=company&sortOrder=asc`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(mock.getSort(), { company: 1 });
    });

    test('should sort by applicationDate descending', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?sortBy=applicationDate&sortOrder=desc`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(mock.getSort(), { applicationDate: -1 });
    });

    test('should sort by salary.min descending', async () => {
      const mock = setupMockFind();

      const res = await fetch(`${baseUrl}/api/v1/applications?sortBy=salary.min&sortOrder=desc`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(mock.getSort(), { 'salary.min': -1 });
    });
  });

  describe('Pagination Functionality', () => {
    test('should calculate pagination metadata accurately across multi-page results', async () => {
      const mockApps = [{ _id: 'app1' }, { _id: 'app2' }];
      const mock = setupMockFind(mockApps, 25);

      const res = await fetch(`${baseUrl}/api/v1/applications?page=2&limit=10`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      assert.strictEqual(body.data.pagination.total, 25);
      assert.strictEqual(body.data.pagination.page, 2);
      assert.strictEqual(body.data.pagination.limit, 10);
      assert.strictEqual(body.data.pagination.totalPages, 3);
      assert.strictEqual(body.data.pagination.hasNextPage, true);
      assert.strictEqual(body.data.pagination.hasPrevPage, true);
      assert.strictEqual(body.data.pagination.nextPage, 3);
      assert.strictEqual(body.data.pagination.prevPage, 1);

      assert.strictEqual(mock.getSkip(), 10);
      assert.strictEqual(mock.getLimit(), 10);
    });

    test('should provide correct navigation for final page of results', async () => {
      const mock = setupMockFind([], 25);

      const res = await fetch(`${baseUrl}/api/v1/applications?page=3&limit=10`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.data.pagination.hasNextPage, false);
      assert.strictEqual(body.data.pagination.hasPrevPage, true);
      assert.strictEqual(body.data.pagination.nextPage, null);
      assert.strictEqual(body.data.pagination.prevPage, 2);
    });
  });

  describe('Multi-Criteria Integration', () => {
    test('should combine search, multi-status, salary range, sorting, and pagination simultaneously', async () => {
      const mock = setupMockFind([], 45);

      const res = await fetch(
        `${baseUrl}/api/v1/applications?search=Cloud&status=interviewing,offered&jobType=full-time&workLocation=remote&priority=high&minSalary=130000&sortBy=company&sortOrder=asc&page=2&limit=5`,
        {
          headers: { Authorization: `Bearer ${tokenUserA}` }
        }
      );

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      const filter = mock.getFilter();
      assert.strictEqual(filter.user.toString(), userA._id.toString());
      assert.deepStrictEqual(filter.status, { $in: ['interviewing', 'offered'] });
      assert.strictEqual(filter.jobType, 'full-time');
      assert.strictEqual(filter.workLocation, 'remote');
      assert.strictEqual(filter.priority, 'high');
      assert.ok(filter.$or); // search $or
      assert.deepStrictEqual(mock.getSort(), { company: 1 });
      assert.strictEqual(mock.getSkip(), 5);
      assert.strictEqual(mock.getLimit(), 5);

      assert.strictEqual(body.data.pagination.page, 2);
      assert.strictEqual(body.data.pagination.limit, 5);
      assert.strictEqual(body.data.pagination.totalPages, 9);
    });
  });

  describe('Validation Failures (400 Bad Request)', () => {
    test('should reject query with invalid status in comma-separated list', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?status=applied,not-a-valid-status`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Validation failed');
    });

    test('should reject query with negative minSalary', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?minSalary=-500`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Validation failed');
    });

    test('should reject query with invalid date string', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?fromDate=not-a-date`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Validation failed');
    });

    test('should reject query with limit greater than 100', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?limit=250`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Validation failed');
    });

    test('should reject query with invalid sort field', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?sortBy=secretPassword`, {
        headers: { Authorization: `Bearer ${tokenUserA}` }
      });

      const body = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Validation failed');
    });
  });
});
