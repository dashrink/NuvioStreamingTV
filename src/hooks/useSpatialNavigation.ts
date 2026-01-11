/**
 * useSpatialNavigation Hook
 *
 * Hook for spatial navigation with focus memory storage/retrieval and
 * nextFocus logic with node handle management.
 *
 * Features:
 * - Focus memory persistence across screen navigation
 * - Node handle management for nextFocusUp/Down/Left/Right props
 * - Integration with TVNavigationContext for global focus state
 * - Graceful handling of missing refs and non-TV platforms
 *
 * @example
 * ```tsx
 * import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
 *
 * function MyScreen() {
 *   const {
 *     registerRef,
 *     getNodeHandle,
 *     saveFocus,
 *     restoreFocus,
 *     getNextFocusProps,
 *   } = useSpatialNavigation('MyScreen');
 *
 *   const buttonRef = useRef(null);
 *
 *   useEffect(() => {
 *     registerRef('myButton', buttonRef);
 *   }, []);
 *
 *   return (
 *     <Pressable
 *       ref={buttonRef}
 *       onFocus={() => saveFocus('myButton')}
 *       {...getNextFocusProps('myButton')}
 *     >
 *       <Text>Press me</Text>
 *     </Pressable>
 *   );
 * }
 * ```
 */

import { useRef, useCallback, useEffect, useMemo } from 'react';
import { findNodeHandle, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * A ref that can be registered for spatial navigation
 */
export type FocusableRef = React.RefObject<any>;

/**
 * Direction for next focus navigation
 */
export type FocusDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Mapping of focus IDs to their refs
 */
export type RefMap = Record<string, FocusableRef>;

/**
 * Mapping of focus IDs to their native node handles
 */
export type NodeHandleMap = Record<string, number | null>;

/**
 * Configuration for next focus relationships
 */
export interface NextFocusConfig {
  /** Focus ID to navigate to when pressing up */
  up?: string;
  /** Focus ID to navigate to when pressing down */
  down?: string;
  /** Focus ID to navigate to when pressing left */
  left?: string;
  /** Focus ID to navigate to when pressing right */
  right?: string;
}

/**
 * Map of focus IDs to their next focus configurations
 */
export type NextFocusMap = Record<string, NextFocusConfig>;

/**
 * Props for nextFocus native props (node handles)
 */
export interface NextFocusProps {
  nextFocusUp?: number;
  nextFocusDown?: number;
  nextFocusLeft?: number;
  nextFocusRight?: number;
}

/**
 * Options for useSpatialNavigation hook
 */
export interface UseSpatialNavigationOptions {
  /** Whether to auto-restore focus when screen comes into focus */
  autoRestoreFocus?: boolean;
  /** Default focus ID to use when no saved focus exists */
  defaultFocusId?: string;
  /** Whether the hook is enabled (default: true on TV) */
  enabled?: boolean;
}

/**
 * Return value from useSpatialNavigation hook
 */
export interface UseSpatialNavigationReturn {
  // Ref Management
  /** Register a ref for a focusable element */
  registerRef: (focusId: string, ref: FocusableRef) => void;
  /** Unregister a ref */
  unregisterRef: (focusId: string) => void;
  /** Get a registered ref by focus ID */
  getRef: (focusId: string) => FocusableRef | undefined;

  // Node Handle Management
  /** Get the native node handle for a focus ID */
  getNodeHandle: (focusId: string) => number | null;
  /** Refresh all node handles (call after refs change) */
  refreshNodeHandles: () => void;

  // Focus Memory
  /** Save the current focus ID */
  saveFocus: (focusId: string) => void;
  /** Get the saved focus ID for this screen */
  getSavedFocus: () => string | null;
  /** Restore focus to the saved element (or default) */
  restoreFocus: () => boolean;
  /** Clear saved focus for this screen */
  clearSavedFocus: () => void;

  // Next Focus Props
  /** Set next focus configuration for an element */
  setNextFocus: (focusId: string, config: NextFocusConfig) => void;
  /** Get next focus native props (node handles) for an element */
  getNextFocusProps: (focusId: string) => NextFocusProps;

  // Focus Control
  /** Programmatically focus an element by ID */
  focusElement: (focusId: string) => boolean;
  /** Get the currently focused element ID */
  currentFocusId: string | null;

  // Utility
  /** Whether we're on a TV platform */
  isTV: boolean;
  /** Screen name this hook is bound to */
  screenName: string;
  /** Map of all registered refs */
  refs: RefMap;
}

// =============================================================================
// Constants
// =============================================================================

/** Delay before focus restoration to allow layout to complete */
const FOCUS_RESTORE_DELAY_MS = 50;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for spatial navigation with focus memory and nextFocus management
 *
 * @param screenName - Unique name for this screen (used for focus memory persistence)
 * @param options - Configuration options
 * @returns Object with ref management, focus memory, and nextFocus functions
 */
export function useSpatialNavigation(
  screenName: string,
  options: UseSpatialNavigationOptions = {}
): UseSpatialNavigationReturn {
  const {
    autoRestoreFocus = true,
    defaultFocusId,
    enabled = Platform.isTV,
  } = options;

  // Get TV navigation context (optional - will work without it)
  const tvNavigation = useTVNavigationOptional();

  // Refs storage - maps focus IDs to React refs
  const refsRef = useRef<RefMap>({});

  // Node handles cache - maps focus IDs to native node handles
  const nodeHandlesRef = useRef<NodeHandleMap>({});

  // Next focus configuration - maps focus IDs to their next focus relationships
  const nextFocusMapRef = useRef<NextFocusMap>({});

  // Local focus tracking (fallback if no context)
  const localFocusIdRef = useRef<string | null>(null);

  // Local focus memory (fallback if no context)
  const localFocusMemoryRef = useRef<Record<string, string>>({});

  // =============================================================================
  // Ref Management
  // =============================================================================

  /**
   * Register a ref for spatial navigation
   */
  const registerRef = useCallback((focusId: string, ref: FocusableRef) => {
    if (!focusId || !ref) return;

    refsRef.current[focusId] = ref;

    // Try to get the node handle immediately
    try {
      const handle = findNodeHandle(ref.current);
      nodeHandlesRef.current[focusId] = handle;
    } catch {
      nodeHandlesRef.current[focusId] = null;
    }
  }, []);

  /**
   * Unregister a ref
   */
  const unregisterRef = useCallback((focusId: string) => {
    delete refsRef.current[focusId];
    delete nodeHandlesRef.current[focusId];
    delete nextFocusMapRef.current[focusId];
  }, []);

  /**
   * Get a registered ref by focus ID
   */
  const getRef = useCallback((focusId: string): FocusableRef | undefined => {
    return refsRef.current[focusId];
  }, []);

  // =============================================================================
  // Node Handle Management
  // =============================================================================

  /**
   * Get the native node handle for a focus ID
   * Returns null if ref is not registered or findNodeHandle fails
   */
  const getNodeHandle = useCallback((focusId: string): number | null => {
    // Return cached handle if available
    if (nodeHandlesRef.current[focusId] !== undefined) {
      return nodeHandlesRef.current[focusId];
    }

    // Try to get the handle from the ref
    const ref = refsRef.current[focusId];
    if (!ref || !ref.current) {
      return null;
    }

    try {
      const handle = findNodeHandle(ref.current);
      nodeHandlesRef.current[focusId] = handle;
      return handle;
    } catch {
      nodeHandlesRef.current[focusId] = null;
      return null;
    }
  }, []);

  /**
   * Refresh all node handles (call after refs have been updated)
   */
  const refreshNodeHandles = useCallback(() => {
    const refs = refsRef.current;

    for (const focusId of Object.keys(refs)) {
      const ref = refs[focusId];
      if (ref && ref.current) {
        try {
          const handle = findNodeHandle(ref.current);
          nodeHandlesRef.current[focusId] = handle;
        } catch {
          nodeHandlesRef.current[focusId] = null;
        }
      } else {
        nodeHandlesRef.current[focusId] = null;
      }
    }
  }, []);

  // =============================================================================
  // Focus Memory
  // =============================================================================

  /**
   * Save the current focus ID for this screen
   */
  const saveFocus = useCallback(
    (focusId: string) => {
      if (!focusId) return;

      // Update local tracking
      localFocusIdRef.current = focusId;

      // Save to context if available
      if (tvNavigation) {
        tvNavigation.setScreenFocus(screenName, focusId);
        tvNavigation.setCurrentFocusId(focusId);
      } else {
        // Fallback to local storage
        localFocusMemoryRef.current[screenName] = focusId;
      }
    },
    [screenName, tvNavigation]
  );

  /**
   * Get the saved focus ID for this screen
   */
  const getSavedFocus = useCallback((): string | null => {
    // Try context first
    if (tvNavigation) {
      return tvNavigation.getScreenFocus(screenName);
    }
    // Fallback to local storage
    return localFocusMemoryRef.current[screenName] || null;
  }, [screenName, tvNavigation]);

  /**
   * Restore focus to the saved element (or default)
   * Returns true if focus was successfully restored
   */
  const restoreFocus = useCallback((): boolean => {
    if (!enabled) return false;

    // Get the saved focus ID (or use default)
    const savedFocusId = getSavedFocus() || defaultFocusId;
    if (!savedFocusId) return false;

    // Get the ref for this focus ID
    const ref = refsRef.current[savedFocusId];
    if (!ref || !ref.current) return false;

    // Try to focus the element using setNativeProps
    try {
      if (typeof ref.current.setNativeProps === 'function') {
        ref.current.setNativeProps({ hasTVPreferredFocus: true });
        return true;
      }

      // Alternative: try to focus directly if it's a function
      if (typeof ref.current.focus === 'function') {
        ref.current.focus();
        return true;
      }
    } catch {
      // Focus restoration failed silently
    }

    return false;
  }, [enabled, getSavedFocus, defaultFocusId]);

  /**
   * Clear saved focus for this screen
   */
  const clearSavedFocus = useCallback(() => {
    if (tvNavigation) {
      tvNavigation.clearScreenFocus(screenName);
    } else {
      delete localFocusMemoryRef.current[screenName];
    }
    localFocusIdRef.current = null;
  }, [screenName, tvNavigation]);

  // =============================================================================
  // Next Focus Configuration
  // =============================================================================

  /**
   * Set next focus configuration for an element
   */
  const setNextFocus = useCallback((focusId: string, config: NextFocusConfig) => {
    nextFocusMapRef.current[focusId] = {
      ...nextFocusMapRef.current[focusId],
      ...config,
    };
  }, []);

  /**
   * Get next focus native props (node handles) for an element
   * These props can be spread onto a focusable View/TouchableOpacity
   */
  const getNextFocusProps = useCallback(
    (focusId: string): NextFocusProps => {
      const config = nextFocusMapRef.current[focusId];
      if (!config) return {};

      const props: NextFocusProps = {};

      // Get node handles for each direction
      if (config.up) {
        const handle = getNodeHandle(config.up);
        if (handle !== null) {
          props.nextFocusUp = handle;
        }
      }

      if (config.down) {
        const handle = getNodeHandle(config.down);
        if (handle !== null) {
          props.nextFocusDown = handle;
        }
      }

      if (config.left) {
        const handle = getNodeHandle(config.left);
        if (handle !== null) {
          props.nextFocusLeft = handle;
        }
      }

      if (config.right) {
        const handle = getNodeHandle(config.right);
        if (handle !== null) {
          props.nextFocusRight = handle;
        }
      }

      return props;
    },
    [getNodeHandle]
  );

  // =============================================================================
  // Focus Control
  // =============================================================================

  /**
   * Programmatically focus an element by ID
   * Returns true if focus was successfully set
   */
  const focusElement = useCallback(
    (focusId: string): boolean => {
      if (!enabled) return false;

      const ref = refsRef.current[focusId];
      if (!ref || !ref.current) return false;

      try {
        if (typeof ref.current.setNativeProps === 'function') {
          ref.current.setNativeProps({ hasTVPreferredFocus: true });
          saveFocus(focusId);
          return true;
        }

        if (typeof ref.current.focus === 'function') {
          ref.current.focus();
          saveFocus(focusId);
          return true;
        }
      } catch {
        // Focus failed silently
      }

      return false;
    },
    [enabled, saveFocus]
  );

  // =============================================================================
  // Auto Focus Restoration with React Navigation
  // =============================================================================

  useFocusEffect(
    useCallback(() => {
      if (!autoRestoreFocus || !enabled) return;

      // Delay focus restoration to allow layout to complete
      // This is necessary because useFocusEffect fires before the screen is fully rendered
      const timeoutId = setTimeout(() => {
        // Use requestAnimationFrame for additional safety
        requestAnimationFrame(() => {
          restoreFocus();
        });
      }, FOCUS_RESTORE_DELAY_MS);

      // Cleanup
      return () => {
        clearTimeout(timeoutId);
      };
    }, [autoRestoreFocus, enabled, restoreFocus])
  );

  // =============================================================================
  // Cleanup on Unmount
  // =============================================================================

  useEffect(() => {
    return () => {
      // Clear all refs and handles on unmount
      refsRef.current = {};
      nodeHandlesRef.current = {};
      nextFocusMapRef.current = {};
    };
  }, []);

  // =============================================================================
  // Current Focus ID (from context or local)
  // =============================================================================

  const currentFocusId = useMemo(() => {
    return tvNavigation?.currentFocusId ?? localFocusIdRef.current;
  }, [tvNavigation?.currentFocusId]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return {
    // Ref Management
    registerRef,
    unregisterRef,
    getRef,

    // Node Handle Management
    getNodeHandle,
    refreshNodeHandles,

    // Focus Memory
    saveFocus,
    getSavedFocus,
    restoreFocus,
    clearSavedFocus,

    // Next Focus Props
    setNextFocus,
    getNextFocusProps,

    // Focus Control
    focusElement,
    currentFocusId,

    // Utility
    isTV: Platform.isTV === true,
    screenName,
    refs: refsRef.current,
  };
}

// =============================================================================
// Utility Hook: useFocusableRef
// =============================================================================

/**
 * Simplified hook for managing a single focusable ref
 *
 * @param spatialNav - The spatial navigation hook instance
 * @param focusId - Unique ID for this focusable element
 * @param nextFocus - Optional next focus configuration
 * @returns Ref to attach to the focusable element
 */
export function useFocusableRef<T = any>(
  spatialNav: UseSpatialNavigationReturn,
  focusId: string,
  nextFocus?: NextFocusConfig
): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    spatialNav.registerRef(focusId, ref);

    if (nextFocus) {
      spatialNav.setNextFocus(focusId, nextFocus);
    }

    return () => {
      spatialNav.unregisterRef(focusId);
    };
  }, [spatialNav, focusId, nextFocus]);

  return ref;
}

