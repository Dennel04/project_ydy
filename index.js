const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { apiLimiter } = require('./middleware/rateLimiter');
const securityHeaders = require('./middleware/securityHeaders');
const { csrfProtection, csrfToken, getNewCsrfToken } = require('./middleware/csrfProtection');
const responseFormatter = require('./middleware/responseFormatter');
require('dotenv').config();

// Check for required environment variables
const requiredEnvVars = [
  'JWT_SECRET', 
  'MONGO_URI', 
  'GMAIL_USER', 
  'GMAIL_PASS',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'CSRF_SECRET'
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Error: The following environment variables are missing:');
  console.error(missingEnvVars.join(', '));
  process.exit(1); // Exit with error
}

const app = express();

// Trust proxy settings (e.g., for rate-limiter)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    // In production, do not allow requests without origin
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS policy'), false);
    }
    // Allow requests without origin in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // List of allowed origins
    let allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:8080',  
      'http://localhost:5173',
      'https://blog-api-wpbz.onrender.com'  
    ];
    
    // If CORS_ORIGIN is set, add its values to the allowed list
    if (process.env.CORS_ORIGIN) {
      const corsOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
      allowedOrigins = [...new Set([...allowedOrigins, ...corsOrigins])];
    }
    
    console.log(`CORS request from: ${origin}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    
    // Allow null only for development
    if (process.env.NODE_ENV !== 'production' && origin === 'null') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // Allow cookies and auth headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

// Security headers
app.use(securityHeaders);

// Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')); // Logging based on environment
app.use(express.json({ limit: '1mb' })); // Limit JSON size
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Limit form data size

// Add compression for production
if (process.env.NODE_ENV === 'production') {
  const compression = require('compression');
  app.use(compression());
}

// Cookie parser for working with cookies
app.use(cookieParser());

// Session configuration for CSRF
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
};

// In production, use MongoDB for session storage
if (process.env.NODE_ENV === 'production') {
  const MongoStore = require('connect-mongo');
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 14 * 24 * 60 * 60, // 14 days
    crypto: {
      secret: process.env.SESSION_SECRET || 'mongo-session-secret'
    },
    autoRemove: 'native'
  });
}

app.use(session(sessionConfig));

// CSRF protection
app.use(csrfToken);
app.use(csrfProtection);

// Rate limiting
app.use('/api/', apiLimiter);

// API response formatting - convert _id to id and format dates
app.use('/api/', responseFormatter);

// Initialize Passport
app.use(passport.initialize());

// Set up upload directory
// In production, use directory from env or '/tmp/uploads'
const uploadDir = process.env.NODE_ENV === 'production' 
  ? process.env.UPLOAD_DIR || '/tmp/uploads' 
  : 'uploads';

// Create directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  connectTimeoutMS: 30000, // increased timeout
  socketTimeoutMS: 30000    // increased socket timeout
})
.then(() => console.log('MongoDB connected'))
.catch((err) => {
  console.error('MongoDB connection error:');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  
  if (err.code) {
    console.error('Error code:', err.code);
  }
  
  if (err.name === 'MongoNetworkError') {
    console.error('Possible network connection or firewall issue');
  } else if (err.name === 'MongoServerSelectionError') {
    console.error('Could not connect to MongoDB server. Check URI and server availability');
  } else if (err.message && err.message.includes('Authentication failed')) {
    console.error('Authentication error. Check username and password');
  }
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const postsRoutes = require('./routes/posts');
app.use('/api/posts', postsRoutes);

const commentsRoutes = require('./routes/comments');
app.use('/api/comments', commentsRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

const tagsRoutes = require('./routes/tags');
app.use('/api/tags', tagsRoutes);

const errorHandler = require('./middleware/error');

// Error handling must be after all routes
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('API is running');
});

// Special route for CSRF token
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = getNewCsrfToken(req, res);
  res.json({ csrfToken });
});

// Test routes available only outside production
if (process.env.NODE_ENV !== 'production') {
  // Route to check CORS
  app.get('/api/cors-test', (req, res) => {
    res.json({ 
      message: 'CORS is configured correctly!',
      origin: req.headers.origin || 'Unknown origin',
      time: new Date().toISOString()
    });
  });

  // Test route for response formatting
  app.get('/api/format-test', (req, res) => {
    const mongoose = require('mongoose');
    const now = new Date();
    const testObject = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test object',
      nested: {
        _id: new mongoose.Types.ObjectId(),
        value: 'Nested value'
      },
      createdAt: now,
      updatedAt: now,
      items: [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Item 1',
          timestamp: now
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Item 2',
          timestamp: now
        }
      ]
    };
    
    res.json(testObject);
  });
}

// 404 error handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(statusCode).json({ message });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
}); 
