/**
 * useHeroAnimations - Custom hook for HeroSection animation styles
 *
 * Encapsulates all animation styles used by the HeroSection component family:
 * - Hero container animations (height, opacity)
 * - Logo animations (opacity, scale based on progress bar visibility)
 * - Buttons animations (opacity, translateY)
 * - Title card animations (translateY for trailer unmute)
 * - Genre animations (opacity for trailer unmute)
 * - Watch progress animations (opacity)
 * - Backdrop parallax effects (scale, translateY based on scroll)
 * - Trailer parallax effects (scale, translateY based on scroll)
 *
 * @example
 * const {
 *   heroAnimatedStyle,
 *   logoAnimatedStyle,
 *   logoFadeStyle,
 *   buttonsAnimatedStyle,
 *   titleCardAnimatedStyle,
 *   genreAnimatedStyle,
 *   watchProgressAnimatedStyle,
 *   backdropImageStyle,
 *   trailerParallaxStyle,
 * } = useHeroAnimations({
 *   scrollY,
 *   heroHeight,
 *   heroOpacity,
 *   logoOpacity,
 *   logoLoadOpacity,
 *   buttonsOpacity,
 *   buttonsTranslateY,
 *   watchProgressOpacity,
 *   imageOpacity,
 *   imageLoadOpacity,
 *   actionButtonsOpacity,
 *   titleCardTranslateY,
 *   genreOpacity,
 *   watchProgress,
 * });
 */

