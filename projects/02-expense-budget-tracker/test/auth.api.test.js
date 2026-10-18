const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { generateToken } = require('../src/utils/token');

describe('Authentication & Account API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalIsEmailTaken;
  let originalCreate;
  let originalFindByEmail;
  let originalFindById;

  const mockUserDoc = new User({
    _id: '6650a2b8e3f41234567890aa',
    name: 'Test Finance User',
    email: 'finance@example.com',
    password: 'hashedPassword123',
    currency: 'USD',
    monthlyIncome: 5000,
    role: 'user',
    isActive: true
  });

  const validToken = generateToken({
    id: '6650a2b8e3f41234567890aa',
    email: 'finance@example.com',
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
    originalIsEmailTaken = User.isEmailTaken;
    originalCreate = User.create;
    originalFindByEmail = User.findByEmail;
    originalFindById = User.findById;
  });

  afterEach(() => {
    User.isEmailTaken = originalIsEmailTaken;
    User.create = originalCreate;
    User.findByEmail = originalFindByEmail;
    User.findById = originalFindById;
  });

  test('POST /api/v1/auth/register should create account and return 201 with token', async () => {
    User.isEmailTaken = async () => false;
    User.create = async (userData) => {
      const u = new User({
        _id: '6650a2b8e3f41234567890bb',
        ...userData
      });
      return u;
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        currency: 'EUR',
        monthlyIncome: 3500
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.token);
    assert.strictEqual(data.data.user.email, 'newuser@example.com');
    assert.strictEqual(data.data.user.currency, 'EUR');
    assert.strictEqual(data.data.user.password, undefined);
  });

  test('POST /api/v1/auth/register should return 409 Conflict if email already exists', async () => {
    User.isEmailTaken = async () => true;

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: 'existing@example.com',
        password: 'password123'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('already exists'));
  });

  test('POST /api/v1/auth/login should authenticate valid credentials and return 200 with token', async () => {
    User.findByEmail = (email) => {
      return {
        select: (field) => {
          const userWithPassword = new User({
            _id: mockUserDoc._id,
            name: mockUserDoc.name,
            email: mockUserDoc.email,
            currency: mockUserDoc.currency,
            role: mockUserDoc.role,
            isActive: true,
            password: 'hashed'
          });
          userWithPassword.comparePassword = async (cand) => cand === 'secretPassword';
          userWithPassword.save = async () => userWithPassword;
          return Promise.resolve(userWithPassword);
        }
      };
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'finance@example.com',
        password: 'secretPassword'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.token);
    assert.strictEqual(data.data.user.email, 'finance@example.com');
  });

  test('POST /api/v1/auth/login should return 401 on incorrect password', async () => {
    User.findByEmail = (email) => {
      return {
        select: (field) => {
          const userWithPassword = new User({
            _id: mockUserDoc._id,
            email: mockUserDoc.email,
            password: 'hashed',
            isActive: true
          });
          userWithPassword.comparePassword = async () => false;
          return Promise.resolve(userWithPassword);
        }
      };
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'finance@example.com',
        password: 'wrongPassword'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  test('GET /api/v1/auth/me should reject unauthenticated request with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  test('GET /api/v1/auth/me should return current user profile when valid token provided', async () => {
    User.findById = async () => mockUserDoc;

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.user.email, 'finance@example.com');
    assert.strictEqual(data.data.user.currency, 'USD');
  });

  test('PATCH /api/v1/auth/profile should update user details and return 200', async () => {
    const userToUpdate = new User({
      _id: mockUserDoc._id,
      name: 'Original Name',
      email: mockUserDoc.email,
      currency: 'USD',
      monthlyIncome: 2000,
      isActive: true
    });
    userToUpdate.save = async () => userToUpdate;
    User.findById = async () => userToUpdate;

    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        name: 'Updated Name',
        currency: 'GBP',
        monthlyIncome: 4500
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.user.name, 'Updated Name');
    assert.strictEqual(data.data.user.currency, 'GBP');
  });
});
