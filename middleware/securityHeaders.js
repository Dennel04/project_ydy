const helmet = require('helmet');

// Настройка Helmet с расширенными параметрами
const securityHeaders = (req, res, next) => {
  // Для локальной разработки используем менее строгие настройки
  if (process.env.NODE_ENV !== 'production') {
    // Устанавливаем базовые заголовки без строгих CSP правил
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    return next();
  }

  // В производственном режиме используем полные настройки Helmet
  const helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://storage.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 15552000, // 180 дней
      includeSubDomains: true
    },
    frameguard: { action: 'deny' }
  });

  return helmetMiddleware(req, res, next);
};

module.exports = securityHeaders;