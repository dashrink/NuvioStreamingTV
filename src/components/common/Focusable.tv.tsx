/**
 * Focusable.tv.tsx
 *
 * TV-specific focusable wrapper component with reanimated focus state animations,
 * tvParallaxProperties for Apple TV, and proper isTVSelectable handling.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - Scale animation on focus (1.0-1.1 range) with spring physics
 * - Border/glow effects for visual focus indication
 * - tvParallaxProperties for Apple TV depth effects
 * - Integration with useLongPress for context menu triggers
 * - Support for hasTVPreferredFocus and isTVSelectable props
 * - Proper onFocus/onBlur lifecycle management
 *
 * @example
 * ```tsx
 * import Focusable from '@/components/common/Focusable';
 *
 * function MyComponent() {
 *   return (
 *     <Focusable
 *       onPress={() => console.log('Selected!')}
 *       onLongPress={() => console.log('Long press!')}
 *       focusStyle={{ borderColor: 'blue' }}
 *     >
 *       <Text>Press Me</Text>
 *     </Focusable>
 *   );
 * }
 * ```
 */

import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
  findNodeHandle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  interpolate,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { useLongPress } from '../../hooks/useLongPress';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Configuration for focus animation behavior
 */
export interface FocusAnimationConfig {
  /** Scale factor when focused (default: 1.05) */
  focusScale?: number;
  /** Opacity when not focused (default: 0.9) */
  unfocusedOpacity?: number;
  /** Whether to show a border when focused (default: true) */
  showFocusBorder?: boolean;
  /** Color of the focus border (default: theme accent) */
  focusBorderColor?: string;
  /** Width of the focus border (default: 2) */
  focusBorderWidth?: number;
  /** Whether to animate shadow on focus (default: true on Apple TV) */
  animateShadow?: boolean;
}

/**
 * Apple TV specific parallax properties for 3D effects
 */
export interface TVParallaxPropertiesConfig {
  /** Whether parallax is enabled (default: true) */
  enabled?: boolean;
  /** Shift distance on X axis as focus moves (default: 2) */
  shiftDistanceX?: number;
  /** Shift distance on Y axis as focus moves (default: 2) */
  shiftDistanceY?: number;
  /** Tilt angle on focus (default: 0.05) */
  tiltAngle?: number;
  /** Magnification on focus (default: 1.0 - no extra magnification beyond scale) */
  magnification?: number;
  /** Adds a highlight on motion (default: true) */
  pressMagnification?: number;
  /** Floating height when focused (default: 0.5) */
  pressDuration?: number;
}

/**
 * Next focus navigation configuration
 */
export interface NextFocusConfig {
  /** Node handle or ref for next focus up */
  nextFocusUp?: number | React.RefObject<any>;
  /** Node handle or ref for next focus down */
  nextFocusDown?: number | React.RefObject<any>;
  /** Node handle or ref for next focus left */
  nextFocusLeft?: number | React.RefObject<any>;
  /** Node handle or ref for next focus right */
  nextFocusRight?: number | React.RefObject<any>;
}

/**
 * Configuration for rapid input protection
 */
export interface RapidInputConfig {
  /** Whether to enable rapid input protection (default: true) */
  enabled?: boolean;
  /** Minimum interval between focus changes in ms (default: 50) */
  minFocusIntervalMs?: number;
  /** Whether to cancel running animations on new focus events (default: true) */
  cancelAnimationsOnRapidInput?: boolean;
}

/**
 * Props for the Focusable component
 */
