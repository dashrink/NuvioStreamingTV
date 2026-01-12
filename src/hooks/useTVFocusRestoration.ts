/**
 * useTVFocusRestoration Hook
 *
 * Integrates useFocusEffect with focus restoration logic for TV navigation.
 * Stores focus state in navigation.setParams() and restores focus using
 * requestAnimationFrame for proper timing.
 *
 * This follows Pattern 3 from the spec: Focus Memory with React Navigation
 *
 * @example
 * ```tsx
 * import { useTVFocusRestoration } from '@/hooks/useTVFocusRestoration';
 *
 * function MyScreen({ navigation, route }) {
 *   const { saveFocus, restoreFocus, lastFocusedId } = useTVFocusRestoration(
 *     navigation,
 *     route,
 *     'MyScreen'
 *   );
 *
 *   // Use saveFocus when an element receives focus
 *   const handleFocus = (focusId: string) => saveFocus(focusId);
 *
 *   return (
 *     <Focusable
 *       onFocus={() => handleFocus('button-1')}
 *     >
 *       <Text>Press me</Text>
 *     </Focusable>
 *   );
 * }
 * ```
 */

import { useFocusEffect, NavigationProp, RouteProp } from '@react-navigation/native';
import { useCallback, useRef, useMemo } from 'react';
import { Platform } from 'react-native';

import { useTVNavigationOptional } from '../contexts/TVNavigationContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * A ref that can be focused
 */
export type FocusableRef = React.RefObject<any>;

/**
 * Map of focus IDs to their refs
 */
export type FocusableRefMap = Record<string, FocusableRef>;

/**
 * Extended route params to include focus state
 */
export interface TVFocusRouteParams {
  /** Last focused element ID */
  lastFocusId?: string;
  /** Additional route params */
  [key: string]: any;
}

/**
 * Options for useTVFocusRestoration hook
 */
export interface UseTVFocusRestorationOptions {
  /** Whether focus restoration is enabled (default: true on TV) */
  enabled?: boolean;
  /** Default focus ID to use when no saved focus exists */
  defaultFocusId?: string;
  /** Delay in ms before attempting focus restoration (default: 50) */
  restoreDelay?: number;
  /** Callback when focus is restored */
  onFocusRestored?: (focusId: string) => void;
  /** Callback when focus is saved */
  onFocusSaved?: (focusId: string) => void;
}

/**
 * Return value from useTVFocusRestoration hook
 */
export interface UseTVFocusRestorationReturn {
  /** Save focus to both navigation params and context */
  saveFocus: (focusId: string, ref?: FocusableRef) => void;
  /** Manually trigger focus restoration */
  restoreFocus: () => boolean;
  /** Register a focusable ref */
  registerRef: (focusId: string, ref: FocusableRef) => void;
  /** Unregister a focusable ref */
  unregisterRef: (focusId: string) => void;
  /** Get the last focused ID */
  lastFocusedId: string | null;
  /** Get the saved focus ID from route params */
  getSavedFocusId: () => string | null;
  /** Whether we're on a TV platform */
  isTV: boolean;
  /** Map of registered refs */
  refs: FocusableRefMap;
}

// =============================================================================
// Constants
// =============================================================================

/** Default delay before focus restoration to allow layout to complete */
const DEFAULT_RESTORE_DELAY_MS = 50;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for TV focus restoration with React Navigation integration.
 *
 * Uses useFocusEffect to automatically restore focus when a screen comes into view
 * and saves the last focused element when the screen loses focus.
 *
 * Focus state is stored in:
 * 1. navigation.setParams() for persistence across navigation
 * 2. TVNavigationContext for global access and cross-component coordination
 *
 * @param navigation - React Navigation navigation prop
 * @param route - React Navigation route prop
 * @param screenName - Unique identifier for this screen
 * @param options - Configuration options
 * @returns Object with focus management functions
 */
export function useTVFocusRestoration<
  ParamList extends Record<string, TVFocusRouteParams>,
  RouteName extends keyof ParamList,
