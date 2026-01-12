/**
 * useTVBackHandler Hook
 *
 * Handles TV remote back/menu button with consistent navigation behavior.
 * Ensures predictable back button behavior throughout the app:
 * - Closes modals/context menus before navigating back
 * - Returns focus to trigger element after modal close
 * - Prevents unexpected app exits
 * - Integrates with React Navigation and TVNavigationContext
 *
 * @example
 * ```tsx
 * import { useTVBackHandler } from '@/hooks/useTVBackHandler';
 *
 * function MyScreen() {
 *   useTVBackHandler({
 *     onBackPress: () => {
 *       // Custom back handling (return true to prevent default)
 *       return false;
 *     },
 *   });
 *
 *   return <View>...</View>;
 * }
 * ```
 */

import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useCallback, useRef, useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';

import { useTVEventHandler, isMenuEvent } from './useTVEventHandler';
import {
  setTVNavigationBackHandler,
  clearTVNavigationBackHandler,
} from '../components/tv/TVBackHandler';
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Options for the useTVBackHandler hook
 */
export interface UseTVBackHandlerOptions {
  /** Whether the handler is enabled (default: true on TV) */
  enabled?: boolean;
  /**
   * Custom back press handler.
   * Return true to prevent default back navigation.
   * Return false to allow default back navigation.
   */
  onBackPress?: () => boolean;
  /**
   * Callback when back press is blocked (e.g., at root screen)
   */
  onBackBlocked?: () => void;
  /**
   * Whether to prevent app exit at root screen (default: true)
   */
  preventAppExit?: boolean;
  /**
   * Screens that should not allow back navigation (root screens)
   */
  rootScreens?: string[];
}

/**
 * Return value from useTVBackHandler hook
 */
