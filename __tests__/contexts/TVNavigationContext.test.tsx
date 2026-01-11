/**
 * Unit Tests for TVNavigationContext
 *
 * Tests context state management including:
 * - Context provides correct initial state
 * - Focus history actions (push, pop, clear)
 * - Focus memory per screen (set, get, clear)
 * - Voice search state management
 * - Context menu state management
 * - Concurrent context menus handling
 * - Current focus tracking
 * - Error handling and edge cases
 */

import React, { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  TVNavigationProvider,
  useTVNavigation,
  useTVNavigationOptional,
  FocusHistoryEntry,
  ContextMenuItem,
  VoiceUnavailableReason,
} from '../../src/contexts/TVNavigationContext';

// ============================================================================
// Test Wrapper
// ============================================================================

const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => (
    <TVNavigationProvider>{children}</TVNavigationProvider>
  );
};

// ============================================================================
// useTVNavigation Hook Tests
// ============================================================================

describe('useTVNavigation', () => {
  it('should throw error when used outside of provider', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTVNavigation());
    }).toThrow('useTVNavigation must be used within a TVNavigationProvider');

    consoleSpy.mockRestore();
  });

  it('should return context value when used within provider', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(result.current.focusHistory).toBeDefined();
    expect(result.current.focusMemory).toBeDefined();
    expect(result.current.voiceSearch).toBeDefined();
    expect(result.current.contextMenu).toBeDefined();
  });
});

describe('useTVNavigationOptional', () => {
  it('should return null when used outside of provider', () => {
    const { result } = renderHook(() => useTVNavigationOptional());

    expect(result.current).toBeNull();
  });

  it('should return context value when used within provider', () => {
    const { result } = renderHook(() => useTVNavigationOptional(), {
      wrapper: createWrapper(),
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.focusHistory).toBeDefined();
  });
});

// ============================================================================
// Initial State Tests
// ============================================================================

describe('TVNavigationContext initial state', () => {
  it('should have empty focus history', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.focusHistory).toEqual([]);
  });

  it('should have empty focus memory', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.focusMemory).toEqual({});
  });

  it('should have correct initial voice search state', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.voiceSearch.isOpen).toBe(false);
    expect(result.current.voiceSearch.isListening).toBe(false);
    expect(result.current.voiceSearch.query).toBe('');
    expect(result.current.voiceSearch.isAvailable).toBe(true); // Platform.isTV is mocked as true
    expect(result.current.voiceSearch.unavailableReason).toBeNull();
    expect(result.current.voiceSearch.error).toBeNull();
  });

  it('should have correct initial context menu state', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.contextMenu.isOpen).toBe(false);
    expect(result.current.contextMenu.position).toBeNull();
    expect(result.current.contextMenu.targetId).toBeNull();
    expect(result.current.contextMenu.items).toEqual([]);
    expect(result.current.contextMenu.title).toBeUndefined();
  });

  it('should detect TV platform', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isTV).toBe(true);
  });

  it('should have null current focus id', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.currentFocusId).toBeNull();
  });
});

// ============================================================================
// Focus History Tests
// ============================================================================

