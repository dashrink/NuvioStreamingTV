/**
 * TV Styling Module - Backward Compatibility Wrapper
 *
 * This file maintains backward compatibility with the old tvStyles.ts API
 * while using the new modularized structure in tvStyles/ directory.
 *
 * MIGRATION NOTE:
 * - This wrapper is maintained for backward compatibility only
 * - New code should import directly from ./tvStyles/ subdirectory files
 * - Example: import { TV_SPACING } from '@utils/tvStyles/spacing'
 * - Or use the comprehensive export: import { TV_SPACING } from '@utils/tvStyles'
 */

// Re-export everything from the modularized tvStyles directory
export * from './tvStyles';

// Also export the old API structure for maximum compatibility
import * as TVStylesModule from './tvStyles';

export default TVStylesModule.default;
