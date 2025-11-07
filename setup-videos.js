const mongoose = require('mongoose');
const Course = require('./src/models/Course');
const User = require('./src/models/User');

async function createSampleCourse() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern_lms');
    console.log('Connected to MongoDB');
    
    // Check for existing courses
    const existingCourses = await Course.find({});
    console.log('Existing courses:', existingCourses.length);
    
    // Check for users
    const users = await User.find({});
    console.log('Existing users:', users.length);
    
    if (users.length === 0) {
      console.log('No users found. Please create a user first.');
      process.exit(1);
    }
    
    // Get the first user as instructor
    const instructor = users[0];
    console.log('Using instructor:', instructor.name);
    
    // Demo video URLs
    const demoVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
    ];
    
    // Create sample course if none exist
    if (existingCourses.length === 0) {
      const sampleCourse = new Course({
        title: 'Complete Web Development Course',
        subtitle: 'Learn HTML, CSS, JavaScript and React from scratch',
        description: 'This comprehensive course will teach you everything you need to know about web development. From basic HTML to advanced React concepts.',
        price: 499,
        category: 'Programming',
        level: 'beginner',
        instructor: instructor._id,
        status: 'published',
        isApproved: true,
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        lectures: [
          {
            title: 'Introduction to Web Development',
            description: 'Learn the basics of web development and what you will build in this course',
            videoUrl: demoVideos[0],
            duration: 900, // 15 minutes
            order: 1,
            isFree: true
          },
          {
            title: 'HTML Fundamentals',
            description: 'Master the building blocks of web pages with HTML',
            videoUrl: demoVideos[1],
            duration: 1200, // 20 minutes
            order: 2,
            isFree: false
          },
          {
            title: 'CSS Styling and Layout',
            description: 'Learn how to style your web pages with CSS',
            videoUrl: demoVideos[2],
            duration: 1500, // 25 minutes
            order: 3,
            isFree: false
          },
          {
            title: 'JavaScript Basics',
            description: 'Add interactivity to your websites with JavaScript',
            videoUrl: demoVideos[3],
            duration: 1800, // 30 minutes
            order: 4,
            isFree: false
          },
          {
            title: 'React Introduction',
            description: 'Build modern web applications with React',
            videoUrl: demoVideos[4],
            duration: 2100, // 35 minutes
            order: 5,
            isFree: false
          }
        ],
        requirements: [
          'Basic computer knowledge',
          'Internet connection',
          'A computer with any operating system'
        ],
        whatYouWillLearn: [
          'Build responsive websites from scratch',
          'Master HTML, CSS, and JavaScript',
          'Create interactive web applications',
          'Understand modern web development practices'
        ],
        tags: ['web development', 'html', 'css', 'javascript', 'react']
      });
      
      await sampleCourse.save();
      console.log('✅ Created sample course with videos!');
    } else {
      // Update existing courses
      for (let course of existingCourses) {
        let updated = false;
        
        if (course.lectures && course.lectures.length > 0) {
          course.lectures.forEach((lecture, index) => {
            if (!lecture.videoUrl) {
              lecture.videoUrl = demoVideos[index % demoVideos.length];
              lecture.duration = 600 + (index * 300); // 10-40 minutes
              updated = true;
            }
          });
          
          if (updated) {
            await course.save();
            console.log(`✅ Updated course: ${course.title}`);
          }
        }
      }
    }
    
    console.log('🎉 Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSampleCourse();