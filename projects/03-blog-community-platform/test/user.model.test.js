const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Unit tests for the User model schema, RBAC role hierarchy,
 * password hashing, and instance/static helper methods.
 *
 * These tests validate model logic in isolation without a live database.
 */

// ── Role Hierarchy & Constants ──────────────────────────────────────────

describe('User Model - RBAC Constants', () => {
  const { ROLES, ROLE_HIERARCHY, ACCOUNT_STATUSES } = require('../src/models/user.model');

  it('should export all four RBAC roles in correct order', () => {
    assert.deepStrictEqual(ROLES, ['user', 'author', 'moderator', 'admin']);
  });

  it('should define ascending privilege in ROLE_HIERARCHY', () => {
    assert.strictEqual(ROLE_HIERARCHY.user, 0);
    assert.strictEqual(ROLE_HIERARCHY.author, 1);
    assert.strictEqual(ROLE_HIERARCHY.moderator, 2);
    assert.strictEqual(ROLE_HIERARCHY.admin, 3);
  });

  it('should enforce hierarchy: admin > moderator > author > user', () => {
    assert.ok(ROLE_HIERARCHY.admin > ROLE_HIERARCHY.moderator);
    assert.ok(ROLE_HIERARCHY.moderator > ROLE_HIERARCHY.author);
    assert.ok(ROLE_HIERARCHY.author > ROLE_HIERARCHY.user);
  });

  it('should export valid account statuses', () => {
    assert.deepStrictEqual(ACCOUNT_STATUSES, ['active', 'suspended', 'deactivated']);
  });

  it('should freeze ROLE_HIERARCHY to prevent mutation', () => {
    assert.ok(Object.isFrozen(ROLE_HIERARCHY));
  });
});

// ── Schema Validation (offline) ─────────────────────────────────────────

describe('User Model - Schema Validation', () => {
  const mongoose = require('mongoose');
  const User = require('../src/models/user.model');

  it('should require name field', () => {
    const user = new User({ email: 'a@b.com', password: '123456' });
    const err = user.validateSync();
    assert.ok(err);
    assert.ok(err.errors.name);
  });

  it('should require email field', () => {
    const user = new User({ name: 'Test', password: '123456' });
    const err = user.validateSync();
    assert.ok(err);
    assert.ok(err.errors.email);
  });

  it('should require password field', () => {
    const user = new User({ name: 'Test', email: 'a@b.com' });
    const err = user.validateSync();
    assert.ok(err);
    assert.ok(err.errors.password);
  });

  it('should reject name shorter than 2 characters', () => {
    const user = new User({ name: 'A', email: 'a@b.com', password: '123456' });
    const err = user.validateSync();
    assert.ok(err);
    assert.ok(err.errors.name);
  });

  it('should reject name longer than 60 characters', () => {
    const user = new User({ name: 'X'.repeat(61), email: 'a@b.com', password: '123456' });
    const err = user.validateSync();
    assert.ok(err);
    assert.ok(err.errors.name);
  });

  it('should default role to "user"', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: '123456' });
    assert.strictEqual(user.role, 'user');
  });

  it('should accept all valid roles', () => {
    const roles = ['user', 'author', 'moderator', 'admin'];
    roles.forEach((role) => {
      const user = new User({ name: 'Test', email: 'a@b.com', password: '123456', role });
      const err = user.validateSync();
      // role error should not exist
      assert.ok(!err || !err.errors.role, `Role "${role}" should be valid`);
    });
  });

  it('should reject invalid role values', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: '123456', role: 'superuser' });
    const err = user.validateSync();
    assert.ok(err);
    assert.ok(err.errors.role);
  });

  it('should default accountStatus to "active"', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: '123456' });
    assert.strictEqual(user.accountStatus, 'active');
  });

  it('should reject invalid accountStatus values', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: '123456', accountStatus: 'banned' });
    const err = user.validateSync();
    assert.ok(err);
    assert.ok(err.errors.accountStatus);
  });

  it('should default bio to empty string', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: '123456' });
    assert.strictEqual(user.bio, '');
  });

  it('should reject bio longer than 500 characters', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: '123456', bio: 'Y'.repeat(501) });
    const err = user.validateSync();
    assert.ok(err);
    assert.ok(err.errors.bio);
  });

  it('should default articlesCount to 0', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: '123456' });
    assert.strictEqual(user.articlesCount, 0);
  });

  it('should accept socialLinks sub-document', () => {
    const user = new User({
      name: 'Test',
      email: 'a@b.com',
      password: '123456',
      socialLinks: { website: 'https://example.com', twitter: '@test' }
    });
    assert.strictEqual(user.socialLinks.website, 'https://example.com');
    assert.strictEqual(user.socialLinks.twitter, '@test');
  });
});

// ── Instance Methods ────────────────────────────────────────────────────

describe('User Model - Instance Methods', () => {
  const User = require('../src/models/user.model');
  const { ROLE_HIERARCHY } = require('../src/models/user.model');

  it('hasMinimumRole should return true when user meets the requirement', () => {
    const user = new User({ name: 'Admin', email: 'admin@test.com', password: '123456', role: 'admin' });
    assert.ok(user.hasMinimumRole('moderator'));
    assert.ok(user.hasMinimumRole('author'));
    assert.ok(user.hasMinimumRole('user'));
    assert.ok(user.hasMinimumRole('admin'));
  });

  it('hasMinimumRole should return false when user is below the requirement', () => {
    const user = new User({ name: 'Reader', email: 'reader@test.com', password: '123456', role: 'user' });
    assert.ok(!user.hasMinimumRole('author'));
    assert.ok(!user.hasMinimumRole('moderator'));
    assert.ok(!user.hasMinimumRole('admin'));
  });

  it('toSafeObject should exclude password and __v', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: 'secret123' });
    const safe = user.toSafeObject();
    assert.strictEqual(safe.password, undefined);
    assert.strictEqual(safe.__v, undefined);
    assert.strictEqual(safe.name, 'Test');
  });
});

// ── Token Utility ───────────────────────────────────────────────────────

describe('Token Utility', () => {
  const { generateToken, verifyToken } = require('../src/utils/token');

  it('should generate a valid JWT and decode it back', () => {
    const payload = { id: '12345', email: 'test@test.com', role: 'author' };
    const token = generateToken(payload);
    assert.ok(typeof token === 'string');
    assert.ok(token.split('.').length === 3);

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, '12345');
    assert.strictEqual(decoded.email, 'test@test.com');
    assert.strictEqual(decoded.role, 'author');
  });

  it('should throw for an invalid token', () => {
    assert.throws(() => verifyToken('invalid.token.string'), { name: 'JsonWebTokenError' });
  });

  it('should respect custom expiresIn option', () => {
    const token = generateToken({ id: '1' }, { expiresIn: '1s' });
    const decoded = verifyToken(token);
    assert.ok(decoded.exp);
  });
});
