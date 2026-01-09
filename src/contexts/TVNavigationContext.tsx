import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    ReactNode,
} from 'react';
import {
    Platform,
    findNodeHandle,
    UIManager,
    AccessibilityInfo,
} from 'react-native';

/**
 * Direction type for D-pad navigation
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Focus zone configuration
 */
export interface FocusZone {
    id: string;
    priority: number;
    refs: React.RefObject<any>[];
    trapFocus?: boolean;
    onEnter?: () => void;
    onLeave?: () => void;
}

/**
 * Focusable element registration
 */
export interface FocusableElement {
    id: string;
    ref: React.RefObject<any>;
    zoneId?: string;
    priority?: number;
}

/**
 * TV Navigation Context interface
 */
interface TVNavigationContextValue {
    // Focus state
    isTV: boolean;
    currentFocusId: string | null;
    currentZoneId: string | null;
    focusHistory: string[];

    // Focus management
    setFocus: (ref: React.RefObject<any> | number) => void;
    setFocusById: (id: string) => void;
    registerFocusable: (element: FocusableElement) => void;
    unregisterFocusable: (id: string) => void;

    // Zone management
    registerZone: (zone: FocusZone) => void;
    unregisterZone: (id: string) => void;
    setActiveZone: (zoneId: string) => void;
    getZone: (zoneId: string) => FocusZone | undefined;

    // Navigation helpers
    focusFirst: (zoneId?: string) => void;
    focusLast: (zoneId?: string) => void;
    focusPrevious: () => void;
    focusNext: () => void;

    // History management
    pushFocusHistory: (id: string) => void;
    popFocusHistory: () => string | undefined;
    clearFocusHistory: () => void;

    // Accessibility
    announceForAccessibility: (message: string) => void;
}

const TVNavigationContext = createContext<TVNavigationContextValue | undefined>(undefined);

interface TVNavigationProviderProps {
    children: ReactNode;
    /** Initial zone to activate */
    initialZoneId?: string;
    /** Maximum history size */
    maxHistorySize?: number;
}

/**
 * TVNavigationProvider - Centralized focus management for TV platforms
 *
 * Provides:
 * - Focus state tracking
 * - Zone-based focus management
 * - Focus history for back navigation
 * - Accessibility announcements
 * - Programmatic focus control
 *
 * Usage:
 * ```tsx
 * <TVNavigationProvider>
 *   <App />
 * </TVNavigationProvider>
 * ```
 */
