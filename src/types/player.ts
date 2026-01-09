/**
 * Player event types for video player components
 *
 * These types are used across player components:
 * - KSPlayerComponent (iOS)
 * - KSPlayerCore (iOS)
 * - AndroidVideoPlayer (Android)
 * - VlcVideoPlayer (VLC backend)
 *
 * Events come from native player modules and have platform-specific variations.
 * These types provide a unified interface while accommodating platform differences.
 */

// ============================================================================
// Track Types
// ============================================================================

/**
 * Audio track information from the video player
 * Compatible with react-native-video AudioTrack format
 */
export interface AudioTrack {
  /** Track index (0-based) */
  index: number;
  /** Unique track identifier (used by some native players) */
  id?: number;
  /** Human-readable track name */
  title?: string;
  /** Track name (alternative to title, used by some native players) */
  name?: string;
  /** ISO 639-1/2 language code (e.g., 'en', 'eng', 'es') */
  language?: string;
  /** Alternative language code field used by some players */
  languageCode?: string;
  /** Track bitrate in bits per second */
  bitrate?: number;
  /** Track type (e.g., 'audio/aac', 'audio/ac3') */
  type?: string;
  /** Audio codec (e.g., 'aac', 'ac3', 'eac3') */
  codec?: string;
  /** Number of audio channels */
  channels?: number;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Whether this track is currently selected */
  selected?: boolean;
  /** Whether this track is enabled (KSPlayer-specific) */
  isEnabled?: boolean;
  /** Track label (alternative display name) */
  label?: string;
}

/**
 * Text/subtitle track information from the video player
 * Compatible with react-native-video TextTrack format
 */
export interface TextTrack {
  /** Track index (0-based) */
  index: number;
  /** Unique track identifier (used by some native players) */
  id?: number;
  /** Human-readable track name */
  title?: string;
  /** Track name (alternative to title) */
  name?: string;
  /** ISO 639-1/2 language code (e.g., 'en', 'eng', 'es') */
  language?: string;
  /** Alternative language code field */
  languageCode?: string;
  /** Track type (e.g., 'text/vtt', 'application/x-subrip') - null for closed captions */
  type?: string | null;
  /** Whether this track is currently selected */
  selected?: boolean;
  /** Whether this track is enabled (KSPlayer-specific) */
  isEnabled?: boolean;
  /** Subtitle format (srt, vtt, ass, ssa) */
  format?: 'srt' | 'vtt' | 'ass' | 'ssa';
}

// ============================================================================
// Video Size Types
// ============================================================================

/**
 * Natural video dimensions as reported by the player
 */
export interface VideoNaturalSize {
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Video orientation (landscape/portrait) */
  orientation?: 'landscape' | 'portrait';
}

// ============================================================================
// Player Event Types
// ============================================================================

/**
 * Event data emitted when video finishes loading and is ready to play
 *
 * This event contains metadata about the loaded video including duration,
 * dimensions, and available audio/text tracks.
 */
export interface PlayerLoadEvent {
  /** Total duration of the video in seconds */
  duration: number;
  /** Natural video dimensions (width x height) */
  naturalSize?: VideoNaturalSize;
  /** Available audio tracks */
  audioTracks?: AudioTrack[];
  /** Available text/subtitle tracks */
  textTracks?: TextTrack[];
  /** Player backend being used (e.g., 'KSMEPlayer', 'AVPlayer', 'ExoPlayer') */
  playerBackend?: string;
  /** Current playback position in seconds (for resume scenarios) */
  currentPosition?: number;
  /** Video codec information */
  videoCodec?: string;
  /** Audio codec information */
  audioCodec?: string;
  /** Video bitrate in bits per second */
  videoBitrate?: number;
  /** Video frame rate */
  frameRate?: number;
  /** Whether the video supports Picture-in-Picture */
  canPlayPictureInPicture?: boolean;
  /** Whether the video supports AirPlay/external playback */
  canPlayExternally?: boolean;
}

/**
 * Event data emitted during video playback to report progress
 *
 * This event is fired periodically (typically every 250-500ms) during playback.
 */
export interface PlayerProgressEvent {
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration of the video in seconds */
  duration: number;
  /** Seekable duration in seconds (may differ from duration for live streams) */
  seekableDuration?: number;
  /** Amount of video that has been buffered/downloaded in seconds */
  playableDuration?: number;
  /**
   * Position as a fraction (0-1)
   * Used primarily by VLC player
   */
  position?: number;
  /** Current buffer percentage (0-100) */
  bufferProgress?: number;
}

/**
 * Event data emitted when a playback error occurs
 *
 * Error structure may vary by platform and player backend.
 */
export interface PlayerErrorEvent {
  /** Error details */
  error: PlayerErrorDetails;
  /** Human-readable error title */
  title?: string;
  /** Error domain (iOS-specific, e.g., 'AVFoundationErrorDomain') */
  domain?: string;
  /** Error target element (web-specific) */
  target?: unknown;
}

/**
 * Detailed error information from the player
 */
