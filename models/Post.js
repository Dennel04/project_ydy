const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  isPublished: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Добавляем индексы для оптимизации запросов
// Индекс для поиска по автору
PostSchema.index({ author: 1 });

// Индекс для поиска опубликованных постов
PostSchema.index({ isPublished: 1 });

// Индекс для текстового поиска по названию и содержимому
PostSchema.index({ name: 'text', content: 'text' });

// Индекс для сортировки по дате создания
PostSchema.index({ createdAt: -1 });

// Индекс для сортировки по просмотрам
PostSchema.index({ views: -1 });

// Индекс для сортировки по лайкам
PostSchema.index({ likes: -1 });

// Составной индекс для поиска постов по тегам и проверки, опубликован ли пост
PostSchema.index({ tags: 1, isPublished: 1 });

module.exports = mongoose.model('Post', PostSchema); 