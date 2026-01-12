/**
 * @fileoverview Loading Component Type Definitions
 *
 * This module provides TypeScript types, interfaces, and constants for the unified
 * loading component system. All loading components in the app should use these
 * shared definitions to ensure consistency.
 *
 * @module loading/types
 *
 * @example
 * // Import types for component props
 * import type { LoadingSize, SpinnerLoadingProps } from '@/components/loading';
 *
 * @example
 * // Import constants for custom implementations
 * import { LOADING_SIZE_DIMENSIONS, LOADING_ANIMATION_DURATIONS } from '@/components/loading';
 *
 * @example
 * // Use helper functions for theme integration
 * import { getLoadingColorTokens, getDeviceType } from '@/components/loading';
 * const colors = getLoadingColorTokens(currentTheme.colors);
 */

import { ViewStyle, TextStyle } from 'react-native';

import type { SharedValue } from 'react-native-reanimated';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Available loading indicator variants for different use cases.
 *
 * @typedef {'spinner' | 'skeleton' | 'shimmer' | 'branded'} LoadingVariant
 *
 * | Variant   | Use Case                                    | Component                |
 * |-----------|---------------------------------------------|--------------------------|
 * | spinner   | Generic loading, button states              | UnifiedSpinner           |
 * | skeleton  | Content placeholder while data loads        | ShimmerSkeleton          |
 * | shimmer   | Animated shimmer effect overlay             | ShimmerSkeleton          |
 * | branded   | Service-specific loading (Trakt, etc.)      | TraktLoadingSpinner      |
 *
 * @example
 * // Use spinner for button loading states
 * const variant: LoadingVariant = 'spinner';
 *
 * @example
 * // Use skeleton for content placeholders
 * const variant: LoadingVariant = 'skeleton';
 */
export type LoadingVariant = 'spinner' | 'skeleton' | 'shimmer' | 'branded';

/**
 * Standard loading indicator size presets.
 *
 * @typedef {'small' | 'medium' | 'large'} LoadingSize
 *
 * | Size   | Dimension | Use Case                          |
 * |--------|-----------|-----------------------------------|
 * | small  | 24px      | Inline loading, button states     |
 * | medium | 40px      | Card/section loading (default)    |
 * | large  | 60px      | Full-screen, prominent loading    |
 *
 * @example
 * // Small spinner for button
 * <UnifiedSpinner size="small" color="#FFFFFF" />
 *
 * @example
 * // Large spinner for full-screen loading
 * <UnifiedSpinner size="large" text="Loading..." />
 */
export type LoadingSize = 'small' | 'medium' | 'large';

// ============================================================================
// Size Constants
// ============================================================================

/**
 * Native ActivityIndicator dimensions in pixels for each loading size.
 * Used when Lottie animation is not available or fails.
 *
 * @constant
 * @type {Record<LoadingSize, number>}
 *
 * @example
 * const spinnerSize = LOADING_SIZE_DIMENSIONS['medium']; // 40
 */
export const LOADING_SIZE_DIMENSIONS: Record<LoadingSize, number> = {
  small: 24,
  medium: 40,
  large: 60,
} as const;

/**
 * Lottie animation dimensions in pixels for each loading size.
 * Larger than native dimensions to accommodate animation details and padding.
 *
 * @constant
 * @type {Record<LoadingSize, number>}
 *
 * @example
 * const lottieSize = LOTTIE_SIZE_DIMENSIONS['large']; // 150
 */
export const LOTTIE_SIZE_DIMENSIONS: Record<LoadingSize, number> = {
  small: 60,
  medium: 100,
  large: 150,
} as const;

/**
 * Loading text font sizes corresponding to each loading size.
 * Ensures text is proportionally sized with the spinner.
 *
 * @constant
 * @type {Record<LoadingSize, number>}
 *
 * @example
 * const fontSize = LOADING_TEXT_SIZES['large']; // 16
 */
