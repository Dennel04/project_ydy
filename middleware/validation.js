/**
 * Middleware для валидации входных данных.
 * Предоставляет валидаторы для наиболее часто используемых данных.
 */

// Валидация профиля пользователя
const validateUserProfile = (req, res, next) => {
  const { username, description, email } = req.body;
  
  // Проверка имени пользователя
  if (!username) {
    return res.status(400).json({ message: 'Имя пользователя обязательно' });
  }
  
  if (username.length < 2 || username.length > 30) {
    return res.status(400).json({ 
      message: 'Имя пользователя должно содержать от 2 до 30 символов' 
    });
  }
  
  // Проверка описания (если есть)
  if (description && description.length > 500) {
    return res.status(400).json({ 
      message: 'Описание не должно превышать 500 символов' 
    });
  }
  
  // Если пользователь пытается изменить email через этот маршрут, блокируем
  if (email) {
    return res.status(400).json({ 
      message: 'Для смены email используйте специальный маршрут /api/users/change-email'
    });
  }
  
  next();
};

// Валидация смены пароля
const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // Проверка наличия полей
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }
  
  // Проверка нового пароля
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ 
      message: 'Новый пароль должен содержать от 8 до 128 символов' 
    });
  }
  
  // Проверка сложности пароля (пример простой проверки)
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  
  if (!hasNumber) {
    return res.status(400).json({ 
      message: 'Пароль должен содержать минимум одну цифру' 
    });
  }
  
  next();
};

// Валидация смены email
const validateEmailChange = (req, res, next) => {
  const { password, newEmail } = req.body;
  
  // Проверка наличия полей
  if (!password || !newEmail) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }
  
  // Валидация формата email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ message: 'Некорректный формат email' });
  }
  
  next();
};

// Валидация создания поста
const validatePost = (req, res, next) => {
  const { name, content } = req.body;
  
  // Валидация названия поста
  if (!name || name.trim().length < 3) {
    return res.status(400).json({ 
      message: 'Название поста должно содержать минимум 3 символа' 
    });
  }
  
  // Валидация содержимого поста
  if (!content || content.trim().length < 10) {
    return res.status(400).json({ 
      message: 'Содержание поста должно содержать минимум 10 символов' 
    });
  }
  
  next();
};

// Валидация создания комментария
const validateComment = (req, res, next) => {
  const { text } = req.body;
  
  if (!text || text.trim().length < 1) {
    return res.status(400).json({ message: 'Текст комментария не может быть пустым' });
  }
  
  if (text.length > 1000) {
    return res.status(400).json({ 
      message: 'Текст комментария не должен превышать 1000 символов' 
    });
  }
  
  next();
};

// Экспортируем все валидаторы
module.exports = {
  validateUserProfile,
  validatePasswordChange,
  validateEmailChange,
  validatePost,
  validateComment
}; 