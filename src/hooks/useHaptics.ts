import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptic Feedback Constants
 *
 * Usage Guidelines:
 * - Light: Simple taps, selections, navigation items, scrolling through lists
 * - Medium: Important actions like play/pause, confirm selections, toggle states
 * - Heavy: Critical/destructive actions like delete, logout, important confirmations
 * - Success: Successful operations like save complete, download finished, login success
 * - Warning: Warning states, approaching limits, caution required
 * - Error: Failed operations, validation errors, authentication failures
 */

// Impact feedback styles mapped to use cases
export const HapticStyles = {
  /** Light impact for simple taps and selections */
  LIGHT: Haptics.ImpactFeedbackStyle.Light,
  /** Medium impact for important actions */
  MEDIUM: Haptics.ImpactFeedbackStyle.Medium,
  /** Heavy impact for critical/destructive actions */
  HEAVY: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

// Notification feedback types mapped to use cases
export const HapticNotifications = {
  /** Success notification for completed operations */
  SUCCESS: Haptics.NotificationFeedbackType.Success,
  /** Warning notification for caution states */
  WARNING: Haptics.NotificationFeedbackType.Warning,
  /** Error notification for failed operations */
  ERROR: Haptics.NotificationFeedbackType.Error,
} as const;

/**
 * Check if haptics are supported on the current platform
 * Haptics are fully supported on iOS, and supported on Android with some limitations
 */
const isHapticsSupported = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

/**
 * Trigger light haptic feedback
 * Use for: simple taps, selections, navigation items, scrolling
 */
export const triggerLight = async (): Promise<void> => {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.impactAsync(HapticStyles.LIGHT);
  } catch {
    // Silently fail - haptics are non-critical
  }
};

/**
 * Trigger medium haptic feedback
 * Use for: important actions, play/pause, confirm selections, toggle states
 */
export const triggerMedium = async (): Promise<void> => {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.impactAsync(HapticStyles.MEDIUM);
  } catch {
    // Silently fail - haptics are non-critical
  }
};

/**
 * Trigger heavy haptic feedback
 * Use for: critical/destructive actions, delete, logout, important confirmations
 */
export const triggerHeavy = async (): Promise<void> => {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.impactAsync(HapticStyles.HEAVY);
  } catch {
    // Silently fail - haptics are non-critical
  }
};

/**
 * Trigger success haptic feedback
 * Use for: successful operations, save complete, download finished, login success
 */
export const triggerSuccess = async (): Promise<void> => {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.notificationAsync(HapticNotifications.SUCCESS);
  } catch {
    // Silently fail - haptics are non-critical
  }
};

/**
 * Trigger warning haptic feedback
 * Use for: warning states, approaching limits, caution required
 */
export const triggerWarning = async (): Promise<void> => {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.notificationAsync(HapticNotifications.WARNING);
  } catch {
    // Silently fail - haptics are non-critical
  }
};

/**
 * Trigger error haptic feedback
 * Use for: failed operations, validation errors, authentication failures
 */
export const triggerError = async (): Promise<void> => {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.notificationAsync(HapticNotifications.ERROR);
  } catch {
    // Silently fail - haptics are non-critical
  }
};

/**
 * Custom hook for haptic feedback
 * Provides memoized haptic trigger methods for use in React components
 *
 * @example
 * ```tsx
 * const { triggerLight, triggerMedium, triggerSuccess } = useHaptics();
 *
 * <TouchableOpacity onPress={() => { triggerLight(); handleNavigation(); }}>
 *   <Text>Navigate</Text>
 * </TouchableOpacity>
 * ```
 */
export const useHaptics = () => {
  const light = useCallback(async () => {
    await triggerLight();
  }, []);

  const medium = useCallback(async () => {
    await triggerMedium();
  }, []);

  const heavy = useCallback(async () => {
    await triggerHeavy();
  }, []);

  const success = useCallback(async () => {
    await triggerSuccess();
  }, []);

  const warning = useCallback(async () => {
    await triggerWarning();
  }, []);

  const error = useCallback(async () => {
    await triggerError();
  }, []);

  return {
    /** Light impact for simple taps and selections */
    triggerLight: light,
    /** Medium impact for important actions */
    triggerMedium: medium,
    /** Heavy impact for critical/destructive actions */
    triggerHeavy: heavy,
    /** Success notification for completed operations */
    triggerSuccess: success,
    /** Warning notification for caution states */
    triggerWarning: warning,
    /** Error notification for failed operations */
    triggerError: error,
    /** Check if haptics are supported on this platform */
    isSupported: isHapticsSupported,
  };
};

export default useHaptics;
