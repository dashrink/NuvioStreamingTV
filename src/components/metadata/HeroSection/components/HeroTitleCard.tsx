/**
 * HeroTitleCard Component
 *
 * Displays the content title or logo in the HeroSection with a three-level fallback:
 * 1. TMDB logo (primary)
 * 2. Addon logo (secondary fallback)
 * 3. Text title (final fallback)
 *
 * Features:
 * - Smooth fade animations when logo loads
 * - Grace period before showing text fallback to prevent flickering
 * - Stable logo URI management to prevent layout jumps
 * - Responsive tablet/phone sizing
 * - Scale animation when progress bar is present
 *
 * @module HeroSection/components/HeroTitleCard
 */

import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../../../../contexts/ThemeContext';
import { LOGO_CONFIG, UI_TIMING } from '../constants';
import { containerStyles, textStyles, sizes, isTablet, screenWidth } from '../styles';

import type { HeroTitleCardProps } from '../types';

/**
 * Title card component displaying content logo or title with fallback logic.
 *
 * Implements a three-level fallback system:
 * 1. Attempts to load the TMDB logo first (metadata.logo)
 * 2. Falls back to addon logo if TMDB logo fails (metadata.addonLogo)
 * 3. Falls back to text title if no logos are available or all fail
 *
 * The component includes a grace period before showing the text fallback
 * to allow for slower logo loads without causing UI flicker.
 *
 * @param props - Component props
 * @param props.metadata - Content metadata containing logo URLs and title
 * @param props.type - Content type ('movie' or 'series')
 * @param props.tmdbId - Optional TMDB ID for the content
 * @param props.logoOpacity - Shared value controlling logo opacity from parent animations
 * @param props.onStableLogoUriChange - Optional callback when stable logo URI changes
 *
 * @example
 * ```tsx
 * <HeroTitleCard
 *   metadata={movieMetadata}
 *   type="movie"
 *   tmdbId={12345}
 *   logoOpacity={logoOpacity}
 *   onStableLogoUriChange={(uri) => console.log('Logo:', uri)}
 * />
 * ```
 */
