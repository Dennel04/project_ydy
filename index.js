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
const responseFormatter = require('./middleware/responseFormatter');
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

// Настройка для работы за прокси (например, для rate-limiter)
app.set('trust proxy', 1);

// Настройка CORS
const corsOptions = {
  origin: function(origin, callback) {
    // В производственном режиме не разрешаем запросы без origin
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('Не разрешено политикой CORS'), false);
    }
    // Разрешаем запросы без origin в режиме разработки
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Список разрешенных источников
    let allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:8080',  
      'http://localhost:5173',
      'https://blog-api-wpbz.onrender.com'  
    ];
    
    // Если указан CORS_ORIGIN, добавляем его значения в список разрешенных
    if (process.env.CORS_ORIGIN) {
      // Разбиваем строку по запятым и добавляем в список
      const corsOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
      allowedOrigins = [...new Set([...allowedOrigins, ...corsOrigins])];
    }
    
    console.log(`CORS request from: ${origin}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    
    // Разрешаем null только для разработки
    if (process.env.NODE_ENV !== 'production' && origin === 'null') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Не разрешено политикой CORS'));
    }
  },
  credentials: true, // Разрешаем отправку куков и аутентификационных заголовков
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

// Безопасные заголовки
app.use(securityHeaders);

// Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')); // Логирование настраиваем в зависимости от окружения
app.use(express.json({ limit: '1mb' })); // Ограничиваем размер JSON
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Ограничиваем размер данных формы

// Добавляем сжатие для production
if (process.env.NODE_ENV === 'production') {
  const compression = require('compression');
  app.use(compression());
}

// Cookie parser для работы с cookies
app.use(cookieParser());

// Настройка сессий для работы с CSRF
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
};

// В production используем MongoDB для хранения сессий
if (process.env.NODE_ENV === 'production') {
  const MongoStore = require('connect-mongo');
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 14 * 24 * 60 * 60, // 14 дней
    crypto: {
      secret: process.env.SESSION_SECRET || 'mongo-session-secret'
    },
    autoRemove: 'native'
  });
}

app.use(session(sessionConfig));

// CSRF защита
app.use(csrfToken);
app.use(csrfProtection);

// Лимитирование запросов
app.use('/api/', apiLimiter);

// Форматирование ответов API - преобразование _id в id и форматирование дат
app.use('/api/', responseFormatter);

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

// Тестовые маршруты доступны только вне production
if (process.env.NODE_ENV !== 'production') {
  // Маршрут для проверки CORS
  app.get('/api/cors-test', (req, res) => {
    res.json({ 
      message: 'CORS настроен правильно!',
      origin: req.headers.origin || 'Неизвестный источник',
      time: new Date().toISOString()
    });
  });

  // Тестовый маршрут для проверки форматирования
  app.get('/api/format-test', (req, res) => {
    const mongoose = require('mongoose');
    const now = new Date();
    const testObject = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Тестовый объект',
      nested: {
        _id: new mongoose.Types.ObjectId(),
        value: 'Вложенное значение'
      },
      createdAt: now,
      updatedAt: now,
      items: [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Элемент 1',
          timestamp: now
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Элемент 2',
          timestamp: now
        }
      ]
    };
    
    res.json(testObject);
  });
}

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
