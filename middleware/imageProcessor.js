/**
 * Расширенный middleware для обработки и оптимизации изображений
 * перед загрузкой в Cloudinary
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Создаем временную папку для изображений
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Базовые настройки локального хранилища для предварительной обработки
const tmpStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя для избежания конфликтов
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${fileExt}`);
  }
});

// Расширенная проверка изображений для безопасности
const validateImage = (req, file, cb) => {
  // Проверяем MIME тип
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Разрешены только изображения'));
  }

  // Проверяем расширение файла
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!validExtensions.includes(ext)) {
    return cb(new Error('Недопустимое расширение файла. Разрешены только: ' + validExtensions.join(', ')));
  }
  
  // Всё в порядке
  cb(null, true);
};

// Создаем конфигурации для разных типов изображений
const createImageUploader = (options) => {
  const {
    fieldName = 'image',
    maxFileSize = 5 * 1024 * 1024,  // 5 МБ по умолчанию
    imageType = 'general',          // общий тип по умолчанию
    maxWidth,
    maxHeight,
    useLocalOptimization = false    // использовать ли локальную оптимизацию перед загрузкой
  } = options;

  // Выбор настроек Cloudinary в зависимости от типа изображения
  let cloudinaryConfig;
  let folder, transformations;

  switch (imageType) {
    case 'avatar':
      folder = 'blog-avatars';
      transformations = [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { radius: "max" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ];
      break;
    case 'post':
      folder = 'blog-post-images';
      transformations = [
        { width: 1200, crop: "scale" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ];
      break;
    case 'thumbnail':
      folder = 'blog-thumbnails';
      transformations = [
        { width: 600, height: 400, crop: "fill", gravity: "auto" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ];
      break;
    default:
      folder = 'blog-uploads';
      transformations = [
        { width: maxWidth || 1600, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ];
  }

  // Настройка Cloudinary
  const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: transformations,
      resource_type: 'auto',
      // Добавляем метаданные для отслеживания
      public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileNameWithoutExt = path.basename(file.originalname, path.extname(file.originalname));
        return `${imageType}-${fileNameWithoutExt}-${uniqueSuffix}`;
      }
    }
  });

  // Создаем middleware
  const upload = multer({
    storage: useLocalOptimization ? tmpStorage : cloudinaryStorage,
    fileFilter: validateImage,
    limits: {
      fileSize: maxFileSize
    }
  });

  // Если требуется локальная оптимизация, возвращаем middleware с дополнительной обработкой
  if (useLocalOptimization) {
    return {
      single: (fieldName) => {
        return [
          upload.single(fieldName),
          async (req, res, next) => {
            // Если файл не был загружен, пропускаем обработку
            if (!req.file) {
              return next();
            }
            
            try {
              // Здесь можно добавить дополнительную локальную обработку изображения
              // Например, через sharp или другую библиотеку
              
              // После обработки загружаем в Cloudinary
              const result = await cloudinary.uploader.upload(req.file.path, {
                folder: folder,
                transformation: transformations,
                resource_type: 'auto'
              });
              
              // Заменяем информацию о файле
              req.file.path = result.secure_url;
              req.file.filename = result.public_id;
              req.file.cloudinaryDetails = result;
              
              // Удаляем временный файл
              fs.unlinkSync(req.file.path);
              
              next();
            } catch (error) {
              // Удаляем временный файл в случае ошибки
              try {
                fs.unlinkSync(req.file.path);
              } catch (e) {
                console.error('Ошибка при удалении временного файла:', e);
              }
              next(error);
            }
          }
        ];
      }
    };
  }

  return upload;
};

module.exports = {
  createImageUploader,
  avatarUploader: createImageUploader({
    imageType: 'avatar',
    maxFileSize: 5 * 1024 * 1024,
    useLocalOptimization: false
  }),
  postImageUploader: createImageUploader({
    imageType: 'post',
    maxFileSize: 10 * 1024 * 1024,
    useLocalOptimization: false
  })
}; 