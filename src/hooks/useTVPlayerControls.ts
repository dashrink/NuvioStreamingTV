/**
 * useTVPlayerControls Hook
 *
 * Custom hook for managing TV remote playback controls in video players.
 * Provides comprehensive TV remote support including:
 * - Play/Pause with select button
 * - Seek with left/right D-pad (10 seconds by default)
 * - Volume with up/down D-pad (where supported)
 * - Back/Menu button to exit player
 * - Control overlay auto-show on any D-pad input
 * - Control overlay auto-hide after timeout
 *
 * @example
 * ```tsx
 * import { useTVPlayerControls } from '@/hooks/useTVPlayerControls';
 *
 * function VideoPlayer() {
 *   const [paused, setPaused] = useState(false);
 *   const [showControls, setShowControls] = useState(true);
 *
 *   const { onShowControls, onVolumeChange } = useTVPlayerControls({
 *     paused,
 *     togglePlayback: () => setPaused(!paused),
 *     seek: (seconds) => playerRef.current?.seek(currentTime + seconds),
 *     showControls,
 *     onShowControls: () => setShowControls(true),
 *     onHideControls: () => setShowControls(false),
 *     onExit: () => navigation.goBack(),
 *   });
 *
 *   return (
 *     <PlayerControls
 *       onShowControls={onShowControls}
 *       onVolumeChange={onVolumeChange}
 *       // ...
 *     />
 *   );
 * }
 * ```
 */

