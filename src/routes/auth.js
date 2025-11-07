const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your-secret-key', { 
    expiresIn: '30d' 
  });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Create user
    const user = new User({ 
      name, 
      email, 
      passwordHash: password, // Will be hashed by pre-save hook
      role: role || 'student',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    });
    
    await user.save();
    
    // Generate token
    const token = generateToken(user._id, user.role);
    
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Find user
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user._id, user.role);
    
    res.json({ 
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Google OAuth (placeholder for client-provided credentials)
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    
    if (!googleId || !email) {
      return res.status(400).json({ message: 'Invalid Google auth data' });
    }
    
    // Check if user exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    
    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        name,
        email,
        googleId,
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        isEmailVerified: true
      });
      await user.save();
    }
    
    // Generate token
    const token = generateToken(user._id, user.role);
    
    res.json({ 
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Google OAuth Callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_code`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=token_error`);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const googleUser = await userResponse.json();

    // Check if user exists
    let user = await User.findOne({ $or: [{ googleId: googleUser.id }, { email: googleUser.email }] });
    
    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleUser.id;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.id,
        avatar: googleUser.picture,
        isEmailVerified: true
      });
      await user.save();
    }
    
    // Generate token
    const token = generateToken(user._id, user.role);
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/success?token=${token}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash')
      .populate('enrolledCourses', 'title thumbnail price')
      .populate('wishlist', 'title thumbnail price');
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, phoneNumber, avatar } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (avatar) updateData.avatar = avatar;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    
    const user = await User.findById(req.user._id).select('+passwordHash');
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with this email' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await user.save();
    
    // In production, send email with reset link
    // For now, return token (remove in production)
    res.json({ 
      message: 'Password reset token generated',
      resetToken // Remove this in production
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    // Hash token to compare
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Update password
    user.passwordHash = password; // Will be hashed by pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
