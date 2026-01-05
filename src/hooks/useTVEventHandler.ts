import { useEffect } from 'react';
// @ts-ignore - TVEventHandler types might be missing in standard RN types
import { Platform, TVEventHandler } from 'react-native';

/**
 * A cross-platform hook that wraps the standard React Native TVEventHandler.
 * On mobile/tablet (non-TV) devices, this hook is a no-op to prevent overhead.
 * 
 * Note: TVEventHandler may not be available in all React Native TV builds,
 * particularly some Expo configurations. This hook safely handles that case.
 * 
 * @param handleEvent Function to handle TV remote events (up, down, left, right, select, menu, playPause, etc.)
 */
export const useTVEventHandler = (handleEvent: (evt: any) => void) => {
    useEffect(() => {
        // 1. Guard: Only run on TV platforms
        if (!Platform.isTV) return;

        // 2. Guard: Check if TVEventHandler is available
        // In some Expo builds, TVEventHandler may be undefined or not a constructor
        if (!TVEventHandler || typeof TVEventHandler !== 'function') {
            if (__DEV__) {
                console.log('[useTVEventHandler] TVEventHandler not available in this build');
            }
            return;
        }

        let tvEventHandler: any = null;

        try {
            // 3. Instantiate the event handler
            tvEventHandler = new TVEventHandler();

            // 4. Enable the listener
            // Note: The first parameter (cmp) is legacy - passing null is safe in modern RN TV
            tvEventHandler.enable(null, (cmp: any, evt: any) => {
                if (evt && handleEvent) {
                    handleEvent(evt);
                }
            });
        } catch (error) {
            // TVEventHandler may not be properly initialized in all RN TV builds
            if (__DEV__) {
                console.log('[useTVEventHandler] TVEventHandler not available:',
                    error instanceof Error ? error.message : String(error));
            }
            return;
        }

        // 5. Cleanup on unmount
        return () => {
            try {
                if (tvEventHandler) {
                    tvEventHandler.disable();
                }
            } catch {
                // Ignore cleanup errors
            }
        };
    }, [handleEvent]);
};

