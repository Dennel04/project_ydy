/**
 * Middleware для автоматического форматирования ответов API
 * - Заменяет _id на id для совместимости с Django
 * - Форматирует даты из ISO в формат datetime
 */

const formatResponse = require('../utils/formatResponse');

/**
 * Переопределяет метод res.json для автоматического форматирования ответов
 */
function responseFormatter(req, res, next) {
  // Сохраняем оригинальный метод json
  const originalJson = res.json;
  
  // Переопределяем метод json для автоматического форматирования
  res.json = function(data) {
    // Пропускаем форматирование для сообщений об ошибках и простых ответов
    if (
      !data || 
      typeof data !== 'object' || 
      (data.message && Object.keys(data).length === 1) ||
      data.error
    ) {
      return originalJson.call(this, data);
    }
    
    // Форматируем данные
    const formattedData = formatResponse(data);
    
    // Вызываем оригинальный метод с отформатированными данными
    return originalJson.call(this, formattedData);
  };
  
  next();
}

module.exports = responseFormatter; 