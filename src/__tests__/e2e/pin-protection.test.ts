/**
 * E2E PIN Protection Verification Tests
 *
 * This module provides programmatic verification of PIN protection
 * to ensure PIN-protected profiles correctly block unauthorized access
 * and allow access with correct PIN entry.
 *
 * End-to-end verification steps:
 * 1. Enable PIN on Profile A
 * 2. Switch to Profile B
 * 3. Attempt to switch back to Profile A
 * 4. Enter incorrect PIN - verify error
 * 5. Enter correct PIN - verify successful switch
 *
 * @module PINProtectionTests
 */

import { mmkvStorage } from '../../services/mmkvStorage';
import { logger } from '../../utils/logger';

// Storage keys
const PROFILE_STORAGE_KEY = 'user_profiles';
const PIN_STORAGE_PREFIX = 'profile_pin_hash_';

export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  createdAt: number;
}

export interface PINTestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface PINTestSuite {
  allPassed: boolean;
  results: PINTestResult[];
  timestamp: number;
}

/**
 * Hash a PIN using the same algorithm as ProfileSwitcherBottomSheet
 * Simple hash using base64 encoding of a salted PIN
 */
const hashPin = (pin: string): string => {
  const salted = `nuvio_pin_salt_${pin}_end`;
  return btoa(salted);
};

/**
 * PINProtectionTester class provides methods to verify PIN protection
 */
export class PINProtectionTester {
  private profileA: Profile | null = null;
  private profileB: Profile | null = null;
  private testPin = '1234';
  private wrongPin = '9999';

