import React, { useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform, Dimensions } from 'react-native';
import Focusable from '../../common/Focusable';
import { Ionicons } from '@expo/vector-icons';
import Feather from 'react-native-vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { styles } from '../utils/playerStyles'; // Updated styles
import { getTrackDisplayName } from '../utils/playerUtils';
import { useTheme } from '../../../contexts/ThemeContext';
import { triggerLight, triggerMedium } from '../../../hooks/useHaptics';

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
  ksAudioTracks: Array<{ id: number, name: string, language?: string }>;
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
  // MPV Switch (Android only)
  onSwitchToMPV?: () => void;
  useExoPlayer?: boolean;
}

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
  onSwitchToMPV,
  useExoPlayer,
}) => {
  const { currentTheme } = useTheme();


  /* Responsive Spacing */
  const screenWidth = Dimensions.get('window').width;
  const buttonSpacing = screenWidth * 0.10; // Reduced from 15% to 10%

  const playButtonSize = screenWidth * 0.08; // 8% of screen width (reduced from 12%)
  const playIconSizeCalculated = playButtonSize * 0.6; // 60% of button size
  const seekButtonSize = screenWidth * 0.07; // 7% of screen width (reduced from 11%)
  const seekIconSize = seekButtonSize * 0.75; // 75% of button size
  const seekNumberSize = seekButtonSize * 0.25; // 25% of button size
  const arcBorderWidth = seekButtonSize * 0.05; // 5% of button size

  /* Animations - State & Refs */
  const [showBackwardSign, setShowBackwardSign] = React.useState(false);
  const [showForwardSign, setShowForwardSign] = React.useState(false);

  /* Separate Animations for Each Button */
  const backwardPressAnim = React.useRef(new Animated.Value(0)).current;
  const backwardSlideAnim = React.useRef(new Animated.Value(0)).current;
  const backwardScaleAnim = React.useRef(new Animated.Value(1)).current;
  const backwardArcOpacity = React.useRef(new Animated.Value(0)).current;
  const backwardArcRotation = React.useRef(new Animated.Value(0)).current;

  const forwardPressAnim = React.useRef(new Animated.Value(0)).current;
  const forwardSlideAnim = React.useRef(new Animated.Value(0)).current;
  const forwardScaleAnim = React.useRef(new Animated.Value(1)).current;
  const forwardArcOpacity = React.useRef(new Animated.Value(0)).current;
  const forwardArcRotation = React.useRef(new Animated.Value(0)).current;

  const playPressAnim = React.useRef(new Animated.Value(0)).current;
  const playIconScale = React.useRef(new Animated.Value(1)).current;
  const playIconOpacity = React.useRef(new Animated.Value(1)).current;

  /* TV Navigation Refs - for D-pad focus navigation */
  const closeButtonRef = useRef<any>(null);
  const backwardSeekRef = useRef<any>(null);
  const playPauseRef = useRef<any>(null);
  const forwardSeekRef = useRef<any>(null);
  const aspectRatioRef = useRef<any>(null);
  const subtitleRef = useRef<any>(null);
  const sourcesRef = useRef<any>(null);
  const speedRef = useRef<any>(null);
  const audioRef = useRef<any>(null);
  const episodesRef = useRef<any>(null);
  const airplayRef = useRef<any>(null);

  /* Handle Seek with Animation */
  const handleSeekWithAnimation = (seconds: number) => {
    triggerLight(); // Haptic feedback for skip buttons
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
      // Button press effect (circle flash)
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
      // Number slide out
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: isForward ? (seekButtonSize * 0.75) : -(seekButtonSize * 0.75),
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      // Button scale pulse
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
      // Arc sweep animation
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
  };

  /* Handle Play/Pause with Animation */
  const handlePlayPauseWithAnimation = () => {
    triggerMedium(); // Haptic feedback for play/pause (important action)
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
  };




  const deviceWidth = Dimensions.get('window').width;
  const BREAKPOINTS = { phone: 0, tablet: 768, largeTablet: 1024, tv: 1440 } as const;
  const getDeviceType = (w: number) => {
    if (w >= BREAKPOINTS.tv) return 'tv';
    if (w >= BREAKPOINTS.largeTablet) return 'largeTablet';
    if (w >= BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
  };
  const deviceType = getDeviceType(deviceWidth);
  const isTablet = deviceType === 'tablet';
  const isLargeTablet = deviceType === 'largeTablet';
  const isTV = deviceType === 'tv';

  const closeIconSize = isTV ? 24 : isLargeTablet ? 22 : isTablet ? 20 : 20;
  const skipIconSize = isTV ? 24 : isLargeTablet ? 22 : isTablet ? 20 : 20;
  const playIconSize = isTV ? 48 : isLargeTablet ? 40 : isTablet ? 36 : 32;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 20 }]}
      pointerEvents={showControls ? 'box-none' : 'none'}
    >
      {/* Progress slider with native iOS slider */}
      <View style={styles.sliderContainer}>
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
        <View style={[styles.timeDisplay, { paddingHorizontal: 14 }]}>
          <View style={styles.timeContainer}>
            <Text style={styles.duration}>{formatTime(currentTime)}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.duration}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      {/* Controls Overlay */}
      <View style={styles.controlsContainer}>
        {/* Top Gradient & Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.topGradient}
        >
          <View style={styles.header}>
            {/* Title Section - Enhanced with metadata */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{title}</Text>
              {/* Show season and episode for series */}
              {season && episode && (
                <Text style={styles.episodeInfo}>
                  S{season}E{episode} {episodeTitle && `• ${episodeTitle}`}
                </Text>
              )}
              {/* Show year and provider (quality chip removed) */}
              <View style={styles.metadataRow}>
                {year && <Text style={styles.metadataText}>{year}</Text>}
                {streamName && <Text style={styles.providerText}>via {streamName}</Text>}
              </View>
              {playerBackend && (
                <View style={styles.metadataRow}>
                  <Text style={[styles.providerText, { fontSize: 11, opacity: 0.9 }]}>{playerBackend}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* AirPlay Button - iOS only, KSAVPlayer only */}
              {Platform.OS === 'ios' && onAirPlayPress && playerBackend === 'KSAVPlayer' && (
                <Focusable
                  ref={airplayRef}
                  style={{ padding: 8 }}
                  onPress={() => {
                    triggerLight();
                    onAirPlayPress();
                  }}
                  nextFocusDown={playPauseRef}
                  nextFocusLeft={closeButtonRef}
                >
                  <Feather
                    name="airplay"
                    size={closeIconSize}
                    color={isAirPlayActive ? currentTheme.colors.primary : "white"}
                  />
                </Focusable>
              )}
              {/* Switch to MPV Button - Android only, when using ExoPlayer */}
              {Platform.OS === 'android' && onSwitchToMPV && useExoPlayer && (
                <Focusable
                  style={{ padding: 8 }}
                  onPress={() => {
                    triggerLight();
                    onSwitchToMPV();
                  }}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={closeIconSize}
                    color="white"
                  />
                </Focusable>
              )}
              <Focusable
                ref={closeButtonRef}
                style={styles.closeButton}
                onPress={() => {
                  triggerLight();
                  handleClose();
                }}
                nextFocusDown={playPauseRef}
                nextFocusRight={airplayRef}
              >
                <Ionicons name="close" size={closeIconSize} color="white" />
              </Focusable>
            </View>
          </View>
        </LinearGradient>


        {/* Center Controls - CloudStream Style */}
        <View style={[styles.controls, {
          transform: [{ translateY: -(playButtonSize / 2) }]
        }]}>

          {/* Backward Seek Button (-10s) */}
          <Focusable
            ref={backwardSeekRef}
            onPress={() => handleSeekWithAnimation(-10)}
            nextFocusUp={closeButtonRef}
            nextFocusDown={aspectRatioRef}
            nextFocusRight={playPauseRef}
          >
            <Animated.View style={[
              styles.seekButtonContainer,
              {
                width: seekButtonSize,
                height: seekButtonSize,
                transform: [{ scale: backwardScaleAnim }]
              }
            ]}>
              <Ionicons
                name="reload-outline"
                size={seekIconSize}
                color="white"
                style={{ transform: [{ scaleX: -1 }] }}
              />
              <Animated.View style={[
                styles.buttonCircle,
                {
                  opacity: backwardPressAnim,
                  width: seekButtonSize * 0.6,
                  height: seekButtonSize * 0.6,
                  borderRadius: (seekButtonSize * 0.6) / 2,
                }
              ]} />
              <View style={[styles.seekNumberContainer, {
                width: seekButtonSize,
                height: seekButtonSize,
              }]}>
                <Animated.Text style={[
                  styles.seekNumber,
                  {
                    fontSize: seekNumberSize,
                    marginLeft: 7,
                    transform: [{ translateX: backwardSlideAnim }]
                  }
                ]}>
                  {showBackwardSign ? '-10' : '10'}
                </Animated.Text>
              </View>
            </Animated.View>
            <Animated.View style={[
              styles.arcContainer,
              {
                width: seekButtonSize,
                height: seekButtonSize,
                opacity: backwardArcOpacity,
                transform: [{
                  rotate: backwardArcRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['90deg', '-90deg']
                  })
                }]
              }
            ]}>
              <View style={[
                styles.arcLeft,
                {
                  width: seekButtonSize,
                  height: seekButtonSize,
                  borderRadius: seekButtonSize / 2,
                  borderWidth: arcBorderWidth,
                }
              ]} />
            </Animated.View>
          </Focusable>

          {/* Play/Pause Button */}
          <Focusable
            ref={playPauseRef}
            onPress={handlePlayPauseWithAnimation}
            style={{ marginHorizontal: buttonSpacing }}
            nextFocusUp={closeButtonRef}
            nextFocusLeft={backwardSeekRef}
            nextFocusRight={forwardSeekRef}
            nextFocusDown={speedRef}
          >
            <View style={[styles.playButtonCircle, { width: playButtonSize, height: playButtonSize }]}>
              <Animated.View style={[
                styles.playPressCircle,
                {
                  opacity: playPressAnim,
                  width: playButtonSize * 0.5,
                  height: playButtonSize * 0.5,
                  borderRadius: (playButtonSize * 0.5) / 2,
                }
              ]} />
              <Animated.View style={[
                {
                  transform: [{ scale: playIconScale }],
                  opacity: playIconOpacity,
                }
              ]}>
                <Ionicons
                  name={paused ? 'play' : 'pause'}
                  size={playIconSize}
                  color="white"
                />
              </Animated.View>
            </View>
          </Focusable>

          {/* Forward Seek Button (+10s) */}
          <Focusable
            ref={forwardSeekRef}
            onPress={() => handleSeekWithAnimation(10)}
            nextFocusUp={closeButtonRef}
            nextFocusDown={audioRef}
            nextFocusLeft={playPauseRef}
          >
            <Animated.View style={[
              styles.seekButtonContainer,
              {
                width: seekButtonSize,
                height: seekButtonSize,
                transform: [{ scale: forwardScaleAnim }]
              }
            ]}>
              <Ionicons
                name="reload-outline"
                size={seekIconSize}
                color="white"
              />
              <Animated.View style={[
                styles.buttonCircle,
                {
                  opacity: forwardPressAnim,
                  width: seekButtonSize * 0.6,
                  height: seekButtonSize * 0.6,
                  borderRadius: (seekButtonSize * 0.6) / 2,
                }
              ]} />
              <View style={[styles.seekNumberContainer, {
                width: seekButtonSize,
                height: seekButtonSize,
              }]}>
                <Animated.Text style={[
                  styles.seekNumber,
                  {
                    fontSize: seekNumberSize,
                    marginLeft: 7,
                    transform: [{ translateX: forwardSlideAnim }]
                  }
                ]}>
                  {showForwardSign ? '+10' : '10'}
                </Animated.Text>
              </View>
            </Animated.View>
            <Animated.View style={[
              styles.arcContainer,
              {
                width: seekButtonSize,
                height: seekButtonSize,
                opacity: forwardArcOpacity,
                transform: [{
                  rotate: forwardArcRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-90deg', '90deg']
                  })
                }]
              }
            ]}>
              <View style={[
                styles.arcRight,
                {
                  width: seekButtonSize,
                  height: seekButtonSize,
                  borderRadius: seekButtonSize / 2,
                  borderWidth: arcBorderWidth,
                }
              ]} />
            </Animated.View>
          </Focusable>
        </View>

        {/* Bottom Controls - Row 1 */}
        <View style={styles.bottomControlsRow}>
          {/* Aspect Ratio Button */}
          <Focusable
            ref={aspectRatioRef}
            onPress={() => {
              triggerLight();
              cycleAspectRatio();
            }}
            nextFocusUp={playPauseRef}
            nextFocusRight={subtitleRef}
          >
            <View style={[styles.controlButton]}>
              <Ionicons name="scan" size={skipIconSize} color="white" />
            </View>
          </Focusable>

          {/* Subtitle Button */}
          <Focusable
            ref={subtitleRef}
            onPress={() => {
              triggerLight();
              setShowSubtitleModal(!isSubtitleModalOpen);
            }}
            nextFocusUp={playPauseRef}
            nextFocusLeft={aspectRatioRef}
            nextFocusRight={sourcesRef}
          >
            <View style={[styles.controlButton]}>
              <Ionicons name="close-circle" size={skipIconSize} color="white" />
            </View>
          </Focusable>

          {/* Sources Button */}
          {setShowSourcesModal && (
            <Focusable
              ref={sourcesRef}
              onPress={() => {
                triggerLight();
                setShowSourcesModal(true);
              }}
              nextFocusUp={playPauseRef}
              nextFocusLeft={subtitleRef}
              nextFocusRight={speedRef}
            >
              <View style={[styles.controlButton]}>
                <Ionicons name="server" size={skipIconSize} color="white" />
              </View>
            </Focusable>
          )}

          {/* Speed Button */}
          <Focusable
            ref={speedRef}
            onPress={() => {
              triggerLight();
              setShowSpeedModal(true);
            }}
            nextFocusUp={playPauseRef}
            nextFocusLeft={sourcesRef}
            nextFocusRight={audioRef}
          >
            <View style={[styles.controlButton]}>
              <Ionicons name="speedometer" size={skipIconSize} color="white" />
            </View>
          </Focusable>

          {/* Audio Button */}
          <Focusable
            ref={audioRef}
            onPress={() => {
              triggerLight();
              setShowAudioModal(true);
            }}
            nextFocusUp={forwardSeekRef}
            nextFocusLeft={speedRef}
            nextFocusRight={episodesRef}
          >
            <View style={[styles.controlButton]}>
              <Ionicons name="volume-medium" size={skipIconSize} color="white" />
            </View>
          </Focusable>

          {/* Episodes Button */}
          {setShowEpisodesModal && (
            <Focusable
              ref={episodesRef}
              onPress={() => {
                triggerLight();
                setShowEpisodesModal(true);
              }}
              nextFocusUp={forwardSeekRef}
              nextFocusLeft={audioRef}
            >
              <View style={[styles.controlButton]}>
                <Ionicons name="list" size={skipIconSize} color="white" />
              </View>
            </Focusable>
          )}
        </View>
      </View>
    </Animated.View>
  );
};