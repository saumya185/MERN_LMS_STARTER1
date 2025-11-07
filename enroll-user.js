const mongoose = require('mongoose');
require('./src/models/User');
require('./src/models/Course');
require('./src/models/Enrollment');

const User = mongoose.model('User');
const Course = mongoose.model('Course');
const Enrollment = mongoose.model('Enrollment');

async function enrollUser() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/mern_lms');
    console.log('Connected to MongoDB');
    
    // Find test course
    const course = await Course.findOne().sort({ createdAt: -1 });
    console.log('\n📚 Course found:', course.title);
    console.log('Course ID:', course._id);
    
    // Find a test user
    const user = await User.findOne();
    if (user) {
      console.log('\n👤 User found:', user.name);
      console.log('User ID:', user._id);
      
      // Check if already enrolled
      const existingEnrollment = await Enrollment.findOne({
        user: user._id,
        course: course._id
      });
      
      if (existingEnrollment) {
        console.log('\n✅ User already enrolled');
      } else {
        // Create enrollment
        const enrollment = new Enrollment({
          user: user._id,
          course: course._id,
          enrolledAt: new Date()
        });
        await enrollment.save();
        
        // Add to user's enrolled courses
        user.enrolledCourses.push(course._id);
        await user.save();
        
        console.log('\n🎉 Enrollment created successfully');
      }
    } else {
      console.log('\n❌ No user found - please register first');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

enrollUser();