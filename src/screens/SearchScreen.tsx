import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Dimensions,
  ScrollView,
  Animated as RNAnimated,
  Pressable,
  Platform,
  Easing,
  Modal,
} from 'react-native';
import Focusable from '../components/common/Focusable';
import TVTextInput from '../components/common/TVTextInput';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { catalogService, StreamingContent, GroupedSearchResults, AddonSearchResults } from '../services/catalogService';
import FastImage from '@d11/react-native-fast-image';
import debounce from 'lodash/debounce';
import { DropUpMenu } from '../components/home/DropUpMenu';
import { DeviceEventEmitter, Share } from 'react-native';
import { mmkvStorage } from '../services/mmkvStorage';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { RootStackParamList } from '../navigation/AppNavigator';
import { logger } from '../utils/logger';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ScreenHeader from '../components/common/ScreenHeader';
import { useScrollToTop } from '../contexts/ScrollToTopContext';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSettings } from '../hooks/useSettings';
import { triggerLight } from '../hooks/useHaptics';

// Import extracted search components
import {
  DiscoverCatalog,
  BREAKPOINTS,
  getDeviceType,
  isTablet,
  isLargeTablet,
  isTV,
  TAB_BAR_HEIGHT,
  RECENT_SEARCHES_KEY,
  MAX_RECENT_SEARCHES,
  PLACEHOLDER_POSTER,
  HORIZONTAL_ITEM_WIDTH,
  HORIZONTAL_POSTER_HEIGHT,
  POSTER_WIDTH,
  POSTER_HEIGHT,
} from '../components/search/searchUtils';
import { SearchSkeletonLoader } from '../components/search/SearchSkeletonLoader';
import { SearchAnimation } from '../components/search/SearchAnimation';
import { SearchResultItem } from '../components/search/SearchResultItem';
import { RecentSearches } from '../components/search/RecentSearches';

const { width, height } = Dimensions.get('window');

// Enhanced responsive breakpoints and device type logic are imported from searchUtils
const deviceType = getDeviceType(width);

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Alias imported components for backward compatibility with existing code
const SkeletonLoader = SearchSkeletonLoader;
const SimpleSearchAnimation = SearchAnimation;

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

