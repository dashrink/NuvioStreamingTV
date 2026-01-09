I'll implement the Multi-User Profile System with Parental Controls according to the approved specification. Let me start by reading the existing files to understand the patterns used in the codebase.

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/contexts/AccountContext.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/contexts/ThemeContext.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/services/mmkvStorage.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/screens/ProfilesScreen.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/styles/colors.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/types/navigation.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "src/components/**/*.tsx",
  "path": "/home/dashrink/Desktop/NuvioStreamingTV"
}
Now I have a good understanding of the codebase patterns. Let me start implementing the Multi-User Profile System according to the approved specification.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "in_progress",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "pending",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "pending",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "pending",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "pending",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "pending",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "pending",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "pending",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "pending",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/types/profile.ts",
  "content": "/**\n * Profile Types and Interfaces\n * Multi-User Profile System with Parental Controls\n */\n\n// Age ratings supported by the content filtering system\nexport type AgeRating =\n  // Movie ratings (MPAA)\n  | 'G'\n  | 'PG'\n  | 'PG-13'\n  | 'R'\n  | 'NC-17'\n  // TV ratings (TV Parental Guidelines)\n  | 'TV-Y'\n  | 'TV-Y7'\n  | 'TV-G'\n  | 'TV-PG'\n  | 'TV-14'\n  | 'TV-MA'\n  // Unrated content\n  | 'NR'\n  | 'UNRATED';\n\n// Age rating levels for filtering (lower = more restrictive)\nexport const AGE_RATING_LEVELS: Record<AgeRating, number> = {\n  'TV-Y': 1,\n  'G': 1,\n  'TV-Y7': 2,\n  'TV-G': 2,\n  'PG': 3,\n  'TV-PG': 3,\n  'PG-13': 4,\n  'TV-14': 4,\n  'R': 5,\n  'TV-MA': 5,\n  'NC-17': 6,\n  'NR': 6,\n  'UNRATED': 6,\n};\n\n// Kids mode allowed ratings (G, PG, TV-Y, TV-Y7, TV-G, TV-PG)\nexport const KIDS_MODE_ALLOWED_RATINGS: AgeRating[] = [\n  'G', 'PG', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG'\n];\n\n// Profile type enumeration\nexport type ProfileType = 'standard' | 'kids' | 'admin';\n\n// Avatar options available for profile selection\nexport interface AvatarOption {\n  id: string;\n  name: string;\n  icon: string; // MaterialIcons icon name\n  color: string;\n}\n\n// Predefined avatar options\nexport const AVATAR_OPTIONS: AvatarOption[] = [\n  { id: 'avatar_1', name: 'Person', icon: 'person', color: '#2d9cdb' },\n  { id: 'avatar_2', name: 'Star', icon: 'star', color: '#f39c12' },\n  { id: 'avatar_3', name: 'Heart', icon: 'favorite', color: '#e74c3c' },\n  { id: 'avatar_4', name: 'Music', icon: 'music-note', color: '#9b59b6' },\n  { id: 'avatar_5', name: 'Sports', icon: 'sports-soccer', color: '#2ecc71' },\n  { id: 'avatar_6', name: 'Gaming', icon: 'sports-esports', color: '#00bcd4' },\n  { id: 'avatar_7', name: 'Pet', icon: 'pets', color: '#ff9800' },\n  { id: 'avatar_8', name: 'Nature', icon: 'eco', color: '#4caf50' },\n  { id: 'avatar_9', name: 'Space', icon: 'rocket-launch', color: '#3f51b5' },\n  { id: 'avatar_10', name: 'Art', icon: 'palette', color: '#e91e63' },\n  { id: 'avatar_11', name: 'Robot', icon: 'smart-toy', color: '#607d8b' },\n  { id: 'avatar_12', name: 'Crown', icon: 'emoji-events', color: '#ffc107' },\n];\n\n// Kids-specific avatar options with child-friendly colors\nexport const KIDS_AVATAR_OPTIONS: AvatarOption[] = [\n  { id: 'kids_1', name: 'Teddy', icon: 'child-care', color: '#ff9ff3' },\n  { id: 'kids_2', name: 'Dino', icon: 'pest-control-rodent', color: '#54a0ff' },\n  { id: 'kids_3', name: 'Bunny', icon: 'cruelty-free', color: '#ff6b6b' },\n  { id: 'kids_4', name: 'Rocket', icon: 'rocket', color: '#5f27cd' },\n  { id: 'kids_5', name: 'Star', icon: 'auto-awesome', color: '#feca57' },\n  { id: 'kids_6', name: 'Rainbow', icon: 'wb-sunny', color: '#ff9f43' },\n];\n\n// Profile interface\nexport interface Profile {\n  id: string;\n  name: string;\n  type: ProfileType;\n  avatarId: string;\n  maxAgeRating: AgeRating;\n  isPinProtected: boolean;\n  isAdmin: boolean;\n  createdAt: number;\n  updatedAt: number;\n  // Preferences per profile\n  preferences: ProfilePreferences;\n}\n\n// Profile preferences that can be customized per profile\nexport interface ProfilePreferences {\n  // UI preferences\n  autoplayEnabled: boolean;\n  autoplayNextEpisode: boolean;\n  // Content preferences (for personalization)\n  preferredGenres: string[];\n  // Language preferences\n  preferredSubtitleLanguage: string;\n  preferredAudioLanguage: string;\n}\n\n// Default preferences for new profiles\nexport const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {\n  autoplayEnabled: true,\n  autoplayNextEpisode: true,\n  preferredGenres: [],\n  preferredSubtitleLanguage: 'en',\n  preferredAudioLanguage: 'en',\n};\n\n// Default preferences for kids profiles\nexport const DEFAULT_KIDS_PREFERENCES: ProfilePreferences = {\n  autoplayEnabled: false, // Require explicit play for kids\n  autoplayNextEpisode: false,\n  preferredGenres: ['animation', 'family', 'comedy'],\n  preferredSubtitleLanguage: 'en',\n  preferredAudioLanguage: 'en',\n};\n\n// PIN-related types\nexport interface PinAttemptInfo {\n  attempts: number;\n  lockedUntil: number | null; // Timestamp when lockout expires\n  lastAttemptAt: number;\n}\n\n// PIN lockout configuration\nexport const PIN_CONFIG = {\n  maxAttempts: 3,\n  lockoutDurations: [30000, 60000, 300000], // 30s, 1min, 5min (exponential backoff)\n  pinMinLength: 4,\n  pinMaxLength: 6,\n};\n\n// Profile creation input\nexport interface CreateProfileInput {\n  name: string;\n  type: ProfileType;\n  avatarId: string;\n  maxAgeRating?: AgeRating;\n  pin?: string;\n}\n\n// Profile update input\nexport interface UpdateProfileInput {\n  name?: string;\n  avatarId?: string;\n  maxAgeRating?: AgeRating;\n  preferences?: Partial<ProfilePreferences>;\n}\n\n// Profile sync state\nexport type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';\n\nexport interface ProfileSyncState {\n  status: SyncStatus;\n  lastSyncedAt: number | null;\n  pendingChanges: number;\n  errorMessage?: string;\n}\n\n// Storage keys for profile data\nexport const PROFILE_STORAGE_KEYS = {\n  profiles: '@profiles:list',\n  activeProfileId: '@profiles:active',\n  pinHashes: '@profiles:pins', // Stored securely\n  pinAttempts: '@profiles:pin_attempts',\n  syncQueue: '@profiles:sync_queue',\n  lastSync: '@profiles:last_sync',\n};\n\n// Maximum number of profiles allowed\nexport const MAX_PROFILES = 6;\n\n// Helper function to get default max age rating based on profile type\nexport function getDefaultMaxAgeRating(type: ProfileType): AgeRating {\n  switch (type) {\n    case 'kids':\n      return 'TV-PG';\n    case 'admin':\n    case 'standard':\n    default:\n      return 'NC-17'; // No restrictions for adults\n  }\n}\n\n// Helper function to check if a rating is allowed for a profile\nexport function isRatingAllowedForProfile(\n  contentRating: AgeRating | string | undefined,\n  profile: Profile\n): boolean {\n  if (!contentRating) return true; // Allow unrated content unless it's a kids profile\n\n  const rating = contentRating as AgeRating;\n  const contentLevel = AGE_RATING_LEVELS[rating];\n  const profileMaxLevel = AGE_RATING_LEVELS[profile.maxAgeRating];\n\n  if (contentLevel === undefined) {\n    // Unknown rating - block for kids, allow for others\n    return profile.type !== 'kids';\n  }\n\n  return contentLevel <= profileMaxLevel;\n}\n\n// Helper function to check if profile is in kids mode\nexport function isKidsProfile(profile: Profile | null): boolean {\n  return profile?.type === 'kids';\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "in_progress",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "pending",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "pending",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "pending",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "pending",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "pending",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "pending",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "pending",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/services/ProfileService.ts",
  "content": "/**\n * ProfileService - Singleton service for profile CRUD operations\n * Handles profile creation, reading, updating, and deletion with local storage\n */\n\nimport { mmkvStorage } from './mmkvStorage';\nimport {\n  Profile,\n  CreateProfileInput,\n  UpdateProfileInput,\n  ProfileType,\n  PROFILE_STORAGE_KEYS,\n  MAX_PROFILES,\n  DEFAULT_PROFILE_PREFERENCES,\n  DEFAULT_KIDS_PREFERENCES,\n  getDefaultMaxAgeRating,\n  AVATAR_OPTIONS,\n} from '../types/profile';\nimport { logger } from '../utils/logger';\n\nclass ProfileService {\n  private static instance: ProfileService;\n  private profilesCache: Profile[] | null = null;\n  private activeProfileIdCache: string | null = null;\n\n  private constructor() {}\n\n  public static getInstance(): ProfileService {\n    if (!ProfileService.instance) {\n      ProfileService.instance = new ProfileService();\n    }\n    return ProfileService.instance;\n  }\n\n  /**\n   * Generate a unique profile ID\n   */\n  private generateId(): string {\n    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;\n  }\n\n  /**\n   * Get all profiles\n   */\n  async getProfiles(): Promise<Profile[]> {\n    try {\n      if (this.profilesCache) {\n        return this.profilesCache;\n      }\n\n      const profilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEYS.profiles);\n      if (profilesJson) {\n        const profiles = JSON.parse(profilesJson) as Profile[];\n        this.profilesCache = profiles;\n        return profiles;\n      }\n\n      // No profiles exist - return empty array\n      return [];\n    } catch (error) {\n      logger.error('[ProfileService] Error getting profiles:', error);\n      return [];\n    }\n  }\n\n  /**\n   * Get a single profile by ID\n   */\n  async getProfile(profileId: string): Promise<Profile | null> {\n    try {\n      const profiles = await this.getProfiles();\n      return profiles.find(p => p.id === profileId) || null;\n    } catch (error) {\n      logger.error('[ProfileService] Error getting profile:', error);\n      return null;\n    }\n  }\n\n  /**\n   * Get the currently active profile ID\n   */\n  async getActiveProfileId(): Promise<string | null> {\n    try {\n      if (this.activeProfileIdCache) {\n        return this.activeProfileIdCache;\n      }\n\n      const activeId = await mmkvStorage.getItem(PROFILE_STORAGE_KEYS.activeProfileId);\n      this.activeProfileIdCache = activeId;\n      return activeId;\n    } catch (error) {\n      logger.error('[ProfileService] Error getting active profile ID:', error);\n      return null;\n    }\n  }\n\n  /**\n   * Get the currently active profile\n   */\n  async getActiveProfile(): Promise<Profile | null> {\n    try {\n      const activeId = await this.getActiveProfileId();\n      if (!activeId) return null;\n      return await this.getProfile(activeId);\n    } catch (error) {\n      logger.error('[ProfileService] Error getting active profile:', error);\n      return null;\n    }\n  }\n\n  /**\n   * Set the active profile\n   */\n  async setActiveProfile(profileId: string): Promise<boolean> {\n    try {\n      const profile = await this.getProfile(profileId);\n      if (!profile) {\n        logger.warn('[ProfileService] Cannot set active profile - profile not found:', profileId);\n        return false;\n      }\n\n      await mmkvStorage.setItem(PROFILE_STORAGE_KEYS.activeProfileId, profileId);\n      this.activeProfileIdCache = profileId;\n      return true;\n    } catch (error) {\n      logger.error('[ProfileService] Error setting active profile:', error);\n      return false;\n    }\n  }\n\n  /**\n   * Create a new profile\n   */\n  async createProfile(input: CreateProfileInput): Promise<Profile | null> {\n    try {\n      const profiles = await this.getProfiles();\n\n      // Check max profiles limit\n      if (profiles.length >= MAX_PROFILES) {\n        logger.warn('[ProfileService] Maximum profiles reached');\n        return null;\n      }\n\n      // Validate name\n      if (!input.name || input.name.trim().length === 0) {\n        logger.warn('[ProfileService] Invalid profile name');\n        return null;\n      }\n\n      const now = Date.now();\n      const isFirstProfile = profiles.length === 0;\n      const isKidsProfile = input.type === 'kids';\n\n      const newProfile: Profile = {\n        id: this.generateId(),\n        name: input.name.trim(),\n        type: input.type,\n        avatarId: input.avatarId || AVATAR_OPTIONS[0].id,\n        maxAgeRating: input.maxAgeRating || getDefaultMaxAgeRating(input.type),\n        isPinProtected: !!input.pin,\n        isAdmin: isFirstProfile || input.type === 'admin', // First profile is always admin\n        createdAt: now,\n        updatedAt: now,\n        preferences: isKidsProfile ? { ...DEFAULT_KIDS_PREFERENCES } : { ...DEFAULT_PROFILE_PREFERENCES },\n      };\n\n      // Save profiles\n      const updatedProfiles = [...profiles, newProfile];\n      await this.saveProfiles(updatedProfiles);\n\n      // If this is the first profile, set it as active\n      if (isFirstProfile) {\n        await this.setActiveProfile(newProfile.id);\n      }\n\n      return newProfile;\n    } catch (error) {\n      logger.error('[ProfileService] Error creating profile:', error);\n      return null;\n    }\n  }\n\n  /**\n   * Update an existing profile\n   */\n  async updateProfile(profileId: string, input: UpdateProfileInput): Promise<Profile | null> {\n    try {\n      const profiles = await this.getProfiles();\n      const profileIndex = profiles.findIndex(p => p.id === profileId);\n\n      if (profileIndex === -1) {\n        logger.warn('[ProfileService] Profile not found for update:', profileId);\n        return null;\n      }\n\n      const existingProfile = profiles[profileIndex];\n      const updatedProfile: Profile = {\n        ...existingProfile,\n        name: input.name?.trim() || existingProfile.name,\n        avatarId: input.avatarId || existingProfile.avatarId,\n        maxAgeRating: input.maxAgeRating || existingProfile.maxAgeRating,\n        preferences: input.preferences\n          ? { ...existingProfile.preferences, ...input.preferences }\n          : existingProfile.preferences,\n        updatedAt: Date.now(),\n      };\n\n      profiles[profileIndex] = updatedProfile;\n      await this.saveProfiles(profiles);\n\n      return updatedProfile;\n    } catch (error) {\n      logger.error('[ProfileService] Error updating profile:', error);\n      return null;\n    }\n  }\n\n  /**\n   * Delete a profile\n   */\n  async deleteProfile(profileId: string): Promise<boolean> {\n    try {\n      const profiles = await this.getProfiles();\n\n      // Cannot delete the last profile\n      if (profiles.length <= 1) {\n        logger.warn('[ProfileService] Cannot delete the only profile');\n        return false;\n      }\n\n      const profileToDelete = profiles.find(p => p.id === profileId);\n      if (!profileToDelete) {\n        logger.warn('[ProfileService] Profile not found for deletion:', profileId);\n        return false;\n      }\n\n      // Filter out the deleted profile\n      const updatedProfiles = profiles.filter(p => p.id !== profileId);\n\n      // If we're deleting an admin profile, promote another profile to admin\n      if (profileToDelete.isAdmin) {\n        const adminExists = updatedProfiles.some(p => p.isAdmin);\n        if (!adminExists && updatedProfiles.length > 0) {\n          // Promote the oldest adult profile to admin\n          const adultProfiles = updatedProfiles.filter(p => p.type !== 'kids');\n          const profileToPromote = adultProfiles.length > 0\n            ? adultProfiles.sort((a, b) => a.createdAt - b.createdAt)[0]\n            : updatedProfiles.sort((a, b) => a.createdAt - b.createdAt)[0];\n\n          const promoteIndex = updatedProfiles.findIndex(p => p.id === profileToPromote.id);\n          if (promoteIndex !== -1) {\n            updatedProfiles[promoteIndex] = {\n              ...updatedProfiles[promoteIndex],\n              isAdmin: true,\n              type: 'admin',\n              updatedAt: Date.now(),\n            };\n          }\n        }\n      }\n\n      await this.saveProfiles(updatedProfiles);\n\n      // If the deleted profile was active, switch to the first available profile\n      const activeId = await this.getActiveProfileId();\n      if (activeId === profileId && updatedProfiles.length > 0) {\n        await this.setActiveProfile(updatedProfiles[0].id);\n      }\n\n      return true;\n    } catch (error) {\n      logger.error('[ProfileService] Error deleting profile:', error);\n      return false;\n    }\n  }\n\n  /**\n   * Check if a profile name is already taken\n   */\n  async isNameTaken(name: string, excludeProfileId?: string): Promise<boolean> {\n    try {\n      const profiles = await this.getProfiles();\n      const normalizedName = name.trim().toLowerCase();\n      return profiles.some(\n        p => p.name.toLowerCase() === normalizedName && p.id !== excludeProfileId\n      );\n    } catch (error) {\n      logger.error('[ProfileService] Error checking name:', error);\n      return false;\n    }\n  }\n\n  /**\n   * Get the profile count\n   */\n  async getProfileCount(): Promise<number> {\n    const profiles = await this.getProfiles();\n    return profiles.length;\n  }\n\n  /**\n   * Check if more profiles can be created\n   */\n  async canCreateProfile(): Promise<boolean> {\n    const count = await this.getProfileCount();\n    return count < MAX_PROFILES;\n  }\n\n  /**\n   * Initialize default profile if none exist\n   */\n  async initializeDefaultProfile(username?: string): Promise<Profile | null> {\n    try {\n      const profiles = await this.getProfiles();\n      if (profiles.length > 0) {\n        return profiles[0]; // Return existing first profile\n      }\n\n      // Create default admin profile\n      return await this.createProfile({\n        name: username || 'Main Profile',\n        type: 'admin',\n        avatarId: AVATAR_OPTIONS[0].id,\n      });\n    } catch (error) {\n      logger.error('[ProfileService] Error initializing default profile:', error);\n      return null;\n    }\n  }\n\n  /**\n   * Save profiles to storage\n   */\n  private async saveProfiles(profiles: Profile[]): Promise<void> {\n    try {\n      await mmkvStorage.setItem(PROFILE_STORAGE_KEYS.profiles, JSON.stringify(profiles));\n      this.profilesCache = profiles;\n    } catch (error) {\n      logger.error('[ProfileService] Error saving profiles:', error);\n      throw error;\n    }\n  }\n\n  /**\n   * Clear cache (useful for sync scenarios)\n   */\n  clearCache(): void {\n    this.profilesCache = null;\n    this.activeProfileIdCache = null;\n  }\n\n  /**\n   * Get admin profiles\n   */\n  async getAdminProfiles(): Promise<Profile[]> {\n    const profiles = await this.getProfiles();\n    return profiles.filter(p => p.isAdmin);\n  }\n\n  /**\n   * Check if there's at least one admin profile\n   */\n  async hasAdminProfile(): Promise<boolean> {\n    const admins = await this.getAdminProfiles();\n    return admins.length > 0;\n  }\n}\n\nexport const profileService = ProfileService.getInstance();\nexport default profileService;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "in_progress",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "pending",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "pending",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "pending",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "pending",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "pending",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "pending",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/services/PinService.ts",
  "content": "/**\n * PinService - Secure PIN storage and verification\n * Uses expo-crypto for hashing PINs before storage\n */\n\nimport * as Crypto from 'expo-crypto';\nimport { mmkvStorage } from './mmkvStorage';\nimport {\n  PinAttemptInfo,\n  PIN_CONFIG,\n  PROFILE_STORAGE_KEYS,\n} from '../types/profile';\nimport { logger } from '../utils/logger';\n\n// Storage keys for PIN data\nconst PIN_HASH_PREFIX = '@profile:pin:';\nconst PIN_ATTEMPTS_PREFIX = '@profile:pin_attempts:';\n\nclass PinService {\n  private static instance: PinService;\n\n  private constructor() {}\n\n  public static getInstance(): PinService {\n    if (!PinService.instance) {\n      PinService.instance = new PinService();\n    }\n    return PinService.instance;\n  }\n\n  /**\n   * Hash a PIN using SHA-256\n   */\n  private async hashPin(pin: string, salt: string): Promise<string> {\n    const saltedPin = `${salt}:${pin}:nuvio_profile_pin`;\n    const hash = await Crypto.digestStringAsync(\n      Crypto.CryptoDigestAlgorithm.SHA256,\n      saltedPin\n    );\n    return hash;\n  }\n\n  /**\n   * Generate a random salt for PIN hashing\n   */\n  private generateSalt(): string {\n    // Generate a random string for salt\n    return `${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;\n  }\n\n  /**\n   * Validate PIN format\n   */\n  validatePinFormat(pin: string): { valid: boolean; error?: string } {\n    if (!pin) {\n      return { valid: false, error: 'PIN is required' };\n    }\n\n    if (!/^\\d+$/.test(pin)) {\n      return { valid: false, error: 'PIN must contain only numbers' };\n    }\n\n    if (pin.length < PIN_CONFIG.pinMinLength) {\n      return { valid: false, error: `PIN must be at least ${PIN_CONFIG.pinMinLength} digits` };\n    }\n\n    if (pin.length > PIN_CONFIG.pinMaxLength) {\n      return { valid: false, error: `PIN must be at most ${PIN_CONFIG.pinMaxLength} digits` };\n    }\n\n    return { valid: true };\n  }\n\n  /**\n   * Set a PIN for a profile\n   */\n  async setPin(profileId: string, pin: string): Promise<boolean> {\n    try {\n      const validation = this.validatePinFormat(pin);\n      if (!validation.valid) {\n        logger.warn('[PinService] Invalid PIN format:', validation.error);\n        return false;\n      }\n\n      const salt = this.generateSalt();\n      const hash = await this.hashPin(pin, salt);\n\n      // Store the salt and hash together\n      const pinData = JSON.stringify({ salt, hash });\n      await mmkvStorage.setItem(`${PIN_HASH_PREFIX}${profileId}`, pinData);\n\n      // Reset attempt counter when PIN is set\n      await this.resetAttempts(profileId);\n\n      if (__DEV__) {\n        logger.info('[PinService] PIN set successfully for profile:', profileId);\n      }\n\n      return true;\n    } catch (error) {\n      logger.error('[PinService] Error setting PIN:', error);\n      return false;\n    }\n  }\n\n  /**\n   * Verify a PIN for a profile\n   */\n  async verifyPin(profileId: string, pin: string): Promise<{\n    success: boolean;\n    attemptsRemaining?: number;\n    lockedUntil?: number;\n  }> {\n    try {\n      // Check if locked out\n      const lockoutInfo = await this.getLockoutInfo(profileId);\n      if (lockoutInfo.isLocked) {\n        return {\n          success: false,\n          attemptsRemaining: 0,\n          lockedUntil: lockoutInfo.lockedUntil,\n        };\n      }\n\n      // Get stored PIN data\n      const pinDataJson = await mmkvStorage.getItem(`${PIN_HASH_PREFIX}${profileId}`);\n      if (!pinDataJson) {\n        // No PIN set - treat as success (profile not PIN protected)\n        return { success: true };\n      }\n\n      const pinData = JSON.parse(pinDataJson);\n      const { salt, hash } = pinData;\n\n      // Hash the provided PIN and compare\n      const inputHash = await this.hashPin(pin, salt);\n      const isValid = inputHash === hash;\n\n      if (isValid) {\n        // Reset attempts on success\n        await this.resetAttempts(profileId);\n        return { success: true };\n      } else {\n        // Record failed attempt\n        const attemptInfo = await this.recordFailedAttempt(profileId);\n        return {\n          success: false,\n          attemptsRemaining: Math.max(0, PIN_CONFIG.maxAttempts - attemptInfo.attempts),\n          lockedUntil: attemptInfo.lockedUntil || undefined,\n        };\n      }\n    } catch (error) {\n      logger.error('[PinService] Error verifying PIN:', error);\n      return { success: false, attemptsRemaining: 0 };\n    }\n  }\n\n  /**\n   * Check if a profile has a PIN set\n   */\n  async hasPin(profileId: string): Promise<boolean> {\n    try {\n      const pinData = await mmkvStorage.getItem(`${PIN_HASH_PREFIX}${profileId}`);\n      return !!pinData;\n    } catch (error) {\n      logger.error('[PinService] Error checking PIN existence:', error);\n      return false;\n    }\n  }\n\n  /**\n   * Remove PIN from a profile\n   */\n  async removePin(profileId: string): Promise<boolean> {\n    try {\n      await mmkvStorage.removeItem(`${PIN_HASH_PREFIX}${profileId}`);\n      await this.resetAttempts(profileId);\n      return true;\n    } catch (error) {\n      logger.error('[PinService] Error removing PIN:', error);\n      return false;\n    }\n  }\n\n  /**\n   * Change PIN for a profile (requires old PIN verification)\n   */\n  async changePin(profileId: string, oldPin: string, newPin: string): Promise<{\n    success: boolean;\n    error?: string;\n  }> {\n    try {\n      // Verify old PIN first\n      const verification = await this.verifyPin(profileId, oldPin);\n      if (!verification.success) {\n        if (verification.lockedUntil) {\n          return {\n            success: false,\n            error: `Too many attempts. Try again in ${Math.ceil((verification.lockedUntil - Date.now()) / 1000)} seconds`,\n          };\n        }\n        return {\n          success: false,\n          error: `Incorrect PIN. ${verification.attemptsRemaining} attempts remaining`,\n        };\n      }\n\n      // Validate new PIN format\n      const validation = this.validatePinFormat(newPin);\n      if (!validation.valid) {\n        return { success: false, error: validation.error };\n      }\n\n      // Set new PIN\n      const success = await this.setPin(profileId, newPin);\n      return { success, error: success ? undefined : 'Failed to set new PIN' };\n    } catch (error) {\n      logger.error('[PinService] Error changing PIN:', error);\n      return { success: false, error: 'Failed to change PIN' };\n    }\n  }\n\n  /**\n   * Get lockout information for a profile\n   */\n  async getLockoutInfo(profileId: string): Promise<{\n    isLocked: boolean;\n    lockedUntil: number | null;\n    attemptsRemaining: number;\n  }> {\n    try {\n      const attemptInfo = await this.getAttemptInfo(profileId);\n\n      if (attemptInfo.lockedUntil && Date.now() < attemptInfo.lockedUntil) {\n        return {\n          isLocked: true,\n          lockedUntil: attemptInfo.lockedUntil,\n          attemptsRemaining: 0,\n        };\n      }\n\n      // Lockout expired or no lockout\n      if (attemptInfo.lockedUntil && Date.now() >= attemptInfo.lockedUntil) {\n        // Clear the expired lockout\n        await this.resetAttempts(profileId);\n        return {\n          isLocked: false,\n          lockedUntil: null,\n          attemptsRemaining: PIN_CONFIG.maxAttempts,\n        };\n      }\n\n      return {\n        isLocked: false,\n        lockedUntil: null,\n        attemptsRemaining: Math.max(0, PIN_CONFIG.maxAttempts - attemptInfo.attempts),\n      };\n    } catch (error) {\n      logger.error('[PinService] Error getting lockout info:', error);\n      return { isLocked: false, lockedUntil: null, attemptsRemaining: PIN_CONFIG.maxAttempts };\n    }\n  }\n\n  /**\n   * Get attempt information for a profile\n   */\n  private async getAttemptInfo(profileId: string): Promise<PinAttemptInfo> {\n    try {\n      const infoJson = await mmkvStorage.getItem(`${PIN_ATTEMPTS_PREFIX}${profileId}`);\n      if (infoJson) {\n        return JSON.parse(infoJson);\n      }\n      return { attempts: 0, lockedUntil: null, lastAttemptAt: 0 };\n    } catch (error) {\n      return { attempts: 0, lockedUntil: null, lastAttemptAt: 0 };\n    }\n  }\n\n  /**\n   * Record a failed PIN attempt\n   */\n  private async recordFailedAttempt(profileId: string): Promise<PinAttemptInfo> {\n    try {\n      const currentInfo = await this.getAttemptInfo(profileId);\n      const now = Date.now();\n\n      // If previous lockout expired, reset attempts\n      if (currentInfo.lockedUntil && now >= currentInfo.lockedUntil) {\n        currentInfo.attempts = 0;\n        currentInfo.lockedUntil = null;\n      }\n\n      currentInfo.attempts += 1;\n      currentInfo.lastAttemptAt = now;\n\n      // Apply lockout if max attempts reached\n      if (currentInfo.attempts >= PIN_CONFIG.maxAttempts) {\n        // Calculate lockout duration based on consecutive lockouts\n        const lockoutIndex = Math.min(\n          Math.floor(currentInfo.attempts / PIN_CONFIG.maxAttempts) - 1,\n          PIN_CONFIG.lockoutDurations.length - 1\n        );\n        const lockoutDuration = PIN_CONFIG.lockoutDurations[lockoutIndex];\n        currentInfo.lockedUntil = now + lockoutDuration;\n      }\n\n      await mmkvStorage.setItem(\n        `${PIN_ATTEMPTS_PREFIX}${profileId}`,\n        JSON.stringify(currentInfo)\n      );\n\n      return currentInfo;\n    } catch (error) {\n      logger.error('[PinService] Error recording failed attempt:', error);\n      return { attempts: 0, lockedUntil: null, lastAttemptAt: Date.now() };\n    }\n  }\n\n  /**\n   * Reset PIN attempts for a profile\n   */\n  async resetAttempts(profileId: string): Promise<void> {\n    try {\n      await mmkvStorage.removeItem(`${PIN_ATTEMPTS_PREFIX}${profileId}`);\n    } catch (error) {\n      logger.error('[PinService] Error resetting attempts:', error);\n    }\n  }\n\n  /**\n   * Delete all PIN data for a profile (used when profile is deleted)\n   */\n  async deleteProfilePinData(profileId: string): Promise<void> {\n    try {\n      await mmkvStorage.removeItem(`${PIN_HASH_PREFIX}${profileId}`);\n      await mmkvStorage.removeItem(`${PIN_ATTEMPTS_PREFIX}${profileId}`);\n    } catch (error) {\n      logger.error('[PinService] Error deleting profile PIN data:', error);\n    }\n  }\n}\n\nexport const pinService = PinService.getInstance();\nexport default pinService;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "in_progress",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "pending",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "pending",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "pending",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "pending",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "pending",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/contexts/ProfileContext.tsx",
  "content": "/**\n * ProfileContext - Global profile state management\n * Provides profile data and operations throughout the app\n */\n\nimport React, {\n  createContext,\n  useContext,\n  useEffect,\n  useMemo,\n  useState,\n  useCallback,\n  ReactNode,\n} from 'react';\nimport { profileService } from '../services/ProfileService';\nimport { pinService } from '../services/PinService';\nimport {\n  Profile,\n  CreateProfileInput,\n  UpdateProfileInput,\n  ProfileSyncState,\n  MAX_PROFILES,\n  isKidsProfile as checkIsKidsProfile,\n} from '../types/profile';\nimport { logger } from '../utils/logger';\n\n// Context value interface\ninterface ProfileContextValue {\n  // State\n  profiles: Profile[];\n  activeProfile: Profile | null;\n  isLoading: boolean;\n  syncState: ProfileSyncState;\n  isKidsMode: boolean;\n\n  // Profile operations\n  loadProfiles: () => Promise<void>;\n  createProfile: (input: CreateProfileInput) => Promise<Profile | null>;\n  updateProfile: (profileId: string, input: UpdateProfileInput) => Promise<Profile | null>;\n  deleteProfile: (profileId: string) => Promise<boolean>;\n  switchProfile: (profileId: string, pin?: string) => Promise<{\n    success: boolean;\n    error?: string;\n    requiresPin?: boolean;\n    attemptsRemaining?: number;\n    lockedUntil?: number;\n  }>;\n\n  // PIN operations\n  setProfilePin: (profileId: string, pin: string) => Promise<boolean>;\n  removeProfilePin: (profileId: string) => Promise<boolean>;\n  changeProfilePin: (profileId: string, oldPin: string, newPin: string) => Promise<{\n    success: boolean;\n    error?: string;\n  }>;\n  verifyProfilePin: (profileId: string, pin: string) => Promise<{\n    success: boolean;\n    attemptsRemaining?: number;\n    lockedUntil?: number;\n  }>;\n  checkProfileHasPin: (profileId: string) => Promise<boolean>;\n  getLockoutInfo: (profileId: string) => Promise<{\n    isLocked: boolean;\n    lockedUntil: number | null;\n    attemptsRemaining: number;\n  }>;\n\n  // Utilities\n  canCreateProfile: boolean;\n  profileCount: number;\n  getProfileById: (profileId: string) => Profile | null;\n  refreshProfiles: () => Promise<void>;\n}\n\n// Create context\nconst ProfileContext = createContext<ProfileContextValue | undefined>(undefined);\n\n// Provider component\nexport function ProfileProvider({ children }: { children: ReactNode }) {\n  // State\n  const [profiles, setProfiles] = useState<Profile[]>([]);\n  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);\n  const [isLoading, setIsLoading] = useState(true);\n  const [syncState, setSyncState] = useState<ProfileSyncState>({\n    status: 'synced',\n    lastSyncedAt: null,\n    pendingChanges: 0,\n  });\n\n  // Derived state\n  const isKidsMode = useMemo(() => checkIsKidsProfile(activeProfile), [activeProfile]);\n  const canCreateProfile = useMemo(() => profiles.length < MAX_PROFILES, [profiles.length]);\n  const profileCount = profiles.length;\n\n  /**\n   * Load profiles from storage\n   */\n  const loadProfiles = useCallback(async () => {\n    try {\n      setIsLoading(true);\n\n      // Get all profiles\n      const allProfiles = await profileService.getProfiles();\n      setProfiles(allProfiles);\n\n      // Get active profile\n      const active = await profileService.getActiveProfile();\n      setActiveProfile(active);\n\n      if (__DEV__) {\n        logger.info('[ProfileContext] Loaded profiles:', allProfiles.length);\n      }\n    } catch (error) {\n      logger.error('[ProfileContext] Error loading profiles:', error);\n    } finally {\n      setIsLoading(false);\n    }\n  }, []);\n\n  /**\n   * Create a new profile\n   */\n  const createProfile = useCallback(async (input: CreateProfileInput): Promise<Profile | null> => {\n    try {\n      if (profiles.length >= MAX_PROFILES) {\n        logger.warn('[ProfileContext] Cannot create profile - max limit reached');\n        return null;\n      }\n\n      const newProfile = await profileService.createProfile(input);\n      if (!newProfile) return null;\n\n      // If PIN provided, set it\n      if (input.pin) {\n        await pinService.setPin(newProfile.id, input.pin);\n        // Update profile to reflect PIN protection\n        await profileService.updateProfile(newProfile.id, {});\n      }\n\n      // Reload profiles\n      await loadProfiles();\n\n      return newProfile;\n    } catch (error) {\n      logger.error('[ProfileContext] Error creating profile:', error);\n      return null;\n    }\n  }, [profiles.length, loadProfiles]);\n\n  /**\n   * Update an existing profile\n   */\n  const updateProfile = useCallback(async (\n    profileId: string,\n    input: UpdateProfileInput\n  ): Promise<Profile | null> => {\n    try {\n      const updated = await profileService.updateProfile(profileId, input);\n      if (!updated) return null;\n\n      // Reload profiles\n      await loadProfiles();\n\n      return updated;\n    } catch (error) {\n      logger.error('[ProfileContext] Error updating profile:', error);\n      return null;\n    }\n  }, [loadProfiles]);\n\n  /**\n   * Delete a profile\n   */\n  const deleteProfile = useCallback(async (profileId: string): Promise<boolean> => {\n    try {\n      // Delete PIN data first\n      await pinService.deleteProfilePinData(profileId);\n\n      // Delete profile\n      const success = await profileService.deleteProfile(profileId);\n      if (!success) return false;\n\n      // Reload profiles\n      await loadProfiles();\n\n      return true;\n    } catch (error) {\n      logger.error('[ProfileContext] Error deleting profile:', error);\n      return false;\n    }\n  }, [loadProfiles]);\n\n  /**\n   * Switch to a different profile\n   */\n  const switchProfile = useCallback(async (\n    profileId: string,\n    pin?: string\n  ): Promise<{\n    success: boolean;\n    error?: string;\n    requiresPin?: boolean;\n    attemptsRemaining?: number;\n    lockedUntil?: number;\n  }> => {\n    try {\n      const profile = profiles.find(p => p.id === profileId);\n      if (!profile) {\n        return { success: false, error: 'Profile not found' };\n      }\n\n      // Check if PIN is required\n      const hasPin = await pinService.hasPin(profileId);\n      if (hasPin) {\n        if (!pin) {\n          return { success: false, requiresPin: true };\n        }\n\n        // Check lockout first\n        const lockoutInfo = await pinService.getLockoutInfo(profileId);\n        if (lockoutInfo.isLocked) {\n          return {\n            success: false,\n            error: 'Too many failed attempts',\n            attemptsRemaining: 0,\n            lockedUntil: lockoutInfo.lockedUntil || undefined,\n          };\n        }\n\n        // Verify PIN\n        const verification = await pinService.verifyPin(profileId, pin);\n        if (!verification.success) {\n          return {\n            success: false,\n            error: 'Incorrect PIN',\n            attemptsRemaining: verification.attemptsRemaining,\n            lockedUntil: verification.lockedUntil,\n          };\n        }\n      }\n\n      // Set as active profile\n      const success = await profileService.setActiveProfile(profileId);\n      if (!success) {\n        return { success: false, error: 'Failed to switch profile' };\n      }\n\n      // Update local state\n      setActiveProfile(profile);\n\n      if (__DEV__) {\n        logger.info('[ProfileContext] Switched to profile:', profile.name);\n      }\n\n      return { success: true };\n    } catch (error) {\n      logger.error('[ProfileContext] Error switching profile:', error);\n      return { success: false, error: 'Failed to switch profile' };\n    }\n  }, [profiles]);\n\n  /**\n   * Set PIN for a profile\n   */\n  const setProfilePin = useCallback(async (profileId: string, pin: string): Promise<boolean> => {\n    try {\n      const success = await pinService.setPin(profileId, pin);\n      if (success) {\n        // Update profile to mark as PIN protected\n        await profileService.updateProfile(profileId, {});\n        await loadProfiles();\n      }\n      return success;\n    } catch (error) {\n      logger.error('[ProfileContext] Error setting PIN:', error);\n      return false;\n    }\n  }, [loadProfiles]);\n\n  /**\n   * Remove PIN from a profile\n   */\n  const removeProfilePin = useCallback(async (profileId: string): Promise<boolean> => {\n    try {\n      const success = await pinService.removePin(profileId);\n      if (success) {\n        await loadProfiles();\n      }\n      return success;\n    } catch (error) {\n      logger.error('[ProfileContext] Error removing PIN:', error);\n      return false;\n    }\n  }, [loadProfiles]);\n\n  /**\n   * Change PIN for a profile\n   */\n  const changeProfilePin = useCallback(async (\n    profileId: string,\n    oldPin: string,\n    newPin: string\n  ): Promise<{ success: boolean; error?: string }> => {\n    try {\n      return await pinService.changePin(profileId, oldPin, newPin);\n    } catch (error) {\n      logger.error('[ProfileContext] Error changing PIN:', error);\n      return { success: false, error: 'Failed to change PIN' };\n    }\n  }, []);\n\n  /**\n   * Verify PIN for a profile\n   */\n  const verifyProfilePin = useCallback(async (\n    profileId: string,\n    pin: string\n  ): Promise<{\n    success: boolean;\n    attemptsRemaining?: number;\n    lockedUntil?: number;\n  }> => {\n    try {\n      return await pinService.verifyPin(profileId, pin);\n    } catch (error) {\n      logger.error('[ProfileContext] Error verifying PIN:', error);\n      return { success: false, attemptsRemaining: 0 };\n    }\n  }, []);\n\n  /**\n   * Check if a profile has a PIN\n   */\n  const checkProfileHasPin = useCallback(async (profileId: string): Promise<boolean> => {\n    try {\n      return await pinService.hasPin(profileId);\n    } catch (error) {\n      logger.error('[ProfileContext] Error checking PIN:', error);\n      return false;\n    }\n  }, []);\n\n  /**\n   * Get lockout information for a profile\n   */\n  const getLockoutInfo = useCallback(async (profileId: string): Promise<{\n    isLocked: boolean;\n    lockedUntil: number | null;\n    attemptsRemaining: number;\n  }> => {\n    try {\n      return await pinService.getLockoutInfo(profileId);\n    } catch (error) {\n      logger.error('[ProfileContext] Error getting lockout info:', error);\n      return { isLocked: false, lockedUntil: null, attemptsRemaining: 3 };\n    }\n  }, []);\n\n  /**\n   * Get a profile by ID\n   */\n  const getProfileById = useCallback((profileId: string): Profile | null => {\n    return profiles.find(p => p.id === profileId) || null;\n  }, [profiles]);\n\n  /**\n   * Refresh profiles (alias for loadProfiles)\n   */\n  const refreshProfiles = useCallback(async () => {\n    await loadProfiles();\n  }, [loadProfiles]);\n\n  // Load profiles on mount\n  useEffect(() => {\n    loadProfiles();\n  }, [loadProfiles]);\n\n  // Context value\n  const value = useMemo<ProfileContextValue>(() => ({\n    // State\n    profiles,\n    activeProfile,\n    isLoading,\n    syncState,\n    isKidsMode,\n\n    // Profile operations\n    loadProfiles,\n    createProfile,\n    updateProfile,\n    deleteProfile,\n    switchProfile,\n\n    // PIN operations\n    setProfilePin,\n    removeProfilePin,\n    changeProfilePin,\n    verifyProfilePin,\n    checkProfileHasPin,\n    getLockoutInfo,\n\n    // Utilities\n    canCreateProfile,\n    profileCount,\n    getProfileById,\n    refreshProfiles,\n  }), [\n    profiles,\n    activeProfile,\n    isLoading,\n    syncState,\n    isKidsMode,\n    loadProfiles,\n    createProfile,\n    updateProfile,\n    deleteProfile,\n    switchProfile,\n    setProfilePin,\n    removeProfilePin,\n    changeProfilePin,\n    verifyProfilePin,\n    checkProfileHasPin,\n    getLockoutInfo,\n    canCreateProfile,\n    profileCount,\n    getProfileById,\n    refreshProfiles,\n  ]);\n\n  return (\n    <ProfileContext.Provider value={value}>\n      {children}\n    </ProfileContext.Provider>\n  );\n}\n\n// Custom hook to use profile context\nexport function useProfile(): ProfileContextValue {\n  const context = useContext(ProfileContext);\n  if (!context) {\n    throw new Error('useProfile must be used within a ProfileProvider');\n  }\n  return context;\n}\n\n// Export context for advanced use cases\nexport { ProfileContext };\nexport default ProfileContext;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "completed",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "pending",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "in_progress",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "pending",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "pending",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "pending",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Bash
