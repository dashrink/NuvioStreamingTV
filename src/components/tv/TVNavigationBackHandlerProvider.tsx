/**
 * TVNavigationBackHandlerProvider Component (Non-TV fallback)
 *
 * This is the non-TV fallback version that does nothing.
 */

import React from 'react';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface TVNavigationBackHandlerProviderProps {
  /** Whether the handler is enabled */
  enabled?: boolean;
  /** Screens that should not allow back navigation */
  rootScreens?: string[];
  /** Whether to prevent app exit at root screens */
  preventAppExit?: boolean;
  /** Callback when back is blocked */
  onBackBlocked?: () => void;
}

// =============================================================================
// Component Implementation (Non-TV Fallback)
// =============================================================================

/**
 * Non-TV fallback: does nothing.
 */
export function TVNavigationBackHandlerProvider(
  _props: TVNavigationBackHandlerProviderProps
): React.ReactElement | null {
  return null;
}

export default TVNavigationBackHandlerProvider;
