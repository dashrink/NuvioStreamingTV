import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

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
 * Haptic Feedback Pattern Constants
 *
 * This object maps specific UI interaction types to the appropriate haptic feedback.
 * Use these constants to ensure consistent haptic feedback throughout the app.
 *
 * Each pattern is documented with its intended use case to maintain consistency.
 */
export const HAPTIC_PATTERNS = {
  // ============================================
  // NAVIGATION & SELECTION (Light Impact)
  // ============================================
  /** Navigating to a new screen (back button, menu item tap) */
  NAVIGATION: 'light',
  /** Selecting an item from a list (content item, search result) */
  SELECTION: 'light',
  /** Tapping a filter chip or tab */
  FILTER_TAP: 'light',
  /** Scrolling through picker or carousel */
  SCROLL_SNAP: 'light',
  /** Opening a dropdown or modal */
  MODAL_OPEN: 'light',
  /** Closing a modal or dismissing overlay */
  MODAL_CLOSE: 'light',
  /** Tapping secondary/subtle buttons */
  SECONDARY_BUTTON: 'light',

  // ============================================
  // IMPORTANT ACTIONS (Medium Impact)
  // ============================================
  /** Play/pause media controls */
  PLAYBACK_TOGGLE: 'medium',
  /** Toggle switch state changes */
  TOGGLE_SWITCH: 'medium',
  /** Primary action buttons (Submit, Save, Confirm) */
  PRIMARY_BUTTON: 'medium',
  /** Adding item to library/favorites */
  ADD_TO_LIBRARY: 'medium',
  /** Selecting a stream or source */
  STREAM_SELECT: 'medium',
  /** Theme or profile selection */
  THEME_SELECT: 'medium',
  /** Skip forward/backward in player */
  PLAYBACK_SKIP: 'medium',
  /** Form submission */
  FORM_SUBMIT: 'medium',
  /** Refresh or sync action */
  REFRESH: 'medium',

  // ============================================
  // CRITICAL/DESTRUCTIVE ACTIONS (Heavy Impact)
  // ============================================
  /** Deleting content or data */
  DELETE: 'heavy',
  /** Logging out of account */
  LOGOUT: 'heavy',
  /** Removing items from library */
  REMOVE_FROM_LIBRARY: 'heavy',
  /** Uninstalling addon or plugin */
  UNINSTALL: 'heavy',
  /** Clearing cache or data */
  CLEAR_DATA: 'heavy',
  /** Destructive confirmation dialogs */
  DESTRUCTIVE_CONFIRM: 'heavy',

  // ============================================
  // FEEDBACK NOTIFICATIONS (Notification Types)
  // ============================================
  /** Operation completed successfully */
  SUCCESS: 'success',
  /** Login/authentication success */
  AUTH_SUCCESS: 'success',
  /** Download or save completed */
  DOWNLOAD_COMPLETE: 'success',
  /** Backup completed */
  BACKUP_COMPLETE: 'success',

  /** Warning state or approaching limits */
  WARNING: 'warning',
  /** Low storage or quota warning */
  QUOTA_WARNING: 'warning',
  /** Connection issues detected */
  CONNECTION_WARNING: 'warning',

  /** Operation failed */
  ERROR: 'error',
  /** Form validation failed */
  VALIDATION_ERROR: 'error',
  /** Authentication failed */
  AUTH_ERROR: 'error',
  /** Network request failed */
  NETWORK_ERROR: 'error',
} as const;

/**
 * Type for haptic pattern values
 */
export type HapticPatternType = (typeof HAPTIC_PATTERNS)[keyof typeof HAPTIC_PATTERNS];

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
 * Helper function to get the trigger function for a pattern
 * @param pattern - The haptic pattern key from HAPTIC_PATTERNS
 * @returns The appropriate trigger function
 *
 * @example
 * ```tsx
 * import { HAPTIC_PATTERNS, getHapticTrigger } from '@/hooks/useHaptics';
 *
 * // Get trigger for a specific pattern
 * const trigger = getHapticTrigger(HAPTIC_PATTERNS.NAVIGATION);
 * await trigger();
 * ```
 */
export const getHapticTrigger = (pattern: HapticPatternType): (() => Promise<void>) => {
  switch (pattern) {
    case 'light':
      return triggerLight;
    case 'medium':
      return triggerMedium;
    case 'heavy':
      return triggerHeavy;
    case 'success':
      return triggerSuccess;
    case 'warning':
      return triggerWarning;
    case 'error':
      return triggerError;
    default:
      return triggerLight;
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
