/**
 * TV Focus Configuration
 *
 * Provides consistent focus indicators and animations for TV viewing.
 * Optimized for 10-foot viewing distance with clear, large focus indicators.
 */

/**
 * TV Focus animation and styling configuration
 */
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
} as const;

/**
 * Generate TV-optimized focus styles
 */
export const getTVFocusStyle = (
  isFocused: boolean,
  primaryColor: string = TV_FOCUS_CONFIG.focusBorderColor
) => {
  if (!isFocused) {
    return {};
  }

  return {
    borderWidth: TV_FOCUS_CONFIG.focusBorderWidth,
    borderColor: primaryColor,
  };
};

export type TVFocusConfig = typeof TV_FOCUS_CONFIG;
