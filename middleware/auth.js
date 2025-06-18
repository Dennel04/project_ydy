const jwt = require('jsonwebtoken');
const { getTokenFromCookie } = require('./secureTokens');

module.exports = (req, res, next) => {
  try {
    // Get token from different sources
    let token;
    
    // 1. First, try to get from cookie (priority)
    token = getTokenFromCookie(req);
    
    // 2. If not in cookie, check headers (for backward compatibility)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'Authorization token not provided' });
    }

    // Verify token validity
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token has expired', expired: true });
    } else if (e instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(401).json({ message: 'Authentication error' });
  }
}; 