>(
  navigation: NavigationProp<ParamList>,
  route: RouteProp<ParamList, RouteName>,
  screenName: string,
  options: UseTVFocusRestorationOptions = {}
): UseTVFocusRestorationReturn {
  const {
    enabled = Platform.isTV,
    defaultFocusId,
    restoreDelay = DEFAULT_RESTORE_DELAY_MS,
    onFocusRestored,
    onFocusSaved,
  } = options;

  // Get TV navigation context (optional - will work without it)
  const tvNavigation = useTVNavigationOptional();

  // Track the last focused element ID
  const lastFocusedIdRef = useRef<string | null>(null);

  // Store refs for focusable elements
  const focusableRefsRef = useRef<FocusableRefMap>({});

  // =============================================================================
  // Ref Management
  // =============================================================================

  /**
   * Register a focusable ref
   */
  const registerRef = useCallback((focusId: string, ref: FocusableRef) => {
    if (focusId && ref) {
      focusableRefsRef.current[focusId] = ref;
    }
  }, []);

  /**
   * Unregister a focusable ref
   */
  const unregisterRef = useCallback((focusId: string) => {
    delete focusableRefsRef.current[focusId];
  }, []);

  // =============================================================================
  // Focus State Management
  // =============================================================================

  /**
   * Get the saved focus ID from route params
   */
  const getSavedFocusId = useCallback((): string | null => {
    // First try route params
    const routeParams = route.params as TVFocusRouteParams | undefined;
    const routeFocusId = routeParams?.lastFocusId;
    if (routeFocusId) {
      return routeFocusId;
    }

    // Then try TV navigation context
    if (tvNavigation) {
      return tvNavigation.getScreenFocus(screenName);
    }

    return null;
  }, [route.params, screenName, tvNavigation]);

  /**
   * Save the current focus ID to both navigation params and context
   */
  const saveFocus = useCallback(
    (focusId: string, ref?: FocusableRef) => {
      if (!focusId || !enabled) return;

      // Update local tracking
      lastFocusedIdRef.current = focusId;

      // Register the ref if provided
      if (ref) {
        registerRef(focusId, ref);
      }

      // Save to navigation params for persistence across navigation
      try {
        navigation.setParams({
          lastFocusId: focusId,
        } as any);
      } catch {
        // Navigation might not be ready yet, that's okay
      }

      // Save to context for global access
      if (tvNavigation) {
        tvNavigation.setScreenFocus(screenName, focusId);
        tvNavigation.setCurrentFocusId(focusId);
      }

      // Notify callback
      onFocusSaved?.(focusId);
    },
    [enabled, navigation, screenName, tvNavigation, registerRef, onFocusSaved]
  );

  /**
   * Restore focus to the saved element (or default)
   * Uses setNativeProps({ hasTVPreferredFocus: true }) for runtime focus
   */
  const restoreFocus = useCallback((): boolean => {
    if (!enabled) return false;

    // Get the saved focus ID (or use default)
    const savedFocusId = getSavedFocusId() || defaultFocusId;
    if (!savedFocusId) return false;

    // Get the ref for this focus ID
    const ref = focusableRefsRef.current[savedFocusId];
    if (!ref || !ref.current) return false;

    // Try to focus the element using setNativeProps (preferred for TV)
    try {
      if (typeof ref.current.setNativeProps === 'function') {
        ref.current.setNativeProps({ hasTVPreferredFocus: true });
        lastFocusedIdRef.current = savedFocusId;
        onFocusRestored?.(savedFocusId);
        return true;
      }

      // Alternative: try to focus directly if it's a function
      if (typeof ref.current.focus === 'function') {
        ref.current.focus();
        lastFocusedIdRef.current = savedFocusId;
        onFocusRestored?.(savedFocusId);
        return true;
      }
    } catch {
      // Focus restoration failed silently
    }

    return false;
  }, [enabled, getSavedFocusId, defaultFocusId, onFocusRestored]);

  // =============================================================================
  // Auto Focus Restoration with React Navigation
  // =============================================================================

  /**
   * useFocusEffect integration:
   * - Restores focus when screen comes into view (after layout completion)
   * - Saves focus when screen goes out of view
   *
   * Uses requestAnimationFrame because screen focus fires before layout completion
   * Wraps in useCallback to prevent infinite loops in useFocusEffect
   */
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      // Restore focus after screen layout completes
      // Use setTimeout + requestAnimationFrame for proper timing
      // (screen focus fires before layout completion)
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          restoreFocus();
        });
      }, restoreDelay);

      // Cleanup function: save focus when screen loses focus
      return () => {
        clearTimeout(timeoutId);

        // Save the last focused ID to navigation params
        if (lastFocusedIdRef.current) {
          try {
            navigation.setParams({
              lastFocusId: lastFocusedIdRef.current,
            } as any);
          } catch {
            // Navigation might be unmounting, that's okay
          }
        }
      };
    }, [enabled, restoreDelay, restoreFocus, navigation])
  );

  // =============================================================================
  // Current Focus ID (from ref)
  // =============================================================================

  const lastFocusedId = useMemo(() => {
    return lastFocusedIdRef.current;
  }, []);

  // =============================================================================
  // Return Value
  // =============================================================================

  return {
    saveFocus,
    restoreFocus,
    registerRef,
    unregisterRef,
    lastFocusedId,
    getSavedFocusId,
    isTV: Platform.isTV === true,
    refs: focusableRefsRef.current,
  };
}

// =============================================================================
// Utility Hook: useTVFocusRestorationSimple
// =============================================================================

/**
 * Simplified hook for screens that just need basic focus restoration
 * without managing their own refs (relies on TVNavigationContext)
 */
export function useTVFocusRestorationSimple(
  screenName: string,
  options: Omit<UseTVFocusRestorationOptions, 'enabled'> & {
    enabled?: boolean;
  } = {}
): {
  saveFocus: (focusId: string) => void;
  getSavedFocus: () => string | null;
  isTV: boolean;
} {
  const { enabled = Platform.isTV } = options;
  const tvNavigation = useTVNavigationOptional();

  const saveFocus = useCallback(
    (focusId: string) => {
      if (!enabled || !focusId) return;

      if (tvNavigation) {
        tvNavigation.setScreenFocus(screenName, focusId);
        tvNavigation.setCurrentFocusId(focusId);
      }
    },
    [enabled, screenName, tvNavigation]
  );

  const getSavedFocus = useCallback((): string | null => {
    if (!tvNavigation) return null;
    return tvNavigation.getScreenFocus(screenName);
  }, [screenName, tvNavigation]);

  return {
    saveFocus,
    getSavedFocus,
    isTV: Platform.isTV === true,
  };
}

// =============================================================================
// Export Default
// =============================================================================

export default useTVFocusRestoration;
