const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');
const Review = require('../models/Review');
const Progress = require('../models/Progress');
const Payment = require('../models/Payment');
const { protect, authorize, isInstructorOfCourse, isEnrolled } = require('../middleware/auth');

// Get all published courses (public) with filters
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      level, 
      minPrice, 
      maxPrice, 
      rating, 
      search,
      sort = '-createdAt',
      page = 1,
      limit = 12
    } = req.query;
    
    const query = { status: 'published' };
    
    // Show approved courses to everyone, but allow instructors to see their own published courses
    const token = req.headers.authorization?.split(' ')[1];
    let instructorId = null;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        instructorId = decoded.id;
      } catch (e) {
        // Invalid token, continue as guest
      }
    }
    
    if (instructorId) {
      // Show approved courses OR instructor's own courses
      query.$or = [
        { isApproved: true },
        { instructor: instructorId }
      ];
    } else {
      // Only show approved courses for guests
      query.isApproved = true;
    }
    
    // Filters
    if (category) query.category = category;
    if (level) query.level = level;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (rating) query.averageRating = { $gte: Number(rating) };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const courses = await Course.find(query)
      .populate('instructor', 'name avatar bio')
      .select('-lectures')
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);
    
    const total = await Course.countDocuments(query);
    
    res.json({
      courses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get instructor's courses
router.get('/instructor/my-courses', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user._id })
      .sort('-createdAt');
    
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get enrolled courses
router.get('/student/my-courses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'enrolledCourses',
        populate: { path: 'instructor', select: 'name avatar' }
      });
    
    // Get progress for each course
    const coursesWithProgress = await Promise.all(
      user.enrolledCourses.map(async (course) => {
        const progress = await Progress.findOne({
          user: req.user._id,
          course: course._id
        });
        
        return {
          ...course.toObject(),
          progress: progress?.overallProgress || 0,
          lastAccessedAt: progress?.lastAccessedAt
        };
      })
    );
    
    res.json({ courses: coursesWithProgress });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get course by ID (public view - limited info if not enrolled)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name avatar bio email');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get reviews
    const reviews = await Review.find({ course: course._id })
      .populate('user', 'name avatar')
      .sort('-createdAt')
      .limit(10);
    
    // If not logged in or not enrolled, hide non-free lecture content
    let courseData = course.toObject();
    
    // Check if user is enrolled (if authenticated)
    const token = req.headers.authorization?.split(' ')[1];
    let isEnrolledFlag = false;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.id);
        isEnrolledFlag = user?.enrolledCourses.some(id => id.toString() === course._id.toString());
      } catch (e) {
        // Invalid token, continue as guest
      }
    }
    
    if (!isEnrolledFlag && course.instructor._id.toString() !== req.user?._id?.toString()) {
      // Hide full lecture details for non-enrolled users
      courseData.lectures = courseData.lectures.map(lecture => ({
        _id: lecture._id,
        title: lecture.title,
        duration: lecture.duration,
        order: lecture.order,
        isFree: lecture.isFree
      }));
    }
    
    res.json({ course: courseData, reviews, isEnrolled: isEnrolledFlag });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new course (instructor only)
