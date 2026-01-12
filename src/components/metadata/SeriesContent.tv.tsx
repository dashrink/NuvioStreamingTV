/**
 * SeriesContent.tv.tsx
 *
 * TV-specific series content component with D-pad navigable season tabs,
 * episode list with focus states, and long-press context menu support.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - D-pad navigable season tabs (left/right)
 * - Episode list with focus states and auto-scrolling
 * - Long-press (300ms+) triggers context menu on episodes
 * - Focus memory persistence per section
 * - Integration with TVNavigationContext for global focus state
 * - tvParallaxProperties for Apple TV depth effects
 */

import FastImage from '@d11/react-native-fast-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
  useColorScheme,
  FlatList,
  Modal,
  Pressable,
  Platform,
  findNodeHandle,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

import { useTheme } from '../../contexts/ThemeContext';
import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';
import { useContextMenu } from '../../hooks/useContextMenu';
import { useSettings } from '../../hooks/useSettings';
import { mmkvStorage } from '../../services/mmkvStorage';
import { storageService } from '../../services/storageService';
import { tmdbService, IMDbRatings } from '../../services/tmdbService';
import { TraktService } from '../../services/traktService';
import { watchedService } from '../../services/watchedService';
import { Episode } from '../../types/metadata';
import { logger } from '../../utils/logger';
import Focusable from '../common/Focusable';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface SeriesContentProps {
  episodes: Episode[];
  selectedSeason: number;
  loadingSeasons: boolean;
  onSeasonChange: (season: number) => void;
  onSelectEpisode: (episode: Episode) => void;
  groupedEpisodes?: { [seasonNumber: number]: Episode[] };
  metadata?: { poster?: string; id?: string };
  imdbId?: string;
  /** Node handle for navigation above this component */
  nextFocusUp?: number | React.RefObject<any>;
  /** Callback when focus enters this component */
  onFocusEnter?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

const DEFAULT_PLACEHOLDER = 'https://via.placeholder.com/300x450/1a1a1a/666666?text=No+Image';
const EPISODE_PLACEHOLDER = 'https://via.placeholder.com/500x280/1a1a1a/666666?text=No+Preview';
const TMDB_LOGO =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tmdb.new.logo.svg/512px-Tmdb.new.logo.svg.png?20200406190906';
const IMDb_LOGO =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/575px-IMDB_Logo_2016.svg.png';

// =============================================================================
// Component Implementation
// =============================================================================

const SeriesContentComponent: React.FC<SeriesContentProps> = ({
  episodes,
  selectedSeason,
  loadingSeasons,
  onSeasonChange,
  onSelectEpisode,
  groupedEpisodes = {},
  metadata,
  imdbId,
  nextFocusUp,
  onFocusEnter,
}) => {
  const { currentTheme } = useTheme();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();
  const isDarkMode = useColorScheme() === 'dark';

  // TV Navigation context
  const tvNav = useTVNavigationOptional();
  const { openContextMenu, isAvailable: isContextMenuAvailable } = useContextMenu();

  // Responsive sizing
  const deviceWidth = Dimensions.get('window').width;
  const deviceHeight = Dimensions.get('window').height;

  const getDeviceType = useCallback(() => {
    if (deviceWidth >= BREAKPOINTS.tv) return 'tv';
    if (deviceWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
    if (deviceWidth >= BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
  }, [deviceWidth]);

  const deviceType = getDeviceType();
  const isTablet = deviceType === 'tablet';
  const isLargeTablet = deviceType === 'largeTablet';
  const isTV = deviceType === 'tv' || Platform.isTV;
  const isLargeScreen = isTablet || isLargeTablet || isTV;

  // Responsive sizing values
  const horizontalPadding = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return 32;
      case 'largeTablet':
        return 28;
      case 'tablet':
        return 24;
      default:
        return 16;
    }
  }, [deviceType]);

  const horizontalCardWidth = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return Math.min(deviceWidth * 0.25, 400);
      case 'largeTablet':
        return Math.min(deviceWidth * 0.35, 350);
      case 'tablet':
        return Math.min(deviceWidth * 0.46, 300);
      default:
        return width * 0.75;
    }
  }, [deviceType, deviceWidth, width]);

  const horizontalCardHeight = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return 280;
      case 'largeTablet':
        return 250;
      case 'tablet':
        return 220;
      default:
        return 180;
    }
  }, [deviceType]);

  const horizontalItemSpacing = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return 20;
      case 'largeTablet':
        return 18;
      case 'tablet':
        return 16;
      default:
        return 16;
    }
  }, [deviceType]);

  const seasonPosterWidth = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return 140;
      case 'largeTablet':
        return 130;
      case 'tablet':
        return 120;
      default:
        return 100;
    }
  }, [deviceType]);

  const seasonPosterHeight = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return 210;
      case 'largeTablet':
        return 195;
      case 'tablet':
        return 180;
      default:
        return 150;
    }
  }, [deviceType]);

  const seasonButtonSpacing = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return 20;
      case 'largeTablet':
        return 18;
      case 'tablet':
        return 16;
      default:
        return 16;
    }
  }, [deviceType]);

  // =============================================================================
  // State
  // =============================================================================

  const [episodeProgress, setEpisodeProgress] = useState<{
    [key: string]: { currentTime: number; duration: number; lastUpdated: number };
  }>({});
  const [enableItemAnimations, setEnableItemAnimations] = useState(false);
  const [tmdbEpisodeOverrides, setTmdbEpisodeOverrides] = useState<{
    [epKey: string]: { vote_average?: number; runtime?: number; still_path?: string };
  }>({});
  const [imdbRatingsMap, setImdbRatingsMap] = useState<{ [key: string]: number }>({});
  const [seasonViewMode, setSeasonViewMode] = useState<'posters' | 'text'>('posters');
  const [posterViewVisible, setPosterViewVisible] = useState(true);
  const [textViewVisible, setTextViewVisible] = useState(false);
  const [episodeActionMenuVisible, setEpisodeActionMenuVisible] = useState(false);
  const [selectedEpisodeForAction, setSelectedEpisodeForAction] = useState<Episode | null>(null);
  const [markingAsWatched, setMarkingAsWatched] = useState(false);

  // TV Focus state
  const [focusedSeasonIndex, setFocusedSeasonIndex] = useState<number>(-1);
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState<number>(-1);

  // =============================================================================
  // Refs
  // =============================================================================

  const seasonScrollViewRef = useRef<FlatList<number>>(null);
  const episodeScrollViewRef = useRef<FlashListRef<Episode>>(null);
  const horizontalEpisodeScrollViewRef = useRef<FlatList<Episode>>(null);
  const seasonRefs = useRef<Map<number, React.RefObject<any>>>(new Map());
  const episodeRefs = useRef<Map<number, React.RefObject<any>>>(new Map());
  const viewModeToggleRef = useRef<any>(null);

  // =============================================================================
  // Focus Memory
  // =============================================================================

  const uniqueSectionId = `series-content-${metadata?.id || 'unknown'}`;
  const seasonsSectionId = `${uniqueSectionId}-seasons`;
  const episodesSectionId = `${uniqueSectionId}-episodes-s${selectedSeason}`;

  const getSeasonRef = useCallback((seasonIndex: number) => {
    if (!seasonRefs.current.has(seasonIndex)) {
      seasonRefs.current.set(seasonIndex, React.createRef());
    }
    return seasonRefs.current.get(seasonIndex)!;
  }, []);

  const getEpisodeRef = useCallback((episodeIndex: number) => {
    if (!episodeRefs.current.has(episodeIndex)) {
      episodeRefs.current.set(episodeIndex, React.createRef());
    }
    return episodeRefs.current.get(episodeIndex)!;
  }, []);

  const saveFocusState = useCallback(
    (section: string, index: number) => {
      if (tvNav && index >= 0) {
        const focusId = `${section}-${index}`;
        tvNav.setScreenFocus(section, focusId);
        tvNav.setCurrentFocusId(focusId);
      }
    },
    [tvNav]
  );

  // =============================================================================
  // Load/Save View Mode Preference
  // =============================================================================

  useEffect(() => {
    const loadViewModePreference = async () => {
      try {
        const savedMode = await mmkvStorage.getItem('global_season_view_mode');
        if (savedMode === 'text' || savedMode === 'posters') {
          setSeasonViewMode(savedMode);
        }
      } catch (error) {
        // Ignore errors
      }
    };
    loadViewModePreference();
  }, []);

  useEffect(() => {
    if (seasonViewMode === 'text') {
      setPosterViewVisible(false);
      setTextViewVisible(true);
    } else {
      setPosterViewVisible(true);
      setTextViewVisible(false);
    }
  }, [seasonViewMode]);

  const updateViewMode = (newMode: 'posters' | 'text') => {
    setSeasonViewMode(newMode);
    mmkvStorage.setItem('global_season_view_mode', newMode).catch(() => {});
  };

  // =============================================================================
  // Episode Progress Loading
  // =============================================================================

  const loadEpisodesProgress = async () => {
    if (!metadata?.id) return;

    const allProgress = await storageService.getAllWatchProgress();
    const progress: {
      [key: string]: { currentTime: number; duration: number; lastUpdated: number };
    } = {};

    episodes.forEach(episode => {
      const episodeId =
        episode.stremioId || `${metadata.id}:${episode.season_number}:${episode.episode_number}`;
      const key = `series:${metadata.id}:${episodeId}`;
      if (allProgress[key]) {
        progress[episodeId] = {
          currentTime: allProgress[key].currentTime,
          duration: allProgress[key].duration,
          lastUpdated: allProgress[key].lastUpdated,
        };
      }
    });

    // Trakt watched-history integration
    try {
      const traktService = TraktService.getInstance();
      const isAuthed = await traktService.isAuthenticated();
      if (isAuthed && metadata?.id) {
        let allHistoryItems: any[] = [];
        const pageLimit = 10;

        for (let page = 1; page <= pageLimit; page++) {
          const historyItems = await traktService.getWatchedEpisodesHistory(page, 100);
          if (!historyItems || historyItems.length === 0) break;
          allHistoryItems = allHistoryItems.concat(historyItems);
        }

        allHistoryItems.forEach(item => {
          if (item.type !== 'episode') return;
          const showImdb = item.show?.ids?.imdb
            ? `tt${item.show.ids.imdb.replace(/^tt/, '')}`
            : null;
          if (!showImdb || showImdb !== metadata.id) return;

          const season = item.episode?.season;
          const epNum = item.episode?.number;
          if (season === undefined || epNum === undefined) return;

          const episodeId = `${metadata.id}:${season}:${epNum}`;
          const watchedAt = new Date(item.watched_at).getTime();
          const traktProgressEntry = { currentTime: 1, duration: 1, lastUpdated: watchedAt };
          const existing = progress[episodeId];
          const existingPercent = existing ? (existing.currentTime / existing.duration) * 100 : 0;

          if (!existing || existingPercent < 85) {
            progress[episodeId] = traktProgressEntry;
          }
        });
      }
    } catch (err) {
      logger.error('[SeriesContent.tv] Failed to merge Trakt history:', err);
    }

    setEpisodeProgress(progress);
  };

  // Scroll to most recently watched episode
  const scrollToMostRecentEpisode = useCallback(() => {
    if (
      !metadata?.id ||
      !settings?.episodeLayoutStyle ||
      settings.episodeLayoutStyle !== 'horizontal'
    ) {
      return;
    }

    const currentSeasonEpisodes = groupedEpisodes[selectedSeason] || [];
    if (currentSeasonEpisodes.length === 0) return;

    let mostRecentEpisodeIndex = -1;
    let mostRecentTimestamp = 0;

    currentSeasonEpisodes.forEach((episode, index) => {
      const episodeId =
        episode.stremioId || `${metadata.id}:${episode.season_number}:${episode.episode_number}`;
      const progress = episodeProgress[episodeId];
      if (progress && progress.lastUpdated > mostRecentTimestamp && progress.currentTime > 0) {
        mostRecentTimestamp = progress.lastUpdated;
        mostRecentEpisodeIndex = index;
      }
    });

    if (mostRecentEpisodeIndex >= 0 && horizontalEpisodeScrollViewRef.current) {
      setTimeout(() => {
        horizontalEpisodeScrollViewRef.current?.scrollToIndex({
          index: mostRecentEpisodeIndex,
          animated: true,
          viewPosition: 0,
        });
      }, 500);
    }
  }, [
    metadata?.id,
    settings?.episodeLayoutStyle,
    groupedEpisodes,
    selectedSeason,
    episodeProgress,
  ]);

  // =============================================================================
  // Effects
  // =============================================================================

  useEffect(() => {
    loadEpisodesProgress();
  }, [episodes, metadata?.id]);

  useEffect(() => {
    const fetchIMDbRatings = async () => {
      try {
        if (!metadata?.id) return;

        let tmdbShowId: number | null = null;
        if (metadata.id.startsWith('tmdb:')) {
          tmdbShowId = parseInt(metadata.id.split(':')[1], 10);
        } else if (metadata.id.startsWith('tt')) {
          tmdbShowId = await tmdbService.findTMDBIdByIMDB(metadata.id);
        }

        if (!tmdbShowId) return;

        const ratings = await tmdbService.getIMDbRatings(tmdbShowId);
        if (ratings) {
          const ratingsMap: { [key: string]: number } = {};
          ratings.forEach(season => {
            if (season.episodes) {
              season.episodes.forEach(episode => {
                const key = `${episode.season_number}:${episode.episode_number}`;
                if (episode.vote_average) {
                  ratingsMap[key] = episode.vote_average;
                }
              });
            }
          });
          setImdbRatingsMap(ratingsMap);
        }
      } catch (err) {
        logger.error('[SeriesContent.tv] Failed to fetch IMDb ratings:', err);
      }
    };

    fetchIMDbRatings();
  }, [metadata?.id]);

  useEffect(() => {
    const hydrateFromTmdb = async () => {
      try {
        if (!metadata?.id || !selectedSeason) return;
        if (!settings?.enrichMetadataWithTMDB) return;

        const currentSeasonEpisodes = groupedEpisodes[selectedSeason] || [];
        if (currentSeasonEpisodes.length === 0) return;

        const needsHydration = currentSeasonEpisodes.some(
          ep => !(ep as any).runtime || !(ep as any).vote_average
        );
        if (!needsHydration) return;

        let tmdbShowId: number | null = null;
        if (metadata.id.startsWith('tmdb:')) {
          tmdbShowId = parseInt(metadata.id.split(':')[1], 10);
        } else if (metadata.id.startsWith('tt')) {
          tmdbShowId = await tmdbService.findTMDBIdByIMDB(metadata.id);
        }
        if (!tmdbShowId) return;

        const all = await tmdbService.getAllEpisodes(tmdbShowId);
        const overrides: {
          [k: string]: { vote_average?: number; runtime?: number; still_path?: string };
        } = {};
        const seasonEpisodes = all?.[selectedSeason] || [];
        seasonEpisodes.forEach((tmdbEp: any) => {
          const key = `${metadata.id}:${tmdbEp.season_number}:${tmdbEp.episode_number}`;
          overrides[key] = {
            vote_average: tmdbEp.vote_average,
            runtime: tmdbEp.runtime,
            still_path: tmdbEp.still_path,
          };
        });
        if (Object.keys(overrides).length > 0) {
          setTmdbEpisodeOverrides(prev => ({ ...prev, ...overrides }));
        }
      } catch (err) {
        logger.error('[SeriesContent.tv] TMDB hydration failed:', err);
      }
    };

    hydrateFromTmdb();
  }, [metadata?.id, selectedSeason, groupedEpisodes, settings?.enrichMetadataWithTMDB]);

  useEffect(() => {
    const timer = setTimeout(() => setEnableItemAnimations(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadEpisodesProgress();
    }, [episodes, metadata?.id])
  );

  useEffect(() => {
    if (selectedSeason && seasonScrollViewRef.current && Object.keys(groupedEpisodes).length > 0) {
      const seasons = Object.keys(groupedEpisodes)
        .map(Number)
        .sort((a, b) => a - b);
      const selectedIndex = seasons.findIndex(season => season === selectedSeason);

      if (selectedIndex !== -1) {
        setTimeout(() => {
          seasonScrollViewRef.current?.scrollToIndex({
            index: selectedIndex,
            animated: true,
            viewPosition: 0.3,
          });
        }, 300);
      }
    }
  }, [selectedSeason, groupedEpisodes]);

  useEffect(() => {
    if (Object.keys(episodeProgress).length > 0 && selectedSeason && settings?.episodeLayoutStyle) {
      scrollToMostRecentEpisode();
    }
  }, [
    selectedSeason,
    episodeProgress,
    settings?.episodeLayoutStyle,
    groupedEpisodes,
    scrollToMostRecentEpisode,
  ]);

  // =============================================================================
  // Helpers
  // =============================================================================

  const getIMDbRating = useCallback(
    (seasonNumber: number, episodeNumber: number): number | null => {
      const key = `${seasonNumber}:${episodeNumber}`;
      return imdbRatingsMap[key] ?? null;
    },
    [imdbRatingsMap]
  );

  const isEpisodeWatched = useCallback(
    (episode: Episode): boolean => {
      const episodeId =
        episode.stremioId || `${metadata?.id}:${episode.season_number}:${episode.episode_number}`;
      const progress = episodeProgress[episodeId];
      if (!progress) return false;
      const progressPercent = (progress.currentTime / progress.duration) * 100;
      return progressPercent >= 85;
    },
    [episodeProgress, metadata?.id]
  );

  const isSeasonWatched = useCallback((): boolean => {
    const seasonEpisodes = groupedEpisodes[selectedSeason] || [];
    if (seasonEpisodes.length === 0) return false;
    return seasonEpisodes.every(ep => {
      const episodeId = ep.stremioId || `${metadata?.id}:${ep.season_number}:${ep.episode_number}`;
      const progress = episodeProgress[episodeId];
      if (!progress) return false;
      const progressPercent = (progress.currentTime / progress.duration) * 100;
      return progressPercent >= 85;
    });
  }, [groupedEpisodes, selectedSeason, episodeProgress, metadata?.id]);

  // =============================================================================
  // Episode Long Press / Context Menu (TV)
  // =============================================================================

  const handleEpisodeLongPress = useCallback(
    (episode: Episode, episodeIndex: number) => {
      if (Platform.isTV) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (isContextMenuAvailable) {
        const epId =
          episode.stremioId || `${metadata?.id}:${episode.season_number}:${episode.episode_number}`;
        const watched = isEpisodeWatched(episode);

        openContextMenu({
          targetId: `episode-${epId}`,
          title: `S${episode.season_number}E${episode.episode_number} - ${episode.name}`,
          mediaItem: {
            id: epId,
            title: episode.name,
            type: 'episode',
            isWatched: watched,
          },
          actions: watched ? ['markUnwatched', 'play', 'info'] : ['markWatched', 'play', 'info'],
          onMarkWatched: async () => {
            await handleMarkEpisodeAsWatched(episode);
          },
          onMarkUnwatched: async () => {
            await handleMarkEpisodeAsUnwatched(episode);
          },
          onPlay: () => {
            onSelectEpisode(episode);
          },
          onGetInfo: () => {
            onSelectEpisode(episode);
          },
        });
      } else {
        // Fall back to modal for non-TV
        setSelectedEpisodeForAction(episode);
        setEpisodeActionMenuVisible(true);
      }
    },
    [isContextMenuAvailable, openContextMenu, metadata?.id, isEpisodeWatched, onSelectEpisode]
  );

  // =============================================================================
  // Mark Watched/Unwatched Handlers
  // =============================================================================

  const handleMarkEpisodeAsWatched = useCallback(
    async (episode: Episode) => {
      if (!metadata?.id) return;

      const episodeId =
        episode.stremioId || `${metadata.id}:${episode.season_number}:${episode.episode_number}`;
      setEpisodeProgress(prev => ({
        ...prev,
        [episodeId]: { currentTime: 1, duration: 1, lastUpdated: Date.now() },
      }));

      if (Platform.isTV) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const showImdbId = imdbId || metadata.id;
      try {
        await watchedService.markEpisodeAsWatched(
          showImdbId,
          metadata.id,
          episode.season_number,
          episode.episode_number
        );
        loadEpisodesProgress();
      } catch (error) {
        logger.error('[SeriesContent.tv] Error marking episode as watched:', error);
        loadEpisodesProgress();
      }
    },
    [metadata?.id, imdbId]
  );

  const handleMarkEpisodeAsUnwatched = useCallback(
    async (episode: Episode) => {
      if (!metadata?.id) return;

      const episodeId =
        episode.stremioId || `${metadata.id}:${episode.season_number}:${episode.episode_number}`;
      setEpisodeProgress(prev => {
        const newState = { ...prev };
        delete newState[episodeId];
        return newState;
      });

      if (Platform.isTV) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const showImdbId = imdbId || metadata.id;
      try {
        await watchedService.unmarkEpisodeAsWatched(
          showImdbId,
          metadata.id,
          episode.season_number,
          episode.episode_number
        );
        loadEpisodesProgress();
      } catch (error) {
        logger.error('[SeriesContent.tv] Error unmarking episode as watched:', error);
        loadEpisodesProgress();
      }
    },
    [metadata?.id, imdbId]
  );

  const handleMarkAsWatched = useCallback(async () => {
    if (!selectedEpisodeForAction) return;
    await handleMarkEpisodeAsWatched(selectedEpisodeForAction);
    setEpisodeActionMenuVisible(false);
    setSelectedEpisodeForAction(null);
  }, [selectedEpisodeForAction, handleMarkEpisodeAsWatched]);

  const handleMarkAsUnwatched = useCallback(async () => {
    if (!selectedEpisodeForAction) return;
    await handleMarkEpisodeAsUnwatched(selectedEpisodeForAction);
    setEpisodeActionMenuVisible(false);
    setSelectedEpisodeForAction(null);
  }, [selectedEpisodeForAction, handleMarkEpisodeAsUnwatched]);

  const handleMarkSeasonAsWatched = useCallback(async () => {
    if (!metadata?.id) return;

    const currentSeason = selectedSeason;
    const seasonEpisodes = groupedEpisodes[currentSeason] || [];
    const episodeNumbers = seasonEpisodes.map(ep => ep.episode_number);

    setEpisodeProgress(prev => {
      const next = { ...prev };
      seasonEpisodes.forEach(ep => {
        const id = ep.stremioId || `${metadata.id}:${ep.season_number}:${ep.episode_number}`;
        next[id] = { currentTime: 1, duration: 1, lastUpdated: Date.now() };
      });
      return next;
    });

    if (Platform.isTV) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEpisodeActionMenuVisible(false);
    setSelectedEpisodeForAction(null);

    const showImdbId = imdbId || metadata.id;
    try {
      await watchedService.markSeasonAsWatched(
        showImdbId,
        metadata.id,
        currentSeason,
        episodeNumbers
      );
      loadEpisodesProgress();
    } catch (error) {
      logger.error('[SeriesContent.tv] Error marking season as watched:', error);
      loadEpisodesProgress();
    }
  }, [metadata?.id, imdbId, selectedSeason, groupedEpisodes]);

  const handleMarkSeasonAsUnwatched = useCallback(async () => {
    if (!metadata?.id) return;

    const currentSeason = selectedSeason;
    const seasonEpisodes = groupedEpisodes[currentSeason] || [];
    const episodeNumbers = seasonEpisodes.map(ep => ep.episode_number);

    setEpisodeProgress(prev => {
      const next = { ...prev };
      seasonEpisodes.forEach(ep => {
        const id = ep.stremioId || `${metadata.id}:${ep.season_number}:${ep.episode_number}`;
        delete next[id];
      });
      return next;
    });

    if (Platform.isTV) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEpisodeActionMenuVisible(false);
    setSelectedEpisodeForAction(null);

    const showImdbId = imdbId || metadata.id;
    try {
      await watchedService.unmarkSeasonAsWatched(
        showImdbId,
        metadata.id,
        currentSeason,
        episodeNumbers
      );
      loadEpisodesProgress();
    } catch (error) {
      logger.error('[SeriesContent.tv] Error unmarking season as watched:', error);
      loadEpisodesProgress();
    }
  }, [metadata?.id, imdbId, selectedSeason, groupedEpisodes]);

  const closeEpisodeActionMenu = useCallback(() => {
    setEpisodeActionMenuVisible(false);
    setSelectedEpisodeForAction(null);
  }, []);

  // =============================================================================
  // TV Focus Handlers
  // =============================================================================

  const handleSeasonFocus = useCallback(
    (seasonIndex: number, season: number) => {
      setFocusedSeasonIndex(seasonIndex);
      saveFocusState(seasonsSectionId, seasonIndex);
      onFocusEnter?.();

      // Scroll to keep focused season visible
      if (seasonScrollViewRef.current) {
        seasonScrollViewRef.current.scrollToIndex({
          index: seasonIndex,
          animated: true,
          viewPosition: 0.3,
        });
      }
    },
    [seasonsSectionId, saveFocusState, onFocusEnter]
  );

  const handleEpisodeFocus = useCallback(
    (episodeIndex: number) => {
      setFocusedEpisodeIndex(episodeIndex);
      saveFocusState(episodesSectionId, episodeIndex);
      onFocusEnter?.();

      // Scroll to keep focused episode visible
      if (settings?.episodeLayoutStyle === 'horizontal' && horizontalEpisodeScrollViewRef.current) {
        horizontalEpisodeScrollViewRef.current.scrollToIndex({
          index: episodeIndex,
          animated: true,
          viewPosition: 0.3,
        });
      }
    },
    [episodesSectionId, saveFocusState, settings?.episodeLayoutStyle, onFocusEnter]
  );

  const handleViewModeToggleFocus = useCallback(() => {
    onFocusEnter?.();
  }, [onFocusEnter]);

  // =============================================================================
  // Resolve NextFocus Props
  // =============================================================================

  const resolveNodeHandle = useCallback(
    (value: number | React.RefObject<any> | undefined): number | undefined => {
      if (value === undefined) return undefined;
      if (typeof value === 'number') return value;
      if (value.current) {
        try {
          return findNodeHandle(value.current) ?? undefined;
        } catch {
          return undefined;
        }
      }
      return undefined;
    },
    []
  );

  // =============================================================================
  // Loading / Empty States
  // =============================================================================

  if (loadingSeasons) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        <Text style={[styles.centeredText, { color: currentTheme.colors.text }]}>
          Loading episodes...
        </Text>
      </View>
    );
  }

  if (episodes.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <MaterialIcons name="error-outline" size={48} color={currentTheme.colors.textMuted} />
        <Text style={[styles.centeredText, { color: currentTheme.colors.text }]}>
          No episodes available
        </Text>
      </View>
    );
  }

  // =============================================================================
  // Season Selector Render
  // =============================================================================

  const renderSeasonSelector = () => {
    if (!groupedEpisodes || Object.keys(groupedEpisodes).length <= 1) {
      return null;
    }

    const seasons = Object.keys(groupedEpisodes)
      .map(Number)
      .sort((a, b) => {
        if (a === 0) return 1;
        if (b === 0) return -1;
        return a - b;
      });

    const renderSeasonItem = ({ item: season, index }: { item: number; index: number }) => {
      const seasonEpisodes = groupedEpisodes[season] || [];
      const isSelected = selectedSeason === season;

      let seasonPoster = DEFAULT_PLACEHOLDER;
      if (seasonEpisodes[0]?.season_poster_path) {
        const tmdbUrl = tmdbService.getImageUrl(seasonEpisodes[0].season_poster_path, 'original');
        if (tmdbUrl) seasonPoster = tmdbUrl;
      } else if (metadata?.poster) {
        seasonPoster = metadata.poster;
      }

      const seasonFocusId = `${seasonsSectionId}-${index}`;

      if (seasonViewMode === 'text') {
        return (
          <View style={{ opacity: textViewVisible ? 1 : 0 }}>
            <Focusable
              ref={getSeasonRef(index)}
              onPress={() => onSeasonChange(season)}
              onFocus={() => handleSeasonFocus(index, season)}
              hasTVPreferredFocus={index === 0}
              isTVSelectable={true}
              focusId={seasonFocusId}
              style={[
                styles.seasonTextButton,
                {
                  marginRight: seasonButtonSpacing,
                  width: isTV ? 150 : isLargeTablet ? 140 : isTablet ? 130 : 110,
                  paddingVertical: isTV ? 16 : isLargeTablet ? 14 : isTablet ? 12 : 12,
                  paddingHorizontal: isTV ? 20 : isLargeTablet ? 18 : isTablet ? 16 : 16,
                  borderRadius: isTV ? 16 : isLargeTablet ? 14 : isTablet ? 12 : 12,
                },
                isSelected && styles.selectedSeasonTextButton,
              ]}
              animationConfig={{
                focusScale: 1.05,
                unfocusedOpacity: 0.8,
                showFocusBorder: true,
                focusBorderColor: currentTheme.colors.primary || '#007AFF',
                focusBorderWidth: 3,
                animateShadow: Platform.OS === 'ios',
              }}
              accessibilityLabel={season === 0 ? 'Specials' : `Season ${season}`}
              accessibilityHint="Press to select this season"
            >
              <Text
                style={[
                  styles.seasonTextButtonText,
                  { color: currentTheme.colors.highEmphasis },
                  isSelected && [
                    styles.selectedSeasonTextButtonText,
                    { color: currentTheme.colors.highEmphasis },
                  ],
                ]}
                numberOfLines={1}
              >
                {season === 0 ? 'Specials' : `Season ${season}`}
              </Text>
            </Focusable>
          </View>
        );
      }

      // Poster view
      return (
        <View style={{ opacity: posterViewVisible ? 1 : 0 }}>
          <Focusable
            ref={getSeasonRef(index)}
            onPress={() => onSeasonChange(season)}
            onFocus={() => handleSeasonFocus(index, season)}
            hasTVPreferredFocus={index === 0}
            isTVSelectable={true}
            focusId={seasonFocusId}
            style={[
              styles.seasonButton,
              { marginRight: seasonButtonSpacing, width: seasonPosterWidth },
              isSelected && [
                styles.selectedSeasonButton,
                { borderColor: currentTheme.colors.primary },
              ],
            ]}
            animationConfig={{
              focusScale: 1.05,
              unfocusedOpacity: 0.8,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary || '#007AFF',
              focusBorderWidth: 3,
              animateShadow: Platform.OS === 'ios',
            }}
            tvParallaxProperties={{
              enabled: Platform.OS === 'ios',
              shiftDistanceX: 2,
              shiftDistanceY: 2,
              tiltAngle: 0.05,
              magnification: 1.0,
              pressMagnification: 1.02,
              pressDuration: 0.3,
            }}
            accessibilityLabel={season === 0 ? 'Specials' : `Season ${season}`}
            accessibilityHint="Press to select this season"
          >
            <View
              style={[
                styles.seasonPosterContainer,
                {
                  width: seasonPosterWidth,
                  height: seasonPosterHeight,
                  borderRadius: isTV ? 16 : isLargeTablet ? 14 : isTablet ? 12 : 8,
                  marginBottom: isTV ? 12 : isLargeTablet ? 10 : isTablet ? 8 : 8,
                },
              ]}
            >
              <FastImage
                source={{ uri: seasonPoster }}
                style={styles.seasonPoster}
                resizeMode={FastImage.resizeMode.cover}
              />
              {isSelected && (
                <View
                  style={[
                    styles.selectedSeasonIndicator,
                    {
                      backgroundColor: currentTheme.colors.primary,
                      height: isTV ? 6 : isLargeTablet ? 5 : isTablet ? 4 : 4,
                    },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.seasonButtonText,
                {
                  color: currentTheme.colors.mediumEmphasis,
                  fontSize: isTV ? 18 : isLargeTablet ? 17 : isTablet ? 16 : 14,
                },
                isSelected && [
                  styles.selectedSeasonButtonText,
                  { color: currentTheme.colors.primary },
                ],
              ]}
            >
              {season === 0 ? 'Specials' : `Season ${season}`}
            </Text>
          </Focusable>
        </View>
      );
    };

    return (
      <View style={[styles.seasonSelectorWrapper, { paddingHorizontal: horizontalPadding }]}>
        <View
          style={[
            styles.seasonSelectorHeader,
            { marginBottom: isTV ? 16 : isLargeTablet ? 14 : isTablet ? 12 : 12 },
          ]}
        >
          <Text
            style={[
              styles.seasonSelectorTitle,
              {
                color: currentTheme.colors.highEmphasis,
                fontSize: isTV ? 28 : isLargeTablet ? 26 : isTablet ? 24 : 18,
              },
            ]}
          >
            Seasons
          </Text>

          {/* TV-Focusable View Mode Toggle */}
          <Focusable
            ref={viewModeToggleRef}
            onPress={() => {
              const newMode = seasonViewMode === 'posters' ? 'text' : 'posters';
              updateViewMode(newMode);
            }}
            onFocus={handleViewModeToggleFocus}
            isTVSelectable={true}
            focusId={`${uniqueSectionId}-view-mode-toggle`}
            style={[
              styles.seasonViewToggle,
              {
                backgroundColor:
                  seasonViewMode === 'posters'
                    ? currentTheme.colors.elevation2
                    : currentTheme.colors.elevation3,
                borderColor:
                  seasonViewMode === 'posters' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
                paddingHorizontal: isTV ? 12 : isLargeTablet ? 10 : isTablet ? 8 : 8,
                paddingVertical: isTV ? 6 : isLargeTablet ? 5 : isTablet ? 4 : 4,
                borderRadius: isTV ? 10 : isLargeTablet ? 8 : isTablet ? 6 : 6,
              },
            ]}
            animationConfig={{
              focusScale: 1.05,
              unfocusedOpacity: 0.8,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary || '#007AFF',
              focusBorderWidth: 2,
              animateShadow: false,
            }}
            accessibilityLabel={`View mode: ${seasonViewMode}`}
            accessibilityHint="Press to toggle between poster and text view"
          >
            <Text
              style={[
                styles.seasonViewToggleText,
                {
                  color:
                    seasonViewMode === 'posters'
                      ? currentTheme.colors.mediumEmphasis
                      : currentTheme.colors.highEmphasis,
                  fontSize: isTV ? 16 : isLargeTablet ? 15 : isTablet ? 14 : 12,
                },
              ]}
            >
              {seasonViewMode === 'posters' ? 'Posters' : 'Text'}
            </Text>
          </Focusable>
        </View>

        <FlatList
          ref={seasonScrollViewRef}
          data={seasons}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.seasonSelectorContainer}
          contentContainerStyle={[
            styles.seasonSelectorContent,
            { paddingBottom: isTV ? 12 : isLargeTablet ? 10 : isTablet ? 8 : 8 },
          ]}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={3}
          renderItem={renderSeasonItem}
          keyExtractor={season => season.toString()}
          onScrollToIndexFailed={info => {
            setTimeout(() => {
              seasonScrollViewRef.current?.scrollToOffset({
                offset: info.index * (seasonPosterWidth + seasonButtonSpacing),
                animated: true,
              });
            }, 100);
          }}
        />
      </View>
    );
  };

  // =============================================================================
  // Episode Card Renderers
  // =============================================================================

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRuntime = (runtime: number) => {
    if (!runtime) return null;
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const resolveEpisodeImage = (episode: Episode): string => {
    const candidates: Array<string | undefined | null> = [
      (episode as any).thumbnail,
      (episode as any).image,
      (episode as any).thumb,
      (episode as any)?.images?.still,
      episode.still_path,
    ];

    for (const cand of candidates) {
      if (!cand) continue;
      if (typeof cand === 'string' && (cand.startsWith('http://') || cand.startsWith('https://'))) {
        return cand;
      }
      if (typeof cand === 'string' && cand.startsWith('/') && settings?.enrichMetadataWithTMDB) {
        const tmdbUrl = tmdbService.getImageUrl(cand, 'original');
        if (tmdbUrl) return tmdbUrl;
      }
    }
    return metadata?.poster || EPISODE_PLACEHOLDER;
  };

  // Vertical episode card (Traditional)
  const renderVerticalEpisodeCard = useCallback(
    ({ item: episode, index }: { item: Episode; index: number }) => {
      let episodeImage = resolveEpisodeImage(episode);
      const episodeNumber =
        typeof episode.episode_number === 'number' ? episode.episode_number.toString() : '';
      const seasonNumber =
        typeof episode.season_number === 'number' ? episode.season_number.toString() : '';
      const episodeString =
        seasonNumber && episodeNumber
          ? `S${seasonNumber.padStart(2, '0')}E${episodeNumber.padStart(2, '0')}`
          : '';

      const episodeId =
        episode.stremioId || `${metadata?.id}:${episode.season_number}:${episode.episode_number}`;
      const tmdbOverride =
        tmdbEpisodeOverrides[`${metadata?.id}:${episode.season_number}:${episode.episode_number}`];
      const imdbRating = getIMDbRating(episode.season_number, episode.episode_number);
      const tmdbRating = tmdbOverride?.vote_average ?? episode.vote_average;
      const effectiveVote = imdbRating ?? tmdbRating ?? 0;
      const isImdbRating = imdbRating !== null;
      const effectiveRuntime = tmdbOverride?.runtime ?? (episode as any).runtime;

      if (!episode.still_path && tmdbOverride?.still_path) {
        const tmdbUrl = tmdbService.getImageUrl(tmdbOverride.still_path, 'original');
        if (tmdbUrl) episodeImage = tmdbUrl;
      }

      const progress = episodeProgress[episodeId];
      const progressPercent = progress ? (progress.currentTime / progress.duration) * 100 : 0;
      const showProgress = progress && progressPercent < 85;

      const episodeFocusId = `${episodesSectionId}-${index}`;

      return (
        <Focusable
          ref={getEpisodeRef(index)}
          key={episode.id}
          onPress={() => onSelectEpisode(episode)}
          onLongPress={() => handleEpisodeLongPress(episode, index)}
          onFocus={() => handleEpisodeFocus(index)}
          hasTVPreferredFocus={index === 0}
          isTVSelectable={true}
          focusId={episodeFocusId}
          style={[
            styles.episodeCardVertical,
            {
              backgroundColor: currentTheme.colors.elevation2,
              borderRadius: isTV ? 20 : isLargeTablet ? 18 : isTablet ? 16 : 16,
              marginBottom: isTV ? 20 : isLargeTablet ? 18 : isTablet ? 16 : 16,
              height: isTV ? 200 : isLargeTablet ? 180 : isTablet ? 160 : 120,
            },
          ]}
          animationConfig={{
            focusScale: 1.03,
            unfocusedOpacity: 0.9,
            showFocusBorder: true,
            focusBorderColor: currentTheme.colors.primary || '#007AFF',
            focusBorderWidth: 3,
            animateShadow: Platform.OS === 'ios',
          }}
          tvParallaxProperties={{
            enabled: Platform.OS === 'ios',
            shiftDistanceX: 2,
            shiftDistanceY: 2,
            tiltAngle: 0.03,
            magnification: 1.0,
            pressMagnification: 1.01,
            pressDuration: 0.3,
          }}
          accessibilityLabel={`${episodeString} ${episode.name}`}
          accessibilityHint="Press to play. Long press for more options."
        >
          <View
            style={[
              styles.episodeImageContainer,
              {
                width: isTV ? 200 : isLargeTablet ? 180 : isTablet ? 160 : 120,
                height: isTV ? 200 : isLargeTablet ? 180 : isTablet ? 160 : 120,
              },
            ]}
          >
            <FastImage
              source={{ uri: episodeImage }}
              style={styles.episodeImage}
              resizeMode={FastImage.resizeMode.cover}
            />
            <View
              style={[
                styles.episodeNumberBadge,
                {
                  paddingHorizontal: isTV ? 8 : 6,
                  paddingVertical: isTV ? 4 : 2,
                  borderRadius: isTV ? 6 : 4,
                },
              ]}
            >
              <Text
                style={[styles.episodeNumberText, { fontSize: isTV ? 13 : 11, fontWeight: '600' }]}
              >
                {episodeString}
              </Text>
            </View>
            {showProgress && (
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${progressPercent}%`, backgroundColor: currentTheme.colors.primary },
                  ]}
                />
              </View>
            )}
            {progressPercent >= 85 && (
              <View
                style={[
                  styles.completedBadge,
                  {
                    backgroundColor: currentTheme.colors.primary,
                    width: isTV ? 24 : 20,
                    height: isTV ? 24 : 20,
                    borderRadius: isTV ? 12 : 10,
                  },
                ]}
              >
                <MaterialIcons
                  name="check"
                  size={isTV ? 14 : 12}
                  color={currentTheme.colors.white}
                />
              </View>
            )}
            {(!progress || progressPercent === 0) && (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  width: isTV ? 24 : 20,
                  height: isTV ? 24 : 20,
                  borderRadius: isTV ? 12 : 10,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: currentTheme.colors.textMuted,
                  opacity: 0.85,
                }}
              />
            )}
          </View>

          <View
            style={[
              styles.episodeInfo,
              {
                paddingLeft: isTV ? 20 : isLargeTablet ? 18 : isTablet ? 16 : 12,
                flex: 1,
                justifyContent: 'center',
              },
            ]}
          >
            <View style={[styles.episodeHeader, { marginBottom: isTV ? 8 : 4 }]}>
              <Text
                style={[
                  styles.episodeTitle,
                  {
                    color: currentTheme.colors.text,
                    fontSize: isTV ? 18 : isLargeTablet ? 17 : isTablet ? 16 : 15,
                    lineHeight: isTV ? 24 : 18,
                    marginBottom: isTV ? 4 : 2,
                  },
                ]}
                numberOfLines={isLargeScreen ? 3 : 2}
              >
                {episode.name}
              </Text>
              <View style={[styles.episodeMetadata, { gap: isTV ? 12 : 8, flexWrap: 'wrap' }]}>
                {effectiveRuntime && (
                  <View style={styles.runtimeContainer}>
                    <MaterialIcons
                      name="schedule"
                      size={isTV ? 16 : 14}
                      color={currentTheme.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.runtimeText,
                        { color: currentTheme.colors.textMuted, fontSize: isTV ? 14 : 13 },
                      ]}
                    >
                      {formatRuntime(effectiveRuntime)}
                    </Text>
                  </View>
                )}
                {effectiveVote > 0 && (
                  <View style={styles.ratingContainer}>
                    {isImdbRating ? (
                      <>
                        <FastImage
                          source={{ uri: IMDb_LOGO }}
                          style={[
                            styles.imdbLogo,
                            { width: isTV ? 32 : 28, height: isTV ? 17 : 15 },
                          ]}
                          resizeMode={FastImage.resizeMode.contain}
                        />
                        <Text
                          style={[
                            styles.ratingText,
                            { color: '#F5C518', fontSize: isTV ? 14 : 13, fontWeight: '600' },
                          ]}
                        >
                          {effectiveVote.toFixed(1)}
                        </Text>
                      </>
                    ) : (
                      <>
                        <FastImage
                          source={{ uri: TMDB_LOGO }}
                          style={[
                            styles.tmdbLogo,
                            { width: isTV ? 22 : 20, height: isTV ? 16 : 14 },
                          ]}
                          resizeMode={FastImage.resizeMode.contain}
                        />
                        <Text
                          style={[
                            styles.ratingText,
                            { color: currentTheme.colors.textMuted, fontSize: isTV ? 14 : 13 },
                          ]}
                        >
                          {effectiveVote.toFixed(1)}
                        </Text>
                      </>
                    )}
                  </View>
                )}
                {episode.air_date && (
                  <Text
                    style={[
                      styles.airDateText,
                      { color: currentTheme.colors.textMuted, fontSize: isTV ? 13 : 12 },
                    ]}
                  >
                    {formatDate(episode.air_date)}
                  </Text>
                )}
              </View>
            </View>
            <Text
              style={[
                styles.episodeOverview,
                {
                  color: currentTheme.colors.mediumEmphasis,
                  fontSize: isTV ? 15 : 13,
                  lineHeight: isTV ? 22 : 18,
                },
              ]}
              numberOfLines={isLargeScreen ? 4 : 2}
            >
              {episode.overview ||
                (episode as any).description ||
                (episode as any).plot ||
                (episode as any).synopsis ||
                'No description available'}
            </Text>
          </View>
        </Focusable>
      );
    },
    [
      metadata?.id,
      episodeProgress,
      tmdbEpisodeOverrides,
      imdbRatingsMap,
      settings?.enrichMetadataWithTMDB,
      currentTheme,
      isTV,
      isLargeTablet,
      isTablet,
      isLargeScreen,
      episodesSectionId,
      onSelectEpisode,
      handleEpisodeLongPress,
      handleEpisodeFocus,
      getEpisodeRef,
      getIMDbRating,
    ]
  );

  // Horizontal episode card (Netflix-style)
  const renderHorizontalEpisodeCard = useCallback(
    ({ item: episode, index }: { item: Episode; index: number }) => {
      const episodeImage = resolveEpisodeImage(episode);
      const episodeNumber =
        typeof episode.episode_number === 'number' ? episode.episode_number.toString() : '';
      const episodeString = episodeNumber ? `EPISODE ${episodeNumber}` : '';

      const episodeId =
        episode.stremioId || `${metadata?.id}:${episode.season_number}:${episode.episode_number}`;
      const tmdbOverride =
        tmdbEpisodeOverrides[`${metadata?.id}:${episode.season_number}:${episode.episode_number}`];
      const imdbRating = getIMDbRating(episode.season_number, episode.episode_number);
      const tmdbRating = tmdbOverride?.vote_average ?? episode.vote_average;
      const effectiveVote = imdbRating ?? tmdbRating ?? 0;
      const isImdbRating = imdbRating !== null;
      const effectiveRuntime = tmdbOverride?.runtime ?? (episode as any).runtime;

      const progress = episodeProgress[episodeId];
      const progressPercent = progress ? (progress.currentTime / progress.duration) * 100 : 0;
      const showProgress = progress && progressPercent < 85;

      const episodeFocusId = `${episodesSectionId}-h-${index}`;

      return (
        <Animated.View
          entering={
            enableItemAnimations ? FadeIn.duration(300).delay(100 + index * 30) : (undefined as any)
          }
          style={[
            styles.episodeCardWrapperHorizontal,
            { width: horizontalCardWidth, marginRight: horizontalItemSpacing },
          ]}
        >
          <Focusable
            ref={getEpisodeRef(index)}
            key={episode.id}
            onPress={() => onSelectEpisode(episode)}
            onLongPress={() => handleEpisodeLongPress(episode, index)}
            onFocus={() => handleEpisodeFocus(index)}
            hasTVPreferredFocus={index === 0}
            isTVSelectable={true}
            focusId={episodeFocusId}
            style={[
              styles.episodeCardHorizontal,
              {
                borderRadius: isTV ? 20 : isLargeTablet ? 18 : isTablet ? 16 : 16,
                height: horizontalCardHeight,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              },
            ]}
            animationConfig={{
              focusScale: 1.05,
              unfocusedOpacity: 0.9,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary || '#007AFF',
              focusBorderWidth: 3,
              animateShadow: Platform.OS === 'ios',
            }}
            tvParallaxProperties={{
              enabled: Platform.OS === 'ios',
              shiftDistanceX: 3,
              shiftDistanceY: 3,
              tiltAngle: 0.05,
              magnification: 1.0,
              pressMagnification: 1.02,
              pressDuration: 0.3,
            }}
            accessibilityLabel={`${episodeString} ${episode.name}`}
            accessibilityHint="Press to play. Long press for more options."
          >
            <FastImage
              source={{ uri: episodeImage }}
              style={styles.episodeBackgroundImage}
              resizeMode={FastImage.resizeMode.cover}
            />

            <LinearGradient
              colors={[
                'rgba(0,0,0,0.05)',
                'rgba(0,0,0,0.2)',
                'rgba(0,0,0,0.6)',
                'rgba(0,0,0,0.85)',
                'rgba(0,0,0,0.95)',
              ]}
              locations={[0, 0.2, 0.5, 0.8, 1]}
              style={styles.episodeGradient}
            >
              <View
                style={[
                  styles.episodeContent,
                  { padding: isTV ? 20 : 12, paddingBottom: isTV ? 24 : 16 },
                ]}
              >
                <View
                  style={[
                    styles.episodeNumberBadgeHorizontal,
                    {
                      paddingHorizontal: isTV ? 10 : 6,
                      paddingVertical: isTV ? 5 : 3,
                      borderRadius: isTV ? 8 : 4,
                      marginBottom: isTV ? 10 : 6,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.episodeNumberHorizontal,
                      { fontSize: isTV ? 14 : 10, fontWeight: isTV ? '700' : '600' },
                    ]}
                  >
                    {episodeString}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.episodeTitleHorizontal,
                    {
                      fontSize: isTV ? 20 : 15,
                      fontWeight: isTV ? '800' : '700',
                      lineHeight: isTV ? 26 : 18,
                      marginBottom: isTV ? 8 : 4,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {episode.name}
                </Text>

                <Text
                  style={[
                    styles.episodeDescriptionHorizontal,
                    {
                      fontSize: isTV ? 16 : 12,
                      lineHeight: isTV ? 22 : 16,
                      marginBottom: isTV ? 12 : 8,
                      opacity: isTV ? 0.95 : 0.9,
                    },
                  ]}
                  numberOfLines={isLargeScreen ? 4 : 3}
                >
                  {episode.overview ||
                    (episode as any).description ||
                    (episode as any).plot ||
                    (episode as any).synopsis ||
                    'No description available'}
                </Text>

                <View style={[styles.episodeMetadataRowHorizontal, { gap: isTV ? 16 : 12 }]}>
                  {effectiveRuntime && (
                    <View style={styles.runtimeContainerHorizontal}>
                      <MaterialIcons
                        name="schedule"
                        size={isTV ? 16 : 14}
                        color={currentTheme.colors.mediumEmphasis}
                      />
                      <Text
                        style={[
                          styles.runtimeTextHorizontal,
                          {
                            fontSize: isTV ? 13 : 11,
                            fontWeight: isTV ? '600' : '500',
                            color: currentTheme.colors.mediumEmphasis,
                          },
                        ]}
                      >
                        {formatRuntime(effectiveRuntime)}
                      </Text>
                    </View>
                  )}
                  {effectiveVote > 0 && (
                    <View style={styles.ratingContainerHorizontal}>
                      {isImdbRating ? (
                        <>
                          <FastImage
                            source={{ uri: IMDb_LOGO }}
                            style={[
                              styles.imdbLogoHorizontal,
                              { width: isTV ? 32 : 28, height: isTV ? 17 : 15 },
                            ]}
                            resizeMode={FastImage.resizeMode.contain}
                          />
                          <Text
                            style={[
                              styles.ratingTextHorizontal,
                              { fontSize: isTV ? 13 : 11, fontWeight: '600', color: '#F5C518' },
                            ]}
                          >
                            {effectiveVote.toFixed(1)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="star" size={isTV ? 16 : 14} color="#FFD700" />
                          <Text
                            style={[
                              styles.ratingTextHorizontal,
                              { fontSize: isTV ? 13 : 11, fontWeight: '600' },
                            ]}
                          >
                            {effectiveVote.toFixed(1)}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                  {episode.air_date && (
                    <Text
                      style={[
                        styles.airDateTextHorizontal,
                        { color: currentTheme.colors.mediumEmphasis, fontSize: isTV ? 13 : 11 },
                      ]}
                    >
                      {formatDate(episode.air_date)}
                    </Text>
                  )}
                </View>
              </View>

              {showProgress && (
                <View style={styles.progressBarContainerHorizontal}>
                  <View
                    style={[
                      styles.progressBarHorizontal,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: currentTheme.colors.primary,
                      },
                    ]}
                  />
                </View>
              )}

              {progressPercent >= 85 && (
                <View
                  style={[
                    styles.completedBadgeHorizontal,
                    {
                      backgroundColor: currentTheme.colors.primary,
                      width: isTV ? 32 : 24,
                      height: isTV ? 32 : 24,
                      borderRadius: isTV ? 16 : 12,
                      top: isTV ? 16 : 12,
                      left: isTV ? 16 : 12,
                    },
                  ]}
                >
                  <MaterialIcons name="check" size={isTV ? 20 : 16} color="#fff" />
                </View>
              )}
              {(!progress || progressPercent === 0) && (
                <View
                  style={{
                    position: 'absolute',
                    top: isTV ? 16 : 12,
                    left: isTV ? 16 : 12,
                    width: isTV ? 32 : 24,
                    height: isTV ? 32 : 24,
                    borderRadius: isTV ? 16 : 12,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: currentTheme.colors.textMuted,
                    opacity: 0.9,
                  }}
                />
              )}
            </LinearGradient>
          </Focusable>
        </Animated.View>
      );
    },
    [
      metadata?.id,
      episodeProgress,
      tmdbEpisodeOverrides,
      imdbRatingsMap,
      settings?.enrichMetadataWithTMDB,
      currentTheme,
      isTV,
      isLargeTablet,
      isTablet,
      isLargeScreen,
      episodesSectionId,
      horizontalCardWidth,
      horizontalCardHeight,
      horizontalItemSpacing,
      enableItemAnimations,
      onSelectEpisode,
      handleEpisodeLongPress,
      handleEpisodeFocus,
      getEpisodeRef,
      getIMDbRating,
    ]
  );

  const currentSeasonEpisodes = groupedEpisodes[selectedSeason] || [];

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(300).delay(50)}>
        {renderSeasonSelector()}
      </Animated.View>

      <Animated.View entering={FadeIn.duration(300).delay(100)}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: currentTheme.colors.highEmphasis,
              fontSize: isTV ? 24 : 20,
              marginBottom: isTV ? 20 : 16,
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          {currentSeasonEpisodes.length}{' '}
          {currentSeasonEpisodes.length === 1 ? 'Episode' : 'Episodes'}
        </Text>

        {currentSeasonEpisodes.length === 0 && (
          <View style={styles.centeredContainer}>
            <MaterialIcons name="schedule" size={48} color={currentTheme.colors.textMuted} />
            <Text style={[styles.centeredText, { color: currentTheme.colors.text }]}>
              No episodes available for Season {selectedSeason}
            </Text>
            <Text style={[styles.centeredSubText, { color: currentTheme.colors.textMuted }]}>
              Episodes may not be released yet
            </Text>
          </View>
        )}

        {currentSeasonEpisodes.length > 0 &&
          (settings?.episodeLayoutStyle === 'horizontal' ? (
            <FlatList
              key={`episodes-${settings?.episodeLayoutStyle}-${selectedSeason}`}
              ref={horizontalEpisodeScrollViewRef}
              data={currentSeasonEpisodes}
              renderItem={renderHorizontalEpisodeCard}
              keyExtractor={episode => episode.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.episodeListContentHorizontal,
                { paddingLeft: horizontalPadding, paddingRight: horizontalPadding },
              ]}
              removeClippedSubviews
              initialNumToRender={3}
              maxToRenderPerBatch={5}
              windowSize={5}
              snapToInterval={horizontalCardWidth + horizontalItemSpacing}
              snapToAlignment="start"
              decelerationRate="fast"
              getItemLayout={(data, index) => ({
                length: horizontalCardWidth + horizontalItemSpacing,
                offset: horizontalPadding + (horizontalCardWidth + horizontalItemSpacing) * index,
                index,
              })}
              onScrollToIndexFailed={info => {
                setTimeout(() => {
                  horizontalEpisodeScrollViewRef.current?.scrollToOffset({
                    offset:
                      horizontalPadding +
                      (horizontalCardWidth + horizontalItemSpacing) * info.index,
                    animated: true,
                  });
                }, 500);
              }}
            />
          ) : (
            <FlashList
              key={`episodes-${settings?.episodeLayoutStyle}-${selectedSeason}`}
              ref={episodeScrollViewRef}
              data={currentSeasonEpisodes}
              renderItem={renderVerticalEpisodeCard}
              keyExtractor={episode => episode.id.toString()}
              contentContainerStyle={{
                paddingHorizontal: horizontalPadding,
                paddingBottom: isTV ? 32 : 8,
              }}
              estimatedItemSize={isTV ? 200 : 120}
              removeClippedSubviews
            />
          ))}
      </Animated.View>

      {/* Episode Action Menu Modal (fallback for non-TV) */}
      <Modal
        visible={episodeActionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEpisodeActionMenu}
        statusBarTranslucent
        supportedOrientations={['portrait', 'landscape']}
      >
        <Pressable style={styles.modalOverlay} onPress={closeEpisodeActionMenu}>
          <Pressable
            style={[
              styles.modalContent,
              {
                borderRadius: isTV ? 20 : 16,
                padding: isTV ? 24 : 20,
                width: isTV ? 400 : '100%',
                maxWidth: 400,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={{ marginBottom: isTV ? 20 : 16 }}>
              <Text style={styles.modalTitle}>
                {selectedEpisodeForAction
                  ? `S${selectedEpisodeForAction.season_number}E${selectedEpisodeForAction.episode_number}`
                  : ''}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {selectedEpisodeForAction?.name || ''}
              </Text>
            </View>

            <View style={{ gap: isTV ? 12 : 10 }}>
              {selectedEpisodeForAction &&
                (isEpisodeWatched(selectedEpisodeForAction) ? (
                  <Focusable
                    onPress={handleMarkAsUnwatched}
                    isTVSelectable={true}
                    disabled={markingAsWatched}
                    style={[styles.modalButton, { opacity: markingAsWatched ? 0.5 : 1 }]}
                    animationConfig={{
                      focusScale: 1.02,
                      showFocusBorder: true,
                      focusBorderColor: currentTheme.colors.primary,
                      focusBorderWidth: 2,
                    }}
                  >
                    <MaterialIcons
                      name="visibility-off"
                      size={isTV ? 24 : 22}
                      color="#FFFFFF"
                      style={{ marginRight: 12 }}
                    />
                    <Text style={styles.modalButtonText}>
                      {markingAsWatched ? 'Removing...' : 'Mark as Unwatched'}
                    </Text>
                  </Focusable>
                ) : (
                  <Focusable
                    onPress={handleMarkAsWatched}
                    isTVSelectable={true}
                    hasTVPreferredFocus={true}
                    disabled={markingAsWatched}
                    style={[
                      styles.modalButtonPrimary,
                      {
                        backgroundColor: currentTheme.colors.primary,
                        opacity: markingAsWatched ? 0.5 : 1,
                      },
                    ]}
                    animationConfig={{
                      focusScale: 1.02,
                      showFocusBorder: true,
                      focusBorderColor: '#fff',
                      focusBorderWidth: 2,
                    }}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={isTV ? 24 : 22}
                      color="#FFFFFF"
                      style={{ marginRight: 12 }}
                    />
                    <Text style={styles.modalButtonTextPrimary}>
                      {markingAsWatched ? 'Marking...' : 'Mark as Watched'}
                    </Text>
                  </Focusable>
                ))}

              {isSeasonWatched() ? (
                <Focusable
                  onPress={handleMarkSeasonAsUnwatched}
                  isTVSelectable={true}
                  disabled={markingAsWatched}
                  style={[styles.modalButton, { opacity: markingAsWatched ? 0.5 : 1 }]}
                  animationConfig={{
                    focusScale: 1.02,
                    showFocusBorder: true,
                    focusBorderColor: currentTheme.colors.primary,
                    focusBorderWidth: 2,
                  }}
                >
                  <MaterialIcons
                    name="playlist-remove"
                    size={isTV ? 24 : 22}
                    color="#FFFFFF"
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[styles.modalButtonText, { flex: 1 }]} numberOfLines={1}>
                    {markingAsWatched ? 'Removing...' : `Unmark Season ${selectedSeason}`}
                  </Text>
                </Focusable>
              ) : (
                <Focusable
                  onPress={handleMarkSeasonAsWatched}
                  isTVSelectable={true}
                  disabled={markingAsWatched}
                  style={[styles.modalButton, { opacity: markingAsWatched ? 0.5 : 1 }]}
                  animationConfig={{
                    focusScale: 1.02,
                    showFocusBorder: true,
                    focusBorderColor: currentTheme.colors.primary,
                    focusBorderWidth: 2,
                  }}
                >
                  <MaterialIcons
                    name="playlist-add-check"
                    size={isTV ? 24 : 22}
                    color="#FFFFFF"
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[styles.modalButtonText, { flex: 1 }]} numberOfLines={1}>
                    {markingAsWatched ? 'Marking...' : `Mark Season ${selectedSeason}`}
                  </Text>
                </Focusable>
              )}

              <Focusable
                onPress={closeEpisodeActionMenu}
                isTVSelectable={true}
                style={styles.modalCancelButton}
                animationConfig={{
                  focusScale: 1.02,
                  showFocusBorder: true,
                  focusBorderColor: currentTheme.colors.primary,
                  focusBorderWidth: 2,
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Focusable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  centeredSubText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  // Season Selector
  seasonSelectorWrapper: {
    marginBottom: 20,
  },
  seasonSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seasonSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seasonSelectorContainer: {
    flexGrow: 0,
  },
  seasonSelectorContent: {
    paddingBottom: 8,
  },
  seasonButton: {
    alignItems: 'center',
  },
  selectedSeasonButton: {
    opacity: 1,
  },
  seasonPosterContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  seasonPoster: {
    width: '100%',
    height: '100%',
  },
  selectedSeasonIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  seasonButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedSeasonButtonText: {
    fontWeight: '700',
  },
  seasonViewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  seasonViewToggleText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  seasonTextButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  selectedSeasonTextButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  seasonTextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  selectedSeasonTextButtonText: {
    fontWeight: '700',
  },

  // Episode Cards - Vertical
  episodeCardVertical: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 120,
  },
  episodeImageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  episodeImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.02 }],
  },
  episodeNumberBadge: {
    position: 'absolute',
    bottom: 8,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 1,
  },
  episodeNumberText: {
    color: '#fff',
    letterSpacing: 0.3,
  },
  episodeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  episodeHeader: {
    marginBottom: 4,
  },
  episodeTitle: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  episodeMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tmdbLogo: {
    width: 20,
    height: 14,
  },
  imdbLogo: {
    width: 35,
    height: 18,
  },
  ratingText: {
    fontWeight: '700',
    marginLeft: 4,
  },
  runtimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 52,
  },
  runtimeText: {
    fontWeight: '600',
    marginLeft: 4,
  },
  airDateText: {
    opacity: 0.8,
  },
  episodeOverview: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressBar: {
    height: '100%',
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 2,
  },

  // Episode Cards - Horizontal
  episodeListContentHorizontal: {},
  episodeCardWrapperHorizontal: {},
  episodeCardHorizontal: {
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    position: 'relative',
    width: '100%',
    backgroundColor: 'transparent',
  },
  episodeBackgroundImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  episodeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    justifyContent: 'flex-end',
  },
  episodeContent: {
    padding: 12,
    paddingBottom: 16,
  },
  episodeNumberBadgeHorizontal: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignSelf: 'flex-start',
  },
  episodeNumberHorizontal: {
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  episodeTitleHorizontal: {
    color: '#fff',
    letterSpacing: -0.3,
  },
  episodeDescriptionHorizontal: {
    color: 'rgba(255,255,255,0.85)',
  },
  episodeMetadataRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  runtimeContainerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  runtimeTextHorizontal: {
    color: 'rgba(255,255,255,0.8)',
  },
  airDateTextHorizontal: {
    opacity: 0.8,
  },
  ratingContainerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  imdbLogoHorizontal: {
    width: 35,
    height: 18,
  },
  ratingTextHorizontal: {
    color: '#FFD700',
  },
  progressBarContainerHorizontal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressBarHorizontal: {
    height: '100%',
    borderRadius: 2,
  },
  completedBadgeHorizontal: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.51,
    shadowRadius: 13.16,
    elevation: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    borderRadius: 10,
  },
  modalButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalCancelButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 4,
  },
  modalCancelText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '500',
  },
});

// =============================================================================
// Export
// =============================================================================

export const SeriesContent = memo(SeriesContentComponent);
