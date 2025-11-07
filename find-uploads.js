const mongoose = require('mongoose');
const Course = require('./src/models/Course');
const User = require('./src/models/User');

async function findUploadedVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern_lms');
    console.log('Connected to MongoDB');
    
    // Search for courses with Cloudinary video URLs
    const coursesWithUploads = await Course.find({
      'lectures.videoUrl': { $regex: 'cloudinary.com', $options: 'i' }
    }).populate('instructor', 'name email');
    
    console.log(`\n🔍 Found ${coursesWithUploads.length} courses with uploaded videos`);
    
    if (coursesWithUploads.length > 0) {
      for (let course of coursesWithUploads) {
        console.log(`\n✅ COURSE WITH UPLOADS: ${course.title}`);
        console.log(`👨‍🏫 Instructor: ${course.instructor?.name}`);
        
        course.lectures.forEach((lecture, index) => {
          if (lecture.videoUrl && lecture.videoUrl.includes('cloudinary.com')) {
            console.log(`   ${index + 1}. ${lecture.title}`);
            console.log(`      📹 UPLOADED VIDEO: ${lecture.videoUrl.substring(0, 80)}...`);
          }
        });
      }
    } else {
      console.log('\n❌ No uploaded videos found in database');
      console.log('\n💡 Suggestions:');
      console.log('1. Go to instructor dashboard');
      console.log('2. Create a new course or edit existing course');
      console.log('3. Upload videos using the video upload feature');
      console.log('4. Make sure videos are saved to lectures');
    }
    
    // Also check all courses regardless of video type
    const allCourses = await Course.find({}).populate('instructor', 'name email');
    console.log(`\n📊 Total courses in database: ${allCourses.length}`);
    
    for (let course of allCourses) {
      const uploadedCount = course.lectures.filter(l => l.videoUrl && l.videoUrl.includes('cloudinary.com')).length;
      const demoCount = course.lectures.filter(l => l.videoUrl && l.videoUrl.includes('commondatastorage')).length;
      const noVideoCount = course.lectures.filter(l => !l.videoUrl).length;
      
      console.log(`   📚 ${course.title}:`);
      console.log(`      ✅ Uploaded videos: ${uploadedCount}`);
      console.log(`      🧪 Demo videos: ${demoCount}`);
      console.log(`      ❌ No videos: ${noVideoCount}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findUploadedVideos();