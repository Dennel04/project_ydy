const rateLimit = require('express-rate-limit');

// Общий лимитер для всех запросов API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // макс. 100 запросов на IP в течение windowMs
  standardHeaders: true, // Возвращать информацию о лимите в заголовках `RateLimit-*`
  legacyHeaders: false, // Отключить заголовки `X-RateLimit-*`
  message: { message: 'Слишком много запросов, повторите попытку позже' }
});

// Более строгий лимитер для запросов аутентификации
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 10, // макс. 10 запросов на IP в течение windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много попыток авторизации, повторите попытку позже' }
});

module.exports = {
  apiLimiter,
  authLimiter
}; 