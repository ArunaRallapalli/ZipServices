/**
 * src/config/api.js
 * 
 * API URL Configuration
 * ============================================================================
 * 
 * This file determines which backend API URL to use based on the environment.
 * It automatically switches between production and development URLs so that:
 * 
 *   - Web (gozipmarket.com / www.gozipmarket.com / github.io)
 *       → Uses the live production server on Render
 *         (https://gozipmarket-api.onrender.com)
 * 
 *   - Local development (localhost)
 *       → Uses the local backend server
 *         (http://localhost:5000)
 * 
 *   - Mobile (iOS / Android via Expo)
 *       → Falls back to development URL
 *         (mobile platform detection is handled in apiConfig.ts)
 * 
 * Usage:
 *   import API_URL from './config/api';
 *   fetch(`${API_URL}/api/some-endpoint`);
 * 
 * Note: Mobile apps use src/config/apiConfig.ts instead, which has more
 * granular platform detection (Android emulator, iOS simulator, physical device).
 * ============================================================================
 */

const API_CONFIG = {
  production: 'https://gozipmarket-api.onrender.com',
  development: 'http://localhost:5000'
};

// ✅ FIXED: Check window.location EXISTS before accessing .hostname
// On mobile (React Native), window exists but window.location is undefined
const isProduction = 
  typeof window !== 'undefined' && 
  window.location != null &&              // ← THIS WAS MISSING!
  (window.location.hostname === 'gozipmarket.com' || 
   window.location.hostname === 'www.gozipmarket.com' ||
   window.location.hostname.includes('github.io'));

export const API_URL = isProduction 
  ? API_CONFIG.production 
  : API_CONFIG.development;

console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('🔗 API_URL:', API_URL);

export default API_URL;