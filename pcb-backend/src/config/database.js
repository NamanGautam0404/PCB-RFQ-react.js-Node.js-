const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variables
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.log('Please create a .env file in the pcb-backend directory with MONGODB_URI');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    console.log('📡 Database:', 'Cluster0');

    // Connect to MongoDB with modern mongoose options
    const conn = await mongoose.connect(mongoURI, {
      // These options are no longer needed in newer mongoose versions
      // but kept for compatibility
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📦 Database: ${conn.connection.db.databaseName}`);
    console.log(`🖥️  Host: ${conn.connection.host}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📴 MongoDB connection closed due to app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:');
    console.error('Error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('Authentication failed')) {
      console.log('\n🔑 Authentication Issues:');
      console.log('1. Check username/password in MONGODB_URI');
      console.log('2. Check if user has correct permissions');
      console.log('3. Check IP whitelist in MongoDB Atlas');
    } else if (error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Network Issues:');
      console.log('1. Check internet connection');
      console.log('2. Check if MongoDB Atlas cluster is running');
      console.log('3. Verify cluster name in MONGODB_URI');
    } else if (error.message.includes('SCRAM')) {
      console.log('\n🔐 SCRAM Authentication Error:');
      console.log('1. Password may contain special characters that need encoding');
      console.log('2. Try URL encoding the password');
    }
    
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;

