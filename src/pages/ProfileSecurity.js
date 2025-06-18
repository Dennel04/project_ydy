import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/ProfileSecurity.css';

const ProfileSecurity = () => {
    const { userData, authToken } = useAuth();
    const navigate = useNavigate();
    const [csrfToken, setCsrfToken] = useState(null);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [emailData, setEmailData] = useState({
        newEmail: '',
        password: ''
    });
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch CSRF token
        fetch('https://blog-api-wpbz.onrender.com/api/csrf-token')
            .then(res => res.json())
            .then(data => setCsrfToken(data.csrfToken))
            .catch(err => console.error('Error fetching CSRF token:', err));
    }, []);

    const updatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        if (password.length >= 12) strength++;
        setPasswordStrength(strength);
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        if (name === 'newPassword') {
            updatePasswordStrength(value);
        }
    };

    const handleEmailChange = (e) => {
        const { name, value } = e.target;
        setEmailData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 8 || !/[0-9]/.test(passwordData.newPassword) || !/[^A-Za-z0-9]/.test(passwordData.newPassword)) {
            setError('Password must be at least 8 characters long and include numbers and special characters');
            return;
        }

        try {
            const response = await fetch('https://blog-api-wpbz.onrender.com/api/users/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.isGoogleUser) {
                    setError('Google users must change their password through their Google account settings');
                } else {
                    throw new Error(data.error || 'Failed to change password');
                }
                return;
            }

            // Reset form
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setIsEditingPassword(false);
            setPasswordStrength(0);
            alert('Password changed successfully!');
        } catch (error) {
            setError(error.message);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.newEmail)) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            const response = await fetch('https://blog-api-wpbz.onrender.com/api/users/change-email', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    newEmail: emailData.newEmail,
                    password: emailData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.isGoogleUser) {
                    setError('Google users must change their email through their Google account settings');
                } else {
                    throw new Error(data.error || 'Failed to change email');
                }
                return;
            }

            // Reset form
            setEmailData({
                newEmail: '',
                password: ''
            });
            setIsEditingEmail(false);
            alert('Email change request sent. Please check your new email for verification.');
        } catch (error) {
            setError(error.message);
        }
    };

    if (!userData) {
        return <div className="profile-container">Loading...</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1 className="profile-title">Security</h1>
            </div>
            
            <div className="profile-content">
                <div className="profile-sidebar">
                    <div className="profile-avatar">
                        {userData.image ? (
                            <img src={userData.image} alt="User Profile" />
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
                            <li className="profile-menu-item">
                                <a href="/profile">Profile</a>
                            </li>
                            <li className="profile-menu-item">
                                <a href="#">My posts</a>
                            </li>
                            <li className="profile-menu-item active">
                                <a href="/profile/security">Security</a>
                            </li>
                            <li className="profile-menu-item">
                                <button onClick={() => navigate('/logout')} className="logout-link">Log out</button>
                            </li>
                        </ul>
                    </nav>
                </div>

                <div className="profile-form-container">
                    {error && <div className="error-message">{error}</div>}

                    {/* Change Password Section */}
                    <div className="security-section">
                        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                            <button 
                                className="edit-btn"
                                onClick={() => setIsEditingPassword(!isEditingPassword)}
                            >
                                <i className="bi bi-pencil-fill"></i>
                            </button>
                        </div>
                        <h2 className="security-section-title">Change Password</h2>
                        <div className="security-section-description">
                            Update your password to keep your account secure
                        </div>
                        
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label className="form-label">Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    className="form-control"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    disabled={!isEditingPassword}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    className="form-control"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    disabled={!isEditingPassword}
                                    required
                                />
                                <div className="form-sublabel">
                                    Password must be at least 8 characters long and include numbers and special characters
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className="form-control"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    disabled={!isEditingPassword}
                                    required
                                />
                            </div>
                            
                            {isEditingPassword && (
                                <div className="password-strength-meter">
                                    <div className="strength-label">Password strength:</div>
                                    <div className="strength-bars">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`strength-bar ${level <= passwordStrength ? 'active' : ''}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="strength-text">
                                        {['Weak', 'Fair', 'Good', 'Strong'][passwordStrength - 1] || 'Weak'}
                                    </div>
                                </div>
                            )}
                            
                            {isEditingPassword && (
                                <div style={{ textAlign: 'right', marginTop: '20px' }}>
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={() => {
                                            setIsEditingPassword(false);
                                            setPasswordData({
                                                currentPassword: '',
                                                newPassword: '',
                                                confirmPassword: ''
                                            });
                                            setPasswordStrength(0);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="security-btn">
                                        Update Password
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                    
                    <div className="form-divider"></div>
                    
                    {/* Change Email Section */}
                    <div className="security-section">
                        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                            <button 
                                className="edit-btn"
                                onClick={() => setIsEditingEmail(!isEditingEmail)}
                            >
                                <i className="bi bi-pencil-fill"></i>
                            </button>
                        </div>
                        <h2 className="security-section-title">Email Address</h2>
                        <div className="security-section-description">
                            Update your email address associated with your account
                        </div>
                        
                        <form onSubmit={handleEmailSubmit}>
                            <div className="form-group">
                                <label className="form-label">Current Email</label>
                                <div className="form-text current-email">
                                    {userData.email || 'No email set'}
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">New Email Address</label>
                                <input
                                    type="email"
                                    name="newEmail"
                                    className="form-control"
                                    value={emailData.newEmail}
                                    onChange={handleEmailChange}
                                    disabled={!isEditingEmail}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Enter Password to Confirm</label>
                                <input
                                    type="password"
                                    name="password"
                                    className="form-control"
                                    value={emailData.password}
                                    onChange={handleEmailChange}
                                    disabled={!isEditingEmail}
                                    required
                                />
                            </div>
                            
                            {isEditingEmail && (
                                <div style={{ textAlign: 'right', marginTop: '20px' }}>
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={() => {
                                            setIsEditingEmail(false);
                                            setEmailData({
                                                newEmail: '',
                                                password: ''
                                            });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="security-btn">
                                        Update Email
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSecurity; 