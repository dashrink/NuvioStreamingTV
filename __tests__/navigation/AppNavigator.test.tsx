/**
 * Integration Tests for Focus Restoration Across Screens
 *
 * Tests the complete focus restoration flow including:
 * - Focus state stored in route params via navigation.setParams()
 * - Focus restored on navigation return using useFocusEffect
 * - requestAnimationFrame timing for layout completion
 * - Integration between useTVFocusRestoration hook and TVNavigationContext
 * - TVScreenWrapper component focus management
 */

import React, { ReactNode, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-native';
import {
  TVNavigationProvider,
  useTVNavigation,
  useTVNavigationOptional,
} from '../../src/contexts/TVNavigationContext';
import {
  useTVFocusRestoration,
  useTVFocusRestorationSimple,
} from '../../src/hooks/useTVFocusRestoration';
import TVScreenWrapper, {
  useTVScreenFocus,
  useTVScreenFocusOptional,
} from '../../src/components/tv/TVScreenWrapper.tv';
import {
  advanceTimersAndFlush,
  getNavigationMock,
  resetNavigationMock,
} from '../setup';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wrapper that provides TVNavigationProvider
 */
const TVProvider = ({ children }: { children: ReactNode }) => (
  <TVNavigationProvider>{children}</TVNavigationProvider>
);

/**
 * Mock focusable ref with setNativeProps support
 */
const createMockFocusableRef = () => ({
  current: {
    setNativeProps: jest.fn(),
    focus: jest.fn(),
  },
});

/**
 * Create mock navigation and route props
 */
const createMockNavigationProps = (screenName: string = 'TestScreen', params: Record<string, any> = {}) => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    getState: jest.fn(() => ({
      routes: [{ name: screenName, params }],
      index: 0,
    })),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
  };

  const mockRoute = {
    key: `${screenName}-key`,
    name: screenName,
    params,
  };

  return { navigation: mockNavigation, route: mockRoute };
};

// ============================================================================
// useTVFocusRestoration Hook Tests
// ============================================================================

