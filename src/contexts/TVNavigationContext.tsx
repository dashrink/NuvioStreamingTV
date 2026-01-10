import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Represents a single entry in the focus history stack
 */
export interface FocusHistoryEntry {
  /** Unique identifier for the focused element */
  focusId: string;
  /** Screen/route name where the focus occurred */
  screenName: string;
  /** Timestamp when focus was recorded */
  timestamp: number;
}

/**
 * Voice search state
 */
export interface VoiceSearchState {
  /** Whether the voice search overlay is visible */
  isOpen: boolean;
  /** Whether the system is actively listening for voice input */
  isListening: boolean;
  /** Current voice search query text */
  query: string;
  /** Whether voice input is available on this platform/device */
  isAvailable: boolean;
  /** Error message if voice search failed */
  error: string | null;
}

/**
 * Context menu item definition
 */
export interface ContextMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label for the menu item */
  label: string;
  /** Optional icon name */
  icon?: string;
  /** Callback when item is selected */
  onSelect: () => void;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Whether this is a destructive action (shows in red) */
  destructive?: boolean;
}

/**
 * Context menu state
 */
export interface ContextMenuState {
  /** Whether the context menu is visible */
  isOpen: boolean;
  /** Position of the menu (for positioning near trigger element) */
  position: { x: number; y: number } | null;
  /** ID of the element that triggered the menu */
  targetId: string | null;
  /** Menu items to display */
  items: ContextMenuItem[];
  /** Title for the context menu (optional) */
  title?: string;
}

/**
 * Map of screen names to their last focused element IDs
 */
export type FocusMemoryMap = Record<string, string>;

/**
 * Context value interface
 */
interface TVNavigationContextValue {
  // Focus History
  /** Stack of focus history entries */
  focusHistory: FocusHistoryEntry[];
  /** Push a new focus entry to the history */
  pushFocusHistory: (entry: Omit<FocusHistoryEntry, 'timestamp'>) => void;
  /** Pop the most recent focus entry from history */
  popFocusHistory: () => FocusHistoryEntry | undefined;
  /** Clear the entire focus history */
  clearFocusHistory: () => void;

  // Focus Memory (per screen)
  /** Map of screen names to last focused element IDs */
  focusMemory: FocusMemoryMap;
  /** Save the last focused element for a screen */
  setScreenFocus: (screenName: string, focusId: string) => void;
  /** Get the last focused element for a screen */
  getScreenFocus: (screenName: string) => string | null;
  /** Clear focus memory for a specific screen */
  clearScreenFocus: (screenName: string) => void;
  /** Clear all focus memory */
  clearAllFocusMemory: () => void;

  // Voice Search
  /** Current voice search state */
  voiceSearch: VoiceSearchState;
  /** Open the voice search overlay */
  openVoiceSearch: () => void;
  /** Close the voice search overlay */
  closeVoiceSearch: () => void;
  /** Set the voice search listening state */
  setVoiceListening: (isListening: boolean) => void;
  /** Set the voice search query */
  setVoiceQuery: (query: string) => void;
  /** Set voice search error */
  setVoiceError: (error: string | null) => void;
  /** Set voice availability */
  setVoiceAvailable: (isAvailable: boolean) => void;

  // Context Menu
  /** Current context menu state */
  contextMenu: ContextMenuState;
  /** Open a context menu with items at a position */
  openContextMenu: (config: {
    targetId: string;
    items: ContextMenuItem[];
    position?: { x: number; y: number };
    title?: string;
  }) => void;
  /** Close the context menu */
  closeContextMenu: () => void;
  /** Select a context menu item by ID */
  selectContextMenuItem: (itemId: string) => void;

  // Utility
  /** Whether we're running on a TV platform */
  isTV: boolean;
  /** Current focused element ID (if tracking) */
  currentFocusId: string | null;
  /** Set the current focused element ID */
  setCurrentFocusId: (focusId: string | null) => void;
}

// =============================================================================
// Default Values
// =============================================================================

const defaultVoiceSearchState: VoiceSearchState = {
  isOpen: false,
  isListening: false,
  query: '',
  isAvailable: Platform.isTV, // Assume available on TV platforms by default
  error: null,
};

const defaultContextMenuState: ContextMenuState = {
  isOpen: false,
  position: null,
  targetId: null,
  items: [],
  title: undefined,
};

// =============================================================================
// Context Creation
// =============================================================================

const TVNavigationContext = createContext<TVNavigationContextValue | undefined>(undefined);

// =============================================================================
// Provider Component
// =============================================================================

interface TVNavigationProviderProps {
  children: ReactNode;
}

