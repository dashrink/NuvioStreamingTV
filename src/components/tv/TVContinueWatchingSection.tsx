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
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';
import Focusable from '../common/Focusable';
import ContentItem from '../home/ContentItem';
import { StreamingContent } from '../../services/catalogService';
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
  // Spacing
  itemSpacing: 24,
  horizontalPadding: 48,

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
  onPress: () => void;
  onFocus: () => void;
}

const TVContinueWatchingItemComponent = React.memo<TVContinueWatchingItemProps>(({
  item,
  index,
  onPress,
  onFocus,
}) => {
  // Map TVContinueWatchingItem to StreamingContent
  const contentItem: StreamingContent = {
    ...item,
    title: item.name,
  } as unknown as StreamingContent;

  return (
    <ContentItem
      item={contentItem}
      index={index}
      onPress={onPress}
      onItemFocus={onFocus}
      hasTVPreferredFocus={false}
    />
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
        onPress={() => handleItemPress(item, index)}
        onFocus={() => handleFocusChange(index)}
      />
    ),
    [
      handleItemPress,
      handleFocusChange,
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
        // @ts-ignore
        estimatedItemSize={150 + TV_CONTINUE_WATCHING.itemSpacing}
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
    height: 300,
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
});

export default TVContinueWatchingSection;
