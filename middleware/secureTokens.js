// Middleware for setting JWT in httpOnly cookie
const setTokenCookie = (res, token, expiry = '7d') => {
  // Set HttpOnly cookie with token
  let cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    path: '/'
  };
  
  // In production, add additional security parameters
  if (process.env.NODE_ENV === 'production') {
    // In production, but allow localhost for development
    cookieOptions.secure = true;  // Only HTTPS
    cookieOptions.sameSite = 'none'; // For cross-domain requests
    
    // Restrict domain in production, if specified
    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
  }
  
  res.cookie('token', token, cookieOptions);
  return res;
};

// Middleware for deleting JWT cookie (when logging out)
const clearTokenCookie = (res) => {
  // Clear cookies
  const cookieOptions = { 
    httpOnly: true,
    path: '/',
  };
  
  // In production, consider additional parameters
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
    cookieOptions.sameSite = 'none';
    
    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
  }
  
  res.clearCookie('token', cookieOptions);
  return res;
};

// Middleware for reading JWT from cookie
const getTokenFromCookie = (req) => {
  return req.cookies.token;
};

module.exports = {
  setTokenCookie,
  clearTokenCookie,
  getTokenFromCookie
}; 