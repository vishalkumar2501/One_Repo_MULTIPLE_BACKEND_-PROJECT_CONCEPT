const { Expense } = require('../models/expense.model');
const { Category } = require('../models/category.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const {
  buildExpenseFilter,
  buildSortOptions,
  buildPaginationMetadata
} = require('../utils/queryBuilder');

/**
 * Controller handling expense and income transaction operations.
 */
const expenseController = {
  /**
   * Create a new expense or income transaction.
   * POST /api/v1/expenses
   */
  createExpense: asyncHandler(async (req, res) => {
    const {
      title,
      amount,
      category: categoryId,
      type = 'expense',
      currency = req.user.currency || 'USD',
      paymentMethod = 'cash',
      date = new Date(),
      notes = '',
      receiptUrl = '',
      tags = [],
      isRecurring = false,
      recurring,
      status = 'completed'
    } = req.body;

    // Verify category exists and is accessible to current user
    const category = await Category.findAccessibleById(categoryId, req.user._id);
    if (!category) {
      throw ApiError.badRequest('Selected category does not exist or is not accessible.');
    }

    // Ensure category type aligns with transaction type
    if (category.type !== type) {
      throw ApiError.badRequest(
        `Category '${category.name}' has type '${category.type}' which does not match transaction type '${type}'.`
      );
    }

    const expense = await Expense.create({
      user: req.user._id,
      category: category._id,
      title,
      amount,
      currency,
      type,
      paymentMethod,
      date,
      notes,
      receiptUrl,
      tags,
      isRecurring,
      recurring: isRecurring ? recurring : undefined,
      status
    });

    const populatedExpense = await Expense.findById(expense._id).populate(
      'category',
      'name type icon color slug isPredefined'
    );

    return ApiResponse.created(
      res,
      { expense: populatedExpense.toSafeObject() },
      'Transaction recorded successfully'
    );
  }),

  /**
   * Query transactions with advanced filtering, date ranges, and pagination.
   * GET /api/v1/expenses
   */
  getExpenses: asyncHandler(async (req, res) => {
    const filter = buildExpenseFilter(req.user._id, req.query);
    const sort = buildSortOptions(req.query);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [totalItems, expenses] = await Promise.all([
      Expense.countDocuments(filter),
      Expense.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name type icon color slug isPredefined')
    ]);

    const pagination = buildPaginationMetadata(totalItems, page, limit);

    return ApiResponse.success(
      res,
      {
        pagination,
        expenses: expenses.map((e) => e.toSafeObject())
      },
      'Transactions retrieved successfully'
    );
  }),

  /**
   * Get single transaction by ID.
   * GET /api/v1/expenses/:id
   */
  getExpenseById: asyncHandler(async (req, res) => {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('category', 'name type icon color slug isPredefined');

    if (!expense) {
      throw ApiError.notFound('Transaction not found or you do not have permission to access it.');
    }

    return ApiResponse.success(
      res,
      { expense: expense.toSafeObject() },
      'Transaction details retrieved successfully'
    );
  }),

  /**
   * Update transaction details.
   * PATCH /api/v1/expenses/:id
   */
  updateExpense: asyncHandler(async (req, res) => {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!expense) {
      throw ApiError.notFound('Transaction not found or you do not have permission to modify it.');
    }

    const {
      title,
      amount,
      category: categoryId,
      type,
      currency,
      paymentMethod,
      date,
      notes,
      receiptUrl,
      tags,
      isRecurring,
      recurring,
      status
    } = req.body;

    const targetType = type || expense.type;

    if (categoryId) {
      const category = await Category.findAccessibleById(categoryId, req.user._id);
      if (!category) {
        throw ApiError.badRequest('Selected category does not exist or is not accessible.');
      }
      if (category.type !== targetType) {
        throw ApiError.badRequest(
          `Category '${category.name}' has type '${category.type}' which does not match transaction type '${targetType}'.`
        );
      }
      expense.category = category._id;
    }

    if (title !== undefined) expense.title = title;
    if (amount !== undefined) expense.amount = amount;
    if (type !== undefined) expense.type = type;
    if (currency !== undefined) expense.currency = currency;
    if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;
    if (date !== undefined) expense.date = date;
    if (notes !== undefined) expense.notes = notes;
    if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl;
    if (tags !== undefined) expense.tags = tags;
    if (status !== undefined) expense.status = status;

    if (isRecurring !== undefined) {
      expense.isRecurring = isRecurring;
      if (isRecurring) {
        if (recurring) expense.recurring = recurring;
      } else {
        expense.recurring = undefined;
      }
    } else if (recurring && expense.isRecurring) {
      expense.recurring = recurring;
    }

    await expense.save();

    const populatedExpense = await Expense.findById(expense._id).populate(
      'category',
      'name type icon color slug isPredefined'
    );

    return ApiResponse.success(
      res,
      { expense: populatedExpense.toSafeObject() },
      'Transaction updated successfully'
    );
  }),

  /**
   * Delete transaction.
   * DELETE /api/v1/expenses/:id
   */
  deleteExpense: asyncHandler(async (req, res) => {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!expense) {
      throw ApiError.notFound('Transaction not found or already deleted.');
    }

    return ApiResponse.success(
      res,
      null,
      'Transaction deleted successfully'
    );
  }),

  /**
   * List all recurring subscriptions and expenses.
   * GET /api/v1/expenses/recurring
   */
  getRecurringExpenses: asyncHandler(async (req, res) => {
    const recurringExpenses = await Expense.find({
      user: req.user._id,
      isRecurring: true
    })
      .sort({ 'recurring.nextDueDate': 1 })
      .populate('category', 'name type icon color slug isPredefined');

    // Calculate projected monthly recurring cost
    let projectedMonthlyCost = 0;
    recurringExpenses.forEach((exp) => {
      if (exp.type === 'expense' && exp.status !== 'cancelled') {
        const freq = exp.recurring?.frequency || 'monthly';
        if (freq === 'daily') projectedMonthlyCost += exp.amount * 30;
        else if (freq === 'weekly') projectedMonthlyCost += exp.amount * 4.33;
        else if (freq === 'biweekly') projectedMonthlyCost += exp.amount * 2.16;
        else if (freq === 'monthly') projectedMonthlyCost += exp.amount;
        else if (freq === 'quarterly') projectedMonthlyCost += exp.amount / 3;
        else if (freq === 'yearly') projectedMonthlyCost += exp.amount / 12;
      }
    });

    return ApiResponse.success(
      res,
      {
        count: recurringExpenses.length,
        projectedMonthlyCommitment: Number(projectedMonthlyCost.toFixed(2)),
        items: recurringExpenses.map((e) => e.toSafeObject())
      },
      'Recurring subscriptions retrieved successfully'
    );
  })
};

module.exports = expenseController;
