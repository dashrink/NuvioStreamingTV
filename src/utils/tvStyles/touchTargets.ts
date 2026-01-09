/**
 * TV Touch Target Configuration
 *
 * Defines minimum interactive area sizes for D-pad/remote navigation.
 * All sizes follow TV/Large Touch Target guidelines (minimum 48dp x 48dp).
 */

/**
 * TV-optimized touch target sizes for various UI elements
 */
export const TV_TOUCH_TARGETS = {
  // Minimum interactive area
  minimum: {
    width: 48,
    height: 48,
  },

  // Standard button size
  standard: {
    width: 56,
    height: 56,
  },

  // Large action buttons (Play, etc.)
  large: {
    width: 160,
    height: 56,
  },

  // Icon buttons
  iconButton: {
    width: 56,
    height: 56,
    iconSize: 28,
  },

  // Navigation arrows
  arrow: {
    width: 56,
    height: 56,
    iconSize: 36,
  },

  // Catalog poster card
  posterCard: {
    width: 160,
    marginRight: 16,
  },
} as const;

/**
 * Safe minimum touch target size (accessibility standard)
 */
export const MINIMUM_TOUCH_TARGET = 48;

/**
 * Check if a size meets TV touch target guidelines
 */
export const meetsTVTouchTargetGuidelines = (width: number, height: number): boolean => {
  return width >= MINIMUM_TOUCH_TARGET && height >= MINIMUM_TOUCH_TARGET;
};

export type TVTouchTargets = typeof TV_TOUCH_TARGETS;
