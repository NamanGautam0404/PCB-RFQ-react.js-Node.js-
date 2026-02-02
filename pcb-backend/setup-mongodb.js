#!/usr/bin/env node

/**
 * MongoDB Connection Setup Script
 * This script helps you set up and test your MongoDB connection
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        MongoDB Connection Setup for PCB Backend            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask question and get input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to create .env file
async function createEnvFile(mongoUri, jwtSecret) {
  const envContent = `# PCB Backend - Environment Configuration

# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=${mongoUri}

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRE=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
`;

  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent);
  console.log(`\n✅ .env file created at: ${envPath}`);
}

// Function to test connection
async function testConnection(mongoUri) {
  try {
    console.log('\n🔄 Testing MongoDB connection...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📦 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🖥️  Host: ${mongoose.connection.host}`);
    
    await mongoose.connection.close();
    console.log('Connection closed.');
    
    return true;
  } catch (error) {
    console.log('❌ MongoDB Connection Failed:');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('Authentication failed')) {
      console.log('\n🔑 Authentication Issues:');
      console.log('1. Check your username and password');
      console.log('2. Verify user has correct permissions');
      console.log('3. Check IP whitelist in MongoDB Atlas');
    } else if (error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Network Issues:');
      console.log('1. Check your internet connection');
      console.log('2. Verify MongoDB Atlas cluster is running');
    }
    
    return false;
  }
}

// Main function
async function main() {
  try {
    // Check if .env already exists
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const existingEnv = fs.readFileSync(envPath, 'utf8');
      if (existingEnv.includes('MONGODB_URI=')) {
        const mongoUri = existingEnv.match(/MONGODB_URI=(.+)/)?.[1]?.trim();
        if (mongoUri && !mongoUri.includes('YOUR_PASSWORD_HERE')) {
          console.log('📄 Existing .env file found with MongoDB URI');
          const testAgain = await askQuestion('Do you want to test the existing connection? (y/n): ');
          
          if (testAgain.toLowerCase() === 'y') {
            const success = await testConnection(mongoUri);
            if (success) {
              console.log('\n✅ Your MongoDB connection is working!');
            } else {
              console.log('\n❌ Please update your .env file with correct MongoDB URI');
            }
          }
          rl.close();
          return;
        }
      }
    }
    
    console.log('Let\'s set up your MongoDB connection...\n');
    
    // Get MongoDB URI
    let mongoUri = await askQuestion('Enter your MongoDB URI (e.g., mongodb+srv://user:pass@cluster.mongodb.net/dbname): ');
    
    if (!mongoUri.trim()) {
      console.log('❌ MongoDB URI is required');
      rl.close();
      return;
    }
    
    // Get JWT Secret
    const jwtSecret = await askQuestion('Enter your JWT Secret (press Enter for auto-generated): ');
    
    // Test connection
    const success = await testConnection(mongoUri);
    
    if (success) {
      // Create .env file
      const secret = jwtSecret.trim() || Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await createEnvFile(mongoUri, secret);
      
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║                    Setup Complete!                          ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('\nNext steps:');
      console.log('1. Start the server: npm run dev');
      console.log('2. Test the API: http://localhost:5000/api/health');
      console.log('\nIf you need to modify the .env file, edit it directly.');
    } else {
      console.log('\n❌ Please fix the MongoDB connection issues and try again.');
      console.log('You can manually create the .env file in pcb-backend directory.');
    }
    
    rl.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

main();

