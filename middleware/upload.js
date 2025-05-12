const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Определяем директорию для загрузки в зависимости от окружения
const uploadDir = process.env.NODE_ENV === 'production' 
  ? process.env.UPLOAD_DIR || '/tmp/uploads'
  : 'uploads';

// Создаем директорию, если она не существует
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища для изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Папка для загрузки файлов
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла с добавлением времени
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Фильтр файлов - разрешаем только изображения
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Загружать можно только изображения!'), false);
  }
};

// Максимальный размер файла - 5MB
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = upload; 