import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SpinnerLoadingProps,
  LOADING_SIZE_DIMENSIONS,
  LOTTIE_SIZE_DIMENSIONS,
  LOADING_TEXT_SIZES,
} from './types';

/**
 * UnifiedSpinner - A theme-aware loading spinner component
 *
 * Provides a consistent loading indicator across the app with:
 * - Theme-aware colors (uses currentTheme.colors.primary by default)
 * - Three sizes: small (24px), medium (40px), large (60px)
 * - Lottie animation support with fallback to native ActivityIndicator
 * - Optional loading text with proper styling
 * - Android-specific optimizations for Lottie animations
 *
 * @example
 * // Basic usage with default size (medium)
 * <UnifiedSpinner />
 *
 * @example
 * // With loading text
 * <UnifiedSpinner text="Loading content..." size="large" />
 *
 * @example
 * // With custom color (e.g., white for button context)
 * <UnifiedSpinner size="small" color="#FFFFFF" />
 *
 * @example
 * // With custom Lottie source
 * <UnifiedSpinner source={require('../../../assets/lottie/custom.json')} />
 */
const UnifiedSpinner: React.FC<SpinnerLoadingProps> = ({
  text,
  size = 'medium',
  style,
  testID,
  color,
  source,
  offsetY = 0,
}) => {
  const { currentTheme } = useTheme();
  const [lottieError, setLottieError] = useState(false);

  // Determine the spinner color - use provided color or theme primary
  const spinnerColor = color || currentTheme.colors.primary;

  // Get dimensions based on size
  const lottieDimensions = LOTTIE_SIZE_DIMENSIONS[size];
  const nativeDimensions = LOADING_SIZE_DIMENSIONS[size];
  const textFontSize = LOADING_TEXT_SIZES[size];

  // Android-specific Lottie configuration for merge paths
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        const Lottie = require('lottie-react-native');
        if (Lottie.enableMergePathsForKitKatAndAbove) {
          Lottie.enableMergePathsForKitKatAndAbove(true);
        }
      } catch (error) {
        // Silently ignore if merge paths cannot be enabled
      }
    }
  }, []);

  // Handle Lottie animation failure
  const handleLottieError = (error: any) => {
    if (__DEV__) {
      // Only warn in development, don't log in production
    }
    setLottieError(true);
  };

  // Render Lottie spinner or fallback to ActivityIndicator
  const renderSpinner = () => {
    // Use native ActivityIndicator if Lottie fails or is explicitly disabled
    if (lottieError) {
      return (
        <ActivityIndicator
          size={nativeDimensions >= 40 ? 'large' : 'small'}
          color={spinnerColor}
          testID={testID ? `${testID}-native` : undefined}
        />
      );
    }

    // Lottie animation with Android-specific optimizations
    return (
      <LottieView
        source={source || require('../../../assets/lottie/loading.json')}
        autoPlay
        loop
        style={{
          width: lottieDimensions,
          height: lottieDimensions,
        }}
        resizeMode="contain"
        // Android-specific props for better compatibility
        {...(Platform.OS === 'android' && {
          hardwareAccelerationAndroid: true,
          renderMode: 'SOFTWARE' as any, // Fallback to software rendering if hardware fails
        })}
        onAnimationFailure={handleLottieError}
        testID={testID ? `${testID}-lottie` : undefined}
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        { transform: [{ translateY: offsetY }] },
        style,
      ]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={text || 'Loading'}
    >
      {renderSpinner()}
      {text && (
        <Text
          style={[
            styles.text,
            {
              color: currentTheme.colors.textMuted,
              fontSize: textFontSize,
            },
          ]}
        >
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default UnifiedSpinner;
