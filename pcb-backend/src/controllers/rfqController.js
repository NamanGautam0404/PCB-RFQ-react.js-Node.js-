const RFQ = require('../models/RFQ');
const { calculateFinalPrice, createLog, formatTime } = require('../utils/helpers');

// @desc    Get all RFQs for current user (matches frontend filtering)
// @route   GET /api/rfqs
// @access  Private
const getAllRFQs = async (req, res) => {
  try {
    const { search, status, urgency, confidence } = req.query;
    const userId = req.user._id;

    // Build query - sales can only see their own RFQs
    let query = { salesPerson: userId };

    // Apply filters
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { partNumber: { $regex: search, $options: 'i' } },
        { rfqId: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (urgency && urgency !== 'all') {
      query.urgency = urgency;
    }

    if (confidence && confidence !== 'all') {
      if (confidence === 'high') {
        query.confidence = { $gte: 70 };
      } else if (confidence === 'medium') {
        query.confidence = { $gte: 30, $lt: 70 };
      } else if (confidence === 'low') {
        query.confidence = { $lt: 30 };
      }
    }

    // Get RFQs
    const rfqs = await RFQ.find(query)
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance

    // Calculate stats (matches frontend stats calculation)
    const userRFQs = rfqs;
    const stats = {
      total: userRFQs.length,
      new: userRFQs.filter(r => r.status === 'new').length,
      awaiting: userRFQs.filter(r => r.status === 'awaiting_supplier').length,
      completed: userRFQs.filter(r => r.status === 'completed').length,
      active: userRFQs.filter(r => !['completed', 'cancelled'].includes(r.status)).length
    };

    // Format response to match frontend expected structure
    const formattedRFQs = rfqs.map(rfq => {
      const price = calculateFinalPrice(rfq.supplierQuote || 0, rfq.margin, rfq.quantity);
      
      return {
        ...rfq,
        // Add calculated price for frontend
        calculatedPrice: price,
        // Format dates for frontend
        formattedDate: formatTime(rfq.dateReceived),
        // Add activity count
        activityCount: rfq.activityLog?.length || 0,
        communicationCount: rfq.communications?.length || 0
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        rfqs: formattedRFQs,
        stats,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Get single RFQ
// @route   GET /api/rfqs/:id
// @access  Private
const getRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id).lean();
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check if user owns this RFQ
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this RFQ'
      });
    }

    // Calculate price
    const price = calculateFinalPrice(rfq.supplierQuote || 0, rfq.margin, rfq.quantity);

    // Add activity log entry
    const logEntry = createLog({ name: req.user.name }, 'RFQ Viewed', `Viewed RFQ ${rfq.rfqId}`, rfq);
    await RFQ.findByIdAndUpdate(req.params.id, {
      $push: { activityLog: logEntry }
    });

    res.status(200).json({
      status: 'success',
      data: {
        rfq: {
          ...rfq,
          calculatedPrice: price
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Create new RFQ (matches frontend new RFQ form)
// @route   POST /api/rfqs
// @access  Private
const createRFQ = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      partNumber,
      pcbSpecs,
      quantity,
      margin,
      notes,
      urgency,
      confidence
    } = req.body;

    // Create RFQ
    const rfq = await RFQ.create({
      customerName,
      customerEmail,
      partNumber,
      pcbSpecs: pcbSpecs || '',
      quantity: parseInt(quantity),
      margin: margin || 15,
      notes: notes || '',
      urgency: urgency || 'medium',
      confidence: confidence || 50,
      salesPerson: req.user._id,
      status: 'new',
      stage: 'rfq_received',
      activityLog: [createLog({ name: req.user.name }, 'RFQ Created', `New RFQ from ${customerName}`, { customerName, partNumber })]
    });

    res.status(201).json({
      status: 'success',
      data: {
        rfq
      },
      message: 'RFQ created successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Update RFQ
// @route   PUT /api/rfqs/:id
// @access  Private
const updateRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    // Update fields
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (key !== 'salesPerson' && key !== 'rfqId') {
        rfq[key] = updates[key];
      }
    });

    // Add activity log
    const logEntry = createLog({ name: req.user.name }, 'RFQ Updated', 'RFQ details updated', rfq);
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq
      },
      message: 'RFQ updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Delete RFQ
// @route   DELETE /api/rfqs/:id
// @access  Private
const deleteRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this RFQ'
      });
    }

    await rfq.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'RFQ deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Update supplier quote (matches frontend price management)
// @route   PUT /api/rfqs/:id/supplier-quote
// @access  Private
const updateSupplierQuote = async (req, res) => {
  try {
    const { quote, notes } = req.body;
    
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    // Update supplier quote
    rfq.supplierQuote = parseFloat(quote);
    rfq.status = 'quote_received';
    
    // Calculate customer quote
    const price = calculateFinalPrice(quote, rfq.margin, rfq.quantity);
    rfq.customerQuote = {
      perPcs: price.perPcs,
      total: price.total
    };

    // Add supplier notes if provided
    if (notes) {
      const supplierNote = {
        timestamp: new Date(),
        type: 'supplier',
        message: notes,
        user: req.user.name
      };
      rfq.supplierNotesList = rfq.supplierNotesList || [];
      rfq.supplierNotesList.push(supplierNote);
    }

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Supplier Quote',
      `Received supplier quote: ₹${quote}`,
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq,
        calculatedPrice: price
      },
      message: 'Supplier quote updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Update margin (matches frontend margin update)
// @route   PUT /api/rfqs/:id/margin
// @access  Private
const updateMargin = async (req, res) => {
  try {
    const { margin } = req.body;
    
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    const oldMargin = rfq.margin;
    rfq.margin = parseFloat(margin);

    // Recalculate customer quote if supplier quote exists
    if (rfq.supplierQuote) {
      const price = calculateFinalPrice(rfq.supplierQuote, rfq.margin, rfq.quantity);
      rfq.customerQuote = {
        perPcs: price.perPcs,
        total: price.total
      };
    }

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Margin Updated',
      `Changed from ${oldMargin}% to ${margin}%`,
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq,
        calculatedPrice: rfq.customerQuote
      },
      message: 'Margin updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Update stage (matches frontend stage update)
// @route   PUT /api/rfqs/:id/stage
// @access  Private
const updateStage = async (req, res) => {
  try {
    const { stage } = req.body;
    
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    const oldStage = rfq.stage;
    rfq.stage = stage;

    // Update status based on stage if needed
    if (stage === 'delivered') {
      rfq.status = 'completed';
    }

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Stage Updated',
      `Changed from ${oldStage} to ${stage}`,
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq
      },
      message: 'Stage updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Send quote to customer (matches frontend send to customer)
// @route   POST /api/rfqs/:id/send-to-customer
// @access  Private
const sendToCustomer = async (req, res) => {
  try {
    const { message } = req.body;
    
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    // Check if supplier quote exists
    if (!rfq.supplierQuote) {
      return res.status(400).json({
        status: 'error',
        message: 'Supplier quote is required before sending to customer'
      });
    }

    // Update status
    rfq.status = 'sent_to_customer';
    rfq.customerQuote = {
      ...rfq.customerQuote,
      sent: true,
      sentDate: new Date()
    };

    // Add communication
    const communication = {
      timestamp: new Date(),
      type: 'email',
      message: `Quote sent to customer: ${message || 'No additional message'}`,
      direction: 'outgoing',
      user: req.user.name
    };
    rfq.communications.push(communication);

    // Add customer note if message provided
    if (message) {
      const customerNote = {
        timestamp: new Date(),
        type: 'customer',
        message: `Quote sent with message: ${message}`,
        user: req.user.name
      };
      rfq.customerNotes = rfq.customerNotes || [];
      rfq.customerNotes.push(customerNote);
    }

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Sent to Customer',
      'Quote sent to customer',
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq
      },
      message: 'Quote sent to customer successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Add communication (matches frontend quick communication)
// @route   POST /api/rfqs/:id/communication
// @access  Private
const addCommunication = async (req, res) => {
  try {
    const { type, message, direction = 'outgoing' } = req.body;
    
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    // Create communication
    const communication = {
      timestamp: new Date(),
      type,
      message,
      direction,
      user: req.user.name
    };

    // Add to RFQ
    rfq.communications.push(communication);

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Communication Added',
      `${direction} ${type}: ${message.substring(0, 50)}...`,
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq,
        communication
      },
      message: 'Communication added successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Add note (matches frontend note adding)
// @route   POST /api/rfqs/:id/note
// @access  Private
const addNote = async (req, res) => {
  try {
    const { type, message } = req.body;
    
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    // Create note
    const note = {
      timestamp: new Date(),
      type,
      message,
      user: req.user.name
    };

    // Add to appropriate array based on type
    if (type === 'internal') {
      rfq.internalNotes = rfq.internalNotes || [];
      rfq.internalNotes.push(note);
    } else if (type === 'customer') {
      rfq.customerNotes = rfq.customerNotes || [];
      rfq.customerNotes.push(note);
    } else if (type === 'supplier') {
      rfq.supplierNotesList = rfq.supplierNotesList || [];
      rfq.supplierNotesList.push(note);
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid note type. Must be internal, customer, or supplier'
      });
    }

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Note Added',
      `${type} note: ${message.substring(0, 50)}...`,
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq,
        note
      },
      message: `${type} note added successfully`
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Mark RFQ as complete
// @route   PUT /api/rfqs/:id/complete
// @access  Private
const markComplete = async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    // Update status and stage
    rfq.status = 'completed';
    rfq.stage = 'delivered';
    rfq.actualDeliveryDate = new Date();

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Completed',
      'RFQ marked as completed',
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq
      },
      message: 'RFQ marked as completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Update urgency
// @route   PUT /api/rfqs/:id/urgency
// @access  Private
const updateUrgency = async (req, res) => {
  try {
    const { urgency } = req.body;
    
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    const oldUrgency = rfq.urgency;
    rfq.urgency = urgency;

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Urgency Updated',
      `Changed from ${oldUrgency} to ${urgency}`,
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq
      },
      message: 'Urgency updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Update confidence score
// @route   PUT /api/rfqs/:id/confidence
// @access  Private
const updateConfidence = async (req, res) => {
  try {
    const { confidence } = req.body;
    
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this RFQ'
      });
    }

    const oldConfidence = rfq.confidence;
    rfq.confidence = parseInt(confidence);

    // Add activity log
    const logEntry = createLog(
      { name: req.user.name },
      'Confidence Updated',
      `Changed from ${oldConfidence}% to ${confidence}%`,
      rfq
    );
    rfq.activityLog.push(logEntry);

    await rfq.save();

    res.status(200).json({
      status: 'success',
      data: {
        rfq
      },
      message: 'Confidence score updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Get RFQ activity log
// @route   GET /api/rfqs/:id/activity
// @access  Private
const getRFQActivity = async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id).select('activityLog rfqId customerName partNumber');
    
    if (!rfq) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Check ownership
    if (rfq.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this RFQ'
      });
    }

    // Format activity log with formatted timestamps
    const formattedActivity = rfq.activityLog.map(log => ({
      ...log,
      formattedTimestamp: formatTime(log.timestamp)
    }));

    res.status(200).json({
      status: 'success',
      data: {
        activityLog: formattedActivity,
        rfqId: rfq.rfqId,
        customerName: rfq.customerName,
        partNumber: rfq.partNumber
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Get RFQ statistics
// @route   GET /api/rfqs/stats
// @access  Private
const getRFQStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all RFQs for the user
    const rfqs = await RFQ.find({ salesPerson: userId }).lean();

    // Calculate comprehensive stats
    const stats = {
      // Basic counts
      total: rfqs.length,
      new: rfqs.filter(r => r.status === 'new').length,
      awaiting_supplier: rfqs.filter(r => r.status === 'awaiting_supplier').length,
      quote_received: rfqs.filter(r => r.status === 'quote_received').length,
      sent_to_customer: rfqs.filter(r => r.status === 'sent_to_customer').length,
      completed: rfqs.filter(r => r.status === 'completed').length,
      cancelled: rfqs.filter(r => r.status === 'cancelled').length,
      
      // Urgency distribution
      low_urgency: rfqs.filter(r => r.urgency === 'low').length,
      medium_urgency: rfqs.filter(r => r.urgency === 'medium').length,
      high_urgency: rfqs.filter(r => r.urgency === 'high').length,
      urgent: rfqs.filter(r => r.urgency === 'urgent').length,
      
      // Confidence distribution
      low_confidence: rfqs.filter(r => r.confidence < 30).length,
      medium_confidence: rfqs.filter(r => r.confidence >= 30 && r.confidence < 70).length,
      high_confidence: rfqs.filter(r => r.confidence >= 70).length,
      
      // Stage distribution
      stages: {
        rfq_received: rfqs.filter(r => r.stage === 'rfq_received').length,
        quote_submitted: rfqs.filter(r => r.stage === 'quote_submitted').length,
        price_accepted: rfqs.filter(r => r.stage === 'price_accepted').length,
        waiting_for_po: rfqs.filter(r => r.stage === 'waiting_for_po').length,
        po_received: rfqs.filter(r => r.stage === 'po_received').length,
        in_production: rfqs.filter(r => r.stage === 'in_production').length,
        shipped: rfqs.filter(r => r.stage === 'shipped').length,
        delivered: rfqs.filter(r => r.stage === 'delivered').length
      },
      
      // Revenue calculations
      total_potential_revenue: rfqs
        .filter(r => r.customerQuote?.total)
        .reduce((sum, r) => sum + (r.customerQuote.total || 0), 0),
      
      total_completed_revenue: rfqs
        .filter(r => r.status === 'completed' && r.customerQuote?.total)
        .reduce((sum, r) => sum + (r.customerQuote.total || 0), 0),
      
      // Average values
      avg_quantity: rfqs.length > 0 
        ? rfqs.reduce((sum, r) => sum + (r.quantity || 0), 0) / rfqs.length 
        : 0,
      avg_margin: rfqs.length > 0 
        ? rfqs.reduce((sum, r) => sum + (r.margin || 0), 0) / rfqs.length 
        : 0,
      avg_confidence: rfqs.length > 0 
        ? rfqs.reduce((sum, r) => sum + (r.confidence || 0), 0) / rfqs.length 
        : 0
    };

    // Add calculated active RFQs
    stats.active = stats.total - stats.completed - stats.cancelled;

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Get RFQs by stage
// @route   GET /api/rfqs/stage/:stage
// @access  Private
const getRFQsByStage = async (req, res) => {
  try {
    const { stage } = req.params;
    const userId = req.user._id;

    const rfqs = await RFQ.find({ 
      salesPerson: userId,
      stage: stage 
    })
    .sort({ updatedAt: -1 })
    .lean();

    // Format RFQs with calculated prices
    const formattedRFQs = rfqs.map(rfq => {
      const price = calculateFinalPrice(rfq.supplierQuote || 0, rfq.margin, rfq.quantity);
      
      return {
        ...rfq,
        calculatedPrice: price,
        formattedDate: formatTime(rfq.dateReceived)
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        rfqs: formattedRFQs,
        stage,
        count: rfqs.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Search RFQs with advanced filters
// @route   GET /api/rfqs/search/advanced
// @access  Private
const advancedSearch = async (req, res) => {
  try {
    const {
      customerName,
      partNumber,
      dateFrom,
      dateTo,
      minQuantity,
      maxQuantity,
      minMargin,
      maxMargin,
      minConfidence,
      maxConfidence,
      status,
      urgency,
      stage,
      hasSupplierQuote,
      hasCustomerQuote,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user._id;
    let query = { salesPerson: userId };

    // Apply filters
    if (customerName) {
      query.customerName = { $regex: customerName, $options: 'i' };
    }

    if (partNumber) {
      query.partNumber = { $regex: partNumber, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (minQuantity || maxQuantity) {
      query.quantity = {};
      if (minQuantity) query.quantity.$gte = parseInt(minQuantity);
      if (maxQuantity) query.quantity.$lte = parseInt(maxQuantity);
    }

    if (minMargin || maxMargin) {
      query.margin = {};
      if (minMargin) query.margin.$gte = parseFloat(minMargin);
      if (maxMargin) query.margin.$lte = parseFloat(maxMargin);
    }

    if (minConfidence || maxConfidence) {
      query.confidence = {};
      if (minConfidence) query.confidence.$gte = parseInt(minConfidence);
      if (maxConfidence) query.confidence.$lte = parseInt(maxConfidence);
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (urgency && urgency !== 'all') {
      query.urgency = urgency;
    }

    if (stage && stage !== 'all') {
      query.stage = stage;
    }

    if (hasSupplierQuote === 'true') {
      query.supplierQuote = { $exists: true, $ne: null };
    } else if (hasSupplierQuote === 'false') {
      query.supplierQuote = { $exists: false };
    }

    if (hasCustomerQuote === 'true') {
      query['customerQuote.total'] = { $exists: true, $ne: null };
    } else if (hasCustomerQuote === 'false') {
      query['customerQuote.total'] = { $exists: false };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const rfqs = await RFQ.find(query)
      .sort(sortOptions)
      .lean();

    // Format response
    const formattedRFQs = rfqs.map(rfq => {
      const price = calculateFinalPrice(rfq.supplierQuote || 0, rfq.margin, rfq.quantity);
      
      return {
        ...rfq,
        calculatedPrice: price,
        formattedDate: formatTime(rfq.dateReceived)
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        rfqs: formattedRFQs,
        total: rfqs.length,
        filters: {
          customerName,
          partNumber,
          dateFrom,
          dateTo,
          minQuantity,
          maxQuantity,
          minMargin,
          maxMargin,
          minConfidence,
          maxConfidence,
          status,
          urgency,
          stage,
          hasSupplierQuote,
          hasCustomerQuote
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Export all controller functions
module.exports = {
  getAllRFQs,
  getRFQ,
  createRFQ,
  updateRFQ,
  deleteRFQ,
  updateSupplierQuote,
  updateMargin,
  updateStage,
  sendToCustomer,
  addCommunication,
  addNote,
  markComplete,
  updateUrgency,
  updateConfidence,
  getRFQActivity,
  getRFQStats,
  getRFQsByStage,
  advancedSearch
};