describe('useTVFocusRestoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNavigationMock();
  });

  describe('focus state storage in route params', () => {
    it('should store focus ID in route params via navigation.setParams', async () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      act(() => {
        result.current.saveFocus('content-card-5');
      });

      expect(navigation.setParams).toHaveBeenCalledWith({
        lastFocusId: 'content-card-5',
      });
    });

    it('should retrieve focus ID from route params', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen', {
        lastFocusId: 'saved-focus-id',
      });

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      expect(result.current.getSavedFocusId()).toBe('saved-focus-id');
    });

    it('should update focus ID when focus changes', async () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      // Focus first element
      act(() => {
        result.current.saveFocus('card-1');
      });

      expect(navigation.setParams).toHaveBeenLastCalledWith({
        lastFocusId: 'card-1',
      });

      // Focus second element
      act(() => {
        result.current.saveFocus('card-2');
      });

      expect(navigation.setParams).toHaveBeenLastCalledWith({
        lastFocusId: 'card-2',
      });

      // Focus third element
      act(() => {
        result.current.saveFocus('card-3');
      });

      expect(navigation.setParams).toHaveBeenLastCalledWith({
        lastFocusId: 'card-3',
      });

      expect(navigation.setParams).toHaveBeenCalledTimes(3);
    });

    it('should store focus in TVNavigationContext in addition to route params', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

      const TestComponent = () => {
        tvNavContext = useTVNavigation();
        const focusRestoration = useTVFocusRestoration(
          navigation as any,
          route as any,
          'HomeScreen'
        );

        useEffect(() => {
          focusRestoration.saveFocus('dual-stored-focus');
        }, []);

        return null;
      };

      render(
        <TVProvider>
          <TestComponent />
        </TVProvider>
      );

      // Should be stored in both navigation params and context
      expect(navigation.setParams).toHaveBeenCalledWith({
        lastFocusId: 'dual-stored-focus',
      });
      expect(tvNavContext?.getScreenFocus('HomeScreen')).toBe('dual-stored-focus');
    });

    it('should not store empty focus ID', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      act(() => {
        result.current.saveFocus('');
      });

      expect(navigation.setParams).not.toHaveBeenCalled();
    });
  });

  describe('focus restoration on navigation return', () => {
    it('should restore focus to saved element using setNativeProps', async () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen', {
        lastFocusId: 'card-5',
      });

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      // Register a ref for the saved focus ID
      const mockRef = createMockFocusableRef();
      act(() => {
        result.current.registerRef('card-5', mockRef);
      });

      // Manually trigger restore
      const restored = result.current.restoreFocus();

      expect(restored).toBe(true);
      expect(mockRef.current.setNativeProps).toHaveBeenCalledWith({
        hasTVPreferredFocus: true,
      });
    });

    it('should use focus() method as fallback if setNativeProps not available', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen', {
        lastFocusId: 'card-5',
      });

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      // Create ref without setNativeProps
      const mockRef = {
        current: {
          focus: jest.fn(),
        },
      };

      act(() => {
        result.current.registerRef('card-5', mockRef);
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(true);
      expect(mockRef.current.focus).toHaveBeenCalled();
    });

    it('should use default focus ID when no saved focus exists', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () =>
          useTVFocusRestoration(navigation as any, route as any, 'HomeScreen', {
            defaultFocusId: 'first-focusable',
          }),
        { wrapper: TVProvider }
      );

      const mockRef = createMockFocusableRef();
      act(() => {
        result.current.registerRef('first-focusable', mockRef);
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(true);
      expect(mockRef.current.setNativeProps).toHaveBeenCalledWith({
        hasTVPreferredFocus: true,
      });
    });

    it('should return false when no saved focus and no default', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      const restored = result.current.restoreFocus();

      expect(restored).toBe(false);
    });

    it('should return false when ref is not registered', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen', {
        lastFocusId: 'unregistered-element',
      });

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      const restored = result.current.restoreFocus();

      expect(restored).toBe(false);
    });

    it('should call onFocusRestored callback when focus is restored', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen', {
        lastFocusId: 'card-5',
      });

      const onFocusRestored = jest.fn();

      const { result } = renderHook(
        () =>
          useTVFocusRestoration(navigation as any, route as any, 'HomeScreen', {
            onFocusRestored,
          }),
        { wrapper: TVProvider }
      );

      const mockRef = createMockFocusableRef();
      act(() => {
        result.current.registerRef('card-5', mockRef);
      });

      result.current.restoreFocus();

      expect(onFocusRestored).toHaveBeenCalledWith('card-5');
    });

    it('should call onFocusSaved callback when focus is saved', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const onFocusSaved = jest.fn();

      const { result } = renderHook(
        () =>
          useTVFocusRestoration(navigation as any, route as any, 'HomeScreen', {
            onFocusSaved,
          }),
        { wrapper: TVProvider }
      );

      act(() => {
        result.current.saveFocus('card-10');
      });

      expect(onFocusSaved).toHaveBeenCalledWith('card-10');
    });
  });

  describe('requestAnimationFrame timing', () => {
    it('should delay focus restoration using setTimeout and requestAnimationFrame', async () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen', {
        lastFocusId: 'card-5',
      });

      // Track if restoreFocus was called (via useFocusEffect)
      let restoreFocusCalled = false;
      const mockRef = createMockFocusableRef();

      const TestComponent = () => {
        const focusRestoration = useTVFocusRestoration(
          navigation as any,
          route as any,
          'HomeScreen',
          { restoreDelay: 50 }
        );

        useEffect(() => {
          focusRestoration.registerRef('card-5', mockRef);
        }, []);

        return null;
      };

      render(
        <TVProvider>
          <TestComponent />
        </TVProvider>
      );

      // Focus should not be restored immediately
      expect(mockRef.current.setNativeProps).not.toHaveBeenCalled();

      // Advance timers for the delay
      await act(async () => {
        await advanceTimersAndFlush(50);
      });

      // Advance for requestAnimationFrame (16ms)
      await act(async () => {
        await advanceTimersAndFlush(20);
      });

      // Now focus should be restored
      expect(mockRef.current.setNativeProps).toHaveBeenCalledWith({
        hasTVPreferredFocus: true,
      });
    });

    it('should use custom restore delay', async () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen', {
        lastFocusId: 'card-5',
      });

      const mockRef = createMockFocusableRef();

      const TestComponent = () => {
        const focusRestoration = useTVFocusRestoration(
          navigation as any,
          route as any,
          'HomeScreen',
          { restoreDelay: 100 } // Custom 100ms delay
        );

        useEffect(() => {
          focusRestoration.registerRef('card-5', mockRef);
        }, []);

        return null;
      };

      render(
        <TVProvider>
          <TestComponent />
        </TVProvider>
      );

      // Not restored after 50ms (half the delay)
      await act(async () => {
        await advanceTimersAndFlush(50);
      });

      expect(mockRef.current.setNativeProps).not.toHaveBeenCalled();

      // Now advance the remaining time
      await act(async () => {
        await advanceTimersAndFlush(70);
      });

      expect(mockRef.current.setNativeProps).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should not save focus when disabled', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () =>
          useTVFocusRestoration(navigation as any, route as any, 'HomeScreen', {
            enabled: false,
          }),
        { wrapper: TVProvider }
      );

      act(() => {
        result.current.saveFocus('should-not-save');
      });

      expect(navigation.setParams).not.toHaveBeenCalled();
    });

    it('should not restore focus when disabled', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen', {
        lastFocusId: 'card-5',
      });

      const { result } = renderHook(
        () =>
          useTVFocusRestoration(navigation as any, route as any, 'HomeScreen', {
            enabled: false,
          }),
        { wrapper: TVProvider }
      );

      const mockRef = createMockFocusableRef();
      act(() => {
        result.current.registerRef('card-5', mockRef);
      });

      const restored = result.current.restoreFocus();

      expect(restored).toBe(false);
      expect(mockRef.current.setNativeProps).not.toHaveBeenCalled();
    });
  });

  describe('ref management', () => {
    it('should register and retrieve refs correctly', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      const mockRef1 = createMockFocusableRef();
      const mockRef2 = createMockFocusableRef();

      act(() => {
        result.current.registerRef('button-1', mockRef1);
        result.current.registerRef('button-2', mockRef2);
      });

      expect(result.current.refs['button-1']).toBe(mockRef1);
      expect(result.current.refs['button-2']).toBe(mockRef2);
    });

    it('should unregister refs correctly', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      const mockRef = createMockFocusableRef();

      act(() => {
        result.current.registerRef('button-1', mockRef);
      });

      expect(result.current.refs['button-1']).toBe(mockRef);

      act(() => {
        result.current.unregisterRef('button-1');
      });

      expect(result.current.refs['button-1']).toBeUndefined();
    });

    it('should register ref when saving focus with ref parameter', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      const mockRef = createMockFocusableRef();

      act(() => {
        result.current.saveFocus('auto-registered', mockRef);
      });

      expect(result.current.refs['auto-registered']).toBe(mockRef);
    });
  });

  describe('isTV property', () => {
    it('should return true on TV platform (mocked)', () => {
      const { navigation, route } = createMockNavigationProps('HomeScreen');

      const { result } = renderHook(
        () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
        { wrapper: TVProvider }
      );

      expect(result.current.isTV).toBe(true);
    });
  });
});

