const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: Number, required: true },
  explanation: { type: String }
}, { _id: true });

const LectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String },
  duration: { type: Number, default: 0 }, // in seconds
  resources: [{
    name: String,
    url: String,
    type: { type: String, enum: ['pdf', 'doc', 'video', 'other'] }
  }],
  quiz: [QuizSchema],
  order: { type: Number, required: true },
  isFree: { type: Boolean, default: false }
}, { timestamps: true });

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String },
  description: { type: String, required: true },
  price: { type: Number, default: 0 },
  discountPrice: { type: Number },
  category: { type: String, required: true },
  subCategory: { type: String },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all levels'], default: 'beginner' },
  language: { type: String, default: 'English' },
  thumbnail: { type: String },
  promoVideo: { type: String },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lectures: [LectureSchema],
  status: { type: String, enum: ['draft','published','archived'], default: 'draft' },
  requirements: [{ type: String }],
  whatYouWillLearn: [{ type: String }],
  tags: [{ type: String }],
  enrollmentCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // in seconds
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, { timestamps: true });

// Calculate total duration before saving
CourseSchema.pre('save', function(next) {
  if (this.lectures && this.lectures.length > 0) {
    this.totalDuration = this.lectures.reduce((sum, lecture) => sum + (lecture.duration || 0), 0);
  }
  next();
});

module.exports = mongoose.model('Course', CourseSchema);
