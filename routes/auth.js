const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const transporter = require('../utils/mailer');
const passport = require('passport');
const { authLimiter } = require('../middleware/rateLimiter');
const { setTokenCookie, clearTokenCookie } = require('../middleware/secureTokens');

// Подключаем конфигурацию passport
require('../config/passport');

// Применяем rate limiter ко всем маршрутам аутентификации
router.use(authLimiter);

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { login, password, username, description, email } = req.body;
    
    // Улучшенная валидация
    if (!login || login.length < 4) {
      return res.status(400).json({ message: 'Логин должен содержать минимум 4 символа' });
    }
    
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Пароль должен содержать минимум 8 символов' });
    }
    
    // Проверка сложности пароля
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры и специальные символы' 
      });
    }
    
    if (!username) {
      return res.status(400).json({ message: 'Имя пользователя обязательно' });
    }
    
    if (!email) {
      return res.status(400).json({ message: 'Email обязателен' });
    }
    
    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Некорректный формат email' });
    }
    
    const candidateLogin = await User.findOne({ login });
    if (candidateLogin) {
      return res.status(400).json({ message: 'Пользователь с таким логином уже существует' });
    }
    
    const candidateEmail = await User.findOne({ email });
    if (candidateEmail) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }
    
    // Усиленное хеширование пароля
    const salt = await bcrypt.genSalt(12); // увеличиваем сложность соли
    const hashPassword = await bcrypt.hash(password, salt);
    
    // Создаем пользователя
    const user = new User({
      login,
      password: hashPassword,
      username,
      description: description || '',
      email
    });
    await user.save();

    // Отправляем подтверждение email
    const emailToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const url = `${process.env.API_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${emailToken}`;

    try {
      await transporter.sendMail({
        to: user.email,
        subject: 'Подтверждение регистрации',
        html: `
          <h2>Подтвердите регистрацию</h2>
          <p>Для завершения регистрации перейдите по ссылке:</p>
          <a href="${url}">${url}</a>
          <p>Ссылка действительна 1 час.</p>
        `
      });
    } catch (err) {
      console.error('Ошибка отправки письма:', err);
    }

    res.status(201).json({ message: 'Проверьте почту для завершения регистрации' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    if (!login || !password) {
      return res.status(400).json({ message: 'Введите логин и пароль' });
    }
    
    // Находим пользователя
    const user = await User.findOne({ login });
    if (!user) {
      return res.status(400).json({ message: 'Пользователь не найден' });
    }
    
    if (!user.isEmailVerified) {
      return res.status(400).json({ message: 'Подтвердите почту для входа' });
    }
    
    // Проверяем блокировку аккаунта
    if (user.lockUntil && user.lockUntil > Date.now()) {
      // Вычисляем оставшееся время блокировки в минутах
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(400).json({ 
        message: `Аккаунт временно заблокирован. Повторите попытку через ${remainingMinutes} мин.`, 
        lockUntil: user.lockUntil,
        remainingMinutes
      });
    }
    
    // Проверяем пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Увеличиваем счетчик неудачных попыток
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Блокируем аккаунт после 5 неудачных попыток
      if (user.loginAttempts >= 5) {
        const lockTime = 30 * 60 * 1000; // 30 минут в миллисекундах
        user.lockUntil = Date.now() + lockTime;
        
        await user.save();
        
        return res.status(400).json({ 
          message: 'Превышено количество попыток входа. Аккаунт заблокирован на 30 минут.', 
          lockUntil: user.lockUntil,
          remainingMinutes: 30
        });
      }
      
      await user.save();
      
      // Сообщаем пользователю, сколько попыток осталось
      const attemptsLeft = 5 - user.loginAttempts;
      return res.status(400).json({ 
        message: `Неверный пароль. Осталось попыток: ${attemptsLeft}`,
        attemptsLeft
      });
    }
    
    // Успешный вход: сбрасываем счетчик попыток и время блокировки
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    
    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Устанавливаем токен в HttpOnly cookie
    setTokenCookie(res, token, '7d');
    
    // Отправляем данные пользователя
    res.json({
      user: {
        id: user._id,
        login: user.login,
        username: user.username,
        description: user.description,
        image: user.image
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Выход
router.post('/logout', (req, res) => {
  // Удаляем cookie с токеном
  clearTokenCookie(res);
  res.json({ message: 'Успешный выход из системы' });
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: 'Пользователь не найден' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Почта уже подтверждена' });
    }
    user.isEmailVerified = true;
    await user.save();
    res.json({ message: 'Почта успешно подтверждена! Теперь вы можете войти.' });
  } catch (e) {
    res.status(400).json({ message: 'Некорректная или просроченная ссылка' });
  }
});

// Google OAuth маршруты
// Начало аутентификации через Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Callback URL для Google OAuth
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    try {
      // Создаем JWT токен
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Устанавливаем токен в HttpOnly cookie
      setTokenCookie(res, token, '7d');
      
      // Перенаправляем на фронтенд
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${redirectUrl}/auth/google-callback`);
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect('/login?error=auth_failed');
    }
  }
);

// Проверка аутентификации через Google
router.post('/google/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Токен не предоставлен' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    res.json({
      token,
      user: {
        id: user._id,
        login: user.login,
        username: user.username,
        description: user.description,
        image: user.image
      }
    });
  } catch (error) {
    console.error('Error verifying Google token:', error);
    res.status(401).json({ message: 'Недействительный токен' });
  }
});

// Обновление токена
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Токен обновления не предоставлен' });
    }
    
    // Проверяем существующий токен
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Недействительный или истекший токен' });
    }
    
    // Проверяем, существует ли пользователь
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    if (!user.isEmailVerified) {
      return res.status(400).json({ message: 'Подтвердите почту для входа' });
    }
    
    // Генерируем новый access token
    const newToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token: newToken,
      user: {
        id: user._id,
        login: user.login,
        username: user.username,
        description: user.description,
        image: user.image
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при обновлении токена' });
  }
});

// Получить один пост по id
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }
    
    // Увеличиваем счётчик просмотров
    post.views += 1;
    await post.save();
    
    res.json(post);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении поста' });
  }
});

module.exports = router; 