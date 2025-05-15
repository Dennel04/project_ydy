const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
const formatResponse = require('../utils/formatResponse');

// Создать комментарий (только авторизованный пользователь)
router.post('/:postId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    // Проверяем существование поста
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }
    
    const comment = new Comment({
      text,
      author: req.user.userId,
      post: req.params.postId
    });
    
    const savedComment = await comment.save();
    
    // Добавляем комментарий в массив комментариев поста
    post.comments.push(savedComment._id);
    await post.save();
    
    // Возвращаем комментарий с данными автора
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('author', 'username');
    
    res.status(201).json(formatResponse(populatedComment));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при создании комментария' });
  }
});

// Получить все комментарии к посту
router.get('/post/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    
    res.json(formatResponse(comments));
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении комментариев' });
  }
});

// Удалить комментарий (только автор комментария)
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Комментарий не найден' });
    }
    
    // Проверяем, что текущий пользователь - автор комментария
    if (comment.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Нет доступа к удалению комментария' });
    }
    
    // Удаляем комментарий из массива комментариев поста
    await Post.updateOne(
      { _id: comment.post },
      { $pull: { comments: comment._id } }
    );
    
    await Comment.deleteOne({ _id: comment._id });
    res.json({ message: 'Комментарий успешно удалён' });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при удалении комментария' });
  }
});

// Поставить/убрать лайк комментарию
router.post('/like/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Комментарий не найден' });
    }
    
    const user = await User.findById(req.user.userId);
    
    // Проверяем, есть ли уже лайк от этого пользователя
    const index = user.liked_comments.findIndex(commentId => 
      commentId.toString() === comment._id.toString()
    );
    
    if (index === -1) {
      // Лайка нет - добавляем
      user.liked_comments.push(comment._id);
      comment.likes += 1;
      await user.save();
      await comment.save();
      return res.json({ message: 'Лайк добавлен', likes: comment.likes });
    } else {
      // Лайк есть - удаляем
      user.liked_comments.splice(index, 1);
      comment.likes = Math.max(0, comment.likes - 1); // Защита от отрицательных лайков
      await user.save();
      await comment.save();
      return res.json({ message: 'Лайк удален', likes: comment.likes });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при обработке лайка комментария' });
  }
});

// Проверить, поставил ли пользователь лайк комментарию
router.get('/isliked/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const isLiked = user.liked_comments.some(commentId => 
      commentId.toString() === req.params.id
    );
    
    res.json({ isLiked });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при проверке лайка комментария' });
  }
});

module.exports = router; 