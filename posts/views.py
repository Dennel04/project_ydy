from django.http import HttpResponseNotFound, HttpResponseRedirect, JsonResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import requests
import logging
import json
import re
from datetime import datetime

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

API_URL = "https://blog-api-wpbz.onrender.com/api"
CSRF_TOKEN_ENDPOINT = f"{API_URL}/csrf-token"
LIKE_ENDPOINT = f"{API_URL}/posts/like/{{post_id}}"
IS_LIKED_ENDPOINT = f"{API_URL}/posts/isliked/{{post_id}}"

def get_common_headers(request):
    """Return minimal headers for API requests"""
    return {
        "User-Agent": request.META.get('HTTP_USER_AGENT', 'Django App'),
        "Accept": "application/json"  # Этот заголовок допустим, так как он указывает ожидаемый формат ответа
    }

def fetch_csrf_token(session, request):
    """Fetch CSRF token from API or session"""
    csrf_token = request.session.get('csrf_token')
    if csrf_token:
        logger.info("Using cached CSRF token from session")
        return csrf_token
    try:
        headers = get_common_headers(request)
        response = session.get(CSRF_TOKEN_ENDPOINT, headers=headers, timeout=10)
        response.raise_for_status()
        csrf_token = response.json().get('csrfToken')
        if csrf_token:
            request.session['csrf_token'] = csrf_token
            logger.info(f"CSRF token fetched and cached: {csrf_token}")
        return csrf_token
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching CSRF token: {e}")
        return None

def merge_cookies(cookies):
    """Merge cookies, keeping only the latest value for each name"""
    cookie_dict = {}
    for cookie in cookies:
        cookie_dict[cookie.name] = cookie.value
    return cookie_dict

def get_tag_ids(session, tag_names, headers):
    """Convert tag names to tag IDs and track missing tags"""
    try:
        response = session.get(f"{API_URL}/tags", headers=headers, timeout=10)
        response.raise_for_status()
        tags = response.json()
        tag_ids = []
        missing_tags = []
        for tag_name in tag_names:
            for tag in tags:
                if tag['name'].lower() == tag_name.lower():
                    tag_ids.append(tag['id'])
                    break
            else:
                logger.warning(f"Tag '{tag_name}' not found")
                missing_tags.append(tag_name)
        return tag_ids, missing_tags
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching tags: {e}")
        return [], tag_names

def fetch_user_data(session, request, headers, user_id=None):
    """Fetch user data by ID or current user profile from the API"""
    auth_token = request.session.get('auth_token')
    fetch_headers = headers.copy()
    if auth_token:
        fetch_headers["Authorization"] = f"Bearer {auth_token}"

    try:
        if user_id:
            # Fetch specific user by ID
            logger.info(f"Fetching user data for user ID {user_id} from API")
            response = session.get(
                f"{API_URL}/users/{user_id}",
                headers=headers,  # No auth required for public user data
                timeout=10
            )
        else:
            # Fetch current user profile
            logger.info("Fetching current user profile data from API")
            response = session.get(
                f"{API_URL}/users/profile",
                headers=fetch_headers,  # Requires auth
                timeout=10
            )
        response.raise_for_status()
        user_data = response.json()
        if not user_id and 'user' in user_data:
            user_data = user_data.get('user', {})
        logger.info(f"Fetched user data: {user_data}")
        return user_data
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching user data (ID: {user_id or 'profile'}): {e}")
        if hasattr(e, 'response') and e.response:
            try:
                error_data = e.response.json()
                logger.error(f"API error response: {error_data}")
            except ValueError:
                logger.error(f"API error text: {e.response.text}")
        return None

