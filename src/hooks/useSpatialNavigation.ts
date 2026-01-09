import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { Platform, findNodeHandle, LayoutRectangle } from 'react-native';
import { useTVEventHandler } from './useTVEventHandler';

/**
 * Navigation direction type
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Configuration for spatial navigation behavior
 */
export interface SpatialNavigationConfig {
    /** Whether navigation should wrap around at edges */
    wrapAround?: boolean;
    /** Number of items per row (for grid navigation) */
    itemsPerRow?: number;
    /** Whether to enable diagonal movement mapping */
    enableDiagonalMapping?: boolean;
    /** Custom distance calculation for nearest neighbor */
    distanceCalculation?: 'euclidean' | 'manhattan' | 'weighted';
    /** Weight for horizontal distance in weighted calculation */
    horizontalWeight?: number;
    /** Weight for vertical distance in weighted calculation */
    verticalWeight?: number;
}

/**
 * Spatial navigation item with position data
 */
export interface SpatialItem {
    ref: React.RefObject<any>;
    layout?: LayoutRectangle;
    index: number;
    row?: number;
    column?: number;
}

/**
 * Handlers for navigation events
 */
export interface NavigationHandlers {
    onNavigate?: (direction: Direction, fromIndex: number, toIndex: number) => void;
    onSelect?: (index: number) => void;
    onEdgeReached?: (direction: Direction, index: number) => void;
    onBack?: () => boolean;
}

/**
 * Return type for useSpatialNavigation hook
 */
export interface SpatialNavigationResult {
    /** Current focused index */
    focusedIndex: number;
    /** Set the focused index programmatically */
    setFocusedIndex: (index: number) => void;
    /** Navigate in a direction */
    navigate: (direction: Direction) => void;
    /** Register an item for navigation */
    registerItem: (index: number, ref: React.RefObject<any>, layout?: LayoutRectangle) => void;
    /** Unregister an item */
    unregisterItem: (index: number) => void;
    /** Update item layout */
    updateItemLayout: (index: number, layout: LayoutRectangle) => void;
    /** Get next focusable index in direction */
    getNextIndex: (direction: Direction, fromIndex?: number) => number;
    /** Check if navigation is possible in direction */
    canNavigate: (direction: Direction) => boolean;
    /** Create props for a focusable item */
    getFocusableProps: (index: number) => {
        ref: (ref: any) => void;
        hasTVPreferredFocus: boolean;
        onFocus: () => void;
        nextFocusUp: number | undefined;
        nextFocusDown: number | undefined;
        nextFocusLeft: number | undefined;
        nextFocusRight: number | undefined;
    };
}

const DEFAULT_CONFIG: Required<SpatialNavigationConfig> = {
    wrapAround: false,
    itemsPerRow: 1,
    enableDiagonalMapping: true,
    distanceCalculation: 'weighted',
    horizontalWeight: 1.5,
    verticalWeight: 1,
};

/**
 * useSpatialNavigation - Advanced D-pad navigation hook for TV platforms
 *
 * Provides intelligent spatial navigation for grids and lists:
 * - Nearest neighbor detection based on visual position
 * - Grid-aware navigation with row/column support
 * - Edge detection with wrap-around option
 * - Integration with TV remote events
 *
 * @param itemCount - Total number of navigable items
 * @param config - Navigation configuration
 * @param handlers - Event handlers for navigation events
 *
 * @example
 * ```tsx
 * const { focusedIndex, getFocusableProps } = useSpatialNavigation(
 *   items.length,
 *   { itemsPerRow: 4 },
 *   { onSelect: (index) => handleSelect(items[index]) }
 * );
 *
 * return items.map((item, index) => (
 *   <Focusable key={item.id} {...getFocusableProps(index)}>
 *     <ItemContent item={item} />
 *   </Focusable>
 * ));
 * ```
 */