import {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import {
  BACKDROP_PARALLAX,
  TRAILER_PARALLAX,
  LOGO_CONFIG,
  UI_TIMING,
} from '../constants';
import type { WatchProgress } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the useHeroAnimations hook
 */
export interface UseHeroAnimationsProps {
  /** Shared value tracking scroll position */
  scrollY: SharedValue<number>;
  /** Shared value tracking hero section height */
  heroHeight: SharedValue<number>;
  /** Shared value for hero container opacity */
  heroOpacity: SharedValue<number>;
  /** Shared value for logo container opacity */
  logoOpacity: SharedValue<number>;
  /** Shared value for logo load fade-in opacity */
  logoLoadOpacity: SharedValue<number>;
  /** Shared value for buttons opacity */
  buttonsOpacity: SharedValue<number>;
  /** Shared value for buttons translateY offset */
  buttonsTranslateY: SharedValue<number>;
  /** Shared value for watch progress opacity */
  watchProgressOpacity: SharedValue<number>;
  /** Shared value for backdrop image opacity */
  imageOpacity: SharedValue<number>;
  /** Shared value for backdrop image load opacity */
  imageLoadOpacity: SharedValue<number>;
  /** Shared value for action buttons opacity (from trailer playback) */
  actionButtonsOpacity: SharedValue<number>;
  /** Shared value for title card translateY (from trailer unmute) */
  titleCardTranslateY: SharedValue<number>;
  /** Shared value for genre text opacity (from trailer unmute) */
  genreOpacity: SharedValue<number>;
  /** Watch progress data for determining logo scale */
  watchProgress: WatchProgress | null;
}

/**
 * Return type for the useHeroAnimations hook
 */
export interface UseHeroAnimationsReturn {
  /** Animated style for the hero container (height and opacity) */
  heroAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the logo container (opacity and scale) */
  logoAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the logo image fade-in (opacity only) */
  logoFadeStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the buttons container (opacity and translateY) */
  buttonsAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the title card (translateY for trailer unmute) */
  titleCardAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the genre container (opacity for trailer unmute) */
  genreAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the watch progress container (opacity) */
  watchProgressAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the backdrop image (parallax scale and translateY) */
  backdropImageStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the trailer layer (parallax scale and translateY) */
  trailerParallaxStyle: ReturnType<typeof useAnimatedStyle>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useHeroAnimations({
  scrollY,
  heroHeight,
  heroOpacity,
  logoOpacity,
  logoLoadOpacity,
  buttonsOpacity,
  buttonsTranslateY,
  watchProgressOpacity,
  imageOpacity,
  imageLoadOpacity,
  actionButtonsOpacity,
  titleCardTranslateY,
  genreOpacity,
  watchProgress,
}: UseHeroAnimationsProps): UseHeroAnimationsReturn {
  // ---------------------------------------------------------------------------
  // Hero Container Animation
  // ---------------------------------------------------------------------------

  /**
   * Hero container animated style
   * Controls the overall hero section height and opacity
   */
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    height: heroHeight.value,
    opacity: heroOpacity.value,
  }), []);

  // ---------------------------------------------------------------------------
  // Logo Animations
  // ---------------------------------------------------------------------------

  /**
   * Logo container animated style
   * - Applies opacity from scroll-based fade
   * - Scales down when progress bar is visible to make room
   */
  const logoAnimatedStyle = useAnimatedStyle(() => {
    // Determine if progress bar should be shown
    const hasProgress = watchProgress && watchProgress.duration > 0;

    // Scale down logo when progress bar is present
    const logoScale = hasProgress ? LOGO_CONFIG.SCALE_WITH_PROGRESS : 1;

    return {
      opacity: logoOpacity.value,
      transform: [
        // Keep logo stable by not applying translateY based on scroll
        { scale: withTiming(logoScale, { duration: UI_TIMING.LOGO_SCALE }) },
      ],
    };
  }, [watchProgress]);

  /**
   * Logo fade style
   * Applies only to the logo image to handle load fade-in
   * Separate from logoAnimatedStyle to avoid affecting layout
   */
  const logoFadeStyle = useAnimatedStyle(() => ({
    opacity: logoLoadOpacity.value,
  }));

  // ---------------------------------------------------------------------------
  // Buttons Animation
  // ---------------------------------------------------------------------------

  /**
   * Buttons container animated style
   * - Combines scroll-based opacity with trailer playback opacity
   * - Applies translateY offset for scroll effects
   */
  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value * actionButtonsOpacity.value,
    transform: [
      {
        translateY: interpolate(
          buttonsTranslateY.value,
          [0, 20],
          [0, 20],
          Extrapolate.CLAMP
        ),
      },
    ],
  }), []);

  // ---------------------------------------------------------------------------
  // Title Card Animation
  // ---------------------------------------------------------------------------

  /**
   * Title card animated style
   * Applies translateY offset when trailer is unmuted
   * Moves the title/logo down slightly for better viewing
   */
  const titleCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleCardTranslateY.value }],
  }), []);

  // ---------------------------------------------------------------------------
  // Genre Animation
  // ---------------------------------------------------------------------------

  /**
   * Genre container animated style
   * Hides genres when trailer is unmuted for cleaner viewing
   */
  const genreAnimatedStyle = useAnimatedStyle(() => ({
    opacity: genreOpacity.value,
  }), []);

  // ---------------------------------------------------------------------------
  // Watch Progress Animation
  // ---------------------------------------------------------------------------

  /**
   * Watch progress container animated style
   * Controls visibility based on scroll position
   */
  const watchProgressAnimatedStyle = useAnimatedStyle(() => ({
    opacity: watchProgressOpacity.value,
  }), []);

  // ---------------------------------------------------------------------------
  // Backdrop Parallax Animation
  // ---------------------------------------------------------------------------

  /**
   * Backdrop image animated style with parallax effects
   * - Scale increases when pulling down (scroll up)
   * - Subtle scale increase when scrolling down
   * - Vertical parallax movement for depth effect
   *
   * Uses worklet for optimal performance on UI thread
   */
  const backdropImageStyle = useAnimatedStyle(() => {
    'worklet';
    const scrollYValue = scrollY.value;

    // Extract parallax constants for better readability
    const {
      DEFAULT_ZOOM,
      SCROLL_UP_MULTIPLIER,
      SCROLL_DOWN_MULTIPLIER,
      MAX_SCALE,
      PARALLAX_FACTOR,
    } = BACKDROP_PARALLAX;

    // Optimized scale calculation with minimal branching
    const scrollUpScale = DEFAULT_ZOOM + Math.abs(scrollYValue) * SCROLL_UP_MULTIPLIER;
    const scrollDownScale = DEFAULT_ZOOM + scrollYValue * SCROLL_DOWN_MULTIPLIER;
    const scale = Math.min(
      scrollYValue < 0 ? scrollUpScale : scrollDownScale,
      MAX_SCALE
    );

    // Single parallax calculation
    const parallaxOffset = scrollYValue * PARALLAX_FACTOR;

    return {
      opacity: imageOpacity.value * imageLoadOpacity.value,
      transform: [{ scale }, { translateY: parallaxOffset }],
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Trailer Parallax Animation
  // ---------------------------------------------------------------------------

  /**
   * Trailer layer animated style with parallax effects
   * Similar to backdrop but with different constants for distinct feel
   * - Less zoom effect than backdrop
   * - Subtler parallax movement
   *
   * Uses worklet for optimal performance on UI thread
   */
  const trailerParallaxStyle = useAnimatedStyle(() => {
    'worklet';
    const scrollYValue = scrollY.value;

    // Extract parallax constants for better readability
    const {
      DEFAULT_ZOOM,
      SCROLL_UP_MULTIPLIER,
      SCROLL_DOWN_MULTIPLIER,
      MAX_SCALE,
      PARALLAX_FACTOR,
    } = TRAILER_PARALLAX;

    // Optimized scale calculation with minimal branching
    const scrollUpScale = DEFAULT_ZOOM + Math.abs(scrollYValue) * SCROLL_UP_MULTIPLIER;
    const scrollDownScale = DEFAULT_ZOOM + scrollYValue * SCROLL_DOWN_MULTIPLIER;
    const scale = Math.min(
      scrollYValue < 0 ? scrollUpScale : scrollDownScale,
      MAX_SCALE
    );

    // Single parallax calculation
    const parallaxOffset = scrollYValue * PARALLAX_FACTOR;

    return {
      transform: [{ scale }, { translateY: parallaxOffset }],
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    heroAnimatedStyle,
    logoAnimatedStyle,
    logoFadeStyle,
    buttonsAnimatedStyle,
    titleCardAnimatedStyle,
    genreAnimatedStyle,
    watchProgressAnimatedStyle,
    backdropImageStyle,
    trailerParallaxStyle,
  };
}

export default useHeroAnimations;
