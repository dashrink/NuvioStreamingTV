/**
 * Shared constants for MDBList functionality.
 * This file exists to break the circular dependency between:
 * - RatingsSection.tsx
 * - MDBListSettingsScreen.tsx
 * - mdblistService.ts
 * - useMDBListRatings.ts
 */

import { mmkvStorage } from '../services/mmkvStorage';

// Storage keys
export const MDBLIST_API_KEY_STORAGE_KEY = 'mdblist_api_key';
export const RATING_PROVIDERS_STORAGE_KEY = 'rating_providers_config';
export const MDBLIST_ENABLED_STORAGE_KEY = 'mdblist_enabled';

// Rating providers configuration
export const RATING_PROVIDERS = {
  imdb: {
    name: 'IMDb',
    color: '#F5C518',
  },
  tmdb: {
    name: 'TMDB',
    color: '#01B4E4',
  },
  trakt: {
    name: 'Trakt',
    color: '#ED1C24',
  },
  letterboxd: {
    name: 'Letterboxd',
    color: '#00E054',
  },
  tomatoes: {
    name: 'Rotten Tomatoes',
    color: '#FA320A',
  },
  audience: {
    name: 'Audience Score',
    color: '#FA320A',
  },
  metacritic: {
    name: 'Metacritic',
    color: '#FFCC33',
  },
} as const;

// Function to check if MDBList is enabled
export async function isMDBListEnabled(): Promise<boolean> {
  try {
    const enabled = await mmkvStorage.getItem(MDBLIST_ENABLED_STORAGE_KEY);
    // Default to true if not set
    return enabled === null || enabled === 'true';
  } catch (error) {
    return true; // Default to enabled on error
  }
}

// Function to get MDBList API key if enabled
export async function getMDBListAPIKey(): Promise<string | null> {
  try {
    const enabled = await isMDBListEnabled();
    if (!enabled) {
      return null;
    }
    const apiKey = await mmkvStorage.getItem(MDBLIST_API_KEY_STORAGE_KEY);
    return apiKey;
  } catch (error) {
    return null;
  }
}
