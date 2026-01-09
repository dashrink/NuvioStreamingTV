import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
    FlatList,
    Platform,
    StyleProp,
    ViewStyle,
    ListRenderItem,
    findNodeHandle,
    NativeSyntheticEvent,
    NativeScrollEvent,
    View,
    StyleSheet,
} from 'react-native';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import Focusable from './Focusable';
import { useFocusGroup } from '../../hooks/useFocusGroup';
import { useTVEventHandler } from '../../hooks/useTVEventHandler';

/**
 * Props for items rendered in FocusableList
 */
export interface FocusableListItemProps<T> {
    item: T;
    index: number;
    isFocused: boolean;
    onFocus: () => void;
    onPress?: () => void;
}

/**
 * Configuration for FocusableList
 */
export interface FocusableListProps<T> {
    /** Data array to render */
    data: T[];
    /** Key extractor for items */
    keyExtractor: (item: T, index: number) => string;
    /** Render function for each item */
    renderItem: (props: FocusableListItemProps<T>) => React.ReactElement;
    /** Callback when an item is pressed/selected */
    onItemPress?: (item: T, index: number) => void;
    /** Callback when focus changes */
    onFocusChange?: (index: number, item: T) => void;
    /** Whether list is horizontal */
    horizontal?: boolean;
    /** Number of columns (for grid layout) */
    numColumns?: number;
    /** Whether to use FlashList for performance */
    useFlashList?: boolean;
    /** Estimated item size for FlashList */
    estimatedItemSize?: number;
    /** Style for the list container */
    style?: StyleProp<ViewStyle>;
    /** Style for the content container */
    contentContainerStyle?: StyleProp<ViewStyle>;
    /** Initial index to focus */
    initialFocusIndex?: number;
    /** Whether to auto-focus first item */
    autoFocus?: boolean;
    /** ID for the focus group */
    groupId?: string;
    /** Whether focus should wrap around */
    wrapAround?: boolean;
    /** Callback when edge is reached */
    onEdgeReached?: (direction: 'start' | 'end') => void;
    /** Header component */
    ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
    /** Footer component */
    ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
    /** Empty list component */
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
    /** Item separator component */
    ItemSeparatorComponent?: React.ComponentType<any> | null;
    /** Show scroll indicator */
    showsScrollIndicator?: boolean;
    /** Custom scroll event handler */
    onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    /** Additional props to pass to underlying list */
    listProps?: Partial<FlashListProps<T>>;
    /** Scale factor for focused items */
    focusScale?: number;
    /** Whether to scroll to focused item */
    scrollToFocused?: boolean;
    /** Scroll offset when focusing item */
    scrollOffset?: number;
}

/**
 * FocusableList - A TV-optimized list component with built-in focus management
 *
 * Features:
 * - Automatic D-pad navigation
 * - Focus memory and restoration
 * - FlashList support for performance
 * - Grid layout support
 * - Edge detection
 * - Scroll-to-focus behavior
 *
 * @example
 * ```tsx
 * <FocusableList
 *   data={movies}
 *   keyExtractor={(item) => item.id}
 *   renderItem={({ item, isFocused }) => (
 *     <MovieCard movie={item} isFocused={isFocused} />
 *   )}
 *   onItemPress={(item) => navigate('Details', { id: item.id })}
 *   horizontal
 *   autoFocus
 * />
 * ```
 */
