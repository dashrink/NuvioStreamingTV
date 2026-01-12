/**
 * TrailerControls Component
 *
 * An overlay component that appears when a trailer is playing, providing:
 * - Mute/unmute toggle button to control trailer audio
 * - Fullscreen button to view trailer in native fullscreen player
 * - AI Chat button (optional) to navigate to AI-powered chat about the content
 *
 * Features:
 * - Platform-specific positioning (Android vs iOS safe area)
 * - Tablet-responsive positioning
 * - Semi-transparent background for visibility over video content
 * - Animated opacity transitions synced with trailer visibility
 *
 * @module HeroSection/components/TrailerControls
 */

import { MaterialIcons, Entypo } from '@expo/vector-icons';
import React, { memo } from 'react';
import { TouchableOpacity, StyleSheet, Platform, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { isTablet, spacing } from '../styles';

import type { TrailerControlsProps } from '../types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Icon sizes for control buttons
 */
const ICON_SIZE = 24;

/**
 * Top offset for controls positioning
 * Accounts for status bar/notch on different platforms
 */
const TOP_OFFSET = Platform.OS === 'android' ? 40 : 50;

/**
 * Button background color with semi-transparency
 */
const BUTTON_BACKGROUND = 'rgba(0, 0, 0, 0.5)';

/**
 * Button border radius for circular appearance
 */
const BUTTON_BORDER_RADIUS = 20;

/**
 * Button padding
 */
const BUTTON_PADDING = 8;

/**
 * Gap between control buttons
 */
const BUTTON_GAP = 8;

// =============================================================================
// Component
// =============================================================================

/**
 * Trailer control overlay with mute, fullscreen, and optional AI chat buttons.
 *
 * This component renders as an absolute-positioned overlay in the top-right
 * corner of the HeroSection, appearing when the trailer is ready and playing.
 *
 * The component accepts an optional animated style prop that should be used
 * to sync the controls visibility with the trailer's opacity transitions.
 *
 * @param props - Component props
 * @param props.isMuted - Current mute state of the trailer
 * @param props.onToggleMute - Callback when mute button is pressed
 * @param props.onFullscreen - Callback when fullscreen button is pressed
 * @param props.onAIChat - Optional callback when AI Chat button is pressed (hides button if not provided)
 * @param props.animatedStyle - Optional animated style for opacity/visibility transitions
 *
 * @example
 * ```tsx
 * // Basic usage with mute and fullscreen
 * <TrailerControls
 *   isMuted={trailerMuted}
 *   onToggleMute={handleToggleMute}
 *   onFullscreen={handleFullscreen}
 *   animatedStyle={{ opacity: trailerOpacity }}
 * />
 *
 * // With AI Chat button enabled
 * <TrailerControls
 *   isMuted={trailerMuted}
 *   onToggleMute={handleToggleMute}
 *   onFullscreen={handleFullscreen}
 *   onAIChat={handleAIChat}
 *   animatedStyle={{ opacity: trailerOpacity }}
 * />
 * ```
 */
const TrailerControls = memo(
  ({ isMuted, onToggleMute, onFullscreen, onAIChat, animatedStyle }: TrailerControlsProps) => {
    /**
     * Prevents touch event propagation to parent elements.
     * Ensures button presses don't trigger underlying touch handlers.
     */
    const handlePressIn = (e: React.BaseSyntheticEvent) => e.stopPropagation();
    const handlePressOut = (e: React.BaseSyntheticEvent) => e.stopPropagation();

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* Fullscreen Button */}
        <TouchableOpacity
          onPress={onFullscreen}
          activeOpacity={0.7}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.controlButton}
          accessibilityRole="button"
          accessibilityLabel="Toggle fullscreen"
          accessibilityHint="Opens trailer in fullscreen mode"
        >
          <MaterialIcons name="fullscreen" size={ICON_SIZE} color="white" />
        </TouchableOpacity>

        {/* Mute/Unmute Button */}
        <TouchableOpacity
          onPress={onToggleMute}
          activeOpacity={0.7}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.controlButton}
          accessibilityRole="button"
          accessibilityLabel={isMuted ? 'Unmute trailer' : 'Mute trailer'}
          accessibilityHint={isMuted ? 'Turns trailer audio on' : 'Turns trailer audio off'}
        >
          <Entypo name={isMuted ? 'sound-mute' : 'sound'} size={ICON_SIZE} color="white" />
        </TouchableOpacity>

        {/* AI Chat Button (optional) */}
        {onAIChat && (
          <TouchableOpacity
            onPress={onAIChat}
            activeOpacity={0.7}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Open AI Chat"
            accessibilityHint="Discuss this content with AI assistant"
          >
            <MaterialIcons name="smart-toy" size={ICON_SIZE} color="white" />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }
);

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  /**
   * Main container positioned in top-right corner.
   * Uses absolute positioning to overlay on trailer content.
   */
  container: {
    position: 'absolute',
    top: TOP_OFFSET,
    right: isTablet ? spacing.contentPadding : 16,
    zIndex: 1000,
    flexDirection: 'row',
    gap: BUTTON_GAP,
  } as ViewStyle,

  /**
   * Individual control button styling.
   * Circular semi-transparent background for visibility over video.
   */
  controlButton: {
    padding: BUTTON_PADDING,
    backgroundColor: BUTTON_BACKGROUND,
    borderRadius: BUTTON_BORDER_RADIUS,
  } as ViewStyle,
});

export default TrailerControls;
