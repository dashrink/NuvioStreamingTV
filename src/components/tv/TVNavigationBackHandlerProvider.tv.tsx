/**
 * TVNavigationBackHandlerProvider Component (TV-specific)
 *
 * A component that provides navigation-aware back button handling.
 * Place this component inside your navigator to enable proper back navigation.
 *
 * This component:
 * - Registers a navigation back handler with the global TVBackHandler
 * - Handles "go back" navigation when back button is pressed
 * - Prevents unexpected app exits at root screens
 *
 * @example
 * ```tsx
 * import { TVNavigationBackHandlerProvider } from '@/components/tv/TVNavigationBackHandlerProvider.tv';
 *
 * function MyNavigator() {
 *   return (
 *     <>
 *       <TVNavigationBackHandlerProvider />
 *       <Stack.Navigator>...</Stack.Navigator>
 *     </>
 *   );
 * }
 * ```
 */

import React, { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { setTVNavigationBackHandler, clearTVNavigationBackHandler } from './TVBackHandler';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface TVNavigationBackHandlerProviderProps {
  /** Whether the handler is enabled (default: true on TV) */
  enabled?: boolean;
  /** Screens that should not allow back navigation (root screens) */
  rootScreens?: string[];
  /** Whether to prevent app exit at root screens */
  preventAppExit?: boolean;
  /** Callback when back is blocked at root screen */
  onBackBlocked?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_ROOT_SCREENS = ['MainTabs', 'Home', 'Onboarding'];

// =============================================================================
// Component Implementation
// =============================================================================

export function TVNavigationBackHandlerProvider({
  enabled = Platform.isTV,
  rootScreens = DEFAULT_ROOT_SCREENS,
  preventAppExit = true,
  onBackBlocked,
}: TVNavigationBackHandlerProviderProps): React.ReactElement | null {
  const navigation = useNavigation();

  // Get current route name from navigation state
  const currentRouteName = useNavigationState((state) => {
    if (!state?.routes || state.routes.length === 0) {
      return undefined;
    }
    return state.routes[state.index]?.name;
  });

  // Check if we can go back
  const canGoBack = useNavigationState((state) => {
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

  // This component doesn't render anything
  return null;
}

export default TVNavigationBackHandlerProvider;
