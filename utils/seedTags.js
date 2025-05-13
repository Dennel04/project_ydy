const mongoose = require('mongoose');
const Tag = require('../models/Tag');
require('dotenv').config();

// Функция для создания slug из имени
const createSlug = (name) => {
  return name.toLowerCase()
    .replace(/\s+/g, '-')     // Заменяем пробелы на дефисы
    .replace(/[^\w-]+/g, '')  // Удаляем не-слова и не-дефисы
    .replace(/--+/g, '-')     // Заменяем несколько дефисов на один
    .replace(/^-+/, '')       // Удаляем дефисы в начале
    .replace(/-+$/, '');      // Удаляем дефисы в конце
};

// Список предопределенных тегов с описаниями
const tagsList = [
  { name: 'Technology', description: 'Posts about technology, gadgets, and digital trends' },
  { name: 'Programming', description: 'Coding, development, and software engineering topics' },
  { name: 'Health', description: 'Health and wellness related content' },
  { name: 'Science', description: 'Scientific discoveries and research' },
  { name: 'Business', description: 'Business strategies, entrepreneurship, and finance' },
  { name: 'Education', description: 'Learning resources, educational content, and teaching methods' },
  { name: 'Travel', description: 'Travel destinations, tips, and experiences' },
  { name: 'Food', description: 'Recipes, culinary arts, and food culture' },
  { name: 'Sports', description: 'Sports news, fitness, and athletic achievements' },
  { name: 'Art', description: 'Visual arts, design, and creative expression' },
  { name: 'Music', description: 'Music genres, artists, and audio content' },
  { name: 'Literature', description: 'Books, writing, and literary discussions' },
  { name: 'Politics', description: 'Political news, opinions, and global affairs' },
  { name: 'Environment', description: 'Environmental issues, sustainability, and nature' },
  { name: 'Fashion', description: 'Fashion trends, style guides, and clothing' },
  { name: 'Entertainment', description: 'Movies, TV shows, and popular culture' },
  { name: 'History', description: 'Historical events, figures, and cultural heritage' },
  { name: 'Psychology', description: 'Human behavior, mental health, and psychological concepts' },
  { name: 'Philosophy', description: 'Philosophical ideas, ethics, and critical thinking' },
  { name: 'Photography', description: 'Photography techniques, equipment, and visual storytelling' }
];

// Функция для заполнения базы данных тегами
const seedTags = async () => {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected for seeding tags');
    
    // Удаляем существующие теги, если они есть
    await Tag.deleteMany({});
    console.log('Existing tags cleared');
    
    // Преобразуем список тегов, добавляя slug
    const tagsWithSlugs = tagsList.map(tag => ({
      ...tag,
      slug: createSlug(tag.name)
    }));
    
    // Добавляем теги в базу данных
    await Tag.insertMany(tagsWithSlugs);
    console.log(`${tagsWithSlugs.length} tags successfully added to the database`);
    
    // Закрываем соединение с MongoDB
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tags:', error);
    process.exit(1);
  }
};

// Запускаем функцию заполнения тегов
seedTags(); 