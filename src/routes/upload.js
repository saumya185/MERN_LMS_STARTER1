const express = require('express');
const { cloudinary, upload } = require('../config/cloudinary');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Upload image (avatar, thumbnail)
router.post('/image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary with automatic optimization and resizing
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'lms/images',
      resource_type: 'auto',
      transformation: [
        {
          width: 1280,
          height: 720,
          crop: 'limit',  // Don't upscale, only downscale if needed
          quality: 'auto:good',  // Automatic quality optimization
          fetch_format: 'auto'   // Automatic format (WebP if supported)
        }
      ]
    });

    res.json({
      message: 'File uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Upload video (course lectures)
router.post('/video', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary (videos take longer)
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'lms/videos',
      resource_type: 'video',
      chunk_size: 6000000, // 6MB chunks for large files
      eager: [
        { streaming_profile: 'hd', format: 'm3u8' }
      ],
      eager_async: true
    });

    res.json({
      message: 'Video uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ message: 'Video upload failed', error: error.message });
  }
});

// Delete file from Cloudinary
router.delete('/:publicId', protect, async (req, res) => {
  try {
    const publicId = req.params.publicId.replace(/-/g, '/');
    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
});

module.exports = router;
