// Middleware для установки JWT в httpOnly cookie
const setTokenCookie = (res, token, expiresIn = '7d') => {
  // Рассчитываем срок действия в миллисекундах
  let maxAge;
  if (expiresIn.endsWith('d')) {
    maxAge = parseInt(expiresIn) * 24 * 60 * 60 * 1000; // дни в мс
  } else if (expiresIn.endsWith('h')) {
    maxAge = parseInt(expiresIn) * 60 * 60 * 1000; // часы в мс
  } else if (expiresIn.endsWith('m')) {
    maxAge = parseInt(expiresIn) * 60 * 1000; // минуты в мс
  } else {
    maxAge = 7 * 24 * 60 * 60 * 1000; // по умолчанию 7 дней
  }

  // Устанавливаем cookie с JWT токеном
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAge,
    path: '/'
  });
};

// Middleware для удаления JWT cookie (при выходе)
const clearTokenCookie = (res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
};

// Middleware для чтения JWT из cookie
const getTokenFromCookie = (req) => {
  return req.cookies.auth_token;
};

module.exports = {
  setTokenCookie,
  clearTokenCookie,
  getTokenFromCookie
}; 