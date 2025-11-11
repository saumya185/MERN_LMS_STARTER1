// Vercel serverless wrapper for the existing Express routes
// This file allows deploying the backend as serverless functions on Vercel.

const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import existing route modules from your backend src
const authRoutes = require('../src/routes/auth');
const courseRoutes = require('../src/routes/courses');
const userRoutes = require('../src/routes/users');
const notificationRoutes = require('../src/routes/notifications');
const reviewRoutes = require('../src/routes/reviews');
const paymentRoutes = require('../src/routes/payments');
const adminRoutes = require('../src/routes/admin');
const uploadRoutes = require('../src/routes/upload');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// NOTE: socket.io is not supported in Vercel serverless functions (no persistent sockets).
// If your app relies on sockets, you'll need a separate socket server (e.g., on Render or Heroku).

// Mount routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LMS Backend (serverless) is running' });
});

// Reuse mongoose connection across warm invocations (reduce cold starts)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_dev';
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  if (!MONGO_URI) {
    console.warn('MONGO_URI not set; skipping DB connection');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('✅ MongoDB connected (serverless)');
  } catch (err) {
    console.error('MongoDB connection error (serverless):', err);
    // Do not throw; serverless functions should still respond for non-DB endpoints
  }
}

// Start DB connection outside handler so it begins during cold start
connectDB();

module.exports = serverless(app);
