/**
 * @fileoverview SkeletonGroup Component
 *
 * A component that renders multiple skeleton elements with synchronized shimmer
 * animation. Includes preset configurations for common UI patterns and support
 * for custom skeleton layouts.
 *
 * ## Key Features
 *
 * - **Synchronized Animation**: All skeletons share the same animation progress
 * - **Preset Patterns**: Pre-configured layouts for list, grid, text, poster, etc.
 * - **Staggered Fade-in**: Optional progressive reveal animation
 * - **Custom Rendering**: renderItem prop for complex skeleton layouts
 * - **Responsive**: Dimensions adjust based on device type
 *
 * ## Available Presets
 *
 * | Preset      | Layout     | Use Case                      |
 * |-------------|------------|-------------------------------|
 * | list        | Vertical   | Settings menus, menu items    |
 * | grid        | Grid wrap  | Library, search results       |
 * | textBlock   | Vertical   | Description paragraphs        |
 * | poster      | Horizontal | Poster carousels              |
 * | episode     | Vertical   | Episode card lists            |
 * | cast        | Horizontal | Cast member rows              |
 * | catalogRow  | Horizontal | Home screen catalog rows      |
 *
 * @module loading/SkeletonGroup
 *
 * @see SkeletonGroupProps - Props interface
 * @see ShimmerSkeleton - Base skeleton component
 * @see useShimmerProgress - Animation synchronization hook
 *
 * @example
 * // Import SkeletonGroup
 * import { SkeletonGroup } from '@/components/loading';
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  interpolate,
  cancelAnimation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

import ShimmerSkeleton, { useShimmerProgress } from './ShimmerSkeleton';
import {
  SkeletonGroupProps,
  SkeletonPreset,
  LOADING_ANIMATION_DURATIONS,
  getDeviceType,
  DeviceType,
} from './types';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Configuration for a skeleton preset pattern.
 *
 * @internal
 * @interface PresetConfig
 */
interface PresetConfig {
  /** Width of each skeleton item (number or percentage) */
  width: number | string;
  /** Height of each skeleton item */
  height: number;
  /** Border radius for skeleton items */
  borderRadius: number;
  /** Layout direction */
  direction: 'row' | 'column';
  /** Whether items should wrap */
  flexWrap: 'wrap' | 'nowrap';
  /** Default gap between items */
  defaultGap: number;
}

/**
 * Get preset configuration for each skeleton type
 * Dimensions are responsive based on device type
 */
function getPresetConfig(preset: SkeletonPreset, deviceType: DeviceType): PresetConfig {
  const isTV = deviceType === 'tv';
  const isLargeTablet = deviceType === 'largeTablet';
  const isTablet = deviceType === 'tablet';

  switch (preset) {
    case 'list':
      // Vertical list items (like settings menu items)
      return {
        width: '100%',
        height: isTV ? 60 : isLargeTablet ? 56 : 52,
        borderRadius: 8,
        direction: 'column',
        flexWrap: 'nowrap',
        defaultGap: 12,
      };

    case 'grid':
      // Grid items (like library grid)
      const gridItemWidth = isTV ? 160 : isLargeTablet ? 140 : isTablet ? 120 : 100;
      return {
        width: gridItemWidth,
        height: gridItemWidth * 1.5, // 2:3 aspect ratio for posters
        borderRadius: 8,
        direction: 'row',
        flexWrap: 'wrap',
        defaultGap: 16,
      };

    case 'textBlock':
      // Text block lines (for descriptions)
      return {
        width: '100%',
        height: isTV ? 18 : 15,
        borderRadius: 4,
        direction: 'column',
        flexWrap: 'nowrap',
        defaultGap: 10,
      };

    case 'poster':
      // Horizontal poster row
      const posterWidth = isTV ? 140 : isLargeTablet ? 120 : isTablet ? 110 : 100;
      return {
        width: posterWidth,
        height: posterWidth * 1.5,
        borderRadius: 8,
        direction: 'row',
        flexWrap: 'nowrap',
        defaultGap: 12,
      };

    case 'episode':
      // Episode cards with thumbnail
      const episodeThumbnailWidth = isTV ? 200 : isLargeTablet ? 180 : isTablet ? 160 : 140;
      return {
        width: episodeThumbnailWidth,
        height: episodeThumbnailWidth * 0.56, // 16:9 aspect ratio
        borderRadius: 8,
        direction: 'column',
        flexWrap: 'nowrap',
        defaultGap: 16,
      };

    case 'cast':
      // Cast member circles with name
      const castSize = isTV ? 100 : isLargeTablet ? 90 : isTablet ? 85 : 80;
      return {
        width: castSize,
        height: castSize,
        borderRadius: castSize / 2, // Circular
        direction: 'row',
        flexWrap: 'nowrap',
        defaultGap: 16,
      };

    case 'catalogRow':
      // Catalog row with title and poster row
      const catalogPosterWidth = isTV ? 140 : isLargeTablet ? 120 : isTablet ? 110 : 100;
      return {
        width: catalogPosterWidth,
        height: catalogPosterWidth * 1.5,
        borderRadius: 8,
        direction: 'row',
        flexWrap: 'nowrap',
        defaultGap: 12,
      };

    default:
      // Default list configuration
      return {
        width: '100%',
        height: 48,
        borderRadius: 8,
        direction: 'column',
        flexWrap: 'nowrap',
        defaultGap: 12,
      };
  }
}

