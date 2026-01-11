import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ViewStyle,
  TextStyle,
  StatusBar,
  Image,
} from 'react-native';
import { NavigationProp, useNavigation, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import FastImage from '@d11/react-native-fast-image';
import { MaterialIcons, Entypo } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StreamingContent } from '../../services/catalogService';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../hooks/useSettings';
import { useTrailer } from '../../contexts/TrailerContext';
import TrailerService from '../../services/trailerService';
import TrailerPlayer from '../video/TrailerPlayer';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../contexts/ToastContext';
import { useTraktContext } from '../../contexts/TraktContext';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { useWatchProgress } from '../../hooks/useWatchProgress';
import { streamCacheService } from '../../services/streamCacheService';
import Focusable from '../common/Focusable';
import {
  isTV,
  TV_SPACING,
  TV_TYPOGRAPHY,
  TV_TOUCH_TARGETS,
  TV_HERO,
} from '../../utils/tvStyles';
import { triggerLight, triggerMedium } from '../../hooks/useHaptics';

interface AppleTVHeroProps {
  featuredContent: StreamingContent | null;
  allFeaturedContent?: StreamingContent[];
  loading?: boolean;
  onRetry?: () => void;
  scrollY?: SharedValue<number>; // Optional scroll position for parallax
}

const { width, height } = Dimensions.get('window');

// Get status bar height
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 0;

// Calculate hero height using TV-optimized configuration
const HERO_HEIGHT = isTV ? height * TV_HERO.heightPercentage : height * 0.85;

// Animated Pagination Dot Component
const PaginationDot: React.FC<{
  isActive: boolean;
  isNext: boolean;
  dragProgress: SharedValue<number>;
  onPress: () => void;
}> = React.memo(
  ({ isActive, isNext, dragProgress, onPress }) => {
    const animatedStyle = useAnimatedStyle(() => {
      // Base values
      const activeWidth = 32;
      const inactiveWidth = 8;
      const activeOpacity = 0.9;
      const inactiveOpacity = 0.3;

      // Calculate target width and opacity based on state
      let targetWidth = isActive ? activeWidth : inactiveWidth;
      let targetOpacity = isActive ? activeOpacity : inactiveOpacity;

      // If this is the next dot during drag, interpolate between inactive and active
      if (isNext && dragProgress.value > 0) {
        targetWidth = interpolate(
          dragProgress.value,
          [0, 1],
          [inactiveWidth, activeWidth],
          Extrapolation.CLAMP
        );
        targetOpacity = interpolate(
          dragProgress.value,
          [0, 1],
          [inactiveOpacity, activeOpacity],
          Extrapolation.CLAMP
        );
      }

      // If this is the current active dot during drag, interpolate from active to inactive
      if (isActive && dragProgress.value > 0) {
        targetWidth = interpolate(
          dragProgress.value,
          [0, 1],
          [activeWidth, inactiveWidth],
          Extrapolation.CLAMP
        );
        targetOpacity = interpolate(
          dragProgress.value,
          [0, 1],
          [activeOpacity, inactiveOpacity],
          Extrapolation.CLAMP
        );
      }

      return {
        width: withTiming(targetWidth, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        }),
        opacity: withTiming(targetOpacity, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        }),
      };
    });

    const handlePress = () => {
      triggerLight();
      onPress();
    };

    return (
      <Focusable
        onPress={handlePress}
        style={[styles.paginationDot, { backgroundColor: 'transparent' }]} // Container style
        scaleOnFocus={1.5} // Make dot grow when focused on TV
      >
        <Animated.View style={[styles.paginationDot, animatedStyle]} />
      </Focusable>
    );
  }
);

