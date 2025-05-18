const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Tag = require('../models/Tag');
const upload = require('../middleware/cloudinaryUpload');
const postImageUpload = require('../middleware/postImageUpload');
const createPostUpload = require('../middleware/createPostUpload');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const formatResponse = require('../utils/formatResponse');
const cloudinary = require('../utils/cloudinary');

// Создать пост (только авторизованный пользователь)
router.post('/', auth, createPostUpload, async (req, res) => {
  try {
    const { name, content, isPublished } = req.body;
    let tags = req.body.tags;
    
    // Валидация входных данных
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Название поста должно содержать минимум 3 символа' });
    }
    
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ message: 'Содержание поста должно содержать минимум 10 символов' });
    }
    
    // Проверяем теги
    let tagIds = [];
    if (tags) {
      // Если tags передан как строка, преобразуем его в массив
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags);
        } catch (e) {
          // Если это одиночное значение, создаем массив из него
          tags = [tags];
        }
      }
      
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
    
    // Обрабатываем загруженные изображения, если они есть
    let mainImageUrl = null;
    let contentImagesUrls = [];
    
    // Если есть загруженные файлы
    if (req.files) {
      // Если загружено главное изображение
      if (req.files.mainImage && req.files.mainImage.length > 0) {
        mainImageUrl = req.files.mainImage[0].path;
      }
      
      // Если загружены дополнительные изображения
      if (req.files.contentImages && req.files.contentImages.length > 0) {
        contentImagesUrls = req.files.contentImages.map(file => file.path);
      }
    }
    
    // Если изображения переданы как URL-строки
    if (req.body.mainImage) {
      mainImageUrl = req.body.mainImage;
    }
    
    if (req.body.images && Array.isArray(req.body.images)) {
      contentImagesUrls = req.body.images;
    }
    
    // Создаем пост
    const post = new Post({
      name,
      content,
      tags: tagIds,
      isPublished: isPublished !== undefined ? isPublished : true,
      author: req.user.userId,
      mainImage: mainImageUrl,
      images: contentImagesUrls
    });
    
    await post.save();
    
    // Отправляем пост с заполненными тегами
    const populatedPost = await Post.findById(post._id)
      .populate('tags', 'name slug')
      .populate('author', 'username');
    
    res.status(201).json(formatResponse(populatedPost));
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
    res.json(formatResponse(posts));
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
    
    res.json(formatResponse(posts));
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
    
    res.json(formatResponse(post));
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении поста' });
  }
});

// Редактировать пост (только автор)
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { name, content, tags, isPublished, mainImage, images } = req.body;
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
    
    // Обновляем изображения, если они предоставлены
    if (mainImage !== undefined) {
      post.mainImage = mainImage;
    }
    
    if (images !== undefined) {
      post.images = images;
    }
    
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
    
    res.json(formatResponse(updatedPost));
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
      posts: formatResponse(posts),
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

// Загрузить главное изображение для поста
router.post('/upload-main-image/:id', auth, postImageUpload.single('image'), async (req, res, next) => {
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
    
    // Если у поста уже есть главное изображение, удаляем его из Cloudinary
    if (post.mainImage) {
      try {
        // Извлекаем public_id из URL
        const publicId = post.mainImage.split('/').pop().split('.')[0];
        // Определяем папку на основе URL
        const folder = post.mainImage.includes('blog-post-images') ? 'blog-post-images' : 'blog-uploads';
        // Удаляем старое изображение
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      } catch (error) {
        console.log('Ошибка при удалении старого главного изображения поста:', error);
        // Продолжаем работу даже при ошибке удаления
      }
    }
    
    // Cloudinary возвращает полный URL в req.file.path
    const imageUrl = req.file.path;
    
    // Сохраняем URL главного изображения в посте
    post.mainImage = imageUrl;
    await post.save();
    
    res.json({ 
      message: 'Главное изображение успешно загружено', 
      imageUrl
    });
  } catch (e) {
    console.error(e);
    next(e); // Передаем ошибку глобальному обработчику
  }
});

// Загрузить дополнительное изображение для поста
router.post('/upload-content-image/:id', auth, postImageUpload.single('image'), async (req, res, next) => {
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
    
    // Cloudinary возвращает полный URL в req.file.path
    const imageUrl = req.file.path;
    
    // Добавляем URL изображения в массив
    if (!post.images) {
      post.images = [];
    }
    post.images.push(imageUrl);
    await post.save();
    
    res.json({ 
      message: 'Изображение контента успешно загружено', 
      imageUrl
    });
  } catch (e) {
    console.error(e);
    next(e); // Передаем ошибку глобальному обработчику
  }
});

// Удалить изображение из контента поста
router.delete('/delete-content-image/:id', auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'URL изображения не указан' });
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
    
    // Проверяем, есть ли изображение в массиве
    if (!post.images || !post.images.includes(imageUrl)) {
      return res.status(404).json({ message: 'Изображение не найдено в посте' });
    }
    
    // Удаляем изображение из Cloudinary
    try {
      // Извлекаем public_id из URL
      const publicId = imageUrl.split('/').pop().split('.')[0];
      // Определяем папку на основе URL
      const folder = imageUrl.includes('blog-post-images') ? 'blog-post-images' : 'blog-uploads';
      // Удаляем изображение
      await cloudinary.uploader.destroy(`${folder}/${publicId}`);
    } catch (error) {
      console.log('Ошибка при удалении изображения из Cloudinary:', error);
      // Продолжаем работу даже при ошибке удаления
    }
    
    // Удаляем URL из массива
    post.images = post.images.filter(img => img !== imageUrl);
    await post.save();
    
    res.json({ 
      message: 'Изображение успешно удалено', 
      images: post.images
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при удалении изображения' });
  }
});

// Удалить главное изображение поста
router.delete('/delete-main-image/:id', auth, async (req, res) => {
  try {
    // Находим пост в базе
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }
    
    // Проверяем, что текущий пользователь - автор поста
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Нет доступа к редактированию поста' });
    }
    
    // Проверяем, есть ли главное изображение
    if (!post.mainImage) {
      return res.status(400).json({ message: 'У поста нет главного изображения' });
    }
    
    // Удаляем изображение из Cloudinary
    try {
      const publicId = post.mainImage.split('/').pop().split('.')[0];
      const folder = post.mainImage.includes('blog-post-images') ? 'blog-post-images' : 'blog-uploads';
      await cloudinary.uploader.destroy(`${folder}/${publicId}`);
    } catch (error) {
      console.log('Ошибка при удалении главного изображения из Cloudinary:', error);
    }
    
    // Удаляем URL главного изображения из поста
    post.mainImage = null;
    await post.save();
    
    res.json({ 
      message: 'Главное изображение успешно удалено'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при удалении главного изображения' });
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