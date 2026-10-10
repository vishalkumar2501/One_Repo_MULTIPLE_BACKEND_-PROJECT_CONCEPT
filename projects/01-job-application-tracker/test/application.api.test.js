const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Application } = require('../src/models/application.model');
const { generateToken } = require('../src/utils/token');

describe('Job Application (Create & Read) API Integration Test Suite', () => {
  let server;
  let baseUrl;

  // Track original methods for restoration
  let originalUserFindById;
  let originalAppCreate;
  let originalAppFind;
  let originalAppFindOne;
  let originalAppCountDocuments;

  const userA = new User({
    _id: '6650a2b8e3f41234567890aa',
    name: 'Alice Developer',
    email: 'alice@example.com',
    role: 'user',
    isActive: true
  });

  const userB = new User({
    _id: '6650a2b8e3f41234567890bb',
    name: 'Bob Engineer',
    email: 'bob@example.com',
    role: 'user',
    isActive: true
  });

  const tokenUserA = generateToken({
    id: '6650a2b8e3f41234567890aa',
    email: 'alice@example.com',
    role: 'user'
  });

  const tokenUserB = generateToken({
    id: '6650a2b8e3f41234567890bb',
    email: 'bob@example.com',
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
    originalAppCreate = Application.create;
    originalAppFind = Application.find;
    originalAppFindOne = Application.findOne;
    originalAppCountDocuments = Application.countDocuments;

    // Default mock user lookup for authentication middleware
    User.findById = async (id) => {
      const idStr = id.toString();
      if (idStr === '6650a2b8e3f41234567890aa') return userA;
      if (idStr === '6650a2b8e3f41234567890bb') return userB;
      return null;
    };
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Application.create = originalAppCreate;
    Application.find = originalAppFind;
    Application.findOne = originalAppFindOne;
    Application.countDocuments = originalAppCountDocuments;
  });

  describe('POST /api/v1/applications', () => {
    test('should successfully create job application and link to authenticated user (201 Created)', async () => {
      let createdPayload = null;

      Application.create = async (doc) => {
        createdPayload = doc;
        return {
          _id: '6650a2b8e3f41234567890c1',
          ...doc,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      };

      const payload = {
        company: 'Stripe',
        position: 'Backend Software Engineer',
        jobType: 'full-time',
        workLocation: 'remote',
        status: 'applied',
        priority: 'high',
        salary: {
          min: 140000,
          max: 180000,
          currency: 'USD',
          period: 'yearly'
        },
        notes: 'Applied via company careers portal'
      };

      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify(payload)
      });

      const body = await res.json();

      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.statusCode, 201);
      assert.strictEqual(body.message, 'Job application created successfully');
      assert.strictEqual(body.data.application.company, 'Stripe');
      assert.strictEqual(body.data.application.position, 'Backend Software Engineer');

      // Verify user ID was automatically attached from auth context
      assert.strictEqual(createdPayload.user.toString(), userA._id.toString());
    });

    test('should reject request when company is missing (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          position: 'Frontend Engineer'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('Validation error'));
    });

    test('should reject request when position is missing (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          company: 'Google'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('Validation error'));
    });

    test('should reject request when salary minimum is negative (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          company: 'Acme Corp',
          position: 'Staff Engineer',
          salary: {
            min: -5000
          }
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('Validation error'));
    });

    test('should return 401 Unauthorized when Authorization header is absent', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company: 'Netflix',
          position: 'Systems Engineer'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('Authentication required'));
    });
  });

  describe('GET /api/v1/applications', () => {
    test('should retrieve applications with pagination metadata for authenticated user (200 OK)', async () => {
      const mockApps = [
        {
          _id: '6650a2b8e3f41234567890d1',
          user: userA._id,
          company: 'Shopify',
          position: 'Senior Backend Engineer',
          status: 'interviewing',
          workLocation: 'remote'
        },
        {
          _id: '6650a2b8e3f41234567890d2',
          user: userA._id,
          company: 'GitHub',
          position: 'Platform Engineer',
          status: 'applied',
          workLocation: 'remote'
        }
      ];

      let queryFilter = null;
      let sortParam = null;
      let skipParam = null;
      let limitParam = null;

      Application.find = (filter) => {
        queryFilter = filter;
        return {
          sort: (sort) => {
            sortParam = sort;
            return {
              skip: (skip) => {
                skipParam = skip;
                return {
                  limit: async (limit) => {
                    limitParam = limit;
                    return mockApps;
                  }
                };
              }
            };
          }
        };
      };

      Application.countDocuments = async (filter) => {
        return 2;
      };

      const res = await fetch(`${baseUrl}/api/v1/applications?page=1&limit=10&sortBy=createdAt&sortOrder=desc`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.statusCode, 200);
      assert.strictEqual(body.data.applications.length, 2);
      assert.strictEqual(body.data.pagination.total, 2);
      assert.strictEqual(body.data.pagination.page, 1);
      assert.strictEqual(body.data.pagination.limit, 10);
      assert.strictEqual(body.data.pagination.totalPages, 1);
      assert.strictEqual(body.data.pagination.hasNextPage, false);
      assert.strictEqual(body.data.pagination.hasPrevPage, false);

      // Verify user isolation was strictly enforced
      assert.strictEqual(queryFilter.user.toString(), userA._id.toString());
      assert.strictEqual(sortParam.createdAt, -1);
      assert.strictEqual(skipParam, 0);
      assert.strictEqual(limitParam, 10);
    });

    test('should apply query filters (status, workLocation, priority) with user isolation', async () => {
      let capturedFilter = null;

      Application.find = (filter) => {
        capturedFilter = filter;
        return {
          sort: () => ({
            skip: () => ({
              limit: async () => []
            })
          })
        };
      };

      Application.countDocuments = async () => 0;

      const res = await fetch(
        `${baseUrl}/api/v1/applications?status=interviewing&workLocation=remote&priority=high`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenUserA}`
          }
        }
      );

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(capturedFilter.user.toString(), userA._id.toString());
      assert.strictEqual(capturedFilter.status, 'interviewing');
      assert.strictEqual(capturedFilter.workLocation, 'remote');
      assert.strictEqual(capturedFilter.priority, 'high');
    });

    test('should reject query with invalid status (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?status=invalid-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('Validation error'));
    });

    test('should return 401 Unauthorized for unauthenticated GET /applications', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'GET'
      });

      const body = await res.json();

      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('Authentication required'));
    });
  });

  describe('GET /api/v1/applications/:id', () => {
    test('should return job application by ID when owned by authenticated user (200 OK)', async () => {
      const mockApp = {
        _id: '6650a2b8e3f41234567890e1',
        user: userA._id,
        company: 'Vercel',
        position: 'Solutions Architect',
        status: 'interviewing'
      };

      Application.findOne = async (query) => {
        if (query._id === '6650a2b8e3f41234567890e1' && query.user.toString() === userA._id.toString()) {
          return mockApp;
        }
        return null;
      };

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890e1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.statusCode, 200);
      assert.strictEqual(body.data.application.company, 'Vercel');
      assert.strictEqual(body.data.application.position, 'Solutions Architect');
    });

    test('should return 404 Not Found when application belongs to another user (Strict User Isolation)', async () => {
      // Mock: Application exists in database for User B, but requested by User A
      Application.findOne = async (query) => {
        // Enforce user check in mock
        if (query.user.toString() === userA._id.toString()) {
          return null; // Not found for User A!
        }
        return {
          _id: '6650a2b8e3f41234567890f1',
          user: userB._id,
          company: 'Secret Corp'
        };
      };

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890f1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.statusCode, 404);
      assert.ok(body.message.includes('not found'));
    });

    test('should return 404 Not Found when application does not exist', async () => {
      Application.findOne = async () => null;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f4123456789099`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.statusCode, 404);
    });

    test('should return 400 Bad Request when ID parameter is not a valid 24-char ObjectId', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/invalid-object-id`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('Validation error'));
    });

    test('should return 401 Unauthorized when requesting single application without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890e1`, {
        method: 'GET'
      });

      const body = await res.json();

      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('Authentication required'));
    });
  });
});
