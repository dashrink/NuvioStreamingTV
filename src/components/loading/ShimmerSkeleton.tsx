import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useTheme } from '../../contexts/ThemeContext';
import {
  SkeletonLoadingProps,
  LOADING_ANIMATION_DURATIONS,
  DEFAULT_LOADING_CONFIG,
  getLoadingColorTokens,
} from './types';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Props for the ShimmerSkeleton component
 * Extends SkeletonLoadingProps with optional theme color overrides
 */
export interface ShimmerSkeletonProps extends SkeletonLoadingProps {
  /** Override base color (defaults to theme-derived skeleton base) */
  baseColor?: string;
  /** Override highlight color (defaults to theme-derived skeleton highlight) */
  highlightColor?: string;
  /** Animation delay in milliseconds (useful for staggered animations) */
  delay?: number;
  /** Whether the skeleton should animate (defaults to true) */
  animated?: boolean;
}

/**
 * Hook to create a shared shimmer progress value for synchronized animations
 *
 * Use this when you want multiple ShimmerSkeleton components to animate together.
 * Pass the returned sharedProgress to each ShimmerSkeleton's shimmerProgress prop.
 *
 * @param duration - Animation cycle duration in ms (default: 1500ms)
 * @returns SharedValue<number> that cycles from 0 to 1
 *
 * @example
 * const shimmerProgress = useShimmerProgress();
 *
 * return (
 *   <View>
 *     <ShimmerSkeleton width={100} height={20} shimmerProgress={shimmerProgress} />
 *     <ShimmerSkeleton width={80} height={20} shimmerProgress={shimmerProgress} />
 *   </View>
 * );
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
 * Can be used standalone (creates its own animation) or synchronized with other
 * skeletons using a shared shimmerProgress value.
 *
 * Features:
 * - Theme-aware base and highlight colors
 * - Configurable dimensions (width supports both number and percentage strings)
 * - Shared animation progress for synchronized animations
 * - Smooth bezier-curved shimmer effect
 *
 * @example
 * // Basic standalone usage
 * <ShimmerSkeleton width={200} height={40} />
 *
 * @example
 * // With percentage width
 * <ShimmerSkeleton width="100%" height={20} borderRadius={4} />
 *
 * @example
 * // Synchronized animations across multiple skeletons
 * const shimmerProgress = useShimmerProgress();
 * return (
 *   <>
 *     <ShimmerSkeleton width="80%" height={16} shimmerProgress={shimmerProgress} />
 *     <ShimmerSkeleton width="60%" height={16} shimmerProgress={shimmerProgress} />
 *   </>
 * );
 *
 * @example
 * // Custom colors for specific contexts
 * <ShimmerSkeleton
 *   width={100}
 *   height={100}
 *   borderRadius={50}
 *   baseColor="rgba(100,100,100,0.3)"
 *   highlightColor="rgba(150,150,150,0.4)"
 * />
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

    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-screenWidth, screenWidth]
    );
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
        <Animated.View
          style={[StyleSheet.absoluteFill, animatedStyle]}
        >
          <LinearGradient
            colors={[
              'transparent',
              highlightColor,
              highlightColor,
              'transparent',
            ]}
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
