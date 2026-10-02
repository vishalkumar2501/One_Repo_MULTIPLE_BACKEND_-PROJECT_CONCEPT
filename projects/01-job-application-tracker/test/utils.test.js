const { test, describe } = require('node:test');
const assert = require('node:assert');
const ApiError = require('../src/utils/apiError');
const ApiResponse = require('../src/utils/apiResponse');

describe('Utils Test Suite (ApiError & ApiResponse)', () => {
  test('ApiError should create structured error instances with correct status codes', () => {
    const badReq = ApiError.badRequest('Invalid input field', { field: 'email' });
    assert.strictEqual(badReq.statusCode, 400);
    assert.strictEqual(badReq.message, 'Invalid input field');
    assert.deepStrictEqual(badReq.details, { field: 'email' });
    assert.strictEqual(badReq.isOperational, true);

    const unauthorized = ApiError.unauthorized('Token expired');
    assert.strictEqual(unauthorized.statusCode, 401);

    const forbidden = ApiError.forbidden('Access denied');
    assert.strictEqual(forbidden.statusCode, 403);

    const notFound = ApiError.notFound('User not found');
    assert.strictEqual(notFound.statusCode, 404);

    const conflict = ApiError.conflict('Email exists');
    assert.strictEqual(conflict.statusCode, 409);

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

    ApiResponse.success(mockRes, { item: 'sample' }, 'Fetched successfully', 200);
    assert.strictEqual(capturedStatus, 200);
    assert.strictEqual(capturedJson.success, true);
    assert.strictEqual(capturedJson.message, 'Fetched successfully');
    assert.deepStrictEqual(capturedJson.data, { item: 'sample' });

    ApiResponse.created(mockRes, { id: 1 }, 'Created');
    assert.strictEqual(capturedStatus, 201);
    assert.strictEqual(capturedJson.success, true);
  });
});
