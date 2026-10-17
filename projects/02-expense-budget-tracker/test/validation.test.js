const { test, describe } = require('node:test');
const assert = require('node:assert');
const validate = require('../src/middleware/validate');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} = require('../src/validations/user.validation');
const {
  createCategorySchema,
  updateCategorySchema,
  queryCategorySchema
} = require('../src/validations/category.validation');

describe('Validation Schemas & Middleware Unit Tests (Project 02)', () => {
  describe('User Validation Schemas', () => {
    test('registerSchema should validate valid registration payload', () => {
      const { error, value } = registerSchema.validate({
        name: 'Jordan Belfort',
        email: 'jordan@example.com',
        password: 'Password123!',
        currency: 'USD',
        monthlyIncome: 10000
      });

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.currency, 'USD');
      assert.strictEqual(value.monthlyIncome, 10000);
    });

    test('registerSchema should reject invalid email and short password', () => {
      const { error } = registerSchema.validate({
        name: 'Jordan',
        email: 'invalid-email',
        password: '123'
      });

      assert.ok(error);
      const fields = error.details.map((d) => d.path[0]);
      assert.ok(fields.includes('email'));
      assert.ok(fields.includes('password'));
    });

    test('registerSchema should reject unsupported currency', () => {
      const { error } = registerSchema.validate({
        name: 'Jordan',
        email: 'jordan@example.com',
        password: 'Password123!',
        currency: 'BITCOIN'
      });

      assert.ok(error);
      assert.strictEqual(error.details[0].path[0], 'currency');
    });

    test('loginSchema should validate valid login and require fields', () => {
      const valid = loginSchema.validate({
        email: 'user@example.com',
        password: 'password123'
      });
      assert.strictEqual(valid.error, undefined);

      const invalid = loginSchema.validate({});
      assert.ok(invalid.error);
    });

    test('updateProfileSchema should require at least one field and validate currency', () => {
      const empty = updateProfileSchema.validate({});
      assert.ok(empty.error);

      const valid = updateProfileSchema.validate({ currency: 'EUR', monthlyIncome: 4500 });
      assert.strictEqual(valid.error, undefined);
    });

    test('changePasswordSchema should reject matching current and new password', () => {
      const same = changePasswordSchema.validate({
        currentPassword: 'SamePassword123',
        newPassword: 'SamePassword123'
      });
      assert.ok(same.error);

      const valid = changePasswordSchema.validate({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456'
      });
      assert.strictEqual(valid.error, undefined);
    });
  });

  describe('Category Validation Schemas', () => {
    test('createCategorySchema should validate valid expense category with defaults', () => {
      const { error, value } = createCategorySchema.validate({
        name: 'Dining & Takeout'
      });

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.type, 'expense');
      assert.strictEqual(value.icon, 'tag');
      assert.strictEqual(value.color, '#6B7280');
    });

    test('createCategorySchema should validate income category with custom color & icon', () => {
      const { error, value } = createCategorySchema.validate({
        name: 'Consulting',
        type: 'income',
        icon: 'briefcase',
        color: '#22C55E',
        description: 'Client software advisory'
      });

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.type, 'income');
      assert.strictEqual(value.color, '#22C55E');
    });

    test('createCategorySchema should reject invalid hex color', () => {
      const { error } = createCategorySchema.validate({
        name: 'Coffee',
        color: 'blue'
      });

      assert.ok(error);
      assert.strictEqual(error.details[0].path[0], 'color');
    });

    test('updateCategorySchema should require at least one field', () => {
      const empty = updateCategorySchema.validate({});
      assert.ok(empty.error);

      const valid = updateCategorySchema.validate({ name: 'Coffee & Tea', color: '#B45309' });
      assert.strictEqual(valid.error, undefined);
    });

    test('queryCategorySchema should validate type filter', () => {
      const valid = queryCategorySchema.validate({ type: 'income', includeInactive: true });
      assert.strictEqual(valid.error, undefined);

      const invalid = queryCategorySchema.validate({ type: 'crypto' });
      assert.ok(invalid.error);
    });
  });

  describe('Validation Middleware', () => {
    test('middleware should call next() and clean payload for valid request body', () => {
      const req = {
        body: {
          name: '  Coffee Shop  ',
          type: 'expense',
          extraFieldToStrip: 'shouldBeStripped'
        }
      };
      const res = {};
      let nextCalledWith = undefined;
      const next = (err) => {
        nextCalledWith = err;
      };

      const mw = validate({ body: createCategorySchema });
      mw(req, res, next);

      assert.strictEqual(nextCalledWith, undefined);
      assert.strictEqual(req.body.name, 'Coffee Shop');
      assert.strictEqual(req.body.extraFieldToStrip, undefined);
    });

    test('middleware should pass ApiError.badRequest to next for invalid input', () => {
      const req = {
        body: {
          name: 'A' // too short
        }
      };
      const res = {};
      let nextCalledWith = undefined;
      const next = (err) => {
        nextCalledWith = err;
      };

      const mw = validate({ body: createCategorySchema });
      mw(req, res, next);

      assert.ok(nextCalledWith);
      assert.strictEqual(nextCalledWith.statusCode, 400);
      assert.strictEqual(nextCalledWith.message, 'Validation failed');
      assert.ok(Array.isArray(nextCalledWith.data));
    });
  });
});
