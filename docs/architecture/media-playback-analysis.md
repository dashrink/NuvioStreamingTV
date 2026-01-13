# Media Playback & Casting Architecture Analysis

**Document Version**: 1.0
**Last Updated**: 2024-01-13
**Project**: NuvioStreamingTV React Native App
**Purpose**: Comprehensive analysis of media playback architecture, video player integration, Google Cast patterns, offline content handling, and native integration strategy for tri-layer native migration planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Video Player Architecture](#video-player-architecture)
3. [Platform-Specific Player Implementations](#platform-specific-player-implementations)
4. [Google Cast Integration](#google-cast-integration)
5. [Offline Content & Downloads](#offline-content--downloads)
6. [Native Integration Strategy](#native-integration-strategy)
7. [Player Event System](#player-event-system)
8. [External Player Integration](#external-player-integration)
9. [Migration Recommendations](#migration-recommendations)
10. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Key Findings

| Component | Current State | Migration Complexity | Priority |
|-----------|--------------|---------------------|----------|
| **iOS Video Player** | KSPlayer (native Swift) | **Low** - Already native | Keep as-is |
| **Android Video Player** | MPV (native Kotlin) | **Low** - Already native | Keep as-is |
| **react-native-video** | Limited usage (trailers, promotions) | **Medium** - Replace with native | High |
| **expo-libvlc-player** | Dependency only | **Low** - Remove if unused | Medium |
| **Google Cast SDK** | Native iOS/Android integration | **Low** - Already native | Keep as-is |
| **Downloads System** | React Native context + expo-file-system | **Medium** - Migrate to native | High |
| **Player State Management** | Custom React hooks | **High** - Migrate to Rust state | Critical |

### Architecture Highlights

1. **Dual Native Player Stack**: The app uses fully native video players (KSPlayer on iOS, MPV on Android) with React Native bridges, not react-native-video for primary playback
2. **Smart Player Selection**: Automatic platform-based player routing with format detection and fallback handling
3. **Comprehensive Event System**: Unified event types across platforms with platform-specific adaptations
4. **Google Cast Ready**: Native SDK integration on both platforms with App Delegate/MainActivity initialization
5. **Downloads Infrastructure**: Full offline content support with resume capability, metadata tracking, and background downloads

---

## Video Player Architecture

### Player Selection Logic

**File**: `src/utils/playerSelection.ts`

The app uses a centralized player selection system that routes to different player implementations based on platform and stream characteristics:

```typescript
export const shouldUseKSPlayer = ({ uri, headers, platform }): boolean => {
  // Android always uses AndroidVideoPlayer (MPV)
  if (platform === 'android') return false;

  // iOS: Always use KSPlayer for all formats
  // KSPlayer handles automatic fallback (AVPlayer → FFmpeg)
  if (platform === 'ios') return true;

  return false;
};
```

**Key Insights**:
- **iOS**: Always routes to KSPlayer (native Swift implementation)
- **Android**: Always routes to AndroidVideoPlayer (MPV-based native implementation)
- **Format Agnostic**: Both players handle multiple formats internally
- **Automatic Fallback**: KSPlayer has built-in AVPlayer → FFmpeg fallback for complex formats

### Player Component Hierarchy

```
┌─────────────────────────────────────┐
│   Player Route (AppNavigator)       │
│   - PlayerAndroid                   │
│   - KSPlayerCore                    │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────────┐  ┌──▼───────────────┐
│ AndroidVideoPlayer│  │  KSPlayerCore    │
│   (Android)       │  │    (iOS)         │
└──────┬──────────┘  └──┬───────────────┘
       │                │
┌──────▼──────────┐  ┌──▼───────────────┐
│  MpvPlayer      │  │ KSPlayerComponent│
│ (Native Kotlin) │  │ (Native Swift)   │
└─────────────────┘  └──────────────────┘
```

### Core Player Dependencies

**From `package.json`**:

```json
{
  "react-native-video": "^6.17.0",           // Limited use (trailers, promotions)
  "expo-libvlc-player": "^2.2.3",            // Alternative player (dependency only)
  "react-native-google-cast": "^4.9.1",      // Chromecast integration
  "expo-file-system": "~19.0.17",            // Downloads & offline content
  "expo-intent-launcher": "~13.0.7",         // External player launching (Android)
  "@types/react-native-video": "^5.0.20"     // TypeScript definitions
}
```

---

## Platform-Specific Player Implementations

### iOS: KSPlayer (Native Swift)

**Components**:
- `src/components/player/KSPlayerCore.tsx` - React wrapper
- `src/components/player/KSPlayerComponent.tsx` - Native bridge component
- `src/components/player/ios/components/KSPlayerSurface.tsx` - Video surface
- `src/components/player/ios/hooks/useKSPlayer.ts` - Player hook

**Native Bridge**: Uses `requireNativeComponent` to bridge to Swift KSPlayerView

```typescript
const KSPlayerViewManager = requireNativeComponent<KSPlayerViewProps>('KSPlayerView');
const KSPlayerModule = NativeModules.KSPlayerModule;
```

**Capabilities**:
- AVPlayer backend for standard formats (HLS, MP4)
- FFmpeg backend for complex formats (MKV, AVI)
- Automatic fallback: AVPlayer → FFmpeg
- Native subtitle rendering
- AirPlay support via `allowsExternalPlayback`
- Track management (audio, text/subtitle)
- Hardware-accelerated decoding

**Player Configuration**:
```typescript
interface KSPlayerSource {
  uri: string;
  headers?: Record<string, string>;
}

interface KSPlayerProps {
  source?: KSPlayerSource;
  paused?: boolean;
  volume?: number;
  rate?: number;
  audioTrack?: number;
  textTrack?: number;
  allowsExternalPlayback?: boolean;
  usesExternalPlaybackWhileExternalScreenIsActive?: boolean;
  subtitleBottomOffset?: number;
  subtitleFontSize?: number;
  subtitleTextColor?: string;
  subtitleBackgroundColor?: string;
  resizeMode?: 'contain' | 'cover' | 'stretch';
}
```

**Native Commands**:
- `seek(time: number)` - Seek to position
- `setAudioTrack(trackId: number)` - Switch audio track
- `setTextTrack(trackId: number)` - Switch subtitle track
- `getTracks()` - Get available tracks
- `getAirPlayState()` - Query AirPlay status
- `showAirPlayPicker()` - Display AirPlay device picker

### Android: MPV Player (Native Kotlin)

**Components**:
- `src/components/player/AndroidVideoPlayer.tsx` - React wrapper
- `src/components/player/AndroidVideoPlayer.tv.tsx` - TV variant
- `src/components/player/android/MpvPlayer.tsx` - Native bridge component
- `src/components/player/android/components/VideoSurface.tsx` - Video surface
- `plugins/mpv-bridge/` - Native MPV bridge module

**Native Bridge**: Custom native module using `requireNativeComponent`

```typescript
const MpvPlayerNative = Platform.OS === 'android'
    ? requireNativeComponent<any>('MpvPlayer')
    : null;
```

**Capabilities**:
- MPV player backend (libmpv)
- ExoPlayer integration for HLS/DASH
- Hardware decoding: auto, sw, hw, hw+
- GPU rendering: gpu, gpu-next
- Native subtitle rendering with extensive styling
- Google Cast support
- Multi-track audio/subtitle management

**Player Configuration**:
```typescript
interface MpvPlayerProps {
  source: string;
  headers?: { [key: string]: string };
  paused?: boolean;
  volume?: number;
  rate?: number;
  resizeMode?: 'contain' | 'cover' | 'stretch';
  decoderMode?: 'auto' | 'sw' | 'hw' | 'hw+';
  gpuMode?: 'gpu' | 'gpu-next';
  // Extensive subtitle styling options
  subtitleSize?: number;
  subtitleColor?: string;
  subtitleBackgroundOpacity?: number;
  subtitleBorderSize?: number;
  subtitleBorderColor?: string;
  subtitleShadowEnabled?: boolean;
  subtitlePosition?: number;
  subtitleDelay?: number;
  subtitleAlignment?: 'left' | 'center' | 'right';
}
```

**Native Plugin Structure**:
```
plugins/mpv-bridge/
├── android/
│   └── mpv/
│       ├── MpvPackage.kt          # React Native package registration
│       ├── MpvPlayerViewManager.kt # View manager
│       └── MPVView.kt              # Native MPV view
└── withMpvBridge.js               # Expo config plugin
```

**Decoder Modes**:
- `auto` - Automatic selection (recommended)
- `sw` - Software decoding (compatibility)
- `hw` - Hardware decoding (performance)
- `hw+` - Hardware+ decoding (maximum performance)

### react-native-video Usage (Limited)

**Usage Locations**:
1. `src/components/video/TrailerPlayer.tsx` - Trailer playback
2. `src/components/promotions/CampaignManager.tsx` - Promotional videos
3. `src/components/promotions/PosterModal.tsx` - Modal video content
4. `src/components/metadata/TrailerModal.tsx` - Metadata trailer display

**Patches Applied**:
- `patches/react-native-video+6.18.0.patch` - Custom fixes
- `src/patches/react-native-video+6.12.0.patch` - iOS layer cleanup fix

**iOS Patch Details** (from `src/patches/react-native-video+6.12.0.patch`):
```diff
// Properly clean up the player layer
if (_playerLayer) {
    [_playerLayer removeFromSuperlayer];
    // Set animation keys to nil before releasing to avoid crashes
    [_playerLayer removeAllAnimations];
    _playerLayer = nil;
}

// Resume playback even if originally playing in background
if (_paused) return;
```

**Why Limited Usage?**:
- Primary playback uses native players (KSPlayer/MPV) for better performance
- react-native-video reserved for lightweight, non-critical video playback
- Native players provide better format support and hardware acceleration

---

## Google Cast Integration

### Native SDK Integration

**Package**: `react-native-google-cast` v4.9.1

**Platform Support**: iOS + Android native SDKs

### iOS Integration

**File**: `ios/NuvioTV/AppDelegate.swift`

```swift
// @generated begin react-native-google-cast-import
import GoogleCast
// @generated end react-native-google-cast-import

// @generated begin react-native-google-cast-didFinishLaunchingWithOptions
// Google Cast initialization code
// @generated end react-native-google-cast-didFinishLaunchingWithOptions
```

**Build Configuration**: `ios/NuvioTV/Info.plist`
- Cast receiver app ID configuration
- Network usage permissions for Cast discovery

### Android Integration

**File**: `android/app/src/main/java/com/nuvio/app/tv/MainActivity.kt`

```kotlin
// @generated begin react-native-google-cast-onCreate
// Google Cast initialization
// @generated end react-native-google-cast-onCreate
```

**Gradle Dependencies**: `android/app/build.gradle`

```gradle
dependencies {
    implementation "com.google.android.gms:play-services-cast-framework:${safeExtGet('castFrameworkVersion', '+')}"
}
```

**Cast Framework Version**: `android/build.gradle`

```gradle
// @generated begin react-native-google-cast-version-import
ext {
    castFrameworkVersion = '21.+'
}
// @generated end react-native-google-cast-version-import
```

### Cast Event Types

**File**: `src/types/player.ts`

```typescript
/**
 * Event data emitted when external playback state changes (AirPlay, Chromecast, etc.)
 */
export interface PlayerExternalPlaybackEvent {
  /** Whether external playback is currently active */
  isExternalPlaybackActive: boolean;
  /** Type of external playback (e.g., 'airplay', 'chromecast') */
  externalPlaybackType?: string;
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
```

### Cast Exclusions

**Build Configuration**: `app.json` / `app.tv.json`

```json
{
  "plugins": [
    {
      "disableIosBluetooth": true,
      "disableGooglePlayServices": false,
      "androidEnableGoogleCast": true,
      "iosEnableGoogleCast": true
    }
  ],
  "nativeModulesExclude": [
    "react-native-google-cast"  // Excluded from TV builds
  ]
}
```

**Why TV Exclusion?**:
- Android TV uses different casting architecture (built-in Cast receiver)
- iOS tvOS doesn't support AirPlay sender (it's a receiver)
- Mobile-only feature for casting TO TV devices

### Cast Integration Points

1. **Player Controls**: Cast button in video player controls
2. **Metadata Sync**: TMDB metadata synchronized to Cast receiver
3. **Playback State**: Position, pause/play state mirrored
4. **Queue Management**: Episode queue support for TV shows
5. **Subtitle Support**: Subtitle track information passed to receiver

---

## Offline Content & Downloads

### Downloads Context

**File**: `src/contexts/DownloadsContext.tsx`

**Architecture**: React Context + expo-file-system + MMKV storage

```typescript
export interface DownloadItem {
  id: string;                      // unique id (contentId + episode)
  contentId: string;                // base content id
  type: 'movie' | 'series';
  title: string;
  providerName?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  quality?: string;
  size?: number;                    // total bytes
  downloadedBytes: number;
  totalBytes: number;
  progress: number;                 // 0-100
  status: DownloadStatus;           // downloading, completed, paused, error, queued
  speedBps?: number;                // download speed
  etaSeconds?: number;              // estimated time remaining
  posterUrl?: string | null;
  sourceUrl: string;                // stream URL
  headers?: Record<string, string>;
  fileUri?: string;                 // local file path
  createdAt: number;
  updatedAt: number;
  imdbId?: string;                  // IMDb ID
  tmdbId?: number;                  // TMDB ID
  resumeData?: string;              // Resume data for pause/resume
}
```

### Download Operations

**Capabilities**:
1. **Start Download**: Queue new download with metadata
2. **Pause Download**: Pause active download with resume data
3. **Resume Download**: Resume paused download from checkpoint
4. **Cancel Download**: Cancel and cleanup download
5. **Remove Download**: Delete completed/failed download
6. **URL Check**: Check if URL is currently downloading

**Storage**:
- **Metadata**: MMKV storage (`downloads_state_v1` key)
- **Files**: expo-file-system (`FileSystem.documentDirectory/downloads/`)
- **Background Support**: Works across app sessions via AppState monitoring

### File Management

**Filename Sanitization**:
```typescript
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9\-_.()\s]/gi, '_').slice(0, 120).trim();
}
```

**Format Detection**:
```typescript
async function getExtensionFromHeaders(
  url: string,
  headers?: Record<string, string>
): Promise<string | null> {
  const response = await fetch(url, { method: 'HEAD', headers });
  const contentType = response.headers.get('content-type');

  // Maps: video/mp4 → mp4, video/x-matroska → mkv, etc.
}
```

**Supported Formats**:
- MP4 (`video/mp4`)
- MKV (`video/x-matroska`)
- AVI (`video/avi`)
- MOV (`video/quicktime`)
- WebM (`video/webm`)
- FLV (`video/x-flv`)
- WMV (`video/x-ms-wmv`)
- M4V (`video/x-m4v`)

### Download Restrictions

**Non-Downloadable Content**:
```typescript
function isDownloadableUrl(url: string): boolean {
  const lower = url.toLowerCase();

  // Exclude streaming protocols
  if (lower.includes('.m3u8')) return false;  // HLS
  if (lower.includes('.mpd')) return false;   // DASH
  if (lower.startsWith('rtmp://')) return false;
  if (lower.startsWith('rtsp://')) return false;

  return true;
}
```

**Why These Restrictions?**:
- HLS/DASH are adaptive streaming (multiple files)
- RTMP/RTSP are live streaming protocols
- Only direct file URLs are downloadable

### Offline Playback Integration

**Player Integration**:
- Downloads screen (`src/screens/DownloadsScreen.tsx`)
- Local file URI passed to player instead of network URL
- Same player interface (KSPlayer/MPV) handles both network and local files
- Progress tracking maintained for offline content

### Notification Integration

**File**: `src/services/notificationService.ts`

**Download Notifications**:
- Progress notifications during download
- Completion notifications
- Error notifications
- Background download status

---

## Native Integration Strategy

### Current Bridge Architecture

```
┌─────────────────────────────────────┐
│     React Native Layer              │
│  - Player wrappers (tsx)            │
│  - Event handling hooks             │
│  - State management (React)         │
└──────────────┬──────────────────────┘
               │
        ┌──────┴─────────┐
        │                │
┌───────▼─────┐   ┌──────▼──────┐
│iOS Bridge   │   │Android Bridge│
│(Swift/ObjC) │   │(Kotlin/Java) │
└───────┬─────┘   └──────┬───────┘
        │                │
┌───────▼─────┐   ┌──────▼──────┐
│ KSPlayer    │   │ MPV Player  │
│ (Swift)     │   │ (Kotlin)    │
└─────────────┘   └─────────────┘
```

### Native Module Communication

**iOS: KSPlayerComponent**

```typescript
export interface KSPlayerRef {
  seek: (time: number) => void;
  setSource: (source: KSPlayerSource) => void;
  setPaused: (paused: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setAudioTrack: (trackId: number) => void;
  setTextTrack: (trackId: number) => void;
  getTracks: () => Promise<{ audioTracks: any[]; textTracks: any[] }>;
  setAllowsExternalPlayback: (allows: boolean) => void;
  setUsesExternalPlaybackWhileExternalScreenIsActive: (uses: boolean) => void;
  getAirPlayState: () => Promise<AirPlayState>;
  showAirPlayPicker: () => void;
}
```

**Command Dispatch Pattern**:
```typescript
const commandId = UIManager.getViewManagerConfig('KSPlayerView').Commands.seek;
UIManager.dispatchViewManagerCommand(node, commandId, [time]);
```

**Android: MpvPlayer**

```typescript
export interface MpvPlayerRef {
  seek: (positionSeconds: number) => void;
  setAudioTrack: (trackId: number) => void;
  setSubtitleTrack: (trackId: number) => void;
}
```

**Command Dispatch Pattern**:
```typescript
UIManager.dispatchViewManagerCommand(
  findNodeHandle(nativeRef.current),
  'seek',
  [positionSeconds]
);
```

### Event Flow

**Native → React Native**:

1. **iOS (KSPlayer)**:
   ```
   Swift KSPlayerView
   → KSPlayerViewManager (Swift)
   → RCTEventEmitter (Objective-C)
   → React Native Bridge
   → onLoad/onProgress/onError callbacks (TypeScript)
   ```

2. **Android (MPV)**:
   ```
   MPVView (Kotlin)
   → MpvPlayerViewManager (Kotlin)
   → ReactEventEmitter (Java/Kotlin)
   → React Native Bridge
   → onLoad/onProgress/onError callbacks (TypeScript)
   ```

### Header Injection

**iOS**: Headers passed via `KSPlayerSource.headers`
```swift
// Native KSPlayer handles headers in AVURLAsset
let headers = ["User-Agent": "...", "Referer": "..."]
```

**Android**: Headers passed via MPV options
```kotlin
// MPV http-header-fields option
val headers = mapOf("User-Agent" to "...", "Referer" to "...")
```

**HLS Special Handling** (`src/components/player/utils/playerUtils.ts`):
```typescript
export const getHlsHeaders = (headers?: Record<string, string>) => {
  return {
    ...defaultAndroidHeaders,
    ...headers,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };
};
```

---

## Player Event System

### Unified Event Types

**File**: `src/types/player.ts`

The app defines a comprehensive set of unified event types that work across all players (KSPlayer, MPV, VLC, react-native-video):

### Core Event Types

**1. PlayerLoadEvent** - Video metadata loaded
```typescript
export interface PlayerLoadEvent {
  duration: number;                          // Total video duration (seconds)
  naturalSize?: VideoNaturalSize;            // Video dimensions
  audioTracks?: AudioTrack[];                // Available audio tracks
  textTracks?: TextTrack[];                  // Available subtitle tracks
  playerBackend?: string;                    // 'KSMEPlayer', 'AVPlayer', 'ExoPlayer'
  currentPosition?: number;                  // Resume position
  videoCodec?: string;                       // e.g., 'h264', 'hevc'
  audioCodec?: string;                       // e.g., 'aac', 'ac3'
  videoBitrate?: number;                     // Bits per second
  frameRate?: number;                        // FPS
  canPlayPictureInPicture?: boolean;         // PiP support
  canPlayExternally?: boolean;               // AirPlay/Cast support
}
```

**2. PlayerProgressEvent** - Playback progress (fired every 250-500ms)
```typescript
export interface PlayerProgressEvent {
  currentTime: number;                       // Current position (seconds)
  duration: number;                          // Total duration (seconds)
  seekableDuration?: number;                 // For live streams
  playableDuration?: number;                 // Buffered duration
  position?: number;                         // Position fraction (0-1, VLC)
  bufferProgress?: number;                   // Buffer percentage (0-100)
}
```

**3. PlayerErrorEvent** - Playback errors
```typescript
export interface PlayerErrorEvent {
  error: PlayerErrorDetails;
  title?: string;                            // Human-readable title
  domain?: string;                           // iOS: 'AVFoundationErrorDomain'
  target?: unknown;                          // Web-specific
}

export interface PlayerErrorDetails {
  message: string;
  code?: string | number;                    // Platform-specific code
  domain?: string;
  underlyingError?: {
    code?: string | number;
    message?: string;
    domain?: string;
  };
  recoverable?: boolean;                     // Can retry?
  httpStatusCode?: number;                   // HTTP errors
  failingUrl?: string;                       // Failed URL
}
```

**4. PlayerBufferingEvent** - Buffer state changes
```typescript
export interface PlayerBufferingEvent {
  isBuffering: boolean;
  bufferProgress?: number;                   // 0-100
  bufferedDuration?: number;                 // Seconds
}
```

**5. PlayerSeekEvent** - Seek completion
```typescript
export interface PlayerSeekEvent {
  seekTime: number;                          // Target time
  previousTime?: number;                     // Start time
  finished?: boolean;                        // Seek success
}
```

### Track Information Types

**Audio Tracks**:
```typescript
export interface AudioTrack {
  index: number;                             // 0-based index
  id?: number;                               // Unique identifier
  title?: string;                            // Display name
  name?: string;                             // Alternative name
  language?: string;                         // ISO 639-1/2 code (e.g., 'en', 'es')
  languageCode?: string;                     // Alternative language field
  bitrate?: number;                          // Bits per second
  type?: string;                             // 'audio/aac', 'audio/ac3'
  codec?: string;                            // 'aac', 'ac3', 'eac3'
  channels?: number;                         // Audio channels (2, 5.1, 7.1)
  sampleRate?: number;                       // Hz (e.g., 48000)
  selected?: boolean;                        // Currently selected
  isEnabled?: boolean;                       // KSPlayer-specific
  label?: string;                            // Alternative display name
}
```

**Text/Subtitle Tracks**:
```typescript
export interface TextTrack {
  index: number;                             // 0-based index
  id?: number;                               // Unique identifier
  title?: string;                            // Display name
  name?: string;                             // Alternative name
  language?: string;                         // ISO 639-1/2 code
  languageCode?: string;                     // Alternative language field
  type?: string | null;                      // 'text/vtt', 'application/x-subrip', null for CC
  selected?: boolean;                        // Currently selected
  isEnabled?: boolean;                       // KSPlayer-specific
  format?: 'srt' | 'vtt' | 'ass' | 'ssa';   // Subtitle format
}
```

### VLC-Specific Events

**Why Separate Types?**: VLC player has different event structure than react-native-video and native players.

```typescript
export interface VlcMediaEvent {
  currentTime: number;
  duration: number;
  bufferTime?: number;
  isBuffering?: boolean;
  audioTracks?: VlcTrack[];
  textTracks?: VlcTrack[];
  selectedAudioTrack?: number;
  selectedTextTrack?: number;
  length?: number;                           // Duration in milliseconds
  width?: number;
  height?: number;
  position?: number;                         // Fraction (0-1)
  tracks?: {
    audio?: VlcTrack[];
    video?: VlcTrack[];
    subtitle?: VlcTrack[];
  };
}
```

### Player Hooks Using Events

**usePlayerState** (`src/components/player/hooks/usePlayerState.ts`):
- Manages paused, currentTime, duration, buffering states
- Provides setters for state updates

**usePlayerTracks** (`src/components/player/hooks/usePlayerTracks.ts`):
- Manages audio/subtitle track selection
- Handles track switching via native commands

**useWatchProgress** (`src/components/player/hooks/useWatchProgress.ts`):
- Tracks watch progress for resume playback
- Syncs with Trakt (if enabled)
- Stores in MMKV storage

**usePlayerModals** (`src/components/player/hooks/usePlayerModals.ts`):
- Controls player UI modals (settings, tracks, sources)
- Modal visibility state management

---

## External Player Integration

### Android Intent Launcher

**File**: `src/services/videoPlayerService.ts`

**Purpose**: Launch external video players on Android (MX Player, VLC, etc.)

```typescript
export const VideoPlayerService = {
  playVideo: async (
    url: string,
    options?: Partial<VideoPlayerOptions>
  ): Promise<boolean> => {
    if (!options?.useExternalPlayer || Platform.OS !== 'android') {
      return false;
    }

    try {
      // Create metadata-rich title
      const fullTitle = [
        options.title,
        options.episodeNumber,
        options.episodeTitle,
        options.releaseDate
      ].filter(Boolean).join(' - ');

      // Launch Android intent
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: url,
        flags: 1,                            // FLAG_ACTIVITY_NEW_TASK
        type: 'video/*',
        extra: {
          'android.intent.extra.TITLE': fullTitle,
          'position': 0,
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to launch external player:', error);
      return false;
    }
  }
};
```

**Configuration Options**:
```typescript
interface VideoPlayerOptions {
  useExternalPlayer: boolean;
  title?: string;
  poster?: string;
  subtitleUrl?: string;
  subtitleLanguage?: string;
  headers?: Record<string, string>;
  episodeTitle?: string;
  episodeNumber?: string;
  releaseDate?: string;
}
```

**Why External Players?**:
- User preference for familiar player UI
- Codec support beyond native players
- Advanced playback features (zoom, gesture controls)
- Dolby/DTS audio support

**Limitations**:
- Android only (iOS doesn't support video intents)
- No playback state synchronization
- No progress tracking for resume
- Limited to direct file URLs (no DRM)

---

## Migration Recommendations

### Target Architecture: Tri-Layer Native

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (Kotlin/Swift)                   │
│  - Native player views (ExoPlayer/AVPlayer)                  │
│  - Player controls UI                                        │
│  - Cast button integration                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Business Logic Layer (Rust)                     │
│  - Player state machine                                      │
│  - Track selection logic                                     │
│  - Download queue management                                 │
│  - Progress tracking                                         │
│  - Metadata synchronization                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                 Storage Layer (Rust)                         │
│  - Downloaded content metadata                               │
│  - Watch progress (resume positions)                         │
│  - Player settings & preferences                             │
│  - Download queue state                                      │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1: Keep Native Players (Low Risk)

**KSPlayer (iOS)** ✅ Already native - no migration needed
- Keep Swift implementation
- Add Rust state bridge for player events
- Migrate event handling from React hooks to Rust state machine

**MPV Player (Android)** ✅ Already native - no migration needed
- Keep Kotlin/libmpv implementation
- Add Rust state bridge for player events
- Migrate event handling from React hooks to Rust state machine

**Remove react-native-video** 🔄 Medium priority
- Replace trailer playback with native AVPlayer/ExoPlayer views
- Replace promotional video playback
- Removes React Native bridge overhead for secondary video content

### Phase 2: Migrate Player State to Rust (Critical)

**Current React Hooks → Rust State Machine**

| Hook | Current Responsibility | Rust Migration |
|------|----------------------|----------------|
| `usePlayerState` | Paused, time, duration, buffering | ✅ Rust player state machine |
| `usePlayerTracks` | Track management | ✅ Rust track selection logic |
| `useWatchProgress` | Resume positions, Trakt sync | ✅ Rust progress tracker |
| `usePlayerModals` | UI modal state | ❌ Keep in UI layer (Kotlin/Swift) |
| `useSpeedControl` | Playback rate | ✅ Rust player state |
| `useCustomSubtitles` | External subtitle handling | ✅ Rust subtitle parser + UI rendering |

**Rust State Machine Benefits**:
- **Shared Logic**: Same player state across iOS/Android/TV
- **Performance**: No bridge overhead for state updates
- **Reliability**: Type-safe state transitions
- **Testability**: Rust unit tests for player logic

**Example Rust API**:
```rust
pub struct PlayerState {
    pub playback_state: PlaybackState,  // Playing, Paused, Buffering, Stopped
    pub current_time: f64,
    pub duration: f64,
    pub selected_audio_track: Option<u32>,
    pub selected_subtitle_track: Option<u32>,
    pub is_external_playback_active: bool,
}

impl PlayerState {
    pub fn handle_progress(&mut self, time: f64) { /* ... */ }
    pub fn handle_pause(&mut self) { /* ... */ }
    pub fn select_audio_track(&mut self, track_id: u32) { /* ... */ }
}
```

### Phase 3: Migrate Downloads to Native (High Priority)

**Current**: React Context + expo-file-system
**Target**: Rust download manager + platform storage

**Rust Download Manager**:
```rust
pub struct DownloadManager {
    pub active_downloads: HashMap<String, Download>,
    pub completed_downloads: Vec<DownloadMetadata>,
    pub storage_path: PathBuf,
}

pub struct Download {
    pub id: String,
    pub url: String,
    pub destination: PathBuf,
    pub progress: f64,              // 0.0 to 1.0
    pub status: DownloadStatus,
    pub resume_data: Option<Vec<u8>>,
}

impl DownloadManager {
    pub fn start_download(&mut self, url: String, metadata: DownloadMetadata);
    pub fn pause_download(&mut self, id: &str) -> Result<ResumeData>;
    pub fn resume_download(&mut self, id: &str, resume_data: ResumeData);
    pub fn cancel_download(&mut self, id: &str);
}
```

**Platform Integration**:
- **iOS**: Use `URLSession` downloadTask with Rust callbacks
- **Android**: Use `DownloadManager` system service or WorkManager
- **Background Downloads**: Platform background task APIs
- **Progress Notifications**: Platform notification APIs

**Benefits**:
- **Background Persistence**: Downloads continue when app is killed
- **Battery Efficiency**: Platform-optimized download scheduling
- **Storage Management**: Platform storage quotas and cleanup
- **Network Awareness**: WiFi-only downloads, cellular limits

### Phase 4: Google Cast State Migration

**Current**: react-native-google-cast with React state
**Target**: Native Cast SDK + Rust state bridge

**Keep Native SDKs**:
- iOS: GoogleCast.framework (already integrated)
- Android: play-services-cast-framework (already integrated)

**Migrate to Rust**:
```rust
pub struct CastState {
    pub is_connected: bool,
    pub device_name: Option<String>,
    pub session_id: Option<String>,
    pub media_status: Option<CastMediaStatus>,
}

pub struct CastMediaStatus {
    pub content_id: String,
    pub position: f64,
    pub duration: f64,
    pub playback_state: PlaybackState,
}

impl CastState {
    pub fn handle_session_started(&mut self, session: CastSession);
    pub fn handle_session_ended(&mut self);
    pub fn sync_playback_position(&mut self, position: f64);
}
```

**Platform Callbacks → Rust**:
- iOS: GCKSessionManagerListener → Rust FFI callbacks
- Android: SessionManagerListener → JNI callbacks to Rust

**Benefits**:
- Unified Cast state across platforms
- Reliable state synchronization
- Simpler testing of Cast logic

### Migration Priority Matrix

| Component | Complexity | Risk | Business Value | Priority | Migration Phase |
|-----------|-----------|------|---------------|----------|----------------|
| KSPlayer (iOS) | Low | Low | Medium | Keep As-Is | N/A |
| MPV (Android) | Low | Low | Medium | Keep As-Is | N/A |
| Player State → Rust | High | Medium | High | **P0 Critical** | Phase 2 |
| Downloads → Rust | High | Medium | High | **P1 High** | Phase 3 |
| Cast State → Rust | Medium | Low | Medium | **P2 Medium** | Phase 4 |
| Remove react-native-video | Medium | Low | Low | **P3 Low** | Phase 1 |
| External Player Service | Low | Low | Low | Keep As-Is | N/A |

---

## Risk Assessment

### High-Risk Areas

**1. Player State Synchronization** ⚠️ Critical Risk

**Current Issue**: Player state in React hooks creates bridge overhead
- Every progress event (250-500ms) crosses bridge
- State updates trigger React re-renders
- No state persistence across player changes

**Migration Risk**:
- State mismatch during Rust migration
- Event timing issues (race conditions)
- Resume position loss

**Mitigation**:
- Implement Rust state machine with event replay buffer
- Shadow state: Run Rust + React in parallel, validate consistency
- Comprehensive state transition tests

**2. Download Resume Data** ⚠️ High Risk

**Current Issue**: Resume data in React context (memory only)
- App kill = lost resume data
- No background download support
- Platform download limits not respected

**Migration Risk**:
- Resume data format incompatibility
- Migration of existing downloads
- Background download permission issues

**Mitigation**:
- Document current resume data format
- Build migration tool for existing downloads
- Incremental rollout with fallback to React implementation

**3. Track Selection Logic** ⚠️ Medium Risk

**Current Issue**: Track selection in React hooks
- Auto-selection based on language preference
- Fallback logic for missing tracks
- Different track ID formats per player

**Migration Risk**:
- Track selection logic bugs
- Language preference not respected
- Subtitle synchronization issues

**Mitigation**:
- Extract track selection to pure TypeScript functions first
- Port tested logic to Rust
- A/B test with existing implementation

### Medium-Risk Areas

**4. Cast Session Management** ⚠️ Medium Risk

**Current**: Google Cast SDK events → React state
**Issue**: Cast state updates cross bridge frequently

**Migration Risk**:
- Cast connection drops during migration
- Session state mismatch
- Metadata sync issues

**Mitigation**:
- Test with physical Chromecast devices
- Implement reconnection logic in Rust
- Shadow state validation

**5. External Subtitle Handling** ⚠️ Medium Risk

**Current**: Custom subtitle parsing in React
**Issue**: SRT/VTT parsing in JavaScript

**Migration Risk**:
- Subtitle format compatibility
- Timing synchronization
- Styling/rendering differences

**Mitigation**:
- Use established Rust subtitle parsers (srt-rs, webvtt-rs)
- Compare parsed output with current implementation
- Visual regression testing

### Low-Risk Areas

**6. External Player Integration** ✅ Low Risk

**Current**: Android Intent Launcher service
**Keep As-Is**: No migration needed
- Platform-native intent system
- No complex state management
- User-initiated, one-time action

**7. react-native-video Removal** ✅ Low Risk

**Current**: Limited usage (trailers, promotions)
**Migration**: Replace with native AVPlayer/ExoPlayer views
- Non-critical playback
- Simple use case (no resume, no tracks)
- Easy fallback if issues occur

---

## Appendix

### Player Type Definitions Summary

**File**: `src/types/player.ts` (372 lines)

**Comprehensive Type Coverage**:
- ✅ Track types (AudioTrack, TextTrack)
- ✅ Event types (Load, Progress, Error, Buffering, Seek)
- ✅ Player configuration (Source, ResizeMode)
- ✅ VLC-specific types (VlcMediaEvent, VlcTrack)
- ✅ AirPlay/Cast types (PlayerExternalPlaybackEvent, AirPlayState)
- ✅ Event handler types (type aliases for callbacks)

**Platform Compatibility Matrix**:

| Feature | KSPlayer (iOS) | MPV (Android) | react-native-video | VLC |
|---------|---------------|---------------|-------------------|-----|
| HLS Streams | ✅ AVPlayer | ✅ ExoPlayer | ✅ | ✅ |
| MKV Files | ✅ FFmpeg | ✅ libmpv | ❌ | ✅ |
| Hardware Decode | ✅ VideoToolbox | ✅ MediaCodec | ✅ | ⚠️ Limited |
| Multi-Audio | ✅ | ✅ | ✅ | ✅ |
| External Subs | ✅ | ✅ | ⚠️ Limited | ✅ |
| AirPlay/Cast | ✅ AirPlay | ✅ Cast | ✅ | ❌ |
| Background Play | ✅ | ✅ | ✅ | ⚠️ |
| PiP Mode | ✅ | ✅ | ✅ | ❌ |

### Player Hook Inventory

| Hook | File | Purpose | Lines | Rust Migration |
|------|------|---------|-------|---------------|
| `usePlayerState` | `hooks/usePlayerState.ts` | Player state (paused, time, buffering) | 122 | ✅ Critical |
| `usePlayerModals` | `hooks/usePlayerModals.ts` | Modal visibility state | 58 | ❌ Keep UI |
| `useSpeedControl` | `hooks/useSpeedControl.ts` | Playback rate control | 120 | ✅ Yes |
| `useOpeningAnimation` | `hooks/useOpeningAnimation.ts` | Player intro animation | 172 | ❌ Keep UI |
| `useWatchProgress` | `hooks/useWatchProgress.ts` | Resume positions, Trakt | 174 | ✅ Critical |
| `usePlayerTracks` | `hooks/usePlayerTracks.ts` | Track selection | 59 | ✅ Yes |
| `usePlayerSetup` | `hooks/usePlayerSetup.ts` | Player initialization | 145 | ✅ Yes |
| `usePlayerControls` | `hooks/usePlayerControls.ts` | Control event handlers | 73 | ⚠️ Partial |
| `useNextEpisode` | `hooks/useNextEpisode.ts` | Auto-play next episode | 78 | ✅ Yes |
| `useCustomSubtitles` | `hooks/useCustomSubtitles.ts` | External subtitle parsing | 201 | ✅ Yes |

### Native Plugin Structure

**MPV Bridge Plugin** (`plugins/mpv-bridge/`):
```
plugins/mpv-bridge/
├── android/
│   └── mpv/
│       ├── MpvPackage.kt              # React Native package
│       ├── MpvPlayerViewManager.kt     # View manager
│       └── MPVView.kt                  # Native MPV view
├── withMpvBridge.js                    # Expo config plugin
└── README.md
```

**Expo Config Plugin Integration**:
```javascript
// withMpvBridge.js
module.exports = function withMpvBridge(config) {
  // Add MPV native dependencies
  // Configure Android build.gradle
  // Add iOS framework (if supported)
};
```

### Storage Keys

**Player Settings**:
- `@nuvio_speed_settings` - Playback speed preferences
- `@nuvio_tv_seek_settings` - TV remote seek interval
- `downloads_state_v1` - Download queue state

**Watch Progress**:
- Stored via `storageService` / `mmkvStorage`
- Keys: `{contentId}:{episodeId}:position`

---

**End of Document**

**Next Steps for Migration**:
1. Review Rust state machine design (ADR required)
2. Create player state migration plan
3. Design Rust ↔ Native bridge API
4. Prototype download manager in Rust
5. Define Cast state synchronization protocol

**Document Maintenance**:
- Update after each native player change
- Validate type definitions match native implementations
- Keep track selection logic synchronized
