import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import LoadingOverlayScreen from '../components/loading/LoadingOverlayScreen';
import { LoadingSize } from '../components/loading/types';

/**
 * Options for showing the global loading overlay
 */
export interface GlobalLoadingOptions {
  /** Loading message text to display */
  text?: string;
  /** Size of the loading spinner */
  size?: LoadingSize;
  /** Enable backdrop blur effect (iOS only) */
  blur?: boolean;
  /** Custom backdrop opacity (0-1) */
  backdropOpacity?: number;
  /** Whether the overlay can be dismissed by tapping backdrop */
  dismissable?: boolean;
}

/**
 * Internal state for the global loading overlay
 */
interface GlobalLoadingState {
  visible: boolean;
  text?: string;
  size: LoadingSize;
  blur: boolean;
  backdropOpacity: number;
  dismissable: boolean;
}

/**
 * Context value interface for loading state management
 *
 * Provides both legacy home loading state (backward compatible) and
 * new global loading overlay functionality using unified loading components.
 */
interface LoadingContextValue {
  // === Legacy API (backward compatible) ===

  /** Whether the home screen is currently loading */
  isHomeLoading: boolean;
  /** Set the home screen loading state */
  setHomeLoading: (loading: boolean) => void;

  // === Global Loading Overlay API ===

  /** Whether the global loading overlay is visible */
  isGlobalLoading: boolean;

  /**
   * Show the global loading overlay
   *
   * @param options - Optional configuration for the loading overlay
   * @returns void
   *
   * @example
   * // Simple usage
   * showGlobalLoading();
   *
   * @example
   * // With loading message
   * showGlobalLoading({ text: 'Syncing data...' });
   *
   * @example
   * // With all options
   * showGlobalLoading({
   *   text: 'Please wait...',
   *   size: 'large',
   *   blur: true,
   *   backdropOpacity: 0.8,
   *   dismissable: true,
   * });
   */
  showGlobalLoading: (options?: GlobalLoadingOptions) => void;

  /**
   * Hide the global loading overlay
   *
   * @example
   * hideGlobalLoading();
   */
  hideGlobalLoading: () => void;

  /**
   * Update the loading message while the overlay is visible
   *
   * @param text - New loading message text
   *
   * @example
   * showGlobalLoading({ text: 'Step 1 of 3...' });
   * // Later...
   * updateLoadingText('Step 2 of 3...');
   */
  updateLoadingText: (text: string) => void;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

/**
 * Default state for the global loading overlay
 */
const DEFAULT_GLOBAL_LOADING_STATE: GlobalLoadingState = {
  visible: false,
  text: undefined,
  size: 'large',
  blur: false,
  backdropOpacity: 0.7,
  dismissable: false,
};

/**
 * LoadingProvider - Context provider for managing loading states across the app
 *
 * Provides two categories of loading state management:
 *
 * 1. **Legacy API** - `isHomeLoading` / `setHomeLoading`
 *    Used by HomeScreen to manage initial loading state.
 *    Maintained for backward compatibility.
 *
 * 2. **Global Loading Overlay API** - `showGlobalLoading` / `hideGlobalLoading`
 *    Uses the unified LoadingOverlayScreen component for app-wide loading overlays.
 *    Useful for blocking operations like sync, auth, or data exports.
 *
 * @example
 * // In App.tsx or similar root component
 * <LoadingProvider>
 *   <NavigationContainer>
 *     <RootNavigator />
 *   </NavigationContainer>
 * </LoadingProvider>
 *
 * @example
 * // In any component
 * const { showGlobalLoading, hideGlobalLoading } = useLoading();
 *
 * const handleSync = async () => {
 *   showGlobalLoading({ text: 'Syncing...' });
 *   try {
 *     await syncData();
 *   } finally {
 *     hideGlobalLoading();
 *   }
 * };
 */
export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // === Legacy state for home loading (backward compatible) ===
  const [isHomeLoading, setIsHomeLoading] = useState(true);

  // === Global loading overlay state ===
  const [globalLoadingState, setGlobalLoadingState] = useState<GlobalLoadingState>(
    DEFAULT_GLOBAL_LOADING_STATE
  );

