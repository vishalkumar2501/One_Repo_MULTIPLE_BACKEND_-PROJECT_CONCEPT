const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Category } = require('../src/models/category.model');
const { Budget } = require('../src/models/budget.model');
const { Expense } = require('../src/models/expense.model');
const { generateToken } = require('../src/utils/token');

describe('Budget Management & Alert Tracking API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalUserFindById;
  let originalCategoryFindAccessibleById;
  let originalBudgetFindOne;
  let originalBudgetCreate;
  let originalBudgetFind;
  let originalBudgetFindById;
  let originalBudgetFindOneAndDelete;
  let originalExpenseGetMonthlySpend;

  const mockUser = new User({
    _id: '6650a2b8e3f41234567890aa',
    name: 'Budget Tester',
    email: 'budget@example.com',
    currency: 'USD',
    role: 'user',
    isActive: true
  });

  const validToken = generateToken({
    id: '6650a2b8e3f41234567890aa',
    email: 'budget@example.com',
    role: 'user'
  });

  const mockCategory = new Category({
    _id: '6650a2b8e3f4123456789111',
    name: 'Food & Dining',
    type: 'expense'
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

    originalCategoryFindAccessibleById = Category.findAccessibleById;
    originalBudgetFindOne = Budget.findOne;
    originalBudgetCreate = Budget.create;
    originalBudgetFind = Budget.find;
    originalBudgetFindById = Budget.findById;
    originalBudgetFindOneAndDelete = Budget.findOneAndDelete;
    originalExpenseGetMonthlySpend = Expense.getMonthlySpend;
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Category.findAccessibleById = originalCategoryFindAccessibleById;
    Budget.findOne = originalBudgetFindOne;
    Budget.create = originalBudgetCreate;
    Budget.find = originalBudgetFind;
    Budget.findById = originalBudgetFindById;
    Budget.findOneAndDelete = originalBudgetFindOneAndDelete;
    Expense.getMonthlySpend = originalExpenseGetMonthlySpend;
  });

  test('POST /api/v1/budgets should create budget and return 201', async () => {
    Category.findAccessibleById = async () => mockCategory;
    Budget.findOne = async () => null;

    const mockCreated = new Budget({
      _id: '6650a2b8e3f4123456789888',
      user: mockUser._id,
      category: mockCategory._id,
      month: 10,
      year: 2026,
      limit: 600,
      alertThreshold: 80
    });

    Budget.create = async () => mockCreated;
    Budget.findById = () => ({
      populate: async () => ({
        ...mockCreated.toObject(),
        toSafeObject: () => mockCreated.toObject()
      })
    });

    const res = await fetch(`${baseUrl}/api/v1/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        category: mockCategory._id.toString(),
        month: 10,
        year: 2026,
        limit: 600,
        alertThreshold: 85
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.budget.limit, 600);
  });

  test('POST /api/v1/budgets should return 409 Conflict if budget already exists for period', async () => {
    Category.findAccessibleById = async () => mockCategory;
    Budget.findOne = async () => ({ _id: 'exists' });

    const res = await fetch(`${baseUrl}/api/v1/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        category: mockCategory._id.toString(),
        month: 10,
        year: 2026,
        limit: 500
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('already defined'));
  });

  test('GET /api/v1/budgets/status should calculate real-time spending, warning and exceeded alerts', async () => {
    const budgetWarning = new Budget({
      _id: '6650a2b8e3f4123456789881',
      user: mockUser._id,
      category: mockCategory._id,
      month: 10,
      year: 2026,
      limit: 500,
      alertThreshold: 80
    });

    const budgetExceeded = new Budget({
      _id: '6650a2b8e3f4123456789882',
      user: mockUser._id,
      category: null,
      month: 10,
      year: 2026,
      limit: 1000,
      alertThreshold: 90
    });

    Budget.find = () => ({
      populate: async () => [budgetWarning, budgetExceeded]
    });

    Expense.getMonthlySpend = async (userId, opts) => {
      // 450 out of 500 => 90% (warning)
      if (opts.categoryId) return 450;
      // 1200 out of 1000 => 120% (exceeded)
      return 1200;
    };

    const res = await fetch(`${baseUrl}/api/v1/budgets/status?month=10&year=2026`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.summary.warningAlerts, 1);
    assert.strictEqual(data.data.summary.exceededAlerts, 1);
    assert.strictEqual(data.data.items[0].status, 'warning');
    assert.strictEqual(data.data.items[1].status, 'exceeded');
  });

  test('DELETE /api/v1/budgets/:id should remove budget and return 200', async () => {
    const randomId = new mongoose.Types.ObjectId();
    Budget.findOneAndDelete = async () => ({ _id: randomId });

    const res = await fetch(`${baseUrl}/api/v1/budgets/${randomId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.message.includes('deleted successfully'));
  });
});
