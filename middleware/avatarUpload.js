const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// Настройка хранилища Cloudinary для аватаров
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog-avatars', // Отдельная папка для аватаров
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" }, // Обрезка под квадрат с фокусом на лице
      { radius: "max" }, // Круглая форма для аватара
      { quality: "auto" }, // Автоматическая оптимизация качества
      { fetch_format: "auto" } // Автоматический выбор формата
    ],
    resource_type: 'auto'
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

// Настройка multer с Cloudinary
const avatarUpload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB для аватаров достаточно
  }
});

module.exports = avatarUpload; 