/**
 * Get varying widths for text block preset to create natural text appearance
 */
function getTextBlockWidth(index: number, count: number): string {
  // Last line is shorter, varied widths for natural look
  if (index === count - 1) return '65%';
  if (index % 3 === 0) return '100%';
  if (index % 3 === 1) return '95%';
  return '85%';
}

/**
 * Internal component for each skeleton item with stagger animation
 */
interface SkeletonItemProps {
  index: number;
  shimmerProgress: SharedValue<number>;
  width: number | string;
  height: number;
  borderRadius: number;
  staggered: boolean;
  staggerDelay: number;
  customStyle?: ViewStyle;
}

const SkeletonItem: React.FC<SkeletonItemProps> = ({
  index,
  shimmerProgress,
  width,
  height,
  borderRadius,
  staggered,
  staggerDelay,
  customStyle,
}) => {
  const fadeOpacity = useSharedValue(staggered ? 0 : 1);
  const translateY = useSharedValue(staggered ? 10 : 0);

  useEffect(() => {
    if (staggered) {
      const delay = index * staggerDelay;

      fadeOpacity.value = withDelay(
        delay,
        withTiming(1, {
          duration: LOADING_ANIMATION_DURATIONS.fadeIn,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        })
      );

      translateY.value = withDelay(
        delay,
        withTiming(0, {
          duration: LOADING_ANIMATION_DURATIONS.fadeIn,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        })
      );

      return () => {
        cancelAnimation(fadeOpacity);
        cancelAnimation(translateY);
      };
    }
  }, [staggered, index, staggerDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateY: interpolate(fadeOpacity.value, [0, 1], [10, 0]) }],
  }));

  return (
    <Animated.View style={staggered ? animatedStyle : undefined}>
      <ShimmerSkeleton
        width={width}
        height={height}
        borderRadius={borderRadius}
        marginBottom={0}
        shimmerProgress={shimmerProgress}
        style={customStyle}
        testID={`skeleton-item-${index}`}
      />
    </Animated.View>
  );
};

/**
 * SkeletonGroup - Renders multiple skeleton elements with synchronized shimmer animation
 *
 * A component that displays multiple skeleton placeholders with:
 * - Shared shimmer animation across all items for visual consistency
 * - Preset configurations for common patterns (list, grid, textBlock, poster, etc.)
 * - Staggered fade-in animation option for progressive reveal
 * - Configurable gap between items
 * - Custom render function for complex skeleton layouts
 *
 * @example
 * // Basic list skeleton
 * <SkeletonGroup count={5} preset="list" />
 *
 * @example
 * // Grid layout with custom gap
 * <SkeletonGroup count={8} preset="grid" gap={20} />
 *
 * @example
 * // Text block with staggered animation
 * <SkeletonGroup count={3} preset="textBlock" staggered />
 *
 * @example
 * // Horizontal poster row
 * <SkeletonGroup count={4} preset="poster" />
 *
 * @example
 * // Custom render function for complex layouts
 * <SkeletonGroup
 *   count={3}
 *   renderItem={(index, shimmerProgress) => (
 *     <View key={index} style={{ flexDirection: 'row', gap: 12 }}>
 *       <ShimmerSkeleton width={100} height={100} shimmerProgress={shimmerProgress} />
 *       <View style={{ flex: 1 }}>
 *         <ShimmerSkeleton width="80%" height={16} shimmerProgress={shimmerProgress} />
 *         <ShimmerSkeleton width="60%" height={14} shimmerProgress={shimmerProgress} />
 *       </View>
 *     </View>
 *   )}
 * />
 */
