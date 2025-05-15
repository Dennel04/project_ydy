const { doubleCsrf } = require('csrf-csrf');

// Настройка CSRF защиты
const { generateToken, validateRequest, invalidCsrfTokenError } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'csrf-secret-key-random-string',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true, // недоступен для JavaScript
    sameSite: 'lax', // защита от CSRF через запросы с других сайтов
    path: '/',
    secure: process.env.NODE_ENV === 'production' // только через HTTPS на production
  },
  size: 64, // размер CSRF-токена
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'] // не требовать CSRF для этих методов
});

// Middleware для проверки CSRF-токена
const csrfProtection = (req, res, next) => {
  // Проверяем только для мутирующих запросов
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    try {
      validateRequest(req, res);
      next();
    } catch (error) {
      if (error === invalidCsrfTokenError) {
        return res.status(403).json({
          message: 'Недействительный или отсутствующий CSRF токен'
        });
      }
      next(error);
    }
  } else {
    next();
  }
};

// Middleware для генерации CSRF-токена
const csrfToken = (req, res, next) => {
  // Добавляем токен в заголовок ответа
  res.setHeader('X-CSRF-Token', generateToken(req, res));
  next();
};

// Функция для получения нового CSRF токена
const getNewCsrfToken = (req, res) => {
  return generateToken(req, res);
};

module.exports = {
  csrfProtection,
  csrfToken,
  getNewCsrfToken
}; 