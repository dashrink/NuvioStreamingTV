/**
 * Jest configuration for React Native TV Navigation testing
 *
 * This configuration is optimized for testing React Native components
 * with support for TV-specific features and hooks.
 */

module.exports = {
  // Use jest-expo preset for Expo/React Native compatibility
  preset: 'jest-expo',

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/__tests__/setup.ts',
  ],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '**/*.test.(ts|tsx)',
  ],

  // Files to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/.expo/',
    '/backup_sdk54_upgrade/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Module name mapper for path aliases and mocked modules
  moduleNameMapper: {
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__tests__/__mocks__/fileMock.js',
    // Handle style imports
    '\\.(css|less|scss|sass)$': '<rootDir>/__tests__/__mocks__/styleMock.js',
  },

  // Transform ignore patterns - don't transform node_modules except specific packages
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native|' +
      'react-native-.*|' +
      '@react-native(-community)?|' +
      'expo(nent)?|' +
      '@expo(nent)?/.*|' +
      '@expo-google-fonts/.*|' +
      'react-navigation|' +
      '@react-navigation/.*|' +
      '@unimodules/.*|' +
      'unimodules|' +
      'sentry-expo|' +
      'native-base|' +
      'react-native-svg|' +
      '@shopify/flash-list|' +
      '@gorhom/bottom-sheet|' +
      '@legendapp/list|' +
      'posthog-react-native' +
    ')/)',
  ],

  // Collect coverage from these directories
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],

  // Coverage thresholds (can be adjusted as needed)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Test environment
  testEnvironment: 'node',

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Maximum number of workers
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '.jest-cache',

  // Root directories for test discovery
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],

  // Global setup/teardown (if needed)
  // globalSetup: '<rootDir>/__tests__/globalSetup.ts',
  // globalTeardown: '<rootDir>/__tests__/globalTeardown.ts',
};
