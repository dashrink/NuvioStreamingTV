/**
 * WatchProgressDisplay Component
 *
 * Provides a progress bar display for watch history in the HeroSection, including:
 * - Progress bar with animated fill based on watch percentage
 * - Trakt integration with sync status indicators
 * - Completion celebrations with glow effects
 * - Glassmorphism styling with platform-specific blur effects
 * - Manual Trakt sync functionality
 *
 * Features:
 * - Platform-specific blur effects (iOS GlassView, expo-blur, Android fallback)
 * - Animated entrance/exit transitions
 * - Celebration animations for completed content
 * - Progress pulse effects for ongoing content
 * - Responsive layouts (phone vs tablet)
 * - Episode info display for series content
 *
 * @module HeroSection/components/WatchProgressDisplay
 */

import { MaterialIcons } from '@expo/vector-icons';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import { isLiquidGlassAvailable, getGlassViewComponent } from './GlassBlurBackground';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useTraktContext } from '../../../../contexts/TraktContext';
import { logger } from '../../../../utils/logger';
import { PROGRESS_TIMING, PROGRESS_THRESHOLDS, INITIAL_VALUES } from '../constants';
import { isTablet, screenWidth } from '../styles';

import type { WatchProgressDisplayProps, ProgressData } from '../types';

// Get GlassView component from shared utility
const GlassViewComp = getGlassViewComponent();
const liquidGlassAvailable = isLiquidGlassAvailable();

// =============================================================================
// Component
// =============================================================================

/**
 * Watch progress display component for HeroSection with Trakt integration.
 *
 * Renders a glassmorphic progress bar that adapts based on:
 * - Content type (movie vs series)
 * - Watch progress percentage
 * - Trakt authentication and sync status
 * - Device type (phone vs tablet sizing)
 *
 * @param props - Component props
 * @param props.watchProgress - Current watch progress data with Trakt info
 * @param props.type - Content type ('movie' or 'series')
 * @param props.getEpisodeDetails - Callback to get episode details for series
 * @param props.animatedStyle - Animated style for scroll-based animations
 * @param props.isWatched - Whether content has been fully watched
 * @param props.isTrailerPlaying - Whether trailer is currently playing
 * @param props.trailerMuted - Whether trailer audio is muted
 * @param props.trailerReady - Whether trailer is ready for playback
 *
 * @example
 * ```tsx
 * <WatchProgressDisplay
 *   watchProgress={watchProgress}
 *   type="movie"
 *   getEpisodeDetails={getEpisodeDetails}
 *   animatedStyle={progressAnimatedStyle}
 *   isWatched={false}
 *   isTrailerPlaying={false}
 *   trailerMuted={true}
 *   trailerReady={false}
 * />
 * ```
 */
