/**
 * Profile Types and Interfaces
 * Multi-User Profile System with Parental Controls
 */

// Age ratings supported by the content filtering system
export type AgeRating =
  // Movie ratings (MPAA)
  | 'G'
  | 'PG'
  | 'PG-13'
  | 'R'
  | 'NC-17'
  // TV ratings (TV Parental Guidelines)
  | 'TV-Y'
  | 'TV-Y7'
  | 'TV-G'
  | 'TV-PG'
  | 'TV-14'
  | 'TV-MA'
  // Unrated content
  | 'NR'
  | 'UNRATED';

// Age rating levels for filtering (lower = more restrictive)
export const AGE_RATING_LEVELS: Record<AgeRating, number> = {
  'TV-Y': 1,
  G: 1,
  'TV-Y7': 2,
  'TV-G': 2,
  PG: 3,
  'TV-PG': 3,
  'PG-13': 4,
  'TV-14': 4,
  R: 5,
  'TV-MA': 5,
  'NC-17': 6,
  NR: 6,
  UNRATED: 6,
};

// Kids mode allowed ratings (G, PG, TV-Y, TV-Y7, TV-G, TV-PG)
export const KIDS_MODE_ALLOWED_RATINGS: AgeRating[] = ['G', 'PG', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG'];

// Teen mode allowed ratings (up to PG-13 / TV-14)
export const TEEN_MODE_ALLOWED_RATINGS: AgeRating[] = [
  'G',
  'PG',
  'PG-13',
  'TV-Y',
  'TV-Y7',
  'TV-G',
  'TV-PG',
  'TV-14',
];

// Profile type enumeration
export type ProfileType = 'standard' | 'kids' | 'teen' | 'admin';

// Avatar options available for profile selection
export interface AvatarOption {
  id: string;
  name: string;
  icon: string; // MaterialIcons icon name
  color: string;
}

// Predefined avatar options
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'avatar_1', name: 'Person', icon: 'person', color: '#2d9cdb' },
  { id: 'avatar_2', name: 'Star', icon: 'star', color: '#f39c12' },
  { id: 'avatar_3', name: 'Heart', icon: 'favorite', color: '#e74c3c' },
  { id: 'avatar_4', name: 'Music', icon: 'music-note', color: '#9b59b6' },
  { id: 'avatar_5', name: 'Sports', icon: 'sports-soccer', color: '#2ecc71' },
  { id: 'avatar_6', name: 'Gaming', icon: 'sports-esports', color: '#00bcd4' },
  { id: 'avatar_7', name: 'Pet', icon: 'pets', color: '#ff9800' },
  { id: 'avatar_8', name: 'Nature', icon: 'eco', color: '#4caf50' },
  { id: 'avatar_9', name: 'Space', icon: 'rocket-launch', color: '#3f51b5' },
  { id: 'avatar_10', name: 'Art', icon: 'palette', color: '#e91e63' },
  { id: 'avatar_11', name: 'Robot', icon: 'smart-toy', color: '#607d8b' },
  { id: 'avatar_12', name: 'Crown', icon: 'emoji-events', color: '#ffc107' },
];

// Kids-specific avatar options with child-friendly colors
export const KIDS_AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'kids_1', name: 'Teddy', icon: 'child-care', color: '#ff9ff3' },
  { id: 'kids_2', name: 'Dino', icon: 'pest-control-rodent', color: '#54a0ff' },
  { id: 'kids_3', name: 'Bunny', icon: 'cruelty-free', color: '#ff6b6b' },
  { id: 'kids_4', name: 'Rocket', icon: 'rocket', color: '#5f27cd' },
  { id: 'kids_5', name: 'Star', icon: 'auto-awesome', color: '#feca57' },
  { id: 'kids_6', name: 'Rainbow', icon: 'wb-sunny', color: '#ff9f43' },
];

// Teen-specific avatar options
export const TEEN_AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'teen_1', name: 'Gamer', icon: 'sports-esports', color: '#6366f1' },
  { id: 'teen_2', name: 'Music', icon: 'headphones', color: '#ec4899' },
  { id: 'teen_3', name: 'Sports', icon: 'sports-basketball', color: '#f97316' },
  { id: 'teen_4', name: 'Tech', icon: 'computer', color: '#14b8a6' },
  { id: 'teen_5', name: 'Art', icon: 'brush', color: '#a855f7' },
  { id: 'teen_6', name: 'Explorer', icon: 'explore', color: '#3b82f6' },
];

// Profile interface
export interface Profile {
  id: string;
  name: string;
  type: ProfileType;
  avatarId: string;
  maxAgeRating: AgeRating;
  isPinProtected: boolean;
  isAdmin: boolean;
  createdAt: number;
  updatedAt: number;
  // Preferences per profile
  preferences: ProfilePreferences;
}

// Profile preferences that can be customized per profile
export interface ProfilePreferences {
  // UI preferences
  autoplayEnabled: boolean;
  autoplayNextEpisode: boolean;
  // Content preferences (for personalization)
  preferredGenres: string[];
  // Language preferences
  preferredSubtitleLanguage: string;
  preferredAudioLanguage: string;
}

// Default preferences for new profiles
export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  autoplayEnabled: true,
  autoplayNextEpisode: true,
  preferredGenres: [],
  preferredSubtitleLanguage: 'en',
  preferredAudioLanguage: 'en',
};

