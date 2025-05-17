/**
 * Скрипт для очистки неподтвержденных пользователей, срок действия которых истек.
 * Выполняйте этот скрипт через cron или task scheduler регулярно (например, раз в день)
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function cleanupUnverifiedUsers() {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Подключение к MongoDB установлено');

    // Находим и удаляем всех пользователей, которые:
    // 1. Не подтвердили email
    // 2. Срок подтверждения истек
    const result = await User.deleteMany({
      isEmailVerified: false,
      emailVerificationExpires: { $lt: new Date() }
    });

    console.log(`Удалено ${result.deletedCount} неподтвержденных пользователей`);

    // Закрываем соединение с MongoDB
    await mongoose.connection.close();
    console.log('Соединение с MongoDB закрыто');

    return result.deletedCount;
  } catch (error) {
    console.error('Ошибка при очистке неподтвержденных пользователей:', error);
    
    // Убедитесь, что соединение закрыто даже при ошибке
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('Соединение с MongoDB закрыто после ошибки');
    }
    
    throw error;
  }
}

// Запускаем функцию, если скрипт запущен напрямую
if (require.main === module) {
  cleanupUnverifiedUsers()
    .then(count => {
      console.log(`Очистка завершена. Удалено ${count} пользователей.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Ошибка при выполнении скрипта очистки:', err);
      process.exit(1);
    });
}

module.exports = cleanupUnverifiedUsers; 