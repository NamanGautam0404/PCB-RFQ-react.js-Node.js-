#!/usr/bin/env node

/**
 * Database Seed Script
 * Populates MongoDB with initial users and sample RFQs
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['sales', 'manager', 'admin'], default: 'sales' },
  avatar: { type: String },
  avatarColor: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// RFQ Schema
const rfqSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  partNumber: { type: String, required: true },
  pcbSpecs: { type: String },
  quantity: { type: Number, required: true },
  margin: { type: Number, default: 15 },
  dateReceived: { type: Date, default: Date.now },
  status: { type: String, enum: ['new', 'awaiting_supplier', 'quote_received', 'sent_to_customer', 'completed', 'cancelled'], default: 'new' },
  stage: { type: String, default: 'rfq_received' },
  salesPerson: { type: String, required: true },
  salesPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  supplierQuote: { type: Number },
  supplierNotes: { type: String },
  customerQuote: { type: Object },
  notes: { type: String },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  confidence: { type: Number, default: 50 },
  communications: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String },
    message: { type: String },
    direction: { type: String },
    user: { type: String }
  }],
  internalNotes: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String },
    message: { type: String },
    user: { type: String }
  }],
  customerNotes: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String },
    message: { type: String },
    user: { type: String }
  }],
  supplierNotesList: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String },
    message: { type: String },
    user: { type: String }
  }],
  activityLog: [{
    timestamp: { type: Date, default: Date.now },
    user: { type: String },
    action: { type: String },
    details: { type: String },
    customerName: { type: String },
    partNumber: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const RFQ = mongoose.model('RFQ', rfqSchema);

// Sample users (matching the frontend constants)
const users = [
  {
    name: 'Rampal Gautam',
    email: 'rampal@lechamp.sg',
    password: 'rampal@1105',
    role: 'manager',
    avatar: 'User',
    avatarColor: 'bg-blue-500'
  },
  {
    name: 'Naman Gautam',
    email: 'namang0409@gmail.com',
    password: 'sales123',
    role: 'sales',
    avatar: 'User',
    avatarColor: 'bg-purple-500'
  },
  {
    name: 'Admin User',
    email: 'admin@pcbtracker.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'User',
    avatarColor: 'bg-red-500'
  }
];

// Sample RFQs
const rfqs = [
  {
    customerName: 'TechCorp Industries',
    customerEmail: 'tech@example.com',
    partNumber: 'PCB-4L-001',
    pcbSpecs: '4-layer FR4, 1.6mm, HASL finish',
    quantity: 1000,
    margin: 7,
    dateReceived: new Date(),
    status: 'new',
    stage: 'rfq_received',
    salesPerson: 'Rahul Sharma',
    supplierQuote: null,
    customerQuote: null,
    notes: 'Urgent delivery required',
    urgency: 'high',
    confidence: 60,
    communications: [
      {
        timestamp: new Date(),
        type: 'email',
        message: 'Requested more details about the PCB specifications',
        direction: 'incoming',
        user: 'TechCorp Industries'
      }
    ],
    activityLog: [
      {
        timestamp: new Date(),
        user: 'System',
        action: 'RFQ Created',
        details: 'New RFQ from TechCorp Industries',
        customerName: 'TechCorp Industries',
        partNumber: 'PCB-4L-001'
      }
    ]
  },
  {
    customerName: 'ElectroWorks Ltd',
    customerEmail: 'orders@electroworks.com',
    partNumber: 'PCB-2L-045',
    pcbSpecs: '2-layer, 1.0mm, ENIG finish',
    quantity: 5000,
    margin: 5.5,
    dateReceived: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'awaiting_supplier',
    stage: 'quote_submitted',
    salesPerson: 'Priya Patel',
    supplierQuote: 2.45,
    customerQuote: { perPcs: '2.58', total: '12900.00' },
    notes: 'Bulk order for production run',
    urgency: 'medium',
    confidence: 75,
    communications: [
      {
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        type: 'email',
        message: 'Submitted quote to supplier for review',
        direction: 'outgoing',
        user: 'Priya Patel'
      }
    ],
    activityLog: [
      {
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        user: 'System',
        action: 'RFQ Created',
        details: 'New RFQ from ElectroWorks Ltd',
        customerName: 'ElectroWorks Ltd',
        partNumber: 'PCB-2L-045'
      },
      {
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        user: 'Priya Patel',
        action: 'Stage Updated',
        details: 'Stage changed to Quote Submitted',
        customerName: 'ElectroWorks Ltd',
        partNumber: 'PCB-2L-045'
      }
    ]
  },
  {
    customerName: 'Innovative Electronics',
    customerEmail: '采购@innovative-elec.cn',
    partNumber: 'PCB-HDI-006',
    pcbSpecs: '8-layer HDI, 0.8mm, Blind/Buried vias',
    quantity: 200,
    margin: 12,
    dateReceived: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'new',
    stage: 'rfq_received',
    salesPerson: 'Naman Gautam',
    supplierQuote: null,
    customerQuote: null,
    notes: 'High complexity PCB, requires special approval',
    urgency: 'urgent',
    confidence: 40,
    communications: [],
    activityLog: [
      {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        user: 'Naman Gautam',
        action: 'RFQ Created',
        details: 'New RFQ from Innovative Electronics',
        customerName: 'Innovative Electronics',
        partNumber: 'PCB-HDI-006'
      }
    ]
  },
  {
    customerName: 'Global Tech Solutions',
    customerEmail: 'sourcing@globaltech.com',
    partNumber: 'PCB-FLEX-012',
    pcbSpecs: '4-layer Flexible PCB, 0.2mm',
    quantity: 500,
    margin: 8,
    dateReceived: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: 'sent_to_customer',
    stage: 'price_accepted',
    salesPerson: 'Rampal Gautam',
    supplierQuote: 5.75,
    customerQuote: { perPcs: '6.21', total: '3105.00' },
    notes: 'Customer accepted price, waiting for PO',
    urgency: 'medium',
    confidence: 85,
    communications: [
      {
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        type: 'email',
        message: 'Quote sent: $6.21/pc',
        direction: 'outgoing',
        user: 'Rampal Gautam'
      },
      {
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        type: 'email',
        message: 'Price looks good, checking with management',
        direction: 'incoming',
        user: 'Global Tech Solutions'
      }
    ],
    activityLog: [
      {
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        user: 'Rampal Gautam',
        action: 'RFQ Created',
        details: 'New RFQ from Global Tech Solutions',
        customerName: 'Global Tech Solutions',
        partNumber: 'PCB-FLEX-012'
      },
      {
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        user: 'Rampal Gautam',
        action: 'Sent to Customer',
        details: 'Quote sent to customer',
        customerName: 'Global Tech Solutions',
        partNumber: 'PCB-FLEX-012'
      },
      {
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        user: 'Rampal Gautam',
        action: 'Stage Updated',
        details: 'Stage changed to Price Accepted',
        customerName: 'Global Tech Solutions',
        partNumber: 'PCB-FLEX-012'
      }
    ]
  }
];

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully!\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await RFQ.deleteMany({});

    // Create users with hashed passwords
    console.log('👤 Creating users...');
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return { ...user, password: hashedPassword };
      })
    );
    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Map sales person names to IDs for RFQs
    const salesPersonMap = {
      'Rahul Sharma': createdUsers[1]?._id?.toString() || createdUsers[0]?._id?.toString(),
      'Priya Patel': createdUsers[1]?._id?.toString() || createdUsers[0]?._id?.toString(),
      'Naman Gautam': createdUsers[1]?._id?.toString(),
      'Rampal Gautam': createdUsers[0]?._id?.toString()
    };

    // Update RFQs with sales person IDs
    const rfqsWithIds = rfqs.map(rfq => ({
      ...rfq,
      salesPersonId: salesPersonMap[rfq.salesPerson] || createdUsers[1]?._id
    }));

    // Create RFQs
    console.log('📦 Creating RFQs...');
    const createdRFQs = await RFQ.insertMany(rfqsWithIds);
    console.log(`✅ Created ${createdRFQs.length} RFQs`);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  Database Seeded!                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n📋 Test Credentials:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('│ Manager:  rampal@lechamp.sg / rampal@1105                 │');
    console.log('│ Sales:    namang0409@gmail.com / sales123                 │');
    console.log('│ Admin:    admin@pcbtracker.com / admin123                 │');
    console.log('─────────────────────────────────────────────────────────────');

    await mongoose.connection.close();
    console.log('\n📴 Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedDatabase();

