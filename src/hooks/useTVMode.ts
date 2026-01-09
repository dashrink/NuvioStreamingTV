import { useEffect, useState, useCallback } from 'react';
import { Platform, DeviceEventEmitter, BackHandler } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTVEventHandler } from './useTVEventHandler';

/**
 * Hook to detect and manage TV-specific behaviors and events.
 * Only active on TV platforms to ensure zero impact on mobile.
 * 
 * IMPORTANT: This hook should only be used in components that are
 * rendered INSIDE the NavigationContainer.
 */
export const useTVMode = () => {
    const [isTV] = useState(Platform.isTV);

    // Safely try to get navigation - will be undefined if outside NavigationContainer
    let navigation: NavigationProp<any> | null = null;
    try {
        // This will throw if we're outside NavigationContainer
        navigation = useNavigation();
    } catch {
        // Silently fail - we're outside NavigationContainer
        if (__DEV__ && isTV) {
            console.log('[useTVMode] Navigation not available - likely outside NavigationContainer');
        }
    }

    const backAction = useCallback(() => {
        try {
            if (navigation?.canGoBack()) {
                navigation.goBack();
                return true;
            }
        } catch (error) {
            if (__DEV__) {
                console.log('[useTVMode] backAction error:', error);
            }
        }
        return false;
    }, [navigation]);

    useEffect(() => {
        if (!isTV) return;

        // 1. Android TV Back Button Handling
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => {
            backHandler.remove();
        };
    }, [isTV, backAction]);

    // 2. Standard TV Remote Event Handling
    // Using the new cross-platform hook
    useTVEventHandler((evt) => {
        if (!isTV) return;

        if (__DEV__) {
            console.log('[TVEvent]', evt.eventType);
        }

        // Apple TV 'menu' button usually maps to back
        if (Platform.OS === 'ios' && evt.eventType === 'menu') {
            backAction();
        }
    });

    return {
        isTV,
    };
};

/**
 * Standalone hook for TV Back Button handling that doesn't require navigation.
 * Use this in components that are outside NavigationContainer or when you want
 * to handle the back button yourself.
 */
export const useTVBackHandler = (onBackPress?: () => boolean) => {
    const [isTV] = useState(Platform.isTV);

    useEffect(() => {
        if (!isTV) return;

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (onBackPress) {
                    return onBackPress();
                }
                return false;
            }
        );

        return () => {
            backHandler.remove();
        };
    }, [isTV, onBackPress]);

    return { isTV };
};
