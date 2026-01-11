/**
 * HeroSection.tv.tsx
 *
 * TV-specific hero section component with D-pad navigable action buttons
 * and focus states for TV remote navigation.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - All action buttons (Play, Save, Collection, Ratings) are D-pad navigable
 * - Visible focus states on all interactive elements
 * - Back button focusable for TV navigation
 * - Trailer controls focusable (fullscreen, mute, AI chat)
 * - Integration with TVNavigationContext for focus memory
 * - tvParallaxProperties for Apple TV depth effects
 */

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  InteractionManager,
  AppState,
  Image,
  findNodeHandle,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

import { MaterialIcons, Entypo, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { BlurView as CommunityBlurView } from '@react-native-community/blur';

// Optional iOS Glass effect
let GlassViewComp: any = null;
let liquidGlassAvailable = false;
if (Platform.OS === 'ios') {
  try {
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
import { logger } from '../../utils/logger';
import { TMDBService } from '../../services/tmdbService';
import TrailerService from '../../services/trailerService';
import TrailerPlayer from '../video/TrailerPlayer';
import { HERO_HEIGHT, SCREEN_WIDTH as width, IS_TABLET as isTablet } from '../../constants/dimensions';

// TV-specific imports
import Focusable, { FocusableRef } from '../common/Focusable';
import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';

const { height } = Dimensions.get('window');

// Animation constants
const SCALE_FACTOR = 1.02;
const FADE_THRESHOLD = 200;

// =============================================================================
// Types & Interfaces
// =============================================================================

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
  // TV-specific props
  hasTVPreferredFocus?: boolean;
  onFocusSection?: () => void;
  nextFocusDown?: number | React.RefObject<any>;
}

// =============================================================================
// TV-specific ActionButtons Component
// =============================================================================

const TVActionButtons = memo(({
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
  isAuthenticated,
  isInWatchlist,
  isInCollection,
  onToggleWatchlist,
  onToggleCollection,
  // TV-specific props
  hasTVPreferredFocus,
  onFocusSection,
  nextFocusDown,
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
  isAuthenticated?: boolean;
  isInWatchlist?: boolean;
  isInCollection?: boolean;
  onToggleWatchlist?: () => void;
  onToggleCollection?: () => void;
  hasTVPreferredFocus?: boolean;
  onFocusSection?: () => void;
  nextFocusDown?: number | React.RefObject<any>;
}) => {
  const { currentTheme } = useTheme();
  const { showSaved, showTraktSaved, showRemoved, showTraktRemoved, showSuccess, showInfo } = useToast();
  const tvNav = useTVNavigationOptional();

  // Refs for focus navigation between buttons
  const playButtonRef = useRef<FocusableRef>(null);
  const saveButtonRef = useRef<FocusableRef>(null);
  const collectionButtonRef = useRef<FocusableRef>(null);
  const ratingsButtonRef = useRef<FocusableRef>(null);

  // Theme colors
  const themeColors = useMemo(() => ({
    white: currentTheme.colors.white,
    black: '#000',
    primary: currentTheme.colors.primary
  }), [currentTheme.colors.white, currentTheme.colors.primary]);

  // Handle ratings button press
  const handleRatingsPress = useCallback(async () => {
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
        logger.error(`[HeroSection.tv] Error converting IMDb ID ${id}:`, error);
      }
    } else {
      const parsedId = parseInt(id, 10);
      if (!isNaN(parsedId)) {
        finalTmdbId = parsedId;
      }
    }

    if (finalTmdbId !== null) {
      requestAnimationFrame(() => {
        navigation.navigate('ShowRatings', { showId: finalTmdbId });
      });
    }
  }, [id, navigation, settings.enrichMetadataWithTMDB]);

  // Handle save action
  const handleSaveAction = useCallback(async () => {
    const wasInLibrary = inLibrary;
    toggleLibrary();

    if (isAuthenticated && onToggleWatchlist) {
      await onToggleWatchlist();
    }

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

  // Handle collection action
  const handleCollectionAction = useCallback(async () => {
    const wasInCollection = isInCollection;

    if (onToggleCollection) {
      await onToggleCollection();
    }

    if (wasInCollection) {
      showInfo('Removed from Collection', 'Removed from your Trakt collection');
    } else {
      showSuccess('Added to Collection', 'Added to your Trakt collection');
    }
  }, [onToggleCollection, isInCollection, showSuccess, showInfo]);

  // Play button style
  const playButtonStyle = useMemo(() => {
    if (isWatched && type === 'movie') {
      return [styles.actionButton, styles.playButton, styles.watchedPlayButton];
    }
    return [styles.actionButton, styles.playButton];
  }, [isWatched, type]);

  const playButtonTextStyle = useMemo(() => {
    if (isWatched && type === 'movie') {
      return [styles.playButtonText, styles.watchedPlayButtonText];
    }
    return styles.playButtonText;
  }, [isWatched, type]);

  // Calculate final play button text
  const finalPlayButtonText = useMemo(() => {
    if (type === 'movie') {
      return isWatched ? 'Watch Again' : playButtonText;
    }

    if (type === 'series' && watchProgress?.episodeId && groupedEpisodes) {
      let seasonNum: number | null = null;
      let episodeNum: number | null = null;

      const parts = watchProgress.episodeId.split(':');

      if (parts.length === 3) {
        seasonNum = parseInt(parts[1], 10);
        episodeNum = parseInt(parts[2], 10);
      } else if (parts.length === 2) {
        seasonNum = parseInt(parts[0], 10);
        episodeNum = parseInt(parts[1], 10);
      } else {
        const match = watchProgress.episodeId.match(/s(\d+)e(\d+)/i);
        if (match) {
          seasonNum = parseInt(match[1], 10);
          episodeNum = parseInt(match[2], 10);
        }
      }

      if (seasonNum !== null && episodeNum !== null && !isNaN(seasonNum) && !isNaN(episodeNum)) {
        if (isWatched) {
          const nextEpisode = episodeNum + 1;
          const currentSeasonEpisodes = groupedEpisodes[seasonNum] || [];
          const nextEpisodeExists = currentSeasonEpisodes.some(ep =>
            ep.episode_number === nextEpisode
          );

          if (nextEpisodeExists) {
            const seasonStr = seasonNum.toString().padStart(2, '0');
            const episodeStr = nextEpisode.toString().padStart(2, '0');
            return `Play S${seasonStr}E${episodeStr}`;
          } else {
            return 'Completed';
          }
        } else {
          const currentSeasonEpisodes = groupedEpisodes[seasonNum] || [];
          const currentEpisodeExists = currentSeasonEpisodes.some(ep =>
            ep.episode_number === episodeNum
          );

          if (currentEpisodeExists) {
            return playButtonText;
          } else {
            return 'Play';
          }
        }
      }

      return isWatched ? 'Play Next Episode' : playButtonText;
    }

    return isWatched ? 'Play' : playButtonText;
  }, [isWatched, playButtonText, type, watchProgress, groupedEpisodes]);

  // Focus handlers
  const handleButtonFocus = useCallback((buttonId: string) => {
    if (tvNav) {
      tvNav.setScreenFocus('hero-section', buttonId);
      tvNav.setCurrentFocusId(buttonId);
    }
    onFocusSection?.();
  }, [tvNav, onFocusSection]);

  // Resolve nextFocusDown prop
  const resolveNodeHandle = useCallback((value: number | React.RefObject<any> | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (value.current) {
      try {
        return findNodeHandle(value.current) ?? undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, []);

  // Button count calculation
  const hasTraktCollection = isAuthenticated;
  const hasRatings = type === 'series';
  const additionalButtonCount = (hasTraktCollection ? 1 : 0) + (hasRatings ? 1 : 0);

  return (
    <Animated.View style={[styles.tvActionButtons, animatedStyle]}>
      <View style={styles.singleRowLayout}>
        {/* Play Button */}
        <Focusable
          ref={playButtonRef}
          onPress={handleShowStreams}
          onFocus={() => handleButtonFocus('play-button')}
          hasTVPreferredFocus={hasTVPreferredFocus}
          focusId="play-button"
          style={[
            playButtonStyle,
            additionalButtonCount === 0 ? styles.singleRowPlayButtonFullWidth : styles.primaryActionButton
          ]}
          animationConfig={{
            focusScale: 1.08,
            unfocusedOpacity: 0.9,
            showFocusBorder: true,
            focusBorderColor: '#fff',
            focusBorderWidth: 3,
            animateShadow: Platform.OS === 'ios',
          }}
          tvParallaxProperties={{
            enabled: Platform.OS === 'ios',
            shiftDistanceX: 2,
            shiftDistanceY: 2,
            tiltAngle: 0.05,
            magnification: 1.0,
            pressMagnification: 1.02,
            pressDuration: 0.3,
          }}
          nextFocus={{
            nextFocusRight: saveButtonRef,
            nextFocusDown,
          }}
          accessibilityLabel={finalPlayButtonText}
          accessibilityHint="Press to play content"
        >
          <MaterialIcons
            name={(() => {
              if (isWatched) {
                return type === 'movie' ? 'replay' : 'play-arrow';
              }
              return playButtonText === 'Resume' ? 'play-circle-outline' : 'play-arrow';
            })()}
            size={28}
            color={isWatched && type === 'movie' ? "#fff" : "#000"}
          />
          <Text style={[playButtonTextStyle, styles.tvPlayButtonText]}>{finalPlayButtonText}</Text>
        </Focusable>

        {/* Save Button */}
        <Focusable
          ref={saveButtonRef}
          onPress={handleSaveAction}
          onFocus={() => handleButtonFocus('save-button')}
          focusId="save-button"
          style={[
            styles.actionButton,
            styles.infoButton,
            additionalButtonCount === 0 ? styles.singleRowSaveButtonFullWidth : styles.primaryActionButton
          ]}
          animationConfig={{
            focusScale: 1.08,
            unfocusedOpacity: 0.9,
            showFocusBorder: true,
            focusBorderColor: currentTheme.colors.primary || '#007AFF',
            focusBorderWidth: 3,
            animateShadow: Platform.OS === 'ios',
          }}
          tvParallaxProperties={{
            enabled: Platform.OS === 'ios',
            shiftDistanceX: 2,
            shiftDistanceY: 2,
            tiltAngle: 0.05,
            magnification: 1.0,
            pressMagnification: 1.02,
            pressDuration: 0.3,
          }}
          nextFocus={{
            nextFocusLeft: playButtonRef,
            nextFocusRight: hasTraktCollection ? collectionButtonRef : (hasRatings ? ratingsButtonRef : undefined),
            nextFocusDown,
          }}
          accessibilityLabel={inLibrary ? 'Saved' : 'Save'}
          accessibilityHint={inLibrary ? 'Press to remove from library' : 'Press to save to library'}
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
            size={28}
            color={inLibrary ? (isAuthenticated && isInWatchlist ? "#E74C3C" : currentTheme.colors.white) : currentTheme.colors.white}
          />
          <Text style={[styles.infoButtonText, styles.tvInfoButtonText]}>
            {inLibrary ? 'Saved' : 'Save'}
          </Text>
        </Focusable>

        {/* Trakt Collection Button */}
        {hasTraktCollection && (
          <Focusable
            ref={collectionButtonRef}
            onPress={handleCollectionAction}
            onFocus={() => handleButtonFocus('collection-button')}
            focusId="collection-button"
            style={[styles.iconButton, styles.tvIconButton]}
            animationConfig={{
              focusScale: 1.12,
              unfocusedOpacity: 0.9,
              showFocusBorder: true,
              focusBorderColor: '#3498DB',
              focusBorderWidth: 3,
              animateShadow: Platform.OS === 'ios',
            }}
            tvParallaxProperties={{
              enabled: Platform.OS === 'ios',
              shiftDistanceX: 2,
              shiftDistanceY: 2,
              tiltAngle: 0.05,
              magnification: 1.0,
              pressMagnification: 1.02,
              pressDuration: 0.3,
            }}
            nextFocus={{
              nextFocusLeft: saveButtonRef,
              nextFocusRight: hasRatings ? ratingsButtonRef : undefined,
              nextFocusDown,
            }}
            accessibilityLabel={isInCollection ? 'In Collection' : 'Add to Collection'}
            accessibilityHint="Press to toggle collection status"
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
              name="video-library"
              size={28}
              color={isInCollection ? "#3498DB" : currentTheme.colors.white}
            />
          </Focusable>
        )}

        {/* Ratings Button (for series) */}
        {hasRatings && (
          <Focusable
            ref={ratingsButtonRef}
            onPress={handleRatingsPress}
            onFocus={() => handleButtonFocus('ratings-button')}
            focusId="ratings-button"
            style={[styles.iconButton, styles.tvIconButton]}
            animationConfig={{
              focusScale: 1.12,
              unfocusedOpacity: 0.9,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary || '#007AFF',
              focusBorderWidth: 3,
              animateShadow: Platform.OS === 'ios',
            }}
            tvParallaxProperties={{
              enabled: Platform.OS === 'ios',
              shiftDistanceX: 2,
              shiftDistanceY: 2,
              tiltAngle: 0.05,
              magnification: 1.0,
              pressMagnification: 1.02,
              pressDuration: 0.3,
            }}
            nextFocus={{
              nextFocusLeft: hasTraktCollection ? collectionButtonRef : saveButtonRef,
              nextFocusDown,
            }}
            accessibilityLabel="Ratings"
            accessibilityHint="Press to view ratings"
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
              name="assessment"
              size={28}
              color={currentTheme.colors.white}
            />
          </Focusable>
        )}
      </View>
    </Animated.View>
  );
});

// =============================================================================
// WatchProgress Component (same as non-TV version)
// =============================================================================

const WatchProgressDisplay = memo(({
  watchProgress,
  type,
  getEpisodeDetails,
  animatedStyle,
  isWatched,
  isTrailerPlaying,
  trailerMuted,
  trailerReady
}: {
  watchProgress: {
    currentTime: number;
    duration: number;
    lastUpdated: number;
    episodeId?: string;
    traktSynced?: boolean;
    traktProgress?: number;
  } | null;
  type: 'movie' | 'series';
  getEpisodeDetails: (episodeId: string) => { seasonNumber: string; episodeNumber: string; episodeName: string } | null;
  animatedStyle: any;
  isWatched: boolean;
  isTrailerPlaying: boolean;
  trailerMuted: boolean;
  trailerReady: boolean;
}) => {
  const { currentTheme } = useTheme();
  const { isAuthenticated: isTraktAuthenticated } = useTraktContext();

  const progressBoxOpacity = useSharedValue(0);
  const progressBoxScale = useSharedValue(0.8);
  const progressBoxTranslateY = useSharedValue(20);

  const progressData = useMemo(() => {
    if (isWatched) {
      let episodeInfo = '';
      if (type === 'series' && watchProgress?.episodeId) {
        const details = getEpisodeDetails(watchProgress.episodeId);
        if (details) {
          episodeInfo = ` • S${details.seasonNumber}:E${details.episodeNumber}${details.episodeName ? ` - ${details.episodeName}` : ''}`;
        }
      }

      const watchedDate = watchProgress?.lastUpdated
        ? new Date(watchProgress.lastUpdated).toLocaleDateString('en-US')
        : new Date().toLocaleDateString('en-US');

      const watchedViaTrakt = isTraktAuthenticated &&
        watchProgress?.traktProgress !== undefined &&
        watchProgress.traktProgress >= 95;

      return {
        progressPercent: 100,
        formattedTime: watchedDate,
        episodeInfo,
        displayText: watchedViaTrakt ? 'Watched on Trakt' : 'Watched',
        syncStatus: '',
        isTraktSynced: watchProgress?.traktSynced && isTraktAuthenticated,
        isWatched: true
      };
    }

    if (!watchProgress || watchProgress.duration === 0) return null;

    let progressPercent;
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
        episodeInfo = ` • S${details.seasonNumber}:E${details.episodeNumber}${details.episodeName ? ` - ${details.episodeName}` : ''}`;
      }
    }

    let displayText = progressPercent >= 85 ? 'Watched' : `${Math.round(progressPercent)}% watched`;
    let syncStatus = '';

    if (isTraktAuthenticated) {
      if (isUsingTraktProgress) {
        syncStatus = watchProgress.traktSynced ? ' • Synced with Trakt' : ' • Using Trakt progress';
      } else if (watchProgress.traktSynced) {
        syncStatus = ' • Synced with Trakt';
      }
    }

    return {
      progressPercent,
      formattedTime,
      episodeInfo,
      displayText,
      syncStatus,
      isTraktSynced: watchProgress.traktSynced && isTraktAuthenticated,
      isWatched: false
    };
  }, [watchProgress, type, getEpisodeDetails, isTraktAuthenticated, isWatched]);

  useEffect(() => {
    if (progressData) {
      progressBoxOpacity.value = withTiming(1, { duration: 400 });
      progressBoxScale.value = withTiming(1, { duration: 400 });
      progressBoxTranslateY.value = withTiming(0, { duration: 400 });
    } else {
      progressBoxOpacity.value = withTiming(0, { duration: 300 });
      progressBoxScale.value = withTiming(0.8, { duration: 300 });
      progressBoxTranslateY.value = withTiming(20, { duration: 300 });
    }
  }, [progressData]);

  const progressBoxAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progressBoxOpacity.value,
    transform: [
      { scale: progressBoxScale.value },
      { translateY: progressBoxTranslateY.value }
    ],
  }));

  const isVisible = !!progressData && !(isTrailerPlaying && !trailerMuted && trailerReady);
  if (!isVisible) return null;

  const isCompleted = progressData.isWatched || progressData.progressPercent >= 85;

  return (
    <Animated.View style={[styles.tvWatchProgressContainer, animatedStyle]}>
      <Animated.View style={[styles.tvProgressGlassBackground, progressBoxAnimatedStyle]}>
        {Platform.OS === 'ios' ? (
          GlassViewComp && liquidGlassAvailable ? (
            <GlassViewComp
              style={styles.blurBackground}
              glassEffectStyle="regular"
            />
          ) : (
            <ExpoBlurView intensity={20} style={styles.blurBackground} tint="dark" />
          )
        ) : (
          <View style={styles.androidProgressBlur} />
        )}

        <View style={styles.watchProgressBarContainer}>
          <View style={styles.watchProgressBar}>
            <Animated.View
              style={[
                styles.watchProgressFill,
                {
                  width: `${progressData.progressPercent}%`,
                  backgroundColor: isCompleted
                    ? '#00ff88'
                    : progressData.isTraktSynced
                      ? '#E50914'
                      : currentTheme.colors.primary,
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.watchProgressTextContainer}>
          <View style={styles.progressInfoMain}>
            <Text style={[styles.tvWatchProgressMainText, {
              color: isCompleted ? '#00ff88' : currentTheme.colors.white,
              fontWeight: isCompleted ? '700' : '600'
            }]}>
              {progressData.displayText}
            </Text>
          </View>

          {progressData.episodeInfo && (
            <Text style={[styles.tvWatchProgressSubText, {
              color: isCompleted ? 'rgba(0,255,136,0.7)' : currentTheme.colors.textMuted,
            }]}>
              {progressData.episodeInfo}
            </Text>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
});

// =============================================================================
// Main HeroSection Component
// =============================================================================

const HeroSection: React.FC<HeroSectionProps> = memo(({
  metadata,
  bannerImage,
  loadingBanner,
  scrollY,
  heroHeight,
  heroOpacity,
  logoOpacity,
  buttonsOpacity,
  buttonsTranslateY,
  watchProgressOpacity,
  watchProgress,
  onStableLogoUriChange,
  type,
  getEpisodeDetails,
  handleShowStreams,
  handleToggleLibrary,
  inLibrary,
  id,
  navigation,
  getPlayButtonText,
  setBannerImage,
  groupedEpisodes,
  dynamicBackgroundColor,
  handleBack,
  tmdbId,
  isAuthenticated,
  isInWatchlist,
  isInCollection,
  onToggleWatchlist,
  onToggleCollection,
  // TV-specific props
  hasTVPreferredFocus = true,
  onFocusSection,
  nextFocusDown,
}) => {
  const { currentTheme } = useTheme();
  const { isAuthenticated: isTraktAuthenticated } = useTraktContext();
  const { settings, updateSetting } = useSettings();
  const { isTrailerPlaying: globalTrailerPlaying, setTrailerPlaying } = useTrailer();
  const isFocused = useIsFocused();
  const tvNav = useTVNavigationOptional();

  // Refs for TV focus navigation
  const backButtonRef = useRef<FocusableRef>(null);

  // State management
  const interactionComplete = useRef(false);
  const [shouldLoadSecondaryData, setShouldLoadSecondaryData] = useState(false);
  const appState = useRef(AppState.currentState);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(false);
  const trailerMuted = settings.trailerMuted;
  const [trailerReady, setTrailerReady] = useState(false);
  const [trailerPreloaded, setTrailerPreloaded] = useState(false);
  const trailerVideoRef = useRef<any>(null);
  const imageOpacity = useSharedValue(1);
  const imageLoadOpacity = useSharedValue(0);
  const trailerOpacity = useSharedValue(0);
  const thumbnailOpacity = useSharedValue(1);
  const pausedByScrollSV = useSharedValue(0);
  const scrollGuardEnabledSV = useSharedValue(0);
  const isPlayingSV = useSharedValue(0);
  const isFocusedSV = useSharedValue(0);
  const startedOnFocusRef = useRef(false);
  const startedOnReadyRef = useRef(false);
  const actionButtonsOpacity = useSharedValue(1);
  const titleCardTranslateY = useSharedValue(0);
  const genreOpacity = useSharedValue(1);

  // Theme colors
  const themeColors = useMemo(() => ({
    black: currentTheme.colors.black,
    darkBackground: currentTheme.colors.darkBackground,
    highEmphasis: currentTheme.colors.highEmphasis,
    text: currentTheme.colors.text
  }), [currentTheme.colors.black, currentTheme.colors.darkBackground, currentTheme.colors.highEmphasis, currentTheme.colors.text]);

  // Static styles
  const staticStyles = useMemo(() => ({
    heroWrapper: styles.heroWrapper,
    heroSection: styles.heroSection,
    absoluteFill: styles.absoluteFill,
    thumbnailContainer: styles.thumbnailContainer,
    thumbnailImage: styles.thumbnailImage,
  }), []);

  // Image source
  const imageSource = useMemo(() =>
    bannerImage || metadata.banner || metadata.poster
  , [bannerImage, metadata.banner, metadata.poster]);

  // Logo state
  const [stableLogoUri, setStableLogoUri] = useState<string | null>(metadata?.logo || null);
  const [logoHasLoadedSuccessfully, setLogoHasLoadedSuccessfully] = useState(false);
  const logoLoadOpacity = useSharedValue(0);
  const [shouldShowTextFallback, setShouldShowTextFallback] = useState<boolean>(!metadata?.logo);
  const logoWaitTimerRef = useRef<any>(null);
  const lastSyncedLogoRef = useRef<string | undefined>(metadata?.logo);

  // Update stable logo URI when metadata logo changes
  useEffect(() => {
    const currentMetadataLogo = metadata?.logo;

    if (currentMetadataLogo !== lastSyncedLogoRef.current) {
      lastSyncedLogoRef.current = currentMetadataLogo;

      if (logoWaitTimerRef.current) {
        try { clearTimeout(logoWaitTimerRef.current); } catch (_e) {}
        logoWaitTimerRef.current = null;
      }

      if (currentMetadataLogo) {
        setStableLogoUri(currentMetadataLogo);
        onStableLogoUriChange?.(currentMetadataLogo);
        setLogoHasLoadedSuccessfully(false);
        logoLoadOpacity.value = 0;
        setShouldShowTextFallback(false);
      } else {
        setStableLogoUri(null);
        onStableLogoUriChange?.(null);
        setLogoHasLoadedSuccessfully(false);
        setShouldShowTextFallback(false);
        logoWaitTimerRef.current = setTimeout(() => {
          setShouldShowTextFallback(true);
        }, 600);
      }
    }

    return () => {
      if (logoWaitTimerRef.current) {
        try { clearTimeout(logoWaitTimerRef.current); } catch (_e) {}
        logoWaitTimerRef.current = null;
      }
    };
  }, [metadata?.logo]);

  const handleLogoLoad = useCallback(() => {
    setLogoHasLoadedSuccessfully(true);
    logoLoadOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const handleLogoError = useCallback(() => {
    if (!logoHasLoadedSuccessfully) {
      const addonLogo = (metadata as any)?.addonLogo;
      if (addonLogo && stableLogoUri !== addonLogo) {
        setStableLogoUri(addonLogo);
        setLogoHasLoadedSuccessfully(false);
        logoLoadOpacity.value = 0;
      } else {
        setStableLogoUri(null);
      }
    }
  }, [logoHasLoadedSuccessfully, stableLogoUri, metadata, logoLoadOpacity]);

  // Lazy loading setup
  useEffect(() => {
    const timer = InteractionManager.runAfterInteractions(() => {
      if (!interactionComplete.current) {
        interactionComplete.current = true;
        setShouldLoadSecondaryData(true);
      }
    });

    return () => timer.cancel();
  }, []);

  // Trailer handlers (simplified for TV)
  const handleTrailerReady = useCallback(() => {
    if (!isFocused) return;
    if (!trailerPreloaded) {
      setTrailerPreloaded(true);
    }
    setTrailerReady(true);

    thumbnailOpacity.value = withTiming(0, { duration: 500 });
    trailerOpacity.value = withTiming(1, { duration: 500 });
    scrollGuardEnabledSV.value = 0;
    setTimeout(() => { scrollGuardEnabledSV.value = 1; }, 1000);
  }, [thumbnailOpacity, trailerOpacity, trailerPreloaded, isFocused]);

  const handleTrailerError = useCallback(() => {
    setTrailerError(true);
    setTrailerReady(false);
    setTrailerPlaying(false);

    trailerOpacity.value = withTiming(0, { duration: 300 });
    thumbnailOpacity.value = withTiming(1, { duration: 300 });
  }, [trailerOpacity, thumbnailOpacity]);

  const handleTrailerEnd = useCallback(async () => {
    logger.info('HeroSection.tv', 'Trailer ended');
    setTrailerPlaying(false);
    setTrailerReady(false);
    setTrailerPreloaded(false);

    trailerOpacity.value = withTiming(0, { duration: 500 });
    thumbnailOpacity.value = withTiming(1, { duration: 500 });
    actionButtonsOpacity.value = withTiming(1, { duration: 500 });
    genreOpacity.value = withTiming(1, { duration: 500 });
    titleCardTranslateY.value = withTiming(0, { duration: 500 });
    watchProgressOpacity.value = withTiming(1, { duration: 500 });
  }, [trailerOpacity, thumbnailOpacity, actionButtonsOpacity, genreOpacity, titleCardTranslateY, watchProgressOpacity, setTrailerPlaying]);

  // Image handlers
  const handleImageError = useCallback(() => {
    if (!shouldLoadSecondaryData) return;

    runOnUI(() => {
      imageOpacity.value = withTiming(0.6, { duration: 150 });
      imageLoadOpacity.value = withTiming(0, { duration: 150 });
    })();

    setImageError(true);
    setImageLoaded(false);

    if (bannerImage !== metadata.banner && metadata.banner) {
      setBannerImage(metadata.banner);
    } else if (bannerImage !== metadata.poster && metadata.poster) {
      setBannerImage(metadata.poster);
    }
  }, [shouldLoadSecondaryData, bannerImage, metadata.banner, metadata.poster, setBannerImage]);

  const handleImageLoad = useCallback(() => {
    runOnUI(() => {
      imageOpacity.value = withTiming(1, { duration: 150 });
      imageLoadOpacity.value = withTiming(1, { duration: 400 });
    })();

    setImageError(false);
    setImageLoaded(true);
  }, []);

  // Animated styles
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    height: heroHeight.value,
    opacity: heroOpacity.value,
  }), []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    const hasProgress = watchProgress && watchProgress.duration > 0;
    const logoScale = hasProgress ? 0.85 : 1;

    return {
      opacity: logoOpacity.value,
      transform: [
        { scale: withTiming(logoScale, { duration: 300 }) }
      ]
    };
  }, [watchProgress]);

  const logoFadeStyle = useAnimatedStyle(() => ({
    opacity: logoLoadOpacity.value,
  }));

  const watchProgressAnimatedStyle = useAnimatedStyle(() => ({
    opacity: watchProgressOpacity.value,
  }), []);

  const backdropImageStyle = useAnimatedStyle(() => {
    'worklet';
    const scrollYValue = scrollY.value;

    const DEFAULT_ZOOM = 1.1;
    const SCROLL_UP_MULTIPLIER = 0.002;
    const SCROLL_DOWN_MULTIPLIER = 0.0001;
    const MAX_SCALE = 1.4;
    const PARALLAX_FACTOR = 0.3;

    const scrollUpScale = DEFAULT_ZOOM + Math.abs(scrollYValue) * SCROLL_UP_MULTIPLIER;
    const scrollDownScale = DEFAULT_ZOOM + scrollYValue * SCROLL_DOWN_MULTIPLIER;
    const scale = Math.min(scrollYValue < 0 ? scrollUpScale : scrollDownScale, MAX_SCALE);

    const parallaxOffset = scrollYValue * PARALLAX_FACTOR;

    return {
      opacity: imageOpacity.value * imageLoadOpacity.value,
      transform: [
        { scale },
        { translateY: parallaxOffset }
      ],
    };
  }, []);

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value * actionButtonsOpacity.value,
    transform: [{
      translateY: interpolate(
        buttonsTranslateY.value,
        [0, 20],
        [0, 20],
        Extrapolate.CLAMP
      )
    }]
  }), []);

  const titleCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleCardTranslateY.value }]
  }), []);

  const genreAnimatedStyle = useAnimatedStyle(() => ({
    opacity: genreOpacity.value
  }), []);

  // Genre elements
  const genreElements = useMemo(() => {
    if (!shouldLoadSecondaryData || !metadata?.genres?.length) return null;

    const genresToDisplay = metadata.genres.slice(0, 3);
    const elements: React.ReactNode[] = [];

    genresToDisplay.forEach((genreName: string, index: number) => {
      elements.push(
        <Text
          key={`genre-${index}`}
          style={[styles.tvGenreText, { color: themeColors.text }]}
        >
          {genreName}
        </Text>
      );

      if (index < genresToDisplay.length - 1) {
        elements.push(
          <Text
            key={`dot-${index}`}
            style={[styles.tvGenreDot, { color: themeColors.text }]}
          >
            •
          </Text>
        );
      }
    });

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200)}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        {elements}
      </Animated.View>
    );
  }, [metadata.genres, themeColors.text, shouldLoadSecondaryData]);

  // Play button text
  const playButtonText = useMemo(() => getPlayButtonText(), [getPlayButtonText]);

  // Calculate if content is watched
  const isWatched = useMemo(() => {
    if (!watchProgress) return false;

    if (isTraktAuthenticated && watchProgress.traktProgress !== undefined) {
      return watchProgress.traktProgress >= 95;
    }

    if (watchProgress.duration === 0) return false;
    const progressPercent = (watchProgress.currentTime / watchProgress.duration) * 100;
    return progressPercent >= 85;
  }, [watchProgress, isTraktAuthenticated]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      logger.info('HeroSection.tv', 'Screen focused');

      return () => {
        logger.info('HeroSection.tv', 'Screen unfocused - stopping trailer');
        setTrailerPlaying(false);
        isPlayingSV.value = 0;
        startedOnFocusRef.current = false;
        startedOnReadyRef.current = false;
      };
    }, [setTrailerPlaying])
  );

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <View style={staticStyles.heroWrapper}>
      <Animated.View style={[staticStyles.heroSection, heroAnimatedStyle]}>
        {/* Background */}
        <View style={[staticStyles.absoluteFill, { backgroundColor: themeColors.black }]} />

        {/* Background thumbnail image */}
        {shouldLoadSecondaryData && imageSource && !loadingBanner && (
          <Animated.View style={[staticStyles.thumbnailContainer, {
            opacity: thumbnailOpacity
          }]}>
            <Animated.Image
              source={{ uri: imageSource }}
              style={[staticStyles.thumbnailImage, backdropImageStyle]}
              resizeMode="cover"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          </Animated.View>
        )}

        {/* Focusable back button */}
        <Animated.View style={styles.backButtonContainer}>
          <Focusable
            ref={backButtonRef}
            onPress={handleBack}
            focusId="back-button"
            style={styles.tvBackButton}
            animationConfig={{
              focusScale: 1.15,
              unfocusedOpacity: 0.8,
              showFocusBorder: true,
              focusBorderColor: '#fff',
              focusBorderWidth: 2,
            }}
            accessibilityLabel="Go back"
            accessibilityHint="Press to return to previous screen"
          >
            <MaterialIcons
              name="arrow-back"
              size={32}
              color="#fff"
              style={styles.backButtonIcon}
            />
          </Focusable>
        </Animated.View>

        {/* Gradient overlay */}
        <LinearGradient
          colors={[
            'rgba(0,0,0,0)',
            'rgba(0,0,0,0.05)',
            'rgba(0,0,0,0.15)',
            'rgba(0,0,0,0.35)',
            'rgba(0,0,0,0.65)',
            dynamicBackgroundColor || themeColors.darkBackground
          ]}
          locations={[0, 0.3, 0.55, 0.75, 0.9, 1]}
          style={styles.heroGradient}
        >
          <LinearGradient
            colors={[
              'transparent',
              `${dynamicBackgroundColor || themeColors.darkBackground}10`,
              `${dynamicBackgroundColor || themeColors.darkBackground}25`,
              `${dynamicBackgroundColor || themeColors.darkBackground}45`,
              `${dynamicBackgroundColor || themeColors.darkBackground}65`,
              `${dynamicBackgroundColor || themeColors.darkBackground}85`,
              `${dynamicBackgroundColor || themeColors.darkBackground}95`,
              dynamicBackgroundColor || themeColors.darkBackground
            ]}
            locations={[0, 0.1, 0.25, 0.4, 0.6, 0.75, 0.9, 1]}
            style={styles.bottomFadeGradient}
            pointerEvents="none"
          />

          <View style={[styles.heroContent, styles.tvHeroContent]}>
            {/* Logo/Title */}
            <Animated.View style={[styles.logoContainer, titleCardAnimatedStyle]}>
              <Animated.View style={[styles.titleLogoContainer, logoAnimatedStyle]}>
                {metadata?.logo ? (
                  <Animated.Image
                    source={{ uri: stableLogoUri || (metadata?.logo as string) }}
                    style={[styles.tvTitleLogo, logoFadeStyle]}
                    resizeMode={'contain'}
                    onLoad={handleLogoLoad}
                    onError={handleLogoError}
                  />
                ) : shouldShowTextFallback ? (
                  <Text style={[styles.tvHeroTitle, { color: themeColors.highEmphasis }]}>
                    {metadata.name}
                  </Text>
                ) : (
                  <View style={styles.tvTitleLogo} />
                )}
              </Animated.View>
            </Animated.View>

            {/* Watch Progress */}
            <WatchProgressDisplay
              watchProgress={watchProgress}
              type={type}
              getEpisodeDetails={getEpisodeDetails}
              animatedStyle={watchProgressAnimatedStyle}
              isWatched={isWatched}
              isTrailerPlaying={globalTrailerPlaying}
              trailerMuted={trailerMuted}
              trailerReady={trailerReady}
            />

            {/* Genre display */}
            {shouldLoadSecondaryData && genreElements && (
              <Animated.View style={[styles.tvGenreContainer, genreAnimatedStyle]}>
                {genreElements}
              </Animated.View>
            )}

            {/* TV Action Buttons */}
            <TVActionButtons
              handleShowStreams={handleShowStreams}
              toggleLibrary={handleToggleLibrary}
              inLibrary={inLibrary}
              type={type}
              id={id}
              navigation={navigation}
              playButtonText={playButtonText}
              animatedStyle={buttonsAnimatedStyle}
              isWatched={isWatched}
              watchProgress={watchProgress}
              groupedEpisodes={groupedEpisodes}
              metadata={metadata}
              settings={settings}
              isAuthenticated={isAuthenticated}
              isInWatchlist={isInWatchlist}
              isInCollection={isInCollection}
              onToggleWatchlist={onToggleWatchlist}
              onToggleCollection={onToggleCollection}
              hasTVPreferredFocus={hasTVPreferredFocus}
              onFocusSection={onFocusSection}
              nextFocusDown={nextFocusDown}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
});

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  heroWrapper: {
    width: '100%',
    marginTop: -150,
    paddingTop: 150,
    overflow: 'hidden',
  },
  heroSection: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'visible',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  thumbnailContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  thumbnailImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 32,
    zIndex: 10,
  },
  tvBackButton: {
    padding: 12,
    borderRadius: 24,
  },
  backButtonIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  bottomFadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 400,
    zIndex: 1,
  },
  heroContent: {
    padding: 32,
    paddingTop: 16,
    paddingBottom: 16,
    position: 'relative',
    zIndex: 2,
  },
  tvHeroContent: {
    maxWidth: 900,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 4,
    flex: 0,
    display: 'flex',
    maxWidth: 700,
    alignSelf: 'center',
  },
  titleLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 0,
    display: 'flex',
    maxWidth: 700,
    alignSelf: 'center',
  },
  tvTitleLogo: {
    width: width * 0.6,
    height: 120,
    alignSelf: 'center',
    textAlign: 'center',
  },
  tvHeroTitle: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  tvGenreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 0,
    maxWidth: 700,
    alignSelf: 'center',
  },
  tvGenreText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.9,
    marginLeft: 0,
    paddingLeft: 0,
    marginRight: 0,
    paddingRight: 0,
    marginVertical: 0,
    paddingVertical: 0,
  },
  tvGenreDot: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.6,
    marginHorizontal: 6,
    paddingHorizontal: 0,
    marginVertical: 0,
    paddingVertical: 0,
  },
  tvActionButtons: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    maxWidth: 700,
    alignSelf: 'center',
  },
  singleRowLayout: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  singleRowPlayButtonFullWidth: {
    flex: 1,
  },
  singleRowSaveButtonFullWidth: {
    flex: 1,
  },
  primaryActionButton: {
    flex: 1,
    maxWidth: '45%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  playButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  infoButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tvIconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  playButtonText: {
    color: '#000',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 17,
  },
  tvPlayButtonText: {
    fontSize: 18,
    marginLeft: 10,
  },
  infoButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 17,
  },
  tvInfoButtonText: {
    fontSize: 18,
    marginLeft: 10,
  },
  watchedPlayButton: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  watchedPlayButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 17,
  },
  // Watch Progress styles
  tvWatchProgressContainer: {
    marginTop: 8,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
    minHeight: 44,
    position: 'relative',
    maxWidth: 700,
    alignSelf: 'center',
  },
  tvProgressGlassBackground: {
    width: '70%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  androidProgressBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  watchProgressBarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  watchProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  watchProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  watchProgressTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  progressInfoMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvWatchProgressMainText: {
    fontSize: 15,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  tvWatchProgressSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  // Blur backgrounds
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  androidFallbackBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  blurBackgroundRound: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
  },
  androidFallbackBlurRound: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});

// =============================================================================
// Export
// =============================================================================

export default HeroSection;
