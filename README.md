# Блог API

REST API для блог-платформы на Node.js, Express и MongoDB.

## Содержание

- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [Запуск](#запуск)
- [API Endpoints](#api-endpoints)
  - [Аутентификация](#аутентификация)
  - [Пользователи](#пользователи)
  - [Посты](#посты)
  - [Комментарии](#комментарии)

## Установка

```bash
# Клонирование репозитория
git clone [url-репозитория]
cd Blog/Backend

# Установка зависимостей
npm install
```

## Конфигурация

Создайте файл `.env` в корневой директории проекта со следующими переменными:

```env
# Порт сервера (по умолчанию 5000)
PORT=5000

# URI подключения к MongoDB
MONGO_URI=mongodb://localhost:27017/blog_db

# Секретный ключ для JWT
JWT_SECRET=your_jwt_secret_key

# Данные для отправки email
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password
```

## Запуск

```bash
# Запуск в режиме разработки
npm run dev

# Запуск в production режиме
npm start
```

## API Endpoints

### Аутентификация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация нового пользователя |
| POST | `/api/auth/login` | Авторизация пользователя |
| GET | `/api/auth/verify-email` | Подтверждение email |
| POST | `/api/auth/refresh-token` | Обновление токена |

### Пользователи

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/users/profile` | Получение профиля текущего пользователя |
| GET | `/api/users/:id` | Получение публичного профиля пользователя |
| PUT | `/api/users/profile` | Обновление профиля |
| PUT | `/api/users/change-password` | Смена пароля |
| POST | `/api/users/upload-avatar` | Загрузка аватара |

### Посты

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/posts` | Получение всех постов |
| GET | `/api/posts/:id` | Получение поста по ID |
| GET | `/api/posts/user/:userId` | Получение всех постов пользователя |
| GET | `/api/posts/search` | Поиск и фильтрация постов |
| POST | `/api/posts` | Создание нового поста |
| PUT | `/api/posts/:id` | Редактирование поста |
| DELETE | `/api/posts/:id` | Удаление поста |
| POST | `/api/posts/like/:id` | Поставить/убрать лайк |
| GET | `/api/posts/isliked/:id` | Проверить, поставлен ли лайк |
| POST | `/api/posts/favourite/:id` | Добавить/убрать из избранного |
| GET | `/api/posts/isfavourite/:id` | Проверить, в избранном ли пост |
| GET | `/api/posts/favourites` | Получить все избранные посты |
| POST | `/api/posts/upload-image/:id` | Загрузка изображения к посту |

### Комментарии

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/comments/:postId` | Создание комментария к посту |
| GET | `/api/comments/:postId` | Получение всех комментариев к посту |
| GET | `/api/comments/comment/:id` | Получение комментария по ID |
| DELETE | `/api/comments/:id` | Удаление комментария |
| POST | `/api/comments/like/:id` | Поставить/убрать лайк комментарию |
| GET | `/api/comments/isliked/:id` | Проверить, поставлен ли лайк комментарию | 