export function useSpatialNavigation(
    itemCount: number,
    config: SpatialNavigationConfig = {},
    handlers: NavigationHandlers = {}
): SpatialNavigationResult {
    const isTV = Platform.isTV;

    // Merge config with defaults
    const mergedConfig = useMemo(() => ({
        ...DEFAULT_CONFIG,
        ...config,
    }), [config]);

    // State refs
    const focusedIndexRef = useRef(0);
    const itemsRef = useRef<Map<number, SpatialItem>>(new Map());
    const nodeHandlesRef = useRef<Map<number, number>>(new Map());

    // Force re-render on focus change
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    /**
     * Calculate distance between two points
     */
    const calculateDistance = useCallback((
        fromLayout: LayoutRectangle,
        toLayout: LayoutRectangle,
        direction: Direction
    ): number => {
        const fromCenterX = fromLayout.x + fromLayout.width / 2;
        const fromCenterY = fromLayout.y + fromLayout.height / 2;
        const toCenterX = toLayout.x + toLayout.width / 2;
        const toCenterY = toLayout.y + toLayout.height / 2;

        const dx = toCenterX - fromCenterX;
        const dy = toCenterY - fromCenterY;

        // Filter out items not in the correct direction
        switch (direction) {
            case 'up':
                if (dy >= 0) return Infinity;
                break;
            case 'down':
                if (dy <= 0) return Infinity;
                break;
            case 'left':
                if (dx >= 0) return Infinity;
                break;
            case 'right':
                if (dx <= 0) return Infinity;
                break;
        }

        const { distanceCalculation, horizontalWeight, verticalWeight } = mergedConfig;

        switch (distanceCalculation) {
            case 'manhattan':
                return Math.abs(dx) + Math.abs(dy);
            case 'weighted':
                return Math.abs(dx) * horizontalWeight + Math.abs(dy) * verticalWeight;
            case 'euclidean':
            default:
                return Math.sqrt(dx * dx + dy * dy);
        }
    }, [mergedConfig]);

    /**
     * Get the next index based on spatial position
     */
    const getNextIndexSpatial = useCallback((
        direction: Direction,
        fromIndex: number
    ): number => {
        const fromItem = itemsRef.current.get(fromIndex);
        if (!fromItem?.layout) {
            // Fallback to grid calculation if no layout data
            return getNextIndexGrid(direction, fromIndex);
        }

        let nearestIndex = fromIndex;
        let nearestDistance = Infinity;

        itemsRef.current.forEach((item, index) => {
            if (index === fromIndex || !item.layout) return;

            const distance = calculateDistance(fromItem.layout!, item.layout, direction);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        return nearestIndex;
    }, [calculateDistance]);

    /**
     * Get the next index based on grid calculation
     */
    const getNextIndexGrid = useCallback((
        direction: Direction,
        fromIndex: number
    ): number => {
        const { itemsPerRow, wrapAround } = mergedConfig;
        const totalRows = Math.ceil(itemCount / itemsPerRow);
        const currentRow = Math.floor(fromIndex / itemsPerRow);
        const currentCol = fromIndex % itemsPerRow;

        let newRow = currentRow;
        let newCol = currentCol;

        switch (direction) {
            case 'up':
                newRow = currentRow - 1;
                if (newRow < 0) {
                    if (wrapAround) {
                        newRow = totalRows - 1;
                        // Ensure we don't go past the last item
                        while (newRow * itemsPerRow + newCol >= itemCount) {
                            newRow--;
                        }
                    } else {
                        return fromIndex;
                    }
                }
                break;
            case 'down':
                newRow = currentRow + 1;
                if (newRow * itemsPerRow + newCol >= itemCount) {
                    if (wrapAround) {
                        newRow = 0;
                    } else {
                        return fromIndex;
                    }
                }
                break;
            case 'left':
                newCol = currentCol - 1;
                if (newCol < 0) {
                    if (wrapAround) {
                        newCol = Math.min(itemsPerRow - 1, itemCount - currentRow * itemsPerRow - 1);
                    } else {
                        return fromIndex;
                    }
                }
                break;
            case 'right':
                newCol = currentCol + 1;
                if (newCol >= itemsPerRow || newRow * itemsPerRow + newCol >= itemCount) {
                    if (wrapAround) {
                        newCol = 0;
                    } else {
                        return fromIndex;
                    }
                }
                break;
        }

        const newIndex = newRow * itemsPerRow + newCol;
        return Math.min(Math.max(newIndex, 0), itemCount - 1);
    }, [itemCount, mergedConfig]);

    /**
     * Get next index in direction (uses spatial if available, grid as fallback)
     */
    const getNextIndex = useCallback((
        direction: Direction,
        fromIndex?: number
    ): number => {
        const currentIndex = fromIndex ?? focusedIndexRef.current;

        // Try spatial first if we have layout data
        const currentItem = itemsRef.current.get(currentIndex);
        if (currentItem?.layout && itemsRef.current.size > 1) {
            return getNextIndexSpatial(direction, currentIndex);
        }

        return getNextIndexGrid(direction, currentIndex);
    }, [getNextIndexSpatial, getNextIndexGrid]);

    /**
     * Check if navigation is possible in a direction
     */
    const canNavigate = useCallback((direction: Direction): boolean => {
        const nextIndex = getNextIndex(direction);
        return nextIndex !== focusedIndexRef.current;
    }, [getNextIndex]);

    /**
     * Navigate in a direction
     */
    const navigate = useCallback((direction: Direction) => {
        if (!isTV || itemCount === 0) return;

        const fromIndex = focusedIndexRef.current;
        const toIndex = getNextIndex(direction, fromIndex);

        if (toIndex === fromIndex) {
            // Edge reached
            handlers.onEdgeReached?.(direction, fromIndex);
            return;
        }

        // Update focus
        focusedIndexRef.current = toIndex;
        forceUpdate();

        // Notify handler
        handlers.onNavigate?.(direction, fromIndex, toIndex);

        // Focus the new item
        const targetItem = itemsRef.current.get(toIndex);
        if (targetItem?.ref?.current) {
            const nodeHandle = findNodeHandle(targetItem.ref.current);
            if (nodeHandle) {
                targetItem.ref.current.setNativeProps?.({ hasTVPreferredFocus: true });
            }
        }
    }, [isTV, itemCount, getNextIndex, handlers]);

    /**
     * Set focused index programmatically
     */
    const setFocusedIndex = useCallback((index: number) => {
        if (index >= 0 && index < itemCount) {
            focusedIndexRef.current = index;
            forceUpdate();
        }
    }, [itemCount]);

    /**
     * Register an item for navigation
     */
    const registerItem = useCallback((
        index: number,
        ref: React.RefObject<any>,
        layout?: LayoutRectangle
    ) => {
        const { itemsPerRow } = mergedConfig;
        itemsRef.current.set(index, {
            ref,
            layout,
            index,
            row: Math.floor(index / itemsPerRow),
            column: index % itemsPerRow,
        });

        // Cache node handle
        if (ref.current) {
            const handle = findNodeHandle(ref.current);
            if (handle) {
                nodeHandlesRef.current.set(index, handle);
            }
        }
    }, [mergedConfig.itemsPerRow]);

    /**
     * Unregister an item
     */
    const unregisterItem = useCallback((index: number) => {
        itemsRef.current.delete(index);
        nodeHandlesRef.current.delete(index);
    }, []);

    /**
     * Update item layout
     */
    const updateItemLayout = useCallback((index: number, layout: LayoutRectangle) => {
        const item = itemsRef.current.get(index);
        if (item) {
            item.layout = layout;
        }
    }, []);

    /**
     * Get props for a focusable item
     */
    const getFocusableProps = useCallback((index: number) => {
        const refCallback = (ref: any) => {
            if (ref) {
                const internalRef = { current: ref };
                registerItem(index, internalRef);
            }
        };

        // Calculate next focus targets
        const getNodeHandle = (idx: number): number | undefined => {
            return nodeHandlesRef.current.get(idx);
        };

        const nextUp = getNextIndex('up', index);
        const nextDown = getNextIndex('down', index);
        const nextLeft = getNextIndex('left', index);
        const nextRight = getNextIndex('right', index);

        return {
            ref: refCallback,
            hasTVPreferredFocus: index === focusedIndexRef.current,
            onFocus: () => {
                focusedIndexRef.current = index;
                forceUpdate();
            },
            nextFocusUp: nextUp !== index ? getNodeHandle(nextUp) : undefined,
            nextFocusDown: nextDown !== index ? getNodeHandle(nextDown) : undefined,
            nextFocusLeft: nextLeft !== index ? getNodeHandle(nextLeft) : undefined,
            nextFocusRight: nextRight !== index ? getNodeHandle(nextRight) : undefined,
        };
    }, [registerItem, getNextIndex]);

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
                handlers.onSelect?.(focusedIndexRef.current);
                break;
            case 'menu':
            case 'back':
                handlers.onBack?.();
                break;
        }
    }, [isTV, navigate, handlers]));

    // Reset focus when item count changes
    useEffect(() => {
        if (focusedIndexRef.current >= itemCount) {
            focusedIndexRef.current = Math.max(0, itemCount - 1);
            forceUpdate();
        }
    }, [itemCount]);

    return {
        focusedIndex: focusedIndexRef.current,
        setFocusedIndex,
        navigate,
        registerItem,
        unregisterItem,
        updateItemLayout,
        getNextIndex,
        canNavigate,
        getFocusableProps,
    };
}

// Helper: useReducer for force update
function useReducer<S>(reducer: (s: S) => S, initialState: S): [S, () => void] {
    const [state, setState] = React.useState(initialState);
    return [state, () => setState(reducer(state))];
}

export default useSpatialNavigation;
