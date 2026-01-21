// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Exclude backend files from React Native bundle
config.resolver.blockList = [
  // Database and backend files
  /config\/pool\.ts$/,
  /config\/pool\.js$/,
  // Server files
  /server\.ts$/,
  /server\.js$/,
  // Backend folders (if you have them)
  /backend\/.*/,
  /server\/.*/,
  /api\/.*\.ts$/,
  /api\/.*\.js$/,
  // Environment files
  /\.env$/,
  /\.env\..*/,
];

// Ensure proper module resolution
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

// Add publicPath support for web deployment
config.transformer = {
  ...config.transformer,
  publicPath: '/ZipServices/',
};

module.exports = config;
EOF