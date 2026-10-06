const { test, describe } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

describe('User Model & Schema Unit Tests', () => {
  const validUserData = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'Password123!',
    role: 'user'
  };

  /**
   * Helper to validate a user asynchronously and return any validation error
   */
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
      email: '  Jane.Doe@EXAMPLE.Com  '
    });
    assert.strictEqual(user.email, 'jane.doe@example.com');
  });

  test('should enforce minimum password length of 6 characters', async () => {
    const shortPasswordUser = new User({ ...validUserData, password: '123' });
    const err = await getValidationError(shortPasswordUser);
    assert.ok(err.errors.password);
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

  test('should set expected default values for role, isActive, and lastLogin', () => {
    const user = new User({
      name: 'Default Test',
      email: 'default@example.com',
      password: 'password123'
    });

    assert.strictEqual(user.role, 'user');
    assert.strictEqual(user.isActive, true);
    assert.strictEqual(user.lastLogin, null);
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

  test('toSafeObject should strip password and __v fields', async () => {
    const user = new User(validUserData);
    const safeObj = user.toSafeObject();

    assert.strictEqual(safeObj.name, validUserData.name);
    assert.strictEqual(safeObj.email, validUserData.email);
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

  test('generateAuthToken should generate a valid JWT with user payload', () => {
    const user = new User({
      _id: new mongoose.Types.ObjectId('6650a2b8e3f41234567890cd'),
      ...validUserData
    });

    const token = user.generateAuthToken();
    assert.ok(typeof token === 'string');
    assert.strictEqual(token.split('.').length, 3);
  });
});
