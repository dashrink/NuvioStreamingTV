/**
 * Platform-Specific Module Resolution Utilities
 *
 * Provides utilities for handling platform-specific imports when
 * the bundler's native resolution isn't sufficient.
 *
 * ⚠️ IMPORTANT: PREFER `.tv.tsx` FILE PATTERN OVER RUNTIME CHECKS
 *
 * This module provides fallback utilities for platform selection, but the
 * PREFERRED approach is to use Metro bundler's automatic resolution via
 * platform-specific file extensions:
 *
 * RESOLUTION PRECEDENCE ORDER (Metro bundler):
 * 1. ComponentName.tv.tsx  (TV platform)
 * 2. ComponentName.tv.ts   (TV platform)
 * 3. ComponentName.tsx     (all platforms - fallback)
 * 4. ComponentName.ts      (all platforms - fallback)
 *
 * WHEN TO USE `.tv.tsx` PATTERN (Preferred):
 * - Component has significantly different UI/UX for TV vs mobile
 * - Different layout structures (grid vs list, spatial nav vs touch)
 * - Different styling (10-foot UI vs mobile)
 * - TV-specific interactions (D-pad, focus management)
 *
 * WHEN TO USE THIS MODULE (Fallback):
 * - Runtime configuration selection
 * - Sharing common logic with platform-specific behavior
 * - Dynamic feature flags or A/B testing
 * - Small platform differences that don't warrant separate files
 *
 * USAGE EXAMPLES:
 * ```typescript
 * import { selectPlatformComponent, importPlatformModule } from '@utils/moduleResolver';
 *
 * // For synchronous selection (runtime)
 * const MyComponent = selectPlatformComponent(
 *   MyComponent_TV,
 *   MyComponent_Standard
 * );
 *
 * // For dynamic imports (runtime)
 * const Component = await importPlatformModule(
 *   () => import('./Component.tv'),
 *   () => import('./Component')
 * );
 *
 * // Debug: Check which file Metro loaded
 * const resolvedPath = getResolvedPath('MyComponent', __filename);
 * console.log('Loaded:', resolvedPath); // 'MyComponent.tv.tsx' or 'MyComponent.tsx'
 * ```
 *
 * See: `/src/PLATFORM_ABSTRACTION_PATTERN.md` for complete architecture guide
 */

import { Platform } from 'react-native';

/**
 * Returns true if running on a TV platform
 */
export const isTVPlatform = (): boolean => Platform.isTV;

/**
 * Selects between TV and standard component based on platform.
 *
 * @param tvComponent - Component to use on TV platform
 * @param standardComponent - Component to use on other platforms
 * @returns The selected component
 *
 * @example
 * const CatalogSection = selectPlatformComponent(
 *   CatalogSection_TV,
 *   CatalogSection_Standard
 * );
 */
export const selectPlatformComponent = <T extends React.ComponentType<any>>(
  tvComponent: T,
  standardComponent: T
): T => {
  return (isTVPlatform() ? tvComponent : standardComponent) as T;
};

/**
 * Dynamically imports platform-specific modules.
 *
 * @param tvModuleImport - Async import function for TV module
 * @param standardModuleImport - Async import function for standard module
 * @returns Promise resolving to the selected module's default export
 *
 * @example
 * const CatalogSection = await importPlatformModule(
 *   () => import('./CatalogSection.tv'),
 *   () => import('./CatalogSection')
 * );
 */
export const importPlatformModule = async <T>(
  tvModuleImport: () => Promise<{ default: T }>,
  standardModuleImport: () => Promise<{ default: T }>
): Promise<T> => {
  try {
    const moduleLoader = isTVPlatform() ? tvModuleImport : standardModuleImport;
    const module = await moduleLoader();
    return module.default;
  } catch (error) {
    console.error('[moduleResolver] Failed to import platform module:', error);
    throw error;
  }
};

/**
 * Selects between TV and standard values based on platform.
 * Useful for styling constants, sizing values, etc.
 *
 * @param tvValue - Value to use on TV platform
 * @param standardValue - Value to use on other platforms
 * @returns The selected value
 *
 * @example
 * const BUTTON_SIZE = selectPlatformValue(56, 44);  // TV: 56, Mobile: 44
 * const COLUMNS = selectPlatformValue(6, 3);        // TV: 6 cols, Mobile: 3 cols
 */
export const selectPlatformValue = <T>(tvValue: T, standardValue: T): T => {
  return isTVPlatform() ? tvValue : standardValue;
};

