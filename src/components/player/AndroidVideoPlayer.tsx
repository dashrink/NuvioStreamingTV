import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, Platform, Animated, ToastAndroid } from 'react-native';
import { toast } from '@backpackapp-io/react-native-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { PinchGestureHandler, PanGestureHandler, TapGestureHandler, LongPressGestureHandler, State, PinchGestureHandlerGestureEvent, PanGestureHandlerGestureEvent, TapGestureHandlerGestureEvent, LongPressGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import RNImmersiveMode from 'react-native-immersive-mode';
import * as ScreenOrientation from 'expo-screen-orientation';
import { storageService } from '../../services/storageService';
import { logger } from '../../utils/logger';
import { mmkvStorage } from '../../services/mmkvStorage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTraktAutosync } from '../../hooks/useTraktAutosync';
import { useTraktAutosyncSettings } from '../../hooks/useTraktAutosyncSettings';
import { useMetadata } from '../../hooks/useMetadata';
import { useSettings } from '../../hooks/useSettings';
import { usePlayerGestureControls } from '../../hooks/usePlayerGestureControls';
import { useTVEventHandler } from '../../hooks/useTVEventHandler';

// Shared Hooks (cross-platform)
import {
  usePlayerState,
  usePlayerModals,
  useSpeedControl,
  useOpeningAnimation,
  useWatchProgress
} from './hooks';

// Speed settings storage key
const SPEED_SETTINGS_KEY = '@nuvio_speed_settings';

// TV Remote seek settings storage key
const TV_SEEK_SETTINGS_KEY = '@nuvio_tv_seek_settings';
const DEFAULT_TV_SEEK_SECONDS = 10;
const TV_HOLD_SEEK_INTERVAL_MS = 200; // How often to seek when holding direction
import { safeDebugLog, parseSRT, DEBUG_MODE, formatTime, isHlsStream, getHlsHeaders, defaultAndroidHeaders } from './utils/playerUtils';
import { styles } from './utils/playerStyles';
import { SubtitleModals } from './modals/SubtitleModals';
import { AudioTrackModal } from './modals/AudioTrackModal';
import { SubtitleSyncModal } from './modals/SubtitleSyncModal';
import SpeedModal from './modals/SpeedModal';
import { SourcesModal } from './modals/SourcesModal';
import { EpisodesModal } from './modals/EpisodesModal';
import UpNextButton from './common/UpNextButton';
import Focusable from '../common/Focusable';
import { EpisodeStreamsModal } from './modals/EpisodeStreamsModal';
import { ErrorModal } from './modals/ErrorModal';
import { CustomSubtitles } from './subtitles/CustomSubtitles';
import ParentalGuideOverlay from './overlays/ParentalGuideOverlay';
import SkipIntroButton from './overlays/SkipIntroButton';
import { CustomAlert } from '../CustomAlert';
import { GestureControls, PauseOverlay, SpeedActivatedOverlay } from './components';

// Android-specific components
import { VideoSurface } from './android/components/VideoSurface';
import { MpvPlayerRef } from './android/MpvPlayer';

// Utils
import stremioService from '../../services/stremioService';
import { WyzieSubtitle, SubtitleCue } from './utils/playerTypes';
import { findBestSubtitleTrack, findBestAudioTrack } from './utils/trackSelectionUtils';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';

const DEBUG_MODE = false;

const AndroidVideoPlayer: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PlayerAndroid'>>();
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();

  const {
    uri, title = 'Episode Name', season, episode, episodeTitle, quality, year,
    streamProvider, streamName, headers, id, type, episodeId, imdbId,
    availableStreams: passedAvailableStreams, backdrop, groupedEpisodes
  } = route.params;

  // --- State & Custom Hooks ---

  const playerState = usePlayerState();
  const modals = usePlayerModals();
  const speedControl = useSpeedControl();
  const { settings } = useSettings();

  const videoRef = useRef<any>(null);
  const mpvPlayerRef = useRef<MpvPlayerRef>(null);
  const exoPlayerRef = useRef<any>(null);
  const pinchRef = useRef(null);
  const tracksHook = usePlayerTracks();

  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>(uri);
  const [currentVideoType, setCurrentVideoType] = useState<string | undefined>((route.params as any).videoType);

  const [availableStreams, setAvailableStreams] = useState<any>(passedAvailableStreams || {});
  const [currentQuality, setCurrentQuality] = useState(quality);
  const [currentStreamProvider, setCurrentStreamProvider] = useState(streamProvider);
  const [currentStreamName, setCurrentStreamName] = useState(streamName);

  // State to force unmount VideoSurface during stream transitions
  const [isTransitioningStream, setIsTransitioningStream] = useState(false);

  // Dual video engine state: ExoPlayer primary, MPV fallback
  // If videoPlayerEngine is 'mpv', always use MPV; otherwise use auto behavior
  const shouldUseMpvOnly = settings.videoPlayerEngine === 'mpv';
  const [useExoPlayer, setUseExoPlayer] = useState(!shouldUseMpvOnly);
  const hasExoPlayerFailed = useRef(false);
  const [showMpvSwitchAlert, setShowMpvSwitchAlert] = useState(false);


  // Sync useExoPlayer with settings when videoPlayerEngine is set to 'mpv'
  // Only run once on mount to avoid re-render loops
  const hasAppliedEngineSettingRef = useRef(false);
  useEffect(() => {
    if (!hasAppliedEngineSettingRef.current && settings.videoPlayerEngine === 'mpv') {
      hasAppliedEngineSettingRef.current = true;
      setUseExoPlayer(false);
    }
  }, [settings.videoPlayerEngine]);

  // Subtitle addon state
  const [availableSubtitles, setAvailableSubtitles] = useState<WyzieSubtitle[]>([]);
  const [isLoadingSubtitleList, setIsLoadingSubtitleList] = useState(false);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [useCustomSubtitles, setUseCustomSubtitles] = useState(false);
  const [customSubtitles, setCustomSubtitles] = useState<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [selectedExternalSubtitleId, setSelectedExternalSubtitleId] = useState<string | null>(null);

  // Subtitle customization state
  const [subtitleSize, setSubtitleSize] = useState(28);
  const [subtitleBackground, setSubtitleBackground] = useState(false);
  const [subtitleTextColor, setSubtitleTextColor] = useState('#FFFFFF');
  const [subtitleBgOpacity, setSubtitleBgOpacity] = useState(0.7);
  const [subtitleTextShadow, setSubtitleTextShadow] = useState(true);
  const [subtitleOutline, setSubtitleOutline] = useState(true);
  const [subtitleOutlineColor, setSubtitleOutlineColor] = useState('#000000');
  const [subtitleOutlineWidth, setSubtitleOutlineWidth] = useState(3);
  const [subtitleAlign, setSubtitleAlign] = useState<'center' | 'left' | 'right'>('center');
  const [subtitleBottomOffset, setSubtitleBottomOffset] = useState(20);
  const [subtitleLetterSpacing, setSubtitleLetterSpacing] = useState(0);
  const [subtitleLineHeightMultiplier, setSubtitleLineHeightMultiplier] = useState(1.2);
  const [subtitleOffsetSec, setSubtitleOffsetSec] = useState(0);

  // Subtitle sync modal state
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Track auto-selection ref to prevent duplicate selections
  const hasAutoSelectedTracks = useRef(false);

  // Track previous video session to reset subtitle offset only when video actually changes
  const previousVideoRef = useRef<{ uri?: string; episodeId?: string }>({});

  // Reset subtitle offset when starting a new video session
  useEffect(() => {
    const currentVideo = { uri, episodeId };
    const previousVideo = previousVideoRef.current;

    // Only reset if this is actually a new video (uri or episodeId changed)
    if (previousVideo.uri !== undefined &&
      (previousVideo.uri !== currentVideo.uri || previousVideo.episodeId !== currentVideo.episodeId)) {
      setSubtitleOffsetSec(0);
    }

    // Update the ref for next comparison
    previousVideoRef.current = currentVideo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, episodeId]);

  const metadataResult = useMetadata({ id: id || 'placeholder', type: (type as any) });
  const { metadata, cast } = Boolean(id && type) ? (metadataResult as any) : { metadata: null, cast: [] };
  const hasLogo = metadata && metadata.logo;
  const openingAnimation = useOpeningAnimation(backdrop, metadata);

  const [volume, setVolume] = useState(1.0);
  const [brightness, setBrightness] = useState(1.0);
  const setupHook = usePlayerSetup(playerState.setScreenDimensions, setVolume, setBrightness, playerState.paused);

  const controlsHook = usePlayerControls(
    mpvPlayerRef,
    playerState.paused,
    playerState.setPaused,
    playerState.currentTime,
    playerState.duration,
    playerState.isSeeking,
    playerState.isMounted,
    exoPlayerRef,
    useExoPlayer
  );

  const traktAutosync = useTraktAutosync({
    id: id || '',
    type: type === 'series' ? 'series' : 'movie',
    title: episodeTitle || title,
    year: year || 0,
    imdbId: imdbId || '',
    season: season,
    episode: episode,
    showTitle: title,
    showYear: year,
    showImdbId: imdbId,
    episodeId: episodeId
  });

  // Get the Trakt autosync settings to use the user-configured sync frequency
  const { settings: traktSettings } = useTraktAutosyncSettings();

  safeDebugLog("Android Component mounted with props", {
    uri, title, season, episode, episodeTitle, quality, year,
    streamProvider, id, type, episodeId, imdbId
  });

  const screenData = Dimensions.get('screen');
  const [screenDimensions, setScreenDimensions] = useState(screenData);

  const watchProgress = useWatchProgress(
    id, type, episodeId,
    playerState.currentTime,
    playerState.duration,
    playerState.paused,
    traktAutosync,
    controlsHook.seekToTime,
    currentStreamProvider
  );
  );

const gestureControls = usePlayerGestureControls({
  volume,
  setVolume,
  brightness,
  setBrightness,
  volumeRange: { min: 0, max: 1 },
  volumeSensitivity: 0.006,
  brightnessSensitivity: 0.004,
  debugMode: DEBUG_MODE,
});

const nextEpisodeHook = useNextEpisode(type, season, episode, groupedEpisodes, (metadataResult as any)?.groupedEpisodes, episodeId);

const fadeAnim = useRef(new Animated.Value(1)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: playerState.showControls ? 1 : 0,
    duration: 300,
    useNativeDriver: true
  }).start();
}, [playerState.showControls]);

// Auto-hide controls after 3 seconds of inactivity
useEffect(() => {
  // Clear any existing timeout
  if (controlsTimeout.current) {
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = null;
  }

  // Only set timeout if controls are visible and video is playing
  if (playerState.showControls && !playerState.paused) {
    controlsTimeout.current = setTimeout(() => {
      // Don't hide if user is dragging the seek bar
      if (!playerState.isDragging.current) {
        playerState.setShowControls(false);
      }
    }, 2000); // 2 seconds delay
  }

  // Cleanup on unmount or when dependencies change
  return () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
<<<<<<< HEAD
    }
    controlsTimeout.current = setTimeout(hideControls, 5000);
  }
}, [isDragging, showControls]);

// Removed processProgressTouch - no longer needed with React Native Community Slider

const handleProgress = (data: any) => {
  // Prevent processing progress updates when component is unmounted or app is backgrounded
  // This prevents Fabric from attempting to update props on detached native views
  if (isDragging || isSeeking.current || !isMounted.current || isAppBackgrounded.current) return;

  const currentTimeInSeconds = data.currentTime;

  // Update time less frequently for better performance (increased threshold from 0.1s to 0.5s)
  if (Math.abs(currentTimeInSeconds - currentTime) > 0.5) {
    safeSetState(() => setCurrentTime(currentTimeInSeconds));
    // Removed progressAnim animation - no longer needed with React Native Community Slider
    const bufferedTime = data.playableDuration || currentTimeInSeconds;
    safeSetState(() => setBuffered(bufferedTime));
  }

};

