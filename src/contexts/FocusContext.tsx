import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Focus group definition for organizing focusable elements
 * into logical sections (e.g., "header", "content", "sidebar")
 */
export interface FocusGroup {
  /** Unique identifier for the focus group */
  id: string;
  /** Array of element IDs belonging to this group */
  elementIds: string[];
  /** Whether this group is currently active for navigation */
  isActive: boolean;
  /** Optional priority for focus order between groups */
  priority?: number;
}

/**
 * Screen focus memory entry for restoring focus when navigating back
 */
export interface FocusMemoryEntry {
  /** Screen/route name */
  screenName: string;
  /** Last focused element ID on this screen */
  focusedElementId: string | null;
  /** Optional focus group that was active */
  focusGroupId?: string;
  /** Timestamp for cache management */
  timestamp: number;
}

/**
 * Navigation direction for focus movement
 */
export type FocusDirection = 'up' | 'down' | 'left' | 'right';

/**
 * FocusContext value interface
 */
export interface FocusContextValue {
  // ===== State =====
  /** Currently focused element ID (null if nothing focused) */
  currentFocusId: string | null;
  /** Currently active focus group ID */
  currentGroupId: string | null;
  /** Map of registered focus groups */
  focusGroups: Map<string, FocusGroup>;

  // ===== Focus Management =====
  /** Set focus to a specific element */
  setFocus: (elementId: string, groupId?: string) => void;
  /** Clear current focus */
  clearFocus: () => void;
  /** Check if a specific element is focused */
  isFocused: (elementId: string) => boolean;

  // ===== Focus Groups =====
  /** Register a focus group */
  registerGroup: (groupId: string, elementIds?: string[]) => void;
  /** Unregister a focus group */
  unregisterGroup: (groupId: string) => void;
  /** Add element to a focus group */
  addToGroup: (groupId: string, elementId: string) => void;
  /** Remove element from a focus group */
  removeFromGroup: (groupId: string, elementId: string) => void;
  /** Set the active focus group */
  setActiveGroup: (groupId: string) => void;
  /** Get elements in a focus group */
  getGroupElements: (groupId: string) => string[];

  // ===== Focus Navigation Helpers =====
  /** Move focus in a direction within current group */
  moveFocus: (direction: FocusDirection) => void;
  /** Focus the first element in a group */
  focusFirst: (groupId?: string) => void;
  /** Focus the last element in a group */
  focusLast: (groupId?: string) => void;
  /** Focus the next element */
  focusNext: () => void;
  /** Focus the previous element */
  focusPrevious: () => void;

