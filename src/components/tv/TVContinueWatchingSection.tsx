/**
 * TV-Optimized Continue Watching Section
 *
 * A horizontally scrolling section optimized for 10-foot TV viewing distance.
 * Features:
 * - Large, easily readable progress bars (10px height)
 * - Enhanced focus indicators with glow effects
 * - Larger typography for TV distance
 * - D-pad navigation with smooth scrolling
 * - Scale animations on focus
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import FastImage from '@d11/react-native-fast-image';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';
import Focusable from '../common/Focusable';
import { TV_SPACING } from '../../utils/tvStyles/spacing';
import { TV_TYPOGRAPHY } from '../../utils/tvStyles/typography';
import { TV_FOCUS_CONFIG } from '../../utils/tvStyles/focus';
import { TV_ANIMATIONS } from '../../utils/tvStyles/animations';
import { isTV } from '../../utils/tvStyles/deviceDetection';
import { scaleForTV } from '../../utils/tvStyles/helpers';

// ============================================================================
// TYPES
// ============================================================================

export interface TVContinueWatchingItem {
  id: string;
  name: string;
  type: 'movie' | 'series';
  poster?: string | null;
  progress: number; // 0-100 percentage
  lastUpdated: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  year?: number;
  addonId?: string;
}

export interface TVContinueWatchingSectionProps {
  /** Items to display in the continue watching section */
  data: TVContinueWatchingItem[];
  /** Loading state */
  loading?: boolean;
  /** Callback when an item is pressed */
  onItemPress?: (item: TVContinueWatchingItem, index: number) => void;
  /** Callback when an item is long-pressed (for deletion) */
  onItemLongPress?: (item: TVContinueWatchingItem, index: number) => void;
  /** Whether to show the section header */
  showHeader?: boolean;
  /** Custom section title */
  title?: string;
  /** Reference to the FlashList for external control */
  listRef?: React.RefObject<any>;
  /** Callback when a section edge is reached during navigation */
  onEdgeReached?: (direction: 'left' | 'right') => void;
  /** Whether this section should receive initial focus */
  hasTVPreferredFocus?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// TV-OPTIMIZED CONSTANTS
// ============================================================================

const TV_CONTINUE_WATCHING = {
  // Item sizing optimized for 10-foot viewing
  itemWidth: 480,        // Larger width for TV
  itemHeight: 200,       // Taller for better readability
  posterWidth: 130,      // Wider poster

  // Progress bar sizing for visibility at distance
  progressBarHeight: 10, // Thick enough to see from 10 feet
  progressBarRadius: 5,

  // Typography for TV distance
  titleFontSize: 24,
  episodeFontSize: 20,
  progressFontSize: 18,
  yearFontSize: 18,

  // Spacing
  itemSpacing: 24,
  horizontalPadding: 48,
  contentPadding: 20,

  // Focus animation
  focusScale: 1.05,
  focusBorderWidth: 4,

  // Section header
  headerFontSize: 36,
  headerMarginBottom: 24,
  underlineWidth: 60,
  underlineHeight: 5,
};

// ============================================================================
// TV CONTINUE WATCHING ITEM COMPONENT
// ============================================================================

interface TVContinueWatchingItemProps {
  item: TVContinueWatchingItem;
  index: number;
  isFocused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onFocus: () => void;
  currentTheme: any;
  posterBorderRadius: number;
}