// =============================================================================
// Utility Hook: useFocusHandlers
// =============================================================================

/**
 * Returns focus event handlers for a focusable element
 *
 * @param spatialNav - The spatial navigation hook instance
 * @param focusId - Unique ID for this focusable element
 * @param callbacks - Optional callbacks for focus events
 * @returns Object with onFocus and onBlur handlers
 */
export function useFocusHandlers(
  spatialNav: UseSpatialNavigationReturn,
  focusId: string,
  callbacks?: {
    onFocus?: () => void;
    onBlur?: () => void;
  }
): {
  onFocus: () => void;
  onBlur: () => void;
} {
  const onFocus = useCallback(() => {
    spatialNav.saveFocus(focusId);
    callbacks?.onFocus?.();
  }, [spatialNav, focusId, callbacks]);

  const onBlur = useCallback(() => {
    callbacks?.onBlur?.();
  }, [callbacks]);

  return { onFocus, onBlur };
}

// =============================================================================
// Utility Hook: useGridNavigation
// =============================================================================

/**
 * Configuration for grid navigation
 */
export interface GridNavigationConfig {
  /** Number of columns in the grid */
  columns: number;
  /** Total number of items in the grid */
  itemCount: number;
  /** Prefix for focus IDs (e.g., 'grid-item-' -> 'grid-item-0', 'grid-item-1', etc.) */
  focusIdPrefix: string;
  /** Whether to wrap horizontally (left on first col goes to last col of prev row) */
  wrapHorizontal?: boolean;
  /** Whether to wrap vertically (up on first row goes to last row) */
  wrapVertical?: boolean;
}

