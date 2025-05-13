const express = require('express');
const router = express.Router();
const Tag = require('../models/Tag');
const auth = require('../middleware/auth');

// Получить все теги
router.get('/', async (req, res) => {
  try {
    const tags = await Tag.find().sort({ count: -1 });
    res.json(tags);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при получении тегов' });
  }
});

// Получить тег по id
router.get('/:id', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Тег не найден' });
    }
    res.json(tag);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при получении тега' });
  }
});

// Получить тег по slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const tag = await Tag.findOne({ slug: req.params.slug });
    if (!tag) {
      return res.status(404).json({ message: 'Тег не найден' });
    }
    res.json(tag);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при получении тега' });
  }
});

// Создать новый тег (только для администратора)
router.post('/', auth, async (req, res) => {
  try {
    // Здесь должна быть проверка на права администратора
    // TODO: добавить проверку isAdmin
    
    const { name, description } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Название тега должно содержать минимум 2 символа' });
    }
    
    // Создаем slug из имени
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')     // Заменяем пробелы на дефисы
      .replace(/[^\w-]+/g, '')  // Удаляем не-слова и не-дефисы
      .replace(/--+/g, '-')     // Заменяем несколько дефисов на один
      .replace(/^-+/, '')       // Удаляем дефисы в начале
      .replace(/-+$/, '');      // Удаляем дефисы в конце
    
    // Проверяем, нет ли уже тега с таким slug
    const existingTag = await Tag.findOne({ slug });
    if (existingTag) {
      return res.status(400).json({ message: 'Тег с таким названием уже существует' });
    }
    
    const tag = new Tag({
      name,
      slug,
      description: description || '',
      count: 0
    });
    
    await tag.save();
    res.status(201).json(tag);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при создании тега' });
  }
});

// Обновить тег (только для администратора)
router.put('/:id', auth, async (req, res) => {
  try {
    // Здесь должна быть проверка на права администратора
    // TODO: добавить проверку isAdmin
    
    const { name, description } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Название тега должно содержать минимум 2 символа' });
    }
    
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Тег не найден' });
    }
    
    // Обновляем только если имя изменилось
    if (tag.name !== name) {
      // Создаем новый slug
      const slug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
      
      // Проверяем, не занят ли такой slug другим тегом
      const existingTag = await Tag.findOne({ slug, _id: { $ne: req.params.id } });
      if (existingTag) {
        return res.status(400).json({ message: 'Тег с таким названием уже существует' });
      }
      
      tag.name = name;
      tag.slug = slug;
    }
    
    tag.description = description || tag.description;
    await tag.save();
    
    res.json(tag);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при обновлении тега' });
  }
});

// Удалить тег (только для администратора)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Здесь должна быть проверка на права администратора
    // TODO: добавить проверку isAdmin
    
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Тег не найден' });
    }
    
    // Удаляем тег
    await tag.remove();
    
    // TODO: Обновить все посты, которые используют этот тег
    
    res.json({ message: 'Тег успешно удален' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка при удалении тега' });
  }
});

module.exports = router; 