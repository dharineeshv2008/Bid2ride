import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Clear any existing passenger token before loading the driver portal
if (localStorage.getItem('role') !== 'driver') {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