/**
 * Set up next focus relationships for a grid layout
 *
 * @param spatialNav - The spatial navigation hook instance
 * @param config - Grid configuration
 */
export function useGridNavigation(
  spatialNav: UseSpatialNavigationReturn,
  config: GridNavigationConfig
): void {
  const { columns, itemCount, focusIdPrefix, wrapHorizontal = false, wrapVertical = false } = config;

  useEffect(() => {
    const rows = Math.ceil(itemCount / columns);

    for (let i = 0; i < itemCount; i++) {
      const focusId = `${focusIdPrefix}${i}`;
      const row = Math.floor(i / columns);
      const col = i % columns;

      const nextFocus: NextFocusConfig = {};

      // Calculate up navigation
      if (row > 0) {
        nextFocus.up = `${focusIdPrefix}${i - columns}`;
      } else if (wrapVertical && rows > 1) {
        // Wrap to last row
        const lastRowIndex = (rows - 1) * columns + col;
        if (lastRowIndex < itemCount) {
          nextFocus.up = `${focusIdPrefix}${lastRowIndex}`;
        }
      }

      // Calculate down navigation
      const downIndex = i + columns;
      if (downIndex < itemCount) {
        nextFocus.down = `${focusIdPrefix}${downIndex}`;
      } else if (wrapVertical && rows > 1) {
        // Wrap to first row
        nextFocus.down = `${focusIdPrefix}${col}`;
      }

      // Calculate left navigation
      if (col > 0) {
        nextFocus.left = `${focusIdPrefix}${i - 1}`;
      } else if (wrapHorizontal && columns > 1) {
        // Wrap to end of previous row
        if (row > 0) {
          nextFocus.left = `${focusIdPrefix}${i - 1}`;
        } else if (wrapVertical) {
          // Wrap to last item on last row
          nextFocus.left = `${focusIdPrefix}${itemCount - 1}`;
        }
      }

      // Calculate right navigation
      if (col < columns - 1 && i + 1 < itemCount) {
        nextFocus.right = `${focusIdPrefix}${i + 1}`;
      } else if (wrapHorizontal && columns > 1) {
        // Wrap to start of next row
        if (row < rows - 1 && i + 1 < itemCount) {
          nextFocus.right = `${focusIdPrefix}${i + 1}`;
        } else if (wrapVertical) {
          // Wrap to first item on first row
          nextFocus.right = `${focusIdPrefix}0`;
        }
      }

      spatialNav.setNextFocus(focusId, nextFocus);
    }
  }, [spatialNav, columns, itemCount, focusIdPrefix, wrapHorizontal, wrapVertical]);
}

