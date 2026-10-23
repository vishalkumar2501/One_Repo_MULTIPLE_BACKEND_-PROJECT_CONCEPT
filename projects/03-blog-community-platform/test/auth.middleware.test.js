const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const {
  authenticate,
  protect,
  optionalAuth,
  authorize,
  restrictTo,
  requireMinRole,
  requirePermission,
  requireOwnerOrRole,
  hasPermission,
  ROLE_PERMISSIONS
} = require('../src/middleware/auth');
const User = require('../src/models/user.model');
const { generateToken } = require('../src/utils/token');

describe('Auth & RBAC Middleware Unit Test Suite (Project 03)', () => {
  let originalFindById;

  beforeEach(() => {
    originalFindById = User.findById;
  });

  afterEach(() => {
    User.findById = originalFindById;
  });

  // ── authenticate & protect tests ──────────────────────────────────────────

  describe('authenticate & protect middleware', () => {
    test('should reject when Authorization header is missing (401)', async () => {
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

    test('should reject when Authorization header is not Bearer scheme (401)', async () => {
      const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('Bearer token'));
    });

    test('should reject when Bearer token is empty or whitespace (401)', async () => {
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

    test('should reject when token is malformed (401)', async () => {
      const req = { headers: { authorization: 'Bearer this.is.notvalid' } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('Invalid or malformed'));
    });

    test('should reject when token is expired (401)', async () => {
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

    test('should reject when token payload has no user id (401)', async () => {
      const tokenNoId = generateToken({ email: 'test@example.com' });
      const req = { headers: { authorization: `Bearer ${tokenNoId}` } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('Invalid authentication token payload'));
    });

    test('should reject when user no longer exists in database (401)', async () => {
      User.findById = async () => null;

      const validToken = generateToken({ id: '6650a2b8e3f41234567890aa', email: 'ghost@example.com' });
      const req = { headers: { authorization: `Bearer ${validToken}` } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 401);
      assert.ok(caughtError.message.includes('no longer exists'));
    });

    test('should reject when user accountStatus is suspended (403)', async () => {
      User.findById = async () => ({
        _id: '6650a2b8e3f41234567890aa',
        email: 'suspended@example.com',
        role: 'user',
        accountStatus: 'suspended'
      });

      const token = generateToken({ id: '6650a2b8e3f41234567890aa' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 403);
      assert.ok(caughtError.message.includes('suspended or deactivated'));
    });

    test('should reject when user accountStatus is deactivated (403)', async () => {
      User.findById = async () => ({
        _id: '6650a2b8e3f41234567890aa',
        email: 'deactivated@example.com',
        role: 'user',
        accountStatus: 'deactivated'
      });

      const token = generateToken({ id: '6650a2b8e3f41234567890aa' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 403);
      assert.ok(caughtError.message.includes('suspended or deactivated'));
    });

    test('should authenticate active user and attach user context to req', async () => {
      const mockUser = {
        _id: '6650a2b8e3f41234567890bb',
        email: 'author@example.com',
        name: 'Jane Doe',
        role: 'author',
        accountStatus: 'active'
      };
      User.findById = async () => mockUser;

      const token = generateToken({ id: '6650a2b8e3f41234567890bb', role: 'author' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await authenticate(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.id, '6650a2b8e3f41234567890bb');
      assert.strictEqual(req.user.role, 'author');
      assert.strictEqual(req.user.email, 'author@example.com');
      assert.strictEqual(req.user.name, 'Jane Doe');
      assert.strictEqual(req.token, token);
      assert.ok(req.auth);
    });

    test('protect should be an alias of authenticate', () => {
      assert.strictEqual(protect, authenticate);
    });
  });

  // ── optionalAuth tests ────────────────────────────────────────────────────

  describe('optionalAuth middleware', () => {
    test('should set req.user to null when no authorization header is present', async () => {
      const req = { headers: {} };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user, null);
    });

    test('should set req.user to null when header is not Bearer', async () => {
      const req = { headers: { authorization: 'Basic xyz' } };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user, null);
    });

    test('should set req.user to null when token is invalid', async () => {
      const req = { headers: { authorization: 'Bearer not-valid' } };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user, null);
    });

    test('should set req.user to null when user in token is suspended', async () => {
      User.findById = async () => ({
        _id: '6650a2b8e3f41234567890cc',
        accountStatus: 'suspended'
      });

      const token = generateToken({ id: '6650a2b8e3f41234567890cc' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user, null);
    });

    test('should attach user context when a valid token with active user is supplied', async () => {
      User.findById = async () => ({
        _id: '6650a2b8e3f41234567890dd',
        email: 'reader@example.com',
        name: 'Reader One',
        role: 'user',
        accountStatus: 'active'
      });

      const token = generateToken({ id: '6650a2b8e3f41234567890dd' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await optionalAuth(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.id, '6650a2b8e3f41234567890dd');
      assert.strictEqual(req.user.role, 'user');
    });
  });

  // ── authorize & restrictTo tests ──────────────────────────────────────────

  describe('authorize & restrictTo middleware', () => {
    test('should reject if req.user is undefined (401)', () => {
      const middleware = authorize('admin');
      const req = {};
      assert.throws(
        () => middleware(req, {}, () => {}),
        (err) => err.statusCode === 401 && err.message.includes('Authentication required')
      );
    });

    test('should reject if user role is not in allowed roles (403)', () => {
      const middleware = authorize('admin', 'moderator');
      const req = { user: { role: 'user' } };
      assert.throws(
        () => middleware(req, {}, () => {}),
        (err) => err.statusCode === 403 && err.message.includes('Access denied')
      );
    });

    test('should allow access if user role matches single allowed role', () => {
      const middleware = authorize('admin');
      const req = { user: { role: 'admin' } };
      let called = false;
      middleware(req, {}, () => {
        called = true;
      });
      assert.strictEqual(called, true);
    });

    test('should allow access if user role is one of multiple allowed roles', () => {
      const middleware = authorize('author', 'moderator', 'admin');
      const req = { user: { role: 'moderator' } };
      let called = false;
      middleware(req, {}, () => {
        called = true;
      });
      assert.strictEqual(called, true);
    });

    test('restrictTo should be an alias of authorize', () => {
      assert.strictEqual(restrictTo, authorize);
    });
  });

  // ── requireMinRole tests ──────────────────────────────────────────────────

  describe('requireMinRole middleware', () => {
    test('should reject if req.user is undefined (401)', () => {
      const middleware = requireMinRole('author');
      const req = {};
      assert.throws(
        () => middleware(req, {}, () => {}),
        (err) => err.statusCode === 401
      );
    });

    test('should reject when user role is below minimum required role (403)', () => {
      const middleware = requireMinRole('moderator');
      const req = { user: { role: 'author' } }; // author is level 1, moderator is level 2
      assert.throws(
        () => middleware(req, {}, () => {}),
        (err) => err.statusCode === 403 && err.message.includes('Minimum role required: moderator')
      );
    });

    test('should allow access when user role equals minimum role', () => {
      const middleware = requireMinRole('moderator');
      const req = { user: { role: 'moderator' } };
      let called = false;
      middleware(req, {}, () => {
        called = true;
      });
      assert.strictEqual(called, true);
    });

    test('should allow access when user role exceeds minimum role', () => {
      const middleware = requireMinRole('author');
      const req = { user: { role: 'admin' } }; // admin is level 3, author is level 1
      let called = false;
      middleware(req, {}, () => {
        called = true;
      });
      assert.strictEqual(called, true);
    });
  });

  // ── requirePermission & ROLE_PERMISSIONS tests ───────────────────────────

  describe('requirePermission & ROLE_PERMISSIONS', () => {
    test('ROLE_PERMISSIONS registry should define permissions for all roles', () => {
      assert.ok(ROLE_PERMISSIONS.user.includes('create:comment'));
      assert.ok(ROLE_PERMISSIONS.author.includes('create:article'));
      assert.ok(ROLE_PERMISSIONS.moderator.includes('moderate:comment'));
      assert.ok(ROLE_PERMISSIONS.admin.includes('manage:categories'));
      assert.ok(ROLE_PERMISSIONS.admin.includes('delete:any_article'));
    });

    test('hasPermission helper should return boolean accurately', () => {
      assert.strictEqual(hasPermission('user', 'create:comment'), true);
      assert.strictEqual(hasPermission('user', 'create:article'), false);
      assert.strictEqual(hasPermission('author', 'create:article'), true);
      assert.strictEqual(hasPermission('author', 'moderate:comment'), false);
      assert.strictEqual(hasPermission('admin', 'assign:role'), true);
      assert.strictEqual(hasPermission('unknown_role', 'read:articles'), false);
    });

    test('requirePermission should reject when unauthenticated (401)', () => {
      const middleware = requirePermission('create:article');
      const req = {};
      assert.throws(
        () => middleware(req, {}, () => {}),
        (err) => err.statusCode === 401
      );
    });

    test('requirePermission should reject when role lacks permission (403)', () => {
      const middleware = requirePermission('create:article');
      const req = { user: { role: 'user' } };
      assert.throws(
        () => middleware(req, {}, () => {}),
        (err) => err.statusCode === 403 && err.message.includes('Missing required permission')
      );
    });

    test('requirePermission should allow when role has permission', () => {
      const middleware = requirePermission('create:article');
      const req = { user: { role: 'author' } };
      let called = false;
      middleware(req, {}, () => {
        called = true;
      });
      assert.strictEqual(called, true);
    });
  });

  // ── requireOwnerOrRole tests ──────────────────────────────────────────────

  describe('requireOwnerOrRole middleware', () => {
    test('should reject when unauthenticated (401)', () => {
      const middleware = requireOwnerOrRole('userId', ['admin']);
      const req = { params: { userId: '123' } };
      assert.throws(
        () => middleware(req, {}, () => {}),
        (err) => err.statusCode === 401
      );
    });

    test('should allow access when user is the resource owner', () => {
      const middleware = requireOwnerOrRole('userId', ['admin']);
      const req = {
        user: { id: 'user_123', role: 'user' },
        params: { userId: 'user_123' }
      };
      let called = false;
      middleware(req, {}, () => {
        called = true;
      });
      assert.strictEqual(called, true);
    });

    test('should allow access when user is not owner but holds an allowed role (e.g. admin)', () => {
      const middleware = requireOwnerOrRole('userId', ['admin']);
      const req = {
        user: { id: 'admin_999', role: 'admin' },
        params: { userId: 'user_123' }
      };
      let called = false;
      middleware(req, {}, () => {
        called = true;
      });
      assert.strictEqual(called, true);
    });

    test('should reject when user is neither owner nor holds privileged role (403)', () => {
      const middleware = requireOwnerOrRole('userId', ['admin']);
      const req = {
        user: { id: 'user_456', role: 'user' },
        params: { userId: 'user_123' }
      };
      assert.throws(
        () => middleware(req, {}, () => {}),
        (err) => err.statusCode === 403 && err.message.includes('only access or modify your own resources')
      );
    });
  });
});