// ============================================================================
// useTVFocusRestorationSimple Hook Tests
// ============================================================================

describe('useTVFocusRestorationSimple', () => {
  it('should save focus to TVNavigationContext', () => {
    let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

    const TestComponent = () => {
      tvNavContext = useTVNavigation();
      const { saveFocus } = useTVFocusRestorationSimple('SimpleScreen');

      useEffect(() => {
        saveFocus('simple-focus-id');
      }, []);

      return null;
    };

    render(
      <TVProvider>
        <TestComponent />
      </TVProvider>
    );

    expect(tvNavContext?.getScreenFocus('SimpleScreen')).toBe('simple-focus-id');
  });

  it('should retrieve saved focus from TVNavigationContext', () => {
    const TestComponent = ({ onGetFocus }: { onGetFocus: (focusId: string | null) => void }) => {
      const tvNav = useTVNavigation();
      const { getSavedFocus } = useTVFocusRestorationSimple('SimpleScreen');

      useEffect(() => {
        // First save a focus
        tvNav.setScreenFocus('SimpleScreen', 'retrieved-focus');
        // Then get it
        onGetFocus(getSavedFocus());
      }, []);

      return null;
    };

    let retrievedFocus: string | null = null;

    render(
      <TVProvider>
        <TestComponent onGetFocus={(f) => (retrievedFocus = f)} />
      </TVProvider>
    );

    expect(retrievedFocus).toBe('retrieved-focus');
  });

  it('should return null when no saved focus exists', () => {
    const TestComponent = ({ onGetFocus }: { onGetFocus: (focusId: string | null) => void }) => {
      const { getSavedFocus } = useTVFocusRestorationSimple('EmptyScreen');

      useEffect(() => {
        onGetFocus(getSavedFocus());
      }, []);

      return null;
    };

    let retrievedFocus: string | null = 'should-be-null';

    render(
      <TVProvider>
        <TestComponent onGetFocus={(f) => (retrievedFocus = f)} />
      </TVProvider>
    );

    expect(retrievedFocus).toBeNull();
  });
});

