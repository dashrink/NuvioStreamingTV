/**
 * Unit Tests for useTVEventHandler Hook
 *
 * Tests TV event handler lifecycle management including:
 * - Proper enabling/disabling of handler
 * - Cleanup on unmount
 * - Graceful handling of missing TVEventHandler
 * - Throttling and debouncing behavior
 * - Rapid input protection
 */

import { renderHook, act } from '@testing-library/react-native';

import {
  useTVEventHandler,
  useIsTV,
  useTVEventHandlerAvailable,
  useRapidInputProtectedTVEventHandler,
  useThrottledCallback,
  useFocusChangeProtection,
  isNavigationEvent,
  isSelectEvent,
  isLongSelectEvent,
  isMenuEvent,
  isPlayPauseEvent,
  isSwipeEvent,
  TVRemoteEvent,
} from '../../src/hooks/useTVEventHandler';
import { getTVEventHandlerMock, advanceTimersAndFlush } from '../setup';

// Get reference to the mock
const mockTVEventHandler = getTVEventHandlerMock();

describe('useTVEventHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('lifecycle management', () => {
    it('should enable TVEventHandler on mount', () => {
      const callback = jest.fn();

      renderHook(() => useTVEventHandler(callback));

      expect(mockTVEventHandler.enable).toHaveBeenCalledTimes(1);
      expect(mockTVEventHandler.enable).toHaveBeenCalledWith(null, expect.any(Function));
    });

    it('should disable TVEventHandler on unmount', () => {
      const callback = jest.fn();

      const { unmount } = renderHook(() => useTVEventHandler(callback));

      // Handler should be enabled
      expect(mockTVEventHandler.enable).toHaveBeenCalledTimes(1);

      // Unmount and verify cleanup
      unmount();

      expect(mockTVEventHandler.disable).toHaveBeenCalledTimes(1);
    });

    it('should not enable handler when disabled option is set', () => {
      const callback = jest.fn();

      renderHook(() => useTVEventHandler(callback, { enabled: false }));

      expect(mockTVEventHandler.enable).not.toHaveBeenCalled();
    });

    it('should enable/disable handler when enabled option changes', () => {
      const callback = jest.fn();

      const { rerender } = renderHook(({ enabled }) => useTVEventHandler(callback, { enabled }), {
        initialProps: { enabled: true },
      });

      expect(mockTVEventHandler.enable).toHaveBeenCalledTimes(1);

      // Disable the handler
      rerender({ enabled: false });

      expect(mockTVEventHandler.disable).toHaveBeenCalledTimes(1);

      // Re-enable the handler
      rerender({ enabled: true });

      expect(mockTVEventHandler.enable).toHaveBeenCalledTimes(2);
    });

    it('should clean up properly when component re-renders', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { rerender, unmount } = renderHook(({ callback }) => useTVEventHandler(callback), {
        initialProps: { callback: callback1 },
      });

      expect(mockTVEventHandler.enable).toHaveBeenCalledTimes(1);

      // Rerender with new callback
      rerender({ callback: callback2 });

      // Should disable old and enable new
      expect(mockTVEventHandler.disable).toHaveBeenCalledTimes(1);
      expect(mockTVEventHandler.enable).toHaveBeenCalledTimes(2);

      unmount();

      expect(mockTVEventHandler.disable).toHaveBeenCalledTimes(2);
    });
  });

  describe('event handling', () => {
    it('should call callback when TV event is received', () => {
      const callback = jest.fn();

      renderHook(() => useTVEventHandler(callback));

      // Get the internal callback passed to enable
      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // Simulate TV event
      const event: TVRemoteEvent = { eventType: 'select' };
      internalCallback(null, event);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should not call callback when handler is disabled', () => {
      const callback = jest.fn();

      const { rerender } = renderHook(({ enabled }) => useTVEventHandler(callback, { enabled }), {
        initialProps: { enabled: true },
      });

      // Get the internal callback
      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // Disable the handler
      rerender({ enabled: false });

      // Simulate TV event - should not be called
      const event: TVRemoteEvent = { eventType: 'select' };
      internalCallback(null, event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle all TV event types', () => {
      const callback = jest.fn();

      renderHook(() => useTVEventHandler(callback));

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      const eventTypes = [
        'up',
        'down',
        'left',
        'right',
        'select',
        'menu',
        'playPause',
        'longSelect',
      ];

      eventTypes.forEach(eventType => {
        const event: TVRemoteEvent = { eventType: eventType as TVRemoteEvent['eventType'] };
        internalCallback(null, event);
      });

      expect(callback).toHaveBeenCalledTimes(eventTypes.length);
    });
  });

  describe('throttling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should throttle navigation events when throttleNavigationMs is set', async () => {
      const callback = jest.fn();

      renderHook(() => useTVEventHandler(callback, { throttleNavigationMs: 100 }));

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // First event should go through
      internalCallback(null, { eventType: 'up' });
      expect(callback).toHaveBeenCalledTimes(1);

      // Second event within throttle window should be dropped
      internalCallback(null, { eventType: 'up' });
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance time past throttle window
      await act(async () => {
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      });

      // Third event should go through
      internalCallback(null, { eventType: 'up' });
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should not throttle non-navigation events', async () => {
      const callback = jest.fn();

      renderHook(() => useTVEventHandler(callback, { throttleNavigationMs: 100 }));

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // Both select events should go through
      internalCallback(null, { eventType: 'select' });
      internalCallback(null, { eventType: 'select' });

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('debouncing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce events when debounceMs is set', async () => {
      const callback = jest.fn();

      renderHook(() => useTVEventHandler(callback, { debounceMs: 50 }));

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // Multiple rapid events
      internalCallback(null, { eventType: 'select' });
      internalCallback(null, { eventType: 'select' });
      internalCallback(null, { eventType: 'select' });

      // Callback should not be called yet
      expect(callback).toHaveBeenCalledTimes(0);

      // Advance time past debounce window
      await act(async () => {
        jest.advanceTimersByTime(50);
        await Promise.resolve();
      });

      // Only last event should have been processed
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clear debounce timer on unmount', async () => {
      const callback = jest.fn();

      const { unmount } = renderHook(() => useTVEventHandler(callback, { debounceMs: 50 }));

      const enableCalls = mockTVEventHandler.enable.mock.calls;
      const internalCallback = enableCalls[0][1];

      // Trigger event (starts debounce timer)
      internalCallback(null, { eventType: 'select' });

      // Unmount before debounce completes
      unmount();

      // Advance time
      await act(async () => {
        jest.advanceTimersByTime(50);
        await Promise.resolve();
      });

      // Callback should not be called (timer was cleared)
      expect(callback).toHaveBeenCalledTimes(0);
    });
  });
});