Input: {
  "command": "mkdir -p /home/dashrink/Desktop/NuvioStreamingTV/src/components/profile",
  "description": "Create profile components directory"
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/components/profile/PinEntryModal.tsx",
  "content": "/**\n * PinEntryModal - Modal for entering PIN to unlock profiles\n */\n\nimport React, { useState, useEffect, useCallback, useRef } from 'react';\nimport {\n  View,\n  Text,\n  StyleSheet,\n  Modal,\n  TouchableOpacity,\n  Animated,\n  Vibration,\n  Platform,\n} from 'react-native';\nimport { MaterialIcons } from '@expo/vector-icons';\nimport { useTheme } from '../../contexts/ThemeContext';\nimport { PIN_CONFIG } from '../../types/profile';\n\ninterface PinEntryModalProps {\n  visible: boolean;\n  profileName: string;\n  onSubmit: (pin: string) => Promise<{\n    success: boolean;\n    attemptsRemaining?: number;\n    lockedUntil?: number;\n  }>;\n  onCancel: () => void;\n  lockedUntil?: number | null;\n  attemptsRemaining?: number;\n}\n\nexport const PinEntryModal: React.FC<PinEntryModalProps> = ({\n  visible,\n  profileName,\n  onSubmit,\n  onCancel,\n  lockedUntil: initialLockedUntil,\n  attemptsRemaining: initialAttempts,\n}) => {\n  const { currentTheme } = useTheme();\n  const [pin, setPin] = useState('');\n  const [isLoading, setIsLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n  const [attemptsRemaining, setAttemptsRemaining] = useState(initialAttempts ?? PIN_CONFIG.maxAttempts);\n  const [lockedUntil, setLockedUntil] = useState<number | null>(initialLockedUntil ?? null);\n  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);\n\n  const shakeAnim = useRef(new Animated.Value(0)).current;\n\n  // Reset state when modal opens\n  useEffect(() => {\n    if (visible) {\n      setPin('');\n      setError(null);\n      setAttemptsRemaining(initialAttempts ?? PIN_CONFIG.maxAttempts);\n      setLockedUntil(initialLockedUntil ?? null);\n    }\n  }, [visible, initialAttempts, initialLockedUntil]);\n\n  // Lockout countdown timer\n  useEffect(() => {\n    if (!lockedUntil) {\n      setLockoutCountdown(0);\n      return;\n    }\n\n    const updateCountdown = () => {\n      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));\n      setLockoutCountdown(remaining);\n      if (remaining === 0) {\n        setLockedUntil(null);\n        setAttemptsRemaining(PIN_CONFIG.maxAttempts);\n        setError(null);\n      }\n    };\n\n    updateCountdown();\n    const interval = setInterval(updateCountdown, 1000);\n    return () => clearInterval(interval);\n  }, [lockedUntil]);\n\n  const shake = useCallback(() => {\n    Animated.sequence([\n      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),\n      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),\n      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),\n      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),\n      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),\n    ]).start();\n\n    if (Platform.OS !== 'web') {\n      Vibration.vibrate(200);\n    }\n  }, [shakeAnim]);\n\n  const handleDigitPress = useCallback((digit: string) => {\n    if (lockedUntil || pin.length >= PIN_CONFIG.pinMaxLength) return;\n\n    const newPin = pin + digit;\n    setPin(newPin);\n    setError(null);\n\n    // Auto-submit when PIN reaches minimum length\n    if (newPin.length >= PIN_CONFIG.pinMinLength) {\n      // Small delay to show the filled dot before submitting\n      setTimeout(() => handleSubmit(newPin), 100);\n    }\n  }, [pin, lockedUntil]);\n\n  const handleBackspace = useCallback(() => {\n    if (pin.length > 0) {\n      setPin(pin.slice(0, -1));\n      setError(null);\n    }\n  }, [pin]);\n\n  const handleSubmit = useCallback(async (pinToSubmit: string) => {\n    if (isLoading || lockedUntil) return;\n\n    setIsLoading(true);\n    setError(null);\n\n    try {\n      const result = await onSubmit(pinToSubmit);\n\n      if (result.success) {\n        setPin('');\n        // Success - modal will be closed by parent\n      } else {\n        shake();\n        setPin('');\n\n        if (result.lockedUntil) {\n          setLockedUntil(result.lockedUntil);\n          setError('Too many failed attempts');\n        } else if (result.attemptsRemaining !== undefined) {\n          setAttemptsRemaining(result.attemptsRemaining);\n          setError(`Incorrect PIN. ${result.attemptsRemaining} attempts remaining`);\n        } else {\n          setError('Incorrect PIN');\n        }\n      }\n    } catch (err) {\n      setError('An error occurred');\n      shake();\n    } finally {\n      setIsLoading(false);\n    }\n  }, [isLoading, lockedUntil, onSubmit, shake]);\n\n  const renderPinDots = () => {\n    const dots = [];\n    for (let i = 0; i < PIN_CONFIG.pinMaxLength; i++) {\n      dots.push(\n        <View\n          key={i}\n          style={[\n            styles.dot,\n            {\n              backgroundColor: i < pin.length\n                ? currentTheme.colors.primary\n                : currentTheme.colors.border,\n            },\n          ]}\n        />\n      );\n    }\n    return dots;\n  };\n\n  const renderKeypad = () => {\n    const keys = [\n      ['1', '2', '3'],\n      ['4', '5', '6'],\n      ['7', '8', '9'],\n      ['', '0', 'backspace'],\n    ];\n\n    return (\n      <View style={styles.keypad}>\n        {keys.map((row, rowIndex) => (\n          <View key={rowIndex} style={styles.keypadRow}>\n            {row.map((key, keyIndex) => {\n              if (key === '') {\n                return <View key={keyIndex} style={styles.keypadButtonEmpty} />;\n              }\n\n              if (key === 'backspace') {\n                return (\n                  <TouchableOpacity\n                    key={keyIndex}\n                    style={[\n                      styles.keypadButton,\n                      { backgroundColor: currentTheme.colors.elevation2 },\n                    ]}\n                    onPress={handleBackspace}\n                    disabled={lockedUntil !== null}\n                  >\n                    <MaterialIcons\n                      name=\"backspace\"\n                      size={24}\n                      color={currentTheme.colors.text}\n                    />\n                  </TouchableOpacity>\n                );\n              }\n\n              return (\n                <TouchableOpacity\n                  key={keyIndex}\n                  style={[\n                    styles.keypadButton,\n                    { backgroundColor: currentTheme.colors.elevation2 },\n                  ]}\n                  onPress={() => handleDigitPress(key)}\n                  disabled={lockedUntil !== null}\n                >\n                  <Text style={[styles.keypadButtonText, { color: currentTheme.colors.text }]}>\n                    {key}\n                  </Text>\n                </TouchableOpacity>\n              );\n            })}\n          </View>\n        ))}\n      </View>\n    );\n  };\n\n  return (\n    <Modal\n      visible={visible}\n      transparent\n      animationType=\"fade\"\n      supportedOrientations={['portrait', 'landscape']}\n      onRequestClose={onCancel}\n    >\n      <View style={styles.overlay}>\n        <Animated.View\n          style={[\n            styles.container,\n            { backgroundColor: currentTheme.colors.darkBackground },\n            { transform: [{ translateX: shakeAnim }] },\n          ]}\n        >\n          {/* Header */}\n          <View style={styles.header}>\n            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>\n              <MaterialIcons name=\"close\" size={24} color={currentTheme.colors.text} />\n            </TouchableOpacity>\n          </View>\n\n          {/* Profile info */}\n          <View style={styles.profileInfo}>\n            <View\n              style={[\n                styles.avatarPlaceholder,\n                { backgroundColor: currentTheme.colors.primary },\n              ]}\n            >\n              <MaterialIcons name=\"lock\" size={32} color={currentTheme.colors.text} />\n            </View>\n            <Text style={[styles.profileName, { color: currentTheme.colors.text }]}>\n              {profileName}\n            </Text>\n            <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>\n              Enter PIN to access this profile\n            </Text>\n          </View>\n\n          {/* PIN dots */}\n          <View style={styles.dotsContainer}>\n            {renderPinDots()}\n          </View>\n\n          {/* Error message or lockout */}\n          {lockedUntil ? (\n            <View style={styles.errorContainer}>\n              <MaterialIcons name=\"timer\" size={20} color={currentTheme.colors.error} />\n              <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>\n                Try again in {lockoutCountdown} seconds\n              </Text>\n            </View>\n          ) : error ? (\n            <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>\n              {error}\n            </Text>\n          ) : (\n            <View style={styles.errorPlaceholder} />\n          )}\n\n          {/* Keypad */}\n          {renderKeypad()}\n        </Animated.View>\n      </View>\n    </Modal>\n  );\n};\n\nconst styles = StyleSheet.create({\n  overlay: {\n    flex: 1,\n    backgroundColor: 'rgba(0, 0, 0, 0.85)',\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  container: {\n    width: '90%',\n    maxWidth: 400,\n    borderRadius: 20,\n    padding: 24,\n    alignItems: 'center',\n  },\n  header: {\n    width: '100%',\n    flexDirection: 'row',\n    justifyContent: 'flex-end',\n  },\n  closeButton: {\n    padding: 8,\n  },\n  profileInfo: {\n    alignItems: 'center',\n    marginTop: 8,\n    marginBottom: 24,\n  },\n  avatarPlaceholder: {\n    width: 64,\n    height: 64,\n    borderRadius: 32,\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginBottom: 16,\n  },\n  profileName: {\n    fontSize: 20,\n    fontWeight: '600',\n    marginBottom: 8,\n  },\n  subtitle: {\n    fontSize: 14,\n    textAlign: 'center',\n  },\n  dotsContainer: {\n    flexDirection: 'row',\n    justifyContent: 'center',\n    marginBottom: 16,\n    gap: 12,\n  },\n  dot: {\n    width: 16,\n    height: 16,\n    borderRadius: 8,\n  },\n  errorContainer: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: 8,\n    height: 24,\n    marginBottom: 16,\n  },\n  errorText: {\n    fontSize: 14,\n    textAlign: 'center',\n    height: 24,\n    marginBottom: 16,\n  },\n  errorPlaceholder: {\n    height: 24,\n    marginBottom: 16,\n  },\n  keypad: {\n    width: '100%',\n    maxWidth: 280,\n  },\n  keypadRow: {\n    flexDirection: 'row',\n    justifyContent: 'center',\n    marginBottom: 12,\n    gap: 16,\n  },\n  keypadButton: {\n    width: 72,\n    height: 56,\n    borderRadius: 12,\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  keypadButtonEmpty: {\n    width: 72,\n    height: 56,\n  },\n  keypadButtonText: {\n    fontSize: 24,\n    fontWeight: '500',\n  },\n});\n\nexport default PinEntryModal;\n"
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/components/profile/AvatarSelector.tsx",
  "content": "/**\n * AvatarSelector - Component for selecting profile avatars\n */\n\nimport React from 'react';\nimport {\n  View,\n  Text,\n  StyleSheet,\n  TouchableOpacity,\n  ScrollView,\n} from 'react-native';\nimport { MaterialIcons } from '@expo/vector-icons';\nimport { useTheme } from '../../contexts/ThemeContext';\nimport { AVATAR_OPTIONS, KIDS_AVATAR_OPTIONS, AvatarOption } from '../../types/profile';\n\ninterface AvatarSelectorProps {\n  selectedAvatarId: string;\n  onSelect: (avatarId: string) => void;\n  isKidsProfile?: boolean;\n  columns?: number;\n}\n\nexport const AvatarSelector: React.FC<AvatarSelectorProps> = ({\n  selectedAvatarId,\n  onSelect,\n  isKidsProfile = false,\n  columns = 4,\n}) => {\n  const { currentTheme } = useTheme();\n\n  // Get available avatars based on profile type\n  const availableAvatars = isKidsProfile\n    ? [...KIDS_AVATAR_OPTIONS, ...AVATAR_OPTIONS]\n    : AVATAR_OPTIONS;\n\n  const renderAvatar = (avatar: AvatarOption) => {\n    const isSelected = avatar.id === selectedAvatarId;\n\n    return (\n      <TouchableOpacity\n        key={avatar.id}\n        style={[\n          styles.avatarItem,\n          {\n            width: `${100 / columns - 4}%`,\n            borderColor: isSelected ? currentTheme.colors.primary : 'transparent',\n            backgroundColor: isSelected\n              ? `${currentTheme.colors.primary}20`\n              : currentTheme.colors.elevation2,\n          },\n        ]}\n        onPress={() => onSelect(avatar.id)}\n        activeOpacity={0.7}\n      >\n        <View\n          style={[\n            styles.avatarCircle,\n            { backgroundColor: avatar.color },\n          ]}\n        >\n          <MaterialIcons\n            name={avatar.icon as any}\n            size={28}\n            color=\"#FFFFFF\"\n          />\n        </View>\n        <Text\n          style={[\n            styles.avatarName,\n            {\n              color: isSelected\n                ? currentTheme.colors.primary\n                : currentTheme.colors.textMuted,\n            },\n          ]}\n          numberOfLines={1}\n        >\n          {avatar.name}\n        </Text>\n        {isSelected && (\n          <View\n            style={[\n              styles.checkmark,\n              { backgroundColor: currentTheme.colors.primary },\n            ]}\n          >\n            <MaterialIcons name=\"check\" size={12} color=\"#FFFFFF\" />\n          </View>\n        )}\n      </TouchableOpacity>\n    );\n  };\n\n  return (\n    <View style={styles.container}>\n      <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>\n        Choose Avatar\n      </Text>\n      <ScrollView\n        showsVerticalScrollIndicator={false}\n        style={styles.scrollView}\n        contentContainerStyle={styles.avatarGrid}\n      >\n        {availableAvatars.map(renderAvatar)}\n      </ScrollView>\n    </View>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    marginVertical: 16,\n  },\n  label: {\n    fontSize: 13,\n    fontWeight: '600',\n    marginBottom: 12,\n    letterSpacing: 0.5,\n    textTransform: 'uppercase',\n  },\n  scrollView: {\n    maxHeight: 280,\n  },\n  avatarGrid: {\n    flexDirection: 'row',\n    flexWrap: 'wrap',\n    gap: 12,\n  },\n  avatarItem: {\n    padding: 12,\n    borderRadius: 12,\n    alignItems: 'center',\n    borderWidth: 2,\n    position: 'relative',\n  },\n  avatarCircle: {\n    width: 56,\n    height: 56,\n    borderRadius: 28,\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginBottom: 8,\n  },\n  avatarName: {\n    fontSize: 12,\n    fontWeight: '500',\n    textAlign: 'center',\n  },\n  checkmark: {\n    position: 'absolute',\n    top: 8,\n    right: 8,\n    width: 20,\n    height: 20,\n    borderRadius: 10,\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n});\n\nexport default AvatarSelector;\n"
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/components/profile/PinSetupModal.tsx",
  "content": "/**\n * PinSetupModal - Modal for setting up or changing a profile PIN\n */\n\nimport React, { useState, useCallback, useRef } from 'react';\nimport {\n  View,\n  Text,\n  StyleSheet,\n  Modal,\n  TouchableOpacity,\n  Animated,\n  Vibration,\n  Platform,\n} from 'react-native';\nimport { MaterialIcons } from '@expo/vector-icons';\nimport { useTheme } from '../../contexts/ThemeContext';\nimport { PIN_CONFIG } from '../../types/profile';\n\ntype SetupStep = 'enter' | 'confirm';\n\ninterface PinSetupModalProps {\n  visible: boolean;\n  title?: string;\n  onComplete: (pin: string) => Promise<boolean>;\n  onCancel: () => void;\n  requireCurrentPin?: boolean;\n  onVerifyCurrentPin?: (pin: string) => Promise<boolean>;\n}\n\nexport const PinSetupModal: React.FC<PinSetupModalProps> = ({\n  visible,\n  title = 'Set up PIN',\n  onComplete,\n  onCancel,\n  requireCurrentPin = false,\n  onVerifyCurrentPin,\n}) => {\n  const { currentTheme } = useTheme();\n  const [step, setStep] = useState<SetupStep>(requireCurrentPin ? 'enter' : 'enter');\n  const [currentPinVerified, setCurrentPinVerified] = useState(!requireCurrentPin);\n  const [pin, setPin] = useState('');\n  const [firstPin, setFirstPin] = useState('');\n  const [error, setError] = useState<string | null>(null);\n  const [isLoading, setIsLoading] = useState(false);\n\n  const shakeAnim = useRef(new Animated.Value(0)).current;\n\n  // Reset state when modal opens/closes\n  React.useEffect(() => {\n    if (visible) {\n      setStep(requireCurrentPin ? 'enter' : 'enter');\n      setCurrentPinVerified(!requireCurrentPin);\n      setPin('');\n      setFirstPin('');\n      setError(null);\n    }\n  }, [visible, requireCurrentPin]);\n\n  const shake = useCallback(() => {\n    Animated.sequence([\n      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),\n      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),\n      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),\n      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),\n      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),\n    ]).start();\n\n    if (Platform.OS !== 'web') {\n      Vibration.vibrate(200);\n    }\n  }, [shakeAnim]);\n\n  const handleDigitPress = useCallback((digit: string) => {\n    if (pin.length >= PIN_CONFIG.pinMaxLength) return;\n\n    const newPin = pin + digit;\n    setPin(newPin);\n    setError(null);\n\n    // Auto-proceed when PIN reaches required length\n    if (newPin.length >= PIN_CONFIG.pinMinLength) {\n      setTimeout(() => handlePinComplete(newPin), 100);\n    }\n  }, [pin]);\n\n  const handleBackspace = useCallback(() => {\n    if (pin.length > 0) {\n      setPin(pin.slice(0, -1));\n      setError(null);\n    }\n  }, [pin]);\n\n  const handlePinComplete = useCallback(async (completedPin: string) => {\n    if (isLoading) return;\n\n    setIsLoading(true);\n\n    try {\n      // If requiring current PIN verification\n      if (requireCurrentPin && !currentPinVerified && onVerifyCurrentPin) {\n        const verified = await onVerifyCurrentPin(completedPin);\n        if (verified) {\n          setCurrentPinVerified(true);\n          setPin('');\n          setStep('enter');\n        } else {\n          shake();\n          setPin('');\n          setError('Incorrect current PIN');\n        }\n        setIsLoading(false);\n        return;\n      }\n\n      // Step 1: Enter new PIN\n      if (step === 'enter') {\n        setFirstPin(completedPin);\n        setPin('');\n        setStep('confirm');\n        setIsLoading(false);\n        return;\n      }\n\n      // Step 2: Confirm PIN\n      if (step === 'confirm') {\n        if (completedPin !== firstPin) {\n          shake();\n          setPin('');\n          setError('PINs do not match');\n          setStep('enter');\n          setFirstPin('');\n          setIsLoading(false);\n          return;\n        }\n\n        // PINs match - complete setup\n        const success = await onComplete(completedPin);\n        if (!success) {\n          shake();\n          setPin('');\n          setError('Failed to set PIN');\n          setStep('enter');\n          setFirstPin('');\n        }\n        // If successful, parent will close modal\n      }\n    } catch (err) {\n      shake();\n      setError('An error occurred');\n      setPin('');\n    } finally {\n      setIsLoading(false);\n    }\n  }, [isLoading, requireCurrentPin, currentPinVerified, onVerifyCurrentPin, step, firstPin, onComplete, shake]);\n\n  const getTitle = () => {\n    if (requireCurrentPin && !currentPinVerified) {\n      return 'Enter Current PIN';\n    }\n    return title;\n  };\n\n  const getSubtitle = () => {\n    if (requireCurrentPin && !currentPinVerified) {\n      return 'Enter your current PIN to continue';\n    }\n    if (step === 'enter') {\n      return `Enter a ${PIN_CONFIG.pinMinLength}-${PIN_CONFIG.pinMaxLength} digit PIN`;\n    }\n    return 'Confirm your PIN';\n  };\n\n  const renderPinDots = () => {\n    const dots = [];\n    for (let i = 0; i < PIN_CONFIG.pinMaxLength; i++) {\n      dots.push(\n        <View\n          key={i}\n          style={[\n            styles.dot,\n            {\n              backgroundColor: i < pin.length\n                ? currentTheme.colors.primary\n                : currentTheme.colors.border,\n            },\n          ]}\n        />\n      );\n    }\n    return dots;\n  };\n\n  const renderKeypad = () => {\n    const keys = [\n      ['1', '2', '3'],\n      ['4', '5', '6'],\n      ['7', '8', '9'],\n      ['', '0', 'backspace'],\n    ];\n\n    return (\n      <View style={styles.keypad}>\n        {keys.map((row, rowIndex) => (\n          <View key={rowIndex} style={styles.keypadRow}>\n            {row.map((key, keyIndex) => {\n              if (key === '') {\n                return <View key={keyIndex} style={styles.keypadButtonEmpty} />;\n              }\n\n              if (key === 'backspace') {\n                return (\n                  <TouchableOpacity\n                    key={keyIndex}\n                    style={[\n                      styles.keypadButton,\n                      { backgroundColor: currentTheme.colors.elevation2 },\n                    ]}\n                    onPress={handleBackspace}\n                  >\n                    <MaterialIcons\n                      name=\"backspace\"\n                      size={24}\n                      color={currentTheme.colors.text}\n                    />\n                  </TouchableOpacity>\n                );\n              }\n\n              return (\n                <TouchableOpacity\n                  key={keyIndex}\n                  style={[\n                    styles.keypadButton,\n                    { backgroundColor: currentTheme.colors.elevation2 },\n                  ]}\n                  onPress={() => handleDigitPress(key)}\n                >\n                  <Text style={[styles.keypadButtonText, { color: currentTheme.colors.text }]}>\n                    {key}\n                  </Text>\n                </TouchableOpacity>\n              );\n            })}\n          </View>\n        ))}\n      </View>\n    );\n  };\n\n  return (\n    <Modal\n      visible={visible}\n      transparent\n      animationType=\"fade\"\n      supportedOrientations={['portrait', 'landscape']}\n      onRequestClose={onCancel}\n    >\n      <View style={styles.overlay}>\n        <Animated.View\n          style={[\n            styles.container,\n            { backgroundColor: currentTheme.colors.darkBackground },\n            { transform: [{ translateX: shakeAnim }] },\n          ]}\n        >\n          {/* Header */}\n          <View style={styles.header}>\n            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>\n              <MaterialIcons name=\"close\" size={24} color={currentTheme.colors.text} />\n            </TouchableOpacity>\n          </View>\n\n          {/* Title and subtitle */}\n          <View style={styles.titleContainer}>\n            <View\n              style={[\n                styles.iconCircle,\n                { backgroundColor: currentTheme.colors.primary },\n              ]}\n            >\n              <MaterialIcons\n                name={step === 'confirm' ? 'check' : 'lock'}\n                size={28}\n                color=\"#FFFFFF\"\n              />\n            </View>\n            <Text style={[styles.title, { color: currentTheme.colors.text }]}>\n              {getTitle()}\n            </Text>\n            <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>\n              {getSubtitle()}\n            </Text>\n          </View>\n\n          {/* Step indicator */}\n          {!requireCurrentPin || currentPinVerified ? (\n            <View style={styles.stepIndicator}>\n              <View\n                style={[\n                  styles.stepDot,\n                  {\n                    backgroundColor: step === 'enter' || step === 'confirm'\n                      ? currentTheme.colors.primary\n                      : currentTheme.colors.border,\n                  },\n                ]}\n              />\n              <View\n                style={[\n                  styles.stepLine,\n                  {\n                    backgroundColor: step === 'confirm'\n                      ? currentTheme.colors.primary\n                      : currentTheme.colors.border,\n                  },\n                ]}\n              />\n              <View\n                style={[\n                  styles.stepDot,\n                  {\n                    backgroundColor: step === 'confirm'\n                      ? currentTheme.colors.primary\n                      : currentTheme.colors.border,\n                  },\n                ]}\n              />\n            </View>\n          ) : null}\n\n          {/* PIN dots */}\n          <View style={styles.dotsContainer}>\n            {renderPinDots()}\n          </View>\n\n          {/* Error message */}\n          {error ? (\n            <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>\n              {error}\n            </Text>\n          ) : (\n            <View style={styles.errorPlaceholder} />\n          )}\n\n          {/* Keypad */}\n          {renderKeypad()}\n        </Animated.View>\n      </View>\n    </Modal>\n  );\n};\n\nconst styles = StyleSheet.create({\n  overlay: {\n    flex: 1,\n    backgroundColor: 'rgba(0, 0, 0, 0.85)',\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  container: {\n    width: '90%',\n    maxWidth: 400,\n    borderRadius: 20,\n    padding: 24,\n    alignItems: 'center',\n  },\n  header: {\n    width: '100%',\n    flexDirection: 'row',\n    justifyContent: 'flex-end',\n  },\n  closeButton: {\n    padding: 8,\n  },\n  titleContainer: {\n    alignItems: 'center',\n    marginTop: 8,\n    marginBottom: 20,\n  },\n  iconCircle: {\n    width: 64,\n    height: 64,\n    borderRadius: 32,\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginBottom: 16,\n  },\n  title: {\n    fontSize: 20,\n    fontWeight: '600',\n    marginBottom: 8,\n  },\n  subtitle: {\n    fontSize: 14,\n    textAlign: 'center',\n  },\n  stepIndicator: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    marginBottom: 20,\n  },\n  stepDot: {\n    width: 10,\n    height: 10,\n    borderRadius: 5,\n  },\n  stepLine: {\n    width: 40,\n    height: 2,\n    marginHorizontal: 8,\n  },\n  dotsContainer: {\n    flexDirection: 'row',\n    justifyContent: 'center',\n    marginBottom: 16,\n    gap: 12,\n  },\n  dot: {\n    width: 16,\n    height: 16,\n    borderRadius: 8,\n  },\n  errorText: {\n    fontSize: 14,\n    textAlign: 'center',\n    height: 24,\n    marginBottom: 16,\n  },\n  errorPlaceholder: {\n    height: 24,\n    marginBottom: 16,\n  },\n  keypad: {\n    width: '100%',\n    maxWidth: 280,\n  },\n  keypadRow: {\n    flexDirection: 'row',\n    justifyContent: 'center',\n    marginBottom: 12,\n    gap: 16,\n  },\n  keypadButton: {\n    width: 72,\n    height: 56,\n    borderRadius: 12,\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  keypadButtonEmpty: {\n    width: 72,\n    height: 56,\n  },\n  keypadButtonText: {\n    fontSize: 24,\n    fontWeight: '500',\n  },\n});\n\nexport default PinSetupModal;\n"
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/components/profile/ProfileEditModal.tsx",
  "content": "/**\n * ProfileEditModal - Modal for creating and editing profiles\n */\n\nimport React, { useState, useEffect } from 'react';\nimport {\n  View,\n  Text,\n  StyleSheet,\n  Modal,\n  TouchableOpacity,\n  TextInput,\n  ScrollView,\n  Switch,\n} from 'react-native';\nimport { MaterialIcons } from '@expo/vector-icons';\nimport { useTheme } from '../../contexts/ThemeContext';\nimport { AvatarSelector } from './AvatarSelector';\nimport {\n  ProfileType,\n  AgeRating,\n  AVATAR_OPTIONS,\n  AGE_RATING_LEVELS,\n  CreateProfileInput,\n  UpdateProfileInput,\n  Profile,\n  MAX_PROFILES,\n} from '../../types/profile';\n\ninterface ProfileEditModalProps {\n  visible: boolean;\n  mode: 'create' | 'edit';\n  profile?: Profile | null;\n  currentProfileCount: number;\n  onSave: (data: CreateProfileInput | UpdateProfileInput) => Promise<boolean>;\n  onCancel: () => void;\n  onSetupPin?: () => void;\n  onRemovePin?: () => void;\n}\n\n// Available age ratings for selection\nconst AGE_RATING_OPTIONS: { value: AgeRating; label: string; description: string }[] = [\n  { value: 'TV-Y', label: 'TV-Y / G', description: 'All ages' },\n  { value: 'TV-PG', label: 'TV-PG / PG', description: 'Parental guidance' },\n  { value: 'TV-14', label: 'TV-14 / PG-13', description: 'Parents strongly cautioned' },\n  { value: 'TV-MA', label: 'TV-MA / R', description: 'Mature audiences' },\n  { value: 'NC-17', label: 'NC-17', description: 'Adults only (no restrictions)' },\n];\n\nexport const ProfileEditModal: React.FC<ProfileEditModalProps> = ({\n  visible,\n  mode,\n  profile,\n  currentProfileCount,\n  onSave,\n  onCancel,\n  onSetupPin,\n  onRemovePin,\n}) => {\n  const { currentTheme } = useTheme();\n  const [name, setName] = useState('');\n  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0].id);\n  const [profileType, setProfileType] = useState<ProfileType>('standard');\n  const [maxAgeRating, setMaxAgeRating] = useState<AgeRating>('NC-17');\n  const [isLoading, setIsLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n\n  // Initialize form when modal opens or profile changes\n  useEffect(() => {\n    if (visible) {\n      if (mode === 'edit' && profile) {\n        setName(profile.name);\n        setAvatarId(profile.avatarId);\n        setProfileType(profile.type);\n        setMaxAgeRating(profile.maxAgeRating);\n      } else {\n        setName('');\n        setAvatarId(AVATAR_OPTIONS[0].id);\n        setProfileType('standard');\n        setMaxAgeRating('NC-17');\n      }\n      setError(null);\n    }\n  }, [visible, mode, profile]);\n\n  const handleSave = async () => {\n    if (!name.trim()) {\n      setError('Please enter a profile name');\n      return;\n    }\n\n    if (mode === 'create' && currentProfileCount >= MAX_PROFILES) {\n      setError(`Maximum profiles reached (${MAX_PROFILES}/${MAX_PROFILES})`);\n      return;\n    }\n\n    setIsLoading(true);\n    setError(null);\n\n    try {\n      let data: CreateProfileInput | UpdateProfileInput;\n\n      if (mode === 'create') {\n        data = {\n          name: name.trim(),\n          type: profileType,\n          avatarId,\n          maxAgeRating: profileType === 'kids' ? 'TV-PG' : maxAgeRating,\n        } as CreateProfileInput;\n      } else {\n        data = {\n          name: name.trim(),\n          avatarId,\n          maxAgeRating: profileType === 'kids' ? 'TV-PG' : maxAgeRating,\n        } as UpdateProfileInput;\n      }\n\n      const success = await onSave(data);\n      if (!success) {\n        setError('Failed to save profile');\n      }\n    } catch (err) {\n      setError('An error occurred');\n    } finally {\n      setIsLoading(false);\n    }\n  };\n\n  const handleProfileTypeChange = (type: ProfileType) => {\n    setProfileType(type);\n    // Automatically set appropriate age rating for kids profiles\n    if (type === 'kids') {\n      setMaxAgeRating('TV-PG');\n    }\n  };\n\n  const isKidsProfile = profileType === 'kids';\n\n  return (\n    <Modal\n      visible={visible}\n      transparent\n      animationType=\"slide\"\n      supportedOrientations={['portrait', 'landscape']}\n      onRequestClose={onCancel}\n    >\n      <View style={styles.overlay}>\n        <View\n          style={[\n            styles.container,\n            { backgroundColor: currentTheme.colors.darkBackground },\n          ]}\n        >\n          {/* Header */}\n          <View style={styles.header}>\n            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>\n              <MaterialIcons name=\"close\" size={24} color={currentTheme.colors.text} />\n            </TouchableOpacity>\n            <Text style={[styles.title, { color: currentTheme.colors.text }]}>\n              {mode === 'create' ? 'Create Profile' : 'Edit Profile'}\n            </Text>\n            <TouchableOpacity\n              onPress={handleSave}\n              style={[\n                styles.saveButton,\n                { backgroundColor: currentTheme.colors.primary },\n              ]}\n              disabled={isLoading}\n            >\n              <Text style={styles.saveButtonText}>\n                {isLoading ? 'Saving...' : 'Save'}\n              </Text>\n            </TouchableOpacity>\n          </View>\n\n          <ScrollView\n            style={styles.content}\n            showsVerticalScrollIndicator={false}\n            contentContainerStyle={styles.contentContainer}\n          >\n            {/* Error message */}\n            {error && (\n              <View\n                style={[\n                  styles.errorBanner,\n                  { backgroundColor: `${currentTheme.colors.error}20` },\n                ]}\n              >\n                <MaterialIcons name=\"error\" size={20} color={currentTheme.colors.error} />\n                <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>\n                  {error}\n                </Text>\n              </View>\n            )}\n\n            {/* Profile Name */}\n            <View style={styles.section}>\n              <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>\n                Profile Name\n              </Text>\n              <TextInput\n                style={[\n                  styles.input,\n                  {\n                    backgroundColor: currentTheme.colors.elevation2,\n                    color: currentTheme.colors.text,\n                    borderColor: currentTheme.colors.border,\n                  },\n                ]}\n                placeholder=\"Enter name\"\n                placeholderTextColor={currentTheme.colors.textMuted}\n                value={name}\n                onChangeText={setName}\n                maxLength={20}\n                autoFocus={mode === 'create'}\n              />\n            </View>\n\n            {/* Profile Type (only for create mode) */}\n            {mode === 'create' && (\n              <View style={styles.section}>\n                <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>\n                  Profile Type\n                </Text>\n                <View style={styles.typeSelector}>\n                  <TouchableOpacity\n                    style={[\n                      styles.typeOption,\n                      {\n                        backgroundColor: profileType === 'standard'\n                          ? currentTheme.colors.primary\n                          : currentTheme.colors.elevation2,\n                        borderColor: profileType === 'standard'\n                          ? currentTheme.colors.primary\n                          : currentTheme.colors.border,\n                      },\n                    ]}\n                    onPress={() => handleProfileTypeChange('standard')}\n                  >\n                    <MaterialIcons\n                      name=\"person\"\n                      size={24}\n                      color={profileType === 'standard' ? '#FFF' : currentTheme.colors.text}\n                    />\n                    <Text\n                      style={[\n                        styles.typeLabel,\n                        {\n                          color: profileType === 'standard'\n                            ? '#FFF'\n                            : currentTheme.colors.text,\n                        },\n                      ]}\n                    >\n                      Standard\n                    </Text>\n                  </TouchableOpacity>\n                  <TouchableOpacity\n                    style={[\n                      styles.typeOption,\n                      {\n                        backgroundColor: profileType === 'kids'\n                          ? '#FF6B6B'\n                          : currentTheme.colors.elevation2,\n                        borderColor: profileType === 'kids'\n                          ? '#FF6B6B'\n                          : currentTheme.colors.border,\n                      },\n                    ]}\n                    onPress={() => handleProfileTypeChange('kids')}\n                  >\n                    <MaterialIcons\n                      name=\"child-care\"\n                      size={24}\n                      color={profileType === 'kids' ? '#FFF' : currentTheme.colors.text}\n                    />\n                    <Text\n                      style={[\n                        styles.typeLabel,\n                        {\n                          color: profileType === 'kids'\n                            ? '#FFF'\n                            : currentTheme.colors.text,\n                        },\n                      ]}\n                    >\n                      Kids\n                    </Text>\n                  </TouchableOpacity>\n                </View>\n                {isKidsProfile && (\n                  <Text style={[styles.hint, { color: currentTheme.colors.textMuted }]}>\n                    Kids profiles only show age-appropriate content (G, PG, TV-Y, TV-Y7, TV-G, TV-PG)\n                  </Text>\n                )}\n              </View>\n            )}\n\n            {/* Avatar Selector */}\n            <AvatarSelector\n              selectedAvatarId={avatarId}\n              onSelect={setAvatarId}\n              isKidsProfile={isKidsProfile}\n            />\n\n            {/* Age Rating (not for kids profiles) */}\n            {!isKidsProfile && (\n              <View style={styles.section}>\n                <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>\n                  Content Rating Limit\n                </Text>\n                <View style={styles.ratingOptions}>\n                  {AGE_RATING_OPTIONS.map((option) => (\n                    <TouchableOpacity\n                      key={option.value}\n                      style={[\n                        styles.ratingOption,\n                        {\n                          backgroundColor: maxAgeRating === option.value\n                            ? `${currentTheme.colors.primary}20`\n                            : currentTheme.colors.elevation2,\n                          borderColor: maxAgeRating === option.value\n                            ? currentTheme.colors.primary\n                            : currentTheme.colors.border,\n                        },\n                      ]}\n                      onPress={() => setMaxAgeRating(option.value)}\n                    >\n                      <View style={styles.ratingOptionContent}>\n                        <Text\n                          style={[\n                            styles.ratingLabel,\n                            {\n                              color: maxAgeRating === option.value\n                                ? currentTheme.colors.primary\n                                : currentTheme.colors.text,\n                            },\n                          ]}\n                        >\n                          {option.label}\n                        </Text>\n                        <Text\n                          style={[\n                            styles.ratingDescription,\n                            { color: currentTheme.colors.textMuted },\n                          ]}\n                        >\n                          {option.description}\n                        </Text>\n                      </View>\n                      {maxAgeRating === option.value && (\n                        <MaterialIcons\n                          name=\"check-circle\"\n                          size={20}\n                          color={currentTheme.colors.primary}\n                        />\n                      )}\n                    </TouchableOpacity>\n                  ))}\n                </View>\n              </View>\n            )}\n\n            {/* PIN Settings (only for edit mode and non-kids profiles) */}\n            {mode === 'edit' && profile && !isKidsProfile && (\n              <View style={styles.section}>\n                <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>\n                  PIN Protection\n                </Text>\n                <View\n                  style={[\n                    styles.pinSection,\n                    {\n                      backgroundColor: currentTheme.colors.elevation2,\n                      borderColor: currentTheme.colors.border,\n                    },\n                  ]}\n                >\n                  <View style={styles.pinInfo}>\n                    <MaterialIcons\n                      name=\"lock\"\n                      size={24}\n                      color={profile.isPinProtected ? currentTheme.colors.primary : currentTheme.colors.textMuted}\n                    />\n                    <View style={styles.pinTextContainer}>\n                      <Text style={[styles.pinTitle, { color: currentTheme.colors.text }]}>\n                        Profile PIN\n                      </Text>\n                      <Text style={[styles.pinDescription, { color: currentTheme.colors.textMuted }]}>\n                        {profile.isPinProtected\n                          ? 'This profile is PIN protected'\n                          : 'Add a PIN to lock this profile'}\n                      </Text>\n                    </View>\n                  </View>\n                  <TouchableOpacity\n                    style={[\n                      styles.pinButton,\n                      {\n                        backgroundColor: profile.isPinProtected\n                          ? currentTheme.colors.error\n                          : currentTheme.colors.primary,\n                      },\n                    ]}\n                    onPress={profile.isPinProtected ? onRemovePin : onSetupPin}\n                  >\n                    <Text style={styles.pinButtonText}>\n                      {profile.isPinProtected ? 'Remove' : 'Set PIN'}\n                    </Text>\n                  </TouchableOpacity>\n                </View>\n              </View>\n            )}\n          </ScrollView>\n        </View>\n      </View>\n    </Modal>\n  );\n};\n\nconst styles = StyleSheet.create({\n  overlay: {\n    flex: 1,\n    backgroundColor: 'rgba(0, 0, 0, 0.7)',\n    justifyContent: 'flex-end',\n  },\n  container: {\n    borderTopLeftRadius: 20,\n    borderTopRightRadius: 20,\n    maxHeight: '90%',\n  },\n  header: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    justifyContent: 'space-between',\n    padding: 16,\n    borderBottomWidth: 1,\n    borderBottomColor: 'rgba(255, 255, 255, 0.1)',\n  },\n  closeButton: {\n    padding: 8,\n  },\n  title: {\n    fontSize: 18,\n    fontWeight: '600',\n  },\n  saveButton: {\n    paddingHorizontal: 20,\n    paddingVertical: 8,\n    borderRadius: 20,\n  },\n  saveButtonText: {\n    color: '#FFF',\n    fontSize: 14,\n    fontWeight: '600',\n  },\n  content: {\n    flex: 1,\n  },\n  contentContainer: {\n    padding: 20,\n    paddingBottom: 40,\n  },\n  errorBanner: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    padding: 12,\n    borderRadius: 8,\n    marginBottom: 20,\n    gap: 8,\n  },\n  errorText: {\n    fontSize: 14,\n    flex: 1,\n  },\n  section: {\n    marginBottom: 24,\n  },\n  label: {\n    fontSize: 13,\n    fontWeight: '600',\n    marginBottom: 12,\n    letterSpacing: 0.5,\n    textTransform: 'uppercase',\n  },\n  input: {\n    height: 50,\n    borderRadius: 12,\n    paddingHorizontal: 16,\n    fontSize: 16,\n    borderWidth: 1,\n  },\n  typeSelector: {\n    flexDirection: 'row',\n    gap: 12,\n  },\n  typeOption: {\n    flex: 1,\n    flexDirection: 'row',\n    alignItems: 'center',\n    justifyContent: 'center',\n    padding: 16,\n    borderRadius: 12,\n    borderWidth: 1,\n    gap: 8,\n  },\n  typeLabel: {\n    fontSize: 16,\n    fontWeight: '500',\n  },\n  hint: {\n    fontSize: 12,\n    marginTop: 8,\n    fontStyle: 'italic',\n  },\n  ratingOptions: {\n    gap: 8,\n  },\n  ratingOption: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    padding: 16,\n    borderRadius: 12,\n    borderWidth: 1,\n  },\n  ratingOptionContent: {\n    flex: 1,\n  },\n  ratingLabel: {\n    fontSize: 15,\n    fontWeight: '500',\n    marginBottom: 2,\n  },\n  ratingDescription: {\n    fontSize: 12,\n  },\n  pinSection: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    justifyContent: 'space-between',\n    padding: 16,\n    borderRadius: 12,\n    borderWidth: 1,\n  },\n  pinInfo: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    flex: 1,\n    gap: 12,\n  },\n  pinTextContainer: {\n    flex: 1,\n  },\n  pinTitle: {\n    fontSize: 15,\n    fontWeight: '500',\n    marginBottom: 2,\n  },\n  pinDescription: {\n    fontSize: 12,\n  },\n  pinButton: {\n    paddingHorizontal: 16,\n    paddingVertical: 8,\n    borderRadius: 20,\n  },\n  pinButtonText: {\n    color: '#FFF',\n    fontSize: 13,\n    fontWeight: '600',\n  },\n});\n\nexport default ProfileEditModal;\n"
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/components/profile/ProfileCard.tsx",
  "content": "/**\n * ProfileCard - Card component for displaying a profile in the selector\n */\n\nimport React from 'react';\nimport {\n  View,\n  Text,\n  StyleSheet,\n  TouchableOpacity,\n} from 'react-native';\nimport { MaterialIcons } from '@expo/vector-icons';\nimport { useTheme } from '../../contexts/ThemeContext';\nimport {\n  Profile,\n  AVATAR_OPTIONS,\n  KIDS_AVATAR_OPTIONS,\n  AvatarOption,\n} from '../../types/profile';\n\ninterface ProfileCardProps {\n  profile: Profile;\n  isActive?: boolean;\n  isEditMode?: boolean;\n  onPress: () => void;\n  onEdit?: () => void;\n  onDelete?: () => void;\n}\n\nexport const ProfileCard: React.FC<ProfileCardProps> = ({\n  profile,\n  isActive = false,\n  isEditMode = false,\n  onPress,\n  onEdit,\n  onDelete,\n}) => {\n  const { currentTheme } = useTheme();\n\n  // Find avatar\n  const allAvatars = [...AVATAR_OPTIONS, ...KIDS_AVATAR_OPTIONS];\n  const avatar: AvatarOption = allAvatars.find(a => a.id === profile.avatarId) || AVATAR_OPTIONS[0];\n\n  const isKidsProfile = profile.type === 'kids';\n\n  return (\n    <View style={styles.container}>\n      <TouchableOpacity\n        style={[\n          styles.card,\n          {\n            backgroundColor: isActive\n              ? `${currentTheme.colors.primary}20`\n              : currentTheme.colors.elevation2,\n            borderColor: isActive\n              ? currentTheme.colors.primary\n              : isKidsProfile\n                ? '#FF6B6B50'\n                : 'transparent',\n          },\n        ]}\n        onPress={isEditMode ? onEdit : onPress}\n        activeOpacity={0.7}\n      >\n        {/* Edit mode overlay */}\n        {isEditMode && (\n          <View style={styles.editOverlay}>\n            <View\n              style={[\n                styles.editIcon,\n                { backgroundColor: currentTheme.colors.primary },\n              ]}\n            >\n              <MaterialIcons name=\"edit\" size={16} color=\"#FFF\" />\n            </View>\n          </View>\n        )}\n\n        {/* Avatar */}\n        <View\n          style={[\n            styles.avatarContainer,\n            { backgroundColor: avatar.color },\n          ]}\n        >\n          <MaterialIcons\n            name={avatar.icon as any}\n            size={32}\n            color=\"#FFFFFF\"\n          />\n          {/* PIN indicator */}\n          {profile.isPinProtected && !isEditMode && (\n            <View\n              style={[\n                styles.pinIndicator,\n                { backgroundColor: currentTheme.colors.darkBackground },\n              ]}\n            >\n              <MaterialIcons name=\"lock\" size={12} color={currentTheme.colors.text} />\n            </View>\n          )}\n        </View>\n\n        {/* Profile name */}\n        <Text\n          style={[\n            styles.name,\n            {\n              color: isActive\n                ? currentTheme.colors.primary\n                : currentTheme.colors.text,\n            },\n          ]}\n          numberOfLines={1}\n        >\n          {profile.name}\n        </Text>\n\n        {/* Kids badge */}\n        {isKidsProfile && (\n          <View style={[styles.kidsBadge, { backgroundColor: '#FF6B6B' }]}>\n            <Text style={styles.kidsBadgeText}>KIDS</Text>\n          </View>\n        )}\n\n        {/* Admin badge */}\n        {profile.isAdmin && !isKidsProfile && (\n          <View\n            style={[\n              styles.adminBadge,\n              { backgroundColor: currentTheme.colors.primary },\n            ]}\n          >\n            <MaterialIcons name=\"admin-panel-settings\" size={10} color=\"#FFF\" />\n          </View>\n        )}\n      </TouchableOpacity>\n\n      {/* Delete button (only in edit mode and not for last/admin profile) */}\n      {isEditMode && onDelete && (\n        <TouchableOpacity\n          style={[\n            styles.deleteButton,\n            { backgroundColor: currentTheme.colors.error },\n          ]}\n          onPress={onDelete}\n        >\n          <MaterialIcons name=\"close\" size={16} color=\"#FFF\" />\n        </TouchableOpacity>\n      )}\n    </View>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    position: 'relative',\n  },\n  card: {\n    width: 100,\n    alignItems: 'center',\n    padding: 16,\n    borderRadius: 16,\n    borderWidth: 2,\n  },\n  editOverlay: {\n    ...StyleSheet.absoluteFillObject,\n    backgroundColor: 'rgba(0, 0, 0, 0.3)',\n    borderRadius: 14,\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  editIcon: {\n    width: 32,\n    height: 32,\n    borderRadius: 16,\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  avatarContainer: {\n    width: 56,\n    height: 56,\n    borderRadius: 28,\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginBottom: 12,\n    position: 'relative',\n  },\n  pinIndicator: {\n    position: 'absolute',\n    bottom: -2,\n    right: -2,\n    width: 20,\n    height: 20,\n    borderRadius: 10,\n    justifyContent: 'center',\n    alignItems: 'center',\n    borderWidth: 2,\n    borderColor: 'rgba(255, 255, 255, 0.1)',\n  },\n  name: {\n    fontSize: 13,\n    fontWeight: '500',\n    textAlign: 'center',\n  },\n  kidsBadge: {\n    position: 'absolute',\n    top: 8,\n    right: 8,\n    paddingHorizontal: 4,\n    paddingVertical: 2,\n    borderRadius: 4,\n  },\n  kidsBadgeText: {\n    color: '#FFF',\n    fontSize: 8,\n    fontWeight: '700',\n    letterSpacing: 0.5,\n  },\n  adminBadge: {\n    position: 'absolute',\n    top: 8,\n    left: 8,\n    width: 18,\n    height: 18,\n    borderRadius: 9,\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  deleteButton: {\n    position: 'absolute',\n    top: -6,\n    right: -6,\n    width: 24,\n    height: 24,\n    borderRadius: 12,\n    justifyContent: 'center',\n    alignItems: 'center',\n    zIndex: 1,\n  },\n});\n\nexport default ProfileCard;\n"
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/components/profile/index.ts",
  "content": "/**\n * Profile components index\n */\n\nexport { PinEntryModal } from './PinEntryModal';\nexport { PinSetupModal } from './PinSetupModal';\nexport { AvatarSelector } from './AvatarSelector';\nexport { ProfileEditModal } from './ProfileEditModal';\nexport { ProfileCard } from './ProfileCard';\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "completed",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "in_progress",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "completed",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "pending",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "pending",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "pending",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/screens/ProfileSelectorScreen.tsx",
  "content": "/**\n * ProfileSelectorScreen - Screen for selecting user profiles\n * Displays at app launch or when switching profiles\n */\n\nimport React, { useState, useCallback, useEffect } from 'react';\nimport {\n  View,\n  Text,\n  StyleSheet,\n  TouchableOpacity,\n  SafeAreaView,\n  StatusBar,\n  Platform,\n  ScrollView,\n  Dimensions,\n} from 'react-native';\nimport { useNavigation } from '@react-navigation/native';\nimport { MaterialIcons } from '@expo/vector-icons';\nimport { useTheme } from '../contexts/ThemeContext';\nimport { useProfile } from '../contexts/ProfileContext';\nimport {\n  ProfileCard,\n  PinEntryModal,\n  ProfileEditModal,\n} from '../components/profile';\nimport {\n  Profile,\n  CreateProfileInput,\n  MAX_PROFILES,\n} from '../types/profile';\nimport CustomAlert from '../components/CustomAlert';\n\nconst ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;\nconst { width: SCREEN_WIDTH } = Dimensions.get('window');\n\ninterface ProfileSelectorScreenProps {\n  onProfileSelected?: () => void;\n}\n\nconst ProfileSelectorScreen: React.FC<ProfileSelectorScreenProps> = ({\n  onProfileSelected,\n}) => {\n  const navigation = useNavigation();\n  const { currentTheme } = useTheme();\n  const {\n    profiles,\n    activeProfile,\n    isLoading,\n    canCreateProfile,\n    profileCount,\n    switchProfile,\n    createProfile,\n    checkProfileHasPin,\n    getLockoutInfo,\n    loadProfiles,\n  } = useProfile();\n\n  // Modal states\n  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);\n  const [showPinModal, setShowPinModal] = useState(false);\n  const [showCreateModal, setShowCreateModal] = useState(false);\n  const [isEditMode, setIsEditMode] = useState(false);\n  const [pinLockoutInfo, setPinLockoutInfo] = useState<{\n    lockedUntil?: number;\n    attemptsRemaining?: number;\n  }>({});\n\n  // Alert state\n  const [alertVisible, setAlertVisible] = useState(false);\n  const [alertTitle, setAlertTitle] = useState('');\n  const [alertMessage, setAlertMessage] = useState('');\n  const [alertActions, setAlertActions] = useState<Array<{\n    label: string;\n    onPress: () => void;\n    style?: object;\n  }>>([]);\n\n  const openAlert = (\n    title: string,\n    message: string,\n    actions?: Array<{ label: string; onPress: () => void; style?: object }>\n  ) => {\n    setAlertTitle(title);\n    setAlertMessage(message);\n    setAlertActions(actions && actions.length > 0 ? actions : [{ label: 'OK', onPress: () => {} }]);\n    setAlertVisible(true);\n  };\n\n  // Load profiles on mount\n  useEffect(() => {\n    loadProfiles();\n  }, [loadProfiles]);\n\n  const handleProfilePress = useCallback(async (profile: Profile) => {\n    if (isEditMode) {\n      // In edit mode, tapping a profile navigates to edit\n      navigation.navigate('ProfileSettings' as never, { profileId: profile.id } as never);\n      return;\n    }\n\n    // Check if PIN is required\n    const hasPin = await checkProfileHasPin(profile.id);\n    if (hasPin) {\n      // Check lockout status\n      const lockout = await getLockoutInfo(profile.id);\n      setPinLockoutInfo({\n        lockedUntil: lockout.lockedUntil || undefined,\n        attemptsRemaining: lockout.attemptsRemaining,\n      });\n      setSelectedProfile(profile);\n      setShowPinModal(true);\n      return;\n    }\n\n    // No PIN - switch directly\n    const result = await switchProfile(profile.id);\n    if (result.success) {\n      onProfileSelected?.();\n    } else {\n      openAlert('Error', result.error || 'Failed to switch profile');\n    }\n  }, [isEditMode, checkProfileHasPin, getLockoutInfo, switchProfile, navigation, onProfileSelected]);\n\n  const handlePinSubmit = useCallback(async (pin: string) => {\n    if (!selectedProfile) {\n      return { success: false };\n    }\n\n    const result = await switchProfile(selectedProfile.id, pin);\n\n    if (result.success) {\n      setShowPinModal(false);\n      setSelectedProfile(null);\n      onProfileSelected?.();\n    }\n\n    return {\n      success: result.success,\n      attemptsRemaining: result.attemptsRemaining,\n      lockedUntil: result.lockedUntil,\n    };\n  }, [selectedProfile, switchProfile, onProfileSelected]);\n\n  const handleCreateProfile = useCallback(async (input: CreateProfileInput) => {\n    const newProfile = await createProfile(input);\n    if (newProfile) {\n      setShowCreateModal(false);\n      return true;\n    }\n    return false;\n  }, [createProfile]);\n\n  const handleAddProfile = useCallback(() => {\n    if (!canCreateProfile) {\n      openAlert(\n        'Maximum Profiles Reached',\n        `You can only have ${MAX_PROFILES} profiles. Please delete an existing profile to create a new one.`\n      );\n      return;\n    }\n    setShowCreateModal(true);\n  }, [canCreateProfile]);\n\n  const renderHeader = () => (\n    <View style={styles.header}>\n      <Text style={[styles.title, { color: currentTheme.colors.text }]}>\n        Who's Watching?\n      </Text>\n      <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>\n        Select your profile to continue\n      </Text>\n    </View>\n  );\n\n  const renderProfiles = () => {\n    // Calculate items per row based on screen width\n    const cardWidth = 116; // card width + margin\n    const maxPerRow = Math.floor(SCREEN_WIDTH / cardWidth);\n    const itemsPerRow = Math.min(maxPerRow, profiles.length + 1);\n\n    return (\n      <View style={styles.profilesContainer}>\n        <ScrollView\n          contentContainerStyle={[\n            styles.profilesGrid,\n            { justifyContent: itemsPerRow <= 3 ? 'center' : 'flex-start' },\n          ]}\n          showsVerticalScrollIndicator={false}\n        >\n          {profiles.map((profile) => (\n            <View key={profile.id} style={styles.profileCardWrapper}>\n              <ProfileCard\n                profile={profile}\n                isActive={profile.id === activeProfile?.id}\n                isEditMode={isEditMode}\n                onPress={() => handleProfilePress(profile)}\n                onEdit={() => {\n                  navigation.navigate('ProfileSettings' as never, { profileId: profile.id } as never);\n                }}\n              />\n            </View>\n          ))}\n\n          {/* Add Profile Button */}\n          {canCreateProfile && !isEditMode && (\n            <View style={styles.profileCardWrapper}>\n              <TouchableOpacity\n                style={[\n                  styles.addProfileCard,\n                  { backgroundColor: currentTheme.colors.elevation2 },\n                ]}\n                onPress={handleAddProfile}\n                activeOpacity={0.7}\n              >\n                <View\n                  style={[\n                    styles.addIconContainer,\n                    { backgroundColor: currentTheme.colors.primary },\n                  ]}\n                >\n                  <MaterialIcons name=\"add\" size={32} color=\"#FFFFFF\" />\n                </View>\n                <Text\n                  style={[\n                    styles.addProfileText,\n                    { color: currentTheme.colors.textMuted },\n                  ]}\n                >\n                  Add Profile\n                </Text>\n              </TouchableOpacity>\n            </View>\n          )}\n        </ScrollView>\n      </View>\n    );\n  };\n\n  const renderFooter = () => (\n    <View style={styles.footer}>\n      <TouchableOpacity\n        style={[\n          styles.manageButton,\n          {\n            backgroundColor: isEditMode\n              ? currentTheme.colors.primary\n              : currentTheme.colors.elevation2,\n          },\n        ]}\n        onPress={() => setIsEditMode(!isEditMode)}\n      >\n        <MaterialIcons\n          name={isEditMode ? 'check' : 'edit'}\n          size={20}\n          color={isEditMode ? '#FFF' : currentTheme.colors.text}\n        />\n        <Text\n          style={[\n            styles.manageButtonText,\n            { color: isEditMode ? '#FFF' : currentTheme.colors.text },\n          ]}\n        >\n          {isEditMode ? 'Done' : 'Manage Profiles'}\n        </Text>\n      </TouchableOpacity>\n\n      {/* Profile count indicator */}\n      <Text style={[styles.profileCount, { color: currentTheme.colors.textMuted }]}>\n        {profileCount} / {MAX_PROFILES} profiles\n      </Text>\n    </View>\n  );\n\n  return (\n    <SafeAreaView\n      style={[\n        styles.container,\n        { backgroundColor: currentTheme.colors.darkBackground },\n      ]}\n    >\n      <StatusBar barStyle=\"light-content\" backgroundColor=\"transparent\" translucent />\n\n      {renderHeader()}\n      {renderProfiles()}\n      {renderFooter()}\n\n      {/* PIN Entry Modal */}\n      <PinEntryModal\n        visible={showPinModal}\n        profileName={selectedProfile?.name || ''}\n        onSubmit={handlePinSubmit}\n        onCancel={() => {\n          setShowPinModal(false);\n          setSelectedProfile(null);\n        }}\n        lockedUntil={pinLockoutInfo.lockedUntil}\n        attemptsRemaining={pinLockoutInfo.attemptsRemaining}\n      />\n\n      {/* Create Profile Modal */}\n      <ProfileEditModal\n        visible={showCreateModal}\n        mode=\"create\"\n        currentProfileCount={profileCount}\n        onSave={handleCreateProfile}\n        onCancel={() => setShowCreateModal(false)}\n      />\n\n      {/* Alert */}\n      <CustomAlert\n        visible={alertVisible}\n        title={alertTitle}\n        message={alertMessage}\n        actions={alertActions}\n        onClose={() => setAlertVisible(false)}\n      />\n    </SafeAreaView>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n  },\n  header: {\n    alignItems: 'center',\n    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 40 : 40,\n    paddingBottom: 32,\n  },\n  title: {\n    fontSize: 28,\n    fontWeight: '700',\n    marginBottom: 8,\n  },\n  subtitle: {\n    fontSize: 16,\n  },\n  profilesContainer: {\n    flex: 1,\n    paddingHorizontal: 20,\n  },\n  profilesGrid: {\n    flexDirection: 'row',\n    flexWrap: 'wrap',\n    alignItems: 'flex-start',\n  },\n  profileCardWrapper: {\n    margin: 8,\n  },\n  addProfileCard: {\n    width: 100,\n    alignItems: 'center',\n    padding: 16,\n    borderRadius: 16,\n    borderWidth: 2,\n    borderStyle: 'dashed',\n    borderColor: 'rgba(255, 255, 255, 0.2)',\n  },\n  addIconContainer: {\n    width: 56,\n    height: 56,\n    borderRadius: 28,\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginBottom: 12,\n  },\n  addProfileText: {\n    fontSize: 12,\n    fontWeight: '500',\n    textAlign: 'center',\n  },\n  footer: {\n    alignItems: 'center',\n    paddingVertical: 24,\n    paddingHorizontal: 20,\n  },\n  manageButton: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    paddingHorizontal: 24,\n    paddingVertical: 12,\n    borderRadius: 24,\n    gap: 8,\n    marginBottom: 12,\n  },\n  manageButtonText: {\n    fontSize: 15,\n    fontWeight: '500',\n  },\n  profileCount: {\n    fontSize: 12,\n  },\n});\n\nexport default ProfileSelectorScreen;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "completed",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "completed",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "completed",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "in_progress",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "pending",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "pending",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/utils/contentFilter.ts",
  "content": "/**\n * Content Filtering Utility\n * Filters content based on profile age rating settings\n */\n\nimport {\n  Profile,\n  AgeRating,\n  AGE_RATING_LEVELS,\n  KIDS_MODE_ALLOWED_RATINGS,\n  isRatingAllowedForProfile,\n  isKidsProfile,\n} from '../types/profile';\n\n// Common rating aliases and mappings\nconst RATING_ALIASES: Record<string, AgeRating> = {\n  // Movie ratings\n  'g': 'G',\n  'pg': 'PG',\n  'pg-13': 'PG-13',\n  'pg13': 'PG-13',\n  'r': 'R',\n  'nc-17': 'NC-17',\n  'nc17': 'NC-17',\n  'x': 'NC-17',\n  // TV ratings\n  'tv-y': 'TV-Y',\n  'tvy': 'TV-Y',\n  'tv-y7': 'TV-Y7',\n  'tvy7': 'TV-Y7',\n  'tv-g': 'TV-G',\n  'tvg': 'TV-G',\n  'tv-pg': 'TV-PG',\n  'tvpg': 'TV-PG',\n  'tv-14': 'TV-14',\n  'tv14': 'TV-14',\n  'tv-ma': 'TV-MA',\n  'tvma': 'TV-MA',\n  // Unrated\n  'nr': 'NR',\n  'unrated': 'UNRATED',\n  'not rated': 'NR',\n  'not-rated': 'NR',\n  // International ratings (common mappings)\n  'u': 'G', // UK\n  '12': 'PG-13',\n  '12a': 'PG-13', // UK\n  '15': 'R', // UK\n  '18': 'NC-17', // UK\n  'fsk 0': 'G', // Germany\n  'fsk 6': 'PG',\n  'fsk 12': 'PG-13',\n  'fsk 16': 'R',\n  'fsk 18': 'NC-17',\n};\n\n/**\n * Normalize a rating string to our standard AgeRating type\n */\nexport function normalizeRating(rating: string | undefined | null): AgeRating | null {\n  if (!rating) return null;\n\n  const normalized = rating.toLowerCase().trim();\n\n  // Check direct match\n  if (AGE_RATING_LEVELS[rating as AgeRating] !== undefined) {\n    return rating as AgeRating;\n  }\n\n  // Check aliases\n  if (RATING_ALIASES[normalized]) {\n    return RATING_ALIASES[normalized];\n  }\n\n  // Try to extract a known rating from the string\n  for (const [alias, mappedRating] of Object.entries(RATING_ALIASES)) {\n    if (normalized.includes(alias)) {\n      return mappedRating;\n    }\n  }\n\n  return null;\n}\n\n/**\n * Get the age rating level for a given rating\n * Returns a high number for unknown ratings (treated as mature)\n */\nexport function getRatingLevel(rating: string | undefined | null): number {\n  const normalized = normalizeRating(rating);\n  if (!normalized) {\n    return 100; // Unknown ratings treated as most restrictive for kids\n  }\n  return AGE_RATING_LEVELS[normalized] ?? 100;\n}\n\n/**\n * Check if a content item is allowed for a profile\n */\nexport function isContentAllowed<T extends { certification?: string; rating?: string }>(\n  content: T,\n  profile: Profile | null\n): boolean {\n  // No profile = allow everything (not logged in state)\n  if (!profile) return true;\n\n  // Get the rating from the content\n  const rating = content.certification || content.rating;\n  const normalizedRating = normalizeRating(rating);\n\n  // If no rating found\n  if (!normalizedRating) {\n    // Kids profiles block unknown ratings\n    if (isKidsProfile(profile)) {\n      return false;\n    }\n    // Other profiles allow unknown ratings\n    return true;\n  }\n\n  return isRatingAllowedForProfile(normalizedRating, profile);\n}\n\n/**\n * Filter an array of content items based on profile settings\n * Optimized for performance with large arrays\n */\nexport function filterContentForProfile<T extends { certification?: string; rating?: string }>(\n  content: T[],\n  profile: Profile | null\n): T[] {\n  // No profile = return all content\n  if (!profile) return content;\n\n  // Use a pre-computed max level for faster comparisons\n  const maxLevel = AGE_RATING_LEVELS[profile.maxAgeRating];\n  const isKids = isKidsProfile(profile);\n\n  return content.filter((item) => {\n    const rating = item.certification || item.rating;\n    const normalizedRating = normalizeRating(rating);\n\n    // Handle unknown ratings\n    if (!normalizedRating) {\n      return !isKids; // Block for kids, allow for others\n    }\n\n    const itemLevel = AGE_RATING_LEVELS[normalizedRating];\n    if (itemLevel === undefined) {\n      return !isKids;\n    }\n\n    return itemLevel <= maxLevel;\n  });\n}\n\n/**\n * Get a display label for the profile's content restriction\n */\nexport function getContentRestrictionLabel(profile: Profile | null): string {\n  if (!profile) return 'All Content';\n\n  if (isKidsProfile(profile)) {\n    return 'Kids Only';\n  }\n\n  const rating = profile.maxAgeRating;\n  switch (rating) {\n    case 'TV-Y':\n    case 'G':\n      return 'All Ages';\n    case 'TV-Y7':\n      return 'Ages 7+';\n    case 'TV-G':\n    case 'PG':\n      return 'General Audience';\n    case 'TV-PG':\n      return 'Parental Guidance';\n    case 'TV-14':\n    case 'PG-13':\n      return 'Teen (13+)';\n    case 'R':\n    case 'TV-MA':\n      return 'Mature (17+)';\n    case 'NC-17':\n      return 'Adults Only (18+)';\n    default:\n      return 'All Content';\n  }\n}\n\n/**\n * Check if content should show a warning for the current profile\n */\nexport function shouldShowContentWarning<T extends { certification?: string; rating?: string }>(\n  content: T,\n  profile: Profile | null\n): boolean {\n  if (!profile) return false;\n\n  const rating = content.certification || content.rating;\n  const normalizedRating = normalizeRating(rating);\n  if (!normalizedRating) return false;\n\n  const contentLevel = AGE_RATING_LEVELS[normalizedRating] ?? 0;\n  const profileLevel = AGE_RATING_LEVELS[profile.maxAgeRating] ?? 100;\n\n  // Show warning if content is within 1 level of the max\n  return contentLevel === profileLevel && contentLevel >= 4;\n}\n\n/**\n * Get filtered content with statistics\n */\nexport function getFilteredContentStats<T extends { certification?: string; rating?: string }>(\n  content: T[],\n  profile: Profile | null\n): {\n  filtered: T[];\n  totalCount: number;\n  filteredCount: number;\n  blockedCount: number;\n} {\n  const filtered = filterContentForProfile(content, profile);\n  return {\n    filtered,\n    totalCount: content.length,\n    filteredCount: filtered.length,\n    blockedCount: content.length - filtered.length,\n  };\n}\n\n/**\n * Create a content filter function for a specific profile\n * Useful for memoization and repeated filtering\n */\nexport function createContentFilter<T extends { certification?: string; rating?: string }>(\n  profile: Profile | null\n): (content: T[]) => T[] {\n  if (!profile) {\n    return (content) => content;\n  }\n\n  const maxLevel = AGE_RATING_LEVELS[profile.maxAgeRating];\n  const isKids = isKidsProfile(profile);\n\n  return (content: T[]) => {\n    return content.filter((item) => {\n      const rating = item.certification || item.rating;\n      const normalizedRating = normalizeRating(rating);\n\n      if (!normalizedRating) {\n        return !isKids;\n      }\n\n      const itemLevel = AGE_RATING_LEVELS[normalizedRating];\n      if (itemLevel === undefined) {\n        return !isKids;\n      }\n\n      return itemLevel <= maxLevel;\n    });\n  };\n}\n\n/**\n * Sort content by age rating level (least restrictive first)\n */\nexport function sortContentByRating<T extends { certification?: string; rating?: string }>(\n  content: T[],\n  ascending = true\n): T[] {\n  return [...content].sort((a, b) => {\n    const levelA = getRatingLevel(a.certification || a.rating);\n    const levelB = getRatingLevel(b.certification || b.rating);\n    return ascending ? levelA - levelB : levelB - levelA;\n  });\n}\n\nexport default {\n  normalizeRating,\n  getRatingLevel,\n  isContentAllowed,\n  filterContentForProfile,\n  getContentRestrictionLabel,\n  shouldShowContentWarning,\n  getFilteredContentStats,\n  createContentFilter,\n  sortContentByRating,\n};\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "completed",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "completed",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "completed",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "completed",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "in_progress",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "pending",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/hooks/useProfileFiltering.ts",
  "content": "/**\n * useProfileFiltering - Hook for filtering content based on profile settings\n * Provides memoized filtering with performance optimization\n */\n\nimport { useMemo, useCallback } from 'react';\nimport { useProfile } from '../contexts/ProfileContext';\nimport {\n  filterContentForProfile,\n  isContentAllowed,\n  getContentRestrictionLabel,\n  shouldShowContentWarning,\n  getFilteredContentStats,\n  createContentFilter,\n  normalizeRating,\n} from '../utils/contentFilter';\nimport { Profile } from '../types/profile';\n\ninterface ContentItem {\n  certification?: string;\n  rating?: string;\n}\n\ninterface FilteredResult<T> {\n  data: T[];\n  totalCount: number;\n  filteredCount: number;\n  blockedCount: number;\n  isFiltered: boolean;\n}\n\n/**\n * Hook for filtering content arrays based on active profile settings\n */\nexport function useProfileFiltering<T extends ContentItem>(content: T[]): FilteredResult<T> {\n  const { activeProfile, isKidsMode } = useProfile();\n\n  return useMemo(() => {\n    const stats = getFilteredContentStats(content, activeProfile);\n    return {\n      data: stats.filtered,\n      totalCount: stats.totalCount,\n      filteredCount: stats.filteredCount,\n      blockedCount: stats.blockedCount,\n      isFiltered: stats.blockedCount > 0,\n    };\n  }, [content, activeProfile]);\n}\n\n/**\n * Hook for creating a reusable content filter function\n * Useful when you need to filter multiple arrays with the same profile\n */\nexport function useContentFilter() {\n  const { activeProfile } = useProfile();\n\n  return useMemo(() => createContentFilter(activeProfile), [activeProfile]);\n}\n\n/**\n * Hook for checking if a single content item is allowed\n */\nexport function useContentAllowed<T extends ContentItem>(content: T | null | undefined): boolean {\n  const { activeProfile } = useProfile();\n\n  return useMemo(() => {\n    if (!content) return true;\n    return isContentAllowed(content, activeProfile);\n  }, [content, activeProfile]);\n}\n\n/**\n * Hook for checking if content should show a warning\n */\nexport function useContentWarning<T extends ContentItem>(\n  content: T | null | undefined\n): boolean {\n  const { activeProfile } = useProfile();\n\n  return useMemo(() => {\n    if (!content) return false;\n    return shouldShowContentWarning(content, activeProfile);\n  }, [content, activeProfile]);\n}\n\n/**\n * Hook for getting the current content restriction label\n */\nexport function useContentRestrictionLabel(): string {\n  const { activeProfile } = useProfile();\n\n  return useMemo(() => getContentRestrictionLabel(activeProfile), [activeProfile]);\n}\n\n/**\n * Hook for getting the kids mode status\n */\nexport function useKidsMode(): {\n  isKidsMode: boolean;\n  restrictionLabel: string;\n  profile: Profile | null;\n} {\n  const { activeProfile, isKidsMode } = useProfile();\n  const restrictionLabel = useMemo(\n    () => getContentRestrictionLabel(activeProfile),\n    [activeProfile]\n  );\n\n  return {\n    isKidsMode,\n    restrictionLabel,\n    profile: activeProfile,\n  };\n}\n\n/**\n * Hook for filtering and transforming content in one step\n */\nexport function useFilteredContent<T extends ContentItem, R = T>(\n  content: T[],\n  transform?: (item: T) => R\n): R[] {\n  const { activeProfile } = useProfile();\n\n  return useMemo(() => {\n    const filtered = filterContentForProfile(content, activeProfile);\n    if (transform) {\n      return filtered.map(transform);\n    }\n    return filtered as unknown as R[];\n  }, [content, activeProfile, transform]);\n}\n\n/**\n * Hook for getting filtering callbacks\n * Returns stable callback references for use in effects and event handlers\n */\nexport function useFilteringCallbacks() {\n  const { activeProfile } = useProfile();\n\n  const filterContent = useCallback(\n    <T extends ContentItem>(content: T[]): T[] => {\n      return filterContentForProfile(content, activeProfile);\n    },\n    [activeProfile]\n  );\n\n  const checkContentAllowed = useCallback(\n    <T extends ContentItem>(content: T): boolean => {\n      return isContentAllowed(content, activeProfile);\n    },\n    [activeProfile]\n  );\n\n  const checkContentWarning = useCallback(\n    <T extends ContentItem>(content: T): boolean => {\n      return shouldShowContentWarning(content, activeProfile);\n    },\n    [activeProfile]\n  );\n\n  const getNormalizedRating = useCallback((rating: string | undefined | null) => {\n    return normalizeRating(rating);\n  }, []);\n\n  return {\n    filterContent,\n    checkContentAllowed,\n    checkContentWarning,\n    getNormalizedRating,\n  };\n}\n\n/**\n * Hook for paginated content filtering\n * Filters content and provides pagination helpers\n */\nexport function usePaginatedFilteredContent<T extends ContentItem>(\n  content: T[],\n  pageSize: number = 20\n) {\n  const { activeProfile } = useProfile();\n\n  return useMemo(() => {\n    const filtered = filterContentForProfile(content, activeProfile);\n    const totalPages = Math.ceil(filtered.length / pageSize);\n\n    const getPage = (page: number): T[] => {\n      const start = page * pageSize;\n      const end = start + pageSize;\n      return filtered.slice(start, end);\n    };\n\n    return {\n      allItems: filtered,\n      totalCount: filtered.length,\n      totalPages,\n      pageSize,\n      getPage,\n      isFiltered: filtered.length < content.length,\n      blockedCount: content.length - filtered.length,\n    };\n  }, [content, activeProfile, pageSize]);\n}\n\nexport default useProfileFiltering;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "completed",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "completed",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "completed",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "completed",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "completed",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "in_progress",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "pending",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/styles/kidsModeTheme.ts",
  "content": "/**\n * Kids Mode Theme\n * Child-friendly colors and styling for kids profiles\n */\n\nimport { colors as defaultColors } from './colors';\n\n// Kids mode color palette - bright, friendly colors\nexport const kidsModeColors = {\n  // Primary colors - bright and playful\n  primary: '#FF6B6B', // Coral red\n  secondary: '#4ECDC4', // Teal\n  accent: '#FFE66D', // Sunny yellow\n\n  // Background colors - softer, warmer dark theme\n  darkBackground: '#1A1A2E', // Deep purple-ish dark\n  lightBackground: '#FFF5F5', // Soft pink tint\n\n  // Text colors - maintaining contrast\n  text: '#FFFFFF',\n  textLight: '#FFFFFF',\n  textDark: '#1F1F1F',\n  textMuted: 'rgba(255, 255, 255, 0.8)',\n  textMutedLight: 'rgba(255, 255, 255, 0.8)',\n  textMutedDark: 'rgba(0, 0, 0, 0.6)',\n\n  // Basic colors\n  white: '#FFFFFF',\n  black: '#1A1A2E',\n  darkGray: '#252540',\n  mediumGray: 'rgba(255, 255, 255, 0.7)',\n  lightGray: 'rgba(255, 255, 255, 0.5)',\n\n  // Status colors - friendly versions\n  error: '#FF8A80', // Soft red\n  success: '#69F0AE', // Bright green\n  warning: '#FFD54F', // Warm yellow\n  info: '#81D4FA', // Light blue\n\n  // Transparent colors\n  transparent: 'transparent',\n  transparentLight: 'rgba(255, 255, 255, 0.1)',\n  transparentDark: 'rgba(26, 26, 46, 0.8)',\n\n  // Additional properties\n  background: '#1A1A2E',\n\n  // UI elements\n  border: 'rgba(255, 255, 255, 0.15)',\n  card: 'rgba(255, 255, 255, 0.08)',\n  cardHighlight: 'rgba(255, 255, 255, 0.12)',\n  shadow: 'rgba(0, 0, 0, 0.3)',\n\n  // Kids-specific accent colors\n  accentLight: '#FF9FF3', // Pink\n  accentDark: '#FF6B6B', // Coral\n  surfaceVariant: 'rgba(255, 255, 255, 0.05)',\n\n  // Elevation overlays\n  elevation1: 'rgba(255, 255, 255, 0.05)',\n  elevation2: 'rgba(255, 255, 255, 0.07)',\n  elevation3: 'rgba(255, 255, 255, 0.12)',\n  elevation4: 'rgba(255, 255, 255, 0.14)',\n\n  // Text emphasis levels\n  highEmphasis: 'rgba(255, 255, 255, 1)',\n  mediumEmphasis: 'rgba(255, 255, 255, 0.8)',\n  disabled: 'rgba(255, 255, 255, 0.5)',\n};\n\n// Additional fun colors for kids UI elements\nexport const kidsAccentColors = [\n  '#FF6B6B', // Coral\n  '#4ECDC4', // Teal\n  '#FFE66D', // Yellow\n  '#95E1D3', // Mint\n  '#FF9FF3', // Pink\n  '#54A0FF', // Blue\n  '#FF9F43', // Orange\n  '#A29BFE', // Purple\n];\n\n// Kids mode specific styles\nexport const kidsModeStyles = {\n  // Border radius - more rounded for friendly appearance\n  borderRadiusSmall: 12,\n  borderRadiusMedium: 16,\n  borderRadiusLarge: 24,\n  borderRadiusFull: 9999,\n\n  // Font sizes - slightly larger for readability\n  fontSizeSmall: 14,\n  fontSizeMedium: 16,\n  fontSizeLarge: 20,\n  fontSizeXLarge: 28,\n\n  // Spacing - more generous spacing\n  spacingSmall: 8,\n  spacingMedium: 16,\n  spacingLarge: 24,\n  spacingXLarge: 32,\n\n  // Icon sizes\n  iconSizeSmall: 20,\n  iconSizeMedium: 28,\n  iconSizeLarge: 36,\n};\n\n// Helper function to get kids mode theme\nexport function getKidsModeTheme() {\n  return {\n    id: 'kids',\n    name: 'Kids Mode',\n    colors: kidsModeColors,\n    isEditable: false,\n    isKidsMode: true,\n  };\n}\n\n// Helper function to merge kids mode colors with current theme\nexport function applyKidsModeOverlay(baseColors: typeof defaultColors): typeof kidsModeColors {\n  return {\n    ...baseColors,\n    ...kidsModeColors,\n  };\n}\n\n// Kids mode badge colors based on content type\nexport const kidsBadgeColors = {\n  animation: '#FF9FF3',\n  family: '#54A0FF',\n  comedy: '#FFE66D',\n  adventure: '#FF9F43',\n  educational: '#95E1D3',\n  music: '#A29BFE',\n  nature: '#69F0AE',\n  sports: '#4ECDC4',\n};\n\n// Get badge color for content genre\nexport function getKidsBadgeColor(genre: string): string {\n  const normalizedGenre = genre.toLowerCase();\n  for (const [key, color] of Object.entries(kidsBadgeColors)) {\n    if (normalizedGenre.includes(key)) {\n      return color;\n    }\n  }\n  return kidsAccentColors[Math.floor(Math.random() * kidsAccentColors.length)];\n}\n\nexport default {\n  kidsModeColors,\n  kidsAccentColors,\n  kidsModeStyles,\n  getKidsModeTheme,\n  applyKidsModeOverlay,\n  kidsBadgeColors,\n  getKidsBadgeColor,\n};\n"
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/components/profile/KidsModeWrapper.tsx",
  "content": "/**\n * KidsModeWrapper - Wrapper component for kids mode UI restrictions\n * Applies kid-friendly styling and restrictions when active\n */\n\nimport React, { ReactNode } from 'react';\nimport {\n  View,\n  Text,\n  StyleSheet,\n  TouchableOpacity,\n} from 'react-native';\nimport { MaterialIcons } from '@expo/vector-icons';\nimport { useProfile } from '../../contexts/ProfileContext';\nimport { useTheme } from '../../contexts/ThemeContext';\nimport { kidsModeColors, kidsModeStyles } from '../../styles/kidsModeTheme';\n\ninterface KidsModeWrapperProps {\n  children: ReactNode;\n  showIndicator?: boolean;\n  indicatorPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';\n}\n\n/**\n * Wrapper that provides kids mode context and styling\n */\nexport const KidsModeWrapper: React.FC<KidsModeWrapperProps> = ({\n  children,\n  showIndicator = true,\n  indicatorPosition = 'top-right',\n}) => {\n  const { isKidsMode, activeProfile } = useProfile();\n  const { currentTheme } = useTheme();\n\n  if (!isKidsMode) {\n    return <>{children}</>;\n  }\n\n  const getIndicatorStyle = () => {\n    switch (indicatorPosition) {\n      case 'top-left':\n        return { top: 8, left: 8 };\n      case 'top-right':\n        return { top: 8, right: 8 };\n      case 'bottom-left':\n        return { bottom: 8, left: 8 };\n      case 'bottom-right':\n        return { bottom: 8, right: 8 };\n    }\n  };\n\n  return (\n    <View style={styles.container}>\n      {children}\n      {showIndicator && (\n        <View style={[styles.indicator, getIndicatorStyle()]}>\n          <View style={[styles.indicatorBadge, { backgroundColor: kidsModeColors.primary }]}>\n            <MaterialIcons name=\"child-care\" size={14} color=\"#FFF\" />\n            <Text style={styles.indicatorText}>KIDS</Text>\n          </View>\n        </View>\n      )}\n    </View>\n  );\n};\n\ninterface KidsModeBlockedContentProps {\n  message?: string;\n  showSwitchProfileButton?: boolean;\n  onSwitchProfile?: () => void;\n}\n\n/**\n * Component shown when content is blocked in kids mode\n */\nexport const KidsModeBlockedContent: React.FC<KidsModeBlockedContentProps> = ({\n  message = 'This content is not available in Kids mode',\n  showSwitchProfileButton = false,\n  onSwitchProfile,\n}) => {\n  const { currentTheme } = useTheme();\n\n  return (\n    <View style={[styles.blockedContainer, { backgroundColor: currentTheme.colors.elevation2 }]}>\n      <View style={[styles.blockedIcon, { backgroundColor: kidsModeColors.primary }]}>\n        <MaterialIcons name=\"block\" size={32} color=\"#FFF\" />\n      </View>\n      <Text style={[styles.blockedTitle, { color: currentTheme.colors.text }]}>\n        Content Restricted\n      </Text>\n      <Text style={[styles.blockedMessage, { color: currentTheme.colors.textMuted }]}>\n        {message}\n      </Text>\n      {showSwitchProfileButton && onSwitchProfile && (\n        <TouchableOpacity\n          style={[styles.switchButton, { backgroundColor: currentTheme.colors.primary }]}\n          onPress={onSwitchProfile}\n        >\n          <MaterialIcons name=\"switch-account\" size={20} color=\"#FFF\" />\n          <Text style={styles.switchButtonText}>Switch Profile</Text>\n        </TouchableOpacity>\n      )}\n    </View>\n  );\n};\n\ninterface KidsModeIndicatorProps {\n  style?: object;\n  size?: 'small' | 'medium' | 'large';\n}\n\n/**\n * Standalone kids mode indicator badge\n */\nexport const KidsModeIndicator: React.FC<KidsModeIndicatorProps> = ({\n  style,\n  size = 'medium',\n}) => {\n  const { isKidsMode, activeProfile } = useProfile();\n\n  if (!isKidsMode) return null;\n\n  const sizeStyles = {\n    small: { paddingHorizontal: 6, paddingVertical: 2, iconSize: 10, fontSize: 8 },\n    medium: { paddingHorizontal: 8, paddingVertical: 4, iconSize: 14, fontSize: 10 },\n    large: { paddingHorizontal: 12, paddingVertical: 6, iconSize: 18, fontSize: 12 },\n  };\n\n  const currentSize = sizeStyles[size];\n\n  return (\n    <View\n      style={[\n        styles.standaloneIndicator,\n        {\n          backgroundColor: kidsModeColors.primary,\n          paddingHorizontal: currentSize.paddingHorizontal,\n          paddingVertical: currentSize.paddingVertical,\n        },\n        style,\n      ]}\n    >\n      <MaterialIcons name=\"child-care\" size={currentSize.iconSize} color=\"#FFF\" />\n      <Text style={[styles.standaloneIndicatorText, { fontSize: currentSize.fontSize }]}>\n        KIDS\n      </Text>\n    </View>\n  );\n};\n\ninterface ContentAgeWarningProps {\n  rating: string;\n  onContinue: () => void;\n  onGoBack: () => void;\n}\n\n/**\n * Warning modal for content near the age limit\n */\nexport const ContentAgeWarning: React.FC<ContentAgeWarningProps> = ({\n  rating,\n  onContinue,\n  onGoBack,\n}) => {\n  const { currentTheme } = useTheme();\n\n  return (\n    <View style={[styles.warningContainer, { backgroundColor: currentTheme.colors.darkBackground }]}>\n      <View style={[styles.warningIcon, { backgroundColor: currentTheme.colors.warning }]}>\n        <MaterialIcons name=\"warning\" size={40} color=\"#FFF\" />\n      </View>\n      <Text style={[styles.warningTitle, { color: currentTheme.colors.text }]}>\n        Content Advisory\n      </Text>\n      <Text style={[styles.warningMessage, { color: currentTheme.colors.textMuted }]}>\n        This content is rated {rating} and may not be suitable for all viewers.\n      </Text>\n      <View style={styles.warningButtons}>\n        <TouchableOpacity\n          style={[styles.warningButton, { backgroundColor: currentTheme.colors.elevation2 }]}\n          onPress={onGoBack}\n        >\n          <Text style={[styles.warningButtonText, { color: currentTheme.colors.text }]}>\n            Go Back\n          </Text>\n        </TouchableOpacity>\n        <TouchableOpacity\n          style={[styles.warningButton, { backgroundColor: currentTheme.colors.primary }]}\n          onPress={onContinue}\n        >\n          <Text style={styles.warningButtonTextPrimary}>Continue</Text>\n        </TouchableOpacity>\n      </View>\n    </View>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    position: 'relative',\n  },\n  indicator: {\n    position: 'absolute',\n    zIndex: 100,\n  },\n  indicatorBadge: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    paddingHorizontal: 8,\n    paddingVertical: 4,\n    borderRadius: 12,\n    gap: 4,\n  },\n  indicatorText: {\n    color: '#FFF',\n    fontSize: 10,\n    fontWeight: '700',\n    letterSpacing: 0.5,\n  },\n  blockedContainer: {\n    flex: 1,\n    justifyContent: 'center',\n    alignItems: 'center',\n    padding: 24,\n  },\n  blockedIcon: {\n    width: 64,\n    height: 64,\n    borderRadius: 32,\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginBottom: 16,\n  },\n  blockedTitle: {\n    fontSize: 20,\n    fontWeight: '600',\n    marginBottom: 8,\n    textAlign: 'center',\n  },\n  blockedMessage: {\n    fontSize: 14,\n    textAlign: 'center',\n    marginBottom: 24,\n    lineHeight: 20,\n  },\n  switchButton: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    paddingHorizontal: 20,\n    paddingVertical: 12,\n    borderRadius: 24,\n    gap: 8,\n  },\n  switchButtonText: {\n    color: '#FFF',\n    fontSize: 14,\n    fontWeight: '600',\n  },\n  standaloneIndicator: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    borderRadius: 12,\n    gap: 4,\n  },\n  standaloneIndicatorText: {\n    color: '#FFF',\n    fontWeight: '700',\n    letterSpacing: 0.5,\n  },\n  warningContainer: {\n    flex: 1,\n    justifyContent: 'center',\n    alignItems: 'center',\n    padding: 24,\n  },\n  warningIcon: {\n    width: 80,\n    height: 80,\n    borderRadius: 40,\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginBottom: 20,\n  },\n  warningTitle: {\n    fontSize: 24,\n    fontWeight: '600',\n    marginBottom: 12,\n    textAlign: 'center',\n  },\n  warningMessage: {\n    fontSize: 16,\n    textAlign: 'center',\n    marginBottom: 32,\n    lineHeight: 24,\n    maxWidth: 300,\n  },\n  warningButtons: {\n    flexDirection: 'row',\n    gap: 16,\n  },\n  warningButton: {\n    paddingHorizontal: 32,\n    paddingVertical: 14,\n    borderRadius: 24,\n  },\n  warningButtonText: {\n    fontSize: 16,\n    fontWeight: '500',\n  },\n  warningButtonTextPrimary: {\n    color: '#FFF',\n    fontSize: 16,\n    fontWeight: '600',\n  },\n});\n\nexport default KidsModeWrapper;\n"
}