export function TVNavigationProvider({
    children,
    initialZoneId,
    maxHistorySize = 20,
}: TVNavigationProviderProps) {
    const isTV = Platform.isTV;

    // Focus state
    const [currentFocusId, setCurrentFocusId] = useState<string | null>(null);
    const [currentZoneId, setCurrentZoneId] = useState<string | null>(initialZoneId || null);
    const [focusHistory, setFocusHistory] = useState<string[]>([]);

    // Registries
    const focusableRegistry = useRef<Map<string, FocusableElement>>(new Map());
    const zoneRegistry = useRef<Map<string, FocusZone>>(new Map());

    /**
     * Set focus to a React ref or native node handle
     */
    const setFocus = useCallback((target: React.RefObject<any> | number) => {
        if (!isTV) return;

        try {
            const nodeHandle = typeof target === 'number'
                ? target
                : findNodeHandle(target.current);

            if (nodeHandle) {
                UIManager.dispatchViewManagerCommand(
                    nodeHandle,
                    UIManager.getViewManagerConfig('RCTView')?.Commands?.focus as any,
                    []
                );

                // Fallback: Use setNativeProps if command dispatch fails
                if (typeof target !== 'number' && target.current?.setNativeProps) {
                    target.current.setNativeProps({ hasTVPreferredFocus: true });
                }
            }
        } catch (error) {
            if (__DEV__) {
                console.log('[TVNavigation] setFocus error:', error);
            }
        }
    }, [isTV]);

    /**
     * Set focus by registered element ID
     */
    const setFocusById = useCallback((id: string) => {
        const element = focusableRegistry.current.get(id);
        if (element?.ref) {
            setFocus(element.ref);
            setCurrentFocusId(id);
        }
    }, [setFocus]);

    /**
     * Register a focusable element
     */
    const registerFocusable = useCallback((element: FocusableElement) => {
        focusableRegistry.current.set(element.id, element);

        if (__DEV__) {
            console.log('[TVNavigation] Registered focusable:', element.id);
        }
    }, []);

    /**
     * Unregister a focusable element
     */
    const unregisterFocusable = useCallback((id: string) => {
        focusableRegistry.current.delete(id);

        if (__DEV__) {
            console.log('[TVNavigation] Unregistered focusable:', id);
        }
    }, []);

    /**
     * Register a focus zone
     */
    const registerZone = useCallback((zone: FocusZone) => {
        zoneRegistry.current.set(zone.id, zone);

        if (__DEV__) {
            console.log('[TVNavigation] Registered zone:', zone.id);
        }
    }, []);

    /**
     * Unregister a focus zone
     */
    const unregisterZone = useCallback((id: string) => {
        zoneRegistry.current.delete(id);

        if (currentZoneId === id) {
            setCurrentZoneId(null);
        }

        if (__DEV__) {
            console.log('[TVNavigation] Unregistered zone:', id);
        }
    }, [currentZoneId]);

    /**
     * Set the active focus zone
     */
    const setActiveZone = useCallback((zoneId: string) => {
        const previousZone = currentZoneId ? zoneRegistry.current.get(currentZoneId) : null;
        const newZone = zoneRegistry.current.get(zoneId);

        // Trigger zone callbacks
        previousZone?.onLeave?.();
        newZone?.onEnter?.();

        setCurrentZoneId(zoneId);

        if (__DEV__) {
            console.log('[TVNavigation] Active zone changed:', previousZone?.id, '->', zoneId);
        }
    }, [currentZoneId]);

    /**
     * Get a zone by ID
     */
    const getZone = useCallback((zoneId: string): FocusZone | undefined => {
        return zoneRegistry.current.get(zoneId);
    }, []);

    /**
     * Focus the first element in a zone (or globally)
     */
    const focusFirst = useCallback((zoneId?: string) => {
        const targetZoneId = zoneId || currentZoneId;

        if (targetZoneId) {
            const zone = zoneRegistry.current.get(targetZoneId);
            if (zone?.refs[0]) {
                setFocus(zone.refs[0]);
            }
        } else {
            // Focus first registered element
            const firstElement = focusableRegistry.current.values().next().value;
            if (firstElement?.ref) {
                setFocus(firstElement.ref);
            }
        }
    }, [currentZoneId, setFocus]);

    /**
     * Focus the last element in a zone (or globally)
     */
    const focusLast = useCallback((zoneId?: string) => {
        const targetZoneId = zoneId || currentZoneId;

        if (targetZoneId) {
            const zone = zoneRegistry.current.get(targetZoneId);
            if (zone?.refs.length) {
                setFocus(zone.refs[zone.refs.length - 1]);
            }
        } else {
            // Focus last registered element
            const elements = Array.from(focusableRegistry.current.values());
            const lastElement = elements[elements.length - 1];
            if (lastElement?.ref) {
                setFocus(lastElement.ref);
            }
        }
    }, [currentZoneId, setFocus]);

    /**
     * Focus the previous element in history
     */
    const focusPrevious = useCallback(() => {
        if (focusHistory.length > 1) {
            const newHistory = [...focusHistory];
            newHistory.pop(); // Remove current
            const previousId = newHistory[newHistory.length - 1];
            if (previousId) {
                setFocusById(previousId);
                setFocusHistory(newHistory);
            }
        }
    }, [focusHistory, setFocusById]);

    /**
     * Focus the next element (cycle through registered elements)
     */
    const focusNext = useCallback(() => {
        const elements = Array.from(focusableRegistry.current.values());
        if (elements.length === 0) return;

        const currentIndex = elements.findIndex(el => el.id === currentFocusId);
        const nextIndex = (currentIndex + 1) % elements.length;
        const nextElement = elements[nextIndex];

        if (nextElement?.ref) {
            setFocus(nextElement.ref);
            setCurrentFocusId(nextElement.id);
        }
    }, [currentFocusId, setFocus]);

    /**
     * Push an ID to focus history
     */
    const pushFocusHistory = useCallback((id: string) => {
        setFocusHistory(prev => {
            // Avoid duplicates at the end
            if (prev[prev.length - 1] === id) return prev;

            const newHistory = [...prev, id];
            // Trim if exceeds max size
            if (newHistory.length > maxHistorySize) {
                return newHistory.slice(-maxHistorySize);
            }
            return newHistory;
        });
    }, [maxHistorySize]);

    /**
     * Pop and return the last ID from focus history
     */
    const popFocusHistory = useCallback((): string | undefined => {
        let popped: string | undefined;
        setFocusHistory(prev => {
            if (prev.length === 0) return prev;
            const newHistory = [...prev];
            popped = newHistory.pop();
            return newHistory;
        });
        return popped;
    }, []);

    /**
     * Clear focus history
     */
    const clearFocusHistory = useCallback(() => {
        setFocusHistory([]);
    }, []);

    /**
     * Announce a message for accessibility
     */
    const announceForAccessibility = useCallback((message: string) => {
        AccessibilityInfo.announceForAccessibility(message);
    }, []);

    // Set initial zone on mount
    useEffect(() => {
        if (initialZoneId && isTV) {
            setActiveZone(initialZoneId);
        }
    }, [initialZoneId, isTV, setActiveZone]);

    const contextValue: TVNavigationContextValue = {
        isTV,
        currentFocusId,
        currentZoneId,
        focusHistory,
        setFocus,
        setFocusById,
        registerFocusable,
        unregisterFocusable,
        registerZone,
        unregisterZone,
        setActiveZone,
        getZone,
        focusFirst,
        focusLast,
        focusPrevious,
        focusNext,
        pushFocusHistory,
        popFocusHistory,
        clearFocusHistory,
        announceForAccessibility,
    };

    return (
        <TVNavigationContext.Provider value={contextValue}>
            {children}
        </TVNavigationContext.Provider>
    );
}

/**
 * Hook to access TV navigation context
 *
 * @throws Error if used outside TVNavigationProvider
 */
export function useTVNavigation(): TVNavigationContextValue {
    const context = useContext(TVNavigationContext);
    if (context === undefined) {
        throw new Error('useTVNavigation must be used within a TVNavigationProvider');
    }
    return context;
}

/**
 * Hook to safely access TV navigation context (returns null if not in provider)
 * Useful for components that may or may not be in a TV context
 */
export function useTVNavigationSafe(): TVNavigationContextValue | null {
    return useContext(TVNavigationContext) || null;
}

export default TVNavigationContext;
