/**
 * Утилита для санитизации данных пользователя перед отправкой на клиент
 * Удаляет чувствительные поля, которые не должны попадать на фронтенд
 */

/**
 * Удаляет чувствительные данные из объекта пользователя
 * @param {Object} user - Объект пользователя или MongoDB документ
 * @param {Object} options - Дополнительные настройки
 * @param {Array<string>} options.includeFields - Дополнительные поля для включения
 * @param {boolean} options.publicView - Если true, возвращает только публичные поля
 * @returns {Object} - Очищенный объект пользователя
 */
function sanitizeUser(user, options = {}) {
  // Если пользователя нет, вернуть null
  if (!user) return null;
  
  // Преобразуем mongoose документ в простой объект, если это необходимо
  const userData = user.toObject ? user.toObject() : { ...user };
  
  // Чувствительные поля, которые всегда исключаются
  const sensitiveFields = [
    'password',
    'passwordResetToken',
    'passwordResetExpires',
    'loginAttempts',
    'lockUntil',
    'googleId',
    '__v'
  ];
  
  // Публичные поля (доступные для других пользователей)
  const publicFields = [
    '_id',
    'id',
    'username',
    'description',
    'image'
  ];
  
  // Приватные поля (доступные только самому пользователю)
  const privateFields = [
    ...publicFields,
    'login',
    'email',
    'isEmailVerified',
    'posts',
    'liked_posts',
    'favourite',
    'liked_comments',
    'createdAt',
    'updatedAt',
    'lastPasswordChange'
  ];
  
  // Определяем, какие поля нужно сохранить
  const fieldsToKeep = options.publicView ? publicFields : privateFields;
  
  // Если есть дополнительные поля для включения, добавляем их
  if (options.includeFields && Array.isArray(options.includeFields)) {
    fieldsToKeep.push(...options.includeFields);
  }
  
  // Создаем новый объект только с разрешенными полями
  const sanitizedUser = {};
  
  // Копируем только разрешенные поля
  fieldsToKeep.forEach(field => {
    if (field in userData) {
      sanitizedUser[field] = userData[field];
    }
  });
  
  // Преобразуем _id в id для удобства клиентской стороны
  if (sanitizedUser._id && !sanitizedUser.id) {
    sanitizedUser.id = sanitizedUser._id.toString();
    delete sanitizedUser._id;
  }
  
  return sanitizedUser;
}

module.exports = sanitizeUser; 