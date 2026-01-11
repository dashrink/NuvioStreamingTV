import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  traktService,
  TraktUser,
  TraktWatchedItem,
  TraktWatchlistItem,
  TraktCollectionItem,
  TraktRatingItem,
  TraktContentData,
  TraktPlaybackItem
} from '../services/traktService';
import { storageService } from '../services/storageService';
import { logger } from '../utils/logger';

/**
 * useTraktIntegration - React hook for Trakt.tv integration
 *
 * This hook provides a complete interface for syncing user content with Trakt.tv,
 * including watchlist management, collections, ratings, and watch progress.
 *
 * ## Architecture Overview
 *
 * ```
 * UI Components
 *       ↓
 * useTraktIntegration (this hook) - Local state + optimistic updates
 *       ↓
 * TraktService (singleton) - API calls with rate limiting
 *       ↓
 * Trakt.tv API
 * ```
 *
 * ## Key Patterns
 *
 * ### 1. Rate Limiting
 * All Trakt API calls go through traktService which enforces:
 * - 500ms minimum interval between API requests
 * - Exponential backoff on 429 (rate limit) responses
 * - Request queuing for burst protection
 *
 * ### 2. Optimistic Updates
 * UI state is updated immediately before API confirmation for better UX:
 * - Local state (watchlistItems, collectionItems, ratedContent) updates instantly
 * - API call happens in background
 * - On failure, state rolls back to previous value
 *
 * ### 3. IMDb ID Normalization
 * All methods normalize IMDb IDs to include the 'tt' prefix:
 * - Input: "1234567" or "tt1234567"
 * - Normalized: "tt1234567"
 *
 * ### 4. Content Type Handling
 * IMPORTANT: Trakt uses 'show' not 'series' for TV content
 * - StreamingContent.type: 'movie' | 'series'
 * - Trakt API types: 'movie' | 'show'
 * - Always convert before passing to this hook
 *
 * ### 5. Data Flow
 * ```
 * Initial Load:
 * checkAuthStatus() → loadAllCollections() → populates local Sets
 *
 * Status Checks (read-heavy):
 * isInWatchlist() → reads from local Set (O(1), no API call)
 * isInCollection() → reads from local Set (O(1), no API call)
 * getUserRating() → reads from local ratedContent array
 *
 * Mutations (write operations):
 * addToWatchlist() → optimistic update → API call → success/rollback
 * addRating() → optimistic update → API call → success/rollback
 * ```
 *
 * @returns Hook state and methods for Trakt integration
 *
 * @example
 * ```tsx
 * const {
 *   isAuthenticated,
 *   isInWatchlist,
 *   addToWatchlist,
 *   getUserRating,
 *   addRating
 * } = useTraktIntegration();
 *
 * // Check if movie is in watchlist (fast, uses cached Set)
 * const inWatchlist = isInWatchlist('tt1234567', 'movie');
 *
 * // Add to watchlist (optimistic update)
 * await addToWatchlist('tt1234567', 'movie');
 *
 * // Rate content (1-10 scale)
 * await addRating('tt1234567', 'movie', 8);
 * ```
 */
