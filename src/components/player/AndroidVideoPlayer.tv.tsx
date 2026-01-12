import { toast } from '@backpackapp-io/react-native-toast';
import FastImage from '@d11/react-native-fast-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Brightness from 'expo-brightness';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Animated,
  ToastAndroid,
  Dimensions,
  StatusBar,
  NativeModules,
} from 'react-native';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  State,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
  TapGestureHandlerGestureEvent,
  LongPressGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import RNImmersiveMode from 'react-native-immersive-mode';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  usePlayerState,
  usePlayerModals,
  useSpeedControl,
  useOpeningAnimation,
  useWatchProgress,
  usePlayerTracks,
  usePlayerSetup,
  usePlayerControls,
  useNextEpisode,
} from './hooks';
import { useMetadata } from '../../hooks/useMetadata';
import { usePlayerGestureControls } from '../../hooks/usePlayerGestureControls';
import { useSettings } from '../../hooks/useSettings';
import { useTraktAutosync } from '../../hooks/useTraktAutosync';
import { RootStackParamList } from '../../navigation/AppNavigator';

import { mmkvStorage } from '../../services/mmkvStorage';
import { storageService } from '../../services/storageService';
import { logger } from '../../utils/logger';


import { useTraktAutosyncSettings } from '../../hooks/useTraktAutosyncSettings';
import { useTVEventHandler } from '../../hooks/useTVEventHandler';

// Shared Hooks (cross-platform)

// Speed settings storage key
const SPEED_SETTINGS_KEY = '@nuvio_speed_settings';

// TV Remote seek settings storage key
const TV_SEEK_SETTINGS_KEY = '@nuvio_tv_seek_settings';
const DEFAULT_TV_SEEK_SECONDS = 10;
const END_EPSILON = 0.5;
const TV_HOLD_SEEK_INTERVAL_MS = 200; // How often to seek when holding direction
import { PlayerSetupConfig } from './hooks/usePlayerSetup';
import {
  safeDebugLog,
  parseSRT,
  DEBUG_MODE,
  formatTime,
  isHlsStream,
  getHlsHeaders,
  defaultAndroidHeaders,
} from './utils/playerUtils';
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
import PlayerControls from './controls/PlayerControls';
import LoadingOverlay from './modals/LoadingOverlay';

// Android-specific components
import { VideoSurface } from './android/components/VideoSurface';
import { MpvPlayerRef } from './android/MpvPlayer';

// Utils
import stremioService from '../../services/stremioService';
import {
  WyzieSubtitle,
  SubtitleCue,
  ResizeModeType,
  AudioTrack,
  TextTrack,
} from './utils/playerTypes';
import { findBestSubtitleTrack, findBestAudioTrack } from './utils/trackSelectionUtils';
import { useTheme } from '../../contexts/ThemeContext';

import axios from 'axios';

