const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const transporter = require('../utils/mailer');
const passport = require('passport');
const { authLimiter } = require('../middleware/rateLimiter');
const { setTokenCookie, clearTokenCookie } = require('../middleware/secureTokens');
const formatResponse = require('../utils/formatResponse');
const sanitizeUser = require('../utils/sanitizeUser');

// Connect passport configuration
require('../config/passport');

// Apply rate limiter to all authentication routes
router.use(authLimiter);

// Registration
router.post('/register', async (req, res) => {
  try {
    const { login, password, username, description, email } = req.body;
    
    // Improved validation
    if (!login || login.length < 4) {
      return res.status(400).json({ message: 'Login must contain at least 4 characters' });
    }
    
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters' });
    }
    
    // Password complexity check
    const passwordRegex = /^(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must contain at least 8 characters and at least one digit' 
      });
    }
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Remove expired unverified accounts with the same login or email
    await User.deleteMany({
      $or: [
        { login, isEmailVerified: false, emailVerificationExpires: { $lt: new Date() } },
        { email, isEmailVerified: false, emailVerificationExpires: { $lt: new Date() } }
      ]
    });
    
    // Check if an active user with this login exists
    const candidateLogin = await User.findOne({ login });
    if (candidateLogin) {
      if (!candidateLogin.isEmailVerified) {
        // If there is an unverified user with this login,
        // suggest to resend the email or register again later
        const hoursLeft = Math.ceil((candidateLogin.emailVerificationExpires - new Date()) / (1000 * 60 * 60));
        return res.status(400).json({ 
          message: `User with this login is already registered, but did not confirm email. Please try again in ${hoursLeft} hours`,
          pendingVerification: true 
        });
      }
      return res.status(400).json({ message: 'User with this login already exists' });
    }
    
    // Check if an active user with this email exists
    const candidateEmail = await User.findOne({ email });
    if (candidateEmail) {
      if (!candidateEmail.isEmailVerified) {
        // If there is an unverified user with this email,
        // suggest to resend the email or register again later
        const hoursLeft = Math.ceil((candidateEmail.emailVerificationExpires - new Date()) / (1000 * 60 * 60));
        return res.status(400).json({ 
          message: `Email is already registered, but not confirmed. Please try again in ${hoursLeft} hours`,
          pendingVerification: true 
        });
      }
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Enhanced password hashing
    const salt = await bcrypt.genSalt(12); // increase salt complexity
    const hashPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = new User({
      login,
      password: hashPassword,
      username,
      description: description || '',
      email,
      emailVerificationExpires: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour for confirmation
    });
    await user.save();

    // Send email confirmation
    const emailToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const url = `${process.env.API_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${emailToken}`;

    try {
      await transporter.sendMail({
        to: user.email,
        subject: 'Registration Confirmation',
        html: `
          <h2>Confirm Registration</h2>
          <p>To complete registration, please click the link:</p>
          <a href="${url}">${url}</a>
          <p>Link is valid for 1 hour.</p>
        `
      });
    } catch (err) {
      console.error('Error sending email:', err);
    }

    res.status(201).json({ message: 'Check your email for confirmation' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    if (!login || !password) {
      return res.status(400).json({ message: 'Enter login and password' });
    }
    
    // Find user
    const user = await User.findOne({ login });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    if (!user.isEmailVerified) {
      return res.status(400).json({ message: 'Confirm email to log in' });
    }
    
    // Check account lock
    if (user.lockUntil && user.lockUntil > Date.now()) {
      // Calculate remaining lock time in minutes
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(400).json({ 
        message: `Account temporarily blocked. Please try again in ${remainingMinutes} minutes`, 
        lockUntil: user.lockUntil,
        remainingMinutes
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increase failed attempts counter
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Block account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        const lockTime = 30 * 60 * 1000; // 30 minutes in milliseconds
        user.lockUntil = Date.now() + lockTime;
        
        await user.save();
        
        return res.status(400).json({ 
          message: 'Exceeded login attempts. Account blocked for 30 minutes', 
          lockUntil: user.lockUntil,
          remainingMinutes: 30
        });
      }
      
      await user.save();
      
      // Inform user how many attempts are left
      const attemptsLeft = 5 - user.loginAttempts;
      return res.status(400).json({ 
        message: `Incorrect password. Remaining attempts: ${attemptsLeft}`,
        attemptsLeft
      });
    }
    
    // Successful login: reset attempts and lock time
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set token in HttpOnly cookie
    setTokenCookie(res, token, '7d');
    
    // Sanitize user data before sending
    const sanitizedUser = sanitizeUser(user);
    
    // Basic response with user data
    const response = { user: sanitizedUser };
    
    // Return token only in development or for testing
    if (process.env.NODE_ENV !== 'production' || req.query.testing === 'true') {
      response.token = token;
    }
    
    // Send user data
    res.json(formatResponse(response));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  // Remove token cookie
  clearTokenCookie(res);
  res.json({ message: 'Successful logout' });
});

// Email verification
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already confirmed' });
    }
    user.isEmailVerified = true;
    await user.save();
    res.json({ message: 'Email confirmed successfully! You can now log in.' });
  } catch (e) {
    res.status(400).json({ message: 'Invalid or expired link' });
  }
});

// Google OAuth routes
// Start Google authentication
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Callback URL for Google OAuth
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    try {
      // Create JWT token
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set token in HttpOnly cookie
      setTokenCookie(res, token, '7d');
      
      // Redirect to frontend
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${redirectUrl}/auth/google-callback`);
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect('/login?error=auth_failed');
    }
  }
);

// Google authentication verification
router.post('/google/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token not provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Sanitize user data
    const sanitizedUser = sanitizeUser(user);
    
    // Use formatResponse for formatting
    res.json(formatResponse({
      token,
      user: sanitizedUser
    }));
  } catch (error) {
    console.error('Error verifying Google token:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Token refresh
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Refresh token not provided' });
    }
    
    // Verify existing token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Check if user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.isEmailVerified) {
      return res.status(400).json({ message: 'Confirm email to log in' });
    }
    
    // Generate new access token
    const newToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set token in HttpOnly cookie
    setTokenCookie(res, newToken, '7d');
    
    // Sanitize user data before sending
    const sanitizedUser = sanitizeUser(user);
    
    // Basic response with user data
    const response = { user: sanitizedUser };
    
    // Return token only in development or for testing
    if (process.env.NODE_ENV !== 'production' || req.query.testing === 'true') {
      response.token = newToken;
    }
    
    // Send user data
    res.json(formatResponse(response));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get one post by id
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Increase view counter
    post.views += 1;
    await post.save();
    
    // Format response before sending
    res.json(formatResponse(post));
  } catch (e) {
    res.status(500).json({ message: 'Error getting post' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If email is already confirmed
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already confirmed' });
    }
    
    // Update verification expiration
    user.emailVerificationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await user.save();
    
    // Create token for confirmation
    const emailToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '48h' } // Increase token lifetime
    );
    
    const url = `${process.env.API_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${emailToken}`;
    
    // Send email
    try {
      await transporter.sendMail({
        to: user.email,
        subject: 'Registration Confirmation (resend)',
        html: `
          <h2>Resend Registration Confirmation</h2>
          <p>To complete registration, please click the link:</p>
          <a href="${url}">${url}</a>
          <p>Link is valid for 48 hours.</p>
        `
      });
      
      res.json({ message: 'Registration confirmation email sent' });
    } catch (err) {
      console.error('Error sending email:', err);
      res.status(500).json({ message: 'Error sending email' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 