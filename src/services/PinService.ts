/**
 * PinService - Secure PIN storage and verification
 * Uses expo-crypto for hashing PINs before storage
 */

import * as Crypto from 'expo-crypto';

import { mmkvStorage } from './mmkvStorage';
import { PinAttemptInfo, PIN_CONFIG, PROFILE_STORAGE_KEYS } from '../types/profile';
import { logger } from '../utils/logger';

// Storage keys for PIN data
const PIN_HASH_PREFIX = '@profile:pin:';
const PIN_ATTEMPTS_PREFIX = '@profile:pin_attempts:';

class PinService {
  private static instance: PinService;

  private constructor() {}

  public static getInstance(): PinService {
    if (!PinService.instance) {
      PinService.instance = new PinService();
    }
    return PinService.instance;
  }

  /**
   * Hash a PIN using SHA-256
   */
  private async hashPin(pin: string, salt: string): Promise<string> {
    const saltedPin = `${salt}:${pin}:nuvio_profile_pin`;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedPin);
    return hash;
  }

  /**
   * Generate a random salt for PIN hashing
   */
  private generateSalt(): string {
    // Generate a random string for salt
    return `${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Validate PIN format
   */
  validatePinFormat(pin: string): { valid: boolean; error?: string } {
    if (!pin) {
      return { valid: false, error: 'PIN is required' };
    }

    if (!/^\d+$/.test(pin)) {
      return { valid: false, error: 'PIN must contain only numbers' };
    }

    if (pin.length < PIN_CONFIG.pinMinLength) {
      return { valid: false, error: `PIN must be at least ${PIN_CONFIG.pinMinLength} digits` };
    }

    if (pin.length > PIN_CONFIG.pinMaxLength) {
      return { valid: false, error: `PIN must be at most ${PIN_CONFIG.pinMaxLength} digits` };
    }

    return { valid: true };
  }

  /**
   * Set a PIN for a profile
   */
  async setPin(profileId: string, pin: string): Promise<boolean> {
    try {
      const validation = this.validatePinFormat(pin);
      if (!validation.valid) {
        logger.warn('[PinService] Invalid PIN format:', validation.error);
        return false;
      }

      const salt = this.generateSalt();
      const hash = await this.hashPin(pin, salt);

      // Store the salt and hash together
      const pinData = JSON.stringify({ salt, hash });
      await mmkvStorage.setItem(`${PIN_HASH_PREFIX}${profileId}`, pinData);

      // Reset attempt counter when PIN is set
      await this.resetAttempts(profileId);

      if (__DEV__) {
        logger.info('[PinService] PIN set successfully for profile:', profileId);
      }

      return true;
    } catch (error) {
      logger.error('[PinService] Error setting PIN:', error);
      return false;
    }
  }

  /**
   * Verify a PIN for a profile
   */
  async verifyPin(
    profileId: string,
    pin: string
  ): Promise<{
    success: boolean;
    attemptsRemaining?: number;
    lockedUntil?: number;
  }> {
    try {
      // Check if locked out
      const lockoutInfo = await this.getLockoutInfo(profileId);
      if (lockoutInfo.isLocked) {
        return {
          success: false,
          attemptsRemaining: 0,
          lockedUntil: lockoutInfo.lockedUntil ?? undefined,
        };
      }

      // Get stored PIN data
      const pinDataJson = await mmkvStorage.getItem(`${PIN_HASH_PREFIX}${profileId}`);
      if (!pinDataJson) {
        // No PIN set - treat as success (profile not PIN protected)
        return { success: true };
      }

      const pinData = JSON.parse(pinDataJson);
      const { salt, hash } = pinData;

      // Hash the provided PIN and compare
      const inputHash = await this.hashPin(pin, salt);
      const isValid = inputHash === hash;

      if (isValid) {
        // Reset attempts on success
        await this.resetAttempts(profileId);
        return { success: true };
      } else {
        // Record failed attempt
        const attemptInfo = await this.recordFailedAttempt(profileId);
        return {
          success: false,
          attemptsRemaining: Math.max(0, PIN_CONFIG.maxAttempts - attemptInfo.attempts),
          lockedUntil: attemptInfo.lockedUntil || undefined,
        };
      }
    } catch (error) {
      logger.error('[PinService] Error verifying PIN:', error);
      return { success: false, attemptsRemaining: 0 };
    }
  }

  /**
   * Check if a profile has a PIN set
   */
  async hasPin(profileId: string): Promise<boolean> {
    try {
      const pinData = await mmkvStorage.getItem(`${PIN_HASH_PREFIX}${profileId}`);
      return !!pinData;
    } catch (error) {
      logger.error('[PinService] Error checking PIN existence:', error);
      return false;
    }
  }

  /**
   * Remove PIN from a profile
   */
  async removePin(profileId: string): Promise<boolean> {
    try {
      await mmkvStorage.removeItem(`${PIN_HASH_PREFIX}${profileId}`);
      await this.resetAttempts(profileId);
      return true;
    } catch (error) {
      logger.error('[PinService] Error removing PIN:', error);
      return false;
    }
  }

  /**
   * Change PIN for a profile (requires old PIN verification)
   */
  async changePin(
    profileId: string,
    oldPin: string,
    newPin: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verify old PIN first
      const verification = await this.verifyPin(profileId, oldPin);
      if (!verification.success) {
        if (verification.lockedUntil) {
          return {
            success: false,
            error: `Too many attempts. Try again in ${Math.ceil((verification.lockedUntil - Date.now()) / 1000)} seconds`,
          };
        }
        return {
          success: false,
          error: `Incorrect PIN. ${verification.attemptsRemaining} attempts remaining`,
        };
      }

      // Validate new PIN format
      const validation = this.validatePinFormat(newPin);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Set new PIN
      const success = await this.setPin(profileId, newPin);
      return { success, error: success ? undefined : 'Failed to set new PIN' };
    } catch (error) {
      logger.error('[PinService] Error changing PIN:', error);
      return { success: false, error: 'Failed to change PIN' };
    }
  }

  /**
   * Get lockout information for a profile
   */
  async getLockoutInfo(profileId: string): Promise<{
    isLocked: boolean;
    lockedUntil: number | null;
    attemptsRemaining: number;
  }> {
    try {
      const attemptInfo = await this.getAttemptInfo(profileId);

      if (attemptInfo.lockedUntil && Date.now() < attemptInfo.lockedUntil) {
        return {
          isLocked: true,
          lockedUntil: attemptInfo.lockedUntil,
          attemptsRemaining: 0,
        };
      }

      // Lockout expired or no lockout
      if (attemptInfo.lockedUntil && Date.now() >= attemptInfo.lockedUntil) {
        // Clear the expired lockout
        await this.resetAttempts(profileId);
        return {
          isLocked: false,
          lockedUntil: null,
          attemptsRemaining: PIN_CONFIG.maxAttempts,
        };
      }

      return {
        isLocked: false,
        lockedUntil: null,
        attemptsRemaining: Math.max(0, PIN_CONFIG.maxAttempts - attemptInfo.attempts),
      };
    } catch (error) {
      logger.error('[PinService] Error getting lockout info:', error);
      return { isLocked: false, lockedUntil: null, attemptsRemaining: PIN_CONFIG.maxAttempts };
    }
  }

  /**
   * Get attempt information for a profile
   */
  private async getAttemptInfo(profileId: string): Promise<PinAttemptInfo> {
    try {
      const infoJson = await mmkvStorage.getItem(`${PIN_ATTEMPTS_PREFIX}${profileId}`);
      if (infoJson) {
        return JSON.parse(infoJson);
      }
      return { attempts: 0, lockedUntil: null, lastAttemptAt: 0 };
    } catch (error) {
      return { attempts: 0, lockedUntil: null, lastAttemptAt: 0 };
    }
  }

  /**
   * Record a failed PIN attempt
   */
  private async recordFailedAttempt(profileId: string): Promise<PinAttemptInfo> {
    try {
      const currentInfo = await this.getAttemptInfo(profileId);
      const now = Date.now();

      // If previous lockout expired, reset attempts
      if (currentInfo.lockedUntil && now >= currentInfo.lockedUntil) {
        currentInfo.attempts = 0;
        currentInfo.lockedUntil = null;
      }

      currentInfo.attempts += 1;
      currentInfo.lastAttemptAt = now;

      // Apply lockout if max attempts reached
      if (currentInfo.attempts >= PIN_CONFIG.maxAttempts) {
        // Calculate lockout duration based on consecutive lockouts
        const lockoutIndex = Math.min(
          Math.floor(currentInfo.attempts / PIN_CONFIG.maxAttempts) - 1,
          PIN_CONFIG.lockoutDurations.length - 1
        );
        const lockoutDuration = PIN_CONFIG.lockoutDurations[lockoutIndex];
        currentInfo.lockedUntil = now + lockoutDuration;
      }

      await mmkvStorage.setItem(`${PIN_ATTEMPTS_PREFIX}${profileId}`, JSON.stringify(currentInfo));

      return currentInfo;
    } catch (error) {
      logger.error('[PinService] Error recording failed attempt:', error);
      return { attempts: 0, lockedUntil: null, lastAttemptAt: Date.now() };
    }
  }

  /**
   * Reset PIN attempts for a profile
   */
  async resetAttempts(profileId: string): Promise<void> {
    try {
      await mmkvStorage.removeItem(`${PIN_ATTEMPTS_PREFIX}${profileId}`);
    } catch (error) {
      logger.error('[PinService] Error resetting attempts:', error);
    }
  }

  /**
   * Delete all PIN data for a profile (used when profile is deleted)
   */
  async deleteProfilePinData(profileId: string): Promise<void> {
    try {
      await mmkvStorage.removeItem(`${PIN_HASH_PREFIX}${profileId}`);
      await mmkvStorage.removeItem(`${PIN_ATTEMPTS_PREFIX}${profileId}`);
    } catch (error) {
      logger.error('[PinService] Error deleting profile PIN data:', error);
    }
  }
}

export const pinService = PinService.getInstance();
export default pinService;
