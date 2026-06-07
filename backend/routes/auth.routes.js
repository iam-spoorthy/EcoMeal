const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

// JWT generation helpers
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m', // Access token expires in 15 minutes
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d', // Refresh token expires in 7 days
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Staff / Manager / Admin)
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  const { name, email, password, role } = req.body;

  try {
    // Role-based email domain validation checks
    if (role === 'admin' && !email.endsWith('@admin.com')) {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts must use an email ending in @admin.com (e.g. yourname@admin.com).',
      });
    }

    if (role === 'kitchen_manager' && !email.endsWith('@manager.com')) {
      return res.status(400).json({
        success: false,
        message: 'Kitchen Manager accounts must use an email ending in @manager.com (e.g. yourname@manager.com).',
      });
    }

    // Check if email already registered
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Try logging in.',
      });
    }

    // Create new user record
    const user = await User.create({
      name,
      email,
      password,
      role, // Default is 'staff' inside model definition
    });

    // Generate response tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get tokens
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Validate request fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Retrieve user and explicitly include password field for verification
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    // Verify hashed password match
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Validate refresh token and dispense a fresh access token
 * @access  Public
 */
router.post('/refresh-token', async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required',
    });
  }

  try {
    // Validate the refresh token structure
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Verify user still exists in DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    // Dispense new access and refresh tokens (token rotation)
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error(`Refresh token error: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token. Please log in again.',
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user details
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
