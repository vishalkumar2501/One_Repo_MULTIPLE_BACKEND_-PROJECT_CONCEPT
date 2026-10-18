const { Expense } = require('../models/expense.model');
const { Budget } = require('../models/budget.model');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller handling financial analytics, aggregation pipelines, and cashflow reports.
 */
const analyticsController = {
  /**
   * Category spending breakdown and percentage distributions.
   * GET /api/v1/analytics/category-breakdown
   */
  getCategoryBreakdown: asyncHandler(async (req, res) => {
    let { startDate, endDate, month, year } = req.query;

    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    }

    const categories = await Expense.getCategoryAnalytics(req.user._id, {
      startDate,
      endDate
    });

    const totalSpend = categories.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const breakdownWithPercentage = categories.map((cat) => ({
      ...cat,
      percentage: totalSpend > 0 ? Number(((cat.totalAmount / totalSpend) * 100).toFixed(1)) : 0
    }));

    return ApiResponse.success(
      res,
      {
        totalSpend: Number(totalSpend.toFixed(2)),
        categoryCount: categories.length,
        breakdown: breakdownWithPercentage
      },
      'Category spending breakdown generated successfully'
    );
  }),

  /**
   * 12-Month cashflow trends comparing income vs expenses.
   * GET /api/v1/analytics/monthly-cashflow
   */
  getMonthlyCashflow: asyncHandler(async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const monthlySeries = await Expense.getMonthlyCashflow(req.user._id, year);

    let annualIncome = 0;
    let annualExpense = 0;

    monthlySeries.forEach((m) => {
      annualIncome += m.income;
      annualExpense += m.expense;
    });

    const annualNetSavings = Number((annualIncome - annualExpense).toFixed(2));
    const annualSavingsRate =
      annualIncome > 0 ? Number(((annualNetSavings / annualIncome) * 100).toFixed(1)) : 0;

    return ApiResponse.success(
      res,
      {
        year,
        annualSummary: {
          totalIncome: Number(annualIncome.toFixed(2)),
          totalExpense: Number(annualExpense.toFixed(2)),
          netSavings: annualNetSavings,
          savingsRate: annualSavingsRate
        },
        monthlyTrends: monthlySeries
      },
      'Monthly cashflow summary generated successfully'
    );
  }),

  /**
   * Executive Financial Dashboard Summary for the current user.
   * GET /api/v1/analytics/summary
   */
  getSummaryDashboard: asyncHandler(async (req, res) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

    const [monthSpend, categoryAnalytics, recentTransactions, activeBudgets] = await Promise.all([
      Expense.getMonthlySpend(req.user._id, { month: currentMonth, year: currentYear }),
      Expense.getCategoryAnalytics(req.user._id, {
        startDate: startOfMonth,
        endDate: endOfMonth
      }),
      Expense.find({ user: req.user._id })
        .sort({ date: -1 })
        .limit(5)
        .populate('category', 'name type icon color slug isPredefined'),
      Budget.find({ user: req.user._id, month: currentMonth, year: currentYear }).populate(
        'category',
        'name'
      )
    ]);

    // Compute top category
    const topCategory = categoryAnalytics.length > 0 ? categoryAnalytics[0] : null;

    // Check budget alerts
    let warningAlerts = 0;
    let exceededAlerts = 0;

    for (const budget of activeBudgets) {
      const catSpend = await Expense.getMonthlySpend(req.user._id, {
        month: currentMonth,
        year: currentYear,
        categoryId: budget.category ? budget.category._id : null
      });
      const st = budget.calculateStatus(catSpend);
      if (st.status === 'warning') warningAlerts++;
      if (st.status === 'exceeded') exceededAlerts++;
    }

    return ApiResponse.success(
      res,
      {
        currentPeriod: { month: currentMonth, year: currentYear },
        metrics: {
          monthlySpend: monthSpend,
          baselineMonthlyIncome: req.user.monthlyIncome || 0,
          currency: req.user.currency || 'USD',
          topCategory: topCategory
            ? {
                name: topCategory.categoryName,
                amount: topCategory.totalAmount,
                color: topCategory.categoryColor
              }
            : null,
          budgetsConfigured: activeBudgets.length,
          alerts: {
            warning: warningAlerts,
            exceeded: exceededAlerts
          }
        },
        recentTransactions: recentTransactions.map((t) => t.toSafeObject())
      },
      'Executive dashboard summary retrieved successfully'
    );
  })
};

module.exports = analyticsController;
