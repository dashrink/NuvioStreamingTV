/**
 * TV Typography Configuration
 *
 * Provides enlarged font sizes optimized for TV viewing at approximately 10 feet distance.
 * All values are in scaled pixels (sp) to account for screen density.
 */

/**
 * TV-optimized font sizes for various text styles
 * Values assume TV resolution requirements and 10-foot viewing distance
 */
export const TV_TYPOGRAPHY = {
  // Display sizes (for hero titles, major headings)
  displayLarge: 48,
  displayMedium: 40,
  displaySmall: 36,

  // Heading sizes
  headlineLarge: 32,
  headlineMedium: 28,
  headlineSmall: 24,

  // Title sizes
  titleLarge: 22,
  titleMedium: 20,
  titleSmall: 18,

  // Body sizes
  bodyLarge: 18,
  bodyMedium: 16,
  bodySmall: 14,

  // Label sizes
  labelLarge: 16,
  labelMedium: 14,
  labelSmall: 12,
} as const;

/**
 * Font weight constants for consistent typography
 */
export const TV_FONT_WEIGHTS = {
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
} as const;

export type TVTypography = typeof TV_TYPOGRAPHY;
export type TVFontWeight = typeof TV_FONT_WEIGHTS;
