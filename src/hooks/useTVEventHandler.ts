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

import { useEffect, useRef, useCallback, useState } from 'react';
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
  /** Throttle interval in ms for navigation events (default: 0 = no throttle) */
  throttleNavigationMs?: number;
  /** Debounce interval in ms for all events (default: 0 = no debounce) */
  debounceMs?: number;
}

/**
 * Options for rapid input protection
 */
export interface RapidInputProtectionOptions {
  /** Minimum interval between navigation events in ms (default: 50) */
  minNavigationIntervalMs?: number;
  /** Maximum queued events before dropping (default: 3) */
  maxQueuedEvents?: number;
  /** Whether to enable input smoothing (default: true) */
  enableSmoothing?: boolean;
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
 * - Supports throttling for navigation events to prevent rapid input issues
 */
export function useTVEventHandler(
  callback: TVEventCallback,
  options: UseTVEventHandlerOptions = {}
): void {
  const { enabled = true, throttleNavigationMs = 0, debounceMs = 0 } = options;

  // Store the handler instance in a ref to persist across renders
  const tvEventHandlerRef = useRef<any>(null);

  // Store the enabled state in a ref for the cleanup function
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Throttling refs for navigation events
  const lastNavigationTimeRef = useRef<number>(0);
  const navigationThrottleRef = useRef(throttleNavigationMs);
  navigationThrottleRef.current = throttleNavigationMs;

  // Debounce refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceIntervalRef = useRef(debounceMs);
  debounceIntervalRef.current = debounceMs;

  // Memoize the internal callback to prevent unnecessary re-subscriptions
  const internalCallback = useCallback(
    (_component: any, event: TVRemoteEvent) => {
      // Only call the callback if enabled
      if (!enabledRef.current || !callback) {
        return;
      }

      const now = Date.now();

      // Check if this is a navigation event
      const isNavEvent = isNavigationEvent(event);

      // Apply throttling for navigation events
      if (isNavEvent && navigationThrottleRef.current > 0) {
        const timeSinceLastNav = now - lastNavigationTimeRef.current;
        if (timeSinceLastNav < navigationThrottleRef.current) {
          // Drop the event - too soon after last navigation
          return;
        }
        lastNavigationTimeRef.current = now;
      }

      // Apply debouncing if configured
      if (debounceIntervalRef.current > 0) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          callback(event);
          debounceTimerRef.current = null;
        }, debounceIntervalRef.current);
        return;
      }

