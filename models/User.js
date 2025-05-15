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
  liked_comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  googleId: { type: String, sparse: true },
  
  // Поля для безопасности
  loginAttempts: { type: Number, default: 0 }, // Количество неудачных попыток входа
  lockUntil: { type: Date, default: null },   // Время, до которого аккаунт заблокирован
  passwordResetToken: { type: String },       // Токен для сброса пароля
  passwordResetExpires: { type: Date },       // Время истечения токена сброса пароля
  lastPasswordChange: { type: Date }          // Дата последней смены пароля
}, { timestamps: true });

// Индекс для поиска по логину (уже есть из-за unique: true)
// UserSchema.index({ login: 1 });

// Индекс для поиска по email (уже есть из-за unique: true)
// UserSchema.index({ email: 1 });

// Индекс для поиска по имени пользователя
UserSchema.index({ username: 1 });

// Индекс для проверки подтверждения email
UserSchema.index({ isEmailVerified: 1 });

// Добавляем индекс для поиска по googleId
UserSchema.index({ googleId: 1 });

// Индекс для поиска заблокированных аккаунтов
UserSchema.index({ lockUntil: 1 });

// Виртуальное свойство для проверки блокировки
UserSchema.virtual('isLocked').get(function() {
  // Проверяем, существует ли lockUntil и не истекло ли время блокировки
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = mongoose.model('User', UserSchema); 