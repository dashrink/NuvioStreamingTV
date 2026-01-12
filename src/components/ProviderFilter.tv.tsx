/**
 * ProviderFilter.tv.tsx
 *
 * TV-specific provider filter component with D-pad navigation support.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - D-pad navigable provider tabs (left/right navigation)
 * - Visible focus states with scale animation
 * - Auto-scrolls to keep focused item visible
 * - Integration with TVNavigationContext for focus tracking
 * - Focus memory for restoring selected filter on return
 */

import React, { memo, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, findNodeHandle } from 'react-native';

import Focusable, { FocusableRef } from './common/Focusable';
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';

interface ProviderFilterProps {
  selectedProvider: string;
  providers: Array<{ id: string; name: string }>;
  onSelect: (id: string) => void;
  theme: any;
  /** Optional focus ID prefix for this filter group */
  focusIdPrefix?: string;
  /** Callback when a provider receives focus */
  onProviderFocus?: (providerId: string, index: number) => void;
  /** Index of item that should receive initial focus */
  initialFocusIndex?: number;
  /** Next focus configuration for D-pad navigation outside this component */
  nextFocusUp?: number | React.RefObject<any>;
  nextFocusDown?: number | React.RefObject<any>;
}

interface ProviderItem {
  id: string;
  name: string;
}

const ProviderFilter = memo(
  ({
    selectedProvider,
    providers,
    onSelect,
    theme,
    focusIdPrefix = 'provider',
    onProviderFocus,
    initialFocusIndex = 0,
    nextFocusUp,
    nextFocusDown,
  }: ProviderFilterProps) => {
    const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
    const tvNav = useTVNavigationOptional();

    // Ref for the FlatList to enable scrolling
    const flatListRef = useRef<FlatList<ProviderItem>>(null);

    // Refs for all provider items for focus navigation
    const itemRefs = useRef<Map<number, FocusableRef>>(new Map());

    /**
     * Handle focus on a provider item - scroll to keep it visible
     */
    const handleItemFocus = useCallback(
      (providerId: string, index: number) => {
        // Scroll to keep focused item visible
        if (flatListRef.current && index >= 0) {
          try {
            flatListRef.current.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.3, // Keep focused item 30% from left edge
            });
          } catch (error) {
            // Fallback: scroll to approximate offset
            flatListRef.current.scrollToOffset({
              offset: Math.max(0, index * 100 - 50),
              animated: true,
            });
          }
        }

        // Track focus in TV navigation context
        const focusId = `${focusIdPrefix}-${providerId}`;
        tvNav?.setCurrentFocusId(focusId);

        // Notify parent
        onProviderFocus?.(providerId, index);
      },
      [focusIdPrefix, tvNav, onProviderFocus]
    );

    /**
     * Handle press on a provider item
     */
    const handleItemPress = useCallback(
      (providerId: string) => {
        onSelect(providerId);
      },
      [onSelect]
    );

    /**
     * Get next focus props for an item
     */
    const getNextFocusProps = useCallback(
      (index: number) => {
        const props: any = {};

        // Vertical navigation - pass through to parent
        if (nextFocusUp) {
          if (typeof nextFocusUp === 'number') {
            props.nextFocusUp = nextFocusUp;
          } else if (nextFocusUp.current) {
            const handle = findNodeHandle(nextFocusUp.current as any);
            if (handle) props.nextFocusUp = handle;
          }
        }

        if (nextFocusDown) {
          if (typeof nextFocusDown === 'number') {
            props.nextFocusDown = nextFocusDown;
          } else if (nextFocusDown.current) {
            const handle = findNodeHandle(nextFocusDown.current as any);
            if (handle) props.nextFocusDown = handle;
          }
        }

        // Horizontal navigation between provider items
        if (index > 0) {
          const prevRef = itemRefs.current.get(index - 1);
          if (prevRef) {
            const handle = findNodeHandle(prevRef as any);
            if (handle) props.nextFocusLeft = handle;
          }
        }

        if (index < providers.length - 1) {
          const nextRef = itemRefs.current.get(index + 1);
          if (nextRef) {
            const handle = findNodeHandle(nextRef as any);
            if (handle) props.nextFocusRight = handle;
          }
        }

        return props;
      },
      [providers.length, nextFocusUp, nextFocusDown]
    );

    /**
     * Store item ref
     */
    const setItemRef = useCallback((index: number, ref: FocusableRef | null) => {
      if (ref) {
        itemRefs.current.set(index, ref);
      } else {
        itemRefs.current.delete(index);
      }
    }, []);

    /**
     * Render a single provider filter item
     */
    const renderItem = useCallback(
      ({ item, index }: { item: ProviderItem; index: number }) => {
        const isSelected = selectedProvider === item.id;
        const focusId = `${focusIdPrefix}-${item.id}`;
        const shouldHaveFocus = initialFocusIndex === index && providers.length > 0;

        return (
          <Focusable
            ref={ref => setItemRef(index, ref)}
            onPress={() => handleItemPress(item.id)}
            onFocus={() => handleItemFocus(item.id, index)}
            hasTVPreferredFocus={shouldHaveFocus}
            focusId={focusId}
            style={[styles.filterChip, isSelected && styles.filterChipSelected]}
            animationConfig={{
              focusScale: 1.08,
              unfocusedOpacity: 0.85,
              showFocusBorder: true,
              focusBorderColor: theme.colors.primary,
              focusBorderWidth: 2,
              animateShadow: Platform.OS === 'ios',
            }}
            tvParallaxProperties={{
              enabled: Platform.OS === 'ios',
              shiftDistanceX: 1,
              shiftDistanceY: 1,
              tiltAngle: 0.01,
              magnification: 1.0,
              pressMagnification: 1.02,
            }}
            nextFocus={getNextFocusProps(index)}
            accessibilityLabel={`${item.name} filter${isSelected ? ', selected' : ''}`}
            accessibilityHint="Press to filter streams by this provider"
            testID={`provider-filter-${item.id}`}
          >
            <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
              {item.name}
            </Text>
          </Focusable>
        );
      },
      [
        selectedProvider,
        focusIdPrefix,
        initialFocusIndex,
        providers.length,
        handleItemPress,
        handleItemFocus,
        setItemRef,
        getNextFocusProps,
        styles,
        theme.colors.primary,
      ]
    );

    /**
     * Key extractor for FlatList
     */
    const keyExtractor = useCallback((item: ProviderItem) => item.id, []);

    /**
     * Get item layout for FlatList optimization
     */
    const getItemLayout = useCallback(
      (data: ArrayLike<ProviderItem> | null | undefined, index: number) => ({
        length: 110, // Approximate width of each item + margin
        offset: 110 * index,
        index,
      }),
      []
    );

    if (providers.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={providers}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
          bounces={true}
          overScrollMode="never"
          decelerationRate="fast"
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={false}
          getItemLayout={getItemLayout}
          // TV-specific: disable scrolling via touch since we use D-pad
          scrollEnabled={true}
          nestedScrollEnabled={true}
        />
      </View>
    );
  }
);

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      // Container for the filter list
    },
    filterScroll: {
      flexGrow: 0,
    },
    filterContent: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    filterChip: {
      backgroundColor: colors.elevation2,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 20,
      marginRight: 12,
      borderWidth: 0,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChipSelected: {
      backgroundColor: colors.primary,
    },
    filterChipText: {
      color: colors.highEmphasis,
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    filterChipTextSelected: {
      color: colors.white,
      fontWeight: '700',
    },
  });

ProviderFilter.displayName = 'ProviderFilter';

export default ProviderFilter;