const onLoad = (data: any) => {
  try {
    if (DEBUG_MODE) {
      logger.log('[AndroidVideoPlayer] Video loaded:', data);
    }
    if (!isMounted.current) {
      logger.warn('[AndroidVideoPlayer] Component unmounted, skipping onLoad');
      return;
    }
    if (!data) {
      logger.error('[AndroidVideoPlayer] onLoad called with null/undefined data');
      return;
    }
    const videoDuration = data.duration;
    if (data.duration > 0) {
      setDuration(videoDuration);

      // Store the actual duration for future reference and update existing progress
      if (id && type) {
        storageService.setContentDuration(id, type, videoDuration, episodeId);
        storageService.updateProgressDuration(id, type, videoDuration, episodeId);

        // Update the saved duration for resume overlay if it was using an estimate
        if (savedDuration && Math.abs(savedDuration - videoDuration) > 60) {
          setSavedDuration(videoDuration);
        }
      }
    }

    // Set aspect ratio from video dimensions
    if (data.naturalSize && data.naturalSize.width && data.naturalSize.height) {
      setVideoAspectRatio(data.naturalSize.width / data.naturalSize.height);
    } else {
      // Fallback to 16:9 aspect ratio if naturalSize is not available
      setVideoAspectRatio(16 / 9);
      logger.warn('[AndroidVideoPlayer] naturalSize not available, using default 16:9 aspect ratio');
    }

    // Handle audio tracks
    if (data.audioTracks && data.audioTracks.length > 0) {
      // Enhanced debug logging to see all available fields
      if (DEBUG_MODE) {
        logger.log(`[AndroidVideoPlayer] Raw audio tracks data:`, data.audioTracks);
        data.audioTracks.forEach((track: any, idx: number) => {
          logger.log(`[AndroidVideoPlayer] Track ${idx} raw data:`, {
            index: track.index,
            title: track.title,
            language: track.language,
            type: track.type,
            channels: track.channels,
            bitrate: track.bitrate,
            codec: track.codec,
            sampleRate: track.sampleRate,
            name: track.name,
            label: track.label,
            allKeys: Object.keys(track),
            fullTrackObject: track
          });
        });
      }

      const formattedAudioTracks = data.audioTracks.map((track: any, index: number) => {
        const trackIndex = track.index !== undefined ? track.index : index;

        // Build comprehensive track name from available fields
        let trackName = '';
        const parts = [];

        // Add language if available (try multiple possible fields)
        let language = track.language || track.lang || track.languageCode;

        // If no language field, try to extract from track name (e.g., "[Russian]", "[English]")
        if ((!language || language === 'Unknown' || language === 'und' || language === '') && track.name) {
          const languageMatch = track.name.match(/\[([^\]]+)\]/);
          if (languageMatch && languageMatch[1]) {
            language = languageMatch[1].trim();
          }
        }

        if (language && language !== 'Unknown' && language !== 'und' && language !== '') {
          parts.push(language.toUpperCase());
        }

        // Add codec information if available (try multiple possible fields)
        const codec = track.type || track.codec || track.format;
        if (codec && codec !== 'Unknown') {
          parts.push(codec.toUpperCase());
        }

        // Add channel information if available
        const channels = track.channels || track.channelCount;
        if (channels && channels > 0) {
          if (channels === 1) {
            parts.push('MONO');
          } else if (channels === 2) {
            parts.push('STEREO');
          } else if (channels === 6) {
            parts.push('5.1CH');
          } else if (channels === 8) {
            parts.push('7.1CH');
          } else {
            parts.push(`${channels}CH`);
          }
        }

        // Add bitrate if available
        const bitrate = track.bitrate || track.bitRate;
        if (bitrate && bitrate > 0) {
          parts.push(`${Math.round(bitrate / 1000)}kbps`);
        }

        // Add sample rate if available
        const sampleRate = track.sampleRate || track.sample_rate;
        if (sampleRate && sampleRate > 0) {
          parts.push(`${Math.round(sampleRate / 1000)}kHz`);
        }

        // Add title if available and not generic
        let title = track.title || track.name || track.label;
        if (title && !title.match(/^(Audio|Track)\s*\d*$/i) && title !== 'Unknown') {
          // Clean up title by removing language brackets and trailing punctuation
          title = title.replace(/\s*\[[^\]]+\]\s*[-–—]*\s*$/, '').trim();
          if (title && title !== 'Unknown') {
            parts.push(title);
          }
        }

        // Combine parts or fallback to generic name
        if (parts.length > 0) {
          trackName = parts.join(' • ');
        } else {
          // For simple track names like "Track 1", "Audio 1", etc., use them as-is
          const simpleName = track.name || track.title || track.label;
          if (simpleName && simpleName.match(/^(Track|Audio)\s*\d*$/i)) {
            trackName = simpleName;
          } else {
            // Try to extract any meaningful info from the track object
            const meaningfulFields: string[] = [];
            Object.keys(track).forEach(key => {
              const value = track[key];
              if (value && typeof value === 'string' && value !== 'Unknown' && value !== 'und' && value.length > 1) {
                meaningfulFields.push(`${key}: ${value}`);
              }
            });

            if (meaningfulFields.length > 0) {
              trackName = `Audio ${index + 1} (${meaningfulFields.slice(0, 2).join(', ')})`;
            } else {
              trackName = `Audio ${index + 1}`;
            }
          }
        }

        const trackLanguage = language || 'Unknown';

        if (DEBUG_MODE) {
          logger.log(`[AndroidVideoPlayer] Processed track ${index}:`, {
            index: trackIndex,
            name: trackName,
            language: trackLanguage,
            parts: parts,
            meaningfulFields: Object.keys(track).filter(key => {
              const value = track[key];
              return value && typeof value === 'string' && value !== 'Unknown' && value !== 'und' && value.length > 1;
            })
          });
        }

        return {
          id: trackIndex, // Use the actual track index from react-native-video
          name: trackName,
          language: trackLanguage,
        };
      });
      setRnVideoAudioTracks(formattedAudioTracks);

      if (DEBUG_MODE) {
        logger.log(`[AndroidVideoPlayer] Formatted audio tracks:`, formattedAudioTracks);
      }
    }

    // Handle text tracks
    if (data.textTracks && data.textTracks.length > 0) {
      if (DEBUG_MODE) {
        logger.log(`[AndroidVideoPlayer] Raw text tracks data:`, data.textTracks);
        data.textTracks.forEach((track: any, idx: number) => {
          logger.log(`[AndroidVideoPlayer] Text Track ${idx} raw data:`, {
            index: track.index,
            title: track.title,
            language: track.language,
            type: track.type,
            name: track.name,
            label: track.label,
            allKeys: Object.keys(track),
            fullTrackObject: track
          });
        });
      }

      const formattedTextTracks = data.textTracks.map((track: any, index: number) => {
        const trackIndex = track.index !== undefined ? track.index : index;

        // Build comprehensive track name from available fields
        let trackName = '';
        const parts = [];

        // Add language if available (try multiple possible fields)
        let language = track.language || track.lang || track.languageCode;

        // If no language field, try to extract from track name (e.g., "[Russian]", "[English]")
        if ((!language || language === 'Unknown' || language === 'und' || language === '') && track.title) {
          const languageMatch = track.title.match(/\[([^\]]+)\]/);
          if (languageMatch && languageMatch[1]) {
            language = languageMatch[1].trim();
          }
        }

        if (language && language !== 'Unknown' && language !== 'und' && language !== '') {
          parts.push(language.toUpperCase());
        }

        // Add codec information if available (try multiple possible fields)
        const codec = track.codec || track.format;
        if (codec && codec !== 'Unknown' && codec !== 'und') {
          parts.push(codec.toUpperCase());
        }

        // Add title if available and not generic
        let title = track.title || track.name || track.label;
        if (title && !title.match(/^(Subtitle|Track)\s*\d*$/i) && title !== 'Unknown') {
          // Clean up title by removing language brackets and trailing punctuation
          title = title.replace(/\s*\[[^\]]+\]\s*[-–—]*\s*$/, '').trim();
          if (title && title !== 'Unknown') {
            parts.push(title);
          }
        }

        // Combine parts or fallback to generic name
        if (parts.length > 0) {
          trackName = parts.join(' • ');
        } else {
          // For simple track names like "Track 1", "Subtitle 1", etc., use them as-is
          const simpleName = track.title || track.name || track.label;
          if (simpleName && simpleName.match(/^(Track|Subtitle)\s*\d*$/i)) {
            trackName = simpleName;
          } else {
            // Try to extract any meaningful info from the track object
            const meaningfulFields: string[] = [];
            Object.keys(track).forEach(key => {
              const value = track[key];
              if (value && typeof value === 'string' && value !== 'Unknown' && value !== 'und' && value.length > 1) {
                meaningfulFields.push(`${key}: ${value}`);
              }
            });

            if (meaningfulFields.length > 0) {
              trackName = meaningfulFields.join(' • ');
            } else {
              trackName = `Subtitle ${index + 1}`;
            }
          }
        }

        return {
          id: trackIndex, // Use the actual track index from react-native-video
          name: trackName,
          language: language,
        };
      });
      setRnVideoTextTracks(formattedTextTracks);

      if (DEBUG_MODE) {
        logger.log(`[AndroidVideoPlayer] Formatted text tracks:`, formattedTextTracks);
      }
    }

    setIsVideoLoaded(true);
    setIsPlayerReady(true);


    // Start Trakt watching session when video loads with proper duration
    if (videoDuration > 0) {
      traktAutosync.handlePlaybackStart(currentTime, videoDuration);
    }

    // Complete opening animation immediately before seeking
    completeOpeningAnimation();

    if (initialPosition && !isInitialSeekComplete) {
      logger.log(`[AndroidVideoPlayer] Seeking to initial position: ${initialPosition}s (duration: ${videoDuration}s)`);
      // Reduced timeout from 1000ms to 500ms
      setTimeout(() => {
        if (videoRef.current && videoDuration > 0 && isMounted.current) {
          seekToTime(initialPosition);
          setIsInitialSeekComplete(true);
          logger.log(`[AndroidVideoPlayer] Initial seek completed to: ${initialPosition}s`);
        } else {
          logger.error(`[AndroidVideoPlayer] Initial seek failed: videoRef=${!!videoRef.current}, duration=${videoDuration}, mounted=${isMounted.current}`);
        }
      }, 500);
    }

    controlsTimeout.current = setTimeout(hideControls, 5000);

    // Auto-fetch and load English external subtitles if available
    if (imdbId) {
      fetchAvailableSubtitles(undefined, true);
    }
  } catch (error) {
    logger.error('[AndroidVideoPlayer] Error in onLoad:', error);
    // Set fallback values to prevent crashes
    if (isMounted.current) {
      setVideoAspectRatio(16 / 9);
      setIsVideoLoaded(true);
      setIsPlayerReady(true);
      completeOpeningAnimation();
    }
  }
};

const skip = useCallback((seconds: number) => {
  const newTime = Math.max(0, Math.min(currentTime + seconds, duration - END_EPSILON));
  seekToTime(newTime);
}, [currentTime, duration]);

// TV Remote: Show seek indicator overlay
const showTVSeekIndicator = useCallback((direction: 'forward' | 'backward', seconds: number) => {
  const indicator = direction === 'forward' ? `+${seconds}s` : `-${seconds}s`;
  setTvSeekIndicator(indicator);

  // Clear any existing timeout
  if (tvSeekIndicatorTimeoutRef.current) {
    clearTimeout(tvSeekIndicatorTimeoutRef.current);
  }

  // Hide indicator after delay
  tvSeekIndicatorTimeoutRef.current = setTimeout(() => {
    setTvSeekIndicator(null);
    tvSeekIndicatorTimeoutRef.current = null;
  }, 800);
}, []);

// TV Remote: Handle seek with visual feedback
const handleTVSeek = useCallback((direction: 'forward' | 'backward') => {
  const seekAmount = direction === 'forward' ? tvSeekSeconds : -tvSeekSeconds;
  skip(seekAmount);
  showTVSeekIndicator(direction, tvSeekSeconds);

  // Show controls and reset timeout
  if (!showControls) {
    setShowControls(true);
    fadeAnim.setValue(1);
  }
  if (controlsTimeout.current) {
    clearTimeout(controlsTimeout.current);
  }
  controlsTimeout.current = setTimeout(hideControls, 5000);
}, [tvSeekSeconds, skip, showTVSeekIndicator, showControls, fadeAnim, hideControls]);

// TV Remote: Start continuous seek on hold
const startTVHoldSeek = useCallback((direction: 'left' | 'right') => {
  if (tvHoldSeekActiveRef.current) return; // Already seeking
  tvHoldSeekActiveRef.current = direction;

  // Perform initial seek
  handleTVSeek(direction === 'right' ? 'forward' : 'backward');

  // Start interval for continuous seeking
  tvHoldSeekIntervalRef.current = setInterval(() => {
    if (tvHoldSeekActiveRef.current === direction) {
      handleTVSeek(direction === 'right' ? 'forward' : 'backward');
    }
  }, TV_HOLD_SEEK_INTERVAL_MS);
}, [handleTVSeek]);

// TV Remote: Stop continuous seek
const stopTVHoldSeek = useCallback(() => {
  tvHoldSeekActiveRef.current = null;
  if (tvHoldSeekIntervalRef.current) {
    clearInterval(tvHoldSeekIntervalRef.current);
    tvHoldSeekIntervalRef.current = null;
  }
}, []);

// TV Remote: Reset controls timeout helper
const resetTVControlsTimeout = useCallback(() => {
  if (controlsTimeout.current) {
    clearTimeout(controlsTimeout.current);
  }
  controlsTimeout.current = setTimeout(hideControls, 5000);
}, [hideControls]);

// Cleanup TV hold seek interval on unmount
useEffect(() => {
  return () => {
    if (tvHoldSeekIntervalRef.current) {
      clearInterval(tvHoldSeekIntervalRef.current);
    }
    if (tvSeekIndicatorTimeoutRef.current) {
      clearTimeout(tvSeekIndicatorTimeoutRef.current);
    }
  };
}, []);

const cycleAspectRatio = useCallback(() => {
  // Prevent rapid successive resize operations
  if (resizeTimeoutRef.current) {
    if (DEBUG_MODE) {
      logger.log('[AndroidVideoPlayer] Resize operation debounced - ignoring rapid click');
    }
    return;
  }
  // Cycle through allowed resize modes per platform
  // Android: exclude 'contain' for both VLC and RN Video (not well supported)
  let resizeModes: ResizeModeType[];
  if (Platform.OS === 'ios') {
    resizeModes = ['contain', 'cover'];
  } else {
    // On Android with VLC backend, only 'none' (original) and 'cover' (client-side crop)
    resizeModes = useVLC ? ['none', 'cover'] : ['cover', 'none'];
  }

  const currentIndex = resizeModes.indexOf(resizeMode);
  const nextIndex = (currentIndex + 1) % resizeModes.length;
  const newResizeMode = resizeModes[nextIndex];
  setResizeMode(newResizeMode);

  // Set zoom for cover mode to crop/fill screen
  if (newResizeMode === 'cover') {
    if (videoAspectRatio && screenDimensions.width && screenDimensions.height) {
      const screenAspect = screenDimensions.width / screenDimensions.height;
      const videoAspect = videoAspectRatio;
      // Calculate zoom needed to fill screen (cover mode crops to fill)
      const zoomFactor = Math.max(screenAspect / videoAspect, videoAspect / screenAspect);
      setZoomScale(zoomFactor);
      if (DEBUG_MODE) {
        logger.log(`[AndroidVideoPlayer] Cover mode zoom: ${zoomFactor.toFixed(2)}x (screen: ${screenAspect.toFixed(2)}, video: ${videoAspect.toFixed(2)})`);
      }
    } else {
      // Fallback if video aspect not available yet - will be set when video loads
      setZoomScale(1.2); // Conservative zoom that works for most content
      if (DEBUG_MODE) {
        logger.log(`[AndroidVideoPlayer] Cover mode zoom fallback: 1.2x (video AR not available yet)`);
      }
    }
  } else if (newResizeMode === 'none') {
    // Reset zoom for none mode
    setZoomScale(1);
  }

  if (DEBUG_MODE) {
    logger.log(`[AndroidVideoPlayer] Resize mode changed to: ${newResizeMode}`);
  }

  // Debounce for 300ms to prevent rapid successive operations
  resizeTimeoutRef.current = setTimeout(() => {
    resizeTimeoutRef.current = null;
  }, 300);
}, [resizeMode]);



// Cycle playback speed
const cyclePlaybackSpeed = useCallback(() => {
  const idx = speedOptions.indexOf(playbackSpeed);
  const newIdx = (idx + 1) % speedOptions.length;
  const newSpeed = speedOptions[newIdx];
  setPlaybackSpeed(newSpeed);
}, [playbackSpeed, speedOptions]);

const enableImmersiveMode = () => {
  StatusBar.setHidden(true, 'none');
  if (Platform.OS === 'android') {
    try {
      RNImmersiveMode.setBarMode('FullSticky');
      RNImmersiveMode.fullLayout(true);
      if (NativeModules.StatusBarManager) {
        NativeModules.StatusBarManager.setHidden(true);
      }
    } catch (error) {
      logger.warn('[AndroidVideoPlayer] Immersive mode error:', error);
    }
  }
};

const disableImmersiveMode = () => {
  StatusBar.setHidden(false);
  if (Platform.OS === 'android') {
    RNImmersiveMode.setBarMode('Normal');
    RNImmersiveMode.fullLayout(false);
  }
};

const handleClose = useCallback(async () => {
  // Prevent multiple close attempts
  if (isSyncingBeforeClose) {
    logger.log('[AndroidVideoPlayer] Close already in progress, ignoring duplicate call');
    return;
  }

  logger.log('[AndroidVideoPlayer] Close button pressed - closing immediately and syncing to Trakt in background');
  setIsSyncingBeforeClose(true);

  // Make sure we have the most accurate current time
  const actualCurrentTime = currentTime;
  const progressPercent = duration > 0 ? (actualCurrentTime / duration) * 100 : 0;

  logger.log(`[AndroidVideoPlayer] Current progress: ${actualCurrentTime}/${duration} (${progressPercent.toFixed(1)}%)`);

  // Restore Android system brightness state so app does not lock brightness
  const restoreSystemBrightness = async () => {
    if (Platform.OS !== 'android') return;
    try {
      // Restore mode first (if available), then brightness value
      // Restore mode first (if available), then brightness value
      if (typeof (Brightness as any).restoreSystemBrightnessAsync === 'function') {
        await (Brightness as any).restoreSystemBrightnessAsync();
      } else {
        // Fallback: verify we have permission before attempting to write to system settings
        const { status } = await (Brightness as any).getPermissionsAsync();
        if (status === 'granted') {
          if (originalSystemBrightnessModeRef.current !== null && typeof (Brightness as any).setSystemBrightnessModeAsync === 'function') {
            await (Brightness as any).setSystemBrightnessModeAsync(originalSystemBrightnessModeRef.current);
          }
          if (originalSystemBrightnessRef.current !== null && typeof (Brightness as any).setSystemBrightnessAsync === 'function') {
            await (Brightness as any).setSystemBrightnessAsync(originalSystemBrightnessRef.current);
          }
        }
      }
      if (DEBUG_MODE) {
        logger.log('[AndroidVideoPlayer] Restored Android system brightness and mode');
      }
    } catch (e) {
      logger.warn('[AndroidVideoPlayer] Failed to restore system brightness state:', e);
=======
        controlsTimeout.current = null;
>>>>>>> origin/main
    }
  };
}, [playerState.showControls, playerState.paused, playerState.isDragging]);

useEffect(() => {
  openingAnimation.startOpeningAnimation();
}, []);

// Load subtitle settings on mount
useEffect(() => {
  const loadSubtitleSettings = async () => {
    const settings = await storageService.getSubtitleSettings();
    if (settings) {
      if (settings.subtitleSize !== undefined) setSubtitleSize(settings.subtitleSize);
      if (settings.subtitleBackground !== undefined) setSubtitleBackground(settings.subtitleBackground);
      if (settings.subtitleTextColor !== undefined) setSubtitleTextColor(settings.subtitleTextColor);
      if (settings.subtitleBgOpacity !== undefined) setSubtitleBgOpacity(settings.subtitleBgOpacity);
      if (settings.subtitleTextShadow !== undefined) setSubtitleTextShadow(settings.subtitleTextShadow);
      if (settings.subtitleOutline !== undefined) setSubtitleOutline(settings.subtitleOutline);
      if (settings.subtitleOutlineColor !== undefined) setSubtitleOutlineColor(settings.subtitleOutlineColor);
      if (settings.subtitleOutlineWidth !== undefined) setSubtitleOutlineWidth(settings.subtitleOutlineWidth);
      if (settings.subtitleAlign !== undefined) setSubtitleAlign(settings.subtitleAlign);
      if (settings.subtitleBottomOffset !== undefined) setSubtitleBottomOffset(settings.subtitleBottomOffset);
      if (settings.subtitleLetterSpacing !== undefined) setSubtitleLetterSpacing(settings.subtitleLetterSpacing);
      if (settings.subtitleLineHeightMultiplier !== undefined) setSubtitleLineHeightMultiplier(settings.subtitleLineHeightMultiplier);
    }
  };
  loadSubtitleSettings();
}, []);

// Save subtitle settings when they change
useEffect(() => {
  const saveSettings = async () => {
    await storageService.saveSubtitleSettings({
      subtitleSize,
      subtitleBackground,
      subtitleTextColor,
      subtitleBgOpacity,
      subtitleTextShadow,
      subtitleOutline,
      subtitleOutlineColor,
      subtitleOutlineWidth,
      subtitleAlign,
      subtitleBottomOffset,
      subtitleLetterSpacing,
      subtitleLineHeightMultiplier,
    });
  };
  saveSettings();
}, [
  subtitleSize, subtitleBackground, subtitleTextColor, subtitleBgOpacity,
  subtitleTextShadow, subtitleOutline, subtitleOutlineColor, subtitleOutlineWidth,
  subtitleAlign, subtitleBottomOffset, subtitleLetterSpacing, subtitleLineHeightMultiplier
]);

const handleLoad = useCallback((data: any) => {
  if (!playerState.isMounted.current) return;

  const videoDuration = data.duration;
  console.log('[AndroidVideoPlayer] handleLoad called:', {
    duration: videoDuration,
    initialPosition: watchProgress.initialPosition,
    showResumeOverlay: watchProgress.showResumeOverlay,
    initialSeekTarget: watchProgress.initialSeekTargetRef?.current
  });

  if (videoDuration > 0) {
    playerState.setDuration(videoDuration);
    if (id && type) {
      storageService.setContentDuration(id, type, videoDuration, episodeId);
      storageService.updateProgressDuration(id, type, videoDuration, episodeId);
    }
  }

  if (data.naturalSize) {
    playerState.setVideoAspectRatio(data.naturalSize.width / data.naturalSize.height);
  } else {
    playerState.setVideoAspectRatio(16 / 9);
  }

  if (data.audioTracks) {
    const formatted = data.audioTracks.map((t: any, i: number) => ({
      id: t.index !== undefined ? t.index : i,
      name: t.title || t.name || `Track ${i + 1}`,
      language: t.language
    }));
    tracksHook.setRnVideoAudioTracks(formatted);
  }
  if (data.textTracks) {
    const formatted = data.textTracks.map((t: any, i: number) => ({
      id: t.index !== undefined ? t.index : i,
      name: t.title || t.name || `Track ${i + 1}`,
      language: t.language
    }));
    tracksHook.setRnVideoTextTracks(formatted);
  }

  playerState.setIsVideoLoaded(true);
  openingAnimation.completeOpeningAnimation();

  // Auto-select audio track based on preferences
  if (data.audioTracks && data.audioTracks.length > 0 && settings?.preferredAudioLanguage) {
    const formatted = data.audioTracks.map((t: any, i: number) => ({
      id: t.index !== undefined ? t.index : i,
      name: t.title || t.name || `Track ${i + 1}`,
      language: t.language
    }));
    const bestAudioTrack = findBestAudioTrack(formatted, settings.preferredAudioLanguage);
    if (bestAudioTrack !== null) {
      logger.debug(`[AndroidVideoPlayer] Auto-selecting audio track ${bestAudioTrack} for language: ${settings.preferredAudioLanguage}`);
      tracksHook.setSelectedAudioTrack({ type: 'index', value: bestAudioTrack });
    }
  }

  // Auto-select subtitle track based on preferences
  // Only auto-select internal tracks here if preference is 'internal' or 'any'
  // If preference is 'external', we wait for the useEffect to handle selection after external subs load
  if (data.textTracks && data.textTracks.length > 0 && !hasAutoSelectedTracks.current && settings?.enableSubtitleAutoSelect) {
    const sourcePreference = settings?.subtitleSourcePreference || 'internal';

    // Only pre-select internal if preference is internal or any
    if (sourcePreference === 'internal' || sourcePreference === 'any') {
      const formatted = data.textTracks.map((t: any, i: number) => ({
        id: t.index !== undefined ? t.index : i,
        name: t.title || t.name || `Track ${i + 1}`,
        language: t.language
      }));
      const subtitleSelection = findBestSubtitleTrack(
        formatted,
        [], // External subtitles not yet loaded
        {
          preferredSubtitleLanguage: settings?.preferredSubtitleLanguage || 'en',
          subtitleSourcePreference: sourcePreference,
          enableSubtitleAutoSelect: true
        }
      );

      if (subtitleSelection.type === 'internal' && subtitleSelection.internalTrackId !== undefined) {
        logger.debug(`[AndroidVideoPlayer] Auto-selecting internal subtitle track ${subtitleSelection.internalTrackId}`);
        tracksHook.setSelectedTextTrack(subtitleSelection.internalTrackId);
        hasAutoSelectedTracks.current = true;
      }
    }
    // If preference is 'external', don't select anything here - useEffect will handle it
  }

  // Handle Resume - check both initialPosition and initialSeekTargetRef
  const resumeTarget = watchProgress.initialPosition || watchProgress.initialSeekTargetRef?.current;
  if (resumeTarget && resumeTarget > 0 && !watchProgress.showResumeOverlay && videoDuration > 0) {
    const seekPosition = Math.min(resumeTarget, videoDuration - 0.5);
    console.log('[AndroidVideoPlayer] Seeking to resume position:', seekPosition, 'duration:', videoDuration, 'useExoPlayer:', useExoPlayer);

    // Use a small delay to ensure the player is ready
    // Directly use refs to avoid stale closure issues
    setTimeout(() => {
      console.log('[AndroidVideoPlayer] Executing resume seek to:', seekPosition, 'ExoPlayer available:', !!exoPlayerRef.current, 'MPV available:', !!mpvPlayerRef.current);

      if (useExoPlayer && exoPlayerRef.current) {
        console.log('[AndroidVideoPlayer] Seeking ExoPlayer to resume position:', seekPosition);
        exoPlayerRef.current.seek(seekPosition);
      } else if (mpvPlayerRef.current) {
        console.log('[AndroidVideoPlayer] Seeking MPV to resume position:', seekPosition);
        mpvPlayerRef.current.seek(seekPosition);
      } else {
        console.warn('[AndroidVideoPlayer] No player ref available for resume seek');
      }
    }, 300);
  }
}, [id, type, episodeId, playerState.isMounted, watchProgress.initialPosition, useExoPlayer]);

