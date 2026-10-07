const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { generateToken } = require('../src/utils/token');

describe('Auth Profile (GET /me) API Integration Test Suite', () => {
  let server;
  let baseUrl;
  let originalFindById;

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
    originalFindById = User.findById;
  });

  afterEach(() => {
    User.findById = originalFindById;
  });

  test('GET /api/v1/auth/me should return current user profile when valid Bearer token provided (200 OK)', async () => {
    const mockUser = new User({
      _id: '6650a2b8e3f41234567890aa',
      name: 'Alice Engineer',
      email: 'alice@example.com',
      role: 'user',
      isActive: true,
      lastLogin: new Date('2026-10-06T12:00:00.000Z')
    });

    User.findById = async (id) => {
      if (id === '6650a2b8e3f41234567890aa') {
        return mockUser;
      }
      return null;
    };

    const token = generateToken({
      id: '6650a2b8e3f41234567890aa',
      email: 'alice@example.com',
      role: 'user'
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.statusCode, 200);
    assert.strictEqual(body.message, 'User profile retrieved successfully');
    assert.ok(body.data.user);
    assert.strictEqual(body.data.user.name, 'Alice Engineer');
    assert.strictEqual(body.data.user.email, 'alice@example.com');
    assert.strictEqual(body.data.user.role, 'user');
    assert.strictEqual(body.data.user.isActive, true);
    assert.strictEqual(body.data.user.password, undefined);
    assert.strictEqual(body.data.user.__v, undefined);
  });

  test('GET /api/v1/auth/me should return 401 Unauthorized when Authorization header is missing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET'
    });

    const body = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 401);
    assert.ok(body.message.includes('Authentication required'));
  });

  test('GET /api/v1/auth/me should return 401 Unauthorized when Bearer token is invalid', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid.signed.token'
      }
    });

    const body = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 401);
    assert.ok(body.message.includes('Invalid authentication token'));
  });

  test('GET /api/v1/auth/me should return 401 Unauthorized when user from token no longer exists in DB', async () => {
    User.findById = async () => null;

    const token = generateToken({
      id: '6650a2b8e3f41234567890bb',
      email: 'deleted@example.com'
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 401);
    assert.ok(body.message.includes('no longer exists'));
  });

  test('GET /api/v1/auth/me should return 403 Forbidden when user is deactivated', async () => {
    const mockInactiveUser = new User({
      _id: '6650a2b8e3f41234567890cc',
      name: 'Deactivated User',
      email: 'inactive@example.com',
      role: 'user',
      isActive: false
    });

    User.findById = async () => mockInactiveUser;

    const token = generateToken({
      id: '6650a2b8e3f41234567890cc',
      email: 'inactive@example.com'
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 403);
    assert.ok(body.message.includes('account has been deactivated'));
  });
});
