/**
 * TV Mode Hooks
 *
 * Provides utilities for TV platform detection and TV-specific interactions
 */

import { useEffect, useCallback } from 'react';
import { Platform, BackHandler } from 'react-native';

/**
 * Hook to handle TV back button press
 *
 * @param handler - Function to handle back button press. Return true to prevent default behavior.
 * @returns void
 */
export const useTVBackHandler = (handler: () => boolean): void => {
  const handleBackPress = useCallback(() => {
    return handler();
  }, [handler]);

  useEffect(() => {
    if (!Platform.isTV) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      subscription.remove();
    };
  }, [handleBackPress]);
};

/**
 * Check if running on TV platform
 */
export const isTVPlatform = (): boolean => Platform.isTV;

/**
 * Check if running on Android TV
 */
export const isAndroidTV = (): boolean => Platform.isTV && Platform.OS === 'android';

/**
 * Check if running on Apple TV
 */
export const isAppleTV = (): boolean => Platform.isTV && Platform.OS === 'ios';
