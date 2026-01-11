/**
 * HeroBackButton Component
 *
 * The back navigation button that appears in the top-left corner of the HeroSection.
 * Features shadow styling for visibility over media content and platform-specific positioning.
 *
 * @module HeroSection/components/HeroBackButton
 */

import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

import type { HeroBackButtonProps } from '../types';
import { shadowStyles, spacing } from '../styles';

/**
 * Back button component for navigating away from the hero section.
 *
 * Renders a back arrow icon with shadow styling for visibility over
 * backdrop images and video content. Positioned absolutely in the
 * top-left corner with platform-specific offsets.
 *
 * @param props - Component props
 * @param props.onPress - Callback function triggered when the button is pressed
 * @param props.animatedStyle - Optional animated style for scroll-based animations
 *
 * @example
 * ```tsx
 * <HeroBackButton
 *   onPress={() => navigation.goBack()}
 *   animatedStyle={backButtonAnimatedStyle}
 * />
 * ```
 */
const HeroBackButton = memo(function HeroBackButton({
  onPress,
  animatedStyle,
}: HeroBackButtonProps) {
  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Navigate to the previous screen"
      >
        <MaterialIcons
          name="arrow-back"
          size={28}
          color="#fff"
          style={styles.icon}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  /**
   * Container positioned absolutely in the top-left corner.
   * Platform-specific top offset accounts for status bar differences.
   */
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 50,
    left: spacing.backButtonLeft,
    zIndex: 10,
  },

  /**
   * Touchable button with padding for larger hit area
   */
  button: {
    padding: 8,
  },

  /**
   * Icon with shadow styling for visibility over media
   */
  icon: {
    ...shadowStyles.iconShadow,
  },
});

export default HeroBackButton;