export interface FocusableProps {
  /** Child elements to render */
  children: React.ReactNode;
  /** Callback when the element is pressed/selected */
  onPress?: () => void;
  /** Callback when the element is long-pressed (300ms+) */
  onLongPress?: () => void;
  /** Callback when the element receives focus */
  onFocus?: () => void;
  /** Callback when the element loses focus */
  onBlur?: () => void;
  /** Whether this element should receive initial focus */
  hasTVPreferredFocus?: boolean;
  /** Whether this element can be focused by TV navigation */
  isTVSelectable?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Style for the container */
  style?: StyleProp<ViewStyle>;
  /** Additional style applied when focused */
  focusStyle?: StyleProp<ViewStyle>;
  /** Focus animation configuration */
  animationConfig?: FocusAnimationConfig;
  /** Apple TV parallax properties */
  tvParallaxProperties?: TVParallaxPropertiesConfig;
  /** Next focus navigation configuration */
  nextFocus?: NextFocusConfig;
  /** Test ID for testing purposes */
  testID?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Unique focus ID for spatial navigation */
  focusId?: string;
  /** Rapid input protection configuration */
  rapidInputConfig?: RapidInputConfig;
}

/**
 * Ref methods exposed by Focusable component
 */
export interface FocusableRef {
  /** Focus this element programmatically */
  focus: () => void;
  /** Blur this element */
  blur: () => void;
  /** Get the underlying view ref */
  getRef: () => React.RefObject<View>;
  /** Check if element is currently focused */
  isFocused: () => boolean;
  /** Set native props (for hasTVPreferredFocus) */
  setNativeProps: (props: object) => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Default animation spring configuration matching Apple TV feel */
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

/** Default focus animation values */
const DEFAULT_ANIMATION_CONFIG: Required<FocusAnimationConfig> = {
  focusScale: 1.05,
  unfocusedOpacity: 0.9,
  showFocusBorder: true,
  focusBorderColor: '#007AFF', // iOS blue
  focusBorderWidth: 2,
  animateShadow: Platform.OS === 'ios', // Only on Apple TV
};

/** Default parallax properties for Apple TV */
const DEFAULT_TV_PARALLAX: TVParallaxPropertiesConfig = {
  enabled: true,
  shiftDistanceX: 2,
  shiftDistanceY: 2,
  tiltAngle: 0.05,
  magnification: 1.0,
  pressMagnification: 1.02,
  pressDuration: 0.3,
};

/** Default rapid input protection configuration */
const DEFAULT_RAPID_INPUT_CONFIG: Required<RapidInputConfig> = {
  enabled: true,
  minFocusIntervalMs: 50,
  cancelAnimationsOnRapidInput: true,
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Resolve a ref or number to a node handle
 */
function resolveNodeHandle(value: number | React.RefObject<any> | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (value.current) {
    try {
      return findNodeHandle(value.current) ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Build tvParallaxProperties from config (Apple TV only)
 */
function buildTVParallaxProperties(config: TVParallaxPropertiesConfig): object | undefined {
  if (!config.enabled || Platform.OS !== 'ios') {
    return undefined;
  }

  return {
    enabled: true,
    shiftDistanceX: config.shiftDistanceX ?? DEFAULT_TV_PARALLAX.shiftDistanceX,
    shiftDistanceY: config.shiftDistanceY ?? DEFAULT_TV_PARALLAX.shiftDistanceY,
    tiltAngle: config.tiltAngle ?? DEFAULT_TV_PARALLAX.tiltAngle,
    magnification: config.magnification ?? DEFAULT_TV_PARALLAX.magnification,
    pressMagnification: config.pressMagnification ?? DEFAULT_TV_PARALLAX.pressMagnification,
    pressDuration: config.pressDuration ?? DEFAULT_TV_PARALLAX.pressDuration,
  };
}

// =============================================================================
// Animated TouchableOpacity
// =============================================================================

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * TV-specific focusable wrapper component
 *
 * Provides focus state animations, Apple TV parallax effects, and proper
 * integration with TV remote navigation including long-press support.
 */
const Focusable = forwardRef<FocusableRef, FocusableProps>(
  (
    {
      children,
      onPress,
      onLongPress,
      onFocus,
      onBlur,
      hasTVPreferredFocus = false,
      isTVSelectable = true,
      disabled = false,
      style,
      focusStyle,
      animationConfig = {},
      tvParallaxProperties = DEFAULT_TV_PARALLAX,
      nextFocus,
      testID,
      accessibilityLabel,
      accessibilityHint,
      rapidInputConfig = {},
    },
    ref
  ) => {
    // Merge default animation config with provided config
    const config: Required<FocusAnimationConfig> = {
      ...DEFAULT_ANIMATION_CONFIG,
      ...animationConfig,
    };

    // Merge rapid input protection config
    const rapidConfig: Required<RapidInputConfig> = {
      ...DEFAULT_RAPID_INPUT_CONFIG,
      ...rapidInputConfig,
    };

    // Refs
    const viewRef = useRef<any>(null);
    const isFocusedRef = useRef(false);

    // Rapid input protection refs
    const lastFocusChangeTimeRef = useRef<number>(0);
    const pendingFocusCallbackRef = useRef<(() => void) | null>(null);

    // Shared values for animations
    const focusProgress = useSharedValue(0);
    const pressProgress = useSharedValue(0);

    // Long press hook integration
    const { handlers: longPressHandlers } = useLongPress({
      onShortPress: disabled ? undefined : onPress,
      onLongPress: disabled ? undefined : onLongPress,
      threshold: 300,
      enabled: !disabled,
    });

    // =============================================================================
    // Animated Styles
    // =============================================================================

    /**
     * Main animated style for focus/blur transitions
     */
    const animatedFocusStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        focusProgress.value,
        [0, 1],
        [1, config.focusScale]
      );

      const opacity = interpolate(
        focusProgress.value,
        [0, 1],
        [config.unfocusedOpacity, 1]
      );

      // Shadow animation for Apple TV
      const shadowOpacity = Platform.OS === 'ios' && config.animateShadow
        ? interpolate(focusProgress.value, [0, 1], [0, 0.3])
        : 0;

      const shadowRadius = Platform.OS === 'ios' && config.animateShadow
        ? interpolate(focusProgress.value, [0, 1], [0, 10])
        : 0;

      return {
        transform: [{ scale }],
        opacity,
        shadowOpacity,
        shadowRadius,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
      };
    });

    /**
     * Animated border style for focus indication
     */
    const animatedBorderStyle = useAnimatedStyle(() => {
      if (!config.showFocusBorder) {
        return {};
      }

      const borderWidth = interpolate(
        focusProgress.value,
        [0, 1],
        [0, config.focusBorderWidth]
      );

      // For border color animation, we use interpolateColor
      const borderColor = interpolateColor(
        focusProgress.value,
        [0, 1],
        ['transparent', config.focusBorderColor]
      );

      return {
        borderWidth,
        borderColor,
      };
    });

    /**
     * Press feedback style
     */
    const animatedPressStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        pressProgress.value,
        [0, 1],
        [1, 0.98]
      );

      return {
        transform: [{ scale }],
      };
    });

