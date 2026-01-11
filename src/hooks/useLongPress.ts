/**
 * useLongPress Hook
 *
 * Platform-aware long-press detection hook for TV remotes.
 * - Apple TV: Timer-based detection (300ms threshold) since no native longSelect event
 * - Android TV: Uses native longSelect event from TVEventHandler
 *
 * Features:
 * - Animation-aware queuing: Long-press actions started during focus animations
 *   are queued and executed after the animation completes
 * - Duplicate prevention: Ensures queued actions are only executed once
 *
 * @example
 * ```tsx
 * import { useLongPress } from '@/hooks/useLongPress';
 *
 * function MyComponent() {
 *   const { handlers, isPressed, isLongPressed } = useLongPress({
 *     onShortPress: () => console.log('Short press!'),
 *     onLongPress: () => console.log('Long press!'),
 *   });
 *
 *   // For components that receive focus/select events
 *   return (
 *     <Pressable
 *       onPressIn={handlers.onPressIn}
 *       onPressOut={handlers.onPressOut}
 *     >
 *       <Text>Press me</Text>
 *     </Pressable>
 *   );
 * }
 * ```
 */

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  useTVEventHandler,
  useTVEventHandlerAvailable,
  TVRemoteEvent,
} from './useTVEventHandler';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Configuration for animation-aware long-press queuing
 */
export interface AnimationAwareConfig {
  /** Whether animation-aware queuing is enabled (default: true) */
  enabled?: boolean;
  /** Function that returns true if focus animation is currently in progress */
  isAnimating?: () => boolean;
  /** Maximum time to wait for animation to complete before executing action (default: 500ms) */
  maxQueueWaitMs?: number;
  /** Callback when action is queued due to animation */
  onActionQueued?: () => void;
  /** Callback when queued action is executed after animation completes */
  onQueuedActionExecuted?: () => void;
}

/**
 * Configuration options for useLongPress hook
 */
export interface UseLongPressOptions {
  /** Callback for short press (< threshold) */
  onShortPress?: () => void;
  /** Callback for long press (>= threshold) */
  onLongPress?: () => void;
  /** Long press threshold in milliseconds (default: 300ms) */
  threshold?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Callback when press starts (optional) */
  onPressStart?: () => void;
  /** Callback when press ends (optional) */
  onPressEnd?: () => void;
  /** Animation-aware queuing configuration */
  animationAware?: AnimationAwareConfig;
}

/**
 * Return value from useLongPress hook
 */
export interface UseLongPressReturn {
  /** Handler functions to attach to Pressable/TouchableOpacity */
  handlers: {
    onPressIn: () => void;
    onPressOut: () => void;
  };
  /** Whether currently being pressed */
  isPressed: boolean;
  /** Whether a long press was triggered (reset on press end) */
  isLongPressed: boolean;
  /** Reset the long press state manually */
  reset: () => void;
  /** Whether a long-press action is currently queued (waiting for animation) */
  isActionQueued: boolean;
  /** Notify that animation has completed (executes queued action if any) */
  notifyAnimationComplete: () => void;
  /** Cancel any queued action */
  cancelQueuedAction: () => void;
}

/**
 * Options for useLongPressWithTVEvents hook
 */
export interface UseLongPressWithTVEventsOptions extends UseLongPressOptions {
  /** ID for this focusable element (used to track which element receives events) */
  focusId?: string;
}

/**
 * Return value from useLongPressWithTVEvents hook
 */
