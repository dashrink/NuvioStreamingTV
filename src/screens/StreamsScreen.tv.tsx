/**
 * StreamsScreen.tv.tsx
 *
 * TV-specific stream selection screen with complete D-pad navigation support.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - Provider tabs navigable via D-pad (left/right)
 * - Stream list fully navigable with D-pad (up/down)
 * - Select button starts playback
 * - Back/menu button returns to metadata screen
 * - Focus memory persists across screen navigation
 * - Long-press on stream opens context menu (Copy URL, Download)
 * - Integration with TVNavigationContext for global focus state
 *
 * @example
 * ```tsx
 * // This file is automatically loaded by Metro when APP_VARIANT=tv
 * // No explicit import needed - use StreamsScreen and the correct variant loads
 * ```
 */

import React, { useCallback, useMemo, memo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  Dimensions,
  Linking,
  Clipboard,
  Image as RNImage,
  findNodeHandle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FastImage from '@d11/react-native-fast-image';
import { RootStackParamList, RootStackNavigationProp } from '../navigation/AppNavigator';
import { useMetadata } from '../hooks/useMetadata';
import { useMetadataAssets } from '../hooks/useMetadataAssets';
import { useTheme } from '../contexts/ThemeContext';
import { useTrailer } from '../contexts/TrailerContext';
import { Stream } from '../types/metadata';
import { tmdbService, IMDbRatings } from '../services/tmdbService';
import { stremioService } from '../services/stremioService';
import { localScraperService } from '../services/pluginService';
import { VideoPlayerService } from '../services/videoPlayerService';
import { useSettings } from '../hooks/useSettings';
import { logger } from '../utils/logger';
import { isMkvStream } from '../utils/mkvDetection';
import CustomAlert from '../components/CustomAlert';
import { useToast } from '../contexts/ToastContext';
import { useDownloads } from '../contexts/DownloadsContext';
import { streamCacheService } from '../services/streamCacheService';
import { useDominantColor } from '../hooks/useDominantColor';
import { PaperProvider } from 'react-native-paper';
import { BlurView as ExpoBlurView } from 'expo-blur';
import TabletStreamsLayout from '../components/TabletStreamsLayout';
import ProviderFilter from '../components/ProviderFilter';
import PulsingChip from '../components/PulsingChip';
import StreamCard from '../components/StreamCard';
import AnimatedImage from '../components/AnimatedImage';
import AnimatedText from '../components/AnimatedText';
import AnimatedView from '../components/AnimatedView';

// TV-specific imports
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { useTVBackHandler } from '../hooks/useTVBackHandler';
import Focusable, { FocusableRef } from '../components/common/Focusable';
import TVContextMenu from '../components/tv/TVContextMenu';

// Lazy-safe community blur import for Android
let AndroidBlurView: any = null;
if (Platform.OS === 'android') {
  try {
    AndroidBlurView = require('@react-native-community/blur').BlurView;
  } catch (_) {
    AndroidBlurView = null;
  }
}

const TMDB_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tmdb.new.logo.svg/512px-Tmdb.new.logo.svg.png?20200406190906';
const IMDb_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/575px-IMDB_Logo_2016.svg.png';

const { width, height } = Dimensions.get('window');

// Cache for scraper logos to avoid repeated async calls
const scraperLogoCache = new Map<string, string>();
let scraperLogoCachePromise: Promise<void> | null = null;

// Short-budget HEAD detection to avoid long delays before navigation
const MKV_HEAD_TIMEOUT_MS = 600;

const detectMkvViaHead = async (url: string, headers?: Record<string, string>) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MKV_HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers,
      signal: controller.signal as any,
    } as any);
    const contentType = res.headers.get('content-type') || '';
    return /matroska|x-matroska/i.test(contentType);
  } catch (_e) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

// TV-responsive breakpoints
const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

