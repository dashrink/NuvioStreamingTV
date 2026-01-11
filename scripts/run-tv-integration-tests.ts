/**
 * TV Integration Test Runner
 *
 * Runs the TV platform integration test suite and outputs formatted results
 */

import { runTVIntegrationTests, logTestResults } from '../src/__tests__/e2e/tv-integration.test';
import {
  quickTVVerification,
  logTVIntegrationStatus,
  generateTVIntegrationReport,
} from '../src/utils/tvIntegrationVerification';

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TV PLATFORM INTEGRATION TEST SUITE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // 1. Run Quick Verification
    console.log('📊 Running Quick Verification...\n');
    const quickCheck = await quickTVVerification();
    console.log(`Status: ${quickCheck.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Summary: ${quickCheck.summary}\n`);

    // 2. Log Platform Status
    console.log('📱 Platform Status:\n');
    await logTVIntegrationStatus();

    // 3. Run Full Test Suite
    console.log('\n🧪 Running Full E2E Test Suite...\n');
    const results = await runTVIntegrationTests();

    // 4. Display Results
    logTestResults(results);

    // 5. Generate Report
    console.log('\n📄 Generating Report...\n');
    const report = await generateTVIntegrationReport();
    console.log(report);

    // 6. Final Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                     FINAL SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Platform: ${results.platform}`);
    console.log(`Tests Run: ${results.totalTests}`);
    console.log(`Tests Passed: ${results.passedTests}`);
    console.log(`Tests Failed: ${results.failedTests}`);
    console.log(`Overall: ${results.allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');

    if (results.allPassed) {
      console.log('🎉 All TV integration tests passed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Please review the results above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                        ERROR                               ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Test suite encountered an error:');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
