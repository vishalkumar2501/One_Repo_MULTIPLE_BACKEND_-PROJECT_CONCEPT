const { test, describe } = require('node:test');
const assert = require('node:assert');
const ApiError = require('../src/utils/apiError');
const ApiResponse = require('../src/utils/apiResponse');

describe('Project 03 - Utils Test Suite (ApiError & ApiResponse)', () => {
  test('ApiError should create structured error instances with correct status codes', () => {
    const badReq = ApiError.badRequest('Invalid slug format', { field: 'slug' });
    assert.strictEqual(badReq.statusCode, 400);
    assert.strictEqual(badReq.message, 'Invalid slug format');
    assert.deepStrictEqual(badReq.details, { field: 'slug' });
    assert.strictEqual(badReq.isOperational, true);

    const unauthorized = ApiError.unauthorized('Token expired');
    assert.strictEqual(unauthorized.statusCode, 401);

    const forbidden = ApiError.forbidden('Author access required');
    assert.strictEqual(forbidden.statusCode, 403);

    const notFound = ApiError.notFound('Article not found');
    assert.strictEqual(notFound.statusCode, 404);

    const conflict = ApiError.conflict('Slug already exists');
    assert.strictEqual(conflict.statusCode, 409);

    const tooMany = ApiError.tooManyRequests('Rate limit exceeded');
    assert.strictEqual(tooMany.statusCode, 429);

    const internal = ApiError.internal('Database error');
    assert.strictEqual(internal.statusCode, 500);
    assert.strictEqual(internal.isOperational, false);
  });

  test('ApiResponse should format success payload structures correctly', () => {
    let capturedStatus;
    let capturedJson;

    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(payload) {
        capturedJson = payload;
        return this;
      }
    };

    ApiResponse.success(mockRes, { title: 'Mastering Backend Patterns' }, 'Article fetched', 200);
    assert.strictEqual(capturedStatus, 200);
    assert.strictEqual(capturedJson.success, true);
    assert.strictEqual(capturedJson.message, 'Article fetched');
    assert.deepStrictEqual(capturedJson.data, { title: 'Mastering Backend Patterns' });

    ApiResponse.ok(mockRes, { slug: 'mastering-backend' }, 'OK status');
    assert.strictEqual(capturedStatus, 200);
    assert.strictEqual(capturedJson.success, true);
    assert.strictEqual(capturedJson.statusCode, 200);
    assert.strictEqual(capturedJson.message, 'OK status');
    assert.deepStrictEqual(capturedJson.data, { slug: 'mastering-backend' });

    ApiResponse.created(mockRes, { id: 'art_123' }, 'Article created');
    assert.strictEqual(capturedStatus, 201);
    assert.strictEqual(capturedJson.success, true);
    assert.strictEqual(capturedJson.statusCode, 201);
  });
});