const WatchProgressDisplay = memo(
  ({
    watchProgress,
    type,
    getEpisodeDetails,
    animatedStyle,
    isWatched,
    isTrailerPlaying,
    trailerMuted,
    trailerReady,
  }: WatchProgressDisplayProps) => {
    const { currentTheme } = useTheme();
    const { isAuthenticated: isTraktAuthenticated, forceSyncTraktProgress } = useTraktContext();

    // State to trigger refresh after manual sync
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Animated values for enhanced effects
    const completionGlow = useSharedValue(0);
    const celebrationScale = useSharedValue(1);
    const progressPulse = useSharedValue(1);
    const progressBoxOpacity = useSharedValue(0);
    const progressBoxScale = useSharedValue(INITIAL_VALUES.PROGRESS_BOX_SCALE);
    const progressBoxTranslateY = useSharedValue(INITIAL_VALUES.PROGRESS_BOX_TRANSLATE_Y);
    const syncRotation = useSharedValue(0);

    // =============================================================================
    // Sync Animation
    // =============================================================================

    /**
     * Animate the sync icon when syncing is in progress.
     */
    useEffect(() => {
      if (isSyncing) {
        syncRotation.value = withRepeat(
          withTiming(360, { duration: PROGRESS_TIMING.SYNC_ROTATION }),
          -1, // Infinite repeats
          false // No reverse
        );
      } else {
        syncRotation.value = 0;
      }
    }, [isSyncing, syncRotation]);

    // =============================================================================
    // Event Handlers
    // =============================================================================

    /**
     * Handle manual Trakt sync request.
     * Triggers sync and shows loading state during the operation.
     */
    const handleTraktSync = useCallback(async () => {
      if (isTraktAuthenticated && forceSyncTraktProgress) {
        logger.log('[WatchProgressDisplay] Manual Trakt sync requested');
        setIsSyncing(true);
        try {
          const success = await forceSyncTraktProgress();
          logger.log(
            `[WatchProgressDisplay] Manual Trakt sync ${success ? 'successful' : 'failed'}`
          );

          // Force component to re-render after a short delay to update sync status
          if (success) {
            setTimeout(() => {
              setRefreshTrigger(prev => prev + 1);
              setIsSyncing(false);
            }, 500);
          } else {
            setIsSyncing(false);
          }
        } catch (error) {
          logger.error('[WatchProgressDisplay] Manual Trakt sync error:', error);
          setIsSyncing(false);
        }
      }
    }, [isTraktAuthenticated, forceSyncTraktProgress]);

    // Sync rotation animation style
    const syncIconStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${syncRotation.value}deg` }],
    }));

    // =============================================================================
    // Progress Calculation
    // =============================================================================

    /**
     * Memoized progress calculation with Trakt integration.
     * Handles watched state, Trakt sync status, and progress display text.
     */
    const progressData = useMemo((): ProgressData | null => {
      // If content is fully watched, show watched status instead of progress
      if (isWatched) {
        let episodeInfo = '';
        if (type === 'series' && watchProgress?.episodeId) {
          const details = getEpisodeDetails(watchProgress.episodeId);
          if (details) {
            episodeInfo = ` \u2022 S${details.seasonNumber}:E${details.episodeNumber}${details.episodeName ? ` - ${details.episodeName}` : ''}`;
          }
        }

        const watchedDate = watchProgress?.lastUpdated
          ? new Date(watchProgress.lastUpdated).toLocaleDateString('en-US')
          : new Date().toLocaleDateString('en-US');

        // Determine if watched via Trakt or local
        const watchedViaTrakt =
          isTraktAuthenticated &&
          watchProgress?.traktProgress !== undefined &&
          watchProgress.traktProgress >= PROGRESS_THRESHOLDS.TRAKT_WATCHED;

        return {
          progressPercent: 100,
          formattedTime: watchedDate,
          episodeInfo,
          displayText: watchedViaTrakt ? 'Watched on Trakt' : 'Watched',
          syncStatus: isTraktAuthenticated && watchProgress?.traktSynced ? '' : '', // Clean look for watched
          isTraktSynced: Boolean(watchProgress?.traktSynced && isTraktAuthenticated),
          isWatched: true,
        };
      }

      if (!watchProgress || watchProgress.duration === 0) return null;

      // Determine which progress to show - prioritize Trakt if available and authenticated
      let progressPercent: number;
      let isUsingTraktProgress = false;

      if (isTraktAuthenticated && watchProgress.traktProgress !== undefined) {
        progressPercent = watchProgress.traktProgress;
        isUsingTraktProgress = true;
      } else {
        progressPercent = (watchProgress.currentTime / watchProgress.duration) * 100;
      }
      const formattedTime = new Date(watchProgress.lastUpdated).toLocaleDateString('en-US');
      let episodeInfo = '';

      if (type === 'series' && watchProgress.episodeId) {
        const details = getEpisodeDetails(watchProgress.episodeId);
        if (details) {
          episodeInfo = ` \u2022 S${details.seasonNumber}:E${details.episodeNumber}${details.episodeName ? ` - ${details.episodeName}` : ''}`;
        }
      }

      // Enhanced display text with Trakt integration
      let displayText =
        progressPercent >= PROGRESS_THRESHOLDS.LOCAL_WATCHED
          ? 'Watched'
          : `${Math.round(progressPercent)}% watched`;
      let syncStatus = '';

      // Show Trakt sync status if user is authenticated
      if (isTraktAuthenticated) {
        if (isUsingTraktProgress) {
          syncStatus = ' \u2022 Using Trakt progress';
          if (watchProgress.traktSynced) {
            syncStatus = ' \u2022 Synced with Trakt';
          }
        } else if (watchProgress.traktSynced) {
          syncStatus = ' \u2022 Synced with Trakt';
          // If we have specific Trakt progress that differs from local, mention it
          if (
            watchProgress.traktProgress !== undefined &&
            Math.abs(progressPercent - watchProgress.traktProgress) > 5
          ) {
            displayText = `${Math.round(progressPercent)}% watched (${Math.round(watchProgress.traktProgress)}% on Trakt)`;
          }
        } else {
          // Do not show "Sync pending" label anymore; leave status empty.
          syncStatus = '';
        }
      }

      return {
        progressPercent,
        formattedTime,
        episodeInfo,
        displayText,
        syncStatus,
        isTraktSynced: Boolean(watchProgress.traktSynced && isTraktAuthenticated),
        isWatched: false,
      };
    }, [watchProgress, type, getEpisodeDetails, isTraktAuthenticated, isWatched, refreshTrigger]);

    // =============================================================================
    // Appearance Animations
    // =============================================================================

    /**
     * Trigger appearance and completion animations based on progress data.
     */
    useEffect(() => {
      if (progressData) {
        // Smooth entrance animation for the glassmorphic box
        progressBoxOpacity.value = withTiming(1, {
          duration: PROGRESS_TIMING.ENTRANCE,
        });
        progressBoxScale.value = withTiming(1, {
          duration: PROGRESS_TIMING.ENTRANCE,
        });
        progressBoxTranslateY.value = withTiming(0, {
          duration: PROGRESS_TIMING.ENTRANCE,
        });

        if (
          progressData.isWatched ||
          (progressData.progressPercent &&
            progressData.progressPercent >= PROGRESS_THRESHOLDS.COMPLETION_CELEBRATION)
        ) {
          // Celebration animation sequence
          celebrationScale.value = withRepeat(
            withTiming(1.05, { duration: PROGRESS_TIMING.CELEBRATION }),
            2,
            true
          );

          // Glow effect
          completionGlow.value = withRepeat(
            withTiming(1, { duration: PROGRESS_TIMING.GLOW_CYCLE }),
            -1,
            true
          );
        } else {
          // Subtle progress pulse for ongoing content
          progressPulse.value = withRepeat(
            withTiming(1.02, { duration: PROGRESS_TIMING.PULSE_CYCLE }),
            -1,
            true
          );
        }
      } else {
        // Hide animation when no progress data
        progressBoxOpacity.value = withTiming(0, {
          duration: PROGRESS_TIMING.EXIT,
        });
        progressBoxScale.value = withTiming(INITIAL_VALUES.PROGRESS_BOX_SCALE, {
          duration: PROGRESS_TIMING.EXIT,
        });
        progressBoxTranslateY.value = withTiming(INITIAL_VALUES.PROGRESS_BOX_TRANSLATE_Y, {
          duration: PROGRESS_TIMING.EXIT,
        });
      }
    }, [progressData]);

    // =============================================================================
    // Animated Styles
    // =============================================================================

    const celebrationAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: celebrationScale.value }],
    }));

    const glowAnimatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(completionGlow.value, [0, 1], [0.3, 0.8], Extrapolate.CLAMP),
    }));

    const progressPulseStyle = useAnimatedStyle(() => ({
      transform: [{ scale: progressPulse.value }],
    }));

    const progressBoxAnimatedStyle = useAnimatedStyle(() => ({
      opacity: progressBoxOpacity.value,
      transform: [{ scale: progressBoxScale.value }, { translateY: progressBoxTranslateY.value }],
    }));

    // =============================================================================
    // Visibility Check
    // =============================================================================

    // Determine visibility; if not visible, don't render to avoid fixed blank space
    const isVisible = !!progressData && !(isTrailerPlaying && !trailerMuted && trailerReady);
    if (!isVisible) return null;

    const isCompleted =
      progressData.isWatched || progressData.progressPercent >= PROGRESS_THRESHOLDS.LOCAL_WATCHED;

    // =============================================================================
    // Render
    // =============================================================================

    return (
      <Animated.View
        style={[
          isTablet ? styles.tabletWatchProgressContainer : styles.watchProgressContainer,
          animatedStyle,
        ]}
      >
        {/* Glass morphism background with entrance animation */}
        <Animated.View
          style={[
            isTablet ? styles.tabletProgressGlassBackground : styles.progressGlassBackground,
            progressBoxAnimatedStyle,
          ]}
        >
          {Platform.OS === 'ios' ? (
            GlassViewComp && liquidGlassAvailable ? (
              <GlassViewComp style={styles.blurBackground} glassEffectStyle="regular" />
            ) : (
              <ExpoBlurView intensity={20} style={styles.blurBackground} tint="dark" />
            )
          ) : (
            <View style={styles.androidProgressBlur} />
          )}

          {/* Enhanced progress bar with glow effects */}
          <Animated.View style={[styles.watchProgressBarContainer, celebrationAnimatedStyle]}>
            <View style={styles.watchProgressBar}>
              {/* Background glow for completed content */}
              {isCompleted && <Animated.View style={[styles.completionGlow, glowAnimatedStyle]} />}

              <Animated.View
                style={[
                  styles.watchProgressFill,
                  !isCompleted && progressPulseStyle,
                  {
                    width: `${progressData.progressPercent}%`,
                    backgroundColor: isCompleted
                      ? '#00ff88' // Bright green for completed
                      : progressData.isTraktSynced
                        ? '#E50914' // Netflix red for Trakt synced content
                        : currentTheme.colors.primary,
                  },
                ]}
              />

              {/* Shimmer effect for active progress */}
              {!isCompleted && progressData.progressPercent > 0 && (
                <View style={styles.progressShimmer} />
              )}
            </View>
          </Animated.View>

          {/* Enhanced text container with better typography */}
          <View style={styles.watchProgressTextContainer}>
            <View style={styles.progressInfoMain}>
              <Text
                style={[
                  isTablet ? styles.tabletWatchProgressMainText : styles.watchProgressMainText,
                  {
                    color: isCompleted ? '#00ff88' : currentTheme.colors.white,
                    fontSize: isCompleted ? (isTablet ? 15 : 13) : isTablet ? 14 : 12,
                    fontWeight: isCompleted ? '700' : '600',
                  },
                ]}
              >
                {progressData.displayText}
              </Text>
            </View>

            {/* Only show episode info for series */}
            {progressData.episodeInfo && (
              <Text
                style={[
                  isTablet ? styles.tabletWatchProgressSubText : styles.watchProgressSubText,
                  {
                    color: isCompleted ? 'rgba(0,255,136,0.7)' : currentTheme.colors.textMuted,
                  },
                ]}
              >
                {progressData.episodeInfo}
              </Text>
            )}

            {/* Trakt sync status with enhanced styling */}
            {progressData.syncStatus && (
              <View style={styles.syncStatusContainer}>
                <MaterialIcons
                  name={progressData.isTraktSynced ? 'sync' : 'sync-problem'}
                  size={12}
                  color={progressData.isTraktSynced ? '#E50914' : 'rgba(255,255,255,0.6)'}
                />
                <Text
                  style={[
                    styles.syncStatusText,
                    {
                      color: progressData.isTraktSynced ? '#E50914' : 'rgba(255,255,255,0.6)',
                    },
                  ]}
                >
                  {progressData.syncStatus}
                </Text>

                {/* Enhanced manual Trakt sync button - moved inline */}
                {isTraktAuthenticated && forceSyncTraktProgress && (
                  <TouchableOpacity
                    style={styles.traktSyncButtonInline}
                    onPress={handleTraktSync}
                    activeOpacity={0.7}
                    disabled={isSyncing}
                    accessibilityRole="button"
                    accessibilityLabel={isSyncing ? 'Syncing' : 'Sync with Trakt'}
                  >
                    <LinearGradient
                      colors={['#E50914', '#B8070F']}
                      style={styles.syncButtonGradientInline}
                    >
                      <Animated.View style={syncIconStyle}>
                        <MaterialIcons
                          name={isSyncing ? 'sync' : 'refresh'}
                          size={12}
                          color="#fff"
                        />
                      </Animated.View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }
);

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // Container styles
  watchProgressContainer: {
    marginTop: 4,
    marginBottom: 4,
    width: '100%',
    alignItems: 'center',
    minHeight: 36,
    position: 'relative',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  } as ViewStyle,

  tabletWatchProgressContainer: {
    marginTop: 8,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
    minHeight: 44,
    position: 'relative',
    maxWidth: 800,
    alignSelf: 'center',
  } as ViewStyle,

  // Glass background styles
  progressGlassBackground: {
    width: '75%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  } as ViewStyle,

  tabletProgressGlassBackground: {
    width: screenWidth * 0.7,
    maxWidth: 700,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    alignSelf: 'center',
  } as ViewStyle,

  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  } as ViewStyle,

  androidProgressBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  } as ViewStyle,

  // Progress bar styles
  watchProgressBarContainer: {
    position: 'relative',
    marginBottom: 6,
  } as ViewStyle,

  watchProgressBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 1.5,
    overflow: 'hidden',
    position: 'relative',
  } as ViewStyle,

  watchProgressFill: {
    height: '100%',
    borderRadius: 1.25,
  } as ViewStyle,

  completionGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,255,136,0.2)',
  } as ViewStyle,

  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  } as ViewStyle,

  // Text container styles
  watchProgressTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  } as ViewStyle,

  progressInfoMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  } as ViewStyle,

  // Text styles
  watchProgressMainText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,

  tabletWatchProgressMainText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,

  watchProgressSubText: {
    fontSize: 9,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 1,
  } as TextStyle,

  tabletWatchProgressSubText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 1,
  } as TextStyle,

  // Sync status styles
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    width: '100%',
    flexWrap: 'wrap',
  } as ViewStyle,

  syncStatusText: {
    fontSize: 9,
    marginLeft: 4,
    fontWeight: '500',
  } as TextStyle,

  // Trakt sync button styles
  traktSyncButtonInline: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  } as ViewStyle,

  syncButtonGradientInline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});

export default WatchProgressDisplay;
