/**
 * HeroSection Component Family
 *
 * This barrel file exports all sub-components, hooks, types, constants, and styles
 * for the HeroSection component family. This enables clean imports across the codebase.
 *
 * @example
 * // Import components
 * import { HeroBackButton, ActionButtons, HeroTitleCard } from './HeroSection';
 *
 * // Import hooks
 * import { useTrailerPlayback, useHeroAnimations } from './HeroSection';
 *
 * // Import types
 * import type { HeroSectionProps, ActionButtonsProps } from './HeroSection';
 *
 * // Import constants
 * import { TRAILER_TIMING, SCROLL_THRESHOLDS } from './HeroSection';
 */

// =============================================================================
// Types
// =============================================================================

export type {
  ContentType,
  WatchProgress,
  EpisodeDetails,
  HeroSectionProps,
  ActionButtonsProps,
  WatchProgressDisplayProps,
  ProgressData,
  HeroBackButtonProps,
  HeroGradientOverlayProps,
  HeroTitleCardProps,
  HeroGenresProps,
  GlassBlurBackgroundProps,
  TrailerControlsProps,
  HeroBackdropProps,
  HeroTrailerLayerProps,
  HeroThemeColors,
  UseTrailerPlaybackProps,
  UseTrailerPlaybackReturn,
  UseStableLogoProps,
  UseStableLogoReturn,
} from './types';

// =============================================================================
// Constants
// =============================================================================

export {
  SCALE_FACTOR,
  FADE_THRESHOLD,
  BACKDROP_PARALLAX,
  TRAILER_PARALLAX,
  TRAILER_TIMING,
  PROGRESS_TIMING,
  UI_TIMING,
  SCROLL_THRESHOLDS,
  PROGRESS_THRESHOLDS,
  LOGO_CONFIG,
  BLUR_CONFIG,
  INITIAL_VALUES,
} from './constants';

// =============================================================================
// Styles
// =============================================================================

export {
  // Style sheets
  layoutStyles,
  blurStyles,
  shadowStyles,
  buttonStyles,
  containerStyles,
  textStyles,
  // Responsive values
  spacing,
  sizes,
  fontSizes,
  // Helper functions
  getResponsiveStyle,
  createBlurBackgroundStyle,
  createAndroidFallbackStyle,
  // Device info
  isTablet,
  screenWidth,
  HERO_HEIGHT,
} from './styles';

// =============================================================================
// Components
// =============================================================================

// Presentation components
export { default as HeroBackButton } from './components/HeroBackButton';
export { default as HeroGradientOverlay } from './components/HeroGradientOverlay';
export { default as HeroTitleCard } from './components/HeroTitleCard';
export { default as HeroGenres } from './components/HeroGenres';
export {
  default as GlassBlurBackground,
  isLiquidGlassAvailable,
  isBlurAvailable,
} from './components/GlassBlurBackground';
export { default as HeroBackdrop } from './components/HeroBackdrop';

// Interactive components
export { default as ActionButtons } from './components/ActionButtons';
export { default as WatchProgressDisplay } from './components/WatchProgressDisplay';
export { default as TrailerControls } from './components/TrailerControls';

// Trailer system
export { default as HeroTrailerLayer } from './components/HeroTrailerLayer';

// =============================================================================
// Hooks
// =============================================================================

// Trailer playback management
export { default as useTrailerPlayback } from './hooks/useTrailerPlayback';

// Animation styles
export { default as useHeroAnimations } from './hooks/useHeroAnimations';
export type {
  UseHeroAnimationsProps,
  UseHeroAnimationsReturn,
} from './hooks/useHeroAnimations';

// Backdrop parallax effects
export { default as useBackdropParallax } from './hooks/useBackdropParallax';
export {
  useBackdropImageParallax,
  useTrailerLayerParallax,
  calculateParallaxScale,
  calculateParallaxTranslate,
} from './hooks/useBackdropParallax';
export type {
  ParallaxConfig,
  UseBackdropParallaxProps,
  ParallaxValues,
  UseBackdropParallaxReturn,
} from './hooks/useBackdropParallax';

// Logo state management
export { default as useStableLogo } from './hooks/useStableLogo';
