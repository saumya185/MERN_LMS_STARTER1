const mongoose = require('mongoose');
const Course = require('./src/models/Course');
const User = require('./src/models/User'); // Import User model

async function checkUploadedVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern_lms');
    console.log('Connected to MongoDB');
    
    const courses = await Course.find({}).populate('instructor', 'name email');
    console.log('\n=== COURSES WITH VIDEOS ===');
    
    for (let course of courses) {
      console.log(`\n📚 Course: ${course.title}`);
      console.log(`👨‍🏫 Instructor: ${course.instructor?.name || 'Unknown'}`);
      console.log(`💰 Price: ₹${course.price}`);
      console.log(`📝 Status: ${course.status}`);
      
      if (course.lectures && course.lectures.length > 0) {
        console.log(`\n   📹 LECTURES (${course.lectures.length}):`);
        
        course.lectures.forEach((lecture, index) => {
          console.log(`   ${index + 1}. ${lecture.title}`);
          console.log(`      📱 Video URL: ${lecture.videoUrl || 'NO VIDEO'}`);
          console.log(`      ⏱️  Duration: ${lecture.duration || 0} seconds`);
          console.log(`      🆓 Free: ${lecture.isFree ? 'Yes' : 'No'}`);
          
          // Check if it's a demo video or uploaded video
          if (lecture.videoUrl) {
            if (lecture.videoUrl.includes('cloudinary.com')) {
              console.log(`      ✅ UPLOADED VIDEO (Cloudinary)`);
            } else if (lecture.videoUrl.includes('commondatastorage')) {
              console.log(`      🧪 DEMO VIDEO (Google Sample)`);
            } else {
              console.log(`      ❓ OTHER VIDEO SOURCE`);
            }
          }
          console.log('');
        });
      } else {
        console.log('   ❌ No lectures found');
      }
      
      console.log('---'.repeat(20));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUploadedVideos();