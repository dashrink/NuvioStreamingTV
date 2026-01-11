/**
 * TVBackHandler Component (TV-specific)
 *
 * A component that provides consistent TV back button handling at the app level.
 * This component handles global modal/menu closing on back button press.
 * For navigation-specific back handling, use the useTVBackHandler hook in individual screens.
 *
 * Features:
 * - Closes context menus and voice search before navigating back
 * - Handles Android TV hardware back button
 * - Works at the provider level (before navigation hooks are available)
 *
 * @example
 * ```tsx
 * import { TVBackHandler } from '@/components/tv/TVBackHandler.tv';
 *
 * function App() {
 *   return (
 *     <TVNavigationProvider>
 *       <TVBackHandler>
 *         <NavigationContainer>
 *           <Stack.Navigator>...</Stack.Navigator>
 *         </NavigationContainer>
 *       </TVBackHandler>
 *     </TVNavigationProvider>
 *   );
 * }
 * ```
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, BackHandler } from 'react-native';
import { useTVEventHandler, isMenuEvent, TVRemoteEvent } from '../../hooks/useTVEventHandler';
import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface TVBackHandlerProps {
  /** Whether the handler is enabled (default: true on TV) */
  enabled?: boolean;
  /** Custom back press handler for navigation - return true if handled */
  onBackPress?: () => boolean;
  /** Callback when back is blocked */
  onBackBlocked?: () => void;
  /** Children to render */
  children?: React.ReactNode;
}

// =============================================================================
// Ref for external navigation control
// =============================================================================

/**
 * Navigation control interface for external navigation integration
 */
export interface TVBackNavigationControl {
  /** Register a navigation back handler */
  setNavigationBackHandler: (handler: () => boolean) => void;
  /** Clear the navigation back handler */
  clearNavigationBackHandler: () => void;
}

// Global ref for navigation back handler
let globalNavigationBackHandler: (() => boolean) | null = null;

/**
 * Set the global navigation back handler (call from navigation-aware components)
 */
export function setTVNavigationBackHandler(handler: () => boolean): void {
  globalNavigationBackHandler = handler;
}

/**
 * Clear the global navigation back handler
 */
export function clearTVNavigationBackHandler(): void {
  globalNavigationBackHandler = null;
}

// =============================================================================
// Component Implementation
// =============================================================================

export function TVBackHandler({
  enabled = Platform.isTV,
  onBackPress,
  onBackBlocked,
  children,
}: TVBackHandlerProps): React.ReactElement | null {
  // Get TV navigation context for modal/menu state
  const tvNavigation = useTVNavigationOptional();

  // Track trigger element for focus restoration
  const lastTriggerIdRef = useRef<string | null>(null);

  // =============================================================================
  // Back Button Handler
  // =============================================================================

  const handleBackPress = useCallback((): boolean => {
    // Priority 1: Close context menu if open
    if (tvNavigation?.contextMenu.isOpen) {
      lastTriggerIdRef.current = tvNavigation.contextMenu.targetId;
      tvNavigation.closeContextMenu();
      return true;
    }

    // Priority 2: Close voice search if open
    if (tvNavigation?.voiceSearch.isOpen) {
      tvNavigation.closeVoiceSearch();
      return true;
    }

    // Priority 3: Custom back press handler
    if (onBackPress) {
      const handled = onBackPress();
      if (handled) {
        return true;
      }
    }

    // Priority 4: Global navigation back handler
    if (globalNavigationBackHandler) {
      const handled = globalNavigationBackHandler();
      if (handled) {
        return true;
      }
    }

    // Not handled - let default behavior occur
    // On Android TV, returning false allows default back behavior
    return false;
  }, [tvNavigation, onBackPress]);

  // =============================================================================
  // TV Event Handler
  // =============================================================================

  const handleTVEvent = useCallback(
    (event: TVRemoteEvent) => {
      if (isMenuEvent(event)) {
        handleBackPress();
      }
    },
    [handleBackPress]
  );

  useTVEventHandler(handleTVEvent, { enabled });

  // =============================================================================
  // Android Hardware Back Button
  // =============================================================================

  useEffect(() => {
    if (!enabled || !Platform.isTV) {
      return;
    }

    // Only add hardware back listener on Android TV
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      backHandler.remove();
    };
  }, [enabled, handleBackPress]);

  // =============================================================================
  // Render
  // =============================================================================

  return <>{children}</>;
}

// =============================================================================
// Non-TV Fallback
// =============================================================================

export function TVBackHandlerFallback({
  children,
}: TVBackHandlerProps): React.ReactElement | null {
  return <>{children}</>;
}

export default TVBackHandler;