export interface UseLongPressWithTVEventsReturn {
  /** Whether currently being pressed */
  isPressed: boolean;
  /** Whether a long press was triggered */
  isLongPressed: boolean;
  /** Reset the state manually */
  reset: () => void;
  /** Whether this element is currently focused (for TV) */
  isFocused: boolean;
  /** Set the focused state (call from onFocus/onBlur) */
  setFocused: (focused: boolean) => void;
  /** Whether a long-press action is currently queued (waiting for animation) */
  isActionQueued: boolean;
  /** Notify that animation has completed (executes queued action if any) */
  notifyAnimationComplete: () => void;
  /** Cancel any queued action */
  cancelQueuedAction: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Default long press threshold in milliseconds */
export const LONG_PRESS_THRESHOLD_MS = 300;

/** Default maximum time to wait for animation to complete before executing queued action */
export const DEFAULT_ANIMATION_QUEUE_WAIT_MS = 500;

/** Enum for queued action types */
type QueuedActionType = 'longPress' | 'shortPress' | null;

/**
 * Detect if running on Apple TV specifically
 * Apple TV doesn't have native longSelect event, so we need timer-based detection
 */
const isAppleTV = Platform.OS === 'ios' && Platform.isTV;

/**
 * Detect if running on Android TV
 * Android TV has native longSelect event in TVEventHandler
 */
const isAndroidTV = Platform.OS === 'android' && Platform.isTV;

// =============================================================================
// Hook: useLongPress
// =============================================================================

/**
 * Hook for detecting long press on any platform.
 * Returns handlers that can be attached to Pressable/TouchableOpacity components.
 *
 * This is a general-purpose hook that works with touch/press events.
 * For TV-specific usage with TVEventHandler, use useLongPressWithTVEvents instead.
 *
 * Features:
 * - Animation-aware queuing: If animationAware.isAnimating returns true when
 *   long-press is triggered, the action is queued and executed when
 *   notifyAnimationComplete() is called
 * - Duplicate prevention: Queued actions are marked as executed to prevent
 *   double-triggering
 *
 * @param options - Configuration options
 * @returns Object with handlers, state, and reset function
 */
export function useLongPress(options: UseLongPressOptions = {}): UseLongPressReturn {
  const {
    onShortPress,
    onLongPress,
    threshold = LONG_PRESS_THRESHOLD_MS,
    enabled = true,
    onPressStart,
    onPressEnd,
    animationAware,
  } = options;

  // Animation-aware config with defaults
  const animationConfig = useMemo(() => ({
    enabled: animationAware?.enabled ?? true,
    isAnimating: animationAware?.isAnimating ?? (() => false),
    maxQueueWaitMs: animationAware?.maxQueueWaitMs ?? DEFAULT_ANIMATION_QUEUE_WAIT_MS,
    onActionQueued: animationAware?.onActionQueued,
    onQueuedActionExecuted: animationAware?.onQueuedActionExecuted,
  }), [animationAware]);

  // State
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isActionQueued, setIsActionQueued] = useState(false);

  // Refs
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const longPressTriggeredRef = useRef(false);

  // Animation queue refs
  const queuedActionRef = useRef<QueuedActionType>(null);
  const queueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionExecutedRef = useRef(false); // Prevents duplicate actions

  // Clear any pending timers
  const clearTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // Clear queue timeout
  const clearQueueTimeout = useCallback(() => {
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
  }, []);

  // Cancel queued action
  const cancelQueuedAction = useCallback(() => {
    clearQueueTimeout();
    queuedActionRef.current = null;
    actionExecutedRef.current = false;
    setIsActionQueued(false);
  }, [clearQueueTimeout]);

  // Execute the appropriate action based on type
  const executeAction = useCallback((actionType: QueuedActionType) => {
    // Prevent duplicate execution
    if (actionExecutedRef.current) return;
    actionExecutedRef.current = true;

    if (actionType === 'longPress') {
      onLongPress?.();
    } else if (actionType === 'shortPress') {
      onShortPress?.();
    }
  }, [onLongPress, onShortPress]);

  // Queue an action to be executed after animation completes
  const queueAction = useCallback((actionType: QueuedActionType) => {
    if (!animationConfig.enabled || !actionType) return false;

    // Check if animation is in progress
    if (animationConfig.isAnimating()) {
      queuedActionRef.current = actionType;
      actionExecutedRef.current = false;
      setIsActionQueued(true);
      animationConfig.onActionQueued?.();

      // Set a maximum wait timeout to ensure action eventually executes
      clearQueueTimeout();
      queueTimeoutRef.current = setTimeout(() => {
        // If action hasn't been executed yet, execute it now
        if (queuedActionRef.current && !actionExecutedRef.current) {
          executeAction(queuedActionRef.current);
          animationConfig.onQueuedActionExecuted?.();
          cancelQueuedAction();
        }
      }, animationConfig.maxQueueWaitMs);

      return true; // Action was queued
    }

    return false; // Action was not queued (animation not in progress)
  }, [animationConfig, clearQueueTimeout, executeAction, cancelQueuedAction]);

