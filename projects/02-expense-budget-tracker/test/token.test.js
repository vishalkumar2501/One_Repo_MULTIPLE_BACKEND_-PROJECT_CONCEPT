const { test, describe } = require('node:test');
const assert = require('node:assert');
const { generateToken, verifyToken, decodeToken } = require('../src/utils/token');
const ApiError = require('../src/utils/apiError');

describe('JWT Token Utility Test Suite', () => {
  const samplePayload = {
    id: '64f1a2b3c4d5e6f7a8b9c0d1',
    email: 'user@example.com',
    role: 'user',
    currency: 'USD'
  };

  test('generateToken should return a non-empty signed JWT string', () => {
    const token = generateToken(samplePayload);
    assert.strictEqual(typeof token, 'string');
    assert.ok(token.split('.').length === 3);
  });

  test('verifyToken should successfully decode valid token payload', () => {
    const token = generateToken(samplePayload);
    const decoded = verifyToken(token);

    assert.strictEqual(decoded.id, samplePayload.id);
    assert.strictEqual(decoded.email, samplePayload.email);
    assert.strictEqual(decoded.role, samplePayload.role);
    assert.strictEqual(decoded.currency, samplePayload.currency);
    assert.ok(typeof decoded.exp === 'number');
    assert.ok(typeof decoded.iat === 'number');
  });

  test('verifyToken should throw ApiError.unauthorized when token is missing or empty', () => {
    assert.throws(
      () => verifyToken(''),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.message, 'Authentication token is required');
        return true;
      }
    );

    assert.throws(
      () => verifyToken(null),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 401);
        return true;
      }
    );
  });

  test('verifyToken should throw ApiError.unauthorized on invalid/tampered token', () => {
    const validToken = generateToken(samplePayload);
    const tamperedToken = validToken.slice(0, -5) + 'abcde';

    assert.throws(
      () => verifyToken(tamperedToken),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 401);
        assert.ok(err.message.includes('Invalid authentication token') || err.message.includes('Token verification failed'));
        return true;
      }
    );
  });

  test('verifyToken should throw ApiError.unauthorized when token is expired', async () => {
    const expiredToken = generateToken(samplePayload, { expiresIn: '1ms' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.throws(
      () => verifyToken(expiredToken),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 401);
        assert.ok(err.message.includes('expired'));
        return true;
      }
    );
  });

  test('decodeToken should parse token payload without verifying secret', () => {
    const token = generateToken(samplePayload);
    const decoded = decodeToken(token);

    assert.ok(decoded);
    assert.strictEqual(decoded.email, samplePayload.email);
    assert.strictEqual(decoded.currency, samplePayload.currency);
  });

  test('decodeToken should return null for invalid or empty inputs', () => {
    assert.strictEqual(decodeToken(''), null);
    assert.strictEqual(decodeToken(null), null);
    assert.strictEqual(decodeToken(undefined), null);
  });
});
