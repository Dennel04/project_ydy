const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const cloudinary = require('../utils/cloudinary');
const { validateUserProfile, validatePasswordChange, validateEmailChange } = require('../middleware/validation');
const { avatarUploader } = require('../middleware/imageProcessor');
const formatResponse = require('../utils/formatResponse');
const sanitizeUser = require('../utils/sanitizeUser');

// Get current user's profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Apply sanitization and format response
    const sanitizedUser = sanitizeUser(user);
    res.json(formatResponse(sanitizedUser));
  } catch (e) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Apply sanitizeUser with publicView option
    const sanitizedUser = sanitizeUser(user, { publicView: true });
    res.json(formatResponse(sanitizedUser));
  } catch (e) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update user profile
router.put('/profile', auth, validateUserProfile, async (req, res) => {
  try {
    const { username, description } = req.body;
    
    // Use findByIdAndUpdate for more efficient update in one operation
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        username, 
        description: description || undefined 
      },
      { 
        new: true,            // return updated document
        runValidators: true   // run schema validators
      }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Apply user data sanitization
    const sanitizedUser = sanitizeUser(updatedUser);
    res.json(formatResponse(sanitizedUser));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Change password
router.put('/change-password', auth, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is registered via Google
    if (user.googleId) {
      return res.status(403).json({
        message: 'Users registered via Google must change their password in their Google account settings',
        isGoogleUser: true
      });
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }
    
    // Hash and save new password
    const hashPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashPassword;
    
    await user.save();
    
    res.json(formatResponse({ message: 'Password changed successfully' }));
  } catch (e) {
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Change email
router.put('/change-email', auth, validateEmailChange, async (req, res) => {
  try {
    const { password, newEmail } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is registered via Google
    if (user.googleId) {
      return res.status(403).json({
        message: 'Users registered via Google must change their email in their Google account settings',
        isGoogleUser: true
      });
    }
    
    // Check if this email is already taken
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already in use' });
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }
    
    // Save old email (may be needed for notification)
    const oldEmail = user.email;
    
    // Update email and reset verification flag
    user.email = newEmail;
    user.isEmailVerified = false;
    
    await user.save();
    
    // Send email to confirm new email
    const transporter = require('../utils/mailer');
    const jwt = require('jsonwebtoken');
    
    const emailToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const url = `http://localhost:5000/api/auth/verify-email?token=${emailToken}`;

    try {
      await transporter.sendMail({
        to: newEmail,
        subject: 'Confirm your new email',
        html: `
          <h2>Confirm your new email</h2>
          <p>To complete the email change, follow this link:</p>
          <a href="${url}">${url}</a>
          <p>The link is valid for 1 hour.</p>
        `
      });
      
      // Send notification to old email
      await transporter.sendMail({
        to: oldEmail,
        subject: 'Email change notification',
        html: `
          <h2>Your email has been changed</h2>
          <p>The email in your account has been changed to: ${newEmail}</p>
          <p>If this was not you, contact the administration immediately.</p>
        `
      });
    } catch (err) {
      console.error('Error sending emails:', err);
    }
    
    res.json(formatResponse({ 
      message: 'Email changed successfully. Please confirm your new email by following the link in the email.',
      requiresVerification: true
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error changing email' });
  }
});

// Upload user avatar
router.post('/upload-avatar', auth, avatarUploader.single('avatar'), async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file was uploaded' });
    }

    // Get user from database
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user already has an avatar, delete it from Cloudinary
    if (user.image) {
      try {
        // Extract public_id from URL
        const publicId = user.image.split('/').pop().split('.')[0];
        // Determine folder based on URL
        const folder = user.image.includes('blog-avatars') ? 'blog-avatars' : 'blog-uploads';
        // Delete old image
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      } catch (error) {
        console.log('Error deleting old avatar:', error);
        // Continue even if deletion fails
      }
    }
    
    // Cloudinary returns the full URL in req.file.path
    const imageUrl = req.file.path;
    
    // Update user profile in one operation
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { image: imageUrl },
      { new: true }
    );
    
    // Sanitize user data before sending
    const sanitizedUser = sanitizeUser(updatedUser);
    
    res.json(formatResponse({ 
      message: 'Avatar uploaded successfully', 
      imageUrl,
      user: sanitizedUser
    }));
  } catch (e) {
    res.status(500).json({ message: 'Error uploading avatar' });
  }
});

// Delete user avatar
router.delete('/remove-avatar', auth, async (req, res) => {
  try {
    // Get user from database
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has an avatar to delete
    if (!user.image) {
      return res.status(400).json({ message: 'User does not have an avatar' });
    }
    
    // Extract public_id from URL and determine folder
    const publicId = user.image.split('/').pop().split('.')[0];
    const folder = user.image.includes('blog-avatars') ? 'blog-avatars' : 'blog-uploads';
    
    try {
      // Delete image from Cloudinary
      await cloudinary.uploader.destroy(`${folder}/${publicId}`);
    } catch (error) {
      console.log('Error deleting avatar from Cloudinary:', error);
      // Continue even if deletion fails
    }
    
    // Reset user avatar to null
    user.image = null;
    await user.save();
    
    res.json(formatResponse({ 
      message: 'Avatar deleted successfully'
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting avatar' });
  }
});

// Check user authentication type
router.get('/auth-type', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('googleId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(formatResponse({
      isGoogleUser: !!user.googleId,
      authType: user.googleId ? 'google' : 'email'
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error determining authentication type' });
  }
});

module.exports = router; 