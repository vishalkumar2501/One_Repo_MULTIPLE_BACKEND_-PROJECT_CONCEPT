const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Expense } = require('../src/models/expense.model');
const { generateToken } = require('../src/utils/token');

describe('Data Export API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalUserFindById;
  let originalExpenseFind;

  const mockUser = new User({
    _id: '6650a2b8e3f41234567890aa',
    name: 'Export Tester',
    email: 'export@example.com',
    currency: 'USD',
    role: 'user',
    isActive: true
  });

  const validToken = generateToken({
    id: '6650a2b8e3f41234567890aa',
    email: 'export@example.com',
    role: 'user'
  });

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
    originalUserFindById = User.findById;
    User.findById = async () => mockUser;

    originalExpenseFind = Expense.find;
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Expense.find = originalExpenseFind;
  });

  test('GET /api/v1/export/csv should return CSV file with proper headers and escaped fields', async () => {
    const mockExpenses = [
      new Expense({
        _id: '6650a2b8e3f4123456789999',
        user: mockUser._id,
        title: 'Dinner at "Bistro, NYC"',
        amount: 85.5,
        currency: 'USD',
        type: 'expense',
        paymentMethod: 'credit_card',
        date: new Date('2026-10-15T18:00:00.000Z'),
        status: 'completed',
        tags: ['dining', 'travel'],
        notes: 'Great food, took team'
      })
    ];

    Expense.find = () => ({
      sort: () => ({
        populate: async () => mockExpenses
      })
    });

    const res = await fetch(`${baseUrl}/api/v1/export/csv`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type');
    const contentDisposition = res.headers.get('content-disposition');

    assert.ok(contentType.includes('text/csv'));
    assert.ok(contentDisposition.includes('attachment; filename="expenses_export_'));

    const text = await res.text();
    assert.ok(text.includes('ID,Date,Title,Type,Category,Amount,Currency,PaymentMethod,Status,IsRecurring,Tags,Notes'));
    // Escaped quotes in title
    assert.ok(text.includes('"Dinner at ""Bistro, NYC"""'));
    assert.ok(text.includes('85.50'));
  });

  test('GET /api/v1/export/json should return structured audit export with metadata', async () => {
    const mockExpenses = [
      new Expense({
        _id: '6650a2b8e3f4123456789999',
        user: mockUser._id,
        title: 'Monthly Salary',
        amount: 4500,
        currency: 'USD',
        type: 'income',
        paymentMethod: 'bank_transfer',
        date: new Date('2026-10-01T09:00:00.000Z'),
        status: 'completed'
      })
    ];

    Expense.find = () => ({
      sort: () => ({
        populate: async () => mockExpenses
      })
    });

    const res = await fetch(`${baseUrl}/api/v1/export/json`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.exportMetadata.recordCount, 1);
    assert.strictEqual(data.data.exportMetadata.summary.totalIncome, 4500);
    assert.strictEqual(data.data.exportMetadata.summary.netCashflow, 4500);
    assert.strictEqual(data.data.transactions[0].title, 'Monthly Salary');
  });
});
