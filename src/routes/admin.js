const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Category = require('../models/Category');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin role
router.use(protect, authorize('admin'));

// Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const totalCourses = await Course.countDocuments();
    const publishedCourses = await Course.countDocuments({ status: 'published' });
    const pendingApproval = await Course.countDocuments({ status: 'published', isApproved: false });
    
    const revenueData = await Payment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);
    
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const topCourses = await Course.find()
      .sort('-enrollmentCount')
      .limit(5)
      .populate('instructor', 'name')
      .select('title enrollmentCount averageRating price thumbnail');
    
    res.json({
      users: {
        total: totalUsers,
        students: totalStudents,
        instructors: totalInstructors
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        pendingApproval
      },
      revenue: {
        total: revenueData[0]?.totalRevenue || 0,
        totalTransactions: revenueData[0]?.totalTransactions || 0,
        monthly: monthlyRevenue
      },
      topCourses
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-passwordHash')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip(skip);
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
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

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { role, isActive } = req.body;
    
    const updateData = {};
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    await user.deleteOne();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all courses
router.get('/courses', async (req, res) => {
  try {
    const { status, isApproved, search, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const courses = await Course.find(query)
      .populate('instructor', 'name email')
      .sort('-createdAt')
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

// Approve/Reject course
router.patch('/courses/:id/approve', async (req, res) => {
  try {
    const { isApproved } = req.body;
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        isApproved,
        approvedBy: isApproved ? req.user._id : null,
        approvedAt: isApproved ? new Date() : null
      },
      { new: true }
    ).populate('instructor', 'name email');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json({ 
      message: `Course ${isApproved ? 'approved' : 'rejected'} successfully`, 
      course 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete course
router.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Delete related data
    await Review.deleteMany({ course: course._id });
    await Payment.updateMany(
      { course: course._id },
      { $set: { status: 'refunded', refundReason: 'Course deleted by admin' } }
    );
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all payments
router.get('/payments', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    
    const skip = (page - 1) * limit;
    
    const payments = await Payment.find(query)
      .populate('user', 'name email')
      .populate('course', 'title price')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip(skip);
    
    const total = await Payment.countDocuments(query);
    
    res.json({
      payments,
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

// Manage categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort('name');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, description, icon, subcategories } = req.body;
    
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    
    const category = new Category({
      name,
      slug,
      description,
      icon,
      subcategories
    });
    
    await category.save();
    
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reviews
router.get('/reviews', async (req, res) => {
  try {
    const { reported, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (reported !== undefined) query.reported = reported === 'true';
    
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find(query)
      .populate('user', 'name email')
      .populate('course', 'title')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip(skip);
    
    const total = await Review.countDocuments(query);
    
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

// Delete review
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
