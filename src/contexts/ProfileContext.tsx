import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { mmkvStorage } from '../services/mmkvStorage';
import { logger } from '../utils/logger';

const PROFILE_STORAGE_KEY = 'user_profiles';

export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  createdAt: number;
}

interface ProfileContextProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;
  loadProfiles: () => Promise<void>;
  setActiveProfile: (profileId: string) => Promise<void>;
  getActiveProfileId: () => string | undefined;
}

const ProfileContext = createContext<ProfileContextProps | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfiles) {
        const parsedProfiles: Profile[] = JSON.parse(storedProfiles);
        setProfiles(parsedProfiles);

        // Find and set the active profile
        const active = parsedProfiles.find(p => p.isActive);
        setActiveProfileState(active || null);
      } else {
        setProfiles([]);
        setActiveProfileState(null);
      }
    } catch (error) {
      logger.error('[ProfileContext] Error loading profiles:', error);
      setProfiles([]);
      setActiveProfileState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setActiveProfile = useCallback(async (profileId: string) => {
    try {
      const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfiles) {
        const parsedProfiles: Profile[] = JSON.parse(storedProfiles);
        const updatedProfiles = parsedProfiles.map(profile => ({
          ...profile,
          isActive: profile.id === profileId
        }));

        await mmkvStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfiles));
        setProfiles(updatedProfiles);

        const newActive = updatedProfiles.find(p => p.isActive);
        setActiveProfileState(newActive || null);
      }
    } catch (error) {
      logger.error('[ProfileContext] Error setting active profile:', error);
    }
  }, []);

  const getActiveProfileId = useCallback(() => {
    return activeProfile?.id;
  }, [activeProfile]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Subscribe to storage changes for profile updates
  useEffect(() => {
    // Reload profiles when storage changes (e.g., from ProfilesScreen)
    const checkForProfileUpdates = async () => {
      const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfiles) {
        const parsedProfiles: Profile[] = JSON.parse(storedProfiles);
        const currentActive = parsedProfiles.find(p => p.isActive);

        // Only update if active profile changed
        if (currentActive?.id !== activeProfile?.id) {
          setProfiles(parsedProfiles);
          setActiveProfileState(currentActive || null);
        }
      }
    };

    // Check periodically for profile updates (every 2 seconds)
    const intervalId = setInterval(checkForProfileUpdates, 2000);

    return () => clearInterval(intervalId);
  }, [activeProfile?.id]);

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        isLoading,
        loadProfiles,
        setActiveProfile,
        getActiveProfileId,
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
 * Convenience hook to get just the active profile
 */
export function useActiveProfile() {
  const { activeProfile, isLoading } = useProfileContext();
  return { activeProfile, isLoading };
}
