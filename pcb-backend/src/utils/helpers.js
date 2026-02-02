const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Format currency (matches frontend formatCurrency)
const formatCurrency = (amount) => {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Calculate final price (matches frontend calculateFinalPrice)
const calculateFinalPrice = (supplierPrice, margin, quantity) => {
  const price = parseFloat(String(supplierPrice).replace(/[^0-9.]/g, ''));
  if (isNaN(price) || isNaN(quantity) || quantity <= 0) {
    return { perPcs: null, total: null };
  }
  
  const perPcs = (price * (1 + margin / 100)).toFixed(2);
  const total = (perPcs * quantity).toFixed(2);
  return { 
    perPcs: parseFloat(perPcs), 
    total: parseFloat(total) 
  };
};

// Create log entry (matches frontend createLog)
const createLog = (user, action, details, rfq = null) => {
  return {
    timestamp: new Date().toISOString(),
    user: user.name || user.email,
    action,
    details,
    customerName: rfq?.customerName,
    partNumber: rfq?.partNumber
  };
};

// Format time (matches frontend formatTime)
const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Generate random password
const generatePassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Validate email
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

module.exports = {
  generateToken,
  formatCurrency,
  calculateFinalPrice,
  createLog,
  formatTime,
  generatePassword,
  validateEmail
};