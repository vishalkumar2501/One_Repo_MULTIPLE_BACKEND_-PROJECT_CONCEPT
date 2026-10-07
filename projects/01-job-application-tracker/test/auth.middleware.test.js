const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const {
  authenticate,
  protect,
  authorize,
  restrictTo,
  optionalAuth
} = require('../src/middleware/auth');
const User = require('../src/models/user.model');
const { generateToken } = require('../src/utils/token');

describe('Auth Middleware Unit Test Suite', () => {
  let originalFindById;

  beforeEach(() => {
    originalFindById = User.findById;
  });

  afterEach(() => {
    User.findById = originalFindById;
  });

  describe('authenticate & protect middleware', () => {
    test('should reject request when Authorization header is missing (401)', async () => {
      const req = { headers: {} };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('Authentication required'));
    });

    test('should reject request when Authorization header does not start with Bearer (401)', async () => {
      const req = { headers: { authorization: 'Basic user:pass' } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('Bearer token'));
    });

    test('should reject request when Bearer token is empty (401)', async () => {
      const req = { headers: { authorization: 'Bearer   ' } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('token is missing'));
    });

    test('should reject request when token is invalid or malformed (401)', async () => {
      const req = { headers: { authorization: 'Bearer invalid.token.value' } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('Invalid authentication token'));
    });

    test('should reject request when token is expired (401)', async () => {
      const expiredToken = generateToken(
        { id: '6650a2b8e3f41234567890aa', email: 'test@example.com' },
        { expiresIn: '-1s' }
      );
      const req = { headers: { authorization: `Bearer ${expiredToken}` } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('expired'));
    });

    test('should reject request when token payload lacks user id (401)', async () => {
      const tokenWithoutId = generateToken({ email: 'test@example.com' });
      const req = { headers: { authorization: `Bearer ${tokenWithoutId}` } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('Invalid authentication token payload'));
    });

    test('should reject request when user does not exist in database (401)', async () => {
      User.findById = async () => null;

      const token = generateToken({ id: '6650a2b8e3f41234567890aa', email: 'deleted@example.com' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('no longer exists'));
    });

    test('should reject request when user is deactivated (403)', async () => {
      const mockInactiveUser = new User({
        _id: '6650a2b8e3f41234567890aa',
        name: 'Inactive User',
        email: 'inactive@example.com',
        role: 'user',
        isActive: false
      });

      User.findById = async () => mockInactiveUser;

      const token = generateToken({ id: '6650a2b8e3f41234567890aa', email: 'inactive@example.com' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 403);
      assert.ok(caughtError.message.includes('account has been deactivated'));
    });

    test('should authenticate active user and attach req.user, req.token, and req.auth (200 OK)', async () => {
      const mockActiveUser = new User({
        _id: '6650a2b8e3f41234567890aa',
        name: 'Active User',
        email: 'active@example.com',
        role: 'user',
        isActive: true
      });

      User.findById = async (id) => {
        if (id === '6650a2b8e3f41234567890aa') {
          return mockActiveUser;
        }
        return null;
      };

      const token = generateToken({ id: '6650a2b8e3f41234567890aa', email: 'active@example.com', role: 'user' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await authenticate(req, res, (err) => {
        assert.strictEqual(err, undefined);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.ok(req.user);
      assert.strictEqual(req.user.name, 'Active User');
      assert.strictEqual(req.token, token);
      assert.strictEqual(req.auth.id, '6650a2b8e3f41234567890aa');
    });

    test('protect should be an alias of authenticate', () => {
      assert.strictEqual(protect, authenticate);
    });
  });

  describe('authorize & restrictTo middleware', () => {
    test('should reject if req.user is undefined (401)', () => {
      const req = {};
      const res = {};
      const authMiddleware = authorize('admin');
      let caughtError = null;

      authMiddleware(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('Authentication required'));
    });

    test('should reject when user role is not permitted (403)', () => {
      const req = {
        user: { role: 'user', name: 'Regular User' }
      };
      const res = {};
      const authMiddleware = authorize('admin');
      let caughtError = null;

      authMiddleware(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 403);
      assert.ok(caughtError.message.includes('do not have permission'));
    });

    test('should allow access when user has matching role', () => {
      const req = {
        user: { role: 'admin', name: 'Admin User' }
      };
      const res = {};
      const authMiddleware = authorize('admin');
      let nextCalled = false;

      authMiddleware(req, res, (err) => {
        assert.strictEqual(err, undefined);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('should allow access when user role is in multiple allowed roles list', () => {
      const req = {
        user: { role: 'manager', name: 'Manager User' }
      };
      const res = {};
      const authMiddleware = authorize('admin', 'manager', 'lead');
      let nextCalled = false;

      authMiddleware(req, res, (err) => {
        assert.strictEqual(err, undefined);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('restrictTo should be an alias of authorize', () => {
      assert.strictEqual(restrictTo, authorize);
    });
  });

  describe('optionalAuth middleware', () => {
    test('should set req.user to null and continue when no header is present', async () => {
      const req = { headers: {} };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.strictEqual(err, undefined);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user, null);
    });

    test('should set req.user to null and continue when header is non-Bearer', async () => {
      const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.strictEqual(err, undefined);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user, null);
    });

    test('should set req.user to null and continue when Bearer token is invalid/expired', async () => {
      const req = { headers: { authorization: 'Bearer invalid.token' } };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.strictEqual(err, undefined);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user, null);
    });

    test('should populate req.user when a valid token with active user is supplied', async () => {
      const mockActiveUser = new User({
        _id: '6650a2b8e3f41234567890aa',
        name: 'Optional Active User',
        email: 'optional@example.com',
        role: 'user',
        isActive: true
      });

      User.findById = async () => mockActiveUser;

      const token = generateToken({ id: '6650a2b8e3f41234567890aa', email: 'optional@example.com' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.strictEqual(err, undefined);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.ok(req.user);
      assert.strictEqual(req.user.name, 'Optional Active User');
    });

    test('should set req.user to null when user in token is deactivated', async () => {
      const mockInactiveUser = new User({
        _id: '6650a2b8e3f41234567890aa',
        name: 'Inactive User',
        email: 'inactive@example.com',
        role: 'user',
        isActive: false
      });

      User.findById = async () => mockInactiveUser;

      const token = generateToken({ id: '6650a2b8e3f41234567890aa', email: 'inactive@example.com' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.strictEqual(err, undefined);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user, null);
    });
  });
});
