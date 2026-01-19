// frontend/config/api.js
const API_CONFIG = {
  production: 'https://gozipmarket-api.onrender.com',
  development: 'http://localhost:5000'
};

export const API_URL = __DEV__ 
  ? API_CONFIG.development 
  : API_CONFIG.production;