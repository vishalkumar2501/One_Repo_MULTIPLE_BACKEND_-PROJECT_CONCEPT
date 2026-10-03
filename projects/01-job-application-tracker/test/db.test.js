const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const {
  connectDB,
  disconnectDB,
  getConnectionState,
  registerConnectionEventListeners,
  readyStateMap
} = require('../src/config/db');

describe('Database Connection & Lifecycle Unit Tests', () => {
  afterEach(async () => {
    await disconnectDB(true);
  });

  test('readyStateMap should contain standard Mongoose state definitions', () => {
    assert.strictEqual(readyStateMap[0], 'disconnected');
    assert.strictEqual(readyStateMap[1], 'connected');
    assert.strictEqual(readyStateMap[2], 'connecting');
    assert.strictEqual(readyStateMap[3], 'disconnecting');
  });

  test('getConnectionState should return structured metadata when disconnected', () => {
    const state = getConnectionState();
    assert.ok(typeof state === 'object');
    assert.strictEqual(typeof state.readyState, 'number');
    assert.strictEqual(typeof state.status, 'string');
    assert.strictEqual(state.readyState, 0);
    assert.strictEqual(state.status, 'disconnected');
  });

  test('registerConnectionEventListeners should be idempotent', () => {
    // Should execute safely multiple times without throwing
    registerConnectionEventListeners();
    registerConnectionEventListeners();
    assert.ok(true);
  });

  test('disconnectDB should safely handle already disconnected state', async () => {
    await disconnectDB();
    const state = getConnectionState();
    assert.strictEqual(state.readyState, 0);
    assert.strictEqual(state.status, 'disconnected');
  });

  test('connectDB retry mechanism should handle invalid/unreachable URI and throw after exhausting retries', async () => {
    const unreachableUri = 'mongodb://127.0.0.1:59999/test_db_unreachable';
    const startTime = Date.now();

    await assert.rejects(
      async () => {
        await connectDB(unreachableUri, {
          maxRetries: 2,
          initialDelayMs: 100,
          backoffMultiplier: 1.0,
          serverSelectionTimeoutMS: 500
        });
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('Failed to connect to MongoDB after 2 attempts'));
        return true;
      }
    );

    const elapsedTime = Date.now() - startTime;
    // Should have waited at least initialDelayMs between retries
    assert.ok(elapsedTime >= 100);
  });
});
