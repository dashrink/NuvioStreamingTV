/**
 * TVBackHandler Component (Non-TV fallback)
 *
 * This is the non-TV fallback version that simply renders children without
 * any TV-specific back button handling logic.
 */

import React from 'react';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface TVBackHandlerProps {
  /** Whether the handler is enabled */
  enabled?: boolean;
  /** Custom back press handler for navigation */
  onBackPress?: () => boolean;
  /** Callback when back is blocked */
  onBackBlocked?: () => void;
  /** Children to render */
  children?: React.ReactNode;
}

/**
 * Navigation control interface for external navigation integration
 */
export interface TVBackNavigationControl {
  /** Register a navigation back handler */
  setNavigationBackHandler: (handler: () => boolean) => void;
  /** Clear the navigation back handler */
  clearNavigationBackHandler: () => void;
}

// =============================================================================
// Non-TV Stub Functions
// =============================================================================

/**
 * Non-TV stub: does nothing
 */
export function setTVNavigationBackHandler(_handler: () => boolean): void {
  // No-op on non-TV platforms
}

/**
 * Non-TV stub: does nothing
 */
export function clearTVNavigationBackHandler(): void {
  // No-op on non-TV platforms
}

// =============================================================================
// Component Implementation (Non-TV Fallback)
// =============================================================================

/**
 * Non-TV fallback: simply renders children without TV back button handling.
 */
export function TVBackHandler({ children }: TVBackHandlerProps): React.ReactElement | null {
  return <>{children}</>;
}

export default TVBackHandler;
