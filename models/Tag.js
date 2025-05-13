const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true }, // URL-friendly версия
  description: { type: String },
  count: { type: Number, default: 0 }, // Количество использований
}, { timestamps: true });

// Индекс для быстрого поиска по slug
TagSchema.index({ slug: 1 });

// Индекс для сортировки по популярности
TagSchema.index({ count: -1 });

module.exports = mongoose.model('Tag', TagSchema); 