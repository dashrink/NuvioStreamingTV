/**
 * Shared types and interfaces for the HeroSection component family.
 * Extracted from the original HeroSection.tsx to enable composition and reuse.
 */

import type { SharedValue } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

/**
 * Content type for media items
 */
export type ContentType = 'movie' | 'series';

/**
 * Watch progress data structure with optional Trakt integration
 */
export interface WatchProgress {
  currentTime: number;
  duration: number;
  lastUpdated: number;
  episodeId?: string;
  traktSynced?: boolean;
  traktProgress?: number;
}

/**
 * Episode details returned by getEpisodeDetails callback
 */
export interface EpisodeDetails {
  seasonNumber: string;
  episodeNumber: string;
  episodeName: string;
}

/**
 * Props for the main HeroSection component
 */
export interface HeroSectionProps {
  metadata: any;
  bannerImage: string | null;
  loadingBanner: boolean;
  scrollY: SharedValue<number>;
  heroHeight: SharedValue<number>;
  heroOpacity: SharedValue<number>;
  logoOpacity: SharedValue<number>;
  buttonsOpacity: SharedValue<number>;
  buttonsTranslateY: SharedValue<number>;
  watchProgressOpacity: SharedValue<number>;
  watchProgressWidth: SharedValue<number>;
  watchProgress: WatchProgress | null;
  onStableLogoUriChange?: (logoUri: string | null) => void;
  type: ContentType;
  getEpisodeDetails: (episodeId: string) => EpisodeDetails | null;
  handleShowStreams: () => void;
  handleToggleLibrary: () => void;
  inLibrary: boolean;
  id: string;
  navigation: any;
  getPlayButtonText: () => string;
  setBannerImage: (bannerImage: string | null) => void;
  groupedEpisodes?: { [seasonNumber: number]: any[] };
  // Trakt integration props
  isAuthenticated?: boolean;
  isInWatchlist?: boolean;
  isInCollection?: boolean;
  onToggleWatchlist?: () => void;
  onToggleCollection?: () => void;
  dynamicBackgroundColor?: string;
  handleBack: () => void;
  tmdbId?: number | null;
}

/**
 * Props for the ActionButtons component
 */
export interface ActionButtonsProps {
  handleShowStreams: () => void;
  toggleLibrary: () => void;
  inLibrary: boolean;
  type: ContentType;
  id: string;
  navigation: any;
  playButtonText: string;
  animatedStyle: any;
  isWatched: boolean;
  watchProgress: WatchProgress | null;
  groupedEpisodes?: { [seasonNumber: number]: any[] };
  metadata: any;
  settings: any;
  // Trakt integration props
  isAuthenticated?: boolean;
  isInWatchlist?: boolean;
  isInCollection?: boolean;
  onToggleWatchlist?: () => void;
  onToggleCollection?: () => void;
}

/**
 * Props for the WatchProgressDisplay component
 */
export interface WatchProgressDisplayProps {
  watchProgress: WatchProgress | null;
  type: ContentType;
  getEpisodeDetails: (episodeId: string) => EpisodeDetails | null;
  animatedStyle: any;
  isWatched: boolean;
  isTrailerPlaying: boolean;
  trailerMuted: boolean;
  trailerReady: boolean;
}

/**
 * Computed progress data for WatchProgressDisplay
 */
export interface ProgressData {
  progressPercent: number;
  formattedTime: string;
  episodeInfo: string;
  displayText: string;
  syncStatus: string;
  isTraktSynced: boolean;
  isWatched: boolean;
}

/**
 * Props for the HeroBackButton component
 */
export interface HeroBackButtonProps {
  onPress: () => void;
  animatedStyle?: any;
}

/**
 * Props for the HeroGradientOverlay component
 */
export interface HeroGradientOverlayProps {
  /** Optional dynamic background color extracted from the content. Falls back to theme darkBackground. */
  dynamicBackgroundColor?: string;
  /** Optional animated style for scroll-based animations */
  animatedStyle?: any;
  /** Content to render inside the gradient overlay (title card, genres, action buttons, etc.) */
  children?: React.ReactNode;
}

/**
 * Props for the HeroTitleCard component (logo/title display)
 */
export interface HeroTitleCardProps {
  metadata: any;
  type: ContentType;
  tmdbId?: number | null;
  logoOpacity: SharedValue<number>;
  onStableLogoUriChange?: (logoUri: string | null) => void;
}

/**
 * Props for the HeroGenres component
 */
export interface HeroGenresProps {
  genres: string[];
  animatedStyle?: any;
}

/**
 * Props for the GlassBlurBackground component
 */
export interface GlassBlurBackgroundProps {
  intensity?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * Props for the TrailerControls component
 */
export interface TrailerControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onAIChat?: () => void;
  animatedStyle?: any;
}

/**
 * Props for the HeroBackdrop component
 */
export interface HeroBackdropProps {
  bannerImage: string | null;
  loadingBanner: boolean;
  scrollY: SharedValue<number>;
  animatedStyle?: any;
}

/**
 * Props for the HeroTrailerLayer component
 */
