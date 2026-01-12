import { MaterialIcons } from '@expo/vector-icons';
import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { useTraktContext } from '../../contexts/TraktContext';

// Responsive breakpoints
const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

interface TraktRatingComponentProps {
  /** IMDb ID of the content (with or without 'tt' prefix) */
  imdbId: string;
  /** Content type */
  type: 'movie' | 'show';
  /** Optional callback when rating changes */
  onRatingChange?: (rating: number | null) => void;
  /** Display size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the rating label */
  showLabel?: boolean;
  /** Whether to show the clear/remove rating button */
  showClearButton?: boolean;
  /** Custom style for container */
  style?: object;
}

/**
 * TraktRatingComponent - A reusable rating component for Trakt integration
 *
 * Displays a 1-10 star rating interface that syncs with Trakt.tv.
 * Shows the current rating if exists and allows users to set/update/remove ratings.
 *
 * ## Features
 * - 1-10 rating scale displayed as 5 stars (each star = 2 points)
 * - Half-star precision for odd ratings (e.g., 7 shows 3.5 stars)
 * - Tap-to-rate functionality with immediate visual feedback
 * - Loading states during API calls
 * - Error states with retry capability
 * - Responsive sizing for phone/tablet/TV
 *
 * ## Trakt API Integration
 * - Uses useTraktContext for getUserRating, addRating, removeRating
 * - Performs optimistic UI updates before API confirmation
 * - Rate limited via traktService (500ms between requests)
 * - IMDb IDs are normalized automatically (with 'tt' prefix)
 *
 * ## Data Flow
 * ```
 * User taps star → handleRatingPress()
 *       ↓
 * Optimistic update (setLocalRating)
 *       ↓
 * API call (addRating from context)
 *       ↓
 * Success → keep local state, trigger onRatingChange
 * Failure → rollback local state, show error
 * ```
 *
 * @see TraktRatingModal for modal-based rating alternative
 */
