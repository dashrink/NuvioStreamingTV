import React, { useState, useCallback, forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface TVTextInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * A TextInput wrapper optimized for TV platforms.
 * 
 * Features:
 * - Proper focus handling on TV
 * - Visual focus indicator border on TV
 * - Fallback to standard TextInput on mobile
 */
const TVTextInput = forwardRef<TextInput, TVTextInputProps>(({
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const { currentTheme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback((e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  }, [onBlur]);

  // On mobile, just use regular TextInput
  if (!Platform.isTV) {
    return (
      <TextInput
        ref={ref}
        style={style}
        onFocus={onFocus}
        onBlur={onBlur}
        {...props}
      />
    );
  }

  // On TV, wrap in a View to provide focus border
  return (
    <View
      style={[
        styles.container,
        containerStyle,
        isFocused && {
          borderColor: currentTheme?.colors?.primary || '#2d9cdb',
          borderWidth: 2,
        },
      ]}
    >
      <TextInput
        ref={ref}
        style={[styles.input, style]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        // TV-specific props
        autoCorrect={false}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  input: {
    // Ensure input takes full width/height of container
  },
});

TVTextInput.displayName = 'TVTextInput';

export default TVTextInput;
