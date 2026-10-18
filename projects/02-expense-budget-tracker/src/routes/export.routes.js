const express = require('express');
const exportController = require('../controllers/export.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { queryExpenseSchema } = require('../validations/expense.validation');

const router = express.Router();

router.use(authenticate);

router.get('/csv', validate(queryExpenseSchema, 'query'), exportController.exportCsv);
router.get('/json', validate(queryExpenseSchema, 'query'), exportController.exportJson);

module.exports = router;
