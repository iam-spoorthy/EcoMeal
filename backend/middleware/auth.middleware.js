const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - checks if user is logged in via JWT
 * Request header validation controls.
 */
const protect = async (req, res, next) => {
  let token;

  // Header verify chesi Bearer token construct cheyali
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token missing in Authorization header',
    });
  }

  try {
    // Verify JWT access token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user details dynamically, excluding password
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists',
      });
    }

    // Attach user information to request object
    req.user = user;
    next();
  } catch (err) {
    console.error(`JWT validation failed: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid or expired',
    });
  }
};

/**
 * Role-based authorization restrictor.
 * Allowed roles specified parameters format control limits.
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if the authenticated user has one of the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' does not have permission to perform this action`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
