const { test, describe } = require('node:test');
const assert = require('node:assert');
const config = require('../src/config/env');

describe('Configuration & Environment Test Suite', () => {
  test('should load default port as a number', () => {
    assert.strictEqual(typeof config.port, 'number');
    assert.ok(config.port > 0);
  });

  test('should load valid default environment values', () => {
    assert.ok(['development', 'test', 'production'].includes(config.env));
    assert.strictEqual(typeof config.mongoUri, 'string');
    assert.ok(config.mongoUri.startsWith('mongodb'));
    assert.strictEqual(typeof config.jwt.secret, 'string');
    assert.ok(config.jwt.secret.length > 0);
  });

  test('config object should be immutable (frozen)', () => {
    assert.ok(Object.isFrozen(config));
  });
});