export interface PlayerErrorDetails {
  /** Human-readable error message */
  message: string;
  /** Error code (platform-specific) */
  code?: string | number;
  /** Error domain (iOS-specific) */
  domain?: string;
  /** Underlying error details */
  underlyingError?: {
    code?: string | number;
    message?: string;
    domain?: string;
  };
  /** Whether this is a recoverable error */
  recoverable?: boolean;
  /** HTTP status code if this was an HTTP error */
  httpStatusCode?: number;
  /** The URL that caused the error */
  failingUrl?: string;
}

/**
 * Event data emitted when the player's buffering state changes
 */
export interface PlayerBufferingEvent {
  /** Whether the player is currently buffering */
  isBuffering: boolean;
  /** Current buffer percentage (0-100) */
  bufferProgress?: number;
  /** Amount buffered in seconds */
  bufferedDuration?: number;
}

/**
 * Event data emitted when buffering progress updates
 *
 * More granular than PlayerBufferingEvent, specifically for buffer fill progress.
 */
export interface PlayerBufferingProgressEvent {
  /** Buffer fill progress as percentage (0-100) */
  bufferProgress: number;
  /** Amount buffered in seconds */
  bufferedDuration?: number;
  /** Target buffer size in seconds */
  targetBufferDuration?: number;
}

/**
 * Event data emitted when a seek operation completes
 */
export interface PlayerSeekEvent {
  /** The time seeked to in seconds */
  seekTime: number;
  /** The time seeked from in seconds */
  previousTime?: number;
  /** Whether the seek was successful */
  finished?: boolean;
}

/**
 * Event data emitted when playback rate changes
 */
export interface PlayerPlaybackRateEvent {
  /** New playback rate (1.0 = normal speed) */
  playbackRate: number;
  /** Previous playback rate */
  previousRate?: number;
}

/**
 * Event data emitted when external playback state changes (AirPlay, Chromecast, etc.)
 */
export interface PlayerExternalPlaybackEvent {
  /** Whether external playback is currently active */
  isExternalPlaybackActive: boolean;
  /** Type of external playback (e.g., 'airplay', 'chromecast') */
  externalPlaybackType?: string;
}

// ============================================================================
// VLC-Specific Types
// ============================================================================

/**
 * VLC player-specific media event structure
 *
 * VLC events have a different structure than react-native-video.
 * This interface captures VLC-specific event data.
 */
export interface VlcMediaEvent {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Buffer time in seconds */
  bufferTime?: number;
  /** Whether the player is buffering */
  isBuffering?: boolean;
  /** Available audio tracks (VLC format) */
  audioTracks?: VlcTrack[];
  /** Available text tracks (VLC format) */
  textTracks?: VlcTrack[];
  /** Currently selected audio track ID */
  selectedAudioTrack?: number;
  /** Currently selected text track ID */
  selectedTextTrack?: number;
  /** Video length in milliseconds (VLC native format) */
  length?: number;
  /** Video width in pixels */
  width?: number;
  /** Video height in pixels */
  height?: number;
  /** Playback position as fraction (0-1) */
  position?: number;
  /** All available tracks (combined) */
  tracks?: {
    audio?: VlcTrack[];
    video?: VlcTrack[];
    subtitle?: VlcTrack[];
  };
}

/**
 * VLC track structure
 */
export interface VlcTrack {
  /** Track ID */
  id: number;
  /** Track name/title */
  name: string;
  /** Track language code */
  language?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Tracks collection returned from native player methods
 */
export interface PlayerTracks {
  /** Available audio tracks */
  audioTracks: AudioTrack[];
  /** Available text/subtitle tracks */
  textTracks: TextTrack[];
}

/**
 * AirPlay/External playback state information
 */
export interface AirPlayState {
  /** Whether AirPlay is allowed */
  allowsExternalPlayback: boolean;
  /** Whether the player uses external playback when external screen is active */
  usesExternalPlaybackWhileExternalScreenIsActive: boolean;
  /** Whether external playback (AirPlay) is currently active */
  isExternalPlaybackActive: boolean;
}

/**
 * Player source configuration
 */
export interface PlayerSource {
  /** Source URI/URL */
  uri: string;
  /** Optional HTTP headers for the request */
  headers?: Record<string, string>;
  /** Media type hint (e.g., 'm3u8', 'mp4', 'mkv') */
  type?: string;
  /** Start position in seconds for resume playback */
  startPosition?: number;
  /** Title for display purposes */
  title?: string;
  /** Whether this is a live stream */
  isLive?: boolean;
}

/**
 * Video resize/scaling mode
 */
export type ResizeMode = 'contain' | 'cover' | 'stretch' | 'none';

// ============================================================================
// Event Handler Types
// ============================================================================

/**
 * Type definitions for player event handlers
 * Use these when defining callback props for player components
 */
export type PlayerLoadHandler = (event: PlayerLoadEvent) => void;
export type PlayerProgressHandler = (event: PlayerProgressEvent) => void;
export type PlayerErrorHandler = (event: PlayerErrorEvent) => void;
export type PlayerBufferingHandler = (event: PlayerBufferingEvent) => void;
export type PlayerSeekHandler = (event: PlayerSeekEvent) => void;
export type PlayerEndHandler = () => void;
