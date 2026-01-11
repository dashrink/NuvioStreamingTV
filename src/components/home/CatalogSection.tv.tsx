/**
 * CatalogSection.tv.tsx
 *
 * TV-specific catalog section component with horizontal D-pad navigation,
 * focus memory persistence, and automatic scrolling to focused items.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - Horizontal D-pad navigation (left/right) through content items
 * - Focus memory persists within row across navigation
 * - Auto-scrolls to keep focused item visible
 * - Up/down D-pad moves between rows (via nextFocusUp/Down)
 * - View All button is TV focusable
 * - Integration with TVNavigationContext for global focus state
 *
 * @example
 * ```tsx
 * <CatalogSection
 *   catalog={catalogData}
 *   sectionIndex={0}
 *   totalSections={5}
 *   onFocusSection={(index) => console.log('Section focused:', index)}
 * />
 * ```
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  FlatList,
  findNodeHandle,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { CatalogContent, StreamingContent } from '../../services/catalogService';
import { useTheme } from '../../contexts/ThemeContext';
import ContentItem from './ContentItem';
import Focusable from '../common/Focusable';
import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface CatalogSectionProps {
  /** The catalog data to display */
  catalog: CatalogContent;
  /** Index of this section in the list of sections (for focus navigation) */
  sectionIndex?: number;
  /** Total number of sections (for focus boundary detection) */
  totalSections?: number;
  /** Callback when this section receives focus */
  onFocusSection?: (sectionIndex: number) => void;
  /** Unique identifier for this section (for focus memory) */
  sectionId?: string;
  /** Whether this section should receive initial focus */
  hasTVPreferredFocus?: boolean;
  /** Node handle for the element above this section (for nextFocusUp) */
  nextFocusUp?: number | React.RefObject<any>;
  /** Node handle for the element below this section (for nextFocusDown) */
  nextFocusDown?: number | React.RefObject<any>;
}

// =============================================================================
// Constants & Layout Calculations
// =============================================================================

const { width } = Dimensions.get('window');

// Enhanced responsive breakpoints
const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