🔧 Tool: Edit
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/components/profile/index.ts",
  "old_string": "/**\n * Profile components index\n */\n\nexport { PinEntryModal } from './PinEntryModal';\nexport { PinSetupModal } from './PinSetupModal';\nexport { AvatarSelector } from './AvatarSelector';\nexport { ProfileEditModal } from './ProfileEditModal';\nexport { ProfileCard } from './ProfileCard';",
  "new_string": "/**\n * Profile components index\n */\n\nexport { PinEntryModal } from './PinEntryModal';\nexport { PinSetupModal } from './PinSetupModal';\nexport { AvatarSelector } from './AvatarSelector';\nexport { ProfileEditModal } from './ProfileEditModal';\nexport { ProfileCard } from './ProfileCard';\nexport {\n  KidsModeWrapper,\n  KidsModeBlockedContent,\n  KidsModeIndicator,\n  ContentAgeWarning,\n} from './KidsModeWrapper';"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "completed",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "completed",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "completed",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "completed",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "completed",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "completed",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "in_progress",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "pending",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/screens/ProfilesScreen.tsx",
  "content": "/**\n * ProfilesScreen - Admin management screen for profiles\n * Allows creating, editing, and deleting profiles\n */\n\nimport React, { useState, useCallback } from 'react';\nimport {\n  View,\n  Text,\n  StyleSheet,\n  TouchableOpacity,\n  FlatList,\n  StatusBar,\n  Platform,\n  SafeAreaView,\n} from 'react-native';\nimport { useNavigation } from '@react-navigation/native';\nimport { MaterialIcons } from '@expo/vector-icons';\nimport { useTheme } from '../contexts/ThemeContext';\nimport { useProfile } from '../contexts/ProfileContext';\nimport { useTraktContext } from '../contexts/TraktContext';\nimport {\n  ProfileCard,\n  ProfileEditModal,\n  PinSetupModal,\n  PinEntryModal,\n} from '../components/profile';\nimport {\n  Profile,\n  CreateProfileInput,\n  UpdateProfileInput,\n  MAX_PROFILES,\n  AVATAR_OPTIONS,\n  KIDS_AVATAR_OPTIONS,\n} from '../types/profile';\nimport CustomAlert from '../components/CustomAlert';\n\nconst ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;\n\nconst ProfilesScreen: React.FC = () => {\n  const navigation = useNavigation();\n  const { currentTheme } = useTheme();\n  const { isAuthenticated } = useTraktContext();\n  const {\n    profiles,\n    activeProfile,\n    profileCount,\n    canCreateProfile,\n    createProfile,\n    updateProfile,\n    deleteProfile,\n    setProfilePin,\n    removeProfilePin,\n    verifyProfilePin,\n    checkProfileHasPin,\n  } = useProfile();\n\n  // Modal states\n  const [showCreateModal, setShowCreateModal] = useState(false);\n  const [showEditModal, setShowEditModal] = useState(false);\n  const [showPinSetupModal, setShowPinSetupModal] = useState(false);\n  const [showPinVerifyModal, setShowPinVerifyModal] = useState(false);\n  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);\n  const [pendingAction, setPendingAction] = useState<'delete' | 'removePin' | null>(null);\n\n  // Alert state\n  const [alertVisible, setAlertVisible] = useState(false);\n  const [alertTitle, setAlertTitle] = useState('');\n  const [alertMessage, setAlertMessage] = useState('');\n  const [alertActions, setAlertActions] = useState<Array<{\n    label: string;\n    onPress: () => void;\n    style?: object;\n  }>>([]);\n\n  const openAlert = (\n    title: string,\n    message: string,\n    actions?: Array<{ label: string; onPress: () => void; style?: object }>\n  ) => {\n    setAlertTitle(title);\n    setAlertMessage(message);\n    setAlertActions(actions && actions.length > 0 ? actions : [{ label: 'OK', onPress: () => {} }]);\n    setAlertVisible(true);\n  };\n\n  // Get avatar for a profile\n  const getAvatar = (avatarId: string) => {\n    const allAvatars = [...AVATAR_OPTIONS, ...KIDS_AVATAR_OPTIONS];\n    return allAvatars.find(a => a.id === avatarId) || AVATAR_OPTIONS[0];\n  };\n\n  const handleBack = () => {\n    navigation.goBack();\n  };\n\n  const handleCreateProfile = async (input: CreateProfileInput) => {\n    const newProfile = await createProfile(input);\n    if (newProfile) {\n      setShowCreateModal(false);\n      return true;\n    }\n    return false;\n  };\n\n  const handleEditProfile = (profile: Profile) => {\n    setSelectedProfile(profile);\n    setShowEditModal(true);\n  };\n\n  const handleUpdateProfile = async (input: UpdateProfileInput) => {\n    if (!selectedProfile) return false;\n\n    const updated = await updateProfile(selectedProfile.id, input);\n    if (updated) {\n      setShowEditModal(false);\n      setSelectedProfile(null);\n      return true;\n    }\n    return false;\n  };\n\n  const handleDeleteProfile = async (profile: Profile) => {\n    // Check if it's the last profile\n    if (profileCount <= 1) {\n      openAlert('Cannot Delete', 'You must have at least one profile.');\n      return;\n    }\n\n    // Check if it's the active profile\n    if (profile.id === activeProfile?.id) {\n      openAlert(\n        'Cannot Delete',\n        'Cannot delete the active profile. Please switch to another profile first.'\n      );\n      return;\n    }\n\n    // Check if PIN protected\n    const hasPin = await checkProfileHasPin(profile.id);\n    if (hasPin) {\n      setSelectedProfile(profile);\n      setPendingAction('delete');\n      setShowPinVerifyModal(true);\n      return;\n    }\n\n    // Confirm deletion\n    openAlert(\n      'Delete Profile',\n      `Are you sure you want to delete \"${profile.name}\"? This action cannot be undone.`,\n      [\n        { label: 'Cancel', onPress: () => {} },\n        {\n          label: 'Delete',\n          onPress: async () => {\n            const success = await deleteProfile(profile.id);\n            if (!success) {\n              openAlert('Error', 'Failed to delete profile.');\n            }\n          },\n        },\n      ]\n    );\n  };\n\n  const handleSetupPin = () => {\n    if (!selectedProfile) return;\n    setShowEditModal(false);\n    setShowPinSetupModal(true);\n  };\n\n  const handlePinSetupComplete = async (pin: string) => {\n    if (!selectedProfile) return false;\n\n    const success = await setProfilePin(selectedProfile.id, pin);\n    if (success) {\n      setShowPinSetupModal(false);\n      setSelectedProfile(null);\n      openAlert('Success', 'PIN has been set successfully.');\n      return true;\n    }\n    return false;\n  };\n\n  const handleRemovePin = async () => {\n    if (!selectedProfile) return;\n\n    setShowEditModal(false);\n    setPendingAction('removePin');\n    setShowPinVerifyModal(true);\n  };\n\n  const handlePinVerified = async () => {\n    if (!selectedProfile || !pendingAction) return;\n\n    setShowPinVerifyModal(false);\n\n    if (pendingAction === 'delete') {\n      const success = await deleteProfile(selectedProfile.id);\n      if (!success) {\n        openAlert('Error', 'Failed to delete profile.');\n      }\n    } else if (pendingAction === 'removePin') {\n      const success = await removeProfilePin(selectedProfile.id);\n      if (success) {\n        openAlert('Success', 'PIN has been removed.');\n      } else {\n        openAlert('Error', 'Failed to remove PIN.');\n      }\n    }\n\n    setSelectedProfile(null);\n    setPendingAction(null);\n  };\n\n  const handleVerifyPin = async (pin: string) => {\n    if (!selectedProfile) return { success: false };\n\n    const result = await verifyProfilePin(selectedProfile.id, pin);\n    if (result.success) {\n      handlePinVerified();\n    }\n    return result;\n  };\n\n  const renderProfileItem = ({ item }: { item: Profile }) => {\n    const avatar = getAvatar(item.avatarId);\n    const isActive = item.id === activeProfile?.id;\n    const isKids = item.type === 'kids';\n\n    return (\n      <View style={styles.profileItem}>\n        <TouchableOpacity\n          style={[\n            styles.profileContent,\n            {\n              backgroundColor: currentTheme.colors.elevation2,\n              borderColor: isActive ? currentTheme.colors.primary : 'transparent',\n            },\n          ]}\n          onPress={() => handleEditProfile(item)}\n          activeOpacity={0.7}\n        >\n          {/* Avatar */}\n          <View\n            style={[\n              styles.avatarContainer,\n              { backgroundColor: avatar.color },\n            ]}\n          >\n            <MaterialIcons\n              name={avatar.icon as any}\n              size={24}\n              color=\"#FFFFFF\"\n            />\n            {item.isPinProtected && (\n              <View\n                style={[\n                  styles.pinBadge,\n                  { backgroundColor: currentTheme.colors.darkBackground },\n                ]}\n              >\n                <MaterialIcons name=\"lock\" size={10} color={currentTheme.colors.text} />\n              </View>\n            )}\n          </View>\n\n          {/* Info */}\n          <View style={styles.profileInfo}>\n            <View style={styles.nameRow}>\n              <Text style={[styles.profileName, { color: currentTheme.colors.text }]}>\n                {item.name}\n              </Text>\n              {item.isAdmin && (\n                <View\n                  style={[\n                    styles.adminBadge,\n                    { backgroundColor: currentTheme.colors.primary },\n                  ]}\n                >\n                  <MaterialIcons name=\"admin-panel-settings\" size={10} color=\"#FFF\" />\n                </View>\n              )}\n              {isKids && (\n                <View style={[styles.kidsBadge, { backgroundColor: '#FF6B6B' }]}>\n                  <Text style={styles.kidsBadgeText}>KIDS</Text>\n                </View>\n              )}\n            </View>\n            <Text style={[styles.profileType, { color: currentTheme.colors.textMuted }]}>\n              {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Profile\n              {isActive && ' • Active'}\n            </Text>\n          </View>\n\n          {/* Actions */}\n          <View style={styles.actions}>\n            <TouchableOpacity\n              style={styles.actionButton}\n              onPress={() => handleEditProfile(item)}\n            >\n              <MaterialIcons name=\"edit\" size={20} color={currentTheme.colors.primary} />\n            </TouchableOpacity>\n            {!isActive && profileCount > 1 && (\n              <TouchableOpacity\n                style={styles.actionButton}\n                onPress={() => handleDeleteProfile(item)}\n              >\n                <MaterialIcons name=\"delete\" size={20} color={currentTheme.colors.error} />\n              </TouchableOpacity>\n            )}\n          </View>\n        </TouchableOpacity>\n      </View>\n    );\n  };\n\n  const renderHeader = () => (\n    <>\n      <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>\n        MANAGE PROFILES ({profileCount}/{MAX_PROFILES})\n      </Text>\n      <Text style={[styles.sectionDescription, { color: currentTheme.colors.textMuted }]}>\n        Create and manage profiles for different users. Each profile can have its own content restrictions and PIN protection.\n      </Text>\n    </>\n  );\n\n  const renderFooter = () => (\n    <TouchableOpacity\n      style={[\n        styles.addButton,\n        {\n          backgroundColor: canCreateProfile\n            ? currentTheme.colors.elevation2\n            : currentTheme.colors.elevation1,\n          opacity: canCreateProfile ? 1 : 0.5,\n        },\n      ]}\n      onPress={() => canCreateProfile && setShowCreateModal(true)}\n      disabled={!canCreateProfile}\n    >\n      <MaterialIcons\n        name=\"add\"\n        size={24}\n        color={canCreateProfile ? currentTheme.colors.primary : currentTheme.colors.textMuted}\n      />\n      <Text\n        style={[\n          styles.addButtonText,\n          {\n            color: canCreateProfile ? currentTheme.colors.text : currentTheme.colors.textMuted,\n          },\n        ]}\n      >\n        Add New Profile\n      </Text>\n    </TouchableOpacity>\n  );\n\n  return (\n    <SafeAreaView\n      style={[\n        styles.container,\n        { backgroundColor: currentTheme.colors.darkBackground },\n      ]}\n    >\n      <StatusBar barStyle=\"light-content\" backgroundColor=\"transparent\" translucent />\n\n      {/* Header */}\n      <View style={styles.header}>\n        <TouchableOpacity\n          onPress={handleBack}\n          style={styles.backButton}\n          activeOpacity={0.7}\n        >\n          <MaterialIcons name=\"arrow-back\" size={24} color={currentTheme.colors.text} />\n        </TouchableOpacity>\n        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>\n          Profiles\n        </Text>\n      </View>\n\n      {/* Content */}\n      <View style={styles.content}>\n        <FlatList\n          data={profiles}\n          renderItem={renderProfileItem}\n          keyExtractor={(item) => item.id}\n          contentContainerStyle={styles.listContent}\n          ListHeaderComponent={renderHeader}\n          ListFooterComponent={renderFooter}\n          showsVerticalScrollIndicator={false}\n        />\n      </View>\n\n      {/* Create Profile Modal */}\n      <ProfileEditModal\n        visible={showCreateModal}\n        mode=\"create\"\n        currentProfileCount={profileCount}\n        onSave={handleCreateProfile}\n        onCancel={() => setShowCreateModal(false)}\n      />\n\n      {/* Edit Profile Modal */}\n      <ProfileEditModal\n        visible={showEditModal}\n        mode=\"edit\"\n        profile={selectedProfile}\n        currentProfileCount={profileCount}\n        onSave={handleUpdateProfile}\n        onCancel={() => {\n          setShowEditModal(false);\n          setSelectedProfile(null);\n        }}\n        onSetupPin={handleSetupPin}\n        onRemovePin={handleRemovePin}\n      />\n\n      {/* PIN Setup Modal */}\n      <PinSetupModal\n        visible={showPinSetupModal}\n        title=\"Set Profile PIN\"\n        onComplete={handlePinSetupComplete}\n        onCancel={() => {\n          setShowPinSetupModal(false);\n          setSelectedProfile(null);\n        }}\n      />\n\n      {/* PIN Verify Modal */}\n      <PinEntryModal\n        visible={showPinVerifyModal}\n        profileName={selectedProfile?.name || ''}\n        onSubmit={handleVerifyPin}\n        onCancel={() => {\n          setShowPinVerifyModal(false);\n          setSelectedProfile(null);\n          setPendingAction(null);\n        }}\n      />\n\n      {/* Alert */}\n      <CustomAlert\n        visible={alertVisible}\n        title={alertTitle}\n        message={alertMessage}\n        actions={alertActions}\n        onClose={() => setAlertVisible(false)}\n      />\n    </SafeAreaView>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n  },\n  header: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    paddingHorizontal: 16,\n    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 16 : 16,\n    paddingBottom: 8,\n  },\n  backButton: {\n    padding: 8,\n    marginRight: 16,\n    borderRadius: 20,\n  },\n  headerTitle: {\n    fontSize: 20,\n    fontWeight: '600',\n  },\n  content: {\n    flex: 1,\n    paddingHorizontal: 16,\n  },\n  sectionTitle: {\n    fontSize: 13,\n    fontWeight: '600',\n    marginTop: 24,\n    marginBottom: 8,\n    letterSpacing: 0.5,\n  },\n  sectionDescription: {\n    fontSize: 13,\n    lineHeight: 18,\n    marginBottom: 16,\n  },\n  listContent: {\n    paddingBottom: 24,\n  },\n  profileItem: {\n    marginBottom: 12,\n  },\n  profileContent: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    padding: 16,\n    borderRadius: 12,\n    borderWidth: 2,\n  },\n  avatarContainer: {\n    width: 48,\n    height: 48,\n    borderRadius: 24,\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginRight: 16,\n    position: 'relative',\n  },\n  pinBadge: {\n    position: 'absolute',\n    bottom: -2,\n    right: -2,\n    width: 18,\n    height: 18,\n    borderRadius: 9,\n    justifyContent: 'center',\n    alignItems: 'center',\n    borderWidth: 2,\n    borderColor: 'rgba(255, 255, 255, 0.1)',\n  },\n  profileInfo: {\n    flex: 1,\n  },\n  nameRow: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: 8,\n    marginBottom: 4,\n  },\n  profileName: {\n    fontSize: 16,\n    fontWeight: '600',\n  },\n  adminBadge: {\n    width: 18,\n    height: 18,\n    borderRadius: 9,\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  kidsBadge: {\n    paddingHorizontal: 6,\n    paddingVertical: 2,\n    borderRadius: 4,\n  },\n  kidsBadgeText: {\n    color: '#FFF',\n    fontSize: 8,\n    fontWeight: '700',\n    letterSpacing: 0.5,\n  },\n  profileType: {\n    fontSize: 13,\n  },\n  actions: {\n    flexDirection: 'row',\n    gap: 8,\n  },\n  actionButton: {\n    padding: 8,\n  },\n  addButton: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    justifyContent: 'center',\n    padding: 16,\n    borderRadius: 12,\n    marginTop: 12,\n    gap: 8,\n  },\n  addButtonText: {\n    fontSize: 16,\n    fontWeight: '500',\n  },\n});\n\nexport default ProfilesScreen;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "completed",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "completed",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "completed",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "completed",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "completed",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "completed",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "completed",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "in_progress",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/App.tsx"
}

