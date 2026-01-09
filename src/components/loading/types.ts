import { ViewStyle, TextStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Available loading indicator variants
 * - spinner: Animated Lottie or native ActivityIndicator
 * - skeleton: Shimmer placeholder for content
 * - shimmer: Animated shimmer effect overlay
 * - branded: Custom branded loading (e.g., TraktLoadingSpinner)
 */
export type LoadingVariant = 'spinner' | 'skeleton' | 'shimmer' | 'branded';

/**
 * Standard loading indicator sizes
 * - small: 24px - For inline/button loading states
 * - medium: 40px - For section/card loading states
 * - large: 60px - For full-screen/prominent loading states
 */
export type LoadingSize = 'small' | 'medium' | 'large';

/**
 * Size dimensions in pixels for each loading size
 */
export const LOADING_SIZE_DIMENSIONS: Record<LoadingSize, number> = {
  small: 24,
  medium: 40,
  large: 60,
} as const;

/**
 * Lottie animation dimensions (larger to accommodate animation details)
 * These are used specifically for Lottie-based spinners
 */
export const LOTTIE_SIZE_DIMENSIONS: Record<LoadingSize, number> = {
  small: 60,
  medium: 100,
  large: 150,
} as const;

/**
 * Text font sizes corresponding to loading sizes
 */
export const LOADING_TEXT_SIZES: Record<LoadingSize, number> = {
  small: 12,
  medium: 14,
  large: 16,
} as const;

/**
 * Animation durations in milliseconds
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

/**
 * Base props interface shared across all loading components
 */
export interface BaseLoadingProps {
  /** Optional loading text to display below the indicator */
  text?: string;
  /** Size variant of the loading indicator */
  size?: LoadingSize;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier for testing frameworks */
  testID?: string;
}

/**
 * Props for spinner-based loading components
 */
export interface SpinnerLoadingProps extends BaseLoadingProps {
  /** Override default color (defaults to theme primary) */
  color?: string;
  /** Custom Lottie animation source */
  source?: any;
  /** Vertical offset from center */
  offsetY?: number;
}

/**
 * Props for skeleton/shimmer loading components
 */
export interface SkeletonLoadingProps {
  /** Width of the skeleton element (number in pixels or string percentage) */
  width: number | string;
  /** Height of the skeleton element in pixels */
  height: number;
  /** Border radius of the skeleton element */
  borderRadius?: number;
  /** Margin below the skeleton element */
  marginBottom?: number;
  /** Custom style for the skeleton container */
  style?: ViewStyle;
  /** Test identifier for testing frameworks */
  testID?: string;
  /** Shared animation progress value for synchronized animations */
  shimmerProgress?: SharedValue<number>;
}

/**
 * Props for skeleton group components
 */
export interface SkeletonGroupProps {
  /** Number of skeleton items to render */
  count: number;
  /** Preset configuration type */
  preset?: SkeletonPreset;
  /** Gap between skeleton items in pixels */
  gap?: number;
  /** Enable staggered fade-in animation */
  staggered?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier for testing frameworks */
  testID?: string;
  /** Custom render function for skeleton items */
  renderItem?: (index: number, shimmerProgress: SharedValue<number>) => React.ReactNode;
}

/**
 * Preset skeleton configurations for common content types
 */
export type SkeletonPreset = 'list' | 'grid' | 'textBlock' | 'poster' | 'episode' | 'cast' | 'catalogRow';

/**
 * Props for full-screen loading overlay
 */
export interface LoadingOverlayProps extends BaseLoadingProps {
  /** Whether to show the overlay */
  visible: boolean;
  /** Enable backdrop blur effect */
  blur?: boolean;
  /** Custom backdrop opacity (0-1) */
  backdropOpacity?: number;
  /** Callback when backdrop is pressed (if dismissable) */
  onBackdropPress?: () => void;
}

/**
 * Color tokens for loading states
 * These should be derived from the current theme
 */
export interface LoadingColorTokens {
  /** Primary spinner/indicator color */
  primary: string;
  /** Secondary/muted color for loading text */
  textMuted: string;
  /** Base color for skeleton backgrounds */
  skeletonBase: string;
  /** Highlight color for shimmer effect */
  skeletonHighlight: string;
  /** Overlay/backdrop color */
  overlay: string;
}

/**
 * Helper function to get loading color tokens from theme colors
 * @param themeColors - Colors object from the current theme
 * @returns LoadingColorTokens with theme-appropriate values
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

/**
 * Default loading configuration
 */
export const DEFAULT_LOADING_CONFIG = {
  size: 'medium' as LoadingSize,
  skeletonBorderRadius: 8,
  skeletonMarginBottom: 8,
  overlayBackdropOpacity: 0.7,
} as const;

/**
 * Responsive breakpoints for loading components
 * Matches the breakpoints used in MetadataLoadingScreen
 */
export const LOADING_BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
} as const;

/**
 * Device type based on screen width
 */
export type DeviceType = 'phone' | 'tablet' | 'largeTablet' | 'tv';

/**
 * Helper to determine device type from screen width
 * @param width - Screen width in pixels
 * @returns DeviceType based on breakpoints
 */
export function getDeviceType(width: number): DeviceType {
  if (width >= LOADING_BREAKPOINTS.tv) return 'tv';
  if (width >= LOADING_BREAKPOINTS.largeTablet) return 'largeTablet';
  if (width >= LOADING_BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
}

/**
 * Get responsive padding based on device type
 * @param deviceType - Current device type
 * @returns Horizontal padding value in pixels
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
