/**
 * @fileoverview Content-Specific Skeleton Components
 *
 * Pre-configured skeleton components that match the dimensions and layout of
 * actual content components in the app. These provide pixel-perfect loading
 * placeholders for common content types.
 *
 * ## Available Components
 *
 * | Component            | Matches                    | Use Case                   |
 * |----------------------|----------------------------|----------------------------|
 * | PosterSkeleton       | ContentItem                | Movie/show poster cards    |
 * | EpisodeSkeleton      | EpisodeCard                | Episode list items         |
 * | CastSkeleton         | CastSection member         | Cast member circles        |
 * | CatalogRowSkeleton   | HomeScreen catalog rows    | Horizontal poster rows     |
 * | EpisodeListSkeleton  | Episode lists              | Multiple episode cards     |
 * | CastRowSkeleton      | CastSection                | Horizontal cast row        |
 * | PosterGridSkeleton   | LibraryScreen grid         | Grid of poster cards       |
 *
 * ## Responsive Behavior
 *
 * All components automatically adjust their dimensions based on device type:
 * - **Phone**: Compact sizing for mobile screens
 * - **Tablet**: Medium sizing for tablet screens
 * - **Large Tablet**: Larger sizing for iPad Pro, etc.
 * - **TV**: Maximum sizing for TV displays
 *
 * @module loading/ContentSkeleton
 *
 * @see ShimmerSkeleton - Base skeleton component
 * @see useShimmerProgress - Hook for synchronized animations
 *
 * @example
 * // Import content skeletons
 * import {
 *   PosterSkeleton,
 *   EpisodeSkeleton,
 *   CatalogRowSkeleton,
 * } from '@/components/loading';
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import ShimmerSkeleton, { useShimmerProgress } from './ShimmerSkeleton';
import { getDeviceType, DeviceType } from './types';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Calculate responsive dimensions based on device type.
 * Matches the breakpoints and sizing patterns used in actual content components
 * to ensure skeleton placeholders are pixel-perfect matches.
 *
 * @internal
 * @param {DeviceType} deviceType - Current device classification
 * @returns {Object} Object containing all dimension values
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
 * Props for PosterSkeleton component.
 *
 * @interface PosterSkeletonProps
 *
 * @example
 * // All available props
 * <PosterSkeleton
 *   width={120}
 *   aspectRatio={2/3}
 *   borderRadius={8}
 *   showTitle={true}
 *   style={{ margin: 8 }}
 *   testID="poster-skeleton"
 * />
 */
export interface PosterSkeletonProps {
  /**
   * Override default poster width in pixels.
   * Defaults to responsive width based on device type.
   *
   * @type {number}
   * @default Responsive (100-140px based on device)
   */
  width?: number;

  /**
   * Poster aspect ratio (height = width / aspectRatio).
   * Standard movie/show posters use 2/3 (portrait).
   *
   * @type {number}
   * @default 2/3 (portrait poster)
   *
   * @example
   * aspectRatio={1}    // Square
   * aspectRatio={16/9} // Landscape
   * aspectRatio={2/3}  // Portrait (default)
   */
  aspectRatio?: number;

  /**
   * Border radius for the poster skeleton.
   *
   * @type {number}
   * @default 8
   */
  borderRadius?: number;

  /**
   * Whether to show a title skeleton below the poster.
   * The title skeleton is 80% of poster width.
   *
   * @type {boolean}
   * @default false
   */
  showTitle?: boolean;

  /**
   * Custom container style.
   *
   * @type {ViewStyle}
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   */
  testID?: string;
}