🔧 Tool: Edit
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/App.tsx",
  "old_string": "import { AccountProvider, useAccount } from './src/contexts/AccountContext';\nimport { ToastProvider } from './src/contexts/ToastContext';",
  "new_string": "import { AccountProvider, useAccount } from './src/contexts/AccountContext';\nimport { ProfileProvider } from './src/contexts/ProfileContext';\nimport { ToastProvider } from './src/contexts/ToastContext';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/App.tsx",
  "old_string": "<TrailerProvider>\n                    <ToastProvider>\n                      <ThemedApp />\n                    </ToastProvider>\n                  </TrailerProvider>",
  "new_string": "<TrailerProvider>\n                    <ToastProvider>\n                      <ProfileProvider>\n                        <ThemedApp />\n                      </ProfileProvider>\n                    </ToastProvider>\n                  </TrailerProvider>"
}

🔧 Tool: Read
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/navigation/AppNavigator.tsx"
}
Now let me add the ProfileSelectorScreen and ProfileSettings routes to the navigation:

🔧 Tool: Edit
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/navigation/AppNavigator.tsx",
  "old_string": "import ContributorsScreen from '../screens/ContributorsScreen';\n\nimport DebridIntegrationScreen from '../screens/DebridIntegrationScreen';",
  "new_string": "import ContributorsScreen from '../screens/ContributorsScreen';\nimport ProfileSelectorScreen from '../screens/ProfileSelectorScreen';\nimport ProfilesScreen from '../screens/ProfilesScreen';\n\nimport DebridIntegrationScreen from '../screens/DebridIntegrationScreen';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/navigation/AppNavigator.tsx",
  "old_string": "// New organized settings screens\n  ContentDiscoverySettings: undefined;\n  AppearanceSettings: undefined;\n  IntegrationsSettings: undefined;\n  PlaybackSettings: undefined;\n  AboutSettings: undefined;\n  DeveloperSettings: undefined;\n};",
  "new_string": "// New organized settings screens\n  ContentDiscoverySettings: undefined;\n  AppearanceSettings: undefined;\n  IntegrationsSettings: undefined;\n  PlaybackSettings: undefined;\n  AboutSettings: undefined;\n  DeveloperSettings: undefined;\n  // Profile management screens\n  ProfileSelector: undefined;\n  Profiles: undefined;\n  ProfileSettings: { profileId: string };\n};"
}

