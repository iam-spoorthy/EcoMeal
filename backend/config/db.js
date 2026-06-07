const mongoose = require('mongoose');

// MONGODB_URI constant environment parameters
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Connects to MongoDB with robust retry logic.
 * Database load failed aina server runtime crash avakunda, retry loop maintain chestundi.
 */
const connectDB = async () => {
  if (!MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI env variable is not set in .env file!');
    // Dynamic control error to prevent server crash, database states checking will throw 503
    return;
  }

  const options = {
    autoIndex: true, // Auto-build schema indices for query optimization
  };

  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log('MongoDB successfully connected and indices validated.');
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    console.log('Retrying MongoDB connection in 5 seconds...');
    
    // Server should NEVER crash: recursive call with setTimeout to try reconnecting infinitely
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
