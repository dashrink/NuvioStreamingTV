import FastImage from '@d11/react-native-fast-image';
import { MaterialIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation';
import { isTV, getDeviceType } from '../../utils/tvStyles/deviceDetection';
import { TV_FOCUS_CONFIG } from '../../utils/tvStyles/focus';
import { scaleForTV } from '../../utils/tvStyles/helpers';
import { TV_CATALOG } from '../../utils/tvStyles/layout';
import { TV_SPACING } from '../../utils/tvStyles/spacing';
import { TV_TYPOGRAPHY } from '../../utils/tvStyles/typography';
import Focusable from '../common/Focusable';

/**
 * Grid item types supported by TVLibraryGrid
 */
export interface TVLibraryItem {
  id: string;
  name: string;
  type: 'movie' | 'series' | 'folder';
  poster?: string | null;
  icon?: keyof typeof MaterialIcons.glyphMap;
  itemCount?: number;
  year?: number;
  progress?: number;
  watched?: boolean;
  rating?: number;
  imdbId?: string;
  traktId?: number;
}

/**
 * Props for TVLibraryGrid component
 */
export interface TVLibraryGridProps {
  /** Data to display in the grid */
  data: TVLibraryItem[];
  /** Loading state */
  loading?: boolean;
  /** Callback when an item is pressed */
  onItemPress?: (item: TVLibraryItem, index: number) => void;
  /** Callback when an item is long-pressed */
  onItemLongPress?: (item: TVLibraryItem, index: number) => void;
  /** Callback when focus reaches the edge of the grid */
  onEdgeReached?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  /** Whether to show item titles below posters */
  showTitles?: boolean;
  /** Header component to render above the grid */
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Empty state component */
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Unique ID for focus group */
  focusGroupId?: string;
  /** Whether grid should auto-focus first item */
  autoFocus?: boolean;
  /** Initial focus index */
  initialFocusIndex?: number;
  /** Reference to the FlashList */
  listRef?: React.RefObject<any>;
}

/**
 * Calculate optimal grid layout for TV
 */
const getTVGridLayout = (
  screenWidth: number
): { numColumns: number; itemWidth: number; horizontalPadding: number } => {
  const deviceType = getDeviceType(screenWidth);
  const horizontalPadding = TV_SPACING.screenPadding;
  const gutter = TV_SPACING.cardGap;

  // Optimized column count for TV viewing
  let numColumns = 5;
  if (deviceType === 'tv') {
    numColumns = screenWidth >= 1920 ? 7 : screenWidth >= 1600 ? 6 : 5;
  } else if (deviceType === 'largeTablet') {
    numColumns = 5;
  } else if (deviceType === 'tablet') {
    numColumns = 4;
  } else {
    numColumns = 3;
  }

  const availableWidth = screenWidth - horizontalPadding * 2 - (numColumns - 1) * gutter;
  const itemWidth = Math.floor(availableWidth / numColumns);

  return { numColumns, itemWidth, horizontalPadding };
};

/**
 * TV Library Grid Item Component
 */
const TVLibraryGridItem = React.memo<{
  item: TVLibraryItem;
  index: number;
  width: number;
  isFocused: boolean;
  showTitle: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onFocus: () => void;
  currentTheme: any;
  posterBorderRadius: number;
}>(
  ({
    item,
    index,
    width,
    isFocused,
    showTitle,
    onPress,
    onLongPress,
    onFocus,
    currentTheme,
    posterBorderRadius,
  }) => {
    const isFolder = item.type === 'folder';

    return (
      <Focusable
        style={[styles.itemContainer, { width, marginBottom: TV_SPACING.lg }]}
        onPress={onPress}
        onLongPress={onLongPress}
        onFocus={onFocus}
        hasTVPreferredFocus={isFocused && index === 0}
        scaleOnFocus={TV_FOCUS_CONFIG.focusScale}
      >
        <View>
          <View
            style={[
              styles.posterContainer,
              {
                borderRadius: posterBorderRadius,
                backgroundColor: isFolder
                  ? currentTheme.colors.elevation1
                  : 'rgba(255,255,255,0.03)',
              },
            ]}
          >
            {isFolder ? (
              // Folder view with icon
              <View style={styles.folderContent}>
                <MaterialIcons
                  name={item.icon || 'folder'}
                  size={scaleForTV(48)}
                  color={currentTheme.colors.white}
                  style={styles.folderIcon}
                />
                <Text
                  style={[styles.folderTitle, { color: currentTheme.colors.white }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.itemCount !== undefined && (
                  <Text style={styles.folderCount}>{item.itemCount} items</Text>
                )}
              </View>
            ) : item.poster ? (
              // Poster image
              <FastImage
                source={{ uri: item.poster }}
                style={[styles.poster, { borderRadius: posterBorderRadius }]}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              // Placeholder
              <View
                style={[
                  styles.poster,
                  styles.posterPlaceholder,
                  { backgroundColor: currentTheme.colors.elevation1 },
                ]}
              >
                <MaterialIcons
                  name={item.type === 'movie' ? 'movie' : 'tv'}
                  size={scaleForTV(36)}
                  color={currentTheme.colors.mediumGray}
                />
              </View>
            )}

            {/* Watched indicator */}
            {item.watched && !isFolder && (
              <View style={styles.watchedIndicator}>
                <MaterialIcons
                  name="check-circle"
                  size={scaleForTV(22)}
                  color={currentTheme.colors.success || '#4CAF50'}
                />
              </View>
            )}

            {/* Progress bar */}
            {item.progress !== undefined && item.progress > 0 && item.progress < 1 && (
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${item.progress * 100}%`,
                      backgroundColor: currentTheme.colors.primary,
                    },
                  ]}
                />
              </View>
            )}

            {/* Rating badge */}
            {item.rating !== undefined && item.rating > 0 && (
              <View style={styles.ratingBadge}>
                <MaterialIcons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            )}
          </View>

          {/* Title below poster */}
          {showTitle && !isFolder && (
            <Text
              style={[styles.itemTitle, { color: currentTheme.colors.mediumEmphasis }]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
          )}
        </View>
      </Focusable>
    );
  }
);

TVLibraryGridItem.displayName = 'TVLibraryGridItem';

/**
 * TVLibraryGrid - A TV-optimized grid component for library content
 *
 * Features:
 * - Spatial navigation with D-pad support
 * - Optimized grid layout for TV viewing distance
 * - Focus state management with visual feedback
 * - Support for folders (watchlist, collection, ratings)
 * - Progress and watched indicators
 * - FlashList for high-performance rendering
 */
export const TVLibraryGrid: React.FC<TVLibraryGridProps> = ({
  data,
  loading = false,
  onItemPress,
  onItemLongPress,
  onEdgeReached,
  showTitles = true,
  ListHeaderComponent,
  ListEmptyComponent,
  focusGroupId = 'tv-library-grid',
  autoFocus = true,
  initialFocusIndex = 0,
  listRef: externalListRef,
}) => {
  const { width } = useWindowDimensions();
  const { currentTheme } = useTheme();
  const { settings } = useSettings();
  const internalListRef = useRef<any>(null);
  const listRef = externalListRef || internalListRef;

  // Calculate grid layout
  const { numColumns, itemWidth, horizontalPadding } = useMemo(
    () => getTVGridLayout(width),
    [width]
  );

  // Use spatial navigation for TV
  const { focusedIndex, setFocusedIndex, navigate, getFocusableProps } = useSpatialNavigation(
    data.length,
    {
      itemsPerRow: numColumns,
      wrapAround: false,
      distanceCalculation: 'weighted',
      horizontalWeight: 1.2,
      verticalWeight: 1,
    },
    {
      onEdgeReached: (direction, index) => {
        onEdgeReached?.(direction);
      },
      onSelect: index => {
        if (index >= 0 && index < data.length) {
          onItemPress?.(data[index], index);
        }
      },
    }
  );

  // Scroll to focused item when focus changes
  useEffect(() => {
    if (listRef.current && focusedIndex >= 0 && isTV) {
      try {
        listRef.current.scrollToIndex({
          index: focusedIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (error) {
        // Ignore scroll errors (item might not be rendered yet)
      }
    }
  }, [focusedIndex]);

  // Handle item press
  const handleItemPress = useCallback(
    (item: TVLibraryItem, index: number) => {
      setFocusedIndex(index);
      onItemPress?.(item, index);
    },
    [onItemPress, setFocusedIndex]
  );

  // Handle item long press
  const handleItemLongPress = useCallback(
    (item: TVLibraryItem, index: number) => {
      onItemLongPress?.(item, index);
    },
    [onItemLongPress]
  );

  // Handle focus change
  const handleFocusChange = useCallback(
    (index: number) => {
      setFocusedIndex(index);
    },
    [setFocusedIndex]
  );

  // Render a single grid item
  const renderItem = useCallback(
    ({ item, index }: { item: TVLibraryItem; index: number }) => {
      const isFocused = index === focusedIndex;

      return (
        <TVLibraryGridItem
          item={item}
          index={index}
          width={itemWidth}
          isFocused={isFocused}
          showTitle={showTitles ?? settings.showPosterTitles}
          onPress={() => handleItemPress(item, index)}
          onLongPress={() => handleItemLongPress(item, index)}
          onFocus={() => handleFocusChange(index)}
          currentTheme={currentTheme}
          posterBorderRadius={settings.posterBorderRadius ?? 12}
        />
      );
    },
    [
      focusedIndex,
      itemWidth,
      showTitles,
      settings.showPosterTitles,
      settings.posterBorderRadius,
      handleItemPress,
      handleItemLongPress,
      handleFocusChange,
      currentTheme,
    ]
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  return (
    <FlashList
      ref={listRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={item => `${item.type}-${item.id}`}
      numColumns={numColumns}
      estimatedItemSize={itemWidth * 1.5}
      contentContainerStyle={[styles.listContainer, { paddingHorizontal: horizontalPadding }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      onEndReachedThreshold={0.7}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingVertical: TV_SPACING.lg,
    paddingBottom: isTV ? 120 : 90,
  },
  itemContainer: {
    // Container for each grid item
  },
  posterContainer: {
    aspectRatio: 2 / 3,
    overflow: 'hidden',
    // Consistent shadow/elevation
    elevation: Platform.OS === 'android' ? 2 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Border styling
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TV_SPACING.md,
  },
  folderIcon: {
    marginBottom: TV_SPACING.sm,
  },
  folderTitle: {
    fontSize: TV_TYPOGRAPHY.titleSmall,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: TV_SPACING.xs,
  },
  folderCount: {
    fontSize: TV_TYPOGRAPHY.labelSmall,
    color: 'rgba(255,255,255,0.7)',
  },
  itemTitle: {
    fontSize: TV_TYPOGRAPHY.bodySmall,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: TV_SPACING.sm,
    paddingHorizontal: TV_SPACING.xs,
    lineHeight: TV_TYPOGRAPHY.bodySmall * 1.3,
  },
  watchedIndicator: {
    position: 'absolute',
    top: TV_SPACING.sm,
    right: TV_SPACING.sm,
    borderRadius: 12,
    padding: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressBar: {
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: TV_SPACING.sm,
    left: TV_SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
});

export default TVLibraryGrid;
