const { Budget } = require('../models/budget.model');
const { Category } = require('../models/category.model');
const { Expense } = require('../models/expense.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller handling Budget definitions, threshold tracking, and variance alerts.
 */
const budgetController = {
  /**
   * Create or define a new monthly budget limit.
   * POST /api/v1/budgets
   */
  createBudget: asyncHandler(async (req, res) => {
    const {
      category: categoryId = null,
      month,
      year,
      limit,
      currency = req.user.currency || 'USD',
      alertThreshold = 80,
      notes = ''
    } = req.body;

    let targetCategory = null;
    if (categoryId) {
      targetCategory = await Category.findAccessibleById(categoryId, req.user._id);
      if (!targetCategory) {
        throw ApiError.badRequest('Selected category does not exist or is not accessible.');
      }
      if (targetCategory.type !== 'expense') {
        throw ApiError.badRequest('Budgets can only be assigned to expense categories.');
      }
    }

    // Check for duplicate budget for this period
    const existing = await Budget.findOne({
      user: req.user._id,
      category: categoryId || null,
      month,
      year
    });

    if (existing) {
      throw ApiError.conflict(
        `A budget for ${targetCategory ? targetCategory.name : 'overall spending'} is already defined for ${month}/${year}.`
      );
    }

    const budget = await Budget.create({
      user: req.user._id,
      category: categoryId || null,
      month,
      year,
      limit,
      currency,
      alertThreshold,
      notes
    });

    const populated = await Budget.findById(budget._id).populate(
      'category',
      'name type icon color slug isPredefined'
    );

    return ApiResponse.created(
      res,
      { budget: populated.toSafeObject() },
      'Monthly budget configured successfully'
    );
  }),

  /**
   * Get list of budgets.
   * GET /api/v1/budgets
   */
  getBudgets: asyncHandler(async (req, res) => {
    const { month, year, category } = req.query;
    const filter = { user: req.user._id };

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (category !== undefined) {
      filter.category = category === 'null' || category === null ? null : category;
    }

    const budgets = await Budget.find(filter)
      .sort({ year: -1, month: -1 })
      .populate('category', 'name type icon color slug isPredefined');

    return ApiResponse.success(
      res,
      {
        count: budgets.length,
        budgets: budgets.map((b) => b.toSafeObject())
      },
      'Budgets retrieved successfully'
    );
  }),

  /**
   * Comprehensive Budget Tracking & Over-budget Alerts.
   * Compares budget limits against actual spending in real-time.
   * GET /api/v1/budgets/status
   */
  getBudgetStatus: asyncHandler(async (req, res) => {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const budgets = await Budget.find({
      user: req.user._id,
      month,
      year
    }).populate('category', 'name type icon color slug isPredefined');

    let totalBudgeted = 0;
    let totalSpent = 0;
    let alertCount = 0;
    let exceededCount = 0;

    const budgetReports = await Promise.all(
      budgets.map(async (budget) => {
        const categoryId = budget.category ? budget.category._id : null;
        const spent = await Expense.getMonthlySpend(req.user._id, {
          month,
          year,
          categoryId
        });

        const statusReport = budget.calculateStatus(spent);
        totalBudgeted += budget.limit;
        totalSpent += spent;

        if (statusReport.status === 'warning') alertCount++;
        if (statusReport.status === 'exceeded') exceededCount++;

        return {
          budget: budget.toSafeObject(),
          ...statusReport
        };
      })
    );

    // Also get overall month spend across all expenses
    const overallActualSpend = await Expense.getMonthlySpend(req.user._id, {
      month,
      year,
      categoryId: null
    });

    return ApiResponse.success(
      res,
      {
        period: { month, year },
        summary: {
          totalBudgetsConfigured: budgets.length,
          totalBudgeted: Number(totalBudgeted.toFixed(2)),
          totalSpentOnBudgetedCategories: Number(totalSpent.toFixed(2)),
          overallMonthlySpend: overallActualSpend,
          warningAlerts: alertCount,
          exceededAlerts: exceededCount
        },
        items: budgetReports
      },
      'Budget tracking status computed successfully'
    );
  }),

  /**
   * Get single budget by ID with live variance status.
   * GET /api/v1/budgets/:id
   */
  getBudgetById: asyncHandler(async (req, res) => {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('category', 'name type icon color slug isPredefined');

    if (!budget) {
      throw ApiError.notFound('Budget not found');
    }

    const spent = await Expense.getMonthlySpend(req.user._id, {
      month: budget.month,
      year: budget.year,
      categoryId: budget.category ? budget.category._id : null
    });

    const statusReport = budget.calculateStatus(spent);

    return ApiResponse.success(
      res,
      {
        budget: budget.toSafeObject(),
        status: statusReport
      },
      'Budget details retrieved successfully'
    );
  }),

  /**
   * Update budget limit or alert threshold.
   * PATCH /api/v1/budgets/:id
   */
  updateBudget: asyncHandler(async (req, res) => {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!budget) {
      throw ApiError.notFound('Budget not found');
    }

    const { limit, alertThreshold, notes, currency } = req.body;

    if (limit !== undefined) budget.limit = limit;
    if (alertThreshold !== undefined) budget.alertThreshold = alertThreshold;
    if (notes !== undefined) budget.notes = notes;
    if (currency !== undefined) budget.currency = currency;

    await budget.save();

    const populated = await Budget.findById(budget._id).populate(
      'category',
      'name type icon color slug isPredefined'
    );

    return ApiResponse.success(
      res,
      { budget: populated.toSafeObject() },
      'Budget updated successfully'
    );
  }),

  /**
   * Delete budget.
   * DELETE /api/v1/budgets/:id
   */
  deleteBudget: asyncHandler(async (req, res) => {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!budget) {
      throw ApiError.notFound('Budget not found or already deleted');
    }

    return ApiResponse.success(
      res,
      null,
      'Budget deleted successfully'
    );
  })
};

module.exports = budgetController;