const handleProgress = useCallback((data: any) => {
  if (playerState.isDragging.current || playerState.isSeeking.current || !playerState.isMounted.current || setupHook.isAppBackgrounded.current) return;
  const currentTimeInSeconds = data.currentTime;
  if (Math.abs(currentTimeInSeconds - playerState.currentTime) > 0.5) {
    playerState.setCurrentTime(currentTimeInSeconds);
    playerState.setBuffered(data.playableDuration || currentTimeInSeconds);
  }
}, [playerState.currentTime, playerState.isDragging, playerState.isSeeking, setupHook.isAppBackgrounded]);

// Auto-select subtitles when both internal tracks and video are loaded
// This ensures we wait for internal tracks before falling back to external
useEffect(() => {
  if (!playerState.isVideoLoaded || hasAutoSelectedTracks.current || !settings?.enableSubtitleAutoSelect) {
    return;
  }

  const internalTracks = tracksHook.ksTextTracks;
  const externalSubs = availableSubtitles;

  // Wait a short delay to ensure tracks are fully populated
  const timeoutId = setTimeout(() => {
    if (hasAutoSelectedTracks.current) return;

    const subtitleSelection = findBestSubtitleTrack(
      internalTracks,
      externalSubs,
      {
        preferredSubtitleLanguage: settings?.preferredSubtitleLanguage || 'en',
        subtitleSourcePreference: settings?.subtitleSourcePreference || 'internal',
        enableSubtitleAutoSelect: true
      }
    );

    // Trust the findBestSubtitleTrack function's decision - it already implements priority logic
    if (subtitleSelection.type === 'internal' && subtitleSelection.internalTrackId !== undefined) {
      logger.debug(`[AndroidVideoPlayer] Auto-selecting internal subtitle track ${subtitleSelection.internalTrackId}`);
      tracksHook.setSelectedTextTrack(subtitleSelection.internalTrackId);
      hasAutoSelectedTracks.current = true;
    } else if (subtitleSelection.type === 'external' && subtitleSelection.externalSubtitle) {
      logger.debug(`[AndroidVideoPlayer] Auto-selecting external subtitle: ${subtitleSelection.externalSubtitle.display}`);
      loadWyzieSubtitle(subtitleSelection.externalSubtitle);
      hasAutoSelectedTracks.current = true;
    }
  }, 500); // Short delay to ensure tracks are populated

  return () => clearTimeout(timeoutId);
}, [playerState.isVideoLoaded, tracksHook.ksTextTracks, availableSubtitles, settings]);

// Sync custom subtitle text with current playback time
useEffect(() => {
  if (!useCustomSubtitles || customSubtitles.length === 0) return;

  const cueNow = customSubtitles.find(
    cue => playerState.currentTime >= cue.start && playerState.currentTime <= cue.end
  );
  setCurrentSubtitle(cueNow ? cueNow.text : '');
}, [playerState.currentTime, useCustomSubtitles, customSubtitles]);

const toggleControls = useCallback(() => {
  playerState.setShowControls(prev => {
    // If we're showing controls, the useEffect will handle the auto-hide timer
    return !prev;
  });
}, []);

const hideControls = useCallback(() => {
  if (playerState.isDragging.current) return;
  playerState.setShowControls(false);
}, []);

const loadStartAtRef = useRef<number | null>(null);
const firstFrameAtRef = useRef<number | null>(null);
const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

const handleClose = useCallback(() => {
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.reset({ index: 0, routes: [{ name: 'Home' }] } as any);
}, [navigation]);

// Handle codec errors from ExoPlayer - silently switch to MPV
const handleCodecError = useCallback(() => {
  if (!hasExoPlayerFailed.current) {
    hasExoPlayerFailed.current = true;
    logger.warn('[AndroidVideoPlayer] ExoPlayer codec error detected, switching to MPV silently');
    ToastAndroid.show('Switching to MPV due to playback issue', ToastAndroid.SHORT);
    setUseExoPlayer(false);
  }
}, []);

// Handle manual switch to MPV - for users experiencing black screen
const handleManualSwitchToMPV = useCallback(() => {
  if (useExoPlayer && !hasExoPlayerFailed.current) {
    setShowMpvSwitchAlert(true);
  }
}, [useExoPlayer]);

// Confirm and execute the switch to MPV
const confirmSwitchToMPV = useCallback(() => {
  hasExoPlayerFailed.current = true;
  logger.info('[AndroidVideoPlayer] User confirmed switch to MPV');
  ToastAndroid.show('Switching to MPV player...', ToastAndroid.SHORT);

  // Store current playback position before switching
  const currentPos = playerState.currentTime;

  // Switch to MPV
  setUseExoPlayer(false);

  // Seek to current position after a brief delay to ensure MPV is loaded
  setTimeout(() => {
    if (mpvPlayerRef.current && currentPos > 0) {
      mpvPlayerRef.current.seek(currentPos);
    }
  }, 500);
}, [playerState.currentTime]);


const handleSelectStream = async (newStream: any) => {
  if (newStream.url === currentStreamUrl) {
    modals.setShowSourcesModal(false);
    return;
  }
  modals.setShowSourcesModal(false);
  playerState.setPaused(true);

  // Unmount VideoSurface first to ensure MPV is fully destroyed
  setIsTransitioningStream(true);

  const newQuality = newStream.quality || newStream.title?.match(/(\d+)p/)?.[0];
  const newProvider = newStream.addonName || newStream.name || newStream.addon || 'Unknown';
  const newStreamName = newStream.name || newStream.title || 'Unknown';

  // Wait for unmount to complete, then navigate
  setTimeout(() => {
    (navigation as any).replace('PlayerAndroid', {
      ...route.params,
      uri: newStream.url,
      quality: newQuality,
      streamProvider: newProvider,
      streamName: newStreamName,
      headers: newStream.headers,
      availableStreams: availableStreams
    });
  }, 300);
};

const handleEpisodeStreamSelect = async (stream: any) => {
  if (!modals.selectedEpisodeForStreams) return;
  modals.setShowEpisodeStreamsModal(false);
  playerState.setPaused(true);

  // Unmount VideoSurface first to ensure MPV is fully destroyed
  setIsTransitioningStream(true);

  const ep = modals.selectedEpisodeForStreams;

  const newQuality = stream.quality || (stream.title?.match(/(\d+)p/)?.[0]);
  const newProvider = stream.addonName || stream.name || stream.addon || 'Unknown';
  const newStreamName = stream.name || stream.title || 'Unknown Stream';

  // Wait for unmount to complete, then navigate
  setTimeout(() => {
    (navigation as any).replace('PlayerAndroid', {
      uri: stream.url,
      title: title,
      episodeTitle: ep.name,
      season: ep.season_number,
      episode: ep.episode_number,
      quality: newQuality,
      year: year,
      streamProvider: newProvider,
      streamName: newStreamName,
      headers: stream.headers || undefined,
      id,
      type: 'series',
      episodeId: ep.stremioId || `${id}:${ep.season_number}:${ep.episode_number}`,
      imdbId: imdbId ?? undefined,
      backdrop: backdrop || undefined,
      availableStreams: {},
      groupedEpisodes: groupedEpisodes,
    });
  }, 300);
};

// Subtitle addon fetching
const fetchAvailableSubtitles = useCallback(async () => {
  const targetImdbId = imdbId;
  if (!targetImdbId) {
    logger.warn('[AndroidVideoPlayer] No IMDB ID for subtitle fetch');
    return;
  }

  setIsLoadingSubtitleList(true);
  try {
    const stremioType = type === 'series' ? 'series' : 'movie';
    const stremioVideoId = stremioType === 'series' && season && episode
      ? `series:${targetImdbId}:${season}:${episode}`
      : undefined;
    const results = await stremioService.getSubtitles(stremioType, targetImdbId, stremioVideoId);

    const subs: WyzieSubtitle[] = (results || []).map((sub: any) => ({
      id: sub.id || `${sub.lang}-${sub.url}`,
      url: sub.url,
      flagUrl: '',
      format: 'srt',
      encoding: 'utf-8',
      media: sub.addonName || sub.addon || '',
      display: sub.lang || 'Unknown',
      language: (sub.lang || '').toLowerCase(),
      isHearingImpaired: false,
      source: sub.addonName || sub.addon || 'Addon',
    }));

    setAvailableSubtitles(subs);
    logger.info(`[AndroidVideoPlayer] Fetched ${subs.length} addon subtitles`);
    // Auto-selection is now handled by useEffect that waits for internal tracks
  } catch (e) {
    logger.error('[AndroidVideoPlayer] Error fetching addon subtitles', e);
  } finally {
    setIsLoadingSubtitleList(false);
  }
}, [imdbId, type, season, episode]);

const loadWyzieSubtitle = useCallback(async (subtitle: WyzieSubtitle) => {
  if (!subtitle.url) return;

  modals.setShowSubtitleModal(false);
  setIsLoadingSubtitles(true);
  try {
    // Download subtitle file
    let srtContent = '';
    try {
      const resp = await axios.get(subtitle.url, { timeout: 10000 });
      srtContent = typeof resp.data === 'string' ? resp.data : String(resp.data);
    } catch {
      const resp = await fetch(subtitle.url);
      srtContent = await resp.text();
    }

    // Parse subtitle file
    const parsedCues = parseSRT(srtContent);
    setCustomSubtitles(parsedCues);
    setUseCustomSubtitles(true);
    setSelectedExternalSubtitleId(subtitle.id); // Track the selected external subtitle

    // Disable MPV's built-in subtitle track when using custom subtitles
    tracksHook.setSelectedTextTrack(-1);
    if (mpvPlayerRef.current) {
      mpvPlayerRef.current.setSubtitleTrack(-1);
    }

    // Set initial subtitle based on current time
    const adjustedTime = playerState.currentTime;
    const cueNow = parsedCues.find(cue => adjustedTime >= cue.start && adjustedTime <= cue.end);
    setCurrentSubtitle(cueNow ? cueNow.text : '');

    logger.info(`[AndroidVideoPlayer] Loaded addon subtitle: ${subtitle.display} (${parsedCues.length} cues)`);
    toast.success(`Subtitle loaded: ${subtitle.display}`);
  } catch (e) {
    logger.error('[AndroidVideoPlayer] Error loading subtitle', e);
    toast.error('Failed to load subtitle');
  } finally {
    setIsLoadingSubtitles(false);
  }
}, [modals, playerState.currentTime, tracksHook]);

<<<<<<< HEAD
const togglePlayback = useCallback(() => {
  const newPausedState = !paused;
  setPaused(newPausedState);

  if (duration > 0) {
    traktAutosync.handleProgressUpdate(currentTime, duration, true);
  }
}, [paused, currentTime, duration, traktAutosync]);

