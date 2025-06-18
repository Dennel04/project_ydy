const { doubleCsrf } = require('csrf-csrf');

// CSRF protection configuration with correct parameters
const csrfConfig = {
  getSecret: () => process.env.CSRF_SECRET || 'csrf-secret-key-random-string',
  getSessionIdentifier: (req) => req.session.id || 'default-session',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true, // not accessible to JavaScript
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none', // relaxed for local development
    path: '/',
    secure: process.env.NODE_ENV === 'production', // only via HTTPS in production
  },
  size: 64, // CSRF token size
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'] // do not require CSRF for these methods
};

// Create CSRF instance and extract needed functions
const csrf = doubleCsrf(csrfConfig);
const { generateCsrfToken, validateRequest, invalidCsrfTokenError } = csrf;

// Middleware for checking CSRF token
const csrfProtection = (req, res, next) => {
  // In development mode, you can temporarily disable CSRF protection
  if (process.env.NODE_ENV !== 'production') {
    // For development, you can comment out this line to completely disable CSRF protection
    // return next(); 
  }

  // Check only for mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    try {
      validateRequest(req, res);
      next();
    } catch (error) {
      if (error === invalidCsrfTokenError) {
        return res.status(403).json({
          message: 'Invalid or missing CSRF token'
        });
      }
      next(error);
    }
  } else {
    next();
  }
};

// Middleware for generating CSRF token
const csrfToken = (req, res, next) => {
  // Add token to response header
  res.setHeader('X-CSRF-Token', generateCsrfToken(req, res));
  
  // Add header for debugging in dev mode
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token');
  }
  
  next();
};

// Function to get a new CSRF token
const getNewCsrfToken = (req, res) => {
  return generateCsrfToken(req, res);
};

module.exports = {
  csrfProtection,
  csrfToken,
  getNewCsrfToken
}; 