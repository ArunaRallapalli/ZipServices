// src/config/api.js
const API_CONFIG = {
  production: 'https://gozipmarket-api.onrender.com',
  development: 'http://localhost:5000'
};

// Detect production environment for web
const isProduction = 
  process.env.NODE_ENV === 'production' || 
  (typeof __DEV__ !== 'undefined' && !__DEV__) ||
  window.location.hostname !== 'localhost';

export const API_URL = isProduction 
  ? API_CONFIG.production 
  : API_CONFIG.development;

// Debug log (remove this after confirming it works)
console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('🔗 API_URL:', API_URL);

export default API_URL;