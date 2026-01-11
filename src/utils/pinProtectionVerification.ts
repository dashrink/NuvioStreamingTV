/**
 * PIN Protection Verification Utility
 *
 * This utility provides functions to verify that PIN protection
 * is working correctly in the application. It can be used for:
 *
 * 1. Development testing
 * 2. QA verification
 * 3. Production health checks
 *
 * @module PINProtectionVerification
 */

import { mmkvStorage } from '../services/mmkvStorage';
import { logger } from './logger';

const PROFILE_STORAGE_KEY = 'user_profiles';
const PIN_STORAGE_PREFIX = 'profile_pin_hash_';

export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  createdAt: number;
}

export interface PINStatusResult {
  profileId: string;
  profileName: string;
  hasPIN: boolean;
  isActive: boolean;
}

export interface PINProtectionStatus {
  totalProfiles: number;
  protectedProfiles: number;
  unprotectedProfiles: number;
  activeProfileProtected: boolean;
  profileStatuses: PINStatusResult[];
}

/**
 * Hash a PIN using the same algorithm as ProfileSwitcherBottomSheet
 */
const hashPin = (pin: string): string => {
  const salted = `nuvio_pin_salt_${pin}_end`;
  return btoa(salted);
};

/**
 * Check if a profile has PIN protection enabled
 */
export async function checkProfileHasPIN(profileId: string): Promise<boolean> {
  const pinKey = `${PIN_STORAGE_PREFIX}${profileId}`;
  const storedHash = await mmkvStorage.getItem(pinKey);
  return storedHash !== null && storedHash.length > 0;
}

/**
 * Verify a PIN for a profile
 */
export async function verifyPIN(profileId: string, pin: string): Promise<{ valid: boolean; error?: string }> {
  const pinKey = `${PIN_STORAGE_PREFIX}${profileId}`;
  const storedHash = await mmkvStorage.getItem(pinKey);

  if (!storedHash) {
    return { valid: true }; // No PIN means access granted
  }

  if (pin.length !== 4) {
    return { valid: false, error: 'PIN must be 4 digits' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only digits' };
  }

  const inputHash = hashPin(pin);
  const isValid = inputHash === storedHash;

  return { valid: isValid, error: isValid ? undefined : 'Incorrect PIN' };
}

/**
 * Get PIN protection status for all profiles
 */
export async function getPINProtectionStatus(): Promise<PINProtectionStatus> {
  const profileStatuses: PINStatusResult[] = [];
  let protectedCount = 0;
  let activeProfileProtected = false;

  try {
    const profilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    const profiles: Profile[] = profilesJson ? JSON.parse(profilesJson) : [];

    for (const profile of profiles) {
      const hasPIN = await checkProfileHasPIN(profile.id);

      if (hasPIN) {
        protectedCount++;
        if (profile.isActive) {
          activeProfileProtected = true;
        }
      }

      profileStatuses.push({
        profileId: profile.id,
        profileName: profile.name,
        hasPIN,
        isActive: profile.isActive,
      });
    }

    return {
      totalProfiles: profiles.length,
      protectedProfiles: protectedCount,
      unprotectedProfiles: profiles.length - protectedCount,
      activeProfileProtected,
      profileStatuses,
    };
  } catch (error: any) {
    logger.error('[PINProtection] Error getting status:', error);
    return {
      totalProfiles: 0,
      protectedProfiles: 0,
      unprotectedProfiles: 0,
      activeProfileProtected: false,
      profileStatuses: [],
    };
  }
}

/**
 * Verify PIN hash is stored properly (not plaintext)
 */
export async function verifyPINHashSecurity(profileId: string): Promise<{
  isSecure: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  const pinKey = `${PIN_STORAGE_PREFIX}${profileId}`;
  const storedHash = await mmkvStorage.getItem(pinKey);

  if (!storedHash) {
    return { isSecure: true, issues: ['No PIN stored'] };
  }

  // Check that it's not a simple 4-digit number
  if (/^\d{4}$/.test(storedHash)) {
    issues.push('PIN appears to be stored as plaintext 4-digit number');
  }

  // Check minimum length (hashed values should be longer)
  if (storedHash.length < 10) {
    issues.push('Stored hash is suspiciously short');
  }

  // Check for base64 encoding pattern (our hash uses base64)
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  if (!base64Pattern.test(storedHash)) {
    issues.push('Hash does not match expected encoding pattern');
  }

  return {
    isSecure: issues.length === 0,
    issues,
  };
}

/**
 * Enable PIN for a profile
 */
export async function enablePIN(profileId: string, pin: string): Promise<{ success: boolean; error?: string }> {
  if (pin.length !== 4) {
    return { success: false, error: 'PIN must be 4 digits' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: 'PIN must contain only digits' };
  }

  try {
    const pinKey = `${PIN_STORAGE_PREFIX}${profileId}`;
    const pinHash = hashPin(pin);
    await mmkvStorage.setItem(pinKey, pinHash);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Disable PIN for a profile
 */
export async function disablePIN(profileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const pinKey = `${PIN_STORAGE_PREFIX}${profileId}`;
    await mmkvStorage.removeItem(pinKey);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Log PIN protection status summary
 */
export async function logPINProtectionStatus(): Promise<void> {
  const status = await getPINProtectionStatus();

  logger.log('=== PIN Protection Status ===');
  logger.log(`Total Profiles: ${status.totalProfiles}`);
  logger.log(`Protected Profiles: ${status.protectedProfiles}`);
  logger.log(`Unprotected Profiles: ${status.unprotectedProfiles}`);
  logger.log(`Active Profile Protected: ${status.activeProfileProtected ? 'Yes' : 'No'}`);
  logger.log('');
  logger.log('Profile Details:');

  for (const profileStatus of status.profileStatuses) {
    const activeMarker = profileStatus.isActive ? ' (ACTIVE)' : '';
    const pinStatus = profileStatus.hasPIN ? '[PIN]' : '[NO PIN]';
    logger.log(`  ${pinStatus} ${profileStatus.profileName}${activeMarker}`);
  }

  logger.log('==============================');
}

/**
 * Run quick PIN protection verification
 */
export async function quickPINVerification(): Promise<{
  passed: boolean;
  summary: string;
  details: Record<string, unknown>;
}> {
  const status = await getPINProtectionStatus();

  const details: Record<string, unknown> = {
    totalProfiles: status.totalProfiles,
    protectedProfiles: status.protectedProfiles,
    profileStatuses: status.profileStatuses.map(ps => ({
      name: ps.profileName,
      hasPIN: ps.hasPIN,
      isActive: ps.isActive,
    })),
  };

  // Verify security of all protected profiles
  const securityIssues: string[] = [];
  for (const profileStatus of status.profileStatuses) {
    if (profileStatus.hasPIN) {
      const security = await verifyPINHashSecurity(profileStatus.profileId);
      if (!security.isSecure) {
        securityIssues.push(`${profileStatus.profileName}: ${security.issues.join(', ')}`);
      }
    }
  }

  details.securityIssues = securityIssues;

  const passed = securityIssues.length === 0;
  const summary = passed
    ? `PIN protection working correctly for ${status.protectedProfiles} profile(s)`
    : `PIN security issues found: ${securityIssues.join('; ')}`;

  return { passed, summary, details };
}

export default {
  checkProfileHasPIN,
  verifyPIN,
  getPINProtectionStatus,
  verifyPINHashSecurity,
  enablePIN,
  disablePIN,
  logPINProtectionStatus,
  quickPINVerification,
};
