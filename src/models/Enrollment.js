const mongoose = require('mongoose');
const EnrollmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  status: { type: String, enum: ['active','cancelled'], default: 'active' }
}, { timestamps: true });
module.exports = mongoose.model('Enrollment', EnrollmentSchema);
