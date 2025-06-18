/**
 * Middleware for validation of input data.
 * Provides validators for the most frequently used data.
 */

// Validation of user profile
const validateUserProfile = (req, res, next) => {
  const { username, description, email } = req.body;
  
  // Check username
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }
  
  if (username.length < 2 || username.length > 30) {
    return res.status(400).json({ 
      message: 'Username must contain from 2 to 30 characters' 
    });
  }
  
  // Check description (if exists)
  if (description && description.length > 500) {
    return res.status(400).json({ 
      message: 'Description must not exceed 500 characters' 
    });
  }
  
  // If user tries to change email through this route, block
  if (email) {
    return res.status(400).json({ 
      message: 'Use special route /api/users/change-email to change email'
    });
  }
  
  next();
};

// Validation of password change
const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // Check for presence of fields
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  // Check new password
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ 
      message: 'New password must contain from 8 to 128 characters' 
    });
  }
  
  // Check password complexity (example simple check)
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  
  if (!hasNumber) {
    return res.status(400).json({ 
      message: 'Password must contain at least one digit' 
    });
  }
  
  next();
};

// Validation of email change
const validateEmailChange = (req, res, next) => {
  const { password, newEmail } = req.body;
  
  // Check for presence of fields
  if (!password || !newEmail) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  next();
};

// Validation of post creation
const validatePost = (req, res, next) => {
  const { name, content } = req.body;
  
  // Validate post name
  if (!name || name.trim().length < 3) {
    return res.status(400).json({ 
      message: 'Post name must contain at least 3 characters' 
    });
  }
  
  // Validate post content
  if (!content || content.trim().length < 10) {
    return res.status(400).json({ 
      message: 'Post content must contain at least 10 characters' 
    });
  }
  
  next();
};

// Validation of comment creation
const validateComment = (req, res, next) => {
  const { text } = req.body;
  
  if (!text || text.trim().length < 1) {
    return res.status(400).json({ message: 'Comment text cannot be empty' });
  }
  
  if (text.length > 1000) {
    return res.status(400).json({ 
      message: 'Comment text must not exceed 1000 characters' 
    });
  }
  
  next();
};

// Export all validators
module.exports = {
  validateUserProfile,
  validatePasswordChange,
  validateEmailChange,
  validatePost,
  validateComment
}; 