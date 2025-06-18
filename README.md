# Blog API

REST API for a blog platform built with Node.js, Express, and MongoDB.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Running](#running)
- [Local Testing](#local-testing)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Users](#users)
  - [Posts](#posts)
  - [Comments](#comments)
  - [Tags](#tags)
- [Image Storage](#image-storage)
- [Google OAuth](#google-oauth)
- [Deployment](#deployment)
- [Security](#security)
- [Working with Images in Posts](#working-with-images-in-posts)

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd Blog/Backend

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory of the project with the following variables:

```env
# Server port (default 5000)
PORT=5000

# MongoDB connection URI
MONGO_URI=mongodb://localhost:27017/blog_db

# Secret key for JWT
JWT_SECRET=your_jwt_secret_key

# Secret key for CSRF protection
CSRF_SECRET=your_csrf_secret_key

# Email sending credentials
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password

# Cloudinary settings for image storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:3000
```

## Running

```bash
# Initialize predefined tags
npm run seed-tags

# Migrate image data in existing posts
npm run migrate-posts

# Start in development mode
npm run dev

# Start in production mode
npm start
```

## Local Testing

The project includes a simple test client for local API testing.

### Using the Test Client

1. Open the `TestClient/index.html` file in your browser
2. Enter your API URL: `http://localhost:5000/api` (or the remote API URL)
3. Click the "Update URL" button
4. Use the interface to test various API endpoints

### Solving CORS Issues

If you get CORS errors during local testing:

1. In development mode, the API automatically allows requests from local domains
2. If you still have issues, try running the test client via a simple HTTP server:
   ```bash
   # Install a simple HTTP server
   npm install -g http-server
   
   # Run in the TestClient folder
   cd TestClient
   http-server -p 8080
   ```
   Then open http://localhost:8080 in your browser

3. For frontend development, it is recommended to set up a proxy in package.json:
   ```json
   "proxy": "http://localhost:5000"
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/verify-email` | Email verification |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/refresh-token` | Refresh token |
| GET | `/api/auth/google` | Google authentication |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/csrf-token` | Get CSRF token |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get current user's profile |
| GET | `/api/users/:id` | Get public user profile |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/change-password` | Change password |
| PUT | `/api/users/change-email` | Change email |
| POST | `/api/users/upload-avatar` | Upload avatar |
| DELETE | `/api/users/remove-avatar` | Remove avatar |
| GET | `/api/users/auth-type` | Check authentication type (email/Google) |

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | Get all posts |
| GET | `/api/posts/:id` | Get post by ID |
| GET | `/api/posts/user/:userId` | Get all posts by user |
| GET | `/api/posts/search` | Search and filter posts |
| POST | `/api/posts` | Create a new post |
| PUT | `/api/posts/:id` | Edit post |
| DELETE | `/api/posts/:id` | Delete post |
| POST | `/api/posts/like/:id` | Like/unlike post |
| GET | `/api/posts/isliked/:id` | Check if post is liked |
| POST | `/api/posts/favourite/:id` | Add/remove from favorites |
| GET | `/api/posts/isfavourite/:id` | Check if post is in favorites |
| GET | `/api/posts/favourites` | Get all favorite posts |
| POST | `/api/posts/upload-main-image/:id` | Upload main image for post |
| POST | `/api/posts/upload-content-image/:id` | Upload content image for post |
| DELETE | `/api/posts/delete-main-image/:id` | Delete main image |
| DELETE | `/api/posts/delete-content-image/:id` | Delete content image from post |
| GET | `/api/posts/bytag/:tagId` | Get posts by tag |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments/:postId` | Create a comment for a post |
| GET | `/api/comments/:postId` | Get all comments for a post |
| GET | `/api/comments/comment/:id` | Get comment by ID |
| DELETE | `/api/comments/:id` | Delete comment |
| POST | `/api/comments/like/:id` | Like/unlike comment |
| GET | `/api/comments/isliked/:id` | Check if comment is liked |

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | Get all tags |
| GET | `/api/tags/:id` | Get tag by ID |
| GET | `/api/tags/slug/:slug` | Get tag by URL slug |
| POST | `/api/tags` | Create a new tag (admin only) |
| PUT | `/api/tags/:id` | Update tag (admin only) |
| DELETE | `/api/tags/:id` | Delete tag (admin only) |

## Image Storage

The API uses Cloudinary to store uploaded images (user avatars and post images).

### Features

- Automatic image optimization
- Size limit (up to 5MB for avatars, up to 10MB for post images)
- Supported formats: jpg, jpeg, png, gif, webp
- Automatic conversion to optimal format
- Automatic deletion of old images when updating
- Separate folders for different image types: "blog-avatars", "blog-post-images"
- Automatic resizing for different devices

### Setup

To use Cloudinary, create an account at [cloudinary.com](https://cloudinary.com) and get:
- Cloud Name
- API Key
- API Secret

These values should be set in the `.env` file as described in the [Configuration](#configuration) section.

## Google OAuth

The API supports authentication via Google OAuth. Detailed setup instructions are in [README_GOOGLE_AUTH.md](./README_GOOGLE_AUTH.md).

## Deployment

Instructions for deploying the API to Render.com are in [deploy.md](./deploy.md).

## Security

The API implements several layers of protection:

1. **JWT Authentication**
   - Tokens are stored in both localStorage and secure HTTP-only cookies
   - Token refresh mechanism

2. **CSRF Protection**
   - Double Submit Cookie Pattern
   - CSRF token required for mutating operations (POST, PUT, DELETE)
   - Get token: `GET /api/csrf-token`

3. **Rate Limiting**
   - 100 requests per 15-minute window per IP address
   - Protection against brute-force attacks on authentication routes

4. **Secure Headers (Helmet)**
   - Content Security Policy (CSP)
   - XSS Protection
   - MIME type sniffing protection
   - Strict Transport Security (HSTS)
   - Frameguard for clickjacking protection

5. **Password Security**
   - Hashing with bcrypt
   - Temporary account lockout after several failed login attempts
   - Password strength validation

> **Note:** In development mode, some security measures are relaxed for easier testing. In production, all protection mechanisms are active.

## API Response Formatting

The API automatically formats all responses for compatibility with various frontend frameworks:

### MongoDB ID Format

- The standard MongoDB `_id` is automatically converted to `id` (without underscore)
- This ensures better compatibility with Django and other frameworks

### Date Formatting

- Dates (createdAt, updatedAt, etc.) are converted from ISO format to a more readable format:
  ```
  From: "2023-06-15T12:30:45.123Z"
  To:   "2023-06-15 12:30:45"
  ```

### Technical Implementation

Formatting is implemented via:
- The `responseFormatter` middleware, which is automatically applied to all API responses
- The `formatResponse` utility for manual formatting if needed

### Example API Response:

Before formatting:
```json
{
  "_id": "64a1e2b3c5d6e7f8g9h0i1j2",
  "name": "Sample post",
  "author": {
    "_id": "64a1e2b3c5d6e7f8g9h0i1j3",
    "username": "user123"
  },
  "createdAt": "2023-06-15T12:30:45.123Z",
  "updatedAt": "2023-06-16T10:20:30.456Z"
}
```

After formatting:
```json
{
  "id": "64a1e2b3c5d6e7f8g9h0i1j2",
  "name": "Sample post",
  "author": {
    "id": "64a1e2b3c5d6e7f8g9h0i1j3",
    "username": "user123"
  },
  "createdAt": "2023-06-15 12:30:45",
  "updatedAt": "2023-06-16 10:20:30"
}
```

## API Security

### User Data Sanitization

To protect sensitive data, the `sanitizeUser` function filters out private and sensitive fields before sending to the client:

- **Sensitive fields** (always excluded):
  - password
  - passwordResetToken
  - passwordResetExpires
  - loginAttempts
  - lockUntil
  - googleId
  - __v

- **Private fields** (available only to the user):
  - login
  - email
  - email verification
  - list of posts
  - likes/favorites
  - creation/update dates

- **Public fields** (available to everyone):
  - id
  - username
  - description
  - avatar

`santizeUser` modes:
1. `{ publicView: false }` (default) - returns private and public fields
2. `{ publicView: true }` - returns only public fields
3. `{ includeFields: ['field1', 'field2'] }` - adds specified fields

The function converts `_id` to `id` for client convenience and works with mongoose documents.

### Testing

To test sanitization functionality, use the test scenario `tests/sanitizeUser.test.js`.

### Email Verification and Unverified Account Management

The API implements an email verification system to enhance security and prevent fake registrations:

#### Registration with Verification Process

1. User registers with an email
2. A verification email is sent to the provided address
3. The account is activated after following the link
4. Unverified accounts cannot log in

#### Automatic Cleanup of Unverified Accounts

- Unverified accounts have a 48-hour lifetime
- After this period, they are automatically deleted:
  - When trying to register with the same login/email
  - When running the cleanup script (`npm run cleanup-users`)

#### Resending Verification

- The API supports resending the verification email
- Endpoint: `POST /api/auth/resend-verification`
- Required data: `email` of the unverified account
- When resent, the account's lifetime is extended by 48 hours

#### Setting Up Regular Cleanup

To automatically clean up expired accounts on the server, you can set up a cron job:

```bash
# Example cron job for daily cleanup at midnight
0 0 * * * cd /path/to/backend && npm run cleanup-users >> /var/log/cleanup-users.log 2>&1
```

## Working with Images in Posts

The blog supports two types of images:

1. **Main image (mainImage)** - displayed at the top of the post after the title
2. **Content images (images)** - an array of images embedded in the post content

### API for Working with Images

#### Creating a Post with Images
```
POST /api/posts
```
The API supports creating a post with image uploads in a single request via multipart/form-data.

**Parameters:**
- `name` - post title
- `content` - post content
- `tags` - array or string with tag IDs
- `isPublished` - publication status (optional)
- `mainImage` - main image file (optional)
- `contentImages` - content image files (optional, multiple allowed)

**Example form usage:**
```html
<form method="post" enctype="multipart/form-data">
  <input type="text" name="name" value="Post title">
  <textarea name="content">Post content</textarea>
  <input type="file" name="mainImage" accept="image/*">
  <input type="file" name="contentImages" accept="image/*" multiple>
  <button type="submit">Create post</button>
</form>
```

**Response:**
```json
{
  "id": "60d21b4667d0d8992e610c85",
  "name": "Post title",
  "content": "Post content...",
  "mainImage": "https://res.cloudinary.com/...",
  "images": ["https://res.cloudinary.com/...", "..."],
  "author": {
    "id": "60d21b4667d0d8992e610c86",
    "username": "user123"
  }
}
```

#### Uploading Main Image
```
POST /api/posts/upload-main-image/:id
```
Uploads the main image for an existing post. If the post already has a main image, it will be replaced.

**Parameters:**
- `:id` - post ID
- `image` - image file (multipart/form-data)

**Response:**
```json
{
  "message": "Main image uploaded successfully",
  "imageUrl": "https://res.cloudinary.com/..."
}
```

#### Uploading Content Image
```
POST /api/posts/upload-content-image/:id
```
Uploads an image and adds it to the post's images array.

**Parameters:**
- `:id` - post ID
- `image` - image file (multipart/form-data)

**Response:**
```json
{
  "message": "Content image uploaded successfully",
  "imageUrl": "https://res.cloudinary.com/..."
}
```

#### Deleting Content Image
```
DELETE /api/posts/delete-content-image/:id
```
Removes an image from the post's images array.

**Parameters:**
- `:id` - post ID
- Body:
```json
{
  "imageUrl": "https://res.cloudinary.com/..."
}
```

**Response:**
```json
{
  "message": "Image deleted successfully",
  "images": ["https://res.cloudinary.com/...", "..."]
}
```

#### Deleting Main Image
```
DELETE /api/posts/delete-main-image/:id
```

**Parameters:**
- `:id` - post ID

**Response:**
```json
{
  "message": "Main image deleted successfully"
}
```

### Using Images in Posts

When creating or editing a post, you can specify the main image and content images:

```json
{
  "name": "Post title",
  "content": "Post content... Text with images...",
  "tags": ["id_tag1", "id_tag2"],
  "mainImage": "https://res.cloudinary.com/...",
  "images": [
    "https://res.cloudinary.com/...",
    "https://res.cloudinary.com/..."
  ]
}
```

**Notes:**
- `mainImage` and `images` fields are optional
- You can create text-only posts without images
- Content images must be placed in the text in the same order as they are in the `images` array
- Use multipart/form-data for creating a post with image uploads
- For updating an existing post with images, it is recommended to use separate upload endpoints 