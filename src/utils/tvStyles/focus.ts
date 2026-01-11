/**
 * TV Focus Configuration
 *
 * Provides consistent focus indicators and animations for TV viewing.
 * Optimized for 10-foot viewing distance with clear, thin focus indicators.
 * Updated: Uses thin border with subtle scale effect for cleaner appearance.
 */

/**
 * TV Focus animation and styling configuration
 */
export const TV_FOCUS_CONFIG = {
  // Border-based focus indicator - thin line for cleaner look
  focusBorderWidth: 2,
  focusBorderColor: '#E5A00D', // Warm yellow/gold, can be overridden by theme

  // Scale animation on focus - slightly enlarge to show selection
  focusScale: 1.05,
  focusScaleSubtle: 1.03,

  // Animation timing
  focusAnimationDuration: 150,

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
