import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for NuvioTV Native Apps
 *
 * This configuration is used for API testing and verification of
 * native app functionality through the Rust SDK backend.
 *
 * Note: For native mobile app UI testing, we use:
 * - Android: Espresso + Compose UI Test
 * - iOS: XCUITest
 *
 * Playwright is used here for:
 * - Backend API verification
 * - Rust SDK endpoint testing
 * - Cross-platform consistency checks
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter settings
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
    ['list']
  ],

  use: {
    // Base URL for API testing (if backend server is running)
    // baseURL: 'http://localhost:3000',

    // Collect trace on failure
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Projects for different test types
  projects: [
    {
      name: 'verification',
      testMatch: '**/*.spec.ts',
    },
  ],
});
