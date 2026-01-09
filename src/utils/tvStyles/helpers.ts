/**
 * TV Styling Helper Functions
 *
 * Provides utility functions for responsive sizing, scaling,
 * and platform-specific value selection.
 */

import { Dimensions } from 'react-native';
import { getDeviceType, type DeviceType } from './deviceDetection';
import { TV_SPACING } from './spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Scale a value for TV viewing
 * @param mobileValue The value to use on mobile/tablet
 * @param tvMultiplier The multiplier to apply for TV (default 1.3)
 */
export const scaleForTV = (mobileValue: number, tvMultiplier: number = 1.3): number => {
  const deviceType = getDeviceType();
  return deviceType === 'tv' ? Math.round(mobileValue * tvMultiplier) : mobileValue;
};

/**
 * Get responsive value based on device type
 * @param values Object with values for different device types
 * @returns The appropriate value for current device
 *
 * @example
 * const fontSize = getResponsiveValue({
 *   phone: 14,
 *   tablet: 16,
 *   largeTablet: 18,
 *   tv: 24,
 *   default: 14
 * });
 */
export const getResponsiveValue = <T>(values: {
  phone?: T;
  tablet?: T;
  largeTablet?: T;
  tv?: T;
  default: T;
}): T => {
  const deviceType = getDeviceType();
  return values[deviceType] ?? values.default;
};

/**
 * Calculate optimal poster count for horizontal scrolling list
 * @returns Number of posters to display per row
 */
export const getOptimalPosterCount = (screenWidth: number = SCREEN_WIDTH): number => {
  const deviceType = getDeviceType(screenWidth);

  switch (deviceType) {
    case 'tv':
      return 6;
    case 'largeTablet':
      return 5;
    case 'tablet':
      return 4;
    default:
      return 3;
  }
};

/**
 * Calculate poster width for optimal display
 * Takes into account screen width, padding, and spacing
 *
 * @param screenWidth - Screen width in dp
 * @param padding - Screen padding in dp
 * @param spacing - Gap between items in dp
 * @param showPartialNext - Whether to show partial next item
 * @returns Width for each poster in dp
 */
export const calculatePosterWidth = (
  screenWidth: number = SCREEN_WIDTH,
  padding: number = TV_SPACING.screenPadding,
  spacing: number = TV_SPACING.cardGap,
  showPartialNext: boolean = true
): number => {
  const posterCount = getOptimalPosterCount(screenWidth);
  const partialWidth = showPartialNext ? 0.25 : 0;
  const availableWidth = screenWidth - (padding * 2);
  const totalSpacing = spacing * (posterCount - 1 + (showPartialNext ? 1 : 0));

  return Math.floor((availableWidth - totalSpacing) / (posterCount + partialWidth));
};

/**
 * Calculate grid column count based on device type and item width
 * @param itemWidth - Desired width of each grid item
 * @param screenWidth - Available screen width
 * @param padding - Screen padding
 * @param gap - Gap between items
 * @returns Number of columns
 */
export const calculateGridColumns = (
  itemWidth: number,
  screenWidth: number = SCREEN_WIDTH,
  padding: number = TV_SPACING.screenPadding,
  gap: number = TV_SPACING.cardGap
): number => {
  const availableWidth = screenWidth - (padding * 2);
  const columns = Math.floor((availableWidth + gap) / (itemWidth + gap));
  return Math.max(1, columns);
};

/**
 * Get responsive spacing based on device type
 * @returns Appropriate spacing value for current device
 */
export const getResponsiveSpacing = (spacingLevel: keyof typeof TV_SPACING): number => {
  const spacing = {
    phone: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      xxl: 32,
      screenPadding: 16,
      sectionMargin: 24,
      cardGap: 12,
      listItemSpacing: 8,
    },
    tv: TV_SPACING,
  };

  const deviceType = getDeviceType();
  const spacingMap = deviceType === 'tv' ? spacing.tv : spacing.phone;
  return spacingMap[spacingLevel] || 0;
};

/**
 * Get responsive font size based on device type
 * @returns Appropriate font size for current device
 */
export const getResponsiveFontSize = (size: 'small' | 'medium' | 'large' | 'xlarge'): number => {
  const deviceType = getDeviceType();

  const fontSizes = {
    phone: { small: 12, medium: 14, large: 16, xlarge: 20 },
    tv: { small: 16, medium: 18, large: 24, xlarge: 32 },
  };

  const map = deviceType === 'tv' ? fontSizes.tv : fontSizes.phone;
  return map[size];
};

/**
 * Map a value or function across platforms
 * @param mapper Function that receives device type and returns value
 * @returns The mapped value
 *
 * @example
 * const padding = mapDeviceType((device) => {
 *   if (device === 'tv') return 48;
 *   if (device === 'tablet') return 24;
 *   return 16;
 * });
 */
export const mapDeviceType = <T>(
  mapper: (device: DeviceType) => T
): T => {
  const deviceType = getDeviceType();
  return mapper(deviceType);
};

/**
 * Clamp a value between min and max
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Interpolate between two values based on progress (0-1)
 * @returns Interpolated value
 */
export const interpolate = (
  progress: number,
  inputRange: [number, number],
  outputRange: [number, number]
): number => {
  const [inStart, inEnd] = inputRange;
  const [outStart, outEnd] = outputRange;

  if (inEnd === inStart) return outStart;

  const normalized = (progress - inStart) / (inEnd - inStart);
  return outStart + normalized * (outEnd - outStart);
};