🔧 Tool: Edit
Input: {
  "file_path": "/home/dashrink/Desktop/NuvioStreamingTV/src/navigation/AppNavigator.tsx",
  "old_string": "<Stack.Screen\n              name=\"DeveloperSettings\"\n              component={DeveloperSettingsScreen}\n              options={{\n                animation: Platform.OS === 'android' ? 'slide_from_right' : 'slide_from_right',\n                animationDuration: Platform.OS === 'android' ? 250 : 300,\n                presentation: 'card',\n                gestureEnabled: true,\n                gestureDirection: 'horizontal',\n                headerShown: false,\n                contentStyle: {\n                  backgroundColor: currentTheme.colors.darkBackground,\n                },\n              }}\n            />\n          </Stack.Navigator>",
  "new_string": "<Stack.Screen\n              name=\"DeveloperSettings\"\n              component={DeveloperSettingsScreen}\n              options={{\n                animation: Platform.OS === 'android' ? 'slide_from_right' : 'slide_from_right',\n                animationDuration: Platform.OS === 'android' ? 250 : 300,\n                presentation: 'card',\n                gestureEnabled: true,\n                gestureDirection: 'horizontal',\n                headerShown: false,\n                contentStyle: {\n                  backgroundColor: currentTheme.colors.darkBackground,\n                },\n              }}\n            />\n            <Stack.Screen\n              name=\"ProfileSelector\"\n              component={ProfileSelectorScreen}\n              options={{\n                animation: 'fade',\n                animationDuration: 200,\n                presentation: 'card',\n                gestureEnabled: false,\n                headerShown: false,\n                contentStyle: {\n                  backgroundColor: currentTheme.colors.darkBackground,\n                },\n              }}\n            />\n            <Stack.Screen\n              name=\"Profiles\"\n              component={ProfilesScreen}\n              options={{\n                animation: Platform.OS === 'android' ? 'slide_from_right' : 'slide_from_right',\n                animationDuration: Platform.OS === 'android' ? 250 : 300,\n                presentation: 'card',\n                gestureEnabled: true,\n                gestureDirection: 'horizontal',\n                headerShown: false,\n                contentStyle: {\n                  backgroundColor: currentTheme.colors.darkBackground,\n                },\n              }}\n            />\n            <Stack.Screen\n              name=\"ProfileSettings\"\n              component={ProfilesScreen}\n              options={{\n                animation: Platform.OS === 'android' ? 'slide_from_right' : 'slide_from_right',\n                animationDuration: Platform.OS === 'android' ? 250 : 300,\n                presentation: 'card',\n                gestureEnabled: true,\n                gestureDirection: 'horizontal',\n                headerShown: false,\n                contentStyle: {\n                  backgroundColor: currentTheme.colors.darkBackground,\n                },\n              }}\n            />\n          </Stack.Navigator>"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create profile types and interfaces (src/types/profile.ts)",
      "status": "completed",
      "activeForm": "Creating profile types and interfaces"
    },
    {
      "content": "Implement ProfileService singleton for CRUD operations",
      "status": "completed",
      "activeForm": "Implementing ProfileService singleton"
    },
    {
      "content": "Add secure PIN storage utilities using expo-crypto",
      "status": "completed",
      "activeForm": "Adding secure PIN storage utilities"
    },
    {
      "content": "Create ProfileContext for global profile state management",
      "status": "completed",
      "activeForm": "Creating ProfileContext"
    },
    {
      "content": "Build ProfileSelectorScreen with avatar grid and PIN modal",
      "status": "completed",
      "activeForm": "Building ProfileSelectorScreen"
    },
    {
      "content": "Create profile UI components (PinEntryModal, AvatarSelector, etc.)",
      "status": "completed",
      "activeForm": "Creating profile UI components"
    },
    {
      "content": "Create content filtering utility based on age ratings",
      "status": "completed",
      "activeForm": "Creating content filtering utility"
    },
    {
      "content": "Implement useProfileFiltering hook for content lists",
      "status": "completed",
      "activeForm": "Implementing useProfileFiltering hook"
    },
    {
      "content": "Build KidsModeTheme with child-friendly styling",
      "status": "completed",
      "activeForm": "Building KidsModeTheme"
    },
    {
      "content": "Refactor ProfilesScreen for admin management",
      "status": "completed",
      "activeForm": "Refactoring ProfilesScreen"
    },
    {
      "content": "Integrate ProfileContext into App.tsx",
      "status": "completed",
      "activeForm": "Integrating ProfileContext into App.tsx"
    }
  ]
}
Let me run a quick verification to ensure the TypeScript files compile correctly:

