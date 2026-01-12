/**
 * TV Styling Module
 *
 * Comprehensive styling system for TV viewing optimization.
 * Provides consistent sizing, spacing, typography, and animation configs
 * for 10-foot TV viewing experience.
 *
 * Usage:
 * ```typescript
 * import {
 *   TV_SPACING,
 *   TV_TYPOGRAPHY,
 *   TV_TOUCH_TARGETS,
 *   isTV,
 *   getDeviceType,
 *   calculatePosterWidth,
 *   selectPlatformValue,
 * } from '@utils/tvStyles';
 * ```
 */

// Device detection and classification
export {
  getDeviceType,
  isTV,
  isAndroidTV,
  isAppleTV,
  isAndroid,
  isIOS,
  isWeb,
  isTVDevice,
  isMobileDevice,
  isTabletDevice,
  getSafeAreaInsets,
  BREAKPOINTS,
  DEVICE_DIMENSIONS,
  type DeviceType,
  type Breakpoints,
  type DeviceDimensions,
} from './deviceDetection';

// Typography
export { TV_TYPOGRAPHY, TV_FONT_WEIGHTS, type TVTypography, type TVFontWeight } from './typography';

// Spacing
export { TV_SPACING, TV_SPACING_PRESETS, type TVSpacing, type TVSpacingPresets } from './spacing';

// Focus and animations
export { TV_FOCUS_CONFIG, getTVFocusStyle, type TVFocusConfig } from './focus';

// Touch targets
export {
  TV_TOUCH_TARGETS,
  MINIMUM_TOUCH_TARGET,
  meetsTVTouchTargetGuidelines,
  type TVTouchTargets,
} from './touchTargets';

// Layout components
export {
  TV_HERO,
  TV_CATALOG,
  TV_GRID,
  type TVHeroLayout,
  type TVCatalogLayout,
  type TVGridLayout,
} from './layout';

// Animations
export {
  TV_ANIMATIONS,
  TV_ANIMATION_DURATIONS,
  TV_SPRING_CONFIGS,
  type TVAnimationConfig,
  type TVAnimationDuration,
  type TVSpringConfig,
} from './animations';

// Helper functions
export {
  scaleForTV,
  getResponsiveValue,
  getOptimalPosterCount,
  calculatePosterWidth,
  calculateGridColumns,
  getResponsiveSpacing,
  getResponsiveFontSize,
  mapDeviceType,
  clamp,
  interpolate,
} from './helpers';

// Convenience exports for commonly used combinations
export const TV_STYLES = {
  typography: TV_TYPOGRAPHY,
  spacing: TV_SPACING,
  focusConfig: TV_FOCUS_CONFIG,
  touchTargets: TV_TOUCH_TARGETS,
  animations: TV_ANIMATIONS,
  hero: TV_HERO,
  catalog: TV_CATALOG,
  grid: TV_GRID,
} as const;

export default {
  // Device info
  isTV,
  isAndroidTV,
  isAppleTV,
  getDeviceType,

  // Style constants
  TV_TYPOGRAPHY,
  TV_SPACING,
  TV_FOCUS_CONFIG,
  TV_TOUCH_TARGETS,
  TV_HERO,
  TV_CATALOG,
  TV_ANIMATIONS,
  TV_GRID,

  // Helpers
  scaleForTV,
  getResponsiveValue,
  getOptimalPosterCount,
  calculatePosterWidth,
  getTVFocusStyle,
  getResponsiveSpacing,
  getResponsiveFontSize,
  mapDeviceType,
};
