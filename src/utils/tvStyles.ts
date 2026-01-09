/**
 * TV Optimization Utilities for 10-foot Experience
 *
 * This module provides consistent styling and sizing utilities optimized
 * for TV viewing at approximately 10 feet distance.
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device type detection
export type DeviceType = 'phone' | 'tablet' | 'largeTablet' | 'tv';

export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

/**
 * Detect the current device type based on screen width and platform
 */
export const getDeviceType = (screenWidth: number = SCREEN_WIDTH): DeviceType => {
  // Always treat TV devices as 'tv' regardless of reported dp width
  if (Platform.isTV) return 'tv';
  if (screenWidth >= BREAKPOINTS.tv) return 'tv';
  if (screenWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
  if (screenWidth >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
};

export const isTV = Platform.isTV;
export const isAndroidTV = Platform.isTV && Platform.OS === 'android';
export const isAppleTV = Platform.isTV && Platform.OS === 'ios';

// =============================================================================
// TV FOCUS STYLES - Consistent focus indicators for 10-foot experience
// =============================================================================

export const TV_FOCUS_CONFIG = {
  // Border-based focus indicator
  focusBorderWidth: 3,
  focusBorderColor: '#2d9cdb', // Can be overridden by theme

  // Scale animation on focus
  focusScale: 1.05,
  focusScaleSubtle: 1.02,

  // Animation timing
  focusAnimationDuration: 200,

  // Minimum touch target size for TV (in dp)
  minTouchTarget: 48,

  // Recommended touch target for primary actions
  recommendedTouchTarget: 56,

  // Large touch target for important actions
  largeTouchTarget: 64,
};

// =============================================================================
// TV TYPOGRAPHY - Larger font sizes for 10-foot viewing
// =============================================================================

export const TV_TYPOGRAPHY = {
  // Display sizes (for hero titles, major headings)
  displayLarge: isTV ? 48 : 36,
  displayMedium: isTV ? 40 : 32,
  displaySmall: isTV ? 36 : 28,

  // Heading sizes
  headlineLarge: isTV ? 32 : 24,
  headlineMedium: isTV ? 28 : 22,
  headlineSmall: isTV ? 24 : 20,

  // Title sizes
  titleLarge: isTV ? 22 : 18,
  titleMedium: isTV ? 20 : 16,
  titleSmall: isTV ? 18 : 14,

  // Body sizes
  bodyLarge: isTV ? 18 : 16,
  bodyMedium: isTV ? 16 : 14,
  bodySmall: isTV ? 14 : 12,

  // Label sizes
  labelLarge: isTV ? 16 : 14,
  labelMedium: isTV ? 14 : 12,
  labelSmall: isTV ? 12 : 10,
};

// =============================================================================
// TV SPACING - Increased spacing for comfortable TV viewing
// =============================================================================

export const TV_SPACING = {
  // Base spacing unit (8dp system)
  xs: isTV ? 8 : 4,
  sm: isTV ? 12 : 8,
  md: isTV ? 16 : 12,
  lg: isTV ? 24 : 16,
  xl: isTV ? 32 : 24,
  xxl: isTV ? 48 : 32,

  // Screen edge padding
  screenPadding: isTV ? 48 : 16,

  // Section margins
  sectionMargin: isTV ? 32 : 24,

  // Card gaps
  cardGap: isTV ? 16 : 12,

  // List item spacing
  listItemSpacing: isTV ? 12 : 8,
};

// =============================================================================
// TV TOUCH TARGETS - Minimum sizes for D-pad/remote navigation
// =============================================================================

export const TV_TOUCH_TARGETS = {
  // Minimum interactive area
  minimum: {
    width: isTV ? 48 : 44,
    height: isTV ? 48 : 44,
  },

  // Standard button size
  standard: {
    width: isTV ? 56 : 48,
    height: isTV ? 56 : 48,
  },

  // Large action buttons (Play, etc.)
  large: {
    width: isTV ? 160 : 130,
    height: isTV ? 56 : 46,
  },

  // Icon buttons
  iconButton: {
    width: isTV ? 56 : 44,
    height: isTV ? 56 : 44,
    iconSize: isTV ? 28 : 24,
  },

  // Navigation arrows
  arrow: {
    width: isTV ? 56 : 48,
    height: isTV ? 56 : 48,
    iconSize: isTV ? 36 : 32,
  },

  // Catalog poster card
  posterCard: {
    width: isTV ? 160 : 120,
    marginRight: isTV ? 16 : 12,
  },
};

// =============================================================================
// TV HERO SECTION - Optimized hero carousel sizing
// =============================================================================

export const TV_HERO = {
  // Hero height as percentage of screen
  heightPercentage: isTV ? 0.70 : 0.85,

  // Logo container size
  logoWidth: isTV ? SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.6,
  logoHeight: isTV ? 120 : 100,

  // Button container padding
  buttonContainerPadding: isTV ? 40 : 20,

  // Pagination dot sizes
  paginationDot: {
    inactive: isTV ? 10 : 8,
    active: isTV ? 40 : 32,
  },

  // Auto-rotation interval (ms)
  autoRotateInterval: isTV ? 30000 : 25000,
};

// =============================================================================
// TV CATALOG SECTION - Optimized content row sizing
// =============================================================================

export const TV_CATALOG = {
  // Section header
  headerHeight: isTV ? 48 : 40,
  headerFontSize: isTV ? 28 : 22,
  headerPadding: isTV ? 32 : 16,

  // "View All" button
  viewAllPadding: {
    vertical: isTV ? 12 : 8,
    horizontal: isTV ? 16 : 10,
  },
  viewAllFontSize: isTV ? 16 : 14,
  viewAllIconSize: isTV ? 24 : 20,

  // Content item sizing
  posterWidth: isTV ? 160 : 120,
  posterSpacing: isTV ? 16 : 12,
  postersPerRow: isTV ? 6 : 4,

  // Title below poster
  titleFontSize: isTV ? 16 : 13,
  titleMarginTop: isTV ? 8 : 4,
};

// =============================================================================
// TV ANIMATION CONFIG - Optimized for TV rendering
// =============================================================================

export const TV_ANIMATIONS = {
  // Focus animations should be snappy on TV
  focusSpring: {
    damping: isTV ? 18 : 15,
    stiffness: isTV ? 180 : 150,
    mass: 0.8,
  },

  // Carousel transitions
  carouselTiming: {
    duration: isTV ? 400 : 300,
  },

  // Page transitions
  pageTiming: {
    duration: isTV ? 350 : 250,
  },

  // Scroll deceleration
  scrollDeceleration: isTV ? 'normal' : 'fast' as const,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Scale a value for TV viewing
 * @param mobileValue The value to use on mobile/tablet
 * @param tvMultiplier The multiplier to apply for TV (default 1.3)
 */
export const scaleForTV = (mobileValue: number, tvMultiplier: number = 1.3): number => {
  return isTV ? Math.round(mobileValue * tvMultiplier) : mobileValue;
};

/**
 * Get responsive value based on device type
 */
export const getResponsiveValue = <T>(values: {
  phone?: T;
  tablet?: T;
  largeTablet?: T;
  tv?: T;
  default: T;
}): T => {
  const deviceType = getDeviceType();
  return values[deviceType] ?? values.default;
};

/**
 * Calculate optimal poster count for horizontal scrolling list
 */
export const getOptimalPosterCount = (screenWidth: number = SCREEN_WIDTH): number => {
  const deviceType = getDeviceType(screenWidth);

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
};

/**
 * Calculate poster width for optimal display
 */
export const calculatePosterWidth = (
  screenWidth: number = SCREEN_WIDTH,
  padding: number = TV_SPACING.screenPadding,
  spacing: number = TV_SPACING.cardGap,
  showPartialNext: boolean = true
): number => {
  const posterCount = getOptimalPosterCount(screenWidth);
  const partialWidth = showPartialNext ? 0.25 : 0;
  const availableWidth = screenWidth - (padding * 2);
  const totalSpacing = spacing * (posterCount - 1 + (showPartialNext ? 1 : 0));

  return Math.floor((availableWidth - totalSpacing) / (posterCount + partialWidth));
};

/**
 * Generate TV-optimized focus styles
 */
export const getTVFocusStyle = (
  isFocused: boolean,
  primaryColor: string = TV_FOCUS_CONFIG.focusBorderColor
) => {
  if (!isTV || !isFocused) {
    return {};
  }

  return {
    borderWidth: TV_FOCUS_CONFIG.focusBorderWidth,
    borderColor: primaryColor,
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  isTV,
  isAndroidTV,
  isAppleTV,
  getDeviceType,
  TV_FOCUS_CONFIG,
  TV_TYPOGRAPHY,
  TV_SPACING,
  TV_TOUCH_TARGETS,
  TV_HERO,
  TV_CATALOG,
  TV_ANIMATIONS,
  scaleForTV,
  getResponsiveValue,
  getOptimalPosterCount,
  calculatePosterWidth,
  getTVFocusStyle,
};
