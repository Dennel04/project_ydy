const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Проверка наличия необходимых переменных окружения
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'GMAIL_USER', 'GMAIL_PASS'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Ошибка: Отсутствуют следующие переменные окружения:');
  console.error(missingEnvVars.join(', '));
  process.exit(1); // Завершаем процесс с ошибкой
}

const app = express();

// Настройка CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // В production укажите конкретные домены
  credentials: true, // Разрешаем отправку куков и аутентификационных заголовков
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware
app.use(morgan('dev')); // Логирование запросов
app.use(express.json());

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
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log('MongoDB connection error:', err));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const postsRoutes = require('./routes/posts');
app.use('/api/posts', postsRoutes);

const commentsRoutes = require('./routes/comments');
app.use('/api/comments', commentsRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

const errorHandler = require('./middleware/error');

// Обработка ошибок должна быть после всех маршрутов
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('API is running');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
}); 