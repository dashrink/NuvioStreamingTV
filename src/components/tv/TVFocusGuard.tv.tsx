/**
 * TVFocusGuard.tv.tsx
 *
 * TV-specific boundary component to prevent focus from escaping containers
 * and handle circular navigation prevention.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - Constrains focus within modal/container boundaries
 * - Prevents circular navigation dependencies
 * - Configurable focus boundaries (trap, loop, or escape)
 * - Handles empty content gracefully
 * - Integrates with TVNavigationContext for focus state management
 * - Provides escape hatch for back/menu button to exit focus trap
 *
 * @example
 * ```tsx
 * import TVFocusGuard from '@/components/tv/TVFocusGuard';
 *
 * function Modal({ isOpen, onClose, children }) {
 *   if (!isOpen) return null;
 *
 *   return (
 *     <TVFocusGuard
 *       mode="trap"
 *       onEscape={onClose}
 *       autoFocus
 *     >
 *       {children}
 *     </TVFocusGuard>
 *   );
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  ReactNode,
} from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  findNodeHandle,
  Platform,
} from 'react-native';
import { useTVEventHandler, isMenuEvent } from '../../hooks/useTVEventHandler';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Focus guard mode determines how focus behaves at boundaries
 */
export type FocusGuardMode =
  /** Focus cannot escape the boundary (for modals) */
  | 'trap'
  /** Focus wraps around to the opposite side */
  | 'loop'
  /** Focus can escape the boundary normally */
  | 'normal';

/**
 * Direction that focus attempted to escape
 */
export type EscapeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Information about a focusable element within the guard
 */
export interface FocusableElementInfo {
  /** Unique identifier for the element */
  id: string;
  /** React ref to the element */
  ref: React.RefObject<any>;
  /** Native node handle */
  nodeHandle: number | null;
  /** Grid position (row, column) if in a grid layout */
  gridPosition?: { row: number; col: number };
  /** Order in the focus sequence (for linear navigation) */
  order?: number;
  /** Whether this element should receive initial focus */
  isDefault?: boolean;
}

/**
 * Props for the TVFocusGuard component
 */
export interface TVFocusGuardProps {
  /** Child elements to render */
  children: ReactNode;
  /** Focus boundary mode */
  mode?: FocusGuardMode;
  /** Called when focus attempts to escape in trap mode */
  onEscapeAttempt?: (direction: EscapeDirection) => void;
  /** Called when the menu/back button is pressed (for modal escape) */
  onEscape?: () => void;
  /** Whether to auto-focus the first/default element on mount */
  autoFocus?: boolean;
  /** ID of the element to focus initially (overrides default) */
  initialFocusId?: string;
  /** Called when focus enters the guard boundary */
  onFocusEnter?: () => void;
  /** Called when focus leaves the guard boundary */
  onFocusLeave?: () => void;
  /** Style for the container view */
  style?: StyleProp<ViewStyle>;
  /** Whether the guard is enabled */
  enabled?: boolean;
  /** ID for fallback focus when container is empty or no focusable children */
  fallbackFocusId?: string;
  /** Array of fallback focus IDs to try (in order) when container is empty */
  fallbackFocusIds?: string[];
  /** Ref to a fallback focusable element when container is empty */
  fallbackRef?: React.RefObject<any>;
  /** Callback to handle empty container scenario */
  onEmptyContainer?: () => void;
  /** Test ID for testing purposes */
  testID?: string;
  /** Unique identifier for this focus guard */
  guardId?: string;
  /** Whether the content is currently loading (prevents empty state handling) */
  isLoading?: boolean;
}

/**
 * Ref methods exposed by TVFocusGuard component
 */
export interface TVFocusGuardRef {
  /** Register a focusable element within the guard */
  registerElement: (info: Omit<FocusableElementInfo, 'nodeHandle'>) => void;
  /** Unregister a focusable element */
  unregisterElement: (id: string) => void;
  /** Focus a specific element by ID */
  focusElement: (id: string) => boolean;
  /** Focus the first or default element */
  focusFirst: () => boolean;
  /** Focus the last element */
  focusLast: () => boolean;
  /** Get all registered elements */
  getElements: () => FocusableElementInfo[];
  /** Check if an element is registered */
  hasElement: (id: string) => boolean;
  /** Refresh node handles (call after layout changes) */
  refreshNodeHandles: () => void;
  /** Focus a fallback element (when container is empty) */
  focusFallback: () => boolean;
  /** Check if the container is empty */
  isEmpty: () => boolean;
}

