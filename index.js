const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { apiLimiter } = require('./middleware/rateLimiter');
const securityHeaders = require('./middleware/securityHeaders');
const { csrfProtection, csrfToken, getNewCsrfToken } = require('./middleware/csrfProtection');
require('dotenv').config();

// Проверка наличия необходимых переменных окружения
const requiredEnvVars = [
  'JWT_SECRET', 
  'MONGO_URI', 
  'GMAIL_USER', 
  'GMAIL_PASS',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'CSRF_SECRET'
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Ошибка: Отсутствуют следующие переменные окружения:');
  console.error(missingEnvVars.join(', '));
  process.exit(1); // Завершаем процесс с ошибкой
}

const app = express();

// Настройка CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.CORS_ORIGIN || 'https://blog-api-wpbz.onrender.com',
        'null', // Разрешаем запросы из локальных файлов
        'file://',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://file.io' // Разрешаем запросы из файлового хостинга
      ]
    : '*', // В режиме разработки разрешаем все запросы
  credentials: true, // Разрешаем отправку куков и аутентификационных заголовков
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

// Безопасные заголовки
app.use(securityHeaders);

// Middleware
app.use(morgan('dev')); // Логирование запросов
app.use(express.json({ limit: '1mb' })); // Ограничиваем размер JSON
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Ограничиваем размер данных формы

// Cookie parser для работы с cookies
app.use(cookieParser());

// Настройка сессий для работы с CSRF
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// CSRF защита
app.use(csrfToken);
app.use(csrfProtection);

// Лимитирование запросов
app.use('/api/', apiLimiter);

// Инициализируем Passport
app.use(passport.initialize());

// Настраиваем папку для загруженных файлов
// В production используем папку из переменной окружения или '/tmp/uploads'
const uploadDir = process.env.NODE_ENV === 'production' 
  ? process.env.UPLOAD_DIR || '/tmp/uploads' 
  : 'uploads';

// Создаем папку, если она не существует
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000, // увеличенный таймаут
  socketTimeoutMS: 30000    // увеличенный таймаут сокета
})
.then(() => console.log('MongoDB connected'))
.catch((err) => {
  console.error('MongoDB connection error:');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  
  if (err.code) {
    console.error('Error code:', err.code);
  }
  
  if (err.name === 'MongoNetworkError') {
    console.error('Возможно, проблема с сетевым подключением или правилами брандмауэра');
  } else if (err.name === 'MongoServerSelectionError') {
    console.error('Не удалось подключиться к серверу MongoDB. Проверьте URI и доступность сервера');
  } else if (err.message && err.message.includes('Authentication failed')) {
    console.error('Ошибка аутентификации. Проверьте имя пользователя и пароль');
  }
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const postsRoutes = require('./routes/posts');
app.use('/api/posts', postsRoutes);

const commentsRoutes = require('./routes/comments');
app.use('/api/comments', commentsRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

const tagsRoutes = require('./routes/tags');
app.use('/api/tags', tagsRoutes);

const errorHandler = require('./middleware/error');

// Обработка ошибок должна быть после всех маршрутов
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('API is running');
});

// Создаем специальный маршрут для CSRF токена
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = getNewCsrfToken(req, res);
  res.json({ csrfToken });
});

// Маршрут для проверки CORS
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS настроен правильно!',
    origin: req.headers.origin || 'Неизвестный источник',
    time: new Date().toISOString()
  });
});

// Обработка ошибок 404
app.use((req, res, next) => {
  res.status(404).json({ message: 'Не найдено' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Внутренняя ошибка сервера';
  res.status(statusCode).json({ message });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
}); 