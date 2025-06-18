# Modern Blog Platform

A modern, responsive blog platform built with Django and a beautiful UI. The project features a clean, minimalist design with full user authentication and blog post management capabilities.

## 🚀 Features

- 👤 User Authentication
  - Registration with email verification
  - Secure login/logout
  - Profile management
  - Password and email change functionality

- 📝 Blog Posts
  - Create and publish posts
  - Support for images (main image + additional content images)
  - Tag system for post categorization
  - Like/unlike posts
  - Comments system with likes

- 🎨 Modern UI
  - Responsive design
  - Clean sidebar navigation
  - User-friendly search interface
  - Beautiful typography with Poppins font
  - Profile avatars with fallback to initials

- 🔒 Security Features
  - CSRF protection
  - Secure session handling
  - HTTP-only cookies
  - Password validation

## 🛠 Tech Stack

- Django 5.1.6
- SQLite database
- Modern HTML/CSS
- RESTful API integration

## 🚦 Getting Started

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd project_ydy
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install django requests
   ```

4. Run migrations:
   ```bash
   python manage.py migrate
   ```

5. Start the development server:
   ```bash
   python manage.py runserver
   ```

6. Visit http://127.0.0.1:8000 in your browser

## 🌐 API Integration

The project integrates with an external API for data persistence. The API endpoint is configured at:
```python
API_URL = "https://blog-api-wpbz.onrender.com/api"
```

## 📝 License

This project is open source and available under the MIT License. 
