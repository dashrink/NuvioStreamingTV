/**
 * Focusable.tsx
 *
 * Non-TV fallback for the Focusable component.
 * Provides basic press handling without TV-specific features.
 *
 * On TV platforms, Metro will automatically load Focusable.tv.tsx instead
 * when APP_VARIANT=tv is set.
 *
 * @example
 * ```tsx
 * import Focusable from '@/components/common/Focusable';
 *
 * function MyComponent() {
 *   return (
 *     <Focusable
 *       onPress={() => console.log('Pressed!')}
 *       onLongPress={() => console.log('Long press!')}
 *     >
 *       <Text>Press Me</Text>
 *     </Focusable>
 *   );
 * }
 * ```
 */

import React, { forwardRef, useRef, useImperativeHandle, useState, useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Animated,
} from 'react-native';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Configuration for focus animation behavior (stub for non-TV)
 */
export interface FocusAnimationConfig {
  focusScale?: number;
  unfocusedOpacity?: number;
  showFocusBorder?: boolean;
  focusBorderColor?: string;
  focusBorderWidth?: number;
  animateShadow?: boolean;
}

/**
 * Apple TV specific parallax properties (stub for non-TV)
 */
export interface TVParallaxPropertiesConfig {
  enabled?: boolean;
  shiftDistanceX?: number;
  shiftDistanceY?: number;
  tiltAngle?: number;
  magnification?: number;
  pressMagnification?: number;
  pressDuration?: number;
}

/**
 * Next focus navigation configuration (stub for non-TV)
 */
export interface NextFocusConfig {
  nextFocusUp?: number | React.RefObject<any>;
  nextFocusDown?: number | React.RefObject<any>;
  nextFocusLeft?: number | React.RefObject<any>;
  nextFocusRight?: number | React.RefObject<any>;
}

/**
 * Props for the Focusable component
 */
export interface FocusableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  hasTVPreferredFocus?: boolean;
  isTVSelectable?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  focusStyle?: StyleProp<ViewStyle>;
  animationConfig?: FocusAnimationConfig;
  tvParallaxProperties?: TVParallaxPropertiesConfig;
  nextFocus?: NextFocusConfig;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  focusId?: string;
}

/**
 * Ref methods exposed by Focusable component
 */
export interface FocusableRef {
  focus: () => void;
  blur: () => void;
  getRef: () => React.RefObject<View>;
  isFocused: () => boolean;
  setNativeProps: (props: object) => void;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Non-TV Focusable component
 *
 * Simple wrapper around TouchableOpacity for non-TV platforms.
 * TV-specific features are only available in Focusable.tv.tsx.
 */
const Focusable = forwardRef<FocusableRef, FocusableProps>(
  (
    {
      children,
      onPress,
      onLongPress,
      onFocus,
      onBlur,
      hasTVPreferredFocus: _hasTVPreferredFocus,
      isTVSelectable: _isTVSelectable,
      disabled = false,
      style,
      focusStyle: _focusStyle,
      animationConfig: _animationConfig,
      tvParallaxProperties: _tvParallaxProperties,
      nextFocus: _nextFocus,
      testID,
      accessibilityLabel,
      accessibilityHint,
    },
    ref
  ) => {
    const viewRef = useRef<any>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Simple press animation
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    }, [scaleValue]);

    const handlePressOut = useCallback(() => {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    }, [scaleValue]);

    // Imperative handle for ref methods
    useImperativeHandle(ref, () => ({
      focus: () => {
        setIsFocused(true);
        onFocus?.();
      },
      blur: () => {
        setIsFocused(false);
        onBlur?.();
      },
      getRef: () => viewRef,
      isFocused: () => isFocused,
      setNativeProps: (props: object) => {
        if (viewRef.current?.setNativeProps) {
          viewRef.current.setNativeProps(props);
        }
      },
    }));

    return (
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity
          ref={viewRef}
          style={[styles.container, style]}
          onPress={disabled ? undefined : onPress}
          onLongPress={disabled ? undefined : onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.8}
          testID={testID}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

Focusable.displayName = 'Focusable';

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});

// =============================================================================
// Exports
// =============================================================================

export default Focusable;

export type { FocusableProps, FocusableRef };
