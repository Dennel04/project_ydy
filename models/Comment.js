const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  likes: { type: Number, default: 0 }
}, { timestamps: true });

// Индекс для поиска комментариев к посту
CommentSchema.index({ post: 1 });

// Индекс для поиска комментариев по автору
CommentSchema.index({ author: 1 });

// Индекс для сортировки по количеству лайков
CommentSchema.index({ likes: -1 });

// Составной индекс для поиска комментариев к посту с сортировкой по дате
CommentSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema); 