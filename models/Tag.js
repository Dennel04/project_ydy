const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, index: true }, // URL-friendly version
  description: { type: String },
  count: { type: Number, default: 0 }, // Usage count
}, { timestamps: true });

// Index for fast search by slug
// TagSchema.index({ slug: 1 });

// Index for sorting by popularity
TagSchema.index({ count: -1 });

module.exports = mongoose.model('Tag', TagSchema); 