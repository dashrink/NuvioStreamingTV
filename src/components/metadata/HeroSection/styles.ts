/**
 * Shared styles for the HeroSection component family.
 * Contains common styles that are reused across multiple sub-components.
 * Extracted from the original HeroSection.tsx for consistency and maintainability.
 */

import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

import { BLUR_CONFIG } from './constants';
import {
  HERO_HEIGHT,
  SCREEN_WIDTH as width,
  IS_TABLET as isTablet,
} from '../../../constants/dimensions';

// =============================================================================
// Common Layout Styles
// =============================================================================

/**
 * Common layout styles used across multiple HeroSection components
 */
export const layoutStyles = StyleSheet.create({
  /**
   * Fills the parent container absolutely with zero insets
   */
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  /**
   * Centers content both horizontally and vertically
   */
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /**
   * Row layout with centered items
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /**
   * Column layout with centered items
   */
  column: {
    flexDirection: 'column',
    alignItems: 'center',
  },

  /**
   * Full width container with centered self
   */
  fullWidthCentered: {
    width: '100%',
    alignSelf: 'center',
  },
});

// =============================================================================
// Blur/Glass Background Styles
// =============================================================================

/**
 * Glassmorphism and blur effect styles.
 * These provide platform-specific blur backgrounds with appropriate fallbacks.
 */
export const blurStyles = StyleSheet.create({
  /**
   * Standard blur background for rectangular containers (buttons, cards)
   * Use with GlassView/ExpoBlurView on iOS, androidFallback on Android
   */
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },

  /**
   * Android fallback for standard blur background
   */
  androidFallbackBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: `rgba(255,255,255,${BLUR_CONFIG.ANDROID_FALLBACK_OPACITY})`,
  },

  /**
   * Round blur background for circular icon buttons
   */
  blurBackgroundRound: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },

  /**
   * Android fallback for round blur background
   */
  androidFallbackBlurRound: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    backgroundColor: `rgba(255,255,255,${BLUR_CONFIG.ANDROID_FALLBACK_OPACITY})`,
  },

  /**
   * Progress bar blur background
   */
  androidProgressBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  /**
   * Glass background styling for progress container
   */
  progressGlassBackground: {
    width: '75%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  /**
   * Tablet-sized glass background for progress container
   */
  tabletProgressGlassBackground: {
    width: width * 0.7,
    maxWidth: 700,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    alignSelf: 'center',
  },
});

// =============================================================================
// Text Shadow Styles
// =============================================================================

/**
 * Text shadow styles for improved readability over images/videos
 */
export const shadowStyles = StyleSheet.create({
  /**
   * Standard text shadow for icons over media
   */
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  } as TextStyle,

  /**
   * Stronger shadow for title text over media
   */
  titleShadow: {
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  /**
   * Box shadow for elevated elements like buttons
   */
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
});

// =============================================================================
// Tablet-specific Spacing & Sizing
// =============================================================================

/**
 * Responsive spacing values based on device type
 */
export const spacing = {
  /** Horizontal padding for content */
  contentPadding: isTablet ? 32 : 16,
  /** Vertical padding for content */
  contentPaddingVertical: isTablet ? 16 : 8,
  /** Gap between action buttons */
  buttonGap: isTablet ? 16 : 12,
  /** Gap in single row layouts */
  singleRowGap: 4,
  /** Back button left offset */
  backButtonLeft: isTablet ? 32 : 16,
  /** Genre container margins */
  genreMarginTop: isTablet ? 8 : 6,
  genreMarginBottom: isTablet ? 20 : 14,
  /** Watch progress container margins */
  watchProgressMarginTop: isTablet ? 8 : 4,
  watchProgressMarginBottom: isTablet ? 8 : 4,
} as const;

/**
 * Responsive size values based on device type
 */
export const sizes = {
  /** Max width for centered content containers */
  maxContentWidth: isTablet ? 600 : ('100%' as const),
  /** Max width for hero content on tablet */
  maxHeroContentWidth: isTablet ? 800 : undefined,
  /** Icon button dimensions */
  iconButtonSize: isTablet ? 60 : 50,
  iconButtonRadius: isTablet ? 30 : 25,
  /** Single row icon button dimensions */
  singleRowIconSize: isTablet ? 50 : 44,
  singleRowIconRadius: isTablet ? 25 : 22,
  /** Icon sizes */
  iconSize: isTablet ? 28 : 24,
  smallIconSize: isTablet ? 24 : 20,
  /** Logo dimensions */
  logoWidth: isTablet ? width * 0.5 : width * 0.75,
  logoHeight: isTablet ? 120 : 90,
  logoMaxWidth: isTablet ? 400 : undefined,
  /** Max width for single row buttons */
  singleRowButtonMaxWidth: isTablet ? 200 : 150,
  /** Watch progress container min height */
  watchProgressMinHeight: isTablet ? 44 : 36,
  /** Watch progress max width */
  watchProgressMaxWidth: isTablet ? 800 : ('100%' as const),
} as const;

/**
 * Responsive font sizes based on device type
 */
export const fontSizes = {
  /** Hero title */
  heroTitle: isTablet ? 36 : 26,
  /** Play button text */
  playButtonText: isTablet ? 18 : 15,
  /** Info button text */
  infoButtonText: isTablet ? 16 : 15,
  /** Genre text */
  genreText: isTablet ? 16 : 12,
  /** Progress main text */
  progressMainText: isTablet ? 14 : 11,
  /** Progress sub text */
  progressSubText: isTablet ? 12 : 9,
  /** Sync status text */
  syncStatusText: 9,
  /** Watch progress display text */
  watchProgressText: 11,
} as const;