describe('Focus History', () => {
  describe('pushFocusHistory', () => {
    it('should add entry to focus history', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.pushFocusHistory({
          focusId: 'button-1',
          screenName: 'HomeScreen',
        });
      });

      expect(result.current.focusHistory).toHaveLength(1);
      expect(result.current.focusHistory[0].focusId).toBe('button-1');
      expect(result.current.focusHistory[0].screenName).toBe('HomeScreen');
      expect(result.current.focusHistory[0].timestamp).toBeDefined();
    });

    it('should add multiple entries to focus history', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.pushFocusHistory({ focusId: 'button-1', screenName: 'HomeScreen' });
        result.current.pushFocusHistory({ focusId: 'button-2', screenName: 'HomeScreen' });
        result.current.pushFocusHistory({ focusId: 'card-1', screenName: 'DetailsScreen' });
      });

      expect(result.current.focusHistory).toHaveLength(3);
      expect(result.current.focusHistory[0].focusId).toBe('button-1');
      expect(result.current.focusHistory[1].focusId).toBe('button-2');
      expect(result.current.focusHistory[2].focusId).toBe('card-1');
    });

    it('should add timestamp to each entry', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const beforeTimestamp = Date.now();

      act(() => {
        result.current.pushFocusHistory({
          focusId: 'button-1',
          screenName: 'HomeScreen',
        });
      });

      const afterTimestamp = Date.now();

      expect(result.current.focusHistory[0].timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(result.current.focusHistory[0].timestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });

  describe('popFocusHistory', () => {
    it('should remove and return last entry from focus history', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.pushFocusHistory({ focusId: 'button-1', screenName: 'HomeScreen' });
        result.current.pushFocusHistory({ focusId: 'button-2', screenName: 'HomeScreen' });
      });

      let poppedEntry: FocusHistoryEntry | undefined;
      act(() => {
        poppedEntry = result.current.popFocusHistory();
      });

      expect(poppedEntry?.focusId).toBe('button-2');
      expect(result.current.focusHistory).toHaveLength(1);
      expect(result.current.focusHistory[0].focusId).toBe('button-1');
    });

    it('should return undefined when history is empty', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      let poppedEntry: FocusHistoryEntry | undefined;
      act(() => {
        poppedEntry = result.current.popFocusHistory();
      });

      expect(poppedEntry).toBeUndefined();
      expect(result.current.focusHistory).toHaveLength(0);
    });

    it('should handle popping all entries', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.pushFocusHistory({ focusId: 'button-1', screenName: 'HomeScreen' });
        result.current.pushFocusHistory({ focusId: 'button-2', screenName: 'HomeScreen' });
      });

      act(() => {
        result.current.popFocusHistory();
        result.current.popFocusHistory();
      });

      expect(result.current.focusHistory).toHaveLength(0);

      // Pop again should return undefined
      let poppedEntry: FocusHistoryEntry | undefined;
      act(() => {
        poppedEntry = result.current.popFocusHistory();
      });

      expect(poppedEntry).toBeUndefined();
    });
  });

  describe('clearFocusHistory', () => {
    it('should clear all focus history', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.pushFocusHistory({ focusId: 'button-1', screenName: 'HomeScreen' });
        result.current.pushFocusHistory({ focusId: 'button-2', screenName: 'HomeScreen' });
        result.current.pushFocusHistory({ focusId: 'card-1', screenName: 'DetailsScreen' });
      });

      expect(result.current.focusHistory).toHaveLength(3);

      act(() => {
        result.current.clearFocusHistory();
      });

      expect(result.current.focusHistory).toHaveLength(0);
    });

    it('should handle clearing empty history', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearFocusHistory();
      });

      expect(result.current.focusHistory).toHaveLength(0);
    });
  });
});

// ============================================================================
// Focus Memory Tests
// ============================================================================

