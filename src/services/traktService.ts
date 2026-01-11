import { mmkvStorage } from './mmkvStorage';
import { AppState, AppStateStatus } from 'react-native';
import { logger } from '../utils/logger';

// Storage keys
export const TRAKT_ACCESS_TOKEN_KEY = 'trakt_access_token';
export const TRAKT_REFRESH_TOKEN_KEY = 'trakt_refresh_token';
export const TRAKT_TOKEN_EXPIRY_KEY = 'trakt_token_expiry';

// Trakt API configuration
const TRAKT_API_URL = 'https://api.trakt.tv';
const TRAKT_CLIENT_ID = process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID as string;
const TRAKT_CLIENT_SECRET = process.env.EXPO_PUBLIC_TRAKT_CLIENT_SECRET as string;
const TRAKT_REDIRECT_URI = process.env.EXPO_PUBLIC_TRAKT_REDIRECT_URI || 'nuvio://auth/trakt'; // Must match registered callback URL

if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
  throw new Error('Missing Trakt env vars. Set EXPO_PUBLIC_TRAKT_CLIENT_ID and EXPO_PUBLIC_TRAKT_CLIENT_SECRET');
}

// Types
export interface TraktUser {
  username: string;
  name?: string;
  private: boolean;
  vip: boolean;
  joined_at: string;
  avatar?: string;
}

export interface TraktWatchedItem {
  movie?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  show?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  plays: number;
  last_watched_at: string;
  last_updated_at?: string; // Timestamp for syncing - only re-process if newer
  reset_at?: string | null; // When user started re-watching - ignore episodes watched before this
  seasons?: {
    number: number;
    episodes: {
      number: number;
      plays: number;
      last_watched_at: string;
    }[];
  }[];
}

export interface TraktWatchlistItem {
  movie?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  show?: {
    title: string;
    year: number
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  listed_at: string;
}

export interface TraktCollectionItem {
  movie?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  show?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  collected_at: string;
}

export interface TraktRatingItem {
  movie?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  show?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  rating: number;
  rated_at: string;
}

export interface TraktImages {
  fanart?: string[];
  poster?: string[];
  logo?: string[];
  clearart?: string[];
  banner?: string[];
  thumb?: string[];
}

export interface TraktItemWithImages {
  title: string;
  year: number;
  ids: {
    trakt: number;
    slug: string;
    imdb: string;
    tmdb: number;
  };
  images?: TraktImages;
}

// New types for scrobbling
export interface TraktPlaybackItem {
  progress: number;
  paused_at: string;
  id: number;
  type: 'movie' | 'episode';
  movie?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
  episode?: {
    season: number;
    number: number;
    title: string;
    ids: {
      trakt: number;
      tvdb?: number;
      imdb?: string;
      tmdb?: number;
    };
    images?: TraktImages;
  };
  show?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      tvdb?: number;
      imdb: string;
      tmdb: number;
    };
    images?: TraktImages;
  };
}

export interface TraktScrobbleResponse {
  id: number;
  action: 'start' | 'pause' | 'scrobble' | 'conflict';
  progress: number;
  sharing?: {
    twitter?: boolean;
    mastodon?: boolean;
    tumblr?: boolean;
    facebook?: boolean;
  };
  movie?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
  };
  episode?: {
    season: number;
    number: number;
    title: string;
    ids: {
      trakt: number;
      tvdb?: number;
      imdb?: string;
      tmdb?: number;
    };
  };
  show?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      tvdb?: number;
      imdb: string;
      tmdb: number;
    };
  };
  // Additional field for 409 handling
  alreadyScrobbled?: boolean;
}

/**
 * Content data for Trakt scrobbling.
 * 
 * Required fields:
 * - type: 'movie' or 'episode'
 * - imdbId: A valid IMDb ID (with or without 'tt' prefix)
 * - title: Non-empty content title
 * 
 * Optional fields:
 * - year: Release year (must be valid if provided, e.g., 1800-current year+10)
 * - season/episode: Required for episode type
 * - showTitle/showYear/showImdbId: Show metadata for episodes
 */
export interface TraktContentData {
  type: 'movie' | 'episode';
  imdbId: string;
  title: string;
  /** Release year - optional as Trakt can often resolve content via IMDb ID alone */
  year?: number;
  season?: number;
  episode?: number;
  showTitle?: string;
  showYear?: number;
  showImdbId?: string;
}

