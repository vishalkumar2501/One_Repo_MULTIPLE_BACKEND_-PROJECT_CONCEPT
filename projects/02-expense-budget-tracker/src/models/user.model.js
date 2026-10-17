const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const BCRYPT_SALT_ROUNDS = 10;
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY', 'CHF', 'SGD',
  'AED', 'BRL', 'ZAR', 'NZD', 'SEK', 'NOK', 'MXN', 'HKD'
];

/**
 * User Schema definition for the Expense & Budget Tracker.
 * Manages user credentials, preferred currency, financial defaults, and profile states.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
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
      select: false // Password excluded by default from query projections
    },
    currency: {
      type: String,
      required: [true, 'Default currency is required'],
      uppercase: true,
      trim: true,
      default: 'USD',
      enum: {
        values: SUPPORTED_CURRENCIES,
        message: 'Currency {VALUE} is not supported'
      }
    },
    monthlyIncome: {
      type: Number,
      default: 0,
      min: [0, 'Monthly income cannot be negative']
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role must be either user or admin'
      },
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Pre-save middleware to automatically hash user password upon creation or modification.
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Instance method: Compare candidate plain text password with stored bcrypt hash.
 * @param {string} candidatePassword - Plain text password to verify
 * @returns {Promise<boolean>} Resolves to true if password matches, false otherwise
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
 * Instance method: Return a clean representation of the user without sensitive attributes.
 * @returns {Object} Safe plain JavaScript object
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

/**
 * Instance method: Generate a signed JWT authentication token for the user.
 * @param {Object} [additionalPayload={}] - Optional additional claims
 * @param {Object} [options={}] - Optional jwt sign options
 * @returns {string} Signed JWT token string
 */
userSchema.methods.generateAuthToken = function (additionalPayload = {}, options = {}) {
  const { generateToken } = require('../utils/token');
  const payload = {
    id: this._id ? this._id.toString() : undefined,
    email: this.email,
    role: this.role,
    currency: this.currency,
    ...additionalPayload
  };
  return generateToken(payload, options);
};

/**
 * Static method: Find user by normalized email address.
 * @param {string} email - Email address to search
 * @returns {Query} Mongoose query resolving to user document or null
 */
userSchema.statics.findByEmail = function (email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  return this.findOne({ email: email.toLowerCase().trim() });
};

/**
 * Static method: Check if an email address is already registered.
 * @param {string} email - Email address to check
 * @param {mongoose.Types.ObjectId|string} [excludeUserId=null] - Optional user ID to exclude (for profile updates)
 * @returns {Promise<boolean>} True if email exists, false otherwise
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId = null) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const query = { email: email.toLowerCase().trim() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existingUser = await this.findOne(query).select('_id').lean();
  return Boolean(existingUser);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.SUPPORTED_CURRENCIES = SUPPORTED_CURRENCIES;
