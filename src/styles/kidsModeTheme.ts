/**
 * Kids Mode Theme
 * Child-friendly colors and styling for kids profiles
 */

import { colors as defaultColors } from './colors';

// Kids mode color palette - bright, friendly colors
export const kidsModeColors = {
  // Primary colors - bright and playful
  primary: '#FF6B6B', // Coral red
  secondary: '#4ECDC4', // Teal
  accent: '#FFE66D', // Sunny yellow

  // Background colors - softer, warmer dark theme
  darkBackground: '#1A1A2E', // Deep purple-ish dark
  lightBackground: '#FFF5F5', // Soft pink tint

  // Text colors - maintaining contrast
  text: '#FFFFFF',
  textLight: '#FFFFFF',
  textDark: '#1F1F1F',
  textMuted: 'rgba(255, 255, 255, 0.8)',
  textMutedLight: 'rgba(255, 255, 255, 0.8)',
  textMutedDark: 'rgba(0, 0, 0, 0.6)',

  // Basic colors
  white: '#FFFFFF',
  black: '#1A1A2E',
  darkGray: '#252540',
  mediumGray: 'rgba(255, 255, 255, 0.7)',
  lightGray: 'rgba(255, 255, 255, 0.5)',

  // Status colors - friendly versions
  error: '#FF8A80', // Soft red
  success: '#69F0AE', // Bright green
  warning: '#FFD54F', // Warm yellow
  info: '#81D4FA', // Light blue

  // Transparent colors
  transparent: 'transparent',
  transparentLight: 'rgba(255, 255, 255, 0.1)',
  transparentDark: 'rgba(26, 26, 46, 0.8)',

  // Additional properties
  background: '#1A1A2E',

  // UI elements
  border: 'rgba(255, 255, 255, 0.15)',
  card: 'rgba(255, 255, 255, 0.08)',
  cardHighlight: 'rgba(255, 255, 255, 0.12)',
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Kids-specific accent colors
  accentLight: '#FF9FF3', // Pink
  accentDark: '#FF6B6B', // Coral
  surfaceVariant: 'rgba(255, 255, 255, 0.05)',

  // Elevation overlays
  elevation1: 'rgba(255, 255, 255, 0.05)',
  elevation2: 'rgba(255, 255, 255, 0.07)',
  elevation3: 'rgba(255, 255, 255, 0.12)',
  elevation4: 'rgba(255, 255, 255, 0.14)',

  // Text emphasis levels
  highEmphasis: 'rgba(255, 255, 255, 1)',
  mediumEmphasis: 'rgba(255, 255, 255, 0.8)',
  disabled: 'rgba(255, 255, 255, 0.5)',
};

// Additional fun colors for kids UI elements
export const kidsAccentColors = [
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#FF9FF3', // Pink
  '#54A0FF', // Blue
  '#FF9F43', // Orange
  '#A29BFE', // Purple
];

// Kids mode specific styles
export const kidsModeStyles = {
  // Border radius - more rounded for friendly appearance
  borderRadiusSmall: 12,
  borderRadiusMedium: 16,
  borderRadiusLarge: 24,
  borderRadiusFull: 9999,

  // Font sizes - slightly larger for readability
  fontSizeSmall: 14,
  fontSizeMedium: 16,
  fontSizeLarge: 20,
  fontSizeXLarge: 28,

  // Spacing - more generous spacing
  spacingSmall: 8,
  spacingMedium: 16,
  spacingLarge: 24,
  spacingXLarge: 32,

  // Icon sizes
  iconSizeSmall: 20,
  iconSizeMedium: 28,
  iconSizeLarge: 36,
};

// Helper function to get kids mode theme
export function getKidsModeTheme() {
  return {
    id: 'kids',
    name: 'Kids Mode',
    colors: kidsModeColors,
    isEditable: false,
    isKidsMode: true,
  };
}

// Helper function to merge kids mode colors with current theme
export function applyKidsModeOverlay(baseColors: typeof defaultColors): typeof kidsModeColors {
  return {
    ...baseColors,
    ...kidsModeColors,
  };
}

// Kids mode badge colors based on content type
export const kidsBadgeColors = {
  animation: '#FF9FF3',
  family: '#54A0FF',
  comedy: '#FFE66D',
  adventure: '#FF9F43',
  educational: '#95E1D3',
  music: '#A29BFE',
  nature: '#69F0AE',
  sports: '#4ECDC4',
};

// Get badge color for content genre
export function getKidsBadgeColor(genre: string): string {
  const normalizedGenre = genre.toLowerCase();
  for (const [key, color] of Object.entries(kidsBadgeColors)) {
    if (normalizedGenre.includes(key)) {
      return color;
    }
  }
  return kidsAccentColors[Math.floor(Math.random() * kidsAccentColors.length)];
}

export default {
  kidsModeColors,
  kidsAccentColors,
  kidsModeStyles,
  getKidsModeTheme,
  applyKidsModeOverlay,
  kidsBadgeColors,
  getKidsBadgeColor,
};
