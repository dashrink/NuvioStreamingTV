import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useFocusOptional } from '../contexts/FocusContext';

/**
 * Configuration options for the useFocusMemory hook
 */
export interface UseFocusMemoryOptions {
  /**
   * Screen name to use for focus memory (defaults to route name)
   */
  screenName?: string;
  /**
   * Whether to automatically restore focus when the screen gains focus
   * @default true
   */
  autoRestore?: boolean;
  /**
   * Whether to automatically save focus when the screen loses focus
   * @default true
   */
  autoSave?: boolean;
  /**
   * Delay in milliseconds before restoring focus (useful for animations)
   * @default 100
   */
  restoreDelay?: number;
  /**
   * Callback when focus is restored
   */
  onFocusRestored?: (focusedElementId: string | null) => void;
  /**
   * Callback when focus is saved
   */
  onFocusSaved?: (focusedElementId: string | null) => void;
  /**
   * Custom element ID to focus if no saved focus exists
   */
  defaultFocusId?: string;
  /**
   * Whether this is a fresh navigation (clears previous focus memory)
   * @default false
   */
  freshNavigation?: boolean;
}

/**
 * Return type for the useFocusMemory hook
 */
export interface UseFocusMemoryReturn {
  /**
   * Manually save the current focus state
   */
  saveFocus: () => void;
  /**
   * Manually restore the saved focus state
   * @returns true if focus was restored, false otherwise
   */
  restoreFocus: () => boolean;
  /**
   * Clear the saved focus memory for this screen
   */
  clearFocus: () => void;
  /**
   * Get the saved focus element ID for this screen
   */
  getSavedFocusId: () => string | null;
  /**
   * Whether the hook is active (TV platform + FocusProvider available)
   */
  isActive: boolean;
}

/**
 * Hook to manage focus memory when navigating between screens
 *
 * This hook integrates with React Navigation to automatically:
 * - Save the current focus position when leaving a screen
 * - Restore the focus position when returning to a screen
 * - Clear focus memory on fresh navigation
 *
 * Only active on TV platforms (Android TV, tvOS) when wrapped in FocusProvider.
 *
 * @example
 * ```tsx
 * // Basic usage in a screen component
 * function HomeScreen() {
 *   useFocusMemory();
 *   return <Content />;
 * }
 *
 * // With options
 * function LibraryScreen() {
 *   const { saveFocus, restoreFocus } = useFocusMemory({
 *     screenName: 'Library',
 *     restoreDelay: 200,
 *     onFocusRestored: (id) => console.log('Restored focus to:', id),
 *   });
 *
 *   return <Content />;
 * }
 *
 * // Fresh navigation (e.g., deep link)
 * function SearchScreen({ route }) {
 *   useFocusMemory({
 *     freshNavigation: route.params?.fresh ?? false,
 *   });
 *
 *   return <Content />;
 * }
 * ```
 */
export const useFocusMemory = (options: UseFocusMemoryOptions = {}): UseFocusMemoryReturn => {
  const {
    screenName: customScreenName,
    autoRestore = true,
    autoSave = true,
    restoreDelay = 100,
    onFocusRestored,
    onFocusSaved,
    defaultFocusId,
    freshNavigation = false,
  } = options;

  // Get navigation context
  const route = useRoute();
  const screenName = customScreenName || route.name;

  // Get focus context (optional - may not be available)
  const focusContext = useFocusOptional();

  // Track if we're on a TV platform
  const isTV = Platform.isTV === true;

  // Track if the hook is active
  const isActive = isTV && focusContext !== null;

  // Track if we've restored focus this mount
  const hasRestoredRef = useRef(false);

  // Track the previous screen for detecting fresh navigations
  const previousScreenRef = useRef<string | null>(null);

  /**
   * Save the current focus state for this screen
   */
  const saveFocus = useCallback(() => {
    if (!focusContext) return;
    focusContext.saveFocusMemory(screenName);
    onFocusSaved?.(focusContext.currentFocusId);
  }, [focusContext, screenName, onFocusSaved]);

  /**
   * Restore the saved focus state for this screen
   * @returns true if focus was restored, false otherwise
   */
  const restoreFocus = useCallback((): boolean => {
    if (!focusContext) return false;

    // Try to restore from memory
    const restored = focusContext.restoreFocusMemory(screenName);

    if (restored) {
      const savedEntry = focusContext.getFocusMemory(screenName);
      onFocusRestored?.(savedEntry?.focusedElementId ?? null);
      return true;
    }

    // If no saved focus and defaultFocusId is provided, focus that
    if (defaultFocusId) {
      focusContext.setFocus(defaultFocusId);
      onFocusRestored?.(defaultFocusId);
      return true;
    }

    return false;
  }, [focusContext, screenName, defaultFocusId, onFocusRestored]);

  /**
   * Clear the saved focus memory for this screen
   */
  const clearFocus = useCallback(() => {
    if (!focusContext) return;
    focusContext.clearFocusMemory(screenName);
  }, [focusContext, screenName]);

  /**
   * Get the saved focus element ID for this screen
   */
  const getSavedFocusId = useCallback((): string | null => {
    if (!focusContext) return null;
    const entry = focusContext.getFocusMemory(screenName);
    return entry?.focusedElementId ?? null;
  }, [focusContext, screenName]);

  // Handle fresh navigation - clear memory when requested
  useEffect(() => {
    if (freshNavigation && focusContext) {
      clearFocus();
    }
  }, [freshNavigation, focusContext, clearFocus]);

  // Handle focus/blur events from React Navigation
  useFocusEffect(
    useCallback(() => {
      // Skip if not on TV or no focus context
      if (!isActive) return;

      // Screen is gaining focus
      if (autoRestore && !hasRestoredRef.current) {
        // Delay restoration to allow screen animations to complete
        const timer = setTimeout(() => {
          restoreFocus();
          hasRestoredRef.current = true;
        }, restoreDelay);

        return () => clearTimeout(timer);
      }

      // Cleanup: save focus when screen loses focus (blur)
      return () => {
        if (autoSave && hasRestoredRef.current) {
          saveFocus();
        }
      };
    }, [isActive, autoRestore, autoSave, restoreDelay, restoreFocus, saveFocus])
  );

  // Reset restoration flag when screen changes
  useEffect(() => {
    if (previousScreenRef.current !== screenName) {
      hasRestoredRef.current = false;
      previousScreenRef.current = screenName;
    }
  }, [screenName]);

  return {
    saveFocus,
    restoreFocus,
    clearFocus,
    getSavedFocusId,
    isActive,
  };
};

/**
 * Simplified hook for just restoring focus to a default element when screen mounts
 *
 * Use this when you don't need full focus memory, just want to set initial focus
 * on a specific element when navigating to a screen.
 *
 * @example
 * ```tsx
 * function SearchScreen() {
 *   useRestoreDefaultFocus('search-input');
 *   return <Content />;
 * }
 * ```
 */
export const useRestoreDefaultFocus = (elementId: string, delay: number = 100): void => {
  const focusContext = useFocusOptional();
  const isTV = Platform.isTV === true;
  const hasRestoredRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!isTV || !focusContext || hasRestoredRef.current) return;

      const timer = setTimeout(() => {
        focusContext.setFocus(elementId);
        hasRestoredRef.current = true;
      }, delay);

      return () => clearTimeout(timer);
    }, [isTV, focusContext, elementId, delay])
  );
};

export default useFocusMemory;
