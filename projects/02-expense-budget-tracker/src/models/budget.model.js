const mongoose = require('mongoose');

/**
 * Budget Model Schema
 */
const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },
    month: {
      type: Number,
      required: [true, 'Month is required (1-12)'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2000, 'Year must be 2000 or later'],
      max: [2100, 'Year must be 2100 or earlier']
    },
    limit: {
      type: Number,
      required: [true, 'Budget limit amount is required'],
      min: [0.01, 'Budget limit must be greater than zero']
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'USD',
      minlength: 3,
      maxlength: 3
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: [1, 'Alert threshold must be at least 1%'],
      max: [100, 'Alert threshold cannot exceed 100%']
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Notes cannot exceed 300 characters']
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

// Compound unique index ensuring only one budget exists per user/category/month/year
budgetSchema.index({ user: 1, category: 1, month: 1, year: 1 }, { unique: true });
budgetSchema.index({ user: 1, year: 1, month: 1 });

/**
 * Calculate status comparing spent amount against limit and alert threshold.
 *
 * @param {number} spentAmount - Actual expenses incurred
 * @returns {Object} Calculated variance and alert status
 */
budgetSchema.methods.calculateStatus = function (spentAmount = 0) {
  const spent = Number(spentAmount.toFixed(2));
  const limit = this.limit;
  const remaining = Number((limit - spent).toFixed(2));
  const percentUsed = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;
  const threshold = this.alertThreshold;

  let status = 'normal';
  let alertMessage = 'Spending is within safe budget limits.';

  if (spent > limit) {
    status = 'exceeded';
    alertMessage = `Budget exceeded by ${(spent - limit).toFixed(2)} ${this.currency} (${percentUsed}% used)!`;
  } else if (percentUsed >= threshold) {
    status = 'warning';
    alertMessage = `Approaching budget limit! ${percentUsed}% used (Threshold: ${threshold}%).`;
  }

  return {
    limit,
    spent,
    remaining,
    percentUsed,
    alertThreshold: threshold,
    status,
    alertMessage
  };
};

/**
 * Format safe budget representation.
 */
budgetSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = {
  Budget
};
