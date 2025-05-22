from django.db import models

# Create your models here.

# Создаем модель Tag (тег)
class Tag(models.Model):  
    # CharField - поле для хранения строки (text field for storing strings)
    # max_length=50 - максимальная длина строки 50 символов
    name = models.CharField(max_length=50)
    
    # Специальный метод Python, который возвращает строковое представление объекта
    # Используется в админке Django и при print(tag_object)
    def __str__(self):  # Double underscore (dunder) method
        return self.name

# Создаем модель Post (пост/статья)
class Post(models.Model):
    # Поля модели (Fields):
    title = models.CharField(max_length=200)  # Заголовок поста
    content = models.TextField()  # Большое текстовое поле для контента
    
    # ManyToManyField - связь "многие-ко-многим"
    # Один пост может иметь много тегов
    # Один тег может быть у многих постов
    tags = models.ManyToManyField(Tag)