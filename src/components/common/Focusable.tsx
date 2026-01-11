import React, { forwardRef, ReactNode, useMemo } from 'react';
import {
  View,
  ViewStyle,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  Pressable,
  PressableProps,
  GestureResponderEvent,
  StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';

import { useTVFocus, UseTVFocusOptions, TVParallaxProperties } from '../../hooks/useTVFocus';
import {
  FocusVariant,
  getFocusStyleConfig,
  focusBorder,
  focusColors,
  focusScaleValues,
  focusShadow,
} from '../../styles/focusStyles';

/**
 * Props for the Focusable wrapper component
 */
export interface FocusableProps extends UseTVFocusOptions {
  /** Children to wrap with focus indicator */
  children: ReactNode;
  /** Focus style variant determining border, scale, and shadow styles */
  variant?: FocusVariant;
  /** Custom border radius override */
  borderRadius?: number;
  /** Enable/disable scale animation on focus */
  enableScale?: boolean;
  /** Enable/disable glow/shadow effect on focus */
  enableGlow?: boolean;
  /** Enable/disable border animation on focus */
  enableBorder?: boolean;
  /** Container style applied to the outer animated view */
  style?: StyleProp<ViewStyle>;
  /** Additional style applied when focused */
  focusedStyle?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
  /** Touch events - onPress callback */
  onPress?: (event: GestureResponderEvent) => void;
  /** Touch events - onLongPress callback */
  onLongPress?: (event: GestureResponderEvent) => void;
  /** Touch events - onPressIn callback */
  onPressIn?: (event: GestureResponderEvent) => void;
  /** Touch events - onPressOut callback */
  onPressOut?: (event: GestureResponderEvent) => void;
  /** Make the focusable element active opacity for touch feedback */
  activeOpacity?: number;
  /** Disable all touch and focus interactions */
  disabled?: boolean;
  /** Use Pressable instead of TouchableOpacity for children wrapper */
  usePressable?: boolean;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /**
   * Android TV: Native ID for D-pad navigation references
   * Other Focusable components can use this ID in nextFocusDown/Up/Left/Right
   */
  nativeID?: string;
  /**
   * tvOS: Parallax properties for Siri Remote navigation effect
   * Creates a subtle 3D tilt effect when navigating with Siri Remote
   */
  tvParallaxProperties?: TVParallaxProperties;
}

/**
 * Animated wrapper components for smooth focus transitions
 */
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A reusable wrapper component that provides consistent focus indicators
 * for TV remote navigation. Wraps any interactive element with animated
 * border, scale, and glow effects.
 *
 * @example
 * ```tsx
 * // Basic card usage
 * <Focusable variant="card" onPress={() => navigate('Details')}>
 *   <View style={styles.posterCard}>
 *     <Image source={{ uri: poster }} />
 *     <Text>{title}</Text>
 *   </View>
 * </Focusable>
 *
 * // Button with custom styling
 * <Focusable
 *   variant="button"
 *   borderRadius={20}
 *   enableGlow={false}
 *   onPress={handleSubmit}
 * >
 *   <Text style={styles.buttonText}>Submit</Text>
 * </Focusable>
 *
 * // List item without scale effect
 * <Focusable variant="listItem" enableScale={false}>
 *   <SettingsRow title="Notifications" />
 * </Focusable>
 * ```
 */
const Focusable = forwardRef<View, FocusableProps>(
  (
    {
      children,
      variant = 'card',
      borderRadius: customBorderRadius,
      enableScale = true,
      enableGlow = true,
      enableBorder = true,
      style,
      focusedStyle,
      testID,
      onPress,
      onLongPress,
      onPressIn,
      onPressOut,
      activeOpacity = 0.8,
      disabled = false,
      usePressable = false,
      accessibilityLabel,
      accessibilityHint,
      nativeID,
      // Focus hook options
      onFocus,
      onBlur,
      hasTVPreferredFocus,
      focusable = true,
      animationDuration,
      // Android TV D-pad navigation options
      nextFocusDown,
      nextFocusUp,
      nextFocusLeft,
      nextFocusRight,
      nextFocusForward,
      // tvOS parallax options
      tvParallaxProperties,
    },
    ref
  ) => {
    // Get focus state and animation from hook
    const { isFocused, focusAnim, focusProps, isTV, isTVFocusEnabled } = useTVFocus({
      onFocus,
      onBlur,
      hasTVPreferredFocus,
      focusable: focusable && !disabled,
      animationDuration,
      disabled,
      // Android TV D-pad navigation options
      nextFocusDown,
      nextFocusUp,
      nextFocusLeft,
      nextFocusRight,
      nextFocusForward,
      // tvOS parallax options
      tvParallaxProperties,
    });

    // Get style configuration for the variant
    const styleConfig = useMemo(() => getFocusStyleConfig(variant), [variant]);

    // Use custom border radius or variant default
    const borderRadius = customBorderRadius ?? styleConfig.borderRadius;

    // Get scale values based on variant
    const scaleValues = useMemo(() => {
      switch (variant) {
        case 'card':
          return focusScaleValues.card;
        case 'button':
          return focusScaleValues.button;
        case 'listItem':
          return focusScaleValues.listItem;
        case 'hero':
          return focusScaleValues.hero;
        default:
          return focusScaleValues.default;
      }
    }, [variant]);

    // Animated style for focus effects
    const animatedFocusStyle = useAnimatedStyle(() => {
      // Scale transform
      const scale = enableScale ? interpolate(focusAnim.value, [0, 1], scaleValues) : 1;

      // Border color animation
      const borderColor = enableBorder
        ? interpolateColor(focusAnim.value, [0, 1], [focusBorder.colorUnfocused, focusBorder.color])
        : 'transparent';

      // Shadow/glow animation
      const shadowOpacity = enableGlow
        ? interpolate(focusAnim.value, [0, 1], [0, focusShadow.opacity])
        : 0;
      const shadowRadius = enableGlow
        ? interpolate(
            focusAnim.value,
            [0, 1],
            [0, styleConfig.shadow.shadowRadius || focusShadow.radius]
          )
        : 0;
      const elevation = enableGlow
        ? interpolate(focusAnim.value, [0, 1], [0, styleConfig.shadow.elevation || 8])
        : 0;

      return {
        transform: [{ scale }],
        borderColor,
        borderWidth: enableBorder ? styleConfig.borderWidth : 0,
        borderRadius,
        // Shadow properties
        shadowColor: enableGlow ? focusShadow.color : 'transparent',
        shadowOffset: enableGlow ? focusShadow.offset : { width: 0, height: 0 },
        shadowOpacity,
        shadowRadius,
        elevation,
      };
    }, [focusAnim, enableScale, enableBorder, enableGlow, scaleValues, styleConfig, borderRadius]);

    // Combined styles
    const containerStyle = useMemo(
      () => [styles.container, { borderRadius }, style, isFocused && focusedStyle],
      [borderRadius, style, isFocused, focusedStyle]
    );

    // Props common to both Touchable and Pressable
    const commonProps = {
      ref,
      testID,
      disabled,
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole: 'button' as const,
      accessibilityState: { disabled, selected: isFocused },
      onPress,
      onLongPress,
      onPressIn,
      onPressOut,
      // Android TV: nativeID for D-pad navigation references
      ...(nativeID && { nativeID }),
      ...focusProps,
    };

    // Render with Pressable
    if (usePressable) {
      return (
        <AnimatedPressable
          {...(commonProps as PressableProps)}
          style={[containerStyle, animatedFocusStyle]}
        >
          {children}
        </AnimatedPressable>
      );
    }

    // Render with TouchableOpacity (default)
    return (
      <AnimatedTouchableOpacity
        {...(commonProps as TouchableOpacityProps)}
        activeOpacity={activeOpacity}
        style={[containerStyle, animatedFocusStyle]}
      >
        {children}
      </AnimatedTouchableOpacity>
    );
  }
);

Focusable.displayName = 'Focusable';

/**
 * Styles for the Focusable component
 */
const styles = StyleSheet.create({
  container: {
    // Default overflow hidden to clip content within border radius
    overflow: 'hidden',
  },
});

/**
 * Helper hook to create animated styles for focus indicators
 * Use this when you need more control over the focus animation
 *
 * @example
 * ```tsx
 * const { focusAnim } = useTVFocus();
 * const animatedStyle = useFocusAnimatedStyle(focusAnim, 'card');
 *
 * return (
 *   <Animated.View style={[styles.card, animatedStyle]}>
 *     {content}
 *   </Animated.View>
 * );
 * ```
 */
export const useFocusAnimatedStyle = (
  focusAnim: SharedValue<number>,
  variant: FocusVariant = 'card',
  options: {
    enableScale?: boolean;
    enableBorder?: boolean;
    enableGlow?: boolean;
    borderRadius?: number;
  } = {}
) => {
  const { enableScale = true, enableBorder = true, enableGlow = true, borderRadius } = options;

  const styleConfig = getFocusStyleConfig(variant);
  const finalBorderRadius = borderRadius ?? styleConfig.borderRadius;

  // Get scale values based on variant
  const scaleValues = (() => {
    switch (variant) {
      case 'card':
        return focusScaleValues.card;
      case 'button':
        return focusScaleValues.button;
      case 'listItem':
        return focusScaleValues.listItem;
      case 'hero':
        return focusScaleValues.hero;
      default:
        return focusScaleValues.default;
    }
  })();

  return useAnimatedStyle(() => {
    const scale = enableScale ? interpolate(focusAnim.value, [0, 1], scaleValues) : 1;

    const borderColor = enableBorder
      ? interpolateColor(focusAnim.value, [0, 1], [focusBorder.colorUnfocused, focusBorder.color])
      : 'transparent';

    const shadowOpacity = enableGlow
      ? interpolate(focusAnim.value, [0, 1], [0, focusShadow.opacity])
      : 0;

    const shadowRadius = enableGlow
      ? interpolate(
          focusAnim.value,
          [0, 1],
          [0, styleConfig.shadow.shadowRadius || focusShadow.radius]
        )
      : 0;

    const elevation = enableGlow
      ? interpolate(focusAnim.value, [0, 1], [0, styleConfig.shadow.elevation || 8])
      : 0;

    return {
      transform: [{ scale }],
      borderColor,
      borderWidth: enableBorder ? styleConfig.borderWidth : 0,
      borderRadius: finalBorderRadius,
      shadowColor: enableGlow ? focusShadow.color : 'transparent',
      shadowOffset: enableGlow ? focusShadow.offset : { width: 0, height: 0 },
      shadowOpacity,
      shadowRadius,
      elevation,
    };
  });
};

export default Focusable;
