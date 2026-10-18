const { Category } = require('../models/category.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller managing Category operations (predefined + custom user categories).
 */
const categoryController = {
  /**
   * List all categories accessible to authenticated user.
   * GET /api/v1/categories
   */
  getCategories: asyncHandler(async (req, res) => {
    const { type, includeInactive } = req.query;

    const categories = await Category.getCategoriesForUser(req.user._id, {
      type,
      includeInactive: includeInactive === 'true'
    });

    return ApiResponse.success(
      res,
      {
        count: categories.length,
        categories: categories.map((c) => c.toSafeObject())
      },
      'Categories retrieved successfully'
    );
  }),

  /**
   * Get single category by ID (if accessible).
   * GET /api/v1/categories/:id
   */
  getCategoryById: asyncHandler(async (req, res) => {
    const category = await Category.findAccessibleById(req.params.id, req.user._id);

    if (!category) {
      throw ApiError.notFound('Category not found or not accessible');
    }

    return ApiResponse.success(
      res,
      { category: category.toSafeObject() },
      'Category details retrieved successfully'
    );
  }),

  /**
   * Create a new custom category for the authenticated user.
   * POST /api/v1/categories
   */
  createCategory: asyncHandler(async (req, res) => {
    const { name, type = 'expense', icon, color, description } = req.body;

    const isTaken = await Category.isNameTaken(name, type, req.user._id);
    if (isTaken) {
      throw ApiError.conflict(`A ${type} category named '${name}' already exists for your account or as a system category.`);
    }

    const category = await Category.create({
      name,
      type,
      icon,
      color,
      description,
      isPredefined: false,
      user: req.user._id
    });

    return ApiResponse.created(
      res,
      { category: category.toSafeObject() },
      'Custom category created successfully'
    );
  }),

  /**
   * Update a custom category.
   * PATCH /api/v1/categories/:id
   */
  updateCategory: asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    if (!category.canModify(req.user._id)) {
      throw ApiError.forbidden('You cannot modify predefined system categories or categories owned by other users.');
    }

    const { name, icon, color, description, isActive } = req.body;

    if (name && name !== category.name) {
      const isTaken = await Category.isNameTaken(name, category.type, req.user._id, category._id);
      if (isTaken) {
        throw ApiError.conflict(`A ${category.type} category named '${name}' already exists.`);
      }
      category.name = name;
    }

    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return ApiResponse.success(
      res,
      { category: category.toSafeObject() },
      'Category updated successfully'
    );
  }),

  /**
   * Delete a custom category.
   * DELETE /api/v1/categories/:id
   */
  deleteCategory: asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    if (!category.canModify(req.user._id)) {
      throw ApiError.forbidden('You cannot delete predefined system categories or categories owned by other users.');
    }

    await Category.deleteOne({ _id: category._id });

    return ApiResponse.success(
      res,
      null,
      'Custom category deleted successfully'
    );
  })
};

module.exports = categoryController;
