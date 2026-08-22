import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Clear any existing driver token before loading the passenger portal
if (localStorage.getItem('role') !== 'passenger') {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
