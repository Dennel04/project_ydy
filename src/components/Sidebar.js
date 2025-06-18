import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isAuthenticated }) => {
  return (
    <div className="sidebar">
      <div className="logo-container">
        <div className="logo"></div>
      </div>
      
      <Link to="/">
        <div className="nav-item">
          <svg className="home-icon" viewBox="0 0 24 24" fill="white">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </div>
      </Link>
      
      <div className="nav-item">
        <svg className="search-nav-icon" viewBox="0 0 24 24" fill="white">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      </div>
      
      <div className="nav-item">
        <svg className="chat-icon" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>
      
      {isAuthenticated ? (
        <Link to="/create-post">
          <div className="nav-item">
            <svg className="add-icon" viewBox="0 0 24 24" fill="white">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
        </Link>
      ) : (
        <Link to="/register">
          <div className="nav-item">
            <svg className="add-icon" viewBox="0 0 24 24" fill="white">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
        </Link>
      )}
    </div>
  );
};

export default Sidebar; 