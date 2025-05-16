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
      // console.log('[ResponseFormatter] Пропуск форматирования для простого ответа', 
      //   typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : typeof data);
      return originalJson.call(this, data);
    }
    
    try {
      // Форматируем данные
      const formattedData = formatResponse(data);
      
      // Логируем для отладки (закомментировано для production)
      // console.log('[ResponseFormatter] Форматирование применено:', 
      //  `Путь: ${req.path}, Тип данных: ${Array.isArray(data) ? 'Array' : 'Object'}`);
      
      // Вызываем оригинальный метод с отформатированными данными
      return originalJson.call(this, formattedData);
    } catch (error) {
      console.error('[ResponseFormatter] Ошибка форматирования:', error);
      // При ошибке возвращаем оригинальные данные
      return originalJson.call(this, data);
    }
  };
  
  next();
}

module.exports = responseFormatter; 