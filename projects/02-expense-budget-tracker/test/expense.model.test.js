const { test, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const {
  Expense,
  PAYMENT_METHODS,
  RECURRING_FREQUENCIES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES
} = require('../src/models/expense.model');

describe('Expense Model & Schema Unit Tests (Project 02)', () => {
  const validUserId = new mongoose.Types.ObjectId();
  const validCategoryId = new mongoose.Types.ObjectId();

  test('should validate a valid expense document without errors', () => {
    const expense = new Expense({
      user: validUserId,
      category: validCategoryId,
      title: 'Weekly Supermarket Groceries',
      amount: 142.5,
      currency: 'USD',
      type: 'expense',
      paymentMethod: 'credit_card',
      tags: ['groceries', 'food'],
      status: 'completed'
    });

    const error = expense.validateSync();
    assert.strictEqual(error, undefined);
    assert.strictEqual(expense.amount, 142.5);
    assert.strictEqual(expense.paymentMethod, 'credit_card');
    assert.strictEqual(expense.isRecurring, false);
  });

  test('should fail validation when required fields are missing', () => {
    const expense = new Expense({});
    const error = expense.validateSync();

    assert.ok(error);
    assert.ok(error.errors.user);
    assert.ok(error.errors.category);
    assert.ok(error.errors.title);
    assert.ok(error.errors.amount);
  });

  test('should reject non-positive amounts (0 and negative)', () => {
    const zeroExpense = new Expense({
      user: validUserId,
      category: validCategoryId,
      title: 'Zero test',
      amount: 0
    });
    const zeroError = zeroExpense.validateSync();
    assert.ok(zeroError);
    assert.ok(zeroError.errors.amount);

    const negExpense = new Expense({
      user: validUserId,
      category: validCategoryId,
      title: 'Negative test',
      amount: -50
    });
    const negError = negExpense.validateSync();
    assert.ok(negError);
    assert.ok(negError.errors.amount);
  });

  test('should validate paymentMethod enum and reject invalid method', () => {
    const validExpense = new Expense({
      user: validUserId,
      category: validCategoryId,
      title: 'Coffee',
      amount: 4.5,
      paymentMethod: 'upi'
    });
    assert.strictEqual(validExpense.validateSync(), undefined);

    const invalidExpense = new Expense({
      user: validUserId,
      category: validCategoryId,
      title: 'Coffee',
      amount: 4.5,
      paymentMethod: 'unsupported_payment_network'
    });
    const error = invalidExpense.validateSync();
    assert.ok(error);
    assert.ok(error.errors.paymentMethod);
  });

  test('should enforce recurring frequency when isRecurring is true', () => {
    const missingFreq = new Expense({
      user: validUserId,
      category: validCategoryId,
      title: 'Cloud VPS Hosting',
      amount: 20,
      isRecurring: true
    });
    const error = missingFreq.validateSync();
    assert.ok(error);
    assert.ok(error.errors['recurring.frequency']);

    const validRecurring = new Expense({
      user: validUserId,
      category: validCategoryId,
      title: 'Cloud VPS Hosting',
      amount: 20,
      isRecurring: true,
      recurring: {
        frequency: 'monthly',
        nextDueDate: new Date('2026-11-01')
      }
    });
    assert.strictEqual(validRecurring.validateSync(), undefined);
  });

  test('toSafeObject should strip __v from output', () => {
    const expense = new Expense({
      user: validUserId,
      category: validCategoryId,
      title: 'Gym Membership',
      amount: 45
    });

    const safeObj = expense.toSafeObject();
    assert.strictEqual(safeObj.__v, undefined);
    assert.strictEqual(safeObj.title, 'Gym Membership');
  });

  test('constants should define complete financial payment methods and frequencies', () => {
    assert.ok(PAYMENT_METHODS.includes('cash'));
    assert.ok(PAYMENT_METHODS.includes('credit_card'));
    assert.ok(PAYMENT_METHODS.includes('upi'));
    assert.ok(RECURRING_FREQUENCIES.includes('monthly'));
    assert.ok(RECURRING_FREQUENCIES.includes('yearly'));
    assert.ok(TRANSACTION_TYPES.includes('expense'));
    assert.ok(TRANSACTION_TYPES.includes('income'));
    assert.ok(TRANSACTION_STATUSES.includes('completed'));
  });
});
