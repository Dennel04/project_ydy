import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Register.css';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        terms: false
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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

        // Validate form
        if (!formData.username || !formData.email || !formData.password || !formData.password_confirm) {
            setError('All fields are required');
            return;
        }

        if (!formData.terms) {
            setError('You must accept the Terms and Conditions');
            return;
        }

        if (formData.password !== formData.password_confirm) {
            setError('Passwords do not match');
            return;
        }

        try {
            const response = await fetch('https://blog-api-wpbz.onrender.com/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    login: formData.username,
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Redirect to email verification page
            navigate('/verify-email', { state: { email: formData.email } });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="main-content">
            {/* Features Section */}
            <div className="features-section">
                <div className="features-image">
                    <img 
                        src="https://img.freepik.com/free-photo/neon-tropical-monstera-leaf-banner_53876-138943.jpg?semt=ais_hybrid&w=740" 
                        alt="Tropical island with green plants" 
                        className="features-title-image"
                    />
                </div>
                
                <h2 className="features-title">Introducing new features</h2>
                
                <p className="features-text">
                    Discover a world of possibilities with your new account! Enjoy seamless access to exclusive features, 
                    personalized content, and a vibrant community. Sign up today to unlock a unique experience tailored just for you.
                </p>
            </div>
            
            {/* Register Section */}
            <div className="register-section">
                <div className="register-container">
                    <h1 className="register-title">Register account</h1>
                    
                    {error && <p className="error">{error}</p>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                placeholder="Username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                placeholder="xyz@gmail.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <div className="password-input-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className="form-input"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <span 
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#888">
                                        <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.87 15.79 17 12 17s-7.17-2.13-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 5c1.38 0 2.5 1.12 2.5 2.5S13.38 14 12 14s-2.5-1.12-2.5-2.5S10.62 9 12 9m0-2c-2.48 0-4.5 2.02-4.5 4.5S9.52 16 12 16s4.5-2.02 4.5-4.5S14.48 7 12 7z"/>
                                    </svg>
                                </span>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <input
                                type="password"
                                name="password_confirm"
                                className="form-input"
                                placeholder="Repeat password"
                                value={formData.password_confirm}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        
                        <div className="terms-checkbox">
                            <input
                                type="checkbox"
                                id="terms"
                                name="terms"
                                checked={formData.terms}
                                onChange={handleChange}
                                required
                            />
                            <label htmlFor="terms" className="terms-text">
                                I accept the Terms and Conditions
                            </label>
                            <Link to="/forgot-password" className="forgot-password">
                                Forgot password?
                            </Link>
                        </div>
                        
                        <button type="submit" className="sign-in-button">
                            Register
                        </button>
                    </form>
                    
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
                    
                    <div className="login-prompt">
                        Already have an account? <Link to="/login" className="login-link">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register; 