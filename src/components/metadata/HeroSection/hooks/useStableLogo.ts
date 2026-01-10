/**
 * useStableLogo - Custom hook for logo state management
 *
 * Encapsulates logo loading logic with three-level fallback:
 * 1. TMDB logo (primary)
 * 2. Addon logo (secondary fallback)
 * 3. Text title (final fallback)
 *
 * Features:
 * - Stable logo URI management to prevent layout jumps
 * - Grace period before showing text fallback to prevent flickering
 * - Error handling with automatic fallback progression
 * - Smooth fade animations when logo loads
 *
 * @example
 * const {
 *   stableLogoUri,
 *   shouldShowTextFallback,
 *   logoLoadOpacity,
 *   handleLogoLoad,
 *   handleLogoError,
 * } = useStableLogo({
 *   logo: metadata?.logo,
 *   addonLogo: metadata?.addonLogo,
 *   onStableLogoUriChange,
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSharedValue, withTiming, SharedValue } from 'react-native-reanimated';
import { LOGO_CONFIG, UI_TIMING } from '../constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the useStableLogo hook
 */
export interface UseStableLogoProps {
  /** Primary logo URL (typically from TMDB) */
  logo?: string | null;
  /** Secondary fallback logo URL (from addon) */
  addonLogo?: string | null;
  /** Callback when stable logo URI changes */
  onStableLogoUriChange?: (logoUri: string | null) => void;
}

/**
 * Return type for the useStableLogo hook
 */
export interface UseStableLogoReturn {
  /** The currently stable logo URI to display */
  stableLogoUri: string | null;
  /** Whether text fallback should be shown instead of logo */
  shouldShowTextFallback: boolean;
  /** Whether a logo has loaded successfully */
  logoHasLoadedSuccessfully: boolean;
  /** Shared value for logo load fade-in animation (0 = hidden, 1 = visible) */
  logoLoadOpacity: SharedValue<number>;
  /** Handler for successful logo load */
  handleLogoLoad: () => void;
  /** Handler for logo load error - implements fallback logic */
  handleLogoError: () => void;
  /** Reset logo state to initial values (useful when content changes) */
  resetLogoState: () => void;
  /** Manually set the stable logo URI */
  setStableLogoUri: (uri: string | null) => void;
  /** Current fallback level: 'primary' | 'addon' | 'text' */
  fallbackLevel: 'primary' | 'addon' | 'text';
}

/**
 * Fallback level type for tracking current logo state
 */
type FallbackLevel = 'primary' | 'addon' | 'text';

// =============================================================================
// Hook Implementation
// =============================================================================

