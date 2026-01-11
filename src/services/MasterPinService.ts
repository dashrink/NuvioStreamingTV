/**
 * MasterPinService - Master PIN for profile recovery
 * The master PIN can be used to reset any profile's PIN
 */

import * as Crypto from 'expo-crypto';
import { mmkvStorage } from './mmkvStorage';
import { PIN_CONFIG } from '../types/profile';
import { logger } from '../utils/logger';

// Storage keys
const MASTER_PIN_KEY = '@profile:master_pin';
const MASTER_PIN_ATTEMPTS_KEY = '@profile:master_pin_attempts';
const MASTER_PIN_SETUP_COMPLETE_KEY = '@profile:master_pin_setup_complete';

interface MasterPinAttemptInfo {
  attempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

class MasterPinService {
  private static instance: MasterPinService;

  private constructor() {}

  public static getInstance(): MasterPinService {
    if (!MasterPinService.instance) {
      MasterPinService.instance = new MasterPinService();
    }
    return MasterPinService.instance;
  }

  /**
   * Hash the master PIN using SHA-256
   */
  private async hashPin(pin: string, salt: string): Promise<string> {
    const saltedPin = `${salt}:${pin}:nuvio_master_pin`;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedPin);
    return hash;
  }

  /**
   * Generate a random salt for PIN hashing
   */
  private generateSalt(): string {
    return `master_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Check if master PIN has been set up
   */
  async isMasterPinSetup(): Promise<boolean> {
    try {
      const isSetup = await mmkvStorage.getItem(MASTER_PIN_SETUP_COMPLETE_KEY);
      return isSetup === 'true';
    } catch (error) {
      logger.error('[MasterPinService] Error checking master PIN setup:', error);
      return false;
    }
  }

  /**
   * Set up the master PIN (only allowed once, or after reset by admin)
   */
  async setupMasterPin(pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate PIN format
      if (!pin) {
        return { success: false, error: 'Master PIN is required' };
      }

      if (!/^\d+$/.test(pin)) {
        return { success: false, error: 'Master PIN must contain only numbers' };
      }

      if (pin.length < PIN_CONFIG.pinMinLength) {
        return {
          success: false,
          error: `Master PIN must be at least ${PIN_CONFIG.pinMinLength} digits`,
        };
      }

      if (pin.length > PIN_CONFIG.pinMaxLength) {
        return {
          success: false,
          error: `Master PIN must be at most ${PIN_CONFIG.pinMaxLength} digits`,
        };
      }

      const salt = this.generateSalt();
      const hash = await this.hashPin(pin, salt);

      // Store the salt and hash together
      const pinData = JSON.stringify({ salt, hash });
      await mmkvStorage.setItem(MASTER_PIN_KEY, pinData);
      await mmkvStorage.setItem(MASTER_PIN_SETUP_COMPLETE_KEY, 'true');

      // Reset any attempt counters
      await this.resetAttempts();

      logger.info('[MasterPinService] Master PIN set up successfully');
      return { success: true };
    } catch (error) {
      logger.error('[MasterPinService] Error setting up master PIN:', error);
      return { success: false, error: 'Failed to set up master PIN' };
    }
  }

  /**
   * Verify the master PIN
   */
  async verifyMasterPin(pin: string): Promise<{
    success: boolean;
    attemptsRemaining?: number;
    lockedUntil?: number;
  }> {
    try {
      // Check if locked out
      const lockoutInfo = await this.getLockoutInfo();
      if (lockoutInfo.isLocked) {
        return {
          success: false,
          attemptsRemaining: 0,
          lockedUntil: lockoutInfo.lockedUntil ?? undefined,
        };
      }

      // Get stored PIN data
      const pinDataJson = await mmkvStorage.getItem(MASTER_PIN_KEY);
      if (!pinDataJson) {
        return { success: false };
      }

      const pinData = JSON.parse(pinDataJson);
      const { salt, hash } = pinData;

      // Hash the provided PIN and compare
      const inputHash = await this.hashPin(pin, salt);
      const isValid = inputHash === hash;

      if (isValid) {
        // Reset attempts on success
        await this.resetAttempts();
        return { success: true };
      } else {
        // Record failed attempt
        const attemptInfo = await this.recordFailedAttempt();
        return {
          success: false,
          attemptsRemaining: Math.max(0, PIN_CONFIG.maxAttempts - attemptInfo.attempts),
          lockedUntil: attemptInfo.lockedUntil || undefined,
        };
      }
    } catch (error) {
      logger.error('[MasterPinService] Error verifying master PIN:', error);
      return { success: false, attemptsRemaining: 0 };
    }
  }

  /**
   * Change the master PIN (requires current master PIN)
   */
  async changeMasterPin(
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify current PIN first
      const verification = await this.verifyMasterPin(currentPin);
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

      // Set new PIN (reuse setup logic)
      const salt = this.generateSalt();
      const hash = await this.hashPin(newPin, salt);
      const pinData = JSON.stringify({ salt, hash });
      await mmkvStorage.setItem(MASTER_PIN_KEY, pinData);

      return { success: true };
    } catch (error) {
      logger.error('[MasterPinService] Error changing master PIN:', error);
      return { success: false, error: 'Failed to change master PIN' };
    }
  }

  /**
   * Get lockout information
   */
  async getLockoutInfo(): Promise<{
    isLocked: boolean;
    lockedUntil: number | null;
    attemptsRemaining: number;
  }> {
    try {
      const attemptInfo = await this.getAttemptInfo();

      if (attemptInfo.lockedUntil && Date.now() < attemptInfo.lockedUntil) {
        return {
          isLocked: true,
          lockedUntil: attemptInfo.lockedUntil,
          attemptsRemaining: 0,
        };
      }

      // Lockout expired or no lockout
      if (attemptInfo.lockedUntil && Date.now() >= attemptInfo.lockedUntil) {
        await this.resetAttempts();
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
      logger.error('[MasterPinService] Error getting lockout info:', error);
      return { isLocked: false, lockedUntil: null, attemptsRemaining: PIN_CONFIG.maxAttempts };
    }
  }

  /**
   * Get attempt information
   */
  private async getAttemptInfo(): Promise<MasterPinAttemptInfo> {
    try {
      const infoJson = await mmkvStorage.getItem(MASTER_PIN_ATTEMPTS_KEY);
      if (infoJson) {
        return JSON.parse(infoJson);
      }
      return { attempts: 0, lockedUntil: null, lastAttemptAt: 0 };
    } catch (error) {
      return { attempts: 0, lockedUntil: null, lastAttemptAt: 0 };
    }
  }

  /**
   * Record a failed attempt
   */
  private async recordFailedAttempt(): Promise<MasterPinAttemptInfo> {
    try {
      const currentInfo = await this.getAttemptInfo();
      const now = Date.now();

      // If previous lockout expired, reset attempts
      if (currentInfo.lockedUntil && now >= currentInfo.lockedUntil) {
        currentInfo.attempts = 0;
        currentInfo.lockedUntil = null;
      }

      currentInfo.attempts += 1;
      currentInfo.lastAttemptAt = now;

      // Apply lockout if max attempts reached (longer lockouts for master PIN)
      if (currentInfo.attempts >= PIN_CONFIG.maxAttempts) {
        // Use longer lockout durations for master PIN (more security)
        const lockoutDurations = [60000, 300000, 900000, 3600000]; // 1min, 5min, 15min, 1hr
        const lockoutIndex = Math.min(
          Math.floor(currentInfo.attempts / PIN_CONFIG.maxAttempts) - 1,
          lockoutDurations.length - 1
        );
        const lockoutDuration = lockoutDurations[lockoutIndex];
        currentInfo.lockedUntil = now + lockoutDuration;
      }

      await mmkvStorage.setItem(MASTER_PIN_ATTEMPTS_KEY, JSON.stringify(currentInfo));

      return currentInfo;
    } catch (error) {
      logger.error('[MasterPinService] Error recording failed attempt:', error);
      return { attempts: 0, lockedUntil: null, lastAttemptAt: Date.now() };
    }
  }

  /**
   * Reset attempt counter
   */
  async resetAttempts(): Promise<void> {
    try {
      await mmkvStorage.removeItem(MASTER_PIN_ATTEMPTS_KEY);
    } catch (error) {
      logger.error('[MasterPinService] Error resetting attempts:', error);
    }
  }

  /**
   * Reset master PIN (admin function - requires existing master PIN or profile PIN of an admin)
   * This completely removes the master PIN and requires re-setup
   */
  async resetMasterPin(): Promise<boolean> {
    try {
      await mmkvStorage.removeItem(MASTER_PIN_KEY);
      await mmkvStorage.removeItem(MASTER_PIN_SETUP_COMPLETE_KEY);
      await this.resetAttempts();
      logger.info('[MasterPinService] Master PIN reset successfully');
      return true;
    } catch (error) {
      logger.error('[MasterPinService] Error resetting master PIN:', error);
      return false;
    }
  }
}

export const masterPinService = MasterPinService.getInstance();
export default masterPinService;
