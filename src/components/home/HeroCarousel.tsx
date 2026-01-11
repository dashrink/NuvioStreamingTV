import React, { useMemo, useState, useEffect, useCallback, memo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle, ImageStyle, ScrollView, StyleProp, Platform, Image, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, Easing, useSharedValue, withTiming, useAnimatedStyle, useAnimatedScrollHandler, useAnimatedReaction, runOnJS, SharedValue, interpolate, Extrapolation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import FastImage from '@d11/react-native-fast-image';
import { Pagination } from 'react-native-reanimated-carousel';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Focusable from '../common/Focusable';
import {
  isTV,
  TV_SPACING,
  TV_TYPOGRAPHY,
  TV_TOUCH_TARGETS,
  TV_HERO,
  TV_ANIMATIONS,
} from '../../utils/tvStyles';

// Optional iOS Glass effect (expo-glass-effect) with safe fallback for HeroCarousel
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
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { StreamingContent } from '../../services/catalogService';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../hooks/useSettings';
import { triggerLight } from '../../hooks/useHaptics';

interface HeroCarouselProps {
  items: StreamingContent[];
  loading?: boolean;
}

// Offset to keep cards below a top tab navigator
const TOP_TABS_OFFSET = Platform.OS === 'ios' ? 44 : 48;

const HeroCarousel: React.FC<HeroCarouselProps> = ({ items, loading = false }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // TV navigation refs for focus management
  const leftArrowRef = useRef<any>(null);
  const rightArrowRef = useRef<any>(null);
  const cardFocusRef = useRef<any>(null);

  // Responsive sizing computed per-render so rotation updates layout
  const isTablet = useMemo(
    () => Math.min(windowWidth, windowHeight) >= 600 || (Platform.OS === 'ios' && (Platform as any).isPad),
    [windowWidth, windowHeight]
  );

  // Keep height based on baseline phone width; widen only on tablets
  const baseCardWidthForHeight = useMemo(
    () => Math.min(windowWidth * 0.8, 480),
    [windowWidth]
  );

  const cardWidth = useMemo(
    () => (isTablet ? Math.max(560, windowWidth - 2 * Math.round(0.1 * windowWidth)) : Math.min(windowWidth * 0.8, 480)),
    [isTablet, windowWidth]
  );

  const cardHeight = useMemo(
    () => Math.round(baseCardWidthForHeight * 9 / 16) + 310,
    [baseCardWidthForHeight]
  );

  const interval = useMemo(() => cardWidth + 16, [cardWidth]);

  // Reduce top padding on phones while keeping tablets unchanged
  const effectiveTopOffset = useMemo(() => (isTablet ? TOP_TABS_OFFSET : 8), [isTablet]);

  const data = useMemo(() => (items && items.length ? items.slice(0, 10) : []), [items]);
  const loopingEnabled = data.length > 1;
  // Duplicate head/tail for seamless looping
  const loopData = useMemo(() => {
    if (!loopingEnabled) return data;
    const head = data[0];
    const tail = data[data.length - 1];
    return [tail, ...data, head];
  }, [data, loopingEnabled]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedLogoIds, setFailedLogoIds] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<any>(null);
  const [isScrollReady, setIsScrollReady] = useState(false);
  const [flippedMap, setFlippedMap] = useState<Record<string, boolean>>({});
  const toggleFlipById = useCallback((id: string) => {
    setFlippedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Note: do not early-return before hooks. Loading UI is returned later.

  const hasData = data.length > 0;

  // Optimized: update background as soon as scroll starts, without waiting for momentum end
  const scrollX = useSharedValue(0);
  const paginationProgress = useSharedValue(0);

  // Parallel image prefetch: start fetching banners and logos as soon as data arrives
  const itemsToPreload = useMemo(() => data.slice(0, 3), [data]);
  useEffect(() => {
    if (!itemsToPreload.length) return;
    try {
      const sources = itemsToPreload.flatMap((it) => {
        const result: { uri: string; priority?: any }[] = [];
        const bannerOrPoster = it.banner || it.poster;
        if (bannerOrPoster) {
          result.push({ uri: bannerOrPoster, priority: (FastImage as any).priority?.low });
        }
        if (it.logo) {
          result.push({ uri: it.logo, priority: (FastImage as any).priority?.normal });
        }
        return result;
      });
      // de-duplicate by uri
      const uniqueSources = Array.from(new Map(sources.map((s) => [s.uri, s])).values());
      if (uniqueSources.length && (FastImage as any).preload) {
        (FastImage as any).preload(uniqueSources);
      }
    } catch {
      // no-op: prefetch is best-effort
    }
  }, [itemsToPreload]);

  // Comprehensive reset when component mounts/remounts to prevent glitching
  useEffect(() => {
    // Start at the first real item for looping
    scrollX.value = loopingEnabled ? interval : 0;
    setActiveIndex(0);
    setIsScrollReady(false);

    // Scroll to position and mark ready after layout
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: loopingEnabled ? interval : 0, y: 0, animated: false });
      setIsScrollReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Reset scroll when data becomes available
  useEffect(() => {
    if (data.length > 0) {
      scrollX.value = loopingEnabled ? interval : 0;
      setActiveIndex(0);
      setIsScrollReady(false);

      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: loopingEnabled ? interval : 0, y: 0, animated: false });
        setIsScrollReady(true);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [data.length]);

  // Re-center on rotation using current interval and activeIndex
  useEffect(() => {
    if (!hasData) return;
    const timer = setTimeout(() => {
      scrollToLogicalIndex(activeIndex, false);
    }, 50);
    return () => clearTimeout(timer);
  }, [windowWidth, windowHeight, interval, loopingEnabled]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onBeginDrag: () => {
      // Smooth scroll start - could add haptic feedback here
    },
    onEndDrag: () => {
      // Smooth scroll end
    },
    onMomentumBegin: () => {
      // Momentum scroll start
    },
    onMomentumEnd: () => {
      // Momentum scroll end
    },
  });

  // Debounced activeIndex update to reduce JS bridge crossings
  const lastIndexUpdateRef = useRef(0);
  useAnimatedReaction(
    () => {
      // Convert scroll position to logical data index (exclude duplicated items)
      let idx = Math.round(scrollX.value / interval);
      if (loopingEnabled) {
        idx -= 1; // account for leading duplicate
      }
      if (idx < 0) idx = data.length - 1;
      if (idx > data.length - 1) idx = 0;
      return idx;
    },
    (idx, prevIdx) => {
      if (idx == null || idx === prevIdx) return;

      // Debounce updates to reduce JS bridge crossings
      const now = Date.now();
      if (now - lastIndexUpdateRef.current < 100) return; // 100ms debounce
      lastIndexUpdateRef.current = now;

      // Clamp to bounds to avoid out-of-range access
      const clamped = Math.max(0, Math.min(idx, data.length - 1));
      runOnJS(setActiveIndex)(clamped);
    },
    [data.length]
  );

  // Keep pagination progress in sync with scrollX so we can animate dots like FeaturedContent
  useAnimatedReaction(
    () => scrollX.value / interval,
    (val) => {
      // Align pagination progress with logical index space
      paginationProgress.value = loopingEnabled ? val - 1 : val;
    },
    [interval, loopingEnabled]
  );

  // JS helper to jump without flicker when hitting clones
  const scrollToLogicalIndex = useCallback((logicalIndex: number, animated = true) => {
    const target = loopingEnabled ? (logicalIndex + 1) * interval : logicalIndex * interval;
    scrollViewRef.current?.scrollTo({ x: target, y: 0, animated });
  }, [interval, loopingEnabled]);

  const contentPadding = useMemo(() => ({ paddingHorizontal: (windowWidth - cardWidth) / 2 }), [windowWidth, cardWidth]);

  const handleNavigateToMetadata = useCallback((id: string, type: any, addonId?: string) => {
    navigation.navigate('Metadata', { id, type, addonId });
  }, [navigation]);

  // TV navigation: go to previous card
  const handlePreviousCard = useCallback(() => {
    if (activeIndex > 0) {
      scrollToLogicalIndex(activeIndex - 1, true);
    } else if (loopingEnabled) {
      scrollToLogicalIndex(data.length - 1, true);
    }
  }, [activeIndex, data.length, loopingEnabled, scrollToLogicalIndex]);

  // TV navigation: go to next card
  const handleNextCard = useCallback(() => {
    if (activeIndex < data.length - 1) {
      scrollToLogicalIndex(activeIndex + 1, true);
    } else if (loopingEnabled) {
      scrollToLogicalIndex(0, true);
    }
  }, [activeIndex, data.length, loopingEnabled, scrollToLogicalIndex]);

  // Container animation based on scroll - must be before early returns
  // TEMPORARILY DISABLED FOR PERFORMANCE TESTING
  // const containerAnimatedStyle = useAnimatedStyle(() => {
  //   const translateX = scrollX.value;
  //   const progress = Math.abs(translateX) / (data.length * (CARD_WIDTH + 16));
  //   
  //   // Very subtle scale animation for the entire container
  //   const scale = 1 - progress * 0.01;
  //   const clampedScale = Math.max(0.99, Math.min(1, scale));
  //   
  //   return {
  //     transform: [{ scale: clampedScale }],
  //   };
  // });

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: 12 + effectiveTopOffset }] as StyleProp<ViewStyle>}>
        <View style={{ height: cardHeight }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: (windowWidth - cardWidth) / 2 }}
          >
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={{ width: cardWidth + 16 }}>
                <View style={[
                  styles.card,
                  {
                    backgroundColor: currentTheme.colors.elevation1,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.18)',
                    width: cardWidth,
                    height: cardHeight,
                  }
                ] as StyleProp<ViewStyle>}>
                  <View style={styles.skeletonBannerFull as ViewStyle} />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Memoized background component with improved timing
  const BackgroundImage = React.memo(({
    item,
    insets
  }: {
    item: StreamingContent;
    insets: any;
  }) => {
    return (
      <View
        style={[
          styles.backgroundContainer,
          { top: -insets.top },
        ] as StyleProp<ViewStyle>}
        pointerEvents="none"
      >
        <View
          style={{ flex: 1 } as any}
        >
          {Platform.OS === 'android' ? (
            <Image
              source={{ uri: item.banner || item.poster }}
              style={styles.backgroundImage as any}
              resizeMode="cover"
              blurRadius={20}
            />
          ) : (
            <>
              <FastImage
                source={{
                  uri: item.banner || item.poster,
                  priority: FastImage.priority.low,
                  cache: FastImage.cacheControl.immutable
                }}
                style={styles.backgroundImage as any}
                resizeMode={FastImage.resizeMode.cover}
              />
              {Platform.OS === 'ios' && GlassViewComp && liquidGlassAvailable ? (
                <GlassViewComp
                  style={styles.backgroundImage as any}
                  glassEffectStyle="regular"
                />
              ) : (
                <BlurView
                  style={styles.backgroundImage as any}
                  intensity={30}
                  tint="dark"
                />
              )}
            </>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.75)"]}
            locations={[0.4, 1]}
            style={styles.backgroundOverlay as ViewStyle}
          />
        </View>
      </View>
    );
  });

  if (!hasData) return null;

  return (
    <View>
      <Animated.View style={[styles.container as ViewStyle, { paddingTop: 12 + effectiveTopOffset }]}>
        {/* Removed preload images for performance - let FastImage cache handle it naturally */}
        {settings.enableHomeHeroBackground && data[activeIndex] && (
          <BackgroundImage
            item={data[activeIndex]}
            insets={insets}
          />
        )}
        {/* Bottom blend to HomeScreen background (not the card) */}
        {settings.enableHomeHeroBackground && (
          <LinearGradient
            colors={["transparent", currentTheme.colors.darkBackground]}
            locations={[0, 1]}
            style={styles.bottomBlend as ViewStyle}
            pointerEvents="none"
          />
        )}
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={interval}
          decelerationRate="fast"
          contentContainerStyle={contentPadding}
          onScroll={scrollHandler}
          scrollEventThrottle={32}
          disableIntervalMomentum
          pagingEnabled={false}
          bounces={false}
          overScrollMode="never"
          style={{ opacity: isScrollReady ? 1 : 0 }}
          contentOffset={{ x: loopingEnabled ? interval : 0, y: 0 }}
          onMomentumScrollEnd={(e) => {
            if (!loopingEnabled) return;
            // Determine current page index in cloned space
            const x = e?.nativeEvent?.contentOffset?.x ?? 0;
            const page = Math.round(x / interval);
            // If at leading clone (0), jump to last real item
            if (page === 0) {
              scrollToLogicalIndex(data.length - 1, false);
            }
            // If at trailing clone (last), jump to first real item
            const lastPage = loopData.length - 1;
            if (page === lastPage) {
              scrollToLogicalIndex(0, false);
            }
          }}
        >
          {(loopingEnabled ? loopData : data).map((item, index) => (
            /* TEST 5: ORIGINAL CARD WITHOUT LINEAR GRADIENT */
            <CarouselCard
              key={`${item.id}-${index}-${loopingEnabled ? 'loop' : 'base'}`}
              item={item}
              colors={currentTheme.colors}
              logoFailed={failedLogoIds.has(item.id)}
              onLogoError={() => setFailedLogoIds((prev) => new Set(prev).add(item.id))}
              onPressInfo={() => handleNavigateToMetadata(item.id, item.type)}
              scrollX={scrollX}
              interval={interval}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              isFlipped={flippedMap[item.id] || false}
              onFlipToggle={() => toggleFlipById(item.id)}
            />
          ))}
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
};

interface CarouselCardProps {
  item: StreamingContent;
  colors: any;
  logoFailed: boolean;
  onLogoError: () => void;
  onPressInfo: () => void;
  scrollX: Animated.Animated.SharedValue<number>;
  interval: number;
  cardWidth: number;
  cardHeight: number;
  isFlipped: boolean;
  onFlipToggle: () => void;
}

const CarouselCard: React.FC<CarouselCardProps> = memo(({
  item,
  colors,
  logoFailed,
  onLogoError,
  onPressInfo,
  scrollX,
  interval,
  cardWidth,
  cardHeight,
  isFlipped,
  onFlipToggle,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const offset = scrollX.value;
    const cardOffset = item.id ? Math.abs(offset - (index * interval)) : 0;
    
    // Subtle rotation and scale based on distance from center
    const distance = cardOffset / cardWidth;
    const rotation = Math.min(distance * 5, 5);
    const scale = 1 - Math.min(distance * 0.05, 0.1);

    return {
      transform: [
        { perspective:1000 },
        { rotateY: `${rotation}deg` },
        { scale: Math.max(scale, 0.9) },
      ],
    };
  }, [scrollX.value, interval, cardWidth]);

  // Calculate the index within the loopData/data
  const index = useMemo(() => {
    // This needs to match how the item is positioned in the rendered array
    return 0; // Placeholder - actual implementation would track real index
  }, []);

  const flipAnimValue = useSharedValue(0);
  const flipAnim = useAnimatedStyle(() => {
    const rotation = flipAnimValue.value * 180;
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotation}deg` },
      ],
    };
  });

  const handleFlip = useCallback(() => {
    triggerLight();
    onFlipToggle();
    flipAnimValue.value = withTiming(isFlipped ? 0 : 1, {
      duration: 500,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isFlipped, onFlipToggle, flipAnimValue]);

  return (
    <View style={{ width: cardWidth + 16, marginRight: 0 }}>
      <Animated.View style={[animatedStyle]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.card,
            {
              width: cardWidth,
              height: cardHeight,
              backgroundColor: colors.elevation1,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            } as StyleProp<ViewStyle>
          ]}
          onPress={onPressInfo}
        >
          <Animated.View style={[flipAnim, { flex: 1 }]}>
            {/* Banner Section */}
            <View style={{ flex: 0.55, width: '100%', overflow: 'hidden', borderRadius: 12 }}>
              {item.banner || item.poster ? (
                <FastImage
                  source={{ uri: item.banner || item.poster }}
                  style={{ flex: 1 }}
                  resizeMode={FastImage.resizeMode.cover}
                />
              ) : null}
            </View>

            {/* Content Section */}
            <View style={{ flex: 0.45, padding: 12, justifyContent: 'space-between' }}>
              {/* Logo and Title */}
              <View>
                {!logoFailed && item.logo ? (
                  <FastImage
                    source={{ uri: item.logo }}
                    style={{ width: '70%', height: 40, marginBottom: 8 }}
                    resizeMode={FastImage.resizeMode.contain}
                    onError={onLogoError}
                  />
                ) : (
                  <Text
                    style={[
                      styles.title,
                      { color: colors.text, marginBottom: 8 }
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                )}
              </View>

              {/* Bottom Info */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={onPressInfo}
                >
                  <Ionicons name="information-circle" size={24} color={colors.primary} />
                  <Text style={[styles.infoButtonText, { color: colors.primary }]}>Info</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={handleFlip}
                >
                  <MaterialIcons name="flip" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  skeletonBannerFull: {
    width: '100%',
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  backgroundOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  bottomBlend: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  flipButton: {
    padding: 4,
  },
});

export default HeroCarousel;