const { test, describe } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { generateToken, verifyToken, decodeToken } = require('../src/utils/token');
const config = require('../src/config/env');
const User = require('../src/models/user.model');

describe('JWT Token Utility & Generation Unit Tests', () => {
  const samplePayload = {
    id: '6650a2b8e3f41234567890ab',
    email: 'test@example.com',
    role: 'user'
  };

  test('generateToken should generate a valid, signable JWT string', () => {
    const token = generateToken(samplePayload);
    assert.ok(typeof token === 'string');
    assert.strictEqual(token.split('.').length, 3);
  });

  test('verifyToken should successfully decode and verify a valid token payload', () => {
    const token = generateToken(samplePayload);
    const decoded = verifyToken(token);

    assert.strictEqual(decoded.id, samplePayload.id);
    assert.strictEqual(decoded.email, samplePayload.email);
    assert.strictEqual(decoded.role, samplePayload.role);
    assert.ok(typeof decoded.iat === 'number');
    assert.ok(typeof decoded.exp === 'number');
  });

  test('verifyToken should throw 401 when token is missing or not a string', () => {
    assert.throws(
      () => verifyToken(null),
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.ok(err.message.includes('Authentication token is required'));
        return true;
      }
    );

    assert.throws(
      () => verifyToken(12345),
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        return true;
      }
    );
  });

  test('verifyToken should throw 401 on invalid signature or tampered token', () => {
    const token = generateToken(samplePayload);
    const wrongSecret = 'some_completely_wrong_secret_key_99999';

    assert.throws(
      () => verifyToken(token, wrongSecret),
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.ok(err.message.includes('Invalid authentication token'));
        return true;
      }
    );
  });

  test('verifyToken should throw 401 on expired token', async () => {
    // Generate token with immediate expiration
    const expiredToken = jwt.sign(samplePayload, config.jwt.secret, { expiresIn: '1ms' });

    // Small delay to ensure expiration
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.throws(
      () => verifyToken(expiredToken),
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.ok(err.message.includes('Authentication token has expired'));
        return true;
      }
    );
  });

  test('decodeToken should safely decode token without verifying signature', () => {
    const token = generateToken(samplePayload);
    const decoded = decodeToken(token);

    assert.ok(decoded);
    assert.strictEqual(decoded.id, samplePayload.id);
    assert.strictEqual(decoded.email, samplePayload.email);
  });

  test('decodeToken should return null for invalid token inputs', () => {
    assert.strictEqual(decodeToken(null), null);
    assert.strictEqual(decodeToken(undefined), null);
    assert.strictEqual(decodeToken(123), null);
  });

  test('User.prototype.generateAuthToken should produce a verifiable JWT with user claims', () => {
    const user = new User({
      _id: '6650a2b8e3f41234567890cd',
      name: 'Token Tester',
      email: 'tokentest@example.com',
      password: 'password123',
      role: 'admin'
    });

    const token = user.generateAuthToken();
    assert.ok(typeof token === 'string');

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, '6650a2b8e3f41234567890cd');
    assert.strictEqual(decoded.email, 'tokentest@example.com');
    assert.strictEqual(decoded.role, 'admin');
  });
});
