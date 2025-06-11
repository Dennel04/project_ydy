"""
URL configuration for blog project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from posts import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('post/<str:id>/', views.post, name='post'),
    path('<int:id>/', views.google),
    path('', views.home, name='home'),
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('create_post', views.create_post, name='create_post'),
    path('post/<str:post_id>/like/', views.toggle_like, name='toggle_like'),
    path('post/<str:post_id>/like/status/', views.check_like_status, name='check_like_status'),
    path('logout/', views.logout, name='logout'),
    path('profile/', views.profile, name='profile'),
    path('update-profile/', views.update_profile, name='update_profile'),
    path('get-csrf-token/', views.get_csrf_token_view, name='get_csrf_token'),
    path('profile/security/', views.profile_security, name='profile_security'),
    path('profile/change-password/', views.change_password, name='change_password'),
    path('profile/change-email/', views.change_email, name='change_email'),
    path('check-like-status/<str:post_id>/', views.check_like_status, name='check_like_status'),
    path('post/<str:id>/comment/', views.create_comment, name='create_comment'),
    path('comment/<str:comment_id>/like/', views.toggle_comment_like, name='toggle_comment_like'),
    path('post/<str:post_id>/delete/', views.delete_post, name='delete_post'),
]
