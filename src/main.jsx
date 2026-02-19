/**
 * Vite + React entry. Loads global styles and mounts the app.
 * App root lives in src/App.jsx; WebGL via useWebGL + WebGLCanvas (three.js).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const root = createRoot(document.getElementById('root'));
root.render(
  React.createElement(React.StrictMode, null, React.createElement(App, null))
);
