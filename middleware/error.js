// Обработчик ошибок валидации
const errorHandler = (err, req, res, next) => {
  // Мультер может выдавать ошибки limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'Размер файла превышает допустимый лимит (5MB)'
    });
  }
  
  // Ошибка multer
  if (err.message && err.message.includes('Загружать можно только изображения')) {
    return res.status(400).json({
      message: err.message
    });
  }
  
  // Логируем ошибку в консоль
  console.error(err.stack);
  
  // Ответ с ошибкой
  res.status(err.statusCode || 500).json({
    message: err.message || 'Внутренняя ошибка сервера'
  });
};

module.exports = errorHandler; 