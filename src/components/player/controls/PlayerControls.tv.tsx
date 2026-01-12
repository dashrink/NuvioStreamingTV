/**
 * PlayerControls.tv.tsx
 *
 * TV-specific player controls with full D-pad remote navigation support.
 * Automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - Play/Pause with select button
 * - Seek with left/right D-pad (10 seconds)
 * - Volume with up/down D-pad (where supported)
 * - Back/Menu button exits player
 * - Control overlay shows on any D-pad input
 * - All buttons are D-pad navigable
 * - Focus states with visual feedback
 *
 * @example
 * ```tsx
 * <PlayerControls
 *   showControls={showControls}
 *   fadeAnim={fadeAnim}
 *   paused={paused}
 *   togglePlayback={togglePlayback}
 *   skip={skip}
 *   handleClose={handleClose}
 *   // ... other props
 * />
 * ```
 */

import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { View, Text, Animated, StyleSheet, Platform, Dimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '../../../contexts/ThemeContext';
import { useTVEventHandler, TVRemoteEvent } from '../../../hooks/useTVEventHandler';
import Focusable from '../../common/Focusable';
import { styles as playerStyles } from '../utils/playerStyles';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface PlayerControlsProps {
  showControls: boolean;
  fadeAnim: Animated.Value;
  paused: boolean;
  title: string;
  episodeTitle?: string;
  season?: number;
  episode?: number;
  quality?: string;
  year?: number;
  streamProvider?: string;
  streamName?: string;
  currentTime: number;
  duration: number;
  zoomScale: number;
  currentResizeMode?: string;
  ksAudioTracks: Array<{ id: number; name: string; language?: string }>;
  selectedAudioTrack: number | null;
  availableStreams?: { [providerId: string]: { streams: any[]; addonName: string } };
  togglePlayback: () => void;
  skip: (seconds: number) => void;
  handleClose: () => void;
  cycleAspectRatio: () => void;
  cyclePlaybackSpeed: () => void;
  currentPlaybackSpeed: number;
  setShowAudioModal: (show: boolean) => void;
  setShowSubtitleModal: (show: boolean) => void;
  setShowSpeedModal: (show: boolean) => void;
  isSubtitleModalOpen?: boolean;
  setShowSourcesModal?: (show: boolean) => void;
  setShowEpisodesModal?: (show: boolean) => void;
  // Slider-specific props
  onSliderValueChange: (value: number) => void;
  onSlidingStart: () => void;
  onSlidingComplete: (value: number) => void;
  buffered: number;
  formatTime: (seconds: number) => string;
  playerBackend?: string;
  // AirPlay props
  isAirPlayActive?: boolean;
  allowsAirPlay?: boolean;
  onAirPlayPress?: () => void;
  // TV-specific callbacks
  onShowControls?: () => void;
  onVolumeChange?: (direction: 'up' | 'down') => void;
}

// =============================================================================
// Constants
// =============================================================================

const SEEK_STEP_SECONDS = 10; // Seek step for left/right D-pad
const TV_CONTROL_HIDE_TIMEOUT = 5000; // Auto-hide controls after 5 seconds

// Button focus IDs for spatial navigation
const FOCUS_IDS = {
  PLAY: 'player-play-button',
  SEEK_BACK: 'player-seek-back',
  SEEK_FORWARD: 'player-seek-forward',
  CLOSE: 'player-close-button',
  ASPECT: 'player-aspect-button',
  SUBTITLE: 'player-subtitle-button',
  SOURCES: 'player-sources-button',
  SPEED: 'player-speed-button',
  AUDIO: 'player-audio-button',
  EPISODES: 'player-episodes-button',
  AIRPLAY: 'player-airplay-button',
} as const;

// =============================================================================
// Component Implementation
// =============================================================================

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  showControls,
  fadeAnim,
  paused,
  title,
  episodeTitle,
  season,
  episode,
  quality,
  year,
  streamProvider,
  streamName,
  currentTime,
  duration,
  zoomScale,
  currentResizeMode,
  ksAudioTracks,
  selectedAudioTrack,
  availableStreams,
  togglePlayback,
  skip,
  handleClose,
  cycleAspectRatio,
  cyclePlaybackSpeed,
  currentPlaybackSpeed,
  setShowAudioModal,
  setShowSubtitleModal,
  setShowSpeedModal,
  isSubtitleModalOpen,
  setShowSourcesModal,
  setShowEpisodesModal,
  onSliderValueChange,
  onSlidingStart,
  onSlidingComplete,
  buffered,
  formatTime,
  playerBackend,
  isAirPlayActive,
  allowsAirPlay,
  onAirPlayPress,
  onShowControls,
  onVolumeChange,
}) => {
  const { currentTheme } = useTheme();

  // Refs for tracking state
  const lastEventTimeRef = useRef<number>(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track which button is focused for visual feedback
  const [focusedButtonId, setFocusedButtonId] = useState<string | null>(null);

  // =============================================================================
  // Responsive Sizing
  // =============================================================================

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // TV-optimized button sizes (larger for remote navigation)
  const buttonSpacing = screenWidth * 0.08;
  const playButtonSize = Math.min(screenWidth * 0.08, 80);
  const playIconSize = playButtonSize * 0.6;
  const seekButtonSize = Math.min(screenWidth * 0.06, 60);
  const seekIconSize = seekButtonSize * 0.7;
  const seekNumberSize = seekButtonSize * 0.3;
  const arcBorderWidth = seekButtonSize * 0.05;

  // Device type detection
  const deviceWidth = Dimensions.get('window').width;
  const BREAKPOINTS = { phone: 0, tablet: 768, largeTablet: 1024, tv: 1440 } as const;
  const getDeviceType = (w: number) => {
    if (w >= BREAKPOINTS.tv) return 'tv';
    if (w >= BREAKPOINTS.largeTablet) return 'largeTablet';
    if (w >= BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
  };
  const deviceType = getDeviceType(deviceWidth);
  const isTV = deviceType === 'tv' || Platform.isTV;
  const isLargeTablet = deviceType === 'largeTablet';
  const isTablet = deviceType === 'tablet';

  // Adjusted sizes for TV
  const closeIconSize = isTV ? 28 : isLargeTablet ? 24 : isTablet ? 22 : 20;
  const bottomButtonSize = isTV ? 28 : isLargeTablet ? 26 : isTablet ? 24 : 24;

  // =============================================================================
  // Animations
  // =============================================================================

  const [showBackwardSign, setShowBackwardSign] = useState(false);
  const [showForwardSign, setShowForwardSign] = useState(false);

  const backwardPressAnim = useRef(new Animated.Value(0)).current;
  const backwardSlideAnim = useRef(new Animated.Value(0)).current;
  const backwardScaleAnim = useRef(new Animated.Value(1)).current;
  const backwardArcOpacity = useRef(new Animated.Value(0)).current;
  const backwardArcRotation = useRef(new Animated.Value(0)).current;

  const forwardPressAnim = useRef(new Animated.Value(0)).current;
  const forwardSlideAnim = useRef(new Animated.Value(0)).current;
  const forwardScaleAnim = useRef(new Animated.Value(1)).current;
  const forwardArcOpacity = useRef(new Animated.Value(0)).current;
  const forwardArcRotation = useRef(new Animated.Value(0)).current;

  const playPressAnim = useRef(new Animated.Value(0)).current;
  const playIconScale = useRef(new Animated.Value(1)).current;
  const playIconOpacity = useRef(new Animated.Value(1)).current;

  // =============================================================================
  // Animation Handlers
  // =============================================================================

  const handleSeekWithAnimation = useCallback(
    (seconds: number) => {
      const isForward = seconds > 0;

      if (isForward) {
        setShowForwardSign(true);
      } else {
        setShowBackwardSign(true);
      }

      const pressAnim = isForward ? forwardPressAnim : backwardPressAnim;
      const slideAnim = isForward ? forwardSlideAnim : backwardSlideAnim;
      const scaleAnim = isForward ? forwardScaleAnim : backwardScaleAnim;
      const arcOpacity = isForward ? forwardArcOpacity : backwardArcOpacity;
      const arcRotation = isForward ? forwardArcRotation : backwardArcRotation;

      Animated.parallel([
        Animated.sequence([
          Animated.timing(pressAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(pressAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(slideAnim, {
            toValue: isForward ? seekButtonSize * 0.75 : -seekButtonSize * 0.75,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(arcOpacity, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(arcRotation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (isForward) {
          setShowForwardSign(false);
        } else {
          setShowBackwardSign(false);
        }
        arcOpacity.setValue(0);
        arcRotation.setValue(0);
      });

      skip(seconds);
    },
    [
      skip,
      seekButtonSize,
      backwardPressAnim,
      backwardSlideAnim,
      backwardScaleAnim,
      backwardArcOpacity,
      backwardArcRotation,
      forwardPressAnim,
      forwardSlideAnim,
      forwardScaleAnim,
      forwardArcOpacity,
      forwardArcRotation,
    ]
  );

  const handlePlayPauseWithAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(playPressAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(playPressAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(playIconScale, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(playIconScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    togglePlayback();
  }, [togglePlayback, playPressAnim, playIconScale]);

  // =============================================================================
  // TV Remote Event Handler
  // =============================================================================

  const handleTVEvent = useCallback(
    (event: TVRemoteEvent) => {
      // Debounce rapid events
      const now = Date.now();
      if (now - lastEventTimeRef.current < 100) {
        return;
      }
      lastEventTimeRef.current = now;

      // Show controls on any D-pad input
      if (['up', 'down', 'left', 'right', 'select', 'playPause'].includes(event.eventType)) {
        onShowControls?.();
      }

      switch (event.eventType) {
        case 'select':
          // Toggle play/pause on select button
          handlePlayPauseWithAnimation();
          break;

        case 'playPause':
          // Toggle play/pause on dedicated play/pause button
          handlePlayPauseWithAnimation();
          break;

        case 'left':
          // Seek backward 10 seconds when controls are visible
          // Otherwise this is handled by focus navigation
          if (!showControls) {
            onShowControls?.();
          }
          // If no button is focused, seek backward
          if (!focusedButtonId) {
            handleSeekWithAnimation(-SEEK_STEP_SECONDS);
          }
          break;

        case 'right':
          // Seek forward 10 seconds when controls are visible
          // Otherwise this is handled by focus navigation
          if (!showControls) {
            onShowControls?.();
          }
          // If no button is focused, seek forward
          if (!focusedButtonId) {
            handleSeekWithAnimation(SEEK_STEP_SECONDS);
          }
          break;

        case 'up':
          // Volume up (if supported) or show controls
          if (onVolumeChange) {
            onVolumeChange('up');
          }
          break;

        case 'down':
          // Volume down (if supported) or show controls
          if (onVolumeChange) {
            onVolumeChange('down');
          }
          break;

        case 'menu':
          // Exit player on menu/back button
          handleClose();
          break;

        default:
          break;
      }
    },
    [
      handlePlayPauseWithAnimation,
      handleSeekWithAnimation,
      handleClose,
      onShowControls,
      onVolumeChange,
      showControls,
      focusedButtonId,
    ]
  );

  // Register TV event handler
  useTVEventHandler(handleTVEvent, { enabled: true });

  // =============================================================================
  // Focus Handlers
  // =============================================================================

  const handleButtonFocus = useCallback((buttonId: string) => {
    setFocusedButtonId(buttonId);
  }, []);

  const handleButtonBlur = useCallback(() => {
    setFocusedButtonId(null);
  }, []);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 20 }]}
      pointerEvents={showControls ? 'box-none' : 'none'}
    >
      {/* Progress slider */}
      <View style={playerStyles.sliderContainer}>
        <Slider
          style={{
            width: '100%',
            height: 40,
            marginHorizontal: 0,
          }}
          minimumValue={0}
          maximumValue={duration || 1}
          value={currentTime}
          onValueChange={onSliderValueChange}
          onSlidingStart={onSlidingStart}
          onSlidingComplete={onSlidingComplete}
          minimumTrackTintColor={currentTheme.colors.primary}
          maximumTrackTintColor={currentTheme.colors.mediumEmphasis}
          thumbTintColor={Platform.OS === 'android' ? currentTheme.colors.white : undefined}
          tapToSeek={Platform.OS === 'ios'}
        />
        <View style={[playerStyles.timeDisplay, { paddingHorizontal: 14 }]}>
          <View style={playerStyles.timeContainer}>
            <Text style={playerStyles.duration}>{formatTime(currentTime)}</Text>
          </View>
          <View style={playerStyles.timeContainer}>
            <Text style={playerStyles.duration}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      {/* Controls Overlay */}
      <View style={playerStyles.controlsContainer}>
        {/* Top Gradient & Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={playerStyles.topGradient}
        >
          <View style={playerStyles.header}>
            {/* Title Section */}
            <View style={playerStyles.titleSection}>
              <Text style={playerStyles.title}>{title}</Text>
              {season && episode && (
                <Text style={playerStyles.episodeInfo}>
                  S{season}E{episode} {episodeTitle && `- ${episodeTitle}`}
                </Text>
              )}
              <View style={playerStyles.metadataRow}>
                {year && <Text style={playerStyles.metadataText}>{year}</Text>}
                {streamName && <Text style={playerStyles.providerText}>via {streamName}</Text>}
              </View>
              {playerBackend && (
                <View style={playerStyles.metadataRow}>
                  <Text style={[playerStyles.providerText, { fontSize: 11, opacity: 0.9 }]}>
                    {playerBackend}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* AirPlay Button - iOS only */}
              {Platform.OS === 'ios' && onAirPlayPress && playerBackend === 'KSAVPlayer' && (
                <Focusable
                  focusId={FOCUS_IDS.AIRPLAY}
                  onPress={onAirPlayPress}
                  onFocus={() => handleButtonFocus(FOCUS_IDS.AIRPLAY)}
                  onBlur={handleButtonBlur}
                  style={styles.iconButtonWrapper}
                  animationConfig={{
                    focusScale: 1.15,
                    focusBorderColor: currentTheme.colors.primary,
                    focusBorderWidth: 2,
                  }}
                >
                  <Feather
                    name="airplay"
                    size={closeIconSize}
                    color={isAirPlayActive ? currentTheme.colors.primary : 'white'}
                  />
                </Focusable>
              )}

              {/* Close Button */}
              <Focusable
                focusId={FOCUS_IDS.CLOSE}
                onPress={handleClose}
                onFocus={() => handleButtonFocus(FOCUS_IDS.CLOSE)}
                onBlur={handleButtonBlur}
                style={styles.iconButtonWrapper}
                animationConfig={{
                  focusScale: 1.15,
                  focusBorderColor: currentTheme.colors.primary,
                  focusBorderWidth: 2,
                }}
                accessibilityLabel="Close player"
                accessibilityHint="Press to exit the video player"
              >
                <Ionicons name="close" size={closeIconSize} color="white" />
              </Focusable>
            </View>
          </View>
        </LinearGradient>

        {/* Center Controls - Play/Pause and Seek */}
        <View
          style={[playerStyles.controls, { transform: [{ translateY: -(playButtonSize / 2) }] }]}
        >
          {/* Backward Seek Button (-10s) */}
          <Focusable
            focusId={FOCUS_IDS.SEEK_BACK}
            onPress={() => handleSeekWithAnimation(-SEEK_STEP_SECONDS)}
            onFocus={() => handleButtonFocus(FOCUS_IDS.SEEK_BACK)}
            onBlur={handleButtonBlur}
            style={styles.seekButtonWrapper}
            animationConfig={{
              focusScale: 1.2,
              focusBorderColor: currentTheme.colors.primary,
              focusBorderWidth: 3,
            }}
            accessibilityLabel="Seek backward 10 seconds"
          >
            <Animated.View
              style={[
                playerStyles.seekButtonContainer,
                {
                  width: seekButtonSize,
                  height: seekButtonSize,
                  transform: [{ scale: backwardScaleAnim }],
                },
              ]}
            >
              <Ionicons
                name="reload-outline"
                size={seekIconSize}
                color="white"
                style={{ transform: [{ scaleX: -1 }] }}
              />
              <Animated.View
                style={[
                  playerStyles.buttonCircle,
                  {
                    opacity: backwardPressAnim,
                    width: seekButtonSize * 0.6,
                    height: seekButtonSize * 0.6,
                    borderRadius: (seekButtonSize * 0.6) / 2,
                  },
                ]}
              />
              <View
                style={[
                  playerStyles.seekNumberContainer,
                  { width: seekButtonSize, height: seekButtonSize },
                ]}
              >
                <Animated.Text
                  style={[
                    playerStyles.seekNumber,
                    {
                      fontSize: seekNumberSize,
                      marginLeft: 7,
                      transform: [{ translateX: backwardSlideAnim }],
                    },
                  ]}
                >
                  {showBackwardSign ? '-10' : '10'}
                </Animated.Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[
                playerStyles.arcContainer,
                {
                  width: seekButtonSize,
                  height: seekButtonSize,
                  opacity: backwardArcOpacity,
                  transform: [
                    {
                      rotate: backwardArcRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['90deg', '-90deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  playerStyles.arcLeft,
                  {
                    width: seekButtonSize,
                    height: seekButtonSize,
                    borderRadius: seekButtonSize / 2,
                    borderWidth: arcBorderWidth,
                  },
                ]}
              />
            </Animated.View>
          </Focusable>

          {/* Play/Pause Button */}
          <Focusable
            focusId={FOCUS_IDS.PLAY}
            onPress={handlePlayPauseWithAnimation}
            onFocus={() => handleButtonFocus(FOCUS_IDS.PLAY)}
            onBlur={handleButtonBlur}
            hasTVPreferredFocus={true}
            style={[styles.playButtonWrapper, { marginHorizontal: buttonSpacing }]}
            animationConfig={{
              focusScale: 1.15,
              focusBorderColor: currentTheme.colors.primary,
              focusBorderWidth: 3,
            }}
            accessibilityLabel={paused ? 'Play' : 'Pause'}
            accessibilityHint={paused ? 'Press to play video' : 'Press to pause video'}
          >
            <View
              style={[
                playerStyles.playButtonCircle,
                { width: playButtonSize, height: playButtonSize },
              ]}
            >
              <Animated.View
                style={[
                  playerStyles.playPressCircle,
                  {
                    opacity: playPressAnim,
                    width: playButtonSize * 0.85,
                    height: playButtonSize * 0.85,
                    borderRadius: (playButtonSize * 0.85) / 2,
                  },
                ]}
              />
              <Animated.View
                style={{
                  transform: [{ scale: playIconScale }],
                  opacity: playIconOpacity,
                }}
              >
                <Ionicons name={paused ? 'play' : 'pause'} size={playIconSize} color="#FFFFFF" />
              </Animated.View>
            </View>
          </Focusable>

          {/* Forward Seek Button (+10s) */}
          <Focusable
            focusId={FOCUS_IDS.SEEK_FORWARD}
            onPress={() => handleSeekWithAnimation(SEEK_STEP_SECONDS)}
            onFocus={() => handleButtonFocus(FOCUS_IDS.SEEK_FORWARD)}
            onBlur={handleButtonBlur}
            style={styles.seekButtonWrapper}
            animationConfig={{
              focusScale: 1.2,
              focusBorderColor: currentTheme.colors.primary,
              focusBorderWidth: 3,
            }}
            accessibilityLabel="Seek forward 10 seconds"
          >
            <Animated.View
              style={[
                playerStyles.seekButtonContainer,
                {
                  width: seekButtonSize,
                  height: seekButtonSize,
                  transform: [{ scale: forwardScaleAnim }],
                },
              ]}
            >
              <Ionicons name="reload-outline" size={seekIconSize} color="white" />
              <Animated.View
                style={[
                  playerStyles.buttonCircle,
                  {
                    opacity: forwardPressAnim,
                    width: seekButtonSize * 0.6,
                    height: seekButtonSize * 0.6,
                    borderRadius: (seekButtonSize * 0.6) / 2,
                  },
                ]}
              />
              <View
                style={[
                  playerStyles.seekNumberContainer,
                  { width: seekButtonSize, height: seekButtonSize },
                ]}
              >
                <Animated.Text
                  style={[
                    playerStyles.seekNumber,
                    {
                      fontSize: seekNumberSize,
                      transform: [{ translateX: forwardSlideAnim }],
                    },
                  ]}
                >
                  {showForwardSign ? '+10' : '10'}
                </Animated.Text>
              </View>
              <Animated.View
                style={[
                  playerStyles.arcContainer,
                  {
                    width: seekButtonSize,
                    height: seekButtonSize,
                    opacity: forwardArcOpacity,
                    transform: [
                      {
                        rotate: forwardArcRotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-90deg', '90deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    playerStyles.arcRight,
                    {
                      width: seekButtonSize,
                      height: seekButtonSize,
                      borderRadius: seekButtonSize / 2,
                      borderWidth: arcBorderWidth,
                    },
                  ]}
                />
              </Animated.View>
            </Animated.View>
          </Focusable>
        </View>

        {/* Bottom Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={playerStyles.bottomGradient}
          pointerEvents="box-none"
        >
          <View style={playerStyles.bottomControls} pointerEvents="box-none">
            {/* Center Buttons Container */}
            <View style={playerStyles.centerControlsContainer} pointerEvents="box-none">
              {/* Aspect Ratio Button */}
              <Focusable
                focusId={FOCUS_IDS.ASPECT}
                onPress={cycleAspectRatio}
                onFocus={() => handleButtonFocus(FOCUS_IDS.ASPECT)}
                onBlur={handleButtonBlur}
                style={styles.bottomButtonWrapper}
                animationConfig={{
                  focusScale: 1.2,
                  focusBorderColor: currentTheme.colors.primary,
                  focusBorderWidth: 2,
                }}
                accessibilityLabel="Change aspect ratio"
              >
                <Ionicons name="expand-outline" size={bottomButtonSize} color="white" />
              </Focusable>

              {/* Subtitle Button */}
              <Focusable
                focusId={FOCUS_IDS.SUBTITLE}
                onPress={() => setShowSubtitleModal(!isSubtitleModalOpen)}
                onFocus={() => handleButtonFocus(FOCUS_IDS.SUBTITLE)}
                onBlur={handleButtonBlur}
                style={styles.bottomButtonWrapper}
                animationConfig={{
                  focusScale: 1.2,
                  focusBorderColor: currentTheme.colors.primary,
                  focusBorderWidth: 2,
                }}
                accessibilityLabel="Subtitles"
              >
                <Ionicons name="text" size={bottomButtonSize} color="white" />
              </Focusable>

              {/* Change Source Button */}
              {setShowSourcesModal && (
                <Focusable
                  focusId={FOCUS_IDS.SOURCES}
                  onPress={() => setShowSourcesModal(true)}
                  onFocus={() => handleButtonFocus(FOCUS_IDS.SOURCES)}
                  onBlur={handleButtonBlur}
                  style={styles.bottomButtonWrapper}
                  animationConfig={{
                    focusScale: 1.2,
                    focusBorderColor: currentTheme.colors.primary,
                    focusBorderWidth: 2,
                  }}
                  accessibilityLabel="Change source"
                >
                  <Ionicons name="cloud-outline" size={bottomButtonSize} color="white" />
                </Focusable>
              )}

              {/* Playback Speed Button */}
              <Focusable
                focusId={FOCUS_IDS.SPEED}
                onPress={() => setShowSpeedModal(true)}
                onFocus={() => handleButtonFocus(FOCUS_IDS.SPEED)}
                onBlur={handleButtonBlur}
                style={styles.bottomButtonWrapper}
                animationConfig={{
                  focusScale: 1.2,
                  focusBorderColor: currentTheme.colors.primary,
                  focusBorderWidth: 2,
                }}
                accessibilityLabel="Playback speed"
              >
                <Ionicons name="speedometer-outline" size={bottomButtonSize} color="white" />
              </Focusable>

              {/* Audio Button */}
              <Focusable
                focusId={FOCUS_IDS.AUDIO}
                onPress={() => setShowAudioModal(true)}
                onFocus={() => handleButtonFocus(FOCUS_IDS.AUDIO)}
                onBlur={handleButtonBlur}
                disabled={ksAudioTracks.length <= 1}
                style={styles.bottomButtonWrapper}
                animationConfig={{
                  focusScale: 1.2,
                  focusBorderColor: currentTheme.colors.primary,
                  focusBorderWidth: 2,
                }}
                accessibilityLabel="Audio tracks"
              >
                <Ionicons
                  name="musical-notes-outline"
                  size={bottomButtonSize}
                  color={ksAudioTracks.length <= 1 ? 'grey' : 'white'}
                />
              </Focusable>

              {/* Episodes Button */}
              {setShowEpisodesModal && (
                <Focusable
                  focusId={FOCUS_IDS.EPISODES}
                  onPress={() => setShowEpisodesModal(true)}
                  onFocus={() => handleButtonFocus(FOCUS_IDS.EPISODES)}
                  onBlur={handleButtonBlur}
                  style={styles.bottomButtonWrapper}
                  animationConfig={{
                    focusScale: 1.2,
                    focusBorderColor: currentTheme.colors.primary,
                    focusBorderWidth: 2,
                  }}
                  accessibilityLabel="Episodes"
                >
                  <Ionicons name="list" size={bottomButtonSize} color="white" />
                </Focusable>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* TV Navigation Hints */}
      {Platform.isTV && showControls && (
        <View style={styles.tvHintsContainer}>
          <View style={styles.tvHint}>
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.tvHintText}>-10s</Text>
          </View>
          <View style={styles.tvHint}>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.tvHintText}>+10s</Text>
          </View>
          {onVolumeChange && (
            <>
              <View style={styles.tvHint}>
                <Ionicons name="arrow-up" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.tvHintText}>Vol+</Text>
              </View>
              <View style={styles.tvHint}>
                <Ionicons name="arrow-down" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.tvHintText}>Vol-</Text>
              </View>
            </>
          )}
        </View>
      )}
    </Animated.View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  iconButtonWrapper: {
    padding: 8,
    borderRadius: 8,
  },
  playButtonWrapper: {
    borderRadius: 50,
  },
  seekButtonWrapper: {
    borderRadius: 50,
  },
  bottomButtonWrapper: {
    padding: 12,
    borderRadius: 8,
  },
  tvHintsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    opacity: 0.8,
  },
  tvHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tvHintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default PlayerControls;
