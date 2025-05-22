from django.urls import path
from . import views

urlpatterns = [
    path('post/<str:id>/', views.post, name='post')  # заменили int на str
]
