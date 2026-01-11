/**
 * useBackdropParallax - Custom hook for parallax scroll animation calculations
 *
 * Encapsulates parallax scroll animation logic for backdrop images with:
 * - Zoom effects based on scroll direction (more aggressive when pulling down)
 * - Vertical translate effects for visual depth perception
 * - Configurable parallax parameters for different use cases
 * - Optimized worklet calculations for UI thread performance
 *
 * The parallax system responds to scroll gestures:
 * - When pulling down (scroll < 0): Image zooms in more aggressively
 * - When scrolling up (scroll > 0): Image has subtle zoom with vertical offset
 *
 * @module HeroSection/hooks/useBackdropParallax
 *
 * @example
 * ```tsx
 * const { parallaxStyle, parallaxValues } = useBackdropParallax({
 *   scrollY,
 *   config: BACKDROP_PARALLAX, // or TRAILER_PARALLAX
 * });
 *
 * return <Animated.View style={parallaxStyle}>...</Animated.View>;
 * ```
 *
 * @example
 * // With opacity values
 * const { parallaxStyleWithOpacity } = useBackdropParallax({
 *   scrollY,
 *   imageOpacity,
 *   imageLoadOpacity,
 * });
 */

import { useMemo } from 'react';
import {
  useAnimatedStyle,
  useDerivedValue,
  SharedValue,
} from 'react-native-reanimated';
import { BACKDROP_PARALLAX, TRAILER_PARALLAX } from '../constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Parallax configuration parameters
 */
export interface ParallaxConfig {
  /** Default zoom level when not scrolling (e.g., 1.0 or 1.1) */
  DEFAULT_ZOOM: number;
  /** Scale multiplier when scrolling up/pulling down (negative scroll) */
  SCROLL_UP_MULTIPLIER: number;
  /** Scale multiplier when scrolling down (positive scroll) */
  SCROLL_DOWN_MULTIPLIER: number;
  /** Maximum scale to prevent over-zoom */
  MAX_SCALE: number;
  /** Vertical parallax movement factor (0-1) */
  PARALLAX_FACTOR: number;
}

/**
 * Props for the useBackdropParallax hook
 */
export interface UseBackdropParallaxProps {
  /** Shared value tracking scroll position */
  scrollY: SharedValue<number>;
  /** Parallax configuration (defaults to BACKDROP_PARALLAX) */
  config?: ParallaxConfig;
  /** Optional shared value for base image opacity (e.g., reduced on error) */
  imageOpacity?: SharedValue<number>;
  /** Optional shared value for image load fade-in opacity */
  imageLoadOpacity?: SharedValue<number>;
}

/**
 * Raw parallax values calculated from scroll position
 */
export interface ParallaxValues {
  /** Current scale value based on scroll */
  scale: number;
  /** Current vertical offset based on scroll */
  translateY: number;
}

/**
 * Return type for the useBackdropParallax hook
 */
