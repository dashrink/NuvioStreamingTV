/**
 * Focusable Component
 *
 * A wrapper component that makes any child focusable on TV platforms
 * with consistent focus behavior and styling
 */

import React, { useCallback, useState, forwardRef } from 'react';
import { TouchableOpacity, View, ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { TV_FOCUS_CONFIG } from '../../utils/tvStyles/focus';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface FocusableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  hasTVPreferredFocus?: boolean;
  style?: ViewStyle | ViewStyle[];
  focusedStyle?: ViewStyle;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  variant?: 'default' | 'card' | 'button';
  enableScale?: boolean;
  enableGlow?: boolean;
  enableBorder?: boolean;
  borderRadius?: number;
}

/**
 * Focusable wrapper component for TV platforms
 * Provides consistent focus behavior and styling
 */
const Focusable = forwardRef<TouchableOpacity, FocusableProps>(
  (
    {
      children,
      onPress,
      onFocus,
      onBlur,
      hasTVPreferredFocus = false,
      style,
      focusedStyle,
      disabled = false,
      testID,
      accessibilityLabel,
      accessibilityHint,
      variant = 'default',
      enableScale = false,
      enableGlow = false,
      enableBorder = false,
      borderRadius,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    // Animation values
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    const handleFocus = useCallback(() => {
      setIsFocused(true);

      if (enableScale) {
        scale.value = withTiming(TV_FOCUS_CONFIG.focusScale, {
          duration: TV_FOCUS_CONFIG.focusAnimationDuration,
        });
      }

      if (enableGlow) {
        glowOpacity.value = withTiming(1, {
          duration: TV_FOCUS_CONFIG.focusAnimationDuration,
        });
      }

      onFocus?.();
    }, [onFocus, enableScale, enableGlow]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);

      if (enableScale) {
        scale.value = withTiming(1, {
          duration: TV_FOCUS_CONFIG.focusAnimationDuration,
        });
      }

      if (enableGlow) {
        glowOpacity.value = withTiming(0, {
          duration: TV_FOCUS_CONFIG.focusAnimationDuration,
        });
      }

      onBlur?.();
    }, [onBlur, enableScale, enableGlow]);

    const handlePress = useCallback(() => {
      if (!disabled && onPress) {
        onPress();
      }
    }, [disabled, onPress]);

    // Merge base styles
    const baseStyle: ViewStyle = Array.isArray(style) ? Object.assign({}, ...style) : { ...style };

    // Add border radius if specified
    if (borderRadius !== undefined) {
      baseStyle.borderRadius = borderRadius;
    }

    // Add focus-specific styles
    if (isFocused && focusedStyle) {
      Object.assign(baseStyle, focusedStyle);
    }

    // Add TV focus border when focused and enabled
    if (Platform.isTV && isFocused && enableBorder) {
      baseStyle.borderWidth = TV_FOCUS_CONFIG.focusBorderWidth;
      baseStyle.borderColor = TV_FOCUS_CONFIG.focusBorderColor;
    }

    // Animated styles for scale
    const animatedStyle = useAnimatedStyle(() => ({
      transform: enableScale ? [{ scale: scale.value }] : [],
    }));

    if (!onPress) {
      // Non-interactive focusable (View only)
      return (
        <View
          style={[baseStyle]}
          testID={testID}
          accessible={true}
          accessibilityLabel={accessibilityLabel}
          // @ts-ignore - TV-specific props
          onFocus={handleFocus}
          onBlur={handleBlur}
          hasTVPreferredFocus={Platform.isTV ? hasTVPreferredFocus : undefined}
        >
          {children}
        </View>
      );
    }

    // Interactive focusable with animations (if enabled)
    if (enableScale) {
      return (
        <AnimatedTouchableOpacity
          // @ts-ignore - ref type mismatch
          ref={ref}
          style={[baseStyle, animatedStyle]}
          onPress={handlePress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          activeOpacity={0.7}
          testID={testID}
          accessible={true}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityRole="button"
          // @ts-ignore - TV-specific props
          hasTVPreferredFocus={Platform.isTV ? hasTVPreferredFocus : undefined}
          isTVSelectable={Platform.isTV ? !disabled : undefined}
        >
          {children}
        </AnimatedTouchableOpacity>
      );
    }

    // Interactive focusable without animations (standard)
    return (
      <TouchableOpacity
        ref={ref}
        style={baseStyle}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        activeOpacity={0.7}
        testID={testID}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        // @ts-ignore - TV-specific props
        hasTVPreferredFocus={Platform.isTV ? hasTVPreferredFocus : undefined}
        isTVSelectable={Platform.isTV ? !disabled : undefined}
      >
        {children}
      </TouchableOpacity>
    );
  }
);

Focusable.displayName = 'Focusable';

export default Focusable;
