const { Expense } = require('../models/expense.model');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { buildExpenseFilter } = require('../utils/queryBuilder');

/**
 * Escapes a field for safe CSV output according to RFC 4180.
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
const escapeCsvField = (value) => {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
};

/**
 * Controller handling structured data export in CSV and JSON formats.
 */
const exportController = {
  /**
   * Export transactions as downloadable CSV file.
   * GET /api/v1/export/csv
   */
  exportCsv: asyncHandler(async (req, res) => {
    const filter = buildExpenseFilter(req.user._id, req.query);

    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .populate('category', 'name type slug');

    const headers = [
      'ID',
      'Date',
      'Title',
      'Type',
      'Category',
      'Amount',
      'Currency',
      'PaymentMethod',
      'Status',
      'IsRecurring',
      'Tags',
      'Notes'
    ];

    const rows = expenses.map((exp) => {
      const formattedDate = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
      const categoryName = exp.category ? exp.category.name : 'Uncategorized';
      const tagsString = (exp.tags || []).join('; ');

      return [
        exp._id.toString(),
        formattedDate,
        exp.title,
        exp.type,
        categoryName,
        exp.amount.toFixed(2),
        exp.currency,
        exp.paymentMethod,
        exp.status,
        exp.isRecurring ? 'Yes' : 'No',
        tagsString,
        exp.notes || ''
      ]
        .map(escapeCsvField)
        .join(',');
    });

    const csvContent = [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `expenses_export_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(csvContent);
  }),

  /**
   * Export transactions as structured JSON with audit metadata.
   * GET /api/v1/export/json
   */
  exportJson: asyncHandler(async (req, res) => {
    const filter = buildExpenseFilter(req.user._id, req.query);

    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .populate('category', 'name type slug icon color');

    let totalExpense = 0;
    let totalIncome = 0;

    expenses.forEach((e) => {
      if (e.type === 'expense' && e.status === 'completed') totalExpense += e.amount;
      if (e.type === 'income' && e.status === 'completed') totalIncome += e.amount;
    });

    const payload = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          currency: req.user.currency
        },
        recordCount: expenses.length,
        summary: {
          totalExpense: Number(totalExpense.toFixed(2)),
          totalIncome: Number(totalIncome.toFixed(2)),
          netCashflow: Number((totalIncome - totalExpense).toFixed(2))
        }
      },
      transactions: expenses.map((e) => e.toSafeObject())
    };

    return ApiResponse.success(res, payload, 'Transactions exported to JSON successfully');
  })
};

module.exports = exportController;