def home(request):
    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    
    try:
        # Получаем посты
        response = session.get(f"{API_URL}/posts", headers=headers, timeout=10)
        response.raise_for_status()
        posts = response.json()
        
        # Кэш для данных пользователей
        user_cache = {}
        
        # Для каждого поста запрашиваем данные автора и обрабатываем дату
        for post in posts:
            author_id = post.get('author', {}).get('id')
            if not author_id:
                logger.warning(f"No author ID found for post {post.get('id')}")
                post['author']['image'] = None
                continue
            
            if author_id in user_cache:
                post['author']['image'] = user_cache[author_id].get('image')
                post['author']['username'] = user_cache[author_id].get('username', post['author'].get('username', 'Unknown'))
            else:
                user_data = fetch_user_data(session, request, headers, user_id=author_id)
                if user_data:
                    user_cache[author_id] = user_data
                    post['author']['image'] = user_data.get('image')
                    post['author']['username'] = user_data.get('username', post['author'].get('username', 'Unknown'))
                else:
                    post['author']['image'] = None
            
            if 'createdAt' in post:
                try:
                    post['createdAt'] = datetime.strptime(post['createdAt'], '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    logger.warning(f"Invalid date format for post {post.get('id')}: {post.get('createdAt')}")
                    post['createdAt'] = None
        
        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        
        return render(request, 'posts/home.html', {'posts': posts})
    except requests.exceptions.RequestException as e:
        error_msg = f"API error: {str(e)}"
        logger.error(error_msg)
        if hasattr(e, 'response') and e.response:
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
            except ValueError:
                error_msg = e.response.text or error_msg
        return render(request, 'posts/home.html', {'error': error_msg})

def post(request, id):
    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    
    try:
        # Запрос данных поста
        response = session.get(f"{API_URL}/posts/{id}", headers=headers, timeout=10)
        response.raise_for_status()
        post_data = response.json()
        
        # Получение данных автора поста
        author_id = post_data.get('author', {}).get('id')
        if author_id:
            author_data = fetch_user_data(session, request, headers, user_id=author_id)
            if author_data:
                post_data['author']['image'] = author_data.get('image')
                post_data['author']['username'] = author_data.get('username', post_data['author'].get('username', 'Unknown'))
            else:
                post_data['author']['image'] = None
        
        # Обработка даты создания поста
        if 'createdAt' in post_data:
            try:
                post_data['createdAt'] = datetime.strptime(post_data['createdAt'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                post_data['createdAt'] = None

        # Запрос комментариев для поста
        comments_response = session.get(f"{API_URL}/comments/post/{id}", headers=headers, timeout=10)
        comments_response.raise_for_status()
        comments_data = comments_response.json()

        # Получение данных авторов комментариев
        user_cache = {}
        for comment in comments_data:
            comment_author_id = comment.get('author', {}).get('id')
            if not comment_author_id:
                logger.warning(f"No author ID found for comment {comment.get('id')}")
                comment['author']['image'] = None
                continue
            if comment_author_id in user_cache:
                comment['author']['image'] = user_cache[comment_author_id].get('image')
                comment['author']['username'] = user_cache[comment_author_id].get('username', comment['author'].get('username', 'Unknown'))
            else:
                user_data = fetch_user_data(session, request, headers, user_id=comment_author_id)
                if user_data:
                    user_cache[comment_author_id] = user_data
                    comment['author']['image'] = user_data.get('image')
                    comment['author']['username'] = user_data.get('username', comment['author'].get('username', 'Unknown'))
                else:
                    comment['author']['image'] = None
            if 'createdAt' in comment:
                try:
                    comment['createdAt'] = datetime.strptime(comment['createdAt'], '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    comment['createdAt'] = None

        # Проверка статуса лайка, если пользователь авторизован
        like_status = None
        if request.session.get('is_authenticated'):
            csrf_token = fetch_csrf_token(session, request)
            if csrf_token:
                check_headers = headers.copy()
                check_headers["X-CSRF-Token"] = csrf_token
                try:
                    response = session.get(
                        IS_LIKED_ENDPOINT.format(post_id=id),
                        headers=check_headers,
                        timeout=10
                    )
                    response.raise_for_status()
                    like_status = response.json()
                    logger.info(f"Like status checked for post {id}: {like_status}")
                except requests.exceptions.RequestException as e:
                    logger.error(f"Error checking like status: {e}")

        # Формирование контекста
        context = {
            'post_dict': post_data,
            'like_status': like_status,
            'is_authenticated': request.session.get('is_authenticated', False),
            'user_data': request.session.get('user_data', {}),
            'comments': comments_data
        }
        
        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        
        return render(request, "posts/post.html", context)
    
    except requests.exceptions.RequestException as e:
        error_msg = f"API error: {str(e)}"
        logger.error(error_msg)
        if hasattr(e, 'response') and e.response:
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
            except ValueError:
                error_msg = e.response.text or error_msg
        return HttpResponseNotFound(error_msg)

def google(request, id):
    url = reverse("post", args=[id])
    return HttpResponseRedirect(url)

def login(request):
    if request.method == 'POST':
        login_val = request.POST.get('login')
        password = request.POST.get('password')
        if not all([login_val, password]):
            return render(request, 'posts/login.html', {'error': 'All fields are required.'})
        session = requests.Session()
        headers = get_common_headers(request)
        saved_cookies = request.session.get('requests_session_cookies', {})
        for name, value in saved_cookies.items():
            session.cookies.set(name, value)
        csrf_token = fetch_csrf_token(session, request)
        if not csrf_token:
            return render(request, 'posts/login.html', {'error': 'Failed to get CSRF token.'})
        auth_headers = headers.copy()
        auth_headers["X-CSRF-Token"] = csrf_token
        data = {
            'login': login_val,
            'password': password
        }
        try:
            response = session.post(
                f"{API_URL}/auth/login",
                json=data,
                headers=auth_headers,
                timeout=10
            )
            response.raise_for_status()
            user_data = response.json()
            request.session['requests_session_cookies'] = merge_cookies(session.cookies)
            request.session['is_authenticated'] = True
            request.session['user_data'] = user_data.get('user', {})
            request.session['csrf_token'] = csrf_token
            if 'token' in user_data or 'accessToken' in user_data:
                request.session['auth_token'] = user_data.get('token') or user_data.get('accessToken')
            django_response = redirect('home')
            for cookie in session.cookies:
                django_response.set_cookie(
                    cookie.name,
                    cookie.value,
                    max_age=cookie.expires if cookie.expires else None,
                    domain=cookie.domain,
                    secure=cookie.secure,
                    httponly=getattr(cookie, '_rest', {}).get('HttpOnly', False)
                )
            return django_response
        except requests.exceptions.RequestException as e:
            error_msg = "Login error."
            if hasattr(e, 'response') and e.response:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get('message', error_msg)
                except ValueError:
                    error_msg = e.response.text or error_msg
            logger.error(f"Login error: {error_msg}")
            return render(request, 'posts/login.html', {'error': error_msg})
    return render(request, 'posts/login.html')

def register(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        password_confirm = request.POST.get('password_confirm')
        terms = request.POST.get('terms')
        if not all([username, email, password, password_confirm]) or terms != "on":
            return render(request, 'posts/register.html', {'error': 'All fields and terms agreement are required.'})
        if password != password_confirm:
            return render(request, 'posts/register.html', {'error': 'Passwords do not match.'})
        session = requests.Session()
        headers = get_common_headers(request)
        saved_cookies = request.session.get('requests_session_cookies', {})
        for name, value in saved_cookies.items():
            session.cookies.set(name, value)
        data = {
            'login': username,
            'username': username,
            'email': email,
            'password': password
        }
        try:
            response = session.post(
                f"{API_URL}/auth/register",
                json=data,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            request.session['requests_session_cookies'] = merge_cookies(session.cookies)
            return render(request, 'posts/verify_email.html', {'email': email})
        except requests.exceptions.RequestException as e:
            error_msg = "Registration error."
            if hasattr(e, 'response') and e.response:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get('message', error_msg)
                except ValueError:
                    error_msg = e.response.text or error_msg
            logger.error(f"Registration error: {error_msg}")
            return render(request, 'posts/register.html', {'error': error_msg})
    return render(request, 'posts/register.html')

def create_post(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        content = request.POST.get('content')
        tags = request.POST.get('tags', '')
        main_image = request.FILES.get('main_image')
        additional_images = request.FILES.getlist('contentImages')
        if not all([title, content]):
            return render(request, 'posts/create_post.html', {'error': 'Title and content are required.'})
        if not request.session.get('is_authenticated'):
            return render(request, 'posts/create_post.html', {'error': 'You must be logged in to create a post.'})
        
        session = requests.Session()
        headers = get_common_headers(request)
        saved_cookies = request.session.get('requests_session_cookies', {})
        for name, value in saved_cookies.items():
            session.cookies.set(name, value)
        
        csrf_token = fetch_csrf_token(session, request)
        if not csrf_token:
            return render(request, 'posts/create_post.html', {'error': 'Failed to get CSRF token.'})
        
        post_headers = headers.copy()
        post_headers["X-CSRF-Token"] = csrf_token
        auth_token = request.session.get('auth_token')
        if auth_token:
            post_headers["Authorization"] = f"Bearer {auth_token}"
        
        tag_names = [tag.strip() for tag in tags.split(',') if tag.strip()] if tags else []
        tag_ids, missing_tags = get_tag_ids(session, tag_names, headers)
        
        if missing_tags:
            logger.warning(f"Some tags were not found: {missing_tags}")
            error_msg = f"The following tags were not found: {', '.join(missing_tags)}. Post created without these tags."
        
        form_data = {
            'name': title,
            'content': content,
            'tags': json.dumps(tag_ids),
            'isPublished': 'true'
        }
        
        files = []
        if main_image:
            files.append(('mainImage', (main_image.name, main_image, main_image.content_type)))
        for i, image in enumerate(additional_images):
            files.append(('contentImages', (image.name, image, image.content_type)))
        
        try:
            response = session.post(
                f"{API_URL}/posts",
                data=form_data,
                files=files if files else None,
                headers=post_headers,
                timeout=15
            )
            response.raise_for_status()
            post_data = response.json()
            post_id = post_data.get('_id') or post_data.get('id')
            if not post_id:
                return render(request, 'posts/create_post.html', {'error': 'Failed to create post: No ID returned.'})
            
            request.session['requests_session_cookies'] = merge_cookies(session.cookies)
            request.session['csrf_token'] = csrf_token
            
            if missing_tags:
                return render(request, 'posts/create_post.html', {
                    'success': f"Post created successfully, but some tags were not found: {', '.join(missing_tags)}",
                    'post_id': post_id
                })
            
            return redirect('post', id=post_id)
        except requests.exceptions.RequestException as e:
            error_msg = "Error creating post."
            if hasattr(e, 'response') and e.response:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get('message', error_msg)
                except ValueError:
                    error_msg = e.response.text or error_msg
            logger.error(f"Post creation error: {error_msg}")
            return render(request, 'posts/create_post.html', {'error': error_msg})
    
    return render(request, 'posts/create_post.html')

@require_http_methods(["GET"])
def check_like_status(request, post_id):
    """Check if the post is liked by the current user"""
    if not request.session.get('is_authenticated'):
        return JsonResponse({
            'error': 'Authentication required',
            'isLiked': False
        }, status=401)
    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    csrf_token = fetch_csrf_token(session, request)
    if not csrf_token:
        return JsonResponse({
            'error': 'Failed to get CSRF token',
            'isLiked': False
        }, status=500)
    check_headers = headers.copy()
    check_headers["X-CSRF-Token"] = csrf_token
    try:
        response = session.get(
            IS_LIKED_ENDPOINT.format(post_id=post_id),
            headers=check_headers,
            timeout=10
        )
        response.raise_for_status()
        like_status = response.json()
        logger.info(f"Like status checked for post {post_id}: {like_status}")
        return JsonResponse(like_status)
    except requests.exceptions.RequestException as e:
        logger.error(f"Error checking like status: {e}")
        return JsonResponse({
            'error': 'Failed to check like status',
            'isLiked': False
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def toggle_like(request, post_id):
    """Toggle like on a post (like or unlike)"""
    if not request.session.get('is_authenticated'):
        return JsonResponse({
            'error': 'Authentication required',
            'success': False
        }, status=401)
    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    csrf_token = fetch_csrf_token(session, request)
    if not csrf_token:
        return JsonResponse({
            'error': 'Failed to get CSRF token',
            'success': False
        }, status=500)
    like_headers = headers.copy()
    like_headers["X-CSRF-Token"] = csrf_token
    try:
        response = session.post(
            LIKE_ENDPOINT.format(post_id=post_id),
            headers=like_headers,
            json={},
            timeout=10
        )
        response.raise_for_status()
        like_response = response.json()
        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        request.session['csrf_token'] = csrf_token
        logger.info(f"Like toggled for post {post_id}: {like_response}")
        return JsonResponse({
            'success': True,
            **like_response
        })
    except requests.exceptions.RequestException as e:
        error_msg = "Failed to toggle like"
        if hasattr(e, 'response') and e.response:
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
            except ValueError:
                error_msg = e.response.text or error_msg
        logger.error(f"Error toggling like: {error_msg}")
        return JsonResponse({
            'error': error_msg,
            'success': False
        }, status=getattr(e.response, 'status_code', 500) if hasattr(e, 'response') else 500)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_post(request, post_id):
    """Delete a post"""
    if not request.session.get('is_authenticated'):
        return JsonResponse({
            'error': 'Требуется авторизация',
            'success': False
        }, status=401)

    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)

    csrf_token = fetch_csrf_token(session, request)
    if not csrf_token:
        return JsonResponse({
            'error': 'Не удалось получить CSRF-токен',
            'success': False
        }, status=500)

    auth_token = request.session.get('auth_token')
    if not auth_token:
        return JsonResponse({
            'error': 'Требуется авторизация',
            'success': False
        }, status=401)

    delete_headers = headers.copy()
    delete_headers["X-CSRF-Token"] = csrf_token
    delete_headers["Authorization"] = f"Bearer {auth_token}"

    try:
        response = session.delete(
            f"{API_URL}/posts/{post_id}",
            headers=delete_headers,
            timeout=10
        )
        response.raise_for_status()

        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        request.session['csrf_token'] = csrf_token
        request.session.modified = True

        logger.info(f"Post {post_id} deleted successfully")
        return JsonResponse({
            'success': True,
            'message': 'Пост успешно удален'
        })
    except requests.exceptions.RequestException as e:
        error_msg = "Ошибка при удалении поста"
        status_code = 500
        if hasattr(e, 'response') and e.response:
            status_code = e.response.status_code
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
            except ValueError:
                error_msg = e.response.text or error_msg
        logger.error(f"Error deleting post {post_id}: {error_msg}")
        return JsonResponse({
            'error': error_msg,
            'success': False
        }, status=status_code)

def logout(request):
    """Logout user and clear session"""
    request.session.flush()
    return redirect('home')

def profile(request):
    if not request.session.get('is_authenticated'):
        return redirect('login')
    
    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    
    user_data = fetch_user_data(session, request, headers)  # Fetch current user profile
    logger.info(f"user_data from API: {user_data}")
    
    if not user_data:
        user_data = request.session.get('user_data', {})
        logger.warning("Using fallback session user_data due to API failure")
    else:
        request.session['user_data'] = user_data
        request.session.modified = True
    
    logger.info(f"Final user_data: {user_data}")
    logger.info(f"Avatar URL: {user_data.get('avatar', 'No avatar URL')}")
    
    context = {
        'user_data': user_data,
    }
    return render(request, 'posts/profile.html', context)

@require_http_methods(["POST"])
@csrf_exempt
def update_profile(request):
    """Update user profile"""
    if not request.session.get('is_authenticated'):
        return JsonResponse({'error': 'Authentication required'}, status=401)

    session = requests.Session()
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    csrf_token = fetch_csrf_token(session, request)
    if not csrf_token:
        return JsonResponse({'error': 'Failed to fetch CSRF token'}, status=500)
    headers = get_common_headers(request)
    headers["X-CSRF-Token"] = csrf_token
    auth_token = request.session.get('auth_token')
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        username = request.POST.get('username')
        description = request.POST.get('description')
        avatar = request.FILES.get('avatar')
        
        form_data = {}
        if username is not None:
            form_data['username'] = username
        if description is not None:
            form_data['description'] = description
        
        files = []
        if avatar:
            files.append(('avatar', (avatar.name, avatar, avatar.content_type)))
        
        logger.info(f"Sending profile update with data: {form_data}, has avatar: {bool(avatar)}")
        logger.info(f"Headers: {headers}")
        
        response = session.put(
            f"{API_URL}/users/profile",
            data=form_data,
            files=files if files else None,
            headers=headers,
            timeout=15
        )
        response.raise_for_status()
        
        fresh_user_data = fetch_user_data(session, request, headers)
        if not fresh_user_data:
            logger.warning("Failed to fetch fresh user data after profile update")
            user_data = response.json().get('user', {})
            current_user_data = request.session.get('user_data', {})
            current_user_data.update(user_data)
            request.session['user_data'] = current_user_data
        else:
            request.session['user_data'] = fresh_user_data
        
        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        request.session['csrf_token'] = csrf_token
        request.session.modified = True
        
        return JsonResponse({
            'message': 'Profile updated successfully',
            'user': request.session['user_data']
        })
    except requests.exceptions.RequestException as e:
        error_msg = "Failed to update profile"
        status_code = 500
        if hasattr(e, 'response') and e.response:
            status_code = e.response.status_code
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
            except ValueError:
                error_msg = e.response.text or error_msg
        logger.error(f"Profile update error: {error_msg} (Status: {status_code})")
        logger.error(f"Request exception details: {str(e)}")
        return JsonResponse({'error': error_msg}, status=status_code)

@require_http_methods(["PUT"])
@csrf_exempt
def change_password(request):
    """Change user password"""
    if not request.session.get('is_authenticated'):
        return JsonResponse({'error': 'Требуется авторизация'}, status=401)

    session = requests.Session()
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    csrf_token = fetch_csrf_token(session, request)
    if not csrf_token:
        return JsonResponse({'error': 'Не удалось получить CSRF-токен'}, status=500)
    headers = get_common_headers(request)
    headers["X-CSRF-Token"] = csrf_token
    auth_token = request.session.get('auth_token')
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        data = json.loads(request.body)
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        logger.info(f"Получены данные: currentPassword={current_password}, newPassword={new_password}")
        
        if not all([current_password, new_password]):
            return JsonResponse({'error': 'Все поля обязательны'}, status=400)
        
        if len(new_password) < 8 or not any(c.isdigit() for c in new_password) or not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in new_password):
            return JsonResponse({'error': 'Новый пароль должен быть длиной не менее 8 символов и содержать цифры и специальные символы'}, status=400)
        
        api_data = {
            'currentPassword': current_password,
            'newPassword': new_password
        }
        
        logger.info(f"Отправка данных на API: {api_data}")
        logger.info(f"Заголовки: {headers}")
        
        response = session.put(
            f"{API_URL}/users/change-password",
            json=api_data,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        
        response_data = response.json()
        
        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        request.session['csrf_token'] = csrf_token
        request.session.modified = True
        
        return JsonResponse({
            'message': response_data.get('message', 'Пароль успешно изменен')
        })
    except requests.exceptions.RequestException as e:
        error_msg = "Ошибка при смене пароля"
        status_code = 500
        is_google_user = False
        if hasattr(e, 'response') and e.response:
            status_code = e.response.status_code
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
                is_google_user = error_data.get('isGoogleUser', False)
            except ValueError:
                error_msg = e.response.text or error_msg
        logger.error(f"Ошибка смены пароля: {error_msg} (Статус: {status_code})")
        logger.error(f"Детали исключения: {str(e)}")
        return JsonResponse({'error': error_msg, 'isGoogleUser': is_google_user}, status=status_code)
    except json.JSONDecodeError:
        logger.error("Не удалось разобрать JSON-тело запроса")
        return JsonResponse({'error': 'Неверный формат JSON'}, status=400)

@require_http_methods(["PUT"])
@csrf_exempt
def change_email(request):
    """Change user email"""
    if not request.session.get('is_authenticated'):
        return JsonResponse({'error': 'Требуется авторизация'}, status=401)

    session = requests.Session()
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    csrf_token = fetch_csrf_token(session, request)
    if not csrf_token:
        return JsonResponse({'error': 'Не удалось получить CSRF-токен'}, status=500)
    headers = get_common_headers(request)
    headers["X-CSRF-Token"] = csrf_token
    auth_token = request.session.get('auth_token')
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        data = json.loads(request.body)
        new_email = data.get('newEmail')
        password = data.get('password')
        
        logger.info(f"Получены данные: newEmail={new_email}, password=******")
        
        if not all([new_email, password]):
            return JsonResponse({'error': 'Email и пароль обязательны'}, status=400)
        
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', new_email):
            return JsonResponse({'error': 'Неверный формат email'}, status=400)
        
        api_data = {
            'newEmail': new_email,
            'password': password
        }
        
        logger.info(f"Отправка данных на API: {api_data}")
        logger.info(f"Заголовки: {headers}")
        
        response = session.put(
            f"{API_URL}/users/change-email",
            json=api_data,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        
        response_data = response.json()
        
        fresh_user_data = fetch_user_data(session, request, headers)
        if not fresh_user_data:
            logger.warning("Не удалось получить свежие данные пользователя после смены email")
            current_user_data = request.session.get('user_data', {})
            current_user_data['email'] = new_email
            request.session['user_data'] = current_user_data
        else:
            request.session['user_data'] = fresh_user_data
        
        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        request.session['csrf_token'] = csrf_token
        request.session.modified = True
        
        return JsonResponse({
            'message': response_data.get('message', 'Email успешно изменен. Пожалуйста, подтвердите новый email, перейдя по ссылке в письме.'),
            'requiresVerification': response_data.get('requiresVerification', True)
        })
    except requests.exceptions.RequestException as e:
        error_msg = "Ошибка при смене email"
        status_code = 500
        is_google_user = False
        if hasattr(e, 'response') and e.response:
            status_code = e.response.status_code
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
                is_google_user = error_data.get('isGoogleUser', False)
            except ValueError:
                error_msg = e.response.text or error_msg
        logger.error(f"Ошибка смены email: {error_msg} (Статус: {status_code})")
        logger.error(f"Детали исключения: {str(e)}")
        return JsonResponse({'error': error_msg, 'isGoogleUser': is_google_user}, status=status_code)
    except json.JSONDecodeError:
        logger.error("Не удалось разобрать JSON-тело запроса")
        return JsonResponse({'error': 'Неверный формат JSON'}, status=400)

@require_http_methods(["GET"])
@csrf_exempt
def get_csrf_token_view(request):
    """Dedicated view to return CSRF token for frontend"""
    session = requests.Session()
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    csrf_token = fetch_csrf_token(session, request)
    if csrf_token:
        return JsonResponse({'csrfToken': csrf_token})
    return JsonResponse({'error': 'Failed to fetch CSRF token'}, status=500)

def profile_security(request):
    """Display user security settings page"""
    if not request.session.get('is_authenticated'):
        return redirect('login')
    
    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)
    
    user_data = fetch_user_data(session, request, headers)
    
    if not user_data:
        user_data = request.session.get('user_data', {})
        logger.warning("Using fallback session user_data due to API failure")
    else:
        request.session['user_data'] = user_data
        request.session.modified = True
    
    context = {
        'user_data': user_data,
    }
    return render(request, 'posts/profile_security.html', context)

@require_http_methods(["POST"])
@csrf_exempt
def create_comment(request, id):
    """Create a new comment for a post"""
    if not request.session.get('is_authenticated'):
        return JsonResponse({
            'error': 'Требуется авторизация',
            'success': False
        }, status=401)

    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)

    csrf_token = fetch_csrf_token(session, request)
    if not csrf_token:
        return JsonResponse({
            'error': 'Не удалось получить CSRF-токен',
            'success': False
        }, status=500)

    auth_token = request.session.get('auth_token')
    if not auth_token:
        return JsonResponse({
            'error': 'Требуется авторизация',
            'success': False
        }, status=401)

    comment_headers = headers.copy()
    comment_headers["X-CSRF-Token"] = csrf_token
    comment_headers["Authorization"] = f"Bearer {auth_token}"

    try:
        data = json.loads(request.body)
        text = data.get('text')
        if not text:
            return JsonResponse({
                'error': 'Содержание комментария не может быть пустым',
                'success': False
            }, status=400)

        api_data = {'text': text}
        response = session.post(
            f"{API_URL}/comments/{id}",
            json=api_data,
            headers=comment_headers,
            timeout=10
        )
        response.raise_for_status()
        comment_data = response.json()

        author_id = comment_data.get('author', {}).get('id')
        if author_id:
            user_data = fetch_user_data(session, request, headers, user_id=author_id)
            if user_data:
                comment_data['author']['image'] = user_data.get('image')
                comment_data['author']['username'] = user_data.get('username', comment_data['author'].get('username', 'Unknown'))
            else:
                comment_data['author']['image'] = None

        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        request.session['csrf_token'] = csrf_token
        request.session.modified = True

        logger.info(f"Comment created for post {id}: {comment_data}")
        return JsonResponse({
            'success': True,
            **comment_data
        }, status=201)
    except requests.exceptions.RequestException as e:
        error_msg = "Ошибка при создании комментария"
        status_code = 500
        if hasattr(e, 'response') and e.response:
            status_code = e.response.status_code
            try:
                error_data = e.response.json()
                error_msg = e.response.json().get('message', error_msg)
            except ValueError:
                error_msg = e.response.text or error_msg
        logger.error(f"Error creating comment: {error_msg}")
        return JsonResponse({
            'error': error_msg,
            'success': False
        }, status=status_code)
    except json.JSONDecodeError:
        logger.error("Не удалось разобрать JSON-тело запроса")
        return JsonResponse({
            'error': 'Неверный формат JSON',
            'success': False
        }, status=400)

@require_http_methods(["POST"])
@csrf_exempt
def toggle_comment_like(request, comment_id):
    """Toggle like on a comment"""
    if not request.session.get('is_authenticated'):
        return JsonResponse({
            'error': 'Требуется авторизация',
            'success': False
        }, status=401)

    session = requests.Session()
    headers = get_common_headers(request)
    saved_cookies = request.session.get('requests_session_cookies', {})
    for name, value in saved_cookies.items():
        session.cookies.set(name, value)

    csrf_token = fetch_csrf_token(session, request)
    if not csrf_token:
        return JsonResponse({
            'error': 'Не удалось получить CSRF-токен',
            'success': False
        }, status=500)

    like_headers = headers.copy()
    like_headers["X-CSRF-Token"] = csrf_token
    auth_token = request.session.get('auth_token')
    if auth_token:
        like_headers["Authorization"] = f"Bearer {auth_token}"

    try:
        response = session.post(
            f"{API_URL}/comments/like/{comment_id}",
            headers=like_headers,
            json={},
            timeout=10
        )
        response.raise_for_status()
        like_response = response.json()

        request.session['requests_session_cookies'] = merge_cookies(session.cookies)
        request.session['csrf_token'] = csrf_token
        request.session.modified = True

        logger.info(f"Like toggled for comment {comment_id}: {like_response}")
        return JsonResponse({
            'success': True,
            **like_response
        })
    except requests.exceptions.RequestException as e:
        error_msg = "Ошибка при обновлении лайка комментария"
        status_code = 500
        if hasattr(e, 'response') and e.response:
            status_code = e.response.status_code
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
            except ValueError:
                error_msg = e.response.text or error_msg
        logger.error(f"Error toggling comment like: {error_msg}")
        return JsonResponse({
            'error': error_msg,
            'success': False
        }, status=status_code)