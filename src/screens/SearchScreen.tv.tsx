/**
 * SearchScreen.tv.tsx
 *
 * TV-specific search screen with complete D-pad navigation support,
 * voice search integration, and TV keyboard input.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - TV keyboard for text input with focus states
 * - Voice search integration via TVNavigationContext
 * - Results grid navigable via D-pad (horizontal scrolling rows)
 * - Focus states on all result items with scale animations
 * - Recent searches accessible via D-pad
 * - Focus memory persistence across screen navigation
 * - Long-press on results triggers context menu
 * - Integration with TVNavigationContext for global focus state
 *
 * @example
 * ```tsx
 * // This file is automatically loaded by Metro when APP_VARIANT=tv
 * // No explicit import needed - use SearchScreen and the correct variant loads
 * ```
 */

import FastImage from '@d11/react-native-fast-image';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import debounce from 'lodash/debounce';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  StatusBar,
  Dimensions,
  ScrollView,
  Platform,
  DeviceEventEmitter,
  Share,
} from 'react-native';

// Reanimated animations are handled by the Focusable component
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// TV-specific imports
import Focusable, { FocusableRef } from '../components/common/Focusable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ScreenHeader from '../components/common/ScreenHeader';
import { useContextMenu } from '../hooks/useContextMenu';
import TVContextMenu from '../components/tv/TVContextMenu';
import { useTheme } from '../contexts/ThemeContext';
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { useTVEventHandler } from '../hooks/useTVEventHandler';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  catalogService,
  StreamingContent,
  GroupedSearchResults,
  AddonSearchResults,
} from '../services/catalogService';
import { mmkvStorage } from '../services/mmkvStorage';
import { logger } from '../utils/logger';

// =============================================================================
// Constants
// =============================================================================

const { width, height } = Dimensions.get('window');

// TV-specific responsive breakpoints
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

const deviceType = getDeviceType(width);
const isTablet = deviceType === 'tablet';
const isLargeTablet = deviceType === 'largeTablet';
const isTV = deviceType === 'tv' || Platform.isTV;

// TV-optimized sizes
const HORIZONTAL_ITEM_WIDTH = isTV
  ? width * 0.12
  : isLargeTablet
    ? width * 0.16
    : isTablet
      ? width * 0.18
      : width * 0.3;
const HORIZONTAL_POSTER_HEIGHT = HORIZONTAL_ITEM_WIDTH * 1.5;
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

const PLACEHOLDER_POSTER = 'https://placehold.co/300x450/222222/CCCCCC?text=No+Poster';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface TVSearchResultItemProps {
  item: StreamingContent;
  index: number;
  navigation: any;
  currentTheme: any;
  focusId: string;
  onFocus: (focusId: string) => void;
  hasTVPreferredFocus?: boolean;
  nextFocusUp?: number;
  nextFocusDown?: number;
}

// =============================================================================
// TV Search Result Item Component
// =============================================================================

