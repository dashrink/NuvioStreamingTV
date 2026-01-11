import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  useColorScheme,
  Dimensions,
  useWindowDimensions,
  ImageBackground,
  ScrollView,
  Platform,
  Image,
  Modal,
  Pressable,
  Alert,
  InteractionManager,
  AppState,
  TVFocusGuideView,
} from 'react-native';
import Focusable from '../components/common/Focusable';
import {
  isTV,
  TV_SPACING,
  TV_TYPOGRAPHY,
  TV_TOUCH_TARGETS,
  TV_CATALOG,
  getDeviceType,
} from '../utils/tvStyles';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StreamingContent, CatalogContent, catalogService } from '../services/catalogService';
import { stremioService } from '../services/stremioService';
import { Stream } from '../types/metadata';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FastImage from '@d11/react-native-fast-image';
import Animated, { FadeIn, Layout, useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useCatalogContext } from '../contexts/CatalogContext';
import { ThisWeekSection } from '../components/home/ThisWeekSection';
import ContinueWatchingSection from '../components/home/ContinueWatchingSection';
import * as Haptics from 'expo-haptics';
import { tmdbService } from '../services/tmdbService';
import { logger } from '../utils/logger';
import { storageService } from '../services/storageService';
import { getCatalogDisplayName, clearCustomNameCache } from '../utils/catalogNameUtils';
import { useHomeCatalogs } from '../hooks/useHomeCatalogs';
import { useFeaturedContent } from '../hooks/useFeaturedContent';
import { useSettings, settingsEmitter } from '../hooks/useSettings';
import FeaturedContent from '../components/home/FeaturedContent';
import HeroCarousel from '../components/home/HeroCarousel';
import AppleTVHero from '../components/home/AppleTVHero';
import CatalogSection from '../components/home/CatalogSection';
import { CatalogRowSkeleton } from '../components/loading';
import LoadingSpinner from '../components/common/LoadingSpinner';
import homeStyles, { sharedStyles } from '../styles/homeStyles';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../contexts/ThemeContext';
import { useLoading } from '../contexts/LoadingContext';
import * as ScreenOrientation from 'expo-screen-orientation';
import { mmkvStorage } from '../services/mmkvStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../contexts/ToastContext';
import FirstTimeWelcome from '../components/FirstTimeWelcome';
import { HeaderVisibility } from '../contexts/HeaderVisibility';
import { useTrailer } from '../contexts/TrailerContext';
import { useScrollToTop } from '../contexts/ScrollToTopContext';

// Constants
const CATALOG_SETTINGS_KEY = 'catalog_settings';

// In-memory cache for catalog settings to avoid repeated MMKV reads
let cachedCatalogSettings: Record<string, boolean> | null = null;
let catalogSettingsCacheTimestamp = 0;
const CATALOG_SETTINGS_CACHE_TTL = 30000; // 30 seconds

// Define interfaces for our data
interface Category {
  id: string;
  name: string;
}

interface ContinueWatchingRef {
  refresh: () => Promise<boolean>;
}

type HomeScreenListItem =
  | { type: 'featured'; key: string }
  | { type: 'thisWeek'; key: string }
  | { type: 'continueWatching'; key: string }
  | { type: 'catalog'; catalog: CatalogContent; key: string }
  | { type: 'placeholder'; key: string }
  | { type: 'welcome'; key: string }
  | { type: 'loadMore'; key: string };

