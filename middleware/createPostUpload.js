const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// Cloudinary storage configuration for post images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog-post-images', // Separate folder for post images
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, crop: "scale" }, // Scale to width 1200px
      { quality: "auto" },           // Automatic quality optimization
      { fetch_format: "auto" }       // Automatic format selection
    ],
    resource_type: 'auto'
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

// Multer configuration with Cloudinary and fields for images
const createPostUpload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB for post images
  }
}).fields([
  { name: 'mainImage', maxCount: 1 },          // Main image of the post
  { name: 'contentImages', maxCount: 10 }      // Additional images (maximum 10)
]);

module.exports = createPostUpload; 