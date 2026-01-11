/**
 * useTrailerPlayback - Custom hook for trailer playback management
 *
 * Encapsulates all trailer-related logic including:
 * - Trailer URL fetching from TrailerService
 * - Preload/ready state management for smooth transitions
 * - Scroll-based pause/resume with configurable thresholds
 * - Focus management to prevent background playback
 * - Animation values for opacity transitions
 *
 * @example
 * const {
 *   trailerUrl,
 *   trailerReady,
 *   trailerPreloaded,
 *   trailerOpacity,
 *   thumbnailOpacity,
 *   trailerVideoRef,
 *   handleTrailerReady,
 *   handleTrailerError,
 *   handleTrailerEnd,
 *   handleFullscreenToggle,
 * } = useTrailerPlayback({
 *   metadata,
 *   tmdbId,
 *   type,
 *   scrollY,
 *   heroHeight,
 *   showTrailers: settings.showTrailers,
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { useTrailer } from '../../../../contexts/TrailerContext';
import { logger } from '../../../../utils/logger';
import TrailerService from '../../../../services/trailerService';
import { TRAILER_TIMING, SCROLL_THRESHOLDS } from '../constants';
import type { ContentType } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the useTrailerPlayback hook
 */
export interface UseTrailerPlaybackProps {
  /** Content metadata containing name, year, and optional tmdbId */
  metadata: {
    name?: string;
    year?: number;
    tmdbId?: number;
    id?: string;
    [key: string]: any;
  } | null;
  /** Optional TMDB ID for more accurate trailer lookup */
  tmdbId?: number | null;
  /** Content type: 'movie' or 'series' */
  type: ContentType;
  /** Shared value tracking scroll position */
  scrollY: SharedValue<number>;
  /** Shared value tracking hero section height */
  heroHeight: SharedValue<number>;
  /** Whether trailers are enabled in settings */
  showTrailers: boolean;
  /** Callback for watch progress opacity animation on trailer end */
  watchProgressOpacity?: SharedValue<number>;
  /** Callback for buttons opacity animation on trailer end */
  buttonsOpacity?: SharedValue<number>;
}

/**
 * Return type for the useTrailerPlayback hook
 */
export interface UseTrailerPlaybackReturn {
  // Trailer state
  /** The fetched trailer URL, or null if not loaded/available */
  trailerUrl: string | null;
  /** Whether trailer is currently being fetched */
  trailerLoading: boolean;
  /** Whether trailer fetch encountered an error */
  trailerError: boolean;
  /** Whether trailer is preloaded (loaded in hidden player) */
  trailerPreloaded: boolean;
  /** Whether trailer is ready to play (visible and playable) */
  trailerReady: boolean;

  // Animation values
  /** Shared value for trailer layer opacity (0 = hidden, 1 = visible) */
  trailerOpacity: SharedValue<number>;
  /** Shared value for thumbnail image opacity (inverse of trailer) */
  thumbnailOpacity: SharedValue<number>;
  /** Shared value for action buttons opacity during unmuted playback */
  actionButtonsOpacity: SharedValue<number>;
  /** Shared value for title card vertical offset during unmuted playback */
  titleCardTranslateY: SharedValue<number>;
  /** Shared value for genre text opacity during unmuted playback */
  genreOpacity: SharedValue<number>;

  // Refs
  /** Ref to the TrailerPlayer component for fullscreen control */
  trailerVideoRef: React.RefObject<any>;