export const LOADING_TEXT_SIZES: Record<LoadingSize, number> = {
  small: 12,
  medium: 14,
  large: 16,
} as const;

// ============================================================================
// Animation Constants
// ============================================================================

/**
 * Animation durations in milliseconds for all loading components.
 * These values are tuned for optimal perceived performance.
 *
 * @constant
 * @type {Object}
 * @property {number} shimmer - Duration for one complete shimmer animation cycle (1500ms)
 * @property {number} fadeIn - Duration for fade-in transitions (300ms)
 * @property {number} fadeOut - Duration for fade-out transitions (200ms)
 * @property {number} staggerDelay - Delay between staggered element animations (100ms)
 *
 * @example
 * // Use in custom Reanimated animations
 * import { LOADING_ANIMATION_DURATIONS } from '@/components/loading';
 *
 * const fadeIn = withTiming(1, {
 *   duration: LOADING_ANIMATION_DURATIONS.fadeIn
 * });
 */
export const LOADING_ANIMATION_DURATIONS = {
  /** Duration for shimmer animation cycle */
  shimmer: 1500,
  /** Duration for fade-in animations */
  fadeIn: 300,
  /** Duration for fade-out animations */
  fadeOut: 200,
  /** Stagger delay between animated elements */
  staggerDelay: 100,
} as const;

// ============================================================================
// Component Props Interfaces
// ============================================================================

/**
 * Base props interface shared across all loading components.
 * Extended by SpinnerLoadingProps and LoadingOverlayProps.
 *
 * @interface BaseLoadingProps
 *
 * @example
 * // Component using base props
 * const MyLoader: React.FC<BaseLoadingProps> = ({ text, size, style, testID }) => {
 *   return (
 *     <View style={style} testID={testID}>
 *       <Spinner size={size} />
 *       {text && <Text>{text}</Text>}
 *     </View>
 *   );
 * };
 */
export interface BaseLoadingProps {
  /**
   * Optional loading text to display below the indicator.
   * Rendered with muted theme color and appropriate font size.
   *
   * @type {string}
   * @default undefined
   *
   * @example
   * <UnifiedSpinner text="Loading content..." />
   */
  text?: string;

  /**
   * Size variant of the loading indicator.
   *
   * @type {LoadingSize}
   * @default 'medium'
   *
   * @example
   * <UnifiedSpinner size="large" /> // 60px spinner
   * <UnifiedSpinner size="small" /> // 24px spinner
   */
  size?: LoadingSize;

  /**
   * Custom container style for additional positioning or styling.
   *
   * @type {ViewStyle}
   * @default undefined
   *
   * @example
   * <UnifiedSpinner style={{ marginTop: 20 }} />
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks (Jest, Detox, etc.).
   *
   * @type {string}
   * @default undefined
   *
   * @example
   * <UnifiedSpinner testID="home-loading-spinner" />
   */
  testID?: string;
}

/**
 * Props for spinner-based loading components (UnifiedSpinner).
 * Extends BaseLoadingProps with spinner-specific options.
 *
 * @interface SpinnerLoadingProps
 * @extends {BaseLoadingProps}
 *
 * @see UnifiedSpinner
 *
 * @example
 * // Full props example
 * <UnifiedSpinner
 *   size="large"
 *   text="Loading..."
 *   color="#FF0000"
 *   source={require('./custom-animation.json')}
 *   offsetY={-50}
 *   style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
 *   testID="custom-spinner"
 * />
 */
export interface SpinnerLoadingProps extends BaseLoadingProps {
  /**
   * Override default spinner color.
   * Defaults to `currentTheme.colors.primary` from ThemeContext.
   *
   * @type {string}
   * @default currentTheme.colors.primary
   *
   * @example
   * // White spinner for dark buttons
   * <UnifiedSpinner color="#FFFFFF" size="small" />
   *
   * @example
   * // Custom brand color
   * <UnifiedSpinner color="rgb(237, 28, 36)" />
   */
  color?: string;

