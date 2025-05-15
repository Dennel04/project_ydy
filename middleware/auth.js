const jwt = require('jsonwebtoken');
const { getTokenFromCookie } = require('./secureTokens');

module.exports = (req, res, next) => {
  try {
    // Получаем токен из разных источников
    let token;
    
    // 1. Сначала пробуем получить из cookie (приоритет)
    token = getTokenFromCookie(req);
    
    // 2. Если нет в cookie, проверяем заголовки (для обратной совместимости)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'Не предоставлен токен авторизации' });
    }

    // Проверяем валидность токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Срок действия токена истек', expired: true });
    } else if (e instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Недействительный токен' });
    }
    res.status(401).json({ message: 'Ошибка аутентификации' });
  }
}; 