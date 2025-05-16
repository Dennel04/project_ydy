// Middleware для установки JWT в httpOnly cookie
const setTokenCookie = (res, token, expiry = '7d') => {
  // Устанавливаем HttpOnly куки с токеном
  let cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
    path: '/'
  };
  
  // В production добавляем дополнительные параметры безопасности
  if (process.env.NODE_ENV === 'production') {
    // В production, но разрешаем localhost для разработки
    cookieOptions.secure = true;  // Только HTTPS
    cookieOptions.sameSite = 'none'; // Для кросс-доменных запросов
    
    // Ограничиваем домен в продакшн, если указан
    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
  }
  
  res.cookie('token', token, cookieOptions);
  return res;
};

// Middleware для удаления JWT cookie (при выходе)
const clearTokenCookie = (res) => {
  // Очищаем куки
  const cookieOptions = { 
    httpOnly: true,
    path: '/',
  };
  
  // В production учитываем дополнительные параметры
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

// Middleware для чтения JWT из cookie
const getTokenFromCookie = (req) => {
  return req.cookies.token;
};

module.exports = {
  setTokenCookie,
  clearTokenCookie,
  getTokenFromCookie
}; 