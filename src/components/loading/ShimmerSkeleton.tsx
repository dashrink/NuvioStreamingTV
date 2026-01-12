/**
 * @fileoverview ShimmerSkeleton Component
 *
 * A reusable animated shimmer skeleton placeholder for content loading states.
 * Provides a smooth, theme-aware shimmer animation that can be synchronized
 * across multiple skeleton elements.
 *
 * @module loading/ShimmerSkeleton
 *
 * @see SkeletonLoadingProps - Base props interface
 * @see useShimmerProgress - Hook for synchronized animations
 * @see SkeletonGroup - Component for multiple synchronized skeletons
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  cancelAnimation,
  SharedValue,
  Easing,
} from 'react-native-reanimated';

import {
  SkeletonLoadingProps,
  LOADING_ANIMATION_DURATIONS,
  DEFAULT_LOADING_CONFIG,
  getLoadingColorTokens,
} from './types';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Extended props for the ShimmerSkeleton component.
 * Extends SkeletonLoadingProps with optional theme color overrides
 * and animation configuration.
 *
 * @interface ShimmerSkeletonProps
 * @extends {SkeletonLoadingProps}
 *
 * @example
 * // All available props
 * <ShimmerSkeleton
 *   width={200}
 *   height={40}
 *   borderRadius={8}
 *   marginBottom={16}
 *   baseColor="rgba(255,255,255,0.1)"
 *   highlightColor="rgba(255,255,255,0.2)"
 *   delay={100}
 *   animated={true}
 *   shimmerProgress={sharedProgress}
 *   style={{ marginHorizontal: 16 }}
 *   testID="my-skeleton"
 * />
 */
export interface ShimmerSkeletonProps extends SkeletonLoadingProps {
  /**
   * Override base background color.
   * Defaults to theme-derived skeleton base color from getLoadingColorTokens().
   *
   * @type {string}
   * @default getLoadingColorTokens(theme.colors).skeletonBase
   *
   * @example
   * baseColor="rgba(255, 255, 255, 0.1)"
   */
  baseColor?: string;

  /**
   * Override shimmer highlight color.
   * The moving gradient color that creates the shimmer effect.
   *
   * @type {string}
   * @default 'rgba(255, 255, 255, 0.12)'
   *
   * @example
   * highlightColor="rgba(255, 255, 255, 0.2)"
   */
  highlightColor?: string;

  /**
   * Animation delay in milliseconds.
   * Useful for creating staggered animation effects.
   *
   * @type {number}
   * @default 0
   *
   * @example
   * // Second skeleton starts 100ms later
   * <ShimmerSkeleton delay={100} ... />
   */
  delay?: number;

  /**
   * Whether the skeleton should animate.
   * Set to false for static placeholder without shimmer effect.
   *
   * @type {boolean}
   * @default true
   *
   * @example
   * // Static skeleton (no animation)
   * <ShimmerSkeleton animated={false} ... />
   */
  animated?: boolean;
}

/**
 * Hook to create a shared shimmer progress value for synchronized animations.
 *
 * Use this when you want multiple ShimmerSkeleton components to animate together
 * in perfect sync. The returned SharedValue cycles continuously from 0 to 1.
 *
 * ## When to Use
 *
 * - Card layouts with multiple skeleton elements
 * - List items with synchronized placeholders
 * - Form fields loading together
 * - Any grouped content placeholders
 *
 * @function useShimmerProgress
 * @param {number} [duration=1500] - Animation cycle duration in milliseconds
 * @returns {SharedValue<number>} Animated value that cycles 0 → 1 → 0 → 1...
 *
 * @example
 * // Basic synchronized skeletons
 * import { ShimmerSkeleton, useShimmerProgress } from '@/components/loading';
 *
 * function CardSkeleton() {
 *   const shimmerProgress = useShimmerProgress();
 *
 *   return (
 *     <View style={styles.card}>
 *       <ShimmerSkeleton
 *         width={120}
 *         height={180}
 *         shimmerProgress={shimmerProgress}
 *       />
 *       <ShimmerSkeleton
 *         width="80%"
 *         height={16}
 *         shimmerProgress={shimmerProgress}
 *       />
 *       <ShimmerSkeleton
 *         width="60%"
 *         height={12}
 *         shimmerProgress={shimmerProgress}
 *       />
 *     </View>
 *   );
 * }
 *
 * @example
 * // Custom animation speed (faster shimmer)
 * const fastProgress = useShimmerProgress(800); // 800ms per cycle
 */
export function useShimmerProgress(
  duration: number = LOADING_ANIMATION_DURATIONS.shimmer
): SharedValue<number> {
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      }),
      -1, // infinite
      false
    );

    return () => {
      cancelAnimation(shimmerProgress);
    };
  }, [duration]);

  return shimmerProgress;
}

