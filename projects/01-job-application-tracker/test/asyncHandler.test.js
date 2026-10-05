const { test, describe } = require('node:test');
const assert = require('node:assert');
const asyncHandler = require('../src/utils/asyncHandler');

describe('AsyncHandler Utility Unit Tests', () => {
  test('should execute async handler and call next on completion if next is invoked', async () => {
    let called = false;
    const req = {};
    const res = {};
    const next = () => {};

    const fn = async (request, response) => {
      called = true;
      assert.strictEqual(request, req);
      assert.strictEqual(response, res);
    };

    const handler = asyncHandler(fn);
    await handler(req, res, next);
    assert.strictEqual(called, true);
  });

  test('should catch rejected promise and pass error to next', async () => {
    const customError = new Error('Async execution failed');
    const req = {};
    const res = {};

    let caughtError = null;
    const next = (err) => {
      caughtError = err;
    };

    const fn = async () => {
      throw customError;
    };

    const handler = asyncHandler(fn);
    await handler(req, res, next);

    assert.strictEqual(caughtError, customError);
  });
});