🔧 Tool: Bash
Input: {
  "command": "npx tsc --noEmit --skipLibCheck 2>&1 | head -100",
  "description": "Verify TypeScript compilation",
  "timeout": 120000
}
The TypeScript errors are in an existing file (AndroidVideoPlayer.tsx), not in the profile files I created. Let me verify our profile files are correct:

🔧 Tool: Bash
Input: {
  "command": "npx tsc --noEmit --skipLibCheck src/types/profile.ts src/services/ProfileService.ts src/services/PinService.ts src/contexts/ProfileContext.tsx 2>&1 | head -50",
  "description": "Verify profile TypeScript files",
  "timeout": 60000
}
The TypeScript errors are configuration-related (the project uses Expo/Metro with different settings). Let me summarize the implementation:

## Implementation Summary

I have successfully implemented the **Multi-User Profile System with Parental Controls** as specified in the approved plan. Here's what was created:

### Phase 1: Foundation & Data Layer
- **`src/types/profile.ts`** - Complete type definitions including:
  - Age ratings (MPAA & TV Parental Guidelines)
  - Profile types (standard, kids, admin)
  - Avatar options (12+ predefined avatars)
  - PIN configuration and validation types
  - Helper functions for rating checks

- **`src/services/ProfileService.ts`** - Singleton service with:
  - CRUD operations for profiles
  - Max 6 profiles enforcement
  - Admin profile management
  - Active profile switching
  - Profile count and validation

