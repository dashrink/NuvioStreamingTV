/**
 * TV Layout Configuration
 *
 * Provides optimized sizing for major layout components like hero sections,
 * catalogs, and grid layouts optimized for TV screens.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Hero section sizing optimized for TV
 */
export const TV_HERO = {
  // Hero height as percentage of screen
  heightPercentage: 0.70,

  // Logo container size
  logoWidth: SCREEN_WIDTH * 0.5,
  logoHeight: 120,

  // Button container padding
  buttonContainerPadding: 40,

  // Pagination dot sizes
  paginationDot: {
    inactive: 10,
    active: 40,
  },

  // Auto-rotation interval (ms)
  autoRotateInterval: 30000,
} as const;

/**
 * Catalog/content row sizing optimized for TV
 */
export const TV_CATALOG = {
  // Section header
  headerHeight: 48,
  headerFontSize: 28,
  headerPadding: 32,

  // "View All" button
  viewAllPadding: {
    vertical: 12,
    horizontal: 16,
  },
  viewAllFontSize: 16,
  viewAllIconSize: 24,

  // Content item sizing
  posterWidth: 160,
  posterSpacing: 16,
  postersPerRow: 6,

  // Title below poster
  titleFontSize: 16,
  titleMarginTop: 8,
} as const;

/**
 * Grid layout configuration
 */
export const TV_GRID = {
  // Standard grid with 6 columns
  standardColumns: 6,

  // Landscape/wide grid
  wideColumns: 8,

  // Tall/portrait grid
  narrowColumns: 3,

  // Minimum aspect ratio for grid items
  minAspectRatio: 9 / 16, // For posters
} as const;

export type TVHeroLayout = typeof TV_HERO;
export type TVCatalogLayout = typeof TV_CATALOG;
export type TVGridLayout = typeof TV_GRID;