export interface UseTVBackHandlerReturn {
  /** Manually trigger back navigation */
  goBack: () => boolean;
  /** Whether we can go back from current screen */
  canGoBack: boolean;
  /** Whether we're on a TV platform */
  isTV: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Default root screens where back should be blocked */
const DEFAULT_ROOT_SCREENS = ['MainTabs', 'Home', 'Onboarding'];

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for handling TV remote back/menu button with consistent behavior.
 *
 * Priority for back button handling:
 * 1. Close context menu if open (and restore focus to trigger)
 * 2. Close voice search if open
 * 3. Call custom onBackPress handler if provided
 * 4. Navigate back if possible
 * 5. Block exit if preventAppExit is true
 *
 * @param options - Configuration options
 * @returns Object with back navigation functions
 */
export function useTVBackHandler(options: UseTVBackHandlerOptions = {}): UseTVBackHandlerReturn {
  const {
    enabled = Platform.isTV,
    onBackPress,
    onBackBlocked,
    preventAppExit = true,
    rootScreens = DEFAULT_ROOT_SCREENS,
  } = options;

  // Get navigation and state
  const navigation = useNavigation();

  // Get current route name from navigation state
  const currentRouteName = useNavigationState(state => {
    if (!state || !state.routes || state.routes.length === 0) {
      return undefined;
    }
    return state.routes[state.index]?.name;
  });

  // Check if we can go back
  const canGoBack = useNavigationState(state => {
    if (!state) return false;
    // Can go back if we have more than one screen in the stack
    return state.index > 0;
  });

  // Get TV navigation context for modal state
  const tvNavigation = useTVNavigationOptional();

  // Track the last trigger element ID for focus restoration
  const lastTriggerIdRef = useRef<string | null>(null);

  // =============================================================================
  // Back Navigation Logic
  // =============================================================================

  /**
   * Handle back button press with proper priority
   */
  const handleBackPress = useCallback((): boolean => {
    // Priority 1: Close context menu if open
    if (tvNavigation?.contextMenu.isOpen) {
      // Store trigger ID for focus restoration
      lastTriggerIdRef.current = tvNavigation.contextMenu.targetId;
      tvNavigation.closeContextMenu();

      // Restore focus to trigger element after menu closes
      if (lastTriggerIdRef.current) {
        // Use setTimeout to allow menu to close first
        setTimeout(() => {
          // Focus restoration will be handled by the component
          // that registered the trigger element
        }, 100);
      }
      return true; // Back handled
    }

    // Priority 2: Close voice search if open
    if (tvNavigation?.voiceSearch.isOpen) {
      tvNavigation.closeVoiceSearch();
      return true; // Back handled
    }

    // Priority 3: Custom back handler
    if (onBackPress) {
      const handled = onBackPress();
      if (handled) {
        return true; // Custom handler consumed the event
      }
    }

    // Priority 4: Check if we're at a root screen
    const isAtRoot = currentRouteName && rootScreens.includes(currentRouteName);

    if (isAtRoot) {
      // Block back at root screens if preventAppExit is true
      if (preventAppExit) {
        onBackBlocked?.();
        return true; // Block back
      }
      return false; // Allow default behavior (may exit app)
    }

    // Priority 5: Navigate back if possible
    if (canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return true; // Back handled
    }

    // Default: block back to prevent unexpected exit
    if (preventAppExit) {
      onBackBlocked?.();
      return true;
    }

    return false;
  }, [
    tvNavigation,
    onBackPress,
    currentRouteName,
    rootScreens,
    preventAppExit,
    canGoBack,
    navigation,
    onBackBlocked,
  ]);

  /**
   * Manually trigger back navigation
   */
  const goBack = useCallback((): boolean => {
    return handleBackPress();
  }, [handleBackPress]);

  // =============================================================================
  // TV Event Handler Integration
  // =============================================================================

  /**
   * Handle TV remote events (menu/back button)
   */
  useTVEventHandler(
    useCallback(
      event => {
        if (isMenuEvent(event)) {
          handleBackPress();
        }
      },
      [handleBackPress]
    ),
    { enabled }
  );

  // =============================================================================
  // Android Hardware Back Button Support
  // =============================================================================

  /**
   * Also handle Android hardware back button for consistency
   * (Android TV remotes trigger BackHandler)
   */
  useEffect(() => {
    if (!enabled || !Platform.isTV) return;

    // Only add listener on Android TV
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      backHandler.remove();
    };
  }, [enabled, handleBackPress]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return {
    goBack,
    canGoBack,
    isTV: Platform.isTV === true,
  };
}

// =============================================================================
// Utility Hook: useTVBackHandlerSimple
// =============================================================================

/**
 * Simplified hook for basic back button handling without custom logic.
 * Just handles modal closing and navigation.
 */
export function useTVBackHandlerSimple(): UseTVBackHandlerReturn {
  return useTVBackHandler({
    preventAppExit: true,
  });
}

// =============================================================================
// Utility Hook: useTVBackWithFocusRestore
// =============================================================================

/**
 * Hook that combines back handling with automatic focus restoration.
 * Use this when you need to restore focus to a specific element after
 * closing modals or navigating back.
 *
 * @param options - Configuration options
 * @param focusRestoreRef - Ref to the element to restore focus to
 */
export function useTVBackWithFocusRestore(
  options: UseTVBackHandlerOptions = {},
  focusRestoreRef?: React.RefObject<any>
): UseTVBackHandlerReturn & {
  setFocusRestoreRef: (ref: React.RefObject<any>) => void;
} {
  const focusRef = useRef<React.RefObject<any> | null>(focusRestoreRef || null);

  const setFocusRestoreRef = useCallback((ref: React.RefObject<any>) => {
    focusRef.current = ref;
  }, []);

  const handleBackPress = useCallback(() => {
    // After back is handled, restore focus
    requestAnimationFrame(() => {
      if (focusRef.current?.current) {
        try {
          if (typeof focusRef.current.current.setNativeProps === 'function') {
            focusRef.current.current.setNativeProps({ hasTVPreferredFocus: true });
          } else if (typeof focusRef.current.current.focus === 'function') {
            focusRef.current.current.focus();
          }
        } catch {
          // Focus restoration failed silently
        }
      }
    });
    return false; // Allow default back handling
  }, []);

  const backHandler = useTVBackHandler({
    ...options,
    onBackPress: handleBackPress,
  });

  return {
    ...backHandler,
    setFocusRestoreRef,
  };
}

// =============================================================================
// Utility Hook: useTVNavigationBackHandler
// =============================================================================

/**
 * Hook that registers navigation-aware back handling with the global TVBackHandler.
 * Use this in your main navigator component to enable navigation back behavior.
 *
 * @param options - Configuration options
 */
export function useTVNavigationBackHandler(
  options: {
    enabled?: boolean;
    rootScreens?: string[];
    preventAppExit?: boolean;
    onBackBlocked?: () => void;
  } = {}
): void {
  const {
    enabled = Platform.isTV,
    rootScreens = DEFAULT_ROOT_SCREENS,
    preventAppExit = true,
    onBackBlocked,
  } = options;

  const navigation = useNavigation();

  const currentRouteName = useNavigationState(state => {
    if (!state?.routes || state.routes.length === 0) {
      return undefined;
    }
    return state.routes[state.index]?.name;
  });

  const canGoBack = useNavigationState(state => {
    if (!state) return false;
    return state.index > 0;
  });

  // Create the navigation back handler
  const navigationBackHandler = useCallback((): boolean => {
    // Check if at root screen
    const isAtRoot = currentRouteName && rootScreens.includes(currentRouteName);

    if (isAtRoot) {
      if (preventAppExit) {
        onBackBlocked?.();
        return true; // Block back
      }
      return false;
    }

    // Navigate back if possible
    if (canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }

    // Block exit if configured
    if (preventAppExit) {
      onBackBlocked?.();
      return true;
    }

    return false;
  }, [currentRouteName, rootScreens, preventAppExit, canGoBack, navigation, onBackBlocked]);

  // Register/unregister the navigation back handler
  useEffect(() => {
    if (!enabled) return;

    setTVNavigationBackHandler(navigationBackHandler);

    return () => {
      clearTVNavigationBackHandler();
    };
  }, [enabled, navigationBackHandler]);
}

// =============================================================================
// Export Default
// =============================================================================

export default useTVBackHandler;
