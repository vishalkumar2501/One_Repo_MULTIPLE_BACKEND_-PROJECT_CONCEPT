const mongoose = require('mongoose');

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Standard System Predefined Categories for Expense and Income.
 * Seeded automatically or provided globally to all users.
 */
const PREDEFINED_CATEGORIES = [
  // Expense Categories
  { name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#EF4444', description: 'Groceries, restaurants, cafes, and food delivery' },
  { name: 'Housing & Rent', type: 'expense', icon: 'home', color: '#8B5CF6', description: 'Rent, mortgage, property taxes, and home maintenance' },
  { name: 'Utilities', type: 'expense', icon: 'bolt', color: '#EAB308', description: 'Electricity, water, gas, internet, and mobile phone bills' },
  { name: 'Transportation', type: 'expense', icon: 'car', color: '#3B82F6', description: 'Fuel, transit fares, vehicle service, parking, and tolls' },
  { name: 'Healthcare', type: 'expense', icon: 'heart-pulse', color: '#EC4899', description: 'Doctor visits, medications, health insurance, and wellness' },
  { name: 'Entertainment', type: 'expense', icon: 'film', color: '#10B981', description: 'Movies, streaming subscriptions, games, and events' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#6366F1', description: 'Clothing, personal electronics, home goods, and gifts' },
  { name: 'Education', type: 'expense', icon: 'graduation-cap', color: '#14B8A6', description: 'Tuition, textbooks, online courses, and skill workshops' },
  { name: 'Personal Care', type: 'expense', icon: 'smile', color: '#F43F5E', description: 'Grooming, salon, cosmetics, and fitness memberships' },
  { name: 'Travel', type: 'expense', icon: 'plane', color: '#0EA5E9', description: 'Flights, accommodations, vacation transit, and sightseeing' },
  { name: 'Miscellaneous', type: 'expense', icon: 'more-horizontal', color: '#64748B', description: 'Incidental or unclassified spending' },

  // Income Categories
  { name: 'Salary', type: 'income', icon: 'briefcase', color: '#22C55E', description: 'Primary monthly employment wage and salary' },
  { name: 'Freelance & Consulting', type: 'income', icon: 'laptop', color: '#10B981', description: 'Client contracts, gigs, and technical consulting' },
  { name: 'Investments & Dividends', type: 'income', icon: 'trending-up', color: '#06B6D4', description: 'Stock dividends, mutual fund gains, and interest' },
  { name: 'Gifts & Grants', type: 'income', icon: 'gift', color: '#A855F7', description: 'Monetary gifts, grants, cash rewards, and stipends' },
  { name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#84CC16', description: 'Auxiliary or incidental income streams' }
];

/**
 * Generates a URL-friendly slug from a name string.
 * @param {string} text - Raw input text
 * @returns {string} Sanitized slug
 */
const slugify = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Category Schema supporting both System Predefined and User Custom Categories.
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters long'],
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Category type is required'],
      enum: {
        values: ['expense', 'income'],
        message: 'Category type must be either expense or income'
      },
      default: 'expense'
    },
    icon: {
      type: String,
      trim: true,
      default: 'tag',
      maxlength: [30, 'Icon identifier cannot exceed 30 characters']
    },
    color: {
      type: String,
      trim: true,
      default: '#6B7280',
      match: [HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g. #EF4444)']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    isPredefined: {
      type: Boolean,
      default: false
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index: A category name must be unique per type for a given user (or globally when user is null)
categorySchema.index({ name: 1, type: 1, user: 1 }, { unique: true });
categorySchema.index({ user: 1, isActive: 1, type: 1 });
categorySchema.index({ isPredefined: 1, isActive: 1 });

/**
 * Pre-validate hook:
 * 1. Auto-generate slug from name if missing or name modified.
 * 2. Enforce constraint: Predefined categories must have user = null; custom categories must have user != null.
 */
categorySchema.pre('validate', function () {
  if (this.name && (!this.slug || this.isModified('name'))) {
    this.slug = slugify(this.name);
  }

  if (this.isPredefined) {
    this.user = null;
  } else if (!this.user) {
    this.invalidate('user', 'Custom category requires an associated user');
  }
});

/**
 * Instance method: Check if a given user has authorization to modify or delete this category.
 * Predefined system categories are immutable to normal users.
 *
 * @param {mongoose.Types.ObjectId|string} userId - User identifier to verify
 * @returns {boolean} True if user is owner of custom category, false otherwise
 */
categorySchema.methods.canModify = function (userId) {
  if (this.isPredefined) {
    return false;
  }
  if (!userId || !this.user) {
    return false;
  }
  return this.user.toString() === userId.toString();
};

/**
 * Instance method: Clean object presentation without internal fields.
 * @returns {Object} Plain JavaScript category representation
 */
categorySchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

/**
 * Static method: Fetch all active predefined system categories.
 * @param {string} [type] - Optional category type ('expense' | 'income')
 * @returns {Promise<Array>} List of predefined categories
 */
categorySchema.statics.getPredefinedCategories = function (type = null) {
  const filter = { isPredefined: true, isActive: true };
  if (type) {
    filter.type = type;
  }
  return this.find(filter).sort({ name: 1 });
};

/**
 * Static method: Fetch all categories accessible to a user (predefined system + user's custom).
 *
 * @param {mongoose.Types.ObjectId|string} userId - User identifier
 * @param {Object} [options={}] - Query options
 * @param {string} [options.type] - Optional filter ('expense' | 'income')
 * @param {boolean} [options.includeInactive=false] - Whether to include inactive custom categories
 * @returns {Promise<Array>} Combined category list sorted by predefined descending, then name
 */
categorySchema.statics.getCategoriesForUser = function (userId, options = {}) {
  const { type, includeInactive = false } = options;

  const accessFilter = {
    $or: [
      { isPredefined: true, isActive: true },
      {
        user: userId,
        ...(includeInactive ? {} : { isActive: true })
      }
    ]
  };

  if (type) {
    accessFilter.type = type;
  }

  return this.find(accessFilter).sort({ isPredefined: -1, name: 1 });
};

/**
 * Static method: Find a category by ID if it is accessible to the user (either predefined or owned).
 *
 * @param {mongoose.Types.ObjectId|string} categoryId - Category identifier
 * @param {mongoose.Types.ObjectId|string} userId - User identifier
 * @returns {Promise<Document|null>} Category document or null
 */
categorySchema.statics.findAccessibleById = function (categoryId, userId) {
  if (!categoryId) return null;

  return this.findOne({
    _id: categoryId,
    $or: [
      { isPredefined: true },
      { user: userId }
    ]
  });
};

/**
 * Static method: Check whether a category name is already taken for a user or in predefined list.
 *
 * @param {string} name - Proposed category name
 * @param {string} type - 'expense' | 'income'
 * @param {mongoose.Types.ObjectId|string} [userId=null] - User identifier for custom category checks
 * @param {mongoose.Types.ObjectId|string} [excludeCategoryId=null] - Category ID to exclude during updates
 * @returns {Promise<boolean>} True if name conflict exists, false otherwise
 */
categorySchema.statics.isNameTaken = async function (name, type, userId = null, excludeCategoryId = null) {
  if (!name || !type) return false;

  const trimmedName = name.trim();
  const searchFilter = {
    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    type,
    $or: [
      { isPredefined: true },
      ...(userId ? [{ user: userId }] : [])
    ]
  };

  if (excludeCategoryId) {
    searchFilter._id = { $ne: excludeCategoryId };
  }

  const existing = await this.findOne(searchFilter).select('_id').lean();
  return Boolean(existing);
};

/**
 * Static method: Idempotently seeds default predefined categories into the database.
 * Safe to run on every startup or migration.
 *
 * @returns {Promise<Object>} Summary of seeded and existing categories
 */
categorySchema.statics.seedPredefinedCategories = async function () {
  let createdCount = 0;
  let existingCount = 0;

  for (const cat of PREDEFINED_CATEGORIES) {
    const existing = await this.findOne({
      name: cat.name,
      type: cat.type,
      isPredefined: true
    });

    if (!existing) {
      await this.create({
        ...cat,
        slug: slugify(cat.name),
        isPredefined: true,
        user: null,
        isActive: true
      });
      createdCount++;
    } else {
      existingCount++;
    }
  }

  return {
    total: PREDEFINED_CATEGORIES.length,
    created: createdCount,
    existing: existingCount
  };
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
module.exports.PREDEFINED_CATEGORIES = PREDEFINED_CATEGORIES;
module.exports.slugify = slugify;
