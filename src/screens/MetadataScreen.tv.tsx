/**
 * MetadataScreen.tv.tsx
 *
 * TV-specific metadata screen with complete D-pad navigation support,
 * focus memory persistence, and inter-section navigation.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - All buttons are focusable (Play, Trailer, Add to List)
 * - Cast section is horizontally scrollable with D-pad
 * - Episodes list is navigable for series
 * - Back returns to previous screen with focus restored
 * - Integration with TVNavigationContext for global focus state
 * - Uses TV-specific HeroSection and CastSection components
 */

import { MaterialIcons } from '@expo/vector-icons';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
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
  findNodeHandle,
} from 'react-native';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Focusable, { FocusableRef } from '../components/common/Focusable';
import {
  MetadataLoadingScreen,
  MetadataLoadingScreenRef,
} from '../components/loading/MetadataLoadingScreen';
import { CastDetailsModal } from '../components/metadata/CastDetailsModal';
import { CastSection } from '../components/metadata/CastSection';
import { CommentsSection, CommentBottomSheet } from '../components/metadata/CommentsSection';
import { MoreLikeThisSection } from '../components/metadata/MoreLikeThisSection';
import { MovieContent } from '../components/metadata/MovieContent';
import { SeriesContent } from '../components/metadata/SeriesContent';
import { useTheme } from '../contexts/ThemeContext';
import { useTraktContext } from '../contexts/TraktContext';
import { useMetadata } from '../hooks/useMetadata';
import { useDominantColor, preloadDominantColor } from '../hooks/useDominantColor';
import { RatingsSection } from '../components/metadata/RatingsSection';
import TrailersSection from '../components/metadata/TrailersSection';
import CollectionSection from '../components/metadata/CollectionSection';
import { RouteParams, Episode } from '../types/metadata';

const AnimatedSafeAreaView = createAnimatedComponent(SafeAreaView);

import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../hooks/useSettings';
import { useTrailer } from '../contexts/TrailerContext';

import FastImage from '@d11/react-native-fast-image';

// Import optimized components and hooks
import HeroSection from '../components/metadata/HeroSection';
import FloatingHeader from '../components/metadata/FloatingHeader';
import MetadataDetails from '../components/metadata/MetadataDetails';
import { useMetadataAnimations } from '../hooks/useMetadataAnimations';
import { useMetadataAssets } from '../hooks/useMetadataAssets';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { TraktService, TraktPlaybackItem } from '../services/traktService';
import { tmdbService } from '../services/tmdbService';
import { catalogService } from '../services/catalogService';

// TV-specific imports
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { useTVBackHandler } from '../hooks/useTVBackHandler';

const { height } = Dimensions.get('window');

// Memoized components
const MemoizedCastSection = memo(CastSection);
const MemoizedSeriesContent = memo(SeriesContent);
const MemoizedMovieContent = memo(MovieContent);
const MemoizedMoreLikeThisSection = memo(MoreLikeThisSection);

const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

const MemoizedRatingsSection = memo(RatingsSection);
const MemoizedCommentsSection = memo(CommentsSection);
const MemoizedCastDetailsModal = memo(CastDetailsModal);

// =============================================================================
// Main Component
// =============================================================================

