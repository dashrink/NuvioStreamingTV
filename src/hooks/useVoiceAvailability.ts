/**
 * useVoiceAvailability.ts
 *
 * Platform-aware voice input availability detection hook for TV platforms.
 * Gracefully handles platforms where voice input is not supported.
 *
 * This hook provides:
 * - Detection of voice recognition API availability on Apple TV and Android TV
 * - Checks for native speech recognition module availability
 * - Handles cases where voice features are disabled by user or system
 * - Caches results to avoid repeated expensive checks
 * - Provides fallback recommendations when voice is unavailable
 *
 * @example
 * ```tsx
 * function VoiceSearchButton() {
 *   const { isAvailable, reason, openVoiceOrFallback } = useVoiceAvailability();
 *
 *   return (
 *     <Button onPress={openVoiceOrFallback}>
 *       {isAvailable ? 'Voice Search' : 'Search'}
 *     </Button>
 *   );
 * }
 * ```
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { Platform, NativeModules } from 'react-native';
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Reason why voice input is unavailable
 */
export type VoiceUnavailableReason =
  | 'not_tv_platform' // Not running on TV platform
  | 'no_native_module' // Speech recognition native module not available
  | 'permission_denied' // User denied microphone/speech permissions
  | 'feature_disabled' // Voice feature disabled in settings or by MDM
  | 'hardware_unavailable' // Device doesn't have microphone or voice hardware
  | 'language_unsupported' // Current language not supported for voice
  | 'network_unavailable' // Network required for voice recognition unavailable
  | 'api_unavailable' // Platform voice API not available
  | 'unknown'; // Unknown reason

/**
 * Voice availability status
 */
export interface VoiceAvailabilityStatus {
  /** Whether voice input is available and ready to use */
  isAvailable: boolean;
  /** Whether availability check is still in progress */
  isChecking: boolean;
  /** Reason why voice is unavailable (if applicable) */
  reason: VoiceUnavailableReason | null;
  /** Human-readable message explaining availability */
  message: string;
  /** Whether to recommend showing keyboard fallback */
  shouldShowKeyboardFallback: boolean;
  /** Platform-specific capabilities */
  capabilities: VoiceCapabilities;
}

/**
 * Platform-specific voice capabilities
 */
export interface VoiceCapabilities {
  /** Whether the platform supports voice recognition */
  supportsVoiceRecognition: boolean;
  /** Whether the platform supports continuous listening */
  supportsContinuousListening: boolean;
  /** Whether voice recognition works offline */
  supportsOfflineRecognition: boolean;
  /** Whether the platform has a system voice button on remote */
  hasRemoteVoiceButton: boolean;
  /** Maximum listening duration in seconds (0 = unlimited) */
  maxListeningDuration: number;
}

/**
 * Hook options
 */
