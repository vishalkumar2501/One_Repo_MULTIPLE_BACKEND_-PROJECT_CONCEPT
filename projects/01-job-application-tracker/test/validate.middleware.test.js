const { test, describe } = require('node:test');
const assert = require('node:assert');
const Joi = require('joi');
const validate = require('../src/middleware/validate');
const ApiError = require('../src/utils/apiError');

describe('Validate Middleware Unit Tests', () => {
  const sampleSchema = {
    body: Joi.object({
      username: Joi.string().min(3).required(),
      age: Joi.number().integer().min(18).optional()
    })
  };

  test('should call next() without error when request body is valid', () => {
    const middleware = validate(sampleSchema);
    const req = {
      body: {
        username: 'john_doe',
        age: 25
      }
    };
    const res = {};
    let nextCalled = false;
    let passedError = null;

    middleware(req, res, (err) => {
      nextCalled = true;
      passedError = err;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(passedError, undefined);
  });

  test('should pass ApiError with 400 status code when validation fails', () => {
    const middleware = validate(sampleSchema);
    const req = {
      body: {
        username: 'a' // too short
      }
    };
    const res = {};
    let passedError = null;

    middleware(req, res, (err) => {
      passedError = err;
    });

    assert.ok(passedError instanceof ApiError);
    assert.strictEqual(passedError.statusCode, 400);
    assert.strictEqual(passedError.message, 'Validation failed');
    assert.ok(Array.isArray(passedError.details));
    assert.strictEqual(passedError.details.length > 0, true);
    assert.strictEqual(passedError.details[0].field, 'username');
  });

  test('should strip unknown attributes from req.body by default', () => {
    const middleware = validate(sampleSchema);
    const req = {
      body: {
        username: 'john_doe',
        extraField: 'should be stripped'
      }
    };
    const res = {};

    middleware(req, res, () => {});

    assert.strictEqual(req.body.username, 'john_doe');
    assert.strictEqual(req.body.extraField, undefined);
  });

  test('should support validation of query and params', () => {
    const schemaWithQueryAndParams = {
      params: Joi.object({
        id: Joi.string().alphanum().length(24).required()
      }),
      query: Joi.object({
        page: Joi.number().integer().default(1)
      })
    };

    const middleware = validate(schemaWithQueryAndParams);
    const req = {
      params: { id: '60c72b2f9b1d8b2bad000001' },
      query: {}
    };
    const res = {};

    middleware(req, res, () => {});

    assert.strictEqual(req.params.id, '60c72b2f9b1d8b2bad000001');
    assert.strictEqual(req.query.page, 1);
  });
});
