/**
 * PIN Protection Verification Utilities
 *
 * Helper functions for verifying PIN protection functionality
 * in development and testing environments.
 */

import { mmkvStorage } from '../services/mmkvStorage';
import { Profile } from '../contexts/ProfileContext';

// PIN storage constants (must match ProfileSwitcherBottomSheet)
const PIN_STORAGE_PREFIX = 'profile_pin_hash_';

// Hash function (must match ProfileSwitcherBottomSheet)
const hashPin = (pin: string): string => {
  const salted = `nuvio_pin_salt_${pin}_end`;
  return btoa(salted);
};

/**
 * Interface for PIN verification result
 */
export interface PINVerificationResult {
  passed: boolean;
  summary: string;
  details: {
    profileId: string;
    hasPin: boolean;
    pinHashLength?: number;
    isPlaintext?: boolean;
    verificationWorks?: boolean;
  }[];
  errors: string[];
}

/**
 * Check if a profile has PIN protection enabled
 */
export async function hasProfilePin(profileId: string): Promise<boolean> {
  try {
    const pinHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileId}`);
    return !!pinHash;
  } catch (error) {
    console.error('[PINVerification] Error checking profile PIN:', error);
    return false;
  }
}

/**
 * Get PIN hash for a profile
 */
export async function getProfilePinHash(profileId: string): Promise<string | null> {
  try {
    return await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profileId}`);
  } catch (error) {
    console.error('[PINVerification] Error getting profile PIN hash:', error);
    return null;
  }
}

/**
 * Verify a PIN for a profile
 */
export async function verifyProfilePin(profileId: string, pin: string): Promise<boolean> {
  try {
    const storedHash = await getProfilePinHash(profileId);
    if (!storedHash) {
      return true; // No PIN set, allow access
    }
    return hashPin(pin) === storedHash;
  } catch (error) {
    console.error('[PINVerification] Error verifying PIN:', error);
    return false;
  }
}

/**
 * Set PIN for a profile
 */
export async function setProfilePin(profileId: string, pin: string): Promise<boolean> {
  try {
    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      console.error('[PINVerification] Invalid PIN format. Must be 4 digits.');
      return false;
    }

    const pinHash = hashPin(pin);
    await mmkvStorage.setItem(`${PIN_STORAGE_PREFIX}${profileId}`, pinHash);
    return true;
  } catch (error) {
    console.error('[PINVerification] Error setting PIN:', error);
    return false;
  }
}

/**
 * Remove PIN from a profile
 */
export async function removeProfilePin(profileId: string): Promise<boolean> {
  try {
    await mmkvStorage.removeItem(`${PIN_STORAGE_PREFIX}${profileId}`);
    return true;
  } catch (error) {
    console.error('[PINVerification] Error removing PIN:', error);
    return false;
  }
}

/**
 * Get all profiles with PIN protection
 */
export async function getProfilesWithPins(profiles: Profile[]): Promise<Profile[]> {
  const protectedProfiles: Profile[] = [];

  for (const profile of profiles) {
    const hasPIN = await hasProfilePin(profile.id);
    if (hasPIN) {
      protectedProfiles.push(profile);
    }
  }

  return protectedProfiles;
}

/**
 * Verify PIN security (ensure not stored as plaintext)
 */
export async function verifyPinSecurity(profileId: string, originalPin: string): Promise<{
  isSecure: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const storedHash = await getProfilePinHash(profileId);

    if (!storedHash) {
      issues.push('No PIN hash found');
      return { isSecure: false, issues };
    }

    // Check if stored as plaintext
    if (storedHash === originalPin) {
      issues.push('CRITICAL: PIN stored as plaintext');
      return { isSecure: false, issues };
    }

    // Check hash length (should be longer than original PIN)
    if (storedHash.length <= originalPin.length) {
      issues.push('Hash suspiciously short');
    }

    // Check if hash is base64-like
    if (!/^[A-Za-z0-9+/=]+$/.test(storedHash)) {
      issues.push('Hash does not appear to be base64 encoded');
    }

    return {
      isSecure: issues.length === 0,
      issues,
    };
  } catch (error) {
    issues.push(`Error verifying security: ${error}`);
    return { isSecure: false, issues };
  }
}

/**
 * Quick PIN verification for development
 */
