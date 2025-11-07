const mongoose = require('mongoose');
const User = require('./src/models/User');
const Course = require('./src/models/Course');
const bcrypt = require('bcryptjs');

async function setupSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern_lms');
    console.log('Connected to MongoDB');
    
    // Create admin user if none exists
    let user = await User.findOne({ email: 'admin@example.com' });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      user = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        isEmailVerified: true
      });
      
      await user.save();
      console.log('✅ Created admin user');
    }
    
    // Create instructor user if none exists
    let instructor = await User.findOne({ email: 'instructor@example.com' });
    
    if (!instructor) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      instructor = new User({
        name: 'Suraj Kumar',
        email: 'instructor@example.com',
        password: hashedPassword,
        role: 'instructor',
        isEmailVerified: true,
        bio: 'Expert instructor with 5+ years of experience in web development'
      });
      
      await instructor.save();
      console.log('✅ Created instructor user');
    }
    
    // Demo video URLs
    const demoVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
    ];
    
    // Check for existing courses
    const existingCourses = await Course.find({});
    
    if (existingCourses.length === 0) {
      // Create sample courses
      const courses = [
        {
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
              duration: 900,
              order: 1,
              isFree: true
            },
            {
              title: 'HTML Fundamentals',
              description: 'Master the building blocks of web pages with HTML',
              videoUrl: demoVideos[1],
              duration: 1200,
              order: 2,
              isFree: false
            },
            {
              title: 'CSS Styling and Layout',
              description: 'Learn how to style your web pages with CSS',
              videoUrl: demoVideos[2],
              duration: 1500,
              order: 3,
              isFree: false
            }
          ],
          requirements: ['Basic computer knowledge', 'Internet connection'],
          whatYouWillLearn: ['Build responsive websites', 'Master HTML, CSS, JavaScript', 'Create web applications'],
          tags: ['web development', 'html', 'css', 'javascript']
        },
        {
          title: 'JavaScript Mastery Course',
          subtitle: 'From basics to advanced JavaScript concepts',
          description: 'Master JavaScript with hands-on projects and real-world examples',
          price: 399,
          category: 'Programming',
          level: 'intermediate',
          instructor: instructor._id,
          status: 'published',
          isApproved: true,
          thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800',
          lectures: [
            {
              title: 'JavaScript Fundamentals',
              description: 'Variables, functions, and basic concepts',
              videoUrl: demoVideos[3],
              duration: 1800,
              order: 1,
              isFree: true
            },
            {
              title: 'DOM Manipulation',
              description: 'Working with the Document Object Model',
              videoUrl: demoVideos[4],
              duration: 2100,
              order: 2,
              isFree: false
            }
          ],
          requirements: ['Basic programming knowledge'],
          whatYouWillLearn: ['Master JavaScript concepts', 'Build interactive websites'],
          tags: ['javascript', 'programming', 'web development']
        }
      ];
      
      for (let courseData of courses) {
        const course = new Course(courseData);
        await course.save();
        console.log(`✅ Created course: ${course.title}`);
      }
    } else {
      console.log('📚 Courses already exist');
    }
    
    console.log('🎉 System setup complete!');
    console.log('👤 Admin: admin@example.com / password123');
    console.log('👨‍🏫 Instructor: instructor@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupSystem();