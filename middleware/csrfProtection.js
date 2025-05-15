const { doubleCsrf } = require('csrf-csrf');

// Настройка CSRF защиты с корректными параметрами
const csrfConfig = {
  getSecret: () => process.env.CSRF_SECRET || 'csrf-secret-key-random-string',
  getSessionIdentifier: (req) => req.session.id || 'default-session',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true, // недоступен для JavaScript
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none', // ослабляем для локальной разработки
    path: '/',
    secure: process.env.NODE_ENV === 'production', // только через HTTPS на production
  },
  size: 64, // размер CSRF-токена
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'] // не требовать CSRF для этих методов
};

// Создаем экземпляр CSRF защиты и извлекаем нужные функции
const csrf = doubleCsrf(csrfConfig);
const { generateCsrfToken, validateRequest, invalidCsrfTokenError } = csrf;

// Middleware для проверки CSRF-токена
const csrfProtection = (req, res, next) => {
  // В режиме разработки можно временно отключить CSRF защиту
  if (process.env.NODE_ENV !== 'production') {
    // Для разработки можно закомментировать эту строку, чтобы полностью отключить CSRF защиту
    // return next(); 
  }

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
  res.setHeader('X-CSRF-Token', generateCsrfToken(req, res));
  
  // Добавляем заголовок для отладки в dev режиме
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token');
  }
  
  next();
};

// Функция для получения нового CSRF токена
const getNewCsrfToken = (req, res) => {
  return generateCsrfToken(req, res);
};

module.exports = {
  csrfProtection,
  csrfToken,
  getNewCsrfToken
}; 