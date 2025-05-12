# Деплой API на Render.com

## Подготовка

1. Зарегистрируйтесь на [Render.com](https://render.com)
2. Создайте базу данных MongoDB Atlas, если еще нет
3. Убедитесь, что ваш репозиторий загружен на GitHub

## Шаги деплоя

1. **Вход в Render Dashboard**
   - Войдите в Render Dashboard: https://dashboard.render.com

2. **Создание нового Web Service**
   - Нажмите "New" -> "Web Service"
   - Подключите ваш GitHub репозиторий

3. **Настройка сервиса**
   - Name: `blog-api` (или любое другое название)
   - Region: Выберите ближайший регион
   - Branch: `main` (или другую ветку с кодом)
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free

4. **Настройка переменных окружения**
   - Нажмите "Advanced" -> "Add Environment Variable"
   - Добавьте следующие переменные:
     ```
     NODE_ENV=production
     MONGO_URI=mongodb+srv://...
     JWT_SECRET=ваш_секретный_ключ
     GMAIL_USER=your_email@gmail.com
     GMAIL_PASS=your_app_password
     ```

5. **Создание сервиса**
   - Нажмите "Create Web Service"
   - Дождитесь окончания деплоя (это может занять несколько минут)

## Тестирование API

После деплоя ваш API будет доступен по адресу:
```
https://blog-api.onrender.com/
```
(адрес будет другим, с вашим собственным поддоменом)

Вы можете проверить работу API, отправив запрос на:
```
https://blog-api.onrender.com/api/posts
```

## Важные замечания

1. **Загрузка файлов**: На бесплатном плане Render файлы, загруженные в файловую систему, будут удалены при перезапуске сервиса. Для продакшена рекомендуется использовать облачное хранилище (AWS S3, Cloudinary и т.д.)

2. **Режим сна**: На бесплатном плане сервис "засыпает" после 15 минут неактивности. Первый запрос после сна может занять до 30 секунд.

3. **Логи**: Render предоставляет доступ к логам вашего приложения через Dashboard. Используйте их для отладки. 