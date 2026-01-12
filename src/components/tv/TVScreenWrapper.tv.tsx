/**
 * TVScreenWrapper Component (TV Version)
 *
 * A wrapper component that provides TV focus restoration functionality to any screen.
 * This TV-specific version integrates with:
 * - useFocusEffect for automatic focus restoration on screen navigation
 * - navigation.setParams() for focus state persistence
 * - TVNavigationContext for global focus state management
 *
 * @example
 * ```tsx
 * import TVScreenWrapper, { useTVScreenFocus } from '@/components/tv/TVScreenWrapper';
 *
 * function MyScreen({ navigation, route }) {
 *   const { saveFocus, registerRef } = useTVScreenFocus();
 *
 *   return (
 *     <TVScreenWrapper screenName="MyScreen" defaultFocusId="first-button">
 *       <Focusable
 *         ref={(ref) => registerRef('first-button', ref)}
 *         onFocus={() => saveFocus('first-button')}
 *       >
 *         <Text>Press me</Text>
 *       </Focusable>
 *     </TVScreenWrapper>
 *   );
 * }
 * ```
 */

import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { ReactNode, createContext, useContext, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';

import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';

// =============================================================================
// Types
// =============================================================================

export interface TVScreenWrapperProps {
  /** The screen content to wrap */
  children: ReactNode;
  /** Screen name for focus memory */
  screenName: string;
  /** Default focus ID to use when no saved focus exists */
  defaultFocusId?: string;
  /** Additional style for the wrapper */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
  /** Callback when focus is restored */
  onFocusRestored?: (focusId: string) => void;
  /** Callback when focus is saved */
  onFocusSaved?: (focusId: string) => void;
  /** Delay in ms before attempting focus restoration (default: 50) */
  restoreDelay?: number;
}

/**
 * A focusable ref type
 */
export type FocusableRef = React.RefObject<any>;

/**
 * Map of focus IDs to their refs
 */
export type FocusableRefMap = Record<string, FocusableRef>;

/**
 * Context value for TV screen focus management
 */
interface TVScreenFocusContextValue {
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
  /** Get the saved focus ID */
  getSavedFocusId: () => string | null;
  /** Screen name */
  screenName: string;
  /** Whether we're on a TV platform */
  isTV: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Default delay before focus restoration to allow layout to complete */
const DEFAULT_RESTORE_DELAY_MS = 50;

// =============================================================================
// Context
// =============================================================================

const TVScreenFocusContext = createContext<TVScreenFocusContextValue | null>(null);

/**
 * Hook to access the TV screen focus context
 * Must be used within a TVScreenWrapper
 */
export function useTVScreenFocus(): TVScreenFocusContextValue {
  const context = useContext(TVScreenFocusContext);
  if (!context) {
    // Return a no-op implementation for non-TV or outside wrapper
    return {
      saveFocus: () => {},
      restoreFocus: () => false,
      registerRef: () => {},
      unregisterRef: () => {},
      lastFocusedId: null,
      getSavedFocusId: () => null,
      screenName: '',
      isTV: false,
    };
  }
  return context;
}

/**
 * Optional hook that returns null if not within TVScreenWrapper
 */
export function useTVScreenFocusOptional(): TVScreenFocusContextValue | null {
  return useContext(TVScreenFocusContext);
}

// =============================================================================
// Component (TV Version)
// =============================================================================

/**
 * TV-specific screen wrapper with focus restoration
 */
export function TVScreenWrapper({
  children,
  screenName,
  defaultFocusId,
  style,
  testID,
  onFocusRestored,
  onFocusSaved,
  restoreDelay = DEFAULT_RESTORE_DELAY_MS,
}: TVScreenWrapperProps): JSX.Element {
  // Navigation hooks
  const navigation = useNavigation();
  const route = useRoute();

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
   * Get the saved focus ID from route params or context
   */
  const getSavedFocusId = useCallback((): string | null => {
    // First try route params (this is the primary persistence mechanism)
    const routeParams = route.params as { lastFocusId?: string } | undefined;
    const routeFocusId = routeParams?.lastFocusId;
    if (routeFocusId) {
      return routeFocusId;
    }

    // Then try TV navigation context (fallback)
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
      if (!focusId) return;

      // Update local tracking
      lastFocusedIdRef.current = focusId;

      // Register the ref if provided
      if (ref) {
        registerRef(focusId, ref);
      }

      // Save to navigation params for persistence across navigation
      // This is the key pattern from the spec: using navigation.setParams()
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
    [navigation, screenName, tvNavigation, registerRef, onFocusSaved]
  );

  /**
   * Restore focus to the saved element (or default)
   * Uses setNativeProps({ hasTVPreferredFocus: true }) for runtime focus
   * (not props, which only work on mount)
   */
  const restoreFocus = useCallback((): boolean => {
    // Get the saved focus ID (or use default)
    const savedFocusId = getSavedFocusId() || defaultFocusId;
    if (!savedFocusId) return false;

    // Get the ref for this focus ID
    const ref = focusableRefsRef.current[savedFocusId];
    if (!ref || !ref.current) return false;

    // Try to focus the element using setNativeProps (preferred for TV)
    // This is the key pattern from the spec: setNativeProps({ hasTVPreferredFocus: true })
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
  }, [getSavedFocusId, defaultFocusId, onFocusRestored]);

  // =============================================================================
  // Auto Focus Restoration with React Navigation
  // =============================================================================

  /**
   * useFocusEffect integration - the core of the focus restoration pattern:
   *
   * 1. When screen comes into focus:
   *    - Use requestAnimationFrame to wait for layout completion
   *    - Restore focus to the saved element
   *
   * 2. When screen loses focus (cleanup):
   *    - Save the current focus ID to navigation.setParams()
   *
   * The callback is wrapped in useCallback to prevent infinite loops
   * (as required by useFocusEffect)
   */
  useFocusEffect(
    useCallback(() => {
      // Restore focus after screen layout completes
      // requestAnimationFrame is critical because screen focus fires before layout completion
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          restoreFocus();
        });
      }, restoreDelay);

      // Save focus on screen blur (cleanup function)
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
    }, [restoreDelay, restoreFocus, navigation])
  );

  // =============================================================================
  // Context Value
  // =============================================================================

  const contextValue = useMemo<TVScreenFocusContextValue>(
    () => ({
      saveFocus,
      restoreFocus,
      registerRef,
      unregisterRef,
      lastFocusedId: lastFocusedIdRef.current,
      getSavedFocusId,
      screenName,
      isTV: Platform.isTV === true,
    }),
    [saveFocus, restoreFocus, registerRef, unregisterRef, getSavedFocusId, screenName]
  );

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <TVScreenFocusContext.Provider value={contextValue}>
      <View style={[styles.container, style]} testID={testID}>
        {children}
      </View>
    </TVScreenFocusContext.Provider>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TVScreenWrapper;
