/**
 * Content Filtering Utility
 * Filters content based on profile age rating settings
 */

import {
  Profile,
  AgeRating,
  AGE_RATING_LEVELS,
  KIDS_MODE_ALLOWED_RATINGS,
  isRatingAllowedForProfile,
  isKidsProfile,
} from '../types/profile';

// Common rating aliases and mappings
const RATING_ALIASES: Record<string, AgeRating> = {
  // Movie ratings
  'g': 'G',
  'pg': 'PG',
  'pg-13': 'PG-13',
  'pg13': 'PG-13',
  'r': 'R',
  'nc-17': 'NC-17',
  'nc17': 'NC-17',
  'x': 'NC-17',
  // TV ratings
  'tv-y': 'TV-Y',
  'tvy': 'TV-Y',
  'tv-y7': 'TV-Y7',
  'tvy7': 'TV-Y7',
  'tv-g': 'TV-G',
  'tvg': 'TV-G',
  'tv-pg': 'TV-PG',
  'tvpg': 'TV-PG',
  'tv-14': 'TV-14',
  'tv14': 'TV-14',
  'tv-ma': 'TV-MA',
  'tvma': 'TV-MA',
  // Unrated
  'nr': 'NR',
  'unrated': 'UNRATED',
  'not rated': 'NR',
  'not-rated': 'NR',
  // International ratings (common mappings)
  'u': 'G', // UK
  '12': 'PG-13',
  '12a': 'PG-13', // UK
  '15': 'R', // UK
  '18': 'NC-17', // UK
  'fsk 0': 'G', // Germany
  'fsk 6': 'PG',
  'fsk 12': 'PG-13',
  'fsk 16': 'R',
  'fsk 18': 'NC-17',
};

/**
 * Normalize a rating string to our standard AgeRating type
 */
export function normalizeRating(rating: string | undefined | null): AgeRating | null {
  if (!rating) return null;

  const normalized = rating.toLowerCase().trim();

  // Check direct match
  if (AGE_RATING_LEVELS[rating as AgeRating] !== undefined) {
    return rating as AgeRating;
  }

  // Check aliases
  if (RATING_ALIASES[normalized]) {
    return RATING_ALIASES[normalized];
  }

  // Try to extract a known rating from the string
  for (const [alias, mappedRating] of Object.entries(RATING_ALIASES)) {
    if (normalized.includes(alias)) {
      return mappedRating;
    }
  }

  return null;
}

/**
 * Get the age rating level for a given rating
 * Returns a high number for unknown ratings (treated as mature)
 */
export function getRatingLevel(rating: string | undefined | null): number {
  const normalized = normalizeRating(rating);
  if (!normalized) {
    return 100; // Unknown ratings treated as most restrictive for kids
  }
  return AGE_RATING_LEVELS[normalized] ?? 100;
}

/**
 * Check if a content item is allowed for a profile
 */
export function isContentAllowed<T extends { certification?: string; rating?: string }>(
  content: T,
  profile: Profile | null
): boolean {
  // No profile = allow everything (not logged in state)
  if (!profile) return true;

  // Get the rating from the content
  const rating = content.certification || content.rating;
  const normalizedRating = normalizeRating(rating);

  // If no rating found
  if (!normalizedRating) {
    // Kids profiles block unknown ratings
    if (isKidsProfile(profile)) {
      return false;
    }
    // Other profiles allow unknown ratings
    return true;
  }

  return isRatingAllowedForProfile(normalizedRating, profile);
}

/**
 * Filter an array of content items based on profile settings
 * Optimized for performance with large arrays
 */