  // ===== Focus Memory =====
  /** Save current focus state for a screen */
  saveFocusMemory: (screenName: string) => void;
  /** Restore focus state for a screen */
  restoreFocusMemory: (screenName: string) => boolean;
  /** Clear focus memory for a screen */
  clearFocusMemory: (screenName: string) => void;
  /** Get stored focus memory for a screen */
  getFocusMemory: (screenName: string) => FocusMemoryEntry | null;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================

const FocusContext = createContext<FocusContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface FocusProviderProps {
  children: ReactNode;
  /** Maximum number of focus memory entries to keep */
  maxMemoryEntries?: number;
}

/**
 * FocusProvider - Manages global focus state for TV/remote navigation
 *
 * Features:
 * - Tracks currently focused element ID
 * - Supports focus groups for sectional navigation
 * - Provides focus navigation helpers (next, previous, directional)
 * - Focus memory for restoring focus when returning to screens
 *
 * @example
 * ```tsx
 * // In App.tsx
 * <FocusProvider>
 *   <NavigationContainer>
 *     <AppNavigator />
 *   </NavigationContainer>
 * </FocusProvider>
 *
 * // In a component
 * const { setFocus, isFocused } = useFocus();
 *
 * useEffect(() => {
 *   if (isVisible) {
 *     setFocus('my-button-id', 'modal-group');
 *   }
 * }, [isVisible]);
 * ```
 */
export const FocusProvider: React.FC<FocusProviderProps> = ({
  children,
  maxMemoryEntries = 20,
}) => {
  // ===== State =====
  const [currentFocusId, setCurrentFocusId] = useState<string | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  // Use refs for mutable collections to avoid unnecessary re-renders
  const focusGroupsRef = useRef<Map<string, FocusGroup>>(new Map());
  const focusMemoryRef = useRef<Map<string, FocusMemoryEntry>>(new Map());

  // Force update counter for when we need to trigger re-render on group changes
  const [, forceUpdate] = useState(0);
  const triggerUpdate = useCallback(() => forceUpdate((c) => c + 1), []);

  // ===== Focus Management =====

  /**
   * Set focus to a specific element
   */
  const setFocus = useCallback((elementId: string, groupId?: string) => {
    setCurrentFocusId(elementId);
    if (groupId) {
      setCurrentGroupId(groupId);
    }
  }, []);

  /**
   * Clear current focus
   */
  const clearFocus = useCallback(() => {
    setCurrentFocusId(null);
  }, []);

  /**
   * Check if a specific element is focused
   */
  const isFocused = useCallback(
    (elementId: string) => {
      return currentFocusId === elementId;
    },
    [currentFocusId]
  );

  // ===== Focus Groups =====

  /**
   * Register a new focus group
   */
  const registerGroup = useCallback(
    (groupId: string, elementIds: string[] = []) => {
      const group: FocusGroup = {
        id: groupId,
        elementIds,
        isActive: false,
      };
      focusGroupsRef.current.set(groupId, group);
      triggerUpdate();
    },
    [triggerUpdate]
  );

  /**
   * Unregister a focus group
   */
  const unregisterGroup = useCallback(
    (groupId: string) => {
      focusGroupsRef.current.delete(groupId);
      if (currentGroupId === groupId) {
        setCurrentGroupId(null);
      }
      triggerUpdate();
    },
    [currentGroupId, triggerUpdate]
  );

  /**
   * Add an element to a focus group
   */
  const addToGroup = useCallback(
    (groupId: string, elementId: string) => {
      const group = focusGroupsRef.current.get(groupId);
      if (group && !group.elementIds.includes(elementId)) {
        group.elementIds.push(elementId);
        triggerUpdate();
      }
    },
    [triggerUpdate]
  );

  /**
   * Remove an element from a focus group
   */
  const removeFromGroup = useCallback(
    (groupId: string, elementId: string) => {
      const group = focusGroupsRef.current.get(groupId);
      if (group) {
        const index = group.elementIds.indexOf(elementId);
        if (index !== -1) {
          group.elementIds.splice(index, 1);
          triggerUpdate();
        }
      }
    },
    [triggerUpdate]
  );

  /**
   * Set the active focus group
   */
  const setActiveGroup = useCallback(
    (groupId: string) => {
      // Deactivate all groups first
      focusGroupsRef.current.forEach((group) => {
        group.isActive = false;
      });
      // Activate the specified group
      const group = focusGroupsRef.current.get(groupId);
      if (group) {
        group.isActive = true;
        setCurrentGroupId(groupId);
      }
      triggerUpdate();
    },
    [triggerUpdate]
  );

  /**
   * Get elements in a focus group
   */
  const getGroupElements = useCallback((groupId: string): string[] => {
    const group = focusGroupsRef.current.get(groupId);
    return group ? [...group.elementIds] : [];
  }, []);

  // ===== Focus Navigation Helpers =====

  /**
   * Get the active group's element list
   */
  const getActiveGroupElements = useCallback((): string[] => {
    if (!currentGroupId) return [];
    const group = focusGroupsRef.current.get(currentGroupId);
    return group ? group.elementIds : [];
  }, [currentGroupId]);

  /**
   * Move focus in a direction
   * Note: This is a basic linear implementation.
   * For 2D grid navigation, components should provide custom logic.
   */
  const moveFocus = useCallback(
    (direction: FocusDirection) => {
      const elements = getActiveGroupElements();
      if (elements.length === 0 || !currentFocusId) return;

      const currentIndex = elements.indexOf(currentFocusId);
      if (currentIndex === -1) return;

      let newIndex: number;

      switch (direction) {
        case 'up':
        case 'left':
          newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
          break;
        case 'down':
        case 'right':
          newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
          break;
        default:
          return;
      }

      setCurrentFocusId(elements[newIndex]);
    },
    [currentFocusId, getActiveGroupElements]
  );

  /**
   * Focus the first element in a group (or active group)
   */
  const focusFirst = useCallback(
    (groupId?: string) => {
      const targetGroupId = groupId || currentGroupId;
      if (!targetGroupId) return;

      const elements = focusGroupsRef.current.get(targetGroupId)?.elementIds || [];
      if (elements.length > 0) {
        setFocus(elements[0], targetGroupId);
      }
    },
    [currentGroupId, setFocus]
  );

  /**
   * Focus the last element in a group (or active group)
   */
  const focusLast = useCallback(
    (groupId?: string) => {
      const targetGroupId = groupId || currentGroupId;
      if (!targetGroupId) return;

      const elements = focusGroupsRef.current.get(targetGroupId)?.elementIds || [];
      if (elements.length > 0) {
        setFocus(elements[elements.length - 1], targetGroupId);
      }
    },
    [currentGroupId, setFocus]
  );

  /**
   * Focus the next element
   */
  const focusNext = useCallback(() => {
    moveFocus('right');
  }, [moveFocus]);

  /**
   * Focus the previous element
   */
  const focusPrevious = useCallback(() => {
    moveFocus('left');
  }, [moveFocus]);

  // ===== Focus Memory =====

  /**
   * Save current focus state for a screen
   */
  const saveFocusMemory = useCallback(
    (screenName: string) => {
      const entry: FocusMemoryEntry = {
        screenName,
        focusedElementId: currentFocusId,
        focusGroupId: currentGroupId || undefined,
        timestamp: Date.now(),
      };
      focusMemoryRef.current.set(screenName, entry);

      // Prune old entries if we exceed max
      if (focusMemoryRef.current.size > maxMemoryEntries) {
        // Find and remove the oldest entry
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        focusMemoryRef.current.forEach((e, key) => {
          if (e.timestamp < oldestTime) {
            oldestTime = e.timestamp;
            oldestKey = key;
          }
        });
        if (oldestKey) {
          focusMemoryRef.current.delete(oldestKey);
        }
      }
    },
    [currentFocusId, currentGroupId, maxMemoryEntries]
  );

  /**
   * Restore focus state for a screen
   * Returns true if focus was restored, false otherwise
   */
  const restoreFocusMemory = useCallback(
    (screenName: string): boolean => {
      const entry = focusMemoryRef.current.get(screenName);
      if (entry && entry.focusedElementId) {
        setFocus(entry.focusedElementId, entry.focusGroupId);
        return true;
      }
      return false;
    },
    [setFocus]
  );

  /**
   * Clear focus memory for a screen
   */
  const clearFocusMemory = useCallback((screenName: string) => {
    focusMemoryRef.current.delete(screenName);
  }, []);

  /**
   * Get stored focus memory for a screen
   */
  const getFocusMemory = useCallback(
    (screenName: string): FocusMemoryEntry | null => {
      return focusMemoryRef.current.get(screenName) || null;
    },
    []
  );

  // ===== Context Value =====

  const value: FocusContextValue = {
    // State
    currentFocusId,
    currentGroupId,
    focusGroups: focusGroupsRef.current,

    // Focus Management
    setFocus,
    clearFocus,
    isFocused,

    // Focus Groups
    registerGroup,
    unregisterGroup,
    addToGroup,
    removeFromGroup,
    setActiveGroup,
    getGroupElements,

    // Navigation
    moveFocus,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,

    // Memory
    saveFocusMemory,
    restoreFocusMemory,
    clearFocusMemory,
    getFocusMemory,
  };

  return (
    <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
  );
};

// =============================================================================
// CUSTOM HOOK
// =============================================================================

/**
 * Hook to access the FocusContext
 *
 * @throws Error if used outside of FocusProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentFocusId, setFocus, isFocused } = useFocus();
 *
 *   return (
 *     <TouchableOpacity
 *       onFocus={() => setFocus('my-button')}
 *       style={[styles.button, isFocused('my-button') && styles.focused]}
 *     >
 *       <Text>Press Me</Text>
 *     </TouchableOpacity>
 *   );
 * }
 * ```
 */
export const useFocus = (): FocusContextValue => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
};

/**
 * Hook to check if the current component is within a FocusProvider
 * Returns null instead of throwing if no provider is found
 */
export const useFocusOptional = (): FocusContextValue | null => {
  return useContext(FocusContext) || null;
};

export default FocusProvider;
