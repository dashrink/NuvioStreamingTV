/**
 * Device Detection and Classification
 *
 * Provides utilities for detecting device type and capabilities
 * to enable responsive design across phones, tablets, and TVs.
 */

import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device type classification
export type DeviceType = 'phone' | 'tablet' | 'largeTablet' | 'tv';

/**
 * Device size breakpoints in dp
 */
export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
} as const;

/**
 * Detect the current device type based on screen width and platform
 */
export const getDeviceType = (screenWidth: number = SCREEN_WIDTH): DeviceType => {
  // Always treat TV devices as 'tv' regardless of reported dp width
  if (Platform.isTV) return 'tv';
  if (screenWidth >= BREAKPOINTS.tv) return 'tv';
  if (screenWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
  if (screenWidth >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
};

/**
 * Platform detection constants
 */
export const isTV = Platform.isTV;
export const isAndroidTV = Platform.isTV && Platform.OS === 'android';
export const isAppleTV = Platform.isTV && Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';
export const isWeb = Platform.OS === 'web';

/**
 * Device dimension utilities
 */
export const DEVICE_DIMENSIONS = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  aspectRatio: SCREEN_WIDTH / SCREEN_HEIGHT,
  isLandscape: SCREEN_WIDTH > SCREEN_HEIGHT,
  isPortrait: SCREEN_HEIGHT > SCREEN_WIDTH,
} as const;

/**
 * Check if device is TV platform
 */
export const isTVDevice = (): boolean => isTV;

/**
 * Check if device is mobile (phone)
 */
export const isMobileDevice = (): boolean => !isTV && getDeviceType() === 'phone';

/**
 * Check if device is tablet (any size)
 */
export const isTabletDevice = (): boolean => {
  const type = getDeviceType();
  return type === 'tablet' || type === 'largeTablet';
};

/**
 * Get safe area insets (platform dependent)
 */
export const getSafeAreaInsets = () => {
  if (isAppleTV) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };
  }
  // Will be properly set by SafeAreaProvider in actual app
  return { top: 0, bottom: 0, left: 0, right: 0 };
};

export type Breakpoints = typeof BREAKPOINTS;
export type DeviceDimensions = typeof DEVICE_DIMENSIONS;
