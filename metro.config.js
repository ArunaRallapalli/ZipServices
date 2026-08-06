const { getDefaultConfig } = require('expo/metro-config');
const handler = require('serve-handler');
const path = require('path');

const config = getDefaultConfig(__dirname);

// [\\/] instead of a literal / — on Windows Metro's paths use backslashes, so
// /backend\/.*/  never matched anything there and this blockList was silently
// a no-op until the module graph got walked fresh (e.g. after `-c`).
config.resolver.blockList = [/backend[\\/].*/, /\.env$/, /\.env\..*/];
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.resolver.assetExts.push('json');
config.resolver.unstable_enablePackageExports = false; // ADDED: suppress invalid package.json exports warnings

config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Serve static files from public folder
      if (req.url.match(/^\/(manifest\.json|icon-|apple-icon-|favicon)/)) {
        return handler(req, res, {
          public: path.join(__dirname, 'public'),
          cleanUrls: false,
        });
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;