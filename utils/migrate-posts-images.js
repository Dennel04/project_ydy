const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config();

async function migratePostsImages() {
  try {
    // Подключение к базе данных
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Подключено к MongoDB');

    // Найти все посты без полей mainImage и images
    const posts = await Post.find({
      $or: [
        { mainImage: { $exists: false } },
        { images: { $exists: false } }
      ]
    });

    console.log(`Найдено ${posts.length} постов для миграции`);

    // Обновить каждый пост
    for (const post of posts) {
      // Добавляем новые поля, если они отсутствуют
      if (!post.mainImage) post.mainImage = null;
      if (!post.images) post.images = [];
      
      await post.save();
    }

    console.log('Миграция завершена успешно');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка миграции:', error);
    process.exit(1);
  }
}

migratePostsImages();
