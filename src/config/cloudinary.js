const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
});

// Use memory storage - files stored in memory as Buffer
const storage = multer.memoryStorage();

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') ||
        file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and PDFs allowed.'));
    }
  }
});

module.exports = {
  cloudinary,
  upload
};

