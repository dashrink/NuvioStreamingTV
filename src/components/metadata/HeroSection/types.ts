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
