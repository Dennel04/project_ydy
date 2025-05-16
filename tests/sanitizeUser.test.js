const sanitizeUser = require('../utils/sanitizeUser');

// Тестовые данные
const mockUser = {
  _id: '60d21b4667d0d8992e610c85',
  login: 'testuser',
  password: 'hashedpassword123',
  username: 'Test User',
  description: 'This is a test user',
  email: 'test@example.com',
  isEmailVerified: true,
  loginAttempts: 2,
  lockUntil: new Date(),
  passwordResetToken: 'sometoken123',
  passwordResetExpires: new Date(),
  posts: ['post1', 'post2'],
  image: 'avatar.jpg',
  googleId: 'google123456',
  __v: 0
};

// Тест основной функциональности
console.log('Test 1: Проверка приватного режима (по умолчанию)');
const privateResult = sanitizeUser(mockUser);
console.log('Приватные поля, должны присутствовать:', privateResult.login, privateResult.email);
console.log('Чувствительные поля, должны отсутствовать:', 
  privateResult.password, 
  privateResult.passwordResetToken, 
  privateResult.googleId
);
console.log('ID должен быть строкой:', privateResult.id);
console.log('_id должен отсутствовать:', privateResult._id);

// Тест публичного режима
console.log('\nTest 2: Проверка публичного режима');
const publicResult = sanitizeUser(mockUser, { publicView: true });
console.log('Публичные поля, должны присутствовать:', publicResult.username, publicResult.description);
console.log('Приватные поля, должны отсутствовать:', publicResult.login, publicResult.email);
console.log('ID должен быть строкой:', publicResult.id);

// Тест с дополнительными полями
console.log('\nTest 3: Проверка включения дополнительных полей');
const withExtraFields = sanitizeUser(mockUser, { 
  includeFields: ['some_custom_field'],
  publicView: true 
});
console.log('Дополнительные поля добавлены в fieldsToKeep:', 
  Object.keys(withExtraFields).includes('some_custom_field')
);

// Тест с null пользователем
console.log('\nTest 4: Проверка с null пользователем');
const nullResult = sanitizeUser(null);
console.log('Результат должен быть null:', nullResult === null);

// Тест с MongoDB документом (имитация)
console.log('\nTest 5: Проверка с MongoDB документом');
const mockMongooseUser = {
  ...mockUser,
  toObject: function() {
    return { ...this };
  }
};
const mongooseResult = sanitizeUser(mockMongooseUser);
console.log('Приватные поля, должны присутствовать:', mongooseResult.login, mongooseResult.email);
console.log('Чувствительные поля, должны отсутствовать:', 
  mongooseResult.password, 
  mongooseResult.passwordResetToken
);

console.log('\nВсе тесты завершены!'); 