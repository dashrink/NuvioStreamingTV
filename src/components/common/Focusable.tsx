/**
 * Mobile/Tablet Focusable Component
 *
 * Simple Pressable wrapper for mobile and tablet platforms.
 * Provides standard touch feedback without TV-specific features.
 *
 * For TV platforms, Metro bundler automatically loads Focusable.tv.tsx instead,
 * which includes animations, spatial navigation, and focus management.
 *
 * This clean separation eliminates all Platform.isTV conditionals.
 */

import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import { FocusableProps } from './Focusable.shared';

/**
 * Mobile-optimized Focusable component - simple Pressable with touch feedback
 */
const Focusable = React.forwardRef<any, FocusableProps>(
  (
    {
      children,
      onPress,
      onPressIn,
      onPressOut,
      onLongPress,
      activeOpacity = 0.7,
      style,
      // TV-specific props are accepted but ignored on mobile for interface compatibility
      focusedStyle,
      scaleOnFocus,
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
    const pressableRef = useRef<any>(null);

    // Expose ref for external use
    React.useImperativeHandle(ref, () => pressableRef.current);

    // Mobile implementation: Standard Pressable with touch feedback
    return (
      <Pressable
        ref={pressableRef}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={onLongPress}
        disabled={disabled}
        testID={testID}
        hitSlop={hitSlop}
        style={({ pressed }) => [
          style,
          pressed && { opacity: activeOpacity }, // Standard mobile feedback
          disabled && { opacity: 0.5 },
        ]}
      >
        {children}
      </Pressable>
    );
  }
);

Focusable.displayName = 'Focusable';

export default React.memo(Focusable);
