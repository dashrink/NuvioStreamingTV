import React from 'react';
import { ViewStyle } from 'react-native';

import UnifiedSpinner from '../loading/UnifiedSpinner';

/**
 * LoadingSpinnerProps - Props interface for LoadingSpinner component
 *
 * Maintained for backward compatibility. New code should use UnifiedSpinner directly.
 */
interface LoadingSpinnerProps {
  /** Optional loading text to display below the spinner */
  text?: string;
  /** Size of the spinner: 'small' (60px), 'medium' (100px), 'large' (150px) */
  size?: 'small' | 'medium' | 'large';
  /** Custom container style */
  style?: ViewStyle;
  /** Optional override for Lottie animation source */
  source?: any;
  /** Optional vertical offset from center */
  offsetY?: number;
}

/**
 * @deprecated Use UnifiedSpinner from 'src/components/loading' instead.
 *
 * LoadingSpinner is maintained for backward compatibility but new code should
 * import and use UnifiedSpinner directly:
 *
 * @example
 * // Old usage (deprecated):
 * import LoadingSpinner from '../common/LoadingSpinner';
 * <LoadingSpinner text="Loading..." size="large" />
 *
 * // New usage (recommended):
 * import { UnifiedSpinner } from '../loading';
 * <UnifiedSpinner text="Loading..." size="large" />
 *
 * UnifiedSpinner provides additional features:
 * - Theme-aware colors (defaults to theme primary)
 * - Custom color prop for specific contexts (e.g., white for buttons)
 * - Fallback to native ActivityIndicator when Lottie fails
 * - Better accessibility support with accessibilityRole and accessibilityLabel
 * - testID support for testing frameworks
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text,
  size = 'large',
  style,
  source,
  offsetY = 0,
}) => {
  // Wrap UnifiedSpinner with LoadingSpinner's props for backward compatibility
  return <UnifiedSpinner text={text} size={size} style={style} source={source} offsetY={offsetY} />;
};

export default LoadingSpinner;