export interface HeroTrailerLayerProps {
  /** URL of the trailer video. Can be null if not yet loaded. */
  trailerUrl: string | null;
  /** Whether the trailer has been preloaded and is ready to display */
  isReady: boolean;
  /** Whether the trailer should be visible (vs hidden preload state) */
  isVisible: boolean;
  /** Whether the trailer audio is muted */
  isMuted: boolean;
  /** Shared value tracking scroll position for parallax effects */
  scrollY: SharedValue<number>;
  /** Callback when trailer finishes loading and is ready to play */
  onReady?: () => void;
  /** Callback when trailer playback ends */
  onEnd?: () => void;
  /** Callback when trailer encounters an error */
  onError?: () => void;
  /** Animated style from parent (typically opacity transitions) */
  animatedStyle?: any;
  /** Whether to auto-play the trailer when visible */
  autoPlay?: boolean;
  /** Callback for playback status updates */
  onPlaybackStatusUpdate?: (status: { isLoaded: boolean; didJustFinish: boolean }) => void;
  /** Callback when fullscreen toggle is requested */
  onFullscreenToggle?: () => void;
}

/**
 * Theme colors subset used in HeroSection components
 */
export interface HeroThemeColors {
  white: string;
  black: string;
  primary: string;
  text: string;
  textSecondary: string;
  background: string;
}

// =============================================================================
// Hook Types
// =============================================================================

/**
 * Props for the useTrailerPlayback hook
 */
export interface UseTrailerPlaybackProps {
  /** Content metadata containing name, year, and optional tmdbId */
  metadata: {
    name?: string;
    year?: number;
    tmdbId?: number;
    id?: string;
    [key: string]: any;
  } | null;
  /** Optional TMDB ID for more accurate trailer lookup */
  tmdbId?: number | null;
  /** Content type: 'movie' or 'series' */
  type: ContentType;
  /** Shared value tracking scroll position */
  scrollY: SharedValue<number>;
  /** Shared value tracking hero section height */
  heroHeight: SharedValue<number>;
  /** Whether trailers are enabled in settings */
  showTrailers: boolean;
  /** Callback for watch progress opacity animation on trailer end */
  watchProgressOpacity?: SharedValue<number>;
  /** Callback for buttons opacity animation on trailer end */
  buttonsOpacity?: SharedValue<number>;
}

/**
 * Return type for the useTrailerPlayback hook
 */
export interface UseTrailerPlaybackReturn {
  // Trailer state
  /** The fetched trailer URL, or null if not loaded/available */
  trailerUrl: string | null;
  /** Whether trailer is currently being fetched */
  trailerLoading: boolean;
  /** Whether trailer fetch encountered an error */
  trailerError: boolean;
  /** Whether trailer is preloaded (loaded in hidden player) */
  trailerPreloaded: boolean;
  /** Whether trailer is ready to play (visible and playable) */
  trailerReady: boolean;

  // Animation values
  /** Shared value for trailer layer opacity (0 = hidden, 1 = visible) */
  trailerOpacity: SharedValue<number>;
  /** Shared value for thumbnail image opacity (inverse of trailer) */
  thumbnailOpacity: SharedValue<number>;
  /** Shared value for action buttons opacity during unmuted playback */
  actionButtonsOpacity: SharedValue<number>;
  /** Shared value for title card vertical offset during unmuted playback */
  titleCardTranslateY: SharedValue<number>;
  /** Shared value for genre text opacity during unmuted playback */
  genreOpacity: SharedValue<number>;

  // Refs
  /** Ref to the TrailerPlayer component for fullscreen control */
  trailerVideoRef: React.RefObject<any>;

  // Handlers
  /** Called when preload player finishes loading */
  handleTrailerPreloaded: () => void;
  /** Called when visible trailer is ready to play */
  handleTrailerReady: () => void;
  /** Called when trailer encounters an error */
  handleTrailerError: () => void;
  /** Called when trailer playback ends */
  handleTrailerEnd: () => Promise<void>;
  /** Called to toggle fullscreen mode */
  handleFullscreenToggle: () => Promise<void>;
  /** Resets trailer state (used when unfocused) */
  resetTrailerState: () => void;
}

/**
 * Props for the useStableLogo hook
 */
export interface UseStableLogoProps {
  /** Primary logo URL (typically from TMDB) */
  logo?: string | null;
  /** Secondary fallback logo URL (from addon) */
  addonLogo?: string | null;
  /** Callback when stable logo URI changes */
  onStableLogoUriChange?: (logoUri: string | null) => void;
}

/**
 * Return type for the useStableLogo hook
 */
export interface UseStableLogoReturn {
  /** The currently stable logo URI to display */
  stableLogoUri: string | null;
  /** Whether text fallback should be shown instead of logo */
  shouldShowTextFallback: boolean;
  /** Whether a logo has loaded successfully */
  logoHasLoadedSuccessfully: boolean;
  /** Shared value for logo load fade-in animation (0 = hidden, 1 = visible) */
  logoLoadOpacity: SharedValue<number>;
  /** Handler for successful logo load */
  handleLogoLoad: () => void;
  /** Handler for logo load error - implements fallback logic */
  handleLogoError: () => void;
  /** Reset logo state to initial values (useful when content changes) */
  resetLogoState: () => void;
  /** Manually set the stable logo URI */
  setStableLogoUri: (uri: string | null) => void;
  /** Current fallback level: 'primary' | 'addon' | 'text' */
  fallbackLevel: 'primary' | 'addon' | 'text';
}
