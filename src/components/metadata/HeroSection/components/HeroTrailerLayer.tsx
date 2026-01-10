/**
 * HeroTrailerLayer Component
 *
 * Renders the trailer video player container for the HeroSection with:
 * - Preload and visible states for smooth transitions
 * - Opacity transitions for fade in/out effects
 * - Parallax scroll effects (zoom and translate based on scroll position)
 *
 * The parallax effect creates visual depth similar to HeroBackdrop:
 * - Pulling down (negative scroll): Video zooms in more aggressively
 * - Scrolling up (positive scroll): Video zooms slightly with vertical offset
 *
 * Architecture:
 * - Renders a single TrailerPlayer wrapped in an Animated.View
 * - Parent component controls preload vs visible state
 * - Opacity is controlled via animatedStyle prop from parent
 *
 * @module HeroSection/components/HeroTrailerLayer
 */

import React, { memo, forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import TrailerPlayer from '../../../video/TrailerPlayer';
import type { HeroTrailerLayerProps } from '../types';
import { TRAILER_PARALLAX } from '../constants';
import { layoutStyles } from '../styles';

/**
 * Trailer video layer with parallax scroll effects and opacity transitions.
 *
 * Implements a responsive parallax system similar to HeroBackdrop:
 * - When the user pulls down (scroll < 0), the video zooms in aggressively
 * - When scrolling up normally, the video moves with a subtle parallax offset
 *
 * The component supports two modes via parent state:
 * 1. Preload mode: Hidden player that loads the video in the background
 * 2. Visible mode: Visible player with opacity transitions and parallax
 *
 * @param props - Component props
 * @param props.trailerUrl - URL of the trailer video. Can be null if not loaded.
 * @param props.isReady - Whether the trailer has been preloaded and is ready
 * @param props.isVisible - Whether the trailer should be visible (vs preloading)
 * @param props.isMuted - Whether the trailer audio is muted
 * @param props.scrollY - Shared value tracking scroll position for parallax
 * @param props.onReady - Callback when trailer finishes loading/becomes ready
 * @param props.onEnd - Callback when trailer playback ends
 * @param props.onError - Callback when trailer encounters an error
 * @param props.animatedStyle - Animated style from parent (typically opacity)
 * @param props.autoPlay - Whether to auto-play when visible
 * @param ref - Forwarded ref to the TrailerPlayer component
 *
 * @example
 * ```tsx
 * // Preload mode (hidden)
 * <HeroTrailerLayer
 *   trailerUrl={trailerUrl}
 *   isReady={false}
 *   isVisible={false}
 *   isMuted={true}
 *   scrollY={scrollY}
 *   onReady={handleTrailerPreloaded}
 *   onError={handleTrailerError}
 * />
 *
 * // Visible mode (shown with parallax)
 * <HeroTrailerLayer
 *   ref={trailerVideoRef}
 *   trailerUrl={trailerUrl}
 *   isReady={true}
 *   isVisible={true}
 *   isMuted={trailerMuted}
 *   scrollY={scrollY}
 *   animatedStyle={{ opacity: trailerOpacity }}
 *   onReady={handleTrailerReady}
 *   onEnd={handleTrailerEnd}
 *   onError={handleTrailerError}
 *   autoPlay={globalTrailerPlaying}
 * />
 * ```
 */
const HeroTrailerLayer = memo(
  forwardRef<any, HeroTrailerLayerProps>(function HeroTrailerLayer(
    {
      trailerUrl,
      isReady,
      isVisible,
      isMuted,
      scrollY,
      onReady,
      onEnd,
      onError,
      animatedStyle,
      autoPlay = false,
      onPlaybackStatusUpdate,
      onFullscreenToggle,
    },
    ref
  ) {
    /**
     * Animated style for parallax effects.
     *
     * The parallax calculation creates visual depth through two mechanisms:
     * 1. Scale: Video zooms based on scroll direction and amount
     *    - Pulling down (scrollY < 0): More aggressive zoom (SCROLL_UP_MULTIPLIER)
     *    - Scrolling up (scrollY > 0): Subtle zoom (SCROLL_DOWN_MULTIPLIER)
     * 2. TranslateY: Vertical offset creates parallax movement effect
     *
     * Both effects are bounded to prevent extreme values.
     */
    const parallaxStyle = useAnimatedStyle(() => {
      'worklet';
      const scrollYValue = scrollY.value;

      // Destructure constants for cleaner code in worklet
      const {
        DEFAULT_ZOOM,
        SCROLL_UP_MULTIPLIER,
        SCROLL_DOWN_MULTIPLIER,
        MAX_SCALE,
        PARALLAX_FACTOR,
      } = TRAILER_PARALLAX;

      // Calculate scale based on scroll direction
      // Negative scroll (pulling down) = more aggressive zoom
      // Positive scroll (scrolling up) = subtle zoom
      const scrollUpScale =
        DEFAULT_ZOOM + Math.abs(scrollYValue) * SCROLL_UP_MULTIPLIER;
      const scrollDownScale =
        DEFAULT_ZOOM + scrollYValue * SCROLL_DOWN_MULTIPLIER;
      const scale = Math.min(
        scrollYValue < 0 ? scrollUpScale : scrollDownScale,
        MAX_SCALE
      );

      // Calculate parallax vertical offset
      const parallaxOffset = scrollYValue * PARALLAX_FACTOR;

      return {
        transform: [{ scale }, { translateY: parallaxOffset }],
      };
    }, []);

    /**
     * Combined styles for the visible trailer container.
     * Merges absoluteFill, parallax effects, and parent-provided animated styles.
     */
    const visibleContainerStyle = useMemo(() => {
      return [styles.container, parallaxStyle, animatedStyle];
    }, [parallaxStyle, animatedStyle]);

    // Don't render if no trailer URL is provided
    if (!trailerUrl) {
      return null;
    }

    // Preload mode: Hidden player that loads in the background
    // This allows the video to buffer before becoming visible
    if (!isReady && !isVisible) {
      return (
        <View style={styles.preloadContainer}>
          <TrailerPlayer
            key={`preload-${trailerUrl}`}
            trailerUrl={trailerUrl}
            autoPlay={false}
            muted={true}
            style={styles.player}
            hideLoadingSpinner={true}
            hideControls={true}
            onLoad={onReady}
            onError={onError ? (error: string) => onError() : undefined}
          />
        </View>
      );
    }

    // Visible mode: Player with parallax and opacity transitions
    // Only render when preloaded (isReady) and should be visible
    if (isReady && isVisible) {
      return (
        <Animated.View style={visibleContainerStyle}>
          <TrailerPlayer
            key={`visible-${trailerUrl}`}
            ref={ref}
            trailerUrl={trailerUrl}
            autoPlay={autoPlay}
            muted={isMuted}
            style={styles.player}
            hideLoadingSpinner={true}
            hideControls={true}
            onLoad={onReady}
            onError={onError ? (error: string) => onError() : undefined}
            onEnd={onEnd}
            onFullscreenToggle={onFullscreenToggle}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />
        </Animated.View>
      );
    }

    // Don't render anything if in an intermediate state
    return null;
  })
);

const styles = StyleSheet.create({
  /**
   * Container fills the parent absolutely and applies parallax transforms.
   */
  container: {
    ...layoutStyles.absoluteFill,
  },

  /**
   * Preload container is hidden but positioned absolutely.
   * Uses opacity 0 and pointerEvents 'none' to be invisible
   * but still allow video to load in the background.
   */
  preloadContainer: {
    ...layoutStyles.absoluteFill,
    opacity: 0,
    pointerEvents: 'none',
  },

  /**
   * Player fills the container absolutely.
   */
  player: {
    ...layoutStyles.absoluteFill,
  },
});

export default HeroTrailerLayer;
