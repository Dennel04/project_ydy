import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './BaseLayout.css';

const BaseLayout = ({ children, isAuthenticated, userData }) => {
  return (
    <div className="app-wrapper">
      <Sidebar isAuthenticated={isAuthenticated} />
      <div className="content">
        <Header isAuthenticated={isAuthenticated} userData={userData} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default BaseLayout; 