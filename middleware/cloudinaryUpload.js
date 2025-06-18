const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog-uploads', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1000, crop: "scale" }, // Scale to width 1000px keeping aspect ratio
      { quality: "auto" },           // Automatic quality optimization
      { fetch_format: "auto" }       // Automatic format selection (webp for supported browsers)
    ],
    // No hardcoded format and quality, as it's now in transformation
    resource_type: 'auto' // Automatic resource type detection
  }
});

// File filter - allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images can be uploaded!'), false);
  }
};

// Multer configuration with Cloudinary
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Increased to 10MB, as images will be optimized
  }
});

module.exports = upload; 