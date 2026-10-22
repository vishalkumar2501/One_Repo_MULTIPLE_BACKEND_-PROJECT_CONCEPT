const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  assignRoleSchema
} = require('../src/validations/auth.validation');

/**
 * Unit tests for Joi validation schemas used in authentication
 * and RBAC role assignment endpoints.
 */

// ── Register Schema ─────────────────────────────────────────────────────

describe('Auth Validation - Register Schema', () => {
  it('should validate a correct registration payload', () => {
    const { error, value } = registerSchema.validate({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'securepass'
    });
    assert.strictEqual(error, undefined);
    assert.strictEqual(value.name, 'John Doe');
    assert.strictEqual(value.email, 'john@example.com');
  });

  it('should require name', () => {
    const { error } = registerSchema.validate({ email: 'a@b.com', password: '123456' });
    assert.ok(error);
    assert.ok(error.details[0].message.includes('Name'));
  });

  it('should require email', () => {
    const { error } = registerSchema.validate({ name: 'Test', password: '123456' });
    assert.ok(error);
    assert.ok(error.details[0].message.includes('email') || error.details[0].message.includes('Email'));
  });

  it('should require password', () => {
    const { error } = registerSchema.validate({ name: 'Test', email: 'a@b.com' });
    assert.ok(error);
  });

  it('should reject password shorter than 6 characters', () => {
    const { error } = registerSchema.validate({ name: 'Test', email: 'a@b.com', password: '12345' });
    assert.ok(error);
    assert.ok(error.details[0].message.includes('6'));
  });

  it('should reject name shorter than 2 characters', () => {
    const { error } = registerSchema.validate({ name: 'A', email: 'a@b.com', password: '123456' });
    assert.ok(error);
  });

  it('should accept optional bio and avatar', () => {
    const { error, value } = registerSchema.validate({
      name: 'Writer',
      email: 'writer@blog.com',
      password: 'secure123',
      bio: 'Tech writer',
      avatar: 'https://example.com/avatar.png'
    });
    assert.strictEqual(error, undefined);
    assert.strictEqual(value.bio, 'Tech writer');
  });

  it('should reject invalid email format', () => {
    const { error } = registerSchema.validate({ name: 'Test', email: 'notanemail', password: '123456' });
    assert.ok(error);
  });
});

// ── Login Schema ────────────────────────────────────────────────────────

describe('Auth Validation - Login Schema', () => {
  it('should validate a correct login payload', () => {
    const { error } = loginSchema.validate({ email: 'john@example.com', password: 'pass123' });
    assert.strictEqual(error, undefined);
  });

  it('should require email', () => {
    const { error } = loginSchema.validate({ password: '123456' });
    assert.ok(error);
  });

  it('should require password', () => {
    const { error } = loginSchema.validate({ email: 'a@b.com' });
    assert.ok(error);
  });

  it('should normalize email to lowercase', () => {
    const { value } = loginSchema.validate({ email: 'John@EXAMPLE.COM', password: 'pass' });
    assert.strictEqual(value.email, 'john@example.com');
  });
});

// ── Update Profile Schema ───────────────────────────────────────────────

describe('Auth Validation - Update Profile Schema', () => {
  it('should accept a valid profile update', () => {
    const { error } = updateProfileSchema.validate({ name: 'New Name', bio: 'Updated bio' });
    assert.strictEqual(error, undefined);
  });

  it('should reject empty update body', () => {
    const { error } = updateProfileSchema.validate({});
    assert.ok(error);
    assert.ok(error.details[0].message.includes('one field'));
  });

  it('should accept socialLinks update', () => {
    const { error, value } = updateProfileSchema.validate({
      socialLinks: { website: 'https://myblog.com', github: 'octocat' }
    });
    assert.strictEqual(error, undefined);
    assert.strictEqual(value.socialLinks.website, 'https://myblog.com');
  });

  it('should reject bio longer than 500 characters', () => {
    const { error } = updateProfileSchema.validate({ bio: 'X'.repeat(501) });
    assert.ok(error);
  });
});

// ── Change Password Schema ──────────────────────────────────────────────

describe('Auth Validation - Change Password Schema', () => {
  it('should validate a correct password change payload', () => {
    const { error } = changePasswordSchema.validate({
      currentPassword: 'oldPass',
      newPassword: 'newPass123'
    });
    assert.strictEqual(error, undefined);
  });

  it('should require currentPassword', () => {
    const { error } = changePasswordSchema.validate({ newPassword: 'newPass123' });
    assert.ok(error);
  });

  it('should require newPassword', () => {
    const { error } = changePasswordSchema.validate({ currentPassword: 'oldPass' });
    assert.ok(error);
  });

  it('should reject newPassword shorter than 6 characters', () => {
    const { error } = changePasswordSchema.validate({ currentPassword: 'old', newPassword: '12345' });
    assert.ok(error);
  });
});

// ── Assign Role Schema ──────────────────────────────────────────────────

describe('Auth Validation - Assign Role Schema', () => {
  it('should accept valid roles', () => {
    ['user', 'author', 'moderator', 'admin'].forEach((role) => {
      const { error } = assignRoleSchema.validate({ role });
      assert.strictEqual(error, undefined, `Role "${role}" should be valid`);
    });
  });

  it('should reject invalid role', () => {
    const { error } = assignRoleSchema.validate({ role: 'superadmin' });
    assert.ok(error);
  });

  it('should require role field', () => {
    const { error } = assignRoleSchema.validate({});
    assert.ok(error);
  });
});
