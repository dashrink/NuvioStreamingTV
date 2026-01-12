/**
 * HeroCarousel.tv.tsx
 *
 * TV-specific hero carousel component with D-pad navigation, focus states,
 * and smooth transitions between featured content items.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - D-pad left/right navigation between carousel items
 * - Visible focus states with scale animation and border
 * - Auto-rotation pauses when focused
 * - Smooth transitions between items
 * - Integration with TVNavigationContext for focus memory
 * - Support for nextFocusUp/Down for inter-section navigation
 *
 * @example
 * ```tsx
 * <HeroCarousel
 *   items={featuredContent}
 *   loading={false}
 *   hasTVPreferredFocus={true}
 *   onFocus={() => console.log('Hero focused')}
 * />
 * ```
 */

import FastImage from '@d11/react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  useWindowDimensions,
  findNodeHandle,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  interpolate,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Pagination } from 'react-native-reanimated-carousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';
import { useSettings } from '../../hooks/useSettings';
import { useTVEventHandler } from '../../hooks/useTVEventHandler';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { StreamingContent } from '../../services/catalogService';
import Focusable, { FocusableRef } from '../common/Focusable';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface HeroCarouselProps {
  /** Array of featured content items to display */
  items: StreamingContent[];
  /** Whether the carousel is loading */
  loading?: boolean;
  /** Whether this component should receive initial TV focus */
  hasTVPreferredFocus?: boolean;
  /** Callback when the carousel receives focus */
  onFocus?: () => void;
  /** Callback when the carousel loses focus */
  onBlur?: () => void;
  /** Section index for inter-section navigation */
  sectionIndex?: number;
  /** Node handle for the element above this section (for nextFocusUp) */
  nextFocusUp?: number | React.RefObject<any>;
  /** Node handle for the element below this section (for nextFocusDown) */
  nextFocusDown?: number | React.RefObject<any>;
}

// =============================================================================
// Constants
// =============================================================================

// Offset to keep cards below a top tab navigator
const TOP_TABS_OFFSET = Platform.OS === 'ios' ? 44 : 48;

// Animation spring configuration
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

// Auto-rotation interval in milliseconds
const AUTO_ROTATION_INTERVAL = 8000;

// =============================================================================
// Component Implementation
// =============================================================================

