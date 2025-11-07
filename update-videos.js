const mongoose = require('mongoose');
const Course = require('./src/models/Course');

async function updateCourses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern_lms');
    console.log('Connected to MongoDB');
    
    const courses = await Course.find({});
    console.log('Found courses:', courses.length);
    
    // Demo video URLs from Google's sample videos
    const demoVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
    ];
    
    for (let course of courses) {
      console.log('Processing course:', course.title);
      
      if (course.lectures && course.lectures.length > 0) {
        let updated = false;
        
        course.lectures.forEach((lecture, index) => {
          if (!lecture.videoUrl) {
            lecture.videoUrl = demoVideos[index % demoVideos.length];
            lecture.duration = 300 + (index * 60); // 5-8 minutes per video
            updated = true;
            console.log(`  Added video to lecture: ${lecture.title}`);
          }
        });
        
        if (updated) {
          await course.save();
          console.log(`✅ Updated course: ${course.title}`);
        } else {
          console.log(`⏭️  Course already has videos: ${course.title}`);
        }
      } else {
        console.log(`⚠️  No lectures found in: ${course.title}`);
      }
    }
    
    console.log('🎉 Update complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateCourses();