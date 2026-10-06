const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { verifyToken } = require('../src/utils/token');

describe('Auth Login API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalFindOne;

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
    originalFindOne = User.findOne;
  });

  afterEach(() => {
    User.findOne = originalFindOne;
  });

  test('POST /api/v1/auth/login should authenticate user with valid credentials (200 OK)', async () => {
    const rawPassword = 'ValidPassword123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    let savedUserLastLogin = null;
    const mockUser = new User({
      _id: '6650a2b8e3f41234567890aa',
      name: 'John Developer',
      email: 'john.dev@example.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      lastLogin: null
    });

    // Mock save method
    mockUser.save = async function () {
      savedUserLastLogin = this.lastLogin;
      return this;
    };

    // Mock User.findOne to chain .select('+password')
    User.findOne = (query) => {
      return {
        select: (fields) => {
          if (query.email === 'john.dev@example.com') {
            return Promise.resolve(mockUser);
          }
          return Promise.resolve(null);
        }
      };
    };

    const payload = {
      email: 'John.Dev@example.com', // Test email normalization
      password: rawPassword
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.statusCode, 200);
    assert.strictEqual(body.message, 'User logged in successfully');
    assert.ok(body.data.user);
    assert.strictEqual(body.data.user.name, 'John Developer');
    assert.strictEqual(body.data.user.email, 'john.dev@example.com');
    assert.strictEqual(body.data.user.role, 'user');
    assert.strictEqual(body.data.user.password, undefined);
    assert.strictEqual(body.data.user.__v, undefined);
    assert.strictEqual(body.data.tokenType, 'Bearer');
    assert.ok(body.data.token);
    assert.ok(body.data.expiresIn);

    // Verify token validity
    const decoded = verifyToken(body.data.token);
    assert.strictEqual(decoded.id, '6650a2b8e3f41234567890aa');
    assert.strictEqual(decoded.email, 'john.dev@example.com');
    assert.strictEqual(decoded.role, 'user');

    // Verify lastLogin was updated
    assert.ok(savedUserLastLogin instanceof Date);
  });

  test('POST /api/v1/auth/login should return 401 Unauthorized for non-existent email', async () => {
    User.findOne = () => {
      return {
        select: () => Promise.resolve(null)
      };
    };

    const payload = {
      email: 'nonexistent@example.com',
      password: 'somePassword123'
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 401);
    assert.strictEqual(body.message, 'Invalid email or password');
  });

  test('POST /api/v1/auth/login should return 401 Unauthorized for incorrect password', async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('CorrectPassword123', salt);

    const mockUser = new User({
      _id: '6650a2b8e3f41234567890bb',
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: hashedPassword,
      role: 'user',
      isActive: true
    });

    User.findOne = () => {
      return {
        select: () => Promise.resolve(mockUser)
      };
    };

    const payload = {
      email: 'jane@example.com',
      password: 'WrongPassword456'
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 401);
    assert.strictEqual(body.message, 'Invalid email or password');
  });

  test('POST /api/v1/auth/login should return 403 Forbidden for deactivated account', async () => {
    const rawPassword = 'ActivePassword123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const mockUser = new User({
      _id: '6650a2b8e3f41234567890cc',
      name: 'Deactivated User',
      email: 'deactivated@example.com',
      password: hashedPassword,
      role: 'user',
      isActive: false
    });

    User.findOne = () => {
      return {
        select: () => Promise.resolve(mockUser)
      };
    };

    const payload = {
      email: 'deactivated@example.com',
      password: rawPassword
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 403);
    assert.ok(body.message.includes('account has been deactivated'));
  });

  test('POST /api/v1/auth/login should return 400 Bad Request when required fields are missing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, 'Validation failed');
    assert.ok(Array.isArray(body.details));
    assert.strictEqual(body.details.length, 2);
  });

  test('POST /api/v1/auth/login should return 400 Bad Request for invalid email format', async () => {
    const payload = {
      email: 'invalid-email-no-at',
      password: 'somePassword123'
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    const emailErr = body.details.find((d) => d.field === 'email');
    assert.ok(emailErr);
    assert.ok(emailErr.message.includes('valid email'));
  });
});