const getDeviceType = (deviceWidth: number) => {
  if (deviceWidth >= BREAKPOINTS.tv) return 'tv';
  if (deviceWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
  if (deviceWidth >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
};

const deviceType = getDeviceType(width);
const isTablet = deviceType === 'tablet';
const isLargeTablet = deviceType === 'largeTablet';
const isTV = deviceType === 'tv' || Platform.isTV;

// Dynamic poster calculation based on screen width - show 1/4 of next poster
const calculatePosterLayout = (screenWidth: number) => {
  const device = getDeviceType(screenWidth);

  // Responsive sizing based on device type
  const MIN_POSTER_WIDTH = device === 'tv' ? 180 : device === 'largeTablet' ? 160 : device === 'tablet' ? 140 : 100;
  const MAX_POSTER_WIDTH = device === 'tv' ? 220 : device === 'largeTablet' ? 200 : device === 'tablet' ? 180 : 130;
  const LEFT_PADDING = device === 'tv' ? 32 : device === 'largeTablet' ? 28 : device === 'tablet' ? 24 : 16;
  const SPACING = device === 'tv' ? 12 : device === 'largeTablet' ? 10 : device === 'tablet' ? 8 : 8;

  // Calculate available width for posters (reserve space for left padding)
  const availableWidth = screenWidth - LEFT_PADDING;

  // Try different numbers of full posters to find the best fit
  let bestLayout = {
    numFullPosters: 3,
    posterWidth: device === 'tv' ? 200 : device === 'largeTablet' ? 180 : device === 'tablet' ? 160 : 120
  };

  for (let n = 3; n <= 6; n++) {
    const usableWidth = availableWidth - 8;
    const posterWidth = (usableWidth - (n - 1) * SPACING) / (n + 0.25);

    if (posterWidth >= MIN_POSTER_WIDTH && posterWidth <= MAX_POSTER_WIDTH) {
      bestLayout = { numFullPosters: n, posterWidth };
    }
  }

  return {
    numFullPosters: bestLayout.numFullPosters,
    posterWidth: bestLayout.posterWidth,
    spacing: SPACING,
    partialPosterWidth: bestLayout.posterWidth * 0.25 // 1/4 of next poster
  };
};

const posterLayout = calculatePosterLayout(width);

// =============================================================================
// Component Implementation
// =============================================================================

const CatalogSection = ({
  catalog,
  sectionIndex = 0,
  totalSections = 1,
  onFocusSection,
  sectionId,
  hasTVPreferredFocus = false,
  nextFocusUp,
  nextFocusDown,
}: CatalogSectionProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const tvNav = useTVNavigationOptional();

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const viewAllButtonRef = useRef<any>(null);
  const itemRefs = useRef<Map<number, React.RefObject<any>>>(new Map());

  // State
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isRowFocused, setIsRowFocused] = useState(false);

  // Generate unique section ID for focus memory
  const uniqueSectionId = sectionId || `catalog-${catalog.addon}-${catalog.id}`;

  // =============================================================================
  // Item Ref Management
  // =============================================================================

  /**
   * Get or create a ref for an item at a given index
   */
  const getItemRef = useCallback((index: number) => {
    if (!itemRefs.current.has(index)) {
      itemRefs.current.set(index, React.createRef());
    }
    return itemRefs.current.get(index)!;
  }, []);

  // =============================================================================
  // Focus Memory & Restoration
  // =============================================================================

  /**
   * Save focus state to TV navigation context
   */
  const saveFocusState = useCallback((index: number) => {
    if (tvNav && index >= 0) {
      const focusId = `${uniqueSectionId}-item-${index}`;
      tvNav.setScreenFocus(uniqueSectionId, focusId);
      tvNav.setCurrentFocusId(focusId);
    }
  }, [tvNav, uniqueSectionId]);

  /**
   * Get saved focus index from memory
   */
  const getSavedFocusIndex = useCallback((): number => {
    if (tvNav) {
      const savedFocusId = tvNav.getScreenFocus(uniqueSectionId);
      if (savedFocusId) {
        const match = savedFocusId.match(/-item-(\d+)$/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }
    return 0; // Default to first item
  }, [tvNav, uniqueSectionId]);

  // =============================================================================
  // Scroll Management
  // =============================================================================

  /**
   * Scroll to make the focused item visible
   */
  const scrollToFocusedItem = useCallback((index: number, animated: boolean = true) => {
    if (flatListRef.current && index >= 0 && index < catalog.items.length) {
      try {
        flatListRef.current.scrollToIndex({
          index,
          animated,
          viewPosition: 0.3, // Position focused item slightly left of center
        });
      } catch (error) {
        // Fallback: scroll to offset if scrollToIndex fails
        const itemWidth = posterLayout.posterWidth + posterLayout.spacing;
        const offset = Math.max(0, index * itemWidth - width * 0.2);
        flatListRef.current.scrollToOffset({ offset, animated });
      }
    }
  }, [catalog.items.length]);

  // =============================================================================
  // Focus Handlers
  // =============================================================================

  /**
   * Handle content item press
   */
  const handleContentPress = useCallback((id: string, type: string) => {
    // Save focus state before navigation
    saveFocusState(focusedIndex);
    navigation.navigate('Metadata', { id, type, addonId: catalog.addon });
  }, [navigation, catalog.addon, saveFocusState, focusedIndex]);

  /**
   * Handle View All button press
   */
  const handleViewAllPress = useCallback(() => {
    navigation.navigate('Catalog', {
      id: catalog.id,
      type: catalog.type,
      addonId: catalog.addon
    });
  }, [navigation, catalog]);

  /**
   * Handle View All button focus
   */
  const handleViewAllFocus = useCallback(() => {
    setFocusedIndex(-1);
    setIsRowFocused(true);
    onFocusSection?.(sectionIndex);

    if (tvNav) {
      const focusId = `${uniqueSectionId}-view-all`;
      tvNav.setScreenFocus(uniqueSectionId, focusId);
      tvNav.setCurrentFocusId(focusId);
    }
  }, [tvNav, uniqueSectionId, sectionIndex, onFocusSection]);

  /**
   * Handle item focus
   */
  const handleItemFocus = useCallback((index: number) => {
    setFocusedIndex(index);
    setIsRowFocused(true);
    saveFocusState(index);
    scrollToFocusedItem(index);
    onFocusSection?.(sectionIndex);
  }, [saveFocusState, scrollToFocusedItem, sectionIndex, onFocusSection]);

  /**
   * Handle item blur
   */
  const handleItemBlur = useCallback(() => {
    // Don't immediately clear row focus - let the next focus event determine state
  }, []);

  // =============================================================================
  // Next Focus Props Resolution
  // =============================================================================

  /**
   * Resolve a ref or number to a node handle
   */
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

  /**
   * Get next focus props for an item at a given index
   */
  const getItemNextFocusProps = useCallback((index: number) => {
    const props: Record<string, number | undefined> = {};

    // Left navigation: previous item, or View All button if at first item
    if (index > 0) {
      const prevRef = itemRefs.current.get(index - 1);
      if (prevRef?.current) {
        props.nextFocusLeft = findNodeHandle(prevRef.current) ?? undefined;
      }
    } else if (viewAllButtonRef.current) {
      // At first item, left goes to View All
      props.nextFocusLeft = findNodeHandle(viewAllButtonRef.current) ?? undefined;
    }

    // Right navigation: next item
    if (index < catalog.items.length - 1) {
      const nextRef = itemRefs.current.get(index + 1);
      if (nextRef?.current) {
        props.nextFocusRight = findNodeHandle(nextRef.current) ?? undefined;
      }
    }

    // Up/Down navigation: passed from parent for inter-row navigation
    const upHandle = resolveNodeHandle(nextFocusUp);
    if (upHandle !== undefined) {
      props.nextFocusUp = upHandle;
    }

    const downHandle = resolveNodeHandle(nextFocusDown);
    if (downHandle !== undefined) {
      props.nextFocusDown = downHandle;
    }

    return props;
  }, [catalog.items.length, nextFocusUp, nextFocusDown, resolveNodeHandle]);

  // =============================================================================
  // Render Callbacks
  // =============================================================================

  /**
   * Render a content item
   */
  const renderContentItem = useCallback(({ item, index }: { item: StreamingContent; index: number }) => {
    const itemFocusId = `${uniqueSectionId}-item-${index}`;
    const shouldHaveFocus = hasTVPreferredFocus && index === 0 && sectionIndex === 0;

    return (
      <ContentItem
        item={item}
        onPress={handleContentPress}
        focusId={itemFocusId}
        hasTVPreferredFocus={shouldHaveFocus}
        onFocus={() => handleItemFocus(index)}
        onBlur={handleItemBlur}
      />
    );
  }, [uniqueSectionId, handleContentPress, handleItemFocus, handleItemBlur, hasTVPreferredFocus, sectionIndex]);

  /**
   * Item separator component
   */
  const separatorWidth = isTV ? 12 : isLargeTablet ? 10 : isTablet ? 8 : 8;
  const ItemSeparator = useCallback(() => <View style={{ width: separatorWidth }} />, [separatorWidth]);

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback((item: StreamingContent, index: number) => `${item.id}-${item.type}-${index}`, []);

  /**
   * Handle scroll to index failure (fallback)
   */
  const onScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    // Wait for layout then try again
    setTimeout(() => {
      scrollToFocusedItem(info.index, false);
    }, 100);
  }, [scrollToFocusedItem]);

  // =============================================================================
  // Memoized Styles
  // =============================================================================

  const contentContainerStyle = useMemo(() => StyleSheet.flatten([
    styles.catalogList,
    {
      paddingHorizontal: isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16,
      paddingRight: (isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16) - posterLayout.partialPosterWidth,
    }
  ]), []);

  const headerPadding = isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16;

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <View style={styles.catalogContainer}>
      {/* Header with Title and View All Button */}
      <View style={[styles.catalogHeader, { paddingHorizontal: headerPadding }]}>
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.catalogTitle,
              {
                color: currentTheme.colors.text,
                fontSize: isTV ? 28 : isLargeTablet ? 26 : isTablet ? 24 : 22,
              }
            ]}
            numberOfLines={1}
          >
            {catalog.name}
          </Text>
          <View
            style={[
              styles.titleUnderline,
              {
                backgroundColor: currentTheme.colors.primary,
                width: isTV ? 64 : isLargeTablet ? 56 : isTablet ? 48 : 40,
                height: isTV ? 4 : isLargeTablet ? 3 : 3,
              }
            ]}
          />
        </View>

        {/* TV-Focusable View All Button */}
        <Focusable
          ref={viewAllButtonRef}
          onPress={handleViewAllPress}
          onFocus={handleViewAllFocus}
          hasTVPreferredFocus={false}
          isTVSelectable={true}
          focusId={`${uniqueSectionId}-view-all`}
          style={[
            styles.viewAllButton,
            {
              paddingVertical: isTV ? 10 : isLargeTablet ? 9 : isTablet ? 8 : 8,
              paddingHorizontal: isTV ? 12 : isLargeTablet ? 11 : isTablet ? 10 : 10,
              borderRadius: isTV ? 22 : isLargeTablet ? 20 : isTablet ? 20 : 20,
            }
          ]}
          animationConfig={{
            focusScale: 1.05,
            unfocusedOpacity: 0.8,
            showFocusBorder: true,
            focusBorderColor: currentTheme.colors.primary || '#007AFF',
            focusBorderWidth: 2,
            animateShadow: Platform.OS === 'ios',
          }}
          accessibilityLabel={`View all ${catalog.name}`}
          accessibilityHint="Opens full catalog view"
          testID={`view-all-${catalog.id}`}
        >
          <Text style={[
            styles.viewAllText,
            {
              color: currentTheme.colors.textMuted,
              fontSize: isTV ? 16 : isLargeTablet ? 15 : isTablet ? 14 : 14,
              marginRight: isTV ? 6 : isLargeTablet ? 5 : 4,
            }
          ]}>View All</Text>
          <MaterialIcons
            name="chevron-right"
            size={isTV ? 24 : isLargeTablet ? 22 : isTablet ? 20 : 20}
            color={currentTheme.colors.textMuted}
          />
        </Focusable>
      </View>

      {/* Horizontal Content List */}
      <FlatList
        ref={flatListRef}
        data={catalog.items}
        renderItem={renderContentItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        scrollEnabled={true}
        nestedScrollEnabled={true}
        contentContainerStyle={contentContainerStyle}
        ItemSeparatorComponent={ItemSeparator}
        removeClippedSubviews={true}
        initialNumToRender={isTV ? 6 : isLargeTablet ? 5 : isTablet ? 4 : 3}
        maxToRenderPerBatch={isTV ? 4 : isLargeTablet ? 4 : 3}
        windowSize={isTV ? 4 : isLargeTablet ? 4 : 3}
        updateCellsBatchingPeriod={50}
        onScrollToIndexFailed={onScrollToIndexFailed}
        // Accessibility
        accessibilityLabel={`${catalog.name} section with ${catalog.items.length} items`}
        accessibilityRole="list"
      />
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  catalogContainer: {
    marginBottom: 28,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    position: 'relative',
    flex: 1,
    marginRight: 16,
  },
  catalogTitle: {
    fontSize: 24, // will be overridden responsively
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    width: 40, // overridden responsively
    height: 3,  // overridden responsively
    borderRadius: 2,
    opacity: 0.8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // overridden responsively
    paddingHorizontal: 10, // overridden responsively
    borderRadius: 20, // overridden responsively
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewAllText: {
    fontSize: 14, // overridden responsively
    fontWeight: '600',
    marginRight: 4, // overridden responsively
  },
  catalogList: {
    // padding will be applied responsively in JSX
  },
});

// =============================================================================
// Export with Memoization
// =============================================================================

export default React.memo(CatalogSection, (prevProps, nextProps) => {
  // Only re-render if the catalog data actually changes
  return (
    prevProps.catalog.addon === nextProps.catalog.addon &&
    prevProps.catalog.id === nextProps.catalog.id &&
    prevProps.catalog.name === nextProps.catalog.name &&
    prevProps.catalog.items.length === nextProps.catalog.items.length &&
    prevProps.sectionIndex === nextProps.sectionIndex &&
    prevProps.hasTVPreferredFocus === nextProps.hasTVPreferredFocus &&
    // Deep compare the first few items to detect changes
    prevProps.catalog.items.slice(0, 3).every((item, index) =>
      nextProps.catalog.items[index] &&
      item.id === nextProps.catalog.items[index].id &&
      item.poster === nextProps.catalog.items[index].poster
    )
  );
});
