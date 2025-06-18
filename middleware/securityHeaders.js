const helmet = require('helmet');

// Helmet configuration with extended parameters
const securityHeaders = (req, res, next) => {
  // For local development, use less strict settings
  if (process.env.NODE_ENV !== 'production') {
    // Set basic headers without strict CSP rules
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    return next();
  }

  // In production mode, use full Helmet settings
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
      maxAge: 15552000, // 180 days
      includeSubDomains: true
    },
    frameguard: { action: 'deny' }
  });

  return helmetMiddleware(req, res, next);
};

module.exports = securityHeaders;