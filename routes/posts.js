const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
const upload = require('../middleware/upload');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');

// Создать пост (только авторизованный пользователь)
router.post('/', auth, async (req, res) => {
  try {
    const { name, content, tags, isPublished } = req.body;
    
    // Валидация входных данных
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Название поста должно содержать минимум 3 символа' });
    }
    
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ message: 'Содержание поста должно содержать минимум 10 символов' });
    }
    
    // Проверяем теги
    if (tags && Array.isArray(tags)) {
      // Проверяем, что каждый тег - строка и имеет разумную длину
      const invalidTags = tags.filter(tag => typeof tag !== 'string' || tag.trim().length < 2 || tag.trim().length > 20);
      if (invalidTags.length > 0) {
        return res.status(400).json({ message: 'Теги должны быть строками длиной от 2 до 20 символов' });
      }
    }
    
    const post = new Post({
      name,
      content,
      tags: tags || [],
      isPublished: isPublished !== undefined ? isPublished : true,
      author: req.user.userId
    });
    
    await post.save();
    res.status(201).json(post);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при создании поста' });
  }
});

// Получить все посты (доступно всем)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении постов' });
  }
});

// Получить все посты пользователя
router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении постов пользователя' });
  }
});

// Получить один пост по id
router.get('/:id', async (req, res) => {
    try {
      const post = await Post.findById(req.params.id).populate('author', 'username');
      if (!post) {
        return res.status(404).json({ message: 'Пост не найден' });
      }
      
      // Увеличиваем счётчик просмотров
      post.views += 1;
      await post.save();
      
      res.json(post);
    } catch (e) {
      res.status(500).json({ message: 'Ошибка при получении поста' });
    }
  });

// Редактировать пост (только автор)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, content, tags, isPublished } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }
    
    // Проверяем, что текущий пользователь - автор поста
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Нет доступа к редактированию поста' });
    }
    
    // Обновляем поля
    post.name = name || post.name;
    post.content = content || post.content;
    post.tags = tags || post.tags;
    post.isPublished = isPublished !== undefined ? isPublished : post.isPublished;
    
    await post.save();
    res.json(post);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при редактировании поста' });
  }
});

// Удалить пост (только автор)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }
    
    // Проверяем, что текущий пользователь - автор поста
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Нет доступа к удалению поста' });
    }
    
    // Транзакционный подход - используем mongoose сессию
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Удаляем пост
      await Post.deleteOne({ _id: post._id }, { session });
      
      // Удаляем все комментарии поста
      await Comment.deleteMany({ post: post._id }, { session });
      
      // Удаляем ссылки на пост из коллекций liked_posts и favourite у всех пользователей
      await User.updateMany(
        { $or: [
          { liked_posts: post._id },
          { favourite: post._id }
        ]},
        { 
          $pull: { 
            liked_posts: post._id,
            favourite: post._id 
          }
        },
        { session }
      );
      
      // Фиксируем транзакцию
      await session.commitTransaction();
      
      res.json({ message: 'Пост и все связанные данные успешно удалены' });
    } catch (error) {
      // Отменяем транзакцию в случае ошибки
      await session.abortTransaction();
      throw error;
    } finally {
      // Заканчиваем сессию
      session.endSession();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при удалении поста' });
  }
});

// Поставить/убрать лайк посту
router.post('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }
    
    const user = await User.findById(req.user.userId);
    
    // Проверяем, есть ли уже лайк от этого пользователя
    const index = user.liked_posts.findIndex(postId => 
      postId.toString() === post._id.toString()
    );
    
    if (index === -1) {
      // Лайка нет - добавляем
      user.liked_posts.push(post._id);
      post.likes += 1;
      await user.save();
      await post.save();
      return res.json({ message: 'Лайк добавлен', likes: post.likes });
    } else {
      // Лайк есть - удаляем
      user.liked_posts.splice(index, 1);
      post.likes = Math.max(0, post.likes - 1); // Защита от отрицательных лайков
      await user.save();
      await post.save();
      return res.json({ message: 'Лайк удален', likes: post.likes });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при обработке лайка' });
  }
});

// Проверить, поставил ли пользователь лайк посту
router.get('/isliked/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const isLiked = user.liked_posts.some(postId => 
      postId.toString() === req.params.id
    );
    
    res.json({ isLiked });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при проверке лайка' });
  }
});

// Добавить/убрать пост из избранного
router.post('/favourite/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }
    
    const user = await User.findById(req.user.userId);
    
    // Проверяем, есть ли уже пост в избранном
    const index = user.favourite.findIndex(postId => 
      postId.toString() === post._id.toString()
    );
    
    if (index === -1) {
      // Поста нет в избранном - добавляем
      user.favourite.push(post._id);
      await user.save();
      return res.json({ message: 'Пост добавлен в избранное', inFavourite: true });
    } else {
      // Пост уже в избранном - удаляем
      user.favourite.splice(index, 1);
      await user.save();
      return res.json({ message: 'Пост удален из избранного', inFavourite: false });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при обработке избранного' });
  }
});

// Проверить, находится ли пост в избранном у пользователя
router.get('/isfavourite/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const isFavourite = user.favourite.some(postId => 
      postId.toString() === req.params.id
    );
    
    res.json({ isFavourite });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при проверке избранного' });
  }
});

// Получить все избранные посты пользователя
router.get('/favourites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate({
      path: 'favourite',
      populate: { path: 'author', select: 'username' }
    });
    
    res.json(user.favourite);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении избранных постов' });
  }
});

// Поиск и фильтрация постов
router.get('/search', async (req, res) => {
  try {
    const { 
      query, // поисковый запрос
      tag,   // фильтр по тегу
      author,// фильтр по автору
      sort,  // сортировка: date, views, likes
      limit = 10,  // количество постов на странице
      page = 1     // номер страницы
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Строим фильтр
    const filter = { isPublished: true };
    
    // Поиск по тексту
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Фильтр по тегу
    if (tag) {
      filter.tags = tag;
    }
    
    // Фильтр по автору
    if (author) {
      filter.author = author;
    }
    
    // Определяем сортировку
    let sortOption = { createdAt: -1 }; // по умолчанию - сначала новые
    
    if (sort === 'views') {
      sortOption = { views: -1 };
    } else if (sort === 'likes') {
      sortOption = { likes: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }
    
    // Получаем общее количество постов
    const total = await Post.countDocuments(filter);
    
    // Получаем посты с пагинацией
    const posts = await Post.find(filter)
      .populate('author', 'username')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при поиске постов' });
  }
});

// Загрузить изображение для поста
router.post('/upload-image/:id', auth, upload.single('image'), async (req, res, next) => {
  try {
    // Проверяем, загружен ли файл
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не был загружен' });
    }

    // Находим пост в базе
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }
    
    // Проверяем, что текущий пользователь - автор поста
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Нет доступа к редактированию поста' });
    }
    
    // URL для доступа к изображению
    const imageUrl = `${req.protocol}://${req.get('host')}${req.file.path.replace('\\', '/')}`;
    
    // Сохраняем URL изображения в посте
    post.image = imageUrl;
    await post.save();
    
    res.json({ 
      message: 'Изображение успешно загружено', 
      imageUrl
    });
  } catch (e) {
    console.error(e);
    next(e); // Передаем ошибку глобальному обработчику
  }
});

module.exports = router; 