const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['stripe', 'razorpay', 'free', 'mock'], default: 'stripe' },
  transactionId: { type: String },
  stripePaymentIntentId: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  invoice: { type: String },
  refundReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
