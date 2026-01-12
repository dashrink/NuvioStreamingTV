/**
 * Shared types and interfaces for Focusable component
 * Used by both mobile (Focusable.tsx) and TV (Focusable.tv.tsx) versions
 */

import React from 'react';
import { StyleProp, ViewStyle, Insets } from 'react-native';

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
 * Updated: Thin border with subtle scale effect for cleaner focus indication
 */
export const TV_FOCUS_STYLES = {
  borderWidth: 1, // Thin border for cleaner focus indication
  scaleDefault: 1.05, // Slightly enlarge on focus for visibility
  fallbackColor: '#E5A00D', // Warm yellow/gold fallback color
  focusShadow: {
    shadowColor: '#E5A00D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.0,
    shadowRadius: 0,
    elevation: 0, // Removed elevation for cleaner look
  },
};
