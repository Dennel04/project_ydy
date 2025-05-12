const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const upload = require('../middleware/upload');

// Получить профиль текущего пользователя
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении профиля' });
  }
});

// Получить профиль пользователя по ID
router.get('/:id', async (req, res) => {
  try {
    // Исключаем конфиденциальные данные из ответа
    const user = await User.findById(req.params.id)
      .select('username description image posts'); // Только публичные поля
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при получении профиля' });
  }
});

// Обновить профиль пользователя
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, description } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: 'Имя пользователя обязательно' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Обновляем поля
    user.username = username;
    user.description = description || user.description;
    
    await user.save();
    
    // Возвращаем обновленный профиль без пароля
    const updatedUser = await User.findById(req.user.userId).select('-password');
    res.json(updatedUser);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при обновлении профиля' });
  }
});

// Сменить пароль
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
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
    
    res.json({ message: 'Пароль успешно изменен' });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка при смене пароля' });
  }
});

// Загрузить аватар пользователя
router.post('/upload-avatar', auth, upload.single('avatar'), async (req, res, next) => {
  try {
    // Проверяем, загружен ли файл
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не был загружен' });
    }

    // Получаем пользователя из базы
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // URL для доступа к изображению
    const imageUrl = `${req.protocol}://${req.get('host')}${req.file.path.replace('\\', '/')}`;
    
    // Сохраняем URL аватара в профиле пользователя
    user.image = imageUrl;
    await user.save();
    
    res.json({ 
      message: 'Аватар успешно загружен', 
      imageUrl
    });
  } catch (e) {
    console.error(e);
    next(e); // Передаем ошибку глобальному обработчику
  }
});

module.exports = router; 