  // Handlers
  /** Called when preload player finishes loading */
  handleTrailerPreloaded: () => void;
  /** Called when visible trailer is ready to play */
  handleTrailerReady: () => void;
  /** Called when trailer encounters an error */
  handleTrailerError: () => void;
  /** Called when trailer playback ends */
  handleTrailerEnd: () => Promise<void>;
  /** Called to toggle fullscreen mode */
  handleFullscreenToggle: () => Promise<void>;
  /** Resets trailer state (used when unfocused) */
  resetTrailerState: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTrailerPlayback({
  metadata,
  tmdbId,
  type,
  scrollY,
  heroHeight,
  showTrailers,
  watchProgressOpacity,
  buttonsOpacity,
}: UseTrailerPlaybackProps): UseTrailerPlaybackReturn {
  // Context
  const { isTrailerPlaying: globalTrailerPlaying, setTrailerPlaying } = useTrailer();
  const isFocused = useIsFocused();

  // Trailer state
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(false);
  const [trailerReady, setTrailerReady] = useState(false);
  const [trailerPreloaded, setTrailerPreloaded] = useState(false);

  // Refs
  const trailerVideoRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  // Guards to avoid repeated auto-starts
  const startedOnFocusRef = useRef(false);
  const startedOnReadyRef = useRef(false);

  // Animation shared values
  const trailerOpacity = useSharedValue(0);
  const thumbnailOpacity = useSharedValue(1);
  const actionButtonsOpacity = useSharedValue(1);
  const titleCardTranslateY = useSharedValue(0);
  const genreOpacity = useSharedValue(1);

  // Scroll-based pause/resume control shared values
  const pausedByScrollSV = useSharedValue(0);
  const scrollGuardEnabledSV = useSharedValue(0);
  const isPlayingSV = useSharedValue(0);
  const isFocusedSV = useSharedValue(0);

  // ---------------------------------------------------------------------------
  // Trailer URL Fetching
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let alive = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const fetchTrailer = async () => {
      if (!metadata?.name || !metadata?.year || !showTrailers || !isFocused) return;

      // If we expect TMDB ID but don't have it yet, wait
      if (!metadata?.tmdbId && metadata?.id?.startsWith('tmdb:')) {
        logger.info('useTrailerPlayback', `Waiting for TMDB ID for ${metadata.name}`);
        return;
      }

      setTrailerLoading(true);
      setTrailerError(false);
      setTrailerReady(false);
      setTrailerPreloaded(false);

      try {
        const fetchWithDelay = () => {
          const tmdbIdString = tmdbId ? String(tmdbId) : undefined;
          const contentType = type === 'series' ? 'tv' : 'movie';

          logger.info('useTrailerPlayback', `Trailer request for ${metadata.name}:`, {
            hasTmdbId: !!tmdbId,
            tmdbId,
            contentType,
            metadataId: metadata?.id,
          });

          TrailerService.getTrailerUrl(metadata.name, metadata.year, tmdbIdString, contentType)
            .then((url) => {
              if (!alive) return;
              if (url) {
                const bestUrl = TrailerService.getBestFormatUrl(url);
                setTrailerUrl(bestUrl);
                logger.info(
                  'useTrailerPlayback',
                  `Trailer URL loaded for ${metadata.name}${tmdbId ? ` (TMDB: ${tmdbId})` : ''}`
                );
              } else {
                logger.info('useTrailerPlayback', `No trailer found for ${metadata.name}`);
              }
            })
            .catch((error) => {
              if (!alive) return;
              logger.error('useTrailerPlayback', 'Error fetching trailer:', error);
              setTrailerError(true);
            })
            .finally(() => {
              if (alive) setTrailerLoading(false);
            });
        };

        // Delay trailer fetch to prevent blocking UI
        timerId = setTimeout(() => {
          if (!alive) return;
          fetchWithDelay();
        }, 100);
      } catch (error) {
        logger.error('useTrailerPlayback', 'Error in trailer fetch setup:', error);
        setTrailerError(true);
        setTrailerLoading(false);
      }
    };

    fetchTrailer();

    return () => {
      alive = false;
      if (timerId) {
        try {
          clearTimeout(timerId);
        } catch (_e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [metadata?.name, metadata?.year, tmdbId, showTrailers, isFocused, type, metadata?.id, metadata?.tmdbId]);

  // ---------------------------------------------------------------------------
  // Trailer Event Handlers
  // ---------------------------------------------------------------------------

  /** Handle trailer preload completion */
  const handleTrailerPreloaded = useCallback(() => {
    setTrailerPreloaded(true);
    logger.info('useTrailerPlayback', 'Trailer preloaded successfully');
  }, []);

  /** Handle smooth transition when trailer is ready to play */
  const handleTrailerReady = useCallback(() => {
    if (!isFocused) return;
    if (!trailerPreloaded) {
      setTrailerPreloaded(true);
    }
    setTrailerReady(true);

    // Smooth transition: fade out thumbnail, fade in trailer
    thumbnailOpacity.value = withTiming(0, { duration: TRAILER_TIMING.FADE_IN });
    trailerOpacity.value = withTiming(1, { duration: TRAILER_TIMING.FADE_IN });

    // Enable scroll guard after a brief delay to avoid immediate pause on entry
    scrollGuardEnabledSV.value = 0;
    setTimeout(() => {
      scrollGuardEnabledSV.value = 1;
    }, TRAILER_TIMING.UNMUTE_BUTTON_DELAY);
  }, [thumbnailOpacity, trailerOpacity, trailerPreloaded, isFocused, scrollGuardEnabledSV]);

  /** Handle trailer error - fade back to thumbnail */
  const handleTrailerError = useCallback(() => {
    setTrailerError(true);
    setTrailerReady(false);
    setTrailerPlaying(false);

    // Fade back to thumbnail
    trailerOpacity.value = withTiming(0, { duration: TRAILER_TIMING.FADE_OUT });
    thumbnailOpacity.value = withTiming(1, { duration: TRAILER_TIMING.FADE_OUT });
  }, [trailerOpacity, thumbnailOpacity, setTrailerPlaying]);

  /** Handle trailer end - seamless transition back to thumbnail */
  const handleTrailerEnd = useCallback(async () => {
    logger.info('useTrailerPlayback', 'Trailer ended - transitioning back to thumbnail');
    setTrailerPlaying(false);

    // Reset trailer state to prevent auto-restart
    setTrailerReady(false);
    setTrailerPreloaded(false);

    // If trailer is in fullscreen, dismiss it first
    try {
      if (trailerVideoRef.current) {
        await trailerVideoRef.current.dismissFullscreenPlayer();
        logger.info('useTrailerPlayback', 'Dismissed fullscreen player after trailer ended');
      }
    } catch (error) {
      logger.warn('useTrailerPlayback', 'Error dismissing fullscreen player:', error);
    }

    // Smooth fade transition: trailer out, thumbnail in
    trailerOpacity.value = withTiming(0, { duration: TRAILER_TIMING.FADE_IN });
    thumbnailOpacity.value = withTiming(1, { duration: TRAILER_TIMING.FADE_IN });

    // Show UI elements again
    actionButtonsOpacity.value = withTiming(1, { duration: TRAILER_TIMING.FADE_IN });
    genreOpacity.value = withTiming(1, { duration: TRAILER_TIMING.FADE_IN });
    titleCardTranslateY.value = withTiming(0, { duration: TRAILER_TIMING.FADE_IN });

    // Restore watch progress opacity if provided
    if (watchProgressOpacity) {
      watchProgressOpacity.value = withTiming(1, { duration: TRAILER_TIMING.FADE_IN });
    }
  }, [
    trailerOpacity,
    thumbnailOpacity,
    actionButtonsOpacity,
    genreOpacity,
    titleCardTranslateY,
    watchProgressOpacity,
    setTrailerPlaying,
  ]);

  /** Handle fullscreen toggle */
  const handleFullscreenToggle = useCallback(async () => {
    try {
      logger.info('useTrailerPlayback', 'Fullscreen button pressed');
      if (trailerVideoRef.current) {
        await trailerVideoRef.current.presentFullscreenPlayer();
      } else {
        logger.warn('useTrailerPlayback', 'Trailer video ref not available');
      }
    } catch (error) {
      logger.error('useTrailerPlayback', 'Error toggling fullscreen:', error);
    }
  }, []);

  /** Reset trailer state (used when screen loses focus) */
  const resetTrailerState = useCallback(() => {
    setTrailerReady(false);
    setTrailerPreloaded(false);
    setTrailerUrl(null);
    trailerOpacity.value = 0;
    thumbnailOpacity.value = 1;
  }, [trailerOpacity, thumbnailOpacity]);

  // ---------------------------------------------------------------------------
  // Auto-start Trailer When Ready
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (trailerReady && showTrailers && isFocused && !globalTrailerPlaying && !startedOnReadyRef.current) {
      // Check scroll position - only auto-start if user hasn't scrolled past the hero section
      try {
        const y = scrollY.value || 0;
        const pauseThreshold = heroHeight.value * SCROLL_THRESHOLDS.PAUSE_THRESHOLD;

        if (y < pauseThreshold) {
          startedOnReadyRef.current = true;
          logger.info('useTrailerPlayback', 'Trailer ready - auto-starting playback');
          setTrailerPlaying(true);
          isPlayingSV.value = 1;
        } else {
          logger.info('useTrailerPlayback', 'Trailer ready but user scrolled past - not auto-starting');
          startedOnReadyRef.current = true;
        }
      } catch (_e) {
        logger.info('useTrailerPlayback', 'Trailer ready but scroll position unavailable - not auto-starting');
        startedOnReadyRef.current = true;
      }
    }
  }, [trailerReady, showTrailers, isFocused, globalTrailerPlaying, setTrailerPlaying, scrollY, heroHeight, isPlayingSV]);

  // ---------------------------------------------------------------------------
  // App State Management (Prevent Background Playback)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        logger.info('useTrailerPlayback', 'App came to foreground');
        // Don't automatically resume trailer - let TrailerPlayer handle it
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - only pause if trailer is actually playing
        logger.info('useTrailerPlayback', 'App going to background - pausing operations');
        if (globalTrailerPlaying) {
          setTrailerPlaying(false);
        }
      }
      appState.current = nextAppState as typeof appState.current;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [setTrailerPlaying, globalTrailerPlaying]);

  // ---------------------------------------------------------------------------
  // Navigation Focus Effect
  // ---------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      logger.info('useTrailerPlayback', 'Screen focused');

      if (showTrailers) {
        setTimeout(() => {
          try {
            const y = scrollY.value || 0;
            const resumeThreshold = heroHeight.value * SCROLL_THRESHOLDS.RESUME_THRESHOLD;

            if (y < resumeThreshold && !startedOnFocusRef.current && isPlayingSV.value === 0) {
              setTrailerPlaying(true);
              isPlayingSV.value = 1;
              startedOnFocusRef.current = true;
            }
          } catch (_e) {
            if (!startedOnFocusRef.current && isPlayingSV.value === 0) {
              setTrailerPlaying(true);
              isPlayingSV.value = 1;
              startedOnFocusRef.current = true;
            }
          }
        }, 50);
      }

      return () => {
        // Stop trailer when leaving this screen to prevent background playback
        logger.info('useTrailerPlayback', 'Screen unfocused - stopping trailer playback');
        setTrailerPlaying(false);
        isPlayingSV.value = 0;
        startedOnFocusRef.current = false;
        startedOnReadyRef.current = false;
      };
    }, [setTrailerPlaying, showTrailers, scrollY, heroHeight, isPlayingSV])
  );

  // ---------------------------------------------------------------------------
  // Mirror States to Shared Values for Worklets
  // ---------------------------------------------------------------------------

  // Mirror playing state to shared value
  useEffect(() => {
    isPlayingSV.value = globalTrailerPlaying ? 1 : 0;
  }, [globalTrailerPlaying, isPlayingSV]);

  // Mirror focus state to shared value and enforce pause when unfocused
  useEffect(() => {
    isFocusedSV.value = isFocused ? 1 : 0;
    if (!isFocused) {
      // Ensure trailer is not playing when screen loses focus
      setTrailerPlaying(false);
      isPlayingSV.value = 0;
      startedOnFocusRef.current = false;
      startedOnReadyRef.current = false;
      // Also reset trailer state to prevent background start
      resetTrailerState();
    }
  }, [isFocused, setTrailerPlaying, isPlayingSV, resetTrailerState]);

  // ---------------------------------------------------------------------------
  // Scroll-based Pause/Resume (Worklet)
  // ---------------------------------------------------------------------------

  useDerivedValue(() => {
    'worklet';
    try {
      if (!scrollGuardEnabledSV.value || isFocusedSV.value === 0) return;

      // Calculate thresholds
      const pauseThreshold = heroHeight.value * SCROLL_THRESHOLDS.PAUSE_THRESHOLD;
      const resumeThreshold = heroHeight.value * SCROLL_THRESHOLDS.RESUME_THRESHOLD;
      const y = scrollY.value;
      const isPlaying = isPlayingSV.value === 1;
      const isPausedByScroll = pausedByScrollSV.value === 1;

      // Pause when scrolled past threshold
      if (y > pauseThreshold && isPlaying && !isPausedByScroll) {
        pausedByScrollSV.value = 1;
        runOnJS(setTrailerPlaying)(false);
        isPlayingSV.value = 0;
      }
      // Resume when scrolled back up
      else if (y < resumeThreshold && isPausedByScroll) {
        pausedByScrollSV.value = 0;
        runOnJS(setTrailerPlaying)(true);
        isPlayingSV.value = 1;
      }
    } catch (_e) {
      // Silent error handling for performance
    }
  });

  // ---------------------------------------------------------------------------
  // Cleanup on Unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      // Reset animation values on unmount to prevent memory leaks
      try {
        trailerOpacity.value = 0;
        thumbnailOpacity.value = 1;
        actionButtonsOpacity.value = 1;
        titleCardTranslateY.value = 0;
        genreOpacity.value = 1;
      } catch (error) {
        logger.error('useTrailerPlayback', 'Error cleaning up animation values:', error);
      }
    };
  }, [trailerOpacity, thumbnailOpacity, actionButtonsOpacity, titleCardTranslateY, genreOpacity]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Trailer state
    trailerUrl,
    trailerLoading,
    trailerError,
    trailerPreloaded,
    trailerReady,

    // Animation values
    trailerOpacity,
    thumbnailOpacity,
    actionButtonsOpacity,
    titleCardTranslateY,
    genreOpacity,

    // Refs
    trailerVideoRef,

    // Handlers
    handleTrailerPreloaded,
    handleTrailerReady,
    handleTrailerError,
    handleTrailerEnd,
    handleFullscreenToggle,
    resetTrailerState,
  };
}

export default useTrailerPlayback;