/**
 * PosterSkeleton - Skeleton placeholder that matches ContentItem poster dimensions
 *
 * Displays a poster-shaped skeleton with synchronized shimmer animation.
 * Dimensions are responsive and match the actual ContentItem component.
 *
 * ## Responsive Dimensions
 *
 * | Device      | Width  | Height (2:3) |
 * |-------------|--------|--------------|
 * | Phone       | 100px  | 150px        |
 * | Tablet      | 110px  | 165px        |
 * | Large Tablet| 120px  | 180px        |
 * | TV          | 140px  | 210px        |
 *
 * @component
 * @param {PosterSkeletonProps} props - Component props
 *
 * @example
 * // Basic usage - responsive sizing
 * import { PosterSkeleton } from '@/components/loading';
 *
 * function MovieCardLoading() {
 *   return <PosterSkeleton />;
 * }
 *
 * @example
 * // With title placeholder
 * function MovieCardWithTitleLoading() {
 *   return <PosterSkeleton showTitle />;
 * }
 *
 * @example
 * // Custom width for specific layout
 * function LargeMovieCard() {
 *   return <PosterSkeleton width={160} showTitle />;
 * }
 *
 * @example
 * // Square aspect ratio for album art
 * function AlbumCoverLoading() {
 *   return <PosterSkeleton aspectRatio={1} />;
 * }
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
 * Props for EpisodeSkeleton component.
 *
 * @interface EpisodeSkeletonProps
 */
export interface EpisodeSkeletonProps {
  /**
   * Whether to show description placeholder lines.
   * When true, displays two lines of text below the metadata row.
   *
   * @type {boolean}
   * @default true
   */
  showDescription?: boolean;

  /**
   * Custom container style.
   *
   * @type {ViewStyle}
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   */
  testID?: string;
}

/**
 * EpisodeSkeleton - Skeleton placeholder that matches EpisodeCard layout
 *
 * Displays a horizontal card skeleton that matches the EpisodeCard component:
 * - Left: Square thumbnail (120px)
 * - Right: Title, metadata row, and optional description lines
 *
 * ## Layout Structure
 *
 * ```
 * ┌────────────┬─────────────────────────┐
 * │            │ Title placeholder       │
 * │  Thumbnail │ Rating | Runtime        │
 * │            │ Description line 1      │
 * │            │ Description line 2      │
 * └────────────┴─────────────────────────┘
 * ```
 *
 * @component
 * @param {EpisodeSkeletonProps} props - Component props
 *
 * @example
 * // Basic usage with description
 * import { EpisodeSkeleton } from '@/components/loading';
 *
 * function EpisodeLoading() {
 *   return <EpisodeSkeleton />;
 * }
 *
 * @example
 * // Compact version without description
 * function CompactEpisodeLoading() {
 *   return <EpisodeSkeleton showDescription={false} />;
 * }
 *
 * @example
 * // Multiple episodes loading
 * function EpisodeListLoading() {
 *   return (
 *     <View>
 *       <EpisodeSkeleton />
 *       <EpisodeSkeleton />
 *       <EpisodeSkeleton />
 *     </View>
 *   );
 * }
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
 * Props for CastSkeleton component.
 *
 * @interface CastSkeletonProps
 */
export interface CastSkeletonProps {
  /**
   * Whether to show character name placeholder below actor name.
   *
   * @type {boolean}
   * @default true
   */
  showCharacter?: boolean;

  /**
   * Custom container style.
   *
   * @type {ViewStyle}
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   */
  testID?: string;
}

/**
 * CastSkeleton - Skeleton placeholder that matches CastSection cast member layout
 *
 * Displays a circular avatar skeleton with name and optional character name below.
 * Dimensions are responsive and match the actual CastSection component.
 *
 * ## Layout Structure
 *
 * ```
 *     ┌──────┐
 *     │  ●   │  ← Circular avatar (80-100px)
 *     └──────┘
 *    Actor Name  ← Name placeholder
 *  Character Name ← Character placeholder (optional)
 * ```
 *
 * ## Responsive Dimensions
 *
 * | Device      | Avatar | Card Width |
 * |-------------|--------|------------|
 * | Phone       | 80px   | 90px       |
 * | Tablet      | 85px   | 100px      |
 * | Large Tablet| 90px   | 110px      |
 * | TV          | 100px  | 120px      |
 *
 * @component
 * @param {CastSkeletonProps} props - Component props
 *
 * @example
 * // Basic usage
 * import { CastSkeleton } from '@/components/loading';
 *
 * function CastMemberLoading() {
 *   return <CastSkeleton />;
 * }
 *
 * @example
 * // Without character name (actor only)
 * function ActorLoading() {
 *   return <CastSkeleton showCharacter={false} />;
 * }
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
 * Props for CatalogRowSkeleton component.
 *
 * @interface CatalogRowSkeletonProps
 */
