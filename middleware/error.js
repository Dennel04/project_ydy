// Validation error handler
const errorHandler = (err, req, res, next) => {
  // Multer may throw limit errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File size exceeds the allowed limit (5MB)'
    });
  }
  
  // Multer error
  if (err.message && err.message.includes('Only images can be uploaded')) {
    return res.status(400).json({
      message: err.message
    });
  }
  
  // Log the error to the console
  console.error(err.stack);
  
  // Error response
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error'
  });
};

module.exports = errorHandler; 