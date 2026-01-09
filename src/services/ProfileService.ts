/**
 * ProfileService - Singleton service for profile CRUD operations
 * Handles profile creation, reading, updating, and deletion with local storage
 */

import { mmkvStorage } from './mmkvStorage';
import {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileType,
  PROFILE_STORAGE_KEYS,
  MAX_PROFILES,
  DEFAULT_PROFILE_PREFERENCES,
  DEFAULT_KIDS_PREFERENCES,
  getDefaultMaxAgeRating,
  AVATAR_OPTIONS,
} from '../types/profile';
import { logger } from '../utils/logger';

class ProfileService {
  private static instance: ProfileService;
  private profilesCache: Profile[] | null = null;
  private activeProfileIdCache: string | null = null;

  private constructor() {}

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  /**
   * Generate a unique profile ID
   */
  private generateId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all profiles
   */
  async getProfiles(): Promise<Profile[]> {
    try {
      if (this.profilesCache) {
        return this.profilesCache;
      }

      const profilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEYS.profiles);
      if (profilesJson) {
        const profiles = JSON.parse(profilesJson) as Profile[];
        this.profilesCache = profiles;
        return profiles;
      }

      // No profiles exist - return empty array
      return [];
    } catch (error) {
      logger.error('[ProfileService] Error getting profiles:', error);
      return [];
    }
  }

  /**
   * Get a single profile by ID
   */
  async getProfile(profileId: string): Promise<Profile | null> {
    try {
      const profiles = await this.getProfiles();
      return profiles.find(p => p.id === profileId) || null;
    } catch (error) {
      logger.error('[ProfileService] Error getting profile:', error);
      return null;
    }
  }

  /**
   * Get the currently active profile ID
   */
  async getActiveProfileId(): Promise<string | null> {
    try {
      if (this.activeProfileIdCache) {
        return this.activeProfileIdCache;
      }

      const activeId = await mmkvStorage.getItem(PROFILE_STORAGE_KEYS.activeProfileId);
      this.activeProfileIdCache = activeId;
      return activeId;
    } catch (error) {
      logger.error('[ProfileService] Error getting active profile ID:', error);
      return null;
    }
  }

  /**
   * Get the currently active profile
   */
  async getActiveProfile(): Promise<Profile | null> {
    try {
      const activeId = await this.getActiveProfileId();
      if (!activeId) return null;
      return await this.getProfile(activeId);
    } catch (error) {
      logger.error('[ProfileService] Error getting active profile:', error);
      return null;
    }
  }

  /**
   * Set the active profile
   */
  async setActiveProfile(profileId: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(profileId);
      if (!profile) {
        logger.warn('[ProfileService] Cannot set active profile - profile not found:', profileId);
        return false;
      }

      await mmkvStorage.setItem(PROFILE_STORAGE_KEYS.activeProfileId, profileId);
      this.activeProfileIdCache = profileId;
      return true;
    } catch (error) {
      logger.error('[ProfileService] Error setting active profile:', error);
      return false;
    }
  }

  /**
   * Create a new profile
   */
  async createProfile(input: CreateProfileInput): Promise<Profile | null> {
    try {
      const profiles = await this.getProfiles();

      // Check max profiles limit
      if (profiles.length >= MAX_PROFILES) {
        logger.warn('[ProfileService] Maximum profiles reached');
        return null;
      }

      // Validate name
      if (!input.name || input.name.trim().length === 0) {
        logger.warn('[ProfileService] Invalid profile name');
        return null;
      }

      const now = Date.now();
      const isFirstProfile = profiles.length === 0;
      const isKidsProfile = input.type === 'kids';

      const newProfile: Profile = {
        id: this.generateId(),
        name: input.name.trim(),
        type: input.type,
        avatarId: input.avatarId || AVATAR_OPTIONS[0].id,
        maxAgeRating: input.maxAgeRating || getDefaultMaxAgeRating(input.type),
        isPinProtected: !!input.pin,
        isAdmin: isFirstProfile || input.type === 'admin', // First profile is always admin
        createdAt: now,
        updatedAt: now,
        preferences: isKidsProfile ? { ...DEFAULT_KIDS_PREFERENCES } : { ...DEFAULT_PROFILE_PREFERENCES },
      };

      // Save profiles
      const updatedProfiles = [...profiles, newProfile];
      await this.saveProfiles(updatedProfiles);

      // If this is the first profile, set it as active
      if (isFirstProfile) {
        await this.setActiveProfile(newProfile.id);
      }

      return newProfile;
    } catch (error) {
      logger.error('[ProfileService] Error creating profile:', error);
      return null;
    }
  }

  /**
   * Update an existing profile
   */
  async updateProfile(profileId: string, input: UpdateProfileInput): Promise<Profile | null> {
    try {
      const profiles = await this.getProfiles();
      const profileIndex = profiles.findIndex(p => p.id === profileId);

      if (profileIndex === -1) {
        logger.warn('[ProfileService] Profile not found for update:', profileId);
        return null;
      }

      const existingProfile = profiles[profileIndex];
      const updatedProfile: Profile = {
        ...existingProfile,
        name: input.name?.trim() || existingProfile.name,
        avatarId: input.avatarId || existingProfile.avatarId,
        maxAgeRating: input.maxAgeRating || existingProfile.maxAgeRating,
        preferences: input.preferences
          ? { ...existingProfile.preferences, ...input.preferences }
          : existingProfile.preferences,
        updatedAt: Date.now(),
      };

      profiles[profileIndex] = updatedProfile;
      await this.saveProfiles(profiles);

      return updatedProfile;
    } catch (error) {
      logger.error('[ProfileService] Error updating profile:', error);
      return null;
    }
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    try {
      const profiles = await this.getProfiles();

      // Cannot delete the last profile
      if (profiles.length <= 1) {
        logger.warn('[ProfileService] Cannot delete the only profile');
        return false;
      }

      const profileToDelete = profiles.find(p => p.id === profileId);
      if (!profileToDelete) {
        logger.warn('[ProfileService] Profile not found for deletion:', profileId);
        return false;
      }

      // Filter out the deleted profile
      const updatedProfiles = profiles.filter(p => p.id !== profileId);

      // If we're deleting an admin profile, promote another profile to admin
      if (profileToDelete.isAdmin) {
        const adminExists = updatedProfiles.some(p => p.isAdmin);
        if (!adminExists && updatedProfiles.length > 0) {
          // Promote the oldest adult profile to admin
          const adultProfiles = updatedProfiles.filter(p => p.type !== 'kids');
          const profileToPromote = adultProfiles.length > 0
            ? adultProfiles.sort((a, b) => a.createdAt - b.createdAt)[0]
            : updatedProfiles.sort((a, b) => a.createdAt - b.createdAt)[0];

          const promoteIndex = updatedProfiles.findIndex(p => p.id === profileToPromote.id);
          if (promoteIndex !== -1) {
            updatedProfiles[promoteIndex] = {
              ...updatedProfiles[promoteIndex],
              isAdmin: true,
              type: 'admin',
              updatedAt: Date.now(),
            };
          }
        }
      }

      await this.saveProfiles(updatedProfiles);

      // If the deleted profile was active, switch to the first available profile
      const activeId = await this.getActiveProfileId();
      if (activeId === profileId && updatedProfiles.length > 0) {
        await this.setActiveProfile(updatedProfiles[0].id);
      }

      return true;
    } catch (error) {
      logger.error('[ProfileService] Error deleting profile:', error);
      return false;
    }
  }

  /**
   * Check if a profile name is already taken
   */
  async isNameTaken(name: string, excludeProfileId?: string): Promise<boolean> {
    try {
      const profiles = await this.getProfiles();
      const normalizedName = name.trim().toLowerCase();
      return profiles.some(
        p => p.name.toLowerCase() === normalizedName && p.id !== excludeProfileId
      );
    } catch (error) {
      logger.error('[ProfileService] Error checking name:', error);
      return false;
    }
  }

  /**
   * Get the profile count
   */
  async getProfileCount(): Promise<number> {
    const profiles = await this.getProfiles();
    return profiles.length;
  }

  /**
   * Check if more profiles can be created
   */
  async canCreateProfile(): Promise<boolean> {
    const count = await this.getProfileCount();
    return count < MAX_PROFILES;
  }

  /**
   * Initialize default profile if none exist
   */
  async initializeDefaultProfile(username?: string): Promise<Profile | null> {
    try {
      const profiles = await this.getProfiles();
      if (profiles.length > 0) {
        return profiles[0]; // Return existing first profile
      }

      // Create default admin profile
      return await this.createProfile({
        name: username || 'Main Profile',
        type: 'admin',
        avatarId: AVATAR_OPTIONS[0].id,
      });
    } catch (error) {
      logger.error('[ProfileService] Error initializing default profile:', error);
      return null;
    }
  }

  /**
   * Save profiles to storage
   */
  private async saveProfiles(profiles: Profile[]): Promise<void> {
    try {
      await mmkvStorage.setItem(PROFILE_STORAGE_KEYS.profiles, JSON.stringify(profiles));
      this.profilesCache = profiles;
    } catch (error) {
      logger.error('[ProfileService] Error saving profiles:', error);
      throw error;
    }
  }

  /**
   * Clear cache (useful for sync scenarios)
   */
  clearCache(): void {
    this.profilesCache = null;
    this.activeProfileIdCache = null;
  }

  /**
   * Get admin profiles
   */
  async getAdminProfiles(): Promise<Profile[]> {
    const profiles = await this.getProfiles();
    return profiles.filter(p => p.isAdmin);
  }

  /**
   * Check if there's at least one admin profile
   */
  async hasAdminProfile(): Promise<boolean> {
    const admins = await this.getAdminProfiles();
    return admins.length > 0;
  }
}

export const profileService = ProfileService.getInstance();
export default profileService;
