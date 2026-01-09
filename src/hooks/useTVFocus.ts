import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
  SharedValue,
} from 'react-native-reanimated';

/**
 * Animation configuration for focus transitions
 * Uses optimized spring animations for smooth 60fps performance
 */
const FOCUS_ANIMATION_CONFIG = {
  // Fast spring for responsive feel
  spring: {
    damping: 15,
    mass: 0.8,
    stiffness: 200,
  },
  // Timing fallback for simpler animations
  timing: {
    duration: 200,
    easing: Easing.out(Easing.quad),
  },
};

/**
 * Check if the app is running on a TV platform
 * Supports both Android TV and tvOS
 */
export const isTV = (): boolean => {
  // Platform.isTV is available on both Android TV and tvOS
  return Platform.isTV === true;
};

/**
 * Check if the app is running on Apple TV (tvOS)
 */
export const isTVOS = (): boolean => {
  return Platform.OS === 'ios' && Platform.isTV === true;
};

/**
 * Check if the app is running on Android TV
 */
export const isAndroidTV = (): boolean => {
  return Platform.OS === 'android' && Platform.isTV === true;
};

/**
 * Configuration options for the useTVFocus hook
 */
export interface UseTVFocusOptions {
  /** Callback when element receives focus */
  onFocus?: () => void;
  /** Callback when element loses focus */
  onBlur?: () => void;
  /** Whether the element should be initially focused (TV only) */
  hasTVPreferredFocus?: boolean;
  /** Whether the element is focusable */
  focusable?: boolean;
  /** Custom animation duration in milliseconds */
  animationDuration?: number;
  /** Disable focus handling entirely */
  disabled?: boolean;
}

/**
 * Return type for the useTVFocus hook
 */
export interface UseTVFocusReturn {
  /** Whether the element is currently focused */
  isFocused: boolean;
  /** Animated value for focus state (0 = unfocused, 1 = focused) */
  focusAnim: SharedValue<number>;
  /** Props to spread onto the focusable element */
  focusProps: {
    focusable: boolean;
    hasTVPreferredFocus: boolean;
    onFocus: () => void;
    onBlur: () => void;
  };
  /** Manually trigger focus animation (useful for non-TV testing) */
  setFocused: (focused: boolean) => void;
  /** Whether the app is running on a TV platform */
  isTV: boolean;
  /** Whether TV focus features are enabled */
  isTVFocusEnabled: boolean;
}

/**
 * Custom React hook for managing TV navigation focus state
 *
 * This hook provides:
 * - TV platform detection (Android TV, tvOS)
 * - Animated focus value for smooth visual transitions
 * - Focus props to spread onto focusable elements
 * - Callbacks for focus/blur events
 *
 * @example
 * ```tsx
 * const { isFocused, focusAnim, focusProps } = useTVFocus({
 *   onFocus: () => console.log('Focused!'),
 *   onBlur: () => console.log('Blurred!'),
 * });
 *
 * // Use focusAnim with Animated.View for animated styles
 * const animatedStyle = useAnimatedStyle(() => ({
 *   transform: [{ scale: interpolate(focusAnim.value, [0, 1], [1, 1.05]) }],
 *   borderColor: interpolateColor(focusAnim.value, [0, 1], ['transparent', '#2d9cdb']),
 * }));
 *
 * return (
 *   <TouchableOpacity {...focusProps}>
 *     <Animated.View style={animatedStyle}>
 *       {children}
 *     </Animated.View>
 *   </TouchableOpacity>
 * );
 * ```
 */
export const useTVFocus = (options: UseTVFocusOptions = {}): UseTVFocusReturn => {
  const {
    onFocus,
    onBlur,
    hasTVPreferredFocus = false,
    focusable = true,
    animationDuration = FOCUS_ANIMATION_CONFIG.timing.duration,
    disabled = false,
  } = options;

  // Determine if we're on a TV platform
  const isTVPlatform = isTV();

  // Whether focus features should be active
  const isTVFocusEnabled = isTVPlatform && !disabled && focusable;

  // Track focus state
  const [isFocused, setIsFocused] = useState(false);

  // Animated value for smooth focus transitions (0 = unfocused, 1 = focused)
  const focusAnim = useSharedValue(0);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Handle focus event
  const handleFocus = useCallback(() => {
    if (!isMountedRef.current) return;

    setIsFocused(true);

    // Animate to focused state using spring for natural feel
    focusAnim.value = withSpring(1, FOCUS_ANIMATION_CONFIG.spring);

    // Call user's onFocus callback
    onFocus?.();
  }, [focusAnim, onFocus]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    if (!isMountedRef.current) return;

    setIsFocused(false);

    // Animate back to unfocused state
    focusAnim.value = withTiming(0, {
      duration: animationDuration,
      easing: FOCUS_ANIMATION_CONFIG.timing.easing,
    });

    // Call user's onBlur callback
    onBlur?.();
  }, [focusAnim, animationDuration, onBlur]);

  // Manual focus setter (useful for testing or non-TV scenarios)
  const setFocused = useCallback((focused: boolean) => {
    if (focused) {
      handleFocus();
    } else {
      handleBlur();
    }
  }, [handleFocus, handleBlur]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing animations
      try {
        cancelAnimation(focusAnim);
      } catch {
        // Silently handle animation cancellation errors
      }
    };
  }, [focusAnim]);

  // Props to spread onto the focusable element
  const focusProps = {
    focusable: isTVFocusEnabled,
    hasTVPreferredFocus: isTVFocusEnabled && hasTVPreferredFocus,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };

  return {
    isFocused,
    focusAnim,
    focusProps,
    setFocused,
    isTV: isTVPlatform,
    isTVFocusEnabled,
  };
};

export default useTVFocus;
