const { test, describe } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const { verifyToken } = require('../src/utils/token');

describe('User Model & Schema Unit Tests (Project 02)', () => {
  const validUserData = {
    name: 'Alex Mercer',
    email: 'alex.mercer@example.com',
    password: 'SecurePassword123!',
    currency: 'USD',
    monthlyIncome: 5500,
    role: 'user'
  };

  const getValidationError = async (doc) => {
    try {
      await doc.validate();
      return null;
    } catch (err) {
      return err;
    }
  };

  test('should validate a valid user payload without errors', async () => {
    const user = new User(validUserData);
    const err = await getValidationError(user);
    assert.strictEqual(err, null);
  });

  test('should fail validation when required fields are missing', async () => {
    const user = new User({});
    const err = await getValidationError(user);

    assert.ok(err);
    assert.ok(err.errors.name, 'Name should be required');
    assert.ok(err.errors.email, 'Email should be required');
    assert.ok(err.errors.password, 'Password should be required');
  });

  test('should enforce minimum and maximum length constraints on name', async () => {
    const shortNameUser = new User({ ...validUserData, name: 'A' });
    const shortErr = await getValidationError(shortNameUser);
    assert.ok(shortErr.errors.name);

    const longName = 'A'.repeat(51);
    const longNameUser = new User({ ...validUserData, name: longName });
    const longErr = await getValidationError(longNameUser);
    assert.ok(longErr.errors.name);
  });

  test('should fail validation for invalid email formats', async () => {
    const invalidEmails = ['plainaddress', 'missing@domain', '@missinguser.com', 'user@domain.'];

    for (const email of invalidEmails) {
      const user = new User({ ...validUserData, email });
      const err = await getValidationError(user);
      assert.ok(err && err.errors.email, `Email "${email}" should have failed validation`);
    }
  });

  test('should normalize email to lowercase and trim whitespace', () => {
    const user = new User({
      ...validUserData,
      email: '  ALEX.mercer@EXAMPLE.COM  '
    });
    assert.strictEqual(user.email, 'alex.mercer@example.com');
  });

  test('should enforce minimum password length of 6 characters', async () => {
    const shortPasswordUser = new User({ ...validUserData, password: '123' });
    const err = await getValidationError(shortPasswordUser);
    assert.ok(err.errors.password);
  });

  test('should default currency to USD and support valid currencies', async () => {
    const user = new User({
      name: 'Test Currency',
      email: 'currency@example.com',
      password: 'password123'
    });
    assert.strictEqual(user.currency, 'USD');

    const eurUser = new User({ ...validUserData, currency: 'EUR' });
    const err = await getValidationError(eurUser);
    assert.strictEqual(err, null);
  });

  test('should reject unsupported currency codes', async () => {
    const invalidCurrencyUser = new User({ ...validUserData, currency: 'XYZ' });
    const err = await getValidationError(invalidCurrencyUser);
    assert.ok(err && err.errors.currency);
  });

  test('should default monthlyIncome to 0 and reject negative values', async () => {
    const user = new User({
      name: 'Income Test',
      email: 'income@example.com',
      password: 'password123'
    });
    assert.strictEqual(user.monthlyIncome, 0);

    const negativeIncomeUser = new User({ ...validUserData, monthlyIncome: -100 });
    const err = await getValidationError(negativeIncomeUser);
    assert.ok(err && err.errors.monthlyIncome);
  });

  test('should validate allowed roles and reject invalid role', async () => {
    const validRoles = ['user', 'admin'];
    for (const role of validRoles) {
      const user = new User({ ...validUserData, role });
      const err = await getValidationError(user);
      assert.strictEqual(err, null);
    }

    const invalidRoleUser = new User({ ...validUserData, role: 'superadmin' });
    const err = await getValidationError(invalidRoleUser);
    assert.ok(err.errors.role);
  });

  test('comparePassword should return true for matching password and false for mismatched password', async () => {
    const plainPassword = 'SecretPassword123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const user = new User({
      ...validUserData,
      password: hashedPassword
    });

    const isMatch = await user.comparePassword(plainPassword);
    assert.strictEqual(isMatch, true);

    const isWrongMatch = await user.comparePassword('WrongPassword');
    assert.strictEqual(isWrongMatch, false);

    const isFalsyMatch = await user.comparePassword('');
    assert.strictEqual(isFalsyMatch, false);
  });

  test('comparePassword should throw error if password field is unselected / empty', async () => {
    const user = new User(validUserData);
    user.password = undefined;

    await assert.rejects(
      async () => {
        await user.comparePassword('anyPassword');
      },
      (err) => {
        assert.ok(err.message.includes('Password field was not selected'));
        return true;
      }
    );
  });

  test('toSafeObject should strip password and __v fields', () => {
    const user = new User(validUserData);
    const safeObj = user.toSafeObject();

    assert.strictEqual(safeObj.name, validUserData.name);
    assert.strictEqual(safeObj.email, validUserData.email);
    assert.strictEqual(safeObj.currency, 'USD');
    assert.strictEqual(safeObj.monthlyIncome, 5500);
    assert.strictEqual(safeObj.password, undefined);
    assert.strictEqual(safeObj.__v, undefined);
  });

  test('toJSON transform should exclude password and __v when serialized', () => {
    const user = new User(validUserData);
    const json = JSON.parse(JSON.stringify(user));

    assert.strictEqual(json.name, validUserData.name);
    assert.strictEqual(json.email, validUserData.email);
    assert.strictEqual(json.password, undefined);
    assert.strictEqual(json.__v, undefined);
  });

  test('static findByEmail returns null for invalid input', () => {
    assert.strictEqual(User.findByEmail(null), null);
    assert.strictEqual(User.findByEmail(''), null);
    assert.strictEqual(User.findByEmail(123), null);
  });

  test('static isEmailTaken returns false for invalid input', async () => {
    assert.strictEqual(await User.isEmailTaken(''), false);
    assert.strictEqual(await User.isEmailTaken(null), false);
  });

  test('generateAuthToken should generate a valid JWT with user payload including currency', () => {
    const userId = new mongoose.Types.ObjectId('6650a2b8e3f41234567890cd');
    const user = new User({
      _id: userId,
      ...validUserData
    });

    const token = user.generateAuthToken();
    assert.ok(typeof token === 'string');

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, userId.toString());
    assert.strictEqual(decoded.email, validUserData.email);
    assert.strictEqual(decoded.currency, 'USD');
    assert.strictEqual(decoded.role, 'user');
  });
});
