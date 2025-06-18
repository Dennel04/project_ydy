import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const { isAuthenticated, userData } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const { currentLanguage, languages } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <header className="header">
            <div className="left-section">
                <button className="theme-toggle" onClick={toggleTheme} aria-label={languages[currentLanguage].toggleTheme}>
                    {isDarkMode ? (
                        <svg className="theme-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"/>
                            <line x1="12" y1="1" x2="12" y2="3"/>
                            <line x1="12" y1="21" x2="12" y2="23"/>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                            <line x1="1" y1="12" x2="3" y2="12"/>
                            <line x1="21" y1="12" x2="23" y2="12"/>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                    ) : (
                        <svg className="theme-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                    )}
                </button>

                <div className="search-container">
                    <span className="search-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                    </span>
                    <form onSubmit={handleSearch}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder={languages[currentLanguage].searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                </div>
            </div>

            <div className="right-section">
                {isAuthenticated ? (
                    <div className="user-profile" onClick={() => navigate('/profile')}>
                        <div className="user-info">
                            <span className="username">{userData?.username}</span>
                        </div>
                        <div className="avatar">
                            {userData?.image ? (
                                <img src={userData.image} alt={languages[currentLanguage].userAvatar} />
                            ) : (
                                <div className="avatar-placeholder">
                                    {userData?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="auth-buttons">
                        <button onClick={() => navigate('/login')} className="btn btn-outline">{languages[currentLanguage].signIn}</button>
                        <button onClick={() => navigate('/register')} className="btn btn-filled">{languages[currentLanguage].createAccount}</button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header; 