const TVSearchResultItem: React.FC<TVSearchResultItemProps> = React.memo(
  ({
    item,
    index,
    navigation,
    currentTheme,
    focusId,
    onFocus,
    hasTVPreferredFocus = false,
    nextFocusUp,
    nextFocusDown,
  }) => {
    const [inLibrary, setInLibrary] = useState(!!item.inLibrary);
    const [watched, setWatched] = useState(false);
    const { openContextMenu } = useContextMenu();

    // Calculate dimensions based on poster shape
    const { itemWidth, aspectRatio } = useMemo(() => {
      const shape = item.posterShape || 'poster';
      const baseHeight = HORIZONTAL_POSTER_HEIGHT;

      let w = HORIZONTAL_ITEM_WIDTH;
      let r = 2 / 3;

      if (shape === 'landscape') {
        r = 16 / 9;
        w = baseHeight * r;
      } else if (shape === 'square') {
        r = 1;
        w = baseHeight;
      }
      return { itemWidth: w, aspectRatio: r };
    }, [item.posterShape]);

    // Watch for library/watched status changes
    useEffect(() => {
      const updateWatched = () => {
        mmkvStorage
          .getItem(`watched:${item.type}:${item.id}`)
          .then(val => setWatched(val === 'true'));
      };
      updateWatched();
      const sub = DeviceEventEmitter.addListener('watchedStatusChanged', updateWatched);
      return () => sub.remove();
    }, [item.id, item.type]);

    useEffect(() => {
      const unsubscribe = catalogService.subscribeToLibraryUpdates(items => {
        const found = items.find(libItem => libItem.id === item.id && libItem.type === item.type);
        setInLibrary(!!found);
      });
      return () => unsubscribe();
    }, [item.id, item.type]);

    // Handle navigation to detail
    const handlePress = useCallback(() => {
      navigation.navigate('Metadata', { id: item.id, type: item.type });
    }, [navigation, item.id, item.type]);

    // Handle long-press for context menu
    const handleLongPress = useCallback(() => {
      openContextMenu({
        targetId: `search-result-${item.id}`,
        title: item.name,
        mediaItem: {
          id: item.id,
          title: item.name,
          type: item.type as 'movie' | 'series',
          isInList: inLibrary,
          isWatched: watched,
        },
        actions: inLibrary
          ? ['removeFromList', watched ? 'markUnwatched' : 'markWatched', 'share', 'info']
          : ['addToList', watched ? 'markUnwatched' : 'markWatched', 'share', 'info'],
        onAddToList: async () => {
          await catalogService.addToLibrary(item);
          setInLibrary(true);
        },
        onRemoveFromList: async () => {
          await catalogService.removeFromLibrary(item.type, item.id);
          setInLibrary(false);
        },
        onMarkWatched: async () => {
          await mmkvStorage.setItem(`watched:${item.type}:${item.id}`, 'true');
          setWatched(true);
          DeviceEventEmitter.emit('watchedStatusChanged');
        },
        onMarkUnwatched: async () => {
          await mmkvStorage.setItem(`watched:${item.type}:${item.id}`, 'false');
          setWatched(false);
          DeviceEventEmitter.emit('watchedStatusChanged');
        },
        onShare: async () => {
          const url = item.id ? `https://www.imdb.com/title/${item.id}/` : '';
          const message = `${item.name}\n${url}`;
          Share.share({ message, url, title: item.name });
        },
        onGetInfo: () => {
          navigation.navigate('Metadata', { id: item.id, type: item.type });
        },
      });
    }, [openContextMenu, item, inLibrary, watched, navigation]);

    // Handle focus
    const handleFocus = useCallback(() => {
      onFocus(focusId);
    }, [onFocus, focusId]);

    return (
      <Focusable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onFocus={handleFocus}
        hasTVPreferredFocus={hasTVPreferredFocus}
        style={[styles.horizontalItem, { width: itemWidth }]}
        animationConfig={{
          focusScale: 1.05,
          unfocusedOpacity: 0.85,
          showFocusBorder: true,
          focusBorderColor: currentTheme.colors.primary,
          focusBorderWidth: 3,
          animateShadow: Platform.OS === 'ios',
        }}
        tvParallaxProperties={{
          enabled: true,
          shiftDistanceX: 3,
          shiftDistanceY: 3,
          tiltAngle: 0.03,
          magnification: 1.02,
        }}
        nextFocus={{
          nextFocusUp,
          nextFocusDown,
        }}
        accessibilityLabel={`${item.name}${item.year ? `, ${item.year}` : ''}`}
        accessibilityHint={`Press to view details, hold for more options`}
      >
        <View
          style={[
            styles.horizontalItemPosterContainer,
            {
              width: itemWidth,
              aspectRatio,
              backgroundColor: currentTheme.colors.darkBackground,
              borderColor: 'rgba(255,255,255,0.05)',
            },
          ]}
        >
          <FastImage
            source={{ uri: item.poster || PLACEHOLDER_POSTER }}
            style={styles.horizontalItemPoster}
            resizeMode={FastImage.resizeMode.cover}
          />
          {/* Bookmark icon */}
          {inLibrary && (
            <View
              style={[
                styles.libraryBadge,
                {
                  position: 'absolute',
                  top: 8,
                  right: 36,
                  backgroundColor: 'transparent',
                  zIndex: 2,
                },
              ]}
            >
              <Feather name="bookmark" size={18} color={currentTheme.colors.white} />
            </View>
          )}
          {/* Watched indicator */}
          {watched && (
            <View
              style={[
                styles.watchedIndicator,
                {
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'transparent',
                  zIndex: 2,
                },
              ]}
            >
              <MaterialIcons
                name="check-circle"
                size={22}
                color={currentTheme.colors.success || '#4CAF50'}
              />
            </View>
          )}
          {/* Rating badge */}
          {item.imdbRating && (
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={14} color="#FFC107" />
              <Text style={[styles.ratingText, { color: currentTheme.colors.white }]}>
                {item.imdbRating}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.horizontalItemTitle,
            {
              color: currentTheme.colors.white,
              fontSize: isTV ? 16 : 14,
              lineHeight: isTV ? 20 : 18,
            },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.year && (
          <Text
            style={[
              styles.yearText,
              { color: currentTheme.colors.mediumGray, fontSize: isTV ? 14 : 12 },
            ]}
          >
            {item.year}
          </Text>
        )}
      </Focusable>
    );
  }
);

// =============================================================================
// TV Recent Search Item Component
// =============================================================================

interface TVRecentSearchItemProps {
  search: string;
  index: number;
  onSelect: (search: string) => void;
  onDelete: (index: number) => void;
  focusId: string;
  onFocus: (focusId: string) => void;
  hasTVPreferredFocus?: boolean;
  currentTheme: any;
}

const TVRecentSearchItem: React.FC<TVRecentSearchItemProps> = React.memo(
  ({
    search,
    index,
    onSelect,
    onDelete,
    focusId,
    onFocus,
    hasTVPreferredFocus = false,
    currentTheme,
  }) => {
    const handlePress = useCallback(() => {
      onSelect(search);
    }, [onSelect, search]);

    const handleLongPress = useCallback(() => {
      onDelete(index);
    }, [onDelete, index]);

    const handleFocus = useCallback(() => {
      onFocus(focusId);
    }, [onFocus, focusId]);

    return (
      <Focusable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onFocus={handleFocus}
        hasTVPreferredFocus={hasTVPreferredFocus}
        style={styles.recentSearchItem}
        animationConfig={{
          focusScale: 1.02,
          unfocusedOpacity: 0.8,
          showFocusBorder: true,
          focusBorderColor: currentTheme.colors.primary,
          focusBorderWidth: 2,
        }}
        accessibilityLabel={`Recent search: ${search}`}
        accessibilityHint="Press to search, hold to delete"
      >
        <MaterialIcons
          name="history"
          size={22}
          color={currentTheme.colors.lightGray}
          style={styles.recentSearchIcon}
        />
        <Text style={[styles.recentSearchText, { color: currentTheme.colors.white }]}>
          {search}
        </Text>
        <View style={styles.recentSearchDeleteHint}>
          <Text
            style={[styles.recentSearchDeleteHintText, { color: currentTheme.colors.mediumGray }]}
          >
            Hold to delete
          </Text>
        </View>
      </Focusable>
    );
  }
);

// =============================================================================
// TV Addon Section Component
// =============================================================================

interface TVAddonSectionProps {
  addonGroup: AddonSearchResults;
  addonIndex: number;
  navigation: any;
  currentTheme: any;
  onItemFocus: (focusId: string) => void;
  sectionFocusId: string;
}

const TVAddonSection: React.FC<TVAddonSectionProps> = React.memo(
  ({ addonGroup, addonIndex, navigation, currentTheme, onItemFocus, sectionFocusId }) => {
    const listRef = useRef<FlatList>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const tvNav = useTVNavigationOptional();

    const movieResults = useMemo(
      () => addonGroup.results.filter(item => item.type === 'movie'),
      [addonGroup.results]
    );
    const seriesResults = useMemo(
      () => addonGroup.results.filter(item => item.type === 'series'),
      [addonGroup.results]
    );
    const otherResults = useMemo(
      () => addonGroup.results.filter(item => item.type !== 'movie' && item.type !== 'series'),
      [addonGroup.results]
    );

    // Scroll to focused item
    const handleItemFocus = useCallback(
      (focusId: string, itemIndex: number, listRefToUse: React.RefObject<FlatList>) => {
        onItemFocus(focusId);
        setFocusedIndex(itemIndex);

        // Scroll to keep item visible
        if (listRefToUse.current && itemIndex >= 0) {
          try {
            listRefToUse.current.scrollToIndex({
              index: itemIndex,
              animated: true,
              viewPosition: 0.3,
            });
          } catch (e) {
            // Fallback for scroll failure
          }
        }

        // Save focus memory
        if (tvNav) {
          tvNav.setScreenFocus(`search-${sectionFocusId}`, focusId);
        }
      },
      [onItemFocus, tvNav, sectionFocusId]
    );

    // Render result row with its own list ref
    const renderResultRow = (results: StreamingContent[], typeKey: string, title: string) => {
      if (results.length === 0) return null;

      const rowListRef = useRef<FlatList>(null);

      return (
        <View style={[styles.carouselContainer, { marginBottom: isTV ? 48 : 24 }]}>
          <Text
            style={[
              styles.carouselSubtitle,
              {
                color: currentTheme.colors.lightGray,
                fontSize: isTV ? 20 : 14,
                marginBottom: isTV ? 16 : 8,
                paddingHorizontal: isTV ? 32 : 16,
              },
            ]}
          >
            {title} ({results.length})
          </Text>
          <FlatList
            ref={rowListRef}
            data={results}
            renderItem={({ item, index }) => (
              <TVSearchResultItem
                item={item}
                index={index}
                navigation={navigation}
                currentTheme={currentTheme}
                focusId={`${sectionFocusId}-${typeKey}-${index}`}
                onFocus={focusId => handleItemFocus(focusId, index, rowListRef)}
                hasTVPreferredFocus={addonIndex === 0 && typeKey === 'movie' && index === 0}
              />
            )}
            keyExtractor={item => `${addonGroup.addonId}-${typeKey}-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            getItemLayout={(data, index) => ({
              length: HORIZONTAL_ITEM_WIDTH + 16,
              offset: (HORIZONTAL_ITEM_WIDTH + 16) * index,
              index,
            })}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
          />
        </View>
      );
    };

    return (
      <View>
        {/* Addon Header */}
        <View style={[styles.addonHeaderContainer, { marginTop: isTV ? 32 : 16 }]}>
          <Text
            style={[
              styles.addonHeaderText,
              { color: currentTheme.colors.white, fontSize: isTV ? 22 : 16 },
            ]}
          >
            {addonGroup.addonName}
          </Text>
          <View
            style={[styles.addonHeaderBadge, { backgroundColor: currentTheme.colors.elevation2 }]}
          >
            <Text style={[styles.addonHeaderBadgeText, { color: currentTheme.colors.lightGray }]}>
              {addonGroup.results.length}
            </Text>
          </View>
        </View>

        {/* Movies */}
        {renderResultRow(movieResults, 'movie', 'Movies')}

        {/* TV Shows */}
        {renderResultRow(seriesResults, 'series', 'TV Shows')}

        {/* Other types */}
        {otherResults.length > 0 &&
          renderResultRow(
            otherResults,
            'other',
            otherResults[0].type.charAt(0).toUpperCase() + otherResults[0].type.slice(1)
          )}
      </View>
    );
  },
  (prev, next) => {
    return prev.addonGroup === next.addonGroup && prev.addonIndex === next.addonIndex;
  }
);

// =============================================================================
// Main SearchScreen Component
// =============================================================================

const SearchScreenTV: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedSearchResults>({ byAddon: [], allResults: [] });
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();

  // Live search handle
  const liveSearchHandle = useRef<{ cancel: () => void; done: Promise<void> } | null>(null);
  // Addon installation order map for stable section ordering
  const addonOrderRankRef = useRef<Record<string, number>>({});
  // Track mount status for async operations
  const isMounted = useRef(true);

  // TV Navigation
  const tvNav = useTVNavigationOptional();
  const spatialNav = useSpatialNavigation('SearchScreen', {
    autoRestoreFocus: true,
    defaultFocusId: 'search-input',
  });

  // Refs for focus navigation
  const searchInputRef = useRef<FocusableRef>(null);
  const voiceButtonRef = useRef<FocusableRef>(null);
  const clearButtonRef = useRef<FocusableRef>(null);

  // =============================================================================
  // Lifecycle
  // =============================================================================

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    loadRecentSearches();

    return () => {
      debouncedSearch.cancel();
    };
  }, []);

  // Track focus state to strictly prevent updates when blurred
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      return () => {
        isMounted.current = false;
        // Cancel any active searches immediately on blur
        if (liveSearchHandle.current) {
          liveSearchHandle.current.cancel();
          liveSearchHandle.current = null;
        }
        debouncedSearch.cancel();
      };
    }, [])
  );

  // Hide header on mount
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // =============================================================================
  // TV Event Handler
  // =============================================================================

  useTVEventHandler(
    useCallback(
      event => {
        // Handle voice button to open voice search
        if (event.eventType === 'playPause' && tvNav) {
          tvNav.openVoiceSearch();
        }
      },
      [tvNav]
    ),
    { enabled: Platform.isTV }
  );

  // =============================================================================
  // Search Logic
  // =============================================================================

  const loadRecentSearches = async () => {
    try {
      const savedSearches = await mmkvStorage.getItem(RECENT_SEARCHES_KEY);
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
    } catch (error) {
      logger.error('Failed to load recent searches:', error);
    }
  };

  const saveRecentSearch = async (searchQuery: string) => {
    try {
      setRecentSearches(prevSearches => {
        const newRecentSearches = [
          searchQuery,
          ...prevSearches.filter(s => s !== searchQuery),
        ].slice(0, MAX_RECENT_SEARCHES);

        mmkvStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newRecentSearches));
        return newRecentSearches;
      });
    } catch (error) {
      logger.error('Failed to save recent search:', error);
    }
  };

  const debouncedSearch = useMemo(() => {
    return debounce(async (searchQuery: string) => {
      liveSearchHandle.current?.cancel();
      liveSearchHandle.current = null;
      performLiveSearch(searchQuery);
    }, 800);
  }, []);

  const performLiveSearch = async (searchQuery: string) => {
    if (!isMounted.current) return;

    if (!searchQuery || searchQuery.trim().length === 0) {
      setResults({ byAddon: [], allResults: [] });
      setSearching(false);
      return;
    }

    setSearching(true);
    setResults({ byAddon: [], allResults: [] });
    addonOrderRankRef.current = {};

    try {
      if (liveSearchHandle.current) {
        liveSearchHandle.current.cancel();
      }

      const addons = await catalogService.getAllAddons();
      const rank: Record<string, number> = {};
      let rankCounter = 0;

      rank['com.linvo.cinemeta'] = rankCounter++;

      addons.forEach(addon => {
        if (addon.id !== 'com.linvo.cinemeta') {
          rank[addon.id] = rankCounter++;
        }
      });
      addonOrderRankRef.current = rank;

      const handle = catalogService.startLiveSearch(
        searchQuery,
        async (section: AddonSearchResults) => {
          if (!isMounted.current) return;

          setResults(prev => {
            if (!isMounted.current) return prev;

            const getRank = (id: string) =>
              addonOrderRankRef.current[id] ?? Number.MAX_SAFE_INTEGER;
            const existingIndex = prev.byAddon.findIndex(s => s.addonId === section.addonId);

            if (existingIndex >= 0) {
              const copy = prev.byAddon.slice();
              copy[existingIndex] = section;
              return { byAddon: copy, allResults: prev.allResults };
            }

            const insertRank = getRank(section.addonId);
            let insertAt = prev.byAddon.length;
            for (let i = 0; i < prev.byAddon.length; i++) {
              if (getRank(prev.byAddon[i].addonId) > insertRank) {
                insertAt = i;
                break;
              }
            }

            const nextByAddon = [
              ...prev.byAddon.slice(0, insertAt),
              section,
              ...prev.byAddon.slice(insertAt),
            ];

            if (prev.byAddon.length === 0) {
              setSearching(false);
            }

            return { byAddon: nextByAddon, allResults: prev.allResults };
          });

          try {
            await saveRecentSearch(searchQuery);
          } catch {}
        }
      );

      liveSearchHandle.current = handle;
      await handle.done;

      if (isMounted.current) {
        setSearching(false);
      }
    } catch (error) {
      if (isMounted.current) {
        setSearching(false);
      }
    }
  };

  useEffect(() => {
    if (query.trim() && query.trim().length >= 2) {
      setSearching(true);
      setSearched(true);
      setShowRecent(false);
      debouncedSearch(query);
    } else if (query.trim().length < 2 && query.trim().length > 0) {
      setSearching(false);
      setSearched(false);
      setShowRecent(false);
      setResults({ byAddon: [], allResults: [] });
    } else {
      debouncedSearch.cancel();
      liveSearchHandle.current?.cancel();
      liveSearchHandle.current = null;
      setResults({ byAddon: [], allResults: [] });
      setSearched(false);
      setSearching(false);
      setShowRecent(true);
      loadRecentSearches();
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [query]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleClearSearch = useCallback(() => {
    setQuery('');
    liveSearchHandle.current?.cancel();
    liveSearchHandle.current = null;
    setResults({ byAddon: [], allResults: [] });
    setSearched(false);
    setShowRecent(true);
    loadRecentSearches();
    inputRef.current?.focus();
  }, []);

  const handleRecentSearchSelect = useCallback((search: string) => {
    setQuery(search);
  }, []);

  const handleRecentSearchDelete = useCallback((index: number) => {
    setRecentSearches(prev => {
      const newSearches = [...prev];
      newSearches.splice(index, 1);
      mmkvStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
      return newSearches;
    });
  }, []);

  const handleVoiceSearch = useCallback(() => {
    if (tvNav) {
      tvNav.openVoiceSearch();
    }
  }, [tvNav]);

  const handleItemFocus = useCallback(
    (focusId: string) => {
      spatialNav.saveFocus(focusId);
      if (tvNav) {
        tvNav.setCurrentFocusId(focusId);
      }
    },
    [spatialNav, tvNav]
  );

  // =============================================================================
  // Computed Values
  // =============================================================================

  const hasResultsToShow = useMemo(() => {
    return results.byAddon.length > 0;
  }, [results]);

  // =============================================================================
  // Render Recent Searches
  // =============================================================================

  const renderRecentSearches = () => {
    if (!showRecent || recentSearches.length === 0) return null;

    return (
      <View style={styles.recentSearchesContainer}>
        <Text
          style={[
            styles.carouselTitle,
            { color: currentTheme.colors.white, fontSize: isTV ? 24 : 18 },
          ]}
        >
          Recent Searches
        </Text>
        {recentSearches.map((search, index) => (
          <TVRecentSearchItem
            key={`recent-${index}`}
            search={search}
            index={index}
            onSelect={handleRecentSearchSelect}
            onDelete={handleRecentSearchDelete}
            focusId={`recent-search-${index}`}
            onFocus={handleItemFocus}
            hasTVPreferredFocus={index === 0 && !query.trim()}
            currentTheme={currentTheme}
          />
        ))}
      </View>
    );
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Screen Header with Search Bar */}
      <ScreenHeader title="Search" isTablet={isTV || isLargeTablet || isTablet}>
        {/* Search Bar Container */}
        <View style={styles.searchBarContainer}>
          {/* Voice Search Button */}
          <Focusable
            ref={voiceButtonRef}
            onPress={handleVoiceSearch}
            onFocus={() => handleItemFocus('voice-button')}
            style={[styles.voiceButton, { backgroundColor: currentTheme.colors.elevation2 }]}
            animationConfig={{
              focusScale: 1.1,
              unfocusedOpacity: 0.8,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary,
              focusBorderWidth: 2,
            }}
            accessibilityLabel="Voice search"
            accessibilityHint="Press to search with voice"
          >
            <MaterialIcons name="mic" size={isTV ? 28 : 24} color={currentTheme.colors.primary} />
          </Focusable>

          {/* Search Input */}
          <View style={[styles.searchBarWrapper, { flex: 1 }]}>
            <Focusable
              ref={searchInputRef}
              onFocus={() => {
                handleItemFocus('search-input');
                inputRef.current?.focus();
              }}
              hasTVPreferredFocus={recentSearches.length === 0}
              style={[
                styles.searchBar,
                {
                  backgroundColor: currentTheme.colors.elevation2,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                },
              ]}
              animationConfig={{
                focusScale: 1.02,
                unfocusedOpacity: 0.9,
                showFocusBorder: true,
                focusBorderColor: currentTheme.colors.primary,
                focusBorderWidth: 2,
              }}
              accessibilityLabel="Search input"
              accessibilityHint="Type to search for movies and shows"
            >
              <MaterialIcons
                name="search"
                size={isTV ? 28 : 24}
                color={currentTheme.colors.lightGray}
                style={styles.searchIcon}
              />
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    color: currentTheme.colors.white,
                    fontSize: isTV ? 20 : 16,
                  },
                ]}
                placeholder="Search movies, shows..."
                placeholderTextColor={currentTheme.colors.lightGray}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                keyboardAppearance="dark"
                ref={inputRef}
              />
              {query.length > 0 && (
                <Focusable
                  ref={clearButtonRef}
                  onPress={handleClearSearch}
                  onFocus={() => handleItemFocus('clear-button')}
                  style={styles.clearButton}
                  animationConfig={{
                    focusScale: 1.2,
                    unfocusedOpacity: 0.7,
                    showFocusBorder: false,
                  }}
                  accessibilityLabel="Clear search"
                >
                  <MaterialIcons
                    name="close"
                    size={isTV ? 24 : 20}
                    color={currentTheme.colors.lightGray}
                  />
                </Focusable>
              )}
            </Focusable>
          </View>
        </View>
      </ScreenHeader>

      {/* Content Container */}
      <View
        style={[styles.contentContainer, { backgroundColor: currentTheme.colors.darkBackground }]}
      >
        {searching ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <LoadingSpinner size="large" offsetY={-60} />
          </View>
        ) : query.trim().length === 1 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="search"
              size={isTV ? 80 : 64}
              color={currentTheme.colors.lightGray}
            />
            <Text
              style={[
                styles.emptyText,
                { color: currentTheme.colors.white, fontSize: isTV ? 24 : 18 },
              ]}
            >
              Keep typing...
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: currentTheme.colors.lightGray, fontSize: isTV ? 18 : 14 },
              ]}
            >
              Type at least 2 characters to search
            </Text>
          </View>
        ) : searched && !hasResultsToShow ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="search-off"
              size={isTV ? 80 : 64}
              color={currentTheme.colors.lightGray}
            />
            <Text
              style={[
                styles.emptyText,
                { color: currentTheme.colors.white, fontSize: isTV ? 24 : 18 },
              ]}
            >
              No results found
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: currentTheme.colors.lightGray, fontSize: isTV ? 18 : 14 },
              ]}
            >
              Try different keywords or check your spelling
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!query.trim() && renderRecentSearches()}
            {/* Render results grouped by addon */}
            {results.byAddon.map((addonGroup, addonIndex) => (
              <TVAddonSection
                key={addonGroup.addonId}
                addonGroup={addonGroup}
                addonIndex={addonIndex}
                navigation={navigation}
                currentTheme={currentTheme}
                onItemFocus={handleItemFocus}
                sectionFocusId={`addon-${addonIndex}`}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* TV Context Menu */}
      <TVContextMenu />
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 0,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isTV ? 16 : 8,
    height: isTV ? 64 : 48,
    gap: isTV ? 16 : 12,
  },
  searchBarWrapper: {
    flex: 1,
    height: isTV ? 64 : 48,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: isTV ? 16 : 12,
    paddingHorizontal: isTV ? 20 : 16,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: isTV ? 16 : 12,
  },
  searchInput: {
    flex: 1,
    fontSize: isTV ? 20 : 16,
    height: '100%',
  },
  clearButton: {
    padding: isTV ? 8 : 4,
  },
  voiceButton: {
    width: isTV ? 64 : 48,
    height: isTV ? 64 : 48,
    borderRadius: isTV ? 16 : 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: isTV ? 140 : 100,
    paddingHorizontal: 0,
  },
  carouselContainer: {
    marginBottom: isTV ? 48 : 24,
  },
  carouselTitle: {
    fontSize: isTV ? 24 : 18,
    fontWeight: '700',
    marginBottom: isTV ? 20 : 12,
    paddingHorizontal: isTV ? 32 : 16,
  },
  carouselSubtitle: {
    fontSize: isTV ? 20 : 14,
    fontWeight: '600',
    marginBottom: isTV ? 16 : 8,
    paddingHorizontal: isTV ? 32 : 16,
  },
  addonHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTV ? 32 : 16,
    paddingVertical: isTV ? 20 : 12,
    marginTop: isTV ? 32 : 16,
    marginBottom: isTV ? 12 : 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  addonHeaderText: {
    fontSize: isTV ? 22 : 16,
    fontWeight: '700',
    flex: 1,
  },
  addonHeaderBadge: {
    paddingHorizontal: isTV ? 14 : 10,
    paddingVertical: isTV ? 6 : 4,
    borderRadius: 12,
  },
  addonHeaderBadgeText: {
    fontSize: isTV ? 14 : 11,
    fontWeight: '600',
  },
  horizontalListContent: {
    paddingHorizontal: isTV ? 24 : 12,
    paddingRight: isTV ? 16 : 8,
  },
  horizontalItem: {
    width: HORIZONTAL_ITEM_WIDTH,
    marginRight: isTV ? 20 : 12,
  },
  horizontalItemPosterContainer: {
    width: HORIZONTAL_ITEM_WIDTH,
    height: HORIZONTAL_POSTER_HEIGHT,
    borderRadius: isTV ? 20 : 16,
    overflow: 'hidden',
    marginBottom: isTV ? 12 : 8,
    borderWidth: 1,
  },
  horizontalItemPoster: {
    width: '100%',
    height: '100%',
  },
  horizontalItemTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    lineHeight: isTV ? 20 : 18,
    textAlign: 'left',
  },
  yearText: {
    fontSize: isTV ? 14 : 12,
    marginTop: 4,
  },
  recentSearchesContainer: {
    paddingHorizontal: isTV ? 32 : 16,
    paddingBottom: isTV ? 32 : 16,
    paddingTop: isTV ? 16 : 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: isTV ? 24 : 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isTV ? 16 : 10,
    paddingHorizontal: isTV ? 20 : 16,
    marginVertical: isTV ? 4 : 1,
    borderRadius: isTV ? 12 : 8,
  },
  recentSearchIcon: {
    marginRight: isTV ? 16 : 12,
  },
  recentSearchText: {
    fontSize: isTV ? 20 : 16,
    flex: 1,
  },
  recentSearchDeleteHint: {
    paddingHorizontal: 8,
  },
  recentSearchDeleteHintText: {
    fontSize: isTV ? 14 : 12,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTV ? 80 : 32,
    paddingBottom: isTV ? 160 : 100,
  },
  emptyText: {
    fontSize: isTV ? 24 : 18,
    fontWeight: 'bold',
    marginTop: isTV ? 24 : 16,
    marginBottom: isTV ? 12 : 8,
  },
  emptySubtext: {
    fontSize: isTV ? 18 : 14,
    textAlign: 'center',
    lineHeight: isTV ? 26 : 20,
  },
  ratingContainer: {
    position: 'absolute',
    bottom: isTV ? 12 : 8,
    right: isTV ? 12 : 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTV ? 10 : 6,
    paddingVertical: isTV ? 5 : 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: isTV ? 14 : 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  watchedIndicator: {
    position: 'absolute',
    top: isTV ? 12 : 8,
    right: isTV ? 12 : 8,
    borderRadius: 12,
    padding: 2,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  libraryBadge: {
    position: 'absolute',
    top: isTV ? 12 : 8,
    left: isTV ? 12 : 8,
    borderRadius: 8,
    padding: 4,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
});

export default SearchScreenTV;