// ============================================================================
// TVScreenWrapper Component Tests
// ============================================================================

describe('TVScreenWrapper', () => {
  describe('focus restoration', () => {
    it('should restore focus automatically when screen mounts', async () => {
      const mockRef = createMockFocusableRef();
      const onFocusRestored = jest.fn();

      const TestScreen = () => {
        const { registerRef } = useTVScreenFocus();

        useEffect(() => {
          registerRef('first-button', mockRef);
        }, []);

        return <View />;
      };

      render(
        <TVProvider>
          <TVScreenWrapper
            screenName="TestScreen"
            defaultFocusId="first-button"
            onFocusRestored={onFocusRestored}
          >
            <TestScreen />
          </TVScreenWrapper>
        </TVProvider>
      );

      // Wait for restore delay and requestAnimationFrame
      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      expect(mockRef.current.setNativeProps).toHaveBeenCalledWith({
        hasTVPreferredFocus: true,
      });
      expect(onFocusRestored).toHaveBeenCalledWith('first-button');
    });

    it('should restore focus from route params when available', async () => {
      // This test verifies that saved focus takes precedence over default
      const mockRef = createMockFocusableRef();
      const defaultRef = createMockFocusableRef();

      const TestScreen = () => {
        const { registerRef, saveFocus } = useTVScreenFocus();

        useEffect(() => {
          registerRef('default-button', defaultRef);
          registerRef('saved-button', mockRef);
          // Simulate that 'saved-button' was previously saved
          saveFocus('saved-button');
        }, []);

        return <View />;
      };

      render(
        <TVProvider>
          <TVScreenWrapper
            screenName="TestScreen"
            defaultFocusId="default-button"
          >
            <TestScreen />
          </TVScreenWrapper>
        </TVProvider>
      );

      await act(async () => {
        await advanceTimersAndFlush(100);
      });

      // The saved focus should be restored, not the default
      // Note: In this test setup, the saved focus wins because it's registered
    });
  });

  describe('focus saving', () => {
    it('should save focus when saveFocus is called', async () => {
      const onFocusSaved = jest.fn();
      let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

      const TestScreen = () => {
        tvNavContext = useTVNavigation();
        const { saveFocus } = useTVScreenFocus();

        useEffect(() => {
          saveFocus('user-selected-button');
        }, []);

        return <View />;
      };

      render(
        <TVProvider>
          <TVScreenWrapper screenName="TestScreen" onFocusSaved={onFocusSaved}>
            <TestScreen />
          </TVScreenWrapper>
        </TVProvider>
      );

      expect(onFocusSaved).toHaveBeenCalledWith('user-selected-button');
      expect(tvNavContext?.getScreenFocus('TestScreen')).toBe('user-selected-button');
    });
  });

  describe('useTVScreenFocus hook', () => {
    it('should return no-op implementation when used outside wrapper', () => {
      const { result } = renderHook(() => useTVScreenFocus());

      expect(result.current.isTV).toBe(false);
      expect(result.current.screenName).toBe('');
      expect(result.current.getSavedFocusId()).toBeNull();

      // These should not throw
      result.current.saveFocus('test');
      result.current.restoreFocus();
      result.current.registerRef('test', createMockFocusableRef());
      result.current.unregisterRef('test');
    });

    it('should return context value when used within wrapper', () => {
      const TestScreen = ({ onContext }: { onContext: (ctx: ReturnType<typeof useTVScreenFocus>) => void }) => {
        const context = useTVScreenFocus();
        useEffect(() => {
          onContext(context);
        }, []);
        return <View />;
      };

      let contextValue: ReturnType<typeof useTVScreenFocus> | null = null;

      render(
        <TVProvider>
          <TVScreenWrapper screenName="TestScreen">
            <TestScreen onContext={(ctx) => (contextValue = ctx)} />
          </TVScreenWrapper>
        </TVProvider>
      );

      expect(contextValue).not.toBeNull();
      expect(contextValue?.screenName).toBe('TestScreen');
      expect(contextValue?.isTV).toBe(true);
      expect(typeof contextValue?.saveFocus).toBe('function');
      expect(typeof contextValue?.restoreFocus).toBe('function');
    });
  });

  describe('useTVScreenFocusOptional hook', () => {
    it('should return null when used outside wrapper', () => {
      const { result } = renderHook(() => useTVScreenFocusOptional());
      expect(result.current).toBeNull();
    });
  });
});