export interface UseBackdropParallaxReturn {
  /** Animated style with parallax transforms (scale and translateY) */
  parallaxStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style with parallax transforms and combined opacity */
  parallaxStyleWithOpacity: ReturnType<typeof useAnimatedStyle>;
  /** Derived value containing raw parallax calculations */
  parallaxValues: ReturnType<typeof useDerivedValue<ParallaxValues>>;
  /** The parallax configuration being used */
  config: ParallaxConfig;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate parallax scale value based on scroll position
 *
 * @param scrollY - Current scroll position
 * @param config - Parallax configuration
 * @returns Calculated scale value (bounded by MAX_SCALE)
 */
export function calculateParallaxScale(
  scrollY: number,
  config: ParallaxConfig
): number {
  'worklet';
  const {
    DEFAULT_ZOOM,
    SCROLL_UP_MULTIPLIER,
    SCROLL_DOWN_MULTIPLIER,
    MAX_SCALE,
  } = config;

  // Negative scroll (pulling down) = more aggressive zoom
  // Positive scroll (scrolling up) = subtle zoom
  const scrollUpScale = DEFAULT_ZOOM + Math.abs(scrollY) * SCROLL_UP_MULTIPLIER;
  const scrollDownScale = DEFAULT_ZOOM + scrollY * SCROLL_DOWN_MULTIPLIER;

  const scale = scrollY < 0 ? scrollUpScale : scrollDownScale;

  return Math.min(scale, MAX_SCALE);
}

/**
 * Calculate parallax translate value based on scroll position
 *
 * @param scrollY - Current scroll position
 * @param parallaxFactor - Parallax movement factor (0-1)
 * @returns Calculated vertical offset
 */
export function calculateParallaxTranslate(
  scrollY: number,
  parallaxFactor: number
): number {
  'worklet';
  return scrollY * parallaxFactor;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Custom hook for parallax scroll animation calculations
 *
 * Provides animated styles and derived values for creating parallax effects
 * on backdrop images, trailer layers, or other scrollable content.
 *
 * The hook supports two usage patterns:
 * 1. `parallaxStyle` - Use when handling opacity separately
 * 2. `parallaxStyleWithOpacity` - Use when combining with opacity values
 *
 * @param props - Hook configuration props
 * @returns Object containing animated styles and derived parallax values
 */
export function useBackdropParallax({
  scrollY,
  config = BACKDROP_PARALLAX,
  imageOpacity,
  imageLoadOpacity,
}: UseBackdropParallaxProps): UseBackdropParallaxReturn {
  // ---------------------------------------------------------------------------
  // Memoize Configuration
  // ---------------------------------------------------------------------------

  /**
   * Memoize config to prevent unnecessary recalculations
   * when parent re-renders with same config values
   */
  const memoizedConfig = useMemo(() => config, [
    config.DEFAULT_ZOOM,
    config.SCROLL_UP_MULTIPLIER,
    config.SCROLL_DOWN_MULTIPLIER,
    config.MAX_SCALE,
    config.PARALLAX_FACTOR,
  ]);

  // ---------------------------------------------------------------------------
  // Derived Parallax Values
  // ---------------------------------------------------------------------------

  /**
   * Derived value containing raw parallax calculations
   *
   * This can be used when you need access to the raw values
   * outside of an animated style context (e.g., for debugging
   * or conditional logic in worklets)
   */
  const parallaxValues = useDerivedValue<ParallaxValues>(() => {
    'worklet';
    const scrollYValue = scrollY.value;
    const scale = calculateParallaxScale(scrollYValue, memoizedConfig);
    const translateY = calculateParallaxTranslate(
      scrollYValue,
      memoizedConfig.PARALLAX_FACTOR
    );

    return { scale, translateY };
  }, [scrollY, memoizedConfig]);

  // ---------------------------------------------------------------------------
  // Animated Styles
  // ---------------------------------------------------------------------------

  /**
   * Base parallax animated style (transforms only)
   *
   * Use this style when:
   * - Opacity is handled separately by the component
   * - You only need scale and translateY transforms
   * - Combining with other animated styles that include opacity
   *
   * Uses worklet directive for optimal UI thread performance
   */
  const parallaxStyle = useAnimatedStyle(() => {
    'worklet';
    const { scale, translateY } = parallaxValues.value;

    return {
      transform: [
        { scale },
        { translateY },
      ],
    };
  }, [parallaxValues]);

  /**
   * Parallax animated style with combined opacity
   *
   * Use this style when:
   * - You want parallax transforms AND opacity in one style
   * - Both imageOpacity and imageLoadOpacity are provided
   * - You want the "load fade-in" effect with parallax
   *
   * The combined opacity is: imageOpacity * imageLoadOpacity
   * This allows for:
   * - Base opacity control (e.g., dim on error)
   * - Load fade-in animation (opacity 0 → 1 on load)
   *
   * Uses worklet directive for optimal UI thread performance
   */
  const parallaxStyleWithOpacity = useAnimatedStyle(() => {
    'worklet';
    const { scale, translateY } = parallaxValues.value;

    // Calculate combined opacity if both values are provided
    // Default to 1 if either opacity value is not provided
    const baseOpacity = imageOpacity?.value ?? 1;
    const loadOpacity = imageLoadOpacity?.value ?? 1;
    const combinedOpacity = baseOpacity * loadOpacity;

    return {
      opacity: combinedOpacity,
      transform: [
        { scale },
        { translateY },
      ],
    };
  }, [parallaxValues, imageOpacity, imageLoadOpacity]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    parallaxStyle,
    parallaxStyleWithOpacity,
    parallaxValues,
    config: memoizedConfig,
  };
}

// =============================================================================
// Preset Hook Variants
// =============================================================================

/**
 * Pre-configured hook for backdrop image parallax effects
 *
 * Uses BACKDROP_PARALLAX config which has:
 * - More aggressive zoom on pull-down (1.1 base + 0.002 multiplier)
 * - Max scale of 1.4
 * - 30% parallax factor
 *
 * @param scrollY - Shared value tracking scroll position
 * @param imageOpacity - Optional base opacity
 * @param imageLoadOpacity - Optional load fade opacity
 * @returns Parallax style and values configured for backdrop images
 *
 * @example
 * ```tsx
 * const { parallaxStyle } = useBackdropImageParallax(scrollY);
 * return <Animated.Image style={parallaxStyle} source={...} />;
 * ```
 */
export function useBackdropImageParallax(
  scrollY: SharedValue<number>,
  imageOpacity?: SharedValue<number>,
  imageLoadOpacity?: SharedValue<number>
): UseBackdropParallaxReturn {
  return useBackdropParallax({
    scrollY,
    config: BACKDROP_PARALLAX,
    imageOpacity,
    imageLoadOpacity,
  });
}

/**
 * Pre-configured hook for trailer layer parallax effects
 *
 * Uses TRAILER_PARALLAX config which has:
 * - Less aggressive zoom than backdrop (1.0 base + 0.0015 multiplier)
 * - Max scale of 1.25
 * - 20% parallax factor
 *
 * This creates a subtler parallax effect appropriate for video content
 * where excessive zoom could cause visual distortion.
 *
 * @param scrollY - Shared value tracking scroll position
 * @returns Parallax style and values configured for trailer layers
 *
 * @example
 * ```tsx
 * const { parallaxStyle } = useTrailerLayerParallax(scrollY);
 * return <Animated.View style={parallaxStyle}><Video .../></Animated.View>;
 * ```
 */
export function useTrailerLayerParallax(
  scrollY: SharedValue<number>
): UseBackdropParallaxReturn {
  return useBackdropParallax({
    scrollY,
    config: TRAILER_PARALLAX,
  });
}

export default useBackdropParallax;
