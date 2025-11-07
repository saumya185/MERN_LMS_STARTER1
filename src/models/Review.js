const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
  helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reported: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure one review per user per course
ReviewSchema.index({ course: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
