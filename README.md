# Modern React Blog Platform

A modern, full-featured blogging platform built with React and contemporary web technologies. Designed with modular architecture, clean UI, and scalability in mind.

## Features

- Secure authentication and session management
- Internationalization with language switching
- Dynamic light/dark theme support
- Mobile-first responsive design
- Post creation, editing, and management
- User profile pages
- Real-time notifications
- CSRF protection and secure API handling
- Email verification flow

## Technology Stack

- **Frontend:** React 19.1.0
- **Routing:** React Router DOM 7.6.2
- **State Management:** React Context API
- **Styling:** CSS Modules
- **Testing:** Jest, React Testing Library
- **Security:** CSRF Token integration, protected routes

## Project Structure

```
src/
├── components/      // Shared UI components
├── contexts/        // Context providers for state management
├── layouts/         // Layout wrappers (e.g., with header/sidebar)
├── pages/           // Page-level components and routes
└── styles/          // Theme files and global styles
```

## Getting Started

1. **Clone the repository**
```bash
git clone <repository-url>
cd react_project
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the development server**
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Available Scripts

- `npm start` – Run the development server
- `npm test` – Launch the test suite
- `npm run build` – Create a production build
- `npm run eject` – Eject the CRA configuration (optional)

## Core Modules Overview

### Authentication
- Token-based auth with protected routes
- Session persistence
- Secure password handling

### Theming
- Switchable dark/light modes
- Theme persistence via local storage

### Internationalization
- Language switching support
- Localized UI strings

### Notifications
- Real-time event handling
- Status and toast-style messages

## Security Considerations

- CSRF token usage for state-changing operations
- Protected frontend routes
- Backend endpoint hardening
- Safe session lifecycle handling

## Responsive Design

Optimized for usability across all devices:

- Desktop
- Mobile
- Tablet

## Contribution

Contributions are welcome. Please fork the repository and submit a pull request with a clear description of your changes.

## License

This project is licensed under the [MIT License](LICENSE).
