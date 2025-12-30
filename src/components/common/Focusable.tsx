import React, { useState, useCallback, useRef } from 'react';
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

// Configurable focus style constants - can be themed
export const TV_FOCUS_STYLES = {
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    scaleDefault: 1.05,
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
    const [isFocused, setIsFocused] = useState(false);
    const scale = useSharedValue(1);
    const pressableRef = useRef<any>(null);

    // Expose ref for external use
    React.useImperativeHandle(ref, () => pressableRef.current);

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

    // TV implementation: Animated scaling and focus ring
    return (
        <Pressable
            ref={pressableRef}
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
                isFocused && styles.tvFocused,
                isFocused && focusedStyle,
                disabled && { opacity: 0.5 }
            ]}
        >
            <Animated.View style={[styles.container, animatedStyle]}>
                {children}
            </Animated.View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: {
        // Removed width/height constraints to prevent expansion in flex layouts
    },
    tvFocused: {
        // Subtle white glow for TV focus
        shadowColor: TV_FOCUS_STYLES.shadowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: TV_FOCUS_STYLES.shadowOpacity,
        shadowRadius: TV_FOCUS_STYLES.shadowRadius,
        elevation: TV_FOCUS_STYLES.elevation,
        borderColor: TV_FOCUS_STYLES.borderColor,
        borderWidth: TV_FOCUS_STYLES.borderWidth,
        zIndex: 99,
    },
});

Focusable.displayName = 'Focusable';

export default React.memo(Focusable);
