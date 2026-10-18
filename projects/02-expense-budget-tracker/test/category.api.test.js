const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { Category } = require('../models/category.model');
const { generateToken } = require('../src/utils/token');

describe('Category Management API Integration Test Suite', () => {
  let server;
  let baseUrl;

  let originalFindById;
  let originalGetCategoriesForUser;
  let originalFindAccessibleById;
  let originalCategoryFindById;
  let originalIsNameTaken;
  let originalCreate;
  let originalDeleteOne;

  const mockUser = new User({
    _id: '6650a2b8e3f41234567890aa',
    name: 'Category Tester',
    email: 'cat-test@example.com',
    role: 'user',
    isActive: true
  });

  const validToken = generateToken({
    id: '6650a2b8e3f41234567890aa',
    email: 'cat-test@example.com',
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
    originalFindById = User.findById;
    User.findById = async () => mockUser;

    originalGetCategoriesForUser = Category.getCategoriesForUser;
    originalFindAccessibleById = Category.findAccessibleById;
    originalCategoryFindById = Category.findById;
    originalIsNameTaken = Category.isNameTaken;
    originalCreate = Category.create;
    originalDeleteOne = Category.deleteOne;
  });

  afterEach(() => {
    User.findById = originalFindById;
    Category.getCategoriesForUser = originalGetCategoriesForUser;
    Category.findAccessibleById = originalFindAccessibleById;
    Category.findById = originalCategoryFindById;
    Category.isNameTaken = originalIsNameTaken;
    Category.create = originalCreate;
    Category.deleteOne = originalDeleteOne;
  });

  test('GET /api/v1/categories should return accessible categories list', async () => {
    const mockCategories = [
      new Category({
        _id: '6650a2b8e3f4123456789111',
        name: 'Food & Dining',
        type: 'expense',
        isPredefined: true,
        user: null
      }),
      new Category({
        _id: '6650a2b8e3f4123456789222',
        name: 'Custom Gym',
        type: 'expense',
        isPredefined: false,
        user: mockUser._id
      })
    ];

    Category.getCategoriesForUser = async () => mockCategories;

    const res = await fetch(`${baseUrl}/api/v1/categories`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.count, 2);
    assert.strictEqual(data.data.categories[0].name, 'Food & Dining');
  });

  test('POST /api/v1/categories should create custom category and return 201', async () => {
    Category.isNameTaken = async () => false;
    Category.create = async (payload) => {
      return new Category({
        _id: '6650a2b8e3f4123456789333',
        ...payload
      });
    };

    const res = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        name: 'Pet Care',
        type: 'expense',
        icon: 'paw',
        color: '#10B981',
        description: 'Veterinarian, pet food and toys'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.category.name, 'Pet Care');
    assert.strictEqual(data.data.category.isPredefined, false);
  });

  test('POST /api/v1/categories should return 409 Conflict if category name already exists', async () => {
    Category.isNameTaken = async () => true;

    const res = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        name: 'Food & Dining',
        type: 'expense'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('already exists'));
  });

  test('PATCH /api/v1/categories/:id should return 403 when attempting to edit predefined category', async () => {
    const predefinedCat = new Category({
      _id: '6650a2b8e3f4123456789111',
      name: 'Food & Dining',
      type: 'expense',
      isPredefined: true,
      user: null
    });

    Category.findById = async () => predefinedCat;

    const res = await fetch(`${baseUrl}/api/v1/categories/${predefinedCat._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        name: 'Modified Food'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('cannot modify predefined'));
  });

  test('DELETE /api/v1/categories/:id should return 403 when attempting to delete predefined category', async () => {
    const predefinedCat = new Category({
      _id: '6650a2b8e3f4123456789111',
      name: 'Transportation',
      type: 'expense',
      isPredefined: true,
      user: null
    });

    Category.findById = async () => predefinedCat;

    const res = await fetch(`${baseUrl}/api/v1/categories/${predefinedCat._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
  });

  test('DELETE /api/v1/categories/:id should delete custom category and return 200', async () => {
    const customCat = new Category({
      _id: '6650a2b8e3f4123456789444',
      name: 'My Special Gigs',
      type: 'income',
      isPredefined: false,
      user: mockUser._id
    });

    Category.findById = async () => customCat;
    Category.deleteOne = async () => ({ deletedCount: 1 });

    const res = await fetch(`${baseUrl}/api/v1/categories/${customCat._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.message.includes('deleted successfully'));
  });
});