  /**
   * Show the global loading overlay with optional configuration
   */
  const showGlobalLoading = useCallback((options?: GlobalLoadingOptions) => {
    setGlobalLoadingState({
      visible: true,
      text: options?.text,
      size: options?.size ?? 'large',
      blur: options?.blur ?? false,
      backdropOpacity: options?.backdropOpacity ?? 0.7,
      dismissable: options?.dismissable ?? false,
    });
  }, []);

  /**
   * Hide the global loading overlay
   */
  const hideGlobalLoading = useCallback(() => {
    setGlobalLoadingState(DEFAULT_GLOBAL_LOADING_STATE);
  }, []);

  /**
   * Update the loading text while overlay is visible
   */
  const updateLoadingText = useCallback((text: string) => {
    setGlobalLoadingState(prev => ({
      ...prev,
      text,
    }));
  }, []);

  /**
   * Handle backdrop press for dismissable loading overlay
   */
  const handleBackdropPress = useCallback(() => {
    if (globalLoadingState.dismissable) {
      hideGlobalLoading();
    }
  }, [globalLoadingState.dismissable, hideGlobalLoading]);

  const value: LoadingContextValue = {
    // Legacy API
    isHomeLoading,
    setHomeLoading: setIsHomeLoading,
    // Global Loading Overlay API
    isGlobalLoading: globalLoadingState.visible,
    showGlobalLoading,
    hideGlobalLoading,
    updateLoadingText,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {/* Global Loading Overlay - rendered after children to appear on top */}
      <LoadingOverlayScreen
        visible={globalLoadingState.visible}
        text={globalLoadingState.text}
        size={globalLoadingState.size}
        blur={globalLoadingState.blur}
        backdropOpacity={globalLoadingState.backdropOpacity}
        onBackdropPress={globalLoadingState.dismissable ? handleBackdropPress : undefined}
        testID="global-loading-overlay"
      />
    </LoadingContext.Provider>
  );
};

/**
 * useLoading - Hook to access loading state management
 *
 * Must be used within a LoadingProvider.
 *
 * @returns LoadingContextValue with loading state and control methods
 * @throws Error if used outside of LoadingProvider
 *
 * @example
 * // Access legacy home loading state
 * const { isHomeLoading, setHomeLoading } = useLoading();
 *
 * @example
 * // Use global loading overlay
 * const { showGlobalLoading, hideGlobalLoading } = useLoading();
 *
 * const handleExport = async () => {
 *   showGlobalLoading({ text: 'Exporting data...' });
 *   try {
 *     await exportData();
 *   } finally {
 *     hideGlobalLoading();
 *   }
 * };
 *
 * @example
 * // Update loading text during operation
 * const { showGlobalLoading, hideGlobalLoading, updateLoadingText } = useLoading();
 *
 * const handleMultiStepProcess = async () => {
 *   showGlobalLoading({ text: 'Step 1: Preparing...' });
 *   await step1();
 *   updateLoadingText('Step 2: Processing...');
 *   await step2();
 *   updateLoadingText('Step 3: Finalizing...');
 *   await step3();
 *   hideGlobalLoading();
 * };
 */
export const useLoading = (): LoadingContextValue => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

/**
 * useGlobalLoading - Convenience hook for global loading overlay only
 *
 * This hook provides a focused API for just the global loading overlay,
 * useful when you don't need the home loading state.
 *
 * @returns Object with showLoading, hideLoading, updateText, and isLoading
 *
 * @example
 * const { showLoading, hideLoading, isLoading } = useGlobalLoading();
 *
 * const handleAction = async () => {
 *   showLoading({ text: 'Working...' });
 *   try {
 *     await doWork();
 *   } finally {
 *     hideLoading();
 *   }
 * };
 */
export const useGlobalLoading = () => {
  const { isGlobalLoading, showGlobalLoading, hideGlobalLoading, updateLoadingText } = useLoading();

  return {
    isLoading: isGlobalLoading,
    showLoading: showGlobalLoading,
    hideLoading: hideGlobalLoading,
    updateText: updateLoadingText,
  };
};
