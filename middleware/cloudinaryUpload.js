const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// Настройка хранилища Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog-uploads', // Название папки в Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1000, crop: "scale" }, // Масштабирование до ширины 1000px с сохранением пропорций
      { quality: "auto" },           // Автоматическая оптимизация качества
      { fetch_format: "auto" }       // Автоматический выбор формата (webp для поддерживаемых браузеров)
    ],
    // Убираем жесткое указание формата и качества, т.к. это теперь в трансформации
    resource_type: 'auto' // Автоматическое определение типа ресурса
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
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Увеличиваем до 10MB, т.к. изображения будут оптимизированы
  }
});

module.exports = upload; 