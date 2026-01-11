/**
 * useContextMenu Hook
 *
 * Convenience hook for using the TV context menu with common media actions.
 * Provides pre-defined menu items for common operations like:
 * - Add to List / Remove from List
 * - Mark as Watched / Unwatched
 * - Share
 * - Get Info
 *
 * @example
 * ```tsx
 * import { useContextMenu } from '@/hooks/useContextMenu';
 *
 * function ContentCard({ item }) {
 *   const { openContextMenu } = useContextMenu();
 *
 *   const handleLongPress = () => {
 *     openContextMenu({
 *       targetId: item.id,
 *       title: item.title,
 *       mediaItem: item,
 *       actions: ['addToList', 'markWatched', 'share', 'info'],
 *       onAddToList: () => addToMyList(item),
 *       onMarkWatched: () => markAsWatched(item),
 *       onShare: () => shareItem(item),
 *       onGetInfo: () => navigateToDetails(item),
 *     });
 *   };
 *
 *   return (
 *     <Focusable onLongPress={handleLongPress}>
 *       <Card item={item} />
 *     </Focusable>
 *   );
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useTVNavigationOptional, ContextMenuItem } from '../contexts/TVNavigationContext';

// =============================================================================
// Types
// =============================================================================

/**
 * Standard context menu action types
 */
export type ContextMenuAction =
  | 'addToList'
  | 'removeFromList'
  | 'markWatched'
  | 'markUnwatched'
  | 'share'
  | 'info'
  | 'play'
  | 'playTrailer'
  | 'download'
  | 'delete'
  | 'favorite'
  | 'unfavorite'
  | 'refresh'
  | 'copyLink';

/**
 * Media item type for context menu
 */
export interface ContextMenuMediaItem {
  id: string;
  title: string;
  type?: 'movie' | 'series' | 'episode';
  isInList?: boolean;
  isWatched?: boolean;
  isFavorite?: boolean;
  [key: string]: any;
}

/**
 * Action callbacks for context menu items
 */
export interface ContextMenuCallbacks {
  onAddToList?: () => void | Promise<void>;
  onRemoveFromList?: () => void | Promise<void>;
  onMarkWatched?: () => void | Promise<void>;
  onMarkUnwatched?: () => void | Promise<void>;
  onShare?: () => void | Promise<void>;
  onGetInfo?: () => void | Promise<void>;
  onPlay?: () => void | Promise<void>;
  onPlayTrailer?: () => void | Promise<void>;
  onDownload?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onFavorite?: () => void | Promise<void>;
  onUnfavorite?: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onCopyLink?: () => void | Promise<void>;
}

/**
 * Configuration for opening a context menu
 */
export interface OpenContextMenuConfig {
  /** Unique identifier for the target element */
  targetId: string;
  /** Title to display in the menu (usually the content title) */
  title?: string;
  /** Media item data (used to determine which actions to show) */
  mediaItem?: ContextMenuMediaItem;
  /** Which actions to include in the menu */
  actions?: ContextMenuAction[];
  /** Custom menu items to add (after standard actions) */
  customItems?: ContextMenuItem[];
  /** Position for the menu (optional, defaults to center) */
  position?: { x: number; y: number };
}

/**
 * Return type for useContextMenu hook
 */
export interface UseContextMenuReturn {
  /** Open the context menu with specified configuration */
  openContextMenu: (config: OpenContextMenuConfig & ContextMenuCallbacks) => void;
  /** Close the context menu */
  closeContextMenu: () => void;
  /** Whether the context menu is currently open */
  isOpen: boolean;
  /** Whether we're on a TV platform */
  isTV: boolean;
  /** Whether the context menu is available (has TVNavigationContext) */
  isAvailable: boolean;
}

// =============================================================================
// Default Action Configurations
// =============================================================================

/**
 * Build menu items for standard actions
 */