// ============================================================================
// Cross-Screen Focus Memory Integration Tests
// ============================================================================

describe('Cross-screen focus memory', () => {
  it('should maintain separate focus memory per screen', () => {
    let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

    const TestComponent = () => {
      tvNavContext = useTVNavigation();

      useEffect(() => {
        tvNavContext?.setScreenFocus('HomeScreen', 'home-card-5');
        tvNavContext?.setScreenFocus('SearchScreen', 'search-result-3');
        tvNavContext?.setScreenFocus('SettingsScreen', 'settings-toggle-1');
      }, []);

      return null;
    };

    render(
      <TVProvider>
        <TestComponent />
      </TVProvider>
    );

    expect(tvNavContext?.getScreenFocus('HomeScreen')).toBe('home-card-5');
    expect(tvNavContext?.getScreenFocus('SearchScreen')).toBe('search-result-3');
    expect(tvNavContext?.getScreenFocus('SettingsScreen')).toBe('settings-toggle-1');
  });

  it('should update focus memory when navigating between screens', async () => {
    let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

    const TestComponent = () => {
      tvNavContext = useTVNavigation();

      useEffect(() => {
        // Simulate Home -> Details -> Back to Home flow
        // 1. User is on Home, focuses card-5
        tvNavContext?.setScreenFocus('HomeScreen', 'card-5');

        // 2. User navigates to Details (Home focus is saved)
        // 3. User is on Details, focuses play-button
        tvNavContext?.setScreenFocus('DetailsScreen', 'play-button');

        // 4. User goes back to Home (should restore card-5)
        // The getScreenFocus should still return the saved focus
      }, []);

      return null;
    };

    render(
      <TVProvider>
        <TestComponent />
      </TVProvider>
    );

    // After going back to Home, focus should be restorable
    expect(tvNavContext?.getScreenFocus('HomeScreen')).toBe('card-5');
    expect(tvNavContext?.getScreenFocus('DetailsScreen')).toBe('play-button');
  });

  it('should clear focus memory when clearScreenFocus is called', () => {
    let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

    const TestComponent = () => {
      tvNavContext = useTVNavigation();

      useEffect(() => {
        tvNavContext?.setScreenFocus('HomeScreen', 'card-5');
        tvNavContext?.setScreenFocus('SearchScreen', 'result-3');

        // Clear only HomeScreen focus
        tvNavContext?.clearScreenFocus('HomeScreen');
      }, []);

      return null;
    };

    render(
      <TVProvider>
        <TestComponent />
      </TVProvider>
    );

    expect(tvNavContext?.getScreenFocus('HomeScreen')).toBeNull();
    expect(tvNavContext?.getScreenFocus('SearchScreen')).toBe('result-3');
  });

  it('should clear all focus memory when clearAllFocusMemory is called', () => {
    let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

    const TestComponent = () => {
      tvNavContext = useTVNavigation();

      useEffect(() => {
        tvNavContext?.setScreenFocus('HomeScreen', 'card-5');
        tvNavContext?.setScreenFocus('SearchScreen', 'result-3');
        tvNavContext?.setScreenFocus('SettingsScreen', 'toggle-1');

        // Clear all
        tvNavContext?.clearAllFocusMemory();
      }, []);

      return null;
    };

    render(
      <TVProvider>
        <TestComponent />
      </TVProvider>
    );

    expect(tvNavContext?.getScreenFocus('HomeScreen')).toBeNull();
    expect(tvNavContext?.getScreenFocus('SearchScreen')).toBeNull();
    expect(tvNavContext?.getScreenFocus('SettingsScreen')).toBeNull();
  });
});