export function useStableLogo({
  logo,
  addonLogo,
  onStableLogoUriChange,
}: UseStableLogoProps): UseStableLogoReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /**
   * The currently stable logo URI that should be displayed.
   * Prevents flickering by not changing until a new logo is confirmed to load.
   */
  const [stableLogoUri, setStableLogoUri] = useState<string | null>(logo || null);

  /**
   * Whether a logo has successfully loaded at least once.
   * Used to keep showing the last successful logo even if it fails to reload.
   */
  const [logoHasLoadedSuccessfully, setLogoHasLoadedSuccessfully] = useState(false);

  /**
   * Whether the text fallback should be shown.
   * Only true when no logos are available AND grace period has elapsed.
   */
  const [shouldShowTextFallback, setShouldShowTextFallback] = useState<boolean>(!logo);

  /**
   * Current fallback level for debugging and conditional rendering.
   */
  const [fallbackLevel, setFallbackLevel] = useState<FallbackLevel>(
    logo ? 'primary' : addonLogo ? 'addon' : 'text'
  );

  // ---------------------------------------------------------------------------
  // Animation Values
  // ---------------------------------------------------------------------------

  /**
   * Shared value for smooth fade-in when logo finishes loading.
   * Starts at 0 and animates to 1 when logo loads.
   */
  const logoLoadOpacity = useSharedValue(0);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  /**
   * Timer ref for grace period before showing text fallback.
   * Prevents flickering when logo arrives slightly delayed.
   */
  const logoWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Ref to track the last synced logo to detect changes.
   * Prevents circular dependency with error handling.
   */
  const lastSyncedLogoRef = useRef<string | undefined>(logo || undefined);

  /**
   * Ref to track whether we've already tried the addon logo fallback.
   * Prevents infinite loops in error handling.
   */
  const triedAddonFallbackRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Cleanup Helper
  // ---------------------------------------------------------------------------

  /**
   * Clears the grace period timer safely
   */
  const clearGraceTimer = useCallback(() => {
    if (logoWaitTimerRef.current) {
      try {
        clearTimeout(logoWaitTimerRef.current);
      } catch (_e) {
        // Ignore cleanup errors
      }
      logoWaitTimerRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Logo Change Effect
  // ---------------------------------------------------------------------------

  /**
   * Update stable logo URI when the primary logo prop changes.
   * Implements grace period logic for text fallback.
   */
  useEffect(() => {
    const currentLogo = logo;

    // Only react to actual changes
    if (currentLogo !== lastSyncedLogoRef.current) {
      lastSyncedLogoRef.current = currentLogo || undefined;

      // Clear any existing grace timer
      clearGraceTimer();

      // Reset addon fallback tracking when primary logo changes
      triedAddonFallbackRef.current = false;

      if (currentLogo) {
        // New logo available - reset states and prepare to show it
        setStableLogoUri(currentLogo);
        onStableLogoUriChange?.(currentLogo);
        setLogoHasLoadedSuccessfully(false);
        logoLoadOpacity.value = 0; // Reset fade for new logo
        setShouldShowTextFallback(false);
        setFallbackLevel('primary');
      } else if (addonLogo) {
        // No primary logo but addon available - try addon
        setStableLogoUri(addonLogo);
        onStableLogoUriChange?.(addonLogo);
        setLogoHasLoadedSuccessfully(false);
        logoLoadOpacity.value = 0;
        setShouldShowTextFallback(false);
        setFallbackLevel('addon');
        triedAddonFallbackRef.current = true;
      } else {
        // No logos available - clear and start grace period
        setStableLogoUri(null);
        onStableLogoUriChange?.(null);
        setLogoHasLoadedSuccessfully(false);

        // Start grace period before showing text fallback
        // This prevents flickering when logo arrives slightly late
        logoWaitTimerRef.current = setTimeout(() => {
          setShouldShowTextFallback(true);
          setFallbackLevel('text');
        }, LOGO_CONFIG.TEXT_FALLBACK_DELAY);
      }
    }

    // Cleanup on unmount
    return () => {
      clearGraceTimer();
    };
  }, [logo, addonLogo, onStableLogoUriChange, logoLoadOpacity, clearGraceTimer]);

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle successful logo load.
   * Once loaded successfully, the logo state becomes stable.
   */
  const handleLogoLoad = useCallback(() => {
    setLogoHasLoadedSuccessfully(true);
    setShouldShowTextFallback(false);

    // Animate logo fade-in
    logoLoadOpacity.value = withTiming(1, { duration: UI_TIMING.LOGO_LOAD });

    // Clear any pending grace timer since we have a logo now
    clearGraceTimer();
  }, [logoLoadOpacity, clearGraceTimer]);

  /**
   * Handle logo load error.
   * Implements three-level fallback: TMDB logo → addon logo → text
   */
  const handleLogoError = useCallback(() => {
    // If a logo was already loaded successfully, keep showing it
    // This prevents flashing to text if a cached logo fails to reload
    if (logoHasLoadedSuccessfully) {
      return;
    }

    // Determine current fallback state
    const currentUri = stableLogoUri;
    const isPrimaryLogo = currentUri === logo;
    const isAddonLogo = currentUri === addonLogo;

    if (isPrimaryLogo && addonLogo && !triedAddonFallbackRef.current) {
      // Primary logo failed, try addon logo as fallback
      triedAddonFallbackRef.current = true;
      setStableLogoUri(addonLogo);
      onStableLogoUriChange?.(addonLogo);
      setLogoHasLoadedSuccessfully(false);
      logoLoadOpacity.value = 0; // Reset fade for new logo attempt
      setFallbackLevel('addon');
    } else if (isAddonLogo || (isPrimaryLogo && !addonLogo) || triedAddonFallbackRef.current) {
      // Addon logo also failed, or no addon logo available - show text
      setStableLogoUri(null);
      onStableLogoUriChange?.(null);
      setShouldShowTextFallback(true);
      setFallbackLevel('text');
    } else {
      // Fallback to text for any other unexpected state
      setStableLogoUri(null);
      onStableLogoUriChange?.(null);
      setShouldShowTextFallback(true);
      setFallbackLevel('text');
    }
  }, [
    logoHasLoadedSuccessfully,
    stableLogoUri,
    logo,
    addonLogo,
    logoLoadOpacity,
    onStableLogoUriChange,
  ]);

  /**
   * Reset logo state to initial values.
   * Useful when navigating to new content.
   */
  const resetLogoState = useCallback(() => {
    clearGraceTimer();
    triedAddonFallbackRef.current = false;
    lastSyncedLogoRef.current = undefined;

    setStableLogoUri(null);
    setLogoHasLoadedSuccessfully(false);
    setShouldShowTextFallback(true);
    setFallbackLevel('text');
    logoLoadOpacity.value = 0;
    onStableLogoUriChange?.(null);
  }, [logoLoadOpacity, onStableLogoUriChange, clearGraceTimer]);

  /**
   * Manually set the stable logo URI.
   * Useful for external logo sources or testing.
   */
  const setStableLogoUriExternal = useCallback((uri: string | null) => {
    clearGraceTimer();

    if (uri) {
      setStableLogoUri(uri);
      setLogoHasLoadedSuccessfully(false);
      logoLoadOpacity.value = 0;
      setShouldShowTextFallback(false);
      setFallbackLevel(uri === logo ? 'primary' : uri === addonLogo ? 'addon' : 'primary');
    } else {
      setStableLogoUri(null);
      setLogoHasLoadedSuccessfully(false);
      setShouldShowTextFallback(true);
      setFallbackLevel('text');
    }

    onStableLogoUriChange?.(uri);
  }, [logo, addonLogo, logoLoadOpacity, onStableLogoUriChange, clearGraceTimer]);

  // ---------------------------------------------------------------------------
  // Cleanup on Unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      clearGraceTimer();
      // Reset animation values on unmount to prevent memory leaks
      try {
        logoLoadOpacity.value = 0;
      } catch (_e) {
        // Ignore cleanup errors
      }
    };
  }, [logoLoadOpacity, clearGraceTimer]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    stableLogoUri,
    shouldShowTextFallback,
    logoHasLoadedSuccessfully,
    logoLoadOpacity,
    handleLogoLoad,
    handleLogoError,
    resetLogoState,
    setStableLogoUri: setStableLogoUriExternal,
    fallbackLevel,
  };
}

export default useStableLogo;
