/**
 * Shared types and interfaces for Focusable component
 * Used by both mobile (Focusable.tsx) and TV (Focusable.tv.tsx) versions
 */

import { StyleProp, ViewStyle, Insets } from 'react-native';
import React from 'react';

/**
 * Common props interface for Focusable component
 * Both TV and mobile versions must implement this interface
 */
export interface FocusableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  activeOpacity?: number; // Used by mobile version for touch feedback
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>; // Used by TV version for focus state
  scaleOnFocus?: number; // Used by TV version for focus animation
  onFocus?: () => void;
  onBlur?: () => void;
  hasTVPreferredFocus?: boolean; // Used by TV version
  // TV spatial navigation props
  focusKey?: string;
  nextFocusUp?: number | React.RefObject<any>;
  nextFocusDown?: number | React.RefObject<any>;
  nextFocusLeft?: number | React.RefObject<any>;
  nextFocusRight?: number | React.RefObject<any>;
  disabled?: boolean;
  testID?: string;
  hitSlop?: Insets;
}

/**
 * TV-specific focus styling constants
 * Configured for optimal visibility at 10-foot viewing distance
 */
export const TV_FOCUS_STYLES = {
  borderWidth: 3, // Thicker border for TV viewing distance
  scaleDefault: 1.04, // Slightly more prominent scale for TV
  fallbackColor: '#2d9cdb', // Fallback if theme not available
  focusShadow: {
    shadowColor: '#2d9cdb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8, // Android elevation for shadow effect
  },
};
