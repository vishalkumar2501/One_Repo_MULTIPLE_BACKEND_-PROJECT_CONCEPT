const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Application } = require('../src/models/application.model');
const { generateToken } = require('../src/utils/token');

describe('Job Application Statistics & Analytics API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalUserFindById;
  let originalAppAggregate;

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

  const userB = new User({
    _id: '6650a2b8e3f41234567890bb',
    name: 'Bob Engineer',
    email: 'bob@example.com',
    role: 'user',
    isActive: true
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
    originalAppAggregate = Application.aggregate;

    User.findById = async (id) => {
      const idStr = id.toString();
      if (idStr === '6650a2b8e3f41234567890aa') return userA;
      if (idStr === '6650a2b8e3f41234567890bb') return userB;
      return null;
    };
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Application.aggregate = originalAppAggregate;
  });

  test('GET /api/v1/applications/stats should return 401 Unauthorized when no token provided', async () => {
    const res = await fetch(`${baseUrl}/api/v1/applications/stats`);
    const body = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.match(body.message, /authentication|token/i);
  });

  test('GET /api/v1/applications/stats should return 200 OK with zero-count defaults for user without applications', async () => {
    Application.aggregate = async (pipeline) => {
      assert.strictEqual(pipeline[0].$match.user.toString(), '6650a2b8e3f41234567890aa');
      return [
        {
          byStatus: [],
          byPriority: [],
          byJobType: [],
          byWorkLocation: [],
          overview: [],
          interviewStages: [],
          monthlyTrends: []
        }
      ];
    };

    const res = await fetch(`${baseUrl}/api/v1/applications/stats`, {
      headers: {
        Authorization: `Bearer ${tokenUserA}`
      }
    });

    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Application statistics and analytics retrieved successfully');
    assert.ok(body.data.stats);

    const { stats } = body.data;
    assert.strictEqual(stats.overview.total, 0);
    assert.strictEqual(stats.overview.active, 0);
    assert.strictEqual(stats.overview.archived, 0);
    assert.strictEqual(stats.byStatus.applied, 0);
    assert.strictEqual(stats.byStatus.interviewing, 0);
    assert.strictEqual(stats.byStatus.offered, 0);
    assert.strictEqual(stats.byStatus.rejected, 0);
    assert.strictEqual(stats.byStatus.withdrawn, 0);
    assert.strictEqual(stats.byPriority.low, 0);
    assert.strictEqual(stats.byPriority.medium, 0);
    assert.strictEqual(stats.byPriority.high, 0);
    assert.strictEqual(stats.byJobType['full-time'], 0);
    assert.strictEqual(stats.byWorkLocation.remote, 0);
    assert.deepStrictEqual(stats.monthlyTrends, []);
  });

  test('GET /api/v1/applications/stats should return aggregated analytics payload for user with active applications', async () => {
    Application.aggregate = async (pipeline) => {
      assert.strictEqual(pipeline[0].$match.user.toString(), '6650a2b8e3f41234567890aa');
      return [
        {
          byStatus: [
            { _id: 'applied', count: 12 },
            { _id: 'interviewing', count: 5 },
            { _id: 'offered', count: 2 },
            { _id: 'rejected', count: 3 }
          ],
          byPriority: [
            { _id: 'high', count: 8 },
            { _id: 'medium', count: 10 },
            { _id: 'low', count: 4 }
          ],
          byJobType: [
            { _id: 'full-time', count: 16 },
            { _id: 'contract', count: 4 },
            { _id: 'internship', count: 2 }
          ],
          byWorkLocation: [
            { _id: 'remote', count: 14 },
            { _id: 'hybrid', count: 6 },
            { _id: 'onsite', count: 2 }
          ],
          overview: [
            {
              total: 22,
              active: 20,
              archived: 2,
              pendingFollowUps: 4
            }
          ],
          interviewStages: [
            { _id: 'scheduled', count: 3 },
            { _id: 'passed', count: 5 },
            { _id: 'completed', count: 2 }
          ],
          monthlyTrends: [
            { _id: { year: 2026, month: 10 }, count: 14 },
            { _id: { year: 2026, month: 9 }, count: 8 }
          ]
        }
      ];
    };

    const res = await fetch(`${baseUrl}/api/v1/applications/stats`, {
      headers: {
        Authorization: `Bearer ${tokenUserA}`
      }
    });

    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);

    const { stats } = body.data;
    assert.strictEqual(stats.overview.total, 22);
    assert.strictEqual(stats.overview.active, 20);
    assert.strictEqual(stats.overview.archived, 2);
    assert.strictEqual(stats.overview.pendingFollowUps, 4);
    assert.strictEqual(stats.overview.totalInterviewStages, 10);

    // Status breakdown
    assert.strictEqual(stats.byStatus.applied, 12);
    assert.strictEqual(stats.byStatus.interviewing, 5);
    assert.strictEqual(stats.byStatus.offered, 2);
    assert.strictEqual(stats.byStatus.rejected, 3);
    assert.strictEqual(stats.byStatus.withdrawn, 0);
    assert.strictEqual(stats.byStatus.total, 22);

    // Priority & Location breakdown
    assert.strictEqual(stats.byPriority.high, 8);
    assert.strictEqual(stats.byWorkLocation.remote, 14);
    assert.strictEqual(stats.byJobType['full-time'], 16);

    // Monthly trends
    assert.strictEqual(stats.monthlyTrends.length, 2);
    assert.strictEqual(stats.monthlyTrends[0].year, 2026);
    assert.strictEqual(stats.monthlyTrends[0].month, 10);
    assert.strictEqual(stats.monthlyTrends[0].count, 14);
  });

  test('GET /api/v1/applications/stats should enforce strict multi-tenant isolation per user', async () => {
    let capturedUserId;
    Application.aggregate = async (pipeline) => {
      capturedUserId = pipeline[0].$match.user.toString();
      return [
        {
          byStatus: [{ _id: 'applied', count: 1 }],
          byPriority: [],
          byJobType: [],
          byWorkLocation: [],
          overview: [{ total: 1, active: 1, archived: 0, pendingFollowUps: 0 }],
          interviewStages: [],
          monthlyTrends: []
        }
      ];
    };

    // Request as User B
    const res = await fetch(`${baseUrl}/api/v1/applications/stats`, {
      headers: {
        Authorization: `Bearer ${tokenUserB}`
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(capturedUserId, '6650a2b8e3f41234567890bb');
  });
});
