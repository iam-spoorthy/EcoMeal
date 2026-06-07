/**
 * Centralized error handling middleware.
 * Backend application crash avakunda, dynamic errors trap chesi clean response return chestundi.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error stack for debugging
  console.error(`[Error Handler]: ${err.stack || err.message}`);

  // MongoDB bad ObjectId error (CastError)
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: `Resource not found with id of ${err.value}`,
    });
  }

  // MongoDB duplicate key error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate field value entered: '${field}'. Value must be unique.`,
    });
  }

  // MongoDB validation validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${messages.join(', ')}`,
    });
  }

  // Default Express Internal Server Error
  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
