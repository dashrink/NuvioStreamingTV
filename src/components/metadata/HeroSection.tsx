import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  InteractionManager,
  AppState,
  Image,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

import { MaterialIcons, Entypo, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Replaced FastImage with standard Image for logos
import { BlurView as ExpoBlurView } from 'expo-blur';
import { BlurView as CommunityBlurView } from '@react-native-community/blur';

// Optional iOS Glass effect (expo-glass-effect) with safe fallback for HeroSection
let GlassViewComp: any = null;
let liquidGlassAvailable = false;
if (Platform.OS === 'ios') {
  try {
    // Dynamically require so app still runs if the package isn't installed yet
    const glass = require('expo-glass-effect');
    GlassViewComp = glass.GlassView;
    liquidGlassAvailable = typeof glass.isLiquidGlassAvailable === 'function' ? glass.isLiquidGlassAvailable() : false;
  } catch {
    GlassViewComp = null;
    liquidGlassAvailable = false;
  }
}
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  useSharedValue,
  withTiming,
  runOnJS,
  withRepeat,
  FadeIn,
  runOnUI,
  useDerivedValue,
  SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useTraktContext } from '../../contexts/TraktContext';
import { useSettings } from '../../hooks/useSettings';
import { useTrailer } from '../../contexts/TrailerContext';
import { triggerLight, triggerMedium } from '../../hooks/useHaptics';
import { logger } from '../../utils/logger';
import { TMDBService } from '../../services/tmdbService';
import TrailerService from '../../services/trailerService';
import TrailerPlayer from '../video/TrailerPlayer';
import { HERO_HEIGHT, SCREEN_WIDTH as width, IS_TABLET as isTablet } from '../../constants/dimensions';

const { height } = Dimensions.get('window');

// TV detection for button sizing
const isTV = Platform.isTV;

// Ultra-optimized animation constants
const SCALE_FACTOR = 1.02;
const FADE_THRESHOLD = 200;

// Types - streamlined
interface HeroSectionProps {
  metadata: any;
  bannerImage: string | null;
  loadingBanner: boolean;
  scrollY: SharedValue<number>;
  heroHeight: SharedValue<number>;
  heroOpacity: SharedValue<number>;
  logoOpacity: SharedValue<number>;
  buttonsOpacity: SharedValue<number>;
  buttonsTranslateY: SharedValue<number>;
  watchProgressOpacity: SharedValue<number>;
  watchProgressWidth: SharedValue<number>;
  watchProgress: {
    currentTime: number;
    duration: number;
    lastUpdated: number;
    episodeId?: string;
    traktSynced?: boolean;
    traktProgress?: number;
  } | null;
  onStableLogoUriChange?: (logoUri: string | null) => void;
  type: 'movie' | 'series';
  getEpisodeDetails: (episodeId: string) => { seasonNumber: string; episodeNumber: string; episodeName: string } | null;
  handleShowStreams: () => void;
  handleToggleLibrary: () => void;
  inLibrary: boolean;
  id: string;
  navigation: any;
  getPlayButtonText: () => string;
  setBannerImage: (bannerImage: string | null) => void;
  groupedEpisodes?: { [seasonNumber: number]: any[] };
  // Trakt integration props
  isAuthenticated?: boolean;
  isInWatchlist?: boolean;
  isInCollection?: boolean;
  onToggleWatchlist?: () => void;
  onToggleCollection?: () => void;
  dynamicBackgroundColor?: string;
  handleBack: () => void;
  tmdbId?: number | null;
}