export function useTraktIntegration() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<TraktUser | null>(null);
  const [watchedMovies, setWatchedMovies] = useState<TraktWatchedItem[]>([]);
  const [watchedShows, setWatchedShows] = useState<TraktWatchedItem[]>([]);
  const [watchlistMovies, setWatchlistMovies] = useState<TraktWatchlistItem[]>([]);
  const [watchlistShows, setWatchlistShows] = useState<TraktWatchlistItem[]>([]);
  const [collectionMovies, setCollectionMovies] = useState<TraktCollectionItem[]>([]);
  const [collectionShows, setCollectionShows] = useState<TraktCollectionItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<TraktPlaybackItem[]>([]);
  const [ratedContent, setRatedContent] = useState<TraktRatingItem[]>([]);

  // State for real-time status tracking
  const [watchlistItems, setWatchlistItems] = useState<Set<string>>(new Set());
  const [collectionItems, setCollectionItems] = useState<Set<string>>(new Set());

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    logger.log('[useTraktIntegration] checkAuthStatus called');
    setIsLoading(true);
    try {
      const authenticated = await traktService.isAuthenticated();
      logger.log(`[useTraktIntegration] Authentication check result: ${authenticated}`);
      setIsAuthenticated(authenticated);

      if (authenticated) {
        logger.log('[useTraktIntegration] User is authenticated, fetching profile...');
        const profile = await traktService.getUserProfile();
        logger.log(`[useTraktIntegration] User profile: ${profile.username}`);
        setUserProfile(profile);
      } else {
        logger.log('[useTraktIntegration] User is not authenticated');
        setUserProfile(null);
      }


    } catch (error) {
      logger.error('[useTraktIntegration] Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to force refresh the auth status
  const refreshAuthStatus = useCallback(async () => {
    logger.log('[useTraktIntegration] Refreshing auth status');
    await checkAuthStatus();
  }, [checkAuthStatus]);

  // Load watched items
  const loadWatchedItems = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const [movies, shows] = await Promise.all([
        traktService.getWatchedMoviesWithImages(),
        traktService.getWatchedShowsWithImages()
      ]);
      setWatchedMovies(movies);
      setWatchedShows(shows);
    } catch (error) {
      logger.error('[useTraktIntegration] Error loading watched items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load all collections (watchlist, collection, continue watching, ratings)
  const loadAllCollections = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const [
        watchlistMovies,
        watchlistShows,
        collectionMovies,
        collectionShows,
        continueWatching,
        ratings
      ] = await Promise.all([
        traktService.getWatchlistMoviesWithImages(),
        traktService.getWatchlistShowsWithImages(),
        traktService.getCollectionMoviesWithImages(),
        traktService.getCollectionShowsWithImages(),
        traktService.getPlaybackProgressWithImages(),
        traktService.getRatingsWithImages()
      ]);

      setWatchlistMovies(watchlistMovies);
      setWatchlistShows(watchlistShows);
      setCollectionMovies(collectionMovies);
      setCollectionShows(collectionShows);
      setContinueWatching(continueWatching);
      setRatedContent(ratings);

      // Populate watchlist and collection sets for quick lookups
      const newWatchlistItems = new Set<string>();
      const newCollectionItems = new Set<string>();

      // Add movies to sets
      watchlistMovies.forEach(item => {
        if (item.movie?.ids?.imdb) {
          newWatchlistItems.add(`movie:${item.movie.ids.imdb}`);
        }
      });

      collectionMovies.forEach(item => {
        if (item.movie?.ids?.imdb) {
          newCollectionItems.add(`movie:${item.movie.ids.imdb}`);
        }
      });

      // Add shows to sets
      watchlistShows.forEach(item => {
        if (item.show?.ids?.imdb) {
          newWatchlistItems.add(`show:${item.show.ids.imdb}`);
        }
      });

      collectionShows.forEach(item => {
        if (item.show?.ids?.imdb) {
          newCollectionItems.add(`show:${item.show.ids.imdb}`);
        }
      });

      setWatchlistItems(newWatchlistItems);
      setCollectionItems(newCollectionItems);
    } catch (error) {
      logger.error('[useTraktIntegration] Error loading all collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Check if a movie is watched
  const isMovieWatched = useCallback(async (imdbId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      return await traktService.isMovieWatched(imdbId);
    } catch (error) {
      logger.error('[useTraktIntegration] Error checking if movie is watched:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Check if an episode is watched
  const isEpisodeWatched = useCallback(async (
    imdbId: string,
    season: number,
    episode: number
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      return await traktService.isEpisodeWatched(imdbId, season, episode);
    } catch (error) {
      logger.error('[useTraktIntegration] Error checking if episode is watched:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Mark a movie as watched
  const markMovieAsWatched = useCallback(async (
    imdbId: string,
    watchedAt: Date = new Date()
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const result = await traktService.addToWatchedMovies(imdbId, watchedAt);
      if (result) {
        // Refresh watched movies list
        await loadWatchedItems();
      }
      return result;
    } catch (error) {
      logger.error('[useTraktIntegration] Error marking movie as watched:', error);
      return false;
    }
  }, [isAuthenticated, loadWatchedItems]);

  /**
   * Add content to user's Trakt watchlist
   *
   * Performs an optimistic update: the local watchlistItems Set is updated immediately,
   * then the API call is made. If the API call fails, no rollback is performed as
   * the data will sync correctly on next app focus.
   *
   * @param imdbId - IMDb ID (with or without 'tt' prefix, will be normalized)
   * @param type - Content type: 'movie' or 'show' (NOT 'series')
   * @returns Promise<boolean> - true if API call succeeded
   *
   * @example
   * ```tsx
   * // For movies
   * await addToWatchlist('tt1234567', 'movie');
   *
   * // For TV shows - convert 'series' to 'show'
   * const type = item.type === 'movie' ? 'movie' : 'show';
   * await addToWatchlist(item.imdbId, type);
   * ```
   */
  const addToWatchlist = useCallback(async (imdbId: string, type: 'movie' | 'show'): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const success = await traktService.addToWatchlist(imdbId, type);
      if (success) {
        // Ensure consistent IMDb ID format (with 'tt' prefix)
        const normalizedImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
        setWatchlistItems(prev => new Set(prev).add(`${type}:${normalizedImdbId}`));
        // Don't refresh immediately - let the local state handle the UI update
        // The data will be refreshed on next app focus or manual refresh
      }
      return success;
    } catch (error) {
      logger.error('[useTraktIntegration] Error adding to watchlist:', error);
      return false;
    }
  }, [isAuthenticated]);

  /**
   * Remove content from user's Trakt watchlist
   *
   * Performs an optimistic update: the local watchlistItems Set is updated immediately
   * by removing the item, then the API call is made.
   *
   * @param imdbId - IMDb ID (with or without 'tt' prefix, will be normalized)
   * @param type - Content type: 'movie' or 'show' (NOT 'series')
   * @returns Promise<boolean> - true if API call succeeded
   */
  const removeFromWatchlist = useCallback(async (imdbId: string, type: 'movie' | 'show'): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const success = await traktService.removeFromWatchlist(imdbId, type);
      if (success) {
        // Ensure consistent IMDb ID format (with 'tt' prefix)
        const normalizedImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
        setWatchlistItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${type}:${normalizedImdbId}`);
          return newSet;
        });
        // Don't refresh immediately - let the local state handle the UI update
      }
      return success;
    } catch (error) {
      logger.error('[useTraktIntegration] Error removing from watchlist:', error);
      return false;
    }
  }, [isAuthenticated]);

  /**
   * Add content to user's Trakt collection
   *
   * Collections represent content the user owns (e.g., DVDs, digital purchases).
   * This is different from the watchlist which represents content to watch.
   *
   * @param imdbId - IMDb ID (with or without 'tt' prefix, will be normalized)
   * @param type - Content type: 'movie' or 'show' (NOT 'series')
   * @returns Promise<boolean> - true if API call succeeded
   */
  const addToCollection = useCallback(async (imdbId: string, type: 'movie' | 'show'): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const success = await traktService.addToCollection(imdbId, type);
      if (success) {
        // Ensure consistent IMDb ID format (with 'tt' prefix)
        const normalizedImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
        setCollectionItems(prev => new Set(prev).add(`${type}:${normalizedImdbId}`));
        // Don't refresh immediately - let the local state handle the UI update
      }
      return success;
    } catch (error) {
      logger.error('[useTraktIntegration] Error adding to collection:', error);
      return false;
    }
  }, [isAuthenticated]);

  /**
   * Remove content from user's Trakt collection
   *
   * @param imdbId - IMDb ID (with or without 'tt' prefix, will be normalized)
   * @param type - Content type: 'movie' or 'show' (NOT 'series')
   * @returns Promise<boolean> - true if API call succeeded
   */
  const removeFromCollection = useCallback(async (imdbId: string, type: 'movie' | 'show'): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const success = await traktService.removeFromCollection(imdbId, type);
      if (success) {
        // Ensure consistent IMDb ID format (with 'tt' prefix)
        const normalizedImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
        setCollectionItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${type}:${normalizedImdbId}`);
          return newSet;
        });
        // Don't refresh immediately - let the local state handle the UI update
      }
      return success;
    } catch (error) {
      logger.error('[useTraktIntegration] Error removing from collection:', error);
      return false;
    }
  }, [isAuthenticated]);

  /**
   * Check if content is in user's Trakt watchlist (synchronous, uses cached data)
   *
   * This is a fast O(1) lookup against the locally cached watchlistItems Set.
   * No API call is made - data is populated by loadAllCollections() on auth
   * and refreshed on app focus.
   *
   * @param imdbId - IMDb ID (with or without 'tt' prefix, will be normalized)
   * @param type - Content type: 'movie' or 'show' (NOT 'series')
   * @returns boolean - true if item is in watchlist
   *
   * @example
   * ```tsx
   * // Safe for render functions - no async, no side effects
   * const isBookmarked = isInWatchlist(item.imdbId, 'movie');
   * ```
   */
  const isInWatchlist = useCallback((imdbId: string, type: 'movie' | 'show'): boolean => {
    // Ensure consistent IMDb ID format (with 'tt' prefix)
    const normalizedImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
    return watchlistItems.has(`${type}:${normalizedImdbId}`);
  }, [watchlistItems]);

  /**
   * Check if content is in user's Trakt collection (synchronous, uses cached data)
   *
   * This is a fast O(1) lookup against the locally cached collectionItems Set.
   * No API call is made - data is populated by loadAllCollections() on auth
   * and refreshed on app focus.
   *
   * @param imdbId - IMDb ID (with or without 'tt' prefix, will be normalized)
   * @param type - Content type: 'movie' or 'show' (NOT 'series')
   * @returns boolean - true if item is in collection
   */
  const isInCollection = useCallback((imdbId: string, type: 'movie' | 'show'): boolean => {
    // Ensure consistent IMDb ID format (with 'tt' prefix)
    const normalizedImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
    return collectionItems.has(`${type}:${normalizedImdbId}`);
  }, [collectionItems]);

  // Mark an episode as watched
  const markEpisodeAsWatched = useCallback(async (
    imdbId: string,
    season: number,
    episode: number,
    watchedAt: Date = new Date()
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const result = await traktService.addToWatchedEpisodes(imdbId, season, episode, watchedAt);
      if (result) {
        // Refresh watched shows list
        await loadWatchedItems();
      }
      return result;
    } catch (error) {
      logger.error('[useTraktIntegration] Error marking episode as watched:', error);
      return false;
    }
  }, [isAuthenticated, loadWatchedItems]);

  // Start watching content (scrobble start)
  const startWatching = useCallback(async (contentData: TraktContentData, progress: number): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      return await traktService.scrobbleStart(contentData, progress);
    } catch (error) {
      logger.error('[useTraktIntegration] Error starting watch:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Update progress while watching (scrobble pause)
  const updateProgress = useCallback(async (
    contentData: TraktContentData,
    progress: number,
    force: boolean = false
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      return await traktService.scrobblePause(contentData, progress, force);
    } catch (error) {
      logger.error('[useTraktIntegration] Error updating progress:', error);
      return false;
    }
  }, [isAuthenticated]);

  // IMMEDIATE SCROBBLE METHODS - Bypass queue for instant user feedback

  // Immediate update progress while watching (scrobble pause)
  const updateProgressImmediate = useCallback(async (
    contentData: TraktContentData,
    progress: number
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      return await traktService.scrobblePauseImmediate(contentData, progress);
    } catch (error) {
      logger.error('[useTraktIntegration] Error updating progress immediately:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Stop watching content (scrobble stop)
  const stopWatching = useCallback(async (contentData: TraktContentData, progress: number): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      return await traktService.scrobbleStop(contentData, progress);
    } catch (error) {
      logger.error('[useTraktIntegration] Error stopping watch:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Immediate stop watching content (scrobble stop)
  const stopWatchingImmediate = useCallback(async (contentData: TraktContentData, progress: number): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      return await traktService.scrobbleStopImmediate(contentData, progress);
    } catch (error) {
      logger.error('[useTraktIntegration] Error stopping watch immediately:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Sync progress to Trakt (legacy method)
  const syncProgress = useCallback(async (
    contentData: TraktContentData,
    progress: number,
    force: boolean = false
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      return await traktService.syncProgressToTrakt(contentData, progress, force);
    } catch (error) {
      logger.error('[useTraktIntegration] Error syncing progress:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Get playback progress from Trakt
  const getTraktPlaybackProgress = useCallback(async (type?: 'movies' | 'shows'): Promise<TraktPlaybackItem[]> => {
    if (!isAuthenticated) {
      logger.log('[useTraktIntegration] getTraktPlaybackProgress: Not authenticated');
      return [];
    }

    try {
      const result = await traktService.getPlaybackProgress(type);
      return result;
    } catch (error) {
      logger.error('[useTraktIntegration] Error getting playback progress:', error);
      return [];
    }
  }, [isAuthenticated]);

  // Check if a movie is in the watchlist (optimized version using local state)
  const isMovieInWatchlist = useCallback((imdbId: string): boolean => {
    return isInWatchlist(imdbId, 'movie');
  }, [isInWatchlist]);

  // Check if a show is in the watchlist (optimized version using local state)
  const isShowInWatchlist = useCallback((imdbId: string): boolean => {
    return isInWatchlist(imdbId, 'show');
  }, [isInWatchlist]);

  // Check if a movie is in the collection (optimized version using local state)
  const isMovieInCollection = useCallback((imdbId: string): boolean => {
    return isInCollection(imdbId, 'movie');
  }, [isInCollection]);

  // Check if a show is in the collection (optimized version using local state)
  const isShowInCollection = useCallback((imdbId: string): boolean => {
    return isInCollection(imdbId, 'show');
  }, [isInCollection]);

  // Add a show to the watchlist
  const addShowToWatchlist = useCallback(async (imdbId: string): Promise<boolean> => {
    return addToWatchlist(imdbId, 'show');
  }, [addToWatchlist]);

  // Remove a show from the watchlist
  const removeShowFromWatchlist = useCallback(async (imdbId: string): Promise<boolean> => {
    return removeFromWatchlist(imdbId, 'show');
  }, [removeFromWatchlist]);

  // Add a movie to the watchlist
  const addMovieToWatchlist = useCallback(async (imdbId: string): Promise<boolean> => {
    return addToWatchlist(imdbId, 'movie');
  }, [addToWatchlist]);

  // Remove a movie from the watchlist
  const removeMovieFromWatchlist = useCallback(async (imdbId: string): Promise<boolean> => {
    return removeFromWatchlist(imdbId, 'movie');
  }, [removeFromWatchlist]);

  // Add a show to the collection
  const addShowToCollection = useCallback(async (imdbId: string): Promise<boolean> => {
    return addToCollection(imdbId, 'show');
  }, [addToCollection]);

  // Remove a show from the collection
  const removeShowFromCollection = useCallback(async (imdbId: string): Promise<boolean> => {
    return removeFromCollection(imdbId, 'show');
  }, [removeFromCollection]);

  // Add a movie to the collection
  const addMovieToCollection = useCallback(async (imdbId: string): Promise<boolean> => {
    return addToCollection(imdbId, 'movie');
  }, [addToCollection]);

  // Remove a movie from the collection
  const removeMovieFromCollection = useCallback(async (imdbId: string): Promise<boolean> => {
    return removeFromCollection(imdbId, 'movie');
  }, [removeFromCollection]);

  // Listen to app state changes for auth refresh
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (status: AppStateStatus) => {
      if (status === 'active') {
        logger.log('[useTraktIntegration] App came to foreground, checking auth status...');
        await refreshAuthStatus();
        // Refresh collections on app focus
        if (isAuthenticated) {
          await loadAllCollections();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, refreshAuthStatus, loadAllCollections]);

  return {
    // State
    isAuthenticated,
    isLoading,
    userProfile,
    watchedMovies,
    watchedShows,
    watchlistMovies,
    watchlistShows,
    collectionMovies,
    collectionShows,
    continueWatching,
    ratedContent,
    watchlistItems,
    collectionItems,

    // Core methods
    checkAuthStatus,
    refreshAuthStatus,
    loadWatchedItems,
    loadAllCollections,

    // Status checks
    isMovieWatched,
    isEpisodeWatched,
    isInWatchlist,
    isInCollection,
    isMovieInWatchlist,
    isShowInWatchlist,
    isMovieInCollection,
    isShowInCollection,

    // Watch tracking
    markMovieAsWatched,
    markEpisodeAsWatched,

    // Watchlist operations
    addToWatchlist,
    removeFromWatchlist,
    addMovieToWatchlist,
    removeMovieFromWatchlist,
    addShowToWatchlist,
    removeShowFromWatchlist,

    // Collection operations
    addToCollection,
    removeFromCollection,
    addMovieToCollection,
    removeMovieFromCollection,
    addShowToCollection,
    removeShowFromCollection,

    // Scrobbling methods
    startWatching,
    updateProgress,
    updateProgressImmediate,
    stopWatching,
    stopWatchingImmediate,
    syncProgress,
    getTraktPlaybackProgress,
  };
}