export interface TraktHistoryItem {
  id: number;
  watched_at: string;
  action: 'scrobble' | 'checkin' | 'watch';
  type: 'movie' | 'episode';
  movie?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
  };
  episode?: {
    season: number;
    number: number;
    title: string;
    ids: {
      trakt: number;
      tvdb?: number;
      imdb?: string;
      tmdb?: number;
    };
  };
  show?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      tvdb?: number;
      imdb: string;
      tmdb: number;
    };
  };
}

export interface TraktHistoryRemovePayload {
  movies?: Array<{
    title?: string;
    year?: number;
    ids: {
      trakt?: number;
      slug?: string;
      imdb?: string;
      tmdb?: number;
    };
  }>;
  shows?: Array<{
    title?: string;
    year?: number;
    ids: {
      trakt?: number;
      slug?: string;
      tvdb?: number;
      imdb?: string;
      tmdb?: number;
    };
    seasons?: Array<{
      number: number;
      episodes?: Array<{
        number: number;
      }>;
    }>;
  }>;
  seasons?: Array<{
    ids: {
      trakt?: number;
      tvdb?: number;
      tmdb?: number;
    };
  }>;
  episodes?: Array<{
    ids: {
      trakt?: number;
      tvdb?: number;
      imdb?: string;
      tmdb?: number;
    };
  }>;
  ids?: number[];
}

export interface TraktHistoryRemoveResponse {
  deleted: {
    movies: number;
    episodes: number;
    shows?: number;
    seasons?: number;
  };
  not_found: {
    movies: Array<{
      ids: {
        imdb?: string;
        trakt?: number;
        tmdb?: number;
      };
    }>;
    shows: Array<{
      ids: {
        imdb?: string;
        trakt?: number;
        tvdb?: number;
        tmdb?: number;
      };
    }>;
    seasons: Array<{
      ids: {
        trakt?: number;
        tvdb?: number;
        tmdb?: number;
      };
    }>;
    episodes: Array<{
      ids: {
        trakt?: number;
        tvdb?: number;
        imdb?: string;
        tmdb?: number;
      };
    }>;
    ids: number[];
  };
}

// Comment types
export interface TraktComment {
  id: number;
  comment: string;
  spoiler: boolean;
  review: boolean;
  parent_id: number;
  created_at: string;
  updated_at: string;
  replies: number;
  likes: number;
  user_stats?: {
    rating?: number | null;
    play_count?: number;
    completed_count?: number;
  };
  user: {
    username: string;
    private: boolean;
    name?: string;
    vip: boolean;
    vip_ep: boolean;
    ids: {
      slug: string;
    };
  };
}

export interface TraktMovieComment {
  type: 'movie';
  movie: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
  };
  comment: TraktComment;
}

export interface TraktShowComment {
  type: 'show';
  show: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      tvdb?: number;
      imdb: string;
      tmdb: number;
    };
  };
  comment: TraktComment;
}

export interface TraktSeasonComment {
  type: 'season';
  season: {
    number: number;
    ids: {
      trakt: number;
      tvdb?: number;
      tmdb?: number;
    };
  };
  show: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      tvdb?: number;
      imdb: string;
      tmdb: number;
    };
  };
  comment: TraktComment;
}

export interface TraktEpisodeComment {
  type: 'episode';
  episode: {
    season: number;
    number: number;
    title: string;
    ids: {
      trakt: number;
      tvdb?: number;
      imdb?: string;
      tmdb?: number;
    };
  };
  show: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      tvdb?: number;
      imdb: string;
      tmdb: number;
    };
  };
  comment: TraktComment;
}

export interface TraktListComment {
  type: 'list';
  list: {
    name: string;
    description?: string;
    privacy: string;
    share_link?: string;
    display_numbers: boolean;
    allow_comments: boolean;
    updated_at: string;
    item_count: number;
    comment_count: number;
    likes: number;
    ids: {
      trakt: number;
      slug: string;
    };
  };
  comment: TraktComment;
}

// Simplified comment type based on actual API response
export interface TraktContentComment {
  id: number;
  comment: string;
  spoiler: boolean;
  review: boolean;
  parent_id: number;
  created_at: string;
  updated_at: string;
  replies: number;
  likes: number;
  language: string;
  user_rating?: number;
  user_stats?: {
    rating?: number;
    play_count?: number;
    completed_count?: number;
  };
  user: {
    username: string;
    private: boolean;
    deleted?: boolean;
    name?: string;
    vip: boolean;
    vip_ep: boolean;
    director?: boolean;
    ids: {
      slug: string;
    };
  };
}

// Keep the old types for backward compatibility if needed
export type TraktContentCommentLegacy =
  | TraktMovieComment
  | TraktShowComment
  | TraktSeasonComment
  | TraktEpisodeComment
  | TraktListComment;

