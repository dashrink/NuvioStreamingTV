/**
 * Jest Test Setup for TV Navigation Testing
 *
 * This file configures the test environment with all necessary mocks
 * for testing React Native TV navigation components and hooks.
 */

import { jest } from '@jest/globals';

// ============================================================================
// React Native Core Mocks
// ============================================================================

// Mock Platform to simulate TV environment
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  isTV: true,
  isTesting: true,
  select: jest.fn((obj) => obj.ios || obj.default),
  constants: {
    reactNativeVersion: { major: 0, minor: 81, patch: 4 },
  },
}));

// Mock TVEventHandler for TV remote event handling
const mockTVEventHandler = {
  enable: jest.fn(),
  disable: jest.fn(),
};

jest.mock('react-native/Libraries/Components/AppleTV/TVEventHandler', () => {
  return jest.fn().mockImplementation(() => mockTVEventHandler);
});

// Also mock the direct import path used in some RN versions
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      isTV: true,
      isTesting: true,
      select: jest.fn((obj: Record<string, unknown>) => obj.ios || obj.default),
    },
    TVEventHandler: jest.fn().mockImplementation(() => mockTVEventHandler),
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },
    NativeModules: {
      ...RN.NativeModules,
      DeviceInfo: {
        getConstants: () => ({
          Dimensions: {
            window: { width: 1920, height: 1080, scale: 1, fontScale: 1 },
            screen: { width: 1920, height: 1080, scale: 1, fontScale: 1 },
          },
        }),
      },
      StatusBarManager: {
        getHeight: jest.fn(),
      },
    },
    Dimensions: {
      get: jest.fn().mockReturnValue({
        width: 1920,
        height: 1080,
        scale: 1,
        fontScale: 1,
      }),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    findNodeHandle: jest.fn(() => 1),
  };
});

// ============================================================================
// React Native Reanimated Mock
// ============================================================================

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual(
    'react-native-reanimated/mock'
  );

  // Override specific functions that need custom behavior
  Reanimated.useSharedValue = jest.fn((initial) => ({
    value: initial,
  }));

  Reanimated.useAnimatedStyle = jest.fn((styleFactory) => {
    // Return static style for tests
    return {};
  });

  Reanimated.withSpring = jest.fn((value, _config, callback) => {
    if (callback) {
      callback(true);
    }
    return value;
  });

  Reanimated.withTiming = jest.fn((value, _config, callback) => {
    if (callback) {
      callback(true);
    }
    return value;
  });

  Reanimated.withSequence = jest.fn((...animations) => animations[animations.length - 1]);
  Reanimated.withDelay = jest.fn((_, animation) => animation);
  Reanimated.withRepeat = jest.fn((animation) => animation);

  Reanimated.runOnJS = jest.fn((fn) => fn);
  Reanimated.runOnUI = jest.fn((fn) => fn);

  Reanimated.cancelAnimation = jest.fn();

  Reanimated.interpolate = jest.fn((value) => value);
  Reanimated.Extrapolate = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };

  return Reanimated;
});

// ============================================================================
// React Navigation Mock
// ============================================================================

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  getState: jest.fn(() => ({
    routes: [{ name: 'TestScreen', params: {} }],
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
  key: 'test-key',
  name: 'TestScreen',
  params: {},
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(() => mockNavigation),
    useRoute: jest.fn(() => mockRoute),
    useFocusEffect: jest.fn((callback) => {
      // Execute the callback immediately in tests
      if (typeof callback === 'function') {
        const cleanup = callback();
        // Don't call cleanup automatically - let tests control this
      }
    }),
    useIsFocused: jest.fn(() => true),
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ============================================================================
// Expo Modules Mocks
// ============================================================================

jest.mock('expo-device', () => ({
  deviceName: 'Test Device',
  modelName: 'Test Model',
  totalMemory: 4 * 1024 * 1024 * 1024, // 4GB
  isDevice: true,
  getDeviceTypeAsync: jest.fn(() => Promise.resolve(3)), // DeviceType.TV
  DeviceType: {
    UNKNOWN: 0,
    PHONE: 1,
    TABLET: 2,
    TV: 3,
    DESKTOP: 4,
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// ============================================================================
// MMKV Storage Mock
// ============================================================================

const mockStorage = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn((key: string, value: string) => mockStorage.set(key, value)),
    getString: jest.fn((key: string) => mockStorage.get(key)),
    getBoolean: jest.fn((key: string) => {
      const val = mockStorage.get(key);
      return val === 'true' ? true : val === 'false' ? false : undefined;
    }),
    getNumber: jest.fn((key: string) => {
      const val = mockStorage.get(key);
      return val !== undefined ? parseFloat(val) : undefined;
    }),
    delete: jest.fn((key: string) => mockStorage.delete(key)),
    contains: jest.fn((key: string) => mockStorage.has(key)),
    clearAll: jest.fn(() => mockStorage.clear()),
    getAllKeys: jest.fn(() => Array.from(mockStorage.keys())),
  })),
}));

// ============================================================================
// Timer Utilities
// ============================================================================

// Use fake timers by default for better control in tests
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
  mockStorage.clear();
});

// ============================================================================
// Global Test Utilities
// ============================================================================

// Helper to advance timers and flush promises
export const advanceTimersAndFlush = async (ms: number = 0) => {
  jest.advanceTimersByTime(ms);
  await Promise.resolve();
};

// Helper to simulate TV remote events
export const simulateTVEvent = (eventType: string) => {
  const callbacks = (mockTVEventHandler.enable as jest.Mock).mock.calls;
  if (callbacks.length > 0) {
    const lastCallback = callbacks[callbacks.length - 1][1];
    if (typeof lastCallback === 'function') {
      lastCallback({ eventType });
    }
  }
};

// Helper to check if TVEventHandler was properly enabled/disabled
export const getTVEventHandlerMock = () => mockTVEventHandler;

// Helper to get navigation mock
export const getNavigationMock = () => mockNavigation;

// Helper to reset navigation mock
export const resetNavigationMock = () => {
  Object.values(mockNavigation).forEach((fn) => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      (fn as jest.Mock).mockClear();
    }
  });
};

// ============================================================================
// Console Warnings Suppression
// ============================================================================

// Suppress specific React Native warnings in tests
const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Animated: `useNativeDriver`') ||
      message.includes('componentWillReceiveProps') ||
      message.includes('componentWillMount'))
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: An update to') ||
      message.includes('act(...)'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// ============================================================================
// requestAnimationFrame Mock
// ============================================================================

global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 16) as unknown as number;
};

global.cancelAnimationFrame = (id: number): void => {
  clearTimeout(id);
};

// ============================================================================
// Additional Global Mocks
// ============================================================================

// Mock setImmediate if not available
if (typeof setImmediate === 'undefined') {
  (global as unknown as { setImmediate: typeof setTimeout }).setImmediate = (fn: () => void) =>
    setTimeout(fn, 0) as unknown as NodeJS.Immediate;
}

export { mockNavigation, mockRoute, mockTVEventHandler };
