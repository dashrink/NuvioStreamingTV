/**
 * HeroGenres Component
 *
 * Displays genre labels with dot separators in the HeroSection.
 * Features lazy loading support, tablet responsiveness, and smooth animations.
 *
 * @module HeroSection/components/HeroGenres
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../../../contexts/ThemeContext';
import type { HeroGenresProps } from '../types';
import { LOGO_CONFIG } from '../constants';
import {
  textStyles,
  containerStyles,
  isTablet,
} from '../styles';

/**
 * Genre display component showing genre labels with dot separators.
 *
 * Implements lazy loading by only rendering when genres are provided.
 * Limits display to MAX_GENRES_DISPLAY (3) for performance and visual clarity.
 * Supports tablet-specific styling for larger screens.
 *
 * @param props - Component props
 * @param props.genres - Array of genre names to display
 * @param props.animatedStyle - Optional animated style for scroll-based animations
 *
 * @example
 * ```tsx
 * <HeroGenres
 *   genres={['Action', 'Adventure', 'Sci-Fi']}
 *   animatedStyle={genreAnimatedStyle}
 * />
 * ```
 */
const HeroGenres = memo(function HeroGenres({
  genres,
  animatedStyle,
}: HeroGenresProps) {
  const { currentTheme } = useTheme();

  // Theme color for genre text
  const textColor = currentTheme.colors.highEmphasis;

  /**
   * Memoized genre elements with dot separators.
   * Returns null if no genres are provided (lazy loading support).
   * Limits to MAX_GENRES_DISPLAY genres for performance.
   */
  const genreElements = useMemo(() => {
    if (!genres?.length) return null;

    // Limit genres for performance and visual clarity
    const genresToDisplay = genres.slice(0, LOGO_CONFIG.MAX_GENRES_DISPLAY);
    const elements: React.ReactNode[] = [];

    genresToDisplay.forEach((genreName: string, index: number) => {
      // Add genre text
      elements.push(
        <Text
          key={`genre-${index}`}
          style={[
            isTablet ? styles.tabletGenreText : styles.genreText,
            { color: textColor },
          ]}
          accessibilityRole="text"
        >
          {genreName}
        </Text>
      );

      // Add dot separator if not the last element
      if (index < genresToDisplay.length - 1) {
        elements.push(
          <Text
            key={`dot-${index}`}
            style={[
              isTablet ? styles.tabletGenreDot : styles.genreDot,
              { color: textColor },
            ]}
            accessibilityLabel=""
            accessibilityElementsHidden
          >
            •
          </Text>
        );
      }
    });

    return elements;
  }, [genres, textColor]);

  // Don't render if no genres available (lazy loading)
  if (!genreElements) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.genreContainer, animatedStyle]}
      accessibilityRole="text"
      accessibilityLabel={`Genres: ${genres?.slice(0, LOGO_CONFIG.MAX_GENRES_DISPLAY).join(', ')}`}
    >
      <View style={styles.genreRow}>
        {genreElements}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  /**
   * Outer genre container with responsive styling
   */
  genreContainer: {
    ...(isTablet
      ? containerStyles.tabletGenreContainer
      : containerStyles.genreContainer),
  },

  /**
   * Inner row for genre elements
   */
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  /**
   * Genre text style for phone
   */
  genreText: {
    ...textStyles.genreText,
  },

  /**
   * Genre text style for tablet
   */
  tabletGenreText: {
    ...textStyles.tabletGenreText,
  },

  /**
   * Genre dot separator for phone
   */
  genreDot: {
    ...textStyles.genreDot,
  },

  /**
   * Genre dot separator for tablet
   */
  tabletGenreDot: {
    ...textStyles.tabletGenreDot,
  },
});

export default HeroGenres;
