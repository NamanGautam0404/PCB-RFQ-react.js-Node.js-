// test-mongodb.js
require('dotenv').config();

console.log('=== MongoDB Connection Test ===');
console.log('MongoDB URI (first 50 chars):', process.env.MONGODB_URI?.substring(0, 50) + '...');

const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Modern mongoose connection (no deprecated options)
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed.');
    
  } catch (error) {
    console.log('❌ MongoDB Connection Failed:');
    console.log('Error:', error.message);
    
    // Check specific errors
    if (error.message.includes('Authentication failed')) {
      console.log('\n🔑 Authentication Issues:');
      console.log('1. Check username/password');
      console.log('2. Check if user has correct permissions');
      console.log('3. Check IP whitelist in MongoDB Atlas');
    } else if (error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Network Issues:');
      console.log('1. Check internet connection');
      console.log('2. Check if MongoDB Atlas cluster is running');
    } else if (error.message.includes('SCRAM')) {
      console.log('\n🔐 SCRAM Authentication Error:');
      console.log('1. Password may contain special characters');
      console.log('2. Try URL encoding the password');
    }
  }
}

testConnection();

