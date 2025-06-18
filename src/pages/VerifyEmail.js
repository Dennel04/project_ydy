import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../styles/Register.css';

const VerifyEmail = () => {
    const location = useLocation();
    const email = location.state?.email || 'your email';

    return (
        <div className="main-content">
            <div className="register-section">
                <div className="register-container">
                    <h1 className="register-title">Thank you for registering!</h1>
                    <p className="features-text">
                        A confirmation email has been sent to {email}. 
                        Please check your email and click the link to complete your registration.
                    </p>
                    <p className="features-text">
                        Didn't receive the email? Check your spam folder or <Link to="#" className="login-link">resend the email</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail; 