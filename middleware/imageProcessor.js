/**
 * Extended middleware for processing and optimizing images
 * before uploading to Cloudinary
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Create a temporary folder for images
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Base settings for local storage for preliminary processing
const tmpStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique name to avoid conflicts
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${fileExt}`);
  }
});

// Extended image check for security
const validateImage = (req, file, cb) => {
  // Check MIME type
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only images are allowed'));
  }

  // Check file extension
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!validExtensions.includes(ext)) {
    return cb(new Error('Invalid file extension. Only: ' + validExtensions.join(', ')));
  }
  
  // Everything is fine
  cb(null, true);
};

// Create configurations for different types of images
const createImageUploader = (options) => {
  const {
    fieldName = 'image',
    maxFileSize = 5 * 1024 * 1024,  // 5 MB by default
    imageType = 'general',          // general type by default
    maxWidth,
    maxHeight,
    useLocalOptimization = false    // use local optimization before uploading
  } = options;

  // Choose Cloudinary settings depending on image type
  let cloudinaryConfig;
  let folder, transformations;

  switch (imageType) {
    case 'avatar':
      folder = 'blog-avatars';
      transformations = [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { radius: "max" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ];
      break;
    case 'post':
      folder = 'blog-post-images';
      transformations = [
        { width: 1200, crop: "scale" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ];
      break;
    case 'thumbnail':
      folder = 'blog-thumbnails';
      transformations = [
        { width: 600, height: 400, crop: "fill", gravity: "auto" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ];
      break;
    default:
      folder = 'blog-uploads';
      transformations = [
        { width: maxWidth || 1600, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ];
  }

  // Cloudinary settings
  const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: transformations,
      resource_type: 'auto',
      // Add metadata for tracking
      public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileNameWithoutExt = path.basename(file.originalname, path.extname(file.originalname));
        return `${imageType}-${fileNameWithoutExt}-${uniqueSuffix}`;
      }
    }
  });

  // Create middleware
  const upload = multer({
    storage: useLocalOptimization ? tmpStorage : cloudinaryStorage,
    fileFilter: validateImage,
    limits: {
      fileSize: maxFileSize
    }
  });

  // If local optimization is required, return middleware with additional processing
  if (useLocalOptimization) {
    return {
      single: (fieldName) => {
        return [
          upload.single(fieldName),
          async (req, res, next) => {
            // If file was not uploaded, skip processing
            if (!req.file) {
              return next();
            }
            
            try {
              // You can add additional local image processing here
              // For example, through sharp or another library
              
              // After processing, upload to Cloudinary
              const result = await cloudinary.uploader.upload(req.file.path, {
                folder: folder,
                transformation: transformations,
                resource_type: 'auto'
              });
              
              // Replace file information
              req.file.path = result.secure_url;
              req.file.filename = result.public_id;
              req.file.cloudinaryDetails = result;
              
              // Delete temporary file
              fs.unlinkSync(req.file.path);
              
              next();
            } catch (error) {
              // Delete temporary file in case of error
              try {
                fs.unlinkSync(req.file.path);
              } catch (e) {
                console.error('Error deleting temporary file:', e);
              }
              next(error);
            }
          }
        ];
      }
    };
  }

  return upload;
};

module.exports = {
  createImageUploader,
  avatarUploader: createImageUploader({
    imageType: 'avatar',
    maxFileSize: 5 * 1024 * 1024,
    useLocalOptimization: false
  }),
  postImageUploader: createImageUploader({
    imageType: 'post',
    maxFileSize: 10 * 1024 * 1024,
    useLocalOptimization: false
  })
}; 