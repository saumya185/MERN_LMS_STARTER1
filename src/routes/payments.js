const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// Create payment intent (Stripe)
router.post('/create-intent', protect, async (req, res) => {
  try {
    const { courseId } = req.body;
    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if already enrolled
    if (req.user.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }
    
    // Check if course is free
    if (course.price === 0) {
      return res.status(400).json({ message: 'This course is free' });
    }
    
    // Create payment record
    const payment = new Payment({
      user: req.user._id,
      course: courseId,
      amount: course.discountPrice || course.price,
      currency: 'usd',
      status: 'pending',
      paymentMethod: 'stripe'
    });
    
    await payment.save();
    
    // Create Stripe payment intent
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round((course.discountPrice || course.price) * 100), // Amount in cents
        currency: 'usd',
        metadata: {
          paymentId: payment._id.toString(),
          courseId: courseId,
          userId: req.user._id.toString()
        }
      });
      
      payment.stripePaymentIntentId = paymentIntent.id;
      await payment.save();
      
      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentId: payment._id
      });
    } catch (stripeError) {
      // If Stripe fails (like with dummy key), return dummy response
      console.log('Stripe error (using dummy mode):', stripeError.message);
      res.json({
        clientSecret: 'dummy_client_secret_' + payment._id,
        paymentId: payment._id,
        isDummy: true
      });
    }
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Confirm payment
router.post('/confirm', protect, async (req, res) => {
  try {
    const { paymentId, paymentIntentId } = req.body;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Verify payment belongs to user
    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // For dummy/test mode, auto-confirm
    if (!paymentIntentId || paymentIntentId.startsWith('dummy_')) {
      payment.status = 'completed';
      payment.transactionId = 'dummy_' + Date.now();
      await payment.save();
      
      return res.json({ 
        message: 'Payment confirmed (dummy mode)', 
        payment 
      });
    }
    
    // Verify with Stripe
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        payment.status = 'completed';
        payment.transactionId = paymentIntent.id;
        await payment.save();
        
        res.json({ message: 'Payment confirmed', payment });
      } else {
        payment.status = 'failed';
        await payment.save();
        res.status(400).json({ message: 'Payment not successful' });
      }
    } catch (stripeError) {
      console.log('Stripe verification error:', stripeError.message);
      // Fallback to dummy mode
      payment.status = 'completed';
      payment.transactionId = 'fallback_' + Date.now();
      await payment.save();
      
      res.json({ message: 'Payment confirmed (fallback mode)', payment });
    }
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Free course enrollment
router.post('/enroll-free', protect, async (req, res) => {
  try {
    const { courseId } = req.body;
    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    if (course.price > 0) {
      return res.status(400).json({ message: 'This course requires payment' });
    }
    
    // Check if already enrolled
    if (req.user.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }
    
    // Create free payment record
    const payment = new Payment({
      user: req.user._id,
      course: courseId,
      amount: 0,
      currency: 'usd',
      status: 'completed',
      paymentMethod: 'free',
      transactionId: 'free_' + Date.now()
    });
    
    await payment.save();
    
    res.json({ message: 'Enrolled in free course', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's payment history
router.get('/my-payments', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('course', 'title thumbnail price')
      .sort('-createdAt');
    
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('course', 'title thumbnail price')
      .populate('user', 'name email');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Verify access
    if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json({ payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mock purchase for paid courses (Demo mode)
router.post('/mock-purchase', protect, async (req, res) => {
  try {
    console.log('=== MOCK PURCHASE REQUEST ===');
    console.log('User:', req.user?.name);
    console.log('Body:', req.body);
    
    const { courseId } = req.body;
    
    const course = await Course.findById(courseId);
    if (!course) {
      console.log('Course not found:', courseId);
      return res.status(404).json({ message: 'Course not found' });
    }
    
    console.log('Course found:', course.title, 'Price:', course.price);
    
    // Check if already enrolled
    if (req.user.enrolledCourses.includes(courseId)) {
      console.log('User already enrolled');
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }
    
    // Create mock payment record
    const payment = new Payment({
      user: req.user._id,
      course: courseId,
      amount: course.price,
      currency: 'INR',
      status: 'completed',
      transactionId: 'mock_' + Date.now(),
      paymentMethod: 'mock'
    });
    
    await payment.save();
    console.log('Payment created:', payment._id);
    
    // Enroll user
    req.user.enrolledCourses.push(courseId);
    await req.user.save();
    console.log('User enrolled successfully');
    
    // Update course enrollment count
    course.enrollmentCount += 1;
    await course.save();
    console.log('Course enrollment count updated');
    
    res.json({ 
      message: 'Course purchased successfully (Mock payment)', 
      payment,
      redirectUrl: `/courses/${courseId}/learn`
    });
    
  } catch (error) {
    console.error('=== MOCK PURCHASE ERROR ===');
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Webhook for Stripe (optional)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const paymentId = paymentIntent.metadata.paymentId;
      
      await Payment.findByIdAndUpdate(paymentId, {
        status: 'completed',
        transactionId: paymentIntent.id
      });
    }
    
    res.json({ received: true });
  } catch (error) {
    console.log('Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router;
