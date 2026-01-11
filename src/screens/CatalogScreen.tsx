import React, { useState, useEffect, useCallback, useRef, createRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Dimensions,
  Platform,
  InteractionManager,
  ScrollView
} from 'react-native';
import { UnifiedSpinner, PosterGridSkeleton } from '../components/loading';
import { FlashList } from '@shopify/flash-list';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Meta, stremioService, CatalogExtra } from '../services/stremioService';
import { useTheme } from '../contexts/ThemeContext';
import FastImage from '@d11/react-native-fast-image';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';

// Optional iOS Glass effect (expo-glass-effect) with safe fallback for CatalogScreen
let GlassViewComp: any = null;
let liquidGlassAvailable = false;
if (Platform.OS === 'ios') {
  try {
    // Dynamically require so app still runs if the package isn't installed yet
    const glass = require('expo-glass-effect');
    GlassViewComp = glass.GlassView;
    liquidGlassAvailable = typeof glass.isLiquidGlassAvailable === 'function' ? glass.isLiquidGlassAvailable() : false;
  } catch {
    GlassViewComp = null;
    liquidGlassAvailable = false;
  }
}
import { logger } from '../utils/logger';
import { useCustomCatalogNames } from '../hooks/useCustomCatalogNames';
import { mmkvStorage } from '../services/mmkvStorage';
import { catalogService, DataSource, StreamingContent } from '../services/catalogService';
import { tmdbService } from '../services/tmdbService';

type CatalogScreenProps = {
  route: RouteProp<RootStackParamList, 'Catalog'>;
  navigation: StackNavigationProp<RootStackParamList, 'Catalog'>;
};

// Constants for layout
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// Dynamic column and spacing calculation based on screen width
const calculateCatalogLayout = (screenWidth: number) => {
  const MIN_ITEM_WIDTH = 120;
  const MAX_ITEM_WIDTH = 180; // Increased for tablets
  // Increase padding and spacing on larger screens for proper breathing room
  const HORIZONTAL_PADDING = screenWidth >= 1600 ? SPACING.xl * 4 : screenWidth >= 1200 ? SPACING.xl * 3 : screenWidth >= 1000 ? SPACING.xl * 2 : SPACING.lg * 2;
  const ITEM_SPACING = screenWidth >= 1600 ? SPACING.xl : screenWidth >= 1200 ? SPACING.lg : screenWidth >= 1000 ? SPACING.md : SPACING.sm;

  // Calculate how many columns can fit
  const availableWidth = screenWidth - HORIZONTAL_PADDING;
  const maxColumns = Math.floor(availableWidth / (MIN_ITEM_WIDTH + ITEM_SPACING));

  // More flexible column limits for different screen sizes
  let numColumns;
  if (screenWidth < 600) {
    // Phone: 2-3 columns
    numColumns = Math.min(Math.max(maxColumns, 2), 3);
  } else if (screenWidth < 900) {
    // Small tablet: 3-5 columns
    numColumns = Math.min(Math.max(maxColumns, 3), 5);
  } else if (screenWidth < 1200) {
    // Large tablet: 4-6 columns
    numColumns = Math.min(Math.max(maxColumns, 4), 6);
  } else if (screenWidth < 1600) {
    // Desktop-ish: 5-8 columns
    numColumns = Math.min(Math.max(maxColumns, 5), 8);
  } else {
    // Ultra-wide: 6-10 columns
    numColumns = Math.min(Math.max(maxColumns, 6), 10);
  }

  // Calculate actual item width with proper spacing
  const totalSpacing = ITEM_SPACING * (numColumns - 1);
  const itemWidth = (availableWidth - totalSpacing) / numColumns;

  // Ensure item width doesn't exceed maximum
  const finalItemWidth = Math.floor(Math.min(itemWidth, MAX_ITEM_WIDTH));

  return {
    numColumns,
    itemWidth: finalItemWidth,
    itemSpacing: ITEM_SPACING,
    containerPadding: HORIZONTAL_PADDING / 2, // use half per side for contentContainerStyle padding
  };
};

