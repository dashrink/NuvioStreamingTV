/**
 * TV Spacing Configuration
 *
 * Provides increased spacing values optimized for comfortable TV viewing.
 * Uses 8dp base unit for consistency with Material Design guidelines.
 */

/**
 * TV-optimized spacing values
 * All values in density-independent pixels (dp)
 */
export const TV_SPACING = {
  // Base spacing unit (8dp system)
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Screen edge padding
  screenPadding: 48,

  // Section margins
  sectionMargin: 32,

  // Card gaps
  cardGap: 16,

  // List item spacing
  listItemSpacing: 12,
} as const;

/**
 * Common spacing scales for specific use cases
 */
export const TV_SPACING_PRESETS = {
  // Horizontal padding for full-width sections
  horizontalPadding: TV_SPACING.screenPadding,

  // Vertical gap between major sections
  sectionVerticalGap: TV_SPACING.xl,

  // Gap between items in a list/grid
  itemGap: TV_SPACING.md,

  // Padding inside cards/containers
  cardPadding: TV_SPACING.lg,

  // Gap between content and edge of screen
  safeAreaMargin: TV_SPACING.lg,
} as const;

export type TVSpacing = typeof TV_SPACING;
export type TVSpacingPresets = typeof TV_SPACING_PRESETS;
