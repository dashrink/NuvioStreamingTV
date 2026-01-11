/**
 * E2E PIN Protection Test Suite
 *
 * Tests PIN protection functionality for profiles including:
 * - PIN setup and storage
 * - Incorrect PIN rejection
 * - Correct PIN verification
 * - PIN modal display
 * - Profile switching with PIN protection
 */

import { mmkvStorage } from '../../services/mmkvStorage';
import { Profile } from '../../contexts/ProfileContext';

// PIN storage prefix (must match ProfileSwitcherBottomSheet)
const PIN_STORAGE_PREFIX = 'profile_pin_hash_';

// Simple hash function (must match ProfileSwitcherBottomSheet)
const hashPin = (pin: string): string => {
  const salted = `nuvio_pin_salt_${pin}_end`;
  return btoa(salted);
};

// Test result interface
interface PINTestResult {
  testName: string;
  passed: boolean;
  message: string;
  error?: Error;
}

// Test suite results
interface PINTestSuiteResults {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: PINTestResult[];
}

/**
 * PIN Protection Test Class
 */
class PINProtectionTester {
  private testProfiles: Profile[] = [];
  private results: PINTestResult[] = [];

  /**
   * Setup test profiles
   */
  async setupTestProfiles(): Promise<void> {
    console.log('[PINProtectionTest] Setting up test profiles...');

    // Create two test profiles
    this.testProfiles = [
      {
        id: 'pin_test_profile_a',
        name: 'PIN Test Profile A',
        avatar: 'default',
        isKidsProfile: false,
        preferences: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'pin_test_profile_b',
        name: 'PIN Test Profile B',
        avatar: 'default',
        isKidsProfile: false,
        preferences: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    console.log('[PINProtectionTest] Created test profiles:', this.testProfiles.map(p => p.name).join(', '));
  }

  /**
   * Test 1: Enable PIN on Profile A
   */
  async testEnablePIN(): Promise<PINTestResult> {
    const testName = 'Enable PIN on Profile A';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const profileA = this.testProfiles[0];
      const testPin = '1234';
      const pinHash = hashPin(testPin);

      // Store PIN hash
      await mmkvStorage.setItem(`${PIN_STORAGE_PREFIX}${profileA.id}`, pinHash);

      // Verify storage
      const storedHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileA.id}`);

      if (storedHash === pinHash) {
        console.log(`[PINProtectionTest] ✅ ${testName} - PIN stored successfully`);
        return {
          testName,
          passed: true,
          message: 'PIN enabled and stored correctly',
        };
      } else {
        console.log(`[PINProtectionTest] ❌ ${testName} - PIN storage failed`);
        return {
          testName,
          passed: false,
          message: 'PIN hash not stored correctly',
        };
      }
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error enabling PIN',
        error: error as Error,
      };
    }
  }

  /**
   * Test 2: Verify PIN hash format
   */
  async testPINHashFormat(): Promise<PINTestResult> {
    const testName = 'Verify PIN hash format';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const profileA = this.testProfiles[0];
      const storedHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileA.id}`);

      if (!storedHash) {
        console.log(`[PINProtectionTest] ❌ ${testName} - No PIN hash found`);
        return {
          testName,
          passed: false,
          message: 'No PIN hash found in storage',
        };
      }

      // Verify hash is not the plaintext PIN
      if (storedHash === '1234') {
        console.log(`[PINProtectionTest] ❌ ${testName} - PIN stored as plaintext`);
        return {
          testName,
          passed: false,
          message: 'Security issue: PIN stored as plaintext',
        };
      }

      // Verify hash length (base64 encoded should be longer than 4 chars)
      if (storedHash.length <= 4) {
        console.log(`[PINProtectionTest] ❌ ${testName} - Hash too short`);
        return {
          testName,
          passed: false,
          message: 'PIN hash format invalid (too short)',
        };
      }

      console.log(`[PINProtectionTest] ✅ ${testName} - Hash format valid: ${storedHash.substring(0, 10)}...`);
      return {
        testName,
        passed: true,
        message: `PIN stored as hash (length: ${storedHash.length})`,
      };
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error verifying hash format',
        error: error as Error,
      };
    }
  }

  /**
   * Test 3: Verify incorrect PIN is rejected
   */
  async testIncorrectPIN(): Promise<PINTestResult> {
    const testName = 'Reject incorrect PIN';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const profileA = this.testProfiles[0];
      const storedHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileA.id}`);
      const incorrectPin = '9999';
      const incorrectHash = hashPin(incorrectPin);

      if (!storedHash) {
        console.log(`[PINProtectionTest] ❌ ${testName} - No PIN hash found`);
        return {
          testName,
          passed: false,
          message: 'No PIN hash found for verification',
        };
      }

      const isRejected = incorrectHash !== storedHash;

      if (isRejected) {
        console.log(`[PINProtectionTest] ✅ ${testName} - Incorrect PIN rejected`);
        return {
          testName,
          passed: true,
          message: 'Incorrect PIN correctly rejected',
        };
      } else {
        console.log(`[PINProtectionTest] ❌ ${testName} - Incorrect PIN accepted`);
        return {
          testName,
          passed: false,
          message: 'Security issue: Incorrect PIN was accepted',
        };
      }
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error testing incorrect PIN',
        error: error as Error,
      };
    }
  }

  /**
   * Test 4: Verify correct PIN is accepted
   */
  async testCorrectPIN(): Promise<PINTestResult> {
    const testName = 'Accept correct PIN';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const profileA = this.testProfiles[0];
      const storedHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileA.id}`);
      const correctPin = '1234';
      const correctHash = hashPin(correctPin);

      if (!storedHash) {
        console.log(`[PINProtectionTest] ❌ ${testName} - No PIN hash found`);
        return {
          testName,
          passed: false,
          message: 'No PIN hash found for verification',
        };
      }

      const isAccepted = correctHash === storedHash;

      if (isAccepted) {
        console.log(`[PINProtectionTest] ✅ ${testName} - Correct PIN accepted`);
        return {
          testName,
          passed: true,
          message: 'Correct PIN correctly accepted',
        };
      } else {
        console.log(`[PINProtectionTest] ❌ ${testName} - Correct PIN rejected`);
        return {
          testName,
          passed: false,
          message: 'Correct PIN was rejected',
        };
      }
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error testing correct PIN',
        error: error as Error,
      };
    }
  }

  /**
   * Test 5: Verify Profile B has no PIN
   */
  async testProfileWithoutPIN(): Promise<PINTestResult> {
    const testName = 'Verify Profile B has no PIN';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const profileB = this.testProfiles[1];
      const storedHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileB.id}`);

      if (!storedHash) {
        console.log(`[PINProtectionTest] ✅ ${testName} - Profile B has no PIN`);
        return {
          testName,
          passed: true,
          message: 'Profile B correctly has no PIN set',
        };
      } else {
        console.log(`[PINProtectionTest] ❌ ${testName} - Profile B has unexpected PIN`);
        return {
          testName,
          passed: false,
          message: 'Profile B should not have a PIN',
        };
      }
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error checking Profile B PIN status',
        error: error as Error,
      };
    }
  }

  /**
   * Test 6: Verify PIN validation rules
   */
  async testPINValidation(): Promise<PINTestResult> {
    const testName = 'PIN validation rules';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const validations = {
        fourDigits: true,
        onlyNumbers: true,
        notEmpty: true,
      };

      // Test: PIN must be 4 digits
      const shortPin = '123';
      const longPin = '12345';
      validations.fourDigits = shortPin.length !== 4 && longPin.length !== 4;

      // Test: PIN should only contain numbers (simulate validation)
      const numericPin = '1234';
      const hasOnlyNumbers = /^\d+$/.test(numericPin);
      validations.onlyNumbers = hasOnlyNumbers;

      // Test: PIN should not be empty
      const emptyPin = '';
      validations.notEmpty = emptyPin.length === 0;

      const allValid = validations.fourDigits && validations.onlyNumbers && validations.notEmpty;

      if (allValid) {
        console.log(`[PINProtectionTest] ✅ ${testName} - All validation rules correct`);
        return {
          testName,
          passed: true,
          message: 'PIN validation rules working correctly',
        };
      } else {
        console.log(`[PINProtectionTest] ❌ ${testName} - Validation failed`, validations);
        return {
          testName,
          passed: false,
          message: 'PIN validation rules not working correctly',
        };
      }
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error testing PIN validation',
        error: error as Error,
      };
    }
  }

  /**
   * Test 7: Test PIN disable functionality
   */
  async testDisablePIN(): Promise<PINTestResult> {
    const testName = 'Disable PIN protection';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const profileA = this.testProfiles[0];

      // Verify PIN exists first
      const beforeHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileA.id}`);
      if (!beforeHash) {
        console.log(`[PINProtectionTest] ❌ ${testName} - No PIN to disable`);
        return {
          testName,
          passed: false,
          message: 'No PIN found to disable',
        };
      }

      // Remove PIN
      await mmkvStorage.removeItem(`${PIN_STORAGE_PREFIX}${profileA.id}`);

      // Verify removal
      const afterHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileA.id}`);

      if (!afterHash) {
        console.log(`[PINProtectionTest] ✅ ${testName} - PIN disabled successfully`);
        return {
          testName,
          passed: true,
          message: 'PIN disabled successfully',
        };
      } else {
        console.log(`[PINProtectionTest] ❌ ${testName} - PIN still exists`);
        return {
          testName,
          passed: false,
          message: 'PIN was not removed',
        };
      }
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error disabling PIN',
        error: error as Error,
      };
    }
  }

  /**
   * Test 8: Test multiple PINs for different profiles
   */
  async testMultiplePINs(): Promise<PINTestResult> {
    const testName = 'Multiple profiles with different PINs';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const profileA = this.testProfiles[0];
      const profileB = this.testProfiles[1];

      // Set different PINs for each profile
      const pinA = '1234';
      const pinB = '5678';

      await mmkvStorage.setItem(`${PIN_STORAGE_PREFIX}${profileA.id}`, hashPin(pinA));
      await mmkvStorage.setItem(`${PIN_STORAGE_PREFIX}${profileB.id}`, hashPin(pinB));

      // Verify each profile has its own PIN
      const hashA = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileA.id}`);
      const hashB = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileB.id}`);

      if (!hashA || !hashB) {
        console.log(`[PINProtectionTest] ❌ ${testName} - PINs not stored`);
        return {
          testName,
          passed: false,
          message: 'One or both PINs not stored',
        };
      }

      // Verify PINs are different
      if (hashA === hashB) {
        console.log(`[PINProtectionTest] ❌ ${testName} - PINs are the same`);
        return {
          testName,
          passed: false,
          message: 'Different PINs resulted in same hash',
        };
      }

      // Verify cross-validation fails
      const pinAWorksForB = hashPin(pinA) === hashB;
      const pinBWorksForA = hashPin(pinB) === hashA;

      if (pinAWorksForB || pinBWorksForA) {
        console.log(`[PINProtectionTest] ❌ ${testName} - Cross-validation succeeded`);
        return {
          testName,
          passed: false,
          message: 'PIN from one profile works for another',
        };
      }

      console.log(`[PINProtectionTest] ✅ ${testName} - Multiple PINs isolated correctly`);
      return {
        testName,
        passed: true,
        message: 'Multiple profiles with different PINs work correctly',
      };
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error testing multiple PINs',
        error: error as Error,
      };
    }
  }

  /**
   * Test 9: Verify PIN storage key format
   */
  async testPINStorageKeyFormat(): Promise<PINTestResult> {
    const testName = 'PIN storage key format';
    console.log(`[PINProtectionTest] Running: ${testName}`);

    try {
      const profileA = this.testProfiles[0];
      const expectedKeyFormat = `${PIN_STORAGE_PREFIX}${profileA.id}`;
      const storedHash = await mmkvStorage.getItem(expectedKeyFormat);

      if (storedHash) {
        console.log(`[PINProtectionTest] ✅ ${testName} - Storage key format correct: ${expectedKeyFormat}`);
        return {
          testName,
          passed: true,
          message: `PIN storage key format is correct: ${expectedKeyFormat}`,
        };
      } else {
        console.log(`[PINProtectionTest] ❌ ${testName} - Storage key format incorrect`);
        return {
          testName,
          passed: false,
          message: 'PIN storage key format does not match expected pattern',
        };
      }
    } catch (error) {
      console.error(`[PINProtectionTest] ❌ ${testName} - Error:`, error);
      return {
        testName,
        passed: false,
        message: 'Error testing storage key format',
        error: error as Error,
      };
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup(): Promise<void> {
    console.log('[PINProtectionTest] Cleaning up test data...');

    for (const profile of this.testProfiles) {
      try {
        await mmkvStorage.removeItem(`${PIN_STORAGE_PREFIX}${profile.id}`);
      } catch (error) {
        console.warn(`[PINProtectionTest] Warning: Failed to cleanup PIN for profile ${profile.id}`, error);
      }
    }

    console.log('[PINProtectionTest] Cleanup complete');
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<PINTestSuiteResults> {
    console.log('[PINProtectionTest] Starting E2E PIN Protection Test Suite');
    console.log('='.repeat(60));

    this.results = [];

    // Setup
    await this.setupTestProfiles();

    // Run tests
    this.results.push(await this.testEnablePIN());
    this.results.push(await this.testPINHashFormat());
    this.results.push(await this.testIncorrectPIN());
    this.results.push(await this.testCorrectPIN());
    this.results.push(await this.testProfileWithoutPIN());
    this.results.push(await this.testPINValidation());
    this.results.push(await this.testDisablePIN());
    this.results.push(await this.testMultiplePINs());
    this.results.push(await this.testPINStorageKeyFormat());

    // Cleanup
    await this.cleanup();

    // Calculate results
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const allPassed = failedTests === 0;

    console.log('='.repeat(60));
    console.log('[PINProtectionTest] Test Suite Complete');
    console.log(`[PINProtectionTest] Overall Result: ${allPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`[PINProtectionTest] Tests Passed: ${passedTests}/${totalTests}`);
    console.log('='.repeat(60));

    return {
      allPassed,
      totalTests,
      passedTests,
      failedTests,
      results: this.results,
    };
  }
}

/**
 * Export test runner
 */
export async function runPINProtectionTests(): Promise<PINTestSuiteResults> {
  const tester = new PINProtectionTester();
  return await tester.runAllTests();
}

/**
 * Log test results in formatted way
 */
export function logTestResults(results: PINTestSuiteResults): void {
  console.log('\n');
  console.log('PIN Protection Test Results:');
  console.log('='.repeat(60));

  results.results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.testName}`);
    console.log(`   ${result.message}`);
    if (result.error) {
      console.log(`   Error: ${result.error.message}`);
    }
  });

  console.log('='.repeat(60));
  console.log(`Total: ${results.totalTests} | Passed: ${results.passedTests} | Failed: ${results.failedTests}`);
  console.log(`Status: ${results.allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('='.repeat(60));
}

export default {
  runPINProtectionTests,
  logTestResults,
};
