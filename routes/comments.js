const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
const formatResponse = require('../utils/formatResponse');

// Create a comment for a post
router.post('/:postId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length < 1) {
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const comment = new Comment({
      post: req.params.postId,
      author: req.user.userId,
      content
    });
    await comment.save();
    res.status(201).json(formatResponse(comment));
  } catch (e) {
    res.status(500).json({ message: 'Error creating comment' });
  }
});

// Get all comments for a post
router.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId }).sort({ createdAt: 1 });
    res.json(formatResponse(comments));
  } catch (e) {
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Get comment by ID
router.get('/comment/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.json(formatResponse(comment));
  } catch (e) {
    res.status(500).json({ message: 'Error fetching comment' });
  }
});

// Delete comment
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    // Only author or admin can delete
    if (comment.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You do not have permission to delete this comment' });
    }
    await comment.remove();
    res.json({ message: 'Comment deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

// Like/unlike comment
router.post('/like/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    const userId = req.user.userId;
    const index = comment.likes.indexOf(userId);
    if (index === -1) {
      comment.likes.push(userId);
      await comment.save();
      return res.json({ liked: true });
    } else {
      comment.likes.splice(index, 1);
      await comment.save();
      return res.json({ liked: false });
    }
  } catch (e) {
    res.status(500).json({ message: 'Error liking comment' });
  }
});

// Check if comment is liked
router.get('/isliked/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    const isLiked = comment.likes.includes(req.user.userId);
    res.json({ liked: isLiked });
  } catch (e) {
    res.status(500).json({ message: 'Error checking like status' });
  }
});

module.exports = router; 