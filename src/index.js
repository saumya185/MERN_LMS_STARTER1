require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const reviewRoutes = require('./routes/reviews');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple socket.io usage: broadcast notifications
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('join', (room) => {
    socket.join(room);
  });
  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LMS Backend is running' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_dev';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true, 
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully');
  server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('⚠️  Starting server without database connection');
  server.listen(PORT, () => console.log(`⚠️  Server running on http://localhost:${PORT} (No DB)`));
});
