const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_quiz_system';
    console.log(`Attempting to connect to MongoDB: ${connUri}`);

    // Set connection timeout options to fail fast if MongoDB is not running
    await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 3000, // 3 seconds timeout
    });

    console.log(`MongoDB Connected successfully: ${mongoose.connection.host}`);
  } catch (error) {
    console.warn('\x1b[33m%s\x1b[0m', 'WARNING: Failed to connect to MongoDB. Falling back to local file-based JSON database (localDb).');
    console.error(`Connection Error details: ${error.message}`);
  }
};

module.exports = connectDB;
