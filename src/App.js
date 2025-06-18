import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BaseLayout from './components/BaseLayout';
import HomePage from './pages/HomePage';
import PostPage from './pages/PostPage';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ProfileSecurity from './pages/ProfileSecurity';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import CreatePost from './pages/CreatePost';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './styles/theme.css';
import './App.css';

function AppContent() {
  const { isAuthenticated, userData } = useAuth();
  
  return (
    <Router>
      <BaseLayout isAuthenticated={isAuthenticated} userData={userData}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/security" element={<ProfileSecurity />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/create-post" element={<CreatePost />} />
        </Routes>
      </BaseLayout>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;