const SearchScreen = () => {
  const { settings } = useSettings();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isDarkMode = true;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedSearchResults>({ byAddon: [], allResults: [] });
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  // Live search handle
  const liveSearchHandle = useRef<{ cancel: () => void; done: Promise<void> } | null>(null);
  // Addon installation order map for stable section ordering
  const addonOrderRankRef = useRef<Record<string, number>>({});
  // Track if this is the initial mount to prevent unnecessary operations
  const isInitialMount = useRef(true);
  // Track mount status for async operations
  const isMounted = useRef(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Discover section state
  const [discoverCatalogs, setDiscoverCatalogs] = useState<DiscoverCatalog[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<DiscoverCatalog | null>(null);
  const [selectedDiscoverType, setSelectedDiscoverType] = useState<'movie' | 'series'>('movie');
  const [selectedDiscoverGenre, setSelectedDiscoverGenre] = useState<string | null>(null);
  // Discover pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<StreamingContent[]>([]);
  const [pendingDiscoverResults, setPendingDiscoverResults] = useState<StreamingContent[]>([]);

  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverInitialized, setDiscoverInitialized] = useState(false);

  // Bottom sheet refs and state
  const typeSheetRef = useRef<BottomSheetModal>(null);
  const catalogSheetRef = useRef<BottomSheetModal>(null);
  const genreSheetRef = useRef<BottomSheetModal>(null);
  const typeSnapPoints = useMemo(() => ['25%'], []);
  const catalogSnapPoints = useMemo(() => ['50%'], []);
  const genreSnapPoints = useMemo(() => ['50%'], []);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useScrollToTop('Search', scrollToTop);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleShowMore = () => {
    if (pendingDiscoverResults.length === 0) return;

    // Show next batch of 300 items
    const batchSize = 300;
    const nextBatch = pendingDiscoverResults.slice(0, batchSize);
    const remaining = pendingDiscoverResults.slice(batchSize);

    setDiscoverResults(prev => [...prev, ...nextBatch]);
    setPendingDiscoverResults(remaining);
  };

  // Load discover catalogs on mount
  useEffect(() => {
    const loadDiscoverCatalogs = async () => {
      try {
        const filters = await catalogService.getDiscoverFilters();
        if (isMounted.current) {
          // Flatten catalogs from all types into a single array
          const allCatalogs: DiscoverCatalog[] = [];
          for (const [type, catalogs] of Object.entries(filters.catalogsByType)) {
            // Only include movie and series types
            if (type === 'movie' || type === 'series') {
              for (const catalog of catalogs) {
                allCatalogs.push({
                  ...catalog,
                  type,
                });
              }
            }
          }
          setDiscoverCatalogs(allCatalogs);
          // Auto-select first catalog if available
          if (allCatalogs.length > 0) {
            setSelectedCatalog(allCatalogs[0]);
          }
          setDiscoverInitialized(true);
        }
      } catch (error) {
        logger.error('Failed to load discover catalogs:', error);
        if (isMounted.current) {
          setDiscoverInitialized(true);
        }
      }
    };
    loadDiscoverCatalogs();
  }, []);

  // Fetch discover content when catalog or genre changes
  useEffect(() => {
    if (!discoverInitialized || !selectedCatalog || query.trim().length > 0) return;

    const fetchDiscoverContent = async () => {
      if (!isMounted.current) return;
      setDiscoverLoading(true);
      setPage(1); // Reset page on new filter
      setHasMore(true);
      setPendingDiscoverResults([]);
      try {
        const results = await catalogService.discoverContentFromCatalog(
          selectedCatalog.addonId,
          selectedCatalog.catalogId,
          selectedCatalog.type,
          selectedDiscoverGenre || undefined,
          1 // page 1
        );
        if (isMounted.current) {
          if (results.length > 300) {
            setDiscoverResults(results.slice(0, 300));
            setPendingDiscoverResults(results.slice(300));
            setHasMore(true);
          } else {
            setDiscoverResults(results);
            setPendingDiscoverResults([]);
            setHasMore(results.length > 0);
          }
        }
      } catch (error) {
        logger.error('Failed to fetch discover content:', error);
        if (isMounted.current) {
          setDiscoverResults([]);
        }
      } finally {
        if (isMounted.current) {
          setDiscoverLoading(false);
        }
      }
    };

    fetchDiscoverContent();
  }, [discoverInitialized, selectedCatalog, selectedDiscoverGenre, query]);

  // Load more content for pagination
  const loadMoreDiscoverContent = async () => {
    if (!hasMore || loadingMore || discoverLoading || !selectedCatalog || pendingDiscoverResults.length > 0) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const moreResults = await catalogService.discoverContentFromCatalog(
        selectedCatalog.addonId,
        selectedCatalog.catalogId,
        selectedCatalog.type,
        selectedDiscoverGenre || undefined,
        nextPage
      );

      if (isMounted.current) {
        if (moreResults.length > 0) {
          if (moreResults.length > 300) {
            setDiscoverResults(prev => [...prev, ...moreResults.slice(0, 300)]);
            setPendingDiscoverResults(moreResults.slice(300));
          } else {
            setDiscoverResults(prev => [...prev, ...moreResults]);
          }
          setPage(nextPage);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      logger.error('Failed to load more discover content:', error);
    } finally {
      if (isMounted.current) {
        setLoadingMore(false);
      }
    }
  };

  // DropUpMenu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StreamingContent | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [refreshFlag, setRefreshFlag] = React.useState(false);

  // Update isSaved and isWatched when selectedItem changes
  useEffect(() => {
    if (!selectedItem) return;
    (async () => {
      // Check if item is in library
      const items = await catalogService.getLibraryItems();
      const found = items.find((libItem: any) => libItem.id === selectedItem.id && libItem.type === selectedItem.type);
      setIsSaved(!!found);
      // Check watched status
      const val = await mmkvStorage.getItem(`watched:${selectedItem.type}:${selectedItem.id}`);
      setIsWatched(val === 'true');
    })();
  }, [selectedItem]);
  // Animation values
  const searchBarWidth = useSharedValue(width - 32);
  const searchBarOpacity = useSharedValue(1);
  const backButtonOpacity = useSharedValue(0);

  // Force consistent status bar settings
  useEffect(() => {
    const applyStatusBarConfig = () => {
      StatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
      }
    };

    applyStatusBarConfig();

    // Re-apply on focus
    const unsubscribe = navigation.addListener('focus', applyStatusBarConfig);
    return unsubscribe;
  }, [navigation]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    loadRecentSearches();

    // Cleanup function to cancel pending searches on unmount
    return () => {
      debouncedSearch.cancel();
    };
  }, []);

  const animatedSearchBarStyle = useAnimatedStyle(() => {
    return {
      width: searchBarWidth.value,
      opacity: searchBarOpacity.value,
    };
  });

  const animatedBackButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: backButtonOpacity.value,
      transform: [
        {
          translateX: interpolate(
            backButtonOpacity.value,
            [0, 1],
            [-20, 0]
          )
        }
      ]
    };
  });

  const handleSearchFocus = () => {
    // Animate search bar when focused
    searchBarWidth.value = withTiming(width - 80);
    backButtonOpacity.value = withTiming(1);
    triggerLight();
  };

  const handleSearchBlur = () => {
    if (!query) {
      // Only animate back if query is empty
      searchBarWidth.value = withTiming(width - 32);
      backButtonOpacity.value = withTiming(0);
    }
  };

  const handleBackPress = () => {
    triggerLight();
    Keyboard.dismiss();
    if (query) {
      setQuery('');
      setResults({ byAddon: [], allResults: [] });
      setSearched(false);
      setShowRecent(true);
      loadRecentSearches();
    } else {
      // Add a small delay to allow keyboard to dismiss smoothly before navigation
      if (Platform.OS === 'android') {
        setTimeout(() => {
          navigation.goBack();
        }, 100);
      } else {
        navigation.goBack();
      }
    }
  };

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
          ...prevSearches.filter(s => s !== searchQuery)
        ].slice(0, MAX_RECENT_SEARCHES);

        // Save to AsyncStorage
        mmkvStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newRecentSearches));

        return newRecentSearches;
      });
    } catch (error) {
      logger.error('Failed to save recent search:', error);
    }
  };

  // Create a stable debounced search function using useMemo
  const debouncedSearch = useMemo(() => {
    return debounce(async (searchQuery: string) => {
      // Cancel any in-flight live search
      liveSearchHandle.current?.cancel();
      liveSearchHandle.current = null;
      performLiveSearch(searchQuery);
    }, 800);
  }, []); // Empty dependency array - create once and never recreate

  // Track focus state to strictly prevent updates when blurred (fixes Telemetry crash)
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
    }, [debouncedSearch])
  );

  // Live search implementation
  const performLiveSearch = async (searchQuery: string) => {
    // strict guard: don't search if unmounted or blurred
    if (!isMounted.current) return;

    if (!searchQuery || searchQuery.trim().length === 0) {
      setResults({ byAddon: [], allResults: [] });
      setSearching(false);
      return;
    }

    setSearching(true);
    setResults({ byAddon: [], allResults: [] });
    // Reset order rank for new search
    addonOrderRankRef.current = {};

    try {
      if (liveSearchHandle.current) {
        liveSearchHandle.current.cancel();
      }

      // Pre-fetch addon list to establish a stable order rank
      const addons = await catalogService.getAllAddons();
      // ... (rank logic) ...
      const rank: Record<string, number> = {};
      let rankCounter = 0;

      // Cinemeta first
      rank['com.linvo.cinemeta'] = rankCounter++;

      // Then others
      addons.forEach(addon => {
        if (addon.id !== 'com.linvo.cinemeta') {
          rank[addon.id] = rankCounter++;
        }
      });
      addonOrderRankRef.current = rank;

      const handle = catalogService.startLiveSearch(searchQuery, async (section: AddonSearchResults) => {
        // Prevent updates if component is unmounted or blurred
        if (!isMounted.current) return;

        triggerLight();

        // Append/update this addon section...
        setResults(prev => {
          // ... (existing update logic) ...
          if (!isMounted.current) return prev; // Extra guard inside setter

          const getRank = (id: string) => addonOrderRankRef.current[id] ?? Number.MAX_SAFE_INTEGER;
          // ... (same logic as before) ...
          const existingIndex = prev.byAddon.findIndex(s => s.addonId === section.addonId);

          if (existingIndex >= 0) {
            const copy = prev.byAddon.slice();
            copy[existingIndex] = section;
            return { byAddon: copy, allResults: prev.allResults };
          }

          // Insert new section
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
            ...prev.byAddon.slice(insertAt)
          ];

          // Hide loading overlay once first addon returns
          if (nextByAddon.length === 1) {
            setSearching(false);
            setSearched(true);
            setShowRecent(false);
          }

          return { byAddon: nextByAddon, allResults: prev.allResults };
        });
      });

      liveSearchHandle.current = handle;

      // Wait for all searches to complete
      if (handle.done) {
        await handle.done;
        if (isMounted.current) {
          setSearching(false);
        }
      }
    } catch (error) {
      logger.error('Live search error:', error);
      if (isMounted.current) {
        setSearching(false);
      }
    }
  };

  const handleSelectContent = (item: StreamingContent) => {
    triggerLight();
    setSelectedItem(item);
    setMenuVisible(true);
  };

  const handleSaveItem = async () => {
    if (!selectedItem) return;
    triggerLight();
    try {
      await catalogService.saveItemToLibrary(selectedItem);
      setIsSaved(true);
      setRefreshFlag(!refreshFlag);
    } catch (error) {
      logger.error('Failed to save item:', error);
    }
  };

  const handleRemoveItem = async () => {
    if (!selectedItem) return;
    triggerLight();
    try {
      await catalogService.removeItemFromLibrary(selectedItem.id, selectedItem.type);
      setIsSaved(false);
      setRefreshFlag(!refreshFlag);
    } catch (error) {
      logger.error('Failed to remove item:', error);
    }
  };

  const handleMarkAsWatched = async () => {
    if (!selectedItem) return;
    triggerLight();
    try {
      await mmkvStorage.setItem(`watched:${selectedItem.type}:${selectedItem.id}`, 'true');
      setIsWatched(true);
    } catch (error) {
      logger.error('Failed to mark as watched:', error);
    }
  };

  const handlePlayContent = () => {
    triggerLight();
    if (!selectedItem) return;
    setMenuVisible(false);

    navigation.navigate('Details', {
      id: selectedItem.id,
      type: selectedItem.type,
      addonId: selectedItem.addonId,
    });
  };

  const handleShare = async () => {
    triggerLight();
    if (!selectedItem) return;

    try {
      const message = `Check out ${selectedItem.name} on StremioTV!`;
      await Share.share({
        message,
        title: selectedItem.name,
      });
    } catch (error) {
      logger.error('Share error:', error);
    }
  };

  const handleRecentSearchTap = (search: string) => {
    triggerLight();
    setQuery(search);
    setShowRecent(false);
    debouncedSearch(search);
  };

  const handleRemoveRecentSearch = async (search: string) => {
    triggerLight();
    try {
      const newSearches = recentSearches.filter(s => s !== search);
      setRecentSearches(newSearches);
      await mmkvStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
    } catch (error) {
      logger.error('Failed to remove recent search:', error);
    }
  };

  const handleDiscoverItemTap = (item: StreamingContent) => {
    triggerLight();
    setSelectedItem(item);
    setMenuVisible(true);
  };

  const handleCatalogSelect = (catalog: DiscoverCatalog) => {
    triggerLight();
    setSelectedCatalog(catalog);
    catalogSheetRef.current?.close();
  };

  const handleTypeSelect = (type: 'movie' | 'series') => {
    triggerLight();
    setSelectedDiscoverType(type);
    typeSheetRef.current?.close();
  };

  const renderRecentSearchesList = () => {
    return (
      <RecentSearches
        recentSearches={recentSearches}
        onSearchTap={handleRecentSearchTap}
        onRemove={handleRemoveRecentSearch}
      />
    );
  };

  const renderDiscoverContent = () => {
    if (discoverLoading) {
      return <SkeletonLoader />;
    }

    if (!selectedCatalog) {
      return <Text style={[styles.noResultsText, { color: currentTheme.colors.text }]}>No catalogs available</Text>;
    }

    if (discoverResults.length === 0) {
      return <Text style={[styles.noResultsText, { color: currentTheme.colors.text }]}>No results found</Text>;
    }

    return (
      <View style={styles.discoverResultsContainer}>
        <FlatList
          data={discoverResults}
          renderItem={({ item }) => (
            <SearchResultItem
              item={item}
              onPress={() => handleDiscoverItemTap(item)}
            />
          )}
          keyExtractor={(item) => `${item.addonId}-${item.id}`}
          numColumns={isTV ? 5 : isLargeTablet ? 4 : isTablet ? 3 : 2}
          columnWrapperStyle={styles.columnWrapper}
          onEndReached={loadMoreDiscoverContent}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="large" color={currentTheme.colors.primary} /> : null
          }
          scrollEnabled={false}
        />
        {pendingDiscoverResults.length > 0 && (
          <TouchableOpacity
            style={[styles.showMoreButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handleShowMore}
          >
            <Text style={[styles.showMoreText, { color: currentTheme.colors.white }]}>
              Show More ({pendingDiscoverResults.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSearchResults = () => {
    if (searching) {
      return <SimpleSearchAnimation />;
    }

    if (!searched) {
      return showRecent ? renderRecentSearchesList() : null;
    }

    if (results.byAddon.length === 0) {
      return <Text style={[styles.noResultsText, { color: currentTheme.colors.text }]}>No results found for "{query}"</Text>;
    }

    return (
      <View style={styles.resultsContainer}>
        {results.byAddon.map((section, index) => (
          <View key={index}>
            <Text style={[styles.addonName, { color: currentTheme.colors.text }]}>
              {section.addonName}
            </Text>
            <FlatList
              data={section.items}
              renderItem={({ item }) => (
                <SearchResultItem
                  item={item}
                  onPress={() => handleSelectContent(item)}
                />
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <Animated.View style={[styles.searchBar, animatedSearchBarStyle]}>
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: currentTheme.colors.text, borderColor: currentTheme.colors.border }]}
            placeholder="Search..."
            placeholderTextColor={currentTheme.colors.secondaryText}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowRecent(text.length === 0);
              debouncedSearch(text);
            }}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          <Feather name="search" size={20} color={currentTheme.colors.secondaryText} style={styles.searchIcon} />
        </Animated.View>
        <Animated.View style={[styles.backButton, animatedBackButtonStyle]}>
          <TouchableOpacity onPress={handleBackPress}>
            <Feather name="x" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={[styles.contentContainer, { backgroundColor: currentTheme.colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {searched ? renderSearchResults() : renderDiscoverContent()}
      </ScrollView>

      <DropUpMenu
        visible={menuVisible}
        item={selectedItem}
        onClose={() => setMenuVisible(false)}
        onPlay={handlePlayContent}
        onSave={isSaved ? handleRemoveItem : handleSaveItem}
        onMarkWatched={handleMarkAsWatched}
        onShare={handleShare}
        isSaved={isSaved}
        isWatched={isWatched}
        refreshFlag={refreshFlag}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  searchBar: {
    flex: 1,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  searchIcon: {
    marginLeft: 8,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  addonName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  discoverResultsContainer: {
    flex: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
  showMoreButton: {
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchScreen;