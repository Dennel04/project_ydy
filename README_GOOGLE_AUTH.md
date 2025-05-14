# Настройка Google OAuth для аутентификации

## Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в "API и сервисы" > "Учетные данные"
4. Нажмите "Создать учетные данные" > "OAuth ID клиента"
5. Если потребуется, сначала настройте "Экран согласия OAuth" (укажите название приложения, email поддержки и домашнюю страницу)
6. Выберите тип приложения "Веб-приложение"
7. Заполните форму:
   - Название: название вашего приложения
   - Разрешенные URI перенаправления: 
     - Для разработки: `http://localhost:5000/api/auth/google/callback`
     - Для продакшн: `https://your-domain.com/api/auth/google/callback`
8. Нажмите "Создать"
9. Сохраните полученные Client ID и Client Secret

## Шаг 2: Настройка переменных окружения

Добавьте следующие переменные в ваш файл `.env`:

```
# Google OAuth
GOOGLE_CLIENT_ID=ваш_client_id
GOOGLE_CLIENT_SECRET=ваш_client_secret
FRONTEND_URL=http://localhost:3000 # URL фронтенда для редиректа после аутентификации
```

## Шаг 3: Настройка фронтенда

На стороне фронтенда вам потребуется:

1. Создать страницу для обработки callback от Google OAuth
2. Создать кнопку "Войти через Google", которая перенаправляет на URL: `/api/auth/google`

Пример компонента для обработки callback на React:

```jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function GoogleCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function verifyToken() {
      try {
        // Получаем токен из URL
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        
        if (!token) {
          throw new Error('Токен не найден');
        }
        
        // Проверяем токен через API
        const response = await fetch('/api/auth/google/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          throw new Error('Ошибка авторизации');
        }
        
        const data = await response.json();
        
        // Сохраняем токен и данные пользователя
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Перенаправляем на главную страницу
        navigate('/');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    verifyToken();
  }, [location, navigate]);

  if (loading) {
    return <div>Загрузка...</div>;
  }
  
  if (error) {
    return <div>Ошибка: {error}</div>;
  }
  
  return null;
}

export default GoogleCallback;
```

Пример кнопки входа через Google:

```jsx
function GoogleLoginButton() {
  return (
    <a 
      href="/api/auth/google"
      className="google-login-button"
    >
      Войти через Google
    </a>
  );
}
```

## Шаг 4: Тестирование

1. Убедитесь, что все переменные окружения настроены правильно
2. Перезапустите сервер
3. Перейдите на страницу входа в вашем приложении
4. Нажмите кнопку "Войти через Google"
5. Следуйте инструкциям Google для авторизации
6. После успешной авторизации вы должны быть перенаправлены обратно в ваше приложение

## Решение проблем

1. Если вы получаете ошибку "Redirect URI mismatch", убедитесь, что URL в Google Cloud Console точно соответствует URL вашего callbackURL в конфигурации Passport
2. Проверьте консоль на наличие ошибок
3. Проверьте, что все необходимые переменные окружения настроены правильно 