// Default preferences for kids profiles
export const DEFAULT_KIDS_PREFERENCES: ProfilePreferences = {
  autoplayEnabled: false, // Require explicit play for kids
  autoplayNextEpisode: false,
  preferredGenres: ['animation', 'family', 'comedy'],
  preferredSubtitleLanguage: 'en',
  preferredAudioLanguage: 'en',
};

// Default preferences for teen profiles
export const DEFAULT_TEEN_PREFERENCES: ProfilePreferences = {
  autoplayEnabled: true,
  autoplayNextEpisode: true,
  preferredGenres: [],
  preferredSubtitleLanguage: 'en',
  preferredAudioLanguage: 'en',
};

// PIN-related types
export interface PinAttemptInfo {
  attempts: number;
  lockedUntil: number | null; // Timestamp when lockout expires
  lastAttemptAt: number;
}

// PIN lockout configuration
export const PIN_CONFIG = {
  maxAttempts: 3,
  lockoutDurations: [30000, 60000, 300000], // 30s, 1min, 5min (exponential backoff)
  pinMinLength: 4,
  pinMaxLength: 6,
};

// Age rating bounds for profile types (admin can configure within these bounds)
export const PROFILE_AGE_RATING_BOUNDS: Record<
  ProfileType,
  { min: AgeRating; max: AgeRating; default: AgeRating }
> = {
  kids: { min: 'G', max: 'TV-PG', default: 'TV-PG' },
  teen: { min: 'PG', max: 'R', default: 'TV-14' },
  standard: { min: 'G', max: 'NC-17', default: 'NC-17' },
  admin: { min: 'G', max: 'NC-17', default: 'NC-17' },
};

// Profile creation input
export interface CreateProfileInput {
  name: string;
  type: ProfileType;
  avatarId: string;
  maxAgeRating?: AgeRating;
  pin?: string;
}

// Profile update input
export interface UpdateProfileInput {
  name?: string;
  avatarId?: string;
  maxAgeRating?: AgeRating;
  preferences?: Partial<ProfilePreferences>;
}

// Profile sync state
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

export interface ProfileSyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingChanges: number;
  errorMessage?: string;
}

// Storage keys for profile data
export const PROFILE_STORAGE_KEYS = {
  profiles: '@profiles:list',
  activeProfileId: '@profiles:active',
  pinHashes: '@profiles:pins', // Stored securely
  pinAttempts: '@profiles:pin_attempts',
  syncQueue: '@profiles:sync_queue',
  lastSync: '@profiles:last_sync',
  masterPin: '@profiles:master_pin', // Master PIN for recovery
};

// Maximum number of profiles allowed
export const MAX_PROFILES = 6;

// Helper function to get default max age rating based on profile type
export function getDefaultMaxAgeRating(type: ProfileType): AgeRating {
  return PROFILE_AGE_RATING_BOUNDS[type].default;
}

// Helper function to get age rating bounds for a profile type
export function getAgeRatingBounds(type: ProfileType): { min: AgeRating; max: AgeRating } {
  return PROFILE_AGE_RATING_BOUNDS[type];
}

// Helper function to check if an age rating is within bounds for a profile type
export function isAgeRatingWithinBounds(rating: AgeRating, type: ProfileType): boolean {
  const bounds = PROFILE_AGE_RATING_BOUNDS[type];
  const ratingLevel = AGE_RATING_LEVELS[rating];
  const minLevel = AGE_RATING_LEVELS[bounds.min];
  const maxLevel = AGE_RATING_LEVELS[bounds.max];
  return ratingLevel >= minLevel && ratingLevel <= maxLevel;
}

// Helper function to check if a rating is allowed for a profile
export function isRatingAllowedForProfile(
  contentRating: AgeRating | string | undefined,
  profile: Profile
): boolean {
  if (!contentRating) return true; // Allow unrated content unless it's a kids profile

  const rating = contentRating as AgeRating;
  const contentLevel = AGE_RATING_LEVELS[rating];
  const profileMaxLevel = AGE_RATING_LEVELS[profile.maxAgeRating];

  if (contentLevel === undefined) {
    // Unknown rating - block for kids/teen, allow for others
    return profile.type !== 'kids' && profile.type !== 'teen';
  }

  return contentLevel <= profileMaxLevel;
}

// Helper function to check if profile is in kids mode
export function isKidsProfile(profile: Profile | null): boolean {
  return profile?.type === 'kids';
}

// Helper function to check if profile is a teen profile
export function isTeenProfile(profile: Profile | null): boolean {
  return profile?.type === 'teen';
}

// Helper function to check if profile is a restricted profile (kids or teen)
export function isRestrictedProfile(profile: Profile | null): boolean {
  return profile?.type === 'kids' || profile?.type === 'teen';
}

// Get all avatar options for a profile type
export function getAvatarOptionsForType(type: ProfileType): AvatarOption[] {
  switch (type) {
    case 'kids':
      return [...KIDS_AVATAR_OPTIONS, ...AVATAR_OPTIONS];
    case 'teen':
      return [...TEEN_AVATAR_OPTIONS, ...AVATAR_OPTIONS];
    default:
      return AVATAR_OPTIONS;
  }
}