const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  count,
  preset = 'list',
  gap,
  staggered = false,
  style,
  testID,
  renderItem,
}) => {
  // Shared shimmer progress for all skeleton items
  const shimmerProgress = useShimmerProgress();

  // Get responsive device type
  const deviceType = getDeviceType(screenWidth);

  // Get preset configuration
  const presetConfig = getPresetConfig(preset, deviceType);

  // Use provided gap or preset default
  const itemGap = gap ?? presetConfig.defaultGap;

  // Stagger delay between items
  const staggerDelay = LOADING_ANIMATION_DURATIONS.staggerDelay;

  // Container style based on preset direction
  const containerStyle: ViewStyle = {
    flexDirection: presetConfig.direction,
    flexWrap: presetConfig.flexWrap,
    gap: itemGap,
  };

  // Render custom items if renderItem is provided
  if (renderItem) {
    return (
      <View
        style={[containerStyle, style]}
        testID={testID}
        accessibilityRole="progressbar"
        accessibilityLabel={`Loading ${count} items`}
      >
        {Array.from({ length: count }, (_, index) => (
          <React.Fragment key={`skeleton-custom-${index}`}>
            {renderItem(index, shimmerProgress)}
          </React.Fragment>
        ))}
      </View>
    );
  }

  // Render preset skeleton items
  return (
    <View
      style={[containerStyle, style]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={`Loading ${count} items`}
    >
      {Array.from({ length: count }, (_, index) => {
        // Get width (varies for textBlock preset)
        const itemWidth =
          preset === 'textBlock' ? getTextBlockWidth(index, count) : presetConfig.width;

        return (
          <SkeletonItem
            key={`skeleton-${preset}-${index}`}
            index={index}
            shimmerProgress={shimmerProgress}
            width={itemWidth}
            height={presetConfig.height}
            borderRadius={presetConfig.borderRadius}
            staggered={staggered}
            staggerDelay={staggerDelay}
          />
        );
      })}
    </View>
  );
};

/**
 * CastSkeletonGroup - Specialized skeleton group for cast members
 *
 * Renders cast member placeholders with circular avatar and name skeleton.
 * Uses shared shimmer animation for visual consistency.
 *
 * @example
 * <CastSkeletonGroup count={5} staggered />
 */
export const CastSkeletonGroup: React.FC<{
  count: number;
  gap?: number;
  staggered?: boolean;
  style?: ViewStyle;
  testID?: string;
}> = ({ count, gap = 16, staggered = false, style, testID }) => {
  const deviceType = getDeviceType(screenWidth);
  const castConfig = getPresetConfig('cast', deviceType);

  const isTV = deviceType === 'tv';

  return (
    <SkeletonGroup
      count={count}
      gap={gap}
      staggered={staggered}
      style={style}
      testID={testID}
      renderItem={(index, progress) => (
        <View key={index} style={styles.castItem}>
          <ShimmerSkeleton
            width={castConfig.width}
            height={castConfig.height}
            borderRadius={castConfig.borderRadius}
            marginBottom={8}
            shimmerProgress={progress}
          />
          <ShimmerSkeleton
            width={isTV ? 70 : 60}
            height={isTV ? 14 : 12}
            borderRadius={4}
            marginBottom={4}
            shimmerProgress={progress}
          />
        </View>
      )}
    />
  );
};

/**
 * EpisodeSkeletonGroup - Specialized skeleton group for episode cards
 *
 * Renders episode card placeholders with thumbnail and info section.
 * Uses shared shimmer animation for visual consistency.
 *
 * @example
 * <EpisodeSkeletonGroup count={3} staggered />
 */
export const EpisodeSkeletonGroup: React.FC<{
  count: number;
  gap?: number;
  staggered?: boolean;
  style?: ViewStyle;
  testID?: string;
}> = ({ count, gap = 16, staggered = false, style, testID }) => {
  const deviceType = getDeviceType(screenWidth);
  const episodeConfig = getPresetConfig('episode', deviceType);

  const isTV = deviceType === 'tv';

  return (
    <SkeletonGroup
      count={count}
      gap={gap}
      staggered={staggered}
      style={style}
      testID={testID}
      renderItem={(index, progress) => (
        <View key={index} style={styles.episodeCard}>
          <ShimmerSkeleton
            width={episodeConfig.width}
            height={episodeConfig.height}
            borderRadius={episodeConfig.borderRadius}
            marginBottom={0}
            shimmerProgress={progress}
          />
          <View style={styles.episodeInfo}>
            <ShimmerSkeleton
              width="80%"
              height={isTV ? 16 : 14}
              borderRadius={4}
              marginBottom={6}
              shimmerProgress={progress}
            />
            <ShimmerSkeleton
              width="60%"
              height={isTV ? 14 : 12}
              borderRadius={4}
              marginBottom={0}
              shimmerProgress={progress}
            />
          </View>
        </View>
      )}
    />
  );
};

/**
 * CatalogRowSkeletonGroup - Specialized skeleton for catalog row
 *
 * Renders a catalog section with title skeleton and horizontal poster row.
 * Matches the structure of HomeScreen catalog rows.
 *
 * @example
 * <CatalogRowSkeletonGroup posterCount={5} />
 */
export const CatalogRowSkeletonGroup: React.FC<{
  posterCount?: number;
  style?: ViewStyle;
  testID?: string;
}> = ({ posterCount = 5, style, testID }) => {
  const shimmerProgress = useShimmerProgress();
  const deviceType = getDeviceType(screenWidth);

  const isTV = deviceType === 'tv';
  const isLargeTablet = deviceType === 'largeTablet';

  return (
    <View style={[styles.catalogRow, style]} testID={testID}>
      {/* Title skeleton */}
      <ShimmerSkeleton
        width={isTV ? 140 : isLargeTablet ? 120 : 100}
        height={isTV ? 24 : 20}
        borderRadius={4}
        marginBottom={16}
        shimmerProgress={shimmerProgress}
      />
      {/* Poster row */}
      <SkeletonGroup count={posterCount} preset="poster" style={styles.posterRow} />
    </View>
  );
};

const styles = StyleSheet.create({
  castItem: {
    alignItems: 'center',
  },
  episodeCard: {
    flexDirection: 'row',
    gap: 12,
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  catalogRow: {
    marginBottom: 24,
  },
  posterRow: {
    flexDirection: 'row',
  },
});

export default SkeletonGroup;