describe('Focus Memory', () => {
  describe('setScreenFocus', () => {
    it('should save focus for a screen', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScreenFocus('HomeScreen', 'card-5');
      });

      expect(result.current.focusMemory['HomeScreen']).toBe('card-5');
    });

    it('should save focus for multiple screens', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScreenFocus('HomeScreen', 'card-5');
        result.current.setScreenFocus('DetailsScreen', 'play-button');
        result.current.setScreenFocus('SearchScreen', 'search-input');
      });

      expect(result.current.focusMemory['HomeScreen']).toBe('card-5');
      expect(result.current.focusMemory['DetailsScreen']).toBe('play-button');
      expect(result.current.focusMemory['SearchScreen']).toBe('search-input');
    });

    it('should overwrite previous focus for same screen', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScreenFocus('HomeScreen', 'card-5');
      });

      expect(result.current.focusMemory['HomeScreen']).toBe('card-5');

      act(() => {
        result.current.setScreenFocus('HomeScreen', 'card-10');
      });

      expect(result.current.focusMemory['HomeScreen']).toBe('card-10');
    });
  });

  describe('getScreenFocus', () => {
    it('should retrieve saved focus for a screen', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScreenFocus('HomeScreen', 'card-5');
      });

      expect(result.current.getScreenFocus('HomeScreen')).toBe('card-5');
    });

    it('should return null for unknown screen', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.getScreenFocus('UnknownScreen')).toBeNull();
    });

    it('should return null for screen with cleared focus', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScreenFocus('HomeScreen', 'card-5');
        result.current.clearScreenFocus('HomeScreen');
      });

      expect(result.current.getScreenFocus('HomeScreen')).toBeNull();
    });
  });

  describe('clearScreenFocus', () => {
    it('should clear focus for a specific screen', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScreenFocus('HomeScreen', 'card-5');
        result.current.setScreenFocus('DetailsScreen', 'play-button');
      });

      act(() => {
        result.current.clearScreenFocus('HomeScreen');
      });

      expect(result.current.getScreenFocus('HomeScreen')).toBeNull();
      expect(result.current.getScreenFocus('DetailsScreen')).toBe('play-button');
    });

    it('should handle clearing non-existent screen focus', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearScreenFocus('UnknownScreen');
      });

      expect(result.current.focusMemory).toEqual({});
    });
  });

  describe('clearAllFocusMemory', () => {
    it('should clear all focus memory', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScreenFocus('HomeScreen', 'card-5');
        result.current.setScreenFocus('DetailsScreen', 'play-button');
        result.current.setScreenFocus('SearchScreen', 'search-input');
      });

      act(() => {
        result.current.clearAllFocusMemory();
      });

      expect(result.current.focusMemory).toEqual({});
      expect(result.current.getScreenFocus('HomeScreen')).toBeNull();
      expect(result.current.getScreenFocus('DetailsScreen')).toBeNull();
      expect(result.current.getScreenFocus('SearchScreen')).toBeNull();
    });

    it('should handle clearing empty focus memory', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearAllFocusMemory();
      });

      expect(result.current.focusMemory).toEqual({});
    });
  });
});

// ============================================================================
// Voice Search Tests
// ============================================================================

