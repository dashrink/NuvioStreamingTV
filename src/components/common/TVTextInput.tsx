import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, StyleProp, ViewStyle } from 'react-native';

interface TVTextInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Mobile/Tablet version of TVTextInput.
 *
 * Falls back to standard TextInput rendering.
 * TV logic is in TVTextInput.tv.tsx
 */
const TVTextInput = forwardRef<TextInput, TVTextInputProps>(
  ({ containerStyle, style, onFocus, onBlur, ...props }, ref) => {
    // On mobile, just use regular TextInput
    return <TextInput ref={ref} style={style} onFocus={onFocus} onBlur={onBlur} {...props} />;
  }
);

TVTextInput.displayName = 'TVTextInput';

export default TVTextInput;
