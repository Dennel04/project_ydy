# Google OAuth Setup for Authentication

## Step 1: Create a Project in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth Client ID"
5. If required, first configure the "OAuth consent screen" (enter app name, support email, and homepage)
6. Select application type "Web application"
7. Fill out the form:
   - Name: your application name
   - Authorized redirect URIs:
     - For development: `http://localhost:5000/api/auth/google/callback`
     - For production: `https://your-domain.com/api/auth/google/callback`
8. Click "Create"
9. Save the generated Client ID and Client Secret

## Step 2: Configure Environment Variables

Add the following variables to your `.env` file:

```
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
FRONTEND_URL=http://localhost:3000 # Frontend URL for redirect after authentication
```

## Step 3: Frontend Setup

On the frontend you need to:

1. Create a page to handle the callback from Google OAuth
2. Create a "Sign in with Google" button that redirects to `/api/auth/google`

Example React component for handling the callback:

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
        // Get token from URL
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        
        if (!token) {
          throw new Error('Token not found');
        }
        
        // Verify token via API
        const response = await fetch('/api/auth/google/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          throw new Error('Authorization error');
        }
        
        const data = await response.json();
        
        // Save token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to home page
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
    return <div>Loading...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return null;
}

export default GoogleCallback;
```

Example Google login button:

```jsx
function GoogleLoginButton() {
  return (
    <a 
      href="/api/auth/google"
      className="google-login-button"
    >
      Sign in with Google
    </a>
  );
}
```

## Step 4: Testing

1. Make sure all environment variables are set correctly
2. Restart the server
3. Go to the login page in your app
4. Click the "Sign in with Google" button
5. Follow Google's instructions to authorize
6. After successful authorization, you should be redirected back to your app

## Troubleshooting

1. If you get a "Redirect URI mismatch" error, make sure the URL in Google Cloud Console exactly matches your callbackURL in Passport configuration
2. Check the console for errors
3. Make sure all required environment variables are set correctly 