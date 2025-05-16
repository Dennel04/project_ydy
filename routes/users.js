const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const cloudinary = require('../utils/cloudinary');
const { validateUserProfile, validatePasswordChange, validateEmailChange } = require('../middleware/validation');
const { avatarUploader } = require('../middleware/imageProcessor');
const formatResponse = require('../utils/formatResponse');
const sanitizeUser = require('../utils/sanitizeUser');

// Получить профиль текущего пользователя
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    // Применяем санитизацию и форматируем ответ
    const sanitizedUser = sanitizeUser(user);
    res.json(formatResponse(sanitizedUser));
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении профиля' });
  }
});

// Получить профиль пользователя по ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Применяем sanitizeUser с опцией publicView
    const sanitizedUser = sanitizeUser(user, { publicView: true });
    res.json(formatResponse(sanitizedUser));
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении профиля' });
  }
});

// Обновить профиль пользователя
router.put('/profile', auth, validateUserProfile, async (req, res) => {
  try {
    const { username, description } = req.body;
    
    // Используем findByIdAndUpdate вместо findById + save 
    // для более эффективного обновления в одной операции
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        username, 
        description: description || undefined 
      },
      { 
        new: true,            // вернуть обновленный документ
        runValidators: true   // запустить валидаторы схемы
      }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Применяем санитизацию данных пользователя
    const sanitizedUser = sanitizeUser(updatedUser);
    res.json(formatResponse(sanitizedUser));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при обновлении профиля' });
  }
});

// Сменить пароль
router.put('/change-password', auth, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Проверяем, зарегистрирован ли пользователь через Google
    if (user.googleId) {
      return res.status(403).json({
        message: 'Пользователи, зарегистрированные через Google, должны менять пароль в настройках своего Google-аккаунта',
        isGoogleUser: true
      });
    }
    
    // Проверяем текущий пароль
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный текущий пароль' });
    }
    
    // Хешируем и сохраняем новый пароль
    const hashPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashPassword;
    
    await user.save();
    
    res.json(formatResponse({ message: 'Пароль успешно изменен' }));
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при смене пароля' });
  }
});

// Сменить email
router.put('/change-email', auth, validateEmailChange, async (req, res) => {
  try {
    const { password, newEmail } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Проверяем, зарегистрирован ли пользователь через Google
    if (user.googleId) {
      return res.status(403).json({
        message: 'Пользователи, зарегистрированные через Google, должны менять email в настройках своего Google-аккаунта',
        isGoogleUser: true
      });
    }
    
    // Проверяем, не занят ли уже этот email
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Этот email уже используется' });
    }
    
    // Проверяем текущий пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }
    
    // Сохраняем старый email (может понадобиться для отправки уведомления)
    const oldEmail = user.email;
    
    // Обновляем email и сбрасываем флаг подтверждения
    user.email = newEmail;
    user.isEmailVerified = false;
    
    await user.save();
    
    // Отправляем письмо для подтверждения нового email
    const transporter = require('../utils/mailer');
    const jwt = require('jsonwebtoken');
    
    const emailToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const url = `http://localhost:5000/api/auth/verify-email?token=${emailToken}`;

    try {
      await transporter.sendMail({
        to: newEmail,
        subject: 'Подтверждение смены email',
        html: `
          <h2>Подтвердите новый email</h2>
          <p>Для завершения смены email перейдите по ссылке:</p>
          <a href="${url}">${url}</a>
          <p>Ссылка действительна 1 час.</p>
        `
      });
      
      // Отправляем уведомление на старый email
      await transporter.sendMail({
        to: oldEmail,
        subject: 'Уведомление о смене email',
        html: `
          <h2>Ваш email был изменен</h2>
          <p>Email в вашем аккаунте был изменен на: ${newEmail}</p>
          <p>Если это были не вы, немедленно свяжитесь с администрацией.</p>
        `
      });
    } catch (err) {
      console.error('Ошибка отправки писем:', err);
    }
    
    res.json(formatResponse({ 
      message: 'Email успешно изменен. Пожалуйста, подтвердите новый email, перейдя по ссылке в письме.',
      requiresVerification: true
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при смене email' });
  }
});

// Загрузить аватар пользователя
router.post('/upload-avatar', auth, avatarUploader.single('avatar'), async (req, res, next) => {
  try {
    // Проверяем, загружен ли файл
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не был загружен' });
    }

    // Получаем пользователя из базы данных
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Если у пользователя уже есть аватар, удаляем его из Cloudinary
    if (user.image) {
      try {
        // Извлекаем public_id из URL
        const publicId = user.image.split('/').pop().split('.')[0];
        // Определяем папку на основе URL
        const folder = user.image.includes('blog-avatars') ? 'blog-avatars' : 'blog-uploads';
        // Удаляем старое изображение
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      } catch (error) {
        console.log('Ошибка при удалении старого аватара:', error);
        // Продолжаем работу даже при ошибке удаления
      }
    }
    
    // Cloudinary возвращает полный URL в req.file.path
    const imageUrl = req.file.path;
    
    // Обновляем профиль пользователя за одну операцию
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { image: imageUrl },
      { new: true }
    );
    
    // Санитизируем данные пользователя перед отправкой
    const sanitizedUser = sanitizeUser(updatedUser);
    
    res.json(formatResponse({ 
      message: 'Аватар успешно загружен', 
      imageUrl,
      user: sanitizedUser
    }));
  } catch (e) {
    console.error('Ошибка при загрузке аватара:', e);
    next(e); // Передаем ошибку глобальному обработчику
  }
});

// Удалить аватар пользователя
router.delete('/remove-avatar', auth, async (req, res) => {
  try {
    // Получаем пользователя из базы
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Проверяем, есть ли аватар для удаления
    if (!user.image) {
      return res.status(400).json({ message: 'У пользователя нет аватара' });
    }
    
    // Извлекаем public_id из URL и определяем папку
    const publicId = user.image.split('/').pop().split('.')[0];
    const folder = user.image.includes('blog-avatars') ? 'blog-avatars' : 'blog-uploads';
    
    try {
      // Удаляем изображение из Cloudinary
      await cloudinary.uploader.destroy(`${folder}/${publicId}`);
    } catch (error) {
      console.log('Ошибка при удалении аватара из Cloudinary:', error);
      // Продолжаем работу даже при ошибке удаления
    }
    
    // Сбрасываем аватар пользователя на null
    user.image = null;
    await user.save();
    
    res.json(formatResponse({ 
      message: 'Аватар успешно удален'
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при удалении аватара' });
  }
});

// Проверить тип аутентификации пользователя
router.get('/auth-type', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('googleId');
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    res.json(formatResponse({
      isGoogleUser: !!user.googleId,
      authType: user.googleId ? 'google' : 'email'
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при определении типа аутентификации' });
  }
});

module.exports = router; 