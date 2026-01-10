/**
 * GlassBlurBackground Component
 *
 * A reusable platform-specific blur effect component that provides
 * glassmorphism styling with appropriate fallbacks for each platform.
 *
 * Platform behavior:
 * - iOS: Uses GlassView (expo-glass-effect) when liquid glass is available,
 *        otherwise falls back to ExpoBlurView (expo-blur)
 * - Android: Uses a semi-transparent View as fallback (blur effects not native)
 *
 * @module HeroSection/components/GlassBlurBackground
 */

import React, { memo } from 'react';
import { Platform, View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';

import type { GlassBlurBackgroundProps } from '../types';
import { BLUR_CONFIG } from '../constants';
import { layoutStyles } from '../styles';

// =============================================================================
// iOS Glass Effect Support
// =============================================================================

/**
 * GlassView component from expo-glass-effect (optional, iOS only)
 * Dynamically required to prevent crashes if package is not installed
 */
let GlassViewComp: React.ComponentType<{
  style?: ViewStyle;
  glassEffectStyle?: 'regular' | 'subtle' | 'prominent';
}> | null = null;

/**
 * Flag indicating whether liquid glass effect is available on the device
 * (iOS 26+ with supported hardware)
 */
let liquidGlassAvailable = false;

// Only attempt to load expo-glass-effect on iOS
if (Platform.OS === 'ios') {
  try {
    // Dynamically require so app still runs if the package isn't installed
    const glass = require('expo-glass-effect');
    GlassViewComp = glass.GlassView;
    liquidGlassAvailable =
      typeof glass.isLiquidGlassAvailable === 'function'
        ? glass.isLiquidGlassAvailable()
        : false;
  } catch {
    // Package not available, use fallback
    GlassViewComp = null;
    liquidGlassAvailable = false;
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Platform-specific blur background component for glassmorphism effects.
 *
 * Automatically selects the best available blur implementation:
 * 1. iOS with liquid glass: expo-glass-effect GlassView
 * 2. iOS without liquid glass: expo-blur BlurView
 * 3. Android: Semi-transparent View fallback
 *
 * @param props - Component props
 * @param props.intensity - Blur intensity (0-100), default from BLUR_CONFIG
 * @param props.style - Optional additional styles for the blur container
 * @param props.children - Optional children to render above the blur layer
 *
 * @example
 * ```tsx
 * // Basic usage with default intensity
 * <GlassBlurBackground style={styles.myContainer}>
 *   <Text>Content above blur</Text>
 * </GlassBlurBackground>
 *
 * // Custom intensity for stronger blur
 * <GlassBlurBackground intensity={80} style={styles.button}>
 *   <Icon name="play" />
 * </GlassBlurBackground>
 * ```
 */
const GlassBlurBackground = memo(function GlassBlurBackground({
  intensity = BLUR_CONFIG.DEFAULT_INTENSITY,
  style,
  children,
}: GlassBlurBackgroundProps) {
  /**
   * Renders the appropriate blur implementation based on platform capabilities
   */
  const renderBlurLayer = () => {
    if (Platform.OS === 'ios') {
      // iOS: Use GlassView if liquid glass is available, otherwise ExpoBlurView
      if (GlassViewComp && liquidGlassAvailable) {
        return (
          <GlassViewComp
            style={[styles.blurLayer, style]}
            glassEffectStyle="regular"
          />
        );
      }

      // Fallback to ExpoBlurView on iOS
      return (
        <ExpoBlurView
          intensity={intensity}
          style={[styles.blurLayer, style]}
          tint="dark"
        />
      );
    }

    // Android: Use semi-transparent View fallback
    return (
      <View
        style={[
          styles.blurLayer,
          styles.androidFallback,
          style,
        ]}
      />
    );
  };

  return (
    <>
      {renderBlurLayer()}
      {children}
    </>
  );
});

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  /**
   * Base blur layer - fills parent container
   */
  blurLayer: {
    ...layoutStyles.absoluteFill,
  } as ViewStyle,

  /**
   * Android fallback with semi-transparent background
   * Uses BLUR_CONFIG.ANDROID_FALLBACK_OPACITY for consistent appearance
   */
  androidFallback: {
    backgroundColor: `rgba(255,255,255,${BLUR_CONFIG.ANDROID_FALLBACK_OPACITY})`,
  } as ViewStyle,
});

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Check if native liquid glass effect is available on the current device
 * @returns true if expo-glass-effect GlassView can be used
 */
export const isLiquidGlassAvailable = (): boolean => liquidGlassAvailable;

/**
 * Check if any blur effect is available (always true, fallback exists)
 * @returns true (blur or fallback is always available)
 */
export const isBlurAvailable = (): boolean => true;

export default GlassBlurBackground;
