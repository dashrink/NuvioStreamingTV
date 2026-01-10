/**
 * TVContextMenu.tsx
 *
 * Non-TV fallback for the TV context menu component.
 * On non-TV platforms, this component renders nothing as context menus
 * are typically handled differently (long-press gesture, right-click, etc.).
 *
 * For mobile platforms, consider using a bottom sheet or action sheet instead.
 *
 * @example
 * ```tsx
 * import TVContextMenu from '@/components/tv/TVContextMenu';
 *
 * function App() {
 *   return (
 *     <>
 *       {/* Your app content *\/}
 *       <TVContextMenu />
 *     </>
 *   );
 * }
 * ```
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TVContextMenu component
 */
export interface TVContextMenuProps {
  /** Test ID for testing purposes */
  testID?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Non-TV fallback - renders nothing
 *
 * On non-TV platforms, context menus should be implemented using
 * platform-appropriate patterns:
 * - iOS: UIMenu or ActionSheet
 * - Android: Context menu or Bottom sheet
 * - Web: Right-click context menu or dropdown
 */
const TVContextMenu: React.FC<TVContextMenuProps> = () => {
  // Non-TV platforms don't use this component
  return null;
};

// =============================================================================
// Exports
// =============================================================================

export default TVContextMenu;

export type { TVContextMenuProps };
