import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './Styles/index.css';
import { ThemeProvider } from './Context/ThemeContext';
import { OnlineStatusProvider } from './Context/OnlineStatusContext';
import { UserProvider } from './Context/UserContext';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <UserProvider>
        <OnlineStatusProvider>
          <App />
        </OnlineStatusProvider>
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>
);

