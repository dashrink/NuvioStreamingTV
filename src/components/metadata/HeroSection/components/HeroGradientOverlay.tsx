/**
 * HeroGradientOverlay Component
 *
 * Provides the gradient overlay effect for the HeroSection with dynamic background
 * color support. Creates a smooth fade from transparent at the top to the background
 * color at the bottom, ensuring content is readable over backdrop images/videos.
 *
 * Consists of two nested LinearGradient layers:
 * 1. Outer gradient: Main fade from transparent to background color
 * 2. Inner gradient: Enhanced bottom fade for stronger visual effect
 *
 * @module HeroSection/components/HeroGradientOverlay
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../../../contexts/ThemeContext';
import { isTablet, spacing, sizes } from '../styles';

import type { HeroGradientOverlayProps } from '../types';

/**
 * Gradient overlay component that wraps hero content with fade effects.
 *
 * Renders two layered gradients to create a smooth transition from the
 * backdrop image/video to the background color. Supports dynamic background
 * colors extracted from content or falls back to the theme's dark background.
 *
 * @param props - Component props
 * @param props.dynamicBackgroundColor - Optional dynamic color from content. Falls back to theme darkBackground.
 * @param props.animatedStyle - Optional animated style for scroll-based animations
 * @param props.children - Content to render inside the gradient (title, genres, buttons, etc.)
 *
 * @example
 * ```tsx
 * <HeroGradientOverlay
 *   dynamicBackgroundColor="#1a1a2e"
 *   animatedStyle={heroAnimatedStyle}
 * >
 *   <HeroTitleCard {...titleProps} />
 *   <HeroGenres {...genreProps} />
 *   <ActionButtons {...buttonProps} />
 * </HeroGradientOverlay>
 * ```
 */
const HeroGradientOverlay = memo(
  ({
    dynamicBackgroundColor,
    // animatedStyle is available for future use but currently the gradient itself
    // is static - animations are applied to the parent container or child elements
    children,
  }: HeroGradientOverlayProps) => {
    const { currentTheme } = useTheme();

    // Determine the background color to use for the gradient
    const backgroundColor = dynamicBackgroundColor || currentTheme.colors.darkBackground;

    /**
     * Memoized colors for the outer gradient layer.
     * Fades from transparent at top to the background color at bottom.
     */
    const outerGradientColors = useMemo(
      () =>
        [
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0.05)',
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0.35)',
          'rgba(0,0,0,0.65)',
          backgroundColor,
        ] as const,
      [backgroundColor]
    );

    /**
     * Memoized colors for the inner bottom fade gradient.
     * Provides enhanced fade effect with more color stops for smoother transition.
     */
    const innerGradientColors = useMemo(
      () =>
        [
          'transparent',
          `${backgroundColor}10`, // 10% opacity
          `${backgroundColor}25`, // 25% opacity
          `${backgroundColor}45`, // 45% opacity
          `${backgroundColor}65`, // 65% opacity
          `${backgroundColor}85`, // 85% opacity
          `${backgroundColor}95`, // 95% opacity
          backgroundColor, // 100% opacity
        ] as const,
      [backgroundColor]
    );

    return (
      <LinearGradient
        colors={outerGradientColors}
        locations={[0, 0.3, 0.55, 0.75, 0.9, 1]}
        style={styles.heroGradient}
      >
        {/* Enhanced bottom fade with stronger gradient */}
        <LinearGradient
          colors={innerGradientColors}
          locations={[0, 0.1, 0.25, 0.4, 0.6, 0.75, 0.9, 1]}
          style={styles.bottomFadeGradient}
          pointerEvents="none"
        />

        {/* Hero content container */}
        <View style={[styles.heroContent, isTablet && styles.tabletHeroContent]}>{children}</View>
      </LinearGradient>
    );
  }
);

const styles = StyleSheet.create({
  /**
   * Main gradient container that fills the hero section
   * and positions content at the bottom.
   */
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },

  /**
   * Enhanced bottom fade gradient positioned at the bottom
   * of the hero section for stronger visual effect.
   */
  bottomFadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 400,
    zIndex: 1,
  },

  /**
   * Content container with responsive padding.
   * Positions above the gradient layers.
   */
  heroContent: {
    padding: spacing.contentPadding,
    paddingTop: spacing.contentPaddingVertical,
    paddingBottom: spacing.contentPaddingVertical,
    position: 'relative',
    zIndex: 2,
  },

  /**
   * Tablet-specific content container with max width
   * for centered layout on larger screens.
   */
  tabletHeroContent: {
    maxWidth: sizes.maxHeroContentWidth,
    alignSelf: 'center',
  },
});

export default HeroGradientOverlay;
