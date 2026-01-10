/**
 * Unified Loading Components
 *
 * A comprehensive set of loading state components for consistent UI feedback.
 * All components are theme-aware and follow responsive design patterns.
 *
 * @example
 * // Import individual components
 * import { UnifiedSpinner, ShimmerSkeleton, LoadingOverlayScreen } from '@/components/loading';
 *
 * @example
 * // Import types
 * import type { LoadingSize, SpinnerLoadingProps } from '@/components/loading';
 *
 * @example
 * // Import hooks
 * import { useShimmerProgress } from '@/components/loading';
 *
 * @example
 * // Import content-specific skeletons
 * import { PosterSkeleton, EpisodeSkeleton, CatalogRowSkeleton } from '@/components/loading';
 */

// ============================================================================
// Types and Interfaces
// ============================================================================
export type {
  LoadingVariant,
  LoadingSize,
  BaseLoadingProps,
  SpinnerLoadingProps,
  SkeletonLoadingProps,
  SkeletonGroupProps,
  SkeletonPreset,
  LoadingOverlayProps,
  LoadingColorTokens,
  DeviceType,
} from './types';

// ============================================================================
// Constants
// ============================================================================
export {
  LOADING_SIZE_DIMENSIONS,
  LOTTIE_SIZE_DIMENSIONS,
  LOADING_TEXT_SIZES,
  LOADING_ANIMATION_DURATIONS,
  DEFAULT_LOADING_CONFIG,
  LOADING_BREAKPOINTS,
} from './types';

// ============================================================================
// Utility Functions
// ============================================================================
export { getLoadingColorTokens, getDeviceType, getResponsivePadding } from './types';

// ============================================================================
// Core Components
// ============================================================================

// Spinner component - Lottie-based with ActivityIndicator fallback
export { default as UnifiedSpinner } from './UnifiedSpinner';

// Shimmer skeleton - Base building block for skeleton placeholders
export { default as ShimmerSkeleton } from './ShimmerSkeleton';
export type { ShimmerSkeletonProps } from './ShimmerSkeleton';

// Hook for synchronized shimmer animations
export { useShimmerProgress } from './ShimmerSkeleton';

// Skeleton group - Multiple skeletons with synchronized animation
export { default as SkeletonGroup } from './SkeletonGroup';
export {
  CastSkeletonGroup,
  EpisodeSkeletonGroup,
  CatalogRowSkeletonGroup,
} from './SkeletonGroup';

// Full-screen loading overlay with modal
export { default as LoadingOverlayScreen } from './LoadingOverlayScreen';

// ============================================================================
// Content-Specific Skeleton Components
// ============================================================================
export {
  PosterSkeleton,
  EpisodeSkeleton,
  CastSkeleton,
  CatalogRowSkeleton,
  EpisodeListSkeleton,
  CastRowSkeleton,
  PosterGridSkeleton,
} from './ContentSkeleton';

// Content skeleton prop types
export type {
  PosterSkeletonProps,
  EpisodeSkeletonProps,
  CastSkeletonProps,
  CatalogRowSkeletonProps,
  EpisodeListSkeletonProps,
  CastRowSkeletonProps,
  PosterGridSkeletonProps,
} from './ContentSkeleton';

// ============================================================================
// Branded Loading Components
// ============================================================================

/**
 * Branded loading spinners maintain service-specific visual identity
 * while integrating with the unified loading system's timing and props.
 */

// Trakt branded spinner - used for Trakt-specific operations
export { TraktLoadingSpinner, BRANDED_PULSE_DURATION } from '../common/TraktLoadingSpinner';
export type { TraktLoadingSpinnerProps } from '../common/TraktLoadingSpinner';
