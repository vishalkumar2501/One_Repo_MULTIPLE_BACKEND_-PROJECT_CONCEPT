const User = require('../models/user.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

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
  })
};

module.exports = authController;
