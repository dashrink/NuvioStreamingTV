import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LoadingOverlayProps,
  LOADING_ANIMATION_DURATIONS,
  DEFAULT_LOADING_CONFIG,
  getLoadingColorTokens,
} from './types';
import UnifiedSpinner from './UnifiedSpinner';

/**
 * LoadingOverlayScreen - A full-screen loading overlay for page-level loading states
 *
 * Provides a modal overlay with:
 * - Full-screen semi-transparent backdrop
 * - Centered UnifiedSpinner with optional loading message
 * - SafeArea-aware padding for proper notch/home indicator handling
 * - Optional backdrop blur effect (iOS only, falls back to solid on Android)
 * - Theme-aware colors derived from current theme
 * - Smooth fade-in/fade-out animations
 *
 * @example
 * // Basic usage - shows/hides based on visible prop
 * <LoadingOverlayScreen visible={isLoading} />
 *
 * @example
 * // With loading message
 * <LoadingOverlayScreen visible={isLoading} text="Loading your content..." />
 *
 * @example
 * // With blur effect and custom opacity
 * <LoadingOverlayScreen
 *   visible={isLoading}
 *   blur={true}
 *   backdropOpacity={0.8}
 *   text="Please wait..."
 * />
 *
 * @example
 * // Dismissable overlay
 * <LoadingOverlayScreen
 *   visible={isLoading}
 *   onBackdropPress={() => setIsLoading(false)}
 *   text="Tap to cancel"
 * />
 *
 * @example
 * // Different sizes
 * <LoadingOverlayScreen visible={isLoading} size="small" /> // Small spinner
 * <LoadingOverlayScreen visible={isLoading} size="large" /> // Large spinner (default)
 */
const LoadingOverlayScreen: React.FC<LoadingOverlayProps> = ({
  visible,
  text,
  size = 'large',
  style,
  testID,
  blur = false,
  backdropOpacity = DEFAULT_LOADING_CONFIG.overlayBackdropOpacity,
  onBackdropPress,
}) => {
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const colorTokens = getLoadingColorTokens(currentTheme.colors);

  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  // Track if overlay should render
  const [shouldRender, setShouldRender] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      // Show overlay
      setShouldRender(true);
      opacity.value = withTiming(1, {
        duration: LOADING_ANIMATION_DURATIONS.fadeIn,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: LOADING_ANIMATION_DURATIONS.fadeIn,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // Hide overlay with animation, then unmount
      opacity.value = withTiming(
        0,
        {
          duration: LOADING_ANIMATION_DURATIONS.fadeOut,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setShouldRender)(false);
          }
        }
      );
      scale.value = withTiming(0.95, {
        duration: LOADING_ANIMATION_DURATIONS.fadeOut,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible]);

  // Animated styles for the backdrop
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * backdropOpacity,
  }));

  // Animated styles for the content container
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Handle backdrop press
  const handleBackdropPress = () => {
    if (onBackdropPress) {
      onBackdropPress();
    }
  };

  // Don't render if not visible and animation completed
  if (!shouldRender) {
    return null;
  }

  // Determine backdrop background color
  const backdropColor = colorTokens.overlay;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      statusBarTranslucent
      testID={testID}
    >
      <TouchableWithoutFeedback
        onPress={handleBackdropPress}
        disabled={!onBackdropPress}
      >
        <View style={[styles.container, style]}>
          {/* Backdrop layer */}
          {blur && Platform.OS === 'ios' ? (
            <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
              <BlurView
                intensity={60}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.backdrop,
                { backgroundColor: backdropColor },
                backdropAnimatedStyle,
              ]}
            />
          )}

          {/* Content layer with SafeArea padding */}
          <Animated.View
            style={[
              styles.contentContainer,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                paddingLeft: insets.left,
                paddingRight: insets.right,
              },
              contentAnimatedStyle,
            ]}
            pointerEvents="none"
          >
            <View style={styles.spinnerContainer}>
              <UnifiedSpinner
                size={size}
                text={text}
                testID={testID ? `${testID}-spinner` : undefined}
              />
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    // Background color applied dynamically
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

export default LoadingOverlayScreen;
