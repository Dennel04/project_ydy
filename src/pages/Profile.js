import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile.css';

const LanguageSelector = ({ currentLanguage, toggleLanguage, languages }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="language-selector">
            <label className="form-label">{languages[currentLanguage].language}</label>
            <div className="language-dropdown">
                <button 
                    className="language-button"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className="language-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M2 12h20"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                    </span>
                    <span className="language-text">
                        {currentLanguage === 'en' ? languages[currentLanguage].english : languages[currentLanguage].estonian}
                    </span>
                    <span className="language-arrow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </span>
                </button>
                {isOpen && (
                    <div className="language-options">
                        <button
                            className={`language-option ${currentLanguage === 'en' ? 'active' : ''}`}
                            onClick={() => {
                                if (currentLanguage !== 'en') {
                                    toggleLanguage();
                                }
                                setIsOpen(false);
                            }}
                        >
                            <div className="language-option-content">
                                <span className="language-flag">🇬🇧</span>
                                <span className="language-name">{languages[currentLanguage].english}</span>
                            </div>
                        </button>
                        <button
                            className={`language-option ${currentLanguage === 'et' ? 'active' : ''}`}
                            onClick={() => {
                                if (currentLanguage !== 'et') {
                                    toggleLanguage();
                                }
                                setIsOpen(false);
                            }}
                        >
                            <div className="language-option-content">
                                <span className="language-flag">🇪🇪</span>
                                <span className="language-name">{languages[currentLanguage].estonian}</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Profile = () => {
    const { userData, authToken, logout } = useAuth();
    const { currentLanguage, toggleLanguage, languages } = useLanguage();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        bio: ''
    });
    const [initialValues, setInitialValues] = useState({
        username: '',
        bio: ''
    });
    const [csrfToken, setCsrfToken] = useState(null);

    useEffect(() => {
        if (userData) {
            setFormData({
                username: userData.username || '',
                bio: userData.description || ''
            });
            setInitialValues({
                username: userData.username || '',
                bio: userData.description || ''
            });
        }
        // Fetch CSRF token
        fetch('https://blog-api-wpbz.onrender.com/api/csrf-token')
            .then(res => res.json())
            .then(data => setCsrfToken(data.csrfToken))
            .catch(err => console.error('Error fetching CSRF token:', err));
    }, [userData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('https://blog-api-wpbz.onrender.com/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'X-CSRF-Token': csrfToken
                }
            });
            
            if (response.ok) {
                logout();
                navigate('/login');
            } else {
                console.error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetch('https://blog-api-wpbz.onrender.com/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    username: formData.username,
                    description: formData.bio
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            // Update user data in localStorage and context
            const updatedUserData = {
                ...userData,
                username: formData.username,
                description: formData.bio
            };
            localStorage.setItem('user_data', JSON.stringify(updatedUserData));
            
            setIsEditing(false);
            window.location.reload(); // Reload to reflect changes
        } catch (error) {
            console.error('Error updating profile:', error);
            alert(`Failed to update profile: ${error.message}`);
        }
    };

    const handleCancel = () => {
        setFormData(initialValues);
        setIsEditing(false);
    };

    if (!userData) {
        return <div className="profile-container">Loading...</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1 className="profile-title">{languages[currentLanguage].profile}</h1>
            </div>
            
            <div className="profile-content">
                <div className="profile-sidebar">
                    <div className="profile-avatar">
                        {userData.image ? (
                            <img src={userData.image} alt={languages[currentLanguage].profile} />
                        ) : (
                            <div className="avatar-placeholder">
                                {userData.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="profile-username">{userData.username}</div>
                    <div className="profile-login">@{userData.login}</div>
                    
                    <nav className="profile-nav">
                        <ul className="profile-menu">
                            <li className="profile-menu-item active">
                                <a href="/profile">{languages[currentLanguage].profile}</a>
                            </li>
                            <li className="profile-menu-item">
                                <a href="#">{languages[currentLanguage].myPosts}</a>
                            </li>
                            <li className="profile-menu-item">
                                <a href="/profile/security">{languages[currentLanguage].security}</a>
                            </li>
                            <li className="profile-menu-item">
                                <button onClick={handleLogout} className="logout-link">{languages[currentLanguage].logout}</button>
                            </li>
                        </ul>
                    </nav>

                    <LanguageSelector 
                        currentLanguage={currentLanguage}
                        toggleLanguage={toggleLanguage}
                        languages={languages}
                    />
                </div>

                <div className="profile-form-container">
                    <div className="profile-info">
                        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                            <button 
                                className="edit-btn"
                                onClick={() => setIsEditing(true)}
                            >
                                <i className="bi bi-pencil-fill"></i> {languages[currentLanguage].edit}
                            </button>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">{languages[currentLanguage].name}</label>
                            <div className="form-sublabel">{languages[currentLanguage].nameDescription}</div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="username"
                                    className="form-control"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            ) : (
                                <div className="form-text">{userData.username}</div>
                            )}
                        </div>
                    
                        <div className="form-divider"></div>

                        <div className="form-group">
                            <label className="form-label">{languages[currentLanguage].username}</label>
                            <div className="form-sublabel">{languages[currentLanguage].usernameDescription}</div>
                            <div className="form-text">@{userData.login}</div>
                        </div>
                    
                        <div className="form-divider"></div>

                        <div className="form-group">
                            <label className="form-label">{languages[currentLanguage].bio}</label>
                            <div className="form-sublabel">{languages[currentLanguage].bioDescription}</div>
                            {isEditing ? (
                                <>
                                    <textarea
                                        name="bio"
                                        className="form-control"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        maxLength={200}
                                    />
                                    <div className="bio-counter">
                                        {languages[currentLanguage].characters}: {formData.bio.length} / 200
                                    </div>
                                </>
                            ) : (
                                <div className="form-text">{userData.description || languages[currentLanguage].noBio}</div>
                            )}
                        </div>

                        {isEditing && (
                            <div style={{ textAlign: 'right', marginTop: '20px' }}>
                                <button className="cancel-btn" onClick={handleCancel}>{languages[currentLanguage].cancel}</button>
                                <button className="save-btn" onClick={handleSave}>{languages[currentLanguage].saveChanges}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile; 