import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './Styles/index.css';
import { AppProviders } from './Providers/AppProviders.tsx';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <AppProviders withRouter={true}>
      <App />
    </AppProviders>
  </React.StrictMode>
);
