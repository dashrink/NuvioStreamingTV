/**
 * HeroBackdrop Component
 *
 * Renders the background thumbnail image for the HeroSection with:
 * - Parallax scroll effects (zoom and translate based on scroll position)
 * - Lazy loading with smooth fade-in transitions
 * - Error handling with graceful degradation
 *
 * The parallax effect creates visual depth:
 * - Pulling down (negative scroll): Image zooms in more aggressively
 * - Scrolling up (positive scroll): Image zooms slightly with vertical offset
 *
 * @module HeroSection/components/HeroBackdrop
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BACKDROP_PARALLAX, UI_TIMING } from '../constants';
import { layoutStyles } from '../styles';

import type { HeroBackdropProps } from '../types';

/**
 * Background backdrop image with parallax scroll effects.
 *
 * Implements a responsive parallax system that responds to scroll gestures:
 * - When the user pulls down (scroll < 0), the image zooms in more aggressively
 *   creating a "pull to peek" effect
 * - When scrolling up normally, the image moves with a subtle parallax offset
 *   and slight zoom for depth perception
 *
 * The component manages its own load state for smooth fade-in transitions
 * and handles image loading errors gracefully by showing a partially opaque
 * fallback state.
 *
 * @param props - Component props
 * @param props.bannerImage - URL of the banner image to display. Can be null if not yet loaded.
 * @param props.loadingBanner - Whether the banner image is currently being fetched
 * @param props.scrollY - Shared value from react-native-reanimated tracking scroll position
 * @param props.animatedStyle - Optional additional animated styles from parent
 *
 * @example
 * ```tsx
 * <HeroBackdrop
 *   bannerImage={metadata.banner}
 *   loadingBanner={isLoading}
 *   scrollY={scrollY}
 * />
 * ```
 */
const HeroBackdrop = memo(
  ({ bannerImage, loadingBanner, scrollY, animatedStyle }: HeroBackdropProps) => {
    // Local shared values for smooth opacity transitions
    // imageOpacity: Base opacity (reduced on error)
    // imageLoadOpacity: Fade-in opacity when image loads successfully
    const imageOpacity = useSharedValue(1);
    const imageLoadOpacity = useSharedValue(0);

    /**
     * Handle image load error.
     * Reduces opacity to indicate degraded state but keeps image visible
     * in case a cached version is partially available.
     */
    const handleImageError = useCallback(() => {
      imageOpacity.value = withTiming(0.6, { duration: UI_TIMING.IMAGE_FADE });
      imageLoadOpacity.value = withTiming(0, { duration: UI_TIMING.IMAGE_FADE });
    }, [imageOpacity, imageLoadOpacity]);

    /**
     * Handle successful image load.
     * Triggers smooth fade-in animation for polished appearance.
     */
    const handleImageLoad = useCallback(() => {
      imageOpacity.value = withTiming(1, { duration: UI_TIMING.IMAGE_FADE });
      imageLoadOpacity.value = withTiming(1, { duration: UI_TIMING.IMAGE_LOAD });
    }, [imageOpacity, imageLoadOpacity]);

    /**
     * Animated style for the backdrop image with parallax effects.
     *
     * The parallax calculation creates visual depth through two mechanisms:
     * 1. Scale: Image zooms based on scroll direction and amount
     *    - Pulling down (scrollY < 0): More aggressive zoom (SCROLL_UP_MULTIPLIER)
     *    - Scrolling up (scrollY > 0): Subtle zoom (SCROLL_DOWN_MULTIPLIER)
     * 2. TranslateY: Vertical offset creates parallax movement effect
     *
     * Both effects are bounded to prevent extreme values.
     */
    const backdropImageStyle = useAnimatedStyle(() => {
      'worklet';
      const scrollYValue = scrollY.value;

      // Destructure constants for cleaner code in worklet
      const {
        DEFAULT_ZOOM,
        SCROLL_UP_MULTIPLIER,
        SCROLL_DOWN_MULTIPLIER,
        MAX_SCALE,
        PARALLAX_FACTOR,
      } = BACKDROP_PARALLAX;

      // Calculate scale based on scroll direction
      // Negative scroll (pulling down) = more aggressive zoom
      // Positive scroll (scrolling up) = subtle zoom
      const scrollUpScale = DEFAULT_ZOOM + Math.abs(scrollYValue) * SCROLL_UP_MULTIPLIER;
      const scrollDownScale = DEFAULT_ZOOM + scrollYValue * SCROLL_DOWN_MULTIPLIER;
      const scale = Math.min(scrollYValue < 0 ? scrollUpScale : scrollDownScale, MAX_SCALE);

      // Calculate parallax vertical offset
      const parallaxOffset = scrollYValue * PARALLAX_FACTOR;

      return {
        opacity: imageOpacity.value * imageLoadOpacity.value,
        transform: [{ scale }, { translateY: parallaxOffset }],
      };
    }, [imageOpacity, imageLoadOpacity]);

    // Don't render if no image is available or still loading
    if (!bannerImage || loadingBanner) {
      return null;
    }

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        <Animated.Image
          source={{ uri: bannerImage }}
          style={[styles.image, backdropImageStyle]}
          resizeMode="cover"
          onError={handleImageError}
          onLoad={handleImageLoad}
          accessibilityLabel="Content backdrop image"
          accessibilityRole="image"
        />
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  /**
   * Container fills the parent absolutely.
   * Positions at top to align with hero wrapper which may extend above
   * the visible area for parallax effects.
   */
  container: {
    ...layoutStyles.absoluteFill,
  },

  /**
   * Image fills the container absolutely.
   * Uses absolute positioning to allow scale transforms
   * without affecting layout.
   */
  image: {
    ...layoutStyles.absoluteFill,
  },
});

export default HeroBackdrop;