describe('Voice Search', () => {
  describe('openVoiceSearch', () => {
    it('should open voice search overlay', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openVoiceSearch();
      });

      expect(result.current.voiceSearch.isOpen).toBe(true);
      expect(result.current.voiceSearch.query).toBe('');
      expect(result.current.voiceSearch.error).toBeNull();
    });

    it('should clear previous query and error when opening', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      // Set up some state
      act(() => {
        result.current.setVoiceQuery('previous query');
        result.current.setVoiceError('previous error');
      });

      // Open voice search
      act(() => {
        result.current.openVoiceSearch();
      });

      expect(result.current.voiceSearch.isOpen).toBe(true);
      expect(result.current.voiceSearch.query).toBe('');
      expect(result.current.voiceSearch.error).toBeNull();
    });
  });

  describe('closeVoiceSearch', () => {
    it('should close voice search overlay', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openVoiceSearch();
      });

      expect(result.current.voiceSearch.isOpen).toBe(true);

      act(() => {
        result.current.closeVoiceSearch();
      });

      expect(result.current.voiceSearch.isOpen).toBe(false);
    });

    it('should reset all voice search state when closing', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openVoiceSearch();
        result.current.setVoiceListening(true);
        result.current.setVoiceQuery('test query');
        result.current.setVoiceError('test error');
      });

      act(() => {
        result.current.closeVoiceSearch();
      });

      expect(result.current.voiceSearch.isOpen).toBe(false);
      expect(result.current.voiceSearch.isListening).toBe(false);
      expect(result.current.voiceSearch.query).toBe('');
      expect(result.current.voiceSearch.error).toBeNull();
    });
  });

  describe('setVoiceListening', () => {
    it('should set listening state to true', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceListening(true);
      });

      expect(result.current.voiceSearch.isListening).toBe(true);
    });

    it('should set listening state to false', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceListening(true);
      });

      expect(result.current.voiceSearch.isListening).toBe(true);

      act(() => {
        result.current.setVoiceListening(false);
      });

      expect(result.current.voiceSearch.isListening).toBe(false);
    });
  });

  describe('setVoiceQuery', () => {
    it('should update voice query', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceQuery('search term');
      });

      expect(result.current.voiceSearch.query).toBe('search term');
    });

    it('should handle empty query', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceQuery('search term');
        result.current.setVoiceQuery('');
      });

      expect(result.current.voiceSearch.query).toBe('');
    });

    it('should handle special characters in query', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceQuery('特殊字符 & symbols!');
      });

      expect(result.current.voiceSearch.query).toBe('特殊字符 & symbols!');
    });
  });

  describe('setVoiceError', () => {
    it('should set error and stop listening', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceListening(true);
      });

      expect(result.current.voiceSearch.isListening).toBe(true);

      act(() => {
        result.current.setVoiceError('Voice recognition failed');
      });

      expect(result.current.voiceSearch.error).toBe('Voice recognition failed');
      expect(result.current.voiceSearch.isListening).toBe(false);
    });

    it('should clear error when set to null', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceError('Some error');
      });

      expect(result.current.voiceSearch.error).toBe('Some error');

      act(() => {
        result.current.setVoiceError(null);
      });

      expect(result.current.voiceSearch.error).toBeNull();
    });
  });

  describe('setVoiceAvailable', () => {
    it('should set voice availability to true and clear reason', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      // First set unavailable with reason
      act(() => {
        result.current.setVoiceUnavailableReason('hardware_unavailable');
      });

      expect(result.current.voiceSearch.isAvailable).toBe(false);
      expect(result.current.voiceSearch.unavailableReason).toBe('hardware_unavailable');

      // Now set available
      act(() => {
        result.current.setVoiceAvailable(true);
      });

      expect(result.current.voiceSearch.isAvailable).toBe(true);
      expect(result.current.voiceSearch.unavailableReason).toBeNull();
    });

    it('should set voice availability to false', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceAvailable(false);
      });

      expect(result.current.voiceSearch.isAvailable).toBe(false);
    });
  });

  describe('setVoiceUnavailableReason', () => {
    it('should set unavailable reason and mark voice as unavailable', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const reasons: VoiceUnavailableReason[] = [
        'not_tv_platform',
        'no_native_module',
        'permission_denied',
        'feature_disabled',
        'hardware_unavailable',
        'language_unsupported',
        'network_unavailable',
        'api_unavailable',
        'unknown',
      ];

      for (const reason of reasons) {
        act(() => {
          result.current.setVoiceUnavailableReason(reason);
        });

        expect(result.current.voiceSearch.unavailableReason).toBe(reason);
        expect(result.current.voiceSearch.isAvailable).toBe(false);
      }
    });

    it('should mark voice as available when reason is null', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setVoiceUnavailableReason('hardware_unavailable');
      });

      expect(result.current.voiceSearch.isAvailable).toBe(false);

      act(() => {
        result.current.setVoiceUnavailableReason(null);
      });

      expect(result.current.voiceSearch.unavailableReason).toBeNull();
      expect(result.current.voiceSearch.isAvailable).toBe(true);
    });
  });
});

// ============================================================================
// Context Menu Tests
// ============================================================================