export function filterContentForProfile<T extends { certification?: string; rating?: string }>(
  content: T[],
  profile: Profile | null
): T[] {
  // No profile = return all content
  if (!profile) return content;

  // Use a pre-computed max level for faster comparisons
  const maxLevel = AGE_RATING_LEVELS[profile.maxAgeRating];
  const isKids = isKidsProfile(profile);

  return content.filter((item) => {
    const rating = item.certification || item.rating;
    const normalizedRating = normalizeRating(rating);

    // Handle unknown ratings
    if (!normalizedRating) {
      return !isKids; // Block for kids, allow for others
    }

    const itemLevel = AGE_RATING_LEVELS[normalizedRating];
    if (itemLevel === undefined) {
      return !isKids;
    }

    return itemLevel <= maxLevel;
  });
}

/**
 * Get a display label for the profile's content restriction
 */
export function getContentRestrictionLabel(profile: Profile | null): string {
  if (!profile) return 'All Content';

  if (isKidsProfile(profile)) {
    return 'Kids Only';
  }

  const rating = profile.maxAgeRating;
  switch (rating) {
    case 'TV-Y':
    case 'G':
      return 'All Ages';
    case 'TV-Y7':
      return 'Ages 7+';
    case 'TV-G':
    case 'PG':
      return 'General Audience';
    case 'TV-PG':
      return 'Parental Guidance';
    case 'TV-14':
    case 'PG-13':
      return 'Teen (13+)';
    case 'R':
    case 'TV-MA':
      return 'Mature (17+)';
    case 'NC-17':
      return 'Adults Only (18+)';
    default:
      return 'All Content';
  }
}

/**
 * Check if content should show a warning for the current profile
 */
export function shouldShowContentWarning<T extends { certification?: string; rating?: string }>(
  content: T,
  profile: Profile | null
): boolean {
  if (!profile) return false;

  const rating = content.certification || content.rating;
  const normalizedRating = normalizeRating(rating);
  if (!normalizedRating) return false;

  const contentLevel = AGE_RATING_LEVELS[normalizedRating] ?? 0;
  const profileLevel = AGE_RATING_LEVELS[profile.maxAgeRating] ?? 100;

  // Show warning if content is within 1 level of the max
  return contentLevel === profileLevel && contentLevel >= 4;
}

/**
 * Get filtered content with statistics
 */
export function getFilteredContentStats<T extends { certification?: string; rating?: string }>(
  content: T[],
  profile: Profile | null
): {
  filtered: T[];
  totalCount: number;
  filteredCount: number;
  blockedCount: number;
} {
  const filtered = filterContentForProfile(content, profile);
  return {
    filtered,
    totalCount: content.length,
    filteredCount: filtered.length,
    blockedCount: content.length - filtered.length,
  };
}

/**
 * Create a content filter function for a specific profile
 * Useful for memoization and repeated filtering
 */
export function createContentFilter<T extends { certification?: string; rating?: string }>(
  profile: Profile | null
): (content: T[]) => T[] {
  if (!profile) {
    return (content) => content;
  }

  const maxLevel = AGE_RATING_LEVELS[profile.maxAgeRating];
  const isKids = isKidsProfile(profile);

  return (content: T[]) => {
    return content.filter((item) => {
      const rating = item.certification || item.rating;
      const normalizedRating = normalizeRating(rating);

      if (!normalizedRating) {
        return !isKids;
      }

      const itemLevel = AGE_RATING_LEVELS[normalizedRating];
      if (itemLevel === undefined) {
        return !isKids;
      }

      return itemLevel <= maxLevel;
    });
  };
}

/**
 * Sort content by age rating level (least restrictive first)
 */
export function sortContentByRating<T extends { certification?: string; rating?: string }>(
  content: T[],
  ascending = true
): T[] {
  return [...content].sort((a, b) => {
    const levelA = getRatingLevel(a.certification || a.rating);
    const levelB = getRatingLevel(b.certification || b.rating);
    return ascending ? levelA - levelB : levelB - levelA;
  });
}

export default {
  normalizeRating,
  getRatingLevel,
  isContentAllowed,
  filterContentForProfile,
  getContentRestrictionLabel,
  shouldShowContentWarning,
  getFilteredContentStats,
  createContentFilter,
  sortContentByRating,
};