// =============================================================================
// Utility Function: isTV
// =============================================================================

/**
 * Check if we're running on a TV platform
 */
export function isTV(): boolean {
  return Platform.isTV === true;
}

// =============================================================================
// Utility Hook: useEmptyListFocusFallback
// =============================================================================

/**
 * Configuration for empty list focus fallback
 */
export interface EmptyListFallbackConfig {
  /** Whether the list is currently empty */
  isEmpty: boolean;
  /** Whether the list is currently loading */
  isLoading?: boolean;
  /** Fallback focus IDs to try (in order of priority) */
  fallbackFocusIds: string[];
  /** Callback when no fallback focus is available */
  onNoFallbackAvailable?: () => void;
  /** Delay before attempting focus fallback (ms) */
  fallbackDelay?: number;
}

/**
 * Handle focus fallback when a list becomes empty
 *
 * This hook monitors when a content list becomes empty (e.g., after filtering,
 * loading, or removing items) and automatically moves focus to the next
 * available focusable element.
 *
 * @param spatialNav - The spatial navigation hook instance
 * @param config - Configuration for fallback behavior
 *
 * @example
 * ```tsx
 * function MyListScreen() {
 *   const spatialNav = useSpatialNavigation('MyListScreen');
 *   const [items, setItems] = useState([]);
 *   const [isLoading, setIsLoading] = useState(true);
 *
 *   // Register fallback elements
 *   const searchRef = useFocusableRef(spatialNav, 'search-bar');
 *   const tabsRef = useFocusableRef(spatialNav, 'nav-tabs');
 *
 *   useEmptyListFocusFallback(spatialNav, {
 *     isEmpty: items.length === 0,
 *     isLoading,
 *     fallbackFocusIds: ['search-bar', 'nav-tabs'],
 *   });
 *
 *   return (
 *     <View>
 *       <SearchBar ref={searchRef} />
 *       <TabBar ref={tabsRef} />
 *       {items.length > 0 ? <ItemList items={items} /> : <EmptyState />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useEmptyListFocusFallback(
  spatialNav: UseSpatialNavigationReturn,
  config: EmptyListFallbackConfig
): void {
  const {
    isEmpty,
    isLoading = false,
    fallbackFocusIds,
    onNoFallbackAvailable,
    fallbackDelay = 100,
  } = config;

  const hasAttemptedFallback = useRef(false);
  const previousIsEmpty = useRef(isEmpty);

  useEffect(() => {
    // Only trigger when transitioning to empty state (not when loading)
    // or when loading completes and list is empty
    const shouldTriggerFallback =
      (isEmpty && !isLoading && !hasAttemptedFallback.current) ||
      (previousIsEmpty.current !== isEmpty && isEmpty && !isLoading);

    if (!shouldTriggerFallback) {
      // Reset the flag when list becomes non-empty
      if (!isEmpty) {
        hasAttemptedFallback.current = false;
      }
      previousIsEmpty.current = isEmpty;
      return;
    }

    if (!spatialNav.isTV) {
      previousIsEmpty.current = isEmpty;
      return;
    }

    // Delay focus fallback to ensure layout is complete
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        // Try each fallback focus ID in order
        for (const fallbackId of fallbackFocusIds) {
          if (spatialNav.focusElement(fallbackId)) {
            hasAttemptedFallback.current = true;
            previousIsEmpty.current = isEmpty;
            return;
          }
        }

        // No fallback available
        hasAttemptedFallback.current = true;
        previousIsEmpty.current = isEmpty;
        onNoFallbackAvailable?.();
      });
    }, fallbackDelay);

    return () => clearTimeout(timeoutId);
  }, [
    isEmpty,
    isLoading,
    fallbackFocusIds,
    fallbackDelay,
    onNoFallbackAvailable,
    spatialNav,
  ]);
}

// =============================================================================
// Utility Hook: useFocusableFallbackRefs
// =============================================================================

/**
 * Register multiple fallback refs and return a function to focus the first available
 *
 * @param spatialNav - The spatial navigation hook instance
 * @param fallbackIds - Array of focus IDs to register as fallbacks
 * @returns Object with refs map and focusFirstAvailable function
 *
 * @example
 * ```tsx
 * function MyScreen() {
 *   const spatialNav = useSpatialNavigation('MyScreen');
 *   const { refsMap, focusFirstAvailable } = useFocusableFallbackRefs(
 *     spatialNav,
 *     ['search', 'filter', 'back-button']
 *   );
 *
 *   // When list becomes empty:
 *   const handleListEmpty = () => {
 *     focusFirstAvailable();
 *   };
 *
 *   return (
 *     <View>
 *       <SearchBar ref={refsMap['search']} />
 *       <FilterButton ref={refsMap['filter']} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useFocusableFallbackRefs(
  spatialNav: UseSpatialNavigationReturn,
  fallbackIds: string[]
): {
  refsMap: Record<string, React.RefObject<any>>;
  focusFirstAvailable: () => boolean;
} {
  const refsMap = useRef<Record<string, React.RefObject<any>>>({});

  // Create refs for each fallback ID if they don't exist
  useEffect(() => {
    for (const id of fallbackIds) {
      if (!refsMap.current[id]) {
        refsMap.current[id] = { current: null };
        spatialNav.registerRef(id, refsMap.current[id]);
      }
    }

    return () => {
      for (const id of fallbackIds) {
        spatialNav.unregisterRef(id);
      }
    };
  }, [spatialNav, fallbackIds]);

  const focusFirstAvailable = useCallback((): boolean => {
    for (const id of fallbackIds) {
      if (spatialNav.focusElement(id)) {
        return true;
      }
    }
    return false;
  }, [spatialNav, fallbackIds]);

  return {
    refsMap: refsMap.current,
    focusFirstAvailable,
  };
}

// =============================================================================
// Utility Hook: useLoadingStateFocus
// =============================================================================

/**
 * Configuration for loading state focus handling
 */
