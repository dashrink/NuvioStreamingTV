/**
 * Hooks Index
 *
 * Central export point for all custom hooks.
 * Import hooks from this file for cleaner imports.
 *
 * @example
 * import { useTVEventHandler, useSpatialNavigation, useLongPress } from '@/hooks';
 */

// TV Navigation Hooks
export { useTVEventHandler, useIsTV, useTVEventHandlerAvailable } from './useTVEventHandler';
export type { TVEvent, TVEventCallback, UseTVEventHandlerOptions } from './useTVEventHandler';

export { useSpatialNavigation, useFocusableRef, useFocusHandlers, useGridNavigation, isTV } from './useSpatialNavigation';
export type {
  FocusableRef,
  FocusDirection,
  RefMap,
  NodeHandleMap,
  NextFocusConfig,
  NextFocusMap,
  NextFocusProps,
  UseSpatialNavigationOptions,
  UseSpatialNavigationReturn,
  GridNavigationConfig,
} from './useSpatialNavigation';

export { useLongPress, useLongPressWithTVEvents, LONG_PRESS_THRESHOLD_MS, supportsNativeLongPress, requiresTimerBasedLongPress } from './useLongPress';
export type {
  UseLongPressOptions,
  UseLongPressReturn,
  UseLongPressWithTVEventsOptions,
  UseLongPressWithTVEventsReturn,
} from './useLongPress';

export { useTVFocusRestoration, useTVFocusRestorationSimple } from './useTVFocusRestoration';
export type {
  TVFocusRouteParams,
  UseTVFocusRestorationOptions,
  UseTVFocusRestorationReturn,
} from './useTVFocusRestoration';

export { useTVBackHandler, useTVBackHandlerSimple, useTVBackWithFocusRestore, useTVNavigationBackHandler } from './useTVBackHandler';
export type {
  UseTVBackHandlerOptions,
  UseTVBackHandlerReturn,
} from './useTVBackHandler';

export { useTVPlayerControls, isTV as isTVPlatform, createDefaultVolumeHandler } from './useTVPlayerControls';
export type {
  TVPlayerControlsConfig,
  TVPlayerControlsResult,
} from './useTVPlayerControls';
