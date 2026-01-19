/**
 * Jest Test Setup for TV Web App Testing
 *
 * This file configures the test environment with necessary mocks
 * for testing web-based TV navigation components and hooks.
 *
 * Note: React Native mocks have been removed as part of the migration
 * to a web-based TV platform. Tests should use web-standard APIs.
 */

import { jest } from '@jest/globals';

// ============================================================================
// Web Storage Mock
// ============================================================================

const mockStorage = new Map<string, string>();

/**
 * Mock localStorage for web-based storage testing
 */
const localStorageMock = {
  getItem: jest.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: jest.fn((key: string) => mockStorage.delete(key)),
  clear: jest.fn(() => mockStorage.clear()),
  get length() {
    return mockStorage.size;
  },
  key: jest.fn((index: number) => {
    const keys = Array.from(mockStorage.keys());
    return keys[index] ?? null;
  }),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// ============================================================================
// TV Platform Detection Utilities
// ============================================================================

/**
 * Configuration for simulating TV environment in tests
 */
export interface TVTestConfig {
  isTV: boolean;
  platform: 'web' | 'smarttv' | 'androidtv' | 'tvos';
  screenWidth: number;
  screenHeight: number;
}

const defaultTVConfig: TVTestConfig = {
  isTV: true,
  platform: 'web',
  screenWidth: 1920,
  screenHeight: 1080,
};

let currentTVConfig: TVTestConfig = { ...defaultTVConfig };

/**
 * Set TV test configuration
 */
export const setTVTestConfig = (config: Partial<TVTestConfig>): void => {
  currentTVConfig = { ...currentTVConfig, ...config };
};

/**
 * Reset TV test configuration to defaults
 */
export const resetTVTestConfig = (): void => {
  currentTVConfig = { ...defaultTVConfig };
};

/**
 * Get current TV test configuration
 */
export const getTVTestConfig = (): TVTestConfig => ({ ...currentTVConfig });

/**
 * Check if running in TV mode
 */
export const isTV = (): boolean => currentTVConfig.isTV;

// ============================================================================
// Keyboard Event Simulation (for TV Remote)
// ============================================================================

export type TVRemoteKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Enter'
  | 'Escape'
  | 'Backspace'
  | 'MediaPlayPause'
  | 'MediaPlay'
  | 'MediaPause';

/**
 * Simulate a TV remote key press using standard keyboard events
 */
export const simulateTVRemoteKey = (key: TVRemoteKey, element?: Element): void => {
  const target = element ?? document.activeElement ?? document.body;
  const keydownEvent = new KeyboardEvent('keydown', {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(keydownEvent);
};

/**
 * Simulate TV remote navigation (arrow keys)
 */
export const simulateTVNavigation = (
  direction: 'up' | 'down' | 'left' | 'right',
  element?: Element
): void => {
  const keyMap: Record<string, TVRemoteKey> = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  };
  simulateTVRemoteKey(keyMap[direction], element);
};

/**
 * Simulate TV remote select (Enter key)
 */
export const simulateTVSelect = (element?: Element): void => {
  simulateTVRemoteKey('Enter', element);
};

/**
 * Simulate TV remote back (Escape key)
 */
export const simulateTVBack = (element?: Element): void => {
  simulateTVRemoteKey('Escape', element);
};

// ============================================================================
// Focus Management Utilities
// ============================================================================

/**
 * Get the currently focused element
 */
export const getFocusedElement = (): Element | null => document.activeElement;

/**
 * Focus an element by selector
 */
export const focusElement = (selector: string): boolean => {
  const element = document.querySelector(selector) as HTMLElement | null;
  if (element && typeof element.focus === 'function') {
    element.focus();
    return document.activeElement === element;
  }
  return false;
};

/**
 * Check if an element is focusable
 */
export const isFocusable = (element: Element): boolean => {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');
  return element.matches(focusableSelector);
};

// ============================================================================
// Timer Utilities
// ============================================================================

/**
 * Helper to advance timers and flush promises
 */
export const advanceTimersAndFlush = async (ms: number = 0): Promise<void> => {
  jest.advanceTimersByTime(ms);
  await Promise.resolve();
};

/**
 * Helper to run all pending timers and flush promises
 */
export const runAllTimersAndFlush = async (): Promise<void> => {
  jest.runAllTimers();
  await Promise.resolve();
};

/**
 * Helper to run only pending timers and flush promises
 */
export const runOnlyPendingTimersAndFlush = async (): Promise<void> => {
  jest.runOnlyPendingTimers();
  await Promise.resolve();
};

// ============================================================================
// Animation Frame Mocks
// ============================================================================

global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 16) as unknown as number;
};

global.cancelAnimationFrame = (id: number): void => {
  clearTimeout(id);
};

// ============================================================================
// Additional Browser API Mocks
// ============================================================================

// Mock matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as unknown as typeof ResizeObserver;

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
})) as unknown as typeof IntersectionObserver;

// Mock setImmediate if not available (Node.js polyfill)
if (typeof setImmediate === 'undefined') {
  (global as unknown as { setImmediate: typeof setTimeout }).setImmediate = ((
    fn: (...args: unknown[]) => void,
    ...args: unknown[]
  ) => setTimeout(() => fn(...args), 0)) as typeof setImmediate;
}

// ============================================================================
// Console Output Management
// ============================================================================

// Suppress specific warnings that are not relevant to tests
const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]): void => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('componentWillReceiveProps') ||
      message.includes('componentWillMount') ||
      message.includes('componentWillUpdate'))
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

const originalConsoleError = console.error;
console.error = (...args: unknown[]): void => {
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
// Test Lifecycle Hooks
// ============================================================================

afterEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  resetTVTestConfig();
});

// ============================================================================
// Exports
// ============================================================================

export { localStorageMock, mockStorage };
