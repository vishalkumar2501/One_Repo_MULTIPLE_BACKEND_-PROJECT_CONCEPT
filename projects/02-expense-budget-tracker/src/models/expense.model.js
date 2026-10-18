const mongoose = require('mongoose');

const PAYMENT_METHODS = [
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'upi',
  'crypto',
  'other'
];

const RECURRING_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly'
];

const TRANSACTION_STATUSES = ['completed', 'pending', 'cancelled'];
const TRANSACTION_TYPES = ['expense', 'income'];

/**
 * Expense & Transaction Schema
 */
const expenseSchema = new mongoose.Schema(
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
      required: [true, 'Category reference is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'USD',
      minlength: 3,
      maxlength: 3
    },
    type: {
      type: String,
      enum: {
        values: TRANSACTION_TYPES,
        message: 'Transaction type must be either expense or income'
      },
      default: 'expense',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`
      },
      default: 'cash'
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    receiptUrl: {
      type: String,
      trim: true,
      default: ''
    },
    tags: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          maxlength: 30
        }
      ],
      default: []
    },
    isRecurring: {
      type: Boolean,
      default: false,
      index: true
    },
    recurring: {
      frequency: {
        type: String,
        enum: {
          values: RECURRING_FREQUENCIES,
          message: `Recurring frequency must be one of: ${RECURRING_FREQUENCIES.join(', ')}`
        },
        required: [
          function () {
            return this.isRecurring === true;
          },
          'Recurring frequency is required when transaction is marked recurring'
        ]
      },
      nextDueDate: {
        type: Date
      },
      endDate: {
        type: Date
      }
    },
    status: {
      type: String,
      enum: {
        values: TRANSACTION_STATUSES,
        message: `Status must be one of: ${TRANSACTION_STATUSES.join(', ')}`
      },
      default: 'completed'
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

// Compound indexes for optimal performance across queries
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, type: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1, date: -1 });
expenseSchema.index({ user: 1, tags: 1 });
expenseSchema.index({ user: 1, isRecurring: 1 });


/**
 * Instance method: Formats expense safely for API output.
 */
expenseSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

/**
 * Static method: Aggregate total spend for a given user, month, year, and optional category.
 * Used for budget tracking and threshold calculation.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {Object} options
 * @param {number} options.month - 1 to 12
 * @param {number} options.year
 * @param {mongoose.Types.ObjectId|string} [options.categoryId]
 * @returns {Promise<number>} Total spent amount
 */
expenseSchema.statics.getMonthlySpend = async function (userId, { month, year, categoryId = null }) {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const match = {
    user: new mongoose.Types.ObjectId(userId.toString()),
    type: 'expense',
    status: 'completed',
    date: { $gte: startDate, $lte: endDate }
  };

  if (categoryId) {
    match.category = new mongoose.Types.ObjectId(categoryId.toString());
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  return result.length > 0 ? Number(result[0].total.toFixed(2)) : 0;
};

/**
 * Static method: Aggregate category spending breakdown for analytics.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {Object} [filterOptions={}]
 * @returns {Promise<Array>} Aggregated category breakdown
 */
expenseSchema.statics.getCategoryAnalytics = async function (userId, filterOptions = {}) {
  const { startDate, endDate } = filterOptions;
  const match = {
    user: new mongoose.Types.ObjectId(userId.toString()),
    type: 'expense',
    status: 'completed'
  };

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    },
    {
      $unwind: {
        path: '$categoryDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        categoryId: '$_id',
        categoryName: { $ifNull: ['$categoryDetails.name', 'Uncategorized'] },
        categoryColor: { $ifNull: ['$categoryDetails.color', '#6B7280'] },
        categoryIcon: { $ifNull: ['$categoryDetails.icon', 'tag'] },
        totalAmount: { $round: ['$totalAmount', 2] },
        avgAmount: { $round: ['$avgAmount', 2] },
        minAmount: { $round: ['$minAmount', 2] },
        maxAmount: { $round: ['$maxAmount', 2] },
        count: 1
      }
    },
    { $sort: { totalAmount: -1 } }
  ];

  return this.aggregate(pipeline);
};

/**
 * Static method: Aggregate monthly income vs expense cashflows.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} year
 * @returns {Promise<Array>} Monthly trends
 */
expenseSchema.statics.getMonthlyCashflow = async function (userId, year = new Date().getFullYear()) {
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const pipeline = [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId.toString()),
        status: 'completed',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          month: { $month: '$date' },
          type: '$type'
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.month',
        breakdowns: {
          $push: {
            type: '$_id.type',
            total: { $round: ['$total', 2] },
            count: '$count'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const rawResults = await this.aggregate(pipeline);

  // Format 12-month series with defaults
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const found = rawResults.find((r) => r._id === monthNum);
    let income = 0;
    let expense = 0;

    if (found && found.breakdowns) {
      found.breakdowns.forEach((b) => {
        if (b.type === 'income') income = b.total;
        if (b.type === 'expense') expense = b.total;
      });
    }

    const netSavings = Number((income - expense).toFixed(2));
    const savingsRate = income > 0 ? Number(((netSavings / income) * 100).toFixed(1)) : 0;

    return {
      month: monthNum,
      year,
      income,
      expense,
      netSavings,
      savingsRate
    };
  });

  return months;
};

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = {
  Expense,
  PAYMENT_METHODS,
  RECURRING_FREQUENCIES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES
};
