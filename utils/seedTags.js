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
  { name: 'Nature', description: 'Environment, plants, animals, and natural world topics' },
  { name: 'Games', description: 'Video games, board games, gaming industry and game development' },
  { name: 'Design', description: 'Graphic design, UX/UI, web design and visual principles' },
  { name: 'Programming', description: 'Coding, software development and technical solutions' },
  { name: 'News', description: 'Current events, breaking news and informational content' },
  { name: 'Education', description: 'Learning resources, courses, and educational materials' },
  { name: 'Creativity', description: 'Creative arts, self-expression, and innovative ideas' },
  { name: 'Entertainment', description: 'Movies, TV shows, media and popular culture' },
  { name: 'Technology', description: 'Technology trends, gadgets, innovations and digital advances' }
];

// Функция для заполнения базы данных тегами
const seedTags = async () => {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    
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