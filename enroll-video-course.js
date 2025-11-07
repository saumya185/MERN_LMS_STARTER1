const mongoose = require('mongoose');
require('./src/models/User');
require('./src/models/Course');
require('./src/models/Enrollment');

const User = mongoose.model('User');
const Course = mongoose.model('Course');
const Enrollment = mongoose.model('Enrollment');

async function enrollUserInVideoCourse() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/mern_lms');
    console.log('Connected to MongoDB');
    
    // Find the specific course with video URLs
    const courseId = '68ebee953d3b19e14a5e5d36';
    const course = await Course.findById(courseId);
    
    if (!course) {
      console.log('\n❌ Course not found');
      return;
    }
    
    console.log('\n📚 Course found:', course.title);
    console.log('Course ID:', course._id);
    console.log('Lectures:', course.lectures.length);
    
    // Show first lecture video URL
    if (course.lectures.length > 0) {
      console.log('First lecture video:', course.lectures[0].videoUrl);
    }
    
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
        console.log('\n✅ User already enrolled in this course');
      } else {
        // Create enrollment
        const enrollment = new Enrollment({
          user: user._id,
          course: course._id,
          enrolledAt: new Date()
        });
        await enrollment.save();
        
        // Add to user's enrolled courses if not already there
        if (!user.enrolledCourses.includes(course._id)) {
          user.enrolledCourses.push(course._id);
          await user.save();
        }
        
        console.log('\n🎉 Enrollment created successfully in video course');
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

enrollUserInVideoCourse();