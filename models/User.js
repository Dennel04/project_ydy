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
  liked_comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
}, { timestamps: true });

// Индекс для поиска по логину (уже есть из-за unique: true)
// UserSchema.index({ login: 1 });

// Индекс для поиска по email (уже есть из-за unique: true)
// UserSchema.index({ email: 1 });

// Индекс для поиска по имени пользователя
UserSchema.index({ username: 1 });

// Индекс для проверки подтверждения email
UserSchema.index({ isEmailVerified: 1 });

module.exports = mongoose.model('User', UserSchema); 