/**
 * TVScreenWrapper Component
 *
 * A wrapper component that provides TV focus restoration functionality to any screen.
 * This is a non-TV fallback that simply renders children.
 *
 * For TV-specific functionality, see TVScreenWrapper.tv.tsx
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

// =============================================================================
// Types
// =============================================================================

export interface TVScreenWrapperProps {
  /** The screen content to wrap */
  children: ReactNode;
  /** Screen name for focus memory (optional on non-TV) */
  screenName?: string;
  /** Default focus ID to use when no saved focus exists */
  defaultFocusId?: string;
  /** Additional style for the wrapper */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

// =============================================================================
// Component (Non-TV Fallback)
// =============================================================================

/**
 * Non-TV fallback: simply renders children without any TV-specific logic
 */
export function TVScreenWrapper({ children, style, testID }: TVScreenWrapperProps): JSX.Element {
  return (
    <View style={[styles.container, style]} testID={testID}>
      {children}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TVScreenWrapper;