export interface LoadingStateFocusConfig {
  /** Whether content is currently loading */
  isLoading: boolean;
  /** Focus ID for the loading indicator (optional) */
  loadingIndicatorFocusId?: string;
  /** Focus ID to restore after loading completes */
  contentFocusId?: string;
  /** Fallback focus IDs if content focus fails */
  fallbackFocusIds?: string[];
}

/**
 * Handle focus during loading states
 *
 * When content is loading, this hook ensures focus doesn't get stuck.
 * It can optionally focus a loading indicator, and restores focus to
 * content when loading completes.
 *
 * @param spatialNav - The spatial navigation hook instance
 * @param config - Configuration for loading state focus
 *
 * @example
 * ```tsx
 * function MyListScreen() {
 *   const [isLoading, setIsLoading] = useState(true);
 *   const [items, setItems] = useState([]);
 *   const spatialNav = useSpatialNavigation('MyListScreen');
 *
 *   useLoadingStateFocus(spatialNav, {
 *     isLoading,
 *     contentFocusId: items.length > 0 ? 'item-0' : undefined,
 *     fallbackFocusIds: ['search-bar', 'nav-tabs'],
 *   });
 *
 *   return isLoading ? <LoadingSpinner /> : <ItemList items={items} />;
 * }
 * ```
 */