const getDeviceType = (deviceWidth: number) => {
  if (deviceWidth >= BREAKPOINTS.tv) return 'tv';
  if (deviceWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
  if (deviceWidth >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
};

// =============================================================================
// TV Stream Item Component
// =============================================================================

interface TVStreamItemProps {
  stream: Stream;
  index: number;
  onPress: () => void;
  theme: any;
  showLogos?: boolean;
  scraperLogo?: string | null;
  showAlert: (title: string, message: string) => void;
  parentTitle?: string;
  parentType?: 'movie' | 'series';
  parentSeason?: number;
  parentEpisode?: number;
  parentEpisodeTitle?: string;
  parentPosterUrl?: string | null;
  providerName?: string;
  parentId?: string;
  parentImdbId?: string;
  focusId: string;
  onFocus: (focusId: string, index: number) => void;
  hasTVPreferredFocus?: boolean;
  nextFocusUp?: number;
  nextFocusDown?: number;
}

const TVStreamItem: React.FC<TVStreamItemProps> = memo(({
  stream,
  index,
  onPress,
  theme,
  showLogos,
  scraperLogo,
  showAlert,
  parentTitle,
  parentType,
  parentSeason,
  parentEpisode,
  parentEpisodeTitle,
  parentPosterUrl,
  providerName,
  parentId,
  parentImdbId,
  focusId,
  onFocus,
  hasTVPreferredFocus = false,
  nextFocusUp,
  nextFocusDown,
}) => {
  const handleFocus = useCallback(() => {
    onFocus(focusId, index);
  }, [onFocus, focusId, index]);

  // Build nextFocus props
  const nextFocusProps = useMemo(() => {
    const props: any = {};
    if (nextFocusUp !== undefined) props.nextFocusUp = nextFocusUp;
    if (nextFocusDown !== undefined) props.nextFocusDown = nextFocusDown;
    return props;
  }, [nextFocusUp, nextFocusDown]);

  return (
    <StreamCard
      stream={stream}
      onPress={onPress}
      index={index}
      isLoading={false}
      statusMessage={undefined}
      theme={theme}
      showLogos={showLogos}
      scraperLogo={scraperLogo}
      showAlert={showAlert}
      parentTitle={parentTitle}
      parentType={parentType}
      parentSeason={parentSeason}
      parentEpisode={parentEpisode}
      parentEpisodeTitle={parentEpisodeTitle}
      parentPosterUrl={parentPosterUrl}
      providerName={providerName}
      parentId={parentId}
      parentImdbId={parentImdbId}
      focusId={focusId}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={handleFocus}
      nextFocusUp={nextFocusProps.nextFocusUp}
      nextFocusDown={nextFocusProps.nextFocusDown}
    />
  );
});

TVStreamItem.displayName = 'TVStreamItem';

// =============================================================================
// Main StreamsScreen Component
// =============================================================================

export const StreamsScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'Streams'>>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { id, type, episodeId, episodeThumbnail, fromPlayer } = route.params;
  const { settings } = useSettings();
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const { pauseTrailer, resumeTrailer } = useTrailer();
  const { showSuccess, showInfo } = useToast();

  // TV Navigation context for focus state
  const tvNav = useTVNavigationOptional();
  const spatialNav = useSpatialNavigation('StreamsScreen', { autoRestoreFocus: true });

  // TV Back handler
  useTVBackHandler({
    onBack: () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    },
  });

  // Refs for focus management
  const providerFilterRef = useRef<View>(null);
  const streamListRef = useRef<FlatList>(null);
  const firstStreamRef = useRef<FocusableRef>(null);

  // Track focused stream index for focus memory
  const [focusedStreamIndex, setFocusedStreamIndex] = useState(0);

  // Dimension listener for layout
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const prevDimensionsRef = useRef({ width: dimensions.width, height: dimensions.height });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const widthChanged = Math.abs(window.width - prevDimensionsRef.current.width) > 1;
      const heightChanged = Math.abs(window.height - prevDimensionsRef.current.height) > 1;

      if (widthChanged || heightChanged) {
        prevDimensionsRef.current = { width: window.width, height: window.height };
        setDimensions(window);
      }
    });
    return () => subscription?.remove();
  }, []);

  const deviceWidth = dimensions.width;
  const isTablet = useMemo(() => deviceWidth >= 768, [deviceWidth]);
  const isTV = useMemo(() => getDeviceType(deviceWidth) === 'tv' || Platform.isTV, [deviceWidth]);

  // Refs to prevent excessive updates
  const isMounted = useRef(true);
  const hasDoneInitialLoadRef = useRef(false);
  const isLoadingStreamsRef = useRef(false);

  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<Array<{ label: string; onPress: () => void; style?: object }>>([]);

  const openAlert = useCallback((
    title: string,
    message: string,
    actions?: Array<{ label: string; onPress: () => void; style?: object }>
  ) => {
    if (!isMounted.current) return;
    try {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertActions(actions && actions.length > 0 ? actions : [{ label: 'OK', onPress: () => { } }]);
      setAlertVisible(true);
    } catch (error) {
      console.warn('[StreamsScreen.tv] Error showing alert:', error);
    }
  }, []);

  // Stream loading state
  const [streamsLoadStart, setStreamsLoadStart] = useState<number | null>(null);
  const [providerLoadTimes, setProviderLoadTimes] = useState<{ [key: string]: number }>({});
  const [loadingProviders, setLoadingProviders] = useState<{ [key: string]: boolean }>({});
  const [autoplayTriggered, setAutoplayTriggered] = useState(false);
  const [isAutoplayWaiting, setIsAutoplayWaiting] = useState(false);
  const [hasStreamProviders, setHasStreamProviders] = useState(true);
  const [hasStremioStreamProviders, setHasStremioStreamProviders] = useState(true);
  const [showNoSourcesError, setShowNoSourcesError] = useState(false);
  const [movieLogoError, setMovieLogoError] = useState(false);
  const [scraperLogos, setScraperLogos] = useState<Record<string, string>>({});

  // Pause trailer when StreamsScreen is opened
  useEffect(() => {
    pauseTrailer();
    return () => {
      resumeTrailer();
    };
  }, [pauseTrailer, resumeTrailer]);

  const {
    metadata,
    episodes,
    groupedStreams,
    loadingStreams,
    episodeStreams,
    loadingEpisodeStreams,
    selectedEpisode,
    loadStreams,
    loadEpisodeStreams,
    setSelectedEpisode,
    groupedEpisodes,
    imdbId,
    scraperStatuses,
    activeFetchingScrapers,
    addonResponseOrder,
  } = useMetadata({ id, type });

  // Get backdrop from metadata assets
  const setMetadataStub = useCallback(() => { }, []);
  const memoizedSettings = useMemo(() => settings, [settings.logoSourcePreference, settings.tmdbLanguagePreference, settings.enrichMetadataWithTMDB]);
  const { bannerImage } = useMetadataAssets(metadata, id, type, imdbId, memoizedSettings, setMetadataStub);

  // Create styles using current theme colors
  const styles = useMemo(() => createStyles(colors, isTV), [colors, isTV]);

  const [selectedProvider, setSelectedProvider] = useState('all');
  const [availableProviders, setAvailableProviders] = useState<Set<string>>(new Set());

  // Preload scraper logos
  useEffect(() => {
    const preloadScraperLogos = async () => {
      if (!scraperLogoCachePromise) {
        scraperLogoCachePromise = (async () => {
          try {
            const availableScrapers = await localScraperService.getAvailableScrapers();
            const map: Record<string, string> = {};
            availableScrapers.forEach(scraper => {
              if (scraper.logo && scraper.id) {
                scraperLogoCache.set(scraper.id, scraper.logo);
                map[scraper.id] = scraper.logo;
              }
            });
            setScraperLogos(map);
          } catch (error) {
            // Silently fail
          }
        })();
      }
    };
    preloadScraperLogos();
  }, []);

  // Monitor streams loading and update available providers
  const prevProvidersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isMounted.current) return;

    const currentStreamsData = metadata?.videos && metadata.videos.length > 1 && selectedEpisode ? episodeStreams : groupedStreams;

    const providersWithStreams = Object.entries(currentStreamsData)
      .filter(([_, data]) => data.streams && data.streams.length > 0)
      .map(([providerId]) => providerId);

    if (providersWithStreams.length > 0) {
      const hasNewProviders = providersWithStreams.some(
        provider => !prevProvidersRef.current.has(provider)
      );

      if (hasNewProviders) {
        setAvailableProviders(prevProviders => {
          const newProviders = new Set([...prevProviders, ...providersWithStreams]);
          prevProvidersRef.current = newProviders;
          return newProviders;
        });
      }
    }

    // Update loading states
    const expectedProviders = ['stremio'];
    setLoadingProviders(prevLoading => {
      const nextLoading = { ...prevLoading };
      let changed = false;
      expectedProviders.forEach(providerId => {
        const providerExists = currentStreamsData[providerId];
        const shouldStopLoading = providerExists || !(loadingStreams || loadingEpisodeStreams);
        const value = !shouldStopLoading;
        if (nextLoading[providerId] !== value) {
          nextLoading[providerId] = value;
          changed = true;
        }
      });
      return changed ? nextLoading : prevLoading;
    });
  }, [loadingStreams, loadingEpisodeStreams, groupedStreams, episodeStreams, type]);

  // Reset autoplay state when episode changes
  useEffect(() => {
    setAutoplayTriggered(false);
  }, [selectedEpisode]);

  // Reset selected provider if no longer available
  useEffect(() => {
    const isSpecialFilter = selectedProvider === 'all' || selectedProvider === 'grouped-plugins';
    if (isSpecialFilter) return;

    const currentStreamsData = metadata?.videos && metadata.videos.length > 1 && selectedEpisode ? episodeStreams : groupedStreams;
    const hasStreamsForProvider = currentStreamsData[selectedProvider]?.streams?.length > 0;
    const isAvailableProvider = availableProviders.has(selectedProvider);

    if (!isAvailableProvider && !hasStreamsForProvider) {
      setSelectedProvider('all');
    }
  }, [selectedProvider, availableProviders, episodeStreams, groupedStreams, type]);

  // Check for available providers
  useEffect(() => {
    hasDoneInitialLoadRef.current = false;
    isLoadingStreamsRef.current = false;

    const checkProviders = async () => {
      if (isLoadingStreamsRef.current) return;
      isLoadingStreamsRef.current = true;

      try {
        const hasStremioProviders = await stremioService.hasStreamProviders(type);
        const hasLocalScrapers = settings.enableLocalScrapers && await localScraperService.hasScrapers();
        const hasProviders = hasStremioProviders || hasLocalScrapers;

        if (!isMounted.current) return;

        setHasStreamProviders(hasProviders);
        setHasStremioStreamProviders(hasStremioProviders);

        if (!hasProviders) {
          const timer = setTimeout(() => {
            if (isMounted.current) setShowNoSourcesError(true);
          }, 500);
          return () => clearTimeout(timer);
        } else {
          if (episodeId) {
            setLoadingProviders({ 'stremio': true });
            setSelectedEpisode(episodeId);
            setStreamsLoadStart(Date.now());
            loadEpisodeStreams(episodeId);
          } else if (type === 'movie') {
            setStreamsLoadStart(Date.now());
            loadStreams();
          } else if (type === 'tv') {
            setLoadingProviders({ 'stremio': true });
            setStreamsLoadStart(Date.now());
            loadStreams();
          } else {
            setLoadingProviders({ 'stremio': true });
            setStreamsLoadStart(Date.now());
            loadStreams();
          }

          setAutoplayTriggered(false);
          if (settings.autoplayBestStream && !fromPlayer) {
            setIsAutoplayWaiting(true);
          } else {
            setIsAutoplayWaiting(false);
          }
        }
      } finally {
        isLoadingStreamsRef.current = false;
      }
    };

    checkProviders();
  }, [type, id, episodeId, settings.autoplayBestStream, fromPlayer]);

  // Memoize handlers
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('MainTabs');
    }
  }, [navigation]);

  const handleProviderChange = useCallback((provider: string) => {
    setSelectedProvider(provider);
    // Reset focus to first stream when changing provider
    setFocusedStreamIndex(0);
  }, []);

  // Helper function to filter streams by quality exclusions
  const filterStreamsByQuality = useCallback((streams: Stream[]) => {
    if (!settings.excludedQualities || settings.excludedQualities.length === 0) {
      return streams;
    }

    return streams.filter(stream => {
      const streamTitle = stream.title || stream.name || '';
      const hasExcludedQuality = settings.excludedQualities.some(excludedQuality => {
        if (excludedQuality === 'Auto') {
          return /\b(auto|adaptive)\b/i.test(streamTitle);
        } else {
          const pattern = new RegExp(excludedQuality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          return pattern.test(streamTitle);
        }
      });
      return !hasExcludedQuality;
    });
  }, [settings.excludedQualities]);

  // Helper function to filter streams by language exclusions
  const filterStreamsByLanguage = useCallback((streams: Stream[]) => {
    if (!settings.excludedLanguages || settings.excludedLanguages.length === 0) {
      return streams;
    }

    return streams.filter(stream => {
      const streamName = stream.name || '';
      const streamTitle = stream.title || '';
      const streamDescription = stream.description || '';
      const searchText = `${streamName} ${streamTitle} ${streamDescription}`.toLowerCase();

      const hasExcludedLanguage = settings.excludedLanguages.some(excludedLanguage => {
        const langLower = excludedLanguage.toLowerCase();
        const variations = [langLower];

        if (langLower === 'latin') variations.push('latino', 'latina', 'lat');
        else if (langLower === 'spanish') variations.push('espanol', 'spa');
        else if (langLower === 'german') variations.push('deutsch', 'ger');
        else if (langLower === 'french') variations.push('francais', 'fre');
        else if (langLower === 'portuguese') variations.push('portugues', 'por');

        return variations.some(variant => searchText.includes(variant));
      });

      return !hasExcludedLanguage;
    });
  }, [settings.excludedLanguages]);

  // Get best stream for autoplay
  const getBestStream = useCallback((streamsData: typeof groupedStreams): Stream | null => {
    if (!streamsData || Object.keys(streamsData).length === 0) return null;

    const getQualityNumeric = (title: string | undefined): number => {
      if (!title) return 0;
      if (/\b4k\b/i.test(title)) return 2160;
      const matchWithP = title.match(/(\d+)p/i);
      if (matchWithP) return parseInt(matchWithP[1], 10);
      return 0;
    };

    const getProviderPriority = (addonId: string): number => {
      const installedAddons = stremioService.getInstalledAddons();
      const addonIndex = installedAddons.findIndex(addon => addon.id === addonId);
      if (addonIndex !== -1) return 50 - addonIndex;
      return 0;
    };

    const allStreams: Array<{ stream: Stream; quality: number; providerPriority: number }> = [];

    Object.entries(streamsData).forEach(([addonId, { streams }]) => {
      const qualityFiltered = filterStreamsByQuality(streams);
      const filteredStreams = filterStreamsByLanguage(qualityFiltered);

      filteredStreams.forEach(stream => {
        const quality = getQualityNumeric(stream.name || stream.title);
        const providerPriority = getProviderPriority(addonId);
        allStreams.push({ stream, quality, providerPriority });
      });
    });

    if (allStreams.length === 0) return null;

    allStreams.sort((a, b) => {
      if (a.quality !== b.quality) return b.quality - a.quality;
      if (a.providerPriority !== b.providerPriority) return b.providerPriority - a.providerPriority;
      return 0;
    });

    return allStreams[0].stream;
  }, [filterStreamsByQuality, filterStreamsByLanguage]);

  const currentEpisode = useMemo(() => {
    if (!selectedEpisode) return null;
    const allEpisodes = Object.values(groupedEpisodes).flat();
    return allEpisodes.find(ep =>
      ep.stremioId === selectedEpisode ||
      `${id}:${ep.season_number}:${ep.episode_number}` === selectedEpisode
    );
  }, [selectedEpisode, groupedEpisodes, id]);

  // TMDB hydration for series hero
  const [tmdbEpisodeOverride, setTmdbEpisodeOverride] = useState<{ vote_average?: number; runtime?: number; still_path?: string } | null>(null);
  const [imdbRatingsMap, setImdbRatingsMap] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const hydrateEpisodeFromTmdb = async () => {
      try {
        setTmdbEpisodeOverride(null);
        if (type !== 'series' || !currentEpisode || !id) return;
        const needsHydration = !(currentEpisode as any).runtime || !(currentEpisode as any).vote_average || !currentEpisode.still_path;
        if (!needsHydration) return;

        let tmdbShowId: number | null = null;
        if (id.startsWith('tmdb:')) {
          tmdbShowId = parseInt(id.split(':')[1], 10);
        } else if (id.startsWith('tt')) {
          tmdbShowId = await tmdbService.findTMDBIdByIMDB(id);
        }
        if (!tmdbShowId) return;

        const allEpisodes: Record<string, any[]> = await tmdbService.getAllEpisodes(tmdbShowId) as any;
        const seasonKey = String(currentEpisode.season_number);
        const seasonList: any[] = (allEpisodes && (allEpisodes as any)[seasonKey]) || [];
        const ep = seasonList.find((e: any) => e.episode_number === currentEpisode.episode_number);
        if (ep) {
          setTmdbEpisodeOverride({
            vote_average: ep.vote_average,
            runtime: ep.runtime,
            still_path: ep.still_path,
          });
        }
      } catch (e) {
        logger.warn('[StreamsScreen.tv] TMDB hydration failed:', e);
      }
    };

    hydrateEpisodeFromTmdb();
  }, [type, id, currentEpisode?.season_number, currentEpisode?.episode_number]);

  const navigateToPlayer = useCallback(async (stream: Stream, options?: { forceVlc?: boolean; headers?: Record<string, string> }) => {
    const filterHeadersForVidrock = (headers: Record<string, string> | undefined): Record<string, string> | undefined => {
      if (!headers) return undefined;
      const essentialHeaders: Record<string, string> = {};
      if ((headers as any)['User-Agent']) essentialHeaders['User-Agent'] = (headers as any)['User-Agent'];
      if ((headers as any)['Referer']) essentialHeaders['Referer'] = (headers as any)['Referer'];
      if ((headers as any)['Origin']) essentialHeaders['Origin'] = (headers as any)['Origin'];
      return Object.keys(essentialHeaders).length > 0 ? essentialHeaders : undefined;
    };

    const finalHeaders = filterHeadersForVidrock((options?.headers || stream.headers) as any);
    const streamsToPass = (type === 'series' || (type === 'other' && selectedEpisode)) ? episodeStreams : groupedStreams;
    const streamName = stream.name || stream.title || 'Unnamed Stream';
    const streamProvider = stream.addonId || stream.addonName || stream.name;
    let forceVlc = !!options?.forceVlc;

    // Save stream to cache
    try {
      const epId = (type === 'series' || type === 'other') && selectedEpisode ? selectedEpisode : undefined;
      const season = (type === 'series' || type === 'other') ? currentEpisode?.season_number : undefined;
      const episode = (type === 'series' || type === 'other') ? currentEpisode?.episode_number : undefined;
      const episodeTitle = (type === 'series' || type === 'other') ? currentEpisode?.name : undefined;

      await streamCacheService.saveStreamToCache(
        id,
        type,
        stream,
        metadata,
        epId,
        season,
        episode,
        episodeTitle,
        imdbId || undefined,
        settings.streamCacheTTL
      );
    } catch (error) {
      logger.warn('[StreamsScreen.tv] Failed to save stream to cache:', error);
    }

    // Infer video type
    const inferVideoTypeFromUrl = (u?: string): string | undefined => {
      if (!u) return undefined;
      const lower = u.toLowerCase();
      if (/(\.|ext=)(m3u8)(\b|$)/i.test(lower)) return 'm3u8';
      if (/(\.|ext=)(mpd)(\b|$)/i.test(lower)) return 'mpd';
      if (/(\.|ext=)(mp4)(\b|$)/i.test(lower)) return 'mp4';
      return undefined;
    };
    let videoType = inferVideoTypeFromUrl(stream.url);

    const playerRoute = Platform.OS === 'ios' ? 'PlayerIOS' : 'PlayerAndroid';

    navigation.navigate(playerRoute as any, {
      uri: stream.url as any,
      title: metadata?.name || '',
      episodeTitle: (type === 'series' || type === 'other') ? currentEpisode?.name : undefined,
      season: (type === 'series' || type === 'other') ? currentEpisode?.season_number : undefined,
      episode: (type === 'series' || type === 'other') ? currentEpisode?.episode_number : undefined,
      quality: (stream.title?.match(/(\d+)p/) || [])[1] || undefined,
      year: metadata?.year,
      streamProvider: streamProvider,
      streamName: streamName,
      headers: finalHeaders,
      forceVlc,
      id,
      type,
      episodeId: (type === 'series' || type === 'other') && selectedEpisode ? selectedEpisode : undefined,
      imdbId: imdbId || undefined,
      availableStreams: streamsToPass,
      backdrop: bannerImage,
      videoType: videoType,
    } as any);
  }, [metadata, type, currentEpisode, navigation, id, selectedEpisode, imdbId, episodeStreams, groupedStreams, bannerImage, settings.streamCacheTTL]);

  const handleStreamPress = useCallback(async (stream: Stream) => {
    try {
      if (stream.url) {
        if (typeof stream.url === 'string' && stream.url.startsWith('magnet:')) {
          openAlert('Not supported', 'Torrent streaming is not supported yet.');
          return;
        }

        // For iOS, try to open with the preferred external player
        if (Platform.OS === 'ios' && settings.preferredPlayer !== 'internal') {
          try {
            const streamUrl = encodeURIComponent(stream.url);
            let externalPlayerUrls: string[] = [];

            switch (settings.preferredPlayer) {
              case 'vlc':
                externalPlayerUrls = [`vlc://${stream.url}`, `vlc-x-callback://x-callback-url/stream?url=${streamUrl}`];
                break;
              case 'outplayer':
                externalPlayerUrls = [`outplayer://${stream.url}`, `outplayer://play?url=${streamUrl}`];
                break;
              case 'infuse':
                externalPlayerUrls = [`infuse://x-callback-url/play?url=${streamUrl}`];
                break;
              default:
                navigateToPlayer(stream);
                return;
            }

            const tryNextUrl = (index: number) => {
              if (index >= externalPlayerUrls.length) {
                navigateToPlayer(stream);
                return;
              }
              Linking.openURL(externalPlayerUrls[index])
                .catch(() => tryNextUrl(index + 1));
            };

            tryNextUrl(0);
          } catch (error) {
            navigateToPlayer(stream);
          }
        } else if (Platform.OS === 'android' && settings.useExternalPlayer) {
          try {
            const success = await VideoPlayerService.playVideo(stream.url, {
              useExternalPlayer: true,
              title: metadata?.name || 'Video',
              episodeTitle: (type === 'series' || type === 'other') ? currentEpisode?.name : undefined,
              episodeNumber: (type === 'series' || type === 'other') && currentEpisode ? `S${currentEpisode.season_number}E${currentEpisode.episode_number}` : undefined,
            });

            if (!success) {
              navigateToPlayer(stream);
            }
          } catch (error) {
            navigateToPlayer(stream);
          }
        } else {
          navigateToPlayer(stream);
        }
      }
    } catch (error) {
      navigateToPlayer(stream);
    }
  }, [settings.preferredPlayer, settings.useExternalPlayer, navigateToPlayer, metadata, type, currentEpisode, openAlert]);

  // Autoplay effect
  useEffect(() => {
    if (settings.autoplayBestStream && !autoplayTriggered && isAutoplayWaiting) {
      const streams = metadata?.videos && metadata.videos.length > 1 && selectedEpisode ? episodeStreams : groupedStreams;

      if (Object.keys(streams).length > 0) {
        const bestStream = getBestStream(streams);

        if (bestStream) {
          setAutoplayTriggered(true);
          setIsAutoplayWaiting(false);
          handleStreamPress(bestStream);
        } else {
          setIsAutoplayWaiting(false);
        }
      }
    }
  }, [settings.autoplayBestStream, autoplayTriggered, isAutoplayWaiting, type, episodeStreams, groupedStreams, getBestStream, handleStreamPress]);

  // Build filter items
  const filterItems = useMemo(() => {
    const installedAddons = stremioService.getInstalledAddons();
    const streams = metadata?.videos && metadata.videos.length > 1 && selectedEpisode ? episodeStreams : groupedStreams;

    const providersWithStreams = Object.keys(streams).filter(key => {
      const providerData = streams[key];
      return providerData?.streams?.length > 0;
    });

    const allProviders = new Set([
      ...Array.from(availableProviders).filter((provider: string) =>
        streams[provider]?.streams?.length > 0
      ),
      ...providersWithStreams
    ]);

    if (settings.streamDisplayMode === 'grouped') {
      const addonProviders: string[] = [];
      const pluginProviders: string[] = [];

      Array.from(allProviders).forEach(provider => {
        const isInstalledAddon = installedAddons.some(addon => addon.id === provider);
        if (isInstalledAddon) {
          addonProviders.push(provider);
        } else {
          pluginProviders.push(provider);
        }
      });

      const filterChips = [{ id: 'all', name: 'All Providers' }];

      addonProviders
        .sort((a, b) => {
          const indexA = installedAddons.findIndex(addon => addon.id === a);
          const indexB = installedAddons.findIndex(addon => addon.id === b);
          return indexA - indexB;
        })
        .forEach(provider => {
          const installedAddon = installedAddons.find(addon => addon.id === provider);
          filterChips.push({ id: provider, name: installedAddon?.name || provider });
        });

      if (pluginProviders.length > 0) {
        filterChips.push({ id: 'grouped-plugins', name: localScraperService.getRepositoryName() });
      }

      return filterChips;
    }

    return [
      { id: 'all', name: 'All Providers' },
      ...Array.from(allProviders)
        .sort((a, b) => {
          const indexA = installedAddons.findIndex(addon => addon.id === a);
          const indexB = installedAddons.findIndex(addon => addon.id === b);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0;
        })
        .map(provider => {
          const addonInfo = streams[provider];
          const installedAddon = installedAddons.find(addon => addon.id === provider);
          let displayName = provider;
          if (installedAddon) displayName = installedAddon.name;
          else if (addonInfo?.addonName) displayName = addonInfo.addonName;
          return { id: provider, name: displayName };
        })
    ];
  }, [availableProviders, type, episodeStreams, groupedStreams, settings.streamDisplayMode]);

  // Build sections
  const sections = useMemo(() => {
    const streams = metadata?.videos && metadata.videos.length > 1 && selectedEpisode ? episodeStreams : groupedStreams;
    const installedAddons = stremioService.getInstalledAddons();

    const filteredEntries = Object.entries(streams)
      .filter(([addonId]) => {
        if (selectedProvider === 'all') return true;
        if (settings.streamDisplayMode === 'grouped' && selectedProvider === 'grouped-plugins') {
          return !installedAddons.some(addon => addon.id === addonId);
        }
        return addonId === selectedProvider;
      });

    const sortedEntries = filteredEntries.sort(([addonIdA], [addonIdB]) => {
      const indexA = addonResponseOrder.indexOf(addonIdA);
      const indexB = addonResponseOrder.indexOf(addonIdB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });

    if (settings.streamDisplayMode === 'grouped') {
      const addonStreams: Stream[] = [];
      const pluginStreams: Stream[] = [];

      sortedEntries.forEach(([addonId, { addonName, streams: providerStreams }]) => {
        const isInstalledAddon = installedAddons.some(addon => addon.id === addonId);
        if (isInstalledAddon) {
          addonStreams.push(...providerStreams);
        } else {
          const qualityFiltered = filterStreamsByQuality(providerStreams);
          const filteredStreams = filterStreamsByLanguage(qualityFiltered);
          if (filteredStreams.length > 0) {
            pluginStreams.push(...filteredStreams);
          }
        }
      });

      if (addonStreams.length === 0 && pluginStreams.length === 0) {
        return [];
      }

      let combinedStreams = [...addonStreams, ...pluginStreams];

      return [{
        title: 'Available Streams',
        addonId: 'grouped-all',
        data: combinedStreams,
      }];
    } else {
      return sortedEntries.map(([addonId, { addonName, streams: providerStreams }]) => {
        const isInstalledAddon = installedAddons.some(addon => addon.id === addonId);
        let filteredStreams = providerStreams;

        if (!isInstalledAddon) {
          const qualityFiltered = filterStreamsByQuality(providerStreams);
          filteredStreams = filterStreamsByLanguage(qualityFiltered);
        }

        if (filteredStreams.length === 0) return null;

        return {
          title: addonName,
          addonId,
          data: filteredStreams,
        };
      }).filter(Boolean);
    }
  }, [selectedProvider, type, episodeStreams, groupedStreams, settings.streamDisplayMode, filterStreamsByQuality, filterStreamsByLanguage, addonResponseOrder, selectedEpisode, metadata]);

  // Flatten streams for TV navigation
  const flattenedStreams = useMemo(() => {
    const result: Array<{ stream: Stream; sectionIndex: number; itemIndex: number; sectionTitle: string }> = [];
    sections.forEach((section, sectionIndex) => {
      if (section && section.data) {
        section.data.forEach((stream, itemIndex) => {
          result.push({ stream, sectionIndex, itemIndex, sectionTitle: section.title });
        });
      }
    });
    return result;
  }, [sections]);

  // Episode image
  const episodeImage = useMemo(() => {
    if (episodeThumbnail) {
      if (episodeThumbnail.startsWith('http')) return episodeThumbnail;
      return tmdbService.getImageUrl(episodeThumbnail, 'original');
    }
    if (!currentEpisode) return null;
    const hydratedStill = tmdbEpisodeOverride?.still_path;
    if (currentEpisode.still_path || hydratedStill) {
      if (currentEpisode.still_path.startsWith('http')) return currentEpisode.still_path;
      const path = currentEpisode.still_path || hydratedStill || '';
      return tmdbService.getImageUrl(path, 'original');
    }
    return null;
  }, [currentEpisode, episodeThumbnail, tmdbEpisodeOverride?.still_path]);

  // IMDb rating helper
  const getIMDbRating = useCallback((seasonNumber: number, episodeNumber: number): number | null => {
    const key = `${seasonNumber}:${episodeNumber}`;
    return imdbRatingsMap[key] ?? null;
  }, [imdbRatingsMap]);

  const effectiveEpisodeVote = useMemo(() => {
    if (!currentEpisode) return 0;
    const imdbRating = getIMDbRating(currentEpisode.season_number, currentEpisode.episode_number);
    if (imdbRating !== null) return imdbRating;
    const v = (tmdbEpisodeOverride?.vote_average ?? currentEpisode.vote_average) || 0;
    return typeof v === 'number' ? v : Number(v) || 0;
  }, [currentEpisode, tmdbEpisodeOverride?.vote_average, getIMDbRating]);

  const hasIMDbRating = useMemo(() => {
    if (!currentEpisode) return false;
    return getIMDbRating(currentEpisode.season_number, currentEpisode.episode_number) !== null;
  }, [currentEpisode, getIMDbRating]);

  const effectiveEpisodeRuntime = useMemo(() => {
    if (!currentEpisode) return undefined;
    return (tmdbEpisodeOverride?.runtime ?? (currentEpisode as any).runtime) as number | undefined;
  }, [currentEpisode, tmdbEpisodeOverride?.runtime]);

  // Backdrop source
  const mobileBackdropSource = useMemo(() => {
    if (type === 'series' || (type === 'other' && selectedEpisode)) {
      return episodeImage || bannerImage;
    }
    if (type === 'movie') return bannerImage;
    return bannerImage || episodeImage;
  }, [type, selectedEpisode, episodeImage, bannerImage]);

  const colorExtractionSource = useMemo(() => {
    if (!settings.enableStreamsBackdrop) return null;
    if (type === 'series' || (type === 'other' && selectedEpisode)) {
      return episodeImage || null;
    }
    return null;
  }, [type, selectedEpisode, episodeImage, settings.enableStreamsBackdrop]);

  const { dominantColor } = useDominantColor(colorExtractionSource);

  // Gradient colors
  const createGradientColors = useCallback((baseColor: string | null): [string, string, string, string, string] => {
    if (settings.enableStreamsBackdrop) {
      return ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)'];
    }

    const themeBg = colors.darkBackground;
    if (themeBg.startsWith('#')) {
      const r = parseInt(themeBg.substr(1, 2), 16);
      const g = parseInt(themeBg.substr(3, 2), 16);
      const b = parseInt(themeBg.substr(5, 2), 16);
      return [
        `rgba(${r},${g},${b},0)`,
        `rgba(${r},${g},${b},0.3)`,
        `rgba(${r},${g},${b},0.6)`,
        `rgba(${r},${g},${b},0.85)`,
        `rgba(${r},${g},${b},0.95)`,
      ];
    }

    return ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)'];
  }, [settings.enableStreamsBackdrop, colors.darkBackground]);

  const gradientColors = useMemo(() => createGradientColors(dominantColor), [dominantColor, createGradientColors]);

  const isLoading = metadata?.videos && metadata.videos.length > 1 && selectedEpisode ? loadingEpisodeStreams : loadingStreams;
  const streams = metadata?.videos && metadata.videos.length > 1 && selectedEpisode ? episodeStreams : groupedStreams;

  const streamsEmpty = Object.keys(streams).length === 0 ||
    Object.values(streams).every(provider => !provider.streams || provider.streams.length === 0);
  const loadElapsed = streamsLoadStart ? Date.now() - streamsLoadStart : 0;
  const showInitialLoading = streamsEmpty && (streamsLoadStart === null || loadElapsed < 10000);
  const showStillFetching = streamsEmpty && loadElapsed >= 10000;

  /**
   * Handle focus on a stream item
   */
  const handleStreamFocus = useCallback((focusId: string, index: number) => {
    setFocusedStreamIndex(index);
    spatialNav.saveFocus(focusId);
    tvNav?.setCurrentFocusId(focusId);

    // Scroll to keep focused item visible
    if (streamListRef.current && index >= 0) {
      try {
        streamListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.3,
        });
      } catch (error) {
        // Fallback
        streamListRef.current.scrollToOffset({
          offset: Math.max(0, index * 88 - 100),
          animated: true,
        });
      }
    }
  }, [spatialNav, tvNav]);

  /**
   * Handle provider filter focus
   */
  const handleProviderFocus = useCallback((providerId: string, index: number) => {
    const focusId = `provider-${providerId}`;
    spatialNav.saveFocus(focusId);
    tvNav?.setCurrentFocusId(focusId);
  }, [spatialNav, tvNav]);

  /**
   * Render section header
   */
  const renderSectionHeader = useCallback(({ section }: { section: { title: string; addonId: string } }) => {
    const isProviderLoading = loadingProviders[section.addonId];

    return (
      <View style={styles.sectionHeaderContainer}>
        <View style={styles.sectionHeaderContent}>
          <Text style={styles.streamGroupTitle}>{section.title}</Text>
          {isProviderLoading && (
            <View style={styles.sectionLoadingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.sectionLoadingText, { color: colors.primary }]}>
                Loading...
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [styles, loadingProviders, colors.primary]);

  /**
   * Render a stream item for the FlatList
   */
  const renderStreamItem = useCallback(({ item, index }: { item: { stream: Stream; sectionIndex: number; itemIndex: number; sectionTitle: string }; index: number }) => {
    const focusId = `stream-${item.sectionIndex}-${item.itemIndex}`;
    const isFirstItem = index === 0;

    return (
      <TVStreamItem
        stream={item.stream}
        index={item.itemIndex}
        onPress={() => handleStreamPress(item.stream)}
        theme={currentTheme}
        showLogos={settings.showScraperLogos}
        scraperLogo={(item.stream.addonId && scraperLogos[item.stream.addonId]) || null}
        showAlert={(t, m) => openAlert(t, m)}
        parentTitle={metadata?.name}
        parentType={type as 'movie' | 'series'}
        parentSeason={(type === 'series' || type === 'other') ? currentEpisode?.season_number : undefined}
        parentEpisode={(type === 'series' || type === 'other') ? currentEpisode?.episode_number : undefined}
        parentEpisodeTitle={(type === 'series' || type === 'other') ? currentEpisode?.name : undefined}
        parentPosterUrl={episodeImage || metadata?.poster || undefined}
        providerName={Object.keys(streams).find(pid => streams[pid]?.streams?.includes?.(item.stream))}
        parentId={id}
        parentImdbId={imdbId || undefined}
        focusId={focusId}
        onFocus={handleStreamFocus}
        hasTVPreferredFocus={isFirstItem && flattenedStreams.length > 0}
      />
    );
  }, [
    handleStreamPress,
    currentTheme,
    settings.showScraperLogos,
    scraperLogos,
    openAlert,
    metadata,
    type,
    currentEpisode,
    episodeImage,
    streams,
    id,
    imdbId,
    handleStreamFocus,
    flattenedStreams.length,
  ]);

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback((item: { stream: Stream; sectionIndex: number; itemIndex: number }, index: number) => {
    if (item.stream.url) {
      return `${item.stream.url}-${item.sectionIndex}-${item.itemIndex}`;
    }
    return `stream-${item.sectionIndex}-${item.itemIndex}-${index}`;
  }, []);

  /**
   * Get item layout for FlatList optimization
   */
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 88, // Height of StreamCard + margin
    offset: 88 * index,
    index,
  }), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      scraperLogoCache.clear();
      scraperLogoCachePromise = null;
    };
  }, []);

  return (
    <PaperProvider>
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <Focusable
            onPress={handleBack}
            style={styles.backButton}
            animationConfig={{
              focusScale: 1.05,
              unfocusedOpacity: 0.8,
              showFocusBorder: true,
              focusBorderColor: colors.primary,
              focusBorderWidth: 2,
            }}
            accessibilityLabel="Back"
            accessibilityHint="Press to go back to previous screen"
          >
            <MaterialIcons name="arrow-back" size={isTV ? 28 : 24} color={colors.white} />
            <Text style={styles.backButtonText}>
              {metadata?.videos && metadata.videos.length > 1 && selectedEpisode ? 'Back to Episodes' : 'Back to Info'}
            </Text>
          </Focusable>
        </View>

        {isTablet ? (
          <TabletStreamsLayout
            episodeImage={episodeImage}
            bannerImage={bannerImage}
            metadata={metadata}
            type={type}
            currentEpisode={currentEpisode}
            movieLogoError={movieLogoError}
            setMovieLogoError={setMovieLogoError}
            streamsEmpty={streamsEmpty}
            selectedProvider={selectedProvider}
            filterItems={filterItems}
            handleProviderChange={handleProviderChange}
            activeFetchingScrapers={activeFetchingScrapers}
            isAutoplayWaiting={isAutoplayWaiting}
            autoplayTriggered={autoplayTriggered}
            showNoSourcesError={showNoSourcesError}
            showInitialLoading={showInitialLoading}
            showStillFetching={showStillFetching}
            sections={sections}
            renderSectionHeader={renderSectionHeader}
            handleStreamPress={handleStreamPress}
            openAlert={openAlert}
            settings={settings}
            currentTheme={currentTheme}
            colors={colors}
            navigation={navigation}
            insets={insets}
            streams={streams}
            scraperLogos={scraperLogos}
            id={id}
            imdbId={imdbId || undefined}
            loadingStreams={loadingStreams}
            loadingEpisodeStreams={loadingEpisodeStreams}
            hasStremioStreamProviders={hasStremioStreamProviders}
          />
        ) : (
          <>
            {/* Full Screen Background */}
            {settings.enableStreamsBackdrop ? (
              <View style={StyleSheet.absoluteFill}>
                {mobileBackdropSource ? (
                  <AnimatedImage
                    source={{ uri: mobileBackdropSource }}
                    style={styles.mobileFullScreenBackground}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.mobileNoBackdropBackground} />
                )}
                {Platform.OS === 'android' && AndroidBlurView ? (
                  <AndroidBlurView
                    blurAmount={15}
                    blurRadius={25}
                    overlayColor={"rgba(0,0,0,0.85)"}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <ExpoBlurView
                    intensity={60}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                  />
                )}
                {Platform.OS === 'ios' && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)' }]} />
                )}
              </View>
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.darkBackground }]} />
            )}

            {/* Movie Title */}
            {type === 'movie' && metadata && (
              <View style={[styles.movieTitleContainer, !settings.enableStreamsBackdrop && { backgroundColor: colors.darkBackground }]}>
                <View style={styles.movieTitleContent}>
                  {metadata.logo && !movieLogoError ? (
                    <FastImage
                      source={{ uri: metadata.logo }}
                      style={styles.movieLogo}
                      resizeMode={FastImage.resizeMode.contain}
                      onError={() => setMovieLogoError(true)}
                    />
                  ) : (
                    <AnimatedText style={styles.movieTitle} numberOfLines={2}>
                      {metadata.name}
                    </AnimatedText>
                  )}
                </View>
              </View>
            )}

            {/* Episode Hero */}
            {currentEpisode && (
              <View style={[styles.streamsHeroContainer, !settings.enableStreamsBackdrop && { backgroundColor: colors.darkBackground }]}>
                <View style={StyleSheet.absoluteFill}>
                  <View style={StyleSheet.absoluteFill}>
                    <AnimatedImage
                      source={episodeImage ? { uri: episodeImage } : undefined}
                      style={styles.streamsHeroBackground}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={gradientColors}
                      locations={[0, 0.4, 0.6, 0.8, 1]}
                      style={styles.streamsHeroGradient}
                    >
                      <View style={styles.streamsHeroContent}>
                        <View style={styles.streamsHeroInfo}>
                          <AnimatedText style={styles.streamsHeroEpisodeNumber} delay={50}>
                            {currentEpisode.episodeString}
                          </AnimatedText>
                          <AnimatedText style={styles.streamsHeroTitle} numberOfLines={1} delay={100}>
                            {currentEpisode.name}
                          </AnimatedText>
                          {!!currentEpisode.overview && (
                            <AnimatedView delay={150}>
                              <Text style={styles.streamsHeroOverview} numberOfLines={2}>
                                {currentEpisode.overview}
                              </Text>
                            </AnimatedView>
                          )}
                          <AnimatedView style={styles.streamsHeroMeta} delay={200}>
                            <Text style={styles.streamsHeroReleased}>
                              {tmdbService.formatAirDate(currentEpisode.air_date)}
                            </Text>
                            {effectiveEpisodeVote > 0 && (
                              <View style={styles.streamsHeroRating}>
                                {hasIMDbRating ? (
                                  <>
                                    <FastImage source={{ uri: IMDb_LOGO }} style={styles.imdbLogo} resizeMode={FastImage.resizeMode.contain} />
                                    <Text style={[styles.streamsHeroRatingText, { color: '#F5C518' }]}>
                                      {effectiveEpisodeVote.toFixed(1)}
                                    </Text>
                                  </>
                                ) : (
                                  <>
                                    <FastImage source={{ uri: TMDB_LOGO }} style={styles.tmdbLogo} resizeMode={FastImage.resizeMode.contain} />
                                    <Text style={styles.streamsHeroRatingText}>
                                      {effectiveEpisodeVote.toFixed(1)}
                                    </Text>
                                  </>
                                )}
                              </View>
                            )}
                            {!!effectiveEpisodeRuntime && (
                              <View style={styles.streamsHeroRuntime}>
                                <MaterialIcons name="schedule" size={16} color={colors.mediumEmphasis} />
                                <Text style={styles.streamsHeroRuntimeText}>
                                  {effectiveEpisodeRuntime >= 60
                                    ? `${Math.floor(effectiveEpisodeRuntime / 60)}h ${effectiveEpisodeRuntime % 60}m`
                                    : `${effectiveEpisodeRuntime}m`}
                                </Text>
                              </View>
                            )}
                          </AnimatedView>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                </View>
              </View>
            )}

            {/* Main Content */}
            <View style={[styles.streamsMainContent, type === 'movie' && styles.streamsMainContentMovie, !settings.enableStreamsBackdrop && { backgroundColor: colors.darkBackground }]}>
              {/* Provider Filter */}
              <View style={styles.filterContainer} ref={providerFilterRef}>
                {!streamsEmpty && (
                  <ProviderFilter
                    selectedProvider={selectedProvider}
                    providers={filterItems}
                    onSelect={handleProviderChange}
                    theme={currentTheme}
                    focusIdPrefix="provider"
                    onProviderFocus={handleProviderFocus}
                    initialFocusIndex={filterItems.findIndex(f => f.id === selectedProvider)}
                  />
                )}
              </View>

              {/* Active Scrapers Status */}
              {activeFetchingScrapers.length > 0 && (
                <View style={styles.activeScrapersContainer}>
                  <Text style={styles.activeScrapersTitle}>Fetching from:</Text>
                  <View style={styles.activeScrapersRow}>
                    {activeFetchingScrapers.map((scraperName, index) => (
                      <PulsingChip key={scraperName} text={scraperName} delay={index * 200} />
                    ))}
                  </View>
                </View>
              )}

              {/* Loading / Error / Streams */}
              {showNoSourcesError ? (
                <View style={styles.noStreams}>
                  <MaterialIcons name="error-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.noStreamsText}>No streaming sources available</Text>
                  <Text style={styles.noStreamsSubText}>
                    Please add streaming sources in settings
                  </Text>
                  <Focusable
                    onPress={() => navigation.navigate('Addons')}
                    style={styles.addSourcesButton}
                    animationConfig={{
                      focusScale: 1.05,
                      showFocusBorder: true,
                      focusBorderColor: colors.white,
                      focusBorderWidth: 2,
                    }}
                    accessibilityLabel="Add Sources"
                    accessibilityHint="Press to add streaming sources"
                  >
                    <Text style={styles.addSourcesButtonText}>Add Sources</Text>
                  </Focusable>
                </View>
              ) : streamsEmpty ? (
                showInitialLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>
                      {isAutoplayWaiting ? 'Finding best stream for autoplay...' : 'Finding available streams...'}
                    </Text>
                  </View>
                ) : showStillFetching ? (
                  <View style={styles.loadingContainer}>
                    <MaterialIcons name="hourglass-bottom" size={32} color={colors.primary} />
                    <Text style={styles.loadingText}>Still fetching streams...</Text>
                  </View>
                ) : (
                  <View style={styles.noStreams}>
                    <MaterialIcons name="error-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.noStreamsText}>No streams available</Text>
                  </View>
                )
              ) : (
                <View collapsable={false} style={{ flex: 1 }}>
                  {/* Autoplay overlay */}
                  {isAutoplayWaiting && !autoplayTriggered && (
                    <View style={styles.autoplayOverlay}>
                      <View style={styles.autoplayIndicator}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.autoplayText}>Starting best stream...</Text>
                      </View>
                    </View>
                  )}

                  {/* Stream List */}
                  <FlatList
                    ref={streamListRef}
                    data={flattenedStreams}
                    renderItem={renderStreamItem}
                    keyExtractor={keyExtractor}
                    style={styles.streamsContent}
                    contentContainerStyle={[styles.streamsContainer, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    overScrollMode="never"
                    initialNumToRender={8}
                    maxToRenderPerBatch={4}
                    windowSize={7}
                    removeClippedSubviews={false}
                    getItemLayout={getItemLayout}
                    scrollEventThrottle={16}
                    // TV-specific: Allow vertical scrolling via D-pad
                    nestedScrollEnabled={true}
                  />

                  {/* Footer Loading */}
                  {(loadingStreams || loadingEpisodeStreams) && hasStremioStreamProviders && (
                    <View style={styles.footerLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.footerLoadingText}>Loading more sources...</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        <CustomAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          actions={alertActions}
          onClose={() => setAlertVisible(false)}
        />

        {/* TV Context Menu */}
        <TVContextMenu />
      </View>
    </PaperProvider>
  );
};

// Create styles with theme colors and TV-specific adjustments
const createStyles = (colors: any, isTV: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 12 : 8,
    paddingHorizontal: isTV ? 24 : 16,
    paddingVertical: isTV ? 16 : 12,
    paddingTop: Platform.OS === 'android' ? 45 : isTV ? 40 : 15,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: colors.highEmphasis,
    fontSize: isTV ? 18 : 13,
    fontWeight: '600',
  },
  streamsMainContent: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: isTV ? 16 : 12,
    zIndex: 1,
  },
  streamsMainContentMovie: {
    paddingTop: Platform.OS === 'android' ? 10 : 15,
  },
  filterContainer: {
    paddingHorizontal: isTV ? 20 : 12,
    paddingBottom: isTV ? 12 : 8,
  },
  streamsContent: {
    flex: 1,
    width: '100%',
    zIndex: 2,
  },
  streamsContainer: {
    paddingHorizontal: isTV ? 20 : 12,
    paddingBottom: 20,
    width: '100%',
  },
  streamGroupTitle: {
    color: colors.highEmphasis,
    fontSize: isTV ? 18 : 14,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 0,
    opacity: 0.9,
    backgroundColor: 'transparent',
  },
  sectionHeaderContainer: {
    paddingHorizontal: isTV ? 16 : 12,
    paddingVertical: isTV ? 12 : 8,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLoadingText: {
    marginLeft: 8,
    fontSize: isTV ? 14 : 12,
  },
  noStreams: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noStreamsText: {
    color: colors.textMuted,
    fontSize: isTV ? 20 : 16,
    marginTop: 16,
  },
  noStreamsSubText: {
    color: colors.mediumEmphasis,
    fontSize: isTV ? 16 : 14,
    marginTop: 8,
    textAlign: 'center',
  },
  addSourcesButton: {
    marginTop: 24,
    paddingHorizontal: isTV ? 28 : 20,
    paddingVertical: isTV ? 14 : 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  addSourcesButtonText: {
    color: colors.white,
    fontSize: isTV ? 18 : 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    color: colors.primary,
    fontSize: isTV ? 16 : 12,
    marginTop: 12,
    fontWeight: '500',
  },
  streamsHeroContainer: {
    width: '100%',
    height: isTV ? 280 : 220,
    marginBottom: 0,
    position: 'relative',
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
    zIndex: 1,
  },
  streamsHeroBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  streamsHeroGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: isTV ? 24 : 16,
    paddingBottom: 0,
  },
  streamsHeroContent: {
    width: '100%',
  },
  streamsHeroInfo: {
    width: '100%',
  },
  streamsHeroEpisodeNumber: {
    color: colors.primary,
    fontSize: isTV ? 18 : 14,
    fontWeight: 'bold',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streamsHeroTitle: {
    color: colors.highEmphasis,
    fontSize: isTV ? 32 : 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  streamsHeroOverview: {
    color: colors.mediumEmphasis,
    fontSize: isTV ? 18 : 14,
    lineHeight: isTV ? 26 : 20,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streamsHeroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 0,
  },
  streamsHeroReleased: {
    color: colors.mediumEmphasis,
    fontSize: isTV ? 16 : 14,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streamsHeroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
  },
  tmdbLogo: {
    width: isTV ? 24 : 20,
    height: isTV ? 18 : 14,
  },
  imdbLogo: {
    width: isTV ? 34 : 28,
    height: isTV ? 18 : 15,
  },
  streamsHeroRatingText: {
    color: colors.highEmphasis,
    fontSize: isTV ? 16 : 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  streamsHeroRuntime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streamsHeroRuntimeText: {
    color: colors.mediumEmphasis,
    fontSize: isTV ? 16 : 13,
    fontWeight: '600',
  },
  movieTitleContainer: {
    width: '100%',
    height: isTV ? 180 : 140,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 65 : isTV ? 50 : 35,
  },
  movieTitleContent: {
    width: '100%',
    height: isTV ? 100 : 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieLogo: {
    width: '100%',
    height: isTV ? 100 : 80,
    maxWidth: width * 0.85,
  },
  movieTitle: {
    color: colors.highEmphasis,
    fontSize: isTV ? 36 : 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingHorizontal: 20,
  },
  autoplayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  autoplayIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevation2,
    paddingHorizontal: isTV ? 24 : 16,
    paddingVertical: isTV ? 16 : 12,
    borderRadius: 8,
  },
  autoplayText: {
    color: colors.primary,
    fontSize: isTV ? 18 : 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  footerLoadingText: {
    color: colors.primary,
    fontSize: isTV ? 14 : 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  activeScrapersContainer: {
    paddingHorizontal: isTV ? 24 : 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    marginHorizontal: isTV ? 20 : 16,
    marginBottom: 4,
  },
  activeScrapersTitle: {
    color: colors.mediumEmphasis,
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
    marginBottom: 6,
    opacity: 0.8,
  },
  activeScrapersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mobileFullScreenBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mobileNoBackdropBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.darkBackground,
  },
});

export default memo(StreamsScreen);