export interface CatalogRowSkeletonProps {
  /**
   * Number of poster placeholders to show in the row.
   *
   * @type {number}
   * @default 5
   */
  posterCount?: number;

  /**
   * Whether to show section title placeholder.
   *
   * @type {boolean}
   * @default true
   */
  showTitle?: boolean;

  /**
   * Horizontal padding for the row.
   * Defaults to responsive value based on device type.
   *
   * @type {number}
   * @default Responsive (16-32px based on device)
   */
  horizontalPadding?: number;

  /**
   * Custom container style.
   *
   * @type {ViewStyle}
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   */
  testID?: string;
}

/**
 * CatalogRowSkeleton - Skeleton placeholder for catalog/row sections
 *
 * Displays a section title skeleton followed by a horizontal row of poster skeletons.
 * Matches the structure of HomeScreen catalog rows and CatalogSection.
 *
 * ## Layout Structure
 *
 * ```
 * ┌─────────────────────────────────────────────┐
 * │ Section Title                               │
 * │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │
 * │ │    │ │    │ │    │ │    │ │    │  →→→    │
 * │ │    │ │    │ │    │ │    │ │    │         │
 * │ └────┘ └────┘ └────┘ └────┘ └────┘         │
 * └─────────────────────────────────────────────┘
 * ```
 *
 * @component
 * @param {CatalogRowSkeletonProps} props - Component props
 *
 * @example
 * // Basic usage - HomeScreen loading
 * import { CatalogRowSkeleton } from '@/components/loading';
 *
 * function HomeLoading() {
 *   return (
 *     <View>
 *       <CatalogRowSkeleton />
 *       <CatalogRowSkeleton />
 *       <CatalogRowSkeleton />
 *     </View>
 *   );
 * }
 *
 * @example
 * // More posters for wider screens
 * function WideCatalogLoading() {
 *   return <CatalogRowSkeleton posterCount={8} />;
 * }
 *
 * @example
 * // Without title (continuation row)
 * function ContinuationRow() {
 *   return <CatalogRowSkeleton showTitle={false} />;
 * }
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
 * Props for EpisodeListSkeleton component.
 *
 * @interface EpisodeListSkeletonProps
 */
export interface EpisodeListSkeletonProps {
  /**
   * Number of episode cards to render.
   *
   * @type {number}
   * @default 3
   */
  count?: number;

  /**
   * Custom container style.
   *
   * @type {ViewStyle}
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   */
  testID?: string;
}

/**
 * EpisodeListSkeleton - Skeleton placeholder for a vertical list of episodes
 *
 * Renders multiple EpisodeSkeleton components in a vertical list.
 * Useful for episode list loading states in SeriesContent and ShowRatingsScreen.
 *
 * @component
 * @param {EpisodeListSkeletonProps} props - Component props
 *
 * @example
 * // Basic usage - 3 episodes
 * import { EpisodeListSkeleton } from '@/components/loading';
 *
 * function SeasonLoading() {
 *   return <EpisodeListSkeleton />;
 * }
 *
 * @example
 * // Show more episodes for full season
 * function FullSeasonLoading() {
 *   return <EpisodeListSkeleton count={10} />;
 * }
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
 * Props for CastRowSkeleton component.
 *
 * @interface CastRowSkeletonProps
 */
