/**
 * Script to run PIN protection tests
 *
 * Usage: npx ts-node scripts/run-pin-tests.ts
 */

import { runPINProtectionTests, logTestResults } from '../src/__tests__/e2e/pin-protection.test';

async function main() {
  console.log('Starting PIN Protection E2E Tests...\n');

  try {
    const results = await runPINProtectionTests();

    console.log('\n');
    logTestResults(results);

    console.log('\n');
    if (results.allPassed) {
      console.log('🎉 All PIN protection tests passed successfully!');
      process.exit(0);
    } else {
      console.log('⚠️  Some PIN protection tests failed.');
      console.log(`Failed tests: ${results.failedTests}/${results.totalTests}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running PIN protection tests:', error);
    process.exit(1);
  }
}

main();
