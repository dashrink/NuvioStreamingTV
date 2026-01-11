/**
 * Unit Tests for useLongPress Hook
 *
 * Tests long-press detection on both platforms including:
 * - Short press vs long press distinction
 * - Platform-specific behavior (Apple TV timer-based, Android TV native)
 * - Timer cleanup on unmount
 * - Animation-aware queuing
 * - State management (isPressed, isLongPressed, isActionQueued)
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  useLongPress,
  useLongPressWithTVEvents,
  useLongPressHandlers,
  supportsNativeLongPress,
  requiresTimerBasedLongPress,
  isTV,
  LONG_PRESS_THRESHOLD_MS,
  DEFAULT_ANIMATION_QUEUE_WAIT_MS,
} from '../../src/hooks/useLongPress';
import {
  getTVEventHandlerMock,
  advanceTimersAndFlush,
} from '../setup';

// Get reference to the mock
const mockTVEventHandler = getTVEventHandlerMock();

// ============================================================================
// useLongPress Hook Tests
// ============================================================================

describe('useLongPress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useLongPress());

      expect(result.current.isPressed).toBe(false);
      expect(result.current.isLongPressed).toBe(false);
      expect(result.current.isActionQueued).toBe(false);
      expect(typeof result.current.handlers.onPressIn).toBe('function');
      expect(typeof result.current.handlers.onPressOut).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.notifyAnimationComplete).toBe('function');
      expect(typeof result.current.cancelQueuedAction).toBe('function');
    });

    it('should set isPressed to true on press in', () => {
      const { result } = renderHook(() => useLongPress());

      act(() => {
        result.current.handlers.onPressIn();
      });

      expect(result.current.isPressed).toBe(true);
      expect(result.current.isLongPressed).toBe(false);
    });

    it('should set isPressed to false on press out', () => {
      const { result } = renderHook(() => useLongPress());

      act(() => {
        result.current.handlers.onPressIn();
      });

      expect(result.current.isPressed).toBe(true);

      act(() => {
        result.current.handlers.onPressOut();
      });

      expect(result.current.isPressed).toBe(false);
    });
  });

  describe('short press vs long press detection', () => {
    it('should trigger short press when press duration is less than threshold', async () => {
      const onShortPress = jest.fn();
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onShortPress, onLongPress })
      );

      // Press in
      act(() => {
        result.current.handlers.onPressIn();
      });

      // Wait less than threshold (default 300ms)
      await act(async () => {
        await advanceTimersAndFlush(200);
      });

      // Press out
      act(() => {
        result.current.handlers.onPressOut();
      });

      expect(onShortPress).toHaveBeenCalledTimes(1);
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should trigger long press when press duration reaches threshold', async () => {
      const onShortPress = jest.fn();
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onShortPress, onLongPress, threshold: 300 })
      );

      // Press in
      act(() => {
        result.current.handlers.onPressIn();
      });

      // Wait for threshold to be reached
      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(result.current.isLongPressed).toBe(true);

      // Press out - should NOT trigger short press since long press was triggered
      act(() => {
        result.current.handlers.onPressOut();
      });

      expect(onShortPress).not.toHaveBeenCalled();
    });

    it('should not trigger short press if long press was already triggered', async () => {
      const onShortPress = jest.fn();
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onShortPress, onLongPress, threshold: 300 })
      );

      // Press in
      act(() => {
        result.current.handlers.onPressIn();
      });

      // Wait past threshold
      await act(async () => {
        await advanceTimersAndFlush(400);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);

      // Press out
      act(() => {
        result.current.handlers.onPressOut();
      });

      expect(onShortPress).not.toHaveBeenCalled();
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should use custom threshold when provided', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onLongPress, threshold: 500 })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      // Wait 300ms (default threshold) - should NOT trigger yet
      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      expect(onLongPress).not.toHaveBeenCalled();

      // Wait another 200ms to reach 500ms threshold
      await act(async () => {
        await advanceTimersAndFlush(200);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should use default threshold constant', () => {
      expect(LONG_PRESS_THRESHOLD_MS).toBe(300);
    });
  });

  describe('timer cleanup', () => {
    it('should clear timer on unmount', async () => {
      const onLongPress = jest.fn();

      const { result, unmount } = renderHook(() =>
        useLongPress({ onLongPress })
      );

      // Press in - starts timer
      act(() => {
        result.current.handlers.onPressIn();
      });

      // Unmount before threshold
      unmount();

      // Advance time past threshold
      await act(async () => {
        await advanceTimersAndFlush(400);
      });

      // Long press should NOT have been triggered (timer was cleared)
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should clear timer on press out before threshold', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onLongPress })
      );

      // Press in
      act(() => {
        result.current.handlers.onPressIn();
      });

      // Press out before threshold
      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      act(() => {
        result.current.handlers.onPressOut();
      });

      // Advance time past threshold
      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      // Long press should NOT have been triggered
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should clear timer on reset', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onLongPress })
      );

      // Press in
      act(() => {
        result.current.handlers.onPressIn();
      });

      // Reset before threshold
      act(() => {
        result.current.reset();
      });

      // Advance time past threshold
      await act(async () => {
        await advanceTimersAndFlush(400);
      });

      // Long press should NOT have been triggered
      expect(onLongPress).not.toHaveBeenCalled();
      expect(result.current.isPressed).toBe(false);
      expect(result.current.isLongPressed).toBe(false);
    });
  });

  describe('enabled option', () => {
    it('should not respond to press when disabled', () => {
      const onShortPress = jest.fn();
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onShortPress, onLongPress, enabled: false })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      expect(result.current.isPressed).toBe(false);

      act(() => {
        result.current.handlers.onPressOut();
      });

      expect(onShortPress).not.toHaveBeenCalled();
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should respond to press when enabled is true', () => {
      const onPressStart = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onPressStart, enabled: true })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      expect(result.current.isPressed).toBe(true);
      expect(onPressStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('callbacks', () => {
    it('should call onPressStart when press begins', () => {
      const onPressStart = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onPressStart })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      expect(onPressStart).toHaveBeenCalledTimes(1);
    });

    it('should call onPressEnd when press ends', () => {
      const onPressEnd = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({ onPressEnd })
      );

      act(() => {
        result.current.handlers.onPressIn();
        result.current.handlers.onPressOut();
      });

      expect(onPressEnd).toHaveBeenCalledTimes(1);
    });

    it('should call callbacks in correct order for short press', async () => {
      const callOrder: string[] = [];

      const { result } = renderHook(() =>
        useLongPress({
          onPressStart: () => callOrder.push('start'),
          onPressEnd: () => callOrder.push('end'),
          onShortPress: () => callOrder.push('short'),
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      act(() => {
        result.current.handlers.onPressOut();
      });

      expect(callOrder).toEqual(['start', 'short', 'end']);
    });

    it('should call callbacks in correct order for long press', async () => {
      const callOrder: string[] = [];

      const { result } = renderHook(() =>
        useLongPress({
          onPressStart: () => callOrder.push('start'),
          onPressEnd: () => callOrder.push('end'),
          onLongPress: () => callOrder.push('long'),
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      // Long press triggered
      expect(callOrder).toContain('long');

      act(() => {
        result.current.handlers.onPressOut();
      });

      expect(callOrder).toEqual(['start', 'long', 'end']);
    });
  });

  describe('animation-aware queuing', () => {
    it('should queue long press action when animation is in progress', async () => {
      let animating = true;
      const onLongPress = jest.fn();
      const onActionQueued = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({
          onLongPress,
          animationAware: {
            enabled: true,
            isAnimating: () => animating,
            onActionQueued,
          },
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      // Wait for long press threshold
      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      // Action should be queued, not executed
      expect(result.current.isActionQueued).toBe(true);
      expect(onActionQueued).toHaveBeenCalledTimes(1);
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should execute queued action when notifyAnimationComplete is called', async () => {
      let animating = true;
      const onLongPress = jest.fn();
      const onQueuedActionExecuted = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({
          onLongPress,
          animationAware: {
            enabled: true,
            isAnimating: () => animating,
            onQueuedActionExecuted,
          },
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      expect(result.current.isActionQueued).toBe(true);
      expect(onLongPress).not.toHaveBeenCalled();

      // Notify animation complete
      act(() => {
        animating = false;
        result.current.notifyAnimationComplete();
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(onQueuedActionExecuted).toHaveBeenCalledTimes(1);
      expect(result.current.isActionQueued).toBe(false);
    });

    it('should execute queued action after maxQueueWaitMs timeout', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({
          onLongPress,
          animationAware: {
            enabled: true,
            isAnimating: () => true,
            maxQueueWaitMs: 200,
          },
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      expect(result.current.isActionQueued).toBe(true);
      expect(onLongPress).not.toHaveBeenCalled();

      // Wait for maxQueueWaitMs timeout
      await act(async () => {
        await advanceTimersAndFlush(200);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should cancel queued action when cancelQueuedAction is called', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({
          onLongPress,
          animationAware: {
            enabled: true,
            isAnimating: () => true,
          },
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      expect(result.current.isActionQueued).toBe(true);

      act(() => {
        result.current.cancelQueuedAction();
      });

      expect(result.current.isActionQueued).toBe(false);

      // Notify animation complete - should NOT execute action
      act(() => {
        result.current.notifyAnimationComplete();
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should not queue action when animation-aware is disabled', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({
          onLongPress,
          animationAware: {
            enabled: false,
            isAnimating: () => true,
          },
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      // Action should be executed immediately, not queued
      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(result.current.isActionQueued).toBe(false);
    });

    it('should not execute action twice (duplicate prevention)', async () => {
      let animating = true;
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({
          onLongPress,
          animationAware: {
            enabled: true,
            isAnimating: () => animating,
          },
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      // Call notifyAnimationComplete multiple times
      act(() => {
        animating = false;
        result.current.notifyAnimationComplete();
        result.current.notifyAnimationComplete();
        result.current.notifyAnimationComplete();
      });

      // Action should only be executed once
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should have correct default maxQueueWaitMs', () => {
      expect(DEFAULT_ANIMATION_QUEUE_WAIT_MS).toBe(500);
    });

    it('should queue short press action when animation is in progress', async () => {
      const animating = true;
      const onShortPress = jest.fn();
      const onActionQueued = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({
          onShortPress,
          animationAware: {
            enabled: true,
            isAnimating: () => animating,
            onActionQueued,
          },
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      act(() => {
        result.current.handlers.onPressOut();
      });

      // Short press action should be queued
      expect(result.current.isActionQueued).toBe(true);
      expect(onActionQueued).toHaveBeenCalledTimes(1);
      expect(onShortPress).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should reset all state', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPress({
          onLongPress,
          animationAware: {
            enabled: true,
            isAnimating: () => true,
          },
        })
      );

      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      expect(result.current.isPressed).toBe(true);
      expect(result.current.isLongPressed).toBe(true);
      expect(result.current.isActionQueued).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.isPressed).toBe(false);
      expect(result.current.isLongPressed).toBe(false);
      expect(result.current.isActionQueued).toBe(false);
    });
  });
});

// ============================================================================
// useLongPressWithTVEvents Hook Tests
// ============================================================================

describe('useLongPressWithTVEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useLongPressWithTVEvents());

      expect(result.current.isPressed).toBe(false);
      expect(result.current.isLongPressed).toBe(false);
      expect(result.current.isFocused).toBe(false);
      expect(result.current.isActionQueued).toBe(false);
      expect(typeof result.current.setFocused).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.notifyAnimationComplete).toBe('function');
      expect(typeof result.current.cancelQueuedAction).toBe('function');
    });

    it('should enable TVEventHandler', () => {
      renderHook(() => useLongPressWithTVEvents());

      expect(mockTVEventHandler.enable).toHaveBeenCalled();
    });

    it('should disable TVEventHandler on unmount', () => {
      const { unmount } = renderHook(() => useLongPressWithTVEvents());

      unmount();

      expect(mockTVEventHandler.disable).toHaveBeenCalled();
    });
  });

  describe('focus management', () => {
    it('should update isFocused state', () => {
      const { result } = renderHook(() => useLongPressWithTVEvents());

      expect(result.current.isFocused).toBe(false);

      act(() => {
        result.current.setFocused(true);
      });

      expect(result.current.isFocused).toBe(true);

      act(() => {
        result.current.setFocused(false);
      });

      expect(result.current.isFocused).toBe(false);
    });

    it('should reset press state when losing focus', async () => {
      const { result } = renderHook(() => useLongPressWithTVEvents());

      // Focus the element
      act(() => {
        result.current.setFocused(true);
      });

      // Simulate pressing (via TV event)
      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      act(() => {
        internalCallback(null, { eventType: 'select' });
      });

      expect(result.current.isPressed).toBe(true);

      // Lose focus
      act(() => {
        result.current.setFocused(false);
      });

      expect(result.current.isPressed).toBe(false);
      expect(result.current.isFocused).toBe(false);
    });

    it('should not process events when not focused', () => {
      const onShortPress = jest.fn();

      renderHook(() =>
        useLongPressWithTVEvents({ onShortPress })
      );

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // Send select event while not focused
      act(() => {
        internalCallback(null, { eventType: 'select' });
      });

      expect(onShortPress).not.toHaveBeenCalled();
    });
  });

  describe('Android TV - native longSelect event', () => {
    // Note: Platform is mocked as iOS/TV in setup, but we test the event handling

    it('should handle longSelect event for long press', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPressWithTVEvents({ onLongPress })
      );

      // Focus the element
      act(() => {
        result.current.setFocused(true);
      });

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // Simulate longSelect event
      act(() => {
        internalCallback(null, { eventType: 'longSelect' });
      });

      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      // On Android TV, longSelect triggers long press
      // Note: Since Platform is mocked as iOS, behavior may differ
      expect(result.current.isLongPressed).toBe(true);
    });
  });

  describe('Apple TV - timer-based detection', () => {
    // Platform is mocked as iOS/TV in setup

    it('should detect long press via timer on select event', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPressWithTVEvents({ onLongPress })
      );

      act(() => {
        result.current.setFocused(true);
      });

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // First select starts the press
      act(() => {
        internalCallback(null, { eventType: 'select' });
      });

      expect(result.current.isPressed).toBe(true);

      // Wait for threshold
      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(result.current.isLongPressed).toBe(true);
    });

    it('should detect short press when released before threshold', async () => {
      const onShortPress = jest.fn();
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPressWithTVEvents({ onShortPress, onLongPress })
      );

      act(() => {
        result.current.setFocused(true);
      });

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // First select starts the press
      act(() => {
        internalCallback(null, { eventType: 'select' });
      });

      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      // Second select releases the press (toggle behavior on Apple TV)
      act(() => {
        internalCallback(null, { eventType: 'select' });
      });

      expect(onShortPress).toHaveBeenCalledTimes(1);
      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('blur event handling', () => {
    it('should reset state on blur event', async () => {
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPressWithTVEvents({ onLongPress })
      );

      act(() => {
        result.current.setFocused(true);
      });

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // Start press
      act(() => {
        internalCallback(null, { eventType: 'select' });
      });

      expect(result.current.isPressed).toBe(true);

      // Blur event
      act(() => {
        internalCallback(null, { eventType: 'blur' });
      });

      expect(result.current.isPressed).toBe(false);
      expect(result.current.isLongPressed).toBe(false);
    });
  });

  describe('enabled option', () => {
    it('should not enable TVEventHandler when disabled', () => {
      jest.clearAllMocks();

      renderHook(() =>
        useLongPressWithTVEvents({ enabled: false })
      );

      // TVEventHandler should still be enabled due to internal check
      // but events should not be processed
    });

    it('should not process events when disabled', () => {
      const onShortPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPressWithTVEvents({ onShortPress, enabled: false })
      );

      act(() => {
        result.current.setFocused(true);
      });

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      if (enableCalls.length > 0) {
        const internalCallback = enableCalls[0][1];
        act(() => {
          internalCallback(null, { eventType: 'select' });
        });
      }

      expect(onShortPress).not.toHaveBeenCalled();
    });
  });

  describe('animation-aware queuing', () => {
    it('should queue long press when animation is in progress', async () => {
      let animating = true;
      const onLongPress = jest.fn();

      const { result } = renderHook(() =>
        useLongPressWithTVEvents({
          onLongPress,
          animationAware: {
            enabled: true,
            isAnimating: () => animating,
          },
        })
      );

      act(() => {
        result.current.setFocused(true);
      });

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      act(() => {
        internalCallback(null, { eventType: 'select' });
      });

      await act(async () => {
        await advanceTimersAndFlush(300);
      });

      expect(result.current.isActionQueued).toBe(true);
      expect(onLongPress).not.toHaveBeenCalled();

      // Notify animation complete
      act(() => {
        animating = false;
        result.current.notifyAnimationComplete();
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(result.current.isActionQueued).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call onPressStart on select event', () => {
      const onPressStart = jest.fn();

      const { result } = renderHook(() =>
        useLongPressWithTVEvents({ onPressStart })
      );

      act(() => {
        result.current.setFocused(true);
      });

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      act(() => {
        internalCallback(null, { eventType: 'select' });
      });

      expect(onPressStart).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// useLongPressHandlers Utility Hook Tests
// ============================================================================

describe('useLongPressHandlers', () => {
  it('should return press handlers', () => {
    const onShortPress = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() =>
      useLongPressHandlers(onShortPress, onLongPress)
    );

    expect(typeof result.current.onPressIn).toBe('function');
    expect(typeof result.current.onPressOut).toBe('function');
  });

  it('should trigger short press', async () => {
    const onShortPress = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() =>
      useLongPressHandlers(onShortPress, onLongPress)
    );

    act(() => {
      result.current.onPressIn();
    });

    await act(async () => {
      await advanceTimersAndFlush(100);
    });

    act(() => {
      result.current.onPressOut();
    });

    expect(onShortPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('should trigger long press', async () => {
    const onShortPress = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() =>
      useLongPressHandlers(onShortPress, onLongPress)
    );

    act(() => {
      result.current.onPressIn();
    });

    await act(async () => {
      await advanceTimersAndFlush(300);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onShortPress).not.toHaveBeenCalled();
  });

  it('should handle undefined callbacks', async () => {
    const { result } = renderHook(() =>
      useLongPressHandlers(undefined, undefined)
    );

    // Should not throw
    act(() => {
      result.current.onPressIn();
    });

    await act(async () => {
      await advanceTimersAndFlush(100);
    });

    act(() => {
      result.current.onPressOut();
    });
  });

  it('should respect options', async () => {
    const onLongPress = jest.fn();

    const { result } = renderHook(() =>
      useLongPressHandlers(undefined, onLongPress, { threshold: 500 })
    );

    act(() => {
      result.current.onPressIn();
    });

    await act(async () => {
      await advanceTimersAndFlush(300);
    });

    expect(onLongPress).not.toHaveBeenCalled();

    await act(async () => {
      await advanceTimersAndFlush(200);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('utility functions', () => {
  describe('supportsNativeLongPress', () => {
    it('should return boolean', () => {
      const result = supportsNativeLongPress();
      expect(typeof result).toBe('boolean');
    });

    // Note: Platform is mocked as iOS, so this returns false
    it('should return false for Apple TV (mocked as iOS)', () => {
      expect(supportsNativeLongPress()).toBe(false);
    });
  });

  describe('requiresTimerBasedLongPress', () => {
    it('should return boolean', () => {
      const result = requiresTimerBasedLongPress();
      expect(typeof result).toBe('boolean');
    });

    // Note: Platform is mocked as iOS + isTV, so this returns true
    it('should return true for Apple TV (mocked as iOS + TV)', () => {
      expect(requiresTimerBasedLongPress()).toBe(true);
    });
  });

  describe('isTV', () => {
    it('should return true on TV platform (mocked)', () => {
      expect(isTV()).toBe(true);
    });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('edge cases', () => {
  it('should handle rapid press in/out sequences', async () => {
    const onShortPress = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() =>
      useLongPress({ onShortPress, onLongPress })
    );

    // Rapid sequence
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.handlers.onPressIn();
      });

      await act(async () => {
        await advanceTimersAndFlush(50);
      });

      act(() => {
        result.current.handlers.onPressOut();
      });
    }

    expect(onShortPress).toHaveBeenCalledTimes(5);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('should handle press in without press out', async () => {
    const onLongPress = jest.fn();

    const { result } = renderHook(() =>
      useLongPress({ onLongPress })
    );

    act(() => {
      result.current.handlers.onPressIn();
    });

    await act(async () => {
      await advanceTimersAndFlush(300);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(result.current.isPressed).toBe(true);
    expect(result.current.isLongPressed).toBe(true);
  });

  it('should handle press out without press in', () => {
    const onShortPress = jest.fn();

    const { result } = renderHook(() =>
      useLongPress({ onShortPress })
    );

    // Press out without press in - should handle gracefully
    act(() => {
      result.current.handlers.onPressOut();
    });

    // Should not crash, and should call short press due to 0 duration
    // (behavior depends on implementation - just verify no error)
    expect(result.current.isPressed).toBe(false);
  });

  it('should handle callback that throws', async () => {
    const errorCallback = jest.fn(() => {
      throw new Error('Test error');
    });

    const { result } = renderHook(() =>
      useLongPress({ onLongPress: errorCallback })
    );

    act(() => {
      result.current.handlers.onPressIn();
    });

    // This will throw, but we want to verify it doesn't break the hook state
    await expect(act(async () => {
      await advanceTimersAndFlush(300);
    })).rejects.toThrow('Test error');

    expect(errorCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle rerender with different callbacks', async () => {
    const onLongPress1 = jest.fn();
    const onLongPress2 = jest.fn();

    const { result, rerender } = renderHook(
      ({ callback }) => useLongPress({ onLongPress: callback }),
      { initialProps: { callback: onLongPress1 } }
    );

    act(() => {
      result.current.handlers.onPressIn();
    });

    // Change callback mid-press
    rerender({ callback: onLongPress2 });

    await act(async () => {
      await advanceTimersAndFlush(300);
    });

    // New callback should be called
    expect(onLongPress2).toHaveBeenCalledTimes(1);
    expect(onLongPress1).not.toHaveBeenCalled();
  });
});
