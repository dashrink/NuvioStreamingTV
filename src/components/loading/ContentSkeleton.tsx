import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import ShimmerSkeleton, { useShimmerProgress } from './ShimmerSkeleton';
import { getDeviceType, DeviceType } from './types';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Get responsive dimensions based on device type
 * Matches the breakpoints and sizing patterns used in actual content components
 */
function getResponsiveDimensions(deviceType: DeviceType) {
  const isTV = deviceType === 'tv';
  const isLargeTablet = deviceType === 'largeTablet';
  const isTablet = deviceType === 'tablet';

  return {
    // Poster dimensions (matches ContentItem.tsx)
    posterWidth: isTV ? 140 : isLargeTablet ? 120 : isTablet ? 110 : 100,
    posterAspectRatio: 2 / 3, // Portrait poster

    // Episode card dimensions (matches EpisodeCard.tsx)
    episodeCardHeight: 120,
    episodeThumbnailSize: 120,
    episodeBorderRadius: 16,

    // Cast dimensions (matches CastSection.tsx)
    castImageSize: isTV ? 100 : isLargeTablet ? 90 : isTablet ? 85 : 80,
    castCardWidth: isTV ? 120 : isLargeTablet ? 110 : isTablet ? 100 : 90,
    castSpacing: isTV ? 20 : isLargeTablet ? 18 : isTablet ? 16 : 16,

    // Catalog row dimensions
    catalogTitleWidth: isTV ? 140 : isLargeTablet ? 120 : 100,
    catalogTitleHeight: isTV ? 24 : 20,
    catalogPosterGap: isTV ? 16 : 12,

    // Text sizes
    nameTextHeight: isTV ? 16 : 14,
    subtitleTextHeight: isTV ? 14 : 12,

    // Spacing
    horizontalPadding: isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16,
  };
}

/**
 * Props for PosterSkeleton component
 */
export interface PosterSkeletonProps {
  /** Override default width (defaults to responsive width based on device) */
  width?: number;
  /** Custom aspect ratio (defaults to 2/3 for portrait poster) */
  aspectRatio?: number;
  /** Border radius (defaults to 8) */
  borderRadius?: number;
  /** Whether to show title skeleton below poster */
  showTitle?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier */
  testID?: string;
}

/**
 * PosterSkeleton - Skeleton placeholder that matches ContentItem poster dimensions
 *
 * Displays a poster-shaped skeleton with optional title placeholder below.
 * Uses responsive sizing based on device type (phone, tablet, TV).
 *
 * @example
 * // Basic usage
 * <PosterSkeleton />
 *
 * @example
 * // With title and custom width
 * <PosterSkeleton width={120} showTitle />
 *
 * @example
 * // Square poster (for special cards)
 * <PosterSkeleton aspectRatio={1} />
 */
export const PosterSkeleton: React.FC<PosterSkeletonProps> = ({
  width: customWidth,
  aspectRatio = 2 / 3,
  borderRadius = 8,
  showTitle = false,
  style,
  testID,
}) => {
  const shimmerProgress = useShimmerProgress();
  const deviceType = getDeviceType(screenWidth);
  const dimensions = getResponsiveDimensions(deviceType);

  const posterWidth = customWidth ?? dimensions.posterWidth;
  const posterHeight = posterWidth / aspectRatio;

  return (
    <View style={[styles.posterContainer, style]} testID={testID}>
      <ShimmerSkeleton
        width={posterWidth}
        height={posterHeight}
        borderRadius={borderRadius}
        marginBottom={showTitle ? 8 : 0}
        shimmerProgress={shimmerProgress}
      />
      {showTitle && (
        <ShimmerSkeleton
          width={posterWidth * 0.8}
          height={dimensions.nameTextHeight}
          borderRadius={4}
          marginBottom={0}
          shimmerProgress={shimmerProgress}
        />
      )}
    </View>
  );
};

/**
 * Props for EpisodeSkeleton component
 */
export interface EpisodeSkeletonProps {
  /** Show description line (defaults to true) */
  showDescription?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier */
  testID?: string;
}

