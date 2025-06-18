const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// Cloudinary storage configuration for avatars
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog-avatars', // Separate folder for avatars
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" }, // Crop to square with face focus
      { radius: "max" }, // Round shape for avatar
      { quality: "auto" }, // Automatic quality optimization
      { fetch_format: "auto" } // Automatic format selection
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

// Multer configuration with Cloudinary
const avatarUpload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for avatars is enough
  }
});

module.exports = avatarUpload; 