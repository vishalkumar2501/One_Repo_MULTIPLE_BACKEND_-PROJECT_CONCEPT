const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  assignRole
} = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');

// ── Public Routes ──────────────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);

// ── Protected Routes (any authenticated user) ──────────────────────────
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

// ── Admin-Only Routes ──────────────────────────────────────────────────
router.patch('/users/:userId/role', authenticate, authorize('admin'), assignRole);

module.exports = router;