describe('useIsTV', () => {
  it('should return true on TV platform', () => {
    const { result } = renderHook(() => useIsTV());
    expect(result.current).toBe(true);
  });
});

describe('useTVEventHandlerAvailable', () => {
  it('should return true when TVEventHandler is available', () => {
    const { result } = renderHook(() => useTVEventHandlerAvailable());
    expect(result.current).toBe(true);
  });
});

describe('event type guards', () => {
  it('isNavigationEvent should correctly identify navigation events', () => {
    expect(isNavigationEvent({ eventType: 'up' })).toBe(true);
    expect(isNavigationEvent({ eventType: 'down' })).toBe(true);
    expect(isNavigationEvent({ eventType: 'left' })).toBe(true);
    expect(isNavigationEvent({ eventType: 'right' })).toBe(true);
    expect(isNavigationEvent({ eventType: 'select' })).toBe(false);
    expect(isNavigationEvent({ eventType: 'menu' })).toBe(false);
  });

  it('isSelectEvent should correctly identify select events', () => {
    expect(isSelectEvent({ eventType: 'select' })).toBe(true);
    expect(isSelectEvent({ eventType: 'up' })).toBe(false);
  });

  it('isLongSelectEvent should correctly identify long select events', () => {
    expect(isLongSelectEvent({ eventType: 'longSelect' })).toBe(true);
    expect(isLongSelectEvent({ eventType: 'select' })).toBe(false);
  });

  it('isMenuEvent should correctly identify menu events', () => {
    expect(isMenuEvent({ eventType: 'menu' })).toBe(true);
    expect(isMenuEvent({ eventType: 'select' })).toBe(false);
  });

  it('isPlayPauseEvent should correctly identify play/pause events', () => {
    expect(isPlayPauseEvent({ eventType: 'playPause' })).toBe(true);
    expect(isPlayPauseEvent({ eventType: 'select' })).toBe(false);
  });

  it('isSwipeEvent should correctly identify swipe events', () => {
    expect(isSwipeEvent({ eventType: 'swipeUp' })).toBe(true);
    expect(isSwipeEvent({ eventType: 'swipeDown' })).toBe(true);
    expect(isSwipeEvent({ eventType: 'swipeLeft' })).toBe(true);
    expect(isSwipeEvent({ eventType: 'swipeRight' })).toBe(true);
    expect(isSwipeEvent({ eventType: 'up' })).toBe(false);
  });
});

describe('useRapidInputProtectedTVEventHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should throttle rapid navigation events per direction', async () => {
    const callback = jest.fn();

    renderHook(() =>
      useRapidInputProtectedTVEventHandler(callback, { minNavigationIntervalMs: 50 })
    );

    const enableCalls = mockTVEventHandler.enable.mock.calls;
    const internalCallback = enableCalls[0][1];

    // First 'up' event should go through (eventually via queue)
    internalCallback(null, { eventType: 'up' });

    await act(async () => {
      jest.advanceTimersByTime(16); // requestAnimationFrame
      await Promise.resolve();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Rapid second 'up' event should be queued
    internalCallback(null, { eventType: 'up' });

    // Different direction should also be processed
    internalCallback(null, { eventType: 'down' });

    await act(async () => {
      jest.advanceTimersByTime(50); // Wait for throttle
      await Promise.resolve();
    });
  });

  it('should process non-navigation events immediately', () => {
    const callback = jest.fn();

    renderHook(() =>
      useRapidInputProtectedTVEventHandler(callback, { minNavigationIntervalMs: 50 })
    );

    const enableCalls = mockTVEventHandler.enable.mock.calls;
    const internalCallback = enableCalls[0][1];

    // Non-navigation events should be processed immediately
    internalCallback(null, { eventType: 'select' });
    internalCallback(null, { eventType: 'select' });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should drop events when queue is full', async () => {
    const callback = jest.fn();

    renderHook(() =>
      useRapidInputProtectedTVEventHandler(callback, {
        minNavigationIntervalMs: 100,
        maxQueuedEvents: 2,
      })
    );

    const enableCalls = mockTVEventHandler.enable.mock.calls;
    const internalCallback = enableCalls[0][1];

    // Fill the queue
    internalCallback(null, { eventType: 'up' });
    internalCallback(null, { eventType: 'up' });
    internalCallback(null, { eventType: 'up' });
    internalCallback(null, { eventType: 'up' }); // This should be dropped
    internalCallback(null, { eventType: 'up' }); // This should be dropped

    // Process queue
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    // Only first event + 2 queued should have been processed (max 3)
    expect(callback.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('should clean up on unmount', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => useRapidInputProtectedTVEventHandler(callback));

    expect(mockTVEventHandler.enable).toHaveBeenCalled();

    unmount();

    expect(mockTVEventHandler.disable).toHaveBeenCalled();
  });
});

describe('useThrottledCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should throttle callback execution', async () => {
    const callback = jest.fn();

    const { result } = renderHook(() => useThrottledCallback(callback, 100));

    // First call should go through
    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    // Second call within throttle window should be dropped
    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    // Advance time
    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // Third call should go through
    result.current();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments to callback', () => {
    const callback = jest.fn();

    const { result } = renderHook(() => useThrottledCallback(callback, 100));

    result.current('arg1', 'arg2');

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('useFocusChangeProtection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should track current focus with debouncing', async () => {
    const onFocusChange = jest.fn();

    const { result } = renderHook(() => useFocusChangeProtection(onFocusChange, 16));

    // Trigger focus
    act(() => {
      result.current.handleFocus('element-1');
    });

    // Should be pending
    expect(result.current.isPendingFocusChange).toBe(true);

    // Advance time past debounce
    await act(async () => {
      jest.advanceTimersByTime(16);
      await Promise.resolve();
    });

    expect(result.current.currentFocusId).toBe('element-1');
    expect(result.current.isPendingFocusChange).toBe(false);
    expect(onFocusChange).toHaveBeenCalledWith('element-1');
  });

  it('should debounce rapid focus changes', async () => {
    const onFocusChange = jest.fn();

    const { result } = renderHook(() => useFocusChangeProtection(onFocusChange, 16));

    // Rapid focus changes
    act(() => {
      result.current.handleFocus('element-1');
      result.current.handleFocus('element-2');
      result.current.handleFocus('element-3');
    });

    // Advance time past debounce
    await act(async () => {
      jest.advanceTimersByTime(16);
      await Promise.resolve();
    });

    // Only last focus should be tracked
    expect(result.current.currentFocusId).toBe('element-3');
    expect(onFocusChange).toHaveBeenCalledTimes(1);
    expect(onFocusChange).toHaveBeenCalledWith('element-3');
  });

  it('should handle blur correctly', async () => {
    const onFocusChange = jest.fn();

    const { result } = renderHook(() => useFocusChangeProtection(onFocusChange, 16));

    // Focus an element
    act(() => {
      result.current.handleFocus('element-1');
    });

    await act(async () => {
      jest.advanceTimersByTime(16);
      await Promise.resolve();
    });

    expect(result.current.currentFocusId).toBe('element-1');

    // Blur the element
    act(() => {
      result.current.handleBlur('element-1');
    });

    await act(async () => {
      jest.advanceTimersByTime(16);
      await Promise.resolve();
    });

    expect(result.current.currentFocusId).toBe(null);
    expect(onFocusChange).toHaveBeenCalledWith(null);
  });

  it('should not clear focus if different element is blurred', async () => {
    const onFocusChange = jest.fn();

    const { result } = renderHook(() => useFocusChangeProtection(onFocusChange, 16));

    // Focus element-1
    act(() => {
      result.current.handleFocus('element-1');
    });

    await act(async () => {
      jest.advanceTimersByTime(16);
      await Promise.resolve();
    });

    // Blur element-2 (different element)
    act(() => {
      result.current.handleBlur('element-2');
    });

    await act(async () => {
      jest.advanceTimersByTime(16);
      await Promise.resolve();
    });

    // Focus should still be on element-1
    expect(result.current.currentFocusId).toBe('element-1');
  });
});
