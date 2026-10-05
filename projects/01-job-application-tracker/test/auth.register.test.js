const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');

describe('Auth Registration API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalIsEmailTaken;
  let originalCreate;

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
  });

  afterEach(() => {
    User.isEmailTaken = originalIsEmailTaken;
    User.create = originalCreate;
  });

  test('POST /api/v1/auth/register should successfully register a new user (201 Created)', async () => {
    User.isEmailTaken = async () => false;
    User.create = async (userData) => {
      const user = new User({
        _id: '6650a2b8e3f41234567890ab',
        ...userData
      });
      return user;
    };

    const payload = {
      name: 'Alice Smith',
      email: 'alice.smith@example.com',
      password: 'StrongPassword123'
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.statusCode, 201);
    assert.strictEqual(body.message, 'User registered successfully');
    assert.ok(body.data.user);
    assert.strictEqual(body.data.user.name, 'Alice Smith');
    assert.strictEqual(body.data.user.email, 'alice.smith@example.com');
    assert.strictEqual(body.data.user.role, 'user');
    assert.strictEqual(body.data.user.password, undefined);
    assert.strictEqual(body.data.user.__v, undefined);
  });

  test('POST /api/v1/auth/register should return 409 Conflict when email already exists', async () => {
    User.isEmailTaken = async () => true;

    const payload = {
      name: 'Existing User',
      email: 'existing@example.com',
      password: 'password123'
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 409);
    assert.strictEqual(body.message, 'An account with this email address already exists');
  });

  test('POST /api/v1/auth/register should return 400 Bad Request when required fields are missing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, 'Validation failed');
    assert.ok(Array.isArray(body.details));
    assert.strictEqual(body.details.length >= 3, true);
  });

  test('POST /api/v1/auth/register should return 400 Bad Request for invalid email format', async () => {
    const payload = {
      name: 'Bob',
      email: 'invalid-email-format',
      password: 'validPassword123'
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    const emailError = body.details.find((d) => d.field === 'email');
    assert.ok(emailError);
    assert.ok(emailError.message.includes('valid email'));
  });

  test('POST /api/v1/auth/register should return 400 Bad Request for short password', async () => {
    const payload = {
      name: 'Bob',
      email: 'bob@example.com',
      password: '123'
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    const passwordError = body.details.find((d) => d.field === 'password');
    assert.ok(passwordError);
    assert.ok(passwordError.message.includes('at least 6 characters'));
  });
});
