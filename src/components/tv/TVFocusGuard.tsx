/**
 * TVFocusGuard.tsx
 *
 * Non-TV fallback for the TVFocusGuard component.
 * Simply renders children without any focus boundary logic.
 *
 * On TV platforms, Metro will automatically load TVFocusGuard.tv.tsx instead
 * when APP_VARIANT=tv is set.
 *
 * @example
 * ```tsx
 * import TVFocusGuard from '@/components/tv/TVFocusGuard';
 *
 * function Modal({ isOpen, children }) {
 *   if (!isOpen) return null;
 *
 *   return (
 *     <TVFocusGuard>
 *       {children}
 *     </TVFocusGuard>
 *   );
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  forwardRef,
  useImperativeHandle,
  ReactNode,
} from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Focus guard mode (stub for non-TV)
 */
export type FocusGuardMode = 'trap' | 'loop' | 'normal';

/**
 * Direction that focus attempted to escape (stub for non-TV)
 */
export type EscapeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Information about a focusable element (stub for non-TV)
 */
export interface FocusableElementInfo {
  id: string;
  ref: React.RefObject<any>;
  nodeHandle: number | null;
  gridPosition?: { row: number; col: number };
  order?: number;
  isDefault?: boolean;
}

/**
 * Props for the TVFocusGuard component
 */
export interface TVFocusGuardProps {
  children: ReactNode;
  mode?: FocusGuardMode;
  onEscapeAttempt?: (direction: EscapeDirection) => void;
  onEscape?: () => void;
  autoFocus?: boolean;
  initialFocusId?: string;
  onFocusEnter?: () => void;
  onFocusLeave?: () => void;
  style?: StyleProp<ViewStyle>;
  enabled?: boolean;
  fallbackFocusId?: string;
  onEmptyContainer?: () => void;
  testID?: string;
  guardId?: string;
}

/**
 * Ref methods exposed by TVFocusGuard component
 */
export interface TVFocusGuardRef {
  registerElement: (info: Omit<FocusableElementInfo, 'nodeHandle'>) => void;
  unregisterElement: (id: string) => void;
  focusElement: (id: string) => boolean;
  focusFirst: () => boolean;
  focusLast: () => boolean;
  getElements: () => FocusableElementInfo[];
  hasElement: (id: string) => boolean;
  refreshNodeHandles: () => void;
}

/**
 * Context for focus guards (stub for non-TV)
 */
interface FocusGuardContextValue {
  registerElement: (info: Omit<FocusableElementInfo, 'nodeHandle'>) => void;
  unregisterElement: (id: string) => void;
  mode: FocusGuardMode;
  isActive: boolean;
  guardId: string;
  getNextFocusProps: (id: string) => {
    nextFocusUp?: number;
    nextFocusDown?: number;
    nextFocusLeft?: number;
    nextFocusRight?: number;
  };
}

// =============================================================================
// Context (stub for non-TV)
// =============================================================================

const FocusGuardContext = createContext<FocusGuardContextValue | null>(null);

/**
 * Hook to access the focus guard context (stub for non-TV)
 */
export function useFocusGuard(): FocusGuardContextValue | null {
  return useContext(FocusGuardContext);
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Non-TV TVFocusGuard component
 *
 * Simply renders children without any focus boundary logic.
 * TV-specific features are only available in TVFocusGuard.tv.tsx.
 */
const TVFocusGuard = forwardRef<TVFocusGuardRef, TVFocusGuardProps>(
  (
    {
      children,
      mode: _mode,
      onEscapeAttempt: _onEscapeAttempt,
      onEscape: _onEscape,
      autoFocus: _autoFocus,
      initialFocusId: _initialFocusId,
      onFocusEnter: _onFocusEnter,
      onFocusLeave: _onFocusLeave,
      style,
      enabled: _enabled,
      fallbackFocusId: _fallbackFocusId,
      onEmptyContainer: _onEmptyContainer,
      testID,
      guardId: _guardId,
    },
    ref
  ) => {
    // Provide no-op implementations for non-TV platforms
    useImperativeHandle(ref, () => ({
      registerElement: () => {},
      unregisterElement: () => {},
      focusElement: () => false,
      focusFirst: () => false,
      focusLast: () => false,
      getElements: () => [],
      hasElement: () => false,
      refreshNodeHandles: () => {},
    }));

    return (
      <View style={style} testID={testID}>
        {children}
      </View>
    );
  }
);

TVFocusGuard.displayName = 'TVFocusGuard';

// =============================================================================
// Hook for Child Components (stub for non-TV)
// =============================================================================

/**
 * Hook for focusable children (no-op on non-TV platforms)
 */
export function useFocusGuardChild(
  _id: string,
  _ref: React.RefObject<any>,
  _options: {
    order?: number;
    gridPosition?: { row: number; col: number };
    isDefault?: boolean;
  } = {}
): {
  nextFocusProps: {
    nextFocusUp?: number;
    nextFocusDown?: number;
    nextFocusLeft?: number;
    nextFocusRight?: number;
  };
  isInGuard: boolean;
} {
  return {
    nextFocusProps: {},
    isInGuard: false,
  };
}

// =============================================================================
// Exports
// =============================================================================

export default TVFocusGuard;

export type {
  TVFocusGuardProps,
  TVFocusGuardRef,
  FocusGuardMode,
  EscapeDirection,
  FocusableElementInfo,
};
