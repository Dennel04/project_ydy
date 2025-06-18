const express = require('express');
const router = express.Router();
const Tag = require('../models/Tag');
const auth = require('../middleware/auth');
const formatResponse = require('../utils/formatResponse');

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tags = await Tag.find().sort({ count: -1 });
    res.json(formatResponse(tags));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching tags' });
  }
});

// Get tag by id
router.get('/:id', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    res.json(formatResponse(tag));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching tag' });
  }
});

// Get tag by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const tag = await Tag.findOne({ slug: req.params.slug });
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    res.json(formatResponse(tag));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching tag' });
  }
});

// Create a new tag (admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Admin rights check should be here
    // TODO: add isAdmin check
    
    const { name, description } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Tag name must be at least 2 characters long' });
    }
    
    // Create slug from name
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/[^\w-]+/g, '')  // Remove non-word characters and non-hyphens
      .replace(/--+/g, '-')     // Replace multiple hyphens with a single one
      .replace(/^-+/, '')       // Remove hyphens at the start
      .replace(/-+$/, '');      // Remove hyphens at the end
    
    // Check if tag with this slug already exists
    const existingTag = await Tag.findOne({ slug });
    if (existingTag) {
      return res.status(400).json({ message: 'A tag with this name already exists' });
    }
    
    const tag = new Tag({
      name,
      slug,
      description: description || '',
      count: 0
    });
    
    await tag.save();
    res.status(201).json(formatResponse(tag));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error creating tag' });
  }
});

// Update tag (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Admin rights check should be here
    // TODO: add isAdmin check
    
    const { name, description } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Tag name must be at least 2 characters long' });
    }
    
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    
    // Update only if name changed
    if (tag.name !== name) {
      // Create new slug
      const slug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
      
      // Check if this slug is taken by another tag
      const existingTag = await Tag.findOne({ slug, _id: { $ne: req.params.id } });
      if (existingTag) {
        return res.status(400).json({ message: 'A tag with this name already exists' });
      }
      
      tag.name = name;
      tag.slug = slug;
    }
    
    tag.description = description || tag.description;
    await tag.save();
    
    res.json(formatResponse(tag));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating tag' });
  }
});

// Delete tag (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Admin rights check should be here
    // TODO: add isAdmin check
    
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    
    // Delete tag
    await tag.remove();
    
    // TODO: Update all posts that use this tag
    
    res.json({ message: 'Tag deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting tag' });
  }
});

module.exports = router; 