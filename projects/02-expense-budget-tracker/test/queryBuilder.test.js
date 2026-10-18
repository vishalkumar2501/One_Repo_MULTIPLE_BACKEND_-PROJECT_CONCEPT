const { test, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const {
  escapeRegex,
  parseCommaSeparated,
  buildExpenseFilter,
  buildSortOptions,
  buildPaginationMetadata
} = require('../src/utils/queryBuilder');

describe('QueryBuilder Unit Tests (Project 02)', () => {
  const mockUserId = new mongoose.Types.ObjectId();

  test('escapeRegex should escape RegExp metacharacters', () => {
    assert.strictEqual(escapeRegex('hello (world) [test] * + ? . ^ $'), 'hello \\(world\\) \\[test\\] \\* \\+ \\? \\. \\^ \\$');
    assert.strictEqual(escapeRegex(null), '');
    assert.strictEqual(escapeRegex(undefined), '');
  });

  test('parseCommaSeparated should parse strings and arrays cleanly', () => {
    assert.deepStrictEqual(parseCommaSeparated('food, groceries, Dining '), ['food', 'groceries', 'dining']);
    assert.deepStrictEqual(parseCommaSeparated(['Tech', ' SaaS ']), ['tech', 'saas']);
    assert.deepStrictEqual(parseCommaSeparated(null), []);
  });

  test('buildExpenseFilter should enforce user isolation', () => {
    const filter = buildExpenseFilter(mockUserId, {});
    assert.strictEqual(filter.user.toString(), mockUserId.toString());
  });

  test('buildExpenseFilter should compile date, amount and search criteria', () => {
    const categoryId = new mongoose.Types.ObjectId();
    const query = {
      type: 'expense',
      category: categoryId.toString(),
      paymentMethod: 'credit_card',
      status: 'completed',
      tags: 'food, travel',
      isRecurring: 'true',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      minAmount: 10,
      maxAmount: 500,
      search: 'dinner party'
    };

    const filter = buildExpenseFilter(mockUserId, query);

    assert.strictEqual(filter.type, 'expense');
    assert.strictEqual(filter.category.toString(), categoryId.toString());
    assert.strictEqual(filter.paymentMethod, 'credit_card');
    assert.strictEqual(filter.status, 'completed');
    assert.deepStrictEqual(filter.tags, { $in: ['food', 'travel'] });
    assert.strictEqual(filter.isRecurring, true);
    assert.ok(filter.date.$gte instanceof Date);
    assert.ok(filter.date.$lte instanceof Date);
    assert.strictEqual(filter.amount.$gte, 10);
    assert.strictEqual(filter.amount.$lte, 500);
    assert.ok(Array.isArray(filter.$or));
    assert.strictEqual(filter.$or.length, 2);
  });

  test('buildSortOptions should validate fields against whitelist', () => {
    assert.deepStrictEqual(buildSortOptions({ sortBy: 'amount', sortOrder: 'asc' }), { amount: 1 });
    assert.deepStrictEqual(buildSortOptions({ sortBy: 'date', sortOrder: 'desc' }), { date: -1 });
    // Unknown field should fallback to default date descending
    assert.deepStrictEqual(buildSortOptions({ sortBy: 'maliciousField' }), { date: -1 });
  });

  test('buildPaginationMetadata should calculate boundary pointers accurately', () => {
    const metaPage1 = buildPaginationMetadata(45, 1, 20);
    assert.strictEqual(metaPage1.currentPage, 1);
    assert.strictEqual(metaPage1.totalPages, 3);
    assert.strictEqual(metaPage1.totalItems, 45);
    assert.strictEqual(metaPage1.hasNextPage, true);
    assert.strictEqual(metaPage1.hasPrevPage, false);
    assert.strictEqual(metaPage1.nextPage, 2);
    assert.strictEqual(metaPage1.prevPage, null);

    const metaLastPage = buildPaginationMetadata(45, 3, 20);
    assert.strictEqual(metaLastPage.currentPage, 3);
    assert.strictEqual(metaLastPage.hasNextPage, false);
    assert.strictEqual(metaLastPage.hasPrevPage, true);
    assert.strictEqual(metaLastPage.nextPage, null);
    assert.strictEqual(metaLastPage.prevPage, 2);
  });
});