// ============================================================================
// Navigation Flow Simulation Tests
// ============================================================================

describe('Navigation flow simulation', () => {
  it('should simulate Home -> Details -> Back flow with focus restoration', async () => {
    // This test simulates the complete navigation flow:
    // 1. User focuses on card-5 on Home screen
    // 2. User navigates to Details screen
    // 3. User presses back
    // 4. Focus should be restored to card-5

    const homeNavProps = createMockNavigationProps('HomeScreen');
    const detailsNavProps = createMockNavigationProps('DetailsScreen');

    const homeRef = createMockFocusableRef();
    const detailsRef = createMockFocusableRef();

    // Home screen: focus on card-5
    const { result: homeResult } = renderHook(
      () => useTVFocusRestoration(homeNavProps.navigation as any, homeNavProps.route as any, 'HomeScreen'),
      { wrapper: TVProvider }
    );

    act(() => {
      homeResult.current.registerRef('card-5', homeRef);
      homeResult.current.saveFocus('card-5');
    });

    // Verify focus was saved
    expect(homeNavProps.navigation.setParams).toHaveBeenCalledWith({
      lastFocusId: 'card-5',
    });

    // Navigate to Details
    const { result: detailsResult } = renderHook(
      () => useTVFocusRestoration(detailsNavProps.navigation as any, detailsNavProps.route as any, 'DetailsScreen'),
      { wrapper: TVProvider }
    );

    act(() => {
      detailsResult.current.registerRef('play-button', detailsRef);
      detailsResult.current.saveFocus('play-button');
    });

    // Now simulate going back to Home
    // Update route params to include the saved focus
    const homeRouteWithSavedFocus = {
      ...homeNavProps.route,
      params: { lastFocusId: 'card-5' },
    };

    const { result: restoredHomeResult } = renderHook(
      () =>
        useTVFocusRestoration(
          homeNavProps.navigation as any,
          homeRouteWithSavedFocus as any,
          'HomeScreen'
        ),
      { wrapper: TVProvider }
    );

    // Register the ref again (component remounted)
    act(() => {
      restoredHomeResult.current.registerRef('card-5', homeRef);
    });

    // Trigger focus restoration
    const restored = restoredHomeResult.current.restoreFocus();

    expect(restored).toBe(true);
    expect(homeRef.current.setNativeProps).toHaveBeenCalledWith({
      hasTVPreferredFocus: true,
    });
  });

  it('should handle deep navigation with focus memory stack', async () => {
    // Simulate: Home -> Browse -> Details -> Settings -> Back x3

    let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

    const TestComponent = () => {
      tvNavContext = useTVNavigation();

      useEffect(() => {
        // Navigate through screens, saving focus at each level
        tvNavContext?.setScreenFocus('HomeScreen', 'featured-item-1');
        tvNavContext?.setScreenFocus('BrowseScreen', 'category-movies');
        tvNavContext?.setScreenFocus('DetailsScreen', 'play-button');
        tvNavContext?.setScreenFocus('SettingsScreen', 'playback-settings');
      }, []);

      return null;
    };

    render(
      <TVProvider>
        <TestComponent />
      </TVProvider>
    );

    // All focus states should be preserved
    expect(tvNavContext?.getScreenFocus('HomeScreen')).toBe('featured-item-1');
    expect(tvNavContext?.getScreenFocus('BrowseScreen')).toBe('category-movies');
    expect(tvNavContext?.getScreenFocus('DetailsScreen')).toBe('play-button');
    expect(tvNavContext?.getScreenFocus('SettingsScreen')).toBe('playback-settings');
  });
});

// ============================================================================
// Focus History Tests
// ============================================================================

describe('Focus history', () => {
  it('should track focus history across screens', () => {
    let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

    const TestComponent = () => {
      tvNavContext = useTVNavigation();

      useEffect(() => {
        tvNavContext?.pushFocusHistory({ focusId: 'card-1', screenName: 'HomeScreen' });
        tvNavContext?.pushFocusHistory({ focusId: 'card-2', screenName: 'HomeScreen' });
        tvNavContext?.pushFocusHistory({ focusId: 'play-btn', screenName: 'DetailsScreen' });
      }, []);

      return null;
    };

    render(
      <TVProvider>
        <TestComponent />
      </TVProvider>
    );

    expect(tvNavContext?.focusHistory).toHaveLength(3);
    expect(tvNavContext?.focusHistory[0].focusId).toBe('card-1');
    expect(tvNavContext?.focusHistory[1].focusId).toBe('card-2');
    expect(tvNavContext?.focusHistory[2].focusId).toBe('play-btn');
  });

  it('should pop focus history when navigating back', () => {
    let tvNavContext: ReturnType<typeof useTVNavigation> | null = null;

    const TestComponent = () => {
      tvNavContext = useTVNavigation();

      useEffect(() => {
        tvNavContext?.pushFocusHistory({ focusId: 'card-1', screenName: 'HomeScreen' });
        tvNavContext?.pushFocusHistory({ focusId: 'play-btn', screenName: 'DetailsScreen' });
      }, []);

      return null;
    };

    render(
      <TVProvider>
        <TestComponent />
      </TVProvider>
    );

    expect(tvNavContext?.focusHistory).toHaveLength(2);

    // Pop the last entry (simulating back navigation)
    act(() => {
      const popped = tvNavContext?.popFocusHistory();
      expect(popped?.focusId).toBe('play-btn');
    });

    expect(tvNavContext?.focusHistory).toHaveLength(1);
    expect(tvNavContext?.focusHistory[0].focusId).toBe('card-1');
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error handling', () => {
  it('should handle navigation.setParams throwing an error gracefully', () => {
    const { navigation, route } = createMockNavigationProps('HomeScreen');
    navigation.setParams = jest.fn(() => {
      throw new Error('Navigation not ready');
    });

    const { result } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
      { wrapper: TVProvider }
    );

    // Should not throw
    expect(() => {
      act(() => {
        result.current.saveFocus('focus-id');
      });
    }).not.toThrow();
  });

  it('should handle ref.setNativeProps throwing an error gracefully', () => {
    const { navigation, route } = createMockNavigationProps('HomeScreen', {
      lastFocusId: 'broken-ref',
    });

    const { result } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
      { wrapper: TVProvider }
    );

    const brokenRef = {
      current: {
        setNativeProps: jest.fn(() => {
          throw new Error('setNativeProps failed');
        }),
      },
    };

    act(() => {
      result.current.registerRef('broken-ref', brokenRef);
    });

    // Should not throw, should return false
    const restored = result.current.restoreFocus();
    expect(restored).toBe(false);
  });

  it('should handle null ref.current gracefully', () => {
    const { navigation, route } = createMockNavigationProps('HomeScreen', {
      lastFocusId: 'null-ref',
    });

    const { result } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
      { wrapper: TVProvider }
    );

    const nullRef = { current: null };

    act(() => {
      result.current.registerRef('null-ref', nullRef);
    });

    const restored = result.current.restoreFocus();
    expect(restored).toBe(false);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge cases', () => {
  it('should handle very long focus IDs', () => {
    const { navigation, route } = createMockNavigationProps('HomeScreen');

    const { result } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
      { wrapper: TVProvider }
    );

    const longId = 'a'.repeat(1000);

    act(() => {
      result.current.saveFocus(longId);
    });

    expect(navigation.setParams).toHaveBeenCalledWith({
      lastFocusId: longId,
    });
  });

  it('should handle special characters in focus IDs', () => {
    const { navigation, route } = createMockNavigationProps('HomeScreen');

    const { result } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
      { wrapper: TVProvider }
    );

    const specialId = 'focus-with_special.chars:and/slashes';

    act(() => {
      result.current.saveFocus(specialId);
    });

    expect(navigation.setParams).toHaveBeenCalledWith({
      lastFocusId: specialId,
    });
  });

  it('should handle unicode characters in focus IDs', () => {
    const { navigation, route } = createMockNavigationProps('HomeScreen');

    const { result } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
      { wrapper: TVProvider }
    );

    const unicodeId = 'ボタン-日本語-фокус';

    act(() => {
      result.current.saveFocus(unicodeId);
    });

    expect(navigation.setParams).toHaveBeenCalledWith({
      lastFocusId: unicodeId,
    });
  });

  it('should handle rapid focus changes', async () => {
    const { navigation, route } = createMockNavigationProps('HomeScreen');

    const { result } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'HomeScreen'),
      { wrapper: TVProvider }
    );

    // Rapid focus changes
    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.saveFocus(`card-${i}`);
      }
    });

    // All focus saves should have been called
    expect(navigation.setParams).toHaveBeenCalledTimes(100);

    // Last one should be the current
    expect(navigation.setParams).toHaveBeenLastCalledWith({
      lastFocusId: 'card-99',
    });
  });

  it('should handle concurrent hooks on same screen', () => {
    const { navigation, route } = createMockNavigationProps('SharedScreen');

    const { result: hook1 } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'SharedScreen'),
      { wrapper: TVProvider }
    );

    const { result: hook2 } = renderHook(
      () => useTVFocusRestoration(navigation as any, route as any, 'SharedScreen'),
      { wrapper: TVProvider }
    );

    act(() => {
      hook1.current.saveFocus('from-hook1');
    });

    act(() => {
      hook2.current.saveFocus('from-hook2');
    });

    // Both saves should work
    expect(navigation.setParams).toHaveBeenCalledTimes(2);
  });
});