// =============================================================================
// Button Styles
// =============================================================================

/**
 * Shared button styles for action buttons
 */
export const buttonStyles = StyleSheet.create({
  /**
   * Base action button style
   */
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 26,
  },

  /**
   * Primary play button style
   */
  playButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  /**
   * Tablet play button style
   */
  tabletPlayButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 32,
    minWidth: 180,
  },

  /**
   * Secondary info button style
   */
  infoButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },

  /**
   * Tablet info button style
   */
  tabletInfoButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    minWidth: 140,
  },

  /**
   * Icon-only circular button style
   */
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  /**
   * Tablet icon button style
   */
  tabletIconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  /**
   * Single row icon button style
   */
  singleRowIconButton: {
    width: isTablet ? 50 : 44,
    height: isTablet ? 50 : 44,
    borderRadius: isTablet ? 25 : 22,
    flex: 0,
  },

  /**
   * Play button text style
   */
  playButtonText: {
    color: '#000',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 15,
  },

  /**
   * Tablet play button text style
   */
  tabletPlayButtonText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  /**
   * Info button text style
   */
  infoButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 15,
  },

  /**
   * Tablet info button text style
   */
  tabletInfoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  /**
   * Watched state play button style
   */
  watchedPlayButton: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  /**
   * Watched state play button text style
   */
  watchedPlayButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 15,
  },
});

// =============================================================================
// Container Styles
// =============================================================================

/**
 * Container styles for hero section components
 */
export const containerStyles = StyleSheet.create({
  /**
   * Action buttons container (phone)
   */
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  },

  /**
   * Action buttons container (tablet)
   */
  tabletActionButtons: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    maxWidth: 600,
    alignSelf: 'center',
  },

  /**
   * Single row layout for buttons
   */
  singleRowLayout: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  },

  /**
   * Primary action row layout
   */
  primaryActionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  /**
   * Secondary action row layout
   */
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },

  /**
   * Watch progress container (phone)
   */
  watchProgressContainer: {
    marginTop: 4,
    marginBottom: 4,
    width: '100%',
    alignItems: 'center',
    minHeight: 36,
    position: 'relative',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  },

  /**
   * Watch progress container (tablet)
   */
  tabletWatchProgressContainer: {
    marginTop: 8,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
    minHeight: 44,
    position: 'relative',
    maxWidth: 800,
    alignSelf: 'center',
  },

  /**
   * Genre container (phone)
   */
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
    gap: 0,
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  },

  /**
   * Genre container (tablet)
   */
  tabletGenreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    gap: 0,
  },

  /**
   * Logo container
   */
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 4,
    flex: 0,
    display: 'flex',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  },
});

// =============================================================================
// Text Styles
// =============================================================================

/**
 * Text styles for hero section typography
 */
export const textStyles = StyleSheet.create({
  /**
   * Hero title text (phone)
   */
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: -0.3,
    textAlign: 'center',
  },

  /**
   * Hero title text (tablet)
   */
  tabletHeroTitle: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 42,
  },

  /**
   * Genre text (phone)
   */
  genreText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.9,
    marginLeft: 0,
    paddingLeft: 0,
    marginRight: 0,
    paddingRight: 0,
    marginVertical: 0,
    paddingVertical: 0,
  },

  /**
   * Genre text (tablet)
   */
  tabletGenreText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.9,
    marginLeft: 0,
    paddingLeft: 0,
    marginRight: 0,
    paddingRight: 0,
    marginVertical: 0,
    paddingVertical: 0,
  },

  /**
   * Genre dot separator (phone)
   */
  genreDot: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
    marginHorizontal: 4,
    paddingHorizontal: 0,
    marginVertical: 0,
    paddingVertical: 0,
  },

  /**
   * Genre dot separator (tablet)
   */
  tabletGenreDot: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.6,
    marginHorizontal: 6,
    paddingHorizontal: 0,
    marginVertical: 0,
    paddingVertical: 0,
  },

  /**
   * Watch progress main text (phone)
   */
  watchProgressMainText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  /**
   * Watch progress main text (tablet)
   */
  tabletWatchProgressMainText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  /**
   * Watch progress sub text (phone)
   */
  watchProgressSubText: {
    fontSize: 9,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 1,
  },

  /**
   * Watch progress sub text (tablet)
   */
  tabletWatchProgressSubText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 1,
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Returns the appropriate style based on tablet vs phone
 * @param phoneStyle - Style to use on phone
 * @param tabletStyle - Style to use on tablet
 * @returns The appropriate style for the current device
 */
export function getResponsiveStyle<T>(phoneStyle: T, tabletStyle: T): T {
  return isTablet ? tabletStyle : phoneStyle;
}

/**
 * Creates a blur background style with custom border radius
 * @param borderRadius - Border radius for the blur background
 * @returns Style object for blur background
 */
export function createBlurBackgroundStyle(borderRadius: number): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius,
  };
}

/**
 * Creates an Android fallback blur style with custom border radius
 * @param borderRadius - Border radius for the fallback
 * @param opacity - Background opacity (default from BLUR_CONFIG)
 * @returns Style object for Android fallback
 */
export function createAndroidFallbackStyle(
  borderRadius: number,
  opacity: number = BLUR_CONFIG.ANDROID_FALLBACK_OPACITY
): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius,
    backgroundColor: `rgba(255,255,255,${opacity})`,
  };
}

// =============================================================================
// Re-export device info for convenience
// =============================================================================

export { isTablet, width as screenWidth, HERO_HEIGHT };