  /**
   * Custom Lottie animation source file.
   * Accepts require() path to a Lottie JSON file.
   *
   * @type {any}
   * @default require('../../../assets/lottie/loading.json')
   *
   * @example
   * <UnifiedSpinner source={require('./custom-spinner.json')} />
   */
  source?: any;

  /**
   * Vertical offset from center position in pixels.
   * Useful for visual alignment adjustments.
   *
   * @type {number}
   * @default 0
   *
   * @example
   * // Move spinner up by 50 pixels
   * <UnifiedSpinner offsetY={-50} />
   */
  offsetY?: number;
}

/**
 * Props for skeleton/shimmer loading components (ShimmerSkeleton).
 * Used as building blocks for content placeholders.
 *
 * @interface SkeletonLoadingProps
 *
 * @see ShimmerSkeleton
 * @see useShimmerProgress
 *
 * @example
 * // Basic skeleton rectangle
 * <ShimmerSkeleton width={200} height={40} borderRadius={8} />
 *
 * @example
 * // Percentage width skeleton
 * <ShimmerSkeleton width="100%" height={20} />
 *
 * @example
 * // Synchronized skeletons
 * const progress = useShimmerProgress();
 * <ShimmerSkeleton width={100} height={100} shimmerProgress={progress} />
 * <ShimmerSkeleton width={200} height={20} shimmerProgress={progress} />
 */
export interface SkeletonLoadingProps {
  /**
   * Width of the skeleton element.
   * Accepts number (pixels) or string (percentage like "80%").
   *
   * @type {number | string}
   * @required
   *
   * @example
   * width={200}      // 200 pixels
   * width="100%"     // Full width of parent
   * width="80%"      // 80% of parent width
   */
  width: number | string;

  /**
   * Height of the skeleton element in pixels.
   *
   * @type {number}
   * @required
   *
   * @example
   * height={40}      // 40 pixels tall
   */
  height: number;

  /**
   * Border radius of the skeleton element.
   *
   * @type {number}
   * @default 8 (from DEFAULT_LOADING_CONFIG.skeletonBorderRadius)
   *
   * @example
   * borderRadius={50}  // Circular skeleton
   * borderRadius={4}   // Slightly rounded
   */
  borderRadius?: number;

  /**
   * Margin below the skeleton element in pixels.
   *
   * @type {number}
   * @default 8 (from DEFAULT_LOADING_CONFIG.skeletonMarginBottom)
   *
   * @example
   * marginBottom={16}  // 16px spacing below
   * marginBottom={0}   // No bottom margin
   */
  marginBottom?: number;

  /**
   * Custom style for the skeleton container.
   *
   * @type {ViewStyle}
   * @default undefined
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   * @default undefined
   */
  testID?: string;

  /**
   * Shared animation progress value for synchronized animations.
   * Use useShimmerProgress() hook to create, then pass to multiple skeletons.
   *
   * @type {SharedValue<number>}
   * @default undefined (creates internal animation)
   *
   * @see useShimmerProgress
   *
   * @example
   * // Synchronized shimmer across multiple skeletons
   * const shimmerProgress = useShimmerProgress();
   * <ShimmerSkeleton width={100} height={100} shimmerProgress={shimmerProgress} />
   * <ShimmerSkeleton width={80} height={20} shimmerProgress={shimmerProgress} />
   */
  shimmerProgress?: SharedValue<number>;
}

/**
 * Props for skeleton group components (SkeletonGroup).
 * Renders multiple skeleton elements with synchronized animations.
 *
 * @interface SkeletonGroupProps
 *
 * @see SkeletonGroup
 * @see SkeletonPreset
 *
 * @example
 * // List of 5 items
 * <SkeletonGroup count={5} preset="list" />
 *
 * @example
 * // Grid with staggered animation
 * <SkeletonGroup count={12} preset="grid" staggered gap={16} />
 *
 * @example
 * // Custom skeleton layout
 * <SkeletonGroup
 *   count={3}
 *   renderItem={(index, progress) => (
 *     <CustomSkeleton key={index} shimmerProgress={progress} />
 *   )}
 * />
 */
