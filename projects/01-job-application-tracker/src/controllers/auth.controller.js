const User = require('../models/user.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/env');

/**
 * Controller handling authentication operations.
 */
const authController = {
  /**
   * Register a new user account.
   *
   * @route POST /api/v1/auth/register
   * @access Public
   */
  register: asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Check if user with provided email already exists
    const isEmailTaken = await User.isEmailTaken(email);
    if (isEmailTaken) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // Create user document in database (password hashed automatically by pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      ...(role && { role })
    });

    return ApiResponse.created(
      res,
      {
        user: user.toSafeObject()
      },
      'User registered successfully'
    );
  }),

  /**
   * Authenticate user with credentials and return signed JWT token.
   *
   * @route POST /api/v1/auth/login
   * @access Public
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by normalized email and explicitly include password field (select: false by default)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Verify password against stored bcrypt hash
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check if user account is active
    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
    }

    // Generate JWT authentication token
    const token = user.generateAuthToken();

    // Update last login timestamp without re-validating the full document
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return ApiResponse.ok(
      res,
      {
        user: user.toSafeObject(),
        token,
        tokenType: 'Bearer',
        expiresIn: config.jwt.expiresIn
      },
      'User logged in successfully'
    );
  })
};

module.exports = authController;