// Ultra-optimized ActionButtons Component - minimal re-renders
const ActionButtons = memo(({
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
  onToggleCollection
}: {
  handleShowStreams: () => void;
  toggleLibrary: () => void;
  inLibrary: boolean;
  type: 'movie' | 'series';
  id: string;
  navigation: any;
  playButtonText: string;
  animatedStyle: any;
  isWatched: boolean;
  watchProgress: any;
  groupedEpisodes?: { [seasonNumber: number]: any[] };
  metadata: any;
  settings: any;
  // Trakt integration props
  isAuthenticated?: boolean;
  isInWatchlist?: boolean;
  isInCollection?: boolean;
  onToggleWatchlist?: () => void;
  onToggleCollection?: () => void;
}) => {
  const { currentTheme } = useTheme();
  const { showSaved, showTraktSaved, showRemoved, showTraktRemoved, showSuccess, showInfo } = useToast();

  // Performance optimization: Cache theme colors
  const themeColors = useMemo(() => ({
    white: currentTheme.colors.white,
    black: '#000',
    primary: currentTheme.colors.primary
  }), [currentTheme.colors.white, currentTheme.colors.primary]);

  // Optimized navigation handler with useCallback
  const handleRatingsPress = useCallback(async () => {
    triggerLight(); // Haptic feedback for navigation
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
        logger.error(`[HeroSection] Error converting IMDb ID ${id}:`, error);
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

  // Enhanced save handler that combines local library + Trakt watchlist
  const handleSaveAction = useCallback(async () => {
    triggerMedium(); // Haptic feedback for add/remove from library
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
  }, [toggleLibrary, isAuthenticated, onToggleWatchlist, inLibrary, showSaved, showTraktSaved, showRemoved, showTraktRemoved]);

  // Enhanced collection handler with toast notifications
  const handleCollectionAction = useCallback(async () => {
    triggerMedium(); // Haptic feedback for add/remove from collection
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

  // Optimized play button style calculation
  const playButtonStyle = useMemo(() => {
    if (isWatched && type === 'movie') {
      // Only movies get the dark watched style for "Watch Again"
      return [styles.actionButton, styles.playButton, styles.watchedPlayButton];
    }
    // All other buttons (Resume, Play SxxEyy, regular Play) get white background
    return [styles.actionButton, styles.playButton];
  }, [isWatched, type]);

  const playButtonTextStyle = useMemo(() => {
    if (isWatched && type === 'movie') {
      // Only movies get white text for "Watch Again"
      return [styles.playButtonText, styles.watchedPlayButtonText];
    }
    // All other buttons get black text
    return styles.playButtonText;
  }, [isWatched, type]);

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

      if (seasonNum !== null && episodeNum !== null && !isNaN(seasonNum) && !isNaN(episodeNum)) {
        if (isWatched) {
          // For watched episodes, check if next episode exists
          const nextEpisode = episodeNum + 1;
          const currentSeasonEpisodes = groupedEpisodes[seasonNum] || [];
          const nextEpisodeExists = currentSeasonEpisodes.some(ep =>
            ep.episode_number === nextEpisode
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
          const currentEpisodeExists = currentSeasonEpisodes.some(ep =>
            ep.episode_number === episodeNum
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

  // Count additional buttons (excluding Play and Save) - AI Chat no longer counted
  const hasTraktCollection = isAuthenticated;
  const hasRatings = type === 'series';

  // Count additional buttons (AI Chat removed - now in top right corner)
  const additionalButtonCount = (hasTraktCollection ? 1 : 0) + (hasRatings ? 1 : 0);

  return (
    <Animated.View style={[isTablet ? styles.tabletActionButtons : styles.actionButtons, animatedStyle]}>
      {/* Single Row Layout - Play, Save, and optionally Collection/Ratings */}
      <View style={styles.singleRowLayout}>
        <TouchableOpacity
          style={[
            playButtonStyle,
            isTablet && styles.tabletPlayButton,
            additionalButtonCount === 0 ? styles.singleRowPlayButtonFullWidth : styles.primaryActionButton
          ]}
          onPress={() => {
            triggerMedium(); // Haptic feedback for play action
            handleShowStreams();
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name={(() => {
              if (isWatched) {
                return type === 'movie' ? 'replay' : 'play-arrow';
              }
              return playButtonText === 'Resume' ? 'play-circle-outline' : 'play-arrow';
            })()}
            size={isTablet ? 28 : 24}
            color={isWatched && type === 'movie' ? "#fff" : "#000"}
          />
          <Text style={[playButtonTextStyle, isTablet && styles.tabletPlayButtonText]}>{finalPlayButtonText}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.infoButton,
            isTablet && styles.tabletInfoButton,
            additionalButtonCount === 0 ? styles.singleRowSaveButtonFullWidth : styles.primaryActionButton
          ]}
          onPress={handleSaveAction}
          activeOpacity={0.85}
        >
          {Platform.OS === 'ios' ? (
            GlassViewComp && liquidGlassAvailable ? (
              <GlassViewComp
                style={styles.blurBackground}
                glassEffectStyle="regular"
              />
            ) : (
              <ExpoBlurView intensity={80} style={styles.blurBackground} tint="dark" />
            )
          ) : (
            <View style={styles.androidFallbackBlur} />
          )}
          <MaterialIcons
            name={inLibrary ? "bookmark" : "bookmark-outline"}
            size={isTablet ? 28 : 24}
            color={inLibrary ? (isAuthenticated && isInWatchlist ? "#E74C3C" : currentTheme.colors.white) : currentTheme.colors.white}
          />
          <Text style={[styles.infoButtonText, isTablet && styles.tabletInfoButtonText]}>
            {inLibrary ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        {/* Trakt Collection Button */}
        {hasTraktCollection && (
          <TouchableOpacity
            style={[styles.iconButton, isTablet && styles.tabletIconButton, styles.singleRowIconButton]}
            onPress={handleCollectionAction}
            activeOpacity={0.85}
          >
            {Platform.OS === 'ios' ? (
              GlassViewComp && liquidGlassAvailable ? (
                <GlassViewComp
                  style={styles.blurBackgroundRound}
                  glassEffectStyle="regular"
                />
              ) : (
                <ExpoBlurView intensity={80} style={styles.blurBackgroundRound} tint="dark" />
              )
            ) : (
              <View style={styles.androidFallbackBlurRound} />
            )}
            <MaterialIcons
              name={isInCollection ? "video-library" : "video-library"}
              size={isTablet ? 28 : 24}
              color={isInCollection ? "#3498DB" : currentTheme.colors.white}
            />
          </TouchableOpacity>
        )}

        {/* Ratings Button (for series) */}
        {hasRatings && (
          <TouchableOpacity
            style={[styles.iconButton, isTablet && styles.tabletIconButton, styles.singleRowIconButton]}
            onPress={handleRatingsPress}
            activeOpacity={0.85}
          >
            {Platform.OS === 'ios' ? (
              GlassViewComp && liquidGlassAvailable ? (
                <GlassViewComp
                  style={styles.blurBackgroundRound}
                  glassEffectStyle="regular"
                />
              ) : (
                <ExpoBlurView intensity={80} style={styles.blurBackgroundRound} tint="dark" />
              )
            ) : (
              <View style={styles.androidFallbackBlurRound} />
            )}
            <MaterialIcons
              name="star-outline"
              size={isTablet ? 28 : 24}
              color={currentTheme.colors.white}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

ActionButtons.displayName = 'ActionButtons';

// Styles (truncated for brevity - keep existing styles from both versions)
const styles = StyleSheet.create({
  // All existing styles should be preserved
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabletActionButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  singleRowLayout: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  primaryActionButton: {
    flex: 1,
  },
  singleRowPlayButtonFullWidth: {
    flex: 1.5,
  },
  singleRowSaveButtonFullWidth: {
    flex: 1.5,
  },
  playButton: {
    backgroundColor: '#fff',
  },
  watchedPlayButton: {
    backgroundColor: '#1a1a1a',
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  watchedPlayButtonText: {
    color: '#fff',
  },
  tabletPlayButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  tabletPlayButtonText: {
    fontSize: 18,
  },
  infoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tabletInfoButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  tabletInfoButtonText: {
    fontSize: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabletIconButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  singleRowIconButton: {
    flex: 0,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  blurBackgroundRound: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  androidFallbackBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  androidFallbackBlurRound: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
});

export default ActionButtons;