const express = require('express');
const budgetController = require('../controllers/budget.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createBudgetSchema,
  updateBudgetSchema,
  queryBudgetSchema
} = require('../validations/budget.validation');

const router = express.Router();

router.use(authenticate);

// Special routes before :id
router.get('/status', budgetController.getBudgetStatus);

// Standard CRUD routes
router.get('/', validate(queryBudgetSchema, 'query'), budgetController.getBudgets);
router.post('/', validate(createBudgetSchema), budgetController.createBudget);
router.get('/:id', budgetController.getBudgetById);
router.patch('/:id', validate(updateBudgetSchema), budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;