export function useLoadingStateFocus(
  spatialNav: UseSpatialNavigationReturn,
  config: LoadingStateFocusConfig
): void {
  const { isLoading, loadingIndicatorFocusId, contentFocusId, fallbackFocusIds = [] } = config;

  const wasLoading = useRef(isLoading);

  useEffect(() => {
    if (!spatialNav.isTV) return;

    // When loading starts
    if (isLoading && !wasLoading.current && loadingIndicatorFocusId) {
      // Optional: focus the loading indicator
      spatialNav.focusElement(loadingIndicatorFocusId);
    }

    // When loading completes
    if (!isLoading && wasLoading.current) {
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          // Try to focus the content
          if (contentFocusId && spatialNav.focusElement(contentFocusId)) {
            wasLoading.current = isLoading;
            return;
          }

          // Try saved focus for this screen
          if (spatialNav.restoreFocus()) {
            wasLoading.current = isLoading;
            return;
          }

          // Try fallbacks
          for (const fallbackId of fallbackFocusIds) {
            if (spatialNav.focusElement(fallbackId)) {
              wasLoading.current = isLoading;
              return;
            }
          }
        });
      }, 100);

      wasLoading.current = isLoading;
      return () => clearTimeout(timeoutId);
    }

    wasLoading.current = isLoading;
  }, [isLoading, loadingIndicatorFocusId, contentFocusId, fallbackFocusIds, spatialNav]);
}

// =============================================================================
// Export Default
// =============================================================================

export default useSpatialNavigation;