function buildActionMenuItem(
  action: ContextMenuAction,
  callbacks: ContextMenuCallbacks,
  mediaItem?: ContextMenuMediaItem
): ContextMenuItem | null {
  switch (action) {
    case 'addToList':
      if (mediaItem?.isInList) return null; // Skip if already in list
      return {
        id: 'add-to-list',
        label: 'Add to My List',
        icon: 'plus',
        onSelect: () => callbacks.onAddToList?.(),
        disabled: !callbacks.onAddToList,
      };

    case 'removeFromList':
      if (!mediaItem?.isInList) return null; // Skip if not in list
      return {
        id: 'remove-from-list',
        label: 'Remove from List',
        icon: 'remove',
        onSelect: () => callbacks.onRemoveFromList?.(),
        disabled: !callbacks.onRemoveFromList,
        destructive: true,
      };

    case 'markWatched':
      if (mediaItem?.isWatched) return null; // Skip if already watched
      return {
        id: 'mark-watched',
        label: 'Mark as Watched',
        icon: 'check',
        onSelect: () => callbacks.onMarkWatched?.(),
        disabled: !callbacks.onMarkWatched,
      };

    case 'markUnwatched':
      if (!mediaItem?.isWatched) return null; // Skip if not watched
      return {
        id: 'mark-unwatched',
        label: 'Mark as Unwatched',
        icon: 'refresh',
        onSelect: () => callbacks.onMarkUnwatched?.(),
        disabled: !callbacks.onMarkUnwatched,
      };

    case 'share':
      return {
        id: 'share',
        label: 'Share',
        icon: 'share',
        onSelect: () => callbacks.onShare?.(),
        disabled: !callbacks.onShare,
      };

    case 'info':
      return {
        id: 'info',
        label: 'Get Info',
        icon: 'info',
        onSelect: () => callbacks.onGetInfo?.(),
        disabled: !callbacks.onGetInfo,
      };

    case 'play':
      return {
        id: 'play',
        label: 'Play',
        icon: 'play',
        onSelect: () => callbacks.onPlay?.(),
        disabled: !callbacks.onPlay,
      };

    case 'playTrailer':
      return {
        id: 'play-trailer',
        label: 'Play Trailer',
        icon: 'play',
        onSelect: () => callbacks.onPlayTrailer?.(),
        disabled: !callbacks.onPlayTrailer,
      };

    case 'download':
      return {
        id: 'download',
        label: 'Download',
        icon: 'download',
        onSelect: () => callbacks.onDownload?.(),
        disabled: !callbacks.onDownload,
      };

    case 'delete':
      return {
        id: 'delete',
        label: 'Delete',
        icon: 'delete',
        onSelect: () => callbacks.onDelete?.(),
        disabled: !callbacks.onDelete,
        destructive: true,
      };

    case 'favorite':
      if (mediaItem?.isFavorite) return null; // Skip if already favorite
      return {
        id: 'favorite',
        label: 'Add to Favorites',
        icon: 'star',
        onSelect: () => callbacks.onFavorite?.(),
        disabled: !callbacks.onFavorite,
      };

    case 'unfavorite':
      if (!mediaItem?.isFavorite) return null; // Skip if not favorite
      return {
        id: 'unfavorite',
        label: 'Remove from Favorites',
        icon: 'star',
        onSelect: () => callbacks.onUnfavorite?.(),
        disabled: !callbacks.onUnfavorite,
        destructive: true,
      };

    case 'refresh':
      return {
        id: 'refresh',
        label: 'Refresh',
        icon: 'refresh',
        onSelect: () => callbacks.onRefresh?.(),
        disabled: !callbacks.onRefresh,
      };

    case 'copyLink':
      return {
        id: 'copy-link',
        label: 'Copy Link',
        icon: 'link',
        onSelect: () => callbacks.onCopyLink?.(),
        disabled: !callbacks.onCopyLink,
      };

    default:
      return null;
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for easily using the TV context menu with common media actions
 */
export function useContextMenu(): UseContextMenuReturn {
  const tvNav = useTVNavigationOptional();

  const isTV = Platform.isTV === true;
  const isAvailable = isTV && tvNav !== null;
  const isOpen = tvNav?.contextMenu.isOpen ?? false;

  /**
   * Open the context menu with the specified configuration
   */
  const openContextMenu = useCallback(
    (config: OpenContextMenuConfig & ContextMenuCallbacks) => {
      if (!tvNav || !isTV) {
        // On non-TV platforms, you might want to show a different UI
        // For now, we just skip
        return;
      }

      const {
        targetId,
        title,
        mediaItem,
        actions = ['addToList', 'markWatched', 'share', 'info'],
        customItems = [],
        position,
        ...callbacks
      } = config;

      // Build menu items from actions
      const menuItems: ContextMenuItem[] = [];

      // Add standard action items
      for (const action of actions) {
        const item = buildActionMenuItem(action, callbacks, mediaItem);
        if (item) {
          menuItems.push(item);
        }
      }

      // Add custom items
      menuItems.push(...customItems);

      // Don't open if no items
      if (menuItems.length === 0) {
        return;
      }

      // Open the context menu
      tvNav.openContextMenu({
        targetId,
        title,
        items: menuItems,
        position,
      });
    },
    [tvNav, isTV]
  );

  /**
   * Close the context menu
   */
  const closeContextMenu = useCallback(() => {
    tvNav?.closeContextMenu();
  }, [tvNav]);

  return {
    openContextMenu,
    closeContextMenu,
    isOpen,
    isTV,
    isAvailable,
  };
}

// =============================================================================
// Convenience Hook for Simple Usage
// =============================================================================

/**
 * Simplified hook that returns just the openContextMenu function
 * with auto-generated callbacks
 */
export function useQuickContextMenu() {
  const { openContextMenu, closeContextMenu, isOpen, isAvailable } = useContextMenu();

  /**
   * Open a simple context menu with default actions
   */
  const showContextMenu = useCallback(
    (
      targetId: string,
      title: string,
      callbacks: ContextMenuCallbacks & { actions?: ContextMenuAction[] }
    ) => {
      openContextMenu({
        targetId,
        title,
        actions: callbacks.actions || ['addToList', 'markWatched', 'share', 'info'],
        ...callbacks,
      });
    },
    [openContextMenu]
  );

  return {
    showContextMenu,
    closeContextMenu,
    isOpen,
    isAvailable,
  };
}

// =============================================================================
// Exports
// =============================================================================

export default useContextMenu;

export type {
  ContextMenuAction,
  ContextMenuMediaItem,
  ContextMenuCallbacks,
  OpenContextMenuConfig,
  UseContextMenuReturn,
};
