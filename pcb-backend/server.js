const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./src/config/database');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const rfqRoutes = require('./src/routes/rfqRoutes');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration for frontend
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'], // React/Vite default ports
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'PCB RFQ Tracker API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rfqs', rfqRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to PCB RFQ Tracker API',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        getMe: 'GET /api/auth/me'
      },
      rfqs: {
        getAll: 'GET /api/rfqs',
        getOne: 'GET /api/rfqs/:id',
        create: 'POST /api/rfqs',
        update: 'PUT /api/rfqs/:id',
        delete: 'DELETE /api/rfqs/:id',
        updateSupplierQuote: 'PUT /api/rfqs/:id/supplier-quote',
        updateMargin: 'PUT /api/rfqs/:id/margin',
        updateStage: 'PUT /api/rfqs/:id/stage',
        sendToCustomer: 'POST /api/rfqs/:id/send-to-customer',
        addCommunication: 'POST /api/rfqs/:id/communication',
        addNote: 'POST /api/rfqs/:id/note',
        markComplete: 'PUT /api/rfqs/:id/complete'
      }
    }
  });
});

// 404 handler - Express 5 compatible
app.use('/{*splat}', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}`);
  console.log(`🔗 Frontend URL: http://localhost:3000`);
});