// TV Remote Event Handler - handles all D-pad and media button events
// Must be placed after togglePlayback and handleClose are defined
useTVEventHandler(useCallback((evt: any) => {
  if (!Platform.isTV) return;
  if (!evt || !evt.eventType) return;

  const eventType = evt.eventType;

  switch (eventType) {
    case 'playPause':
      // Media play/pause button
      togglePlayback();
      break;

    case 'select':
      // Center/OK button - toggle play/pause when controls visible, otherwise show controls
      if (showControls) {
        togglePlayback();
      } else {
        setShowControls(true);
        fadeAnim.setValue(1);
        resetTVControlsTimeout();
      }
      break;

    case 'left':
      // D-pad left - seek backward
      handleTVSeek('backward');
      break;

    case 'right':
      // D-pad right - seek forward
      handleTVSeek('forward');
      break;

    case 'up':
      // D-pad up - show controls
      if (!showControls) {
        setShowControls(true);
        fadeAnim.setValue(1);
      }
      resetTVControlsTimeout();
      break;

    case 'down':
      // D-pad down - show controls
      if (!showControls) {
        setShowControls(true);
        fadeAnim.setValue(1);
      }
      resetTVControlsTimeout();
      break;

    case 'longLeft':
      // Long press left - start continuous seek backward
      startTVHoldSeek('left');
      break;

    case 'longRight':
      // Long press right - start continuous seek forward
      startTVHoldSeek('right');
      break;

    case 'blur':
      // Focus lost or button released - stop continuous seek
      stopTVHoldSeek();
      break;

    case 'menu':
      // Menu/Back button - close player
      handleClose();
      break;

    case 'swipeLeft':
    case 'swipeRight':
      // Swipe gestures (if supported) - map to seek
      handleTVSeek(eventType === 'swipeRight' ? 'forward' : 'backward');
      break;
  }
}, [
  showControls,
  fadeAnim,
  togglePlayback,
  handleTVSeek,
  startTVHoldSeek,
  stopTVHoldSeek,
  resetTVControlsTimeout,
  handleClose,
]));

// Handle next episode button press
const handlePlayNextEpisode = useCallback(async () => {
  if (!nextEpisode || !id || isLoadingNextEpisode) return;

  setIsLoadingNextEpisode(true);

  try {
    logger.log('[AndroidVideoPlayer] Loading next episode:', nextEpisode);

    // Create episode ID for next episode using stremioId if available, otherwise construct it
    const nextEpisodeId = nextEpisode.stremioId || `${id}:${nextEpisode.season_number}:${nextEpisode.episode_number}`;

    logger.log('[AndroidVideoPlayer] Fetching streams for next episode:', nextEpisodeId);

    // Import stremio service
    const stremioService = require('../../services/stremioService').default;

    let bestStream: any = null;
    let streamFound = false;
    let completedProviders = 0;
    const expectedProviders = new Set<string>();

    // Get installed addons to know how many providers to expect
    const installedAddons = stremioService.getInstalledAddons();
    const streamAddons = installedAddons.filter((addon: any) =>
      addon.resources && addon.resources.includes('stream')
    );

    streamAddons.forEach((addon: any) => expectedProviders.add(addon.id));

    // Collect all streams from all providers for the sources modal
    const allStreams: { [providerId: string]: { streams: any[]; addonName: string } } = {};
    let hasNavigated = false;

    // Fetch streams for next episode
    await stremioService.getStreams('series', nextEpisodeId, (streams: any, addonId: any, addonName: any, error: any) => {
      completedProviders++;

      // Always collect streams from this provider for sources modal (even after navigation)
      if (streams && streams.length > 0) {
        allStreams[addonId] = {
          streams: streams,
          addonName: addonName || addonId
        };
      }

      // Navigate with first good stream found, but continue collecting streams in background
      if (!hasNavigated && !streamFound && streams && streams.length > 0) {
        // Sort streams by quality and cache status (prefer cached/debrid streams)
        const sortedStreams = streams.sort((a: any, b: any) => {
          const aQuality = parseInt(a.title?.match(/(\d+)p/)?.[1] || '0', 10);
          const bQuality = parseInt(b.title?.match(/(\d+)p/)?.[1] || '0', 10);
          const aCached = a.behaviorHints?.cached || false;
          const bCached = b.behaviorHints?.cached || false;

          // Prioritize cached streams first
          if (aCached !== bCached) {
            return aCached ? -1 : 1;
          }
          // Then sort by quality (higher quality first)
          return bQuality - aQuality;
        });

        bestStream = sortedStreams[0];
        streamFound = true;
        hasNavigated = true;

        // Update loading details for the chip
        const qualityText = (bestStream.title?.match(/(\d+)p/) || [])[1] || null;
        setNextLoadingProvider(addonName || addonId || null);
        setNextLoadingQuality(qualityText);
        setNextLoadingTitle(bestStream.name || bestStream.title || null);

        logger.log('[AndroidVideoPlayer] Found stream for next episode:', bestStream);

        // Pause current playback to ensure no background player remains active
        setPaused(true);

        // Start navigation immediately but let stream fetching continue in background
        setTimeout(() => {
          (navigation as any).replace('PlayerAndroid', {
            uri: bestStream.url,
            title: metadata?.name || '',
            episodeTitle: nextEpisode.name,
            season: nextEpisode.season_number,
            episode: nextEpisode.episode_number,
            quality: (bestStream.title?.match(/(\d+)p/) || [])[1] || undefined,
            year: metadata?.year,
            streamProvider: addonName,
            streamName: bestStream.name || bestStream.title,
            headers: bestStream.headers || undefined,
            forceVlc: false,
            id,
            type: 'series',
            episodeId: nextEpisodeId,
            imdbId: imdbId ?? undefined,
            backdrop: backdrop || undefined,
            availableStreams: allStreams, // Pass current available streams (more will be added)
          });
          setIsLoadingNextEpisode(false);
        }, 100); // Small delay to ensure smooth transition
      }

      // If we've checked all providers and no stream found
      if (completedProviders >= expectedProviders.size && !streamFound) {
        logger.warn('[AndroidVideoPlayer] No streams found for next episode after checking all providers');
        setIsLoadingNextEpisode(false);
      }
    });

    // Fallback timeout in case providers don't respond
    setTimeout(() => {
      if (!streamFound) {
        logger.warn('[AndroidVideoPlayer] Timeout: No streams found for next episode');
        setIsLoadingNextEpisode(false);
      }
    }, 8000);

  } catch (error) {
    logger.error('[AndroidVideoPlayer] Error loading next episode:', error);
    setIsLoadingNextEpisode(false);
  }
}, [nextEpisode, id, isLoadingNextEpisode, navigation, metadata, imdbId, backdrop]);

