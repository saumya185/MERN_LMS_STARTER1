const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!req.user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Check for specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} is not authorized to access this route` 
      });
    }
    
    next();
  };
};

// Check if user is instructor of the course
const isInstructorOfCourse = async (req, res, next) => {
  try {
    const Course = require('../models/Course');
    const course = await Course.findById(req.params.id || req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this course' });
    }
    
    req.course = course;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check if user is enrolled in course
const isEnrolled = async (req, res, next) => {
  try {
    const Course = require('../models/Course');
    const courseId = req.params.id || req.params.courseId;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if user is enrolled
    const isEnrolled = req.user.enrolledCourses.some(id => id.toString() === courseId);
    
    // Allow if enrolled, is instructor, or is admin
    if (!isEnrolled && course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You must be enrolled to access this content' });
    }
    
    req.course = course;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { protect, authorize, isInstructorOfCourse, isEnrolled };
