/**
 * AppleTVHero.tv.tsx
 *
 * TV-specific Apple TV style hero component with D-pad navigation,
 * visible focus states, and trailer support.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - D-pad left/right navigation between hero items
 * - Focusable Play and Save action buttons
 * - Visible focus states with scale animation and border
 * - Auto-rotation pauses when any element is focused
 * - Smooth crossfade transitions between items
 * - Trailer support with focus-aware playback
 * - Integration with TVNavigationContext for focus memory
 *
 * @example
 * ```tsx
 * <AppleTVHero
 *   featuredContent={item}
 *   allFeaturedContent={items}
 *   hasTVPreferredFocus={true}
 * />
 * ```
 */

import FastImage from '@d11/react-native-fast-image';
import { MaterialIcons, Entypo, Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  ViewStyle,
  StatusBar,
  findNodeHandle,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  withDelay,
  interpolate,
  Extrapolation,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import { useTrailer } from '../../contexts/TrailerContext';
import { useTraktContext } from '../../contexts/TraktContext';
import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';
import { useLibrary } from '../../hooks/useLibrary';
import { useSettings } from '../../hooks/useSettings';
import { useTVEventHandler } from '../../hooks/useTVEventHandler';
import { useWatchProgress } from '../../hooks/useWatchProgress';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { StreamingContent } from '../../services/catalogService';
import { streamCacheService } from '../../services/streamCacheService';
import TrailerService from '../../services/trailerService';
import Focusable, { FocusableRef } from '../common/Focusable';
import TrailerPlayer from '../video/TrailerPlayer';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface AppleTVHeroProps {
  /** Primary featured content to display */
  featuredContent: StreamingContent | null;
  /** Array of all featured content items for carousel */
  allFeaturedContent?: StreamingContent[];
  /** Whether the component is in a loading state */
  loading?: boolean;
  /** Callback to retry loading content */
  onRetry?: () => void;
  /** Optional scroll position for parallax effects */
  scrollY?: SharedValue<number>;
  /** Whether this component should receive initial TV focus */
  hasTVPreferredFocus?: boolean;
  /** Callback when the hero receives focus */
  onFocus?: () => void;
  /** Callback when the hero loses focus */
  onBlur?: () => void;
  /** Node handle for the element below this component (for nextFocusDown) */
  nextFocusDown?: number | React.RefObject<any>;
}

// =============================================================================
// Constants
// =============================================================================

const { width, height } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 0;
const HERO_HEIGHT = height * 0.85;

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

const AUTO_ROTATION_INTERVAL = 25000;

// =============================================================================
// Component Implementation
// =============================================================================

const AppleTVHero: React.FC<AppleTVHeroProps> = ({
  featuredContent,
  allFeaturedContent,
  loading,
  onRetry,
  scrollY: externalScrollY,
  hasTVPreferredFocus = false,
  onFocus,
  onBlur,
  nextFocusDown,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting } = useSettings();
  const { isTrailerPlaying: globalTrailerPlaying, setTrailerPlaying } = useTrailer();
  const { toggleLibrary, isInLibrary: checkIsInLibrary } = useLibrary();
  const { isAuthenticated: isTraktAuthenticated } = useTraktContext();
  const tvNav = useTVNavigationOptional();

  // =============================================================================
  // State
  // =============================================================================

  const [inLibrary, setInLibrary] = useState(false);
  const [playButtonText, setPlayButtonText] = useState('Play');
  const [type, setType] = useState<'movie' | 'series'>('movie');

  const items = useMemo(() => {
    if (allFeaturedContent && allFeaturedContent.length > 0) {
      return allFeaturedContent.slice(0, 8);
    }
    return featuredContent ? [featuredContent] : [];
  }, [allFeaturedContent, featuredContent]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [bannerLoaded, setBannerLoaded] = useState<Record<number, boolean>>({});
  const [logoLoaded, setLogoLoaded] = useState<Record<number, boolean>>({});
  const [logoError, setLogoError] = useState<Record<number, boolean>>({});
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Focus state
  const [heroFocused, setHeroFocused] = useState(false);
  const [playButtonFocused, setPlayButtonFocused] = useState(false);
  const [saveButtonFocused, setSaveButtonFocused] = useState(false);
  const [isAnyFocused, setIsAnyFocused] = useState(false);

  // Trailer state
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(false);
  const [trailerReady, setTrailerReady] = useState(false);
  const [trailerPreloaded, setTrailerPreloaded] = useState(false);
  const [trailerShouldBePaused, setTrailerShouldBePaused] = useState(false);
  const trailerVideoRef = useRef<any>(null);
  const showTrailersEnabled = useRef(settings?.showTrailers ?? false);

  // Refs
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const heroRef = useRef<FocusableRef>(null);
  const playButtonRef = useRef<FocusableRef>(null);
  const saveButtonRef = useRef<FocusableRef>(null);

  // Animation values
  const internalScrollY = useSharedValue(0);
  const scrollY = externalScrollY || internalScrollY;
  const logoOpacity = useSharedValue(1);
  const thumbnailOpacity = useSharedValue(1);
  const trailerOpacity = useSharedValue(0);
  const trailerMuted = settings?.trailerMuted ?? true;
  const heroOpacity = useSharedValue(0);
  const focusProgress = useSharedValue(0);

  const currentItem = items[currentIndex] || null;
  const uniqueSectionId = 'apple-tv-hero';

  // =============================================================================
  // Watch Progress Hook
  // =============================================================================

  const {
    watchProgress,
    getPlayButtonText: getProgressPlayButtonText,
    loadWatchProgress,
  } = useWatchProgress(currentItem?.id || '', type, undefined, []);

  // =============================================================================
  // Focus Memory
  // =============================================================================

  const saveFocusState = useCallback(
    (focusId: string) => {
      if (tvNav) {
        tvNav.setScreenFocus(uniqueSectionId, focusId);
        tvNav.setCurrentFocusId(focusId);
      }
    },
    [tvNav]
  );

  // =============================================================================
  // Next Focus Props Resolution
  // =============================================================================

  const resolveNodeHandle = useCallback(
    (value: number | React.RefObject<any> | undefined): number | undefined => {
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
    },
    []
  );

  const nextFocusDownHandle = resolveNodeHandle(nextFocusDown);

  // =============================================================================
  // Auto-Rotation
  // =============================================================================

  const startAutoPlay = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }

    if (items.length <= 1) return;

    // Don't auto-advance if any element is focused or trailer is playing
    if (isAnyFocused || (globalTrailerPlaying && trailerReady)) {
      return;
    }

    autoPlayTimerRef.current = setTimeout(() => {
      const timeSinceInteraction = Date.now() - lastInteractionRef.current;
      if (
        timeSinceInteraction >= 5000 &&
        !isAnyFocused &&
        (!globalTrailerPlaying || !trailerReady)
      ) {
        const nextIdx = (currentIndex + 1) % items.length;
        setCurrentIndex(nextIdx);
      } else {
        startAutoPlay();
      }
    }, AUTO_ROTATION_INTERVAL);
  }, [items.length, globalTrailerPlaying, trailerReady, currentIndex, isAnyFocused]);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [startAutoPlay, currentIndex, globalTrailerPlaying, trailerReady, isAnyFocused]);

  // Update any focused state
  useEffect(() => {
    setIsAnyFocused(heroFocused || playButtonFocused || saveButtonFocused);
  }, [heroFocused, playButtonFocused, saveButtonFocused]);

  // =============================================================================
  // Navigation Handlers
  // =============================================================================

  const goToNext = useCallback(() => {
    const nextIdx = (currentIndex + 1) % items.length;
    setCurrentIndex(nextIdx);
    lastInteractionRef.current = Date.now();
    saveFocusState(`${uniqueSectionId}-item-${nextIdx}`);
  }, [currentIndex, items.length, saveFocusState]);

  const goToPrevious = useCallback(() => {
    const prevIdx = (currentIndex - 1 + items.length) % items.length;
    setCurrentIndex(prevIdx);
    lastInteractionRef.current = Date.now();
    saveFocusState(`${uniqueSectionId}-item-${prevIdx}`);
  }, [currentIndex, items.length, saveFocusState]);

  // =============================================================================
  // TV Event Handler for Hero Navigation
  // =============================================================================

  useTVEventHandler(
    useCallback(
      event => {
        if (!heroFocused) return;

        if (event.eventType === 'left') {
          goToPrevious();
        } else if (event.eventType === 'right') {
          goToNext();
        }
      },
      [heroFocused, goToPrevious, goToNext]
    ),
    { enabled: heroFocused }
  );

  // =============================================================================
  // Focus Handlers
  // =============================================================================

  const handleHeroFocus = useCallback(() => {
    setHeroFocused(true);
    focusProgress.value = withSpring(1, SPRING_CONFIG);
    onFocus?.();
    saveFocusState(`${uniqueSectionId}-item-${currentIndex}`);
  }, [focusProgress, onFocus, saveFocusState, currentIndex]);

  const handleHeroBlur = useCallback(() => {
    setHeroFocused(false);
    focusProgress.value = withSpring(0, SPRING_CONFIG);
    onBlur?.();
  }, [focusProgress, onBlur]);

  const handlePlayButtonFocus = useCallback(() => {
    setPlayButtonFocused(true);
    saveFocusState(`${uniqueSectionId}-play-button`);
  }, [saveFocusState]);

  const handlePlayButtonBlur = useCallback(() => {
    setPlayButtonFocused(false);
  }, []);

  const handleSaveButtonFocus = useCallback(() => {
    setSaveButtonFocused(true);
    saveFocusState(`${uniqueSectionId}-save-button`);
  }, [saveFocusState]);

  const handleSaveButtonBlur = useCallback(() => {
    setSaveButtonFocused(false);
  }, []);

  // =============================================================================
  // Effects
  // =============================================================================

  // Update showTrailersEnabled ref
  useEffect(() => {
    showTrailersEnabled.current = settings?.showTrailers ?? false;
  }, [settings?.showTrailers]);

  // Reset loaded states when items change
  useEffect(() => {
    setBannerLoaded({});
    setLogoLoaded({});
    setLogoError({});
  }, [items.length]);

  // Mark initial load as complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Smooth fade-in when content loads
  useEffect(() => {
    if (currentItem && !loading) {
      heroOpacity.value = withDelay(
        100,
        withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [currentItem, loading, heroOpacity]);

  // Handle screen focus/blur for trailer
  useEffect(() => {
    if (!isFocused) {
      setTrailerShouldBePaused(true);
      setTrailerPlaying(false);
      trailerOpacity.value = withTiming(0, { duration: 300 });
      thumbnailOpacity.value = withTiming(1, { duration: 300 });
    } else {
      setTrailerShouldBePaused(false);
      if (trailerReady && trailerUrl) {
        thumbnailOpacity.value = withTiming(0, { duration: 800 });
        trailerOpacity.value = withTiming(1, { duration: 800 });
        setTrailerPlaying(true);
      }
    }
  }, [isFocused, setTrailerPlaying, trailerOpacity, thumbnailOpacity, trailerReady, trailerUrl]);

  // Fetch trailer
  useEffect(() => {
    let alive = true;

    const fetchTrailer = async () => {
      if (!currentItem || !showTrailersEnabled.current) {
        setTrailerUrl(null);
        return;
      }

      setTrailerLoading(true);
      setTrailerError(false);
      setTrailerReady(false);
      setTrailerPreloaded(false);
      setTrailerPlaying(false);

      trailerOpacity.value = withTiming(0, { duration: 300 });
      thumbnailOpacity.value = withTiming(1, { duration: 300 });

      try {
        const year = currentItem.releaseInfo
          ? parseInt(currentItem.releaseInfo.split('-')[0], 10)
          : new Date().getFullYear();

        const tmdbId = currentItem.id?.startsWith('tmdb:')
          ? currentItem.id.replace('tmdb:', '')
          : undefined;

        const contentType = currentItem.type === 'series' ? 'tv' : 'movie';

        const url = await TrailerService.getTrailerUrl(currentItem.name, year, tmdbId, contentType);

        if (!alive) return;

        if (url) {
          const bestUrl = TrailerService.getBestFormatUrl(url);
          setTrailerUrl(bestUrl);
        } else {
          setTrailerUrl(null);
        }
      } catch {
        if (!alive) return;
        setTrailerError(true);
        setTrailerUrl(null);
      } finally {
        if (alive) {
          setTrailerLoading(false);
        }
      }
    };

    fetchTrailer();

    return () => {
      alive = false;
    };
  }, [currentItem, currentIndex]);

  // Update type and check status
  useEffect(() => {
    if (currentItem) {
      setType(currentItem.type as 'movie' | 'series');
      const libraryStatus = checkIsInLibrary(currentItem.id);
      setInLibrary(libraryStatus);
      loadWatchProgress();
    }
  }, [currentItem, loadWatchProgress, checkIsInLibrary]);

  // Update play button text
  useEffect(() => {
    if (currentItem) {
      const buttonText = getProgressPlayButtonText();
      setPlayButtonText(buttonText);
    }
  }, [watchProgress, getProgressPlayButtonText, currentItem]);

  // Reset logo opacity on index change
  useEffect(() => {
    trailerOpacity.value = 0;
    thumbnailOpacity.value = 1;
    setTrailerPlaying(false);

    logoOpacity.value = 0;
    logoOpacity.value = withDelay(
      80,
      withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [currentIndex, setTrailerPlaying, trailerOpacity, thumbnailOpacity]);

  // =============================================================================
  // Action Handlers
  // =============================================================================

  const handleSaveAction = useCallback(async () => {
    if (!currentItem) return;

    const wasInLibrary = inLibrary;
    setInLibrary(!wasInLibrary);

    try {
      await toggleLibrary(currentItem);
    } catch {
      setInLibrary(wasInLibrary);
    }
  }, [currentItem, inLibrary, toggleLibrary]);

  const handlePlayAction = useCallback(async () => {
    if (!currentItem) return;

    try {
      setTrailerPlaying(false);
    } catch {}

    const shouldResume =
      watchProgress &&
      watchProgress.currentTime > 0 &&
      watchProgress.currentTime / watchProgress.duration < 0.85;

    try {
      const episodeId =
        currentItem.type === 'series' && watchProgress?.episodeId
          ? watchProgress.episodeId
          : undefined;

      const cachedStream = await streamCacheService.getCachedStream(
        currentItem.id,
        currentItem.type,
        episodeId
      );

      if (cachedStream && cachedStream.stream?.url) {
        const playerRoute = Platform.OS === 'ios' ? 'PlayerIOS' : 'PlayerAndroid';

        navigation.navigate(
          playerRoute as any,
          {
            uri: cachedStream.stream.url,
            title: cachedStream.metadata?.name || currentItem.name,
            episodeTitle: cachedStream.episodeTitle,
            season: cachedStream.season,
            episode: cachedStream.episode,
            quality: (cachedStream.stream.title?.match(/(\d+)p/) || [])[1] || undefined,
            year: cachedStream.metadata?.year || currentItem.year,
            streamProvider:
              cachedStream.stream.addonId ||
              cachedStream.stream.addonName ||
              cachedStream.stream.name,
            streamName: cachedStream.stream.name || cachedStream.stream.title || 'Unnamed Stream',
            headers: cachedStream.stream.headers || undefined,
            forceVlc: false,
            id: currentItem.id,
            type: currentItem.type,
            episodeId,
            imdbId: cachedStream.imdbId || cachedStream.metadata?.imdbId || currentItem.imdb_id,
            backdrop: cachedStream.metadata?.backdrop || currentItem.banner,
            videoType: undefined,
            ...(shouldResume &&
              watchProgress && {
                resumeTime: watchProgress.currentTime,
                duration: watchProgress.duration,
              }),
          } as any
        );

        return;
      }

      navigation.navigate('Streams', {
        id: currentItem.id,
        type: currentItem.type,
        title: currentItem.name,
        metadata: {
          poster: currentItem.poster,
          banner: currentItem.banner,
          releaseInfo: currentItem.releaseInfo,
          genres: currentItem.genres,
        },
        ...(shouldResume &&
          watchProgress && {
            resumeTime: watchProgress.currentTime,
            duration: watchProgress.duration,
            episodeId: watchProgress.episodeId,
          }),
      });
    } catch {
      navigation.navigate('Streams', {
        id: currentItem.id,
        type: currentItem.type,
        title: currentItem.name,
        metadata: {
          poster: currentItem.poster,
          banner: currentItem.banner,
          releaseInfo: currentItem.releaseInfo,
          genres: currentItem.genres,
        },
      });
    }
  }, [currentItem, navigation, setTrailerPlaying, watchProgress]);

  const handleMuteToggle = useCallback(() => {
    updateSetting('trailerMuted', !trailerMuted);
  }, [trailerMuted, updateSetting]);

  // Trailer handlers
  const handleTrailerPreloaded = useCallback(() => {
    setTrailerPreloaded(true);
  }, []);

  const handleTrailerReady = useCallback(() => {
    setTrailerReady(true);
    thumbnailOpacity.value = withTiming(0, { duration: 800 });
    trailerOpacity.value = withTiming(1, { duration: 800 });
    setTrailerPlaying(true);
  }, [thumbnailOpacity, trailerOpacity, setTrailerPlaying]);

  const handleTrailerError = useCallback(() => {
    setTrailerError(true);
    setTrailerReady(false);
    setTrailerPlaying(false);
    trailerOpacity.value = withTiming(0, { duration: 300 });
    thumbnailOpacity.value = withTiming(1, { duration: 300 });
  }, [trailerOpacity, thumbnailOpacity, setTrailerPlaying]);

  const handleTrailerEnd = useCallback(() => {
    setTrailerPlaying(false);
    trailerOpacity.value = withTiming(0, { duration: 300 });
    thumbnailOpacity.value = withTiming(1, { duration: 300 });
  }, [setTrailerPlaying, trailerOpacity, thumbnailOpacity]);

  // =============================================================================
  // Animated Styles
  // =============================================================================

  const trailerContainerStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: HERO_HEIGHT * 0.9,
      overflow: 'hidden',
      opacity: trailerOpacity.value,
    };
  });

  const trailerVideoStyle = useAnimatedStyle(() => {
    return {
      width: '100%',
      height: '100%',
      transform: [{ scale: 1.05 }],
    };
  });

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
    };
  });

  const heroContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: heroOpacity.value,
    };
  });

  const heroFocusIndicatorStyle = useAnimatedStyle(() => {
    const borderWidth = interpolate(focusProgress.value, [0, 1], [0, 4]);

    return {
      borderWidth,
      borderColor: currentTheme.colors.primary || '#007AFF',
      borderRadius: 16,
    };
  });

  // =============================================================================
  // Loading State
  // =============================================================================

  if (loading) {
    return (
      <View style={[styles.container, { height: HERO_HEIGHT, marginTop: -insets.top }]}>
        <View style={styles.skeletonContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      </View>
    );
  }

  if (!currentItem || items.length === 0) {
    return (
      <View style={[styles.container, { height: HERO_HEIGHT, marginTop: -insets.top }]}>
        <View style={styles.noContentContainer}>
          <MaterialIcons name="theaters" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={styles.noContentText}>No featured content available</Text>
          {onRetry && (
            <Focusable
              onPress={onRetry}
              style={styles.retryButton}
              animationConfig={{
                focusScale: 1.05,
                showFocusBorder: true,
                focusBorderColor: currentTheme.colors.primary || '#007AFF',
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Focusable>
          )}
        </View>
      </View>
    );
  }

  const bannerUrl = currentItem.banner || currentItem.poster;

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Animated.View
      entering={initialLoadComplete ? undefined : FadeIn.duration(600).delay(150)}
      style={[
        styles.container,
        heroContainerStyle,
        { height: HERO_HEIGHT, marginTop: -insets.top },
      ]}
    >
      {/* Focusable Background for D-pad Navigation */}
      <Focusable
        ref={heroRef}
        onFocus={handleHeroFocus}
        onBlur={handleHeroBlur}
        hasTVPreferredFocus={hasTVPreferredFocus}
        isTVSelectable={true}
        focusId={`${uniqueSectionId}-item-${currentIndex}`}
        style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]}
        animationConfig={{
          focusScale: 1.0,
          unfocusedOpacity: 1,
          showFocusBorder: false,
        }}
        nextFocus={{
          nextFocusDown: playButtonRef.current
            ? (findNodeHandle(playButtonRef.current) ?? undefined)
            : undefined,
        }}
        accessibilityLabel={`${currentItem.name}, featured content ${currentIndex + 1} of ${items.length}`}
        accessibilityHint="Press left or right to browse, down to access actions"
      >
        <Animated.View style={[StyleSheet.absoluteFillObject, heroFocusIndicatorStyle]} />
      </Focusable>

      {/* Background Images */}
      <View style={styles.backgroundContainer}>
        <View style={styles.imageWrapper}>
          <FastImage
            source={{
              uri: bannerUrl,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }}
            style={styles.backgroundImage}
            resizeMode={FastImage.resizeMode.cover}
            onLoad={() => setBannerLoaded(prev => ({ ...prev, [currentIndex]: true }))}
          />
        </View>

        {/* Trailer player */}
        {settings?.showTrailers &&
          trailerUrl &&
          !trailerLoading &&
          !trailerError &&
          trailerPreloaded && (
            <Animated.View style={trailerContainerStyle}>
              <Animated.View style={trailerVideoStyle}>
                <TrailerPlayer
                  key={`visible-${trailerUrl}`}
                  ref={trailerVideoRef}
                  trailerUrl={trailerUrl}
                  autoPlay={globalTrailerPlaying}
                  muted={trailerMuted}
                  style={StyleSheet.absoluteFillObject}
                  hideLoadingSpinner={true}
                  hideControls={true}
                  onLoad={handleTrailerReady}
                  onError={handleTrailerError}
                  onEnd={handleTrailerEnd}
                  contentType={currentItem.type as 'movie' | 'series'}
                  paused={trailerShouldBePaused}
                />
              </Animated.View>
              <LinearGradient
                colors={['transparent', currentTheme.colors.darkBackground]}
                locations={[0, 1]}
                style={styles.trailerGradient}
                pointerEvents="none"
              />
            </Animated.View>
          )}

        {/* Hidden preload player */}
        {settings?.showTrailers &&
          trailerUrl &&
          !trailerLoading &&
          !trailerError &&
          !trailerPreloaded && (
            <View style={[StyleSheet.absoluteFillObject, { opacity: 0, pointerEvents: 'none' }]}>
              <TrailerPlayer
                key={`preload-${trailerUrl}`}
                trailerUrl={trailerUrl}
                autoPlay={false}
                muted={true}
                style={StyleSheet.absoluteFillObject}
                hideLoadingSpinner={true}
                onLoad={handleTrailerPreloaded}
                onError={handleTrailerError}
                contentType={currentItem.type as 'movie' | 'series'}
                paused={true}
              />
            </View>
          )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={[
            'transparent',
            'rgba(0,0,0,0.2)',
            'rgba(0,0,0,0.5)',
            'rgba(0,0,0,0.8)',
            'rgba(0,0,0,0.95)',
          ]}
          locations={[0, 0.3, 0.6, 0.85, 1]}
          style={styles.gradientOverlay}
        />
      </View>

      {/* Trailer Controls */}
      {settings?.showTrailers && trailerReady && trailerUrl && (
        <View style={[styles.trailerControls, { top: 70 + insets.top }]}>
          <Focusable
            onPress={handleMuteToggle}
            style={styles.trailerControlButton}
            animationConfig={{
              focusScale: 1.1,
              showFocusBorder: true,
              focusBorderColor: '#fff',
            }}
            accessibilityLabel={trailerMuted ? 'Unmute trailer' : 'Mute trailer'}
          >
            <Entypo name={trailerMuted ? 'sound-mute' : 'sound'} size={24} color="white" />
          </Focusable>
        </View>
      )}

      {/* Content Overlay */}
      <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
        {/* Logo or Title */}
        <Animated.View style={logoAnimatedStyle}>
          {currentItem.logo && !logoError[currentIndex] ? (
            <View style={styles.logoContainer}>
              <FastImage
                source={{ uri: currentItem.logo }}
                style={styles.logo}
                resizeMode={FastImage.resizeMode.contain}
                onLoad={() => setLogoLoaded(prev => ({ ...prev, [currentIndex]: true }))}
                onError={() => setLogoError(prev => ({ ...prev, [currentIndex]: true }))}
              />
            </View>
          ) : (
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {currentItem.name}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Metadata Badge */}
        <View style={styles.metadataContainer}>
          <View style={styles.metadataBadge}>
            <MaterialIcons name="tv" size={16} color="#fff" />
            <Text style={styles.metadataText}>
              {currentItem.type === 'series' ? 'TV Show' : 'Movie'}
            </Text>
            {currentItem.genres && currentItem.genres.length > 0 && (
              <>
                <Text style={styles.metadataDot}>\u2022</Text>
                <Text style={styles.metadataText}>{currentItem.genres[0]}</Text>
              </>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Play Button */}
          <Focusable
            ref={playButtonRef}
            onPress={handlePlayAction}
            onFocus={handlePlayButtonFocus}
            onBlur={handlePlayButtonBlur}
            style={styles.playButton}
            focusId={`${uniqueSectionId}-play-button`}
            animationConfig={{
              focusScale: 1.08,
              unfocusedOpacity: 0.95,
              showFocusBorder: true,
              focusBorderColor: '#000',
              focusBorderWidth: 3,
            }}
            nextFocus={{
              nextFocusUp: heroRef.current
                ? (findNodeHandle(heroRef.current) ?? undefined)
                : undefined,
              nextFocusRight: saveButtonRef.current
                ? (findNodeHandle(saveButtonRef.current) ?? undefined)
                : undefined,
              nextFocusDown: nextFocusDownHandle,
            }}
            accessibilityLabel={playButtonText === 'Resume' ? 'Resume playback' : 'Play'}
            accessibilityHint="Starts playing the content"
          >
            <MaterialIcons
              name={playButtonText === 'Resume' ? 'replay' : 'play-arrow'}
              size={28}
              color="#000"
            />
            <Text style={styles.playButtonText}>{playButtonText}</Text>
          </Focusable>

          {/* Save Button */}
          <Focusable
            ref={saveButtonRef}
            onPress={handleSaveAction}
            onFocus={handleSaveButtonFocus}
            onBlur={handleSaveButtonBlur}
            style={styles.saveButton}
            focusId={`${uniqueSectionId}-save-button`}
            animationConfig={{
              focusScale: 1.1,
              unfocusedOpacity: 0.9,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary || '#007AFF',
              focusBorderWidth: 2,
            }}
            nextFocus={{
              nextFocusUp: heroRef.current
                ? (findNodeHandle(heroRef.current) ?? undefined)
                : undefined,
              nextFocusLeft: playButtonRef.current
                ? (findNodeHandle(playButtonRef.current) ?? undefined)
                : undefined,
              nextFocusDown: nextFocusDownHandle,
            }}
            accessibilityLabel={inLibrary ? 'Remove from library' : 'Add to library'}
            accessibilityHint="Toggles the item in your library"
          >
            <MaterialIcons
              name={inLibrary ? 'bookmark' : 'bookmark-outline'}
              size={28}
              color="white"
            />
          </Focusable>
        </View>

        {/* Pagination Dots */}
        {items.length > 1 && (
          <View style={styles.paginationContainer}>
            {items.map((_, index) => (
              <Focusable
                key={index}
                onPress={() => {
                  setCurrentIndex(index);
                  lastInteractionRef.current = Date.now();
                }}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                  heroFocused && index === currentIndex && styles.paginationDotFocused,
                ]}
                animationConfig={{
                  focusScale: 1.3,
                  showFocusBorder: false,
                }}
                accessibilityLabel={`Go to item ${index + 1}`}
              >
                <View />
              </Focusable>
            ))}
          </View>
        )}

        {/* Navigation Hints */}
        {heroFocused && items.length > 1 && (
          <View style={styles.navigationHints}>
            <View style={styles.navHintContainer}>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.navHintText}>Previous</Text>
            </View>
            <View style={styles.navHintContainer}>
              <Text style={styles.navHintText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        )}
      </View>

      {/* Bottom blend */}
      <LinearGradient
        colors={['transparent', currentTheme.colors.darkBackground]}
        locations={[0, 1]}
        style={styles.bottomBlend}
        pointerEvents="none"
      />
    </Animated.View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    marginBottom: 0,
    overflow: 'hidden',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  imageWrapper: {
    position: 'absolute',
    top: 0,
    left: -50,
    right: -50,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  trailerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  trailerControls: {
    position: 'absolute',
    right: 24,
    zIndex: 1000,
    flexDirection: 'row',
    gap: 8,
  },
  trailerControlButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 48,
    zIndex: 20,
  },
  logoContainer: {
    width: width * 0.5,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: width * 0.7,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metadataContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metadataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  metadataText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  metadataDot: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 40,
    gap: 10,
    minWidth: 160,
  },
  playButtonText: {
    color: '#000',
    fontSize: 22,
    fontWeight: '700',
  },
  saveButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  paginationDotActive: {
    width: 36,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  paginationDotFocused: {
    backgroundColor: '#007AFF',
  },
  navigationHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  navHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
  },
  navHintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBlend: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    pointerEvents: 'none',
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  noContentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  noContentText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

// =============================================================================
// Export
// =============================================================================

export default React.memo(AppleTVHero);