const MetadataScreenTV: React.FC = () => {
  const route =
    useRoute<
      RouteProp<Record<string, RouteParams & { episodeId?: string; addonId?: string }>, string>
    >();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { id, type, episodeId, addonId } = route.params;

  // Consolidated hooks
  const { settings } = useSettings();
  const { currentTheme } = useTheme();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { pauseTrailer } = useTrailer();

  // Trakt integration
  const {
    isAuthenticated,
    isInWatchlist,
    isInCollection,
    addToWatchlist,
    removeFromWatchlist,
    addToCollection,
    removeFromCollection,
  } = useTraktContext();

  // TV Navigation context
  const tvNav = useTVNavigationOptional();
  const spatialNav = useSpatialNavigation('MetadataScreen', {
    autoRestoreFocus: true,
    defaultFocusId: 'play-button',
  });

  // Section refs for inter-section focus navigation
  const heroSectionRef = useRef<any>(null);
  const castSectionRef = useRef<any>(null);
  const seriesContentRef = useRef<any>(null);
  const moreLikeThisRef = useRef<any>(null);

  // Responsive sizing
  const deviceWidth = Dimensions.get('window').width;
  const deviceHeight = Dimensions.get('window').height;

  const getDeviceType = useCallback(() => {
    if (deviceWidth >= BREAKPOINTS.tv) return 'tv';
    if (deviceWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
    if (deviceWidth >= BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
  }, [deviceWidth]);

  const deviceType = getDeviceType();
  const isTablet = deviceType === 'tablet';
  const isLargeTablet = deviceType === 'largeTablet';
  const isTV = deviceType === 'tv' || Platform.isTV;
  const isLargeScreen = isTablet || isLargeTablet || isTV;

  const horizontalPadding = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return 32;
      case 'largeTablet':
        return 28;
      case 'tablet':
        return 24;
      default:
        return 16;
    }
  }, [deviceType]);

  // State management
  const [isContentReady, setIsContentReady] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  const [shouldLoadSecondaryData, setShouldLoadSecondaryData] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const transitionOpacity = useSharedValue(1);
  const interactionComplete = useRef(false);

  // Animation values
  const networkSectionOpacity = useSharedValue(0);
  const productionSectionOpacity = useSharedValue(0);

  // Comment state
  const [commentBottomSheetVisible, setCommentBottomSheetVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const loadingScreenRef = useRef<MetadataLoadingScreenRef>(null);
  const [loadingScreenExited, setLoadingScreenExited] = useState(false);
  const [postCastDelayDone, setPostCastDelayDone] = useState(false);

  // Track current focused section for better focus restoration
  const [currentFocusedSection, setCurrentFocusedSection] = useState<string>('hero');

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

  // Hooks with memoization
  const watchProgressData = useWatchProgress(
    id,
    Object.keys(groupedEpisodes).length > 0 ? 'series' : (type as 'movie' | 'series'),
    episodeId,
    episodes
  );
  const assetData = useMetadataAssets(metadata, id, type, imdbId, settings, setMetadata);
  const animations = useMetadataAnimations(safeAreaTop, watchProgressData.watchProgress);

  // Stable logo URI
  const [stableLogoUri, setStableLogoUri] = React.useState<string | null>(null);

  // Dominant color extraction
  const heroImageUri = useMemo(() => {
    if (!settings.useDominantBackgroundColor) return null;
    if (!metadata) return null;
    return assetData.bannerImage || metadata.banner || metadata.poster || null;
  }, [settings.useDominantBackgroundColor, metadata, assetData.bannerImage]);

  useEffect(() => {
    if (heroImageUri) {
      InteractionManager.runAfterInteractions(() => {
        preloadDominantColor(heroImageUri);
      });
    }
  }, [heroImageUri]);

  const { dominantColor, loading: colorLoading } = useDominantColor(heroImageUri);

  // Color animation shared values
  const bgFromColor = useSharedValue(currentTheme.colors.darkBackground);
  const bgToColor = useSharedValue(currentTheme.colors.darkBackground);
  const bgProgress = useSharedValue(1);

  const hasAnimatedInitialColorRef = useRef(false);
  useEffect(() => {
    const base = currentTheme.colors.darkBackground;
    const target =
      settings.useDominantBackgroundColor &&
      dominantColor &&
      dominantColor !== '#1a1a1a' &&
      dominantColor !== null
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

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      bgProgress.value,
      [0, 1],
      [bgFromColor.value as any, bgToColor.value as any]
    );
    return { backgroundColor: color as any };
  });

  const networkSectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: networkSectionOpacity.value,
  }));

  const productionSectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: productionSectionOpacity.value,
  }));

  const dynamicBackgroundColor = useMemo(() => {
    if (
      settings.useDominantBackgroundColor &&
      dominantColor &&
      dominantColor !== '#1a1a1a' &&
      dominantColor !== null &&
      dominantColor !== currentTheme.colors.darkBackground
    ) {
      return dominantColor;
    }
    return currentTheme.colors.darkBackground;
  }, [dominantColor, currentTheme.colors.darkBackground, settings.useDominantBackgroundColor]);

  // =============================================================================
  // TV Back Handler
  // =============================================================================

  const handleBack = useCallback(() => {
    if (showCastModal) {
      setShowCastModal(false);
      return true;
    }

    // Save current focus state before going back
    if (tvNav) {
      const lastFocusId = tvNav.getCurrentFocusId() || currentFocusedSection;
      navigation.setParams({ lastFocusId } as any);
    }

    navigation.goBack();
    return true;
  }, [showCastModal, navigation, tvNav, currentFocusedSection]);

  // Use TV back handler
  useTVBackHandler(handleBack, { enabled: Platform.isTV });

  // =============================================================================
  // Focus Effects
  // =============================================================================

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      // Restore focus from navigation params
      const params = route.params as any;
      if (params?.lastFocusId && tvNav) {
        requestAnimationFrame(() => {
          tvNav.setCurrentFocusId(params.lastFocusId);
          spatialNav.restoreFocus();
        });
      }

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

        // Save focus state when leaving
        if (tvNav) {
          spatialNav.saveFocus(currentFocusedSection);
        }
      };
    }, [route.params, tvNav, spatialNav, currentFocusedSection])
  );

  // Hardware back button (Android TV)
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return handleBack();
      });

      return () => backHandler.remove();
    }, [handleBack])
  );

  // =============================================================================
  // Section Animation Effects
  // =============================================================================

  useEffect(() => {
    const hasNetworks = metadata?.networks && metadata.networks.length > 0;
    const hasDescription = !!metadata?.description;
    const isSeries = Object.keys(groupedEpisodes).length > 0;
    const shouldShow =
      shouldLoadSecondaryData && postCastDelayDone && hasNetworks && hasDescription && isSeries;

    if (shouldShow && networkSectionOpacity.value === 0) {
      networkSectionOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [
    metadata?.networks,
    metadata?.description,
    Object.keys(groupedEpisodes).length,
    shouldLoadSecondaryData,
    postCastDelayDone,
  ]);

  useEffect(() => {
    const hasNetworks = metadata?.networks && metadata.networks.length > 0;
    const hasDescription = !!metadata?.description;
    const isMovie = Object.keys(groupedEpisodes).length === 0;
    const shouldShow =
      shouldLoadSecondaryData && postCastDelayDone && hasNetworks && hasDescription && isMovie;

    if (shouldShow && productionSectionOpacity.value === 0) {
      productionSectionOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [
    metadata?.networks,
    metadata?.description,
    Object.keys(groupedEpisodes).length,
    shouldLoadSecondaryData,
    postCastDelayDone,
  ]);

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
        setPostCastDelayDone(true);
      }
    } else {
      setPostCastDelayDone(false);
    }
  }, [loadingCast, cast?.length, shouldLoadSecondaryData]);

  // =============================================================================
  // Section Focus Handlers
  // =============================================================================

  const handleHeroSectionFocus = useCallback(() => {
    setCurrentFocusedSection('hero');
    spatialNav.saveFocus('play-button');
  }, [spatialNav]);

  const handleCastSectionFocus = useCallback(() => {
    setCurrentFocusedSection('cast');
    spatialNav.saveFocus('cast-section');
  }, [spatialNav]);

  const handleSeriesContentFocus = useCallback(() => {
    setCurrentFocusedSection('series');
    spatialNav.saveFocus('series-content');
  }, [spatialNav]);

  const handleRecommendationsFocus = useCallback(() => {
    setCurrentFocusedSection('recommendations');
    spatialNav.saveFocus('recommendations');
  }, [spatialNav]);

  // =============================================================================
  // Optimized Callbacks
  // =============================================================================

  const isReady = useMemo(
    () => !loading && metadata && !metadataError,
    [loading, metadata, metadataError]
  );

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

  useEffect(() => {
    if (isReady && isContentReady && !loadingScreenExited && loadingScreenRef.current) {
      loadingScreenRef.current.exit();
    }
  }, [isReady, isContentReady, loadingScreenExited]);

  const handleToggleLibrary = useCallback(() => {
    if (isScreenFocused) {
      Haptics.impactAsync(
        inLibrary ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
      );
    }
    toggleLibrary();
  }, [inLibrary, toggleLibrary, isScreenFocused]);

  const handleSeasonChangeWithHaptics = useCallback(
    (seasonNumber: number) => {
      if (isScreenFocused) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      handleSeasonChange(seasonNumber);
    },
    [handleSeasonChange, isScreenFocused]
  );

  const handleShowStreams = useCallback(() => {
    const { watchProgress } = watchProgressData;

    try {
      pauseTrailer();
    } catch {}

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
        targetEpisodeId =
          watchProgress?.episodeId ||
          episodeId ||
          (episodes.length > 0 ? buildEpisodeId(episodes[0]) : undefined);
      }

      if (targetEpisodeId) {
        const epParts = targetEpisodeId.split(':');
        let normalizedEpisodeId = targetEpisodeId;
        if (epParts.length === 2) {
          normalizedEpisodeId = `${id}:${epParts[0]}:${epParts[1]}`;
        }
        navigation.navigate('Streams', { id, type, episodeId: normalizedEpisodeId });
        return;
      }
    }

    let fallbackEpisodeId = episodeId;
    if (episodeId && episodeId.split(':').length === 2) {
      const p = episodeId.split(':');
      fallbackEpisodeId = `${id}:${p[0]}:${p[1]}`;
    }
    navigation.navigate('Streams', { id, type, episodeId: fallbackEpisodeId });
  }, [
    navigation,
    id,
    type,
    episodes,
    episodeId,
    watchProgressData.watchProgress,
    pauseTrailer,
    groupedEpisodes,
  ]);

  const handleEpisodeSelect = useCallback(
    (episode: Episode) => {
      if (!isScreenFocused) return;

      const episodeId =
        episode.stremioId || `${id}:${episode.season_number}:${episode.episode_number}`;

      requestAnimationFrame(() => {
        try {
          pauseTrailer();
        } catch {}
        navigation.navigate('Streams', {
          id,
          type,
          episodeId,
          episodeThumbnail: episode.still_path || undefined,
        });
      });
    },
    [navigation, id, type, isScreenFocused, pauseTrailer]
  );

  const handleSelectCastMember = useCallback(
    (castMember: any) => {
      if (!isScreenFocused) return;
      setSelectedCastMember(castMember);
      setShowCastModal(true);
    },
    [isScreenFocused]
  );

  const handleCommentPress = useCallback(
    (comment: any) => {
      if (!isScreenFocused) return;
      setSelectedComment(comment);
      setCommentBottomSheetVisible(true);
    },
    [isScreenFocused]
  );

  const handleCommentBottomSheetClose = useCallback(() => {
    setCommentBottomSheetVisible(false);
    setSelectedComment(null);
  }, []);

  const handleSpoilerPress = useCallback((comment: any) => {
    Alert.alert(
      'Spoiler Warning',
      'This comment contains spoilers. Are you sure you want to reveal it?',
      [
        { text: 'Cancel', style: 'cancel' },
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

  // =============================================================================
  // Animated Styles
  // =============================================================================

  const containerStyle = useAnimatedStyle(
    () => ({
      opacity: isScreenFocused ? animations.screenOpacity.value : 0.8,
    }),
    [isScreenFocused]
  );

  const contentStyle = useAnimatedStyle(
    () => ({
      opacity: animations.contentOpacity.value,
      transform: [{ translateY: animations.uiElementsTranslateY.value }],
    }),
    []
  );

  const transitionStyle = useAnimatedStyle(
    () => ({
      opacity: transitionOpacity.value,
    }),
    []
  );

  // =============================================================================
  // Get Next Focus Props
  // =============================================================================

  const getHeroNextFocusDown = useCallback(() => {
    if (cast && cast.length > 0 && castSectionRef.current) {
      return findNodeHandle(castSectionRef.current) ?? undefined;
    }
    if (Object.keys(groupedEpisodes).length > 0 && seriesContentRef.current) {
      return findNodeHandle(seriesContentRef.current) ?? undefined;
    }
    if (recommendations && recommendations.length > 0 && moreLikeThisRef.current) {
      return findNodeHandle(moreLikeThisRef.current) ?? undefined;
    }
    return undefined;
  }, [cast, groupedEpisodes, recommendations]);

  const getCastNextFocusDown = useCallback(() => {
    if (Object.keys(groupedEpisodes).length > 0 && seriesContentRef.current) {
      return findNodeHandle(seriesContentRef.current) ?? undefined;
    }
    if (recommendations && recommendations.length > 0 && moreLikeThisRef.current) {
      return findNodeHandle(moreLikeThisRef.current) ?? undefined;
    }
    return undefined;
  }, [groupedEpisodes, recommendations]);

  // =============================================================================
  // Error Component
  // =============================================================================

  const ErrorComponent = useMemo(() => {
    if (!metadataError) return null;

    const parseError = (error: string) => {
      const statusCodeMatch =
        error.match(/status code (\d+)/) ||
        error.match(/"status":\s*(\d+)/) ||
        error.match(/Request failed with status code (\d+)/);

      if (statusCodeMatch) {
        const code = parseInt(statusCodeMatch[1]);
        switch (code) {
          case 404:
            return {
              code: '404',
              message: 'Content not found',
              userMessage: "This content doesn't exist or may have been removed.",
            };
          case 500:
            return {
              code: '500',
              message: 'Server error',
              userMessage: 'The server is temporarily unavailable. Please try again later.',
            };
          default:
            return {
              code: code.toString(),
              message: `Error ${code}`,
              userMessage: 'Something went wrong. Please try again.',
            };
        }
      }

      if (error.includes('Network Error')) {
        return {
          code: 'NETWORK',
          message: 'Network error',
          userMessage: 'Please check your internet connection and try again.',
        };
      }

      return {
        code: 'UNKNOWN',
        message: 'Unknown error',
        userMessage: 'An unexpected error occurred. Please try again.',
      };
    };

    const errorInfo = parseError(metadataError);

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: dynamicBackgroundColor }]}
        edges={[]}
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={72}
            color={currentTheme.colors.error || '#FF6B6B'}
          />
          <Text
            style={[styles.errorTitle, { color: currentTheme.colors.highEmphasis, fontSize: 24 }]}
          >
            Unable to Load Content
          </Text>
          <Text style={[styles.errorCode, { color: currentTheme.colors.textMuted, fontSize: 16 }]}>
            Error Code: {errorInfo.code}
          </Text>
          <Text
            style={[styles.errorMessage, { color: currentTheme.colors.highEmphasis, fontSize: 18 }]}
          >
            {errorInfo.userMessage}
          </Text>
          <Focusable
            onPress={loadMetadata}
            hasTVPreferredFocus={true}
            focusId="retry-button"
            style={[styles.retryButton, { backgroundColor: currentTheme.colors.primary }]}
            animationConfig={{
              focusScale: 1.08,
              showFocusBorder: true,
              focusBorderColor: '#fff',
              focusBorderWidth: 3,
            }}
            accessibilityLabel="Try Again"
          >
            <MaterialIcons
              name="refresh"
              size={24}
              color={currentTheme.colors.white}
              style={{ marginRight: 12 }}
            />
            <Text style={[styles.retryButtonText, { fontSize: 18 }]}>Try Again</Text>
          </Focusable>
          <Focusable
            onPress={handleBack}
            focusId="back-button-error"
            style={[styles.backButtonError, { borderColor: currentTheme.colors.primary }]}
            animationConfig={{
              focusScale: 1.08,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary,
              focusBorderWidth: 3,
            }}
            accessibilityLabel="Go Back"
          >
            <Text
              style={[styles.backButtonText, { color: currentTheme.colors.primary, fontSize: 18 }]}
            >
              Go Back
            </Text>
          </Focusable>
        </View>
      </SafeAreaView>
    );
  }, [metadataError, currentTheme, loadMetadata, handleBack, dynamicBackgroundColor]);

  // =============================================================================
  // Loading Screen
  // =============================================================================

  if (metadataError || (!loading && !metadata)) {
    return ErrorComponent;
  }

  if (loading || !isContentReady || !loadingScreenExited) {
    return (
      <MetadataLoadingScreen
        ref={loadingScreenRef}
        type={Object.keys(groupedEpisodes).length > 0 ? 'series' : (type as 'movie' | 'series')}
        onExitComplete={() => setLoadingScreenExited(true)}
      />
    );
  }

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <Animated.View style={[animatedBackgroundStyle, { flex: 1 }]}>
      <AnimatedSafeAreaView style={[containerStyle, styles.container]} edges={[]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" animated />

        {metadata && (
          <>
            {/* Floating Header */}
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
              bounces={false}
              overScrollMode="never"
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Hero Section with TV Navigation */}
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
                type={
                  Object.keys(groupedEpisodes).length > 0 ? 'series' : (type as 'movie' | 'series')
                }
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
                // TV-specific props
                hasTVPreferredFocus={true}
                onFocusSection={handleHeroSectionFocus}
                nextFocusDown={getHeroNextFocusDown()}
              />

              {/* Main Content */}
              <Animated.View style={contentStyle}>
                <MetadataDetails
                  metadata={metadata}
                  imdbId={imdbId}
                  type={
                    Object.keys(groupedEpisodes).length > 0
                      ? 'series'
                      : (type as 'movie' | 'series')
                  }
                  contentId={id}
                  loadingMetadata={false}
                  renderRatings={() =>
                    imdbId && shouldLoadSecondaryData ? (
                      <MemoizedRatingsSection
                        imdbId={imdbId}
                        type={Object.keys(groupedEpisodes).length > 0 ? 'show' : 'movie'}
                      />
                    ) : null
                  }
                />

                {/* Network Section for Series */}
                {shouldLoadSecondaryData &&
                  Object.keys(groupedEpisodes).length > 0 &&
                  metadata?.networks &&
                  metadata.networks.length > 0 &&
                  metadata?.description && (
                    <Animated.View
                      style={[
                        styles.productionContainer,
                        networkSectionAnimatedStyle,
                        { paddingHorizontal: horizontalPadding },
                      ]}
                    >
                      <Text style={[styles.productionHeader, { fontSize: 20, marginBottom: 16 }]}>
                        Network
                      </Text>
                      <View style={[styles.productionRow, { gap: 12 }]}>
                        {metadata.networks.slice(0, 6).map((net: any) => (
                          <View
                            key={String(net.id || net.name)}
                            style={[
                              styles.productionChip,
                              {
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                minHeight: 48,
                                borderRadius: 16,
                              },
                            ]}
                          >
                            {net.logo ? (
                              <FastImage
                                source={{ uri: net.logo }}
                                style={[styles.productionLogo, { width: 80, height: 28 }]}
                                resizeMode={FastImage.resizeMode.contain}
                              />
                            ) : (
                              <Text style={[styles.productionText, { fontSize: 14 }]}>
                                {net.name}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </Animated.View>
                  )}

                {/* Cast Section with TV Navigation */}
                {shouldLoadSecondaryData && (
                  <View ref={castSectionRef}>
                    <MemoizedCastSection
                      cast={cast}
                      loadingCast={loadingCast}
                      onSelectCastMember={handleSelectCastMember}
                      isTmdbEnrichmentEnabled={settings.enrichMetadataWithTMDB}
                      // TV-specific props (these will be used by CastSection.tv.tsx)
                      sectionId="cast-section"
                      nextFocusUp={heroSectionRef}
                      nextFocusDown={getCastNextFocusDown()}
                      onFocusEnter={handleCastSectionFocus}
                    />
                  </View>
                )}

                {/* Production Section for Movies */}
                {shouldLoadSecondaryData &&
                  Object.keys(groupedEpisodes).length === 0 &&
                  metadata?.networks &&
                  Array.isArray(metadata.networks) &&
                  metadata.networks.some((n: any) => !!n?.logo) &&
                  metadata?.description && (
                    <Animated.View
                      style={[
                        styles.productionContainer,
                        productionSectionAnimatedStyle,
                        { paddingHorizontal: horizontalPadding },
                      ]}
                    >
                      <Text style={[styles.productionHeader, { fontSize: 20, marginBottom: 16 }]}>
                        Production
                      </Text>
                      <View style={[styles.productionRow, { gap: 12 }]}>
                        {metadata.networks
                          .filter((net: any) => !!net?.logo)
                          .slice(0, 6)
                          .map((net: any) => (
                            <View
                              key={String(net.id || net.name)}
                              style={[
                                styles.productionChip,
                                {
                                  paddingVertical: 12,
                                  paddingHorizontal: 16,
                                  minHeight: 48,
                                  borderRadius: 16,
                                },
                              ]}
                            >
                              <FastImage
                                source={{ uri: net.logo }}
                                style={[styles.productionLogo, { width: 80, height: 28 }]}
                                resizeMode={FastImage.resizeMode.contain}
                              />
                            </View>
                          ))}
                      </View>
                    </Animated.View>
                  )}

                {/* Trailers Section */}
                {shouldLoadSecondaryData && tmdbId && settings.enrichMetadataWithTMDB && (
                  <TrailersSection
                    tmdbId={tmdbId}
                    type={Object.keys(groupedEpisodes).length > 0 ? 'tv' : 'movie'}
                    contentId={id}
                    contentTitle={metadata?.name || (metadata as any)?.title || 'Unknown'}
                  />
                )}

                {/* Comments Section */}
                {shouldLoadSecondaryData && imdbId && (
                  <MemoizedCommentsSection
                    imdbId={imdbId}
                    type={Object.keys(groupedEpisodes).length > 0 ? 'show' : 'movie'}
                    onCommentPress={handleCommentPress}
                  />
                )}

                {/* Series Content with TV Navigation */}
                {Object.keys(groupedEpisodes).length > 0 && (
                  <View ref={seriesContentRef}>
                    <MemoizedSeriesContent
                      selectedSeason={selectedSeason}
                      groupedEpisodes={groupedEpisodes}
                      loadingSeasons={loadingSeasons}
                      onSeasonChange={handleSeasonChangeWithHaptics}
                      onEpisodeSelect={handleEpisodeSelect}
                      // TV-specific props (these will be used by SeriesContent.tv.tsx)
                      sectionId="series-content"
                      nextFocusUp={castSectionRef.current ? castSectionRef : heroSectionRef}
                      nextFocusDown={moreLikeThisRef}
                      onFocusEnter={handleSeriesContentFocus}
                    />
                  </View>
                )}

                {/* Collection Section */}
                {shouldLoadSecondaryData && collectionMovies && collectionMovies.length > 1 && (
                  <CollectionSection
                    movies={collectionMovies}
                    loading={loadingCollection}
                    currentMovieId={id}
                  />
                )}

                {/* More Like This Section */}
                {shouldLoadSecondaryData && (
                  <View ref={moreLikeThisRef}>
                    <MemoizedMoreLikeThisSection
                      recommendations={recommendations}
                      loading={loadingRecommendations}
                      contentId={id}
                      type={
                        Object.keys(groupedEpisodes).length > 0
                          ? 'series'
                          : (type as 'movie' | 'series')
                      }
                      // TV-specific props
                      onFocusEnter={handleRecommendationsFocus}
                    />
                  </View>
                )}
              </Animated.View>
            </Animated.ScrollView>

            {/* Cast Modal */}
            {showCastModal && selectedCastMember && (
              <MemoizedCastDetailsModal
                visible={showCastModal}
                castMember={selectedCastMember}
                onClose={() => setShowCastModal(false)}
              />
            )}

            {/* Comment Bottom Sheet */}
            {commentBottomSheetVisible && selectedComment && (
              <CommentBottomSheet
                visible={commentBottomSheetVisible}
                comment={selectedComment}
                onClose={handleCommentBottomSheetClose}
                revealedSpoilers={revealedSpoilers}
                onSpoilerPress={handleSpoilerPress}
              />
            )}
          </>
        )}
      </AnimatedSafeAreaView>
    </Animated.View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorCode: {
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  backButtonError: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 2,
  },
  backButtonText: {
    fontWeight: '600',
  },
  productionContainer: {
    marginBottom: 24,
  },
  productionHeader: {
    fontWeight: '700',
    color: '#fff',
  },
  productionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  productionChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productionLogo: {
    // Dimensions set inline
  },
  productionText: {
    color: '#fff',
    fontWeight: '500',
  },
  tvDetailsContainer: {
    marginBottom: 24,
  },
  tvDetailsHeader: {
    fontWeight: '700',
    color: '#fff',
  },
  tvDetailRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  tvDetailLabel: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  tvDetailValue: {
    color: '#fff',
    fontWeight: '500',
  },
});

// =============================================================================
// Export
// =============================================================================

export default MetadataScreenTV;
