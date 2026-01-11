/**
 * ActionButtons Component
 *
 * Provides the main action buttons for the HeroSection, including:
 * - Play/Resume/Watch Again button with watched state logic
 * - Save/Saved button with local library and Trakt watchlist integration
 * - Trakt Collection button (when authenticated)
 * - Ratings button (for series only)
 *
 * Features:
 * - Platform-specific blur effects (iOS GlassView, expo-blur, Android fallback)
 * - Toast notifications for save/collection actions
 * - Responsive layouts (phone vs tablet)
 * - Smart play button text based on content type and watch progress
 *
 * @module HeroSection/components/ActionButtons
 */

import React, { memo, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView as ExpoBlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../../../contexts/ThemeContext';
import { useToast } from '../../../../contexts/ToastContext';
import { TMDBService } from '../../../../services/tmdbService';
import { logger } from '../../../../utils/logger';

import type { ActionButtonsProps } from '../types';
import { isTablet } from '../styles';

// =============================================================================
// iOS Glass Effect Support
// =============================================================================

/**
 * GlassView component from expo-glass-effect (optional, iOS only)
 * Dynamically required to prevent crashes if package is not installed
 */
let GlassViewComp: React.ComponentType<{
  style?: ViewStyle;
  glassEffectStyle?: 'regular' | 'subtle' | 'prominent';
}> | null = null;

/**
 * Flag indicating whether liquid glass effect is available on the device
 * (iOS 26+ with supported hardware)
 */
let liquidGlassAvailable = false;

// Only attempt to load expo-glass-effect on iOS
if (Platform.OS === 'ios') {
  try {
    // Dynamically require so app still runs if the package isn't installed
    const glass = require('expo-glass-effect');
    GlassViewComp = glass.GlassView;
    liquidGlassAvailable =
      typeof glass.isLiquidGlassAvailable === 'function'
        ? glass.isLiquidGlassAvailable()
        : false;
  } catch {
    // Package not available, use fallback
    GlassViewComp = null;
    liquidGlassAvailable = false;
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Action buttons component for HeroSection with Play, Save, Collection, and Ratings.
 *
 * Renders a responsive row of action buttons that adapts based on:
 * - Content type (movie vs series)
 * - Authentication status (shows Trakt buttons when authenticated)
 * - Watch progress state (adjusts play button text)
 * - Device type (phone vs tablet sizing)
 *
 * @param props - Component props
 * @param props.handleShowStreams - Callback when Play button is pressed
 * @param props.toggleLibrary - Callback to toggle local library state
 * @param props.inLibrary - Whether content is in local library
 * @param props.type - Content type ('movie' or 'series')
 * @param props.id - Content ID (IMDb, TMDB, or custom)
 * @param props.navigation - Navigation prop for navigating to ratings screen
 * @param props.playButtonText - Base text for play button
 * @param props.animatedStyle - Animated style for scroll-based animations
 * @param props.isWatched - Whether content has been watched
 * @param props.watchProgress - Current watch progress data
 * @param props.groupedEpisodes - Episodes grouped by season (for series)
 * @param props.metadata - Content metadata
 * @param props.settings - App settings including enrichMetadataWithTMDB flag
 * @param props.isAuthenticated - Whether user is authenticated with Trakt
 * @param props.isInWatchlist - Whether content is in Trakt watchlist
 * @param props.isInCollection - Whether content is in Trakt collection
 * @param props.onToggleWatchlist - Callback to toggle Trakt watchlist
 * @param props.onToggleCollection - Callback to toggle Trakt collection
 *
 * @example
 * ```tsx
 * <ActionButtons
 *   handleShowStreams={handleShowStreams}
 *   toggleLibrary={handleToggleLibrary}
 *   inLibrary={inLibrary}
 *   type="movie"
 *   id="tt1234567"
 *   navigation={navigation}
 *   playButtonText="Play"
 *   animatedStyle={buttonsAnimatedStyle}
 *   isWatched={false}
 *   watchProgress={null}
 *   metadata={metadata}
 *   settings={settings}
 *   isAuthenticated={true}
 *   isInWatchlist={false}
 *   isInCollection={false}
 *   onToggleWatchlist={handleToggleWatchlist}
 *   onToggleCollection={handleToggleCollection}
 * />
 * ```
 */
const ActionButtons = memo(function ActionButtons({
  handleShowStreams,
  toggleLibrary,
  inLibrary,
  type,
  id,
  navigation,
  playButtonText,
  animatedStyle,
  isWatched,
  watchProgress,
  groupedEpisodes,
  metadata,
  settings,
  // Trakt integration props
  isAuthenticated,
  isInWatchlist,
  isInCollection,
  onToggleWatchlist,
  onToggleCollection,
}: ActionButtonsProps) {
  const { currentTheme } = useTheme();
  const { showSaved, showTraktSaved, showRemoved, showTraktRemoved, showSuccess, showInfo } = useToast();

  // Performance optimization: Cache theme colors
  const themeColors = useMemo(
    () => ({
      white: currentTheme.colors.white,
      black: '#000',
      primary: currentTheme.colors.primary,
    }),
    [currentTheme.colors.white, currentTheme.colors.primary]
  );

  // =============================================================================
  // Event Handlers
  // =============================================================================

  /**
   * Handles navigation to the ratings screen.
   * Converts IMDb IDs to TMDB IDs if needed.
   */
  const handleRatingsPress = useCallback(async () => {
    // Early return if no ID
    if (!id) return;

    let finalTmdbId: number | null = null;

    if (id.startsWith('tmdb:')) {
      const numericPart = id.split(':')[1];
      const parsedId = parseInt(numericPart, 10);
      if (!isNaN(parsedId)) {
        finalTmdbId = parsedId;
      }
    } else if (id.startsWith('tt') && settings.enrichMetadataWithTMDB) {
      try {
        const tmdbService = TMDBService.getInstance();
        const convertedId = await tmdbService.findTMDBIdByIMDB(id);
        if (convertedId) {
          finalTmdbId = convertedId;
        }
      } catch (error) {
        logger.error(`[ActionButtons] Error converting IMDb ID ${id}:`, error);
      }
    } else {
      const parsedId = parseInt(id, 10);
      if (!isNaN(parsedId)) {
        finalTmdbId = parsedId;
      }
    }

    if (finalTmdbId !== null) {
      // Use requestAnimationFrame for smoother navigation
      requestAnimationFrame(() => {
        navigation.navigate('ShowRatings', { showId: finalTmdbId });
      });
    }
  }, [id, navigation, settings.enrichMetadataWithTMDB]);

  /**
   * Handles save action - combines local library + Trakt watchlist.
   * Shows appropriate toast notification based on auth state.
   */
  const handleSaveAction = useCallback(async () => {
    const wasInLibrary = inLibrary;

    // Always toggle local library first
    toggleLibrary();

    // If authenticated, also toggle Trakt watchlist
    if (isAuthenticated && onToggleWatchlist) {
      await onToggleWatchlist();
    }

    // Show appropriate toast
    if (isAuthenticated) {
      if (wasInLibrary) {
        showTraktRemoved();
      } else {
        showTraktSaved();
      }
    } else {
      if (wasInLibrary) {
        showRemoved();
      } else {
        showSaved();
      }
    }
  }, [
    toggleLibrary,
    isAuthenticated,
    onToggleWatchlist,
    inLibrary,
    showSaved,
    showTraktSaved,
    showRemoved,
    showTraktRemoved,
  ]);

  /**
   * Handles Trakt collection toggle with toast notifications.
   */
  const handleCollectionAction = useCallback(async () => {
    const wasInCollection = isInCollection;

    // Toggle collection
    if (onToggleCollection) {
      await onToggleCollection();
    }

    // Show appropriate toast
    if (wasInCollection) {
      showInfo('Removed from Collection', 'Removed from your Trakt collection');
    } else {
      showSuccess('Added to Collection', 'Added to your Trakt collection');
    }
  }, [onToggleCollection, isInCollection, showSuccess, showInfo]);

  // =============================================================================
  // Computed Styles
  // =============================================================================

  /**
   * Play button style based on watched state.
   * Movies get dark style when watched ("Watch Again").
   */
  const playButtonStyle = useMemo(() => {
    if (isWatched && type === 'movie') {
      // Only movies get the dark watched style for "Watch Again"
      return [styles.actionButton, styles.playButton, styles.watchedPlayButton];
    }
    // All other buttons (Resume, Play SxxEyy, regular Play) get white background
    return [styles.actionButton, styles.playButton];
  }, [isWatched, type]);

  /**
   * Play button text style based on watched state.
   */
  const playButtonTextStyle = useMemo(() => {
    if (isWatched && type === 'movie') {
      // Only movies get white text for "Watch Again"
      return [styles.playButtonText, styles.watchedPlayButtonText];
    }
    // All other buttons get black text
    return styles.playButtonText;
  }, [isWatched, type]);

  /**
   * Computed play button text based on content type and watch state.
   * Handles special cases like "Watch Again", "Resume", and next episode.
   */
  const finalPlayButtonText = useMemo(() => {
    // For movies, handle watched state
    if (type === 'movie') {
      return isWatched ? 'Watch Again' : playButtonText;
    }

    // For series, validate next episode existence for both watched and resume cases
    if (type === 'series' && watchProgress?.episodeId && groupedEpisodes) {
      let seasonNum: number | null = null;
      let episodeNum: number | null = null;

      const parts = watchProgress.episodeId.split(':');

      if (parts.length === 3) {
        // Format: showId:season:episode
        seasonNum = parseInt(parts[1], 10);
        episodeNum = parseInt(parts[2], 10);
      } else if (parts.length === 2) {
        // Format: season:episode (no show id)
        seasonNum = parseInt(parts[0], 10);
        episodeNum = parseInt(parts[1], 10);
      } else {
        // Try pattern s1e2
        const match = watchProgress.episodeId.match(/s(\d+)e(\d+)/i);
        if (match) {
          seasonNum = parseInt(match[1], 10);
          episodeNum = parseInt(match[2], 10);
        }
      }

      if (
        seasonNum !== null &&
        episodeNum !== null &&
        !isNaN(seasonNum) &&
        !isNaN(episodeNum)
      ) {
        if (isWatched) {
          // For watched episodes, check if next episode exists
          const nextEpisode = episodeNum + 1;
          const currentSeasonEpisodes = groupedEpisodes[seasonNum] || [];
          const nextEpisodeExists = currentSeasonEpisodes.some(
            (ep) => ep.episode_number === nextEpisode
          );

          if (nextEpisodeExists) {
            // Show the NEXT episode number only if it exists
            const seasonStr = seasonNum.toString().padStart(2, '0');
            const episodeStr = nextEpisode.toString().padStart(2, '0');
            return `Play S${seasonStr}E${episodeStr}`;
          } else {
            // If next episode doesn't exist, show generic text
            return 'Completed';
          }
        } else {
          // For non-watched episodes, check if current episode exists
          const currentSeasonEpisodes = groupedEpisodes[seasonNum] || [];
          const currentEpisodeExists = currentSeasonEpisodes.some(
            (ep) => ep.episode_number === episodeNum
          );

          if (currentEpisodeExists) {
            // Current episode exists, use original button text
            return playButtonText;
          } else {
            // Current episode doesn't exist, fallback to generic play
            return 'Play';
          }
        }
      }

      // Fallback label if parsing fails
      return isWatched ? 'Play Next Episode' : playButtonText;
    }

    // Default fallback for non-series or missing data
    return isWatched ? 'Play' : playButtonText;
  }, [isWatched, playButtonText, type, watchProgress, groupedEpisodes]);

  // =============================================================================
  // Button Visibility Logic
  // =============================================================================

  // Count additional buttons (excluding Play and Save)
  const hasTraktCollection = isAuthenticated;
  const hasRatings = type === 'series';

  // Count additional buttons (AI Chat removed - now in top right corner)
  const additionalButtonCount =
    (hasTraktCollection ? 1 : 0) + (hasRatings ? 1 : 0);

  // =============================================================================
  // Render Helpers
  // =============================================================================

  /**
   * Renders platform-specific blur background for buttons.
   */
  const renderBlurBackground = useCallback(
    (style: ViewStyle) => {
      if (Platform.OS === 'ios') {
        if (GlassViewComp && liquidGlassAvailable) {
          return <GlassViewComp style={style} glassEffectStyle="regular" />;
        }
        return <ExpoBlurView intensity={80} style={style} tint="dark" />;
      }
      return (
        <View
          style={[
            style,
            { backgroundColor: 'rgba(255,255,255,0.15)' },
          ]}
        />
      );
    },
    []
  );

  /**
   * Gets the appropriate icon name for the play button.
   */
  const getPlayIconName = useCallback(() => {
    if (isWatched) {
      return type === 'movie' ? 'replay' : 'play-arrow';
    }
    return playButtonText === 'Resume' ? 'play-circle-outline' : 'play-arrow';
  }, [isWatched, type, playButtonText]);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Animated.View
      style={[
        isTablet ? styles.tabletActionButtons : styles.actionButtons,
        animatedStyle,
      ]}
    >
      {/* Single Row Layout - Play, Save, and optionally Collection/Ratings */}
      <View style={styles.singleRowLayout}>
        {/* Play Button */}
        <TouchableOpacity
          style={[
            playButtonStyle,
            isTablet && styles.tabletPlayButton,
            additionalButtonCount === 0
              ? styles.singleRowPlayButtonFullWidth
              : styles.primaryActionButton,
          ]}
          onPress={handleShowStreams}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={finalPlayButtonText}
        >
          <MaterialIcons
            name={getPlayIconName()}
            size={isTablet ? 28 : 24}
            color={isWatched && type === 'movie' ? '#fff' : '#000'}
          />
          <Text
            style={[
              playButtonTextStyle,
              isTablet && styles.tabletPlayButtonText,
            ]}
          >
            {finalPlayButtonText}
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.infoButton,
            isTablet && styles.tabletInfoButton,
            additionalButtonCount === 0
              ? styles.singleRowSaveButtonFullWidth
              : styles.primaryActionButton,
          ]}
          onPress={handleSaveAction}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={inLibrary ? 'Saved' : 'Save'}
        >
          {renderBlurBackground(styles.blurBackground)}
          <MaterialIcons
            name={inLibrary ? 'bookmark' : 'bookmark-outline'}
            size={isTablet ? 28 : 24}
            color={
              inLibrary
                ? isAuthenticated && isInWatchlist
                  ? '#E74C3C'
                  : currentTheme.colors.white
                : currentTheme.colors.white
            }
          />
          <Text
            style={[styles.infoButtonText, isTablet && styles.tabletInfoButtonText]}
          >
            {inLibrary ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        {/* Trakt Collection Button */}
        {hasTraktCollection && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              isTablet && styles.tabletIconButton,
              styles.singleRowIconButton,
            ]}
            onPress={handleCollectionAction}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              isInCollection ? 'Remove from Collection' : 'Add to Collection'
            }
          >
            {renderBlurBackground(styles.blurBackgroundRound)}
            <MaterialIcons
              name="video-library"
              size={isTablet ? 28 : 24}
              color={isInCollection ? '#3498DB' : currentTheme.colors.white}
            />
          </TouchableOpacity>
        )}

        {/* Ratings Button (for series) */}
        {hasRatings && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              isTablet && styles.tabletIconButton,
              styles.singleRowIconButton,
            ]}
            onPress={handleRatingsPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View Ratings"
          >
            {renderBlurBackground(styles.blurBackgroundRound)}
            <MaterialIcons
              name="assessment"
              size={isTablet ? 28 : 24}
              color={currentTheme.colors.white}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // Container styles
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  } as ViewStyle,

  tabletActionButtons: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    maxWidth: 600,
    alignSelf: 'center',
  } as ViewStyle,

  singleRowLayout: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  } as ViewStyle,

  // Button base styles
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 26,
  } as ViewStyle,

  playButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,

  watchedPlayButton: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,

  infoButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  } as ViewStyle,

  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as ViewStyle,

  // Tablet button styles
  tabletPlayButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 32,
    minWidth: 180,
  } as ViewStyle,

  tabletInfoButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    minWidth: 140,
  } as ViewStyle,

  tabletIconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  } as ViewStyle,

  // Single row button styles
  singleRowIconButton: {
    width: isTablet ? 50 : 44,
    height: isTablet ? 50 : 44,
    borderRadius: isTablet ? 25 : 22,
    flex: 0,
  } as ViewStyle,

  singleRowPlayButtonFullWidth: {
    flex: 1,
  } as ViewStyle,

  singleRowSaveButtonFullWidth: {
    flex: 1,
  } as ViewStyle,

  primaryActionButton: {
    flex: 1,
    maxWidth: '48%',
  } as ViewStyle,

  // Text styles
  playButtonText: {
    color: '#000',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 15,
  } as TextStyle,

  watchedPlayButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 15,
  } as TextStyle,

  tabletPlayButtonText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  } as TextStyle,

  infoButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 15,
  } as TextStyle,

  tabletInfoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  } as TextStyle,

  // Blur background styles
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  } as ViewStyle,

  blurBackgroundRound: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  } as ViewStyle,
});

export default ActionButtons;
