const rateLimit = require('express-rate-limit');

// General limiter for all API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // max. 500 requests per IP in the windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: { message: 'Too many requests, please try again later' }
});

// Stricter limiter for authentication requests
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // max. 50 requests per IP in the windowMs (increased for testing)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later' }
});

module.exports = {
  apiLimiter,
  authLimiter
}; 
