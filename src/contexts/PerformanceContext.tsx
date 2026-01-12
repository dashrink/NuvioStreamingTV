/**
 * PerformanceContext.tsx
 *
 * Context for global device performance state management.
 * Provides easy access to performance tier and animation configuration
 * throughout the application.
 *
 * Features:
 * - Initializes performance detection on mount
 * - Provides performance tier and animation config to all children
 * - Allows manual performance tier override (for settings)
 * - Subscribes to performance tier changes
 *
 * @example
 * ```tsx
 * // In your app root:
 * import { PerformanceProvider } from '@/contexts/PerformanceContext';
 *
 * function App() {
 *   return (
 *     <PerformanceProvider>
 *       <MainApp />
 *     </PerformanceProvider>
 *   );
 * }
 *
 * // In any component:
 * import { usePerformance } from '@/contexts/PerformanceContext';
 *
 * function MyComponent() {
 *   const { performanceTier, isLowEndDevice, animationConfig } = usePerformance();
 *
 *   return isLowEndDevice ? <SimpleFocusIndicator /> : <AnimatedFocusIndicator />;
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';

import {
  PerformanceTier,
  DeviceMetrics,
  PerformanceAnimationConfig,
  initializePerformanceDetection,
  setManualPerformanceTier,
  getPerformanceTier,
  getAnimationConfig,
  subscribeToPerformanceChanges,
} from '../hooks/useDevicePerformance';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Performance context state
 */
export interface PerformanceContextState {
  /** Current performance tier */
  performanceTier: PerformanceTier;
  /** Whether performance has been detected */
  isDetected: boolean;
  /** Whether device is considered low-end */
  isLowEndDevice: boolean;
  /** Whether animations should be reduced */
  shouldReduceAnimations: boolean;
  /** Animation configuration based on performance tier */
  animationConfig: PerformanceAnimationConfig;
  /** Set a manual performance tier (for settings) */
  setPerformanceTier: (tier: PerformanceTier) => void;
  /** Clear manual override and use auto-detected tier */
  clearPerformanceOverride: () => void;
  /** Whether we're on a TV platform */
  isTV: boolean;
}

// =============================================================================
// Context
// =============================================================================

const PerformanceContext = createContext<PerformanceContextState | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface PerformanceProviderProps {
  children: ReactNode;
  /** Default performance tier to use before detection completes */
  defaultTier?: PerformanceTier;
}

/**
 * Provider component for device performance context
 */
export function PerformanceProvider({
  children,
  defaultTier = PerformanceTier.HIGH,
}: PerformanceProviderProps): JSX.Element {
  const [performanceTier, setLocalPerformanceTier] = useState<PerformanceTier>(
    () => getPerformanceTier() ?? defaultTier
  );
  const [isDetected, setIsDetected] = useState<boolean>(false);
  const [hasManualOverride, setHasManualOverride] = useState<boolean>(false);

  // Initialize performance detection on mount
  useEffect(() => {
    initializePerformanceDetection().then(tier => {
      if (!hasManualOverride) {
        setLocalPerformanceTier(tier);
      }
      setIsDetected(true);
    });
  }, [hasManualOverride]);

  // Subscribe to performance tier changes
  useEffect(() => {
    const unsubscribe = subscribeToPerformanceChanges(tier => {
      setLocalPerformanceTier(tier);
    });
    return unsubscribe;
  }, []);

  // Set a manual performance tier
  const setPerformanceTier = useCallback((tier: PerformanceTier) => {
    setManualPerformanceTier(tier);
    setLocalPerformanceTier(tier);
    setHasManualOverride(true);
  }, []);

  // Clear manual override
  const clearPerformanceOverride = useCallback(() => {
    setManualPerformanceTier(null);
    setHasManualOverride(false);
    // Re-initialize to get actual detected tier
    initializePerformanceDetection().then(tier => {
      setLocalPerformanceTier(tier);
    });
  }, []);

  // Computed values
  const isLowEndDevice = performanceTier === PerformanceTier.LOW;
  const shouldReduceAnimations =
    performanceTier === PerformanceTier.LOW || performanceTier === PerformanceTier.MEDIUM;
  const animationConfig = getAnimationConfig();
  const isTV = Platform.isTV === true;

  const value: PerformanceContextState = useMemo(
    () => ({
      performanceTier,
      isDetected,
      isLowEndDevice,
      shouldReduceAnimations,
      animationConfig,
      setPerformanceTier,
      clearPerformanceOverride,
      isTV,
    }),
    [
      performanceTier,
      isDetected,
      isLowEndDevice,
      shouldReduceAnimations,
      animationConfig,
      setPerformanceTier,
      clearPerformanceOverride,
      isTV,
    ]
  );

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access performance context
 * Throws if used outside of PerformanceProvider
 */
export function usePerformance(): PerformanceContextState {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}

/**
 * Hook to optionally access performance context
 * Returns null if used outside of PerformanceProvider (no error)
 */
export function usePerformanceOptional(): PerformanceContextState | null {
  return useContext(PerformanceContext);
}

/**
 * Hook to get just the performance tier
 */
export function usePerformanceTier(): PerformanceTier {
  const context = usePerformanceOptional();
  return context?.performanceTier ?? getPerformanceTier();
}

/**
 * Hook to check if we should reduce animations
 */
export function useShouldReduceAnimations(): boolean {
  const context = usePerformanceOptional();
  if (context) {
    return context.shouldReduceAnimations;
  }
  const tier = getPerformanceTier();
  return tier === PerformanceTier.LOW || tier === PerformanceTier.MEDIUM;
}

/**
 * Hook to check if device is low-end
 */
export function useIsLowEndDevice(): boolean {
  const context = usePerformanceOptional();
  if (context) {
    return context.isLowEndDevice;
  }
  return getPerformanceTier() === PerformanceTier.LOW;
}

// =============================================================================
// Exports
// =============================================================================

export default PerformanceContext;

export { PerformanceTier };
