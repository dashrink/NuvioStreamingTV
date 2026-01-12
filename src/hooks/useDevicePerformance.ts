/**
 * useDevicePerformance Hook
 *
 * Detects device performance tier and provides animation configuration
 * optimized for the device's capabilities. Primarily targets low-end
 * Android TV devices where complex animations may cause jank.
 *
 * Features:
 * - Automatic device tier detection based on available metrics
 * - Platform-specific detection (Android TV vs Apple TV)
 * - Cached performance tier to avoid repeated detection
 * - Provides animation configuration based on device tier
 * - Falls back to border-based focus states on low-end devices
 *
 * Performance Tiers:
 * - HIGH: Full animations (Apple TV, high-end Android TV)
 * - MEDIUM: Reduced animations (mid-range Android TV)
 * - LOW: Minimal animations (low-end Android TV, older devices)
 *
 * @example
 * ```tsx
 * import { useDevicePerformance } from '@/hooks/useDevicePerformance';
 *
 * function MyComponent() {
 *   const { performanceTier, animationConfig } = useDevicePerformance();
 *
 *   return (
 *     <Focusable animationConfig={animationConfig}>
 *       <Text>Content</Text>
 *     </Focusable>
 *   );
 * }
 * ```
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Platform, NativeModules, Dimensions } from 'react-native';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Device performance tier
 */
export enum PerformanceTier {
  /** High-end devices - full animations */
  HIGH = 'high',
  /** Mid-range devices - reduced animations */
  MEDIUM = 'medium',
  /** Low-end devices - minimal animations */
  LOW = 'low',
}

/**
 * Device performance metrics (when available)
 */
export interface DeviceMetrics {
  /** Total RAM in MB (if available) */
  totalMemory?: number;
  /** Available RAM in MB (if available) */
  availableMemory?: number;
  /** Device model name (if available) */
  deviceModel?: string;
  /** Device brand (if available) */
  deviceBrand?: string;
  /** Screen density */
  screenDensity?: number;
  /** Number of CPU cores (if available) */
  cpuCores?: number;
  /** Is this a TV device */
  isTV: boolean;
  /** Platform (android/ios) */
  platform: 'android' | 'ios' | 'other';
}

/**
 * Animation configuration based on performance tier
 */
export interface PerformanceAnimationConfig {
  /** Whether to enable scale animations */
  enableScaleAnimation: boolean;
  /** Scale factor when focused (1.0 for no scale) */
  focusScale: number;
  /** Whether to enable opacity animations */
  enableOpacityAnimation: boolean;
  /** Opacity when unfocused */
  unfocusedOpacity: number;
  /** Whether to enable shadow animations (Apple TV) */
  enableShadowAnimation: boolean;
  /** Whether to enable parallax effects (Apple TV) */
  enableParallax: boolean;
  /** Whether to show focus border */
  showFocusBorder: boolean;
  /** Width of focus border */
  focusBorderWidth: number;
  /** Spring animation damping */
  springDamping: number;
  /** Spring animation stiffness */
  springStiffness: number;
  /** Whether to use reduced motion */
  reducedMotion: boolean;
}

/**
 * Return value from useDevicePerformance hook
 */