/**
 * EpisodeSkeleton - Skeleton placeholder that matches EpisodeCard layout
 *
 * Displays a horizontal card skeleton with square thumbnail on left and
 * info section on right, matching the EpisodeCard component structure.
 *
 * @example
 * // Basic usage
 * <EpisodeSkeleton />
 *
 * @example
 * // Without description line
 * <EpisodeSkeleton showDescription={false} />
 */
export const EpisodeSkeleton: React.FC<EpisodeSkeletonProps> = ({
  showDescription = true,
  style,
  testID,
}) => {
  const shimmerProgress = useShimmerProgress();
  const deviceType = getDeviceType(screenWidth);
  const dimensions = getResponsiveDimensions(deviceType);

  return (
    <View style={[styles.episodeCard, style]} testID={testID}>
      {/* Episode thumbnail */}
      <ShimmerSkeleton
        width={dimensions.episodeThumbnailSize}
        height={dimensions.episodeCardHeight}
        borderRadius={dimensions.episodeBorderRadius}
        marginBottom={0}
        shimmerProgress={shimmerProgress}
      />

      {/* Episode info section */}
      <View style={styles.episodeInfo}>
        {/* Episode title */}
        <ShimmerSkeleton
          width="80%"
          height={dimensions.nameTextHeight}
          borderRadius={4}
          marginBottom={8}
          shimmerProgress={shimmerProgress}
        />

        {/* Metadata row (rating, runtime, date) */}
        <View style={styles.episodeMetaRow}>
          <ShimmerSkeleton
            width={50}
            height={dimensions.subtitleTextHeight}
            borderRadius={4}
            marginBottom={0}
            shimmerProgress={shimmerProgress}
          />
          <ShimmerSkeleton
            width={40}
            height={dimensions.subtitleTextHeight}
            borderRadius={4}
            marginBottom={0}
            style={{ marginLeft: 8 }}
            shimmerProgress={shimmerProgress}
          />
        </View>

        {/* Description lines */}
        {showDescription && (
          <View style={styles.episodeDescriptionContainer}>
            <ShimmerSkeleton
              width="100%"
              height={dimensions.subtitleTextHeight}
              borderRadius={4}
              marginBottom={4}
              shimmerProgress={shimmerProgress}
            />
            <ShimmerSkeleton
              width="70%"
              height={dimensions.subtitleTextHeight}
              borderRadius={4}
              marginBottom={0}
              shimmerProgress={shimmerProgress}
            />
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * Props for CastSkeleton component
 */
export interface CastSkeletonProps {
  /** Show character name line (defaults to true) */
  showCharacter?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier */
  testID?: string;
}

/**
 * CastSkeleton - Skeleton placeholder that matches CastSection cast member layout
 *
 * Displays a circular avatar skeleton with name and optional character name below.
 * Uses responsive sizing matching the actual CastSection component.
 *
 * @example
 * // Basic usage
 * <CastSkeleton />
 *
 * @example
 * // Without character name
 * <CastSkeleton showCharacter={false} />
 */
export const CastSkeleton: React.FC<CastSkeletonProps> = ({
  showCharacter = true,
  style,
  testID,
}) => {
  const shimmerProgress = useShimmerProgress();
  const deviceType = getDeviceType(screenWidth);
  const dimensions = getResponsiveDimensions(deviceType);

  return (
    <View style={[styles.castItem, { width: dimensions.castCardWidth }, style]} testID={testID}>
      {/* Circular avatar */}
      <ShimmerSkeleton
        width={dimensions.castImageSize}
        height={dimensions.castImageSize}
        borderRadius={dimensions.castImageSize / 2}
        marginBottom={8}
        shimmerProgress={shimmerProgress}
      />

      {/* Actor name */}
      <ShimmerSkeleton
        width={dimensions.castCardWidth * 0.75}
        height={dimensions.nameTextHeight}
        borderRadius={4}
        marginBottom={showCharacter ? 4 : 0}
        shimmerProgress={shimmerProgress}
      />

      {/* Character name */}
      {showCharacter && (
        <ShimmerSkeleton
          width={dimensions.castCardWidth * 0.6}
          height={dimensions.subtitleTextHeight}
          borderRadius={4}
          marginBottom={0}
          shimmerProgress={shimmerProgress}
        />
      )}
    </View>
  );
};

/**
 * Props for CatalogRowSkeleton component
 */
export interface CatalogRowSkeletonProps {
  /** Number of poster placeholders to show (defaults to 5) */
  posterCount?: number;
  /** Show section title (defaults to true) */
  showTitle?: boolean;
  /** Horizontal padding (defaults to responsive value) */
  horizontalPadding?: number;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier */
  testID?: string;
}

/**
 * CatalogRowSkeleton - Skeleton placeholder for catalog/row sections
 *
 * Displays a section title skeleton followed by a horizontal row of poster skeletons.
 * Matches the structure of HomeScreen catalog rows and CatalogSection.
 *
 * @example
 * // Basic usage
 * <CatalogRowSkeleton />
 *
 * @example
 * // With more posters and without title
 * <CatalogRowSkeleton posterCount={8} showTitle={false} />
 *
 * @example
 * // Multiple rows for loading state
 * <View>
 *   <CatalogRowSkeleton />
 *   <CatalogRowSkeleton />
 *   <CatalogRowSkeleton />
 * </View>
 */
export const CatalogRowSkeleton: React.FC<CatalogRowSkeletonProps> = ({
  posterCount = 5,
  showTitle = true,
  horizontalPadding: customPadding,
  style,
  testID,
}) => {
  const shimmerProgress = useShimmerProgress();
  const deviceType = getDeviceType(screenWidth);
  const dimensions = getResponsiveDimensions(deviceType);

  const padding = customPadding ?? dimensions.horizontalPadding;
  const posterHeight = dimensions.posterWidth / dimensions.posterAspectRatio;

  // Generate poster array for rendering
  const posters = useMemo(() => Array.from({ length: posterCount }, (_, i) => i), [posterCount]);

  return (
    <View style={[styles.catalogRow, style]} testID={testID}>
      {/* Section title */}
      {showTitle && (
        <View style={{ paddingHorizontal: padding }}>
          <ShimmerSkeleton
            width={dimensions.catalogTitleWidth}
            height={dimensions.catalogTitleHeight}
            borderRadius={4}
            marginBottom={16}
            shimmerProgress={shimmerProgress}
          />
        </View>
      )}

      {/* Horizontal poster row */}
      <View style={[styles.posterRow, { paddingHorizontal: padding }]}>
        {posters.map((index) => (
          <ShimmerSkeleton
            key={`poster-${index}`}
            width={dimensions.posterWidth}
            height={posterHeight}
            borderRadius={8}
            marginBottom={0}
            style={{ marginRight: dimensions.catalogPosterGap }}
            shimmerProgress={shimmerProgress}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * Props for EpisodeListSkeleton component
 */
export interface EpisodeListSkeletonProps {
  /** Number of episode cards to show (defaults to 3) */
  count?: number;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier */
  testID?: string;
}

/**
 * EpisodeListSkeleton - Skeleton placeholder for a vertical list of episodes
 *
 * Renders multiple EpisodeSkeleton components with proper spacing.
 * Useful for episode list loading states in SeriesContent.
 *
 * @example
 * // Basic usage
 * <EpisodeListSkeleton />
 *
 * @example
 * // With more episodes
 * <EpisodeListSkeleton count={5} />
 */
export const EpisodeListSkeleton: React.FC<EpisodeListSkeletonProps> = ({
  count = 3,
  style,
  testID,
}) => {
  const episodes = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  return (
    <View style={[styles.episodeList, style]} testID={testID}>
      {episodes.map((index) => (
        <EpisodeSkeleton key={`episode-${index}`} />
      ))}
    </View>
  );
};

/**
 * Props for CastRowSkeleton component
 */
export interface CastRowSkeletonProps {
  /** Number of cast members to show (defaults to 5) */
  count?: number;
  /** Horizontal padding (defaults to responsive value) */
  horizontalPadding?: number;
  /** Show section title (defaults to true) */
  showTitle?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier */
  testID?: string;
}

/**
 * CastRowSkeleton - Skeleton placeholder for cast section with title
 *
 * Renders a section title followed by a horizontal row of cast member skeletons.
 * Matches the structure of CastSection component.
 *
 * @example
 * // Basic usage
 * <CastRowSkeleton />
 *
 * @example
 * // With more cast members
 * <CastRowSkeleton count={8} />
 */
export const CastRowSkeleton: React.FC<CastRowSkeletonProps> = ({
  count = 5,
  horizontalPadding: customPadding,
  showTitle = true,
  style,
  testID,
}) => {
  const shimmerProgress = useShimmerProgress();
  const deviceType = getDeviceType(screenWidth);
  const dimensions = getResponsiveDimensions(deviceType);

  const padding = customPadding ?? dimensions.horizontalPadding;
  const castMembers = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  return (
    <View style={[styles.castSection, style]} testID={testID}>
      {/* Section title */}
      {showTitle && (
        <View style={{ paddingHorizontal: padding, marginBottom: 16 }}>
          <ShimmerSkeleton
            width={60}
            height={dimensions.catalogTitleHeight}
            borderRadius={4}
            marginBottom={0}
            shimmerProgress={shimmerProgress}
          />
        </View>
      )}

      {/* Horizontal cast row */}
      <View style={[styles.castRow, { paddingHorizontal: padding }]}>
        {castMembers.map((index) => (
          <CastSkeleton
            key={`cast-${index}`}
            style={{ marginRight: dimensions.castSpacing }}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * Props for PosterGridSkeleton component
 */
export interface PosterGridSkeletonProps {
  /** Number of columns (defaults to responsive calculation) */
  columns?: number;
  /** Number of rows to show (defaults to 3) */
  rows?: number;
  /** Gap between items (defaults to responsive value) */
  gap?: number;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier */
  testID?: string;
}

/**
 * PosterGridSkeleton - Skeleton placeholder for grid layouts like Library screen
 *
 * Renders a grid of poster skeletons with responsive columns.
 * Useful for library and search result loading states.
 *
 * @example
 * // Basic usage
 * <PosterGridSkeleton />
 *
 * @example
 * // Custom grid size
 * <PosterGridSkeleton columns={4} rows={4} />
 */
export const PosterGridSkeleton: React.FC<PosterGridSkeletonProps> = ({
  columns: customColumns,
  rows = 3,
  gap: customGap,
  style,
  testID,
}) => {
  const shimmerProgress = useShimmerProgress();
  const deviceType = getDeviceType(screenWidth);
  const dimensions = getResponsiveDimensions(deviceType);

  // Calculate responsive columns if not provided
  const columns = useMemo(() => {
    if (customColumns) return customColumns;
    switch (deviceType) {
      case 'tv':
        return 6;
      case 'largeTablet':
        return 5;
      case 'tablet':
        return 4;
      default:
        return 3;
    }
  }, [customColumns, deviceType]);

  const itemGap = customGap ?? (deviceType === 'tv' ? 16 : 12);
  const totalItems = columns * rows;
  const items = useMemo(() => Array.from({ length: totalItems }, (_, i) => i), [totalItems]);

  // Calculate item width based on available space
  const itemWidth = useMemo(() => {
    const availableWidth = screenWidth - (dimensions.horizontalPadding * 2) - (itemGap * (columns - 1));
    return availableWidth / columns;
  }, [columns, itemGap, dimensions.horizontalPadding]);

  const itemHeight = itemWidth / dimensions.posterAspectRatio;

  return (
    <View
      style={[
        styles.posterGrid,
        {
          paddingHorizontal: dimensions.horizontalPadding,
          gap: itemGap,
        },
        style,
      ]}
      testID={testID}
    >
      {items.map((index) => (
        <ShimmerSkeleton
          key={`grid-poster-${index}`}
          width={itemWidth}
          height={itemHeight}
          borderRadius={8}
          marginBottom={0}
          shimmerProgress={shimmerProgress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  posterContainer: {
    alignItems: 'center',
  },
  episodeCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  episodeDescriptionContainer: {
    marginTop: 4,
  },
  castItem: {
    alignItems: 'center',
  },
  catalogRow: {
    marginBottom: 24,
  },
  posterRow: {
    flexDirection: 'row',
  },
  episodeList: {
    gap: 0, // EpisodeSkeleton handles its own marginBottom
  },
  castSection: {
    marginBottom: 24,
  },
  castRow: {
    flexDirection: 'row',
  },
  posterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default {
  PosterSkeleton,
  EpisodeSkeleton,
  CastSkeleton,
  CatalogRowSkeleton,
  EpisodeListSkeleton,
  CastRowSkeleton,
  PosterGridSkeleton,
};