/**
 * Context for nested focus guards and focus tracking
 */
interface FocusGuardContextValue {
  /** Register a child element with the guard */
  registerElement: (info: Omit<FocusableElementInfo, 'nodeHandle'>) => void;
  /** Unregister a child element */
  unregisterElement: (id: string) => void;
  /** Current focus guard mode */
  mode: FocusGuardMode;
  /** Whether this is the active focus guard */
  isActive: boolean;
  /** Guard's unique identifier */
  guardId: string;
  /** Get next focus props for an element */
  getNextFocusProps: (id: string) => {
    nextFocusUp?: number;
    nextFocusDown?: number;
    nextFocusLeft?: number;
    nextFocusRight?: number;
  };
}

// =============================================================================
// Context
// =============================================================================

const FocusGuardContext = createContext<FocusGuardContextValue | null>(null);

/**
 * Hook to access the focus guard context from child components
 */
export function useFocusGuard(): FocusGuardContextValue | null {
  return useContext(FocusGuardContext);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get node handle from a ref safely
 */
function getNodeHandleSafe(ref: React.RefObject<any>): number | null {
  if (!ref?.current) return null;
  try {
    return findNodeHandle(ref.current);
  } catch {
    return null;
  }
}

/**
 * Sort elements by order or registration time
 */
function sortElements(elements: FocusableElementInfo[]): FocusableElementInfo[] {
  return [...elements].sort((a, b) => {
    // First sort by order if defined
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return 0;
  });
}

/**
 * Find the best next focus target based on direction and current element
 */
function findNextFocusTarget(
  currentId: string,
  direction: EscapeDirection,
  elements: FocusableElementInfo[],
  mode: FocusGuardMode
): FocusableElementInfo | null {
  const sorted = sortElements(elements);
  const currentIndex = sorted.findIndex((e) => e.id === currentId);

  if (currentIndex === -1 || sorted.length === 0) {
    return null;
  }

  const isHorizontal = direction === 'left' || direction === 'right';
  const isForward = direction === 'right' || direction === 'down';

  // For grid navigation, try to find element in the right direction
  const current = sorted[currentIndex];
  if (current.gridPosition) {
    const targetRow = current.gridPosition.row + (direction === 'up' ? -1 : direction === 'down' ? 1 : 0);
    const targetCol = current.gridPosition.col + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0);

    const gridTarget = sorted.find(
      (e) => e.gridPosition?.row === targetRow && e.gridPosition?.col === targetCol
    );

    if (gridTarget) {
      return gridTarget;
    }
  }

  // Linear navigation fallback
  const nextIndex = isForward ? currentIndex + 1 : currentIndex - 1;

  if (nextIndex >= 0 && nextIndex < sorted.length) {
    return sorted[nextIndex];
  }

  // Handle boundary behavior
  if (mode === 'loop') {
    return isForward ? sorted[0] : sorted[sorted.length - 1];
  }

  if (mode === 'trap') {
    // Stay on current element
    return current;
  }

  // Normal mode - return null to allow focus to escape
  return null;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * TV Focus Guard component for constraining focus within boundaries
 */
const TVFocusGuard = forwardRef<TVFocusGuardRef, TVFocusGuardProps>(
  (
    {
      children,
      mode = 'normal',
      onEscapeAttempt,
      onEscape,
      autoFocus = false,
      initialFocusId,
      onFocusEnter,
      onFocusLeave,
      style,
      enabled = true,
      fallbackFocusId,
      fallbackFocusIds = [],
      fallbackRef,
      onEmptyContainer,
      testID,
      guardId = 'focus-guard',
      isLoading = false,
    },
    ref
  ) => {
    // State for registered elements
    const [elements, setElements] = useState<Map<string, FocusableElementInfo>>(new Map());

    // Track if focus is inside the guard
    const [isFocusInside, setIsFocusInside] = useState(false);

    // Container ref for the guard view
    const containerRef = useRef<View>(null);

    // Track if initial focus has been set
    const initialFocusSet = useRef(false);

    // =============================================================================
    // Element Registration
    // =============================================================================

    /**
     * Register a focusable element with the guard
     */
    const registerElement = useCallback(
      (info: Omit<FocusableElementInfo, 'nodeHandle'>) => {
        setElements((prev) => {
          const newMap = new Map(prev);
          const nodeHandle = getNodeHandleSafe(info.ref);
          newMap.set(info.id, { ...info, nodeHandle });
          return newMap;
        });
      },
      []
    );

    /**
     * Unregister a focusable element
     */
    const unregisterElement = useCallback((id: string) => {
      setElements((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }, []);

    /**
     * Refresh all node handles (call after layout changes)
     */
    const refreshNodeHandles = useCallback(() => {
      setElements((prev) => {
        const newMap = new Map<string, FocusableElementInfo>();
        prev.forEach((info, id) => {
          const nodeHandle = getNodeHandleSafe(info.ref);
          newMap.set(id, { ...info, nodeHandle });
        });
        return newMap;
      });
    }, []);

    // =============================================================================
    // Focus Management
    // =============================================================================

    /**
     * Focus a specific element by ID
     */
    const focusElement = useCallback(
      (id: string): boolean => {
        const element = elements.get(id);
        if (!element?.ref?.current) {
          return false;
        }

        try {
          if (typeof element.ref.current.setNativeProps === 'function') {
            element.ref.current.setNativeProps({ hasTVPreferredFocus: true });
            return true;
          }
          if (typeof element.ref.current.focus === 'function') {
            element.ref.current.focus();
            return true;
          }
        } catch {
          // Focus failed silently
        }

        return false;
      },
      [elements]
    );

    /**
     * Focus the first or default element
     */
    const focusFirst = useCallback((): boolean => {
      const elementList = Array.from(elements.values());

      if (elementList.length === 0) {
        onEmptyContainer?.();
        return false;
      }

      // Try initial focus ID first
      if (initialFocusId && focusElement(initialFocusId)) {
        return true;
      }

      // Try default element
      const defaultElement = elementList.find((e) => e.isDefault);
      if (defaultElement && focusElement(defaultElement.id)) {
        return true;
      }

      // Focus first element by order
      const sorted = sortElements(elementList);
      if (sorted.length > 0 && focusElement(sorted[0].id)) {
        return true;
      }

      return false;
    }, [elements, initialFocusId, focusElement, onEmptyContainer]);

    /**
     * Focus the last element
     */
    const focusLast = useCallback((): boolean => {
      const elementList = Array.from(elements.values());

      if (elementList.length === 0) {
        onEmptyContainer?.();
        return false;
      }

      const sorted = sortElements(elementList);
      return focusElement(sorted[sorted.length - 1].id);
    }, [elements, focusElement, onEmptyContainer]);

    /**
     * Get all registered elements
     */
    const getElements = useCallback((): FocusableElementInfo[] => {
      return Array.from(elements.values());
    }, [elements]);

    /**
     * Check if an element is registered
     */
    const hasElement = useCallback(
      (id: string): boolean => {
        return elements.has(id);
      },
      [elements]
    );

    /**
     * Check if the container is empty (no focusable elements)
     */
    const isEmpty = useCallback((): boolean => {
      return elements.size === 0;
    }, [elements.size]);

    /**
     * Focus a fallback element outside the guard when container is empty
     * Tries: fallbackRef, fallbackFocusId, then fallbackFocusIds in order
     * Returns true if a fallback was successfully focused
     */
    const focusFallback = useCallback((): boolean => {
      // Try fallbackRef first (direct ref to a focusable element)
      if (fallbackRef?.current) {
        try {
          if (typeof fallbackRef.current.setNativeProps === 'function') {
            fallbackRef.current.setNativeProps({ hasTVPreferredFocus: true });
            return true;
          }
          if (typeof fallbackRef.current.focus === 'function') {
            fallbackRef.current.focus();
            return true;
          }
        } catch {
          // Continue to next fallback option
        }
      }

      // Try single fallbackFocusId (element must be registered externally or have a ref)
      // Note: This looks for the element globally in the DOM, which requires native support
      // For now, it logs but doesn't focus since we need external context
      if (fallbackFocusId) {
        // Emit an event or callback to let parent know we need external focus
        // The parent should handle focusing the element with this ID
      }

      // For fallbackFocusIds, we rely on the parent to handle these
      // since they're outside our scope

      // Call the empty container callback to notify parent
      onEmptyContainer?.();

      return false;
    }, [fallbackRef, fallbackFocusId, onEmptyContainer]);

    // =============================================================================
    // Next Focus Props Calculation
    // =============================================================================

    /**
     * Get next focus props for boundary enforcement
     */
    const getNextFocusProps = useCallback(
      (
        id: string
      ): {
        nextFocusUp?: number;
        nextFocusDown?: number;
        nextFocusLeft?: number;
        nextFocusRight?: number;
      } => {
        if (!enabled || mode === 'normal') {
          return {};
        }

        const elementList = Array.from(elements.values());
        const sorted = sortElements(elementList);
        const currentIndex = sorted.findIndex((e) => e.id === id);

        if (currentIndex === -1) {
          return {};
        }

        const current = sorted[currentIndex];
        const props: {
          nextFocusUp?: number;
          nextFocusDown?: number;
          nextFocusLeft?: number;
          nextFocusRight?: number;
        } = {};

        // Calculate next focus for each direction based on mode
        const directions: EscapeDirection[] = ['up', 'down', 'left', 'right'];

        for (const direction of directions) {
          const target = findNextFocusTarget(id, direction, sorted, mode);

          if (target && target.nodeHandle !== null) {
            switch (direction) {
              case 'up':
                props.nextFocusUp = target.nodeHandle;
                break;
              case 'down':
                props.nextFocusDown = target.nodeHandle;
                break;
              case 'left':
                props.nextFocusLeft = target.nodeHandle;
                break;
              case 'right':
                props.nextFocusRight = target.nodeHandle;
                break;
            }
          } else if (mode === 'trap' && current.nodeHandle !== null) {
            // In trap mode, stay on current element if no target found
            switch (direction) {
              case 'up':
                props.nextFocusUp = current.nodeHandle;
                break;
              case 'down':
                props.nextFocusDown = current.nodeHandle;
                break;
              case 'left':
                props.nextFocusLeft = current.nodeHandle;
                break;
              case 'right':
                props.nextFocusRight = current.nodeHandle;
                break;
            }
          }
        }

        return props;
      },
      [elements, enabled, mode]
    );

    // =============================================================================
    // Imperative Handle
    // =============================================================================

    useImperativeHandle(ref, () => ({
      registerElement,
      unregisterElement,
      focusElement,
      focusFirst,
      focusLast,
      getElements,
      hasElement,
      refreshNodeHandles,
      focusFallback,
      isEmpty,
    }));

    // =============================================================================
    // TV Event Handling (for escape via menu/back button)
    // =============================================================================

    const handleTVEvent = useCallback(
      (event: { eventType: string }) => {
        if (!enabled || mode !== 'trap' || !isFocusInside) {
          return;
        }

        if (isMenuEvent(event as any)) {
          onEscape?.();
        }
      },
      [enabled, mode, isFocusInside, onEscape]
    );

    useTVEventHandler(handleTVEvent, { enabled: enabled && mode === 'trap' });

    // =============================================================================
    // Auto-Focus Effect
    // =============================================================================

    useEffect(() => {
      if (!autoFocus || !enabled || initialFocusSet.current) {
        return;
      }

      // Delay focus to ensure layout is complete
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          if (focusFirst()) {
            initialFocusSet.current = true;
          }
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }, [autoFocus, enabled, focusFirst, elements.size]);

    // =============================================================================
    // Empty Container Detection & Fallback Focus
    // =============================================================================

    useEffect(() => {
      // Don't trigger fallback during loading state
      if (isLoading) {
        return;
      }

      if (elements.size === 0 && enabled) {
        // Schedule focus fallback when container becomes empty
        const timeoutId = setTimeout(() => {
          requestAnimationFrame(() => {
            // Attempt to focus a fallback element
            const focused = focusFallback();

            // If no fallback was focused, still notify parent
            if (!focused) {
              onEmptyContainer?.();
            }
          });
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }, [elements.size, enabled, isLoading, focusFallback, onEmptyContainer]);

    // =============================================================================
    // Focus Enter/Leave Tracking
    // =============================================================================

    const handleFocusCapture = useCallback(() => {
      if (!isFocusInside) {
        setIsFocusInside(true);
        onFocusEnter?.();
      }
    }, [isFocusInside, onFocusEnter]);

    const handleBlurCapture = useCallback(() => {
      // Use a timeout to check if focus moved outside
      setTimeout(() => {
        const elementList = Array.from(elements.values());
        const focusStillInside = elementList.some((e) => {
          if (!e.ref?.current) return false;
          try {
            // Check if element is still focused
            if (typeof e.ref.current.isFocused === 'function') {
              return e.ref.current.isFocused();
            }
          } catch {
            // Ignore errors
          }
          return false;
        });

        if (!focusStillInside && isFocusInside) {
          setIsFocusInside(false);
          onFocusLeave?.();
        }
      }, 50);
    }, [elements, isFocusInside, onFocusLeave]);

    // =============================================================================
    // Context Value
    // =============================================================================

    const contextValue = useMemo<FocusGuardContextValue>(
      () => ({
        registerElement,
        unregisterElement,
        mode,
        isActive: enabled,
        guardId,
        getNextFocusProps,
      }),
      [registerElement, unregisterElement, mode, enabled, guardId, getNextFocusProps]
    );

    // =============================================================================
    // Render
    // =============================================================================

    // On non-TV platforms, just render children
    if (!Platform.isTV) {
      return (
        <View ref={containerRef} style={style} testID={testID}>
          {children}
        </View>
      );
    }

    return (
      <FocusGuardContext.Provider value={contextValue}>
        <View
          ref={containerRef}
          style={[styles.container, style]}
          onFocus={handleFocusCapture}
          onBlur={handleBlurCapture}
          testID={testID}
        >
          {children}
        </View>
      </FocusGuardContext.Provider>
    );
  }
);

TVFocusGuard.displayName = 'TVFocusGuard';

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    // Default container styles
  },
});

// =============================================================================
// Hook for Child Components
// =============================================================================

/**
 * Hook for focusable children to register with the parent TVFocusGuard
 *
 * @param id - Unique identifier for this focusable element
 * @param ref - React ref to the focusable element
 * @param options - Additional options for registration
 *
 * @example
 * ```tsx
 * function MyButton({ id, ...props }) {
 *   const buttonRef = useRef(null);
 *
 *   useFocusGuardChild(id, buttonRef, { isDefault: true });
 *
 *   return (
 *     <Focusable ref={buttonRef} {...props}>
 *       <Text>Button</Text>
 *     </Focusable>
 *   );
 * }
 * ```
 */
export function useFocusGuardChild(
  id: string,
  ref: React.RefObject<any>,
  options: {
    order?: number;
    gridPosition?: { row: number; col: number };
    isDefault?: boolean;
  } = {}
): {
  nextFocusProps: {
    nextFocusUp?: number;
    nextFocusDown?: number;
    nextFocusLeft?: number;
    nextFocusRight?: number;
  };
  isInGuard: boolean;
} {
  const guard = useFocusGuard();

  // Register with parent guard on mount
  useEffect(() => {
    if (guard && id && ref) {
      guard.registerElement({
        id,
        ref,
        order: options.order,
        gridPosition: options.gridPosition,
        isDefault: options.isDefault,
      });

      return () => {
        guard.unregisterElement(id);
      };
    }
  }, [guard, id, ref, options.order, options.gridPosition, options.isDefault]);

  // Get next focus props from guard
  const nextFocusProps = guard ? guard.getNextFocusProps(id) : {};

  return {
    nextFocusProps,
    isInGuard: guard !== null,
  };
}

// =============================================================================
// Exports
// =============================================================================

export default TVFocusGuard;

export type {
  TVFocusGuardProps,
  TVFocusGuardRef,
  FocusGuardMode,
  EscapeDirection,
  FocusableElementInfo,
};