export interface SkeletonGroupProps {
  /**
   * Number of skeleton items to render.
   *
   * @type {number}
   * @required
   */
  count: number;

  /**
   * Preset configuration type for common layout patterns.
   *
   * @type {SkeletonPreset}
   * @default 'list'
   */
  preset?: SkeletonPreset;

  /**
   * Gap between skeleton items in pixels.
   *
   * @type {number}
   * @default Varies by preset (12-16px)
   */
  gap?: number;

  /**
   * Enable staggered fade-in animation for progressive reveal effect.
   *
   * @type {boolean}
   * @default false
   *
   * @example
   * <SkeletonGroup count={5} preset="list" staggered />
   */
  staggered?: boolean;

  /**
   * Custom container style.
   *
   * @type {ViewStyle}
   * @default undefined
   */
  style?: ViewStyle;

  /**
   * Test identifier for testing frameworks.
   *
   * @type {string}
   * @default undefined
   */
  testID?: string;

  /**
   * Custom render function for skeleton items.
   * When provided, preset is ignored and this function renders each item.
   *
   * @type {(index: number, shimmerProgress: SharedValue<number>) => React.ReactNode}
   * @default undefined
   *
   * @example
   * <SkeletonGroup
   *   count={3}
   *   renderItem={(index, progress) => (
   *     <View key={index}>
   *       <ShimmerSkeleton width={100} height={100} shimmerProgress={progress} />
   *       <ShimmerSkeleton width={80} height={16} shimmerProgress={progress} />
   *     </View>
   *   )}
   * />
   */
  renderItem?: (index: number, shimmerProgress: SharedValue<number>) => React.ReactNode;
}

/**
 * Preset skeleton configurations for common content types.
 * Each preset defines responsive dimensions, border radius, and layout direction.
 *
 * @typedef {'list' | 'grid' | 'textBlock' | 'poster' | 'episode' | 'cast' | 'catalogRow'} SkeletonPreset
 *
 * | Preset      | Use Case                          | Layout    |
 * |-------------|-----------------------------------|-----------|
 * | list        | Settings items, menu items        | Vertical  |
 * | grid        | Library grid, search results      | Grid wrap |
 * | textBlock   | Description paragraphs            | Vertical  |
 * | poster      | Horizontal poster carousel        | Horizontal|
 * | episode     | Episode card list                 | Vertical  |
 * | cast        | Cast member row                   | Horizontal|
 * | catalogRow  | Home screen catalog row           | Horizontal|
 *
 * @example
 * <SkeletonGroup count={5} preset="poster" />
 */
export type SkeletonPreset =
  | 'list'
  | 'grid'
  | 'textBlock'
  | 'poster'
  | 'episode'
  | 'cast'
  | 'catalogRow';

/**
 * Props for full-screen loading overlay component (LoadingOverlayScreen).
 * Extends BaseLoadingProps with overlay-specific options.
 *
 * @interface LoadingOverlayProps
 * @extends {BaseLoadingProps}
 *
 * @see LoadingOverlayScreen
 * @see useGlobalLoading
 *
 * @example
 * // Basic overlay
 * <LoadingOverlayScreen visible={isLoading} />
 *
 * @example
 * // With blur and message
 * <LoadingOverlayScreen
 *   visible={isLoading}
 *   blur
 *   backdropOpacity={0.8}
 *   text="Syncing data..."
 * />
 *
 * @example
 * // Dismissable overlay
 * <LoadingOverlayScreen
 *   visible={isLoading}
 *   onBackdropPress={() => cancelOperation()}
 *   text="Tap to cancel"
 * />
 */
