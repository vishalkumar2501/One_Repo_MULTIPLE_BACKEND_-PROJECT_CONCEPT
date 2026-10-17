const { test, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Category = require('../src/models/category.model');
const { PREDEFINED_CATEGORIES, slugify } = require('../src/models/category.model');

describe('Category Model & Schema Unit Tests (Project 02)', () => {
  const mockUserId = new mongoose.Types.ObjectId('654321098765432109876543');
  const otherUserId = new mongoose.Types.ObjectId('123456789012345678901234');

  const getValidationError = async (doc) => {
    try {
      await doc.validate();
      return null;
    } catch (err) {
      return err;
    }
  };

  test('slugify helper should convert text into clean URL-friendly slugs', () => {
    assert.strictEqual(slugify('Food & Dining'), 'food-dining');
    assert.strictEqual(slugify('Housing & Rent (Monthly)'), 'housing-rent-monthly');
    assert.strictEqual(slugify('  Freelance / Consulting  '), 'freelance-consulting');
    assert.strictEqual(slugify(''), '');
    assert.strictEqual(slugify(null), '');
  });

  test('should validate a predefined system category without errors', async () => {
    const category = new Category({
      name: 'Food & Dining',
      type: 'expense',
      icon: 'utensils',
      color: '#EF4444',
      isPredefined: true
    });

    const err = await getValidationError(category);
    assert.strictEqual(err, null);
    assert.strictEqual(category.user, null);
    assert.strictEqual(category.slug, 'food-dining');
    assert.strictEqual(category.isPredefined, true);
  });

  test('should validate a custom user category with valid user reference', async () => {
    const category = new Category({
      name: 'Coffee & Snacks',
      type: 'expense',
      icon: 'coffee',
      color: '#A16207',
      isPredefined: false,
      user: mockUserId
    });

    const err = await getValidationError(category);
    assert.strictEqual(err, null);
    assert.strictEqual(category.user.toString(), mockUserId.toString());
    assert.strictEqual(category.slug, 'coffee-snacks');
    assert.strictEqual(category.isPredefined, false);
  });

  test('should fail validation when custom category is missing an associated user', async () => {
    const customCategory = new Category({
      name: 'Crypto Staking',
      type: 'income',
      isPredefined: false
      // user omitted
    });

    const err = await getValidationError(customCategory);
    assert.ok(err);
    assert.ok(err.errors.user);
    assert.ok(err.errors.user.message.includes('Custom category requires an associated user'));
  });

  test('should force user to null when category is marked isPredefined: true', async () => {
    const category = new Category({
      name: 'System Utilities',
      type: 'expense',
      isPredefined: true,
      user: mockUserId // passed but should be sanitized to null
    });

    const err = await getValidationError(category);
    assert.strictEqual(err, null);
    assert.strictEqual(category.user, null);
  });

  test('should require category name and enforce length boundaries', async () => {
    const missingNameCat = new Category({ type: 'expense', isPredefined: true });
    const errMissing = await getValidationError(missingNameCat);
    assert.ok(errMissing && errMissing.errors.name);

    const shortCat = new Category({ name: 'A', type: 'expense', isPredefined: true });
    const errShort = await getValidationError(shortCat);
    assert.ok(errShort && errShort.errors.name);

    const longCat = new Category({ name: 'A'.repeat(51), type: 'expense', isPredefined: true });
    const errLong = await getValidationError(longCat);
    assert.ok(errLong && errLong.errors.name);
  });

  test('should validate category type enum (expense and income)', async () => {
    const validExpense = new Category({ name: 'Groceries', type: 'expense', isPredefined: true });
    assert.strictEqual(await getValidationError(validExpense), null);

    const validIncome = new Category({ name: 'Salary', type: 'income', isPredefined: true });
    assert.strictEqual(await getValidationError(validIncome), null);

    const invalidType = new Category({ name: 'Bad Type', type: 'transfer', isPredefined: true });
    const err = await getValidationError(invalidType);
    assert.ok(err && err.errors.type);
  });

  test('should validate hex color code formats', async () => {
    const validHex3 = new Category({ name: 'Short Hex', type: 'expense', color: '#FFF', isPredefined: true });
    assert.strictEqual(await getValidationError(validHex3), null);

    const validHex6 = new Category({ name: 'Full Hex', type: 'expense', color: '#10B981', isPredefined: true });
    assert.strictEqual(await getValidationError(validHex6), null);

    const invalidHex = new Category({ name: 'Invalid Color', type: 'expense', color: 'red', isPredefined: true });
    const err = await getValidationError(invalidHex);
    assert.ok(err && err.errors.color);
  });

  test('canModify instance method should enforce predefined vs custom ownership', () => {
    const predefinedCategory = new Category({
      name: 'Housing & Rent',
      type: 'expense',
      isPredefined: true,
      user: null
    });

    // System categories can never be modified by regular users
    assert.strictEqual(predefinedCategory.canModify(mockUserId), false);
    assert.strictEqual(predefinedCategory.canModify(null), false);

    const customCategory = new Category({
      name: 'My Custom Category',
      type: 'expense',
      isPredefined: false,
      user: mockUserId
    });

    // Owner can modify
    assert.strictEqual(customCategory.canModify(mockUserId), true);
    assert.strictEqual(customCategory.canModify(mockUserId.toString()), true);

    // Another user cannot modify
    assert.strictEqual(customCategory.canModify(otherUserId), false);
    assert.strictEqual(customCategory.canModify(null), false);
  });

  test('toSafeObject should strip __v from serialized object', () => {
    const category = new Category({
      name: 'Safe Test',
      type: 'expense',
      isPredefined: true
    });
    const safeObj = category.toSafeObject();

    assert.strictEqual(safeObj.name, 'Safe Test');
    assert.strictEqual(safeObj.__v, undefined);
  });

  test('PREDEFINED_CATEGORIES constant should contain essential financial categories', () => {
    assert.ok(Array.isArray(PREDEFINED_CATEGORIES));
    assert.ok(PREDEFINED_CATEGORIES.length >= 10);

    const expenseNames = PREDEFINED_CATEGORIES.filter((c) => c.type === 'expense').map((c) => c.name);
    const incomeNames = PREDEFINED_CATEGORIES.filter((c) => c.type === 'income').map((c) => c.name);

    assert.ok(expenseNames.includes('Food & Dining'));
    assert.ok(expenseNames.includes('Transportation'));
    assert.ok(expenseNames.includes('Housing & Rent'));
    assert.ok(incomeNames.includes('Salary'));
    assert.ok(incomeNames.includes('Freelance & Consulting'));
  });

  test('isNameTaken static method returns false for invalid arguments', async () => {
    assert.strictEqual(await Category.isNameTaken('', 'expense'), false);
    assert.strictEqual(await Category.isNameTaken('Food', ''), false);
  });
});