router.post('/', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    console.log('=== CREATE COURSE REQUEST ===');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    
    const { 
      title, 
      subtitle,
      description, 
      price, 
      category, 
      level,
      language,
      thumbnail,
      requirements,
      whatYouWillLearn,
      tags
    } = req.body;
    
    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description and category are required' });
    }
    
    const course = new Course({
      title,
      subtitle,
      description,
      price: price || 0,
      category,
      level,
      language,
      thumbnail,
      requirements,
      whatYouWillLearn,
      tags,
      instructor: req.user._id,
      status: 'draft'
    });
    
    await course.save();
    
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    console.error('=== CREATE COURSE ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update course (instructor only)
router.put('/:id', protect, authorize('instructor', 'admin'), isInstructorOfCourse, async (req, res) => {
  try {
    const updates = req.body;
    
    // Don't allow changing instructor or approval fields
    delete updates.instructor;
    delete updates.isApproved;
    delete updates.approvedBy;
    delete updates.approvedAt;
    delete updates.enrollmentCount;
    delete updates.averageRating;
    delete updates.totalRatings;
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('instructor', 'name avatar');
    
    res.json({ message: 'Course updated successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete course (instructor only)
router.delete('/:id', protect, authorize('instructor', 'admin'), isInstructorOfCourse, async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Publish/Unpublish course
router.patch('/:id/publish', protect, authorize('instructor', 'admin'), isInstructorOfCourse, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const updateData = { status };
    
    // Auto-approve course when published (for demo purposes)
    if (status === 'published') {
      updateData.isApproved = true;
      updateData.approvedBy = req.user._id;
      updateData.approvedAt = new Date();
    }
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    res.json({ message: `Course ${status} successfully`, course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add lecture to course
router.post('/:id/lectures', protect, authorize('instructor', 'admin'), isInstructorOfCourse, async (req, res) => {
  try {
    const { title, description, videoUrl, duration, resources, quiz, order, isFree } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Lecture title is required' });
    }
    
    const course = await Course.findById(req.params.id);
    
    course.lectures.push({
      title,
      description,
      videoUrl,
      duration: duration || 0,
      resources: resources || [],
      quiz: quiz || [],
      order: order || course.lectures.length + 1,
      isFree: isFree || false
    });
    
    await course.save();
    
    res.status(201).json({ message: 'Lecture added successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update lecture
router.put('/:id/lectures/:lectureId', protect, authorize('instructor', 'admin'), isInstructorOfCourse, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const lecture = course.lectures.id(req.params.lectureId);
    
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    
    Object.assign(lecture, req.body);
    await course.save();
    
    res.json({ message: 'Lecture updated successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete lecture
router.delete('/:id/lectures/:lectureId', protect, authorize('instructor', 'admin'), isInstructorOfCourse, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    course.lectures.id(req.params.lectureId).remove();
    await course.save();
    
    res.json({ message: 'Lecture deleted successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get course analytics (instructor only)
router.get('/:id/analytics', protect, authorize('instructor', 'admin'), isInstructorOfCourse, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    const totalEnrollments = course.enrollmentCount;
    const totalRevenue = await Payment.aggregate([
      { $match: { course: course._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const completionRate = await Progress.aggregate([
      { $match: { course: course._id } },
      {
        $group: {
          _id: null,
          avgProgress: { $avg: '$overallProgress' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] }
          }
        }
      }
    ]);
    
    const reviews = await Review.find({ course: course._id })
      .populate('user', 'name avatar')
      .sort('-createdAt');
    
    res.json({
      totalEnrollments,
      totalRevenue: totalRevenue[0]?.total || 0,
      averageProgress: completionRate[0]?.avgProgress || 0,
      completionCount: completionRate[0]?.completedCount || 0,
      averageRating: course.averageRating,
      totalRatings: course.totalRatings,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Enroll in course (student)
router.post('/:id/enroll', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    if (course.status !== 'published') {
      return res.status(400).json({ message: 'Course is not available for enrollment' });
    }
    
    // Check if already enrolled
    if (req.user.enrolledCourses.includes(course._id)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }
    
    // Check if payment is required
    if (course.price > 0) {
      // Check if payment exists
      const payment = await Payment.findOne({
        user: req.user._id,
        course: course._id,
        status: 'completed'
      });
      
      if (!payment) {
        return res.status(402).json({ message: 'Payment required for this course' });
      }
    }
    
    // Enroll user
    req.user.enrolledCourses.push(course._id);
    await req.user.save();
    
    // Update course enrollment count
    course.enrollmentCount += 1;
    await course.save();
    
    // Create progress tracker
    const progress = new Progress({
      user: req.user._id,
      course: course._id,
      totalLectures: course.lectures.length,
      lectureProgress: course.lectures.map(lecture => ({
        lectureId: lecture._id,
        completed: false,
        watchedDuration: 0
      }))
    });
    await progress.save();
    
    // Emit socket notification
    const io = req.app.get('io');
    if (io) io.emit('notification', { type: 'enroll', courseId: course._id, userId: req.user._id });
    
    res.json({ message: 'Successfully enrolled in course', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get course content (enrolled users only)
router.get('/:id/content', protect, isEnrolled, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name avatar bio email');
    
    const progress = await Progress.findOne({
      user: req.user._id,
      course: course._id
    });
    
    res.json({ course, progress });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update lecture progress
router.post('/:courseId/lectures/:lectureId/progress', protect, isEnrolled, async (req, res) => {
  try {
    const { completed, watchedDuration, quizScore } = req.body;
    
    let progress = await Progress.findOne({
      user: req.user._id,
      course: req.params.courseId
    });
    
    if (!progress) {
      return res.status(404).json({ message: 'Progress record not found' });
    }
    
    // Find lecture progress
    const lectureProgress = progress.lectureProgress.find(
      lp => lp.lectureId.toString() === req.params.lectureId
    );
    
    if (!lectureProgress) {
      return res.status(404).json({ message: 'Lecture not found in progress' });
    }
    
    // Update lecture progress
    if (completed !== undefined) lectureProgress.completed = completed;
    if (watchedDuration !== undefined) lectureProgress.watchedDuration = watchedDuration;
    if (quizScore !== undefined) lectureProgress.quizScore = quizScore;
    lectureProgress.lastWatchedAt = new Date();
    
    // Calculate overall progress
    const completedCount = progress.lectureProgress.filter(lp => lp.completed).length;
    progress.completedLectures = completedCount;
    progress.overallProgress = (completedCount / progress.totalLectures) * 100;
    progress.lastAccessedAt = new Date();
    
    // Check if course is completed
    if (progress.overallProgress === 100 && !progress.isCompleted) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }
    
    await progress.save();
    
    res.json({ message: 'Progress updated successfully', progress });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get course progress (enrolled users only)
router.get('/:id/progress', protect, isEnrolled, async (req, res) => {
  try {
    const progress = await Progress.findOne({
      user: req.user._id,
      course: req.params.id
    });
    
    res.json({ 
      progress: progress || { 
        completedLectures: [], 
        overallProgress: 0 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark lecture as complete
router.post('/:courseId/lectures/:lectureId/complete', protect, isEnrolled, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const lectureId = req.params.lectureId;
    
    // Find or create progress
    let progress = await Progress.findOne({
      user: req.user._id,
      course: courseId
    });
    
    if (!progress) {
      progress = new Progress({
        user: req.user._id,
        course: courseId,
        completedLectures: []
      });
    }
    
    // Add lecture to completed if not already completed
    if (!progress.completedLectures.includes(lectureId)) {
      progress.completedLectures.push(lectureId);
      
      // Calculate overall progress
      const course = await Course.findById(courseId);
      if (course && course.lectures) {
        progress.overallProgress = Math.round(
          (progress.completedLectures.length / course.lectures.length) * 100
        );
      }
      
      await progress.save();
    }
    
    res.json({ message: 'Lecture marked as complete', progress });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add to wishlist
router.post('/:id/wishlist', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    if (req.user.wishlist.includes(course._id)) {
      return res.status(400).json({ message: 'Course already in wishlist' });
    }
    
    req.user.wishlist.push(course._id);
    await req.user.save();
    
    res.json({ message: 'Course added to wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove from wishlist
router.delete('/:id/wishlist', protect, async (req, res) => {
  try {
    req.user.wishlist = req.user.wishlist.filter(
      id => id.toString() !== req.params.id
    );
    await req.user.save();
    
    res.json({ message: 'Course removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
