/**
 * Утилита для форматирования ответов API
 * - Заменяет _id на id для совместимости с Django
 * - Форматирует даты из ISO в формат datetime
 */

/**
 * Форматирует даты из ISO в формат datetime
 * @param {string} isoDate - Дата в формате ISO
 * @returns {string} - Дата в формате YYYY-MM-DD HH:MM:SS
 */
function formatDate(isoDate) {
  if (!isoDate) return null;
  
  const date = new Date(isoDate);
  
  // Форматируем дату в строку YYYY-MM-DD HH:MM:SS
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Форматирует объект Mongoose/MongoDB, заменяя _id на id
 * @param {Object} obj - Объект для форматирования
 * @returns {Object} - Форматированный объект
 */
function formatObject(obj) {
  if (!obj) return null;
  
  // Если это не объект, возвращаем без изменений
  if (typeof obj !== 'object') return obj;
  
  // Если это массив, форматируем каждый элемент
  if (Array.isArray(obj)) {
    return obj.map(item => formatObject(item));
  }
  
  // Если это ObjectId, преобразуем в строку
  if (obj._id && obj._id.toString) {
    return obj._id.toString();
  }
  
  // Если это объект mongoose, преобразуем в обычный объект
  if (obj.toObject && typeof obj.toObject === 'function') {
    obj = obj.toObject();
  }
  
  // Создаем новый объект для результата
  const result = {};
  
  // Проходим по всем полям объекта
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Заменяем _id на id
      if (key === '_id') {
        result.id = obj._id.toString();
      } 
      // Форматируем даты
      else if (key === 'createdAt' || key === 'updatedAt') {
        result[key] = formatDate(obj[key]);
      }
      // Рекурсивно обрабатываем вложенные объекты
      else if (typeof obj[key] === 'object' && obj[key] !== null) {
        result[key] = formatObject(obj[key]);
      }
      // Копируем остальные поля без изменений
      else {
        result[key] = obj[key];
      }
    }
  }
  
  return result;
}

/**
 * Форматирует ответ API
 * @param {Object|Array} data - Данные для форматирования
 * @returns {Object|Array} - Форматированные данные
 */
function formatResponse(data) {
  return formatObject(data);
}

module.exports = formatResponse; 