const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const transporter = require('../utils/mailer');
const passport = require('passport');

// Подключаем конфигурацию passport
require('../config/passport');

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { login, password, username, description, email } = req.body;
    if (!login || !password || !username || !email) {
      return res.status(400).json({ message: 'Заполните все обязательные поля' });
    }
    const candidateLogin = await User.findOne({ login });
    if (candidateLogin) {
      return res.status(400).json({ message: 'Пользователь с таким логином уже существует' });
    }
    const candidateEmail = await User.findOne({ email });
    if (candidateEmail) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const user = new User({
      login,
      password: hashPassword,
      username,
      description: description || '',
      email
    });
    await user.save();

    const emailToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const url = `http://localhost:5000/api/auth/verify-email?token=${emailToken}`;

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
    const user = await User.findOne({ login });
    if (!user) {
      return res.status(400).json({ message: 'Пользователь не найден' });
    }
    if (!user.isEmailVerified) {
      return res.status(400).json({ message: 'Подтвердите почту для входа' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
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
  } catch (e) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
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

      // Перенаправляем на фронтенд с токеном
      // В production, перенаправляйте на ваш домен с помощью переменной окружения
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${redirectUrl}/auth/google-callback?token=${token}`);
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