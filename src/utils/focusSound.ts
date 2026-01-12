import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { settingsEmitter } from '../hooks/useSettings';
import { mmkvStorage } from '../services/mmkvStorage';

/**
 * Focus feedback types for different interaction contexts
 */
export type FocusFeedbackType = 'navigation' | 'selection' | 'action';

/**
 * Configuration for focus feedback behavior
 */
interface FocusFeedbackConfig {
  /** Whether focus feedback is enabled (respects system/app settings) */
  enabled: boolean;
  /** Timestamp of last feedback to prevent rapid-fire triggers */
  lastFeedbackTime: number;
  /** Minimum interval between feedback in milliseconds */
  minInterval: number;
  /** Whether the setting has been initialized from storage */
  initialized: boolean;
}

// Global configuration state
const feedbackConfig: FocusFeedbackConfig = {
  enabled: true,
  lastFeedbackTime: 0,
  minInterval: 50, // 50ms minimum between feedback events
  initialized: false,
};

// Settings storage key (same as useSettings.ts)
const SETTINGS_STORAGE_KEY = 'app_settings';

/**
 * Load the focus feedback setting from app settings
 * Reads from the same storage location as useSettings hook
 */
const loadFocusFeedbackSetting = async (): Promise<boolean> => {
  try {
    // Get current user scope
    const scope = (await mmkvStorage.getItem('@user:current')) || 'local';
    const scopedKey = `@user:${scope}:${SETTINGS_STORAGE_KEY}`;

    // Try scoped settings first, then fallback to legacy
    const settingsJson =
      (await mmkvStorage.getItem(scopedKey)) || (await mmkvStorage.getItem(SETTINGS_STORAGE_KEY));

    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      // Return the setting value, defaulting to true if not set
      return settings.enableFocusFeedback !== undefined ? settings.enableFocusFeedback : true;
    }
  } catch {
    // Return default on error
  }
  // Default to enabled on TV platforms
  return true;
};

/**
 * Handle settings changes from the app
 * Re-reads the focus feedback setting when settings are updated
 */
const handleSettingsChange = async (): Promise<void> => {
  try {
    feedbackConfig.enabled = await loadFocusFeedbackSetting();
  } catch {
    // Keep current value on error
  }
};

// Subscribe to settings changes
settingsEmitter.addListener(handleSettingsChange);

/**
 * Initialize focus feedback settings from storage
 * Call this early in app initialization
 */
export const initializeFocusFeedback = async (): Promise<void> => {
  if (feedbackConfig.initialized) {
    return;
  }

  try {
    feedbackConfig.enabled = await loadFocusFeedbackSetting();
    feedbackConfig.initialized = true;
  } catch {
    // Default to enabled on TV platforms
    feedbackConfig.enabled = Platform.isTV === true;
    feedbackConfig.initialized = true;
  }
};

/**
 * Set whether focus feedback is enabled (in-memory only)
 * The actual persistence is handled by useSettings hook
 *
 * @param enabled - Whether to enable focus feedback
 */
export const setFocusFeedbackEnabled = (enabled: boolean): void => {
  feedbackConfig.enabled = enabled;
  feedbackConfig.initialized = true;
};

/**
 * Get whether focus feedback is currently enabled
 */
export const isFocusFeedbackEnabled = (): boolean => {
  return feedbackConfig.enabled;
};

/**
 * Trigger haptic feedback for focus changes
 * Uses expo-haptics for cross-platform haptic feedback
 *
 * @param type - The type of focus feedback to trigger
 * @returns Promise that resolves when feedback is complete
 *
 * @example
 * ```tsx
 * // In a focus handler
 * const handleFocus = () => {
 *   triggerFocusFeedback('navigation');
 * };
 * ```
 */
export const triggerFocusFeedback = async (
  type: FocusFeedbackType = 'navigation'
): Promise<void> => {
  // Skip if feedback is disabled
  if (!feedbackConfig.enabled) {
    return;
  }

  // Skip if not on a TV platform (mobile devices don't need focus feedback)
  if (Platform.isTV !== true) {
    return;
  }

  // Throttle feedback to prevent rapid-fire triggers
  const now = Date.now();
  if (now - feedbackConfig.lastFeedbackTime < feedbackConfig.minInterval) {
    return;
  }
  feedbackConfig.lastFeedbackTime = now;

  try {
    // Map feedback types to appropriate haptic styles
    switch (type) {
      case 'navigation':
        // Light impact for focus movement between elements
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case 'selection':
        // Selection feedback for selecting an item
        await Haptics.selectionAsync();
        break;

      case 'action':
        // Medium impact for confirming an action
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;

      default:
        // Default to light impact
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Silently fail - haptic feedback is non-critical
    // May fail on devices without haptic support
  }
};

/**
 * Trigger focus feedback synchronously (fire-and-forget)
 * Use this when you don't need to wait for the feedback to complete
 *
 * @param type - The type of focus feedback to trigger
 *
 * @example
 * ```tsx
 * // In a focus callback where you can't await
 * onFocus: () => {
 *   triggerFocusFeedbackSync('navigation');
 *   // ... rest of focus handling
 * }
 * ```
 */
export const triggerFocusFeedbackSync = (type: FocusFeedbackType = 'navigation'): void => {
  triggerFocusFeedback(type).catch(() => {
    // Silently ignore errors
  });
};

export default {
  initializeFocusFeedback,
  setFocusFeedbackEnabled,
  isFocusFeedbackEnabled,
  triggerFocusFeedback,
  triggerFocusFeedbackSync,
};
