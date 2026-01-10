/**
 * useTVEventHandler Hook
 *
 * Custom hook for handling TV remote events with proper lifecycle management.
 * Enables event handling on mount and properly cleans up on unmount to prevent memory leaks.
 *
 * Supported events:
 * - up, down, left, right: D-pad navigation
 * - select: Primary action button (enter/OK)
 * - menu: Menu/back button
 * - playPause: Play/Pause media button
 * - longSelect: Long press on select button (Android TV native only)
 *
 * @example
 * ```tsx
 * import { useTVEventHandler } from '@/hooks/useTVEventHandler';
 *
 * function MyComponent() {
 *   useTVEventHandler((event) => {
 *     switch (event.eventType) {
 *       case 'select':
 *         handleSelect();
 *         break;
 *       case 'up':
 *       case 'down':
 *       case 'left':
 *       case 'right':
 *         handleNavigation(event.eventType);
 *         break;
 *     }
 *   });
 *
 *   return <View>...</View>;
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Supported TV remote event types
 */
export type TVEventType =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'select'
  | 'menu'
  | 'playPause'
  | 'longSelect'
  | 'blur'
  | 'focus'
  | 'swipeUp'
  | 'swipeDown'
  | 'swipeLeft'
  | 'swipeRight';

/**
 * TV remote event object passed to event handlers
 */
export interface TVRemoteEvent {
  /** The type of TV remote event */
  eventType: TVEventType;
  /** Native event tag (Android TV) */
  tag?: number;
  /** Target view tag */
  target?: number;
  /** Event key code (if available) */
  eventKeyAction?: number;
}

/**
 * Callback function type for handling TV events
 */
export type TVEventCallback = (event: TVRemoteEvent) => void;

/**
 * Options for the useTVEventHandler hook
 */
export interface UseTVEventHandlerOptions {
  /** Whether the handler should be enabled (default: true) */
  enabled?: boolean;
}

// =============================================================================
// TVEventHandler Import
// =============================================================================

/**
 * Safely import TVEventHandler - it may not be available in all builds
 * (e.g., web, non-TV Expo builds)
 */
let TVEventHandler: any;
try {
  // TVEventHandler is available in react-native-tvos and react-native builds with TV support
  TVEventHandler = require('react-native').TVEventHandler;
} catch {
  // TVEventHandler not available
  TVEventHandler = null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for handling TV remote events with proper lifecycle management
 *
 * @param callback - Function to call when a TV remote event is received
 * @param options - Optional configuration for the handler
 * @returns void
 *
 * @remarks
 * - The callback should be memoized with useCallback for best performance
 * - Handler is automatically enabled on mount and disabled on unmount
 * - Handles missing TVEventHandler gracefully (does nothing on non-TV platforms)
 */
export function useTVEventHandler(
  callback: TVEventCallback,
  options: UseTVEventHandlerOptions = {}
): void {
  const { enabled = true } = options;

  // Store the handler instance in a ref to persist across renders
  const tvEventHandlerRef = useRef<any>(null);

  // Store the enabled state in a ref for the cleanup function
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Memoize the internal callback to prevent unnecessary re-subscriptions
  const internalCallback = useCallback(
    (_component: any, event: TVRemoteEvent) => {
      // Only call the callback if enabled
      if (enabledRef.current && callback) {
        callback(event);
      }
    },
    [callback]
  );

  useEffect(() => {
    // Skip setup if not on TV platform or TVEventHandler is not available
    if (!Platform.isTV) {
      return;
    }

    // Critical: Check TVEventHandler existence before instantiation
    // TVEventHandler may not exist in all Expo/React Native builds
    if (!TVEventHandler) {
      return;
    }

    // Skip setup if handler is disabled
    if (!enabled) {
      return;
    }

    // Create and enable the event handler
    try {
      tvEventHandlerRef.current = new TVEventHandler();
      tvEventHandlerRef.current.enable(null, internalCallback);
    } catch {
      // Silently fail if handler creation fails
      tvEventHandlerRef.current = null;
    }

    // Cleanup function - disable and release the handler
    return () => {
      if (tvEventHandlerRef.current) {
        try {
          tvEventHandlerRef.current.disable();
        } catch {
          // Silently fail if disable fails
        }
        tvEventHandlerRef.current = null;
      }
    };
  }, [enabled, internalCallback]);
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook that returns true if running on a TV platform
 */
export function useIsTV(): boolean {
  return Platform.isTV === true;
}

/**
 * Hook that returns true if TVEventHandler is available
 */
export function useTVEventHandlerAvailable(): boolean {
  return Platform.isTV === true && TVEventHandler != null;
}

// =============================================================================
// Event Type Guards
// =============================================================================

/**
 * Check if the event is a navigation event (D-pad)
 */
export function isNavigationEvent(event: TVRemoteEvent): boolean {
  return ['up', 'down', 'left', 'right'].includes(event.eventType);
}

/**
 * Check if the event is a selection event
 */
export function isSelectEvent(event: TVRemoteEvent): boolean {
  return event.eventType === 'select';
}

/**
 * Check if the event is a long press event
 */
export function isLongSelectEvent(event: TVRemoteEvent): boolean {
  return event.eventType === 'longSelect';
}

/**
 * Check if the event is a back/menu event
 */
export function isMenuEvent(event: TVRemoteEvent): boolean {
  return event.eventType === 'menu';
}

/**
 * Check if the event is a play/pause event
 */
export function isPlayPauseEvent(event: TVRemoteEvent): boolean {
  return event.eventType === 'playPause';
}

/**
 * Check if the event is a swipe gesture event
 */
export function isSwipeEvent(event: TVRemoteEvent): boolean {
  return ['swipeUp', 'swipeDown', 'swipeLeft', 'swipeRight'].includes(event.eventType);
}

// =============================================================================
// Export Default
// =============================================================================

export default useTVEventHandler;