const TRAKT_MAINTENANCE_MODE = false;
const TRAKT_MAINTENANCE_MESSAGE = 'Trakt integration is temporarily unavailable for maintenance. Please try again later.';

export class TraktService {
  private static instance: TraktService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private isInitialized: boolean = false;

  public isMaintenanceMode(): boolean {
    return TRAKT_MAINTENANCE_MODE;
  }

  public getMaintenanceMessage(): string {
    return TRAKT_MAINTENANCE_MESSAGE;
  }

  // Rate limiting - Optimized for real-time scrobbling
  private lastApiCall: number = 0;
  private readonly MIN_API_INTERVAL = 500; // Reduced to 500ms for faster updates
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;

  // Track items that have been successfully scrobbled to prevent duplicates
  private scrobbledItems: Set<string> = new Set();
  private readonly SCROBBLE_EXPIRY_MS = 46 * 60 * 1000; // 46 minutes (based on Trakt's expiry window)
  private scrobbledTimestamps: Map<string, number> = new Map();

  // Track currently watching sessions to avoid duplicate starts// Sync debouncing - Optimized for real-time updates
  private currentlyWatching: Set<string> = new Set();
  private lastSyncTimes: Map<string, number> = new Map();
  private readonly SYNC_DEBOUNCE_MS = 5000; // Reduced from 20000ms to 5000ms for real-time updates

  // Debounce for stop calls - Optimized for responsiveness
  private lastStopCalls: Map<string, number> = new Map();
  private readonly STOP_DEBOUNCE_MS = 1000; // Reduced from 3000ms to 1000ms for better responsiveness

  // Default completion threshold (overridden by user settings)
  private readonly DEFAULT_COMPLETION_THRESHOLD = 80; // 80%

  private constructor() {
    // Increased cleanup interval from 5 minutes to 15 minutes to reduce heating
    setInterval(() => this.cleanupOldStopCalls(), 15 * 60 * 1000); // Clean up every 15 minutes

    // Add AppState cleanup to reduce memory pressure
    AppState.addEventListener('change', this.handleAppStateChange);

    // Load user settings
    this.loadCompletionThreshold();
  }

  /**
   * Load user-configured completion threshold from AsyncStorage
   */
  private async loadCompletionThreshold(): Promise<void> {
    try {
      const thresholdStr = await mmkvStorage.getItem('@trakt_completion_threshold');
      if (thresholdStr) {
        const threshold = parseInt(thresholdStr, 10);
        if (!isNaN(threshold) && threshold >= 50 && threshold <= 100) {
          logger.log(`[TraktService] Loaded user completion threshold: ${threshold}%`);
          this.completionThreshold = threshold;
        }
      }
    } catch (error) {
      logger.error('[TraktService] Error loading completion threshold:', error);
    }
  }

  /**
   * Get the current completion threshold (user-configured or default)
   */
  public get completionThreshold(): number {
    return this._completionThreshold || this.DEFAULT_COMPLETION_THRESHOLD;
  }

  /**
   * Set the completion threshold
   */
  public set completionThreshold(value: number) {
    this._completionThreshold = value;
  }

  // Backing field for completion threshold
  private _completionThreshold: number | null = null;

  /**
   * Clean up old stop call records to prevent memory leaks
   */
  private cleanupOldStopCalls(): void {
    const now = Date.now();
    let cleanupCount = 0;

    // Remove stop calls older than the debounce window
    for (const [key, timestamp] of this.lastStopCalls.entries()) {
      if (now - timestamp > this.STOP_DEBOUNCE_MS) {
        this.lastStopCalls.delete(key);
        cleanupCount++;
      }
    }

    // Also clean up old scrobbled timestamps
    for (const [key, timestamp] of this.scrobbledTimestamps.entries()) {
      if (now - timestamp > this.SCROBBLE_EXPIRY_MS) {
        this.scrobbledTimestamps.delete(key);
        this.scrobbledItems.delete(key);
        cleanupCount++;
      }
    }

    // Clean up old sync times that haven't been updated in a while
    for (const [key, timestamp] of this.lastSyncTimes.entries()) {
      if (now - timestamp > 24 * 60 * 60 * 1000) { // 24 hours
        this.lastSyncTimes.delete(key);
        cleanupCount++;
      }
    }

    // Skip verbose cleanup logging to reduce CPU load
  }

  public static getInstance(): TraktService {
    if (!TraktService.instance) {
      TraktService.instance = new TraktService();
    }
    return TraktService.instance;
  }

  private handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'background') {
      this.cleanupOldStopCalls();
    }
  };
}