    // =============================================================================
    // Event Handlers
    // =============================================================================

    /**
     * Handle focus event with rapid input protection
     */
    const handleFocus = useCallback(() => {
      const now = Date.now();

      // Check if rapid input protection should throttle this event
      if (rapidConfig.enabled) {
        const timeSinceLastChange = now - lastFocusChangeTimeRef.current;

        if (timeSinceLastChange < rapidConfig.minFocusIntervalMs) {
          // Too fast - queue the focus callback for later
          pendingFocusCallbackRef.current = () => {
            isFocusedRef.current = true;
            onFocus?.();
          };
          // But still update the animation immediately for visual feedback
        }

        lastFocusChangeTimeRef.current = now;

        // Cancel any running animations to prevent glitches
        if (rapidConfig.cancelAnimationsOnRapidInput) {
          cancelAnimation(focusProgress);
        }
      }

      isFocusedRef.current = true;
      focusProgress.value = withSpring(1, SPRING_CONFIG);

      // Clear any pending focus callback and call the current one
      pendingFocusCallbackRef.current = null;
      onFocus?.();
    }, [focusProgress, onFocus, rapidConfig]);

    /**
     * Handle blur event with rapid input protection
     */
    const handleBlur = useCallback(() => {
      const now = Date.now();

      // Check if rapid input protection should throttle this event
      if (rapidConfig.enabled) {
        lastFocusChangeTimeRef.current = now;

        // Cancel any running animations to prevent glitches
        if (rapidConfig.cancelAnimationsOnRapidInput) {
          cancelAnimation(focusProgress);
        }
      }

      isFocusedRef.current = false;
      focusProgress.value = withSpring(0, SPRING_CONFIG);

      // Clear any pending focus callback
      pendingFocusCallbackRef.current = null;
      onBlur?.();
    }, [focusProgress, onBlur, rapidConfig]);