const AppleTVHero: React.FC<AppleTVHeroProps> = ({
  featuredContent,
  allFeaturedContent,
  loading,
  onRetry,
  scrollY: externalScrollY,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting } = useSettings();
  const { isTrailerPlaying: globalTrailerPlaying, setTrailerPlaying } = useTrailer();
  const { toggleLibrary, isInLibrary: checkIsInLibrary } = useLibrary();
  const { showSaved, showTraktSaved, showRemoved, showTraktRemoved } = useToast();
  const { isAuthenticated: isTraktAuthenticated } = useTraktContext();

  // Library and watch state
  const [inLibrary, setInLibrary] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [playButtonText, setPlayButtonText] = useState('Play');
  const [type, setType] = useState<'movie' | 'series'>('movie');

  // Create internal scrollY if not provided externally
  const internalScrollY = useSharedValue(0);
  const scrollY = externalScrollY || internalScrollY;

  // Determine items to display
  const items = useMemo(() => {
    if (allFeaturedContent && allFeaturedContent.length > 0) {
      return allFeaturedContent.slice(0, 8); // Limit to 8 items for performance
    }
    return featuredContent ? [featuredContent] : [];
  }, [allFeaturedContent, featuredContent]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [bannerLoaded, setBannerLoaded] = useState<Record<number, boolean>>({});
  const [logoLoaded, setLogoLoaded] = useState<Record<number, boolean>>({});
  const [logoError, setLogoError] = useState<Record<number, boolean>>({});
  const [logoHeights, setLogoHeights] = useState<Record<number, number>>({});
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Refs for focus management on TV
  const playButtonRef = useRef<any>(null);
  const saveButtonRef = useRef<any>(null);
  const leftArrowRef = useRef<any>(null);
  const rightArrowRef = useRef<any>(null);
  const leftTriggerRef = useRef<any>(null);
  const rightTriggerRef = useRef<any>(null);

  // Trailer state
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(false);
  const [trailerReady, setTrailerReady] = useState(false);
  const [trailerPreloaded, setTrailerPreloaded] = useState(false);
  const [trailerShouldBePaused, setTrailerShouldBePaused] = useState(false);
  const trailerVideoRef = useRef<any>(null);

  // Use ref to avoid re-fetching trailer when trailerMuted changes
  const showTrailersEnabled = useRef(settings?.showTrailers ?? false);

  // Update ref when showTrailers setting changes
  useEffect(() => {
    showTrailersEnabled.current = settings?.showTrailers ?? false;
  }, [settings?.showTrailers]);

  const currentItem = items[currentIndex] || null;

  // Use watch progress hook
  const {
    watchProgress,
    getPlayButtonText: getProgressPlayButtonText,
    loadWatchProgress
  } = useWatchProgress(
    currentItem?.id || '',
    type,
    undefined,
    [] // Pass episodes if you have them for series
  );

  // Animation values
  const dragProgress = useSharedValue(0);
  const dragDirection = useSharedValue(0); // -1 for left, 1 for right
  const isDragging = useSharedValue(0); // 1 when dragging, 0 when not
  const logoOpacity = useSharedValue(1);
  const [nextIndex, setNextIndex] = useState(currentIndex);
  const thumbnailOpacity = useSharedValue(1);
  const trailerOpacity = useSharedValue(0);
  const trailerMuted = settings?.trailerMuted ?? true;
  const heroOpacity = useSharedValue(0); // Start hidden for smooth fade-in

  // Handler for trailer end
  const handleTrailerEnd = useCallback(() => {
    logger.info('[AppleTVHero] Trailer ended');
    setTrailerPlaying(false);
    // Fade back to thumbnail
    trailerOpacity.value = withTiming(0, { duration: 300 });
    thumbnailOpacity.value = withTiming(1, { duration: 300 });
  }, [setTrailerPlaying, trailerOpacity, thumbnailOpacity]);

  // Animated style for trailer container - 60% height with zoom
  const trailerContainerStyle = useAnimatedStyle(() => {
    // Faster fade out during drag - complete fade by 0.3 progress instead of 1.0
    const dragFade = interpolate(
      dragProgress.value,
      [0, 0.05, 0.1, 0.15, 0.2, 0.3],
      [1, 0.85, 0.65, 0.4, 0.15, 0],
      Extrapolation.CLAMP
    );

    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: HERO_HEIGHT * 0.9, // 90% of hero height
      overflow: 'hidden',
      opacity: trailerOpacity.value * dragFade,
    };
  });

  // Animated style for trailer video - zoomed in 5%
  const trailerVideoStyle = useAnimatedStyle(() => {
    return {
      width: '100%',
      height: '100%',
      transform: [{ scale: 1.05 }], // 5% zoom
    };
  });

  // Parallax style for background images - disabled during drag
  const backgroundParallaxStyle = useAnimatedStyle(() => {
    'worklet';
    const scrollYValue = scrollY.value;

    // Disable parallax during drag to avoid transform conflicts
    // Also disable on TV to prevent crop/zoom issues on 16:9 screens
    if (isDragging.value > 0 || Platform.isTV) {
      return {
        transform: [
          { scale: 1.0 },
          { translateY: 0 }
        ],
      };
    }

    // Pre-calculated constants - start at 1.0 for normal size
    const DEFAULT_ZOOM = 1.0;
    const SCROLL_UP_MULTIPLIER = 0.002;
    const SCROLL_DOWN_MULTIPLIER = 0.0001;
    const MAX_SCALE = 1.3;
    const PARALLAX_FACTOR = 0.3;

    // Optimized scale calculation with minimal branching
    const scrollUpScale = DEFAULT_ZOOM + Math.abs(scrollYValue) * SCROLL_UP_MULTIPLIER;
    const scrollDownScale = DEFAULT_ZOOM + scrollYValue * SCROLL_DOWN_MULTIPLIER;
    const scale = Math.min(scrollYValue < 0 ? scrollUpScale : scrollDownScale, MAX_SCALE);

    // Single parallax calculation
    const parallaxOffset = scrollYValue * PARALLAX_FACTOR;

    return {
      transform: [
        { scale },
        { translateY: parallaxOffset }
      ],
    };
  });

  // Parallax style for trailer - disabled during drag
  const trailerParallaxStyle = useAnimatedStyle(() => {
    'worklet';
    const scrollYValue = scrollY.value;

    // Disable parallax during drag to avoid transform conflicts
    if (isDragging.value > 0) {
      return {
        transform: [
          { scale: 1.0 },
          { translateY: 0 }
        ],
      };
    }

    // Pre-calculated constants - start at 1.0 for normal size
    const DEFAULT_ZOOM = 1.0;
    const SCROLL_UP_MULTIPLIER = 0.0015;
    const SCROLL_DOWN_MULTIPLIER = 0.0001;
    const MAX_SCALE = 1.2;
    const PARALLAX_FACTOR = 0.2; // Slower than background for depth

    // Optimized scale calculation with minimal branching
    const scrollUpScale = DEFAULT_ZOOM + Math.abs(scrollYValue) * SCROLL_UP_MULTIPLIER;
    const scrollDownScale = DEFAULT_ZOOM + scrollYValue * SCROLL_DOWN_MULTIPLIER;
    const scale = Math.min(scrollYValue < 0 ? scrollUpScale : scrollDownScale, MAX_SCALE);

    // Single parallax calculation
    const parallaxOffset = scrollYValue * PARALLAX_FACTOR;

    return {
      transform: [
        { scale },
        { translateY: parallaxOffset }
      ],
    };
  });

  // Reset loaded states when items change
  useEffect(() => {
    setBannerLoaded({});
    setLogoLoaded({});
    setLogoError({});
    setLogoHeights({});
  }, [items.length]);

  // Mark initial load as complete after a short delay
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

  // Stop trailer when screen loses focus
  useEffect(() => {
    if (!isFocused) {
      // Pause this screen's trailer
      setTrailerShouldBePaused(true);
      setTrailerPlaying(false);

      // Fade out trailer
      trailerOpacity.value = withTiming(0, { duration: 300 });
      thumbnailOpacity.value = withTiming(1, { duration: 300 });

      logger.info('[AppleTVHero] Screen lost focus - pausing trailer');
    } else {
      // Screen gained focus - allow trailer to resume if it was ready
      setTrailerShouldBePaused(false);

      // If trailer was ready and loaded, restore the video opacity
      if (trailerReady && trailerUrl) {
        logger.info('[AppleTVHero] Screen gained focus - restoring trailer');
        thumbnailOpacity.value = withTiming(0, { duration: 800 });
        trailerOpacity.value = withTiming(1, { duration: 800 });
        setTrailerPlaying(true);
      }
    }
  }, [isFocused, setTrailerPlaying, trailerOpacity, thumbnailOpacity, trailerReady, trailerUrl]);

  // Listen to navigation events to stop trailer when navigating to other screens
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      // Screen is blurred (navigated away)
      setTrailerPlaying(false);
      trailerOpacity.value = withTiming(0, { duration: 300 });
      thumbnailOpacity.value = withTiming(1, { duration: 300 });
      logger.info('[AppleTVHero] Navigation blur event - stopping trailer');
    });

    return () => {
      unsubscribe();
      // Stop trailer when component unmounts
      setTrailerPlaying(false);
      logger.info('[AppleTVHero] Component unmounting - stopping trailer');
    };
  }, [navigation, setTrailerPlaying, trailerOpacity, thumbnailOpacity]);

  // Fetch trailer URL when current item changes
  useEffect(() => {
    let alive = true;

    const fetchTrailer = async () => {
      if (!currentItem || !showTrailersEnabled.current) {
        setTrailerUrl(null);
        return;
      }

      // Reset trailer state when item changes
      setTrailerLoading(true);
      setTrailerError(false);
      setTrailerReady(false);
      setTrailerPreloaded(false);
      setTrailerPlaying(false);

      // Fade out any existing trailer
      trailerOpacity.value = withTiming(0, { duration: 300 });
      thumbnailOpacity.value = withTiming(1, { duration: 300 });

      try {
        // Extract year from metadata
        const year = currentItem.releaseInfo
          ? parseInt(currentItem.releaseInfo.split('-')[0], 10)
          : new Date().getFullYear();

        // Extract TMDB ID if available
        const tmdbId = currentItem.id?.startsWith('tmdb:')
          ? currentItem.id.replace('tmdb:', '')
          : undefined;
      } catch (error) {
        logger.error('[AppleTVHero] Error fetching trailer', error);
        if (alive) {
          setTrailerError(true);
          setTrailerLoading(false);
        }
      }
    };

    fetchTrailer();

    return () => {
      alive = false;
    };
  }, [currentItem, setTrailerPlaying, trailerOpacity, thumbnailOpacity]);

  return null;
};

export default AppleTVHero;