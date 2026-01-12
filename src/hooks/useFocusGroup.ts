import { useCallback, useRef, useEffect, useMemo } from 'react';
import { Platform, findNodeHandle } from 'react-native';

import { useTVEventHandler } from './useTVEventHandler';
import { useTVNavigationSafe, FocusZone } from '../contexts/TVNavigationContext';

/**
 * Focus group configuration
 */
export interface FocusGroupConfig {
  /** Unique identifier for the focus group */
  id: string;
  /** Whether focus should be trapped within this group */
  trapFocus?: boolean;
  /** Priority for focus restoration (higher = more priority) */
  priority?: number;
  /** Auto-focus first item when group mounts */
  autoFocus?: boolean;
  /** Remember last focused item for restoration */
  rememberFocus?: boolean;
  /** Direction to move focus when exiting group */
  exitDirection?: {
    up?: string;
    down?: string;
    left?: string;
    right?: string;
  };
  /** Callback when focus enters the group */
  onEnter?: () => void;
  /** Callback when focus leaves the group */
  onLeave?: () => void;
  /** Callback when focus changes within group */
  onFocusChange?: (index: number, prevIndex: number) => void;
}

/**
 * Focus group item
 */
interface FocusGroupItem {
  ref: React.RefObject<any>;
  index: number;
  focusable: boolean;
}

/**
 * Return type for useFocusGroup hook
 */
export interface FocusGroupResult {
  /** Current focused index within the group */
  focusedIndex: number;
  /** Whether the group currently has focus */
  hasFocus: boolean;
  /** Group ID */
  groupId: string;
  /** Register an item in the focus group */
  registerItem: (index: number, ref: React.RefObject<any>, focusable?: boolean) => void;
  /** Unregister an item from the group */
  unregisterItem: (index: number) => void;
  /** Focus a specific item by index */
  focusItem: (index: number) => void;
  /** Focus the first focusable item */
  focusFirst: () => void;
  /** Focus the last focusable item */
  focusLast: () => void;
  /** Focus the next item */
  focusNext: () => void;
  /** Focus the previous item */
  focusPrevious: () => void;
  /** Get all refs in the group */
  getRefs: () => React.RefObject<any>[];
  /** Create ref callback for an item */
  getItemRef: (index: number) => (ref: any) => void;
  /** Check if group contains focus */
  containsFocus: () => boolean;
  /** Restore focus to last focused item */
  restoreFocus: () => void;
}

/**
 * useFocusGroup - Hook for managing focus within a group of elements
 *
 * Provides:
 * - Group-based focus management
 * - Focus trapping within the group
 * - Focus memory and restoration
 * - Integration with TVNavigationContext
 * - Sequential navigation (next/previous)
 *
 * @param config - Focus group configuration
 *
 * @example
 * ```tsx
 * const { focusedIndex, getItemRef, focusFirst } = useFocusGroup({
 *   id: 'menu-items',
 *   trapFocus: true,
 *   autoFocus: true,
 * });
 *
 * useEffect(() => {
 *   if (isOpen) focusFirst();
 * }, [isOpen]);
 *
 * return menuItems.map((item, index) => (
 *   <Focusable
 *     key={item.id}
 *     ref={getItemRef(index)}
 *     hasTVPreferredFocus={index === focusedIndex}
 *   >
 *     {item.label}
 *   </Focusable>
 * ));
 * ```
 */
