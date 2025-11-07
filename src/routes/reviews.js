const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Course = require('../models/Course');
const { protect, isEnrolled } = require('../middleware/auth');

// Get reviews for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const { sort = '-createdAt', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find({ course: req.params.courseId })
      .populate('user', 'name avatar')
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);
    
    const total = await Review.countDocuments({ course: req.params.courseId });
    
    res.json({
      reviews,
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

// Create or update review (enrolled users only)
router.post('/', protect, async (req, res) => {
  try {
    const { courseId, rating, comment } = req.body;
    
    if (!courseId || !rating || !comment) {
      return res.status(400).json({ message: 'Course ID, rating and comment are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if user is enrolled
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const isEnrolled = req.user.enrolledCourses.some(id => id.toString() === courseId);
    if (!isEnrolled) {
      return res.status(403).json({ message: 'You must be enrolled to review this course' });
    }
    
    // Check if review already exists
    let review = await Review.findOne({ course: courseId, user: req.user._id });
    
    if (review) {
      // Update existing review
      review.rating = rating;
      review.comment = comment;
      await review.save();
      
      res.json({ message: 'Review updated successfully', review });
    } else {
      // Create new review
      review = new Review({
        course: courseId,
        user: req.user._id,
        rating,
        comment
      });
      
      await review.save();
      
      res.status(201).json({ message: 'Review created successfully', review });
    }
    
    // Update course rating
    await updateCourseRating(courseId);
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update review
router.put('/:id', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Check if user owns the review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }
    
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = rating;
    }
    
    if (comment) review.comment = comment;
    
    await review.save();
    
    // Update course rating
    await updateCourseRating(review.course);
    
    res.json({ message: 'Review updated successfully', review });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete review
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Check if user owns the review or is admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }
    
    const courseId = review.course;
    await review.deleteOne();
    
    // Update course rating
    await updateCourseRating(courseId);
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark review as helpful
router.post('/:id/helpful', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Toggle helpful
    const index = review.helpful.indexOf(req.user._id);
    if (index > -1) {
      review.helpful.splice(index, 1);
    } else {
      review.helpful.push(req.user._id);
    }
    
    await review.save();
    
    res.json({ message: 'Review helpfulness updated', helpfulCount: review.helpful.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to update course rating
async function updateCourseRating(courseId) {
  const reviews = await Review.find({ course: courseId });
  
  if (reviews.length === 0) {
    await Course.findByIdAndUpdate(courseId, {
      averageRating: 0,
      totalRatings: 0
    });
    return;
  }
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  
  await Course.findByIdAndUpdate(courseId, {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalRatings: reviews.length
  });
}

module.exports = router;