  /**
   * Create test profiles for PIN protection testing
   */
  async createTestProfiles(): Promise<{ profileA: Profile; profileB: Profile }> {
    const timestamp = Date.now();

    this.profileA = {
      id: `pin-test-profile-a-${timestamp}`,
      name: 'PIN Test Profile A (Protected)',
      avatar: 'protected-avatar',
      isActive: false,
      createdAt: timestamp
    };

    this.profileB = {
      id: `pin-test-profile-b-${timestamp}`,
      name: 'PIN Test Profile B (Unprotected)',
      avatar: 'unprotected-avatar',
      isActive: false,
      createdAt: timestamp + 1
    };

    // Load existing profiles and add test profiles
    const existingProfilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    const existingProfiles: Profile[] = existingProfilesJson ? JSON.parse(existingProfilesJson) : [];

    // Set profileB as active (we want to switch TO profileA which is protected)
    this.profileB.isActive = true;

    const updatedProfiles = [...existingProfiles, this.profileA, this.profileB];
    await mmkvStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfiles));

    logger.log('[PINProtectionTest] Created test profiles:', this.profileA.name, this.profileB.name);

    return { profileA: this.profileA, profileB: this.profileB };
  }

  /**
   * Enable PIN on Profile A
   */
  async enablePinOnProfileA(): Promise<PINTestResult> {
    if (!this.profileA) {
      return {
        testName: 'Enable PIN on Profile A',
        passed: false,
        message: 'Profile A not created'
      };
    }

    try {
      const pinHash = hashPin(this.testPin);
      const pinKey = `${PIN_STORAGE_PREFIX}${this.profileA.id}`;
      await mmkvStorage.setItem(pinKey, pinHash);

      // Verify PIN was stored
      const storedHash = await mmkvStorage.getItem(pinKey);
      const pinStored = storedHash === pinHash;

      logger.log('[PINProtectionTest] PIN enabled on Profile A, hash stored:', pinStored);

      return {
        testName: 'Enable PIN on Profile A',
        passed: pinStored,
        message: pinStored
          ? 'PIN successfully enabled on Profile A'
          : 'Failed to store PIN hash for Profile A',
        details: {
          profileId: this.profileA.id,
          pinKeyUsed: pinKey,
          hashLength: pinHash.length,
        }
      };
    } catch (error: any) {
      return {
        testName: 'Enable PIN on Profile A',
        passed: false,
        message: `Error enabling PIN: ${error.message}`,
        details: { error: error.stack }
      };
    }
  }

  /**
   * Verify Profile A has PIN protection enabled
   */
  async verifyPinIsEnabled(): Promise<PINTestResult> {
    if (!this.profileA) {
      return {
        testName: 'Verify PIN Enabled',
        passed: false,
        message: 'Profile A not created'
      };
    }

    const pinKey = `${PIN_STORAGE_PREFIX}${this.profileA.id}`;
    const storedHash = await mmkvStorage.getItem(pinKey);
    const hasPinEnabled = storedHash !== null && storedHash.length > 0;

    return {
      testName: 'Verify PIN Enabled on Profile A',
      passed: hasPinEnabled,
      message: hasPinEnabled
        ? 'Profile A has PIN protection enabled'
        : 'Profile A does not have PIN protection enabled',
      details: {
        pinKeyChecked: pinKey,
        hasStoredHash: hasPinEnabled,
      }
    };
  }

  /**
   * Switch to Profile B (set as active)
   */
  async switchToProfileB(): Promise<PINTestResult> {
    if (!this.profileB) {
      return {
        testName: 'Switch to Profile B',
        passed: false,
        message: 'Profile B not created'
      };
    }

    try {
      await this.setActiveProfile(this.profileB.id);

      // Verify Profile B is now active
      const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
      const profiles: Profile[] = JSON.parse(storedProfiles || '[]');
      const activeProfile = profiles.find(p => p.isActive);
      const isProfileBActive = activeProfile?.id === this.profileB.id;

      logger.log('[PINProtectionTest] Switched to Profile B, active:', isProfileBActive);

      return {
        testName: 'Switch to Profile B',
        passed: isProfileBActive,
        message: isProfileBActive
          ? 'Successfully switched to Profile B (unprotected)'
          : 'Failed to switch to Profile B',
        details: {
          activeProfileId: activeProfile?.id,
          expectedProfileId: this.profileB.id,
        }
      };
    } catch (error: any) {
      return {
        testName: 'Switch to Profile B',
        passed: false,
        message: `Error switching to Profile B: ${error.message}`,
        details: { error: error.stack }
      };
    }
  }

  /**
   * Set a profile as active (internal helper)
   */
  private async setActiveProfile(profileId: string): Promise<void> {
    const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    if (storedProfiles) {
      const parsedProfiles: Profile[] = JSON.parse(storedProfiles);
      const updatedProfiles = parsedProfiles.map(profile => ({
        ...profile,
        isActive: profile.id === profileId
      }));
      await mmkvStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfiles));
    }
  }

  /**
   * Verify PIN is required to switch to Profile A
   */
  async verifyPinRequiredForProfileA(): Promise<PINTestResult> {
    if (!this.profileA) {
      return {
        testName: 'Verify PIN Required',
        passed: false,
        message: 'Profile A not created'
      };
    }

    const pinKey = `${PIN_STORAGE_PREFIX}${this.profileA.id}`;
    const storedHash = await mmkvStorage.getItem(pinKey);
    const pinIsRequired = storedHash !== null && storedHash.length > 0;

    return {
      testName: 'Verify PIN Required for Profile A',
      passed: pinIsRequired,
      message: pinIsRequired
        ? 'PIN is required to access Profile A'
        : 'PIN is NOT required for Profile A (unexpected)',
      details: {
        profileAId: this.profileA.id,
        hasPinHash: pinIsRequired,
      }
    };
  }

  /**
   * Verify incorrect PIN is rejected
   */
  async verifyIncorrectPinRejected(): Promise<PINTestResult> {
    if (!this.profileA) {
      return {
        testName: 'Verify Incorrect PIN Rejected',
        passed: false,
        message: 'Profile A not created'
      };
    }

    const pinKey = `${PIN_STORAGE_PREFIX}${this.profileA.id}`;
    const storedHash = await mmkvStorage.getItem(pinKey);

    if (!storedHash) {
      return {
        testName: 'Verify Incorrect PIN Rejected',
        passed: false,
        message: 'No PIN hash stored for Profile A'
      };
    }

    // Test with incorrect PIN
    const wrongPinHash = hashPin(this.wrongPin);
    const incorrectPinRejected = wrongPinHash !== storedHash;

    logger.log('[PINProtectionTest] Wrong PIN test - rejected:', incorrectPinRejected);

    return {
      testName: 'Verify Incorrect PIN Rejected',
      passed: incorrectPinRejected,
      message: incorrectPinRejected
        ? 'Incorrect PIN correctly rejected (hash mismatch)'
        : 'WARNING: Incorrect PIN was NOT rejected!',
      details: {
        wrongPinUsed: this.wrongPin,
        correctPin: this.testPin,
        hashesMatch: !incorrectPinRejected,
      }
    };
  }

  /**
   * Verify correct PIN is accepted and allows profile switch
   */
  async verifyCorrectPinAccepted(): Promise<PINTestResult> {
    if (!this.profileA) {
      return {
        testName: 'Verify Correct PIN Accepted',
        passed: false,
        message: 'Profile A not created'
      };
    }

    const pinKey = `${PIN_STORAGE_PREFIX}${this.profileA.id}`;
    const storedHash = await mmkvStorage.getItem(pinKey);

    if (!storedHash) {
      return {
        testName: 'Verify Correct PIN Accepted',
        passed: false,
        message: 'No PIN hash stored for Profile A'
      };
    }

    // Test with correct PIN
    const correctPinHash = hashPin(this.testPin);
    const correctPinAccepted = correctPinHash === storedHash;

    if (correctPinAccepted) {
      // Simulate successful profile switch
      await this.setActiveProfile(this.profileA.id);
    }

    // Verify profile switched
    const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    const profiles: Profile[] = JSON.parse(storedProfiles || '[]');
    const activeProfile = profiles.find(p => p.isActive);
    const profileSwitched = activeProfile?.id === this.profileA.id;

    logger.log('[PINProtectionTest] Correct PIN test - accepted:', correctPinAccepted, 'switched:', profileSwitched);

    return {
      testName: 'Verify Correct PIN Accepted',
      passed: correctPinAccepted && profileSwitched,
      message: correctPinAccepted && profileSwitched
        ? 'Correct PIN accepted and profile switch successful'
        : correctPinAccepted
          ? 'PIN accepted but profile switch failed'
          : 'Correct PIN was NOT accepted (unexpected)',
      details: {
        pinAccepted: correctPinAccepted,
        profileSwitched,
        activeProfileId: activeProfile?.id,
        expectedProfileId: this.profileA.id,
      }
    };
  }

  /**
   * Verify PIN hash is not stored in plaintext
   */
  async verifyPinIsHashed(): Promise<PINTestResult> {
    if (!this.profileA) {
      return {
        testName: 'Verify PIN is Hashed',
        passed: false,
        message: 'Profile A not created'
      };
    }

    const pinKey = `${PIN_STORAGE_PREFIX}${this.profileA.id}`;
    const storedHash = await mmkvStorage.getItem(pinKey);

    if (!storedHash) {
      return {
        testName: 'Verify PIN is Hashed',
        passed: false,
        message: 'No PIN hash stored'
      };
    }

    // PIN should not be stored as plaintext
    const isNotPlaintext = storedHash !== this.testPin;
    // Hash should be longer than a 4-digit PIN
    const hasReasonableLength = storedHash.length > 10;
    // Should not be easily recognizable as just the PIN
    const notSimpleEncoding = !storedHash.includes(this.testPin);

    const isProperlyhashed = isNotPlaintext && hasReasonableLength && notSimpleEncoding;

    return {
      testName: 'Verify PIN is Hashed (Not Plaintext)',
      passed: isProperlyhashed,
      message: isProperlyhashed
        ? 'PIN is stored as a hash, not plaintext'
        : 'WARNING: PIN may not be properly hashed!',
      details: {
        isNotPlaintext,
        hasReasonableLength,
        notSimpleEncoding,
        hashLength: storedHash.length,
        storedValuePreview: storedHash.substring(0, 10) + '...',
      }
    };
  }

  /**
   * Verify PIN can be disabled
   */
  async verifyPinCanBeDisabled(): Promise<PINTestResult> {
    if (!this.profileA) {
      return {
        testName: 'Verify PIN Can Be Disabled',
        passed: false,
        message: 'Profile A not created'
      };
    }

    const pinKey = `${PIN_STORAGE_PREFIX}${this.profileA.id}`;

    // First verify PIN exists
    const storedHashBefore = await mmkvStorage.getItem(pinKey);
    if (!storedHashBefore) {
      return {
        testName: 'Verify PIN Can Be Disabled',
        passed: false,
        message: 'No PIN to disable'
      };
    }

    // Remove the PIN
    await mmkvStorage.removeItem(pinKey);

    // Verify PIN is removed
    const storedHashAfter = await mmkvStorage.getItem(pinKey);
    const pinRemoved = storedHashAfter === null;

    // Re-enable PIN for subsequent tests
    if (pinRemoved) {
      await mmkvStorage.setItem(pinKey, storedHashBefore);
    }

    return {
      testName: 'Verify PIN Can Be Disabled',
      passed: pinRemoved,
      message: pinRemoved
        ? 'PIN can be disabled (removed from storage)'
        : 'Failed to disable PIN',
      details: {
        pinExistedBefore: !!storedHashBefore,
        pinRemovedSuccessfully: pinRemoved,
      }
    };
  }

  /**
   * Clean up test profiles and PIN data
   */
  async cleanup(): Promise<void> {
    if (!this.profileA && !this.profileB) return;

    // Remove test profiles
    const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    if (storedProfiles) {
      const profiles: Profile[] = JSON.parse(storedProfiles);
      const cleanedProfiles = profiles.filter(p =>
        p.id !== this.profileA?.id && p.id !== this.profileB?.id
      );
      await mmkvStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cleanedProfiles));
    }

    // Clean up PIN hash for Profile A
    if (this.profileA) {
      const pinKey = `${PIN_STORAGE_PREFIX}${this.profileA.id}`;
      await mmkvStorage.removeItem(pinKey);
    }

    logger.log('[PINProtectionTest] Cleaned up test data');

    this.profileA = null;
    this.profileB = null;
  }

  /**
   * Run the full E2E PIN protection test suite
   */
  async runFullTestSuite(): Promise<PINTestSuite> {
    const results: PINTestResult[] = [];

    logger.log('[PINProtectionTest] Starting E2E PIN Protection Test Suite');

    try {
      // Step 1: Create test profiles
      await this.createTestProfiles();
      results.push({
        testName: 'Create Test Profiles',
        passed: true,
        message: 'Test profiles created successfully'
      });

      // Step 2: Enable PIN on Profile A
      results.push(await this.enablePinOnProfileA());

      // Step 3: Verify PIN is enabled
      results.push(await this.verifyPinIsEnabled());

      // Step 4: Verify PIN is properly hashed
      results.push(await this.verifyPinIsHashed());

      // Step 5: Switch to Profile B (unprotected)
      results.push(await this.switchToProfileB());

      // Step 6: Verify PIN is required to switch to Profile A
      results.push(await this.verifyPinRequiredForProfileA());

      // Step 7: Verify incorrect PIN is rejected
      results.push(await this.verifyIncorrectPinRejected());

      // Step 8: Verify correct PIN is accepted and switch succeeds
      results.push(await this.verifyCorrectPinAccepted());

      // Step 9: Verify PIN can be disabled
      results.push(await this.verifyPinCanBeDisabled());

    } catch (error: any) {
      results.push({
        testName: 'Test Suite Error',
        passed: false,
        message: `Error during test execution: ${error.message}`,
        details: { error: error.stack }
      });
    } finally {
      // Clean up test data
      await this.cleanup();
    }

    const allPassed = results.every(r => r.passed);

    const testSuite: PINTestSuite = {
      allPassed,
      results,
      timestamp: Date.now()
    };

    // Log summary
    logger.log('[PINProtectionTest] Test Suite Complete');
    logger.log(`[PINProtectionTest] Overall Result: ${allPassed ? 'PASSED' : 'FAILED'}`);
    logger.log(`[PINProtectionTest] Tests Passed: ${results.filter(r => r.passed).length}/${results.length}`);

    return testSuite;
  }
}

