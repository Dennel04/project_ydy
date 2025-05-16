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
  
  // Проверяем на валидность даты
  if (isNaN(date.getTime())) return isoDate;
  
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
 * Проверяет, является ли объект MongoDB ObjectId
 * @param {Object} obj - Объект для проверки
 * @returns {boolean} - true, если объект является ObjectId
 */
function isObjectId(obj) {
  // Проверка на ObjectId из mongoose
  return obj && obj._bsontype === 'ObjectID';
}

/**
 * Форматирует объект Mongoose/MongoDB, заменяя _id на id
 * @param {Object} obj - Объект для форматирования
 * @returns {Object} - Форматированный объект
 */
function formatObject(obj) {
  // Базовые проверки
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  // Обработка массивов
  if (Array.isArray(obj)) {
    return obj.map(item => formatObject(item));
  }
  
  // Обработка MongoDB ObjectId
  if (isObjectId(obj)) {
    return obj.toString();
  }
  
  // Преобразование mongoose документа в обычный объект
  if (obj.toObject && typeof obj.toObject === 'function') {
    obj = obj.toObject({ getters: true });
  }
  
  // Создаем новый объект для результата
  const result = {};
  
  // Проходим по всем полям объекта
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Обработка _id (преобразуем в id)
      if (key === '_id') {
        // Убедимся что _id всегда преобразуется в строку
        result.id = obj._id.toString ? obj._id.toString() : obj._id;
      } 
      // Форматирование дат
      else if ((key === 'createdAt' || key === 'updatedAt') && obj[key]) {
        result[key] = formatDate(obj[key]);
      }
      // Рекурсивная обработка вложенных объектов
      else if (obj[key] !== null && typeof obj[key] === 'object') {
        result[key] = formatObject(obj[key]);
      }
      // Копирование остальных полей без изменений
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