import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [csrfToken, setCsrfToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing auth data on mount
        const token = localStorage.getItem('auth_token');
        const storedUserData = localStorage.getItem('user_data');
        const storedCsrfToken = localStorage.getItem('csrf_token');
        
        if (token && storedUserData) {
            setAuthToken(token);
            setUserData(JSON.parse(storedUserData));
            setIsAuthenticated(true);
        }
        
        if (storedCsrfToken) {
            setCsrfToken(storedCsrfToken);
        }

        // Fetch fresh CSRF token
        const fetchCsrfToken = async () => {
            try {
                const response = await fetch('https://blog-api-wpbz.onrender.com/api/csrf-token', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    const newCsrfToken = data.csrfToken;
                    localStorage.setItem('csrf_token', newCsrfToken);
                    setCsrfToken(newCsrfToken);
                }
            } catch (error) {
                console.error('Error fetching CSRF token:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCsrfToken();
    }, []);

    const login = (token, user) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        setAuthToken(token);
        setUserData(user);
        setIsAuthenticated(true);
    };

    const logout = () => {
        // Clear all auth-related data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('csrf_token');
        setAuthToken(null);
        setUserData(null);
        setCsrfToken(null);
        setIsAuthenticated(false);
    };

    const updateUserData = (newUserData) => {
        const updatedData = { ...userData, ...newUserData };
        localStorage.setItem('user_data', JSON.stringify(updatedData));
        setUserData(updatedData);
    };

    const value = {
        isAuthenticated,
        userData,
        authToken,
        csrfToken,
        isLoading,
        login,
        logout,
        updateUserData
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 