export interface UseDevicePerformanceReturn {
  /** Detected performance tier */
  performanceTier: PerformanceTier;
  /** Device metrics (if available) */
  deviceMetrics: DeviceMetrics;
  /** Animation configuration based on performance tier */
  animationConfig: PerformanceAnimationConfig;
  /** Whether performance has been detected */
  isDetected: boolean;
  /** Force a specific performance tier (for testing/settings) */
  setPerformanceTier: (tier: PerformanceTier) => void;
  /** Whether animations should be reduced */
  shouldReduceAnimations: boolean;
  /** Whether device is considered low-end */
  isLowEndDevice: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Memory thresholds for performance detection (in MB)
 */
const MEMORY_THRESHOLDS = {
  /** Below this = LOW tier */
  LOW: 1536, // 1.5 GB
  /** Below this = MEDIUM tier, above = HIGH tier */
  HIGH: 3072, // 3 GB
};

/**
 * Known low-end Android TV device models/brands
 * These are commonly found budget TV boxes
 */
const LOW_END_DEVICE_PATTERNS = [
  // Budget Android TV boxes
  'mxq',
  'mx10',
  'x96',
  't95',
  'h96',
  'tx3',
  'tx6',
  'a95x',
  'mecool',
  'tanix',
  // Generic/unbranded boxes
  'generic',
  'unknown',
  'amlogic',
  // Older FireTV devices
  'aftt', // Fire TV Stick 1st gen
  'aftm', // Fire TV Stick Basic Edition
];

/**
 * Known high-end Android TV device models/brands
 */
const HIGH_END_DEVICE_PATTERNS = [
  // NVIDIA Shield
  'shield',
  'nvidia',
  // Google Chromecast with Google TV
  'chromecast',
  'sabrina',
  // Sony Bravia
  'bravia',
  // Recent FireTV
  'aftka', // Fire TV Stick 4K Max
  'aftr', // Fire TV Cube 2nd gen
  // Xiaomi Mi Box S
  'mi box',
  'mibox',
  // Other premium devices
  'pixel',
  'nexus',
];

/**
 * Animation configs per performance tier
 */
const ANIMATION_CONFIGS: Record<PerformanceTier, PerformanceAnimationConfig> = {
  [PerformanceTier.HIGH]: {
    enableScaleAnimation: true,
    focusScale: 1.05,
    enableOpacityAnimation: true,
    unfocusedOpacity: 0.9,
    enableShadowAnimation: true,
    enableParallax: true,
    showFocusBorder: true,
    focusBorderWidth: 2,
    springDamping: 15,
    springStiffness: 150,
    reducedMotion: false,
  },
  [PerformanceTier.MEDIUM]: {
    enableScaleAnimation: true,
    focusScale: 1.03, // Reduced scale
    enableOpacityAnimation: true,
    unfocusedOpacity: 0.95,
    enableShadowAnimation: false, // No shadows
    enableParallax: false, // No parallax
    showFocusBorder: true,
    focusBorderWidth: 2,
    springDamping: 20, // Faster damping
    springStiffness: 200, // Stiffer spring (faster animation)
    reducedMotion: false,
  },
  [PerformanceTier.LOW]: {
    enableScaleAnimation: false, // No scale animation
    focusScale: 1.0,
    enableOpacityAnimation: false, // No opacity animation
    unfocusedOpacity: 1.0,
    enableShadowAnimation: false, // No shadows
    enableParallax: false, // No parallax
    showFocusBorder: true, // Use border for focus indication
    focusBorderWidth: 3, // Thicker border for visibility
    springDamping: 30, // Very fast damping
    springStiffness: 300, // Very stiff spring (near instant)
    reducedMotion: true,
  },
};

// =============================================================================
// Global Performance State
// =============================================================================

// Cache the detected performance tier globally
let cachedPerformanceTier: PerformanceTier | null = null;
let cachedDeviceMetrics: DeviceMetrics | null = null;
let manualOverrideTier: PerformanceTier | null = null;

// Subscribers for performance tier changes
type PerformanceSubscriber = (tier: PerformanceTier) => void;
const subscribers: Set<PerformanceSubscriber> = new Set();

/**
 * Subscribe to performance tier changes
 */
export function subscribeToPerformanceChanges(callback: PerformanceSubscriber): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Notify all subscribers of a tier change
 */
function notifySubscribers(tier: PerformanceTier): void {
  subscribers.forEach(callback => callback(tier));
}

/**
 * Set a manual performance tier override (for settings/testing)
 */
export function setManualPerformanceTier(tier: PerformanceTier | null): void {
  manualOverrideTier = tier;
  if (tier !== null) {
    notifySubscribers(tier);
  } else if (cachedPerformanceTier !== null) {
    notifySubscribers(cachedPerformanceTier);
  }
}

/**
 * Get the current performance tier (cached or manual)
 */
export function getPerformanceTier(): PerformanceTier {
  return manualOverrideTier ?? cachedPerformanceTier ?? PerformanceTier.HIGH;
}

/**
 * Get the animation config for the current performance tier
 */
export function getAnimationConfig(): PerformanceAnimationConfig {
  return ANIMATION_CONFIGS[getPerformanceTier()];
}

// =============================================================================
// Device Detection Functions
// =============================================================================

/**
 * Get device metrics from native modules and platform APIs
 */
async function getDeviceMetrics(): Promise<DeviceMetrics> {
  const isTV = Platform.isTV === true;
  const platform = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'other';

  const metrics: DeviceMetrics = {
    isTV,
    platform,
  };

  // Get screen density
  const { scale } = Dimensions.get('window');
  metrics.screenDensity = scale;

  // Try to get device info from native modules
  if (Platform.OS === 'android') {
    try {
      // Try to access PlatformConstants for device info
      const constants = NativeModules.PlatformConstants;
      if (constants) {
        metrics.deviceModel = constants.Model?.toLowerCase();
        metrics.deviceBrand = constants.Brand?.toLowerCase();
      }

      // Try to get memory info from DeviceInfo if available
      const deviceInfo = NativeModules.DeviceInfo || NativeModules.RNDeviceInfo;
      if (deviceInfo) {
        if (typeof deviceInfo.getTotalMemory === 'function') {
          const totalMem = await deviceInfo.getTotalMemory();
          metrics.totalMemory = Math.round(totalMem / (1024 * 1024)); // Convert to MB
        }
        if (typeof deviceInfo.getFreeDiskStorage === 'function') {
          // Use as proxy for available resources
        }
      }

      // Try ActivityManager for memory (more reliable)
      const activityManager = NativeModules.ActivityManagerModule;
      if (activityManager && typeof activityManager.getMemoryInfo === 'function') {
        const memInfo = await activityManager.getMemoryInfo();
        if (memInfo) {
          metrics.totalMemory = Math.round(memInfo.totalMem / (1024 * 1024));
          metrics.availableMemory = Math.round(memInfo.availMem / (1024 * 1024));
        }
      }
    } catch (error) {
      // Device info not available - will rely on heuristics
    }
  }

  // iOS/tvOS typically has good performance - detect via model if needed
  if (Platform.OS === 'ios') {
    try {
      const deviceInfo = NativeModules.DeviceInfo || NativeModules.RNDeviceInfo;
      if (deviceInfo) {
        metrics.deviceModel =
          deviceInfo.deviceName?.toLowerCase() || deviceInfo.model?.toLowerCase();
      }
    } catch {
      // Fallback - assume high performance for Apple TV
    }
  }

  return metrics;
}

/**
 * Detect performance tier based on device metrics
 */
function detectPerformanceTier(metrics: DeviceMetrics): PerformanceTier {
  // Apple TV is always high performance
  if (metrics.platform === 'ios' && metrics.isTV) {
    return PerformanceTier.HIGH;
  }

  // Non-TV devices - default to high
  if (!metrics.isTV) {
    return PerformanceTier.HIGH;
  }

  // Android TV detection
  const deviceModel = metrics.deviceModel || '';
  const deviceBrand = metrics.deviceBrand || '';
  const combinedName = `${deviceBrand} ${deviceModel}`.toLowerCase();

  // Check against known device patterns
  const isKnownLowEnd = LOW_END_DEVICE_PATTERNS.some(
    pattern => combinedName.includes(pattern) || deviceModel.includes(pattern)
  );

  const isKnownHighEnd = HIGH_END_DEVICE_PATTERNS.some(
    pattern => combinedName.includes(pattern) || deviceModel.includes(pattern)
  );

  // Known device check takes priority
  if (isKnownLowEnd && !isKnownHighEnd) {
    return PerformanceTier.LOW;
  }

  if (isKnownHighEnd) {
    return PerformanceTier.HIGH;
  }

  // Memory-based detection
  if (metrics.totalMemory !== undefined) {
    if (metrics.totalMemory < MEMORY_THRESHOLDS.LOW) {
      return PerformanceTier.LOW;
    }
    if (metrics.totalMemory < MEMORY_THRESHOLDS.HIGH) {
      return PerformanceTier.MEDIUM;
    }
    return PerformanceTier.HIGH;
  }

  // Screen density heuristic (low density often indicates lower-end device)
  if (metrics.screenDensity !== undefined && metrics.screenDensity < 1.5) {
    return PerformanceTier.MEDIUM;
  }

  // Default to MEDIUM for unknown Android TV devices (safe choice)
  if (metrics.platform === 'android' && metrics.isTV) {
    return PerformanceTier.MEDIUM;
  }

  // Default to HIGH for all other cases
  return PerformanceTier.HIGH;
}

/**
 * Initialize performance detection (call once at app startup)
 */
export async function initializePerformanceDetection(): Promise<PerformanceTier> {
  if (cachedPerformanceTier !== null && cachedDeviceMetrics !== null) {
    return cachedPerformanceTier;
  }

  try {
    const metrics = await getDeviceMetrics();
    cachedDeviceMetrics = metrics;
    cachedPerformanceTier = detectPerformanceTier(metrics);
    notifySubscribers(cachedPerformanceTier);
    return cachedPerformanceTier;
  } catch (error) {
    // Default to MEDIUM on detection failure for safety
    cachedPerformanceTier = Platform.isTV ? PerformanceTier.MEDIUM : PerformanceTier.HIGH;
    cachedDeviceMetrics = {
      isTV: Platform.isTV === true,
      platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'other',
    };
    return cachedPerformanceTier;
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for accessing device performance tier and animation configuration
 */
export function useDevicePerformance(): UseDevicePerformanceReturn {
  const [performanceTier, setLocalPerformanceTier] = useState<PerformanceTier>(
    () => manualOverrideTier ?? cachedPerformanceTier ?? PerformanceTier.HIGH
  );
  const [isDetected, setIsDetected] = useState<boolean>(cachedPerformanceTier !== null);
  const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetrics>(
    () =>
      cachedDeviceMetrics ?? {
        isTV: Platform.isTV === true,
        platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'other',
      }
  );

  // Subscribe to performance tier changes
  useEffect(() => {
    const unsubscribe = subscribeToPerformanceChanges(tier => {
      setLocalPerformanceTier(tier);
    });
    return unsubscribe;
  }, []);

  // Initialize performance detection if not already done
  useEffect(() => {
    if (cachedPerformanceTier === null) {
      initializePerformanceDetection().then(tier => {
        setLocalPerformanceTier(tier);
        setIsDetected(true);
        if (cachedDeviceMetrics) {
          setDeviceMetrics(cachedDeviceMetrics);
        }
      });
    }
  }, []);

  // Set a manual performance tier
  const setPerformanceTier = useCallback((tier: PerformanceTier) => {
    setManualPerformanceTier(tier);
    setLocalPerformanceTier(tier);
  }, []);

  // Get the animation config for the current tier
  const animationConfig = useMemo(() => {
    return ANIMATION_CONFIGS[performanceTier];
  }, [performanceTier]);

  // Computed values
  const shouldReduceAnimations = useMemo(() => {
    return performanceTier === PerformanceTier.LOW || performanceTier === PerformanceTier.MEDIUM;
  }, [performanceTier]);

  const isLowEndDevice = useMemo(() => {
    return performanceTier === PerformanceTier.LOW;
  }, [performanceTier]);

  return {
    performanceTier,
    deviceMetrics,
    animationConfig,
    isDetected,
    setPerformanceTier,
    shouldReduceAnimations,
    isLowEndDevice,
  };
}

// =============================================================================
// Utility Functions for Components
// =============================================================================

/**
 * Get reduced focus scale based on performance tier
 */
export function getFocusScale(baseTier?: PerformanceTier): number {
  const tier = baseTier ?? getPerformanceTier();
  return ANIMATION_CONFIGS[tier].focusScale;
}

/**
 * Get spring config based on performance tier
 */
export function getSpringConfig(baseTier?: PerformanceTier): {
  damping: number;
  stiffness: number;
} {
  const tier = baseTier ?? getPerformanceTier();
  const config = ANIMATION_CONFIGS[tier];
  return {
    damping: config.springDamping,
    stiffness: config.springStiffness,
  };
}

/**
 * Check if scale animations should be enabled
 */
export function shouldEnableScaleAnimation(baseTier?: PerformanceTier): boolean {
  const tier = baseTier ?? getPerformanceTier();
  return ANIMATION_CONFIGS[tier].enableScaleAnimation;
}

/**
 * Check if parallax effects should be enabled
 */
export function shouldEnableParallax(baseTier?: PerformanceTier): boolean {
  const tier = baseTier ?? getPerformanceTier();
  return ANIMATION_CONFIGS[tier].enableParallax;
}

/**
 * Check if shadow animations should be enabled
 */
export function shouldEnableShadowAnimation(baseTier?: PerformanceTier): boolean {
  const tier = baseTier ?? getPerformanceTier();
  return ANIMATION_CONFIGS[tier].enableShadowAnimation;
}

// =============================================================================
// Export Default
// =============================================================================

export default useDevicePerformance;