export interface CastRowSkeletonProps {
  /**
   * Number of cast member skeletons to show.
   *
   * @type {number}
   * @default 5
   */
  count?: number;

  /**
   * Horizontal padding for the row.
   * Defaults to responsive value based on device type.
   *
   * @type {number}
   * @default Responsive (16-32px based on device)
   */
  horizontalPadding?: number;

  /**
   * Whether to show "Cast" section title placeholder.
   *
   * @type {boolean}
   * @default true
   */
  showTitle?: boolean;

  /**
   * Custom container style.
   *
   * @type {ViewStyle}
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   */
  testID?: string;
}

/**
 * CastRowSkeleton - Skeleton placeholder for cast section with title
 *
 * Renders a section title followed by a horizontal row of cast member skeletons.
 * Matches the structure of CastSection component in metadata screens.
 *
 * ## Layout Structure
 *
 * ```
 * ┌─────────────────────────────────────────────┐
 * │ Cast                                        │
 * │  ●     ●     ●     ●     ●                 │
 * │ Name  Name  Name  Name  Name   →→→         │
 * │ Char  Char  Char  Char  Char               │
 * └─────────────────────────────────────────────┘
 * ```
 *
 * @component
 * @param {CastRowSkeletonProps} props - Component props
 *
 * @example
 * // Basic usage
 * import { CastRowSkeleton } from '@/components/loading';
 *
 * function CastLoading() {
 *   return <CastRowSkeleton />;
 * }
 *
 * @example
 * // More cast members for large screens
 * function LargeCastLoading() {
 *   return <CastRowSkeleton count={8} />;
 * }
 *
 * @example
 * // Without title (embedded in larger skeleton)
 * function EmbeddedCastLoading() {
 *   return <CastRowSkeleton showTitle={false} />;
 * }
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
 * Props for PosterGridSkeleton component.
 *
 * @interface PosterGridSkeletonProps
 */
export interface PosterGridSkeletonProps {
  /**
   * Number of columns in the grid.
   * Defaults to responsive calculation based on device type.
   *
   * @type {number}
   * @default Responsive (3-6 based on device)
   */
  columns?: number;

  /**
   * Number of rows to display.
   *
   * @type {number}
   * @default 3
   */
  rows?: number;

  /**
   * Gap between grid items in pixels.
   * Defaults to responsive value (12-16px).
   *
   * @type {number}
   * @default Responsive (12-16px based on device)
   */
  gap?: number;

  /**
   * Custom container style.
   *
   * @type {ViewStyle}
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   */
  testID?: string;
}

/**
 * PosterGridSkeleton - Skeleton placeholder for grid layouts like Library screen
 *
 * Renders a responsive grid of poster skeletons. Column count adjusts
 * automatically based on device type, or can be customized via props.
 *
 * ## Responsive Columns
 *
 * | Device      | Default Columns | Gap  |
 * |-------------|-----------------|------|
 * | Phone       | 3               | 12px |
 * | Tablet      | 4               | 12px |
 * | Large Tablet| 5               | 12px |
 * | TV          | 6               | 16px |
 *
 * @component
 * @param {PosterGridSkeletonProps} props - Component props
 *
 * @example
 * // Basic usage - LibraryScreen loading
 * import { PosterGridSkeleton } from '@/components/loading';
 *
 * function LibraryLoading() {
 *   return <PosterGridSkeleton />;
 * }
 *
 * @example
 * // Specific grid dimensions
 * function SearchResultsLoading() {
 *   return <PosterGridSkeleton columns={4} rows={4} />;
 * }
 *
 * @example
 * // Custom gap for specific layout
 * function TightGridLoading() {
 *   return <PosterGridSkeleton columns={5} gap={8} />;
 * }
 *
 * @example
 * // Match CatalogScreen layout
 * function CatalogLoading({ columns }: { columns: number }) {
 *   return <PosterGridSkeleton columns={columns} rows={5} />;
 * }
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