const HeroTitleCard = memo(
  ({ metadata, type, tmdbId, logoOpacity, onStableLogoUriChange }: HeroTitleCardProps) => {
    const { currentTheme } = useTheme();

    // Stable logo state management - prevents flickering between logo and text
    const [stableLogoUri, setStableLogoUri] = useState<string | null>(metadata?.logo || null);
    const [logoHasLoadedSuccessfully, setLogoHasLoadedSuccessfully] = useState(false);

    // Smooth fade-in for logo when it finishes loading
    const logoLoadOpacity = useSharedValue(0);

    // Grace delay before showing text fallback to avoid flashing when logo arrives late
    const [shouldShowTextFallback, setShouldShowTextFallback] = useState<boolean>(!metadata?.logo);

    // Timer ref for grace period
    const logoWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Ref to track the last synced logo to break circular dependency with error handling
    const lastSyncedLogoRef = useRef<string | undefined>(metadata?.logo);

    // Theme colors for text fallback
    const textColor = currentTheme.colors.highEmphasis;

    /**
     * Update stable logo URI when metadata logo changes.
     * Implements grace period logic for text fallback.
     */
    useEffect(() => {
      const currentMetadataLogo = metadata?.logo;

      if (currentMetadataLogo !== lastSyncedLogoRef.current) {
        lastSyncedLogoRef.current = currentMetadataLogo;

        // Clear any existing timer
        if (logoWaitTimerRef.current) {
          try {
            clearTimeout(logoWaitTimerRef.current);
          } catch (_e) {
            // Ignore cleanup errors
          }
          logoWaitTimerRef.current = null;
        }

        if (currentMetadataLogo) {
          // New logo available - reset states and show it
          setStableLogoUri(currentMetadataLogo);
          onStableLogoUriChange?.(currentMetadataLogo);
          setLogoHasLoadedSuccessfully(false);
          logoLoadOpacity.value = 0; // Reset fade for new logo
          setShouldShowTextFallback(false);
        } else {
          // No logo - clear and start grace period
          setStableLogoUri(null);
          onStableLogoUriChange?.(null);
          setLogoHasLoadedSuccessfully(false);

          // Start grace period before showing text fallback
          logoWaitTimerRef.current = setTimeout(() => {
            setShouldShowTextFallback(true);
          }, LOGO_CONFIG.TEXT_FALLBACK_DELAY);
        }
      }

      // Cleanup on unmount
      return () => {
        if (logoWaitTimerRef.current) {
          try {
            clearTimeout(logoWaitTimerRef.current);
          } catch (_e) {
            // Ignore cleanup errors
          }
          logoWaitTimerRef.current = null;
        }
      };
    }, [metadata?.logo, onStableLogoUriChange, logoLoadOpacity]);

    /**
     * Handle logo load success - once loaded successfully, keep it stable
     */
    const handleLogoLoad = useCallback(() => {
      setLogoHasLoadedSuccessfully(true);
      setShouldShowTextFallback(false);
      logoLoadOpacity.value = withTiming(1, { duration: UI_TIMING.LOGO_LOAD });
    }, [logoLoadOpacity]);

    /**
     * Handle logo load error - implements three-level fallback:
     * TMDB logo → addon logo → text
     */
    const handleLogoError = useCallback(() => {
      if (!logoHasLoadedSuccessfully) {
        // Try addon logo as fallback if TMDB logo fails
        const addonLogo = (metadata as any)?.addonLogo;

        if (addonLogo && stableLogoUri !== addonLogo) {
          // TMDB logo failed, try addon logo
          setStableLogoUri(addonLogo);
          setLogoHasLoadedSuccessfully(false);
          logoLoadOpacity.value = 0; // Reset fade for new logo attempt
        } else {
          // No addon logo available or addon logo also failed - show text
          setStableLogoUri(null);
          setShouldShowTextFallback(true);
        }
      }
      // If logo loaded successfully before, keep showing it even if it fails later
    }, [logoHasLoadedSuccessfully, stableLogoUri, metadata, logoLoadOpacity]);

    /**
     * Logo animated style - combines parent opacity with scale animation
     */
    const logoAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: logoOpacity.value,
        transform: [
          {
            scale: withTiming(1, { duration: UI_TIMING.LOGO_SCALE }),
          },
        ],
      };
    }, []);

    /**
     * Logo fade style - applies only to the image to avoid affecting layout
     */
    const logoFadeStyle = useAnimatedStyle(
      () => ({
        opacity: logoLoadOpacity.value,
      }),
      []
    );

    /**
     * Memoized title text to prevent unnecessary re-renders
     */
    const titleText = useMemo(() => metadata?.name || '', [metadata?.name]);

    /**
     * Determine what to render based on logo state
     */
    const renderContent = () => {
      if (metadata?.logo) {
        // Logo is available in metadata
        return (
          <Animated.Image
            source={{ uri: stableLogoUri || (metadata?.logo as string) }}
            style={[isTablet ? styles.tabletTitleLogo : styles.titleLogo, logoFadeStyle]}
            resizeMode="contain"
            onLoad={handleLogoLoad}
            onError={handleLogoError}
            accessibilityLabel={`${titleText} logo`}
          />
        );
      } else if (shouldShowTextFallback) {
        // No logo and grace period elapsed - show text
        return (
          <Text
            style={[isTablet ? styles.tabletHeroTitle : styles.heroTitle, { color: textColor }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            accessibilityRole="header"
          >
            {titleText}
          </Text>
        );
      } else {
        // Reserve space to prevent layout jump while waiting briefly for logo
        return (
          <View
            style={isTablet ? styles.tabletTitleLogo : styles.titleLogo}
            accessibilityElementsHidden
          />
        );
      }
    };

    return (
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Animated.View style={styles.titleLogoContainer}>{renderContent()}</Animated.View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  /**
   * Outer logo container with responsive sizing
   */
  logoContainer: {
    ...containerStyles.logoContainer,
  },

  /**
   * Inner container for title/logo content
   */
  titleLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 0,
    display: 'flex',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  },

  /**
   * Logo image dimensions for phone
   */
  titleLogo: {
    width: sizes.logoWidth,
    height: sizes.logoHeight,
    alignSelf: 'center',
  },

  /**
   * Logo image dimensions for tablet
   */
  tabletTitleLogo: {
    width: screenWidth * 0.5,
    height: 120,
    alignSelf: 'center',
    maxWidth: sizes.logoMaxWidth,
  },

  /**
   * Hero title text for phone
   */
  heroTitle: {
    ...textStyles.heroTitle,
  },

  /**
   * Hero title text for tablet
   */
  tabletHeroTitle: {
    ...textStyles.tabletHeroTitle,
  },
});

export default HeroTitleCard;
