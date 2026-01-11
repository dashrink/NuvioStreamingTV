/**
 * ProfileContext - Context for profile management
 * Uses ProfileService and PinService for full profile functionality
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { profileService } from '../services/ProfileService';
import { pinService } from '../services/PinService';
import { logger } from '../utils/logger';
import {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileType,
  isKidsProfile,
  MAX_PROFILES,
} from '../types/profile';

// Re-export Profile type for convenience
export type { Profile } from '../types/profile';

interface SwitchProfileResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
  lockedUntil?: number;
}

interface ProfileContextProps {
  // State
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;
  profileCount: number;
  canCreateProfile: boolean;
  isKidsMode: boolean;

  // Profile CRUD
  loadProfiles: () => Promise<void>;
  createProfile: (input: CreateProfileInput) => Promise<Profile | null>;
  updateProfile: (profileId: string, input: UpdateProfileInput) => Promise<Profile | null>;
  deleteProfile: (profileId: string) => Promise<boolean>;

  // Profile switching
  setActiveProfile: (profileId: string) => Promise<void>;
  switchProfile: (profileId: string, pin?: string) => Promise<SwitchProfileResult>;
  getActiveProfileId: () => string | undefined;

  // PIN management
  checkProfileHasPin: (profileId: string) => Promise<boolean>;
  getLockoutInfo: (profileId: string) => Promise<{
    isLocked: boolean;
    lockedUntil: number | null;
    attemptsRemaining: number;
  }>;
  setProfilePin: (profileId: string, pin: string) => Promise<boolean>;
  removeProfilePin: (profileId: string) => Promise<boolean>;

  // Admin checks
  isCurrentUserAdmin: () => boolean;
  getAdminProfiles: () => Promise<Profile[]>;
}

const ProfileContext = createContext<ProfileContextProps | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const profileCount = profiles.length;
  const canCreateProfile = profileCount < MAX_PROFILES;
  const isKidsMode = isKidsProfile(activeProfile);

  const loadProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      // Clear cache to ensure fresh data
      profileService.clearCache();

      const loadedProfiles = await profileService.getProfiles();
      setProfiles(loadedProfiles);

      // Get active profile
      const active = await profileService.getActiveProfile();
      setActiveProfileState(active);

      // Initialize default profile if none exist
      if (loadedProfiles.length === 0) {
        const defaultProfile = await profileService.initializeDefaultProfile();
        if (defaultProfile) {
          setProfiles([defaultProfile]);
          setActiveProfileState(defaultProfile);
        }
      }
    } catch (error) {
      logger.error('[ProfileContext] Error loading profiles:', error);
      setProfiles([]);
      setActiveProfileState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProfile = useCallback(
    async (input: CreateProfileInput): Promise<Profile | null> => {
      try {
        const newProfile = await profileService.createProfile(input);
        if (newProfile) {
          // Set PIN if provided
          if (input.pin) {
            await pinService.setPin(newProfile.id, input.pin);
          }
          // Reload profiles to get updated list
          await loadProfiles();
          return newProfile;
        }
        return null;
      } catch (error) {
        logger.error('[ProfileContext] Error creating profile:', error);
        return null;
      }
    },
    [loadProfiles]
  );

  const updateProfile = useCallback(
    async (profileId: string, input: UpdateProfileInput): Promise<Profile | null> => {
      try {
        const updated = await profileService.updateProfile(profileId, input);
        if (updated) {
          await loadProfiles();
          return updated;
        }
        return null;
      } catch (error) {
        logger.error('[ProfileContext] Error updating profile:', error);
        return null;
      }
    },
    [loadProfiles]
  );

  const deleteProfile = useCallback(
    async (profileId: string): Promise<boolean> => {
      try {
        const success = await profileService.deleteProfile(profileId);
        if (success) {
          // Clean up PIN data
          await pinService.deleteProfilePinData(profileId);
          await loadProfiles();
        }
        return success;
      } catch (error) {
        logger.error('[ProfileContext] Error deleting profile:', error);
        return false;
      }
    },
    [loadProfiles]
  );

  const setActiveProfile = useCallback(async (profileId: string) => {
    try {
      const success = await profileService.setActiveProfile(profileId);
      if (success) {
        const profile = await profileService.getProfile(profileId);
        setActiveProfileState(profile);
      }
    } catch (error) {
      logger.error('[ProfileContext] Error setting active profile:', error);
    }
  }, []);

  const switchProfile = useCallback(
    async (profileId: string, pin?: string): Promise<SwitchProfileResult> => {
      try {
        // Check if profile exists
        const profile = await profileService.getProfile(profileId);
        if (!profile) {
          return { success: false, error: 'Profile not found' };
        }

        // Check if PIN is required
        const hasPin = await pinService.hasPin(profileId);
        if (hasPin) {
          if (!pin) {
            return { success: false, error: 'PIN required' };
          }

          // Verify PIN
          const verification = await pinService.verifyPin(profileId, pin);
          if (!verification.success) {
            return {
              success: false,
              error: verification.lockedUntil ? 'Profile is temporarily locked' : 'Incorrect PIN',
              attemptsRemaining: verification.attemptsRemaining,
              lockedUntil: verification.lockedUntil,
            };
          }
        }

        // Switch profile
        await setActiveProfile(profileId);
        return { success: true };
      } catch (error) {
        logger.error('[ProfileContext] Error switching profile:', error);
        return { success: false, error: 'Failed to switch profile' };
      }
    },
    [setActiveProfile]
  );

  const getActiveProfileId = useCallback(() => {
    return activeProfile?.id;
  }, [activeProfile]);

  const checkProfileHasPin = useCallback(async (profileId: string): Promise<boolean> => {
    return pinService.hasPin(profileId);
  }, []);

  const getLockoutInfo = useCallback(async (profileId: string) => {
    return pinService.getLockoutInfo(profileId);
  }, []);

  const setProfilePin = useCallback(
    async (profileId: string, pin: string): Promise<boolean> => {
      const success = await pinService.setPin(profileId, pin);
      if (success) {
        // Update profile to reflect PIN protection
        await profileService.updateProfile(profileId, {});
        await loadProfiles();
      }
      return success;
    },
    [loadProfiles]
  );

  const removeProfilePin = useCallback(
    async (profileId: string): Promise<boolean> => {
      const success = await pinService.removePin(profileId);
      if (success) {
        await loadProfiles();
      }
      return success;
    },
    [loadProfiles]
  );

  const isCurrentUserAdmin = useCallback((): boolean => {
    return activeProfile?.isAdmin ?? false;
  }, [activeProfile]);

  const getAdminProfiles = useCallback(async (): Promise<Profile[]> => {
    return profileService.getAdminProfiles();
  }, []);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Subscribe to storage changes for profile updates
  useEffect(() => {
    const checkForProfileUpdates = async () => {
      try {
        const loadedProfiles = await profileService.getProfiles();
        const activeId = await profileService.getActiveProfileId();

        // Only update if profiles changed
        if (
          JSON.stringify(loadedProfiles.map(p => p.id)) !== JSON.stringify(profiles.map(p => p.id))
        ) {
          setProfiles(loadedProfiles);
        }

        // Update active profile if changed
        if (activeId !== activeProfile?.id) {
          const active = loadedProfiles.find(p => p.id === activeId);
          setActiveProfileState(active || null);
        }
      } catch (error) {
        // Silently handle polling errors
      }
    };

    // Check periodically for profile updates (every 2 seconds)
    const intervalId = setInterval(checkForProfileUpdates, 2000);
    return () => clearInterval(intervalId);
  }, [activeProfile?.id, profiles]);

  return (
    <ProfileContext.Provider
      value={{
        // State
        profiles,
        activeProfile,
        isLoading,
        profileCount,
        canCreateProfile,
        isKidsMode,

        // Profile CRUD
        loadProfiles,
        createProfile,
        updateProfile,
        deleteProfile,

        // Profile switching
        setActiveProfile,
        switchProfile,
        getActiveProfileId,

        // PIN management
        checkProfileHasPin,
        getLockoutInfo,
        setProfilePin,
        removeProfilePin,

        // Admin checks
        isCurrentUserAdmin,
        getAdminProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
}

/**
 * Alias for useProfileContext for backward compatibility
 */
export function useProfile() {
  return useProfileContext();
}

/**
 * Convenience hook to get just the active profile
 */
export function useActiveProfile() {
  const { activeProfile, isLoading } = useProfileContext();
  return { activeProfile, isLoading };
}