/**
 * ShimmerSkeleton - A reusable animated shimmer skeleton placeholder
 *
 * Creates a skeleton loading placeholder with a smooth shimmer animation effect.
 * The shimmer is a moving linear gradient that gives the impression of loading.
 *
 * ## Features
 *
 * - **Theme-aware**: Colors derived from current theme automatically
 * - **Flexible sizing**: Supports fixed pixels or percentage widths
 * - **Synchronized animations**: Share animation progress across elements
 * - **Configurable**: Custom colors, border radius, and margins
 * - **Accessible**: Proper accessibility role for screen readers
 *
 * ## Animation Behavior
 *
 * - Standalone: Creates own animation cycle (1500ms default)
 * - Synchronized: Uses provided shimmerProgress for perfect sync
 * - Static: Set animated={false} for no animation
 *
 * @component
 * @param {ShimmerSkeletonProps} props - Component props
 *
 * @example
 * // Basic standalone usage (auto-animates)
 * import { ShimmerSkeleton } from '@/components/loading';
 *
 * function TextPlaceholder() {
 *   return <ShimmerSkeleton width={200} height={20} />;
 * }
 *
 * @example
 * // Avatar placeholder (circular)
 * function AvatarPlaceholder() {
 *   return (
 *     <ShimmerSkeleton
 *       width={60}
 *       height={60}
 *       borderRadius={30}
 *       marginBottom={0}
 *     />
 *   );
 * }
 *
 * @example
 * // Full-width text lines
 * function ParagraphPlaceholder() {
 *   return (
 *     <View>
 *       <ShimmerSkeleton width="100%" height={14} borderRadius={4} />
 *       <ShimmerSkeleton width="100%" height={14} borderRadius={4} />
 *       <ShimmerSkeleton width="70%" height={14} borderRadius={4} />
 *     </View>
 *   );
 * }
 *
 * @example
 * // Synchronized card skeleton
 * function ProductCardSkeleton() {
 *   const progress = useShimmerProgress();
 *
 *   return (
 *     <View style={styles.productCard}>
 *       {/* Product image *\/}
 *       <ShimmerSkeleton
 *         width="100%"
 *         height={200}
 *         borderRadius={8}
 *         shimmerProgress={progress}
 *       />
 *       {/* Product name *\/}
 *       <ShimmerSkeleton
 *         width="80%"
 *         height={18}
 *         borderRadius={4}
 *         shimmerProgress={progress}
 *       />
 *       {/* Price *\/}
 *       <ShimmerSkeleton
 *         width={80}
 *         height={16}
 *         borderRadius={4}
 *         shimmerProgress={progress}
 *       />
 *     </View>
 *   );
 * }
 */
const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = ({
  width: elementWidth,
  height: elementHeight,
  borderRadius = DEFAULT_LOADING_CONFIG.skeletonBorderRadius,
  marginBottom = DEFAULT_LOADING_CONFIG.skeletonMarginBottom,
  style,
  testID,
  shimmerProgress: externalProgress,
  baseColor: customBaseColor,
  highlightColor: customHighlightColor,
  delay = 0,
  animated = true,
}) => {
  const { currentTheme } = useTheme();

  // Get theme-derived colors
  const colorTokens = getLoadingColorTokens(currentTheme.colors);
  const baseColor = customBaseColor || colorTokens.skeletonBase;
  const highlightColor = customHighlightColor || colorTokens.skeletonHighlight;

  // Create internal shimmer progress if not provided externally
  const internalProgress = useSharedValue(0);
  const shimmerProgress = externalProgress || internalProgress;

  // Start internal animation if no external progress is provided
  useEffect(() => {
    if (!externalProgress && animated) {
      internalProgress.value = withRepeat(
        withTiming(1, {
          duration: LOADING_ANIMATION_DURATIONS.shimmer,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        }),
        -1, // infinite
        false
      );

      return () => {
        cancelAnimation(internalProgress);
      };
    }
  }, [externalProgress, animated]);

  // Animated shimmer translate style
  const animatedStyle = useAnimatedStyle(() => {
    if (!animated) {
      return { opacity: 0 };
    }

    const translateX = interpolate(shimmerProgress.value, [0, 1], [-screenWidth, screenWidth]);
    return {
      transform: [{ translateX }],
    };
  });

  // Combine container styles
  const containerStyle: ViewStyle = {
    width: elementWidth,
    height: elementHeight,
    borderRadius,
    marginBottom,
    backgroundColor: baseColor,
    overflow: 'hidden' as const,
  };

  return (
    <View
      style={[containerStyle, style]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading placeholder"
    >
      {animated && (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <LinearGradient
            colors={['transparent', highlightColor, highlightColor, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { width: screenWidth * 2 }]}
          />
        </Animated.View>
      )}
    </View>
  );
};

export default ShimmerSkeleton;
