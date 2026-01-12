/**
 * TVContextMenu.tv.tsx
 *
 * TV-specific context menu component for long-press actions on TV remotes.
 * Displays a menu with quick actions like Add to List, Mark as Watched, Share, etc.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - Displays on long-press (300ms+) via TVNavigationContext integration
 * - Shows configurable quick actions with icons
 * - Full D-pad navigation support
 * - Closes with back/menu button
 * - Returns focus to trigger element on close
 * - Animated entrance/exit with spring physics
 * - Focus trapped within menu using TVFocusGuard
 *
 * @example
 * ```tsx
 * import TVContextMenu from '@/components/tv/TVContextMenu';
 * import { useTVNavigation } from '@/contexts/TVNavigationContext';
 *
 * function App() {
 *   return (
 *     <TVNavigationProvider>
 *       {/* Your app content *\/}
 *       <TVContextMenu />
 *     </TVNavigationProvider>
 *   );
 * }
 *
 * // To open the context menu from a component:
 * function ContentCard({ item }) {
 *   const { openContextMenu } = useTVNavigation();
 *
 *   const handleLongPress = () => {
 *     openContextMenu({
 *       targetId: item.id,
 *       title: item.title,
 *       items: [
 *         { id: 'add-list', label: 'Add to List', icon: 'plus', onSelect: () => addToList(item) },
 *         { id: 'watched', label: 'Mark as Watched', icon: 'check', onSelect: () => markWatched(item) },
 *         { id: 'share', label: 'Share', icon: 'share', onSelect: () => share(item) },
 *       ],
 *     });
 *   };
 *
 *   return (
 *     <Focusable onLongPress={handleLongPress}>
 *       <CardContent />
 *     </Focusable>
 *   );
 * }
 * ```
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { useTVNavigationOptional, ContextMenuItem } from '../../contexts/TVNavigationContext';
import {
  useTVEventHandler,
  isMenuEvent,
  isNavigationEvent,
  isSelectEvent,
  TVRemoteEvent,
} from '../../hooks/useTVEventHandler';
import Focusable, { FocusableRef } from '../common/Focusable';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the TVContextMenu component
 */
