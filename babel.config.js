module.exports = function (api) {
  api.cache(true);

  // In test environment, only use reanimated plugin to avoid conflicts with jest-expo
  const isTest = process.env.NODE_ENV === 'test';

  return {
    presets: ['babel-preset-expo'],
    plugins: isTest
      ? [
          // Only essential plugins for testing
          'react-native-reanimated/plugin',
        ]
      : [
          // All plugins for development/production
          // Note: react-native-worklets/plugin is included in react-native-reanimated/plugin
          'react-native-boost/plugin',
          'react-native-reanimated/plugin',
        ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
}; 