const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  isPublished: { type: Boolean, default: true },
  mainImage: { type: String }, // Main image of the post
  images: [{ type: String }],  // Array of URL embedded images
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Add indexes for optimization queries
// Index for searching by author
PostSchema.index({ author: 1 });

// Index for searching published posts
PostSchema.index({ isPublished: 1 });

// Index for text search by name and content
PostSchema.index({ name: 'text', content: 'text' });

// Index for sorting by creation date
PostSchema.index({ createdAt: -1 });

// Index for sorting by views
PostSchema.index({ views: -1 });

// Index for sorting by likes
PostSchema.index({ likes: -1 });

// Composite index for searching posts by tags and checking if the post is published
PostSchema.index({ tags: 1, isPublished: 1 });

module.exports = mongoose.model('Post', PostSchema); 