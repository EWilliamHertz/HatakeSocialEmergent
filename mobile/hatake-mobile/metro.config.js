const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude node-specific modules from axios
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For axios node-specific imports, return empty module
  if (moduleName === 'crypto' || 
      moduleName === 'http' || 
      moduleName === 'https' ||
      moduleName === 'url' ||
      moduleName === 'proxy-from-env' ||
      moduleName === 'follow-redirects' ||
      moduleName === 'form-data') {
    return {
      type: 'empty',
    };
  }
  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
