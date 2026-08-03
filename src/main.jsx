/**
 * main.jsx
 * ----------------------------------------------------------------------------
 * Titik masuk aplikasi React. File ini yang dipanggil pertama oleh
 * index.html, lalu "menempelkan" komponen App ke dalam <div id="root">.
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './styles/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