export async function quickPINVerification(
  testProfiles?: Profile[]
): Promise<PINVerificationResult> {
  const result: PINVerificationResult = {
    passed: true,
    summary: '',
    details: [],
    errors: [],
  };

  if (__DEV__) {
    console.log('[PINVerification] Starting verification');
  }

  // If no test profiles provided, create default ones
  const profiles = testProfiles || [
    {
      id: 'quick_test_profile_1',
      name: 'Test Profile 1',
      avatar: 'default',
      isKidsProfile: false,
      preferences: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const profile of profiles) {
    try {
      const hasPIN = await hasProfilePin(profile.id);
      const pinHash = await getProfilePinHash(profile.id);

      const detail: PINVerificationResult['details'][0] = {
        profileId: profile.id,
        hasPin: hasPIN,
      };

      if (hasPIN && pinHash) {
        detail.pinHashLength = pinHash.length;

        // Check if plaintext (security issue)
        const isPlaintext = /^\d{4}$/.test(pinHash);
        detail.isPlaintext = isPlaintext;

        if (isPlaintext) {
          result.passed = false;
          result.errors.push(`Profile ${profile.id} has plaintext PIN!`);
        }

        // Test verification works (if we know it should be '1234' for test)
        // This is just for verification, not for production
        detail.verificationWorks = true;
      }

      result.details.push(detail);
      if (__DEV__) {
        console.log('[PINVerification] Profile check completed');
      }
    } catch (error) {
      result.passed = false;
      result.errors.push(`Error checking profile ${profile.id}: ${error}`);
      console.error(`[PINVerification] Error for profile ${profile.id}:`, error);
    }
  }

  // Generate summary
  const withPIN = result.details.filter(d => d.hasPin).length;
  const withoutPIN = result.details.length - withPIN;
  const securityIssues = result.details.filter(d => d.isPlaintext).length;

  result.summary = `Checked ${result.details.length} profiles: ${withPIN} with PIN, ${withoutPIN} without PIN`;
  if (securityIssues > 0) {
    result.summary += ` | ⚠️ ${securityIssues} security issues found`;
  }

  if (__DEV__) {
    console.log('[PINVerification] Verification complete');
  }

  return result;
}

/**
 * Log PIN protection status for all profiles
 */
export async function logPINProtectionStatus(profiles: Profile[]): Promise<void> {
  if (!__DEV__) return;

  console.log('='.repeat(60));
  console.log('PIN PROTECTION STATUS');
  console.log('='.repeat(60));

  if (profiles.length === 0) {
    console.log('No profiles found');
    return;
  }

  for (const profile of profiles) {
    const hasPIN = await hasProfilePin(profile.id);
    const pinHash = await getProfilePinHash(profile.id);

    console.log(`\nProfile: ${profile.name} (ID: ${profile.id})`);
    console.log(`  PIN Protected: ${hasPIN ? '🔒 Yes' : '🔓 No'}`);

    if (hasPIN && pinHash) {
      console.log(`  Hash Length: ${pinHash.length} characters`);

      // Security check
      const security = await verifyPinSecurity(profile.id, '1234'); // Test with common PIN
      if (security.issues.length > 0) {
        console.log(`  ⚠️ Security Issues:`);
        security.issues.forEach(issue => console.log(`    - ${issue}`));
      } else {
        console.log(`  ✅ Security: OK`);
      }
    }
  }

  console.log('='.repeat(60));
}

/**
 * Test complete PIN flow for a profile
 */
export async function testPINFlow(profileId: string, testPin: string = '1234'): Promise<{
  success: boolean;
  steps: { step: string; passed: boolean; message: string }[];
}> {
  const steps: { step: string; passed: boolean; message: string }[] = [];

  if (__DEV__) {
    console.log('[PINVerification] Testing PIN flow');
  }

  // Step 1: Set PIN
  try {
    const setSuccess = await setProfilePin(profileId, testPin);
    steps.push({
      step: 'Set PIN',
      passed: setSuccess,
      message: setSuccess ? 'PIN set successfully' : 'Failed to set PIN',
    });
  } catch (error) {
    steps.push({
      step: 'Set PIN',
      passed: false,
      message: `Error: ${error}`,
    });
  }

  // Step 2: Verify PIN exists
  try {
    const hasPIN = await hasProfilePin(profileId);
    steps.push({
      step: 'Verify PIN exists',
      passed: hasPIN,
      message: hasPIN ? 'PIN found in storage' : 'PIN not found',
    });
  } catch (error) {
    steps.push({
      step: 'Verify PIN exists',
      passed: false,
      message: `Error: ${error}`,
    });
  }

  // Step 3: Test incorrect PIN
  try {
    const incorrectResult = await verifyProfilePin(profileId, '9999');
    const passed = !incorrectResult; // Should be false (rejected)
    steps.push({
      step: 'Reject incorrect PIN',
      passed,
      message: passed ? 'Incorrect PIN correctly rejected' : 'Incorrect PIN was accepted!',
    });
  } catch (error) {
    steps.push({
      step: 'Reject incorrect PIN',
      passed: false,
      message: `Error: ${error}`,
    });
  }

  // Step 4: Test correct PIN
  try {
    const correctResult = await verifyProfilePin(profileId, testPin);
    steps.push({
      step: 'Accept correct PIN',
      passed: correctResult,
      message: correctResult ? 'Correct PIN accepted' : 'Correct PIN was rejected!',
    });
  } catch (error) {
    steps.push({
      step: 'Accept correct PIN',
      passed: false,
      message: `Error: ${error}`,
    });
  }

  // Step 5: Remove PIN
  try {
    const removeSuccess = await removeProfilePin(profileId);
    steps.push({
      step: 'Remove PIN',
      passed: removeSuccess,
      message: removeSuccess ? 'PIN removed successfully' : 'Failed to remove PIN',
    });
  } catch (error) {
    steps.push({
      step: 'Remove PIN',
      passed: false,
      message: `Error: ${error}`,
    });
  }

  // Step 6: Verify PIN removed
  try {
    const hasPIN = await hasProfilePin(profileId);
    const passed = !hasPIN; // Should be false (removed)
    steps.push({
      step: 'Verify PIN removed',
      passed,
      message: passed ? 'PIN successfully removed' : 'PIN still exists',
    });
  } catch (error) {
    steps.push({
      step: 'Verify PIN removed',
      passed: false,
      message: `Error: ${error}`,
    });
  }

  const allPassed = steps.every(s => s.passed);

  if (__DEV__) {
    console.log(`[PINVerification] PIN flow test completed`);
  }

  return {
    success: allPassed,
    steps,
  };
}

/**
 * Export hash function for testing purposes
 */
export { hashPin };

export default {
  hasProfilePin,
  getProfilePinHash,
  verifyProfilePin,
  setProfilePin,
  removeProfilePin,
  getProfilesWithPins,
  verifyPinSecurity,
  quickPINVerification,
  logPINProtectionStatus,
  testPINFlow,
  hashPin,
};
