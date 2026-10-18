const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Category } = require('../src/models/category.model');
const { Expense } = require('../src/models/expense.model');
const { generateToken } = require('../src/utils/token');

describe('Expense & Transaction API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalUserFindById;
  let originalCategoryFindAccessibleById;
  let originalExpenseCreate;
  let originalExpenseFind;
  let originalExpenseFindOne;
  let originalExpenseFindById;
  let originalExpenseFindOneAndDelete;
  let originalExpenseCountDocuments;

  const userA = new User({
    _id: '6650a2b8e3f41234567890aa',
    name: 'User A',
    email: 'userA@example.com',
    role: 'user',
    currency: 'USD',
    isActive: true
  });

  const tokenUserA = generateToken({
    id: '6650a2b8e3f41234567890aa',
    email: 'userA@example.com',
    role: 'user'
  });

  const mockExpenseCategory = new Category({
    _id: '6650a2b8e3f4123456789111',
    name: 'Food & Dining',
    type: 'expense',
    isPredefined: true
  });

  const mockIncomeCategory = new Category({
    _id: '6650a2b8e3f4123456789222',
    name: 'Salary',
    type: 'income',
    isPredefined: true
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
    User.findById = async () => userA;

    originalCategoryFindAccessibleById = Category.findAccessibleById;
    originalExpenseCreate = Expense.create;
    originalExpenseFind = Expense.find;
    originalExpenseFindOne = Expense.findOne;
    originalExpenseFindById = Expense.findById;
    originalExpenseFindOneAndDelete = Expense.findOneAndDelete;
    originalExpenseCountDocuments = Expense.countDocuments;
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Category.findAccessibleById = originalCategoryFindAccessibleById;
    Expense.create = originalExpenseCreate;
    Expense.find = originalExpenseFind;
    Expense.findOne = originalExpenseFindOne;
    Expense.findById = originalExpenseFindById;
    Expense.findOneAndDelete = originalExpenseFindOneAndDelete;
    Expense.countDocuments = originalExpenseCountDocuments;
  });

  test('POST /api/v1/expenses should record expense and return 201', async () => {
    Category.findAccessibleById = async () => mockExpenseCategory;

    const createdDoc = new Expense({
      _id: '6650a2b8e3f4123456789333',
      user: userA._id,
      category: mockExpenseCategory._id,
      title: 'Lunch with team',
      amount: 45.5,
      type: 'expense',
      currency: 'USD',
      paymentMethod: 'credit_card',
      date: new Date()
    });

    Expense.create = async () => createdDoc;
    Expense.findById = (id) => ({
      populate: async () => ({
        ...createdDoc.toObject(),
        toSafeObject: () => createdDoc.toObject()
      })
    });

    const res = await fetch(`${baseUrl}/api/v1/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`
      },
      body: JSON.stringify({
        title: 'Lunch with team',
        amount: 45.5,
        category: mockExpenseCategory._id.toString(),
        type: 'expense',
        paymentMethod: 'credit_card'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.expense.amount, 45.5);
    assert.strictEqual(data.data.expense.title, 'Lunch with team');
  });

  test('POST /api/v1/expenses should reject mismatched category type with 400', async () => {
    Category.findAccessibleById = async () => mockIncomeCategory; // Income category used for expense

    const res = await fetch(`${baseUrl}/api/v1/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`
      },
      body: JSON.stringify({
        title: 'Office Snacks',
        amount: 25,
        category: mockIncomeCategory._id.toString(),
        type: 'expense'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('does not match transaction type'));
  });

  test('GET /api/v1/expenses should return paginated list of transactions', async () => {
    Expense.countDocuments = async () => 1;
    const mockList = [
      new Expense({
        _id: '6650a2b8e3f4123456789333',
        user: userA._id,
        category: mockExpenseCategory._id,
        title: 'Coffee and bagel',
        amount: 8.75,
        type: 'expense'
      })
    ];

    Expense.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: async () => mockList
          })
        })
      })
    });

    const res = await fetch(`${baseUrl}/api/v1/expenses?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.pagination.currentPage, 1);
    assert.strictEqual(data.data.expenses.length, 1);
    assert.strictEqual(data.data.expenses[0].title, 'Coffee and bagel');
  });

  test('GET /api/v1/expenses/:id should enforce user isolation and return 404 if not found', async () => {
    Expense.findOne = () => ({
      populate: async () => null // Not found or owned by other user
    });

    const randomId = new mongoose.Types.ObjectId();
    const res = await fetch(`${baseUrl}/api/v1/expenses/${randomId}`, {
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 404);
    assert.strictEqual(data.success, false);
  });

  test('DELETE /api/v1/expenses/:id should remove transaction and return 200', async () => {
    const expenseId = new mongoose.Types.ObjectId();
    Expense.findOneAndDelete = async () => ({
      _id: expenseId,
      user: userA._id
    });

    const res = await fetch(`${baseUrl}/api/v1/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.message.includes('deleted successfully'));
  });

  test('GET /api/v1/expenses/recurring should compute projected monthly commitment', async () => {
    const recurringList = [
      new Expense({
        _id: '6650a2b8e3f4123456789555',
        user: userA._id,
        category: mockExpenseCategory._id,
        title: 'Video Streaming',
        amount: 15,
        type: 'expense',
        isRecurring: true,
        recurring: { frequency: 'monthly' }
      })
    ];

    Expense.find = () => ({
      sort: () => ({
        populate: async () => recurringList
      })
    });

    const res = await fetch(`${baseUrl}/api/v1/expenses/recurring`, {
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.count, 1);
    assert.strictEqual(data.data.projectedMonthlyCommitment, 15);
  });
});
