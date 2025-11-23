const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 👇 Add `.bin` so Metro knows to treat it as a static asset
config.resolver.assetExts.push('bin');

module.exports = config;