const TVContinueWatchingItemComponent = React.memo<TVContinueWatchingItemProps>(({
  item,
  index,
  isFocused,
  onPress,
  onLongPress,
  onFocus,
  currentTheme,
  posterBorderRadius,
}) => {
  const isUpNext = item.type === 'series' && item.progress === 0;

  // Animated glow effect for focus
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withSpring(isFocused ? 1 : 0, {
      damping: TV_ANIMATIONS.focusSpring.damping,
      stiffness: TV_ANIMATIONS.focusSpring.stiffness,
    });
  }, [isFocused]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(
      glowOpacity.value,
      [0, 1],
      [0.1, 0.8],
      Extrapolate.CLAMP
    ),
    shadowRadius: interpolate(
      glowOpacity.value,
      [0, 1],
      [4, 16],
      Extrapolate.CLAMP
    ),
  }));

  return (
    <Focusable
      style={[
        styles.itemContainer,
        {
          backgroundColor: currentTheme.colors.elevation1,
          borderRadius: posterBorderRadius,
          borderWidth: TV_CONTINUE_WATCHING.focusBorderWidth,
          borderColor: 'transparent',
        },
      ]}
      focusedStyle={{
        borderColor: currentTheme.colors.primary,
        shadowColor: currentTheme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 16,
        elevation: 12,
      }}
      scaleOnFocus={TV_CONTINUE_WATCHING.focusScale}
      onPress={onPress}
      onLongPress={onLongPress}
      onFocus={onFocus}
      hasTVPreferredFocus={index === 0}
      testID={`tv-continue-watching-item-${item.id}`}
    >
      {/* Poster Image */}
      <View style={[
        styles.posterContainer,
        { borderTopLeftRadius: posterBorderRadius, borderBottomLeftRadius: posterBorderRadius }
      ]}>
        <FastImage
          source={{
            uri: item.poster || 'https://via.placeholder.com/300x450',
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }}
          style={[
            styles.poster,
            { borderTopLeftRadius: posterBorderRadius, borderBottomLeftRadius: posterBorderRadius }
          ]}
          resizeMode={FastImage.resizeMode.cover}
        />
      </View>

      {/* Content Details */}
      <View style={styles.contentDetails}>
        {/* Title Row with Up Next Badge */}
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.itemTitle,
              { color: currentTheme.colors.highEmphasis }
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {isUpNext && (
            <View style={[
              styles.upNextBadge,
              { backgroundColor: currentTheme.colors.primary }
            ]}>
              <Text style={styles.upNextText}>Up Next</Text>
            </View>
          )}
        </View>

        {/* Episode Info or Year */}
        {item.type === 'series' && item.season && item.episode ? (
          <View style={styles.episodeRow}>
            <Text style={[
              styles.episodeText,
              { color: currentTheme.colors.mediumEmphasis }
            ]}>
              Season {item.season}, Episode {item.episode}
            </Text>
            {item.episodeTitle && (
              <Text
                style={[
                  styles.episodeTitle,
                  { color: currentTheme.colors.mediumEmphasis }
                ]}
                numberOfLines={1}
              >
                {item.episodeTitle}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[
            styles.yearText,
            { color: currentTheme.colors.mediumEmphasis }
          ]}>
            {item.year} {'\u2022'} {item.type === 'movie' ? 'Movie' : 'Series'}
          </Text>
        )}

        {/* Progress Bar - Enhanced for TV visibility */}
        {item.progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[
              styles.progressTrack,
              { backgroundColor: 'rgba(255,255,255,0.15)' }
            ]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${item.progress}%`,
                    backgroundColor: currentTheme.colors.primary,
                  }
                ]}
              />
              {/* Progress glow effect for better visibility */}
              <View
                style={[
                  styles.progressGlow,
                  {
                    width: `${item.progress}%`,
                    backgroundColor: currentTheme.colors.primary,
                    opacity: 0.5,
                  }
                ]}
              />
            </View>
            <Text style={[
              styles.progressLabel,
              { color: currentTheme.colors.textMuted }
            ]}>
              {Math.round(item.progress)}% watched
            </Text>
          </View>
        )}
      </View>
    </Focusable>
  );
});

TVContinueWatchingItemComponent.displayName = 'TVContinueWatchingItemComponent';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TVContinueWatchingSection: React.FC<TVContinueWatchingSectionProps> = ({
  data,
  loading = false,
  onItemPress,
  onItemLongPress,
  showHeader = true,
  title = 'Continue Watching',
  listRef: externalListRef,
  onEdgeReached,
  hasTVPreferredFocus,
  testID = 'tv-continue-watching-section',
}) => {
  const { width } = useWindowDimensions();
  const { currentTheme } = useTheme();
  const { settings } = useSettings();
  const internalListRef = useRef<any>(null);
  const listRef = externalListRef || internalListRef;
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Handle item press
  const handleItemPress = useCallback(
    (item: TVContinueWatchingItem, index: number) => {
      onItemPress?.(item, index);
    },
    [onItemPress]
  );

  // Handle item long press
  const handleItemLongPress = useCallback(
    (item: TVContinueWatchingItem, index: number) => {
      onItemLongPress?.(item, index);
    },
    [onItemLongPress]
  );

  // Handle focus change and scroll to focused item
  const handleFocusChange = useCallback(
    (index: number) => {
      setFocusedIndex(index);

      // Scroll to focused item with proper positioning
      if (listRef.current && Platform.isTV) {
        try {
          listRef.current.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.1, // Keep item slightly from left edge
          });
        } catch (error) {
          // Ignore scroll errors
        }
      }

      // Check for edge reaching
      if (index === 0) {
        onEdgeReached?.('left');
      } else if (index === data.length - 1) {
        onEdgeReached?.('right');
      }
    },
    [data.length, onEdgeReached]
  );

  // Memoized item separator
  const ItemSeparator = useCallback(
    () => <View style={{ width: TV_CONTINUE_WATCHING.itemSpacing }} />,
    []
  );

  // Memoized key extractor
  const keyExtractor = useCallback(
    (item: TVContinueWatchingItem) => `tv-continue-${item.id}-${item.type}`,
    []
  );

  // Render item
  const renderItem = useCallback(
    ({ item, index }: { item: TVContinueWatchingItem; index: number }) => (
      <TVContinueWatchingItemComponent
        item={item}
        index={index}
        isFocused={index === focusedIndex}
        onPress={() => handleItemPress(item, index)}
        onLongPress={() => handleItemLongPress(item, index)}
        onFocus={() => handleFocusChange(index)}
        currentTheme={currentTheme}
        posterBorderRadius={settings.posterBorderRadius ?? 12}
      />
    ),
    [
      focusedIndex,
      handleItemPress,
      handleItemLongPress,
      handleFocusChange,
      currentTheme,
      settings.posterBorderRadius,
    ]
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer} testID={`${testID}-loading`}>
        <ActivityIndicator
          size="large"
          color={currentTheme.colors.primary}
        />
      </View>
    );
  }

  // Empty state - don't render section
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Section Header */}
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[
              styles.sectionTitle,
              { color: currentTheme.colors.text }
            ]}>
              {title}
            </Text>
            <View style={[
              styles.titleUnderline,
              { backgroundColor: currentTheme.colors.primary }
            ]} />
          </View>
        </View>
      )}

      {/* Horizontal List */}
      <FlashList
        ref={listRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!Platform.isTV} // Disable scroll on TV (D-pad handles it)
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
        estimatedItemSize={TV_CONTINUE_WATCHING.itemWidth}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        testID={`${testID}-list`}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: TV_SPACING.sectionMargin,
    paddingTop: TV_SPACING.md,
  },
  loadingContainer: {
    height: TV_CONTINUE_WATCHING.itemHeight + 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: TV_CONTINUE_WATCHING.horizontalPadding,
    marginBottom: TV_CONTINUE_WATCHING.headerMarginBottom,
  },
  titleContainer: {
    position: 'relative',
  },
  sectionTitle: {
    fontSize: TV_CONTINUE_WATCHING.headerFontSize,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  titleUnderline: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    width: TV_CONTINUE_WATCHING.underlineWidth,
    height: TV_CONTINUE_WATCHING.underlineHeight,
    borderRadius: 3,
    opacity: 0.9,
  },
  listContent: {
    paddingHorizontal: TV_CONTINUE_WATCHING.horizontalPadding,
    paddingVertical: TV_SPACING.md,
  },
  itemContainer: {
    width: TV_CONTINUE_WATCHING.itemWidth,
    height: TV_CONTINUE_WATCHING.itemHeight,
    flexDirection: 'row',
    overflow: 'hidden',
    // Base shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  posterContainer: {
    width: TV_CONTINUE_WATCHING.posterWidth,
    height: '100%',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  contentDetails: {
    flex: 1,
    padding: TV_CONTINUE_WATCHING.contentPadding,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: TV_CONTINUE_WATCHING.titleFontSize,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  upNextBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  upNextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  episodeRow: {
    marginBottom: 12,
  },
  episodeText: {
    fontSize: TV_CONTINUE_WATCHING.episodeFontSize,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeTitle: {
    fontSize: TV_CONTINUE_WATCHING.episodeFontSize - 2,
    fontWeight: '500',
  },
  yearText: {
    fontSize: TV_CONTINUE_WATCHING.yearFontSize,
    fontWeight: '500',
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 'auto',
  },
  progressTrack: {
    height: TV_CONTINUE_WATCHING.progressBarHeight,
    borderRadius: TV_CONTINUE_WATCHING.progressBarRadius,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    borderRadius: TV_CONTINUE_WATCHING.progressBarRadius,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  progressGlow: {
    height: '100%',
    borderRadius: TV_CONTINUE_WATCHING.progressBarRadius,
    position: 'absolute',
    top: 0,
    left: 0,
    // Glow effect for better visibility at distance
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressLabel: {
    fontSize: TV_CONTINUE_WATCHING.progressFontSize,
    fontWeight: '600',
  },
});

export default TVContinueWatchingSection;
