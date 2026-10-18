const express = require('express');
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createExpenseSchema,
  updateExpenseSchema,
  queryExpenseSchema
} = require('../validations/expense.validation');

const router = express.Router();

router.use(authenticate);

// Special routes before parameterized :id route
router.get('/recurring', expenseController.getRecurringExpenses);

// Standard CRUD routes
router.get('/', validate(queryExpenseSchema, 'query'), expenseController.getExpenses);
router.post('/', validate(createExpenseSchema), expenseController.createExpense);
router.get('/:id', expenseController.getExpenseById);
router.patch('/:id', validate(updateExpenseSchema), expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
