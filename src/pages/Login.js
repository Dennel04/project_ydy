import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        login: '',
        password: '',
        remember: false
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // First, get CSRF token
            const csrfResponse = await fetch('https://blog-api-wpbz.onrender.com/api/csrf-token', {
                credentials: 'include'  // Important for cookies
            });
            const csrfData = await csrfResponse.json();
            
            if (!csrfResponse.ok) {
                throw new Error('Failed to get CSRF token');
            }

            const csrfToken = csrfData.csrfToken;
            localStorage.setItem('csrf_token', csrfToken);

            // Then proceed with login
            const response = await fetch('https://blog-api-wpbz.onrender.com/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',  // Important for cookies
                body: JSON.stringify({
                    login: formData.login,
                    password: formData.password
                })
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Save token and user data
            const token = data.token || data.accessToken;
            if (!token) {
                throw new Error('No token received from server');
            }

            // Use the login function from AuthContext
            login(token, data.user);
            
            // Redirect to home page
            navigate('/');
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'An error occurred during login');
        }
    };

    return (
        <div className="main-content">
            {/* Left section with features */}
            <div className="features-section">
                <div className="features-image">
                    <img src="https://img.freepik.com/free-photo/neon-tropical-monstera-leaf-banner_53876-138943.jpg?semt=ais_hybrid&w=740" alt="Тропический остров с зелеными растениями" />
                </div>
                
                <h2 className="features-title">Welcome back!</h2>
                
                <p className="features-text">
                    Sign in to access your personalized dashboard, connect with friends, and explore exclusive content tailored just for you. 
                    Stay updated with the latest news, share your thoughts, and join a vibrant community. 
                    Your next adventure starts here—log in now to unlock all the possibilities!
                </p>
            </div>
            
            {/* Right section with login form */}
            <div className="login-section">
                <div className="login-container">
                    <h1 className="login-title">Sign in to your account</h1>
                    
                    {error && <p className="error">{error}</p>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                name="login"
                                className="form-input"
                                placeholder="Username"
                                value={formData.login}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <div className="password-input-container">
                                <input
                                    type="password"
                                    name="password"
                                    className="form-input"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <span className="password-toggle">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#888">
                                        <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.87 15.79 17 12 17s-7.17-2.13-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 5c1.38 0 2.5 1.12 2.5 2.5S13.38 14 12 14s-2.5-1.12-2.5-2.5S10.62 9 12 9m0-2c-2.48 0-4.5 2.02-4.5 4.5S9.52 16 12 16s4.5-2.02 4.5-4.5S14.48 7 12 7z"/>
                                    </svg>
                                </span>
                            </div>
                        </div>
                        
                        <div className="form-options">
                            <div className="remember-me">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    name="remember"
                                    checked={formData.remember}
                                    onChange={handleChange}
                                />
                                <label htmlFor="remember" className="remember-text">Remember me</label>
                            </div>
                            <a href="#" className="forgot-password">Forgot password?</a>
                        </div>
                        
                        <button type="submit" className="sign-in-button">Sign In</button>
                    </form>

                    <button 
                        onClick={() => {
                            setFormData({
                                login: 'testuser',
                                password: 'testpass123',
                                remember: false
                            });
                        }} 
                        className="test-user-button"
                    >
                        Use Test Account
                    </button>
                    
                    <div className="social-login">
                        <button className="social-btn">
                            <span className="social-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                                </svg>
                            </span>
                            Continue with Google
                        </button>
                    </div>
                    
                    <div className="social-login">
                        <button className="social-btn">
                            <span className="social-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                                    <path fill="#3F51B5" d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5V37z"/>
                                    <path fill="#FFFFFF" d="M34.368,25H31v13h-5V25h-3v-4h3v-2.41c0.002-3.508,1.459-5.59,5.592-5.59H35v4h-2.287C31.104,17,31,17.6,31,18.723V21h4L34.368,25z"/>
                                </svg>
                            </span>
                            Continue with Facebook
                        </button>
                    </div>
                    
                    <div className="register-prompt">
                        Don't have an account? <a href="/register" className="register-link">Sign up</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login; 