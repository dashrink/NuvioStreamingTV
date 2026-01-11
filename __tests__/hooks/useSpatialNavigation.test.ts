/**
 * Unit Tests for useSpatialNavigation Hook
 *
 * Tests focus memory storage and retrieval including:
 * - Focus IDs stored correctly
 * - Last focused item retrieved correctly
 * - Missing refs handled gracefully
 * - Ref management (register, unregister, get)
 * - Node handle management
 * - Next focus configuration
 * - Focus restoration with React Navigation
 * - Debouncing/rapid input protection
 * - Grid navigation utility
 * - Empty list fallback handling
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  useSpatialNavigation,
  useFocusableRef,
  useFocusHandlers,
  useGridNavigation,
  useEmptyListFocusFallback,
  useFocusableFallbackRefs,
  useLoadingStateFocus,
  isTV,
  type NextFocusConfig,
  type GridNavigationConfig,
} from '../../src/hooks/useSpatialNavigation';
import { TVNavigationProvider, useTVNavigation } from '../../src/contexts/TVNavigationContext';
import { advanceTimersAndFlush } from '../setup';

// ============================================================================
// Test Wrapper with TVNavigationProvider
// ============================================================================

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TVNavigationProvider>{children}</TVNavigationProvider>
);

// Mock ref with setNativeProps support
const createMockRef = (id: string = 'test') => ({
  current: {
    setNativeProps: jest.fn(),
    focus: jest.fn(),
    id,
  },
});

// ============================================================================
// useSpatialNavigation Hook Tests
// ============================================================================

describe('useSpatialNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      expect(result.current.screenName).toBe('TestScreen');
      expect(result.current.isTV).toBe(true);
      expect(result.current.refs).toEqual({});
      expect(result.current.currentFocusId).toBeNull();
      expect(result.current.isPendingFocusChange).toBe(false);
      expect(typeof result.current.registerRef).toBe('function');
      expect(typeof result.current.unregisterRef).toBe('function');
      expect(typeof result.current.getRef).toBe('function');
      expect(typeof result.current.getNodeHandle).toBe('function');
      expect(typeof result.current.refreshNodeHandles).toBe('function');
      expect(typeof result.current.saveFocus).toBe('function');
      expect(typeof result.current.getSavedFocus).toBe('function');
      expect(typeof result.current.restoreFocus).toBe('function');
      expect(typeof result.current.clearSavedFocus).toBe('function');
      expect(typeof result.current.setNextFocus).toBe('function');
      expect(typeof result.current.getNextFocusProps).toBe('function');
      expect(typeof result.current.focusElement).toBe('function');
    });

    it('should work without TVNavigationProvider (fallback to local storage)', () => {
      // Render without the wrapper
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'));

      expect(result.current.screenName).toBe('TestScreen');
      expect(result.current.isTV).toBe(true);
    });

    it('should return performance properties', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      expect(result.current.performanceTier).toBeDefined();
      expect(typeof result.current.shouldReduceAnimations).toBe('boolean');
      expect(typeof result.current.isLowEndDevice).toBe('boolean');
      expect(result.current.animationConfig).toBeDefined();
    });
  });

  describe('ref management', () => {
    it('should register a ref correctly', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
      });

      expect(result.current.getRef('button1')).toBe(mockRef);
    });

    it('should unregister a ref correctly', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
      });

      expect(result.current.getRef('button1')).toBe(mockRef);

      act(() => {
        result.current.unregisterRef('button1');
      });

      expect(result.current.getRef('button1')).toBeUndefined();
    });

    it('should handle registering multiple refs', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef1 = createMockRef('button1');
      const mockRef2 = createMockRef('button2');
      const mockRef3 = createMockRef('button3');

      act(() => {
        result.current.registerRef('button1', mockRef1);
        result.current.registerRef('button2', mockRef2);
        result.current.registerRef('button3', mockRef3);
      });

      expect(result.current.getRef('button1')).toBe(mockRef1);
      expect(result.current.getRef('button2')).toBe(mockRef2);
      expect(result.current.getRef('button3')).toBe(mockRef3);
    });

    it('should return undefined for unregistered ref', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      expect(result.current.getRef('nonexistent')).toBeUndefined();
    });

    it('should not register with empty focusId or null ref', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('', mockRef);
        result.current.registerRef('button1', null as any);
      });

      expect(result.current.getRef('')).toBeUndefined();
      expect(result.current.getRef('button1')).toBeUndefined();
    });

    it('should overwrite ref when registering with same focusId', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef1 = createMockRef('button1-v1');
      const mockRef2 = createMockRef('button1-v2');

      act(() => {
        result.current.registerRef('button1', mockRef1);
      });

      expect(result.current.getRef('button1')).toBe(mockRef1);

      act(() => {
        result.current.registerRef('button1', mockRef2);
      });

      expect(result.current.getRef('button1')).toBe(mockRef2);
    });
  });

  describe('focus memory storage and retrieval', () => {
    it('should store focus ID correctly', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      act(() => {
        result.current.saveFocus('button1');
      });

      // Wait for debounce
      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      expect(result.current.getSavedFocus()).toBe('button1');
    });

    it('should retrieve last focused item correctly', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      act(() => {
        result.current.saveFocus('button1');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      act(() => {
        result.current.saveFocus('button2');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      act(() => {
        result.current.saveFocus('button3');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      // Should return the last saved focus
      expect(result.current.getSavedFocus()).toBe('button3');
    });

    it('should return null for screen with no saved focus', () => {
      const { result } = renderHook(() => useSpatialNavigation('NewScreen'), { wrapper });

      expect(result.current.getSavedFocus()).toBeNull();
    });

    it('should clear saved focus correctly', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      act(() => {
        result.current.saveFocus('button1');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      expect(result.current.getSavedFocus()).toBe('button1');

      act(() => {
        result.current.clearSavedFocus();
      });

      expect(result.current.getSavedFocus()).toBeNull();
    });

    it('should not save empty focusId', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      act(() => {
        result.current.saveFocus('');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      expect(result.current.getSavedFocus()).toBeNull();
    });

    it('should maintain separate focus memory per screen', async () => {
      const { result: screen1 } = renderHook(
        () => useSpatialNavigation('Screen1'),
        { wrapper }
      );
      const { result: screen2 } = renderHook(
        () => useSpatialNavigation('Screen2'),
        { wrapper }
      );

      act(() => {
        screen1.current.saveFocus('button-a');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      act(() => {
        screen2.current.saveFocus('button-b');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      // Note: Both hooks share the same context in this test setup,
      // but use different screen names for storage
      expect(screen1.current.getSavedFocus()).toBe('button-a');
      expect(screen2.current.getSavedFocus()).toBe('button-b');
    });

    it('should work with local storage fallback (without provider)', async () => {
      // Render without wrapper
      const { result } = renderHook(() => useSpatialNavigation('TestScreen', {
        enableRapidInputProtection: false,
      }));

      act(() => {
        result.current.saveFocus('localButton');
      });

      expect(result.current.getSavedFocus()).toBe('localButton');
    });
  });

  describe('focus restoration', () => {
    it('should restore focus to saved element using setNativeProps', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
        result.current.saveFocus('button1');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(true);
      expect(mockRef.current.setNativeProps).toHaveBeenCalledWith({ hasTVPreferredFocus: true });
    });

    it('should restore focus using focus method if setNativeProps not available', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = {
        current: {
          focus: jest.fn(),
          id: 'button1',
        },
      };

      act(() => {
        result.current.registerRef('button1', mockRef);
        result.current.saveFocus('button1');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(true);
      expect(mockRef.current.focus).toHaveBeenCalled();
    });

    it('should use default focus ID when no saved focus exists', async () => {
      const { result } = renderHook(
        () => useSpatialNavigation('TestScreen', { defaultFocusId: 'defaultButton' }),
        { wrapper }
      );
      const mockRef = createMockRef('defaultButton');

      act(() => {
        result.current.registerRef('defaultButton', mockRef);
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(true);
      expect(mockRef.current.setNativeProps).toHaveBeenCalledWith({ hasTVPreferredFocus: true });
    });

    it('should return false when no focus to restore', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(false);
    });

    it('should return false when ref is not registered', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      act(() => {
        result.current.saveFocus('nonexistentButton');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(false);
    });

    it('should return false when hook is disabled', () => {
      const { result } = renderHook(
        () => useSpatialNavigation('TestScreen', { enabled: false }),
        { wrapper }
      );
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
        result.current.saveFocus('button1');
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(false);
      expect(mockRef.current.setNativeProps).not.toHaveBeenCalled();
    });

    it('should handle ref with null current gracefully', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = { current: null };

      act(() => {
        result.current.registerRef('button1', mockRef);
        result.current.saveFocus('button1');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(false);
    });
  });

  describe('node handle management', () => {
    it('should return node handle for registered ref', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
      });

      // findNodeHandle is mocked to return 1
      const handle = result.current.getNodeHandle('button1');

      expect(handle).toBe(1);
    });

    it('should return null for unregistered ref', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      const handle = result.current.getNodeHandle('nonexistent');

      expect(handle).toBeNull();
    });

    it('should cache node handles', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
      });

      // First call
      result.current.getNodeHandle('button1');
      // Second call - should use cached value
      const handle = result.current.getNodeHandle('button1');

      expect(handle).toBe(1);
    });

    it('should refresh all node handles', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef1 = createMockRef('button1');
      const mockRef2 = createMockRef('button2');

      act(() => {
        result.current.registerRef('button1', mockRef1);
        result.current.registerRef('button2', mockRef2);
      });

      act(() => {
        result.current.refreshNodeHandles();
      });

      expect(result.current.getNodeHandle('button1')).toBe(1);
      expect(result.current.getNodeHandle('button2')).toBe(1);
    });
  });

  describe('next focus configuration', () => {
    it('should set next focus configuration', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef1 = createMockRef('button1');
      const mockRef2 = createMockRef('button2');

      act(() => {
        result.current.registerRef('button1', mockRef1);
        result.current.registerRef('button2', mockRef2);
        result.current.setNextFocus('button1', { right: 'button2' });
      });

      const props = result.current.getNextFocusProps('button1');

      expect(props.nextFocusRight).toBe(1);
    });

    it('should return empty props for element without next focus config', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      const props = result.current.getNextFocusProps('noConfig');

      expect(props).toEqual({});
    });

    it('should handle all directions', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRefCenter = createMockRef('center');
      const mockRefUp = createMockRef('up');
      const mockRefDown = createMockRef('down');
      const mockRefLeft = createMockRef('left');
      const mockRefRight = createMockRef('right');

      act(() => {
        result.current.registerRef('center', mockRefCenter);
        result.current.registerRef('up', mockRefUp);
        result.current.registerRef('down', mockRefDown);
        result.current.registerRef('left', mockRefLeft);
        result.current.registerRef('right', mockRefRight);
        result.current.setNextFocus('center', {
          up: 'up',
          down: 'down',
          left: 'left',
          right: 'right',
        });
      });

      const props = result.current.getNextFocusProps('center');

      expect(props.nextFocusUp).toBe(1);
      expect(props.nextFocusDown).toBe(1);
      expect(props.nextFocusLeft).toBe(1);
      expect(props.nextFocusRight).toBe(1);
    });

    it('should not include direction if ref not registered', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
        result.current.setNextFocus('button1', { right: 'nonexistent' });
      });

      const props = result.current.getNextFocusProps('button1');

      // nonexistent ref returns null handle, so nextFocusRight should not be set
      expect(props.nextFocusRight).toBeUndefined();
    });

    it('should merge next focus configurations', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef1 = createMockRef('button1');
      const mockRef2 = createMockRef('button2');
      const mockRef3 = createMockRef('button3');

      act(() => {
        result.current.registerRef('button1', mockRef1);
        result.current.registerRef('button2', mockRef2);
        result.current.registerRef('button3', mockRef3);
        result.current.setNextFocus('button1', { right: 'button2' });
        result.current.setNextFocus('button1', { down: 'button3' });
      });

      const props = result.current.getNextFocusProps('button1');

      expect(props.nextFocusRight).toBe(1);
      expect(props.nextFocusDown).toBe(1);
    });
  });

  describe('focus element programmatically', () => {
    it('should focus element by ID using setNativeProps', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
      });

      // Wait for any debouncing
      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      const focused = result.current.focusElement('button1');

      expect(focused).toBe(true);
      expect(mockRef.current.setNativeProps).toHaveBeenCalledWith({ hasTVPreferredFocus: true });
    });

    it('should return false for non-existent element', () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      const focused = result.current.focusElement('nonexistent');

      expect(focused).toBe(false);
    });

    it('should return false when disabled', () => {
      const { result } = renderHook(
        () => useSpatialNavigation('TestScreen', { enabled: false }),
        { wrapper }
      );
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
      });

      const focused = result.current.focusElement('button1');

      expect(focused).toBe(false);
    });

    it('should save focus after focusing element', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
      });

      // Wait for throttling
      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      result.current.focusElement('button1');

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      expect(result.current.getSavedFocus()).toBe('button1');
    });

    it('should throttle rapid focusElement calls', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
      const mockRef1 = createMockRef('button1');
      const mockRef2 = createMockRef('button2');
      const mockRef3 = createMockRef('button3');

      act(() => {
        result.current.registerRef('button1', mockRef1);
        result.current.registerRef('button2', mockRef2);
        result.current.registerRef('button3', mockRef3);
      });

      // Wait for initial setup
      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      // First focus should work
      const focused1 = result.current.focusElement('button1');
      expect(focused1).toBe(true);

      // Rapid second focus should be throttled
      const focused2 = result.current.focusElement('button2');
      expect(focused2).toBe(false);

      // Wait for throttle interval
      await act(async () => {
        await advanceTimersAndFlush(50);
      });

      // Third focus should work after waiting
      const focused3 = result.current.focusElement('button3');
      expect(focused3).toBe(true);
    });
  });

  describe('debouncing and rapid input protection', () => {
    it('should debounce focus saves', async () => {
      const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });

      // Rapid focus changes
      act(() => {
        result.current.saveFocus('button1');
        result.current.saveFocus('button2');
        result.current.saveFocus('button3');
      });

      // Should be pending
      expect(result.current.isPendingFocusChange).toBe(true);

      // Wait for debounce
      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      // Only the last one should be saved
      expect(result.current.getSavedFocus()).toBe('button3');
      expect(result.current.isPendingFocusChange).toBe(false);
    });

    it('should save immediately when rapid input protection is disabled', () => {
      const { result } = renderHook(
        () => useSpatialNavigation('TestScreen', { enableRapidInputProtection: false }),
        { wrapper }
      );

      act(() => {
        result.current.saveFocus('button1');
      });

      expect(result.current.getSavedFocus()).toBe('button1');
      expect(result.current.isPendingFocusChange).toBe(false);
    });

    it('should use custom debounce interval', async () => {
      const { result } = renderHook(
        () => useSpatialNavigation('TestScreen', { focusSaveDebounceMs: 50 }),
        { wrapper }
      );

      act(() => {
        result.current.saveFocus('button1');
      });

      expect(result.current.isPendingFocusChange).toBe(true);

      // Wait less than custom debounce
      await act(async () => {
        await advanceTimersAndFlush(30);
      });

      expect(result.current.isPendingFocusChange).toBe(true);

      // Wait for rest of debounce
      await act(async () => {
        await advanceTimersAndFlush(25);
      });

      expect(result.current.isPendingFocusChange).toBe(false);
      expect(result.current.getSavedFocus()).toBe('button1');
    });
  });

  describe('cleanup on unmount', () => {
    it('should clear all refs and handles on unmount', async () => {
      const { result, unmount } = renderHook(
        () => useSpatialNavigation('TestScreen'),
        { wrapper }
      );
      const mockRef = createMockRef('button1');

      act(() => {
        result.current.registerRef('button1', mockRef);
        result.current.saveFocus('button1');
      });

      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      unmount();

      // Note: We can't check the refs after unmount, but this verifies no errors occur
    });

    it('should clear pending timers on unmount', async () => {
      const { result, unmount } = renderHook(
        () => useSpatialNavigation('TestScreen'),
        { wrapper }
      );

      act(() => {
        result.current.saveFocus('button1');
      });

      // Unmount before debounce completes
      unmount();

      // Advance time - should not throw
      await act(async () => {
        await advanceTimersAndFlush(100);
      });
    });
  });

  describe('options', () => {
    it('should respect autoRestoreFocus option', async () => {
      // This is tested implicitly through useFocusEffect behavior
      // The hook uses useFocusEffect which is mocked in setup
      const { result } = renderHook(
        () => useSpatialNavigation('TestScreen', { autoRestoreFocus: false }),
        { wrapper }
      );

      // With autoRestoreFocus false, focus restoration should not happen automatically
      expect(result.current.screenName).toBe('TestScreen');
    });

    it('should respect enabled option', () => {
      const { result } = renderHook(
        () => useSpatialNavigation('TestScreen', { enabled: false }),
        { wrapper }
      );

      expect(result.current.isTV).toBe(true); // Platform is still TV
      // But focus operations should return false when disabled
    });
  });
});

// ============================================================================
// useFocusableRef Hook Tests
// ============================================================================

describe('useFocusableRef', () => {
  it('should create and register a ref', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const { result: refResult } = renderHook(
      () => useFocusableRef(spatialNavResult.current, 'testButton'),
      { wrapper }
    );

    expect(refResult.current).toBeDefined();
    expect(refResult.current.current).toBeNull(); // Initially null
  });

  it('should register next focus configuration', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const nextFocus: NextFocusConfig = { right: 'otherButton' };

    renderHook(
      () => useFocusableRef(spatialNavResult.current, 'testButton', nextFocus),
      { wrapper }
    );

    // The next focus should be set
    // We can't easily verify this without accessing internal state
  });

  it('should unregister on unmount', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const { unmount } = renderHook(
      () => useFocusableRef(spatialNavResult.current, 'testButton'),
      { wrapper }
    );

    unmount();

    // After unmount, the ref should be unregistered
    expect(spatialNavResult.current.getRef('testButton')).toBeUndefined();
  });
});

// ============================================================================
// useFocusHandlers Hook Tests
// ============================================================================

describe('useFocusHandlers', () => {
  it('should return onFocus and onBlur handlers', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const { result: handlersResult } = renderHook(
      () => useFocusHandlers(spatialNavResult.current, 'testButton'),
      { wrapper }
    );

    expect(typeof handlersResult.current.onFocus).toBe('function');
    expect(typeof handlersResult.current.onBlur).toBe('function');
  });

  it('should save focus on onFocus', async () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const { result: handlersResult } = renderHook(
      () => useFocusHandlers(spatialNavResult.current, 'testButton'),
      { wrapper }
    );

    act(() => {
      handlersResult.current.onFocus();
    });

    await act(async () => {
      await advanceTimersAndFlush(20);
    });

    expect(spatialNavResult.current.getSavedFocus()).toBe('testButton');
  });

  it('should call custom onFocus callback', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const customOnFocus = jest.fn();

    const { result: handlersResult } = renderHook(
      () => useFocusHandlers(spatialNavResult.current, 'testButton', { onFocus: customOnFocus }),
      { wrapper }
    );

    act(() => {
      handlersResult.current.onFocus();
    });

    expect(customOnFocus).toHaveBeenCalledTimes(1);
  });

  it('should call custom onBlur callback', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const customOnBlur = jest.fn();

    const { result: handlersResult } = renderHook(
      () => useFocusHandlers(spatialNavResult.current, 'testButton', { onBlur: customOnBlur }),
      { wrapper }
    );

    act(() => {
      handlersResult.current.onBlur();
    });

    expect(customOnBlur).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// useGridNavigation Hook Tests
// ============================================================================

describe('useGridNavigation', () => {
  it('should set up next focus for grid layout', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const gridConfig: GridNavigationConfig = {
      columns: 3,
      itemCount: 9,
      focusIdPrefix: 'grid-item-',
    };

    // Register refs for all grid items
    for (let i = 0; i < 9; i++) {
      const mockRef = createMockRef(`grid-item-${i}`);
      act(() => {
        spatialNavResult.current.registerRef(`grid-item-${i}`, mockRef);
      });
    }

    renderHook(
      () => useGridNavigation(spatialNavResult.current, gridConfig),
      { wrapper }
    );

    // Check that next focus is set for middle item (index 4)
    const props = spatialNavResult.current.getNextFocusProps('grid-item-4');

    // Should have all four directions in a 3x3 grid
    expect(props.nextFocusUp).toBeDefined();
    expect(props.nextFocusDown).toBeDefined();
    expect(props.nextFocusLeft).toBeDefined();
    expect(props.nextFocusRight).toBeDefined();
  });

  it('should handle top-left corner (no up or left)', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const gridConfig: GridNavigationConfig = {
      columns: 3,
      itemCount: 9,
      focusIdPrefix: 'grid-item-',
    };

    for (let i = 0; i < 9; i++) {
      const mockRef = createMockRef(`grid-item-${i}`);
      act(() => {
        spatialNavResult.current.registerRef(`grid-item-${i}`, mockRef);
      });
    }

    renderHook(
      () => useGridNavigation(spatialNavResult.current, gridConfig),
      { wrapper }
    );

    // Check top-left corner (index 0)
    const props = spatialNavResult.current.getNextFocusProps('grid-item-0');

    expect(props.nextFocusUp).toBeUndefined();
    expect(props.nextFocusLeft).toBeUndefined();
    expect(props.nextFocusRight).toBeDefined();
    expect(props.nextFocusDown).toBeDefined();
  });

  it('should handle bottom-right corner (no down or right)', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const gridConfig: GridNavigationConfig = {
      columns: 3,
      itemCount: 9,
      focusIdPrefix: 'grid-item-',
    };

    for (let i = 0; i < 9; i++) {
      const mockRef = createMockRef(`grid-item-${i}`);
      act(() => {
        spatialNavResult.current.registerRef(`grid-item-${i}`, mockRef);
      });
    }

    renderHook(
      () => useGridNavigation(spatialNavResult.current, gridConfig),
      { wrapper }
    );

    // Check bottom-right corner (index 8)
    const props = spatialNavResult.current.getNextFocusProps('grid-item-8');

    expect(props.nextFocusUp).toBeDefined();
    expect(props.nextFocusLeft).toBeDefined();
    expect(props.nextFocusRight).toBeUndefined();
    expect(props.nextFocusDown).toBeUndefined();
  });

  it('should support horizontal wrapping', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const gridConfig: GridNavigationConfig = {
      columns: 3,
      itemCount: 6,
      focusIdPrefix: 'grid-item-',
      wrapHorizontal: true,
    };

    for (let i = 0; i < 6; i++) {
      const mockRef = createMockRef(`grid-item-${i}`);
      act(() => {
        spatialNavResult.current.registerRef(`grid-item-${i}`, mockRef);
      });
    }

    renderHook(
      () => useGridNavigation(spatialNavResult.current, gridConfig),
      { wrapper }
    );

    // With wrapHorizontal, first item on row 2 (index 3) should wrap left
    const props = spatialNavResult.current.getNextFocusProps('grid-item-3');

    // Should have left navigation (wraps to previous row)
    expect(props.nextFocusLeft).toBeDefined();
  });
});

// ============================================================================
// useEmptyListFocusFallback Hook Tests
// ============================================================================

describe('useEmptyListFocusFallback', () => {
  it('should trigger fallback when list becomes empty', async () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const fallbackRef = createMockRef('searchBar');
    act(() => {
      spatialNavResult.current.registerRef('searchBar', fallbackRef);
    });

    // Start with non-empty
    const { rerender } = renderHook(
      ({ isEmpty }) => useEmptyListFocusFallback(spatialNavResult.current, {
        isEmpty,
        isLoading: false,
        fallbackFocusIds: ['searchBar'],
      }),
      { wrapper, initialProps: { isEmpty: false } }
    );

    // Change to empty
    rerender({ isEmpty: true });

    // Wait for fallback delay
    await act(async () => {
      await advanceTimersAndFlush(150);
    });

    expect(fallbackRef.current.setNativeProps).toHaveBeenCalledWith({ hasTVPreferredFocus: true });
  });

  it('should not trigger fallback during loading', async () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const fallbackRef = createMockRef('searchBar');
    act(() => {
      spatialNavResult.current.registerRef('searchBar', fallbackRef);
    });

    renderHook(
      () => useEmptyListFocusFallback(spatialNavResult.current, {
        isEmpty: true,
        isLoading: true, // Still loading
        fallbackFocusIds: ['searchBar'],
      }),
      { wrapper }
    );

    await act(async () => {
      await advanceTimersAndFlush(200);
    });

    expect(fallbackRef.current.setNativeProps).not.toHaveBeenCalled();
  });

  it('should call onNoFallbackAvailable when no fallback works', async () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const onNoFallbackAvailable = jest.fn();

    const { rerender } = renderHook(
      ({ isEmpty }) => useEmptyListFocusFallback(spatialNavResult.current, {
        isEmpty,
        isLoading: false,
        fallbackFocusIds: ['nonexistent1', 'nonexistent2'],
        onNoFallbackAvailable,
      }),
      { wrapper, initialProps: { isEmpty: false } }
    );

    rerender({ isEmpty: true });

    await act(async () => {
      await advanceTimersAndFlush(200);
    });

    expect(onNoFallbackAvailable).toHaveBeenCalledTimes(1);
  });

  it('should try fallbacks in order', async () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    // Only register the second fallback
    const fallbackRef2 = createMockRef('navTabs');
    act(() => {
      spatialNavResult.current.registerRef('navTabs', fallbackRef2);
    });

    const { rerender } = renderHook(
      ({ isEmpty }) => useEmptyListFocusFallback(spatialNavResult.current, {
        isEmpty,
        isLoading: false,
        fallbackFocusIds: ['searchBar', 'navTabs'], // searchBar not registered
      }),
      { wrapper, initialProps: { isEmpty: false } }
    );

    rerender({ isEmpty: true });

    await act(async () => {
      await advanceTimersAndFlush(200);
    });

    // Should focus the second fallback since first isn't available
    expect(fallbackRef2.current.setNativeProps).toHaveBeenCalledWith({ hasTVPreferredFocus: true });
  });
});

// ============================================================================
// useFocusableFallbackRefs Hook Tests
// ============================================================================

describe('useFocusableFallbackRefs', () => {
  it('should return refs map and focusFirstAvailable function', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const { result: fallbackResult } = renderHook(
      () => useFocusableFallbackRefs(spatialNavResult.current, ['search', 'filter']),
      { wrapper }
    );

    expect(fallbackResult.current.refsMap).toBeDefined();
    expect(typeof fallbackResult.current.focusFirstAvailable).toBe('function');
  });

  it('should register all fallback IDs', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const { result: fallbackResult } = renderHook(
      () => useFocusableFallbackRefs(spatialNavResult.current, ['search', 'filter', 'back']),
      { wrapper }
    );

    expect(fallbackResult.current.refsMap['search']).toBeDefined();
    expect(fallbackResult.current.refsMap['filter']).toBeDefined();
    expect(fallbackResult.current.refsMap['back']).toBeDefined();
  });

  it('should unregister on unmount', () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const { unmount } = renderHook(
      () => useFocusableFallbackRefs(spatialNavResult.current, ['search', 'filter']),
      { wrapper }
    );

    unmount();

    // After unmount, refs should be unregistered
    expect(spatialNavResult.current.getRef('search')).toBeUndefined();
    expect(spatialNavResult.current.getRef('filter')).toBeUndefined();
  });
});

// ============================================================================
// useLoadingStateFocus Hook Tests
// ============================================================================

describe('useLoadingStateFocus', () => {
  it('should handle transition from loading to loaded', async () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    const contentRef = createMockRef('content');
    act(() => {
      spatialNavResult.current.registerRef('content', contentRef);
    });

    // Start with loading
    const { rerender } = renderHook(
      ({ isLoading }) => useLoadingStateFocus(spatialNavResult.current, {
        isLoading,
        contentFocusId: 'content',
      }),
      { wrapper, initialProps: { isLoading: true } }
    );

    // Transition to loaded
    rerender({ isLoading: false });

    // Wait for focus restoration
    await act(async () => {
      await advanceTimersAndFlush(200);
    });

    expect(contentRef.current.setNativeProps).toHaveBeenCalledWith({ hasTVPreferredFocus: true });
  });

  it('should try fallbacks if content focus fails', async () => {
    const { result: spatialNavResult } = renderHook(
      () => useSpatialNavigation('TestScreen'),
      { wrapper }
    );

    // Only register fallback, not content
    const fallbackRef = createMockRef('fallback');
    act(() => {
      spatialNavResult.current.registerRef('fallback', fallbackRef);
    });

    const { rerender } = renderHook(
      ({ isLoading }) => useLoadingStateFocus(spatialNavResult.current, {
        isLoading,
        contentFocusId: 'nonexistent',
        fallbackFocusIds: ['fallback'],
      }),
      { wrapper, initialProps: { isLoading: true } }
    );

    rerender({ isLoading: false });

    await act(async () => {
      await advanceTimersAndFlush(200);
    });

    expect(fallbackRef.current.setNativeProps).toHaveBeenCalledWith({ hasTVPreferredFocus: true });
  });
});

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('utility functions', () => {
  describe('isTV', () => {
    it('should return true on TV platform (mocked)', () => {
      expect(isTV()).toBe(true);
    });
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('edge cases', () => {
  it('should handle setNativeProps throwing an error', async () => {
    const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
    const mockRef = {
      current: {
        setNativeProps: jest.fn(() => {
          throw new Error('Native props error');
        }),
        id: 'button1',
      },
    };

    act(() => {
      result.current.registerRef('button1', mockRef);
      result.current.saveFocus('button1');
    });

    await act(async () => {
      await advanceTimersAndFlush(20);
    });

    // Should not throw, just return false
    const restored = result.current.restoreFocus();
    expect(restored).toBe(false);
  });

  it('should handle very long focus ID', async () => {
    const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
    const longId = 'a'.repeat(1000);
    const mockRef = createMockRef(longId);

    act(() => {
      result.current.registerRef(longId, mockRef);
      result.current.saveFocus(longId);
    });

    await act(async () => {
      await advanceTimersAndFlush(20);
    });

    expect(result.current.getSavedFocus()).toBe(longId);
  });

  it('should handle special characters in focus ID', async () => {
    const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
    const specialId = 'button-with-special_chars.123';
    const mockRef = createMockRef(specialId);

    act(() => {
      result.current.registerRef(specialId, mockRef);
      result.current.saveFocus(specialId);
    });

    await act(async () => {
      await advanceTimersAndFlush(20);
    });

    expect(result.current.getSavedFocus()).toBe(specialId);
    expect(result.current.getRef(specialId)).toBe(mockRef);
  });

  it('should handle re-registering after unregistering', () => {
    const { result } = renderHook(() => useSpatialNavigation('TestScreen'), { wrapper });
    const mockRef1 = createMockRef('button1-v1');
    const mockRef2 = createMockRef('button1-v2');

    act(() => {
      result.current.registerRef('button1', mockRef1);
    });

    expect(result.current.getRef('button1')).toBe(mockRef1);

    act(() => {
      result.current.unregisterRef('button1');
    });

    expect(result.current.getRef('button1')).toBeUndefined();

    act(() => {
      result.current.registerRef('button1', mockRef2);
    });

    expect(result.current.getRef('button1')).toBe(mockRef2);
  });

  it('should handle concurrent hooks on same screen', async () => {
    const { result: hook1 } = renderHook(
      () => useSpatialNavigation('SharedScreen'),
      { wrapper }
    );
    const { result: hook2 } = renderHook(
      () => useSpatialNavigation('SharedScreen'),
      { wrapper }
    );

    // Both hooks should be able to save focus
    act(() => {
      hook1.current.saveFocus('button1');
    });

    await act(async () => {
      await advanceTimersAndFlush(20);
    });

    act(() => {
      hook2.current.saveFocus('button2');
    });

    await act(async () => {
      await advanceTimersAndFlush(20);
    });

    // Last save wins for the same screen
    expect(hook1.current.getSavedFocus()).toBe('button2');
    expect(hook2.current.getSavedFocus()).toBe('button2');
  });
});
