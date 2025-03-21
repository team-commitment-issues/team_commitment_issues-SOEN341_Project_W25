import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './Styles/index.css';
import { ThemeProvider } from './Context/ThemeContext';
import { OnlineStatusProvider } from './Context/OnlineStatusContext';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <OnlineStatusProvider>
        <App />
      </OnlineStatusProvider>
    </ThemeProvider>
  </React.StrictMode>
);

