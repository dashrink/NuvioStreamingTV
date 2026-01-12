/**
 * @fileoverview UnifiedSpinner Component
 *
 * A theme-aware loading spinner component that serves as the primary loading
 * indicator throughout the application. Replaces direct ActivityIndicator usage
 * with a consistent, animated loading experience.
 *
 * @module loading/UnifiedSpinner
 *
 * @see SpinnerLoadingProps - Props interface definition
 * @see LoadingSpinner - Legacy wrapper (deprecated)
 */

import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';

import {
  SpinnerLoadingProps,
  LOADING_SIZE_DIMENSIONS,
  LOTTIE_SIZE_DIMENSIONS,
  LOADING_TEXT_SIZES,
} from './types';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * UnifiedSpinner - A theme-aware loading spinner component
 *
 * Provides a consistent loading indicator across the app, replacing direct
 * ActivityIndicator usage with a polished, animated loading experience.
 *
 * ## Features
 *
 * - **Theme-aware**: Uses `currentTheme.colors.primary` by default
 * - **Three sizes**: small (24px), medium (40px), large (60px)
 * - **Lottie animations**: Smooth animations with ActivityIndicator fallback
 * - **Optional text**: Loading message displayed below spinner
 * - **Android optimized**: Includes platform-specific Lottie configurations
 * - **Accessible**: Proper accessibility role and label
 *
 * ## Size Guide
 *
 * | Size   | Lottie | Native | Use Case                         |
 * |--------|--------|--------|----------------------------------|
 * | small  | 60px   | 24px   | Button loading, inline spinners  |
 * | medium | 100px  | 40px   | Card/section loading (default)   |
 * | large  | 150px  | 60px   | Full-screen, prominent loading   |
 *
 * @component
 * @param {SpinnerLoadingProps} props - Component props
 *
 * @example
 * // Basic usage with default size (medium)
 * import { UnifiedSpinner } from '@/components/loading';
 *
 * function LoadingState() {
 *   return <UnifiedSpinner />;
 * }
 *
 * @example
 * // Full-screen loading with message
 * function ScreenLoading() {
 *   return (
 *     <View style={styles.center}>
 *       <UnifiedSpinner size="large" text="Loading content..." />
 *     </View>
 *   );
 * }
 *
 * @example
 * // Button loading state with white spinner
 * function SubmitButton({ loading, onPress }) {
 *   return (
 *     <TouchableOpacity style={styles.button} onPress={onPress}>
 *       {loading ? (
 *         <UnifiedSpinner size="small" color="#FFFFFF" />
 *       ) : (
 *         <Text style={styles.buttonText}>Submit</Text>
 *       )}
 *     </TouchableOpacity>
 *   );
 * }
 *
 * @example
 * // Custom Lottie animation
 * function BrandedLoading() {
 *   return (
 *     <UnifiedSpinner
 *       source={require('./assets/custom-spinner.json')}
 *       size="large"
 *       text="Please wait..."
 *     />
 *   );
 * }
 *
 * @example
 * // With vertical offset for visual alignment
 * function CenteredLoading() {
 *   return (
 *     <UnifiedSpinner
 *       size="large"
 *       offsetY={-50}
 *       text="Loading..."
 *     />
 *   );
 * }
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
      style={[styles.container, { transform: [{ translateY: offsetY }] }, style]}
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
