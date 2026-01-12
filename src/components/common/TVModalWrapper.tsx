import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, BackHandler, findNodeHandle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import Focusable from './Focusable';
import { useTVEventHandler } from '../../hooks/useTVEventHandler';

interface TVModalWrapperProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Optional ref to the first focusable element in the modal.
   * Focus will be set to this element when the modal opens on TV.
   */
  initialFocusRef?: React.RefObject<any>;
  /**
   * Style for the modal container
   */
  containerStyle?: any;
  /**
   * Style for the backdrop
   */
  backdropStyle?: any;
  /**
   * Whether to show a backdrop (default: true)
   */
  showBackdrop?: boolean;
  /**
   * Whether tapping/clicking the backdrop closes the modal (default: true)
   */
  closeOnBackdropPress?: boolean;
}

/**
 * A wrapper component for modals that provides TV-specific focus trapping
 * and remote control handling (back/menu button to close).
 *
 * On TV platforms:
 * - Traps D-pad focus within the modal
 * - Handles back/menu button to close
 * - Sets initial focus to the first focusable element
 *
 * On mobile:
 * - Handles back button on Android
 * - Standard backdrop tap to close
 */
const TVModalWrapper: React.FC<TVModalWrapperProps> = ({
  visible,
  onClose,
  children,
  initialFocusRef,
  containerStyle,
  backdropStyle,
  showBackdrop = true,
  closeOnBackdropPress = true,
}) => {
  const modalContainerRef = useRef<View>(null);
  const closeButtonRef = useRef<any>(null);

  // Handle TV remote events (back/menu to close)
  useTVEventHandler(
    useCallback(
      evt => {
        if (!visible) return;

        if (evt.eventType === 'blur' || evt.eventType === 'menu') {
          onClose();
        }
      },
      [visible, onClose]
    )
  );

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  // Set initial focus on TV when modal opens
  useEffect(() => {
    if (!visible || !Platform.isTV) return;

    // Delay focus to allow modal to render
    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        // Try to focus the initial focus element
        const nodeHandle = findNodeHandle(initialFocusRef.current);
        if (nodeHandle) {
          initialFocusRef.current?.focus?.();
        }
      } else if (closeButtonRef.current) {
        // Fallback to close button if no initial focus ref provided
        closeButtonRef.current?.focus?.();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [visible, initialFocusRef]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrapper]}>
      {/* Backdrop */}
      {showBackdrop && (
        <Focusable
          style={StyleSheet.absoluteFill}
          onPress={closeOnBackdropPress ? onClose : undefined}
          activeOpacity={1}
          // Make backdrop not focusable on TV to trap focus in modal content
          disabled={Platform.isTV}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.backdrop, backdropStyle]}
          />
        </Focusable>
      )}

      {/* Modal Content Container */}
      <View
        ref={modalContainerRef}
        style={[styles.container, containerStyle]}
        // Prevent touches from passing through to backdrop
        pointerEvents="box-none"
      >
        {/* Invisible close button for TV - positioned off-screen but focusable
            This helps with focus management and provides a way to close via select */}
        {Platform.isTV && (
          <Focusable ref={closeButtonRef} onPress={onClose} style={styles.hiddenCloseButton}>
            <View />
          </Focusable>
        )}

        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenCloseButton: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default React.memo(TVModalWrapper);
