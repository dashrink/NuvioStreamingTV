import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import TraktIcon from '../../../assets/rating-icons/trakt.svg';
import { LOADING_ANIMATION_DURATIONS, LoadingSize } from '../loading/types';

/**
 * Animation duration for branded loading spinners
 * Uses half of shimmer duration for pulse cycle to create visual harmony
 */
export const BRANDED_PULSE_DURATION = LOADING_ANIMATION_DURATIONS.shimmer / 2; // 750ms

/**
 * Size dimensions for TraktLoadingSpinner
 */
const TRAKT_SPINNER_SIZE: Record<LoadingSize, number> = {
  small: 40,
  medium: 80,
  large: 120,
} as const;

/**
 * Props for TraktLoadingSpinner component
 */
export interface TraktLoadingSpinnerProps {
  /** Size variant of the loading indicator */
  size?: LoadingSize;
  /** Optional loading text to display below the icon */
  text?: string;
  /** Custom container style */
  style?: ViewStyle;
  /** Test identifier for testing frameworks */
  testID?: string;
  /** Vertical offset from center */
  offsetY?: number;
}

/**
 * TraktLoadingSpinner - Branded loading spinner for Trakt-specific operations
 *
 * A specialized loading component that displays the Trakt logo with a pulsing
 * animation. This component is part of the unified loading system but maintains
 * Trakt branding for screens and operations related to Trakt.tv integration.
 *
 * **Loading Variant:** branded
 *
 * Features:
 * - Branded Trakt logo with recognizable visual identity
 * - Pulsing animation (opacity + scale) synchronized with unified timing
 * - Three sizes: small (40px), medium (80px), large (120px)
 * - Optional loading text display
 * - Uses native driver for smooth 60fps animations
 *
 * @example
 * // Basic usage (medium size)
 * <TraktLoadingSpinner />
 *
 * @example
 * // With loading text
 * <TraktLoadingSpinner text="Syncing with Trakt..." />
 *
 * @example
 * // Small size for inline contexts
 * <TraktLoadingSpinner size="small" />
 *
 * @example
 * // Large size for full-screen loading
 * <TraktLoadingSpinner size="large" text="Connecting to Trakt..." />
 */
export const TraktLoadingSpinner: React.FC<TraktLoadingSpinnerProps> = ({
  size = 'medium',
  text,
  style,
  testID,
  offsetY = -60,
}) => {
  const pulseValue = useRef(new Animated.Value(0)).current;
  const iconSize = TRAKT_SPINNER_SIZE[size];

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: BRANDED_PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: BRANDED_PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseValue]);

  const opacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });

  const scale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });

  return (
    <View
      style={[
        styles.container,
        { transform: [{ translateY: offsetY }] },
        style,
      ]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={text || 'Loading Trakt data'}
    >
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <TraktIcon width={iconSize} height={iconSize} />
      </Animated.View>
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
}); 