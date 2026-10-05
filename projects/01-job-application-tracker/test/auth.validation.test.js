const { test, describe } = require('node:test');
const assert = require('node:assert');
const { registerSchema } = require('../src/validations/auth.validation');

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

  test('should enforce minimum password length of 6 characters', () => {
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
});
