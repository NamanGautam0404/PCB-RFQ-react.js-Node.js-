const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['email', 'phone', 'meeting', 'note'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    default: 'outgoing'
  },
  user: {
    type: String,
    required: true
  }
});

const activityLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  user: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  customerName: String,
  partNumber: String
});

const rfqSchema = new mongoose.Schema({
  // Basic Information (from frontend new RFQ form)
  customerName: {
    type: String,
    required: [true, 'Customer name is required']
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    lowercase: true
  },
  partNumber: {
    type: String,
    required: [true, 'Part number is required']
  },
  pcbSpecs: String,
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  margin: {
    type: Number,
    default: 15,
    min: [0, 'Margin cannot be negative']
  },
  notes: String,
  
  // Additional fields from frontend
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  confidence: {
    type: Number,
    default: 50,
    min: [0, 'Confidence cannot be less than 0'],
    max: [100, 'Confidence cannot exceed 100']
  },
  
  // Price Management (from frontend manage modal)
  supplierQuote: Number,
  customerQuote: {
    perPcs: Number,
    total: Number
  },
  
  // Status & Stage (from frontend constants)
  status: {
    type: String,
    enum: ['new', 'awaiting_supplier', 'quote_received', 'sent_to_customer', 'completed', 'cancelled'],
    default: 'new'
  },
  stage: {
    type: String,
    enum: ['rfq_received', 'quote_submitted', 'price_accepted', 'waiting_for_po', 'po_received', 'in_production', 'shipped', 'delivered'],
    default: 'rfq_received'
  },
  
  // Sales person reference
  salesPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Dates
  dateReceived: {
    type: Date,
    default: Date.now
  },
  
  // Communications & Activity (from frontend)
  communications: [communicationSchema],
  activityLog: [activityLogSchema],
  
  // Notes categorization
  internalNotes: [{
    timestamp: Date,
    type: String,
    message: String,
    user: String
  }],
  customerNotes: [{
    timestamp: Date,
    type: String,
    message: String,
    user: String
  }],
  supplierNotesList: [{
    timestamp: Date,
    type: String,
    message: String,
    user: String
  }],
  
  // RFQ ID generation
  rfqId: {
    type: String,
    unique: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate RFQ ID
rfqSchema.pre('save', async function(next) {
  if (!this.rfqId) {
    // Generate RFQ ID like RFQ-001, RFQ-002, etc.
    const lastRFQ = await this.constructor.findOne(
      {},
      {},
      { sort: { 'createdAt': -1 } }
    );
    
    let lastNumber = 0;
    if (lastRFQ && lastRFQ.rfqId) {
      const match = lastRFQ.rfqId.match(/RFQ-(\d+)/);
      if (match) {
        lastNumber = parseInt(match[1]);
      }
    }
    
    this.rfqId = `RFQ-${String(lastNumber + 1).padStart(3, '0')}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Calculate final price method (matches frontend function)
rfqSchema.methods.calculateFinalPrice = function() {
  if (!this.supplierQuote || !this.quantity || !this.margin) {
    return { perPcs: null, total: null };
  }
  
  const perPcs = this.supplierQuote * (1 + this.margin / 100);
  const total = perPcs * this.quantity;
  
  return {
    perPcs: parseFloat(perPcs.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

// Update updatedAt on any update
rfqSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const RFQ = mongoose.model('RFQ', rfqSchema);

module.exports = RFQ;