describe('Context Menu', () => {
  const createMenuItem = (id: string, label: string, onSelect: () => void): ContextMenuItem => ({
    id,
    label,
    onSelect,
  });

  describe('openContextMenu', () => {
    it('should open context menu with items', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const onSelectMock = jest.fn();
      const items: ContextMenuItem[] = [
        createMenuItem('add-to-list', 'Add to List', onSelectMock),
        createMenuItem('share', 'Share', onSelectMock),
      ];

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items,
        });
      });

      expect(result.current.contextMenu.isOpen).toBe(true);
      expect(result.current.contextMenu.targetId).toBe('card-5');
      expect(result.current.contextMenu.items).toEqual(items);
    });

    it('should open context menu with position', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items: [],
          position: { x: 100, y: 200 },
        });
      });

      expect(result.current.contextMenu.position).toEqual({ x: 100, y: 200 });
    });

    it('should open context menu with title', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items: [],
          title: 'Content Actions',
        });
      });

      expect(result.current.contextMenu.title).toBe('Content Actions');
    });

    it('should handle items with all properties', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const onSelectMock = jest.fn();
      const items: ContextMenuItem[] = [
        {
          id: 'delete',
          label: 'Delete',
          icon: 'trash',
          onSelect: onSelectMock,
          disabled: false,
          destructive: true,
        },
        {
          id: 'disabled-item',
          label: 'Disabled Action',
          icon: 'lock',
          onSelect: onSelectMock,
          disabled: true,
        },
      ];

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items,
        });
      });

      expect(result.current.contextMenu.items).toEqual(items);
      expect(result.current.contextMenu.items[0].destructive).toBe(true);
      expect(result.current.contextMenu.items[1].disabled).toBe(true);
    });
  });

  describe('closeContextMenu', () => {
    it('should close context menu and reset state', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items: [createMenuItem('test', 'Test', jest.fn())],
          position: { x: 100, y: 200 },
          title: 'Test Menu',
        });
      });

      expect(result.current.contextMenu.isOpen).toBe(true);

      act(() => {
        result.current.closeContextMenu();
      });

      expect(result.current.contextMenu.isOpen).toBe(false);
      expect(result.current.contextMenu.targetId).toBeNull();
      expect(result.current.contextMenu.items).toEqual([]);
      expect(result.current.contextMenu.position).toBeNull();
      expect(result.current.contextMenu.title).toBeUndefined();
    });

    it('should handle closing already closed menu', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.closeContextMenu();
      });

      expect(result.current.contextMenu.isOpen).toBe(false);
    });
  });

  describe('selectContextMenuItem', () => {
    it('should execute onSelect callback and close menu', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const onSelectMock = jest.fn();
      const items: ContextMenuItem[] = [
        createMenuItem('add-to-list', 'Add to List', onSelectMock),
      ];

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items,
        });
      });

      act(() => {
        result.current.selectContextMenuItem('add-to-list');
      });

      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(result.current.contextMenu.isOpen).toBe(false);
    });

    it('should not execute callback for disabled item', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const onSelectMock = jest.fn();
      const items: ContextMenuItem[] = [
        {
          id: 'disabled-item',
          label: 'Disabled Action',
          onSelect: onSelectMock,
          disabled: true,
        },
      ];

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items,
        });
      });

      act(() => {
        result.current.selectContextMenuItem('disabled-item');
      });

      expect(onSelectMock).not.toHaveBeenCalled();
      // Menu should still be open since disabled item was selected
      expect(result.current.contextMenu.isOpen).toBe(true);
    });

    it('should handle selecting non-existent item', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const onSelectMock = jest.fn();
      const items: ContextMenuItem[] = [
        createMenuItem('add-to-list', 'Add to List', onSelectMock),
      ];

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items,
        });
      });

      act(() => {
        result.current.selectContextMenuItem('non-existent-item');
      });

      expect(onSelectMock).not.toHaveBeenCalled();
      // Menu should still be open since no item was found
      expect(result.current.contextMenu.isOpen).toBe(true);
    });

    it('should select correct item when multiple items exist', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const onSelectMock1 = jest.fn();
      const onSelectMock2 = jest.fn();
      const onSelectMock3 = jest.fn();
      const items: ContextMenuItem[] = [
        createMenuItem('item-1', 'Item 1', onSelectMock1),
        createMenuItem('item-2', 'Item 2', onSelectMock2),
        createMenuItem('item-3', 'Item 3', onSelectMock3),
      ];

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-5',
          items,
        });
      });

      act(() => {
        result.current.selectContextMenuItem('item-2');
      });

      expect(onSelectMock1).not.toHaveBeenCalled();
      expect(onSelectMock2).toHaveBeenCalledTimes(1);
      expect(onSelectMock3).not.toHaveBeenCalled();
    });
  });

  describe('concurrent context menus', () => {
    it('should close previous menu when opening new menu', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      const onSelectMock1 = jest.fn();
      const onSelectMock2 = jest.fn();

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-1',
          items: [createMenuItem('item-1', 'Item 1', onSelectMock1)],
          title: 'Menu 1',
        });
      });

      expect(result.current.contextMenu.targetId).toBe('card-1');
      expect(result.current.contextMenu.title).toBe('Menu 1');

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-2',
          items: [createMenuItem('item-2', 'Item 2', onSelectMock2)],
          title: 'Menu 2',
        });
      });

      expect(result.current.contextMenu.targetId).toBe('card-2');
      expect(result.current.contextMenu.title).toBe('Menu 2');
      expect(result.current.contextMenu.items).toHaveLength(1);
      expect(result.current.contextMenu.items[0].id).toBe('item-2');
    });

    it('should handle rapid menu open/close', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openContextMenu({
          targetId: 'card-1',
          items: [],
        });
        result.current.closeContextMenu();
        result.current.openContextMenu({
          targetId: 'card-2',
          items: [],
        });
        result.current.closeContextMenu();
        result.current.openContextMenu({
          targetId: 'card-3',
          items: [],
        });
      });

      expect(result.current.contextMenu.isOpen).toBe(true);
      expect(result.current.contextMenu.targetId).toBe('card-3');
    });
  });
});