function FocusableListComponent<T>(props: FocusableListProps<T>) {
    const {
        data,
        keyExtractor,
        renderItem,
        onItemPress,
        onFocusChange,
        horizontal = false,
        numColumns = 1,
        useFlashList = true,
        estimatedItemSize = 150,
        style,
        contentContainerStyle,
        initialFocusIndex = 0,
        autoFocus = false,
        groupId = 'focusable-list',
        wrapAround = false,
        onEdgeReached,
        ListHeaderComponent,
        ListFooterComponent,
        ListEmptyComponent,
        ItemSeparatorComponent,
        showsScrollIndicator = false,
        onScroll,
        listProps,
        focusScale = 1.02,
        scrollToFocused = true,
        scrollOffset = 0,
    } = props;

    const isTV = Platform.isTV;
    const listRef = useRef<FlatList<T> | FlashList<T>>(null);
    const itemRefs = useRef<Map<number, React.RefObject<any>>>(new Map());

    // Use focus group for managing items
    const {
        focusedIndex,
        focusItem,
        focusFirst,
        focusLast,
        focusNext,
        focusPrevious,
        registerItem,
        unregisterItem,
    } = useFocusGroup({
        id: groupId,
        autoFocus: autoFocus && isTV,
        trapFocus: false,
        rememberFocus: true,
        onFocusChange: (index, prevIndex) => {
            if (index >= 0 && index < data.length) {
                onFocusChange?.(index, data[index]);
            }
        },
    });

    /**
     * Get or create ref for item at index
     */
    const getItemRef = useCallback((index: number): React.RefObject<any> => {
        if (!itemRefs.current.has(index)) {
            itemRefs.current.set(index, React.createRef());
        }
        return itemRefs.current.get(index)!;
    }, []);

    /**
     * Scroll to focused item
     */
    const scrollToIndex = useCallback((index: number, animated: boolean = true) => {
        if (!listRef.current || !scrollToFocused) return;

        try {
            if (useFlashList) {
                (listRef.current as FlashList<T>).scrollToIndex({
                    index,
                    animated,
                    viewOffset: scrollOffset,
                    viewPosition: 0.5,
                });
            } else {
                (listRef.current as FlatList<T>).scrollToIndex({
                    index,
                    animated,
                    viewOffset: scrollOffset,
                    viewPosition: 0.5,
                });
            }
        } catch (error) {
            // Scroll might fail if item is not yet rendered
            if (__DEV__) {
                console.log('[FocusableList] Scroll error:', error);
            }
        }
    }, [useFlashList, scrollToFocused, scrollOffset]);

    /**
     * Handle focus change with scroll
     */
    const handleFocusChange = useCallback((index: number) => {
        focusItem(index);
        scrollToIndex(index);
    }, [focusItem, scrollToIndex]);

    /**
     * Navigate to next/previous item based on direction
     */
    const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (data.length === 0) return;

        const isForward = horizontal
            ? direction === 'right'
            : direction === 'down';
        const isBackward = horizontal
            ? direction === 'left'
            : direction === 'up';

        // Handle grid navigation
        if (numColumns > 1) {
            const currentRow = Math.floor(focusedIndex / numColumns);
            const currentCol = focusedIndex % numColumns;
            const totalRows = Math.ceil(data.length / numColumns);

            let newIndex = focusedIndex;

            if (direction === 'up' && currentRow > 0) {
                newIndex = (currentRow - 1) * numColumns + currentCol;
            } else if (direction === 'down' && currentRow < totalRows - 1) {
                newIndex = Math.min((currentRow + 1) * numColumns + currentCol, data.length - 1);
            } else if (direction === 'left' && currentCol > 0) {
                newIndex = focusedIndex - 1;
            } else if (direction === 'right' && currentCol < numColumns - 1 && focusedIndex < data.length - 1) {
                newIndex = focusedIndex + 1;
            }

            if (newIndex !== focusedIndex) {
                handleFocusChange(newIndex);
            } else {
                // Edge reached
                if (direction === 'up' && currentRow === 0) onEdgeReached?.('start');
                if (direction === 'down' && currentRow === totalRows - 1) onEdgeReached?.('end');
                if (direction === 'left' && currentCol === 0) onEdgeReached?.('start');
                if (direction === 'right' && (currentCol === numColumns - 1 || focusedIndex === data.length - 1)) onEdgeReached?.('end');
            }
            return;
        }

        // Handle linear navigation
        if (isForward) {
            if (focusedIndex < data.length - 1) {
                handleFocusChange(focusedIndex + 1);
            } else if (wrapAround) {
                handleFocusChange(0);
            } else {
                onEdgeReached?.('end');
            }
        } else if (isBackward) {
            if (focusedIndex > 0) {
                handleFocusChange(focusedIndex - 1);
            } else if (wrapAround) {
                handleFocusChange(data.length - 1);
            } else {
                onEdgeReached?.('start');
            }
        }
    }, [data.length, horizontal, numColumns, focusedIndex, handleFocusChange, wrapAround, onEdgeReached]);

    // Handle TV remote events
    useTVEventHandler(useCallback((evt: any) => {
        if (!isTV) return;

        const { eventType } = evt;

        switch (eventType) {
            case 'up':
                navigate('up');
                break;
            case 'down':
                navigate('down');
                break;
            case 'left':
                navigate('left');
                break;
            case 'right':
                navigate('right');
                break;
            case 'select':
                if (focusedIndex >= 0 && focusedIndex < data.length) {
                    onItemPress?.(data[focusedIndex], focusedIndex);
                }
                break;
        }
    }, [isTV, navigate, focusedIndex, data, onItemPress]));

    /**
     * Render a single item
     */
    const renderListItem: ListRenderItem<T> = useCallback(({ item, index }) => {
        const ref = getItemRef(index);
        const isFocused = index === focusedIndex;

        // Register item with focus group
        registerItem(index, ref);

        const itemContent = renderItem({
            item,
            index,
            isFocused,
            onFocus: () => handleFocusChange(index),
            onPress: () => onItemPress?.(item, index),
        });

        if (isTV) {
            return (
                <Focusable
                    ref={ref}
                    hasTVPreferredFocus={isFocused && index === initialFocusIndex}
                    scaleOnFocus={focusScale}
                    onFocus={() => handleFocusChange(index)}
                    onPress={() => onItemPress?.(item, index)}
                    style={styles.itemContainer}
                >
                    {itemContent}
                </Focusable>
            );
        }

        // Non-TV rendering
        return itemContent;
    }, [
        getItemRef,
        focusedIndex,
        registerItem,
        renderItem,
        handleFocusChange,
        onItemPress,
        isTV,
        focusScale,
        initialFocusIndex,
    ]);

    // Cleanup item refs when data changes
    useEffect(() => {
        // Remove refs for items that no longer exist
        itemRefs.current.forEach((_, index) => {
            if (index >= data.length) {
                itemRefs.current.delete(index);
                unregisterItem(index);
            }
        });
    }, [data.length, unregisterItem]);

    // Set initial focus
    useEffect(() => {
        if (autoFocus && isTV && data.length > 0) {
            const targetIndex = Math.min(initialFocusIndex, data.length - 1);
            handleFocusChange(targetIndex);
        }
    }, [autoFocus, isTV, data.length, initialFocusIndex, handleFocusChange]);

    // Common list props
    const commonProps = {
        ref: listRef as any,
        data,
        keyExtractor,
        renderItem: renderListItem,
        horizontal,
        numColumns: horizontal ? undefined : numColumns,
        style,
        contentContainerStyle,
        showsHorizontalScrollIndicator: showsScrollIndicator,
        showsVerticalScrollIndicator: showsScrollIndicator,
        onScroll,
        ListHeaderComponent,
        ListFooterComponent,
        ListEmptyComponent,
        ItemSeparatorComponent,
        ...listProps,
    };

    // Use FlashList for better performance if available
    if (useFlashList) {
        return (
            <FlashList
                {...commonProps}
                estimatedItemSize={estimatedItemSize}
            />
        );
    }

    return <FlatList {...commonProps} />;
}

const styles = StyleSheet.create({
    itemContainer: {
        // Minimal styling to not interfere with item layout
    },
});

// Export with generic type support
export const FocusableList = React.memo(FocusableListComponent) as typeof FocusableListComponent;

export default FocusableList;