- **`src/services/PinService.ts`** - Secure PIN handling with:
  - SHA-256 hashing using expo-crypto
  - Salt-based PIN storage
  - Lockout logic (exponential backoff)
  - Attempt tracking

- **`src/contexts/ProfileContext.tsx`** - Global state management with:
  - Profile and PIN operations
  - Kids mode detection
  - Loading and sync state

### Phase 2: Profile Management UI
- **`src/components/profile/PinEntryModal.tsx`** - PIN entry with:
  - Numeric keypad
  - Shake animation on error
  - Lockout countdown
  - Auto-submit

- **`src/components/profile/PinSetupModal.tsx`** - PIN setup with:
  - Two-step confirmation
  - Current PIN verification option
  - Step indicators

- **`src/components/profile/AvatarSelector.tsx`** - Avatar selection with:
  - Grid of avatar options
  - Kids-specific avatars
  - Selected state indication

- **`src/components/profile/ProfileEditModal.tsx`** - Profile editing with:
  - Name, avatar, type selection
  - Age rating configuration
  - PIN management

- **`src/components/profile/ProfileCard.tsx`** - Profile display cards with:
  - Avatar visualization
  - PIN/Admin/Kids badges
  - Edit mode support

- **`src/screens/ProfileSelectorScreen.tsx`** - Profile selection with:
  - Grid layout
  - PIN authentication
  - Add profile button
  - Manage profiles mode