      // Call callback directly if no debouncing
      callback(event);
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
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
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
// Rapid Input Protection Hooks
// =============================================================================

/** Default minimum interval between navigation events (ms) */
const DEFAULT_MIN_NAVIGATION_INTERVAL_MS = 50;

/** Default maximum queued events before dropping */
const DEFAULT_MAX_QUEUED_EVENTS = 3;

/**
 * Hook for handling TV events with built-in rapid input protection.
 * Prevents focus skipping or breaking on rapid button presses.
 *
 * Features:
 * - Throttles navigation events to prevent focus jumping
 * - Queues events to ensure smooth focus transitions
 * - Prevents animation glitches from rapid input
 *
 * @param callback - Function to call when a TV remote event is received
 * @param options - Configuration options for rapid input protection
 *
 * @example
 * ```tsx
 * useRapidInputProtectedTVEventHandler((event) => {
 *   if (isNavigationEvent(event)) {
 *     handleNavigation(event.eventType);
 *   }
 * }, { minNavigationIntervalMs: 60 });
 * ```
 */
export function useRapidInputProtectedTVEventHandler(
  callback: TVEventCallback,
  options: RapidInputProtectionOptions = {}
): void {
  const {
    minNavigationIntervalMs = DEFAULT_MIN_NAVIGATION_INTERVAL_MS,
    maxQueuedEvents = DEFAULT_MAX_QUEUED_EVENTS,
    enableSmoothing = true,
  } = options;

  // Event queue for smoothing
  const eventQueueRef = useRef<TVRemoteEvent[]>([]);
  const processingRef = useRef(false);
  const lastEventTimeRef = useRef<Record<string, number>>({});

  // Process queued events with frame-aligned timing
  const processEventQueue = useCallback(() => {
    if (processingRef.current || eventQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    const event = eventQueueRef.current.shift();

    if (event) {
      callback(event);
    }

    // Use requestAnimationFrame for smooth processing
    if (enableSmoothing) {
      requestAnimationFrame(() => {
        processingRef.current = false;
        if (eventQueueRef.current.length > 0) {
          processEventQueue();
        }
      });
    } else {
      processingRef.current = false;
    }
  }, [callback, enableSmoothing]);

  // Protected event handler
  const protectedCallback = useCallback(
    (event: TVRemoteEvent) => {
      const now = Date.now();
      const eventType = event.eventType;

      // For navigation events, apply throttling per direction
      if (isNavigationEvent(event)) {
        const lastTime = lastEventTimeRef.current[eventType] || 0;
        const timeSinceLastEvent = now - lastTime;

        if (timeSinceLastEvent < minNavigationIntervalMs) {
          // Too fast - either queue or drop
          if (eventQueueRef.current.length < maxQueuedEvents) {
            eventQueueRef.current.push(event);
          }
          // Drop event if queue is full
          return;
        }

        lastEventTimeRef.current[eventType] = now;
      }

      // Add to queue and process
      if (enableSmoothing && isNavigationEvent(event)) {
        eventQueueRef.current.push(event);
        processEventQueue();
      } else {
        // Non-navigation events are processed immediately
        callback(event);
      }
    },
    [callback, minNavigationIntervalMs, maxQueuedEvents, enableSmoothing, processEventQueue]
  );

  // Use the base hook with the protected callback
  useTVEventHandler(protectedCallback, { enabled: true });

  // Cleanup
  useEffect(() => {
    return () => {
      eventQueueRef.current = [];
      processingRef.current = false;
    };
  }, []);
}

/**
 * Creates a throttled callback that limits how often a function can be called.
 * Useful for wrapping event handlers to prevent rapid input issues.
 *
 * @param callback - The callback to throttle
 * @param minIntervalMs - Minimum interval between calls (default: 50ms)
 * @returns Throttled callback
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  minIntervalMs: number = DEFAULT_MIN_NAVIGATION_INTERVAL_MS
): T {
  const lastCallTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallTimeRef.current >= minIntervalMs) {
        lastCallTimeRef.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [minIntervalMs]
  );
}

/**
 * Hook that provides focus change tracking with debouncing to prevent
 * rapid focus state updates from breaking the UI.
 *
 * @param onFocusChange - Callback when focus changes
 * @param debounceMs - Debounce interval (default: 16ms = 1 frame)
 * @returns Object with focus handlers and current focus state
 */
export function useFocusChangeProtection(
  onFocusChange?: (focusId: string | null) => void,
  debounceMs: number = 16
): {
  handleFocus: (focusId: string) => void;
  handleBlur: (focusId: string) => void;
  currentFocusId: string | null;
  isPendingFocusChange: boolean;
} {
  const [currentFocusId, setCurrentFocusId] = useState<string | null>(null);
  const [isPendingFocusChange, setIsPendingFocusChange] = useState(false);

  const pendingFocusRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

  const handleFocus = useCallback(
    (focusId: string) => {
      pendingFocusRef.current = focusId;
      setIsPendingFocusChange(true);

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the focus change
      debounceTimerRef.current = setTimeout(() => {
        const newFocusId = pendingFocusRef.current;
        setCurrentFocusId(newFocusId);
        setIsPendingFocusChange(false);
        onFocusChangeRef.current?.(newFocusId);
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [debounceMs]
  );

  const handleBlur = useCallback(
    (focusId: string) => {
      // Only clear focus if the blurred element is the current focus
      if (pendingFocusRef.current === focusId || currentFocusId === focusId) {
        pendingFocusRef.current = null;

        // Clear any pending debounce
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Small delay before clearing to allow focus to move to new element
        debounceTimerRef.current = setTimeout(() => {
          // Only clear if nothing else has taken focus
          if (pendingFocusRef.current === null) {
            setCurrentFocusId(null);
            setIsPendingFocusChange(false);
            onFocusChangeRef.current?.(null);
          }
          debounceTimerRef.current = null;
        }, debounceMs);
      }
    },
    [debounceMs, currentFocusId]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    handleFocus,
    handleBlur,
    currentFocusId,
    isPendingFocusChange,
  };
}

// =============================================================================
// Export Default
// =============================================================================

export default useTVEventHandler;
