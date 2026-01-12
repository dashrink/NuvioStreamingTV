import { Platform, ViewStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

import { colors } from './colors';

/**
 * Focus indicator style constants for TV remote navigation
 * These values are optimized for visibility on TV displays at viewing distance
 */

// =============================================================================
// PLATFORM DETECTION
// =============================================================================

/**
 * Check if the app is running on a TV platform
 */
export const isTV = (): boolean => Platform.isTV === true;

/**
 * Check if the app is running on Apple TV (tvOS)
 */
export const isTVOS = (): boolean => Platform.OS === 'ios' && Platform.isTV === true;

/**
 * Check if the app is running on Android TV
 */
export const isAndroidTV = (): boolean => Platform.OS === 'android' && Platform.isTV === true;

// =============================================================================
// FOCUS BORDER STYLES
// =============================================================================

/**
 * Focus border configuration
 * Border width is increased for TV displays for better visibility at distance
 */
export const focusBorder = {
  /** Border color when element is focused - uses primary theme color */
  color: colors.primary, // #2d9cdb teal
  /** Secondary/alternate focus color for high contrast situations */
  colorAlt: colors.accentLight, // #00BFBF lighter teal
  /** Border color when element is unfocused - transparent */
  colorUnfocused: 'transparent',
  /** Border width for standard elements (buttons, cards) */
  width: isTV() ? 3 : 2,
  /** Border width for larger elements (hero sections, featured cards) */
  widthLarge: isTV() ? 4 : 3,
  /** Border width for small elements (list items, icons) */
  widthSmall: isTV() ? 2 : 1,
  /** Default border radius for rounded focus indicators */
  radius: 8,
  /** Large border radius for cards and posters */
  radiusLarge: 12,
  /** Small border radius for buttons and compact elements */
  radiusSmall: 6,
} as const;

// =============================================================================
// FOCUS SCALE TRANSFORMS
// =============================================================================

/**
 * Scale transform values for focus states
 * Subtle scaling provides depth and emphasis without being jarring
 */
export const focusScale = {
  /** Default scale for focused elements - subtle emphasis */
  default: 1.05,
  /** Larger scale for cards and posters - more prominent effect */
  card: 1.08,
  /** Smaller scale for buttons - minimal but noticeable */
  button: 1.03,
  /** Scale for list items - very subtle */
  listItem: 1.02,
  /** Scale for hero/featured elements - prominent */
  hero: 1.04,
  /** Scale when pressed/selected on top of focus */
  pressed: 0.98,
  /** Base scale (unfocused state) */
  base: 1.0,
} as const;

// =============================================================================
// FOCUS SHADOW/GLOW EFFECTS
// =============================================================================

/**
 * Shadow and glow effect definitions for focused elements
 * Creates elevated appearance and enhances visibility
 */
export const focusShadow = {
  /** Glow color using primary theme color with transparency */
  color: 'rgba(45, 156, 219, 0.6)', // Primary color with 60% opacity
  /** Stronger glow for high emphasis */
  colorStrong: 'rgba(45, 156, 219, 0.8)',
  /** Subtle glow for low emphasis */
  colorSubtle: 'rgba(45, 156, 219, 0.3)',
  /** Shadow offset for standard elevation */
  offset: { width: 0, height: 4 },
  /** Shadow offset for high elevation */
  offsetLarge: { width: 0, height: 8 },
  /** Shadow blur radius for standard glow */
  radius: 12,
  /** Shadow blur radius for large glow effect */
  radiusLarge: 20,
  /** Shadow blur radius for subtle glow */
  radiusSmall: 6,
  /** Shadow opacity for standard glow */
  opacity: 0.6,
} as const;

/**
 * Pre-defined shadow styles for different focus variants
 * These can be applied directly to focused elements
 */
export const focusShadowStyles = {
  /** Default shadow for focused cards and buttons */
  default: {
    shadowColor: focusShadow.color,
    shadowOffset: focusShadow.offset,
    shadowOpacity: focusShadow.opacity,
    shadowRadius: focusShadow.radius,
    elevation: 8, // Android elevation
  } as ViewStyle,

  /** Larger shadow for hero sections and featured content */
  large: {
    shadowColor: focusShadow.colorStrong,
    shadowOffset: focusShadow.offsetLarge,
    shadowOpacity: 0.8,
    shadowRadius: focusShadow.radiusLarge,
    elevation: 12,
  } as ViewStyle,

  /** Subtle shadow for list items and smaller elements */
  subtle: {
    shadowColor: focusShadow.colorSubtle,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: focusShadow.radiusSmall,
    elevation: 4,
  } as ViewStyle,

  /** No shadow for unfocused state */
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,
} as const;

// =============================================================================
// ANIMATION TIMING & EASING
// =============================================================================

/**
 * Animation timing constants for focus transitions
 * Optimized for smooth 60fps performance on TV displays
 */
export const focusAnimation = {
  /** Duration for focus in animation (ms) - quick but noticeable */
  durationIn: 200,
  /** Duration for focus out/blur animation (ms) - slightly shorter */
  durationOut: 150,
  /** Duration for scale animations (ms) */
  durationScale: 180,
  /** Duration for color transitions (ms) */
  durationColor: 200,
  /** Duration for shadow/glow animations (ms) */
  durationShadow: 250,
  /** Standard easing for focus in - ease out for quick start */
  easingIn: Easing.out(Easing.quad),
  /** Easing for focus out - ease in for smooth finish */
  easingOut: Easing.in(Easing.quad),
  /** Easing for scale animations - ease out for responsive feel */
  easingScale: Easing.out(Easing.cubic),
  /** Easing for bouncy/spring-like effect */
  easingBounce: Easing.out(Easing.back(1.2)),
} as const;

/**
 * Spring animation configuration for react-native-reanimated
 * Provides smooth, natural-feeling focus animations
 */
export const focusSpringConfig = {
  /** Default spring config for focus transitions */
  default: {
    damping: 15,
    mass: 0.8,
    stiffness: 200,
  },
  /** Snappy spring for quick feedback */
  snappy: {
    damping: 20,
    mass: 0.5,
    stiffness: 300,
  },
  /** Gentle spring for larger elements */
  gentle: {
    damping: 18,
    mass: 1,
    stiffness: 150,
  },
} as const;

// =============================================================================
// TV-SPECIFIC SIZING ADJUSTMENTS
// =============================================================================

/**
 * TV-specific sizing multipliers and adjustments
 * TV displays are viewed from greater distance, requiring larger UI elements
 */
export const tvSizing = {
  /** Multiplier for focus border widths on TV */
  borderMultiplier: isTV() ? 1.5 : 1,
  /** Multiplier for focus shadow radius on TV */
  shadowMultiplier: isTV() ? 1.5 : 1,
  /** Minimum touch/focus target size for TV (in pixels) */
  minFocusTarget: isTV() ? 60 : 44,
  /** Recommended spacing between focusable elements on TV */
  focusableSpacing: isTV() ? 16 : 8,
  /** Scale factor adjustment for TV displays */
  scaleAdjustment: isTV() ? 1.02 : 1,
} as const;

// =============================================================================
// FOCUS STYLE VARIANTS
// =============================================================================

/**
 * Focus style variants for different component types
 * Each variant combines border, scale, and shadow settings
 */
export type FocusVariant = 'card' | 'button' | 'listItem' | 'hero' | 'nav' | 'modal';

export interface FocusStyleConfig {
  borderWidth: number;
  borderRadius: number;
  scale: number;
  shadow: ViewStyle;
}

/**
 * Get focus style configuration for a specific variant
 */
export const getFocusStyleConfig = (variant: FocusVariant): FocusStyleConfig => {
  switch (variant) {
    case 'card':
      return {
        borderWidth: focusBorder.width,
        borderRadius: focusBorder.radiusLarge,
        scale: focusScale.card,
        shadow: focusShadowStyles.default,
      };
    case 'button':
      return {
        borderWidth: focusBorder.widthSmall,
        borderRadius: focusBorder.radiusSmall,
        scale: focusScale.button,
        shadow: focusShadowStyles.subtle,
      };
    case 'listItem':
      return {
        borderWidth: focusBorder.widthSmall,
        borderRadius: focusBorder.radiusSmall,
        scale: focusScale.listItem,
        shadow: focusShadowStyles.subtle,
      };
    case 'hero':
      return {
        borderWidth: focusBorder.widthLarge,
        borderRadius: focusBorder.radiusLarge,
        scale: focusScale.hero,
        shadow: focusShadowStyles.large,
      };
    case 'nav':
      return {
        borderWidth: focusBorder.widthSmall,
        borderRadius: focusBorder.radius,
        scale: focusScale.button,
        shadow: focusShadowStyles.none,
      };
    case 'modal':
      return {
        borderWidth: focusBorder.width,
        borderRadius: focusBorder.radius,
        scale: focusScale.listItem,
        shadow: focusShadowStyles.subtle,
      };
    default:
      return {
        borderWidth: focusBorder.width,
        borderRadius: focusBorder.radius,
        scale: focusScale.default,
        shadow: focusShadowStyles.default,
      };
  }
};

// =============================================================================
// INTERPOLATION HELPERS
// =============================================================================

/**
 * Color values for interpolation in animated styles
 * Use with interpolateColor from react-native-reanimated
 */
export const focusColors = {
  /** Border colors for interpolation [unfocused, focused] */
  border: ['transparent', focusBorder.color] as const,
  /** Border colors with alt color [unfocused, focused] */
  borderAlt: ['transparent', focusBorder.colorAlt] as const,
  /** Background overlay colors for list items [unfocused, focused] */
  backgroundOverlay: ['transparent', 'rgba(45, 156, 219, 0.1)'] as const,
  /** Shadow colors for interpolation [unfocused, focused] */
  shadow: ['transparent', focusShadow.color] as const,
} as const;

/**
 * Scale values for interpolation in animated styles
 * Use with interpolate from react-native-reanimated
 */
export const focusScaleValues = {
  /** Scale for cards [unfocused, focused] */
  card: [focusScale.base, focusScale.card] as const,
  /** Scale for buttons [unfocused, focused] */
  button: [focusScale.base, focusScale.button] as const,
  /** Scale for list items [unfocused, focused] */
  listItem: [focusScale.base, focusScale.listItem] as const,
  /** Scale for hero elements [unfocused, focused] */
  hero: [focusScale.base, focusScale.hero] as const,
  /** Default scale [unfocused, focused] */
  default: [focusScale.base, focusScale.default] as const,
} as const;

// =============================================================================
// FOCUS STATE STYLES (Ready to apply)
// =============================================================================

/**
 * Ready-to-use focus state styles for common use cases
 * Apply these styles when an element is in focused state
 */
export const focusedStyles = {
  /** Focused card style with border and glow */
  card: {
    borderWidth: focusBorder.width,
    borderColor: focusBorder.color,
    ...focusShadowStyles.default,
  } as ViewStyle,

  /** Focused button style */
  button: {
    borderWidth: focusBorder.widthSmall,
    borderColor: focusBorder.color,
    ...focusShadowStyles.subtle,
  } as ViewStyle,

  /** Focused list item style with background highlight */
  listItem: {
    borderWidth: focusBorder.widthSmall,
    borderColor: focusBorder.color,
    backgroundColor: 'rgba(45, 156, 219, 0.1)',
  } as ViewStyle,

  /** Focused hero/featured element style */
  hero: {
    borderWidth: focusBorder.widthLarge,
    borderColor: focusBorder.color,
    ...focusShadowStyles.large,
  } as ViewStyle,
} as const;

/**
 * Unfocused state styles - apply when element loses focus
 */
export const unfocusedStyles = {
  card: {
    borderWidth: focusBorder.width,
    borderColor: focusBorder.colorUnfocused,
    ...focusShadowStyles.none,
  } as ViewStyle,

  button: {
    borderWidth: focusBorder.widthSmall,
    borderColor: focusBorder.colorUnfocused,
    ...focusShadowStyles.none,
  } as ViewStyle,

  listItem: {
    borderWidth: focusBorder.widthSmall,
    borderColor: focusBorder.colorUnfocused,
    backgroundColor: 'transparent',
  } as ViewStyle,

  hero: {
    borderWidth: focusBorder.widthLarge,
    borderColor: focusBorder.colorUnfocused,
    ...focusShadowStyles.none,
  } as ViewStyle,
} as const;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  // Platform detection
  isTV,
  isTVOS,
  isAndroidTV,
  // Border styles
  focusBorder,
  // Scale values
  focusScale,
  // Shadow/glow effects
  focusShadow,
  focusShadowStyles,
  // Animation config
  focusAnimation,
  focusSpringConfig,
  // TV sizing
  tvSizing,
  // Variants
  getFocusStyleConfig,
  // Colors and values for interpolation
  focusColors,
  focusScaleValues,
  // Ready-to-use styles
  focusedStyles,
  unfocusedStyles,
};
