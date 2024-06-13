const { connect } = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await connect(mongoURI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Connection to MongoDB failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
