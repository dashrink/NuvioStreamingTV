/**
 * Animation constants, timing configurations, and threshold values
 * for the HeroSection component family.
 * Extracted from the original HeroSection.tsx for reuse and maintainability.
 */

// =============================================================================
// Core Animation Constants
// =============================================================================

/**
 * Default scale factor for hero section animations
 */
export const SCALE_FACTOR = 1.02;

/**
 * Scroll threshold (in pixels) before fade effects begin
 */
export const FADE_THRESHOLD = 200;

// =============================================================================
// Parallax Configuration - Backdrop
// =============================================================================

/**
 * Parallax settings for the backdrop image behind the hero section
 */
export const BACKDROP_PARALLAX = {
  /** Default zoom level when not scrolling */
  DEFAULT_ZOOM: 1.1,
  /** Scale multiplier when scrolling up (pulling down) */
  SCROLL_UP_MULTIPLIER: 0.002,
  /** Scale multiplier when scrolling down */
  SCROLL_DOWN_MULTIPLIER: 0.0001,
  /** Maximum scale to prevent over-zoom */
  MAX_SCALE: 1.4,
  /** Vertical parallax movement factor (0-1) */
  PARALLAX_FACTOR: 0.3,
} as const;

// =============================================================================
// Parallax Configuration - Trailer Layer
// =============================================================================

/**
 * Parallax settings for the trailer video layer
 */
export const TRAILER_PARALLAX = {
  /** Default zoom level when not scrolling */
  DEFAULT_ZOOM: 1.0,
  /** Scale multiplier when scrolling up (pulling down) */
  SCROLL_UP_MULTIPLIER: 0.0015,
  /** Scale multiplier when scrolling down */
  SCROLL_DOWN_MULTIPLIER: 0.0001,
  /** Maximum scale to prevent over-zoom */
  MAX_SCALE: 1.25,
  /** Vertical parallax movement factor (0-1) */
  PARALLAX_FACTOR: 0.2,
} as const;

// =============================================================================
// Timing Configurations (milliseconds)
// =============================================================================

/**
 * Animation durations for trailer transitions
 */
export const TRAILER_TIMING = {
  /** Duration for trailer fade in when ready */
  FADE_IN: 500,
  /** Duration for trailer fade out when stopping */
  FADE_OUT: 300,
  /** Duration for thumbnail fade transitions */
  THUMBNAIL_FADE: 500,
  /** Delay before unmute button appears */
  UNMUTE_BUTTON_DELAY: 1000,
} as const;

/**
 * Animation durations for progress bar component
 */
export const PROGRESS_TIMING = {
  /** Duration for progress box entrance animation */
  ENTRANCE: 400,
  /** Duration for progress box exit animation */
  EXIT: 300,
  /** Duration for celebration scale animation */
  CELEBRATION: 200,
  /** Duration for completion glow animation cycle */
  GLOW_CYCLE: 1500,
  /** Duration for progress pulse animation cycle */
  PULSE_CYCLE: 2000,
  /** Duration for sync icon rotation (one full rotation) */
  SYNC_ROTATION: 1000,
} as const;

/**
 * Animation durations for UI element transitions
 */
export const UI_TIMING = {
  /** Duration for logo load fade in */
  LOGO_LOAD: 300,
  /** Duration for logo scale animation */
  LOGO_SCALE: 300,
  /** Duration for image opacity changes */
  IMAGE_FADE: 150,
  /** Duration for image load fade in */
  IMAGE_LOAD: 400,
  /** Duration for action buttons fade */
  BUTTONS_FADE: 500,
  /** Duration for genre text fade */
  GENRE_FADE: 500,
  /** Duration for title card translate animation */
  TITLE_TRANSLATE: 500,
} as const;

// =============================================================================
// Scroll Thresholds
// =============================================================================

/**
 * Scroll position thresholds as percentages of hero height (0-1)
 */
export const SCROLL_THRESHOLDS = {
  /** Pause trailer when scrolled past this percentage of hero height */
  PAUSE_THRESHOLD: 0.7,
  /** Resume trailer when scrolled back above this percentage of hero height */
  RESUME_THRESHOLD: 0.4,
} as const;

// =============================================================================
// Progress Thresholds
// =============================================================================

/**
 * Percentage thresholds for watch progress calculations
 */
export const PROGRESS_THRESHOLDS = {
  /** Percentage at which local progress is considered "watched" */
  LOCAL_WATCHED: 85,
  /** Percentage at which Trakt progress is considered "watched" */
  TRAKT_WATCHED: 95,
  /** Percentage at which to show completion celebration */
  COMPLETION_CELEBRATION: 85,
} as const;

// =============================================================================
// Logo Configuration
// =============================================================================

/**
 * Configuration for logo display and fallbacks
 */
export const LOGO_CONFIG = {
  /** Scale factor when progress bar is visible */
  SCALE_WITH_PROGRESS: 0.85,
  /** Grace period (ms) before showing text fallback */
  TEXT_FALLBACK_DELAY: 1000,
  /** Maximum number of genres to display */
  MAX_GENRES_DISPLAY: 3,
} as const;

// =============================================================================
// Glass/Blur Effects
// =============================================================================

/**
 * Configuration for glassmorphism and blur effects
 */
export const BLUR_CONFIG = {
  /** Default blur intensity for glass backgrounds */
  DEFAULT_INTENSITY: 20,
  /** iOS glass tint opacity */
  IOS_TINT_OPACITY: 0.1,
  /** Android fallback background opacity */
  ANDROID_FALLBACK_OPACITY: 0.8,
} as const;

// =============================================================================
// Animation Initial Values
// =============================================================================

/**
 * Initial values for animated properties
 */
export const INITIAL_VALUES = {
  /** Initial scale for progress box entrance */
  PROGRESS_BOX_SCALE: 0.8,
  /** Initial translateY for progress box entrance */
  PROGRESS_BOX_TRANSLATE_Y: 20,
  /** Title card translateY when unmuted */
  TITLE_CARD_UNMUTED_OFFSET: -20,
} as const;
