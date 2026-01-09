const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Enable tree shaking and better minification
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  minifierConfig: {
    ecma: 8,
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
  },
};

// Optimize resolver for better tree shaking and SVG support
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'zip'],
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  resolverMainFields: ['react-native', 'browser', 'main'],
};

// Exclude directories that don't need watching to reduce file watcher count
config.watchFolders = [__dirname];
config.resolver.blockList = [
  /node_modules\/.*\/android\/\.cxx\/.*/,
  /node_modules\/.*\/\.git\/.*/,
  /android\/build\/.*/,
  /android\/app\/build\/.*/,
  /ios\/Pods\/.*/,
];

module.exports = config;