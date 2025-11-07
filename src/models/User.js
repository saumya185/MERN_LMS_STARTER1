const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  role: { type: String, enum: ['student','instructor','admin'], default: 'student' },
  googleId: { type: String, unique: true, sparse: true },
  bio: { type: String, maxlength: 500 },
  avatar: { type: String, default: 'https://ui-avatars.com/api/?name=User' },
  phoneNumber: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
