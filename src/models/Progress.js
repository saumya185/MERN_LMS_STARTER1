const mongoose = require('mongoose');

const LectureProgressSchema = new mongoose.Schema({
  lectureId: { type: mongoose.Schema.Types.ObjectId, required: true },
  completed: { type: Boolean, default: false },
  watchedDuration: { type: Number, default: 0 }, // in seconds
  lastWatchedAt: { type: Date },
  quizScore: { type: Number }
}, { _id: false });

const ProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lectureProgress: [LectureProgressSchema],
  overallProgress: { type: Number, default: 0, min: 0, max: 100 },
  completedLectures: { type: Number, default: 0 },
  totalLectures: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
  certificateIssued: { type: Boolean, default: false },
  lastAccessedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure one progress record per user per course
ProgressSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
