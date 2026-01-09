/**
 * ProfileContext - Global profile state management
 * Provides profile data and operations throughout the app
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { profileService } from '../services/ProfileService';
import { pinService } from '../services/PinService';
import {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileSyncState,
  MAX_PROFILES,
  isKidsProfile as checkIsKidsProfile,
} from '../types/profile';
import { logger } from '../utils/logger';

// Context value interface
interface ProfileContextValue {
  // State
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;
  syncState: ProfileSyncState;
  isKidsMode: boolean;

  // Profile operations
  loadProfiles: () => Promise<void>;
  createProfile: (input: CreateProfileInput) => Promise<Profile | null>;
  updateProfile: (profileId: string, input: UpdateProfileInput) => Promise<Profile | null>;
  deleteProfile: (profileId: string) => Promise<boolean>;
  switchProfile: (profileId: string, pin?: string) => Promise<{
    success: boolean;
    error?: string;
    requiresPin?: boolean;
    attemptsRemaining?: number;
    lockedUntil?: number;
  }>;

  // PIN operations
  setProfilePin: (profileId: string, pin: string) => Promise<boolean>;
  removeProfilePin: (profileId: string) => Promise<boolean>;
  changeProfilePin: (profileId: string, oldPin: string, newPin: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  verifyProfilePin: (profileId: string, pin: string) => Promise<{
    success: boolean;
    attemptsRemaining?: number;
    lockedUntil?: number;
  }>;
  checkProfileHasPin: (profileId: string) => Promise<boolean>;
  getLockoutInfo: (profileId: string) => Promise<{
    isLocked: boolean;
    lockedUntil: number | null;
    attemptsRemaining: number;
  }>;

  // Utilities
  canCreateProfile: boolean;
  profileCount: number;
  getProfileById: (profileId: string) => Profile | null;
  refreshProfiles: () => Promise<void>;
}

// Create context
const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

// Provider component
export function ProfileProvider({ children }: { children: ReactNode }) {
  // State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncState, setSyncState] = useState<ProfileSyncState>({
    status: 'synced',
    lastSyncedAt: null,
    pendingChanges: 0,
  });

  // Derived state
  const isKidsMode = useMemo(() => checkIsKidsProfile(activeProfile), [activeProfile]);
  const canCreateProfile = useMemo(() => profiles.length < MAX_PROFILES, [profiles.length]);
  const profileCount = profiles.length;

  /**
   * Load profiles from storage
   */
  const loadProfiles = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get all profiles
      const allProfiles = await profileService.getProfiles();
      setProfiles(allProfiles);

      // Get active profile
      const active = await profileService.getActiveProfile();
      setActiveProfile(active);

      if (__DEV__) {
        logger.info('[ProfileContext] Loaded profiles:', allProfiles.length);
      }
    } catch (error) {
      logger.error('[ProfileContext] Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new profile
   */
  const createProfile = useCallback(async (input: CreateProfileInput): Promise<Profile | null> => {
    try {
      if (profiles.length >= MAX_PROFILES) {
        logger.warn('[ProfileContext] Cannot create profile - max limit reached');
        return null;
      }

      const newProfile = await profileService.createProfile(input);
      if (!newProfile) return null;

      // If PIN provided, set it
      if (input.pin) {
        await pinService.setPin(newProfile.id, input.pin);
        // Update profile to reflect PIN protection
        await profileService.updateProfile(newProfile.id, {});
      }

      // Reload profiles
      await loadProfiles();

      return newProfile;
    } catch (error) {
      logger.error('[ProfileContext] Error creating profile:', error);
      return null;
    }
  }, [profiles.length, loadProfiles]);

  /**
   * Update an existing profile
   */
  const updateProfile = useCallback(async (
    profileId: string,
    input: UpdateProfileInput
  ): Promise<Profile | null> => {
    try {
      const updated = await profileService.updateProfile(profileId, input);
      if (!updated) return null;

      // Reload profiles
      await loadProfiles();

      return updated;
    } catch (error) {
      logger.error('[ProfileContext] Error updating profile:', error);
      return null;
    }
  }, [loadProfiles]);

  /**
   * Delete a profile
   */
  const deleteProfile = useCallback(async (profileId: string): Promise<boolean> => {
    try {
      // Delete PIN data first
      await pinService.deleteProfilePinData(profileId);

      // Delete profile
      const success = await profileService.deleteProfile(profileId);
      if (!success) return false;

      // Reload profiles
      await loadProfiles();

      return true;
    } catch (error) {
      logger.error('[ProfileContext] Error deleting profile:', error);
      return false;
    }
  }, [loadProfiles]);

  /**
   * Switch to a different profile
   */
  const switchProfile = useCallback(async (
    profileId: string,
    pin?: string
  ): Promise<{
    success: boolean;
    error?: string;
    requiresPin?: boolean;
    attemptsRemaining?: number;
    lockedUntil?: number;
  }> => {
    try {
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Check if PIN is required
      const hasPin = await pinService.hasPin(profileId);
      if (hasPin) {
        if (!pin) {
          return { success: false, requiresPin: true };
        }

        // Check lockout first
        const lockoutInfo = await pinService.getLockoutInfo(profileId);
        if (lockoutInfo.isLocked) {
          return {
            success: false,
            error: 'Too many failed attempts',
            attemptsRemaining: 0,
            lockedUntil: lockoutInfo.lockedUntil || undefined,
          };
        }

        // Verify PIN
        const verification = await pinService.verifyPin(profileId, pin);
        if (!verification.success) {
          return {
            success: false,
            error: 'Incorrect PIN',
            attemptsRemaining: verification.attemptsRemaining,
            lockedUntil: verification.lockedUntil,
          };
        }
      }

      // Set as active profile
      const success = await profileService.setActiveProfile(profileId);
      if (!success) {
        return { success: false, error: 'Failed to switch profile' };
      }

      // Update local state
      setActiveProfile(profile);

      if (__DEV__) {
        logger.info('[ProfileContext] Switched to profile:', profile.name);
      }

      return { success: true };
    } catch (error) {
      logger.error('[ProfileContext] Error switching profile:', error);
      return { success: false, error: 'Failed to switch profile' };
    }
  }, [profiles]);

  /**
   * Set PIN for a profile
   */
  const setProfilePin = useCallback(async (profileId: string, pin: string): Promise<boolean> => {
    try {
      const success = await pinService.setPin(profileId, pin);
      if (success) {
        // Update profile to mark as PIN protected
        await profileService.updateProfile(profileId, {});
        await loadProfiles();
      }
      return success;
    } catch (error) {
      logger.error('[ProfileContext] Error setting PIN:', error);
      return false;
    }
  }, [loadProfiles]);

  /**
   * Remove PIN from a profile
   */
  const removeProfilePin = useCallback(async (profileId: string): Promise<boolean> => {
    try {
      const success = await pinService.removePin(profileId);
      if (success) {
        await loadProfiles();
      }
      return success;
    } catch (error) {
      logger.error('[ProfileContext] Error removing PIN:', error);
      return false;
    }
  }, [loadProfiles]);

  /**
   * Change PIN for a profile
   */
  const changeProfilePin = useCallback(async (
    profileId: string,
    oldPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      return await pinService.changePin(profileId, oldPin, newPin);
    } catch (error) {
      logger.error('[ProfileContext] Error changing PIN:', error);
      return { success: false, error: 'Failed to change PIN' };
    }
  }, []);

  /**
   * Verify PIN for a profile
   */
  const verifyProfilePin = useCallback(async (
    profileId: string,
    pin: string
  ): Promise<{
    success: boolean;
    attemptsRemaining?: number;
    lockedUntil?: number;
  }> => {
    try {
      return await pinService.verifyPin(profileId, pin);
    } catch (error) {
      logger.error('[ProfileContext] Error verifying PIN:', error);
      return { success: false, attemptsRemaining: 0 };
    }
  }, []);

  /**
   * Check if a profile has a PIN
   */
  const checkProfileHasPin = useCallback(async (profileId: string): Promise<boolean> => {
    try {
      return await pinService.hasPin(profileId);
    } catch (error) {
      logger.error('[ProfileContext] Error checking PIN:', error);
      return false;
    }
  }, []);

  /**
   * Get lockout information for a profile
   */
  const getLockoutInfo = useCallback(async (profileId: string): Promise<{
    isLocked: boolean;
    lockedUntil: number | null;
    attemptsRemaining: number;
  }> => {
    try {
      return await pinService.getLockoutInfo(profileId);
    } catch (error) {
      logger.error('[ProfileContext] Error getting lockout info:', error);
      return { isLocked: false, lockedUntil: null, attemptsRemaining: 3 };
    }
  }, []);

  /**
   * Get a profile by ID
   */
  const getProfileById = useCallback((profileId: string): Profile | null => {
    return profiles.find(p => p.id === profileId) || null;
  }, [profiles]);

  /**
   * Refresh profiles (alias for loadProfiles)
   */
  const refreshProfiles = useCallback(async () => {
    await loadProfiles();
  }, [loadProfiles]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Context value
  const value = useMemo<ProfileContextValue>(() => ({
    // State
    profiles,
    activeProfile,
    isLoading,
    syncState,
    isKidsMode,

    // Profile operations
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    switchProfile,

    // PIN operations
    setProfilePin,
    removeProfilePin,
    changeProfilePin,
    verifyProfilePin,
    checkProfileHasPin,
    getLockoutInfo,

    // Utilities
    canCreateProfile,
    profileCount,
    getProfileById,
    refreshProfiles,
  }), [
    profiles,
    activeProfile,
    isLoading,
    syncState,
    isKidsMode,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    switchProfile,
    setProfilePin,
    removeProfilePin,
    changeProfilePin,
    verifyProfilePin,
    checkProfileHasPin,
    getLockoutInfo,
    canCreateProfile,
    profileCount,
    getProfileById,
    refreshProfiles,
  ]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

// Custom hook to use profile context
export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

// Export context for advanced use cases
export { ProfileContext };
export default ProfileContext;
