import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
    Pressable,
    Platform,
    StyleProp,
    ViewStyle,
    StyleSheet,
    findNodeHandle,
    Insets,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

// Create an Animated version of Pressable for TV scale animations
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Configurable focus style constants - can be themed
// Using clean border-based focus indicator that works across all themes
// Enhanced for TV viewing distance - focus rings must be clearly visible
export const TV_FOCUS_STYLES = {
    borderWidth: 3,          // Thicker border for TV viewing distance
    scaleDefault: 1.04,      // Slightly more prominent scale for TV
    fallbackColor: '#2d9cdb', // Fallback if theme not available
    focusShadow: {
        shadowColor: '#2d9cdb',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 8,        // Android elevation for shadow effect
    },
};

interface FocusableProps {
    children: React.ReactNode;
    onPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    onLongPress?: () => void;
    activeOpacity?: number; // Only used for mobile fallback
    style?: StyleProp<ViewStyle>;
    focusedStyle?: StyleProp<ViewStyle>;
    scaleOnFocus?: number;
    onFocus?: () => void;
    onBlur?: () => void;
    hasTVPreferredFocus?: boolean;
    // New TV navigation props
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
 * A modular component that provides focus handling for Android TV
 * while falling back to a standard Pressable on mobile devices.
 * 
 * TV Features:
 * - Animated scaling on focus
 * - Configurable focus ring/glow
 * - Explicit spatial navigation via nextFocus* props
 * - Focus key for programmatic focus control
 * - Apple TV Parallax effect support
 */
const Focusable = React.forwardRef<any, FocusableProps>(({
    children,
    onPress,
    onPressIn,
    onPressOut,
    onLongPress,
    activeOpacity = 0.7,
    style,
    focusedStyle,
    scaleOnFocus = TV_FOCUS_STYLES.scaleDefault,
    onFocus,
    onBlur,
    hasTVPreferredFocus,
    focusKey,
    nextFocusUp,
    nextFocusDown,
    nextFocusLeft,
    nextFocusRight,
    disabled,
    testID,
    hitSlop,
}, ref) => {
    const { currentTheme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const scale = useSharedValue(1);
    const pressableRef = useRef<any>(null);

    // Expose ref for external use
    React.useImperativeHandle(ref, () => pressableRef.current);

    // Default border-based focus style using theme color with enhanced visibility
    const focusColor = currentTheme?.colors?.primary || TV_FOCUS_STYLES.fallbackColor;
    const defaultFocusedStyle = useMemo(() => ({
        borderWidth: TV_FOCUS_STYLES.borderWidth,
        borderColor: focusColor,
        // Enhanced shadow/glow effect for TV viewing distance
        shadowColor: focusColor,
        shadowOffset: TV_FOCUS_STYLES.focusShadow.shadowOffset,
        shadowOpacity: TV_FOCUS_STYLES.focusShadow.shadowOpacity,
        shadowRadius: TV_FOCUS_STYLES.focusShadow.shadowRadius,
        elevation: TV_FOCUS_STYLES.focusShadow.elevation,
    }), [focusColor]);

    const animatedStyle = useAnimatedStyle(() => {
        // Only apply scaling animations if we are on a TV platform
        // Note: For Apple TV, we often prefer the native parallax effect over manual scaling
        if (!Platform.isTV || Platform.OS === 'ios') return {};
        return {
            transform: [{
                scale: withSpring(scale.value, {
                    damping: 15,
                    stiffness: 150,
                    mass: 0.8
                })
            }],
        };
    });

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        scale.value = scaleOnFocus;
        onFocus?.();
    }, [scaleOnFocus, onFocus, scale]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        scale.value = 1;
        onBlur?.();
    }, [onBlur, scale]);

    // Helper to resolve ref to node handle
    const resolveNextFocus = (target: number | React.RefObject<any> | undefined): number | undefined => {
        if (typeof target === 'number') return target;
        if (target?.current) return findNodeHandle(target.current) ?? undefined;
        return undefined;
    };

    // Mobile / Tablet implementation: Standard Pressable with no TV-specific logic
    if (!Platform.isTV) {
        return (
            <Pressable
                ref={pressableRef}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onLongPress={onLongPress}
                disabled={disabled}
                testID={testID}
                hitSlop={hitSlop}
                style={({ pressed }) => [
                    style,
                    pressed && { opacity: activeOpacity }, // Standard mobile feedback
                    disabled && { opacity: 0.5 }
                ]}
            >
                {children}
            </Pressable>
        );
    }

    // TV implementation: Animated scaling and subtle glow - no wrapper to preserve flex layout
    return (
        <AnimatedPressable
            ref={pressableRef}
            focusable={Platform.isTV} // explicit focusable prop
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onLongPress={onLongPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            testID={testID}
            hitSlop={hitSlop}
            //@ts-ignore - TV-only props
            hasTVPreferredFocus={hasTVPreferredFocus}
            //@ts-ignore
            nextFocusUp={resolveNextFocus(nextFocusUp)}
            //@ts-ignore
            nextFocusDown={resolveNextFocus(nextFocusDown)}
            //@ts-ignore
            nextFocusLeft={resolveNextFocus(nextFocusLeft)}
            //@ts-ignore
            nextFocusRight={resolveNextFocus(nextFocusRight)}
            //@ts-ignore - Apple TV Parallax effect
            tvParallaxProperties={{
                enabled: true,
                magnification: scaleOnFocus,
                pressMagnification: 1.0,
            }}
            style={[
                style,
                animatedStyle,
                // Apply default border-based focus style only if no custom focusedStyle provided
                isFocused && !focusedStyle && defaultFocusedStyle,
                isFocused && focusedStyle,
                disabled && { opacity: 0.5 }
            ]}
        >
            {children}
        </AnimatedPressable>
    );
});

const styles = StyleSheet.create({
    // Styles can be extended here if needed
});

Focusable.displayName = 'Focusable';

export default React.memo(Focusable);
