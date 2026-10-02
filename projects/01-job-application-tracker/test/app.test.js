const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');

describe('Express Application & Health API Test Suite', () => {
  let server;
  let baseUrl;

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

  test('GET / should return 200 and welcome payload', async () => {
    const res = await fetch(`${baseUrl}/`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.statusCode, 200);
    assert.strictEqual(data.data.project, '01-job-application-tracker');
  });

  test('GET /health should return 200 and operational health stats', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, 'UP');
    assert.strictEqual(data.data.service, '01-job-application-tracker');
    assert.ok(typeof data.data.uptimeSeconds === 'number');
    assert.ok(typeof data.data.memory.rssMb === 'number');
  });

  test('GET /api/v1/health should return 200 and matching health schema', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, 'UP');
  });

  test('GET /undefined-route should return 404 with structured error response', async () => {
    const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
    const data = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.statusCode, 404);
    assert.ok(data.message.includes('Cannot find endpoint'));
  });
});
