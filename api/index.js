// Vercel serverless wrapper for the existing Express routes
// This file allows deploying the backend as serverless functions on Vercel.

require('dotenv').config();
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (must come before DB connection)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'LMS Backend (serverless) is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'LMS API is running',
    health: '/api/health'
  });
});

// Reuse mongoose connection across warm invocations (reduce cold starts)
const MONGO_URI = process.env.MONGO_URI;
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  
  if (!MONGO_URI) {
    console.warn('⚠️ MONGO_URI not set; skipping DB connection');
    return;
  }
  
  try {
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    console.log('✅ MongoDB connected (serverless)');
  } catch (err) {
    console.error('❌ MongoDB connection error (serverless):', err.message);
    isConnected = false;
    // Do not throw; serverless functions should still respond for non-DB endpoints
  }
}

// Initialize DB connection
connectDB();

// Import and mount routes (with error handling)
try {
  const authRoutes = require('../src/routes/auth');
  const courseRoutes = require('../src/routes/courses');
  const userRoutes = require('../src/routes/users');
  const notificationRoutes = require('../src/routes/notifications');
  const reviewRoutes = require('../src/routes/reviews');
  const paymentRoutes = require('../src/routes/payments');
  const adminRoutes = require('../src/routes/admin');
  const uploadRoutes = require('../src/routes/upload');

  // Mount routes under /api
  app.use('/api/auth', authRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);
  
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error('Stack:', error.stack);
  
  // Add error route
  app.use('/api/*', (req, res) => {
    res.status(500).json({ 
      error: 'Routes initialization failed',
      message: error.message,
      hint: 'Check environment variables and dependencies'
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.path,
    method: req.method
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    availableRoutes: ['/api/health', '/api/auth', '/api/courses', '/api/users']
  });
});

module.exports = serverless(app);