import { useCallback, useRef, useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';

import { useTVEventHandler, TVRemoteEvent } from './useTVEventHandler';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Configuration options for useTVPlayerControls
 */
export interface TVPlayerControlsConfig {
  /** Current paused state of the player */
  paused: boolean;
  /** Function to toggle playback (play/pause) */
  togglePlayback: () => void;
  /** Function to seek by a number of seconds (positive = forward, negative = backward) */
  seek: (seconds: number) => void;
  /** Current visibility state of controls overlay */
  showControls: boolean;
  /** Callback when controls should be shown */
  onShowControls: () => void;
  /** Callback when controls should be hidden */
  onHideControls: () => void;
  /** Callback when player should exit (back/menu button) */
  onExit: () => void;
  /** Duration in ms before controls auto-hide (default: 5000) */
  controlsHideTimeout?: number;
  /** Seek step in seconds for left/right D-pad (default: 10) */
  seekStepSeconds?: number;
  /** Whether the hook is enabled (default: true on TV platforms) */
  enabled?: boolean;
  /** Custom volume change handler (optional) */
  onVolumeChange?: (direction: 'up' | 'down') => void;
}

/**
 * Return value from useTVPlayerControls
 */
export interface TVPlayerControlsResult {
  /** Callback to pass to PlayerControls for showing controls */
  onShowControls: () => void;
  /** Callback to pass to PlayerControls for volume changes */
  onVolumeChange: ((direction: 'up' | 'down') => void) | undefined;
  /** Whether TV controls are enabled */
  isEnabled: boolean;
  /** Force show controls */
  showControlsNow: () => void;
  /** Reset the hide timeout */
  resetHideTimeout: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONTROLS_HIDE_TIMEOUT = 5000; // 5 seconds
const DEFAULT_SEEK_STEP_SECONDS = 10; // 10 seconds
const DEBOUNCE_MS = 100; // Debounce rapid inputs

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing TV remote playback controls in video players
 *
 * @param config Configuration options for TV player controls
 * @returns Object containing callbacks and state for TV controls
 */
export function useTVPlayerControls(config: TVPlayerControlsConfig): TVPlayerControlsResult {
  const {
    paused,
    togglePlayback,
    seek,
    showControls,
    onShowControls,
    onHideControls,
    onExit,
    controlsHideTimeout = DEFAULT_CONTROLS_HIDE_TIMEOUT,
    seekStepSeconds = DEFAULT_SEEK_STEP_SECONDS,
    enabled = Platform.isTV,
    onVolumeChange,
  } = config;

  // Refs for tracking state
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimeRef = useRef<number>(0);

  // =============================================================================
  // Timeout Management
  // =============================================================================

  /**
   * Clear any existing hide timeout
   */
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  /**
   * Reset the hide timeout (show controls and start countdown to hide)
   */
  const resetHideTimeout = useCallback(() => {
    clearHideTimeout();

    hideTimeoutRef.current = setTimeout(() => {
      onHideControls();
    }, controlsHideTimeout);
  }, [clearHideTimeout, onHideControls, controlsHideTimeout]);

  /**
   * Show controls and reset the hide timeout
   */
  const showControlsNow = useCallback(() => {
    onShowControls();
    resetHideTimeout();
  }, [onShowControls, resetHideTimeout]);

  // =============================================================================
  // Effect: Cleanup timeout on unmount
  // =============================================================================

  useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout]);

  // =============================================================================
  // Effect: Handle Android TV back button
  // =============================================================================

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;

    const handleBackPress = () => {
      onExit();
      return true; // Prevent default back behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      subscription.remove();
    };
  }, [enabled, onExit]);

  // =============================================================================
  // TV Event Handler
  // =============================================================================

  const handleTVEvent = useCallback(
    (event: TVRemoteEvent) => {
      // Debounce rapid events
      const now = Date.now();
      if (now - lastEventTimeRef.current < DEBOUNCE_MS) {
        return;
      }
      lastEventTimeRef.current = now;

      // Most events should show controls
      const shouldShowControls = ['up', 'down', 'left', 'right', 'select', 'playPause'].includes(
        event.eventType
      );

      if (shouldShowControls && !showControls) {
        showControlsNow();
        // For navigation events, only show controls the first time
        // Let the actual navigation/action happen on subsequent presses
        if (['up', 'down', 'left', 'right'].includes(event.eventType)) {
          return;
        }
      }

      switch (event.eventType) {
        case 'select':
          // Toggle play/pause on select button
          togglePlayback();
          resetHideTimeout();
          break;

        case 'playPause':
          // Toggle play/pause on dedicated play/pause button
          togglePlayback();
          resetHideTimeout();
          break;

        case 'left':
          // Seek backward
          if (showControls) {
            seek(-seekStepSeconds);
            resetHideTimeout();
          }
          break;

        case 'right':
          // Seek forward
          if (showControls) {
            seek(seekStepSeconds);
            resetHideTimeout();
          }
          break;

        case 'up':
          // Volume up (if handler provided)
          if (onVolumeChange && showControls) {
            onVolumeChange('up');
            resetHideTimeout();
          }
          break;

        case 'down':
          // Volume down (if handler provided)
          if (onVolumeChange && showControls) {
            onVolumeChange('down');
            resetHideTimeout();
          }
          break;

        case 'menu':
          // Exit player on menu/back button
          onExit();
          break;

        default:
          break;
      }
    },
    [
      showControls,
      showControlsNow,
      togglePlayback,
      seek,
      seekStepSeconds,
      resetHideTimeout,
      onVolumeChange,
      onExit,
    ]
  );

  // Register TV event handler (only when enabled)
  useTVEventHandler(handleTVEvent, { enabled });

  // =============================================================================
  // Return Value
  // =============================================================================

  return {
    onShowControls: showControlsNow,
    onVolumeChange,
    isEnabled: enabled,
    showControlsNow,
    resetHideTimeout,
  };
}

// =============================================================================
// Utility Types and Functions
// =============================================================================

/**
 * Check if the current platform is a TV
 */
export function isTV(): boolean {
  return Platform.isTV === true;
}

/**
 * Default volume change handler that logs the action
 * (Volume control varies by platform and player backend)
 */
export function createDefaultVolumeHandler(
  getCurrentVolume: () => number,
  setVolume: (volume: number) => void,
  step: number = 0.1
): (direction: 'up' | 'down') => void {
  return (direction: 'up' | 'down') => {
    const currentVolume = getCurrentVolume();
    const newVolume =
      direction === 'up' ? Math.min(1, currentVolume + step) : Math.max(0, currentVolume - step);
    setVolume(newVolume);
  };
}

// =============================================================================
// Exports
// =============================================================================

export default useTVPlayerControls;