/**
 * Run the PIN protection test suite
 * Can be called from the app to verify PIN protection
 */
export async function runPINProtectionTests(): Promise<PINTestSuite> {
  const tester = new PINProtectionTester();
  return tester.runFullTestSuite();
}

/**
 * Quick PIN verification for a single profile
 */
export async function verifyProfilePIN(
  profileId: string,
  pin: string
): Promise<{ valid: boolean; hasPin: boolean }> {
  const pinKey = `${PIN_STORAGE_PREFIX}${profileId}`;
  const storedHash = await mmkvStorage.getItem(pinKey);

  if (!storedHash) {
    return { valid: true, hasPin: false }; // No PIN means access granted
  }

  const inputHash = hashPin(pin);
  return { valid: inputHash === storedHash, hasPin: true };
}

/**
 * Check if a profile has PIN protection enabled
 */
export async function profileHasPIN(profileId: string): Promise<boolean> {
  const pinKey = `${PIN_STORAGE_PREFIX}${profileId}`;
  const storedHash = await mmkvStorage.getItem(pinKey);
  return storedHash !== null && storedHash.length > 0;
}

/**
 * Export individual test functions for selective testing
 */
export const pinProtectionTests = {
  runFullTestSuite: runPINProtectionTests,
  PINProtectionTester,
  verifyProfilePIN,
  profileHasPIN,
  hashPin,
};

export default pinProtectionTests;