// Create a styles creator function that accepts the theme colors
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 8 : 8,
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    width: '100%',
  },
  list: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    width: '100%',
  },
  item: {
    marginBottom: SPACING.lg,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.elevation2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: colors.elevation3,
  },
  // removed bottom text container; keep spacing via item margin only
  button: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    backgroundColor: colors.primary,
    borderRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    // Center content on very wide screens
    alignSelf: 'center',
    maxWidth: 600, // Narrower max width for centered content
    width: '100%',
  },
  emptyText: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: SPACING.lg,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeBlur: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  // Filter chip bar styles
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  filterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.elevation3,
    borderWidth: 1,
    borderColor: colors.elevation3,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.mediumGray,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
});

const CatalogScreen: React.FC<CatalogScreenProps> = ({ route, navigation }) => {
  const { addonId, type, id, name: originalName, genreFilter } = route.params;
  const [items, setItems] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>(DataSource.STREMIO_ADDONS);
  const [actualCatalogName, setActualCatalogName] = useState<string | null>(null);
  const [screenData, setScreenData] = useState(() => {
    const { width } = Dimensions.get('window');
    return {
      width,
      ...calculateCatalogLayout(width)
    };
  });
  const [mobileColumnsPref, setMobileColumnsPref] = useState<'auto' | 2 | 3>('auto');
  const [nowPlayingMovies, setNowPlayingMovies] = useState<Set<string>>(new Set());
  // Filter state for catalog extra properties per protocol
  const [catalogExtras, setCatalogExtras] = useState<CatalogExtra[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [activeGenreFilter, setActiveGenreFilter] = useState<string | undefined>(genreFilter);
  const [showTitles, setShowTitles] = useState(true); // Default to showing titles
  const { currentTheme } = useTheme();
  const colors = currentTheme.colors;
  const styles = createStyles(colors);
  const isDarkMode = true;

  const flashListRef = useRef<FlashList<Meta>>(null);

  // Load mobile columns preference (phones only)
  useEffect(() => {
    (async () => {
      try {
        const pref = await mmkvStorage.getItem('catalog_mobile_columns');
        if (pref === '2') setMobileColumnsPref(2);
        else if (pref === '3') setMobileColumnsPref(3);
        else setMobileColumnsPref('auto');

        // Load show titles preference (default: true)
        const titlesPref = await mmkvStorage.getItem('catalog_show_titles');
        setShowTitles(titlesPref !== 'false'); // Default to true if not set
      } catch { }
    })();
  }, []);

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const base = calculateCatalogLayout(window.width);
      setScreenData(prev => ({
        width: window.width,
        ...base
      }));
    });

    return () => subscription?.remove();
  }, []);

  const { getCustomName, isLoadingCustomNames } = useCustomCatalogNames();

  // Create display name with proper type suffix
  const createDisplayName = (catalogName: string) => {
    if (!catalogName) return '';

    // Check if the name already includes content type indicators
    const lowerName = catalogName.toLowerCase();
    const contentType = type === 'movie' ? 'Movies' : type === 'series' ? 'TV Shows' : `${type.charAt(0).toUpperCase() + type.slice(1)}s`;

    // If the name already contains type information, return as is
    if (lowerName.includes('movie') || lowerName.includes('tv') || lowerName.includes('show') || lowerName.includes('series')) {
      return catalogName;
    }

    // Otherwise append the content type
    return `${catalogName} ${contentType}`;
  };

  // Use actual catalog name if available, otherwise fallback to custom name or original name
  const displayName = actualCatalogName
    ? getCustomName(addonId || '', type || '', id || '', createDisplayName(actualCatalogName))
    : getCustomName(addonId || '', type || '', id || '', originalName ? createDisplayName(originalName) : '') ||
    (genreFilter ? `${genreFilter} ${type === 'movie' ? 'Movies' : 'TV Shows'}` :
      `${type.charAt(0).toUpperCase() + type.slice(1)}s`);

  // Add effect to get the actual catalog name and filter extras from addon manifest
  useEffect(() => {
    const getCatalogDetails = async () => {
      if (addonId && type && id) {
        try {
          const manifests = await stremioService.getInstalledAddonsAsync();
          const addon = manifests.find(a => a.id === addonId);

          if (addon && addon.catalogs) {
            const catalog = addon.catalogs.find(c => c.type === type && c.id === id);
            if (catalog) {
              if (catalog.name) {
                setActualCatalogName(catalog.name);
              }
              // Extract filter extras per protocol (genre, etc.)
              if (catalog.extra && Array.isArray(catalog.extra)) {
                // Only show filterable extras with options (not search/skip)
                const filterableExtras = catalog.extra.filter(
                  extra => extra.options && extra.options.length > 0 && extra.name !== 'skip'
                );
                setCatalogExtras(filterableExtras);
                logger.log('[CatalogScreen] Loaded catalog extras:', filterableExtras.map(e => e.name));
              }
            }
          }
        } catch (error) {
          logger.error('Failed to get catalog details:', error);
        }
      }
    };

    getCatalogDetails();
  }, [addonId, type, id]);

  // Add effect to get data source preference when component mounts
  useEffect(() => {
    const getDataSourcePreference = async () => {
      const preference = await catalogService.getDataSourcePreference();
      setDataSource(preference);
    };

    getDataSourcePreference();
  }, []);

  // Load now playing movies for theater chip (only for movie catalogs)
  useEffect(() => {
    const loadNowPlayingMovies = async () => {
      if (type === 'movie') {
        try {
          // Get first page of now playing movies (typically shows most recent/current)
          const nowPlaying = await tmdbService.getNowPlaying(1, 'US');
          const movieIds = new Set(nowPlaying.map(movie =>
            movie.external_ids?.imdb_id || movie.id.toString()
          ).filter(Boolean));
          setNowPlayingMovies(movieIds);
        } catch (error) {
          logger.error('Failed to load now playing movies:', error);
          // Set empty set on error to avoid repeated attempts
          setNowPlayingMovies(new Set());
        }
      }
    };

    loadNowPlayingMovies();
  }, [type]);

  const loadItems = useCallback(async (shouldRefresh: boolean = false, pageParam: number = 1) => {
    logger.log('[CatalogScreen] loadItems called', {
      shouldRefresh,
      pageParam,
      addonId,
      type,
      id,
      dataSource,
      activeGenreFilter
    });
    try {
      if (shouldRefresh) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }

      setError(null);

      // Process the genre filter - ignore "All" and clean up the value
      let effectiveGenreFilter = activeGenreFilter;
      if (effectiveGenreFilter === 'All') {
        effectiveGenreFilter = undefined;
        logger.log('Genre "All" detected, removing genre filter');
      } else if (effectiveGenreFilter) {
        // Clean up the genre filter
        effectiveGenreFilter = effectiveGenreFilter.trim();
        logger.log(`Using cleaned genre filter: "${effectiveGenreFilter}"`);
      }

      // Check if using TMDB as data source and not requesting a specific addon
      if (dataSource === DataSource.TMDB && !addonId) {
        logger.log('Using TMDB data source for CatalogScreen');
        try {
          const catalogs = await catalogService.getCatalogByType(type, effectiveGenreFilter);
          if (catalogs && catalogs.length > 0) {
            // Flatten all items from all catalogs
            const allItems: StreamingContent[] = [];
            catalogs.forEach(catalog => {
              if (catalog.metas && Array.isArray(catalog.metas)) {
                allItems.push(...catalog.metas);
              }
            });

            const metaItems = allItems.map(item => ({
              ...item,
              _dataSource: DataSource.TMDB
            }));

            setItems(metaItems);
            setHasMore(false);
            setError(null);
          } else {
            setItems([]);
            setError('No results found');
          }
        } catch (tmdbError) {
          logger.error('TMDB fetch failed:', tmdbError);
          setError('Failed to load catalog from TMDB');
          setItems([]);
        }
      } else {
        // Use Stremio addon
        logger.log('Using Stremio addon for CatalogScreen');
        const params = {
          type: type || '',
          id: id || '',
          ...(effectiveGenreFilter && { genre: effectiveGenreFilter }),
          ...selectedFilters
        };

        const response = await stremioService.getCatalogAsync(addonId || '', params);

        logger.log('[CatalogScreen] getCatalogAsync response:', {
          hasData: !!response?.metas,
          itemCount: response?.metas?.length || 0,
          caches: response?.caches,
        });

        if (response && response.metas) {
          setItems(response.metas);
          setHasMore(false);
        } else {
          setError('Failed to load catalog');
          setItems([]);
        }
      }
    } catch (err: any) {
      logger.error('Error loading items:', err);
      setError(err.message || 'Failed to load items');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [addonId, type, id, selectedFilters, dataSource, activeGenreFilter]);

  // Initial load
  useEffect(() => {
    loadItems(false, 1);
  }, [loadItems]);

  const onRefresh = useCallback(() => {
    loadItems(true, 1);
  }, [loadItems]);

  const onEndReached = useCallback(() => {
    if (!loading && !isFetchingMore && hasMore) {
      setIsFetchingMore(true);
      loadItems(false, page + 1);
    }
  }, [loading, isFetchingMore, hasMore, page, loadItems]);

  const handleFilterChange = useCallback((filterName: string, filterValue: string) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      if (filterValue) {
        newFilters[filterName] = filterValue;
      } else {
        delete newFilters[filterName];
      }
      return newFilters;
    });
    // Reset items when filter changes
    setPage(1);
    setItems([]);
    setLoading(true);
  }, []);

  const handleGenreFilterChange = useCallback((genreOption: string) => {
    logger.log('Genre filter changed to:', genreOption);
    setActiveGenreFilter(genreOption === 'All' ? undefined : genreOption);
    // Reset items when filter changes
    setPage(1);
    setItems([]);
    setLoading(true);
  }, []);

  const renderItemWithSkeleton = useCallback(({ item, index }: { item: Meta; index: number }) => {
    // Use actual data
    if (item.poster) {
      return (
        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            navigation.navigate('Detail', {
              meta: item,
              addonId: addonId || undefined,
            });
          }}
          activeOpacity={0.8}
        >
          <FastImage
            source={{ uri: item.poster, priority: FastImage.priority.normal }}
            style={styles.poster}
            onError={() => {
              logger.log(`[CatalogScreen] FastImage error loading poster for item: ${item.id}`);
            }}
          />
          {nowPlayingMovies.has(item.id) && (
            <View style={styles.badgeBlur}>
              <BlurView intensity={90}>
                <View style={styles.badgeContent}>
                  <MaterialIcons name="theaters" size={14} color={colors.primary} />
                  <Text style={[styles.badgeText, { marginLeft: 4 }]}>In Theaters</Text>
                </View>
              </BlurView>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Show skeleton for missing data
    return <PosterGridSkeleton key={`skeleton-${index}`} />;
  }, [styles, navigation, addonId, nowPlayingMovies, colors]);

  // Loading state
  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <UnifiedSpinner size="large" />
          <Text style={styles.loadingText}>Loading catalog...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.primary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => loadItems(true, 1)}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <MaterialIcons name="inbox" size={48} color={colors.primary} />
          <Text style={styles.emptyText}>No items found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerTitle}>
        <Text style={styles.headerTitle}>{displayName}</Text>
      </View>

      {catalogExtras && catalogExtras.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterScrollContent}
        >
          {catalogExtras.map(extra => (
            <View key={extra.name}>
              {extra.name === 'genre' && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      activeGenreFilter === undefined && styles.filterChipActive,
                    ]}
                    onPress={() => handleGenreFilterChange('All')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        activeGenreFilter === undefined && styles.filterChipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {extra.options?.map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterChip,
                        activeGenreFilter === option && styles.filterChipActive,
                      ]}
                      onPress={() => handleGenreFilterChange(option)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          activeGenreFilter === option && styles.filterChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <FlashList
        ref={flashListRef}
        data={items}
        renderItem={renderItemWithSkeleton}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={screenData.numColumns}
        estimatedItemSize={250}
        contentContainerStyle={{
          paddingHorizontal: screenData.containerPadding,
        }}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={[styles.centered, { marginBottom: SPACING.xl }]}>
              <UnifiedSpinner size="small" />
            </View>
          ) : null
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default CatalogScreen;