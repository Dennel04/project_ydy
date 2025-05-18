const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// Настройка хранилища Cloudinary для изображений постов
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog-post-images', // Отдельная папка для изображений постов
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, crop: "scale" }, // Масштабирование до ширины 1200px
      { quality: "auto" },           // Автоматическая оптимизация качества
      { fetch_format: "auto" }       // Автоматический выбор формата
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

// Настройка multer с Cloudinary и полями для изображений
const createPostUpload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB для изображений постов
  }
}).fields([
  { name: 'mainImage', maxCount: 1 },          // Главное изображение поста
  { name: 'contentImages', maxCount: 10 }      // Дополнительные изображения (максимум 10)
]);

module.exports = createPostUpload; 