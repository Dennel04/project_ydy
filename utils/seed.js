const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
require('dotenv').config();

// Подключение к базе данных
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Тестовые пользователи
const users = [
  {
    login: 'user1',
    password: 'password1',
    username: 'Александр Иванов',
    email: 'user1@example.com',
    description: 'Веб-разработчик и блогер',
    isEmailVerified: true
  },
  {
    login: 'user2',
    password: 'password2',
    username: 'Елена Петрова',
    email: 'user2@example.com',
    description: 'Фотограф и путешественник',
    isEmailVerified: true
  },
  {
    login: 'user3',
    password: 'password3',
    username: 'Дмитрий Сидоров',
    email: 'user3@example.com',
    description: 'Писатель, автор технических статей',
    isEmailVerified: true
  }
];

// Тестовые посты для каждого пользователя
const createPostsForUser = (userId, username) => [
  {
    name: `Первый пост ${username}`,
    content: `Это мой первый пост на платформе! Здесь я буду делиться мыслями и идеями о технологиях, разработке и всем, что меня интересует. Следите за обновлениями!`,
    author: userId,
    tags: ['первый пост', 'приветствие'],
    isPublished: true
  },
  {
    name: `Интересные находки на GitHub`,
    content: `В этом посте я хочу поделиться несколькими интересными проектами, которые недавно нашел на GitHub. Они могут быть полезны для разработчиков и дизайнеров. Список проектов:\n\n1. Awesome React - коллекция ресурсов по React\n2. VS Code Extensions - лучшие расширения для VS Code\n3. UI Libraries - подборка библиотек для создания современных интерфейсов`,
    author: userId,
    tags: ['github', 'ресурсы', 'разработка'],
    isPublished: true
  }
];

// Функция для создания тестовых данных
const seedDatabase = async () => {
  try {
    // Очистим коллекции перед добавлением тестовых данных
    await User.deleteMany({});
    await Post.deleteMany({});
    
    console.log('Старые данные удалены');
    
    // Создаем пользователей
    const createdUsers = [];
    
    for (const userData of users) {
      const hashPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new User({
        ...userData,
        password: hashPassword
      });
      
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      
      console.log(`Создан пользователь: ${userData.username}`);
      
      // Создаем посты для пользователя
      const userPosts = createPostsForUser(savedUser._id, userData.username);
      
      for (const postData of userPosts) {
        const post = new Post(postData);
        const savedPost = await post.save();
        
        // Добавляем пост в список постов пользователя
        savedUser.posts.push(savedPost._id);
        
        console.log(`Создан пост: ${postData.name}`);
      }
      
      // Обновляем пользователя с новыми постами
      await savedUser.save();
    }
    
    console.log('База данных успешно заполнена тестовыми данными!');
    console.log('\nДанные для входа:');
    users.forEach(user => {
      console.log(`Логин: ${user.login}, Пароль: ${user.password}`);
    });
    
    // Завершаем подключение к базе данных
    await mongoose.connection.close();
    console.log('Соединение с базой данных закрыто');
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при заполнении базы данных:', error);
    process.exit(1);
  }
};

// Запуск функции
seedDatabase(); 