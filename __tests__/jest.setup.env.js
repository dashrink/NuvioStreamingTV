/**
 * Environment setup for Jest
 * This file runs before all other setup files to configure the test environment
 */

// Disable Expo winter in tests to avoid import issues
process.env.EXPO_USE_STATIC_RENDERING = 'false';
process.env.NODE_ENV = 'test';
