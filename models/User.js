const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true },
  description: { type: String, default: '' },
  image: { type: String, default: null },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  liked_posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  favourite: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  email: { type: String, required: true, unique: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationExpires: { type: Date, default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) }, // 48 hours by default
  liked_comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  googleId: { type: String, index: true, sparse: true },
  
  // Security fields
  loginAttempts: { type: Number, default: 0 }, // Number of failed login attempts
  lockUntil: { type: Date, default: null },   // Time until account is locked
  passwordResetToken: { type: String },       // Password reset token
  passwordResetExpires: { type: Date },       // Password reset token expiration time
  lastPasswordChange: { type: Date }          // Last password change date
}, { timestamps: true });

// Index for login search (already exists due to unique: true)
// UserSchema.index({ login: 1 });

// Index for email search (already exists due to unique: true)
// UserSchema.index({ email: 1 });

// Index for username search
UserSchema.index({ username: 1 });

// Index for email verification check
UserSchema.index({ isEmailVerified: 1 });

// Index for blocked accounts search
UserSchema.index({ lockUntil: 1 });

// Virtual property for checking lock
UserSchema.virtual('isLocked').get(function() {
  // Check if lockUntil exists and if the lock time has expired
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = mongoose.model('User', UserSchema); 