export interface TVContextMenuProps {
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Props for individual menu item component
 */
interface MenuItemProps {
  item: ContextMenuItem;
  index: number;
  isSelected: boolean;
  onFocus: (index: number) => void;
  onSelect: () => void;
  hasTVPreferredFocus?: boolean;
  itemRef?: React.RefObject<FocusableRef>;
  nextFocusUp?: React.RefObject<FocusableRef>;
  nextFocusDown?: React.RefObject<FocusableRef>;
}

// =============================================================================
// Constants
// =============================================================================

/** Animation spring configuration for menu appearance */
const SPRING_CONFIG = {
  damping: 18,
  stiffness: 180,
  mass: 1,
};

/** Menu dimensions */
const MENU_WIDTH = 320;
const MENU_ITEM_HEIGHT = 56;
const MENU_MAX_VISIBLE_ITEMS = 6;
const MENU_PADDING = 16;
const MENU_BORDER_RADIUS = 12;

/** Get screen dimensions */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// Icon Mapping (Simple Unicode Icons)
// =============================================================================

const ICON_MAP: Record<string, string> = {
  plus: '+',
  add: '+',
  'add-list': '☰+',
  check: '✓',
  watched: '✓',
  share: '⤴',
  info: 'ℹ',
  play: '▶',
  download: '↓',
  delete: '✕',
  remove: '✕',
  edit: '✎',
  star: '★',
  favorite: '★',
  heart: '♥',
  settings: '⚙',
  refresh: '↻',
  link: '🔗',
  copy: '⧉',
};

/**
 * Get icon character from icon name
 */
function getIconChar(iconName?: string): string {
  if (!iconName) return '';
  return ICON_MAP[iconName.toLowerCase()] || iconName.charAt(0).toUpperCase();
}

// =============================================================================
// Menu Item Component
// =============================================================================

/**
 * Individual menu item with focus animations
 */
const MenuItem: React.FC<MenuItemProps> = ({
  item,
  index,
  isSelected,
  onFocus,
  onSelect,
  hasTVPreferredFocus = false,
  itemRef,
  nextFocusUp,
  nextFocusDown,
}) => {
  const handleFocus = useCallback(() => {
    onFocus(index);
  }, [onFocus, index]);

  const handlePress = useCallback(() => {
    if (!item.disabled) {
      onSelect();
    }
  }, [item.disabled, onSelect]);

  // Determine text color based on item state
  const textColor = item.disabled ? '#666' : item.destructive ? '#FF3B30' : '#FFFFFF';

  const iconColor = item.disabled ? '#666' : item.destructive ? '#FF3B30' : '#007AFF';

  // Build next focus configuration
  const nextFocus = useMemo(() => {
    const config: {
      nextFocusUp?: React.RefObject<FocusableRef>;
      nextFocusDown?: React.RefObject<FocusableRef>;
    } = {};
    if (nextFocusUp) config.nextFocusUp = nextFocusUp;
    if (nextFocusDown) config.nextFocusDown = nextFocusDown;
    return config;
  }, [nextFocusUp, nextFocusDown]);

  return (
    <Focusable
      ref={itemRef}
      onPress={handlePress}
      onFocus={handleFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      isTVSelectable={!item.disabled}
      disabled={item.disabled}
      style={styles.menuItem}
      focusStyle={styles.menuItemFocused}
      animationConfig={{
        focusScale: 1.02,
        unfocusedOpacity: 0.85,
        showFocusBorder: true,
        focusBorderColor: item.destructive ? '#FF3B30' : '#007AFF',
        focusBorderWidth: 2,
        animateShadow: false,
      }}
      nextFocus={nextFocus as any}
      testID={`context-menu-item-${item.id}`}
      accessibilityLabel={item.label}
      accessibilityHint={item.disabled ? 'Disabled' : `Select to ${item.label.toLowerCase()}`}
    >
      <View style={styles.menuItemContent}>
        {/* Icon */}
        {item.icon && (
          <View style={styles.iconContainer}>
            <Text style={[styles.icon, { color: iconColor }]}>{getIconChar(item.icon)}</Text>
          </View>
        )}

        {/* Label */}
        <Text
          style={[
            styles.menuItemLabel,
            { color: textColor },
            item.disabled && styles.menuItemLabelDisabled,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.label}
        </Text>
      </View>
    </Focusable>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * TV Context Menu Component
 *
 * Renders a modal context menu with animated appearance and full D-pad navigation.
 * Integrates with TVNavigationContext for state management.
 */
const TVContextMenu: React.FC<TVContextMenuProps> = ({ testID = 'tv-context-menu' }) => {
  // Get context - may be null if not within provider
  const tvNav = useTVNavigationOptional();

  // Local state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Refs for menu items
  const itemRefs = useRef<React.RefObject<FocusableRef>[]>([]);
  const lastTriggerRef = useRef<string | null>(null);

  // Animation values
  const menuScale = useSharedValue(0.9);
  const menuOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Get context menu state from context
  const contextMenu = tvNav?.contextMenu;
  const closeContextMenu = tvNav?.closeContextMenu;
  const selectContextMenuItem = tvNav?.selectContextMenuItem;

  // Memoized menu items
  const menuItems = useMemo(() => contextMenu?.items || [], [contextMenu?.items]);

  // Create refs for each menu item
  useEffect(() => {
    if (menuItems.length > 0) {
      itemRefs.current = menuItems.map(() => React.createRef<FocusableRef>());
    }
  }, [menuItems.length]);

  // =============================================================================
  // Animation Handlers
  // =============================================================================

  /**
   * Animate menu in
   */
  const animateIn = useCallback(() => {
    backdropOpacity.value = withTiming(1, { duration: 200 });
    menuScale.value = withSpring(1, SPRING_CONFIG);
    menuOpacity.value = withSpring(1, SPRING_CONFIG);
  }, [backdropOpacity, menuScale, menuOpacity]);

  /**
   * Animate menu out
   */
  const animateOut = useCallback(
    (onComplete: () => void) => {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      menuScale.value = withSpring(0.9, {
        ...SPRING_CONFIG,
        damping: 25,
      });
      menuOpacity.value = withTiming(0, { duration: 150 }, finished => {
        if (finished) {
          runOnJS(onComplete)();
        }
      });
    },
    [backdropOpacity, menuScale, menuOpacity]
  );

  // =============================================================================
  // Menu Visibility Effect
  // =============================================================================

  useEffect(() => {
    if (contextMenu?.isOpen && menuItems.length > 0) {
      // Store the trigger for focus restoration
      lastTriggerRef.current = contextMenu.targetId;

      // Reset selection to first non-disabled item
      const firstEnabledIndex = menuItems.findIndex(item => !item.disabled);
      setSelectedIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : 0);

      // Show menu with animation
      setIsVisible(true);
      requestAnimationFrame(() => {
        animateIn();
      });
    } else if (!contextMenu?.isOpen && isVisible) {
      // Hide menu with animation
      animateOut(() => {
        setIsVisible(false);
        setSelectedIndex(0);
      });
    }
  }, [contextMenu?.isOpen, contextMenu?.targetId, menuItems, animateIn, animateOut, isVisible]);

  // =============================================================================
  // Navigation Handlers
  // =============================================================================

  /**
   * Handle closing the menu
   */
  const handleClose = useCallback(() => {
    closeContextMenu?.();
  }, [closeContextMenu]);

  /**
   * Handle selecting an item
   */
  const handleSelect = useCallback(
    (itemId: string) => {
      selectContextMenuItem?.(itemId);
    },
    [selectContextMenuItem]
  );

  /**
   * Navigate to next item
   */
  const navigateDown = useCallback(() => {
    setSelectedIndex(prev => {
      // Find next non-disabled item
      let next = prev + 1;
      while (next < menuItems.length && menuItems[next]?.disabled) {
        next++;
      }
      if (next >= menuItems.length) {
        // Wrap to first enabled item
        next = menuItems.findIndex(item => !item.disabled);
        if (next === -1) next = 0;
      }
      return next;
    });
  }, [menuItems]);

  /**
   * Navigate to previous item
   */
  const navigateUp = useCallback(() => {
    setSelectedIndex(prev => {
      // Find previous non-disabled item
      let next = prev - 1;
      while (next >= 0 && menuItems[next]?.disabled) {
        next--;
      }
      if (next < 0) {
        // Wrap to last enabled item
        for (let i = menuItems.length - 1; i >= 0; i--) {
          if (!menuItems[i]?.disabled) {
            next = i;
            break;
          }
        }
        if (next < 0) next = menuItems.length - 1;
      }
      return next;
    });
  }, [menuItems]);

  // =============================================================================
  // TV Event Handler
  // =============================================================================

  const handleTVEvent = useCallback(
    (event: TVRemoteEvent) => {
      if (!isVisible) return;

      if (isMenuEvent(event)) {
        // Back/Menu button closes the menu
        handleClose();
        return;
      }

      if (isNavigationEvent(event)) {
        switch (event.eventType) {
          case 'up':
            navigateUp();
            break;
          case 'down':
            navigateDown();
            break;
          case 'left':
          case 'right':
            // Optional: could handle horizontal navigation if needed
            break;
        }
        return;
      }

      if (isSelectEvent(event)) {
        // Select the current item
        const currentItem = menuItems[selectedIndex];
        if (currentItem && !currentItem.disabled) {
          handleSelect(currentItem.id);
        }
      }
    },
    [isVisible, handleClose, navigateUp, navigateDown, menuItems, selectedIndex, handleSelect]
  );

  useTVEventHandler(handleTVEvent, { enabled: isVisible });

  // =============================================================================
  // Focus Effect
  // =============================================================================

  useEffect(() => {
    if (isVisible && itemRefs.current[selectedIndex]?.current) {
      // Focus the selected item after a short delay for animation
      const timeoutId = setTimeout(() => {
        itemRefs.current[selectedIndex]?.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, selectedIndex]);

  // =============================================================================
  // Animated Styles
  // =============================================================================

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuOpacity.value,
  }));

  // =============================================================================
  // Calculate Menu Position
  // =============================================================================

  const menuPosition = useMemo(() => {
    // Center the menu on screen for TV (simpler UX)
    const left = (SCREEN_WIDTH - MENU_WIDTH) / 2;
    const visibleItems = Math.min(menuItems.length, MENU_MAX_VISIBLE_ITEMS);
    const menuHeight =
      visibleItems * MENU_ITEM_HEIGHT + MENU_PADDING * 2 + (contextMenu?.title ? 48 : 0);
    const top = (SCREEN_HEIGHT - menuHeight) / 2;

    return { top, left };
  }, [menuItems.length, contextMenu?.title]);

  // =============================================================================
  // Render
  // =============================================================================

  // Don't render if not on TV or no context
  if (!Platform.isTV || !tvNav) {
    return null;
  }

  // Don't render modal if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      testID={testID}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        {/* Menu Container */}
        <Animated.View
          style={[
            styles.menuContainer,
            menuAnimatedStyle,
            {
              top: menuPosition.top,
              left: menuPosition.left,
              width: MENU_WIDTH,
            },
          ]}
        >
          {/* Menu Title */}
          {contextMenu?.title && (
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {contextMenu.title}
              </Text>
            </View>
          )}

          {/* Menu Items */}
          <View style={styles.menuItemsContainer}>
            {menuItems.map((item, index) => (
              <MenuItem
                key={item.id}
                item={item}
                index={index}
                isSelected={selectedIndex === index}
                onFocus={setSelectedIndex}
                onSelect={() => handleSelect(item.id)}
                hasTVPreferredFocus={index === selectedIndex}
                itemRef={itemRefs.current[index]}
                nextFocusUp={
                  index > 0 ? itemRefs.current[index - 1] : itemRefs.current[menuItems.length - 1]
                }
                nextFocusDown={
                  index < menuItems.length - 1 ? itemRefs.current[index + 1] : itemRefs.current[0]
                }
              />
            ))}
          </View>

          {/* Cancel Hint */}
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>Press BACK to close</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#1C1C1E',
    borderRadius: MENU_BORDER_RADIUS,
    paddingVertical: MENU_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    paddingHorizontal: MENU_PADDING,
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  menuItemsContainer: {
    paddingHorizontal: 8,
  },
  menuItem: {
    height: MENU_ITEM_HEIGHT,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: 'transparent',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
  menuItemLabelDisabled: {
    opacity: 0.5,
  },
  hintContainer: {
    paddingTop: 12,
    marginTop: 8,
    paddingHorizontal: MENU_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
});

// =============================================================================
// Exports
// =============================================================================

export default TVContextMenu;

export type { TVContextMenuProps };
