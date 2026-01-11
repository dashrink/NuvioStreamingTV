/**
 * @fileoverview Unified Loading Components Module
 *
 * A comprehensive set of loading state components for consistent UI feedback
 * across the application. All components are theme-aware, responsive, and
 * follow accessibility best practices.
 *
 * ## Component Categories
 *
 * ### Core Components
 * - **UnifiedSpinner** - Theme-aware animated spinner (Lottie + fallback)
 * - **ShimmerSkeleton** - Animated shimmer placeholder
 * - **SkeletonGroup** - Multiple synchronized skeletons
 * - **LoadingOverlayScreen** - Full-screen modal loading overlay
 *
 * ### Content-Specific Skeletons
 * - **PosterSkeleton** - Movie/show poster placeholder
 * - **EpisodeSkeleton** - Episode card placeholder
 * - **CastSkeleton** - Cast member placeholder
 * - **CatalogRowSkeleton** - Horizontal catalog row
 * - **EpisodeListSkeleton** - Vertical episode list
 * - **CastRowSkeleton** - Horizontal cast section
 * - **PosterGridSkeleton** - Library-style grid
 *
 * ### Branded Loading
 * - **TraktLoadingSpinner** - Trakt-branded loading indicator
 *
 * ### Global State Management
 * - **LoadingProvider** - Context provider for app-wide loading
 * - **useLoading** - Hook for HomeScreen loading state
 * - **useGlobalLoading** - Hook for global loading overlay
 *
 * ## Quick Start
 *
 * @example
 * // Basic spinner
 * import { UnifiedSpinner } from '@/components/loading';
 * <UnifiedSpinner size="large" text="Loading..." />
 *
 * @example
 * // Skeleton placeholder
 * import { ShimmerSkeleton, useShimmerProgress } from '@/components/loading';
 * const progress = useShimmerProgress();
 * <ShimmerSkeleton width={200} height={40} shimmerProgress={progress} />
 *
 * @example
 * // Content-specific skeleton
 * import { CatalogRowSkeleton } from '@/components/loading';
 * <CatalogRowSkeleton posterCount={5} />
 *
 * @example
 * // Global loading overlay
 * import { useGlobalLoading } from '@/components/loading';
 * const { showLoading, hideLoading } = useGlobalLoading();
 * showLoading({ text: 'Saving...' });
 *
 * ## Migration from ActivityIndicator
 *
 * Replace direct ActivityIndicator usage with UnifiedSpinner:
 *
 * @example
 * // Before (deprecated)
 * import { ActivityIndicator } from 'react-native';
 * <ActivityIndicator size="large" color="#FF0000" />
 *
 * // After (recommended)
 * import { UnifiedSpinner } from '@/components/loading';
 * <UnifiedSpinner size="large" color="#FF0000" />
 *
 * @module loading
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

// ============================================================================
// Global Loading State Management
// ============================================================================

/**
 * Context and hooks for global loading state management.
 * Use these for app-wide loading overlays and multi-step operations.
 *
 * @example
 * // In any component within LoadingProvider
 * import { useGlobalLoading } from '@/components/loading';
 *
 * const { showLoading, hideLoading } = useGlobalLoading();
 * showLoading({ text: 'Syncing...' });
 * await syncData();
 * hideLoading();
 */
export {
  LoadingProvider,
  useLoading,
  useGlobalLoading,
} from '../../contexts/LoadingContext';

export type { GlobalLoadingOptions } from '../../contexts/LoadingContext';
