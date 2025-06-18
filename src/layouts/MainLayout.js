import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import '../styles/layouts/MainLayout.css';

const MainLayout = () => {
  return (
    <div className="main-layout">
      <header className="main-header">
        <nav>
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
          </ul>
        </nav>
      </header>
      
      <main className="main-content">
        <Outlet />
      </main>

      <footer className="main-footer">
        <p>&copy; 2024 My React App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout; 