export function useFocusGroup(config: FocusGroupConfig): FocusGroupResult {
  const isTV = Platform.isTV;
  const tvNavigation = useTVNavigationSafe();

  const {
    id,
    trapFocus = false,
    priority = 0,
    autoFocus = false,
    rememberFocus = true,
    exitDirection,
    onEnter,
    onLeave,
    onFocusChange,
  } = config;

  // State refs
  const itemsRef = useRef<Map<number, FocusGroupItem>>(new Map());
  const focusedIndexRef = useRef<number>(-1);
  const lastFocusedIndexRef = useRef<number>(0);
  const hasFocusRef = useRef<boolean>(false);

  // Force re-render
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  /**
   * Get all registered refs in order
   */
  const getRefs = useCallback((): React.RefObject<any>[] => {
    const items = Array.from(itemsRef.current.entries())
      .sort(([a], [b]) => a - b)
      .filter(([, item]) => item.focusable)
      .map(([, item]) => item.ref);
    return items;
  }, []);

  /**
   * Get focusable indices
   */
  const getFocusableIndices = useCallback((): number[] => {
    return Array.from(itemsRef.current.entries())
      .filter(([, item]) => item.focusable)
      .map(([index]) => index)
      .sort((a, b) => a - b);
  }, []);

  /**
   * Register the focus zone with TVNavigationContext
   */
  useEffect(() => {
    if (!tvNavigation || !isTV) return;

    const zone: FocusZone = {
      id,
      priority,
      refs: getRefs(),
      trapFocus,
      onEnter,
      onLeave,
    };

    tvNavigation.registerZone(zone);

    return () => {
      tvNavigation.unregisterZone(id);
    };
  }, [id, priority, trapFocus, tvNavigation, isTV, getRefs, onEnter, onLeave]);

  /**
   * Register an item in the focus group
   */
  const registerItem = useCallback(
    (index: number, ref: React.RefObject<any>, focusable: boolean = true) => {
      itemsRef.current.set(index, { ref, index, focusable });

      if (__DEV__) {
        console.log(`[FocusGroup:${id}] Registered item:`, index);
      }
    },
    [id]
  );

  /**
   * Unregister an item from the group
   */
  const unregisterItem = useCallback(
    (index: number) => {
      itemsRef.current.delete(index);

      if (__DEV__) {
        console.log(`[FocusGroup:${id}] Unregistered item:`, index);
      }
    },
    [id]
  );

  /**
   * Focus a specific item by index
   */
  const focusItem = useCallback(
    (index: number) => {
      if (!isTV) return;

      const item = itemsRef.current.get(index);
      if (!item?.ref?.current || !item.focusable) return;

      const prevIndex = focusedIndexRef.current;
      focusedIndexRef.current = index;
      lastFocusedIndexRef.current = index;

      // Trigger native focus
      try {
        const nodeHandle = findNodeHandle(item.ref.current);
        if (nodeHandle) {
          item.ref.current.setNativeProps?.({ hasTVPreferredFocus: true });
        }
      } catch (error) {
        if (__DEV__) {
          console.log(`[FocusGroup:${id}] Focus error:`, error);
        }
      }

      // Notify context
      if (tvNavigation) {
        tvNavigation.pushFocusHistory(`${id}:${index}`);
      }

      // Trigger callback
      if (prevIndex !== index) {
        onFocusChange?.(index, prevIndex);
      }

      forceUpdate();
    },
    [isTV, id, tvNavigation, onFocusChange]
  );

  /**
   * Focus the first focusable item
   */
  const focusFirst = useCallback(() => {
    const indices = getFocusableIndices();
    if (indices.length > 0) {
      focusItem(indices[0]);
    }
  }, [getFocusableIndices, focusItem]);

  /**
   * Focus the last focusable item
   */
  const focusLast = useCallback(() => {
    const indices = getFocusableIndices();
    if (indices.length > 0) {
      focusItem(indices[indices.length - 1]);
    }
  }, [getFocusableIndices, focusItem]);

  /**
   * Focus the next item
   */
  const focusNext = useCallback(() => {
    const indices = getFocusableIndices();
    if (indices.length === 0) return;

    const currentPosition = indices.indexOf(focusedIndexRef.current);
    const nextPosition = currentPosition + 1;

    if (nextPosition < indices.length) {
      focusItem(indices[nextPosition]);
    } else if (trapFocus) {
      // Wrap to first item
      focusItem(indices[0]);
    }
  }, [getFocusableIndices, focusItem, trapFocus]);

  /**
   * Focus the previous item
   */
  const focusPrevious = useCallback(() => {
    const indices = getFocusableIndices();
    if (indices.length === 0) return;

    const currentPosition = indices.indexOf(focusedIndexRef.current);
    const prevPosition = currentPosition - 1;

    if (prevPosition >= 0) {
      focusItem(indices[prevPosition]);
    } else if (trapFocus) {
      // Wrap to last item
      focusItem(indices[indices.length - 1]);
    }
  }, [getFocusableIndices, focusItem, trapFocus]);

  /**
   * Create ref callback for an item
   */
  const getItemRef = useCallback(
    (index: number) => {
      return (ref: any) => {
        if (ref) {
          const internalRef = { current: ref };
          registerItem(index, internalRef);
        } else {
          unregisterItem(index);
        }
      };
    },
    [registerItem, unregisterItem]
  );

  /**
   * Check if group contains focus
   */
  const containsFocus = useCallback((): boolean => {
    return hasFocusRef.current;
  }, []);

  /**
   * Restore focus to last focused item
   */
  const restoreFocus = useCallback(() => {
    if (rememberFocus && lastFocusedIndexRef.current >= 0) {
      focusItem(lastFocusedIndexRef.current);
    } else {
      focusFirst();
    }
  }, [rememberFocus, focusItem, focusFirst]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && isTV) {
      // Delay to ensure items are registered
      const timer = setTimeout(() => {
        focusFirst();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, isTV, focusFirst]);

  // Handle focus entering/leaving group
  const handleFocus = useCallback(
    (index: number) => {
      const wasOutside = !hasFocusRef.current;
      hasFocusRef.current = true;
      focusedIndexRef.current = index;
      lastFocusedIndexRef.current = index;

      if (wasOutside) {
        onEnter?.();
      }

      forceUpdate();
    },
    [onEnter]
  );

  const handleBlur = useCallback(() => {
    // Use timeout to check if focus moved outside group
    setTimeout(() => {
      // Check if any item in group has focus
      let stillHasFocus = false;
      itemsRef.current.forEach(item => {
        if (item.ref?.current?.isFocused?.()) {
          stillHasFocus = true;
        }
      });

      if (!stillHasFocus && hasFocusRef.current) {
        hasFocusRef.current = false;
        focusedIndexRef.current = -1;
        onLeave?.();
        forceUpdate();
      }
    }, 50);
  }, [onLeave]);

  // Handle TV events for trapped focus
  useTVEventHandler(
    useCallback(
      (evt: any) => {
        if (!isTV || !trapFocus || !hasFocusRef.current) return;

        const { eventType } = evt;
        const indices = getFocusableIndices();
        const currentPosition = indices.indexOf(focusedIndexRef.current);
        const isFirst = currentPosition === 0;
        const isLast = currentPosition === indices.length - 1;

        // Handle navigation at edges when focus is trapped
        if (eventType === 'up' && isFirst) {
          // Already at top, prevent leaving group
          evt.stopPropagation?.();
        } else if (eventType === 'down' && isLast) {
          // Already at bottom, prevent leaving group
          evt.stopPropagation?.();
        }
      },
      [isTV, trapFocus, getFocusableIndices]
    )
  );

  return {
    focusedIndex: focusedIndexRef.current,
    hasFocus: hasFocusRef.current,
    groupId: id,
    registerItem,
    unregisterItem,
    focusItem,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    getRefs,
    getItemRef,
    containsFocus,
    restoreFocus,
  };
}

export default useFocusGroup;
