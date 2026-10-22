const User = require('../models/user.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  assignRoleSchema
} = require('../validations/auth.validation');

// ── Register ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Create a new user account.
 */
const register = asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw ApiError.badRequest('Validation failed', error.details.map((d) => d.message));
  }

  const emailTaken = await User.isEmailTaken(value.email);
  if (emailTaken) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    name: value.name,
    email: value.email,
    password: value.password,
    bio: value.bio || '',
    avatar: value.avatar || ''
  });

  const token = user.generateAuthToken();
  const safeUser = user.toSafeObject();

  ApiResponse.created(res, { user: safeUser, token }, 'Account registered successfully');
});

// ── Login ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Authenticate existing user and issue a JWT.
 */
const login = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw ApiError.badRequest('Validation failed', error.details.map((d) => d.message));
  }

  const user = await User.findByEmail(value.email).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.accountStatus !== 'active') {
    throw ApiError.forbidden('Your account has been suspended or deactivated. Contact support.');
  }

  const isMatch = await user.comparePassword(value.password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });

  const token = user.generateAuthToken();
  const safeUser = user.toSafeObject();

  ApiResponse.ok(res, { user: safeUser, token }, 'Login successful');
});

// ── Get Current User ────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 * Return the authenticated user's profile.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  ApiResponse.ok(res, { user: user.toSafeObject() }, 'Profile retrieved');
});

// ── Update Profile ──────────────────────────────────────────────────────

/**
 * PATCH /api/v1/auth/profile
 * Update authenticated user's profile fields.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw ApiError.badRequest('Validation failed', error.details.map((d) => d.message));
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Apply permitted field updates
  if (value.name !== undefined) user.name = value.name;
  if (value.bio !== undefined) user.bio = value.bio;
  if (value.avatar !== undefined) user.avatar = value.avatar;
  if (value.socialLinks) {
    user.socialLinks = { ...user.socialLinks.toObject?.() || user.socialLinks, ...value.socialLinks };
  }

  await user.save({ validateModifiedOnly: true });

  ApiResponse.ok(res, { user: user.toSafeObject() }, 'Profile updated successfully');
});

// ── Change Password ─────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/change-password
 * Change the authenticated user's password after verifying the current one.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { error, value } = changePasswordSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw ApiError.badRequest('Validation failed', error.details.map((d) => d.message));
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isMatch = await user.comparePassword(value.currentPassword);
  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.password = value.newPassword;
  await user.save();

  const token = user.generateAuthToken();

  ApiResponse.ok(res, { token }, 'Password changed successfully');
});

// ── Admin: Assign Role ──────────────────────────────────────────────────

/**
 * PATCH /api/v1/auth/users/:userId/role
 * Admin-only endpoint to change a user's role.
 */
const assignRole = asyncHandler(async (req, res) => {
  const { error, value } = assignRoleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw ApiError.badRequest('Validation failed', error.details.map((d) => d.message));
  }

  const targetUser = await User.findById(req.params.userId);
  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  // Prevent admin from changing their own role
  if (targetUser._id.toString() === req.user.id) {
    throw ApiError.badRequest('You cannot change your own role');
  }

  targetUser.role = value.role;
  await targetUser.save({ validateModifiedOnly: true });

  ApiResponse.ok(res, { user: targetUser.toSafeObject() }, `Role updated to "${value.role}" successfully`);
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  assignRole
};