// ============================================================================
// Current Focus Tests
// ============================================================================

describe('Current Focus', () => {
  describe('setCurrentFocusId', () => {
    it('should set current focus ID', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCurrentFocusId('button-1');
      });

      expect(result.current.currentFocusId).toBe('button-1');
    });

    it('should update current focus ID', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCurrentFocusId('button-1');
      });

      expect(result.current.currentFocusId).toBe('button-1');

      act(() => {
        result.current.setCurrentFocusId('button-2');
      });

      expect(result.current.currentFocusId).toBe('button-2');
    });

    it('should clear current focus ID when set to null', () => {
      const { result } = renderHook(() => useTVNavigation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCurrentFocusId('button-1');
      });

      expect(result.current.currentFocusId).toBe('button-1');

      act(() => {
        result.current.setCurrentFocusId(null);
      });

      expect(result.current.currentFocusId).toBeNull();
    });
  });
});

// ============================================================================
// Combined State Operations Tests
// ============================================================================

describe('Combined State Operations', () => {
  it('should handle simultaneous focus and context menu operations', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    const onSelectMock = jest.fn();

    act(() => {
      // Set focus state
      result.current.setCurrentFocusId('card-5');
      result.current.pushFocusHistory({ focusId: 'card-5', screenName: 'HomeScreen' });
      result.current.setScreenFocus('HomeScreen', 'card-5');

      // Open context menu
      result.current.openContextMenu({
        targetId: 'card-5',
        items: [createMenuItem('action', 'Action', onSelectMock)],
      });
    });

    expect(result.current.currentFocusId).toBe('card-5');
    expect(result.current.focusHistory).toHaveLength(1);
    expect(result.current.getScreenFocus('HomeScreen')).toBe('card-5');
    expect(result.current.contextMenu.isOpen).toBe(true);
    expect(result.current.contextMenu.targetId).toBe('card-5');
  });

  it('should handle voice search and focus operations together', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      // Save focus state
      result.current.setCurrentFocusId('search-button');
      result.current.pushFocusHistory({ focusId: 'search-button', screenName: 'HomeScreen' });

      // Open voice search
      result.current.openVoiceSearch();
      result.current.setVoiceListening(true);
    });

    expect(result.current.currentFocusId).toBe('search-button');
    expect(result.current.focusHistory).toHaveLength(1);
    expect(result.current.voiceSearch.isOpen).toBe(true);
    expect(result.current.voiceSearch.isListening).toBe(true);
  });

  it('should maintain independent state between features', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      // Set up various state
      result.current.setCurrentFocusId('card-1');
      result.current.setScreenFocus('HomeScreen', 'card-1');
      result.current.openVoiceSearch();
      result.current.openContextMenu({
        targetId: 'card-2',
        items: [],
      });
    });

    // Close voice search - should not affect context menu
    act(() => {
      result.current.closeVoiceSearch();
    });

    expect(result.current.voiceSearch.isOpen).toBe(false);
    expect(result.current.contextMenu.isOpen).toBe(true);
    expect(result.current.currentFocusId).toBe('card-1');
    expect(result.current.getScreenFocus('HomeScreen')).toBe('card-1');

    // Close context menu - should not affect focus
    act(() => {
      result.current.closeContextMenu();
    });

    expect(result.current.contextMenu.isOpen).toBe(false);
    expect(result.current.currentFocusId).toBe('card-1');
    expect(result.current.getScreenFocus('HomeScreen')).toBe('card-1');
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty string focus IDs', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setCurrentFocusId('');
      result.current.setScreenFocus('HomeScreen', '');
      result.current.pushFocusHistory({ focusId: '', screenName: 'HomeScreen' });
    });

    expect(result.current.currentFocusId).toBe('');
    expect(result.current.getScreenFocus('HomeScreen')).toBe('');
    expect(result.current.focusHistory).toHaveLength(1);
    expect(result.current.focusHistory[0].focusId).toBe('');
  });

  it('should handle very long focus IDs', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    const longId = 'a'.repeat(1000);

    act(() => {
      result.current.setCurrentFocusId(longId);
      result.current.setScreenFocus('HomeScreen', longId);
    });

    expect(result.current.currentFocusId).toBe(longId);
    expect(result.current.getScreenFocus('HomeScreen')).toBe(longId);
  });

  it('should handle special characters in screen names', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    const specialScreenName = 'Screen/with:special.chars-and_underscores';

    act(() => {
      result.current.setScreenFocus(specialScreenName, 'focus-id');
    });

    expect(result.current.getScreenFocus(specialScreenName)).toBe('focus-id');
  });

  it('should handle unicode characters in focus IDs and screen names', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setCurrentFocusId('日本語のID');
      result.current.setScreenFocus('Écran français', 'фокус');
    });

    expect(result.current.currentFocusId).toBe('日本語のID');
    expect(result.current.getScreenFocus('Écran français')).toBe('фокус');
  });

  it('should handle many focus history entries', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.pushFocusHistory({
          focusId: `button-${i}`,
          screenName: `Screen-${i % 10}`,
        });
      }
    });

    expect(result.current.focusHistory).toHaveLength(100);
    expect(result.current.focusHistory[99].focusId).toBe('button-99');
  });

  it('should handle many screen focus entries', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.setScreenFocus(`Screen-${i}`, `focus-${i}`);
      }
    });

    expect(Object.keys(result.current.focusMemory)).toHaveLength(100);
    expect(result.current.getScreenFocus('Screen-99')).toBe('focus-99');
  });

  it('should handle context menu items with callbacks that throw', () => {
    const { result } = renderHook(() => useTVNavigation(), {
      wrapper: createWrapper(),
    });

    const throwingCallback = () => {
      throw new Error('Callback error');
    };

    act(() => {
      result.current.openContextMenu({
        targetId: 'card-1',
        items: [createMenuItem('throw', 'Throw', throwingCallback)],
      });
    });

    // The error should propagate but not break the context
    expect(() => {
      act(() => {
        result.current.selectContextMenuItem('throw');
      });
    }).toThrow('Callback error');
  });
});