const TraktRatingComponent: React.FC<TraktRatingComponentProps> = memo(
  ({
    imdbId,
    type,
    onRatingChange,
    size = 'medium',
    showLabel = true,
    showClearButton = true,
    style,
  }) => {
    const { currentTheme } = useTheme();
    const { isAuthenticated, getUserRating, addRating, removeRating } = useTraktContext();

    // Local state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [localRating, setLocalRating] = useState<number | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Device type detection for responsive sizing
    const deviceWidth = Dimensions.get('window').width;
    const getDeviceType = useCallback(() => {
      if (deviceWidth >= BREAKPOINTS.tv) return 'tv';
      if (deviceWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
      if (deviceWidth >= BREAKPOINTS.tablet) return 'tablet';
      return 'phone';
    }, [deviceWidth]);

    const deviceType = getDeviceType();

    // Get current rating (prefer local if user has interacted, otherwise from context)
    const currentRating = useMemo(() => {
      if (hasInteracted && localRating !== null) {
        return localRating;
      }
      return getUserRating(imdbId, type);
    }, [hasInteracted, localRating, getUserRating, imdbId, type]);

    // Size-based styling
    const sizeConfig = useMemo(() => {
      const baseConfig = {
        small: { starSize: 16, labelSize: 12, spacing: 2 },
        medium: { starSize: 22, labelSize: 14, spacing: 3 },
        large: { starSize: 28, labelSize: 16, spacing: 4 },
      };

      // Adjust for device type
      const config = { ...baseConfig[size] };
      if (deviceType === 'tv') {
        config.starSize *= 1.3;
        config.labelSize *= 1.2;
        config.spacing *= 1.2;
      } else if (deviceType === 'largeTablet') {
        config.starSize *= 1.2;
        config.labelSize *= 1.1;
      } else if (deviceType === 'tablet') {
        config.starSize *= 1.1;
      }

      return config;
    }, [size, deviceType]);

    // Trakt brand colors
    const traktColors = useMemo(
      () => ({
        primary: '#ED1C24', // Trakt red
        filled: '#ED1C24',
        empty: currentTheme.colors.textMuted || '#666',
        hover: '#FF3B42',
      }),
      [currentTheme.colors.textMuted]
    );

    // Handle rating press - 1-10 scale displayed as 5 stars with half-star precision
    const handleRatingPress = useCallback(
      async (rating: number) => {
        if (!isAuthenticated || !imdbId || isLoading) return;

        setError(null);
        setIsLoading(true);
        setHasInteracted(true);
        setLocalRating(rating); // Optimistic update

        try {
          const success = await addRating(imdbId, type, rating);
          if (success) {
            onRatingChange?.(rating);
          } else {
            setError('Failed to save rating');
            setLocalRating(null); // Rollback on failure
            setHasInteracted(false);
          }
        } catch (err) {
          setError('Failed to save rating');
          setLocalRating(null); // Rollback on failure
          setHasInteracted(false);
        } finally {
          setIsLoading(false);
        }
      },
      [isAuthenticated, imdbId, type, isLoading, addRating, onRatingChange]
    );

    // Handle clear/remove rating
    const handleClearRating = useCallback(async () => {
      if (!isAuthenticated || !imdbId || isLoading || currentRating === null) return;

      setError(null);
      setIsLoading(true);
      const previousRating = currentRating;
      setLocalRating(null); // Optimistic update
      setHasInteracted(true);

      try {
        const success = await removeRating(imdbId, type);
        if (success) {
          onRatingChange?.(null);
        } else {
          setError('Failed to remove rating');
          setLocalRating(previousRating); // Rollback on failure
        }
      } catch (err) {
        setError('Failed to remove rating');
        setLocalRating(previousRating); // Rollback on failure
      } finally {
        setIsLoading(false);
      }
    }, [isAuthenticated, imdbId, type, isLoading, currentRating, removeRating, onRatingChange]);

    // Convert 1-10 rating to star display (5 stars, allowing half stars)
    const renderStars = useCallback(() => {
      const stars = [];
      const totalStars = 5;

      // Each star represents 2 rating points (1-2 = star 1, 3-4 = star 2, etc.)
      // Convert 1-10 rating to 0.5-5 star scale
      const starValue = currentRating ? currentRating / 2 : 0;

      for (let i = 1; i <= totalStars; i++) {
        const ratingForStar = i * 2; // The rating value this star represents when fully filled
        let iconName: 'star' | 'star-half' | 'star-outline' = 'star-outline';
        let iconColor = traktColors.empty;

        if (currentRating !== null) {
          if (currentRating >= ratingForStar) {
            // Full star
            iconName = 'star';
            iconColor = traktColors.filled;
          } else if (currentRating >= ratingForStar - 1) {
            // Half star
            iconName = 'star-half';
            iconColor = traktColors.filled;
          }
        }

        stars.push(
          <TouchableOpacity
            key={i}
            onPress={() => handleRatingPress(ratingForStar)} // Clicking star i gives rating i*2
            disabled={!isAuthenticated || isLoading}
            style={{ marginHorizontal: sizeConfig.spacing }}
            activeOpacity={0.7}
            accessibilityLabel={`Rate ${ratingForStar} out of 10`}
            accessibilityRole="button"
          >
            <MaterialIcons name={iconName} size={sizeConfig.starSize} color={iconColor} />
          </TouchableOpacity>
        );
      }

      return stars;
    }, [currentRating, traktColors, sizeConfig, handleRatingPress, isAuthenticated, isLoading]);

    // Don't render if not authenticated
    if (!isAuthenticated) {
      return null;
    }

    // Don't render if no IMDb ID
    if (!imdbId) {
      return null;
    }

    return (
      <View style={[styles.container, style]}>
        {showLabel && (
          <View style={styles.labelContainer}>
            <Text
              style={[
                styles.label,
                { color: currentTheme.colors.textMuted, fontSize: sizeConfig.labelSize },
              ]}
            >
              Your Rating
            </Text>
            {currentRating !== null && (
              <Text
                style={[
                  styles.ratingValue,
                  { color: traktColors.primary, fontSize: sizeConfig.labelSize },
                ]}
              >
                {currentRating}/10
              </Text>
            )}
          </View>
        )}

        <View style={styles.starsContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={traktColors.primary} />
          ) : (
            <>
              <View style={styles.starsRow}>{renderStars()}</View>

              {showClearButton && currentRating !== null && (
                <TouchableOpacity
                  onPress={handleClearRating}
                  style={styles.clearButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Clear rating"
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name="close"
                    size={sizeConfig.starSize * 0.8}
                    color={currentTheme.colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {error && (
          <Text style={[styles.errorText, { color: currentTheme.colors.error || '#ff4444' }]}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

TraktRatingComponent.displayName = 'TraktRatingComponent';

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontWeight: '500',
  },
  ratingValue: {
    fontWeight: '700',
    marginLeft: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginLeft: 12,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default TraktRatingComponent;