const AndroidVideoPlayer: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PlayerAndroid'>>();
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();

  // Route Params
  const {
    uri,
    title = 'Episode Name',
    season,
    episode,
    episodeTitle,
    quality,
    year,
    streamProvider,
    streamName,
    headers,
    id,
    type,
    episodeId,
    imdbId,
    availableStreams: passedAvailableStreams,
    backdrop,
    groupedEpisodes,
    initialPosition,
  } = route.params as any;

  // Global Hooks
  const { settings } = useSettings();
  const playerState = usePlayerState();
  const {
    paused,
    setPaused,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    isSeeking,
    isMounted,
    showControls,
    setShowControls,
    isPlayerReady,
    setIsPlayerReady,
    isVideoLoaded,
    setIsVideoLoaded,
    screenDimensions,
    setScreenDimensions,
    videoAspectRatio,
    setVideoAspectRatio,
    resizeMode,
    setResizeMode,
    zoomScale,
    setZoomScale,
  } = playerState;
  const modals = usePlayerModals();
  const speedControl = useSpeedControl();
  const tracksHook = usePlayerTracks();

  // Destructure logic from hooks
  const { playbackSpeed, setPlaybackSpeed } = speedControl;

  // Metadata Hook (Must be before OpeningAnimation)
  const metadataResult = useMetadata({ id: id || 'placeholder', type: type as any });
  const { metadata, cast } = id && type ? (metadataResult as any) : { metadata: null, cast: [] };
  const hasLogo = metadata && metadata.logo;

  // Opening Animation Hook
  const openingAnimation = useOpeningAnimation(backdrop, metadata);
  const { completeOpeningAnimation } = openingAnimation;

  // Next Episode Hook
  const nextEpisodeHook = useNextEpisode({
    type: (route.params as any).type,
    season: (route.params as any).season,
    episode: (route.params as any).episode,
    groupedEpisodes: (route.params as any).groupedEpisodes,
    episodeId: (route.params as any).episodeId,
  });
  const { nextEpisode } = nextEpisodeHook;

  // Refs
  const videoRef = useRef<any>(null);
  const mpvPlayerRef = useRef<MpvPlayerRef>(null);
  const exoPlayerRef = useRef<any>(null);
  const pinchRef = useRef(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasExoPlayerFailed = useRef(false);
  const hasAppliedEngineSettingRef = useRef(false);

  // Animation Refs
  const pauseOverlayOpacity = useRef(new Animated.Value(0)).current;
  const pauseOverlayTranslateY = useRef(new Animated.Value(20)).current;
  const castDetailsOpacity = useRef(new Animated.Value(0)).current;
  const castDetailsScale = useRef(new Animated.Value(0.95)).current;
  const metadataOpacity = useRef(new Animated.Value(1)).current;
  const metadataScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Timer/Logic Refs
  const pauseOverlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tvSeekIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tvHoldSeekActiveRef = useRef<string | boolean | null>(false);
  const tvHoldSeekIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSelectedTracks = useRef(false);
  const previousVideoRef = useRef<{ uri?: string; episodeId?: string }>({});

  // System Refs
  const originalSystemBrightnessModeRef = useRef<any>(null);
  const originalSystemBrightnessRef = useRef<number | null>(null);
  const isAppBackgrounded = useRef(false);

  // Constants
  const useVLC = settings.videoPlayerEngine === 'mpv' && Platform.OS === 'android';
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const tvSeekSeconds = 10;

  // State: Player Engine
  const shouldUseMpvOnly = settings.videoPlayerEngine === 'mpv';
  const [useExoPlayer, setUseExoPlayer] = useState(!shouldUseMpvOnly);
  const [showMpvSwitchAlert, setShowMpvSwitchAlert] = useState(false);

  // State: Local UI & Media
  const [showPauseOverlay, setShowPauseOverlay] = useState(false);
  const [showCastDetails, setShowCastDetails] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  const [progressSaveInterval, setProgressSaveInterval] = useState<NodeJS.Timeout | null>(null);

  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>(uri);
  const [currentVideoType, setCurrentVideoType] = useState<string | undefined>(
    (route.params as any).videoType
  );
  const [availableStreams, setAvailableStreams] = useState<any>(passedAvailableStreams || {});
  const [currentQuality, setCurrentQuality] = useState(quality);
  const [currentStreamProvider, setCurrentStreamProvider] = useState(streamProvider);
  const [currentStreamName, setCurrentStreamName] = useState(streamName);
  const [isTransitioningStream, setIsTransitioningStream] = useState(false);

  const [savedDuration, setSavedDuration] = useState(0);
  const [isInitialSeekComplete, setIsInitialSeekComplete] = useState(false);
  const [isSyncingBeforeClose, setIsSyncingBeforeClose] = useState(false);
  const [tvSeekIndicator, setTvSeekIndicator] = useState<string | boolean>(false);
  const [volume, setVolume] = useState(1.0);
  const [brightness, setBrightness] = useState(1.0);

  // State: Next Episode Loading
  const [isLoadingNextEpisode, setIsLoadingNextEpisode] = useState(false);
  const [nextLoadingProvider, setNextLoadingProvider] = useState<string | null>(null);
  const [nextLoadingQuality, setNextLoadingQuality] = useState<string | null>(null);
  const [nextLoadingTitle, setNextLoadingTitle] = useState<string | null>(null);

  // State: Subtitles
  const [availableSubtitles, setAvailableSubtitles] = useState<WyzieSubtitle[]>([]);
  const [isLoadingSubtitleList, setIsLoadingSubtitleList] = useState(false);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [useCustomSubtitles, setUseCustomSubtitles] = useState(false);
  const [customSubtitles, setCustomSubtitles] = useState<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [selectedExternalSubtitleId, setSelectedExternalSubtitleId] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [subtitleOffsetSec, setSubtitleOffsetSec] = useState(0);

  // State: Subtitle Customization
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
  const subtitleLineHeightMultiplierState = useState(1.2);
  const [subtitleLineHeightMultiplier, setSubtitleLineHeightMultiplier] =
    subtitleLineHeightMultiplierState;

  const setupHook = usePlayerSetup({
    setScreenDimensions: playerState.setScreenDimensions,
    setVolume,
    setBrightness,
    isOpeningAnimationComplete: openingAnimation.isOpeningAnimationComplete,
    paused: playerState.paused,
  });

  // Player Controls Hook
  const controlsHook = usePlayerControls({
    playerRef: useExoPlayer ? exoPlayerRef : mpvPlayerRef,
    paused: playerState.paused,
    setPaused: playerState.setPaused,
    currentTime: playerState.currentTime,
    duration: playerState.duration,
    isSeeking: playerState.isSeeking,
    isMounted: playerState.isMounted,
  });
  const { seekToTime } = controlsHook;

  // Callbacks
  const toggleControls = useCallback(() => {
    playerState.setShowControls(prev => !prev);
  }, []);

  const hideControls = useCallback(() => {
    if (playerState.isDragging.current) return;
    playerState.setShowControls(false);
  }, []);

  const resetTVControlsTimeout = useCallback(() => {
    if (playerState.showControls) {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(hideControls, 5000);
    }
  }, [playerState.showControls, hideControls]);

  const togglePlayback = useCallback(() => {
    if (playerState.paused) {
      playerState.setPaused(false);
      resetTVControlsTimeout();
    } else {
      playerState.setPaused(true);
      playerState.setShowControls(true);
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    }
  }, [
    playerState.paused,
    playerState.setPaused,
    playerState.setShowControls,
    resetTVControlsTimeout,
  ]);

  const handleCodecError = useCallback(() => {
    if (!hasExoPlayerFailed.current) {
      hasExoPlayerFailed.current = true;
      logger.warn('[AndroidVideoPlayer] ExoPlayer codec error detected, switching to MPV silently');
      ToastAndroid.show('Switching to MPV due to playback issue', ToastAndroid.SHORT);
      setUseExoPlayer(false);
    }
  }, []);

  const handleManualSwitchToMPV = useCallback(() => {
    if (useExoPlayer && !hasExoPlayerFailed.current) {
      setShowMpvSwitchAlert(true);
    }
  }, [useExoPlayer]);

  const confirmSwitchToMPV = useCallback(() => {
    hasExoPlayerFailed.current = true;
    logger.info('[AndroidVideoPlayer] User confirmed switch to MPV');
    ToastAndroid.show('Switching to MPV player...', ToastAndroid.SHORT);
    const currentPos = playerState.currentTime;
    setUseExoPlayer(false);
    setTimeout(() => {
      if (mpvPlayerRef.current && currentPos > 0) {
        mpvPlayerRef.current.seek(currentPos);
      }
    }, 500);
  }, [playerState.currentTime]);

  const disableCustomSubtitles = useCallback(() => {
    setUseCustomSubtitles(false);
    setCustomSubtitles([]);
    setCurrentSubtitle('');
    setSelectedExternalSubtitleId(null);
  }, []);

  const cycleResizeMode = useCallback(() => {
    if (playerState.resizeMode === 'contain') playerState.setResizeMode('cover');
    else playerState.setResizeMode('contain');
  }, [playerState.resizeMode]);

  // Effects
  useEffect(() => {
    if (!hasAppliedEngineSettingRef.current && settings.videoPlayerEngine === 'mpv') {
      hasAppliedEngineSettingRef.current = true;
      setUseExoPlayer(false);
    }
  }, [settings.videoPlayerEngine]);

  useEffect(() => {
    const currentVideo = { uri, episodeId };
    const previousVideo = previousVideoRef.current;
    if (
      previousVideo.uri !== undefined &&
      (previousVideo.uri !== currentVideo.uri || previousVideo.episodeId !== currentVideo.episodeId)
    ) {
      setSubtitleOffsetSec(0);
    }
    previousVideoRef.current = currentVideo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, episodeId]);

  const traktAutosync = useTraktAutosync({
    id: id || '',
    type: type === 'series' ? 'series' : 'movie',
    title: episodeTitle || title,
    year: year || 0,
    imdbId: imdbId || '',
    season,
    episode,
    showTitle: title,
    showYear: year,
    showImdbId: imdbId,
    episodeId,
  });

  // Get the Trakt autosync settings to use the user-configured sync frequency
  const { settings: traktSettings } = useTraktAutosyncSettings();

  safeDebugLog('Android Component mounted with props', {
    uri,
    title,
    season,
    episode,
    episodeTitle,
    quality,
    year,
    streamProvider,
    id,
    type,
    episodeId,
    imdbId,
  });

  const watchProgress = useWatchProgress(
    id,
    type,
    episodeId,
    playerState.currentTime,
    playerState.duration,
    playerState.paused,
    traktAutosync,
    controlsHook.seekToTime,
    currentStreamProvider
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

  // Placeholder if useNextEpisode is missing or broken, ensure it's imported or defined

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: playerState.showControls ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
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
      }, 3000);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [playerState.showControls, playerState.paused]);

  // Removed processProgressTouch - no longer needed with React Native Community Slider

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
      const stremioVideoId =
        stremioType === 'series' && season && episode
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

  const loadWyzieSubtitle = useCallback(
    async (subtitle: WyzieSubtitle) => {
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

        logger.info(
          `[AndroidVideoPlayer] Loaded addon subtitle: ${subtitle.display} (${parsedCues.length} cues)`
        );
        toast.success(`Subtitle loaded: ${subtitle.display}`);
      } catch (e) {
        logger.error('[AndroidVideoPlayer] Error loading subtitle', e);
        toast.error('Failed to load subtitle');
      } finally {
        setIsLoadingSubtitles(false);
      }
    },
    [modals, playerState.currentTime, tracksHook]
  );

  const skip = useCallback(
    (seconds: number) => {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration - END_EPSILON));
      seekToTime(newTime);
    },
    [currentTime, duration]
  );

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
      setTvSeekIndicator(false);
      tvSeekIndicatorTimeoutRef.current = null;
    }, 800);
  }, []);

  // TV Remote: Handle seek with visual feedback
  const handleTVSeek = useCallback(
    (direction: 'forward' | 'backward') => {
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
    },
    [tvSeekSeconds, skip, showTVSeekIndicator, showControls, fadeAnim, hideControls]
  );

  // TV Remote: Start continuous seek on hold
  const startTVHoldSeek = useCallback(
    (direction: 'left' | 'right') => {
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
    },
    [handleTVSeek]
  );

  // TV Remote: Stop continuous seek
  const stopTVHoldSeek = useCallback(() => {
    tvHoldSeekActiveRef.current = null;
    if (tvHoldSeekIntervalRef.current) {
      clearInterval(tvHoldSeekIntervalRef.current);
      tvHoldSeekIntervalRef.current = null;
    }
  }, []);

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
      resizeModes = useVLC ? ['contain', 'cover'] : ['cover', 'contain'];
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
          logger.log(
            `[AndroidVideoPlayer] Cover mode zoom: ${zoomFactor.toFixed(2)}x (screen: ${screenAspect.toFixed(2)}, video: ${videoAspect.toFixed(2)})`
          );
        }
      } else {
        // Fallback if video aspect not available yet - will be set when video loads
        setZoomScale(1.2); // Conservative zoom that works for most content
        if (DEBUG_MODE) {
          logger.log(
            `[AndroidVideoPlayer] Cover mode zoom fallback: 1.2x (video AR not available yet)`
          );
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

  useEffect(() => {
    openingAnimation.startOpeningAnimation();
  }, []);

  // Load subtitle settings on mount
  useEffect(() => {
    const loadSubtitleSettings = async () => {
      const settings = await storageService.getSubtitleSettings();
      if (settings) {
        if (settings.subtitleSize !== undefined) setSubtitleSize(settings.subtitleSize);
        if (settings.subtitleBackground !== undefined)
          setSubtitleBackground(settings.subtitleBackground);
        if (settings.subtitleTextColor !== undefined)
          setSubtitleTextColor(settings.subtitleTextColor);
        if (settings.subtitleBgOpacity !== undefined)
          setSubtitleBgOpacity(settings.subtitleBgOpacity);
        if (settings.subtitleTextShadow !== undefined)
          setSubtitleTextShadow(settings.subtitleTextShadow);
        if (settings.subtitleOutline !== undefined) setSubtitleOutline(settings.subtitleOutline);
        if (settings.subtitleOutlineColor !== undefined)
          setSubtitleOutlineColor(settings.subtitleOutlineColor);
        if (settings.subtitleOutlineWidth !== undefined)
          setSubtitleOutlineWidth(settings.subtitleOutlineWidth);
        if (settings.subtitleAlign !== undefined) setSubtitleAlign(settings.subtitleAlign);
        if (settings.subtitleBottomOffset !== undefined)
          setSubtitleBottomOffset(settings.subtitleBottomOffset);
        if (settings.subtitleLetterSpacing !== undefined)
          setSubtitleLetterSpacing(settings.subtitleLetterSpacing);
        if (settings.subtitleLineHeightMultiplier !== undefined)
          setSubtitleLineHeightMultiplier(settings.subtitleLineHeightMultiplier);
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
  ]);

  const handleLoad = useCallback(
    (data: any) => {
      if (!playerState.isMounted.current) return;

      const videoDuration = data.duration;
      console.log('[AndroidVideoPlayer] handleLoad called:', {
        duration: videoDuration,
        initialPosition: watchProgress.initialPosition,
        showResumeOverlay: watchProgress.showResumeOverlay,
        initialSeekTarget: watchProgress.initialSeekTargetRef?.current,
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
          index: t.index !== undefined ? t.index : i,
          name: t.title || t.name || `Track ${i + 1}`,
          language: t.language,
        }));
        tracksHook.setKsAudioTracks(formatted);
      }
      if (data.textTracks) {
        const formatted = data.textTracks.map((t: any, i: number) => ({
          id: t.index !== undefined ? t.index : i,
          index: t.index !== undefined ? t.index : i,
          name: t.title || t.name || `Track ${i + 1}`,
          language: t.language,
        }));
        tracksHook.setKsTextTracks(formatted);
      }

      playerState.setIsVideoLoaded(true);
      openingAnimation.completeOpeningAnimation();

      // Auto-select audio track based on preferences
      if (data.audioTracks && data.audioTracks.length > 0 && settings?.preferredAudioLanguage) {
        const formatted = data.audioTracks.map((t: any, i: number) => ({
          id: t.index !== undefined ? t.index : i,
          name: t.title || t.name || `Track ${i + 1}`,
          language: t.language,
        }));
        const bestAudioTrack = findBestAudioTrack(formatted, settings.preferredAudioLanguage);
        if (bestAudioTrack !== null) {
          logger.debug(
            `[AndroidVideoPlayer] Auto-selecting audio track ${bestAudioTrack} for language: ${settings.preferredAudioLanguage}`
          );
          tracksHook.setSelectedAudioTrack(bestAudioTrack);
        }
      }

      // Auto-select subtitle track based on preferences
      // Only auto-select internal tracks here if preference is 'internal' or 'any'
      // If preference is 'external', we wait for the useEffect to handle selection after external subs load
      if (
        data.textTracks &&
        data.textTracks.length > 0 &&
        !hasAutoSelectedTracks.current &&
        settings?.enableSubtitleAutoSelect
      ) {
        const sourcePreference = settings?.subtitleSourcePreference || 'internal';

        // Only pre-select internal if preference is internal or any
        if (sourcePreference === 'internal' || sourcePreference === 'any') {
          const formatted = data.textTracks.map((t: any, i: number) => ({
            id: t.index !== undefined ? t.index : i,
            name: t.title || t.name || `Track ${i + 1}`,
            language: t.language,
          }));
          const subtitleSelection = findBestSubtitleTrack(
            formatted,
            [], // External subtitles not yet loaded
            {
              preferredSubtitleLanguage: settings?.preferredSubtitleLanguage || 'en',
              subtitleSourcePreference: sourcePreference,
              enableSubtitleAutoSelect: true,
            }
          );

          if (
            subtitleSelection.type === 'internal' &&
            subtitleSelection.internalTrackId !== undefined
          ) {
            logger.debug(
              `[AndroidVideoPlayer] Auto-selecting internal subtitle track ${subtitleSelection.internalTrackId}`
            );
            tracksHook.setSelectedTextTrack(subtitleSelection.internalTrackId);
            hasAutoSelectedTracks.current = true;
          }
        }
        // If preference is 'external', don't select anything here - useEffect will handle it
      }

      // Handle Resume - check both initialPosition and initialSeekTargetRef
      const resumeTarget =
        watchProgress.initialPosition || watchProgress.initialSeekTargetRef?.current;
      if (
        resumeTarget &&
        resumeTarget > 0 &&
        !watchProgress.showResumeOverlay &&
        videoDuration > 0
      ) {
        const seekPosition = Math.min(resumeTarget, videoDuration - 0.5);
        console.log(
          '[AndroidVideoPlayer] Seeking to resume position:',
          seekPosition,
          'duration:',
          videoDuration,
          'useExoPlayer:',
          useExoPlayer
        );

        // Use a small delay to ensure the player is ready
        // Directly use refs to avoid stale closure issues
        setTimeout(() => {
          console.log(
            '[AndroidVideoPlayer] Executing resume seek to:',
            seekPosition,
            'ExoPlayer available:',
            !!exoPlayerRef.current,
            'MPV available:',
            !!mpvPlayerRef.current
          );

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
    },
    [id, type, episodeId, playerState.isMounted, watchProgress.initialPosition, useExoPlayer]
  );

  const handleProgress = useCallback(
    (data: any) => {
      if (
        playerState.isDragging.current ||
        playerState.isSeeking.current ||
        !playerState.isMounted.current ||
        setupHook.isAppBackgrounded.current
      )
        return;
      const currentTimeInSeconds = data.currentTime;
      if (Math.abs(currentTimeInSeconds - playerState.currentTime) > 0.5) {
        playerState.setCurrentTime(currentTimeInSeconds);
        playerState.setBuffered(data.playableDuration || currentTimeInSeconds);
      }
    },
    [
      playerState.currentTime,
      playerState.isDragging,
      playerState.isSeeking,
      setupHook.isAppBackgrounded,
    ]
  );

  // Auto-select subtitles when both internal tracks and video are loaded
  // This ensures we wait for internal tracks before falling back to external
  useEffect(() => {
    if (
      !playerState.isVideoLoaded ||
      hasAutoSelectedTracks.current ||
      !settings?.enableSubtitleAutoSelect
    ) {
      return;
    }

    const internalTracks = tracksHook.ksTextTracks;
    const externalSubs = availableSubtitles;

    // Wait a short delay to ensure tracks are fully populated
    const timeoutId = setTimeout(() => {
      if (hasAutoSelectedTracks.current) return;

      const subtitleSelection = findBestSubtitleTrack(internalTracks, externalSubs, {
        preferredSubtitleLanguage: settings?.preferredSubtitleLanguage || 'en',
        subtitleSourcePreference: settings?.subtitleSourcePreference || 'internal',
        enableSubtitleAutoSelect: true,
      });

      // Trust the findBestSubtitleTrack function's decision - it already implements priority logic
      if (
        subtitleSelection.type === 'internal' &&
        subtitleSelection.internalTrackId !== undefined
      ) {
        logger.debug(
          `[AndroidVideoPlayer] Auto-selecting internal subtitle track ${subtitleSelection.internalTrackId}`
        );
        tracksHook.setSelectedTextTrack(subtitleSelection.internalTrackId);
        hasAutoSelectedTracks.current = true;
      } else if (subtitleSelection.type === 'external' && subtitleSelection.externalSubtitle) {
        logger.debug(
          `[AndroidVideoPlayer] Auto-selecting external subtitle: ${subtitleSelection.externalSubtitle.display}`
        );
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

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'Home' }] } as any);
  }, [navigation]);

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
        availableStreams,
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

    const newQuality = stream.quality || stream.title?.match(/(\d+)p/)?.[0];
    const newProvider = stream.addonName || stream.name || stream.addon || 'Unknown';
    const newStreamName = stream.name || stream.title || 'Unknown Stream';

    // Wait for unmount to complete, then navigate
    setTimeout(() => {
      (navigation as any).replace('PlayerAndroid', {
        uri: stream.url,
        title,
        episodeTitle: ep.name,
        season: ep.season_number,
        episode: ep.episode_number,
        quality: newQuality,
        year,
        streamProvider: newProvider,
        streamName: newStreamName,
        headers: stream.headers || undefined,
        id,
        type: 'series',
        episodeId: ep.stremioId || `${id}:${ep.season_number}:${ep.episode_number}`,
        imdbId: imdbId ?? undefined,
        backdrop: backdrop || undefined,
        availableStreams: {},
        groupedEpisodes,
      });
    }, 300);
  };

  // TV Remote Event Handler - handles all D-pad and media button events
  // Must be placed after togglePlayback and handleClose are defined
  useTVEventHandler(
    useCallback(
      (evt: any) => {
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
      },
      [
        showControls,
        fadeAnim,
        togglePlayback,
        handleTVSeek,
        startTVHoldSeek,
        stopTVHoldSeek,
        resetTVControlsTimeout,
        handleClose,
      ]
    )
  );

  // Handle next episode button press
  const handlePlayNextEpisode = useCallback(async () => {
    if (!nextEpisode || !id || isLoadingNextEpisode) return;

    setIsLoadingNextEpisode(true);

    try {
      logger.log('[AndroidVideoPlayer] Loading next episode:', nextEpisode);

      // Create episode ID for next episode using stremioId if available, otherwise construct it
      const nextEpisodeId =
        nextEpisode.stremioId || `${id}:${nextEpisode.season_number}:${nextEpisode.episode_number}`;

      logger.log('[AndroidVideoPlayer] Fetching streams for next episode:', nextEpisodeId);

      // Import stremio service
      const stremioService = require('../../services/stremioService').default;

      let bestStream: any = null;
      let streamFound = false;
      let completedProviders = 0;
      const expectedProviders = new Set<string>();

      // Get installed addons to know how many providers to expect
      const installedAddons = stremioService.getInstalledAddons();
      const streamAddons = installedAddons.filter(
        (addon: any) => addon.resources && addon.resources.includes('stream')
      );

      streamAddons.forEach((addon: any) => expectedProviders.add(addon.id));

      // Collect all streams from all providers for the sources modal
      const allStreams: { [providerId: string]: { streams: any[]; addonName: string } } = {};
      let hasNavigated = false;

      // Fetch streams for next episode
      await stremioService.getStreams(
        'series',
        nextEpisodeId,
        (streams: any, addonId: any, addonName: any, error: any) => {
          completedProviders++;

          // Always collect streams from this provider for sources modal (even after navigation)
          if (streams && streams.length > 0) {
            allStreams[addonId] = {
              streams,
              addonName: addonName || addonId,
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
            logger.warn(
              '[AndroidVideoPlayer] No streams found for next episode after checking all providers'
            );
            setIsLoadingNextEpisode(false);
          }
        }
      );

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
          }),
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
        }),
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
  }, [
    showPauseOverlay,
    pauseOverlayOpacity,
    pauseOverlayTranslateY,
    showControls,
    fadeAnim,
    controlsTimeout,
    hideControls,
  ]);

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
          }),
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
  }, []);

  // Restore main branch function
  // Handlers for switching players

  // Memoize selectedTextTrack to prevent unnecessary re-renders
  const memoizedSelectedTextTrack = useMemo(() => {
    return tracksHook.selectedTextTrack === -1
      ? { type: 'disabled' as const }
      : { type: 'index' as const, value: tracksHook.selectedTextTrack };
  }, [tracksHook.selectedTextTrack]);

  return (
    <View
      style={[
        styles.container,
        {
          width: playerState.screenDimensions.width,
          height: playerState.screenDimensions.height,
          position: 'absolute',
          top: 0,
          left: 0,
        },
      ]}
    >
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
            onSeek={data => {
              playerState.isSeeking.current = false;
              if (data.currentTime)
                traktAutosync.handleProgressUpdate(data.currentTime, playerState.duration, true);
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
            onBuffer={buf => playerState.setIsBuffering(buf.isBuffering)}
            onTracksChanged={data => {
              console.log('[AndroidVideoPlayer] onTracksChanged:', data);
              if (data?.audioTracks) {
                const formatted = data.audioTracks.map((t: any) => ({
                  id: t.id,
                  name: t.name || `Track ${t.id}`,
                  language: t.language,
                }));
                tracksHook.setKsAudioTracks(formatted);
              }
              if (data?.subtitleTracks) {
                const formatted = data.subtitleTracks.map((t: any) => ({
                  id: t.id,
                  name: t.name || `Track ${t.id}`,
                  language: t.language,
                }));
                tracksHook.setKsTextTracks(formatted);
              }
            }}
            mpvPlayerRef={mpvPlayerRef}
            exoPlayerRef={exoPlayerRef}
            pinchRef={pinchRef}
            onPinchGestureEvent={() => {}}
            onPinchHandlerStateChange={() => {}}
            screenDimensions={playerState.screenDimensions}
            decoderMode={settings.decoderMode}
            gpuMode={settings.gpuMode}
            // Dual video engine props
            useExoPlayer={useExoPlayer}
            onCodecError={handleCodecError}
            selectedAudioTrack={(tracksHook.selectedAudioTrack as any) || undefined}
            selectedTextTrack={tracksHook.selectedTextTrack as any}
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
          onLongPressStateChange={e => {
            if (e.nativeEvent.state !== 4 && e.nativeEvent.state !== 2)
              speedControl.deactivateSpeedBoost();
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
          selectedAudioTrack={tracksHook.selectedAudioTrack}
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
          onSliderValueChange={val => {
            playerState.isDragging.current = true;
          }}
          onSlidingStart={() => {
            playerState.isDragging.current = true;
          }}
          onSlidingComplete={val => {
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
          onSkip={endTime => controlsHook.seekToTime(endTime)}
          controlsVisible={playerState.showControls}
          controlsFixedOffset={100}
        />

        {/* Up Next Button - Shows near end of episodes */}
        <UpNextButton
          type={type as any}
          nextEpisode={nextEpisodeHook.nextEpisode}
          currentTime={playerState.currentTime}
          duration={playerState.duration}
          insets={insets}
          isLoading={isLoadingNextEpisode}
          nextLoadingProvider={nextLoadingProvider}
          nextLoadingQuality={nextLoadingQuality}
          nextLoadingTitle={nextLoadingTitle}
          onPress={() => {
            if (nextEpisodeHook.nextEpisode) {
              logger.log(
                `[AndroidVideoPlayer] Opening streams for next episode: S${nextEpisodeHook.nextEpisode.season_number}E${nextEpisodeHook.nextEpisode.episode_number} `
              );
              modals.setSelectedEpisodeForStreams(nextEpisodeHook.nextEpisode);
              modals.setShowEpisodeStreamsModal(true);
            }
          }}
          metadata={metadata ? { poster: metadata.poster, id: metadata.id } : undefined}
          controlsVisible={playerState.showControls}
          controlsFixedOffset={
            Math.min(Dimensions.get('window').width, Dimensions.get('window').height) >= 768
              ? 120
              : 100
          }
        />
      </View>
      <AudioTrackModal
        showAudioModal={modals.showAudioModal}
        setShowAudioModal={modals.setShowAudioModal}
        ksAudioTracks={tracksHook.ksAudioTracks}
        selectedAudioTrack={tracksHook.selectedAudioTrack}
        selectAudioTrack={trackId => {
          tracksHook.setSelectedAudioTrack(trackId);
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
        setShowSubtitleLanguageModal={() => {}}
        isLoadingSubtitleList={isLoadingSubtitleList}
        isLoadingSubtitles={isLoadingSubtitles}
        customSubtitles={[]}
        availableSubtitles={availableSubtitles}
        ksTextTracks={tracksHook.ksTextTracks}
        selectedTextTrack={tracksHook.selectedTextTrack}
        useCustomSubtitles={useCustomSubtitles}
        isKsPlayerActive={true}
        useExoPlayer={useExoPlayer}
        subtitleSize={subtitleSize}
        subtitleBackground={subtitleBackground}
        fetchAvailableSubtitles={fetchAvailableSubtitles}
        loadWyzieSubtitle={loadWyzieSubtitle}
        selectTextTrack={trackId => {
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
        onConfirm={offset => setSubtitleOffsetSec(offset)}
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
        onSelectStream={stream => handleSelectStream(stream)}
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
        onSelectEpisode={ep => {
          modals.setSelectedEpisodeForStreams(ep);
          modals.setShowEpisodesModal(false);
          modals.setShowEpisodeStreamsModal(true);
        }}
      />

      <ErrorModal
        showErrorModal={modals.showErrorModal}
        setShowErrorModal={modals.setShowErrorModal}
        errorDetails={modals.errorDetails}
        onDismiss={handleClose}
      />

      <EpisodeStreamsModal
        visible={modals.showEpisodeStreamsModal}
        onClose={() => modals.setShowEpisodeStreamsModal(false)}
        episode={modals.selectedEpisodeForStreams}
        onSelectStream={handleEpisodeStreamSelect}
        metadata={{ id, name: title }}
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
    </View>
  );
};

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
    width: 40, // Define the diameter of the circle
    height: 40, // Define the diameter of the circle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // Margin to separate icon circle from percentage text
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

export default AndroidVideoPlayer;
