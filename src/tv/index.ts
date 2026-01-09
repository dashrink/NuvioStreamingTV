/**
 * TV Navigation Infrastructure
 *
 * Core TV navigation infrastructure with focus management,
 * D-pad support, and spatial navigation.
 *
 * @module tv
 */

// Context
export {
    TVNavigationProvider,
    useTVNavigation,
    useTVNavigationSafe,
    type FocusZone,
    type FocusableElement,
    type NavigationDirection,
} from '../contexts/TVNavigationContext';

// Hooks
export {
    useTVMode,
    useTVBackHandler,
} from '../hooks/useTVMode';

export {
    useTVEventHandler,
} from '../hooks/useTVEventHandler';

export {
    useSpatialNavigation,
    type SpatialNavigationConfig,
    type SpatialNavigationResult,
    type SpatialItem,
    type NavigationHandlers,
    type Direction,
} from '../hooks/useSpatialNavigation';

export {
    useFocusGroup,
    type FocusGroupConfig,
    type FocusGroupResult,
} from '../hooks/useFocusGroup';

// Components
export {
    default as Focusable,
    TV_FOCUS_STYLES,
} from '../components/common/Focusable';

export {
    FocusableList,
    type FocusableListProps,
    type FocusableListItemProps,
} from '../components/common/FocusableList';

// TV-specific components
export {
    TVLibraryGrid,
    type TVLibraryGridProps,
    type TVLibraryItem,
} from '../components/tv/TVLibraryGrid';

export {
    TVLibraryFolders,
    type TVLibraryFoldersProps,
    type LibraryFolder,
} from '../components/tv/TVLibraryFolders';

/**
 * Example usage:
 *
 * ```tsx
 * import {
 *   TVNavigationProvider,
 *   useTVMode,
 *   useSpatialNavigation,
 *   useFocusGroup,
 *   Focusable,
 *   FocusableList,
 * } from '../tv';
 *
 * // Wrap your app with the provider
 * function App() {
 *   return (
 *     <TVNavigationProvider>
 *       <Navigator />
 *     </TVNavigationProvider>
 *   );
 * }
 *
 * // Use hooks in components
 * function MyScreen() {
 *   const { isTV } = useTVMode();
 *
 *   const { focusedIndex, getFocusableProps } = useSpatialNavigation(
 *     items.length,
 *     { itemsPerRow: 4 }
 *   );
 *
 *   return (
 *     <View>
 *       {items.map((item, index) => (
 *         <Focusable key={item.id} {...getFocusableProps(index)}>
 *           <ItemContent item={item} />
 *         </Focusable>
 *       ))}
 *     </View>
 *   );
 * }
 *
 * // Or use FocusableList for optimized list rendering
 * function MyList() {
 *   return (
 *     <FocusableList
 *       data={items}
 *       keyExtractor={(item) => item.id}
 *       renderItem={({ item, isFocused }) => (
 *         <Card item={item} focused={isFocused} />
 *       )}
 *       horizontal
 *       autoFocus
 *     />
 *   );
 * }
 * ```
 */