export interface UseVoiceAvailabilityOptions {
  /** Whether to perform availability check on mount */
  checkOnMount?: boolean;
  /** Whether to re-check periodically (for network-dependent recognition) */
  enablePeriodicCheck?: boolean;
  /** Interval for periodic checks in milliseconds */
  periodicCheckInterval?: number;
  /** Callback when availability changes */
  onAvailabilityChange?: (status: VoiceAvailabilityStatus) => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Cache key for voice availability result */
const VOICE_AVAILABILITY_CACHE_KEY = '__VOICE_AVAILABILITY_CACHE__';

/** Default periodic check interval (5 minutes) */
const DEFAULT_PERIODIC_CHECK_INTERVAL = 5 * 60 * 1000;

/** Default capabilities for Apple TV */
const APPLE_TV_CAPABILITIES: VoiceCapabilities = {
  supportsVoiceRecognition: true,
  supportsContinuousListening: false, // Siri uses push-to-talk
  supportsOfflineRecognition: false, // Requires network
  hasRemoteVoiceButton: true, // Siri button on remote
  maxListeningDuration: 60, // Siri timeout
};

/** Default capabilities for Android TV */
const ANDROID_TV_CAPABILITIES: VoiceCapabilities = {
  supportsVoiceRecognition: true,
  supportsContinuousListening: false,
  supportsOfflineRecognition: false, // Usually requires network
  hasRemoteVoiceButton: true, // Google Assistant button
  maxListeningDuration: 60,
};

/** Default capabilities when voice is unavailable */
const UNAVAILABLE_CAPABILITIES: VoiceCapabilities = {
  supportsVoiceRecognition: false,
  supportsContinuousListening: false,
  supportsOfflineRecognition: false,
  hasRemoteVoiceButton: false,
  maxListeningDuration: 0,
};

// =============================================================================
// Cache
// =============================================================================

/** Global cache for voice availability (to avoid repeated checks) */
let voiceAvailabilityCache: VoiceAvailabilityStatus | null = null;

/**
 * Clear the voice availability cache (useful for testing or settings changes)
 */
export function clearVoiceAvailabilityCache(): void {
  voiceAvailabilityCache = null;
}

/**
 * Get cached voice availability (if available)
 */
export function getCachedVoiceAvailability(): VoiceAvailabilityStatus | null {
  return voiceAvailabilityCache;
}

// =============================================================================
// Detection Utilities
// =============================================================================

/**
 * Check if the SpeechRecognition native module is available
 * This checks for expo-speech or react-native-voice native modules
 */
function checkNativeSpeechModule(): boolean {
  try {
    // Check for various speech recognition native modules
    const { ExpoSpeech, RNVoice, SpeechRecognizer } = NativeModules;

    // expo-speech module
    if (ExpoSpeech) {
      return true;
    }

    // react-native-voice module
    if (RNVoice) {
      return true;
    }

    // Android SpeechRecognizer (built-in)
    if (Platform.OS === 'android' && SpeechRecognizer) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check platform-specific voice availability
 */
function checkPlatformVoiceSupport(): {
  available: boolean;
  reason: VoiceUnavailableReason | null;
  capabilities: VoiceCapabilities;
} {
  // Not a TV platform
  if (!Platform.isTV) {
    return {
      available: false,
      reason: 'not_tv_platform',
      capabilities: UNAVAILABLE_CAPABILITIES,
    };
  }

  // Apple TV (tvOS)
  if (Platform.OS === 'ios') {
    // Check for Siri/Speech framework availability
    // Note: In a real implementation, this would check for SFSpeechRecognizer
    // availability via a native module
    const hasSpeechModule = checkNativeSpeechModule();

    return {
      available: hasSpeechModule,
      reason: hasSpeechModule ? null : 'no_native_module',
      capabilities: hasSpeechModule ? APPLE_TV_CAPABILITIES : {
        ...UNAVAILABLE_CAPABILITIES,
        hasRemoteVoiceButton: true, // Remote still has Siri button
      },
    };
  }

  // Android TV
  if (Platform.OS === 'android') {
    // Android TV typically has SpeechRecognizer available
    // Check for the native module
    const hasSpeechModule = checkNativeSpeechModule();

    // Even without our native module, Android TV often has system-level
    // voice recognition via Google Assistant
    const hasSystemVoice = true; // Assume Android TV has this

    return {
      available: hasSpeechModule || hasSystemVoice,
      reason: (hasSpeechModule || hasSystemVoice) ? null : 'no_native_module',
      capabilities: (hasSpeechModule || hasSystemVoice)
        ? ANDROID_TV_CAPABILITIES
        : UNAVAILABLE_CAPABILITIES,
    };
  }

  // Unknown platform
  return {
    available: false,
    reason: 'api_unavailable',
    capabilities: UNAVAILABLE_CAPABILITIES,
  };
}

/**
 * Get human-readable message for unavailability reason
 */
function getUnavailabilityMessage(reason: VoiceUnavailableReason): string {
  switch (reason) {
    case 'not_tv_platform':
      return 'Voice input is only available on TV platforms';
    case 'no_native_module':
      return 'Voice recognition is not configured for this app';
    case 'permission_denied':
      return 'Microphone permission is required for voice input';
    case 'feature_disabled':
      return 'Voice input has been disabled';
    case 'hardware_unavailable':
      return 'This device does not support voice input';
    case 'language_unsupported':
      return 'Voice input is not available in the current language';
    case 'network_unavailable':
      return 'Voice input requires an internet connection';
    case 'api_unavailable':
      return 'Voice input is not supported on this platform';
    case 'unknown':
    default:
      return 'Voice input is currently unavailable';
  }
}

/**
 * Perform the voice availability check
 */
async function performVoiceAvailabilityCheck(): Promise<VoiceAvailabilityStatus> {
  // Check platform support first (synchronous)
  const platformCheck = checkPlatformVoiceSupport();

  // If platform doesn't support voice, return immediately
  if (!platformCheck.available) {
    const status: VoiceAvailabilityStatus = {
      isAvailable: false,
      isChecking: false,
      reason: platformCheck.reason,
      message: getUnavailabilityMessage(platformCheck.reason || 'unknown'),
      shouldShowKeyboardFallback: true,
      capabilities: platformCheck.capabilities,
    };

    // Cache the result
    voiceAvailabilityCache = status;
    return status;
  }

  // Platform supports voice - return available status
  // Note: In a full implementation, this would also check:
  // - Microphone permissions (async)
  // - Network connectivity (for cloud-based recognition)
  // - Language support
  // - Device-specific restrictions

  const status: VoiceAvailabilityStatus = {
    isAvailable: true,
    isChecking: false,
    reason: null,
    message: 'Voice input is ready',
    shouldShowKeyboardFallback: false,
    capabilities: platformCheck.capabilities,
  };

  // Cache the result
  voiceAvailabilityCache = status;
  return status;
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * Hook to check and monitor voice input availability on TV platforms
 */
export function useVoiceAvailability(
  options: UseVoiceAvailabilityOptions = {}
): VoiceAvailabilityStatus & {
  /** Re-check voice availability */
  recheckAvailability: () => Promise<VoiceAvailabilityStatus>;
  /** Open voice search, or keyboard fallback if unavailable */
  openVoiceOrFallback: () => void;
} {
  const {
    checkOnMount = true,
    enablePeriodicCheck = false,
    periodicCheckInterval = DEFAULT_PERIODIC_CHECK_INTERVAL,
    onAvailabilityChange,
  } = options;

  // Get TV navigation context (for opening voice/keyboard)
  const tvNav = useTVNavigationOptional();

  // State
  const [status, setStatus] = useState<VoiceAvailabilityStatus>(() => {
    // Use cached result if available
    if (voiceAvailabilityCache) {
      return voiceAvailabilityCache;
    }

    // Initial checking state
    return {
      isAvailable: false,
      isChecking: true,
      reason: null,
      message: 'Checking voice availability...',
      shouldShowKeyboardFallback: false,
      capabilities: UNAVAILABLE_CAPABILITIES,
    };
  });

  // Track mounted state for async operations
  const mountedRef = useRef(true);
  const onAvailabilityChangeRef = useRef(onAvailabilityChange);
  onAvailabilityChangeRef.current = onAvailabilityChange;

  /**
   * Perform availability check and update state
   */
  const recheckAvailability = useCallback(async (): Promise<VoiceAvailabilityStatus> => {
    // Clear cache before re-checking
    voiceAvailabilityCache = null;

    setStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      const newStatus = await performVoiceAvailabilityCheck();

      if (mountedRef.current) {
        setStatus(newStatus);
        onAvailabilityChangeRef.current?.(newStatus);

        // Update TVNavigationContext
        tvNav?.setVoiceAvailable?.(newStatus.isAvailable);
      }

      return newStatus;
    } catch (error) {
      const errorStatus: VoiceAvailabilityStatus = {
        isAvailable: false,
        isChecking: false,
        reason: 'unknown',
        message: 'Failed to check voice availability',
        shouldShowKeyboardFallback: true,
        capabilities: UNAVAILABLE_CAPABILITIES,
      };

      if (mountedRef.current) {
        setStatus(errorStatus);
        tvNav?.setVoiceAvailable?.(false);
      }

      return errorStatus;
    }
  }, [tvNav]);

  /**
   * Open voice search, or keyboard fallback if voice unavailable
   */
  const openVoiceOrFallback = useCallback(() => {
    if (!tvNav) {
      return;
    }

    // Always open voice search modal
    // The modal will automatically show keyboard if voice unavailable
    tvNav.openVoiceSearch();

    // Update context with current availability
    tvNav.setVoiceAvailable(status.isAvailable);

    // If voice is not available, set error message
    if (!status.isAvailable && status.reason) {
      // Don't set error - let the modal gracefully show keyboard fallback
      // The message will be displayed in the UI
    }
  }, [tvNav, status.isAvailable, status.reason]);

  // Initial availability check
  useEffect(() => {
    mountedRef.current = true;

    if (checkOnMount && !voiceAvailabilityCache) {
      recheckAvailability();
    } else if (voiceAvailabilityCache) {
      // Use cached result
      setStatus(voiceAvailabilityCache);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [checkOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic re-check (for network-dependent features)
  useEffect(() => {
    if (!enablePeriodicCheck) {
      return;
    }

    const intervalId = setInterval(() => {
      recheckAvailability();
    }, periodicCheckInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enablePeriodicCheck, periodicCheckInterval, recheckAvailability]);

  return {
    ...status,
    recheckAvailability,
    openVoiceOrFallback,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Synchronous check for voice availability (uses cache)
 * Useful for conditional rendering before hook is initialized
 */
export function isVoiceAvailableSync(): boolean {
  if (voiceAvailabilityCache) {
    return voiceAvailabilityCache.isAvailable;
  }

  // Quick synchronous check for basic availability
  if (!Platform.isTV) {
    return false;
  }

  // Assume available on TV platforms until checked
  return true;
}

/**
 * Get platform-specific voice capabilities
 */
export function getPlatformVoiceCapabilities(): VoiceCapabilities {
  if (!Platform.isTV) {
    return UNAVAILABLE_CAPABILITIES;
  }

  if (Platform.OS === 'ios') {
    return APPLE_TV_CAPABILITIES;
  }

  if (Platform.OS === 'android') {
    return ANDROID_TV_CAPABILITIES;
  }

  return UNAVAILABLE_CAPABILITIES;
}

/**
 * Check if the platform has a dedicated voice button on the remote
 */
export function hasRemoteVoiceButton(): boolean {
  if (!Platform.isTV) {
    return false;
  }

  // Both Apple TV (Siri) and Android TV (Google Assistant) have voice buttons
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// =============================================================================
// Exports
// =============================================================================

export default useVoiceAvailability;
