/**
 * Focus Group Hook
 *
 * Manages focus state for a group of focusable items (for TV navigation)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';

export interface FocusGroupOptions {
  id: string;
  autoFocus?: boolean;
  trapFocus?: boolean;
  rememberFocus?: boolean;
  onFocusChange?: (index: number) => void;
}

export interface FocusGroupReturn {
  focusedIndex: number;
  focusItem: (index: number) => void;
  focusNext: () => void;
  focusPrevious: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  handleItemFocus: (index: number) => () => void;
  handleItemBlur: () => void;
  getItemRef: (index: number) => React.RefObject<any>;
}

/**
 * Hook for managing focus within a group of items
 * Useful for lists and grids on TV platforms
 */
export const useFocusGroup = (options: FocusGroupOptions): FocusGroupReturn => {
  const { id, autoFocus = false, rememberFocus = false, onFocusChange } = options;

  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const lastFocusedIndexRef = useRef<number>(-1);
  const groupIdRef = useRef<string>(id);
  const itemRefsRef = useRef<Map<number, React.RefObject<any>>>(new Map());

  // Auto-focus first item if autoFocus is enabled
  useEffect(() => {
    if (autoFocus && focusedIndex === -1) {
      const initialIndex = rememberFocus ? lastFocusedIndexRef.current : 0;
      setFocusedIndex(initialIndex >= 0 ? initialIndex : 0);
    }
  }, [autoFocus, rememberFocus, focusedIndex]);

  // Focus a specific item by index
  const focusItem = useCallback((index: number) => {
    setFocusedIndex(index);
    lastFocusedIndexRef.current = index;
    onFocusChange?.(index);
  }, [onFocusChange]);

  // Focus next item
  const focusNext = useCallback(() => {
    setFocusedIndex(prev => {
      const next = prev + 1;
      lastFocusedIndexRef.current = next;
      onFocusChange?.(next);
      return next;
    });
  }, [onFocusChange]);

  // Focus previous item
  const focusPrevious = useCallback(() => {
    setFocusedIndex(prev => {
      const previous = Math.max(0, prev - 1);
      lastFocusedIndexRef.current = previous;
      onFocusChange?.(previous);
      return previous;
    });
  }, [onFocusChange]);

  // Focus first item
  const focusFirst = useCallback(() => {
    setFocusedIndex(0);
    lastFocusedIndexRef.current = 0;
    onFocusChange?.(0);
  }, [onFocusChange]);

  // Focus last item (requires knowing total count - caller's responsibility)
  const focusLast = useCallback(() => {
    // This is a placeholder - actual implementation would need item count
    // For now, just keep current focus
  }, []);

  // Handle focus event for an item
  const handleItemFocus = useCallback((index: number) => {
    return () => {
      focusItem(index);
    };
  }, [focusItem]);

  // Handle blur event
  const handleItemBlur = useCallback(() => {
    // Keep track of last focused but don't clear current focus
    // This allows focus to be restored if needed
  }, []);

  // Get or create a ref for an item at a specific index
  const getItemRef = useCallback((index: number): React.RefObject<any> => {
    if (!itemRefsRef.current.has(index)) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      itemRefsRef.current.set(index, React.createRef());
    }
    return itemRefsRef.current.get(index)!;
  }, []);

  return {
    focusedIndex,
    focusItem,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    handleItemFocus,
    handleItemBlur,
    getItemRef,
  };
};
