const mongoose = require('mongoose');
const Course = require('./src/models/Course');
const User = require('./src/models/User');

async function testAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern_lms');
    console.log('Connected to MongoDB');
    
    const courses = await Course.find({}).limit(1);
    if (courses.length > 0) {
      const course = courses[0];
      console.log('\n📚 Course Details:');
      console.log('ID:', course._id.toString());
      console.log('Title:', course.title);
      console.log('Lectures:', course.lectures.length);
      
      console.log('\n🎬 Lectures:');
      course.lectures.forEach((lecture, index) => {
        console.log(`${index + 1}. ${lecture.title}`);
        console.log(`   Video URL: ${lecture.videoUrl || 'NONE'}`);
        console.log(`   Duration: ${lecture.duration || 0}`);
        console.log('');
      });
      
      // Test course content endpoint simulation
      console.log('\n🔍 API Response Simulation:');
      const apiResponse = {
        course: {
          _id: course._id,
          title: course.title,
          lectures: course.lectures,
          instructor: course.instructor
        }
      };
      
      console.log('Response structure looks good:', !!apiResponse.course.lectures);
      console.log('First lecture has video:', !!apiResponse.course.lectures[0]?.videoUrl);
    } else {
      console.log('No courses found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAPI();