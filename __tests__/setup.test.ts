/**
 * Test Setup Verification
 *
 * This test file verifies that the Jest testing infrastructure
 * is properly configured for TV navigation testing.
 */

import { Platform } from 'react-native';

import {
  mockTVEventHandler,
  mockNavigation,
  simulateTVEvent,
  getTVEventHandlerMock,
  advanceTimersAndFlush,
} from './setup';

describe('Test Setup Verification', () => {
  describe('Platform mock', () => {
    it('should mock Platform.isTV as true', () => {
      expect(Platform.isTV).toBe(true);
    });

    it('should mock Platform.OS as ios', () => {
      expect(Platform.OS).toBe('ios');
    });
  });

  describe('TVEventHandler mock', () => {
    it('should provide mock TVEventHandler methods', () => {
      const handler = getTVEventHandlerMock();
      expect(handler.enable).toBeDefined();
      expect(handler.disable).toBeDefined();
    });

    it('should track TVEventHandler enable calls', () => {
      const callback = jest.fn();
      mockTVEventHandler.enable(null, callback);

      expect(mockTVEventHandler.enable).toHaveBeenCalledWith(null, callback);
    });

    it('should track TVEventHandler disable calls', () => {
      mockTVEventHandler.disable();

      expect(mockTVEventHandler.disable).toHaveBeenCalled();
    });
  });

  describe('Navigation mock', () => {
    it('should provide mock navigation methods', () => {
      expect(mockNavigation.navigate).toBeDefined();
      expect(mockNavigation.goBack).toBeDefined();
      expect(mockNavigation.setParams).toBeDefined();
      expect(mockNavigation.getState).toBeDefined();
    });

    it('should track navigation calls', () => {
      mockNavigation.navigate('TestScreen', { id: '123' });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TestScreen', { id: '123' });
    });

    it('should return expected state from getState', () => {
      const state = mockNavigation.getState();

      expect(state.routes).toBeDefined();
      expect(state.index).toBe(0);
    });
  });

  describe('Timer utilities', () => {
    it('should use fake timers', () => {
      const callback = jest.fn();
      setTimeout(callback, 1000);

      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalled();
    });

    it('should advance timers and flush promises', async () => {
      const callback = jest.fn();
      setTimeout(callback, 500);

      await advanceTimersAndFlush(500);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('TV event simulation', () => {
    it('should simulate TV events to registered handlers', () => {
      const callback = jest.fn();
      mockTVEventHandler.enable(null, callback);

      simulateTVEvent('select');

      expect(callback).toHaveBeenCalledWith({ eventType: 'select' });
    });

    it('should simulate different TV event types', () => {
      const callback = jest.fn();
      mockTVEventHandler.enable(null, callback);

      simulateTVEvent('up');
      expect(callback).toHaveBeenCalledWith({ eventType: 'up' });

      simulateTVEvent('down');
      expect(callback).toHaveBeenCalledWith({ eventType: 'down' });

      simulateTVEvent('left');
      expect(callback).toHaveBeenCalledWith({ eventType: 'left' });

      simulateTVEvent('right');
      expect(callback).toHaveBeenCalledWith({ eventType: 'right' });
    });
  });

  describe('requestAnimationFrame mock', () => {
    it('should mock requestAnimationFrame', () => {
      const callback = jest.fn();
      requestAnimationFrame(callback);

      jest.advanceTimersByTime(16);

      expect(callback).toHaveBeenCalled();
    });

    it('should mock cancelAnimationFrame', () => {
      const callback = jest.fn();
      const id = requestAnimationFrame(callback);
      cancelAnimationFrame(id);

      jest.advanceTimersByTime(16);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('React Native Reanimated mock', () => {
  // Use static import
  const Reanimated = require('react-native-reanimated');

  it('should mock useSharedValue', () => {
    const result = Reanimated.useSharedValue(1);
    expect(result.value).toBe(1);
  });

  it('should mock withSpring', () => {
    const callback = jest.fn();
    const result = Reanimated.withSpring(10, {}, callback);

    expect(result).toBe(10);
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('should mock withTiming', () => {
    const callback = jest.fn();
    const result = Reanimated.withTiming(20, {}, callback);

    expect(result).toBe(20);
    expect(callback).toHaveBeenCalledWith(true);
  });
});
