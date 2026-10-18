const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createCategorySchema,
  updateCategorySchema,
  queryCategorySchema
} = require('../validations/category.validation');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(queryCategorySchema, 'query'), categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', validate(createCategorySchema), categoryController.createCategory);
router.patch('/:id', validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
