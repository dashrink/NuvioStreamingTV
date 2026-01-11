/**
 * TV-Optimized MetadataScreen Component
 *
 * Features:
 * - Larger fonts optimized for 10-foot viewing distance
 * - Improved visual hierarchy with clear section headers
 * - Focus-based navigation through sections (Cast, Episodes, Trailers)
 * - Enhanced spacing and touch targets for D-pad navigation
 * - TV-specific focus zones for organized navigation
 *
 * This file is automatically loaded by Metro bundler on TV platforms.
 */

import React, { useCallback, useState, useEffect, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  InteractionManager,
  BackHandler,
  Platform,
  Alert,
  TouchableOpacity,
  findNodeHandle,
} from 'react-native';
import Focusable from '../components/common/Focusable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useTraktContext } from '../contexts/TraktContext';
import { useMetadata } from '../hooks/useMetadata';
import { useDominantColor, preloadDominantColor } from '../hooks/useDominantColor';
import { CastSection } from '../components/metadata/CastSection';
import { CastDetailsModal } from '../components/metadata/CastDetailsModal';
import { SeriesContent } from '../components/metadata/SeriesContent';
import { MovieContent } from '../components/metadata/MovieContent';
import { MoreLikeThisSection } from '../components/metadata/MoreLikeThisSection';
import { RatingsSection } from '../components/metadata/RatingsSection';
import { CommentsSection, CommentBottomSheet } from '../components/metadata/CommentsSection';
import TrailersSection from '../components/metadata/TrailersSection';
import CollectionSection from '../components/metadata/CollectionSection';
import { RouteParams, Episode } from '../types/metadata';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  useSharedValue,
  withTiming,
  runOnJS,
  runOnUI,
  Easing,
  interpolateColor,
  withSpring,
  createAnimatedComponent,
} from 'react-native-reanimated';

// Create animated version of SafeAreaView for use with Reanimated styles
const AnimatedSafeAreaView = createAnimatedComponent(SafeAreaView);
import { RouteProp } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../hooks/useSettings';
import { MetadataLoadingScreen, MetadataLoadingScreenRef } from '../components/loading/MetadataLoadingScreen';
import { useTrailer } from '../contexts/TrailerContext';
import FastImage from '@d11/react-native-fast-image';

// Import our optimized components and hooks
import HeroSection from '../components/metadata/HeroSection';
import FloatingHeader from '../components/metadata/FloatingHeader';
import MetadataDetails from '../components/metadata/MetadataDetails';
import { useMetadataAnimations } from '../hooks/useMetadataAnimations';
import { useMetadataAssets } from '../hooks/useMetadataAssets';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { TraktService, TraktPlaybackItem } from '../services/traktService';
import { tmdbService } from '../services/tmdbService';
import { catalogService } from '../services/catalogService';

// TV-specific imports from the modular tvStyles directory
import { TV_SPACING } from '../utils/tvStyles/spacing';
import { TV_TYPOGRAPHY } from '../utils/tvStyles/typography';
import { TV_FOCUS_CONFIG } from '../utils/tvStyles/focus';
import { isTV, getDeviceType } from '../utils/tvStyles/deviceDetection';
import { scaleForTV } from '../utils/tvStyles/helpers';

const { height, width } = Dimensions.get('window');

// TV-specific layout constants
const TV_LAYOUT = {
  // Screen padding optimized for 10-foot viewing
  screenPadding: 48,
  sectionPadding: 32,

  // Typography sizes for TV
  titleFontSize: 36,
  sectionHeaderFontSize: 28,
  bodyFontSize: 20,
  metaFontSize: 18,

  // Spacing
  sectionMargin: 40,
  itemSpacing: 24,

  // Focus ring
  focusBorderWidth: 4,
  focusBorderRadius: 16,
};

// TV Focus Zone IDs for organized navigation
const TV_FOCUS_ZONES = {
  HERO: 'metadata-hero',
  CAST: 'metadata-cast',
  EPISODES: 'metadata-episodes',
  TRAILERS: 'metadata-trailers',
  RECOMMENDATIONS: 'metadata-recommendations',
};

// Memoized components for better performance
const MemoizedCastSection = memo(CastSection);
const MemoizedSeriesContent = memo(SeriesContent);
const MemoizedMovieContent = memo(MovieContent);
const MemoizedMoreLikeThisSection = memo(MoreLikeThisSection);
const MemoizedRatingsSection = memo(RatingsSection);
const MemoizedCommentsSection = memo(CommentsSection);
const MemoizedCastDetailsModal = memo(CastDetailsModal);

/**
 * TV-Optimized MetadataScreen Component
 *
 * Provides enhanced viewing experience for TV platforms with:
 * - Larger fonts for 10-foot viewing distance
 * - Focus-based section navigation
 * - D-pad optimized layouts
 */
const MetadataScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams & { episodeId?: string; addonId?: string }>, string>>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { id, type, episodeId, addonId } = route.params;

  // Log route parameters for debugging
  React.useEffect(() => {
    console.log('[MetadataScreen.TV] Route params:', { id, type, episodeId, addonId });
  }, [id, type, episodeId, addonId]);

  // Consolidated hooks for better performance
  const { settings } = useSettings();
  const { currentTheme } = useTheme();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { pauseTrailer } = useTrailer();

  // Trakt integration
  const { isAuthenticated, isInWatchlist, isInCollection, addToWatchlist, removeFromWatchlist, addToCollection, removeFromCollection } = useTraktContext();

  // TV-specific refs for focus management
  const playButtonRef = useRef<any>(null);
  const castSectionRef = useRef<any>(null);
  const episodesSectionRef = useRef<any>(null);
  const trailersSectionRef = useRef<any>(null);
  const recommendationsSectionRef = useRef<any>(null);

  // Enhanced TV spacing - always use TV values
  const horizontalPadding = TV_LAYOUT.screenPadding;

  // Optimized state management - reduced state variables
  const [isContentReady, setIsContentReady] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  const [shouldLoadSecondaryData, setShouldLoadSecondaryData] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const transitionOpacity = useSharedValue(1);
  const interactionComplete = useRef(false);

  // Animation values for network/production sections
  const networkSectionOpacity = useSharedValue(0);
  const productionSectionOpacity = useSharedValue(0);

  // Comment bottom sheet state
  const [commentBottomSheetVisible, setCommentBottomSheetVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const loadingScreenRef = useRef<MetadataLoadingScreenRef>(null);
  const [loadingScreenExited, setLoadingScreenExited] = useState(false);
  // Delay flag to show sections 800ms after cast is rendered (if present)
  const [postCastDelayDone, setPostCastDelayDone] = useState(false);

  // Current focus zone for TV navigation
  const [currentFocusZone, setCurrentFocusZone] = useState<string>(TV_FOCUS_ZONES.HERO);

  const {
    metadata,
    loading,
    error: metadataError,
    cast,
    loadingCast,
    episodes,
    selectedSeason,
    loadingSeasons,
    loadMetadata,
    handleSeasonChange,
    toggleLibrary,
    inLibrary,
    groupedEpisodes,
    recommendations,
    loadingRecommendations,
    setMetadata,
    imdbId,
    tmdbId,
    collectionMovies,
    loadingCollection,
  } = useMetadata({ id, type, addonId });

  // Animate network section when data becomes available (for series)
  useEffect(() => {
    const hasNetworks = metadata?.networks && metadata.networks.length > 0;
    const hasDescription = !!metadata?.description;
    const isSeries = Object.keys(groupedEpisodes).length > 0;
    const shouldShow = shouldLoadSecondaryData && postCastDelayDone && hasNetworks && hasDescription && isSeries;

    if (shouldShow && networkSectionOpacity.value === 0) {
      networkSectionOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [metadata?.networks, metadata?.description, Object.keys(groupedEpisodes).length, shouldLoadSecondaryData, postCastDelayDone, networkSectionOpacity]);

  // Animate production section when data becomes available (for movies)
  useEffect(() => {
    const hasNetworks = metadata?.networks && metadata.networks.length > 0;
    const hasDescription = !!metadata?.description;
    const isMovie = Object.keys(groupedEpisodes).length === 0;
    const shouldShow = shouldLoadSecondaryData && postCastDelayDone && hasNetworks && hasDescription && isMovie;

    if (shouldShow && productionSectionOpacity.value === 0) {
      productionSectionOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [metadata?.networks, metadata?.description, Object.keys(groupedEpisodes).length, shouldLoadSecondaryData, postCastDelayDone, productionSectionOpacity]);

  // Manage 800ms delay after cast finishes loading (only if cast is present)
  useEffect(() => {
    if (!shouldLoadSecondaryData) {
      setPostCastDelayDone(false);
      return;
    }

    if (!loadingCast) {
      if (cast && cast.length > 0) {
        setPostCastDelayDone(false);
        const t = setTimeout(() => setPostCastDelayDone(true), 200);
        return () => clearTimeout(t);
      } else {
        // If no cast present, no need to delay
        setPostCastDelayDone(true);
      }
    } else {
      // Reset while cast is loading
      setPostCastDelayDone(false);
    }
  }, [loadingCast, cast.length, shouldLoadSecondaryData]);

  // Optimized hooks with memoization and conditional loading
  const watchProgressData = useWatchProgress(id, Object.keys(groupedEpisodes).length > 0 ? 'series' : type as 'movie' | 'series', episodeId, episodes);
  const assetData = useMetadataAssets(metadata, id, type, imdbId, settings, setMetadata);
  const animations = useMetadataAnimations(safeAreaTop, watchProgressData.watchProgress);

  // Stable logo URI from HeroSection
  const [stableLogoUri, setStableLogoUri] = React.useState<string | null>(null);

  // Extract dominant color from hero image for dynamic background
  const heroImageUri = useMemo(() => {
    if (!settings.useDominantBackgroundColor) return null;
    if (!metadata) return null;
    return assetData.bannerImage || metadata.banner || metadata.poster || null;
  }, [settings.useDominantBackgroundColor, metadata, assetData.bannerImage]);

  // Preload color extraction as soon as we have the URI
  useEffect(() => {
    if (heroImageUri) {
      InteractionManager.runAfterInteractions(() => {
        preloadDominantColor(heroImageUri);
      });
    }
  }, [heroImageUri]);

  const { dominantColor, loading: colorLoading } = useDominantColor(heroImageUri);

  // Create shared values for smooth color interpolation
  const bgFromColor = useSharedValue(currentTheme.colors.darkBackground);
  const bgToColor = useSharedValue(currentTheme.colors.darkBackground);
  const bgProgress = useSharedValue(1);

  // Update the shared value when dominant color changes
  const hasAnimatedInitialColorRef = useRef(false);
  useEffect(() => {
    const base = currentTheme.colors.darkBackground;
    const target = (settings.useDominantBackgroundColor && dominantColor && dominantColor !== '#1a1a1a' && dominantColor !== null)
      ? dominantColor
      : base;

    if (!hasAnimatedInitialColorRef.current) {
      bgFromColor.value = base as any;
      bgToColor.value = target as any;
      bgProgress.value = 0;
      bgProgress.value = withSpring(1, {
        damping: 30,
        stiffness: 90,
      });
      hasAnimatedInitialColorRef.current = true;
      return;
    }

    runOnUI(() => {
      'worklet';
      const current = interpolateColor(
        bgProgress.value,
        [0, 1],
        [bgFromColor.value as any, bgToColor.value as any]
      );
      bgFromColor.value = current as any;
      bgToColor.value = target as any;
      bgProgress.value = 0;
      bgProgress.value = withSpring(1, {
        damping: 30,
        stiffness: 90,
      });
    })();
  }, [dominantColor, currentTheme.colors.darkBackground, settings.useDominantBackgroundColor]);

  // Create an animated style for the background color
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      bgProgress.value,
      [0, 1],
      [bgFromColor.value as any, bgToColor.value as any]
    );
    return { backgroundColor: color as any };
  });

  // Animated styles for network and production sections
  const networkSectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: networkSectionOpacity.value,
  }));

  const productionSectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: productionSectionOpacity.value,
  }));

  // For compatibility with existing code, maintain the static value as well
  const dynamicBackgroundColor = useMemo(() => {
    if (settings.useDominantBackgroundColor && dominantColor && dominantColor !== '#1a1a1a' && dominantColor !== null && dominantColor !== currentTheme.colors.darkBackground) {
      return dominantColor;
    }
    return currentTheme.colors.darkBackground;
  }, [dominantColor, currentTheme.colors.darkBackground, settings.useDominantBackgroundColor]);

  // Focus effect for performance optimization
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      // Delay secondary data loading until interactions are complete
      const timer = setTimeout(() => {
        if (!interactionComplete.current) {
          InteractionManager.runAfterInteractions(() => {
            setShouldLoadSecondaryData(true);
            interactionComplete.current = true;
          });
        }
      }, 50);

      return () => {
        setIsScreenFocused(false);
        clearTimeout(timer);
      };
    }, [])
  );

  // Handle back button press - close modal if open, otherwise navigate back
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showCastModal) {
          setShowCastModal(false);
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }, [showCastModal])
  );

  // Optimize secondary data loading
  useEffect(() => {
    if (metadata && isScreenFocused && !shouldLoadSecondaryData) {
      const timer = setTimeout(() => {
        setShouldLoadSecondaryData(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [metadata, isScreenFocused, shouldLoadSecondaryData]);

  // Memory management and cleanup
  useEffect(() => {
    return () => {
      if (transitionOpacity.value !== 0) {
        transitionOpacity.value = 0;
      }
      setShouldLoadSecondaryData(false);
      interactionComplete.current = false;
    };
  }, []);

  // Memoized derived values for performance
  const isReady = useMemo(() => !loading && metadata && !metadataError, [loading, metadata, metadataError]);

  // Optimized content ready state management
  useEffect(() => {
    if (isReady && isScreenFocused) {
      setIsContentReady(true);
      transitionOpacity.value = withTiming(1, { duration: 50 });
    } else if (!isReady && isContentReady) {
      setIsContentReady(false);
      transitionOpacity.value = 0;
      setLoadingScreenExited(false);
    }
  }, [isReady, isContentReady, isScreenFocused]);

  // Trigger loading screen exit animation when content is ready
  useEffect(() => {
    if (isReady && isContentReady && !loadingScreenExited && loadingScreenRef.current) {
      loadingScreenRef.current.exit();
    }
  }, [isReady, isContentReady, loadingScreenExited]);

  // Optimized callback functions with reduced dependencies and haptics throttling
  const handleToggleLibrary = useCallback(() => {
    if (isScreenFocused) {
      Haptics.impactAsync(inLibrary ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleLibrary();
  }, [inLibrary, toggleLibrary, isScreenFocused]);

  const handleSeasonChangeWithHaptics = useCallback((seasonNumber: number) => {
    if (isScreenFocused) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleSeasonChange(seasonNumber);
  }, [handleSeasonChange, isScreenFocused]);

  const handleShowStreams = useCallback(() => {
    const { watchProgress } = watchProgressData;

    // Ensure trailer stops immediately before navigating to Streams
    try { pauseTrailer(); } catch { }

    // Helper to build episodeId from episode object
    const buildEpisodeId = (ep: any): string => {
      return ep.stremioId || `${id}:${ep.season_number}:${ep.episode_number}`;
    };

    if (Object.keys(groupedEpisodes).length > 0) {
      let progressPercent = 0;
      if (watchProgress && watchProgress.duration > 0) {
        progressPercent = (watchProgress.currentTime / watchProgress.duration) * 100;
      }

      let targetEpisodeId: string | undefined;

      if (progressPercent >= 85 && watchProgress?.episodeId) {
        let currentSeason: number | null = null;
        let currentEpisode: number | null = null;

        const parts = watchProgress.episodeId.split(':');

        if (parts.length === 3) {
          currentSeason = parseInt(parts[1], 10);
          currentEpisode = parseInt(parts[2], 10);
        } else if (parts.length === 2) {
          currentSeason = parseInt(parts[0], 10);
          currentEpisode = parseInt(parts[1], 10);
        } else {
          const match = watchProgress.episodeId.match(/s(\d+)e(\d+)/i);
          if (match) {
            currentSeason = parseInt(match[1], 10);
            currentEpisode = parseInt(match[2], 10);
          }
        }

        if (currentSeason !== null && currentEpisode !== null) {
          const nextEpisodeId = `${id}:${currentSeason}:${currentEpisode + 1}`;
          targetEpisodeId = nextEpisodeId;
        }
      }

      if (!targetEpisodeId) {
        targetEpisodeId = watchProgress?.episodeId || episodeId || (episodes.length > 0 ? buildEpisodeId(episodes[0]) : undefined);
      }

      if (targetEpisodeId) {
        const epParts = targetEpisodeId.split(':');
        let normalizedEpisodeId = targetEpisodeId;
        if (epParts.length === 2) {
          normalizedEpisodeId = `${id}:${epParts[0]}:${epParts[1]}`;
        }
        navigation.navigate('Streams', { id, type, episodeId: normalizedEpisodeId, modal: true });
        return;
      }
    }

    let fallbackEpisodeId = episodeId;
    if (episodeId && episodeId.split(':').length === 2) {
      const p = episodeId.split(':');
      fallbackEpisodeId = `${id}:${p[0]}:${p[1]}`;
    }
    navigation.navigate('Streams', { id, type, episodeId: fallbackEpisodeId, modal: true });
  }, [navigation, id, type, episodes, episodeId, watchProgressData.watchProgress]);

  const handleEpisodeSelect = useCallback((episode: Episode) => {
    if (!isScreenFocused) return;

    const episodeId = episode.stremioId || `${id}:${episode.season_number}:${episode.episode_number}`;

    requestAnimationFrame(() => {
      try { pauseTrailer(); } catch { }
      navigation.navigate('Streams', {
        id,
        type,
        episodeId,
        episodeThumbnail: episode.still_path || undefined
      });
    });
  }, [navigation, id, type, isScreenFocused, pauseTrailer]);

  const handleBack = useCallback(() => {
    if (isScreenFocused) {
      navigation.goBack();
    }
  }, [navigation, isScreenFocused]);

  const handleSelectCastMember = useCallback((castMember: any) => {
    if (!isScreenFocused) return;
    setSelectedCastMember(castMember);
    setShowCastModal(true);
  }, [isScreenFocused]);

  const handleCommentPress = useCallback((comment: any) => {
    if (!isScreenFocused) return;
    setSelectedComment(comment);
    setCommentBottomSheetVisible(true);
  }, [isScreenFocused]);

  const handleCommentBottomSheetClose = useCallback(() => {
    setCommentBottomSheetVisible(false);
    setSelectedComment(null);
  }, []);

  const handleSpoilerPress = useCallback((comment: any) => {
    Alert.alert(
      'Spoiler Warning',
      'This comment contains spoilers. Are you sure you want to reveal it?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reveal Spoilers',
          style: 'destructive',
          onPress: () => {
            setRevealedSpoilers(prev => new Set([...prev, comment.id.toString()]));
          },
        },
      ]
    );
  }, []);

  // Ultra-optimized animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: isScreenFocused ? animations.screenOpacity.value : 0.8,
  }), [isScreenFocused]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: animations.contentOpacity.value,
    transform: [{ translateY: animations.uiElementsTranslateY.value }]
  }), []);

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: transitionOpacity.value,
  }), []);

  // TV-specific styles
  const tvStyles = useMemo(() => StyleSheet.create({
    sectionContainer: {
      marginBottom: TV_LAYOUT.sectionMargin,
      paddingHorizontal: horizontalPadding,
    },
    sectionHeader: {
      fontSize: TV_LAYOUT.sectionHeaderFontSize,
      fontWeight: '700',
      color: currentTheme.colors.highEmphasis,
      marginBottom: TV_LAYOUT.itemSpacing,
      letterSpacing: 0.5,
    },
    focusableSection: {
      borderRadius: TV_LAYOUT.focusBorderRadius,
      padding: 8,
    },
    productionContainer: {
      marginTop: 0,
      marginBottom: TV_LAYOUT.sectionMargin,
      paddingHorizontal: horizontalPadding,
    },
    productionHeader: {
      fontSize: TV_LAYOUT.sectionHeaderFontSize,
      fontWeight: '700',
      color: '#fff',
      marginBottom: TV_LAYOUT.itemSpacing,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      opacity: 0.9,
    },
    productionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 16,
    },
    productionChip: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      backgroundColor: 'rgba(245,245,245,0.9)',
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 64,
    },
    productionLogo: {
      width: 100,
      height: 36,
    },
    productionText: {
      color: '#333',
      fontSize: TV_LAYOUT.metaFontSize,
      fontWeight: '600',
      opacity: 0.9,
    },
    tvDetailsContainer: {
      paddingHorizontal: horizontalPadding,
      marginTop: 16,
      marginBottom: TV_LAYOUT.sectionMargin,
    },
    tvDetailsHeader: {
      fontSize: TV_LAYOUT.sectionHeaderFontSize,
      fontWeight: '700',
      color: '#fff',
      marginBottom: TV_LAYOUT.itemSpacing,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      opacity: 0.9,
    },
    tvDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    tvDetailLabel: {
      fontSize: TV_LAYOUT.bodyFontSize,
      fontWeight: '600',
      color: '#fff',
      opacity: 0.8,
    },
    tvDetailValue: {
      fontSize: TV_LAYOUT.bodyFontSize,
      fontWeight: '500',
      color: '#fff',
      opacity: 0.9,
      textAlign: 'right',
      flex: 1,
    },
    backdropGalleryContainer: {
      paddingHorizontal: horizontalPadding,
      marginTop: TV_LAYOUT.itemSpacing,
      marginBottom: TV_LAYOUT.sectionMargin,
    },
    backdropGalleryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 32,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    backdropGalleryText: {
      flex: 1,
      fontSize: TV_LAYOUT.bodyFontSize,
      fontWeight: '600',
      opacity: 0.9,
    },
  }), [currentTheme.colors.highEmphasis, horizontalPadding]);

  // Improved error component with TV-optimized UI
  const ErrorComponent = useMemo(() => {
    if (!metadataError) return null;

    const parseError = (error: string) => {
      const statusCodeMatch = error.match(/status code (\d+)/) ||
        error.match(/"status":\s*(\d+)/) ||
        error.match(/Request failed with status code (\d+)/);

      if (statusCodeMatch) {
        const code = parseInt(statusCodeMatch[1]);
        switch (code) {
          case 404:
            return { code: '404', message: 'Content not found', userMessage: 'This content doesn\'t exist or may have been removed.' };
          case 500:
            return { code: '500', message: 'Server error', userMessage: 'The server is temporarily unavailable. Please try again later.' };
          case 502:
            return { code: '502', message: 'Bad gateway', userMessage: 'The server is experiencing issues. Please try again later.' };
          case 503:
            return { code: '503', message: 'Service unavailable', userMessage: 'The service is currently down for maintenance. Please try again later.' };
          default:
            return { code: code.toString(), message: `Error ${code}`, userMessage: 'Something went wrong. Please try again.' };
        }
      }

      if (error.includes('Network Error') || error.includes('ERR_BAD_RESPONSE')) {
        return { code: 'NETWORK', message: 'Network error', userMessage: 'Please check your internet connection and try again.' };
      }

      return { code: 'UNKNOWN', message: 'Unknown error', userMessage: 'An unexpected error occurred. Please try again.' };
    };

    const errorInfo = parseError(metadataError);

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: dynamicBackgroundColor }]}
        edges={[]}
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={96} color={currentTheme.colors.error || '#FF6B6B'} />
          <Text style={[styles.errorTitle, { color: currentTheme.colors.highEmphasis, fontSize: TV_LAYOUT.titleFontSize }]}>
            Unable to Load Content
          </Text>
          <Text style={[styles.errorCode, { color: currentTheme.colors.textMuted, fontSize: TV_LAYOUT.bodyFontSize }]}>
            Error Code: {errorInfo.code}
          </Text>
          <Text style={[styles.errorMessage, { color: currentTheme.colors.highEmphasis, fontSize: TV_LAYOUT.bodyFontSize }]}>
            {errorInfo.userMessage}
          </Text>
          <Focusable
            style={[styles.retryButton, { backgroundColor: currentTheme.colors.primary, paddingVertical: 20, paddingHorizontal: 48 }]}
            onPress={() => loadMetadata()}
            hasTVPreferredFocus
            scaleOnFocus={1.05}
          >
            <MaterialIcons name="refresh" size={28} color={currentTheme.colors.white} style={{ marginRight: 12 }} />
            <Text style={[styles.retryButtonText, { fontSize: TV_LAYOUT.bodyFontSize }]}>Try Again</Text>
          </Focusable>
          <Focusable
            style={[styles.backButton, { borderColor: currentTheme.colors.primary, borderWidth: 3, paddingVertical: 20, paddingHorizontal: 48 }]}
            onPress={() => handleBack()}
            scaleOnFocus={1.05}
          >
            <Text style={[styles.backButtonText, { color: currentTheme.colors.primary, fontSize: TV_LAYOUT.bodyFontSize }]}>Go Back</Text>
          </Focusable>
        </View>
      </SafeAreaView>
    );
  }, [metadataError, currentTheme, loadMetadata, handleBack]);

  // Show error if exists
  if (metadataError || (!loading && !metadata)) {
    return ErrorComponent;
  }

  // Show loading screen if metadata is not yet available or exit animation hasn't completed
  if (loading || !isContentReady || !loadingScreenExited) {
    return (
      <MetadataLoadingScreen
        ref={loadingScreenRef}
        type={Object.keys(groupedEpisodes).length > 0 ? 'series' : type as 'movie' | 'series'}
        onExitComplete={() => setLoadingScreenExited(true)}
      />
    );
  }

  return (
    <Animated.View style={[animatedBackgroundStyle, { flex: 1 }]}>
      <AnimatedSafeAreaView
        style={[containerStyle, styles.container]}
        edges={[]}
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" animated />

        {metadata && (
          <>
            {/* Floating Header - Optimized */}
            <FloatingHeader
              metadata={metadata}
              logoLoadError={assetData.logoLoadError}
              handleBack={handleBack}
              handleToggleLibrary={handleToggleLibrary}
              headerElementsY={animations.headerElementsY}
              inLibrary={inLibrary}
              headerOpacity={animations.headerOpacity}
              headerElementsOpacity={animations.headerElementsOpacity}
              safeAreaTop={safeAreaTop}
              setLogoLoadError={assetData.setLogoLoadError}
              stableLogoUri={stableLogoUri}
            />

            <Animated.ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              onScroll={animations.scrollHandler}
              scrollEventThrottle={16}
              bounces={Platform.OS === 'ios'}
              overScrollMode={Platform.OS === 'android' ? 'always' : 'always'}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Hero Section - Optimized for TV */}
              <HeroSection
                metadata={metadata}
                bannerImage={assetData.bannerImage}
                loadingBanner={assetData.loadingBanner}
                scrollY={animations.scrollY}
                heroHeight={animations.heroHeight}
                heroOpacity={animations.heroOpacity}
                logoOpacity={animations.logoOpacity}
                buttonsOpacity={animations.buttonsOpacity}
                buttonsTranslateY={animations.buttonsTranslateY}
                watchProgressOpacity={animations.watchProgressOpacity}
                watchProgressWidth={animations.watchProgressWidth}
                watchProgress={watchProgressData.watchProgress}
                onStableLogoUriChange={setStableLogoUri}
                type={Object.keys(groupedEpisodes).length > 0 ? 'series' : type as 'movie' | 'series'}
                getEpisodeDetails={watchProgressData.getEpisodeDetails}
                handleShowStreams={handleShowStreams}
                handleToggleLibrary={handleToggleLibrary}
                inLibrary={inLibrary}
                id={id}
                navigation={navigation}
                getPlayButtonText={watchProgressData.getPlayButtonText}
                setBannerImage={assetData.setBannerImage}
                groupedEpisodes={groupedEpisodes}
                isAuthenticated={isAuthenticated}
                isInWatchlist={isInWatchlist(id, type as 'movie' | 'show')}
                isInCollection={isInCollection(id, type as 'movie' | 'show')}
                onToggleWatchlist={async () => {
                  if (isInWatchlist(id, type as 'movie' | 'show')) {
                    await removeFromWatchlist(id, type as 'movie' | 'show');
                  } else {
                    await addToWatchlist(id, type as 'movie' | 'show');
                  }
                }}
                onToggleCollection={async () => {
                  if (isInCollection(id, type as 'movie' | 'show')) {
                    await removeFromCollection(id, type as 'movie' | 'show');
                  } else {
                    await addToCollection(id, type as 'movie' | 'show');
                  }
                }}
                dynamicBackgroundColor={dynamicBackgroundColor}
                handleBack={handleBack}
                tmdbId={tmdbId}
              />

              {/* Main Content - TV Optimized */}
              <Animated.View style={contentStyle}>
                <MetadataDetails
                  metadata={metadata}
                  imdbId={imdbId}
                  type={Object.keys(groupedEpisodes).length > 0 ? 'series' : type as 'movie' | 'series'}
                  contentId={id}
                  loadingMetadata={false}
                  renderRatings={() => imdbId && shouldLoadSecondaryData ? (
                    <MemoizedRatingsSection imdbId={imdbId} type={Object.keys(groupedEpisodes).length > 0 ? 'show' : 'movie'} />
                  ) : null}
                />

                {/* Production info row for series - TV optimized */}
                {shouldLoadSecondaryData && Object.keys(groupedEpisodes).length > 0 && metadata?.networks && metadata.networks.length > 0 && metadata?.description && (
                  <Animated.View style={[
                    tvStyles.productionContainer,
                    networkSectionAnimatedStyle,
                  ]}>
                    <Text style={tvStyles.productionHeader}>Network</Text>
                    <View style={tvStyles.productionRow}>
                      {metadata.networks.slice(0, 6).map((net) => (
                        <Focusable
                          key={String(net.id || net.name)}
                          style={tvStyles.productionChip}
                          scaleOnFocus={1.08}
                          onPress={() => {}}
                        >
                          {net.logo ? (
                            <FastImage
                              source={{ uri: net.logo }}
                              style={tvStyles.productionLogo}
                              resizeMode={FastImage.resizeMode.contain}
                            />
                          ) : (
                            <Text style={tvStyles.productionText}>{net.name}</Text>
                          )}
                        </Focusable>
                      ))}
                    </View>
                  </Animated.View>
                )}

                {/* Cast Section - TV Focus Zone */}
                {shouldLoadSecondaryData && (
                  <View ref={castSectionRef}>
                    <MemoizedCastSection
                      cast={cast}
                      loadingCast={loadingCast}
                      onSelectCastMember={handleSelectCastMember}
                      isTmdbEnrichmentEnabled={settings.enrichMetadataWithTMDB}
                    />
                  </View>
                )}

                {/* Production info for movies - TV optimized */}
                {shouldLoadSecondaryData &&
                  Object.keys(groupedEpisodes).length === 0 &&
                  metadata?.networks && Array.isArray(metadata.networks) &&
                  metadata.networks.some((n: any) => !!n?.logo) &&
                  metadata?.description && (
                    <Animated.View style={[
                      tvStyles.productionContainer,
                      productionSectionAnimatedStyle,
                    ]}>
                      <Text style={tvStyles.productionHeader}>Production</Text>
                      <View style={tvStyles.productionRow}>
                        {metadata.networks
                          .filter((net: any) => !!net?.logo)
                          .slice(0, 6)
                          .map((net: any) => (
                            <View key={String(net.id || net.name)} style={tvStyles.productionChip}>
                              <FastImage
                                source={{ uri: net.logo }}
                                style={tvStyles.productionLogo}
                                resizeMode={FastImage.resizeMode.contain}
                              />
                            </View>
                          ))}
                      </View>
                    </Animated.View>
                  )}

                {/* Trailers Section - TV Focus Zone */}
                {shouldLoadSecondaryData && tmdbId && settings.enrichMetadataWithTMDB && (
                  <View ref={trailersSectionRef}>
                    <TrailersSection
                      tmdbId={tmdbId}
                      type={Object.keys(groupedEpisodes).length > 0 ? 'tv' : 'movie'}
                      contentId={id}
                      contentTitle={metadata?.name || (metadata as any)?.title || 'Unknown'}
                    />
                  </View>
                )}

                {/* Comments Section */}
                {shouldLoadSecondaryData && imdbId && (
                  <MemoizedCommentsSection
                    imdbId={imdbId}
                    type={Object.keys(groupedEpisodes).length > 0 ? 'show' : 'movie'}
                    onCommentPress={handleCommentPress}
                  />
                )}

                {/* Movie Details section - TV optimized */}
                {shouldLoadSecondaryData && Object.keys(groupedEpisodes).length === 0 && metadata?.movieDetails && (
                  <View style={tvStyles.tvDetailsContainer}>
                    <Text style={tvStyles.tvDetailsHeader}>Movie Details</Text>

                    {metadata.movieDetails.tagline && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Tagline</Text>
                        <Text style={[tvStyles.tvDetailValue, { fontStyle: 'italic' }]}>
                          "{metadata.movieDetails.tagline}"
                        </Text>
                      </View>
                    )}

                    {metadata.movieDetails.status && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Status</Text>
                        <Text style={tvStyles.tvDetailValue}>{metadata.movieDetails.status}</Text>
                      </View>
                    )}

                    {metadata.movieDetails.releaseDate && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Release Date</Text>
                        <Text style={tvStyles.tvDetailValue}>
                          {new Date(metadata.movieDetails.releaseDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    )}

                    {metadata.movieDetails.runtime && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Runtime</Text>
                        <Text style={tvStyles.tvDetailValue}>
                          {Math.floor(metadata.movieDetails.runtime / 60)}h {metadata.movieDetails.runtime % 60}m
                        </Text>
                      </View>
                    )}

                    {metadata.movieDetails.budget && metadata.movieDetails.budget > 0 && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Budget</Text>
                        <Text style={tvStyles.tvDetailValue}>
                          ${metadata.movieDetails.budget.toLocaleString()}
                        </Text>
                      </View>
                    )}

                    {metadata.movieDetails.revenue && metadata.movieDetails.revenue > 0 && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Revenue</Text>
                        <Text style={tvStyles.tvDetailValue}>
                          ${metadata.movieDetails.revenue.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Backdrop Gallery - TV optimized button */}
                {shouldLoadSecondaryData && Object.keys(groupedEpisodes).length === 0 && metadata?.tmdbId && settings.enrichMetadataWithTMDB && (
                  <View style={tvStyles.backdropGalleryContainer}>
                    <Focusable
                      style={tvStyles.backdropGalleryButton}
                      scaleOnFocus={1.03}
                      onPress={() => navigation.navigate('BackdropGallery' as any, {
                        tmdbId: metadata.tmdbId,
                        type: 'movie',
                        title: metadata.name || 'Gallery'
                      })}
                    >
                      <Text style={[tvStyles.backdropGalleryText, { color: currentTheme.colors.highEmphasis }]}>Backdrop Gallery</Text>
                      <MaterialIcons name="chevron-right" size={32} color={currentTheme.colors.highEmphasis} />
                    </Focusable>
                  </View>
                )}

                {/* Collection Section */}
                {shouldLoadSecondaryData &&
                  Object.keys(groupedEpisodes).length === 0 &&
                  metadata?.collection &&
                  settings.enrichMetadataWithTMDB && (
                    <CollectionSection
                      collectionName={metadata.collection.name}
                      collectionMovies={collectionMovies}
                      loadingCollection={loadingCollection}
                    />
                  )}

                {/* Series/Movie Content - TV Focus Zone for Episodes */}
                {Object.keys(groupedEpisodes).length > 0 ? (
                  <View ref={episodesSectionRef}>
                    <MemoizedSeriesContent
                      episodes={Object.values(groupedEpisodes).flat()}
                      selectedSeason={selectedSeason}
                      loadingSeasons={loadingSeasons}
                      onSeasonChange={handleSeasonChangeWithHaptics}
                      onSelectEpisode={handleEpisodeSelect}
                      groupedEpisodes={groupedEpisodes}
                      metadata={metadata || undefined}
                      imdbId={imdbId || undefined}
                    />
                  </View>
                ) : (
                  metadata && <MemoizedMovieContent metadata={metadata} />
                )}

                {/* TV Details section for series - TV optimized */}
                {shouldLoadSecondaryData && Object.keys(groupedEpisodes).length > 0 && metadata?.tvDetails && (
                  <View style={tvStyles.tvDetailsContainer}>
                    <Text style={tvStyles.tvDetailsHeader}>Show Details</Text>

                    {metadata.tvDetails.status && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Status</Text>
                        <Text style={tvStyles.tvDetailValue}>{metadata.tvDetails.status}</Text>
                      </View>
                    )}

                    {metadata.tvDetails.firstAirDate && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>First Air Date</Text>
                        <Text style={tvStyles.tvDetailValue}>
                          {new Date(metadata.tvDetails.firstAirDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    )}

                    {metadata.tvDetails.lastAirDate && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Last Air Date</Text>
                        <Text style={tvStyles.tvDetailValue}>
                          {new Date(metadata.tvDetails.lastAirDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    )}

                    {metadata.tvDetails.numberOfSeasons && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Seasons</Text>
                        <Text style={tvStyles.tvDetailValue}>{metadata.tvDetails.numberOfSeasons}</Text>
                      </View>
                    )}

                    {metadata.tvDetails.numberOfEpisodes && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Total Episodes</Text>
                        <Text style={tvStyles.tvDetailValue}>{metadata.tvDetails.numberOfEpisodes}</Text>
                      </View>
                    )}

                    {metadata.tvDetails.episodeRunTime && metadata.tvDetails.episodeRunTime.length > 0 && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Episode Runtime</Text>
                        <Text style={tvStyles.tvDetailValue}>
                          {metadata.tvDetails.episodeRunTime.join(' - ')} min
                        </Text>
                      </View>
                    )}

                    {metadata.tvDetails.createdBy && metadata.tvDetails.createdBy.length > 0 && (
                      <View style={tvStyles.tvDetailRow}>
                        <Text style={tvStyles.tvDetailLabel}>Created By</Text>
                        <Text style={tvStyles.tvDetailValue}>
                          {metadata.tvDetails.createdBy.map(creator => creator.name).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Backdrop Gallery for TV shows - TV optimized */}
                {shouldLoadSecondaryData && Object.keys(groupedEpisodes).length > 0 && metadata?.tmdbId && settings.enrichMetadataWithTMDB && (
                  <View style={tvStyles.backdropGalleryContainer}>
                    <Focusable
                      style={tvStyles.backdropGalleryButton}
                      scaleOnFocus={1.03}
                      onPress={() => navigation.navigate('BackdropGallery' as any, {
                        tmdbId: metadata.tmdbId,
                        type: 'tv',
                        title: metadata.name || 'Gallery'
                      })}
                    >
                      <Text style={[tvStyles.backdropGalleryText, { color: currentTheme.colors.highEmphasis }]}>Backdrop Gallery</Text>
                      <MaterialIcons name="chevron-right" size={32} color={currentTheme.colors.highEmphasis} />
                    </Focusable>
                  </View>
                )}

                {/* Recommendations Section - TV Focus Zone */}
                {shouldLoadSecondaryData && (
                  <View ref={recommendationsSectionRef}>
                    <MemoizedMoreLikeThisSection
                      recommendations={recommendations}
                      loadingRecommendations={loadingRecommendations}
                    />
                  </View>
                )}
              </Animated.View>
            </Animated.ScrollView>
          </>
        )}

        {/* Cast Details Modal */}
        {showCastModal && (
          <MemoizedCastDetailsModal
            visible={showCastModal}
            onClose={() => setShowCastModal(false)}
            castMember={selectedCastMember}
          />
        )}

        {/* Comment Bottom Sheet */}
        <CommentBottomSheet
          comment={selectedComment}
          visible={commentBottomSheetVisible}
          onClose={handleCommentBottomSheetClose}
          theme={currentTheme}
          isSpoilerRevealed={selectedComment ? revealedSpoilers.has(selectedComment.id.toString()) : false}
          onSpoilerPress={() => selectedComment && handleSpoilerPress(selectedComment)}
        />
      </AnimatedSafeAreaView>
    </Animated.View>
  );
};

// Optimized styles with TV-specific values
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TV_LAYOUT.screenPadding,
  },
  errorTitle: {
    fontSize: TV_LAYOUT.titleFontSize,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  errorCode: {
    fontSize: TV_LAYOUT.bodyFontSize,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  errorMessage: {
    fontSize: TV_LAYOUT.bodyFontSize,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 30,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 32,
    marginBottom: 24,
  },
  retryButtonText: {
    fontSize: TV_LAYOUT.bodyFontSize,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 32,
    borderWidth: 3,
  },
  backButtonText: {
    fontSize: TV_LAYOUT.bodyFontSize,
    fontWeight: '600',
  },
});

export default MetadataScreen;