// Function to hide pause overlay and show controls
const hidePauseOverlay = useCallback(() => {
  if (showPauseOverlay) {
    // Reset cast details state when hiding overlay
    if (showCastDetails) {
      Animated.parallel([
        Animated.timing(castDetailsOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(castDetailsScale, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowCastDetails(false);
        setSelectedCastMember(null);
        // Reset metadata animations
        metadataOpacity.setValue(1);
        metadataScale.setValue(1);
      });
    } else {
      setShowCastDetails(false);
      setSelectedCastMember(null);
      // Reset metadata animations
      metadataOpacity.setValue(1);
      metadataScale.setValue(1);
    }

    Animated.parallel([
      Animated.timing(pauseOverlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(pauseOverlayTranslateY, {
        toValue: 8,
        duration: 220,
        useNativeDriver: true,
      })
    ]).start(() => setShowPauseOverlay(false));

    // Show controls when overlay is touched
    if (!showControls) {
      setShowControls(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide controls after 5 seconds
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(hideControls, 5000);
    }
  }
}, [showPauseOverlay, pauseOverlayOpacity, pauseOverlayTranslateY, showControls, fadeAnim, controlsTimeout, hideControls]);

// Handle paused overlay after 5 seconds of being paused
useEffect(() => {
  if (paused) {
    if (pauseOverlayTimerRef.current) {
      clearTimeout(pauseOverlayTimerRef.current);
    }
    pauseOverlayTimerRef.current = setTimeout(() => {
      setShowPauseOverlay(true);
      pauseOverlayOpacity.setValue(0);
      pauseOverlayTranslateY.setValue(12);
      Animated.parallel([
        Animated.timing(pauseOverlayOpacity, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(pauseOverlayTranslateY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        })
      ]).start();
    }, 5000);
  } else {
    if (pauseOverlayTimerRef.current) {
      clearTimeout(pauseOverlayTimerRef.current);
      pauseOverlayTimerRef.current = null;
    }
    hidePauseOverlay();
  }
  return () => {
    if (pauseOverlayTimerRef.current) {
      clearTimeout(pauseOverlayTimerRef.current);
      pauseOverlayTimerRef.current = null;
    }
  };
}, [paused]);

// Up Next visibility handled inside reusable component

useEffect(() => {
  isMounted.current = true;
  isAppBackgrounded.current = false;
  return () => {
    isMounted.current = false;
    isAppBackgrounded.current = false;
    // Clear all timers and intervals
    if (seekDebounceTimer.current) {
      clearTimeout(seekDebounceTimer.current);
      seekDebounceTimer.current = null;
    }
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }
    if (pauseOverlayTimerRef.current) {
      clearTimeout(pauseOverlayTimerRef.current);
      pauseOverlayTimerRef.current = null;
    }
    if (progressSaveInterval) {
      clearInterval(progressSaveInterval);
      setProgressSaveInterval(null);
    }

    // Cleanup gesture controls
    gestureControls.cleanup();
    // Best-effort restore of Android system brightness state on unmount
    if (Platform.OS === 'android') {
      try {
        // Use restoreSystemBrightnessAsync if available to reset window override
        if (typeof (Brightness as any).restoreSystemBrightnessAsync === 'function') {
          (Brightness as any).restoreSystemBrightnessAsync();
        } else {
          // Fallback for older versions or if restore is not available
          // Only attempt to write system settings if strictly necessary and likely to succeed
          // We skip the permission check here for sync cleanup, but catch the error if it fails
        }
      } catch (e) {
        logger.warn('[AndroidVideoPlayer] Failed to restore system brightness on unmount:', e);
      }
    }
  };
=======
  const disableCustomSubtitles = useCallback(() => {
    setUseCustomSubtitles(false);
    setCustomSubtitles([]);
    setCurrentSubtitle('');
    setSelectedExternalSubtitleId(null); // Clear external selection
>>>>>>> origin/main
}, []);

const cycleResizeMode = useCallback(() => {
  if (playerState.resizeMode === 'contain') playerState.setResizeMode('cover');
  else playerState.setResizeMode('contain');
}, [playerState.resizeMode]);

// Memoize selectedTextTrack to prevent unnecessary re-renders
const memoizedSelectedTextTrack = useMemo(() => {
  return tracksHook.selectedTextTrack === -1
    ? { type: 'disabled' as const }
    : { type: 'index' as const, value: tracksHook.selectedTextTrack };
}, [tracksHook.selectedTextTrack]);

return (
  <View style={[styles.container, {
    width: playerState.screenDimensions.width,
    height: playerState.screenDimensions.height,
    position: 'absolute', top: 0, left: 0
  }]}>
    <LoadingOverlay
      visible={!openingAnimation.shouldHideOpeningOverlay}
      backdrop={backdrop || null}
      hasLogo={hasLogo}
      logo={metadata?.logo}
      backgroundFadeAnim={openingAnimation.backgroundFadeAnim}
      backdropImageOpacityAnim={openingAnimation.backdropImageOpacityAnim}
      onClose={handleClose}
      width={playerState.screenDimensions.width}
      height={playerState.screenDimensions.height}
    />

    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {!isTransitioningStream && (
        <VideoSurface
          processedStreamUrl={currentStreamUrl}
          headers={headers}
          volume={volume}
          playbackSpeed={speedControl.playbackSpeed}
          resizeMode={playerState.resizeMode}
          paused={playerState.paused}
          currentStreamUrl={currentStreamUrl}
          toggleControls={toggleControls}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onSeek={(data) => {
            playerState.isSeeking.current = false;
            if (data.currentTime) traktAutosync.handleProgressUpdate(data.currentTime, playerState.duration, true);
          }}
          onEnd={() => {
            if (modals.showEpisodeStreamsModal) return;
            playerState.setPaused(true);
          }}
          onError={(err: any) => {
            logger.error('Video Error', err);

            // Determine the actual error message
            let displayError = 'An unknown error occurred';

            if (typeof err?.error === 'string') {
              displayError = err.error;
            } else if (err?.error?.errorString) {
              displayError = err.error.errorString;
            } else if (err?.errorString) {
              displayError = err.errorString;
            } else if (typeof err === 'string') {
              displayError = err;
            } else {
              displayError = JSON.stringify(err);
            }

            modals.setErrorDetails(displayError);
            modals.setShowErrorModal(true);
          }}
          onBuffer={(buf) => playerState.setIsBuffering(buf.isBuffering)}
          onTracksChanged={(data) => {
            console.log('[AndroidVideoPlayer] onTracksChanged:', data);
            if (data?.audioTracks) {
              const formatted = data.audioTracks.map((t: any) => ({
                id: t.id,
                name: t.name || `Track ${t.id}`,
                language: t.language
              }));
              tracksHook.setRnVideoAudioTracks(formatted);
            }
            if (data?.subtitleTracks) {
              const formatted = data.subtitleTracks.map((t: any) => ({
                id: t.id,
                name: t.name || `Track ${t.id}`,
                language: t.language
              }));
              tracksHook.setRnVideoTextTracks(formatted);
            }
          }}
          mpvPlayerRef={mpvPlayerRef}
          exoPlayerRef={exoPlayerRef}
          pinchRef={pinchRef}
          onPinchGestureEvent={() => { }}
          onPinchHandlerStateChange={() => { }}
          screenDimensions={playerState.screenDimensions}
          decoderMode={settings.decoderMode}
          gpuMode={settings.gpuMode}
          // Dual video engine props
          useExoPlayer={useExoPlayer}
          onCodecError={handleCodecError}
          selectedAudioTrack={tracksHook.selectedAudioTrack as any || undefined}
          selectedTextTrack={memoizedSelectedTextTrack as any}
          // Subtitle Styling - pass to MPV for built-in subtitle customization
          // MPV uses different scaling than React Native, so we apply conversion factors:
          // - Font size: MPV needs ~1.5x larger values (MPV's sub-font-size vs RN fontSize)
          // - Border: MPV needs ~1.5x larger values
          // - Position: MPV sub-pos uses 0=top, 100=bottom, >100=below screen
          subtitleSize={Math.round(subtitleSize * 1.5)}
          subtitleColor={subtitleTextColor}
          subtitleBackgroundOpacity={subtitleBackground ? subtitleBgOpacity : 0}
          subtitleBorderSize={subtitleOutline ? Math.round(subtitleOutlineWidth * 1.5) : 0}
          subtitleBorderColor={subtitleOutlineColor}
          subtitleShadowEnabled={subtitleTextShadow}
          subtitlePosition={Math.max(50, 100 - Math.floor(subtitleBottomOffset * 0.3))} // Scale offset to MPV range
          subtitleDelay={subtitleOffsetSec}
          subtitleAlignment={subtitleAlign}
        />
      )}

      {/* Custom Subtitles for addon subtitles */}
      <CustomSubtitles
        useCustomSubtitles={useCustomSubtitles}
        currentSubtitle={currentSubtitle}
        subtitleSize={subtitleSize}
        subtitleBackground={subtitleBackground}
        zoomScale={1.0}
        textColor={subtitleTextColor}
        backgroundOpacity={subtitleBgOpacity}
        textShadow={subtitleTextShadow}
        outline={subtitleOutline}
        outlineColor={subtitleOutlineColor}
        outlineWidth={subtitleOutlineWidth}
        align={subtitleAlign}
        bottomOffset={subtitleBottomOffset}
        letterSpacing={subtitleLetterSpacing}
        lineHeightMultiplier={subtitleLineHeightMultiplier}
        controlsVisible={playerState.showControls}
        controlsExtraOffset={100}
      />
      <GestureControls
        screenDimensions={playerState.screenDimensions}
        gestureControls={gestureControls}
        onLongPressActivated={speedControl.activateSpeedBoost}
        onLongPressEnd={speedControl.deactivateSpeedBoost}
        onLongPressStateChange={(e) => {
          if (e.nativeEvent.state !== 4 && e.nativeEvent.state !== 2) speedControl.deactivateSpeedBoost();
        }}
        toggleControls={toggleControls}
        showControls={playerState.showControls}
        hideControls={hideControls}
        volume={volume}
        brightness={brightness}
        controlsTimeout={controlsTimeout}
      />

      <PlayerControls
        showControls={playerState.showControls}
        fadeAnim={fadeAnim}
        paused={playerState.paused}
        title={title}
        episodeTitle={episodeTitle}
        season={season}
        episode={episode}
        quality={currentQuality || quality}
        year={year}
        streamProvider={currentStreamProvider || streamProvider}
        streamName={currentStreamName}
        currentTime={playerState.currentTime}
        duration={playerState.duration}
        zoomScale={1}
        currentResizeMode={playerState.resizeMode}
        ksAudioTracks={tracksHook.ksAudioTracks}
        selectedAudioTrack={tracksHook.computedSelectedAudioTrack}
        availableStreams={availableStreams}
        togglePlayback={controlsHook.togglePlayback}
        skip={controlsHook.skip}
        handleClose={handleClose}
        cycleAspectRatio={cycleResizeMode}
        cyclePlaybackSpeed={() => {
          const speeds = [0.5, 1, 1.25, 1.5, 2];
          const idx = speeds.indexOf(speedControl.playbackSpeed);
          const next = speeds[(idx + 1) % speeds.length];
          speedControl.setPlaybackSpeed(next);
        }}
        currentPlaybackSpeed={speedControl.playbackSpeed}
        setShowAudioModal={modals.setShowAudioModal}
        setShowSubtitleModal={modals.setShowSubtitleModal}
        setShowSpeedModal={modals.setShowSpeedModal}
        isSubtitleModalOpen={modals.showSubtitleModal}
        setShowSourcesModal={modals.setShowSourcesModal}
        setShowEpisodesModal={type === 'series' ? modals.setShowEpisodesModal : undefined}
        onSliderValueChange={(val) => { playerState.isDragging.current = true; }}
        onSlidingStart={() => { playerState.isDragging.current = true; }}
        onSlidingComplete={(val) => {
          playerState.isDragging.current = false;
          controlsHook.seekToTime(val);
        }}
        buffered={playerState.buffered}
        formatTime={formatTime}
        playerBackend={useExoPlayer ? 'ExoPlayer' : 'MPV'}
        onSwitchToMPV={handleManualSwitchToMPV}
        useExoPlayer={useExoPlayer}
      />

      <SpeedActivatedOverlay
        visible={speedControl.showSpeedActivatedOverlay}
        opacity={speedControl.speedActivatedOverlayOpacity}
        speed={speedControl.holdToSpeedValue}
        screenDimensions={playerState.screenDimensions}
      />

      <PauseOverlay
        visible={playerState.paused && !playerState.showControls}
        onClose={() => playerState.setShowControls(true)}
        title={title}
        episodeTitle={episodeTitle}
        season={season}
        episode={episode}
        year={year}
        type={type || 'movie'}
        description={nextEpisodeHook.currentEpisodeDescription || ''}
        cast={cast}
        screenDimensions={playerState.screenDimensions}
      />

      {/* Parental Guide Overlay - Shows after controls first hide */}
      <ParentalGuideOverlay
        imdbId={imdbId || (id?.startsWith('tt') ? id : undefined)}
        type={type as 'movie' | 'series'}
        season={season}
        episode={episode}
        shouldShow={playerState.isVideoLoaded && !playerState.showControls && !playerState.paused}
      />

      {/* Skip Intro Button - Shows during intro section of TV episodes */}
      <SkipIntroButton
        imdbId={imdbId || (id?.startsWith('tt') ? id : undefined)}
        type={type || 'movie'}
        season={season}
        episode={episode}
        currentTime={playerState.currentTime}
        onSkip={(endTime) => controlsHook.seekToTime(endTime)}
        controlsVisible={playerState.showControls}
        controlsFixedOffset={100}
      />

      {/* Up Next Button - Shows near end of episodes */}
      <UpNextButton
        type={type || 'movie'}
        nextEpisode={nextEpisodeHook.nextEpisode}
        currentTime={playerState.currentTime}
        duration={playerState.duration}
        insets={insets}
        isLoading={false}
        nextLoadingProvider={null}
        nextLoadingQuality={null}
        nextLoadingTitle={null}
        onPress={() => {
          if (nextEpisodeHook.nextEpisode) {
            logger.log(`[AndroidVideoPlayer] Opening streams for next episode: S${nextEpisodeHook.nextEpisode.season_number}E${nextEpisodeHook.nextEpisode.episode_number}`);
            modals.setSelectedEpisodeForStreams(nextEpisodeHook.nextEpisode);
            modals.setShowEpisodeStreamsModal(true);
          }
        }}
<<<<<<< HEAD
        shouldCancelWhenOutside={false}
        simultaneousHandlers={[]}
      >
        <View style={{
          position: 'absolute',
          top: screenDimensions.height * 0.15,
          left: screenDimensions.width * 0.4, // Start after left gesture area
          width: screenDimensions.width * 0.2, // Center area (20% of screen)
          height: screenDimensions.height * 0.7,
          zIndex: 5, // Lower z-index, controls use box-none to allow touches through
        }} />
      </TapGestureHandler>

      <View
        style={[styles.videoContainer, {
          width: screenDimensions.width,
          height: screenDimensions.height,
        }]}
      >

        <PinchGestureHandler
          ref={pinchRef}
          onGestureEvent={onPinchGestureEvent}
          onHandlerStateChange={onPinchHandlerStateChange}
        >
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: screenDimensions.width,
            height: screenDimensions.height,
          }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={toggleControls}
            >
              {useVLC && !forceVlcRemount ? (
                <VlcVideoPlayer
                  ref={vlcPlayerRef}
                  source={processedStreamUrl}
                  volume={volume}
                  playbackSpeed={playbackSpeed}
                  zoomScale={zoomScale}
                  resizeMode={resizeMode}
                  onLoad={(data) => {
                    vlcLoadedRef.current = true;
                    onLoad(data);
                    // Start playback if not paused
                    if (!paused && vlcPlayerRef.current) {
                      setTimeout(() => {
                        if (vlcPlayerRef.current) {
                          vlcPlayerRef.current.play();
                        }
                      }, 100);
                    }
                  }}
                  onProgress={(data) => {
                    const pos = typeof data?.position === 'number' ? data.position : 0;
                    if (duration > 0) {
                      const current = pos * duration;
                      handleProgress({ currentTime: current, playableDuration: current });
                    }
                  }}
                  onSeek={onSeek}
                  onEnd={onEnd}
                  onError={handleError}
                  onTracksUpdate={handleVlcTracksUpdate}
                  selectedAudioTrack={vlcSelectedAudioTrack}
                  selectedSubtitleTrack={vlcSelectedSubtitleTrack}
                  restoreTime={vlcRestoreTime}
                  forceRemount={forceVlcRemount}
                  key={vlcKey}
                />
              ) : (
                <Video
                  ref={videoRef}
                  style={[styles.video, customVideoStyles]}
                  source={{
                    uri: currentStreamUrl,
                    headers: headers || getStreamHeaders(),
                    type: isHlsStream(currentStreamUrl) ? 'm3u8' : (currentVideoType as any)
                  }}
                  paused={paused}
                  onLoadStart={() => {
                    logger.log('[AndroidVideoPlayer][RN Video] onLoadStart');
                    loadStartAtRef.current = Date.now();

                    // Log stream information for debugging
                    const streamInfo = {
                      url: currentStreamUrl,
                      isHls: isHlsStream(currentStreamUrl),
                      videoType: currentVideoType,
                      headers: headers || getStreamHeaders(),
                      provider: currentStreamProvider || streamProvider
                    };
                    logger.log('[AndroidVideoPlayer][RN Video] Stream info:', streamInfo);
                  }}
                  onProgress={handleProgress}
                  onLoad={(e) => {
                    logger.log('[AndroidVideoPlayer][RN Video] Video loaded successfully');
                    logger.log('[AndroidVideoPlayer][RN Video] onLoad fired', { duration: e?.duration });
                    onLoad(e);
                  }}
                  onReadyForDisplay={() => {
                    firstFrameAtRef.current = Date.now();
                    const startedAt = loadStartAtRef.current;
                    if (startedAt) {
                      const deltaMs = firstFrameAtRef.current - startedAt;
                      logger.log(`[AndroidVideoPlayer] First frame ready after ${deltaMs} ms (${Platform.OS})`);
                    } else {
                      logger.log('[AndroidVideoPlayer] First frame ready (no start timestamp)');
                    }
                  }}
                  onSeek={onSeek}
                  onEnd={onEnd}
                  onError={(err) => {
                    logger.error('[AndroidVideoPlayer][RN Video] Encountered error:', err);
                    handleError(err);
                  }}
                  onBuffer={(buf) => {
                    logger.log('[AndroidVideoPlayer] onBuffer', buf);
                    onBuffer(buf);
                  }}
                  resizeMode={getVideoResizeMode(resizeMode)}
                  selectedAudioTrack={selectedAudioTrack || undefined}
                  selectedTextTrack={useCustomSubtitles ? { type: SelectedTrackType.DISABLED } : (selectedTextTrack >= 0 ? { type: SelectedTrackType.INDEX, value: selectedTextTrack } : undefined)}
                  rate={playbackSpeed}
                  volume={volume}
                  muted={false}
                  repeat={false}
                  playInBackground={false}
                  playWhenInactive={false}
                  ignoreSilentSwitch="ignore"
                  mixWithOthers="inherit"
                  progressUpdateInterval={500}
                  // Remove artificial bit rate cap to allow high-bitrate streams (e.g., Blu-ray remux) to play
                  // maxBitRate intentionally omitted
                  disableFocus={true}
                  // iOS AVPlayer optimization
                  allowsExternalPlayback={false as any}
                  preventsDisplaySleepDuringVideoPlayback={true as any}
                  // ExoPlayer HLS optimization - let the player use optimal defaults
                  // Use surfaceView on Android for improved compatibility
                  viewType={Platform.OS === 'android' ? ViewType.SURFACE : undefined}
                />
              )}
            </TouchableOpacity>
          </View>
        </PinchGestureHandler>

        {/* Tap-capture overlay above the Video to toggle controls (Android fix) */}
        <TouchableWithoutFeedback onPress={toggleControls}>
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents={showControls ? 'none' : 'auto'}
          />
        </TouchableWithoutFeedback>

        <PlayerControls
          showControls={showControls}
          fadeAnim={fadeAnim}
          paused={paused}
          title={title}
          episodeTitle={episodeTitle}
          season={season}
          episode={episode}
          quality={currentQuality || quality}
          year={year}
          streamProvider={currentStreamProvider || streamProvider}
          streamName={currentStreamName}
          currentTime={currentTime}
          duration={duration}
          zoomScale={zoomScale}
          currentResizeMode={resizeMode}
          ksAudioTracks={ksAudioTracks}
          selectedAudioTrack={computedSelectedAudioTrack}
          availableStreams={availableStreams}
          togglePlayback={togglePlayback}
          skip={skip}
          handleClose={handleClose}
          cycleAspectRatio={cycleAspectRatio}
          cyclePlaybackSpeed={cyclePlaybackSpeed}
          currentPlaybackSpeed={playbackSpeed}
          setShowAudioModal={setShowAudioModal}
          setShowSubtitleModal={setShowSubtitleModal}
          setShowSpeedModal={setShowSpeedModal}
          isSubtitleModalOpen={showSubtitleModal}
          setShowSourcesModal={setShowSourcesModal}
          setShowEpisodesModal={type === 'series' ? setShowEpisodesModal : undefined}
          onSliderValueChange={handleSliderValueChange}
          onSlidingStart={handleSlidingStart}
          onSlidingComplete={handleSlidingComplete}
          buffered={buffered}
          formatTime={formatTime}
          playerBackend={useVLC ? 'VLC' : 'ExoPlayer'}
        />

        {/* Combined Volume & Brightness Gesture Indicator - NEW PILL STYLE (No Bar) */}
        {(gestureControls.showVolumeOverlay || gestureControls.showBrightnessOverlay) && (
          <View style={localStyles.gestureIndicatorContainer}>
            {/* Dynamic Icon */}
            <View
              style={[
                localStyles.iconWrapper,
                {
                  // Conditional Background Color Logic
                  backgroundColor: gestureControls.showVolumeOverlay && volume === 0
                    ? 'rgba(242, 184, 181)'
                    : 'rgba(59, 59, 59)'
                }
              ]}
            >
              <MaterialIcons
                name={
                  gestureControls.showVolumeOverlay
                    ? getVolumeIcon(volume)
                    : getBrightnessIcon(brightness)
                }
                size={24} // Reduced size to fit inside a 32-40px circle better
                color={
                  gestureControls.showVolumeOverlay && volume === 0
                    ? 'rgba(96, 20, 16)' // Bright RED for MUTE icon itself
                    : 'rgba(255, 255, 255)' // White for all other states
                }
              />
            </View>

            {/* Text Label: Shows "Muted" or percentage */}
            <Text
              style={[
                localStyles.gestureText,
                // Conditional Text Color Logic
                gestureControls.showVolumeOverlay && volume === 0 && { color: 'rgba(242, 184, 181)' } // Light RED for "Muted"
              ]}
            >
              {/* Conditional Text Content Logic */}
              {gestureControls.showVolumeOverlay && volume === 0
                ? "Muted" // Display "Muted" when volume is 0
                : `${Math.round((gestureControls.showVolumeOverlay ? volume : brightness) * 100)}%` // Display percentage otherwise
              }
            </Text>
          </View>
        )}

        {/* TV Remote Seek Indicator Overlay */}
        {Platform.isTV && tvSeekIndicator && (
          <View style={localStyles.tvSeekIndicatorContainer}>
            <View style={localStyles.tvSeekIndicatorPill}>
              <MaterialIcons
                name={tvSeekIndicator.startsWith('+') ? 'fast-forward' : 'fast-rewind'}
                size={28}
                color="#FFFFFF"
              />
              <Text style={localStyles.tvSeekIndicatorText}>{tvSeekIndicator}</Text>
            </View>
          </View>
        )}

        {showPauseOverlay && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={hidePauseOverlay}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: pauseOverlayOpacity,
              }}
            >
              {/* Strong horizontal fade from left side */}
              <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: screenDimensions.width * 0.7 }}>
                <LinearGradient
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.0)']}
                  locations={[0, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <LinearGradient
                colors={[
                  'rgba(0,0,0,0.6)',
                  'rgba(0,0,0,0.4)',
                  'rgba(0,0,0,0.2)',
                  'rgba(0,0,0,0.0)'
                ]}
                locations={[0, 0.3, 0.6, 1]}
                style={StyleSheet.absoluteFill}
              />
              <Animated.View style={{
                position: 'absolute',
                left: 24 + insets.left,
                right: 24 + insets.right,
                top: 24 + insets.top,
                bottom: 110 + insets.bottom,
                transform: [{ translateY: pauseOverlayTranslateY }]
              }}>
                {showCastDetails && selectedCastMember ? (
                  // Cast Detail View with fade transition
                  <Animated.View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      opacity: castDetailsOpacity,
                      transform: [{
                        scale: castDetailsScale
                      }]
                    }}
                  >
                    <View style={{
                      alignItems: 'flex-start',
                      paddingBottom: screenDimensions.height * 0.1
                    }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 24,
                          paddingVertical: 8,
                          paddingHorizontal: 4
                        }}
                        onPress={() => {
                          // Animate cast details out, then metadata back in
                          Animated.parallel([
                            Animated.timing(castDetailsOpacity, {
                              toValue: 0,
                              duration: 250,
                              useNativeDriver: true,
                            }),
                            Animated.timing(castDetailsScale, {
                              toValue: 0.95,
                              duration: 250,
                              useNativeDriver: true,
                            })
                          ]).start(() => {
                            setShowCastDetails(false);
                            setSelectedCastMember(null);
                            // Animate metadata back in
                            Animated.parallel([
                              Animated.timing(metadataOpacity, {
                                toValue: 1,
                                duration: 400,
                                useNativeDriver: true,
                              }),
                              Animated.spring(metadataScale, {
                                toValue: 1,
                                tension: 80,
                                friction: 8,
                                useNativeDriver: true,
                              })
                            ]).start();
                          });
                        }}
                      >
                        <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={{
                          color: '#B8B8B8',
                          fontSize: Math.min(14, screenDimensions.width * 0.02)
                        }}>Back to details</Text>
                      </TouchableOpacity>

                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        width: '100%'
                      }}>
                        {selectedCastMember.profile_path && (
                          <View style={{
                            marginRight: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5,
                          }}>
                            <FastImage
                              source={{ uri: `https://image.tmdb.org/t/p/w300${selectedCastMember.profile_path}` }}
                              style={{
                                width: Math.min(120, screenDimensions.width * 0.18),
                                height: Math.min(180, screenDimensions.width * 0.27), // Proper aspect ratio 2:3
                                borderRadius: 12,
                                backgroundColor: 'rgba(255,255,255,0.1)'
                              }}
                              resizeMode={FastImage.resizeMode.cover}
                            />
                          </View>
                        )}
                        <View style={{
                          flex: 1,
                          paddingTop: 8
                        }}>
                          <Text style={{
                            color: '#FFFFFF',
                            fontSize: Math.min(32, screenDimensions.width * 0.045),
                            fontWeight: '800',
                            marginBottom: 8,
                            lineHeight: Math.min(38, screenDimensions.width * 0.05)
                          }} numberOfLines={2}>
                            {selectedCastMember.name}
                          </Text>
                          {selectedCastMember.character && (
                            <Text style={{
                              color: '#CCCCCC',
                              fontSize: Math.min(16, screenDimensions.width * 0.022),
                              marginBottom: 8,
                              fontWeight: '500',
                              fontStyle: 'italic'
                            }} numberOfLines={2}>
                              as {selectedCastMember.character}
                            </Text>
                          )}

                          {/* Biography if available */}
                          {selectedCastMember.biography && (
                            <Text style={{
                              color: '#D6D6D6',
                              fontSize: Math.min(14, screenDimensions.width * 0.019),
                              lineHeight: Math.min(20, screenDimensions.width * 0.026),
                              marginTop: 16,
                              opacity: 0.9
                            }} numberOfLines={4}>
                              {selectedCastMember.biography}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                ) : (
                  // Default Metadata View
                  <Animated.View style={{
                    flex: 1,
                    justifyContent: 'space-between',
                    opacity: metadataOpacity,
                    transform: [{ scale: metadataScale }]
                  }}>
                    <View>
                      <Text style={{
                        color: '#B8B8B8',
                        fontSize: Math.min(18, screenDimensions.width * 0.025),
                        marginBottom: 8
                      }}>You're watching</Text>
                      <Text style={{
                        color: '#FFFFFF',
                        fontSize: Math.min(48, screenDimensions.width * 0.06),
                        fontWeight: '800',
                        marginBottom: 10
                      }} numberOfLines={2}>
                        {title}
                      </Text>
                      {!!year && (
                        <Text style={{
                          color: '#CCCCCC',
                          fontSize: Math.min(18, screenDimensions.width * 0.025),
                          marginBottom: 8
                        }} numberOfLines={1}>
                          {`${year}${type === 'series' && season && episode ? ` • S${season}E${episode}` : ''}`}
                        </Text>
                      )}
                      {!!episodeTitle && (
                        <Text style={{
                          color: '#FFFFFF',
                          fontSize: Math.min(20, screenDimensions.width * 0.03),
                          fontWeight: '600',
                          marginBottom: 8
                        }} numberOfLines={2}>
                          {episodeTitle}
                        </Text>
                      )}
                      {(currentEpisodeDescription || metadata?.description) && (
                        <Text style={{
                          color: '#D6D6D6',
                          fontSize: Math.min(18, screenDimensions.width * 0.025),
                          lineHeight: Math.min(24, screenDimensions.width * 0.03)
                        }} numberOfLines={3}>
                          {(type as any) === 'series' ? (currentEpisodeDescription || metadata?.description || '') : (metadata?.description || '')}
                        </Text>
                      )}
                      {cast && cast.length > 0 && (
                        <View style={{ marginTop: 16 }}>
                          <Text style={{
                            color: '#B8B8B8',
                            fontSize: Math.min(16, screenDimensions.width * 0.022),
                            marginBottom: 8
                          }}>Cast</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {cast.slice(0, 6).map((castMember: any, index: number) => (
                              <TouchableOpacity
                                key={castMember.id || index}
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.1)',
                                  borderRadius: 12,
                                  paddingHorizontal: Math.min(12, screenDimensions.width * 0.015),
                                  paddingVertical: Math.min(6, screenDimensions.height * 0.008),
                                  marginRight: 8,
                                  marginBottom: 8,
                                }}
                                onPress={() => {
                                  setSelectedCastMember(castMember);
                                  // Animate metadata out, then cast details in
                                  Animated.parallel([
                                    Animated.timing(metadataOpacity, {
                                      toValue: 0,
                                      duration: 250,
                                      useNativeDriver: true,
                                    }),
                                    Animated.timing(metadataScale, {
                                      toValue: 0.95,
                                      duration: 250,
                                      useNativeDriver: true,
                                    })
                                  ]).start(() => {
                                    setShowCastDetails(true);
                                    // Animate cast details in
                                    Animated.parallel([
                                      Animated.timing(castDetailsOpacity, {
                                        toValue: 1,
                                        duration: 400,
                                        useNativeDriver: true,
                                      }),
                                      Animated.spring(castDetailsScale, {
                                        toValue: 1,
                                        tension: 80,
                                        friction: 8,
                                        useNativeDriver: true,
                                      })
                                    ]).start();
                                  });
                                }}
                              >
                                <Text style={{
                                  color: '#FFFFFF',
                                  fontSize: Math.min(14, screenDimensions.width * 0.018)
                                }}>
                                  {castMember.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                )}
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Next Episode Button (reusable) */}
        <UpNextButton
          type={type as any}
          nextEpisode={nextEpisode as any}
          currentTime={currentTime}
          duration={duration}
          insets={{ top: insets.top, right: insets.right, bottom: insets.bottom, left: insets.left }}
          isLoading={isLoadingNextEpisode}
          nextLoadingProvider={nextLoadingProvider}
          nextLoadingQuality={nextLoadingQuality}
          nextLoadingTitle={nextLoadingTitle}
          onPress={handlePlayNextEpisode}
          metadata={metadata ? { poster: metadata.poster, id: metadata.id } : undefined}
          controlsVisible={showControls}
          controlsFixedOffset={Math.min(Dimensions.get('window').width, Dimensions.get('window').height) >= 768 ? 120 : 100}
        />

        <CustomSubtitles
          key={customSubtitleVersion}
          useCustomSubtitles={useCustomSubtitles}
          currentSubtitle={currentSubtitle}
          subtitleSize={subtitleSize}
          subtitleBackground={subtitleBackground}
          zoomScale={zoomScale}
          textColor={subtitleTextColor}
          backgroundOpacity={subtitleBgOpacity}
          textShadow={subtitleTextShadow}
          outline={subtitleOutline}
          outlineColor={subtitleOutlineColor}
          outlineWidth={subtitleOutlineWidth}
          align={subtitleAlign}
          bottomOffset={subtitleBottomOffset}
          letterSpacing={subtitleLetterSpacing}
          lineHeightMultiplier={subtitleLineHeightMultiplier}
          formattedSegments={currentFormattedSegments}
          controlsVisible={showControls}
          controlsFixedOffset={Math.min(Dimensions.get('window').width, Dimensions.get('window').height) >= 768 ? 120 : 100}
        />

        {/* Speed Activated Overlay */}
        {showSpeedActivatedOverlay && (
          <Animated.View
            style={{
              position: 'absolute',
              top: screenDimensions.height * 0.06,
              left: screenDimensions.width / 2 - 40,
              opacity: speedActivatedOverlayOpacity,
              zIndex: 1000,
            }}
          >
            <View style={{
              backgroundColor: 'rgba(25, 25, 25, 0.6)',
              borderRadius: 35,
              paddingHorizontal: 12,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '600',
                letterSpacing: 0.5,
              }}>
                {holdToSpeedValue}x Speed
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Resume overlay removed when AlwaysResume is enabled; overlay component omitted */}
      </View>
    </Animated.View>


    <>
      <AudioTrackModal
        showAudioModal={showAudioModal}
        setShowAudioModal={setShowAudioModal}
        ksAudioTracks={useVLC ? vlcAudioTracks : rnVideoAudioTracks}
        selectedAudioTrack={useVLC ? (vlcSelectedAudioTrack ?? null) : (selectedAudioTrack?.type === SelectedTrackType.INDEX && selectedAudioTrack.value !== undefined ? Number(selectedAudioTrack.value) : null)}
        selectAudioTrack={selectAudioTrackById}
=======
          metadata={metadataResult?.metadata ? { poster: metadataResult.metadata.poster, id: metadataResult.metadata.id } : undefined}
          controlsVisible={playerState.showControls}
          controlsFixedOffset={100}
>>>>>>> origin/main
      />
    </View>

    <AudioTrackModal
      showAudioModal={modals.showAudioModal}
      setShowAudioModal={modals.setShowAudioModal}
      ksAudioTracks={tracksHook.ksAudioTracks}
      selectedAudioTrack={tracksHook.computedSelectedAudioTrack}
      selectAudioTrack={(trackId) => {
        tracksHook.setSelectedAudioTrack(trackId === null ? null : { type: 'index', value: trackId });
        // Actually tell MPV to switch the audio track
        if (trackId !== null && mpvPlayerRef.current) {
          mpvPlayerRef.current.setAudioTrack(trackId);
        }
      }}
    />

    <SubtitleModals
      showSubtitleModal={modals.showSubtitleModal}
      setShowSubtitleModal={modals.setShowSubtitleModal}
      showSubtitleLanguageModal={false}
      setShowSubtitleLanguageModal={() => { }}
      isLoadingSubtitleList={isLoadingSubtitleList}
      isLoadingSubtitles={isLoadingSubtitles}
      customSubtitles={[]}
      availableSubtitles={availableSubtitles}
      ksTextTracks={tracksHook.ksTextTracks}
      selectedTextTrack={tracksHook.computedSelectedTextTrack}
      useCustomSubtitles={useCustomSubtitles}
      isKsPlayerActive={true}
      useExoPlayer={useExoPlayer}
      subtitleSize={subtitleSize}
      subtitleBackground={subtitleBackground}
      fetchAvailableSubtitles={fetchAvailableSubtitles}
      loadWyzieSubtitle={loadWyzieSubtitle}
      selectTextTrack={(trackId) => {
        tracksHook.setSelectedTextTrack(trackId);
        // For MPV, manually switch the subtitle track
        if (!useExoPlayer && mpvPlayerRef.current) {
          mpvPlayerRef.current.setSubtitleTrack(trackId);
        }
        // For ExoPlayer, the selectedTextTrack prop will be updated via memoizedSelectedTextTrack
        // which triggers a re-render with the new track selection
        // Disable custom subtitles when selecting built-in track
        setUseCustomSubtitles(false);
        modals.setShowSubtitleModal(false);
      }}
      disableCustomSubtitles={disableCustomSubtitles}
      increaseSubtitleSize={() => setSubtitleSize(prev => Math.min(prev + 2, 60))}
      decreaseSubtitleSize={() => setSubtitleSize(prev => Math.max(prev - 2, 12))}
      toggleSubtitleBackground={() => setSubtitleBackground(prev => !prev)}
      subtitleTextColor={subtitleTextColor}
      setSubtitleTextColor={setSubtitleTextColor}
      subtitleBgOpacity={subtitleBgOpacity}
      setSubtitleBgOpacity={setSubtitleBgOpacity}
      subtitleTextShadow={subtitleTextShadow}
      setSubtitleTextShadow={setSubtitleTextShadow}
      subtitleOutline={subtitleOutline}
      setSubtitleOutline={setSubtitleOutline}
      subtitleOutlineColor={subtitleOutlineColor}
      setSubtitleOutlineColor={setSubtitleOutlineColor}
      subtitleOutlineWidth={subtitleOutlineWidth}
      setSubtitleOutlineWidth={setSubtitleOutlineWidth}
      subtitleAlign={subtitleAlign}
      setSubtitleAlign={setSubtitleAlign}
      subtitleBottomOffset={subtitleBottomOffset}
      setSubtitleBottomOffset={setSubtitleBottomOffset}
      subtitleLetterSpacing={subtitleLetterSpacing}
      setSubtitleLetterSpacing={setSubtitleLetterSpacing}
      subtitleLineHeightMultiplier={subtitleLineHeightMultiplier}
      setSubtitleLineHeightMultiplier={setSubtitleLineHeightMultiplier}
      subtitleOffsetSec={subtitleOffsetSec}
      setSubtitleOffsetSec={setSubtitleOffsetSec}
      selectedExternalSubtitleId={selectedExternalSubtitleId}
      onOpenSyncModal={() => setShowSyncModal(true)}
    />

    {/* Visual Subtitle Sync Modal */}
    <SubtitleSyncModal
      visible={showSyncModal}
      onClose={() => setShowSyncModal(false)}
      onConfirm={(offset) => setSubtitleOffsetSec(offset)}
      currentOffset={subtitleOffsetSec}
      currentTime={playerState.currentTime}
      subtitles={customSubtitles}
      primaryColor={currentTheme.colors.primary}
    />

    <SourcesModal
      showSourcesModal={modals.showSourcesModal}
      setShowSourcesModal={modals.setShowSourcesModal}
      availableStreams={availableStreams}
      currentStreamUrl={currentStreamUrl}
      onSelectStream={(stream) => handleSelectStream(stream)}
    />

    <SpeedModal
      showSpeedModal={modals.showSpeedModal}
      setShowSpeedModal={modals.setShowSpeedModal}
      currentSpeed={speedControl.playbackSpeed}
      setPlaybackSpeed={speedControl.setPlaybackSpeed}
      holdToSpeedEnabled={speedControl.holdToSpeedEnabled}
      setHoldToSpeedEnabled={speedControl.setHoldToSpeedEnabled}
      holdToSpeedValue={speedControl.holdToSpeedValue}
      setHoldToSpeedValue={speedControl.setHoldToSpeedValue}
    />

    <EpisodesModal
      showEpisodesModal={modals.showEpisodesModal}
      setShowEpisodesModal={modals.setShowEpisodesModal}
      groupedEpisodes={groupedEpisodes || (metadataResult as any)?.groupedEpisodes}
      currentEpisode={season && episode ? { season, episode } : undefined}
      metadata={metadata}
      onSelectEpisode={(ep) => {
        modals.setSelectedEpisodeForStreams(ep);
        modals.setShowEpisodesModal(false);
        modals.setShowEpisodeStreamsModal(true);
      }}
    />

<<<<<<< HEAD
{/* Error Modal */ }
{
  isMounted.current && (
    <Modal
      visible={showErrorModal}
      transparent
      animationType="fade"
      onRequestClose={handleErrorExit}
      supportedOrientations={['landscape', 'portrait', 'landscape-left', 'landscape-right']}
      statusBarTranslucent={true}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)'
      }}>
        <View style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 14,
          width: '85%',
          maxHeight: '70%',
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <MaterialIcons name="error" size={24} color="#ff4444" style={{ marginRight: 8 }} />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#ffffff',
              flex: 1
            }}>Playback Error</Text>
            <Focusable onPress={handleErrorExit}>
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </Focusable>
          </View>