export interface LoadingOverlayProps extends BaseLoadingProps {
  /**
   * Whether to show the overlay.
   * Animates in/out based on this value.
   *
   * @type {boolean}
   * @required
   */
  visible: boolean;

  /**
   * Enable backdrop blur effect (iOS only, falls back to solid on Android).
   *
   * @type {boolean}
   * @default false
   */
  blur?: boolean;

  /**
   * Custom backdrop opacity (0-1).
   * Higher values create darker backdrop.
   *
   * @type {number}
   * @default 0.7 (from DEFAULT_LOADING_CONFIG.overlayBackdropOpacity)
   */
  backdropOpacity?: number;

  /**
   * Callback when backdrop is pressed.
   * When provided, makes the overlay dismissable by tapping outside.
   *
   * @type {() => void}
   * @default undefined
   */
  onBackdropPress?: () => void;
}

// ============================================================================
// Theme Integration
// ============================================================================

/**
 * Color tokens for loading states derived from the current theme.
 * Use getLoadingColorTokens() to create from theme colors.
 *
 * @interface LoadingColorTokens
 *
 * @see getLoadingColorTokens
 *
 * @example
 * const { currentTheme } = useTheme();
 * const colors: LoadingColorTokens = getLoadingColorTokens(currentTheme.colors);
 */
export interface LoadingColorTokens {
  /**
   * Primary spinner/indicator color.
   * Used for UnifiedSpinner default color.
   */
  primary: string;

  /**
   * Secondary/muted color for loading text.
   * Used for loading message text styling.
   */
  textMuted: string;

  /**
   * Base color for skeleton backgrounds.
   * The resting state color of skeleton elements.
   */
  skeletonBase: string;

  /**
   * Highlight color for shimmer effect.
   * The moving shimmer gradient color.
   */
  skeletonHighlight: string;

  /**
   * Overlay/backdrop color for full-screen loading.
   * Used by LoadingOverlayScreen.
   */
  overlay: string;
}

/**
 * Extracts loading color tokens from the current theme colors.
 * Provides sensible defaults for optional theme properties.
 *
 * @function getLoadingColorTokens
 * @param {Object} themeColors - Colors object from currentTheme.colors
 * @param {string} themeColors.primary - Primary brand color
 * @param {string} themeColors.textMuted - Muted text color
 * @param {string} [themeColors.elevation1] - Elevated surface color (optional)
 * @param {string} [themeColors.transparentDark] - Semi-transparent dark color (optional)
 * @returns {LoadingColorTokens} Theme-appropriate color tokens
 *
 * @example
 * import { useTheme } from '@/contexts/ThemeContext';
 * import { getLoadingColorTokens } from '@/components/loading';
 *
 * const MyComponent = () => {
 *   const { currentTheme } = useTheme();
 *   const colorTokens = getLoadingColorTokens(currentTheme.colors);
 *
 *   return (
 *     <View style={{ backgroundColor: colorTokens.skeletonBase }}>
 *       <Text style={{ color: colorTokens.textMuted }}>Loading...</Text>
 *     </View>
 *   );
 * };
 */
