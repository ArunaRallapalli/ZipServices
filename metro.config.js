const { getDefaultConfig } = require('expo/metro-config');
const handler = require('serve-handler');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [/backend\/.*/, /\.env$/, /\.env\..*/];
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