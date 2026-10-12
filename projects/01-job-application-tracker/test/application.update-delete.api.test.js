const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Application, APPLICATION_STATUS } = require('../src/models/application.model');
const { generateToken } = require('../src/utils/token');

describe('Job Application (Update & Delete) API Integration Test Suite', () => {
  let server;
  let baseUrl;

  // Track original methods for restoration
  let originalUserFindById;
  let originalAppFindOne;
  let originalAppFindOneAndDelete;

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
    originalAppFindOne = Application.findOne;
    originalAppFindOneAndDelete = Application.findOneAndDelete;

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
    Application.findOne = originalAppFindOne;
    Application.findOneAndDelete = originalAppFindOneAndDelete;
  });

  /**
   * Helper to create a realistic mock Application instance
   */
  const createMockApplication = (data) => {
    const doc = new Application(data);
    doc.save = async function () {
      return this;
    };
    return doc;
  };

  /* ==========================================================================
     UPDATE APPLICATION (PUT / PATCH)
     ========================================================================== */
  describe('PUT & PATCH /api/v1/applications/:id', () => {
    test('should successfully update job application fields via PUT (200 OK)', async () => {
      const existingDoc = createMockApplication({
        _id: '6650a2b8e3f41234567890c1',
        user: userA._id,
        company: 'Old Corp',
        position: 'Junior Dev',
        jobType: 'full-time',
        status: 'applied',
        priority: 'low'
      });

      Application.findOne = async (query) => {
        if (query._id.toString() === '6650a2b8e3f41234567890c1' && query.user.toString() === userA._id.toString()) {
          return existingDoc;
        }
        return null;
      };

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890c1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          company: 'Acme International',
          position: 'Senior Backend Engineer',
          priority: 'high',
          status: 'interviewing'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.statusCode, 200);
      assert.strictEqual(body.message, 'Job application updated successfully');
      assert.strictEqual(body.data.application.company, 'Acme International');
      assert.strictEqual(body.data.application.position, 'Senior Backend Engineer');
      assert.strictEqual(body.data.application.priority, 'high');
      assert.strictEqual(body.data.application.status, 'interviewing');
    });

    test('should successfully update a single field via PATCH (200 OK)', async () => {
      const existingDoc = createMockApplication({
        _id: '6650a2b8e3f41234567890c2',
        user: userA._id,
        company: 'Stripe',
        position: 'Staff Engineer',
        notes: 'Initial notes'
      });

      Application.findOne = async (query) => {
        if (query._id.toString() === '6650a2b8e3f41234567890c2' && query.user.toString() === userA._id.toString()) {
          return existingDoc;
        }
        return null;
      };

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890c2`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          notes: 'Updated referral note following preliminary screening'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.application.notes, 'Updated referral note following preliminary screening');
      assert.strictEqual(body.data.application.company, 'Stripe');
    });

    test('should preserve nested salary subdocument properties when updating partial salary', async () => {
      const existingDoc = createMockApplication({
        _id: '6650a2b8e3f41234567890c3',
        user: userA._id,
        company: 'Fintech Hub',
        position: 'Platform Engineer',
        salary: {
          min: 100000,
          max: 140000,
          currency: 'USD',
          period: 'yearly'
        }
      });

      Application.findOne = async () => existingDoc;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890c3`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          salary: {
            max: 155000
          }
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.data.application.salary.min, 100000);
      assert.strictEqual(body.data.application.salary.max, 155000);
      assert.strictEqual(body.data.application.salary.currency, 'USD');
    });

    test('should return 404 Not Found when updating another user application (Ownership Security)', async () => {
      // Mock: Application belongs to User B, but User A tries to update
      Application.findOne = async (query) => {
        if (query.user.toString() === userA._id.toString()) {
          return null;
        }
        return createMockApplication({
          _id: '6650a2b8e3f41234567890bb',
          user: userB._id,
          company: 'Confidential Inc'
        });
      };

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890bb`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          company: 'Hacked Corp'
        })
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          company: 'Ghost Corp'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.statusCode, 404);
    });

    test('should return 400 Bad Request when update payload is empty (min 1 field required)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890c1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({})
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Validation failed');
      assert.ok(body.details.some((d) => d.message.includes('At least one field must be provided')));
    });

    test('should return 400 Bad Request for malformed ObjectId URL parameter', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/not-a-valid-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          notes: 'Testing bad id'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.details.some((d) => d.message.includes('Must be a valid 24-character hexadecimal MongoDB ObjectId')));
    });

    test('should return 400 Bad Request when providing invalid enum value', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890c1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          status: 'invalid-status-string'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.details.some((d) => d.field.includes('status')));
    });
  });

  /* ==========================================================================
     DELETE APPLICATION (DELETE /:id)
     ========================================================================== */
  describe('DELETE /api/v1/applications/:id', () => {
    test('should successfully delete application with user ownership check (200 OK)', async () => {
      let queryUsed = null;

      Application.findOneAndDelete = async (query) => {
        queryUsed = query;
        return {
          _id: '6650a2b8e3f41234567890c1',
          user: userA._id,
          company: 'Deleted Corp',
          position: 'Software Engineer'
        };
      };

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890c1`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.statusCode, 200);
      assert.strictEqual(body.message, 'Job application deleted successfully');
      assert.strictEqual(body.data.application.company, 'Deleted Corp');

      // Verify strict ownership criteria was passed to query
      assert.strictEqual(queryUsed._id.toString(), '6650a2b8e3f41234567890c1');
      assert.strictEqual(queryUsed.user.toString(), userA._id.toString());
    });

    test('should return 404 Not Found when attempting to delete another user application (Ownership Security)', async () => {
      Application.findOneAndDelete = async (query) => {
        if (query.user.toString() === userA._id.toString()) {
          return null; // Not found for User A!
        }
        return { _id: '6650a2b8e3f41234567890d2', user: userB._id };
      };

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890d2`, {
        method: 'DELETE',
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

    test('should return 404 Not Found when deleting non-existent application', async () => {
      Application.findOneAndDelete = async () => null;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f4123456789099`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(body.success, false);
    });

    test('should return 400 Bad Request when DELETE ID parameter is invalid ObjectId', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/invalid-id`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
    });

    test('should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890c1`, {
        method: 'DELETE'
      });

      const body = await res.json();

      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
    });
  });

  /* ==========================================================================
     UPDATE STATUS (PATCH /:id/status)
     ========================================================================== */
  describe('PATCH /api/v1/applications/:id/status', () => {
    test('should update status and clear rejection reason when moving to active stage (200 OK)', async () => {
      const existingDoc = createMockApplication({
        _id: '6650a2b8e3f41234567890e1',
        user: userA._id,
        company: 'Google',
        position: 'SRE',
        status: 'applied',
        rejectionReason: null
      });

      Application.findOne = async () => existingDoc;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890e1/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          status: 'interviewing'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.application.status, 'interviewing');
      assert.strictEqual(body.data.application.rejectionReason, null);
    });

    test('should record rejectionReason when transitioning status to rejected (200 OK)', async () => {
      const existingDoc = createMockApplication({
        _id: '6650a2b8e3f41234567890e2',
        user: userA._id,
        company: 'Meta',
        position: 'Software Engineer',
        status: 'interviewing'
      });

      Application.findOne = async () => existingDoc;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890e2/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: 'Position closed due to head-count freeze'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.application.status, 'rejected');
      assert.strictEqual(body.data.application.rejectionReason, 'Position closed due to head-count freeze');
    });

    test('should return 404 Not Found on status update when application belongs to another user', async () => {
      Application.findOne = async () => null;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890bb/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          status: 'offered'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(body.success, false);
    });
  });

  /* ==========================================================================
     APPEND INTERVIEW STAGE (POST /:id/interview-stages)
     ========================================================================== */
  describe('POST /api/v1/applications/:id/interview-stages', () => {
    test('should append interview stage and automatically transition status from applied to interviewing (201 Created)', async () => {
      const existingDoc = createMockApplication({
        _id: '6650a2b8e3f41234567890f1',
        user: userA._id,
        company: 'Netflix',
        position: 'Cloud Architect',
        status: 'applied',
        interviewStages: []
      });

      Application.findOne = async () => existingDoc;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890f1/interview-stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          stageName: 'Technical Round 1 - System Design',
          interviewer: 'Dan Architect',
          status: 'scheduled',
          feedback: 'Prepare distributed caching trade-offs'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.message, 'Interview stage added successfully');
      assert.strictEqual(body.data.stage.stageName, 'Technical Round 1 - System Design');
      assert.strictEqual(body.data.stage.interviewer, 'Dan Architect');
      assert.strictEqual(body.data.application.status, 'interviewing');
      assert.strictEqual(body.data.application.interviewStages.length, 1);
    });

    test('should return 400 Bad Request when stageName is missing', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890f1/interview-stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          interviewer: 'Someone'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.details.some((d) => d.field.includes('stageName')));
    });

    test('should return 404 Not Found when adding interview stage to another user application', async () => {
      Application.findOne = async () => null;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890bb/interview-stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`
        },
        body: JSON.stringify({
          stageName: 'HR Screening'
        })
      });

      const body = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(body.success, false);
    });
  });

  /* ==========================================================================
     ARCHIVE & UNARCHIVE (PATCH /:id/archive & PATCH /:id/unarchive)
     ========================================================================== */
  describe('PATCH /api/v1/applications/:id/archive & unarchive', () => {
    test('should archive application with user ownership check (200 OK)', async () => {
      const existingDoc = createMockApplication({
        _id: '6650a2b8e3f41234567890a1',
        user: userA._id,
        company: 'Archived Corp',
        position: 'Backend Developer',
        isArchived: false
      });

      Application.findOne = async () => existingDoc;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890a1/archive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.message, 'Job application archived successfully');
      assert.strictEqual(body.data.application.isArchived, true);
    });

    test('should unarchive application with user ownership check (200 OK)', async () => {
      const existingDoc = createMockApplication({
        _id: '6650a2b8e3f41234567890a2',
        user: userA._id,
        company: 'Restored Corp',
        position: 'Backend Developer',
        isArchived: true
      });

      Application.findOne = async () => existingDoc;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890a2/unarchive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.message, 'Job application unarchived successfully');
      assert.strictEqual(body.data.application.isArchived, false);
    });

    test('should return 404 Not Found when attempting to archive another user application', async () => {
      Application.findOne = async () => null;

      const res = await fetch(`${baseUrl}/api/v1/applications/6650a2b8e3f41234567890bb/archive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenUserA}`
        }
      });

      const body = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(body.success, false);
    });
  });
});
