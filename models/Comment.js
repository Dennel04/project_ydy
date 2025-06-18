const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  likes: { type: Number, default: 0 }
}, { timestamps: true });

// Index for searching comments for a post
CommentSchema.index({ post: 1 });

// Index for searching comments by author
CommentSchema.index({ author: 1 });

// Index for sorting by the number of likes
CommentSchema.index({ likes: -1 });

// Composite index for searching comments for a post with sorting by date
CommentSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema); 