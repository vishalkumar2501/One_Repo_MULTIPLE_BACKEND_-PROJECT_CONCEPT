const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Expense } = require('../src/models/expense.model');
const { Budget } = require('../src/models/budget.model');
const { generateToken } = require('../src/utils/token');

describe('Financial Analytics & Aggregation Pipeline Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalUserFindById;
  let originalExpenseGetCategoryAnalytics;
  let originalExpenseGetMonthlyCashflow;
  let originalExpenseGetMonthlySpend;
  let originalExpenseFind;
  let originalBudgetFind;

  const mockUser = new User({
    _id: '6650a2b8e3f41234567890aa',
    name: 'Analytics Tester',
    email: 'analytics@example.com',
    currency: 'USD',
    monthlyIncome: 6000,
    role: 'user',
    isActive: true
  });

  const validToken = generateToken({
    id: '6650a2b8e3f41234567890aa',
    email: 'analytics@example.com',
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

    originalExpenseGetCategoryAnalytics = Expense.getCategoryAnalytics;
    originalExpenseGetMonthlyCashflow = Expense.getMonthlyCashflow;
    originalExpenseGetMonthlySpend = Expense.getMonthlySpend;
    originalExpenseFind = Expense.find;
    originalBudgetFind = Budget.find;
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Expense.getCategoryAnalytics = originalExpenseGetCategoryAnalytics;
    Expense.getMonthlyCashflow = originalExpenseGetMonthlyCashflow;
    Expense.getMonthlySpend = originalExpenseGetMonthlySpend;
    Expense.find = originalExpenseFind;
    Budget.find = originalBudgetFind;
  });

  test('GET /api/v1/analytics/category-breakdown should compute totals and percentages', async () => {
    Expense.getCategoryAnalytics = async () => [
      {
        categoryId: '6650a2b8e3f4123456789111',
        categoryName: 'Housing & Rent',
        categoryColor: '#8B5CF6',
        categoryIcon: 'home',
        totalAmount: 1200,
        avgAmount: 1200,
        count: 1
      },
      {
        categoryId: '6650a2b8e3f4123456789222',
        categoryName: 'Food & Dining',
        categoryColor: '#EF4444',
        categoryIcon: 'utensils',
        totalAmount: 400,
        avgAmount: 40,
        count: 10
      }
    ];

    const res = await fetch(`${baseUrl}/api/v1/analytics/category-breakdown?month=10&year=2026`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.totalSpend, 1600);
    assert.strictEqual(data.data.categoryCount, 2);
    assert.strictEqual(data.data.breakdown[0].categoryName, 'Housing & Rent');
    assert.strictEqual(data.data.breakdown[0].percentage, 75);
    assert.strictEqual(data.data.breakdown[1].percentage, 25);
  });

  test('GET /api/v1/analytics/monthly-cashflow should return 12-month trends and annual totals', async () => {
    Expense.getMonthlyCashflow = async () => {
      return Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        year: 2026,
        income: i === 9 ? 5000 : 0,
        expense: i === 9 ? 3000 : 0,
        netSavings: i === 9 ? 2000 : 0,
        savingsRate: i === 9 ? 40 : 0
      }));
    };

    const res = await fetch(`${baseUrl}/api/v1/analytics/monthly-cashflow?year=2026`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.year, 2026);
    assert.strictEqual(data.data.annualSummary.totalIncome, 5000);
    assert.strictEqual(data.data.annualSummary.totalExpense, 3000);
    assert.strictEqual(data.data.annualSummary.netSavings, 2000);
    assert.strictEqual(data.data.annualSummary.savingsRate, 40);
    assert.strictEqual(data.data.monthlyTrends.length, 12);
  });

  test('GET /api/v1/analytics/summary should assemble executive dashboard', async () => {
    Expense.getMonthlySpend = async () => 850;
    Expense.getCategoryAnalytics = async () => [
      {
        categoryName: 'Food & Dining',
        totalAmount: 450,
        categoryColor: '#EF4444'
      }
    ];

    Expense.find = () => ({
      sort: () => ({
        limit: () => ({
          populate: async () => []
        })
      })
    });

    Budget.find = () => ({
      populate: async () => []
    });

    const res = await fetch(`${baseUrl}/api/v1/analytics/summary`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.metrics.monthlySpend, 850);
    assert.strictEqual(data.data.metrics.topCategory.name, 'Food & Dining');
    assert.strictEqual(data.data.metrics.currency, 'USD');
  });
});
