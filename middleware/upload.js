const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the directory for uploading depending on the environment
const uploadDir = process.env.NODE_ENV === 'production' 
  ? process.env.UPLOAD_DIR || '/tmp/uploads'
  : 'uploads';

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Folder for uploading files
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with a timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter files - allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('You can only upload images!'), false);
  }
};

// Maximum file size - 5MB
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = upload; 