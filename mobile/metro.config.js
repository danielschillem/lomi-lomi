const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Exclude android build directories from Metro's file watcher
// to prevent lstat crashes on Windows with corrupted paths
const { blockList } = config.resolver;
const extraExclusions = [
  /android[\\\/]app[\\\/]build[\\\/].*/,
  /node_modules[\\\/].*[\\\/]android[\\\/]build[\\\/].*/,
];
if (blockList instanceof RegExp) {
  config.resolver.blockList = [blockList, ...extraExclusions];
} else if (Array.isArray(blockList)) {
  config.resolver.blockList = [...blockList, ...extraExclusions];
} else {
  config.resolver.blockList = extraExclusions;
}

module.exports = config;