/**
 * Type-safe platform selection for objects.
 * Useful for selecting entire configuration objects.
 *
 * @param tvConfig - Configuration object for TV platform
 * @param standardConfig - Configuration object for other platforms
 * @returns The selected configuration object
 *
 * @example
 * const config = selectPlatformConfig(
 *   { itemsPerRow: 6, focusScale: 1.08 },  // TV
 *   { itemsPerRow: 3, focusScale: 1.02 }   // Mobile
 * );
 */
export const selectPlatformConfig = <T extends Record<string, any>>(
  tvConfig: T,
  standardConfig: T
): T => {
  return isTVPlatform() ? tvConfig : standardConfig;
};

/**
 * Creates a platform-aware hook factory.
 * Returns a hook that selects between TV and standard implementations.
 *
 * @param tvHook - Hook function for TV platform
 * @param standardHook - Hook function for other platforms
 * @returns A hook that selects based on platform
 *
 * @example
 * const useNavigation = createPlatformHook(
 *   useTVNavigation,
 *   useMobileNavigation
 * );
 */
export const createPlatformHook = <T extends (...args: any[]) => any>(
  tvHook: T,
  standardHook: T
): T => {
  return ((...args: any[]) => {
    return isTVPlatform() ? tvHook(...args) : standardHook(...args);
  }) as any as T;
};

/**
 * Conditionally execute code based on platform.
 * Useful for one-off platform-specific logic.
 *
 * @param onTV - Function to execute on TV platform
 * @param onStandard - Function to execute on other platforms
 *
 * @example
 * executePlatformLogic(
 *   () => setupTVNavigation(),
 *   () => setupMobileNavigation()
 * );
 */
export const executePlatformLogic = (onTV: () => void, onStandard: () => void): void => {
  isTVPlatform() ? onTV() : onStandard();
};

/**
 * Maps a value or function across platforms.
 * Useful for computed values that depend on platform.
 *
 * @param mapper - Function that receives platform type and returns value
 * @returns The mapped value
 *
 * @example
 * const fontSize = mapPlatform((platform) => {
 *   if (platform === 'tv') return 24;
 *   return 14;
 * });
 */
export const mapPlatform = <T>(mapper: (platform: 'tv' | 'standard') => T): T => {
  return mapper(isTVPlatform() ? 'tv' : 'standard');
};

/**
 * Helper function to determine which platform-specific file was resolved by Metro.
 * Useful for debugging and verifying that the correct platform variant is loaded.
 *
 * This extracts the filename from the provided path and appends the platform
 * suffix based on the current runtime platform.
 *
 * @param componentName - Base name of the component (e.g., 'CatalogScreen')
 * @param currentFile - The __filename or import.meta.url of the current file
 * @returns The expected resolved filename
 *
 * @example
 * // Inside CatalogScreen.tsx or CatalogScreen.tv.tsx:
 * const resolved = getResolvedPath('CatalogScreen', __filename);
 * console.log('[CatalogScreen] Loaded file:', resolved);
 * // TV Platform output: 'CatalogScreen.tv.tsx'
 * // Mobile Platform output: 'CatalogScreen.tsx'
 *
 * @example
 * // Use in component to verify correct file is loaded:
 * useEffect(() => {
 *   if (__DEV__) {
 *     const path = getResolvedPath('MyComponent', __filename);
 *     logger.debug(`[MyComponent] Resolved to: ${path}`);
 *   }
 * }, []);
 */
export const getResolvedPath = (componentName: string, currentFile: string): string => {
  // Extract the extension from the current file
  const hasTypeScript = currentFile.includes('.tsx') || currentFile.includes('.ts');
  const hasReact = currentFile.includes('.tsx') || currentFile.includes('.jsx');

  // Build the expected filename based on platform
  const extension = hasReact ? (hasTypeScript ? '.tsx' : '.jsx') : hasTypeScript ? '.ts' : '.js';

  const platformSuffix = isTVPlatform() ? '.tv' : '';

  return `${componentName}${platformSuffix}${extension}`;
};

/**
 * Type guard to check if we're running on TV platform.
 * Useful for TypeScript type narrowing in conditional logic.
 *
 * @returns Boolean indicating if current platform is TV
 *
 * @example
 * if (isTVPlatformGuard()) {
 *   // TypeScript knows this is TV platform
 *   setupTVNavigation();
 * } else {
 *   // TypeScript knows this is not TV
 *   setupMobileGestures();
 * }
 */
export const isTVPlatformGuard = (): boolean => {
  return Platform.isTV === true;
};