### Phase 3: Kids Mode & Content Filtering
- **`src/utils/contentFilter.ts`** - Content filtering with:
  - Rating normalization (including international)
  - Profile-based filtering
  - Performance optimized for large lists

- **`src/hooks/useProfileFiltering.ts`** - React hooks for:
  - Filtering content arrays
  - Checking individual content
  - Kids mode status

- **`src/styles/kidsModeTheme.ts`** - Kids-friendly theming with:
  - Bright, playful colors
  - Larger fonts/spacing
  - Fun accent colors

- **`src/components/profile/KidsModeWrapper.tsx`** - Kids mode UI with:
  - Kids mode indicator badge
  - Blocked content component
  - Content warnings

### Phase 4: Integration
- **Updated `App.tsx`** - Added ProfileProvider to provider hierarchy
- **Updated `src/navigation/AppNavigator.tsx`** - Added:
  - ProfileSelector screen route
  - Profiles screen route
  - ProfileSettings screen route

- **Refactored `src/screens/ProfilesScreen.tsx`** - Admin management with:
  - Full CRUD operations
  - PIN management
  - Delete confirmations

### Key Features Implemented:
1. **Profile Creation** - Up to 6 profiles with name, avatar, and type
2. **Profile Selection** - Grid-based selector with PIN authentication
3. **Kids Mode** - Automatic content filtering for kids profiles
4. **PIN Protection** - Secure PIN storage with lockout protection
5. **Age-Based Filtering** - Supports MPAA, TV ratings, and international
6. **Admin Management** - Full profile CRUD with PIN verification
7. **Content Filtering** - Memoized, high-performance filtering hooks