export function getLoadingColorTokens(themeColors: {
  primary: string;
  textMuted: string;
  elevation1?: string;
  transparentDark?: string;
}): LoadingColorTokens {
  return {
    primary: themeColors.primary,
    textMuted: themeColors.textMuted,
    skeletonBase: themeColors.elevation1 || 'rgba(255, 255, 255, 0.08)',
    skeletonHighlight: 'rgba(255, 255, 255, 0.12)',
    overlay: themeColors.transparentDark || 'rgba(0, 0, 0, 0.7)',
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration values for loading components.
 * These can be overridden via component props.
 *
 * @constant
 * @type {Object}
 * @property {LoadingSize} size - Default size ('medium')
 * @property {number} skeletonBorderRadius - Default skeleton border radius (8px)
 * @property {number} skeletonMarginBottom - Default skeleton bottom margin (8px)
 * @property {number} overlayBackdropOpacity - Default overlay opacity (0.7)
 *
 * @example
 * // Use defaults in custom component
 * const radius = props.borderRadius ?? DEFAULT_LOADING_CONFIG.skeletonBorderRadius;
 */
export const DEFAULT_LOADING_CONFIG = {
  /** Default loading size */
  size: 'medium' as LoadingSize,
  /** Default skeleton border radius in pixels */
  skeletonBorderRadius: 8,
  /** Default skeleton bottom margin in pixels */
  skeletonMarginBottom: 8,
  /** Default overlay backdrop opacity (0-1) */
  overlayBackdropOpacity: 0.7,
} as const;

// ============================================================================
// Responsive Utilities
// ============================================================================

/**
 * Responsive breakpoints for loading components in pixels.
 * Used to determine device type and adjust skeleton dimensions.
 *
 * @constant
 * @type {Object}
 * @property {number} phone - Phone breakpoint (0px)
 * @property {number} tablet - Tablet breakpoint (768px)
 * @property {number} largeTablet - Large tablet breakpoint (1024px)
 * @property {number} tv - TV breakpoint (1440px)
 *
 * @example
 * import { Dimensions } from 'react-native';
 * const { width } = Dimensions.get('window');
 * const isTablet = width >= LOADING_BREAKPOINTS.tablet;
 */
export const LOADING_BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
} as const;

/**
 * Device type classification based on screen width.
 *
 * @typedef {'phone' | 'tablet' | 'largeTablet' | 'tv'} DeviceType
 *
 * | Type        | Width Range        | Example Devices              |
 * |-------------|--------------------|-----------------------------|
 * | phone       | < 768px            | iPhone, Android phone        |
 * | tablet      | 768px - 1023px     | iPad, Android tablet         |
 * | largeTablet | 1024px - 1439px    | iPad Pro, large Android      |
 * | tv          | >= 1440px          | Android TV, Apple TV         |
 */
export type DeviceType = 'phone' | 'tablet' | 'largeTablet' | 'tv';

/**
 * Determines device type from screen width using breakpoints.
 * Used for responsive skeleton sizing.
 *
 * @function getDeviceType
 * @param {number} width - Screen width in pixels
 * @returns {DeviceType} Device classification
 *
 * @example
 * import { Dimensions } from 'react-native';
 * import { getDeviceType } from '@/components/loading';
 *
 * const { width } = Dimensions.get('window');
 * const deviceType = getDeviceType(width); // 'phone' | 'tablet' | etc.
 *
 * // Adjust skeleton size based on device
 * const skeletonWidth = deviceType === 'tv' ? 140 : 100;
 */
export function getDeviceType(width: number): DeviceType {
  if (width >= LOADING_BREAKPOINTS.tv) return 'tv';
  if (width >= LOADING_BREAKPOINTS.largeTablet) return 'largeTablet';
  if (width >= LOADING_BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
}

/**
 * Returns appropriate horizontal padding based on device type.
 * Larger screens get more padding for better visual balance.
 *
 * @function getResponsivePadding
 * @param {DeviceType} deviceType - Current device type
 * @returns {number} Horizontal padding in pixels
 *
 * @example
 * const deviceType = getDeviceType(screenWidth);
 * const padding = getResponsivePadding(deviceType);
 *
 * return (
 *   <View style={{ paddingHorizontal: padding }}>
 *     <SkeletonGroup count={5} preset="poster" />
 *   </View>
 * );
 */
export function getResponsivePadding(deviceType: DeviceType): number {
  switch (deviceType) {
    case 'tv':
      return 48;
    case 'largeTablet':
      return 32;
    case 'tablet':
      return 24;
    default:
      return 16;
  }
}