export function TVNavigationProvider({ children }: TVNavigationProviderProps) {
  // Focus History State
  const [focusHistory, setFocusHistory] = useState<FocusHistoryEntry[]>([]);

  // Focus Memory State (per screen)
  const [focusMemory, setFocusMemory] = useState<FocusMemoryMap>({});

  // Voice Search State
  const [voiceSearch, setVoiceSearch] = useState<VoiceSearchState>(defaultVoiceSearchState);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(defaultContextMenuState);

  // Current Focus ID
  const [currentFocusId, setCurrentFocusId] = useState<string | null>(null);

  // =============================================================================
  // Focus History Actions
  // =============================================================================

  const pushFocusHistory = useCallback((entry: Omit<FocusHistoryEntry, 'timestamp'>) => {
    setFocusHistory((prev) => [
      ...prev,
      { ...entry, timestamp: Date.now() },
    ]);
  }, []);

  const popFocusHistory = useCallback((): FocusHistoryEntry | undefined => {
    let poppedEntry: FocusHistoryEntry | undefined;
    setFocusHistory((prev) => {
      if (prev.length === 0) return prev;
      poppedEntry = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    return poppedEntry;
  }, []);

  const clearFocusHistory = useCallback(() => {
    setFocusHistory([]);
  }, []);

  // =============================================================================
  // Focus Memory Actions (per screen)
  // =============================================================================

  const setScreenFocus = useCallback((screenName: string, focusId: string) => {
    setFocusMemory((prev) => ({
      ...prev,
      [screenName]: focusId,
    }));
  }, []);

  const getScreenFocus = useCallback((screenName: string): string | null => {
    return focusMemory[screenName] || null;
  }, [focusMemory]);

  const clearScreenFocus = useCallback((screenName: string) => {
    setFocusMemory((prev) => {
      const newMemory = { ...prev };
      delete newMemory[screenName];
      return newMemory;
    });
  }, []);

  const clearAllFocusMemory = useCallback(() => {
    setFocusMemory({});
  }, []);

  // =============================================================================
  // Voice Search Actions
  // =============================================================================

  const openVoiceSearch = useCallback(() => {
    setVoiceSearch((prev) => ({
      ...prev,
      isOpen: true,
      query: '',
      error: null,
    }));
  }, []);

  const closeVoiceSearch = useCallback(() => {
    setVoiceSearch((prev) => ({
      ...prev,
      isOpen: false,
      isListening: false,
      query: '',
      error: null,
    }));
  }, []);

  const setVoiceListening = useCallback((isListening: boolean) => {
    setVoiceSearch((prev) => ({
      ...prev,
      isListening,
    }));
  }, []);

  const setVoiceQuery = useCallback((query: string) => {
    setVoiceSearch((prev) => ({
      ...prev,
      query,
    }));
  }, []);

  const setVoiceError = useCallback((error: string | null) => {
    setVoiceSearch((prev) => ({
      ...prev,
      error,
      isListening: false,
    }));
  }, []);

  const setVoiceAvailable = useCallback((isAvailable: boolean) => {
    setVoiceSearch((prev) => ({
      ...prev,
      isAvailable,
    }));
  }, []);

  // =============================================================================
  // Context Menu Actions
  // =============================================================================

  const openContextMenu = useCallback((config: {
    targetId: string;
    items: ContextMenuItem[];
    position?: { x: number; y: number };
    title?: string;
  }) => {
    // Close any existing context menu before opening a new one
    setContextMenu({
      isOpen: true,
      targetId: config.targetId,
      items: config.items,
      position: config.position || null,
      title: config.title,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(defaultContextMenuState);
  }, []);

  const selectContextMenuItem = useCallback((itemId: string) => {
    const item = contextMenu.items.find((i) => i.id === itemId);
    if (item && !item.disabled) {
      item.onSelect();
      // Auto-close the menu after selection
      setContextMenu(defaultContextMenuState);
    }
  }, [contextMenu.items]);

  // =============================================================================
  // Context Value
  // =============================================================================

  const value: TVNavigationContextValue = {
    // Focus History
    focusHistory,
    pushFocusHistory,
    popFocusHistory,
    clearFocusHistory,

    // Focus Memory
    focusMemory,
    setScreenFocus,
    getScreenFocus,
    clearScreenFocus,
    clearAllFocusMemory,

    // Voice Search
    voiceSearch,
    openVoiceSearch,
    closeVoiceSearch,
    setVoiceListening,
    setVoiceQuery,
    setVoiceError,
    setVoiceAvailable,

    // Context Menu
    contextMenu,
    openContextMenu,
    closeContextMenu,
    selectContextMenuItem,

    // Utility
    isTV: Platform.isTV,
    currentFocusId,
    setCurrentFocusId,
  };

  return (
    <TVNavigationContext.Provider value={value}>
      {children}
    </TVNavigationContext.Provider>
  );
}

// =============================================================================
// Custom Hook
// =============================================================================

/**
 * Hook to access TV navigation context
 * @throws Error if used outside of TVNavigationProvider
 */
export function useTVNavigation(): TVNavigationContextValue {
  const context = useContext(TVNavigationContext);
  if (context === undefined) {
    throw new Error('useTVNavigation must be used within a TVNavigationProvider');
  }
  return context;
}

/**
 * Optional hook that returns null instead of throwing if used outside provider
 * Useful for components that may run on both TV and non-TV platforms
 */
export function useTVNavigationOptional(): TVNavigationContextValue | null {
  return useContext(TVNavigationContext) || null;
}
