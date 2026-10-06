const { test, describe } = require('node:test');
const assert = require('node:assert');
const { registerSchema, loginSchema } = require('../src/validations/auth.validation');

describe('Auth Validation Schemas Unit Tests', () => {
  const validRegisterData = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'securePassword123',
    role: 'user'
  };

  test('should successfully validate a complete, valid registration body', () => {
    const { error, value } = registerSchema.body.validate(validRegisterData);

    assert.strictEqual(error, undefined);
    assert.strictEqual(value.name, 'Jane Doe');
    assert.strictEqual(value.email, 'jane.doe@example.com');
    assert.strictEqual(value.role, 'user');
  });

  test('should fail validation when name is shorter than 2 characters or longer than 50', () => {
    const shortNameResult = registerSchema.body.validate({
      ...validRegisterData,
      name: 'A'
    });
    assert.ok(shortNameResult.error);
    assert.strictEqual(shortNameResult.error.details[0].path[0], 'name');

    const longNameResult = registerSchema.body.validate({
      ...validRegisterData,
      name: 'A'.repeat(51)
    });
    assert.ok(longNameResult.error);
    assert.strictEqual(longNameResult.error.details[0].path[0], 'name');
  });

  test('should fail validation for invalid email strings', () => {
    const invalidEmails = ['invalid-email', 'missing@domain', '@test.com', 'user@domain.'];

    for (const email of invalidEmails) {
      const result = registerSchema.body.validate({
        ...validRegisterData,
        email
      });
      assert.ok(result.error, `Email "${email}" should have failed validation`);
      assert.strictEqual(result.error.details[0].path[0], 'email');
    }
  });

  test('should normalize email to lowercase and trim whitespace', () => {
    const { value } = registerSchema.body.validate({
      ...validRegisterData,
      email: '  Jane.Doe@EXAMPLE.Com  '
    });
    assert.strictEqual(value.email, 'jane.doe@example.com');
  });

  test('should enforce minimum password length of 6 characters for registration', () => {
    const result = registerSchema.body.validate({
      ...validRegisterData,
      password: '12345'
    });
    assert.ok(result.error);
    assert.strictEqual(result.error.details[0].path[0], 'password');
  });

  test('should accept allowed roles and default to user', () => {
    const adminResult = registerSchema.body.validate({
      ...validRegisterData,
      role: 'admin'
    });
    assert.strictEqual(adminResult.error, undefined);
    assert.strictEqual(adminResult.value.role, 'admin');

    const noRoleResult = registerSchema.body.validate({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123'
    });
    assert.strictEqual(noRoleResult.error, undefined);
    assert.strictEqual(noRoleResult.value.role, 'user');

    const invalidRoleResult = registerSchema.body.validate({
      ...validRegisterData,
      role: 'moderator'
    });
    assert.ok(invalidRoleResult.error);
  });

  describe('loginSchema Validation Tests', () => {
    test('should validate valid login body and normalize email', () => {
      const { error, value } = loginSchema.body.validate({
        email: '  USER@Example.COM  ',
        password: 'anyPassword123'
      });

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.email, 'user@example.com');
      assert.strictEqual(value.password, 'anyPassword123');
    });

    test('should fail login validation when email is missing or invalid format', () => {
      const missingEmail = loginSchema.body.validate({ password: '123' });
      assert.ok(missingEmail.error);
      assert.strictEqual(missingEmail.error.details[0].path[0], 'email');

      const invalidEmail = loginSchema.body.validate({ email: 'bad-email', password: '123' });
      assert.ok(invalidEmail.error);
      assert.strictEqual(invalidEmail.error.details[0].path[0], 'email');
    });

    test('should fail login validation when password is empty or missing', () => {
      const missingPass = loginSchema.body.validate({ email: 'user@example.com' });
      assert.ok(missingPass.error);
      assert.strictEqual(missingPass.error.details[0].path[0], 'password');

      const emptyPass = loginSchema.body.validate({ email: 'user@example.com', password: '' });
      assert.ok(emptyPass.error);
      assert.strictEqual(emptyPass.error.details[0].path[0], 'password');
    });
  });
});
