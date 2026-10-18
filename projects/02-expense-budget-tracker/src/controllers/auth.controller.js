const User = require('../models/user.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller handling user authentication and profile operations.
 */
const authController = {
  /**
   * Register a new user account.
   * POST /api/v1/auth/register
   */
  register: asyncHandler(async (req, res) => {
    const { name, email, password, currency, monthlyIncome } = req.body;

    const emailTaken = await User.isEmailTaken(email);
    if (emailTaken) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      currency,
      monthlyIncome
    });

    const token = user.generateAuthToken();

    return ApiResponse.created(
      res,
      {
        user: user.toSafeObject(),
        token
      },
      'User registered successfully'
    );
  }),

  /**
   * Log in user with credentials and issue JWT.
   * POST /api/v1/auth/login
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = user.generateAuthToken();

    return ApiResponse.success(
      res,
      {
        user: user.toSafeObject(),
        token
      },
      'User logged in successfully'
    );
  }),

  /**
   * Get current authenticated user's profile.
   * GET /api/v1/auth/me
   */
  getMe: asyncHandler(async (req, res) => {
    return ApiResponse.success(
      res,
      {
        user: req.user.toSafeObject()
      },
      'Current user profile retrieved successfully'
    );
  }),

  /**
   * Update current user's profile details.
   * PATCH /api/v1/auth/profile
   */
  updateProfile: asyncHandler(async (req, res) => {
    const { name, currency, monthlyIncome } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (currency !== undefined) user.currency = currency;
    if (monthlyIncome !== undefined) user.monthlyIncome = monthlyIncome;

    await user.save();

    return ApiResponse.success(
      res,
      {
        user: user.toSafeObject()
      },
      'Profile updated successfully'
    );
  }),

  /**
   * Change current user's password.
   * POST /api/v1/auth/change-password
   */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest('Current password provided is incorrect');
    }

    user.password = newPassword;
    await user.save();

    return ApiResponse.success(
      res,
      null,
      'Password changed successfully'
    );
  })
};

module.exports = authController;
