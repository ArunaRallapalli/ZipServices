// src/config/api.js
const API_CONFIG = {
  production: 'https://gozipmarket-api.onrender.com',  // ✅ Your Render URL
  development: 'http://localhost:5000'
};

// For web builds, check window location
const isProduction = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'gozipmarket.com' || 
   window.location.hostname === 'www.gozipmarket.com' ||
   window.location.hostname.includes('github.io'));

export const API_URL = isProduction 
  ? API_CONFIG.production 
  : API_CONFIG.development;

console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('🔗 API_URL:', API_URL);

export default API_URL;