// ============================================================================
// Multiple Consumers Tests
// ============================================================================

describe('Multiple Consumers', () => {
  it('should share state between multiple consumers', () => {
    const wrapper = createWrapper();

    const { result: result1 } = renderHook(() => useTVNavigation(), { wrapper });
    const { result: result2 } = renderHook(() => useTVNavigation(), { wrapper });

    act(() => {
      result1.current.setCurrentFocusId('shared-focus');
    });

    expect(result1.current.currentFocusId).toBe('shared-focus');
    expect(result2.current.currentFocusId).toBe('shared-focus');
  });

  it('should receive updates from any consumer', () => {
    const wrapper = createWrapper();

    const { result: result1 } = renderHook(() => useTVNavigation(), { wrapper });
    const { result: result2 } = renderHook(() => useTVNavigation(), { wrapper });

    act(() => {
      result1.current.setScreenFocus('Screen1', 'focus-1');
      result2.current.setScreenFocus('Screen2', 'focus-2');
    });

    expect(result1.current.getScreenFocus('Screen1')).toBe('focus-1');
    expect(result1.current.getScreenFocus('Screen2')).toBe('focus-2');
    expect(result2.current.getScreenFocus('Screen1')).toBe('focus-1');
    expect(result2.current.getScreenFocus('Screen2')).toBe('focus-2');
  });
});
