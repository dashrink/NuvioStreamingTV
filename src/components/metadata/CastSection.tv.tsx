/**
 * CastSection.tv.tsx
 *
 * TV-specific cast section component with D-pad navigable cast members
 * and focus states for TV remote navigation.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - D-pad navigable cast cards (left/right)
 * - Visible focus states on cast members
 * - Auto-scrolling to keep focused item visible
 * - Integration with TVNavigationContext for focus memory
 * - tvParallaxProperties for Apple TV depth effects
 */

import React, { useCallback, useMemo, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
  findNodeHandle,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import Focusable from '../common/Focusable';
import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';

// =============================================================================
// Constants
// =============================================================================

const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

// =============================================================================
// Types & Interfaces
// =============================================================================

interface CastMember {
  id: number | string;
  name: string;
  profile_path?: string;
  character?: string;
}

interface CastSectionProps {
  cast: CastMember[];
  loadingCast: boolean;
  onSelectCastMember: (castMember: CastMember) => void;
  isTmdbEnrichmentEnabled?: boolean;
  /** Unique section ID for focus memory */
  sectionId?: string;
  /** Node handle for navigation above this component */
  nextFocusUp?: number | React.RefObject<any>;
  /** Node handle for navigation below this component */
  nextFocusDown?: number | React.RefObject<any>;
  /** Callback when focus enters this section */
  onFocusEnter?: () => void;
}

// =============================================================================
// Component Implementation
// =============================================================================

const CastSectionComponent: React.FC<CastSectionProps> = ({
  cast,
  loadingCast,
  onSelectCastMember,
  isTmdbEnrichmentEnabled = true,
  sectionId = 'cast-section',
  nextFocusUp,
  nextFocusDown,
  onFocusEnter,
}) => {
  const { currentTheme } = useTheme();

  // TV Navigation context
  const tvNav = useTVNavigationOptional();

  // Responsive sizing
  const deviceWidth = Dimensions.get('window').width;

  const getDeviceType = useCallback(() => {
    if (deviceWidth >= BREAKPOINTS.tv) return 'tv';
    if (deviceWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
    if (deviceWidth >= BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
  }, [deviceWidth]);

  const deviceType = getDeviceType();
  const isTablet = deviceType === 'tablet';
  const isLargeTablet = deviceType === 'largeTablet';
  const isTV = deviceType === 'tv' || Platform.isTV;

  // Responsive sizing values
  const horizontalPadding = useMemo(() => {
    switch (deviceType) {
      case 'tv': return 32;
      case 'largeTablet': return 28;
      case 'tablet': return 24;
      default: return 16;
    }
  }, [deviceType]);

  const castCardWidth = useMemo(() => {
    switch (deviceType) {
      case 'tv': return 140;
      case 'largeTablet': return 120;
      case 'tablet': return 110;
      default: return 90;
    }
  }, [deviceType]);

  const castImageSize = useMemo(() => {
    switch (deviceType) {
      case 'tv': return 120;
      case 'largeTablet': return 100;
      case 'tablet': return 90;
      default: return 80;
    }
  }, [deviceType]);

  const castCardSpacing = useMemo(() => {
    switch (deviceType) {
      case 'tv': return 24;
      case 'largeTablet': return 20;
      case 'tablet': return 18;
      default: return 16;
    }
  }, [deviceType]);

  // State for tracking focused index
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Refs
  const flatListRef = useRef<FlatList<CastMember>>(null);
  const castRefs = useRef<Map<number, React.RefObject<any>>>(new Map());

  // =============================================================================
  // Ref Management
  // =============================================================================

  const getCastRef = useCallback((index: number) => {
    if (!castRefs.current.has(index)) {
      castRefs.current.set(index, React.createRef());
    }
    return castRefs.current.get(index)!;
  }, []);

  // =============================================================================
  // Focus Handlers
  // =============================================================================

  const saveFocusState = useCallback((index: number) => {
    if (tvNav && index >= 0) {
      const focusId = `${sectionId}-${index}`;
      tvNav.setScreenFocus(sectionId, focusId);
      tvNav.setCurrentFocusId(focusId);
    }
  }, [tvNav, sectionId]);

  const handleCastFocus = useCallback((index: number) => {
    setFocusedIndex(index);
    saveFocusState(index);
    onFocusEnter?.();

    // Auto-scroll to keep focused item visible
    if (flatListRef.current && index >= 0) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [saveFocusState, onFocusEnter]);

  // =============================================================================
  // Resolve NextFocus Props
  // =============================================================================

  const resolveNodeHandle = useCallback((value: number | React.RefObject<any> | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (value.current) {
      try {
        return findNodeHandle(value.current) ?? undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, []);

  // =============================================================================
  // Render Cast Item
  // =============================================================================

  const renderCastItem = useCallback(({ item, index }: { item: CastMember; index: number }) => {
    const focusId = `${sectionId}-${index}`;
    const isFirst = index === 0;
    const isLast = index === cast.length - 1;

    // Get initials for placeholder
    const initials = item.name
      .split(' ')
      .reduce((prev: string, current: string) => prev + (current[0] || ''), '')
      .substring(0, 2);

    return (
      <Animated.View entering={FadeIn.duration(300).delay(50 + index * 30)}>
        <Focusable
          ref={getCastRef(index)}
          onPress={() => onSelectCastMember(item)}
          onFocus={() => handleCastFocus(index)}
          hasTVPreferredFocus={isFirst}
          isTVSelectable={true}
          focusId={focusId}
          style={[
            styles.castCard,
            {
              width: castCardWidth,
              marginRight: castCardSpacing,
            },
          ]}
          animationConfig={{
            focusScale: 1.08,
            unfocusedOpacity: 0.85,
            showFocusBorder: true,
            focusBorderColor: currentTheme.colors.primary || '#007AFF',
            focusBorderWidth: 3,
            animateShadow: Platform.OS === 'ios',
          }}
          tvParallaxProperties={{
            enabled: Platform.OS === 'ios',
            shiftDistanceX: 2,
            shiftDistanceY: 2,
            tiltAngle: 0.05,
            magnification: 1.0,
            pressMagnification: 1.02,
            pressDuration: 0.3,
          }}
          nextFocus={{
            nextFocusLeft: isFirst ? undefined : getCastRef(index - 1),
            nextFocusRight: isLast ? undefined : getCastRef(index + 1),
            nextFocusUp,
            nextFocusDown,
          }}
          accessibilityLabel={`${item.name}${item.character ? `, as ${item.character}` : ''}`}
          accessibilityHint="Press to see cast member details"
        >
          <View
            style={[
              styles.castImageContainer,
              {
                width: castImageSize,
                height: castImageSize,
                borderRadius: castImageSize / 2,
                marginBottom: isTV ? 12 : isLargeTablet ? 10 : isTablet ? 8 : 8,
              },
            ]}
          >
            {item.profile_path ? (
              <FastImage
                source={{
                  uri: `https://image.tmdb.org/t/p/w185${item.profile_path}`,
                }}
                style={styles.castImage}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <View
                style={[
                  styles.castImagePlaceholder,
                  {
                    backgroundColor: currentTheme.colors.darkBackground,
                    borderRadius: castImageSize / 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.placeholderText,
                    {
                      color: currentTheme.colors.textMuted,
                      fontSize: isTV ? 36 : isLargeTablet ? 32 : isTablet ? 28 : 24,
                    },
                  ]}
                >
                  {initials}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.castName,
              {
                color: currentTheme.colors.text,
                fontSize: isTV ? 16 : isLargeTablet ? 15 : isTablet ? 14 : 14,
                width: castCardWidth,
              },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {isTmdbEnrichmentEnabled && item.character && (
            <Text
              style={[
                styles.characterName,
                {
                  color: currentTheme.colors.textMuted,
                  fontSize: isTV ? 14 : isLargeTablet ? 13 : isTablet ? 12 : 12,
                  width: castCardWidth,
                  marginTop: isTV ? 4 : isLargeTablet ? 3 : isTablet ? 2 : 2,
                },
              ]}
              numberOfLines={1}
            >
              {item.character}
            </Text>
          )}
        </Focusable>
      </Animated.View>
    );
  }, [
    cast.length,
    sectionId,
    castCardWidth,
    castCardSpacing,
    castImageSize,
    isTV,
    isLargeTablet,
    isTablet,
    currentTheme,
    getCastRef,
    handleCastFocus,
    onSelectCastMember,
    isTmdbEnrichmentEnabled,
    nextFocusUp,
    nextFocusDown,
  ]);

  // =============================================================================
  // Loading State
  // =============================================================================

  if (loadingCast) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={currentTheme.colors.primary} />
      </View>
    );
  }

  if (!cast || cast.length === 0) {
    return null;
  }

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <Animated.View style={styles.castSection} entering={FadeIn.duration(300).delay(150)}>
      <View style={[styles.sectionHeader, { paddingHorizontal: horizontalPadding }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: currentTheme.colors.highEmphasis,
              fontSize: isTV ? 24 : isLargeTablet ? 22 : isTablet ? 20 : 18,
              marginBottom: isTV ? 16 : isLargeTablet ? 14 : isTablet ? 12 : 12,
            },
          ]}
        >
          Cast
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        horizontal
        data={cast}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.castList, { paddingHorizontal: horizontalPadding }]}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCastItem}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: castCardWidth + castCardSpacing,
          offset: horizontalPadding + (castCardWidth + castCardSpacing) * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: horizontalPadding + (castCardWidth + castCardSpacing) * info.index,
              animated: true,
            });
          }, 100);
        }}
      />
    </Animated.View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  castSection: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  castList: {
    paddingBottom: 8,
  },
  castCard: {
    alignItems: 'center',
  },
  castImageContainer: {
    overflow: 'hidden',
  },
  castImage: {
    width: '100%',
    height: '100%',
  },
  castImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontWeight: '600',
  },
  castName: {
    fontWeight: '600',
    textAlign: 'center',
  },
  characterName: {
    textAlign: 'center',
  },
});

// =============================================================================
// Export
// =============================================================================

export const CastSection = memo(CastSectionComponent);
