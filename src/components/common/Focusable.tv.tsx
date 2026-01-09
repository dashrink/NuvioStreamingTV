/**
 * TV-Optimized Focusable Component
 *
 * Provides advanced focus handling for Android TV and Apple TV platforms.
 *
 * Features:
 * - Animated scaling on focus with spring physics
 * - Configurable focus ring/glow with theme integration
 * - Explicit spatial navigation via nextFocus* props
 * - Apple TV Parallax effect support
 * - Focus state management with callbacks
 *
 * This file is automatically loaded by Metro bundler on TV platforms.
 * For mobile platforms, see Focusable.tsx (simple Pressable fallback).
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Pressable,
  Platform,
  StyleSheet,
  findNodeHandle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { FocusableProps, TV_FOCUS_STYLES } from './Focusable.shared';

// Create an Animated version of Pressable for TV scale animations
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * TV-optimized Focusable component with animations and spatial navigation
 */
const Focusable = React.forwardRef<any, FocusableProps>(
  (
    {
      children,
      onPress,
      onPressIn,
      onPressOut,
      onLongPress,
      activeOpacity = 0.7, // Not used on TV but kept for interface compatibility
      style,
      focusedStyle,
      scaleOnFocus = TV_FOCUS_STYLES.scaleDefault,
      onFocus,
      onBlur,
      hasTVPreferredFocus,
      focusKey,
      nextFocusUp,
      nextFocusDown,
      nextFocusLeft,
      nextFocusRight,
      disabled,
      testID,
      hitSlop,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const scale = useSharedValue(1);
    const pressableRef = useRef<any>(null);

    // Expose ref for external use
    React.useImperativeHandle(ref, () => pressableRef.current);

    // Default border-based focus style using theme color with enhanced visibility
    const focusColor = currentTheme?.colors?.primary || TV_FOCUS_STYLES.fallbackColor;
    const defaultFocusedStyle = useMemo(
      () => ({
        borderWidth: TV_FOCUS_STYLES.borderWidth,
        borderColor: focusColor,
        // Enhanced shadow/glow effect for TV viewing distance
        shadowColor: focusColor,
        shadowOffset: TV_FOCUS_STYLES.focusShadow.shadowOffset,
        shadowOpacity: TV_FOCUS_STYLES.focusShadow.shadowOpacity,
        shadowRadius: TV_FOCUS_STYLES.focusShadow.shadowRadius,
        elevation: TV_FOCUS_STYLES.focusShadow.elevation,
      }),
      [focusColor]
    );

    const animatedStyle = useAnimatedStyle(() => {
      // For Apple TV, we prefer the native parallax effect over manual scaling
      if (Platform.OS === 'ios') return {};

      // Android TV: Apply scaling animations
      return {
        transform: [
          {
            scale: withSpring(scale.value, {
              damping: 15,
              stiffness: 150,
              mass: 0.8,
            }),
          },
        ],
      };
    });

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      scale.value = scaleOnFocus;
      onFocus?.();
    }, [scaleOnFocus, onFocus, scale]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      scale.value = 1;
      onBlur?.();
    }, [onBlur, scale]);

    // Helper to resolve ref to node handle for spatial navigation
    const resolveNextFocus = (
      target: number | React.RefObject<any> | undefined
    ): number | undefined => {
      if (typeof target === 'number') return target;
      if (target?.current) return findNodeHandle(target.current) ?? undefined;
      return undefined;
    };

    // TV implementation: Animated scaling and spatial navigation
    return (
      <AnimatedPressable
        ref={pressableRef}
        focusable={true} // Explicit focusable prop for TV
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={onLongPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        testID={testID}
        hitSlop={hitSlop}
        //@ts-ignore - TV-only props not in standard RN types
        hasTVPreferredFocus={hasTVPreferredFocus}
        //@ts-ignore
        nextFocusUp={resolveNextFocus(nextFocusUp)}
        //@ts-ignore
        nextFocusDown={resolveNextFocus(nextFocusDown)}
        //@ts-ignore
        nextFocusLeft={resolveNextFocus(nextFocusLeft)}
        //@ts-ignore
        nextFocusRight={resolveNextFocus(nextFocusRight)}
        //@ts-ignore - Apple TV Parallax effect
        tvParallaxProperties={{
          enabled: true,
          magnification: scaleOnFocus,
          pressMagnification: 1.0,
        }}
        style={[
          style,
          animatedStyle,
          // Apply default border-based focus style only if no custom focusedStyle provided
          isFocused && !focusedStyle && defaultFocusedStyle,
          isFocused && focusedStyle,
          disabled && { opacity: 0.5 },
        ]}
      >
        {children}
      </AnimatedPressable>
    );
  }
);

Focusable.displayName = 'Focusable';

export default React.memo(Focusable);
