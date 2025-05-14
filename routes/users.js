const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const upload = require('../middleware/cloudinaryUpload');
const cloudinary = require('../utils/cloudinary');

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
    
    // Если у пользователя уже есть аватар, удаляем его из Cloudinary
    if (user.image) {
      try {
        // Извлекаем public_id из URL
        const publicId = user.image.split('/').pop().split('.')[0];
        // Удаляем старое изображение
        await cloudinary.uploader.destroy(`blog-uploads/${publicId}`);
      } catch (error) {
        console.log('Ошибка при удалении старого аватара:', error);
        // Продолжаем работу даже при ошибке удаления
      }
    }
    
    // Cloudinary возвращает полный URL в req.file.path
    const imageUrl = req.file.path;
    
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
    
    // Извлекаем public_id из URL
    const publicId = user.image.split('/').pop().split('.')[0];
    
    try {
      // Удаляем изображение из Cloudinary
      await cloudinary.uploader.destroy(`blog-uploads/${publicId}`);
    } catch (error) {
      console.log('Ошибка при удалении аватара из Cloudinary:', error);
      // Продолжаем работу даже при ошибке удаления
    }
    
    // Сбрасываем аватар пользователя на null
    user.image = null;
    await user.save();
    
    res.json({ 
      message: 'Аватар успешно удален'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при удалении аватара' });
  }
});

module.exports = router; 