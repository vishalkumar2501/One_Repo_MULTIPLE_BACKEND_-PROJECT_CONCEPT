const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const BCRYPT_SALT_ROUNDS = 10;

/**
 * RBAC Role Hierarchy for the Blog & Community Platform.
 *
 * Roles (ascending privilege):
 *   user       – Can read articles, post comments, react to content
 *   author     – Everything a user can do + create/manage own articles
 *   moderator  – Everything an author can do + moderate comments, flag content
 *   admin      – Full platform control, user management, role assignment
 */
const ROLES = ['user', 'author', 'moderator', 'admin'];

/**
 * Numerical weight map used for hierarchical permission comparisons.
 * A higher number represents more privilege.
 */
const ROLE_HIERARCHY = Object.freeze({
  user: 0,
  author: 1,
  moderator: 2,
  admin: 3
});

/**
 * Account status values.
 */
const ACCOUNT_STATUSES = ['active', 'suspended', 'deactivated'];

/**
 * User Schema definition for the Blog & Community Platform.
 * Manages user identity, authentication credentials, RBAC role assignment,
 * and optional author profile fields (bio, avatar, social links).
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [60, 'Name cannot exceed 60 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Excluded from query results by default
    },

    // ── RBAC ──────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Role must be one of: user, author, moderator, admin'
      },
      default: 'user'
    },

    // ── Author Profile Fields ─────────────────────────────────────────
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: ''
    },
    avatar: {
      type: String,
      trim: true,
      default: ''
    },
    socialLinks: {
      website: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      github: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' }
    },

    // ── Account State ─────────────────────────────────────────────────
    accountStatus: {
      type: String,
      enum: {
        values: ACCOUNT_STATUSES,
        message: 'Account status must be one of: active, suspended, deactivated'
      },
      default: 'active'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    articlesCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ name: 'text' });

// ── Pre-save Middleware ─────────────────────────────────────────────────

/**
 * Automatically hash user password on creation or modification.
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance Methods ────────────────────────────────────────────────────

/**
 * Compare a candidate password against the stored bcrypt hash.
 * @param {string} candidatePassword - Plain text password to verify
 * @returns {Promise<boolean>} true if the password matches
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error('Password field was not selected in the query');
  }
  if (!candidatePassword) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Return a sanitized representation of the user without sensitive fields.
 * @returns {Object} Plain JavaScript object safe for API responses
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

/**
 * Generate a signed JWT token for the user.
 * @param {Object} [additionalPayload={}] - Extra claims to embed
 * @param {Object} [options={}] - jwt.sign options overrides
 * @returns {string} Signed JWT string
 */
userSchema.methods.generateAuthToken = function (additionalPayload = {}, options = {}) {
  const { generateToken } = require('../utils/token');
  const payload = {
    id: this._id ? this._id.toString() : undefined,
    email: this.email,
    role: this.role,
    ...additionalPayload
  };
  return generateToken(payload, options);
};

/**
 * Check whether this user's role is at or above the required level.
 * @param {string} requiredRole - Minimum role needed
 * @returns {boolean}
 */
userSchema.methods.hasMinimumRole = function (requiredRole) {
  return (ROLE_HIERARCHY[this.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
};

// ── Static Methods ──────────────────────────────────────────────────────

/**
 * Find a user by normalized email address.
 * @param {string} email
 * @returns {Query}
 */
userSchema.statics.findByEmail = function (email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  return this.findOne({ email: email.toLowerCase().trim() });
};

/**
 * Check if an email address is already registered.
 * @param {string} email
 * @param {string|mongoose.Types.ObjectId} [excludeUserId=null]
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId = null) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const query = { email: email.toLowerCase().trim() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existing = await this.findOne(query).select('_id').lean();
  return Boolean(existing);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
module.exports.ROLE_HIERARCHY = ROLE_HIERARCHY;
module.exports.ACCOUNT_STATUSES = ACCOUNT_STATUSES;