=======
>>>>>>> origin/main


          <ErrorModal
            showErrorModal={modals.showErrorModal}
            setShowErrorModal={modals.setShowErrorModal}
            errorDetails={modals.errorDetails}
            onDismiss={handleClose}
          />

<<<<<<< HEAD
  <View style={{
    flexDirection: 'row',
    justifyContent: 'flex-end'
  }}>
    <Focusable
      style={{
        backgroundColor: '#ff4444',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20
      }}
      onPress={handleErrorExit}
      hasTVPreferredFocus={Platform.isTV}
    >
      <Text style={{
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16
      }}>Exit Player</Text>
    </Focusable>
  </View>
=======
      <EpisodeStreamsModal
        visible={modals.showEpisodeStreamsModal}
        onClose={() => modals.setShowEpisodeStreamsModal(false)}
        episode={modals.selectedEpisodeForStreams}
        onSelectStream={handleEpisodeStreamSelect}
        metadata={{ id: id, name: title }}
      />

      {/* MPV Switch Confirmation Alert */}
      <CustomAlert
        visible={showMpvSwitchAlert}
        title="Switch to MPV Player?"
        message="This will switch from ExoPlayer to MPV player. Use this if you're facing playback issues that don't automatically switch to MPV. The switch cannot be undone during this playback session."
        onClose={() => setShowMpvSwitchAlert(false)}
        actions={[
          {
            label: 'Cancel',
            onPress: () => setShowMpvSwitchAlert(false),
          },
          {
            label: 'Switch to MPV',
            onPress: () => {
              setShowMpvSwitchAlert(false);
              confirmSwitchToMPV();
            },
          },
        ]}
      />
>>>>>>> origin/main

    </View >
  );
};

<<<<<<< HEAD
// New styles for the gesture indicator
const localStyles = StyleSheet.create({
  gestureIndicatorContainer: {
    position: 'absolute',
    top: '4%', // Adjust this for vertical position
    alignSelf: 'center', // Adjust this for horizontal position
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25)', // Dark pill background
    borderRadius: 70,
    paddingHorizontal: 15,
    paddingVertical: 15,
    zIndex: 2000, // Very high z-index to ensure visibility
    minWidth: 120, // Adjusted min width since bar is removed
  },
  iconWrapper: {
    borderRadius: 50, // Makes it a perfect circle (set to a high number)
    width: 40,        // Define the diameter of the circle
    height: 40,       // Define the diameter of the circle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,  // Margin to separate icon circle from percentage text
  },
  gestureText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'normal',
    minWidth: 35,
    textAlign: 'right',
  },
  // TV Remote Seek Indicator styles
  tvSeekIndicatorContainer: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    transform: [{ translateY: -30 }],
    zIndex: 2001,
  },
  tvSeekIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 40,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tvSeekIndicatorText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 12,
  },
});

=======
>>>>>>> origin/main
export default AndroidVideoPlayer;