    /**
     * Handle press in (for press feedback)
     */
    const handlePressIn = useCallback(() => {
      pressProgress.value = withSpring(1, {
        ...SPRING_CONFIG,
        damping: 20,
        stiffness: 300,
      });
      longPressHandlers.onPressIn();
    }, [pressProgress, longPressHandlers]);

    /**
     * Handle press out (for press feedback)
     */
    const handlePressOut = useCallback(() => {
      pressProgress.value = withSpring(0, SPRING_CONFIG);
      longPressHandlers.onPressOut();
    }, [pressProgress, longPressHandlers]);

    // =============================================================================
    // Imperative Handle
    // =============================================================================

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (viewRef.current?.setNativeProps) {
          viewRef.current.setNativeProps({ hasTVPreferredFocus: true });
        }
      },
      blur: () => {
        // TV doesn't have a blur method, focus will move naturally
        handleBlur();
      },
      getRef: () => viewRef,
      isFocused: () => isFocusedRef.current,
      setNativeProps: (props: object) => {
        if (viewRef.current?.setNativeProps) {
          viewRef.current.setNativeProps(props);
        }
      },
    }));

    // =============================================================================
    // Props Building
    // =============================================================================

    // Build next focus props from node handles
    const nextFocusProps: Record<string, number | undefined> = {};
    if (nextFocus) {
      if (nextFocus.nextFocusUp !== undefined) {
        nextFocusProps.nextFocusUp = resolveNodeHandle(nextFocus.nextFocusUp);
      }
      if (nextFocus.nextFocusDown !== undefined) {
        nextFocusProps.nextFocusDown = resolveNodeHandle(nextFocus.nextFocusDown);
      }
      if (nextFocus.nextFocusLeft !== undefined) {
        nextFocusProps.nextFocusLeft = resolveNodeHandle(nextFocus.nextFocusLeft);
      }
      if (nextFocus.nextFocusRight !== undefined) {
        nextFocusProps.nextFocusRight = resolveNodeHandle(nextFocus.nextFocusRight);
      }
    }

    // Build TV parallax properties (Apple TV only)
    const tvParallaxPropsBuilt = buildTVParallaxProperties(tvParallaxProperties);

    // =============================================================================
    // Render
    // =============================================================================

    return (
      <AnimatedTouchableOpacity
        ref={viewRef}
        style={[
          styles.container,
          style,
          animatedFocusStyle,
          animatedBorderStyle,
          animatedPressStyle,
          isFocusedRef.current && focusStyle,
        ]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={disabled ? undefined : onPress}
        onLongPress={disabled ? undefined : onLongPress}
        hasTVPreferredFocus={hasTVPreferredFocus}
        isTVSelectable={isTVSelectable && !disabled}
        disabled={disabled}
        activeOpacity={1} // We handle opacity with animations
        tvParallaxProperties={tvParallaxPropsBuilt}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...nextFocusProps}
      >
        {children}
      </AnimatedTouchableOpacity>
    );
  }
);

Focusable.displayName = 'Focusable';

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    // Base container styles
    borderRadius: 8,
    overflow: 'hidden',
  },
});

// =============================================================================
// Exports
// =============================================================================

export default Focusable;

export type {
  FocusableProps,
  FocusableRef,
  FocusAnimationConfig,
  TVParallaxPropertiesConfig,
  RapidInputConfig,
};
