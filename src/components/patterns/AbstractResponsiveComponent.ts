/**
 * Abstract Responsive Component Pattern
 *
 * Provides base interfaces and types for creating responsive components
 * that have platform-specific implementations (.tsx and .tv.tsx variants).
 *
 * USAGE PATTERN:
 * ```
 * // Create shared props interface in a .shared.ts file or in the main component
 * interface MyComponentProps {
 *   data: Item[];
 *   onPress: (item: Item) => void;
 *   title: string;
 * }
 *
 * // Standard version (MyComponent.tsx)
 * export const MyComponent: React.FC<MyComponentProps> = (props) => {
 *   // Mobile/standard implementation
 *   return <ScrollView>...</ScrollView>;
 * };
 *
 * // TV version (MyComponent.tv.tsx)
 * export const MyComponent: React.FC<MyComponentProps> = (props) => {
 *   // TV-specific implementation
 *   return <Focusable>...</Focusable>;
 * };
 * ```
 *
 * The Metro bundler will automatically select the correct version based on platform.
 */

import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';

/**
 * Base props that all responsive components should support
 */
export interface ResponsiveComponentProps {
  /** Unique identifier for the component */
  testID?: string;

  /** CSS class name for web platform */
  className?: string;

  /** Accessibility label */
  accessibilityLabel?: string;

  /** Custom styles */
  style?: ViewStyle | TextStyle;

  /** Whether component is disabled */
  disabled?: boolean;
}

/**
 * Layout configuration for responsive components
 */
export interface ResponsiveLayout {
  /** Number of columns in grid */
  columns: number;

  /** Padding for screen edges */
  paddingHorizontal: number;

  /** Padding for top/bottom */
  paddingVertical: number;

  /** Gap between items */
  itemGap: number;

  /** Item height (if fixed) */
  itemHeight?: number;

  /** Whether to show scrollbar */
  showScrollbar: boolean;
}

/**
 * Configuration for responsive animations
 */
export interface ResponsiveAnimationConfig {
  /** Duration of focus animation in ms */
  focusDuration: number;

  /** Duration of page transition in ms */
  transitionDuration: number;

  /** Whether to use spring physics */
  useSpringPhysics: boolean;
}

/**
 * Base responsive component configuration
 */
export interface ResponsiveComponentConfig {
  layout: ResponsiveLayout;
  animations: ResponsiveAnimationConfig;
  accessibility: {
    enableFocusIndicator: boolean;
    minTouchTargetSize: number;
  };
}

/**
 * Factory function to create platform-specific configs
 *
 * @example
 * const config = createResponsiveConfig(
 *   {
 *     layout: { columns: 6, paddingHorizontal: 48, ... },
 *     animations: { focusDuration: 200, ... }
 *   },
 *   {
 *     layout: { columns: 3, paddingHorizontal: 16, ... },
 *     animations: { focusDuration: 100, ... }
 *   }
 * );
 */
export const createResponsiveConfig = (
  tvConfig: ResponsiveComponentConfig,
  standardConfig: ResponsiveComponentConfig
) => {
  return (isTV: boolean): ResponsiveComponentConfig => {
    return isTV ? tvConfig : standardConfig;
  };
};

/**
 * Props for components that render lists/grids
 */
export interface ResponsiveListProps<T> extends ResponsiveComponentProps {
  /** Data to render */
  data: T[];

  /** Key extractor function */
  keyExtractor: (item: T, index: number) => string;

  /** Render function for each item */
  renderItem: (item: T, index: number, isFocused?: boolean) => React.ReactNode;

  /** Called when item is pressed */
  onItemPress: (item: T, index: number) => void;

  /** Number of columns */
  numColumns?: number;

  /** Whether list is scrollable */
  scrollEnabled?: boolean;

  /** Initial scroll position */
  initialScrollIndex?: number;
}

/**
 * Props for components with modal-like behavior
 */
export interface ResponsiveModalProps extends ResponsiveComponentProps {
  /** Whether modal is visible */
  visible: boolean;

  /** Called when modal is dismissed */
  onDismiss: () => void;

  /** Modal content */
  children: React.ReactNode;

  /** Whether to show backdrop */
  hasBackdrop?: boolean;

  /** Modal animation type */
  animationType?: 'fade' | 'slide' | 'none';
}

/**
 * Props for components with form input
 */
export interface ResponsiveInputProps extends ResponsiveComponentProps {
  /** Input value */
  value: string;

  /** Called when value changes */
  onChangeText: (text: string) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Whether to hide text (password field) */
  secureTextEntry?: boolean;

  /** Input type */
  inputType?: 'text' | 'email' | 'password' | 'number';

  /** Whether input is focused */
  autoFocus?: boolean;
}

/**
 * Props for button/action components
 */
export interface ResponsiveButtonProps extends ResponsiveComponentProps {
  /** Button text */
  label: string;

  /** Button variant */
  variant?: 'primary' | 'secondary' | 'tertiary';

  /** Called when button is pressed */
  onPress: () => void;

  /** Whether button is loading */
  loading?: boolean;

  /** Button size */
  size?: 'small' | 'medium' | 'large';

  /** Icon component */
  icon?: React.ReactNode;

  /** Icon position */
  iconPosition?: 'left' | 'right';
}

/**
 * Helper hook for managing responsive state
 */
export interface ResponsiveState {
  /** Current focused item index */
  focusedIndex: number;

  /** Whether touch is enabled */
  touchEnabled: boolean;

  /** Current scroll position */
  scrollPosition: number;

  /** Whether component is ready */
  isReady: boolean;
}

/**
 * Type guard for checking if component has responsive props
 */
export const isResponsiveComponentProps = (props: any): props is ResponsiveComponentProps => {
  return typeof props === 'object' && props !== null;
};

/**
 * Merge responsive component props
 */
export const mergeResponsiveProps = <T extends ResponsiveComponentProps>(
  ...propsList: Partial<T>[]
): T => {
  return propsList.reduce(
    (acc, props) => ({
      ...acc,
      ...props,
      style: [acc.style, props?.style],
    }),
    {} as T
  );
};

/**
 * Create a responsive component wrapper
 *
 * @example
 * const MyComponent = createResponsiveWrapper<MyComponentProps>(
 *   TVImplementation,
 *   StandardImplementation,
 *   { name: 'MyComponent' }
 * );
 */
export const createResponsiveWrapper = <P extends ResponsiveComponentProps>(
  TVComponent: React.ComponentType<P>,
  StandardComponent: React.ComponentType<P>,
  options?: { name?: string; displayName?: string }
): React.FC<P> => {
  const isMobile = true; // This will be replaced by actual platform check at runtime

  const Component: React.FC<P> = props => {
    const ComponentToRender = isMobile ? StandardComponent : TVComponent;
    return React.createElement(ComponentToRender, props);
  };

  Component.displayName = options?.displayName || options?.name || 'ResponsiveComponent';
  return Component;
};

/**
 * HOC to add responsive behavior to a component
 */
export const withResponsiveProps = <P extends ResponsiveComponentProps>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent: React.FC<P> = props => {
    const responsiveProps = {
      ...props,
      testID: props.testID || 'responsive-component',
    };

    return React.createElement(Component, responsiveProps as P);
  };

  WrappedComponent.displayName = `withResponsiveProps(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
};
