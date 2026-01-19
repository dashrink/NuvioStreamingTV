/**
 * Jest configuration for NuvioStreaming TV Web App testing
 *
 * This configuration is optimized for testing React web components
 * with TypeScript support.
 */

module.exports = {
  // Setup files to run before the test framework is installed
  setupFiles: [
    '<rootDir>/__tests__/jest.setup.env.js',
  ],

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/__tests__/setup.ts',
  ],

  // Test environment - use jsdom for web-based testing
  testEnvironment: 'jsdom',

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Global setup
  globals: {
    __DEV__: true,
  },

  // Transform TypeScript and JavaScript files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

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