// Sample categories (real app would get these from API)
const SAMPLE_CATEGORIES: Category[] = [
  { id: 'movie', name: 'Movies' },
  { id: 'series', name: 'Series' },
  { id: 'channel', name: 'Channels' },
];

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isDarkMode = useColorScheme() === 'dark';
  const { currentTheme } = useTheme();
  const { setHomeLoading } = useLoading();
  const continueWatchingRef = useRef<ContinueWatchingRef>(null);
  const { settings } = useSettings();
  const { lastUpdate } = useCatalogContext(); // Add catalog context to listen for addon changes
  const { showInfo } = useToast();
  const { setTrailerPlaying } = useTrailer();
  const [showHeroSection, setShowHeroSection] = useState(settings.showHeroSection);
  const [featuredContentSource, setFeaturedContentSource] = useState(settings.featuredContentSource);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasContinueWatching, setHasContinueWatching] = useState(false);

  // Shared value for scroll position (for parallax effects)
  const scrollY = useSharedValue(0);

  const [catalogs, setCatalogs] = useState<(CatalogContent | null)[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [loadedCatalogCount, setLoadedCatalogCount] = useState(0);
  const [hasAddons, setHasAddons] = useState<boolean | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const totalCatalogsRef = useRef(0);
  const [visibleCatalogCount, setVisibleCatalogCount] = useState(5); // Reduced for memory
  const insets = useSafeAreaInsets();
  const flashListRef = useRef<any>(null);

  // Scroll to top handler - use scrollToIndex and retry to handle re-renders
  const scrollToTop = useCallback(() => {
    // First attempt
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });

    // Retry after a short delay in case re-render interrupted the scroll
    setTimeout(() => {
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 150);

    // Final retry to ensure we're at the top
    setTimeout(() => {
      flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 400);
  }, []);

  useScrollToTop('Home', scrollToTop);

  // Stabilize insets to prevent iOS layout shifts
  const [stableInsetsTop, setStableInsetsTop] = useState(insets.top);
  useEffect(() => {
    // Only update insets after initial mount to prevent shifting
    const timer = setTimeout(() => {
      setStableInsetsTop(insets.top);
    }, 100);
    return () => clearTimeout(timer);
  }, [insets.top]);

  const {
    featuredContent,
    allFeaturedContent,
    loading: featuredLoading,
    isSaved,
    handleSaveToLibrary,
    isItemSaved,
    refreshFeatured
  } = useFeaturedContent();

  // Guard to prevent overlapping fetch calls
  const isFetchingRef = useRef(false);

  // Progressive catalog loading function with performance optimizations
  const loadCatalogsProgressively = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setCatalogsLoading(true);
    setCatalogs([]);
    setLoadedCatalogCount(0);

    try {
      // Check cache first
      let catalogSettings: Record<string, boolean> = {};
      const now = Date.now();

      if (cachedCatalogSettings && (now - catalogSettingsCacheTimestamp) < CATALOG_SETTINGS_CACHE_TTL) {
        catalogSettings = cachedCatalogSettings;
      } else {
        // Load from storage
        const catalogSettingsJson = await mmkvStorage.getItem(CATALOG_SETTINGS_KEY);
        catalogSettings = catalogSettingsJson ? JSON.parse(catalogSettingsJson) : {};

        // Update cache
        cachedCatalogSettings = catalogSettings;
        catalogSettingsCacheTimestamp = now;
      }

      const [addons, addonManifests] = await Promise.all([
        catalogService.getAllAddons(),
        stremioService.getInstalledAddonsAsync()
      ]);

      // Set hasAddons state based on whether we have any addons - ensure on main thread
      InteractionManager.runAfterInteractions(() => {
        setHasAddons(addons.length > 0);
      });

      // Create placeholder array with proper order and track indices
      let catalogIndex = 0;
      const catalogQueue: (() => Promise<void>)[] = [];

      // Launch all catalog loaders in parallel
      const launchAllCatalogs = () => {
        while (catalogQueue.length > 0) {
          const catalogLoader = catalogQueue.shift();
          if (catalogLoader) {
            catalogLoader();
          }
        }
      };

      for (const addon of addons) {
        if (addon.catalogs) {
          for (const catalog of addon.catalogs) {
            // Check if this catalog is enabled (default to true if no setting exists)
            const settingKey = `${addon.id}:${catalog.type}:${catalog.id}`;
            const isEnabled = catalogSettings[settingKey] ?? true;

            // Only load enabled catalogs
            if (isEnabled) {
              const currentIndex = catalogIndex;

              const catalogLoader = async () => {
                try {
                  const manifest = addonManifests.find((a: any) => a.id === addon.id);
                  if (!manifest) return;

                  const metas = await stremioService.getCatalog(manifest, catalog.type, catalog.id, 1);
                  if (metas && metas.length > 0) {
                    // Aggressively limit items per catalog on Android to reduce memory usage
                    const limit = Platform.OS === 'android' ? 18 : 30;
                    const limitedMetas = metas.slice(0, limit);

                    const items = limitedMetas.map((meta: any) => ({
                      id: meta.id,
                      type: meta.type,
                      name: meta.name,
                      poster: meta.poster,
                      posterShape: meta.posterShape,
                      // Remove banner and logo to reduce memory usage
                      imdbRating: meta.imdbRating,
                      year: meta.year,
                      genres: meta.genres,
                      description: meta.description,
                      runtime: meta.runtime,
                      released: meta.released,
                      directors: meta.director,
                      creators: meta.creator,
                      certification: meta.certification
                    }));

                    // Resolve custom display name; if custom exists, use as-is
                    const originalName = catalog.name || catalog.id;
                    let displayName = await getCatalogDisplayName(addon.id, catalog.type, catalog.id, originalName);
                    const isCustom = displayName !== originalName;

                    if (!isCustom) {
                      // De-duplicate repeated words (case-insensitive)
                      const words = displayName.split(' ').filter(Boolean);
                      const uniqueWords: string[] = [];
                      const seen = new Set<string>();
                      for (const w of words) {
                        const lw = w.toLowerCase();
                        if (!seen.has(lw)) { uniqueWords.push(w); seen.add(lw); }
                      }
                      displayName = uniqueWords.join(' ');

                      // Append content type if not present
                      const contentType = catalog.type === 'movie' ? 'Movies' : 'TV Shows';
                      if (!displayName.toLowerCase().includes(contentType.toLowerCase())) {
                        displayName = `${displayName} ${contentType}`;
                      }
                    }

                    const catalogContent = {
                      addon: addon.id,
                      type: catalog.type,
                      id: catalog.id,
                      name: displayName,
                      items
                    };

                    // Update the catalog at its specific position - ensure on main thread
                    InteractionManager.runAfterInteractions(() => {
                      setCatalogs(prevCatalogs => {
                        const newCatalogs = [...prevCatalogs];
                        newCatalogs[currentIndex] = catalogContent;
                        return newCatalogs;
                      });
                    });
                  }
                } catch (error) {
                  if (__DEV__) console.error(`[HomeScreen] Failed to load ${catalog.name} from ${addon.name}:`, error);
                } finally {
                  // Update loading count - ensure on main thread
                  InteractionManager.runAfterInteractions(() => {
                    setLoadedCatalogCount(prev => {
                      const next = prev + 1;
                      // Exit loading screen as soon as first catalog finishes
                      if (prev === 0) {
                        setCatalogsLoading(false);
                      }
                      // ** Crucial: If all catalogs processed, release the fetch guard **
                      if (next >= totalCatalogsRef.current) {
                        isFetchingRef.current = false;
                      }
                      return next;
                    });
                  });
                }
              };

              catalogQueue.push(catalogLoader);
              catalogIndex++;
            }
          }
        }
      }

      totalCatalogsRef.current = catalogIndex;

      // If no catalogs to load, release locks immediately
      if (catalogIndex === 0) {
        setCatalogsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Initialize catalogs array with proper length - ensure on main thread
      InteractionManager.runAfterInteractions(() => {
        setCatalogs(new Array(catalogIndex).fill(null));
      });

      // Start all catalog requests in parallel
      launchAllCatalogs();
    } catch (error) {
      if (__DEV__) console.error('[HomeScreen] Error in progressive catalog loading:', error);
      InteractionManager.runAfterInteractions(() => {
        setCatalogsLoading(false);
      });
      isFetchingRef.current = false;
    }
  }, []);

  // Only count feature section as loading if it's enabled in settings
  // For catalogs, we show them progressively, so loading should be false as soon as we have any content
  const isLoading = useMemo(() => {
    // Exit loading as soon as at least one catalog is ready, regardless of featured
    if (loadedCatalogCount > 0) return false;
    const heroLoading = showHeroSection ? featuredLoading : false;
    return heroLoading && (catalogsLoading && loadedCatalogCount === 0);
  }, [showHeroSection, featuredLoading, catalogsLoading, loadedCatalogCount]);

  // Update global loading state
  useEffect(() => {
    setHomeLoading(isLoading);
  }, [isLoading, setHomeLoading]);

  // React to settings changes (memoized to prevent unnecessary effects)
  const settingsShowHero = settings.showHeroSection;
  const settingsFeaturedSource = settings.featuredContentSource;
  useEffect(() => {
    setShowHeroSection(settingsShowHero);
    setFeaturedContentSource(settingsFeaturedSource);
  }, [settingsShowHero, settingsFeaturedSource]);

  // Load catalogs progressively on mount and when settings change
  useEffect(() => {
    loadCatalogsProgressively();
  }, [loadCatalogsProgressively]);

  // Listen for catalog changes (addon additions/removals) and reload catalogs
  useEffect(() => {
    // Skip initial mount (handled by the loadCatalogsProgressively effect)
    if (lastUpdate === 0) return;

    // Force reset the fetch guard to ensure refresh happens
    isFetchingRef.current = false;

    // Invalidate catalog settings cache so fresh settings are loaded
    cachedCatalogSettings = null;

    // Reload catalogs
    loadCatalogsProgressively();
  }, [lastUpdate, loadCatalogsProgressively]);

  // Refresh continue watching content when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Ensure we refresh continue watching on every focus for accurate state
      if (continueWatchingRef.current) {
        continueWatchingRef.current.refresh().then(hasContent => {
          setHasContinueWatching(hasContent);
        }).catch(err => {
          if (__DEV__) console.warn('[HomeScreen] Error refreshing continue watching:', err);
        });
      }
    }, [])
  );

  // Update featured content when featured source setting changes
  useEffect(() => {
    refreshFeatured();
  }, [featuredContentSource, refreshFeatured]);

  // Build the list of items to render
  const listData = useMemo(() => {
    const items: HomeScreenListItem[] = [];

    // Add welcome screen if needed
    if (showHeroSection && !hasAddons) {
      items.push({ type: 'welcome', key: 'welcome' });
      return items; // Only show welcome, nothing else
    }

    // Add featured content section if enabled
    if (showHeroSection) {
      items.push({ type: 'featured', key: 'featured' });
    }

    // Add this week section
    items.push({ type: 'thisWeek', key: 'thisWeek' });

    // Add continue watching section (always visible)
    items.push({ type: 'continueWatching', key: 'continueWatching' });

    // Add visible catalogs and loading placeholders
    for (let i = 0; i < visibleCatalogCount; i++) {
      if (i < catalogs.length && catalogs[i] !== null) {
        // Add the loaded catalog
        items.push({
          type: 'catalog',
          catalog: catalogs[i]!,
          key: `catalog-${catalogs[i]!.addon}-${catalogs[i]!.id}`
        });
      } else if (catalogsLoading && i < totalCatalogsRef.current) {
        // Add loading placeholder while loading
        items.push({
          type: 'placeholder',
          key: `catalog-loading-${i}`
        });
      }
    }

    // Add "Load More" button if there are more catalogs
    if (visibleCatalogCount < totalCatalogsRef.current) {
      items.push({ type: 'loadMore', key: 'loadMore' });
    }

    return items;
  }, [showHeroSection, hasAddons, catalogs, catalogsLoading, visibleCatalogCount]);

  const renderItem = useCallback(({ item }: { item: HomeScreenListItem }) => {
    if (item.type === 'featured') {
      return (
        <View style={styles.sectionContainer}>
          {showHeroSection === false ? null : isDarkMode ? (
            <FeaturedContent content={featuredContent} />
          ) : (
            <AppleTVHero content={featuredContent} />
          )}
        </View>
      );
    }

    if (item.type === 'thisWeek') {
      return (
        <View style={styles.sectionContainer}>
          <ThisWeekSection />
        </View>
      );
    }

    if (item.type === 'continueWatching') {
      return (
        <View style={styles.sectionContainer}>
          <ContinueWatchingSection ref={continueWatchingRef} onHasContent={setHasContinueWatching} />
        </View>
      );
    }

    if (item.type === 'catalog') {
      return (
        <View style={styles.sectionContainer}>
          <CatalogSection catalog={item.catalog} />
        </View>
      );
    }

    if (item.type === 'placeholder') {
      return (
        <View style={styles.sectionContainer}>
          <CatalogRowSkeleton />
        </View>
      );
    }

    if (item.type === 'welcome') {
      return <FirstTimeWelcome />;
    }

    if (item.type === 'loadMore') {
      return (
        <View style={styles.loadMoreContainer}>
          <TouchableOpacity onPress={() => setVisibleCatalogCount(prev => prev + 5)}>
            <Text style={styles.loadMoreText}>Load More Catalogs</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  }, [showHeroSection, isDarkMode, featuredContent, catalogsLoading]);

  const keyExtractor = useCallback((item: HomeScreenListItem) => item.key, []);

  // Handle scroll events for header visibility
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={currentTheme.background}
        />
        {isLoading && !hasAddons ? (
          <View style={styles.loaderContainer}>
            <LoadingSpinner size="large" text="Loading content..." />
          </View>
        ) : (
          <FlashList
            ref={flashListRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            estimatedItemSize={300}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            contentContainerStyle={{
              paddingBottom: 20,
              paddingHorizontal: 0,
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    marginHorizontal: 0,
  },
  catalogContainer: {
    marginBottom: 16,
  },
  loadingPlaceholder: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default HomeScreen;