  // Notify that animation has completed - execute queued action
  const notifyAnimationComplete = useCallback(() => {
    if (queuedActionRef.current && !actionExecutedRef.current) {
      clearQueueTimeout();
      executeAction(queuedActionRef.current);
      animationConfig.onQueuedActionExecuted?.();
      cancelQueuedAction();
    }
  }, [clearQueueTimeout, executeAction, animationConfig, cancelQueuedAction]);

  // Reset all state
  const reset = useCallback(() => {
    clearTimer();
    cancelQueuedAction();
    setIsPressed(false);
    setIsLongPressed(false);
    longPressTriggeredRef.current = false;
    pressStartTimeRef.current = 0;
    actionExecutedRef.current = false;
  }, [clearTimer, cancelQueuedAction]);

  // Handle press start
  const onPressIn = useCallback(() => {
    if (!enabled) return;

    // Record press start time
    pressStartTimeRef.current = Date.now();
    longPressTriggeredRef.current = false;
    actionExecutedRef.current = false; // Reset for new press
    setIsPressed(true);
    setIsLongPressed(false);
    cancelQueuedAction(); // Cancel any previously queued action

    // Notify press start
    onPressStart?.();

    // Start long press timer
    clearTimer();
    pressTimerRef.current = setTimeout(() => {
      // Long press threshold reached
      longPressTriggeredRef.current = true;
      setIsLongPressed(true);

      // Try to queue the action if animation is in progress
      const wasQueued = queueAction('longPress');
      if (!wasQueued) {
        // No animation in progress, execute immediately
        executeAction('longPress');
      }
    }, threshold);
  }, [enabled, threshold, onPressStart, clearTimer, cancelQueuedAction, queueAction, executeAction]);

  // Handle press end
  const onPressOut = useCallback(() => {
    if (!enabled) return;

    const pressDuration = Date.now() - pressStartTimeRef.current;

    // Clear the timer
    clearTimer();

    // If long press wasn't triggered and press was short, trigger short press
    if (!longPressTriggeredRef.current && pressDuration < threshold) {
      // Try to queue the action if animation is in progress
      const wasQueued = queueAction('shortPress');
      if (!wasQueued) {
        // No animation in progress, execute immediately
        executeAction('shortPress');
      }
    }

    // Reset state
    setIsPressed(false);
    onPressEnd?.();

    // Reset long press triggered ref for next press
    longPressTriggeredRef.current = false;
    pressStartTimeRef.current = 0;
  }, [enabled, threshold, onPressEnd, clearTimer, queueAction, executeAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      clearQueueTimeout();
    };
  }, [clearTimer, clearQueueTimeout]);

  return {
    handlers: {
      onPressIn,
      onPressOut,
    },
    isPressed,
    isLongPressed,
    reset,
    isActionQueued,
    notifyAnimationComplete,
    cancelQueuedAction,
  };
}

// =============================================================================
// Hook: useLongPressWithTVEvents
// =============================================================================

/**
 * Hook for detecting long press using TV remote events.
 * Uses native longSelect on Android TV and timer-based detection on Apple TV.
 *
 * This hook integrates with useTVEventHandler and should be used in components
 * that receive TV remote focus.
 *
 * Features:
 * - Animation-aware queuing: Long-press actions started during focus animations
 *   are queued and executed after the animation completes
 * - Duplicate prevention: Ensures queued actions are only executed once
 *
 * @param options - Configuration options
 * @returns Object with state and focus handlers
 *
 * @example
 * ```tsx
 * function TVFocusableCard() {
 *   const {
 *     isPressed,
 *     isLongPressed,
 *     isFocused,
 *     setFocused,
 *     notifyAnimationComplete
 *   } = useLongPressWithTVEvents({
 *     onShortPress: () => navigateToDetail(),
 *     onLongPress: () => openContextMenu(),
 *     animationAware: {
 *       isAnimating: () => focusAnimationInProgress,
 *     }
 *   });
 *
 *   return (
 *     <TouchableOpacity
 *       isTVSelectable
 *       onFocus={() => setFocused(true)}
 *       onBlur={() => setFocused(false)}
 *     >
 *       <Card focused={isFocused} pressed={isPressed} />
 *     </TouchableOpacity>
 *   );
 * }
 * ```
 */