const HeroCarousel: React.FC<HeroCarouselProps> = ({
  items,
  loading = false,
  hasTVPreferredFocus = false,
  onFocus,
  onBlur,
  sectionIndex = 0,
  nextFocusUp,
  nextFocusDown,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tvNav = useTVNavigationOptional();

  // =============================================================================
  // Responsive Layout Calculations
  // =============================================================================

  const isTablet = useMemo(
    () =>
      Math.min(windowWidth, windowHeight) >= 600 ||
      (Platform.OS === 'ios' && (Platform as any).isPad),
    [windowWidth, windowHeight]
  );

  const isTV = Platform.isTV || windowWidth >= 1200;

  const baseCardWidthForHeight = useMemo(
    () => (isTV ? Math.min(windowWidth * 0.6, 720) : Math.min(windowWidth * 0.8, 480)),
    [windowWidth, isTV]
  );

  const cardWidth = useMemo(
    () =>
      isTV
        ? Math.min(windowWidth * 0.6, 720)
        : isTablet
          ? Math.max(560, windowWidth - 2 * Math.round(0.1 * windowWidth))
          : Math.min(windowWidth * 0.8, 480),
    [isTablet, isTV, windowWidth]
  );

  const cardHeight = useMemo(
    () => Math.round((baseCardWidthForHeight * 9) / 16) + (isTV ? 280 : 310),
    [baseCardWidthForHeight, isTV]
  );

  const effectiveTopOffset = useMemo(
    () => (isTablet || isTV ? TOP_TABS_OFFSET : 8),
    [isTablet, isTV]
  );

  // =============================================================================
  // State
  // =============================================================================

  const data = useMemo(() => (items && items.length ? items.slice(0, 10) : []), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedLogoIds, setFailedLogoIds] = useState<Set<string>>(new Set());
  const [isFocused, setIsFocused] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Refs
  const itemRefs = useRef<Map<number, React.RefObject<FocusableRef>>>(new Map());
  const autoRotationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const focusProgress = useSharedValue(0);
  const paginationProgress = useSharedValue(0);

  // =============================================================================
  // Focus Memory
  // =============================================================================

  const uniqueSectionId = `hero-carousel-${sectionIndex}`;

  /**
   * Get or create a ref for an item at a given index
   */
  const getItemRef = useCallback((index: number) => {
    if (!itemRefs.current.has(index)) {
      itemRefs.current.set(index, React.createRef());
    }
    return itemRefs.current.get(index)!;
  }, []);

  /**
   * Save focus state to TV navigation context
   */
  const saveFocusState = useCallback(
    (index: number) => {
      if (tvNav && index >= 0) {
        const focusId = `${uniqueSectionId}-item-${index}`;
        tvNav.setScreenFocus(uniqueSectionId, focusId);
        tvNav.setCurrentFocusId(focusId);
      }
    },
    [tvNav, uniqueSectionId]
  );

  /**
   * Get saved focus index from memory
   */
  const getSavedFocusIndex = useCallback((): number => {
    if (tvNav) {
      const savedFocusId = tvNav.getScreenFocus(uniqueSectionId);
      if (savedFocusId) {
        const match = savedFocusId.match(/-item-(\d+)$/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }
    return 0;
  }, [tvNav, uniqueSectionId]);

  // =============================================================================
  // Auto-Rotation Logic
  // =============================================================================

  /**
   * Start auto-rotation timer
   */
  const startAutoRotation = useCallback(() => {
    if (autoRotationTimerRef.current) {
      clearTimeout(autoRotationTimerRef.current);
    }

    if (data.length <= 1 || isFocused) {
      return;
    }

    setIsAutoRotating(true);
    autoRotationTimerRef.current = setTimeout(() => {
      const nextIndex = (activeIndex + 1) % data.length;
      setActiveIndex(nextIndex);
      paginationProgress.value = withTiming(nextIndex, { duration: 300 });
    }, AUTO_ROTATION_INTERVAL);
  }, [data.length, isFocused, activeIndex, paginationProgress]);

  /**
   * Stop auto-rotation timer
   */
  const stopAutoRotation = useCallback(() => {
    if (autoRotationTimerRef.current) {
      clearTimeout(autoRotationTimerRef.current);
      autoRotationTimerRef.current = null;
    }
    setIsAutoRotating(false);
  }, []);

  // Start auto-rotation when component mounts or activeIndex changes
  useEffect(() => {
    if (!isFocused) {
      startAutoRotation();
    }
    return () => {
      if (autoRotationTimerRef.current) {
        clearTimeout(autoRotationTimerRef.current);
      }
    };
  }, [activeIndex, isFocused]);

  // =============================================================================
  // Navigation Handlers
  // =============================================================================

  /**
   * Navigate to the next item
   */
  const goToNext = useCallback(() => {
    const nextIndex = (activeIndex + 1) % data.length;
    setActiveIndex(nextIndex);
    paginationProgress.value = withTiming(nextIndex, { duration: 300 });
    saveFocusState(nextIndex);
  }, [activeIndex, data.length, paginationProgress, saveFocusState]);

  /**
   * Navigate to the previous item
   */
  const goToPrevious = useCallback(() => {
    const prevIndex = (activeIndex - 1 + data.length) % data.length;
    setActiveIndex(prevIndex);
    paginationProgress.value = withTiming(prevIndex, { duration: 300 });
    saveFocusState(prevIndex);
  }, [activeIndex, data.length, paginationProgress, saveFocusState]);

  /**
   * Navigate to a specific item
   */
  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < data.length) {
        setActiveIndex(index);
        paginationProgress.value = withTiming(index, { duration: 300 });
        saveFocusState(index);
      }
    },
    [data.length, paginationProgress, saveFocusState]
  );

  /**
   * Handle content item press - navigate to metadata
   */
  const handleNavigateToMetadata = useCallback(
    (id: string, type: any) => {
      saveFocusState(activeIndex);
      navigation.navigate('Metadata', { id, type });
    },
    [navigation, saveFocusState, activeIndex]
  );

  // =============================================================================
  // Focus Handlers
  // =============================================================================

  /**
   * Handle focus on the carousel
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusProgress.value = withSpring(1, SPRING_CONFIG);
    stopAutoRotation();
    onFocus?.();

    if (tvNav) {
      const focusId = `${uniqueSectionId}-item-${activeIndex}`;
      tvNav.setCurrentFocusId(focusId);
    }
  }, [focusProgress, stopAutoRotation, onFocus, tvNav, uniqueSectionId, activeIndex]);

  /**
   * Handle blur on the carousel
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusProgress.value = withSpring(0, SPRING_CONFIG);
    startAutoRotation();
    onBlur?.();
  }, [focusProgress, startAutoRotation, onBlur]);

  // =============================================================================
  // TV Event Handler for D-pad Navigation
  // =============================================================================

  useTVEventHandler(
    useCallback(
      event => {
        if (!isFocused) return;

        if (event.eventType === 'left') {
          goToPrevious();
        } else if (event.eventType === 'right') {
          goToNext();
        } else if (event.eventType === 'select') {
          const currentItem = data[activeIndex];
          if (currentItem) {
            handleNavigateToMetadata(currentItem.id, currentItem.type);
          }
        }
      },
      [isFocused, goToPrevious, goToNext, data, activeIndex, handleNavigateToMetadata]
    ),
    { enabled: isFocused }
  );

  // =============================================================================
  // Next Focus Props Resolution
  // =============================================================================

  /**
   * Resolve a ref or number to a node handle
   */
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

  const nextFocusUpHandle = resolveNodeHandle(nextFocusUp);
  const nextFocusDownHandle = resolveNodeHandle(nextFocusDown);

  // =============================================================================
  // Animated Styles
  // =============================================================================

  /**
   * Animated style for focus indication on the carousel container
   */
  const focusedContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(focusProgress.value, [0, 1], [1, 1.02]);

    return {
      transform: [{ scale }],
    };
  });

  // =============================================================================
  // Loading State
  // =============================================================================

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: 12 + effectiveTopOffset }]}>
        <View style={{ height: cardHeight, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: currentTheme.colors.elevation1,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                width: cardWidth,
                height: cardHeight,
              },
            ]}
          >
            <View style={styles.skeletonBannerFull} />
          </View>
        </View>
      </View>
    );
  }

  if (!data.length) return null;

  const currentItem = data[activeIndex];

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.container, focusedContainerStyle, { paddingTop: 12 + effectiveTopOffset }]}
      >
        {/* Background Image */}
        {settings.enableHomeHeroBackground && currentItem && (
          <View style={[styles.backgroundContainer, { top: -insets.top }]} pointerEvents="none">
            <FastImage
              source={{
                uri: currentItem.banner || currentItem.poster,
                priority: FastImage.priority.low,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.backgroundImage}
              resizeMode={FastImage.resizeMode.cover}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.75)']}
              locations={[0.4, 1]}
              style={styles.backgroundOverlay}
            />
          </View>
        )}

        {/* Bottom blend */}
        {settings.enableHomeHeroBackground && (
          <LinearGradient
            colors={['transparent', currentTheme.colors.darkBackground]}
            locations={[0, 1]}
            style={styles.bottomBlend}
            pointerEvents="none"
          />
        )}

        {/* Focusable Card Container */}
        <View style={{ height: cardHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Focusable
            onFocus={handleFocus}
            onBlur={handleBlur}
            onPress={() => {
              if (currentItem) {
                handleNavigateToMetadata(currentItem.id, currentItem.type);
              }
            }}
            hasTVPreferredFocus={hasTVPreferredFocus}
            isTVSelectable={true}
            focusId={`${uniqueSectionId}-item-${activeIndex}`}
            animationConfig={{
              focusScale: 1.03,
              unfocusedOpacity: 0.95,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary || '#007AFF',
              focusBorderWidth: 3,
              animateShadow: Platform.OS === 'ios',
            }}
            nextFocus={{
              nextFocusUp: nextFocusUpHandle,
              nextFocusDown: nextFocusDownHandle,
            }}
            style={{ borderRadius: 16 }}
            accessibilityLabel={`${currentItem?.name || 'Featured content'}`}
            accessibilityHint="Press to view details, swipe left or right to browse"
          >
            <TVCarouselCard
              item={currentItem}
              colors={currentTheme.colors}
              logoFailed={failedLogoIds.has(currentItem.id)}
              onLogoError={() => setFailedLogoIds(prev => new Set(prev).add(currentItem.id))}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              isTablet={isTablet || isTV}
              isFocused={isFocused}
            />
          </Focusable>
        </View>
      </Animated.View>

      {/* Pagination */}
      {data.length > 1 && (
        <View style={styles.paginationContainer} pointerEvents="auto">
          <Pagination.Basic
            progress={paginationProgress}
            data={data}
            size={10}
            dotStyle={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: currentTheme.colors.elevation3,
            }}
            activeDotStyle={{
              width: isFocused ? 12 : 10,
              height: isFocused ? 12 : 10,
              borderRadius: 999,
              backgroundColor: isFocused ? currentTheme.colors.primary : currentTheme.colors.white,
            }}
            containerStyle={{ gap: 8 }}
            horizontal
            onPress={goToIndex}
          />
        </View>
      )}

      {/* Navigation Hints (visible when focused) */}
      {isFocused && data.length > 1 && (
        <View style={styles.navigationHints} pointerEvents="none">
          <View style={styles.navHint}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.7)" />
          </View>
          <View style={styles.navHint}>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// TV Carousel Card Component
// =============================================================================

interface TVCarouselCardProps {
  item: StreamingContent;
  colors: any;
  logoFailed: boolean;
  onLogoError: () => void;
  cardWidth: number;
  cardHeight: number;
  isTablet: boolean;
  isFocused: boolean;
}

const TVCarouselCard: React.FC<TVCarouselCardProps> = memo(
  ({ item, colors, logoFailed, onLogoError, cardWidth, cardHeight, isTablet, isFocused }) => {
    const [bannerLoaded, setBannerLoaded] = useState(false);
    const [logoLoaded, setLogoLoaded] = useState(false);

    const bannerOpacity = useSharedValue(0);
    const logoOpacity = useSharedValue(0);

    useEffect(() => {
      if (bannerLoaded) {
        bannerOpacity.value = withTiming(1, {
          duration: 250,
          easing: Easing.out(Easing.ease),
        });
      }
    }, [bannerLoaded]);

    useEffect(() => {
      if (logoLoaded) {
        logoOpacity.value = withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
      }
    }, [logoLoaded]);

    const bannerAnimatedStyle = useAnimatedStyle(() => ({
      opacity: bannerOpacity.value,
    }));

    const logoAnimatedStyle = useAnimatedStyle(() => ({
      opacity: logoOpacity.value,
    }));

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.elevation1,
            borderWidth: 1,
            borderColor: isFocused ? colors.primary : 'rgba(255,255,255,0.18)',
            width: cardWidth,
            height: cardHeight,
          },
        ]}
      >
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          {!bannerLoaded && <View style={styles.skeletonBannerFull} />}
          <Animated.View style={[bannerAnimatedStyle, { flex: 1 }]}>
            <FastImage
              source={{
                uri: item.banner || item.poster,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.banner}
              resizeMode={FastImage.resizeMode.cover}
              onLoad={() => setBannerLoaded(true)}
            />
          </Animated.View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
            locations={[0.4, 0.7, 1]}
            style={styles.bannerGradient}
          />
        </View>

        {/* Content Overlay */}
        <View style={styles.contentOverlay}>
          {/* Logo or Title */}
          {item.logo && !logoFailed ? (
            <View style={styles.logoContainer}>
              <Animated.View style={logoAnimatedStyle}>
                <FastImage
                  source={{
                    uri: item.logo,
                    priority: FastImage.priority.high,
                    cache: FastImage.cacheControl.immutable,
                  }}
                  style={[styles.logo, { width: Math.round(cardWidth * 0.72) }]}
                  resizeMode={FastImage.resizeMode.contain}
                  onLoad={() => setLogoLoaded(true)}
                  onError={onLogoError}
                />
              </Animated.View>
            </View>
          ) : (
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.highEmphasis }]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          )}

          {/* Genres */}
          {item.genres && item.genres.length > 0 && (
            <View style={styles.genresContainer}>
              <Text style={[styles.genres, { color: colors.mediumEmphasis }]} numberOfLines={1}>
                {item.genres.slice(0, 3).join(' \u2022 ')}
              </Text>
            </View>
          )}

          {/* Focus Hint */}
          {isFocused && (
            <View style={styles.focusHint}>
              <Text style={[styles.focusHintText, { color: colors.highEmphasis }]}>
                Press to view details
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
);

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    paddingVertical: 12,
  },
  backgroundContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bottomBlend: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  skeletonBannerFull: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  contentOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logo: {
    height: 64,
  },
  titleContainer: {
    marginBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  genresContainer: {
    marginBottom: 12,
  },
  genres: {
    fontSize: 14,
    textAlign: 'center',
  },
  focusHint: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  focusHintText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paginationContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    position: 'relative',
    zIndex: 1,
  },
  navigationHints: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    transform: [{ translateY: -12 }],
  },
  navHint: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// =============================================================================
// Export
// =============================================================================

export default React.memo(HeroCarousel);
