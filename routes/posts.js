const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Tag = require('../models/Tag');
const upload = require('../middleware/cloudinaryUpload');
const postImageUpload = require('../middleware/postImageUpload');
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
    let tagIds = [];
    if (tags && Array.isArray(tags)) {
      // Получаем ID тегов и проверяем их существование
      for (const tagId of tags) {
        const tag = await Tag.findById(tagId);
        if (!tag) {
          return res.status(400).json({ message: `Тег с ID ${tagId} не найден` });
        }
        tagIds.push(tag._id);
        
        // Увеличиваем счетчик использования тега
        tag.count += 1;
        await tag.save();
      }
    }
    
    const post = new Post({
      name,
      content,
      tags: tagIds,
      isPublished: isPublished !== undefined ? isPublished : true,
      author: req.user.userId
    });
    
    await post.save();
    
    // Отправляем пост с заполненными тегами
    const populatedPost = await Post.findById(post._id)
      .populate('tags', 'name slug')
      .populate('author', 'username');
    
    res.status(201).json(populatedPost);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при создании поста' });
  }
});

// Получить все посты (доступно всем)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username')
      .populate('tags', 'name slug')
      .sort({ createdAt: -1 });
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
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('tags', 'name slug');
    
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
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { name, content, tags, isPublished } = req.body;
    const post = await Post.findById(req.params.id).session(session);
    
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
    post.isPublished = isPublished !== undefined ? isPublished : post.isPublished;
    
    // Обрабатываем теги, если они предоставлены
    if (tags && Array.isArray(tags)) {
      const oldTagIds = post.tags.map(tag => tag.toString());
      let newTagIds = [];
      
      // Получаем ID тегов и проверяем их существование
      for (const tagId of tags) {
        const tag = await Tag.findById(tagId).session(session);
        if (!tag) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: `Тег с ID ${tagId} не найден` });
        }
        newTagIds.push(tag._id.toString());
        
        // Если это новый тег для поста, увеличиваем счетчик
        if (!oldTagIds.includes(tag._id.toString())) {
          tag.count += 1;
          await tag.save({ session });
        }
      }
      
      // Уменьшаем счетчики для удаленных тегов
      for (const oldTagId of oldTagIds) {
        if (!newTagIds.includes(oldTagId)) {
          const tag = await Tag.findById(oldTagId).session(session);
          if (tag) {
            tag.count = Math.max(0, tag.count - 1); // Не уходим в минус
            await tag.save({ session });
          }
        }
      }
      
      // Обновляем теги в посте
      post.tags = tags;
    }
    
    await post.save({ session });
    
    // Фиксируем транзакцию
    await session.commitTransaction();
    session.endSession();
    
    // Возвращаем обновленный пост с заполненными данными
    const updatedPost = await Post.findById(post._id)
      .populate('tags', 'name slug')
      .populate('author', 'username');
    
    res.json(updatedPost);
  } catch (e) {
    // Отменяем транзакцию в случае ошибки
    await session.abortTransaction();
    session.endSession();
    
    console.error(e);
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
router.post('/upload-image/:id', auth, postImageUpload.single('image'), async (req, res, next) => {
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
    
    // Если у поста уже есть изображение, удаляем его из Cloudinary
    if (post.image) {
      try {
        // Извлекаем public_id из URL
        const publicId = post.image.split('/').pop().split('.')[0];
        // Определяем папку на основе URL
        const folder = post.image.includes('blog-post-images') ? 'blog-post-images' : 'blog-uploads';
        // Удаляем старое изображение
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      } catch (error) {
        console.log('Ошибка при удалении старого изображения поста:', error);
        // Продолжаем работу даже при ошибке удаления
      }
    }
    
    // Cloudinary возвращает полный URL в req.file.path
    const imageUrl = req.file.path;
    
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

// Получить посты по тегу
router.get('/bytag/:tagId', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.tagId);
    if (!tag) {
      return res.status(404).json({ message: 'Тег не найден' });
    }
    
    const posts = await Post.find({ 
      tags: req.params.tagId,
      isPublished: true 
    })
    .populate('author', 'username')
    .populate('tags', 'name slug')
    .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при получении постов по тегу' });
  }
});

module.exports = router; 