export function useLongPressWithTVEvents(
  options: UseLongPressWithTVEventsOptions = {}
): UseLongPressWithTVEventsReturn {
  const {
    onShortPress,
    onLongPress,
    threshold = LONG_PRESS_THRESHOLD_MS,
    enabled = true,
    onPressStart,
    onPressEnd,
    animationAware,
  } = options;

  // Animation-aware config with defaults
  const animationConfig = useMemo(() => ({
    enabled: animationAware?.enabled ?? true,
    isAnimating: animationAware?.isAnimating ?? (() => false),
    maxQueueWaitMs: animationAware?.maxQueueWaitMs ?? DEFAULT_ANIMATION_QUEUE_WAIT_MS,
    onActionQueued: animationAware?.onActionQueued,
    onQueuedActionExecuted: animationAware?.onQueuedActionExecuted,
  }), [animationAware]);

  // State
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isActionQueued, setIsActionQueued] = useState(false);

  // Refs for timer-based detection (Apple TV)
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const longPressTriggeredRef = useRef(false);

  // Animation queue refs
  const queuedActionRef = useRef<QueuedActionType>(null);
  const queueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionExecutedRef = useRef(false); // Prevents duplicate actions

  // Check if TV event handling is available
  const isTVEventHandlerAvailable = useTVEventHandlerAvailable();

  // Clear any pending timers
  const clearTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // Clear queue timeout
  const clearQueueTimeout = useCallback(() => {
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
  }, []);

  // Cancel queued action
  const cancelQueuedAction = useCallback(() => {
    clearQueueTimeout();
    queuedActionRef.current = null;
    actionExecutedRef.current = false;
    setIsActionQueued(false);
  }, [clearQueueTimeout]);

  // Execute the appropriate action based on type
  const executeAction = useCallback((actionType: QueuedActionType) => {
    // Prevent duplicate execution
    if (actionExecutedRef.current) return;
    actionExecutedRef.current = true;

    if (actionType === 'longPress') {
      onLongPress?.();
    } else if (actionType === 'shortPress') {
      onShortPress?.();
    }
  }, [onLongPress, onShortPress]);

  // Queue an action to be executed after animation completes
  const queueAction = useCallback((actionType: QueuedActionType) => {
    if (!animationConfig.enabled || !actionType) return false;

    // Check if animation is in progress
    if (animationConfig.isAnimating()) {
      queuedActionRef.current = actionType;
      actionExecutedRef.current = false;
      setIsActionQueued(true);
      animationConfig.onActionQueued?.();

      // Set a maximum wait timeout to ensure action eventually executes
      clearQueueTimeout();
      queueTimeoutRef.current = setTimeout(() => {
        // If action hasn't been executed yet, execute it now
        if (queuedActionRef.current && !actionExecutedRef.current) {
          executeAction(queuedActionRef.current);
          animationConfig.onQueuedActionExecuted?.();
          cancelQueuedAction();
        }
      }, animationConfig.maxQueueWaitMs);

      return true; // Action was queued
    }

    return false; // Action was not queued (animation not in progress)
  }, [animationConfig, clearQueueTimeout, executeAction, cancelQueuedAction]);

  // Notify that animation has completed - execute queued action
  const notifyAnimationComplete = useCallback(() => {
    if (queuedActionRef.current && !actionExecutedRef.current) {
      clearQueueTimeout();
      executeAction(queuedActionRef.current);
      animationConfig.onQueuedActionExecuted?.();
      cancelQueuedAction();
    }
  }, [clearQueueTimeout, executeAction, animationConfig, cancelQueuedAction]);

  // Reset all state
  const reset = useCallback(() => {
    clearTimer();
    cancelQueuedAction();
    setIsPressed(false);
    setIsLongPressed(false);
    longPressTriggeredRef.current = false;
    pressStartTimeRef.current = 0;
    actionExecutedRef.current = false;
  }, [clearTimer, cancelQueuedAction]);

  // Set focused state
  const setFocused = useCallback((focused: boolean) => {
    setIsFocused(focused);
    // Reset press state when losing focus
    if (!focused) {
      reset();
    }
  }, [reset]);

  // Handle TV events
  const handleTVEvent = useCallback(
    (event: TVRemoteEvent) => {
      if (!enabled || !isFocused) return;

      switch (event.eventType) {
        case 'select':
          // On Android TV, the select event is followed by longSelect if held
          // On Apple TV, we need to track timing ourselves
          if (isAndroidTV) {
            // Android TV: select is a short press
            // longSelect will be sent separately if it's a long press
            // So we just trigger short press on select
            setIsPressed(true);
            onPressStart?.();

            // Set a small delay to reset pressed state (visual feedback)
            setTimeout(() => {
              if (!longPressTriggeredRef.current) {
                // Try to queue the action if animation is in progress
                const wasQueued = queueAction('shortPress');
                if (!wasQueued) {
                  executeAction('shortPress');
                }
              }
              setIsPressed(false);
              onPressEnd?.();
            }, 100);
          } else if (isAppleTV) {
            // Apple TV: Start timer-based detection
            // This handles the press-down event
            if (!isPressed) {
              pressStartTimeRef.current = Date.now();
              longPressTriggeredRef.current = false;
              actionExecutedRef.current = false; // Reset for new press
              setIsPressed(true);
              setIsLongPressed(false);
              cancelQueuedAction(); // Cancel any previously queued action
              onPressStart?.();

              // Start long press timer
              clearTimer();
              pressTimerRef.current = setTimeout(() => {
                longPressTriggeredRef.current = true;
                setIsLongPressed(true);

                // Try to queue the action if animation is in progress
                const wasQueued = queueAction('longPress');
                if (!wasQueued) {
                  executeAction('longPress');
                }
              }, threshold);
            } else {
              // This is the release event (select fires again on release on some platforms)
              const pressDuration = Date.now() - pressStartTimeRef.current;
              clearTimer();

              if (!longPressTriggeredRef.current && pressDuration < threshold) {
                // Try to queue the action if animation is in progress
                const wasQueued = queueAction('shortPress');
                if (!wasQueued) {
                  executeAction('shortPress');
                }
              }

              setIsPressed(false);
              onPressEnd?.();
              longPressTriggeredRef.current = false;
              pressStartTimeRef.current = 0;
            }
          }
          break;

        case 'longSelect':
          // Android TV native long press event
          if (isAndroidTV) {
            longPressTriggeredRef.current = true;
            setIsLongPressed(true);
            setIsPressed(true);

            // Try to queue the action if animation is in progress
            const wasQueued = queueAction('longPress');
            if (!wasQueued) {
              executeAction('longPress');
            }

            // Reset after a short delay
            setTimeout(() => {
              setIsPressed(false);
              setIsLongPressed(false);
              onPressEnd?.();
            }, 100);
          }
          break;

        case 'blur':
          // Focus lost - cancel any pending long press
          reset();
          break;

        default:
          break;
      }
    },
    [
      enabled,
      isFocused,
      isPressed,
      threshold,
      onPressStart,
      onPressEnd,
      clearTimer,
      reset,
      queueAction,
      executeAction,
      cancelQueuedAction,
    ]
  );

  // Subscribe to TV events if available
  useTVEventHandler(handleTVEvent, {
    enabled: enabled && isTVEventHandlerAvailable,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      clearQueueTimeout();
    };
  }, [clearTimer, clearQueueTimeout]);

  return {
    isPressed,
    isLongPressed,
    reset,
    isFocused,
    setFocused,
    isActionQueued,
    notifyAnimationComplete,
    cancelQueuedAction,
  };
}

// =============================================================================
// Utility Hook: useLongPressHandlers
// =============================================================================

/**
 * Simplified hook that just returns press handlers for use with Pressable components.
 * Automatically handles platform detection internally.
 *
 * @param onShortPress - Callback for short press
 * @param onLongPress - Callback for long press
 * @param options - Additional options
 * @returns Handler functions for onPressIn and onPressOut
 */
export function useLongPressHandlers(
  onShortPress: (() => void) | undefined,
  onLongPress: (() => void) | undefined,
  options: Omit<UseLongPressOptions, 'onShortPress' | 'onLongPress'> = {}
): {
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const { handlers } = useLongPress({
    onShortPress,
    onLongPress,
    ...options,
  });

  return handlers;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if the current platform supports native long press events
 */
export function supportsNativeLongPress(): boolean {
  return isAndroidTV;
}

/**
 * Check if the current platform requires timer-based long press detection
 */
export function requiresTimerBasedLongPress(): boolean {
  return isAppleTV;
}

/**
 * Check if we're on a TV platform
 */
export function isTV(): boolean {
  return Platform.isTV === true;
}

// =============================================================================
// Export Default
// =============================================================================

export default useLongPress;
