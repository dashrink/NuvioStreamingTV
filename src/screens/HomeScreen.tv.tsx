/**
 * HomeScreen.tv.tsx
 *
 * TV-specific home screen with complete D-pad navigation support,
 * focus memory persistence, and inter-section navigation.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - All sections (hero, continue watching, this week, catalogs) navigable via D-pad
 * - Focus memory persists across screen navigation
 * - Hero and catalog sections connected with proper nextFocusUp/Down
 * - Search accessible via up navigation at top of screen
 * - Voice search triggered via remote voice button
 * - Integration with TVNavigationContext for global focus state
 *
 * @example
 * ```tsx
 * // This file is automatically loaded by Metro when APP_VARIANT=tv
 * // No explicit import needed - use HomeScreen and the correct variant loads
 * ```
 */

import FastImage from '@d11/react-native-fast-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
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
  findNodeHandle,
  DeviceEventEmitter,
} from 'react-native';
import Animated, {
  FadeIn,
  Layout,
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

import { useCatalogContext } from '../contexts/CatalogContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StreamingContent, CatalogContent, catalogService } from '../services/catalogService';
import { mmkvStorage } from '../services/mmkvStorage';
import { storageService } from '../services/storageService';
import { stremioService } from '../services/stremioService';
import { Stream } from '../types/metadata';
import {
  PanGestureHandler,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import { ThisWeekSection } from '../components/home/ThisWeekSection';
import ContinueWatchingSection from '../components/home/ContinueWatchingSection';
import { tmdbService } from '../services/tmdbService';
import { getCatalogDisplayName, clearCustomNameCache } from '../utils/catalogNameUtils';
import { logger } from '../utils/logger';
import { useHomeCatalogs } from '../hooks/useHomeCatalogs';
import { useFeaturedContent } from '../hooks/useFeaturedContent';
import { useSettings, settingsEmitter } from '../hooks/useSettings';
import FeaturedContent from '../components/home/FeaturedContent';
import HeroCarousel from '../components/home/HeroCarousel';
import AppleTVHero from '../components/home/AppleTVHero';
import CatalogSection from '../components/home/CatalogSection';
import { SkeletonFeatured } from '../components/home/SkeletonLoaders';
import LoadingSpinner from '../components/common/LoadingSpinner';
import homeStyles, { sharedStyles } from '../styles/homeStyles';
import { useTheme } from '../contexts/ThemeContext';

import type { Theme } from '../contexts/ThemeContext';

import { useLoading } from '../contexts/LoadingContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../contexts/ToastContext';
import FirstTimeWelcome from '../components/FirstTimeWelcome';
import { HeaderVisibility } from '../contexts/HeaderVisibility';
import { useTrailer } from '../contexts/TrailerContext';

// TV-specific imports
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';
import { useTVEventHandler, isMenuEvent } from '../hooks/useTVEventHandler';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import Focusable, { FocusableRef } from '../components/common/Focusable';

// =============================================================================
// Constants
// =============================================================================

const CATALOG_SETTINGS_KEY = 'catalog_settings';

// In-memory cache for catalog settings
let cachedCatalogSettings: Record<string, boolean> | null = null;
let catalogSettingsCacheTimestamp = 0;
const CATALOG_SETTINGS_CACHE_TTL = 30000; // 30 seconds

// =============================================================================
// Types & Interfaces
// =============================================================================

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
  | { type: 'catalog'; catalog: CatalogContent; key: string; sectionIndex: number }
  | { type: 'placeholder'; key: string }
  | { type: 'welcome'; key: string }
  | { type: 'loadMore'; key: string };

// =============================================================================
// Helper Components
// =============================================================================

const SkeletonCatalog = React.memo(() => {
  const { currentTheme } = useTheme();
  return (
    <View style={styles.catalogContainer}>
      <View style={styles.loadingPlaceholder}>
        <LoadingSpinner size="small" text="" />
      </View>
    </View>
  );
});

// =============================================================================
// Main Component
// =============================================================================

const HomeScreenTV = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isDarkMode = useColorScheme() === 'dark';
  const { currentTheme } = useTheme();
  const { setHomeLoading } = useLoading();
  const continueWatchingRef = useRef<ContinueWatchingRef>(null);
  const { settings } = useSettings();
  const { lastUpdate } = useCatalogContext();
  const { showInfo } = useToast();
  const { setTrailerPlaying } = useTrailer();
  const [showHeroSection, setShowHeroSection] = useState(settings.showHeroSection);
  const [featuredContentSource, setFeaturedContentSource] = useState(
    settings.featuredContentSource
  );
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasContinueWatching, setHasContinueWatching] = useState(false);

  // TV Navigation
  const tvNav = useTVNavigationOptional();
  const spatialNav = useSpatialNavigation('HomeScreen', {
    autoRestoreFocus: true,
    defaultFocusId: 'hero-section',
  });

  // Section refs for inter-section navigation
  const heroRef = useRef<FocusableRef>(null);
  const continueWatchingRef2 = useRef<any>(null);
  const thisWeekRef = useRef<any>(null);
  const catalogSectionRefs = useRef<Map<number, React.RefObject<any>>>(new Map());
  const searchButtonRef = useRef<FocusableRef>(null);
  const loadMoreButtonRef = useRef<FocusableRef>(null);

  // Track current focused section for better focus restoration
  const [currentFocusedSection, setCurrentFocusedSection] = useState<number>(-1);

  // Shared value for scroll position (for parallax effects)
  const scrollY = useSharedValue(0);

  const [catalogs, setCatalogs] = useState<(CatalogContent | null)[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [loadedCatalogCount, setLoadedCatalogCount] = useState(0);
  const [hasAddons, setHasAddons] = useState<boolean | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const totalCatalogsRef = useRef(0);
  const [visibleCatalogCount, setVisibleCatalogCount] = useState(5);
  const insets = useSafeAreaInsets();

  // Stabilize insets to prevent iOS layout shifts
  const [stableInsetsTop, setStableInsetsTop] = useState(insets.top);
  useEffect(() => {
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
    refreshFeatured,
  } = useFeaturedContent();

  // Guard to prevent overlapping fetch calls
  const isFetchingRef = useRef(false);

  // =============================================================================
  // TV Event Handler for Voice Search
  // =============================================================================

  useTVEventHandler(
    useCallback(
      event => {
        // Handle playPause button to open voice search
        if (event.eventType === 'playPause' && tvNav) {
          tvNav.openVoiceSearch();
        }
      },
      [tvNav]
    ),
    { enabled: Platform.isTV }
  );

  // =============================================================================
  // Section Ref Management for Inter-Row Navigation
  // =============================================================================

  /**
   * Get or create a ref for a catalog section at a given index
   */
  const getCatalogSectionRef = useCallback((index: number) => {
    if (!catalogSectionRefs.current.has(index)) {
      catalogSectionRefs.current.set(index, React.createRef());
    }
    return catalogSectionRefs.current.get(index)!;
  }, []);

  /**
   * Get the next focus up handle for a section
   */
  const getSectionNextFocusUp = useCallback((sectionIndex: number): number | undefined => {
    if (sectionIndex === 0) {
      // First catalog section, go to hero
      if (heroRef.current) {
        return findNodeHandle(heroRef.current) ?? undefined;
      }
    } else {
      // Go to previous catalog section
      const prevRef = catalogSectionRefs.current.get(sectionIndex - 1);
      if (prevRef?.current) {
        return findNodeHandle(prevRef.current) ?? undefined;
      }
    }
    return undefined;
  }, []);

  /**
   * Get the next focus down handle for a section
   */
  const getSectionNextFocusDown = useCallback(
    (sectionIndex: number, totalSections: number): number | undefined => {
      if (sectionIndex >= totalSections - 1) {
        // Last section, go to load more button if available
        if (loadMoreButtonRef.current) {
          return findNodeHandle(loadMoreButtonRef.current) ?? undefined;
        }
        return undefined;
      } else {
        // Go to next catalog section
        const nextRef = catalogSectionRefs.current.get(sectionIndex + 1);
        if (nextRef?.current) {
          return findNodeHandle(nextRef.current) ?? undefined;
        }
      }
      return undefined;
    },
    []
  );

  // =============================================================================
  // Focus Memory & Section Focus Tracking
  // =============================================================================

  /**
   * Handle section focus for focus memory
   */
  const handleSectionFocus = useCallback(
    (sectionIndex: number, focusId: string) => {
      setCurrentFocusedSection(sectionIndex);
      spatialNav.saveFocus(focusId);
    },
    [spatialNav]
  );

  // =============================================================================
  // Catalog Loading
  // =============================================================================

  const loadCatalogsProgressively = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setCatalogsLoading(true);
    setCatalogs([]);
    setLoadedCatalogCount(0);

    try {
      let catalogSettings: Record<string, boolean> = {};
      const now = Date.now();

      if (
        cachedCatalogSettings &&
        now - catalogSettingsCacheTimestamp < CATALOG_SETTINGS_CACHE_TTL
      ) {
        catalogSettings = cachedCatalogSettings;
      } else {
        const catalogSettingsJson = await mmkvStorage.getItem(CATALOG_SETTINGS_KEY);
        catalogSettings = catalogSettingsJson ? JSON.parse(catalogSettingsJson) : {};
        cachedCatalogSettings = catalogSettings;
        catalogSettingsCacheTimestamp = now;
      }

      const [addons, addonManifests] = await Promise.all([
        catalogService.getAllAddons(),
        stremioService.getInstalledAddonsAsync(),
      ]);

      InteractionManager.runAfterInteractions(() => {
        setHasAddons(addons.length > 0);
      });

      let catalogIndex = 0;
      const catalogQueue: (() => Promise<void>)[] = [];

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
            const settingKey = `${addon.id}:${catalog.type}:${catalog.id}`;
            const isEnabled = catalogSettings[settingKey] ?? true;

            if (isEnabled) {
              const currentIndex = catalogIndex;

              const catalogLoader = async () => {
                try {
                  const manifest = addonManifests.find((a: any) => a.id === addon.id);
                  if (!manifest) return;

                  const metas = await stremioService.getCatalog(
                    manifest,
                    catalog.type,
                    catalog.id,
                    1
                  );
                  if (metas && metas.length > 0) {
                    // More items on TV for larger screens
                    const limit = Platform.isTV ? 30 : Platform.OS === 'android' ? 18 : 30;
                    const limitedMetas = metas.slice(0, limit);

                    const items = limitedMetas.map((meta: any) => ({
                      id: meta.id,
                      type: meta.type,
                      name: meta.name,
                      poster: meta.poster,
                      posterShape: meta.posterShape,
                      imdbRating: meta.imdbRating,
                      year: meta.year,
                      genres: meta.genres,
                      description: meta.description,
                      runtime: meta.runtime,
                      released: meta.released,
                      directors: meta.director,
                      creators: meta.creator,
                      certification: meta.certification,
                    }));

                    const originalName = catalog.name || catalog.id;
                    let displayName = await getCatalogDisplayName(
                      addon.id,
                      catalog.type,
                      catalog.id,
                      originalName
                    );
                    const isCustom = displayName !== originalName;

                    if (!isCustom) {
                      const words = displayName.split(' ').filter(Boolean);
                      const uniqueWords: string[] = [];
                      const seen = new Set<string>();
                      for (const w of words) {
                        const lw = w.toLowerCase();
                        if (!seen.has(lw)) {
                          uniqueWords.push(w);
                          seen.add(lw);
                        }
                      }
                      displayName = uniqueWords.join(' ');

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
                      items,
                    };

                    InteractionManager.runAfterInteractions(() => {
                      setCatalogs(prevCatalogs => {
                        const newCatalogs = [...prevCatalogs];
                        newCatalogs[currentIndex] = catalogContent;
                        return newCatalogs;
                      });
                    });
                  }
                } catch (error) {
                  if (__DEV__)
                    console.error(
                      `[HomeScreen.tv] Failed to load ${catalog.name} from ${addon.name}:`,
                      error
                    );
                } finally {
                  InteractionManager.runAfterInteractions(() => {
                    setLoadedCatalogCount(prev => {
                      const next = prev + 1;
                      if (prev === 0) {
                        setCatalogsLoading(false);
                      }
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

      if (catalogIndex === 0) {
        setCatalogsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      InteractionManager.runAfterInteractions(() => {
        setCatalogs(new Array(catalogIndex).fill(null));
      });

      launchAllCatalogs();
    } catch (error) {
      if (__DEV__) console.error('[HomeScreen.tv] Error in progressive catalog loading:', error);
      InteractionManager.runAfterInteractions(() => {
        setCatalogsLoading(false);
      });
      isFetchingRef.current = false;
    }
  }, []);

  // =============================================================================
  // Loading State
  // =============================================================================

  const isLoading = useMemo(() => {
    if (loadedCatalogCount > 0) return false;
    const heroLoading = showHeroSection ? featuredLoading : false;
    return heroLoading && catalogsLoading && loadedCatalogCount === 0;
  }, [showHeroSection, featuredLoading, catalogsLoading, loadedCatalogCount]);

  useEffect(() => {
    setHomeLoading(isLoading);
  }, [isLoading, setHomeLoading]);

  // React to settings changes
  const settingsShowHero = settings.showHeroSection;
  const settingsFeaturedSource = settings.featuredContentSource;
  useEffect(() => {
    setShowHeroSection(settingsShowHero);
    setFeaturedContentSource(settingsFeaturedSource);
  }, [settingsShowHero, settingsFeaturedSource]);

  // Load catalogs on mount
  useEffect(() => {
    loadCatalogsProgressively();
  }, [loadCatalogsProgressively]);

  // Listen for catalog changes (addon additions/removals)
  useEffect(() => {
    if (lastUpdate === 0) return;
    isFetchingRef.current = false;
    cachedCatalogSettings = null;
    catalogSettingsCacheTimestamp = 0;
    const timer = setTimeout(() => {
      loadCatalogsProgressively();
    }, 100);
    return () => clearTimeout(timer);
  }, [lastUpdate, loadCatalogsProgressively]);

  // One-time hint after skipping login in onboarding
  useEffect(() => {
    let hideTimer: any;
    (async () => {
      try {
        const flag = await mmkvStorage.getItem('showLoginHintToastOnce');
        if (flag === 'true') {
          setHintVisible(true);
          await mmkvStorage.removeItem('showLoginHintToastOnce');
          hideTimer = setTimeout(() => setHintVisible(false), 2000);
        }
      } catch {}
    })();
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const refreshCatalogs = useCallback(() => {
    return loadCatalogsProgressively();
  }, [loadCatalogsProgressively]);

  // Subscribe to settings emitter
  useEffect(() => {
    const handleSettingsChange = () => {
      setShowHeroSection(settings.showHeroSection);
      setFeaturedContentSource(settings.featuredContentSource);
    };
    const unsubscribe = settingsEmitter.addListener(handleSettingsChange);
    return unsubscribe;
  }, [settings.showHeroSection, settings.featuredContentSource]);

  // =============================================================================
  // Screen Focus Effect
  // =============================================================================

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');

      if (Platform.OS === 'ios') {
        StatusBar.setHidden(false);
      }

      ScreenOrientation.unlockAsync().catch(() => {});

      return () => {
        setTrailerPlaying(false);
        logger.info('[HomeScreen.tv] Screen blur - stopping trailer');
      };
    }, [setTrailerPlaying])
  );

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background') {
        try {
          FastImage.clearMemoryCache();
          if (__DEV__) console.log('[HomeScreen.tv] Cleared memory cache on background');
        } catch (error) {
          if (__DEV__) console.warn('[HomeScreen.tv] Failed to clear memory cache:', error);
        }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor(currentTheme.colors.darkBackground);
      }

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [currentTheme.colors.darkBackground]);

  // =============================================================================
  // Navigation & Actions
  // =============================================================================

  const handleContentPress = useCallback(
    (id: string, type: string) => {
      // Save current focus before navigation
      spatialNav.saveFocus(`content-item-${id}`);
      navigation.navigate('Metadata', { id, type });
    },
    [navigation, spatialNav]
  );

  const handlePlayStream = useCallback(
    async (stream: Stream) => {
      if (!featuredContent) return;

      try {
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (orientationError) {
          logger.warn('[HomeScreen.tv] Orientation lock failed:', orientationError);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // @ts-ignore
        navigation.navigate(Platform.OS === 'ios' ? 'PlayerIOS' : 'PlayerAndroid', {
          uri: stream.url as any,
          title: featuredContent.name,
          year: featuredContent.year,
          quality: stream.title?.match(/(\d+)p/)?.[1] || undefined,
          streamProvider: stream.name,
          id: featuredContent.id,
          type: featuredContent.type,
        });
      } catch (error) {
        logger.error('[HomeScreen.tv] Error in handlePlayStream:', error);
        // @ts-ignore
        navigation.navigate(Platform.OS === 'ios' ? 'PlayerIOS' : 'PlayerAndroid', {
          uri: stream.url as any,
          title: featuredContent.name,
          year: featuredContent.year,
          quality: stream.title?.match(/(\d+)p/)?.[1] || undefined,
          streamProvider: stream.name,
          id: featuredContent.id,
          type: featuredContent.type,
        });
      }
    },
    [featuredContent, navigation]
  );

  const refreshContinueWatching = useCallback(async () => {
    if (continueWatchingRef.current) {
      try {
        const hasContent = await continueWatchingRef.current.refresh();
        setHasContinueWatching(hasContent);
      } catch (error) {
        if (__DEV__) console.error('[HomeScreen.tv] Error refreshing continue watching:', error);
        setHasContinueWatching(false);
      }
    }
  }, []);

  // Use refs to track state for event listeners
  const catalogsLengthRef = useRef(catalogs.length);
  const catalogsLoadingRef = useRef(catalogsLoading);

  useEffect(() => {
    catalogsLengthRef.current = catalogs.length;
  }, [catalogs.length]);

  useEffect(() => {
    catalogsLoadingRef.current = catalogsLoading;
  }, [catalogsLoading]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshContinueWatching();
      if (catalogsLengthRef.current === 0 && !catalogsLoadingRef.current) {
        loadCatalogsProgressively();
      }
    });
    return unsubscribe;
  }, [navigation, refreshContinueWatching, loadCatalogsProgressively]);

  // =============================================================================
  // List Data & Rendering
  // =============================================================================

  const { width: windowWidth } = useWindowDimensions();
  const isTablet = useMemo(() => windowWidth >= 768, [windowWidth]);

  // Build list data with section indices for focus navigation
  const listData = useMemo(() => {
    const data: HomeScreenListItem[] = [];

    if (hasAddons === false) {
      data.push({ type: 'welcome', key: 'welcome' });
      return data;
    }

    data.push({ type: 'thisWeek', key: 'thisWeek' });

    const catalogsToShow = catalogs.slice(0, visibleCatalogCount);
    let sectionIndex = 0;

    catalogsToShow.forEach((catalog, index) => {
      if (catalog) {
        data.push({
          type: 'catalog',
          catalog,
          key: `${catalog.addon}-${catalog.id}-${index}`,
          sectionIndex,
        });
        sectionIndex++;
      } else {
        data.push({ type: 'placeholder', key: `placeholder-${index}` });
      }
    });

    if (
      catalogs.length > visibleCatalogCount &&
      catalogs.filter(c => c).length > visibleCatalogCount
    ) {
      data.push({ type: 'loadMore', key: 'load-more' });
    }

    return data;
  }, [hasAddons, catalogs, visibleCatalogCount]);

  const handleLoadMoreCatalogs = useCallback(() => {
    setVisibleCatalogCount(prev => Math.min(prev + 3, catalogs.length));
  }, [catalogs.length]);

  const keyExtractor = useCallback((item: HomeScreenListItem) => item.key, []);

  // Count of catalog sections for navigation
  const catalogSectionCount = useMemo(() => {
    return listData.filter(item => item.type === 'catalog').length;
  }, [listData]);

  // =============================================================================
  // Memoized Components
  // =============================================================================

  const memoizedFeaturedContent = useMemo(() => {
    const heroStyleToUse = settings.heroStyle;
    const firstCatalogRef = catalogSectionRefs.current.get(0);

    // AppleTVHero is used on TV regardless of settings
    if (Platform.isTV) {
      return (
        <AppleTVHero
          featuredContent={featuredContent || null}
          allFeaturedContent={allFeaturedContent || []}
          loading={featuredLoading}
          scrollY={scrollY}
          hasTVPreferredFocus={true}
          onFocus={() => handleSectionFocus(-1, 'hero-section')}
          nextFocusDown={firstCatalogRef}
        />
      );
    }

    // Tablet/mobile variants
    if (heroStyleToUse === 'appletv' && !isTablet) {
      return (
        <AppleTVHero
          featuredContent={featuredContent || null}
          allFeaturedContent={allFeaturedContent || []}
          loading={featuredLoading}
          scrollY={scrollY}
        />
      );
    } else if (heroStyleToUse === 'carousel') {
      return (
        <HeroCarousel
          items={allFeaturedContent || (featuredContent ? [featuredContent] : [])}
          loading={featuredLoading}
        />
      );
    } else {
      return (
        <>
          <FeaturedContent
            featuredContent={featuredContent || null}
            isSaved={isSaved}
            handleSaveToLibrary={handleSaveToLibrary}
            loading={featuredLoading}
          />
          <LinearGradient
            colors={['transparent', currentTheme.colors.darkBackground]}
            locations={[0, 1]}
            style={{
              height: isTablet ? 40 : 30,
              width: '100%',
              marginTop: -(isTablet ? 40 : 30),
              position: 'relative',
              zIndex: -1,
            }}
            pointerEvents="none"
          />
        </>
      );
    }
  }, [
    settings.heroStyle,
    isTablet,
    allFeaturedContent,
    featuredContent,
    isSaved,
    handleSaveToLibrary,
    featuredLoading,
    scrollY,
    handleSectionFocus,
    currentTheme.colors.darkBackground,
  ]);

  const memoizedThisWeekSection = useMemo(() => <ThisWeekSection />, []);
  const memoizedContinueWatchingSection = useMemo(
    () => <ContinueWatchingSection ref={continueWatchingRef} />,
    []
  );

  const memoizedHeader = useMemo(
    () => (
      <>
        {showHeroSection ? memoizedFeaturedContent : null}
        {memoizedContinueWatchingSection}
      </>
    ),
    [showHeroSection, memoizedFeaturedContent, memoizedContinueWatchingSection]
  );

  // =============================================================================
  // Scroll & Header Visibility
  // =============================================================================

  const lastScrollYRef = useRef(0);
  const lastToggleRef = useRef(0);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const isScrollingRef = useRef(false);

  const toggleHeader = useCallback((hide: boolean) => {
    const now = Date.now();
    if (now - lastToggleRef.current < 120) return;
    lastToggleRef.current = now;
    HeaderVisibility.setHidden(hide);
  }, []);

  // =============================================================================
  // Render List Item
  // =============================================================================

  const renderListItem = useCallback(
    ({ item }: { item: HomeScreenListItem; index: number }) => {
      switch (item.type) {
        case 'thisWeek':
          return memoizedThisWeekSection;
        case 'continueWatching':
          return null; // Moved to ListHeaderComponent
        case 'catalog':
          const sectionRef = getCatalogSectionRef(item.sectionIndex);
          return (
            <CatalogSection
              catalog={item.catalog}
              sectionIndex={item.sectionIndex}
              totalSections={catalogSectionCount}
              sectionId={`catalog-${item.catalog.addon}-${item.catalog.id}`}
              hasTVPreferredFocus={false}
              onFocusSection={idx =>
                handleSectionFocus(idx, `catalog-${item.catalog.addon}-${item.catalog.id}`)
              }
              nextFocusUp={getSectionNextFocusUp(item.sectionIndex)}
              nextFocusDown={getSectionNextFocusDown(item.sectionIndex, catalogSectionCount)}
            />
          );
        case 'placeholder':
          return (
            <Animated.View>
              <View style={styles.catalogPlaceholder}>
                <View style={styles.placeholderHeader}>
                  <View
                    style={[
                      styles.placeholderTitle,
                      { backgroundColor: currentTheme.colors.elevation1 },
                    ]}
                  />
                  <LoadingSpinner size="small" text="" />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.placeholderPosters}
                >
                  {[...Array(3)].map((_, posterIndex) => (
                    <View
                      key={posterIndex}
                      style={[
                        styles.placeholderPoster,
                        { backgroundColor: currentTheme.colors.elevation1 },
                      ]}
                    />
                  ))}
                </ScrollView>
              </View>
            </Animated.View>
          );
        case 'loadMore':
          return (
            <View>
              <View style={styles.loadMoreContainer}>
                <Focusable
                  ref={loadMoreButtonRef}
                  onPress={handleLoadMoreCatalogs}
                  style={[styles.loadMoreButton, { backgroundColor: currentTheme.colors.primary }]}
                  focusId="load-more-button"
                  animationConfig={{
                    focusScale: 1.05,
                    unfocusedOpacity: 0.9,
                    showFocusBorder: true,
                    focusBorderColor: currentTheme.colors.primary,
                    focusBorderWidth: 3,
                  }}
                  accessibilityLabel="Load more catalogs"
                  accessibilityHint="Press to load additional content catalogs"
                >
                  <MaterialIcons name="expand-more" size={24} color={currentTheme.colors.white} />
                  <Text style={[styles.loadMoreText, { color: currentTheme.colors.white }]}>
                    Load More Catalogs
                  </Text>
                </Focusable>
              </View>
            </View>
          );
        case 'welcome':
          return <FirstTimeWelcome />;
        default:
          return null;
      }
    },
    [
      memoizedThisWeekSection,
      currentTheme.colors,
      handleLoadMoreCatalogs,
      getCatalogSectionRef,
      catalogSectionCount,
      handleSectionFocus,
      getSectionNextFocusUp,
      getSectionNextFocusDown,
    ]
  );

  // =============================================================================
  // Loading Screen
  // =============================================================================

  const renderLoadingScreen = useMemo(() => {
    if (isLoading) {
      return (
        <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <View style={styles.loadingMainContainer}>
            <LoadingSpinner size="large" offsetY={-20} />
          </View>
        </View>
      );
    }
    return null;
  }, [isLoading, currentTheme.colors]);

  // =============================================================================
  // Footer
  // =============================================================================

  const ListFooterComponent = useMemo(
    () => (
      <>
        {catalogsLoading &&
          loadedCatalogCount > 0 &&
          loadedCatalogCount < totalCatalogsRef.current &&
          null}
        {!catalogsLoading && catalogs.filter(c => c).length === 0 && (
          <View style={[styles.emptyCatalog, { backgroundColor: currentTheme.colors.elevation1 }]}>
            <MaterialIcons name="movie-filter" size={48} color={currentTheme.colors.textDark} />
            <Text
              style={{
                color: currentTheme.colors.textDark,
                marginTop: 8,
                fontSize: 18,
                textAlign: 'center',
              }}
            >
              No content available
            </Text>
            <Focusable
              onPress={() => navigation.navigate('Settings')}
              style={[styles.addCatalogButton, { backgroundColor: currentTheme.colors.primary }]}
              focusId="add-catalogs-button"
              animationConfig={{
                focusScale: 1.05,
                showFocusBorder: true,
                focusBorderColor: currentTheme.colors.primary,
              }}
              accessibilityLabel="Add catalogs"
              accessibilityHint="Opens settings to add content catalogs"
            >
              <MaterialIcons name="add-circle" size={24} color={currentTheme.colors.white} />
              <Text style={[styles.addCatalogButtonText, { color: currentTheme.colors.white }]}>
                Add Catalogs
              </Text>
            </Focusable>
          </View>
        )}
      </>
    ),
    [catalogsLoading, catalogs, loadedCatalogCount, navigation, currentTheme.colors]
  );

  // =============================================================================
  // Scroll Handler
  // =============================================================================

  const handleScroll = useCallback(
    (event: any) => {
      event.persist();

      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }

      const scrollYValue = event.nativeEvent.contentOffset.y;
      scrollY.value = scrollYValue;

      scrollAnimationFrameRef.current = requestAnimationFrame(() => {
        const y = scrollYValue;
        const dy = y - lastScrollYRef.current;
        lastScrollYRef.current = y;

        isScrollingRef.current = Math.abs(dy) > 0;

        if (y <= 10) {
          toggleHeader(false);
          return;
        }

        if (dy > 6) {
          toggleHeader(true);
        } else if (dy < -6) {
          toggleHeader(false);
        }

        scrollAnimationFrameRef.current = null;
      });
    },
    [toggleHeader, scrollY]
  );

  // =============================================================================
  // Content Container Style
  // =============================================================================

  const contentContainerStyle = useMemo(() => {
    const heroStyleToUse = settings.heroStyle;
    const isUsingAppleTVHero =
      Platform.isTV || (heroStyleToUse === 'appletv' && !isTablet && showHeroSection);

    return StyleSheet.flatten([
      styles.scrollContent,
      { paddingTop: isUsingAppleTVHero ? 0 : stableInsetsTop },
    ]);
  }, [stableInsetsTop, settings.heroStyle, isTablet, showHeroSection]);

  // =============================================================================
  // Main Content
  // =============================================================================

  const renderMainContent = useMemo(() => {
    if (isLoading) return null;

    return (
      <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <FlashList
          data={listData}
          renderItem={renderListItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          nestedScrollEnabled={true}
          ListHeaderComponent={memoizedHeader}
          ListFooterComponent={ListFooterComponent}
          onEndReached={handleLoadMoreCatalogs}
          onEndReachedThreshold={0.6}
          onScroll={handleScroll}
          // TV-specific optimizations
          estimatedItemSize={300}
          drawDistance={Platform.isTV ? 500 : 250}
        />
      </View>
    );
  }, [
    isLoading,
    currentTheme.colors.darkBackground,
    listData,
    renderListItem,
    keyExtractor,
    contentContainerStyle,
    memoizedHeader,
    ListFooterComponent,
    handleLoadMoreCatalogs,
    handleScroll,
  ]);

  return isLoading ? renderLoadingScreen : renderMainContent;
};

// =============================================================================
// Styles
// =============================================================================

const { width, height } = Dimensions.get('window');

const calculatePosterLayout = (screenWidth: number) => {
  const MIN_POSTER_WIDTH = Platform.isTV ? 160 : 100;
  const MAX_POSTER_WIDTH = Platform.isTV ? 200 : 130;
  const LEFT_PADDING = Platform.isTV ? 32 : 16;
  const SPACING = Platform.isTV ? 12 : 8;

  const availableWidth = screenWidth - LEFT_PADDING;
  let bestLayout = {
    numFullPosters: Platform.isTV ? 4 : 3,
    posterWidth: Platform.isTV ? 180 : 120,
  };

  for (let n = 3; n <= 6; n++) {
    const usableWidth = availableWidth - 8;
    const posterWidth = (usableWidth - (n - 1) * SPACING) / (n + 0.25);

    if (posterWidth >= MIN_POSTER_WIDTH && posterWidth <= MAX_POSTER_WIDTH) {
      bestLayout = { numFullPosters: n, posterWidth };
    }
  }

  return {
    numFullPosters: bestLayout.numFullPosters,
    posterWidth: bestLayout.posterWidth,
    spacing: SPACING,
    partialPosterWidth: bestLayout.posterWidth * 0.25,
  };
};

const posterLayout = calculatePosterLayout(width);
const POSTER_WIDTH = posterLayout.posterWidth;

const styles = StyleSheet.create<any>({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.isTV ? 120 : 90,
  },
  loadingMainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: Platform.isTV ? 18 : 14,
  },
  catalogContainer: {
    marginBottom: Platform.isTV ? 32 : 24,
    paddingTop: 0,
    marginTop: Platform.isTV ? 20 : 16,
  },
  catalogPlaceholder: {
    marginBottom: Platform.isTV ? 32 : 24,
    paddingHorizontal: Platform.isTV ? 32 : 16,
  },
  placeholderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.isTV ? 16 : 12,
  },
  placeholderTitle: {
    width: Platform.isTV ? 200 : 150,
    height: Platform.isTV ? 28 : 20,
    borderRadius: 4,
  },
  placeholderPosters: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: Platform.isTV ? 12 : 8,
  },
  placeholderPoster: {
    width: POSTER_WIDTH,
    aspectRatio: 2 / 3,
    borderRadius: Platform.isTV ? 16 : 12,
    marginRight: 2,
  },
  emptyCatalog: {
    padding: Platform.isTV ? 48 : 32,
    alignItems: 'center',
    margin: Platform.isTV ? 32 : 16,
    borderRadius: Platform.isTV ? 20 : 16,
  },
  addCatalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.isTV ? 24 : 16,
    paddingVertical: Platform.isTV ? 14 : 10,
    borderRadius: 30,
    marginTop: Platform.isTV ? 24 : 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addCatalogButtonText: {
    fontSize: Platform.isTV ? 18 : 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadMoreContainer: {
    padding: Platform.isTV ? 24 : 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.isTV ? 32 : 20,
    paddingVertical: Platform.isTV ? 16 : 12,
    borderRadius: Platform.isTV ? 30 : 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadMoreText: {
    marginLeft: Platform.isTV ? 12 : 8,
    fontSize: Platform.isTV ? 18 : 14,
    fontWeight: '600',
  },
  loadingPlaceholder: {
    height: Platform.isTV ? 250 : 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: Platform.isTV ? 32 : 16,
  },
});

// =============================================================================
// Exports
// =============================================================================

const HomeScreenWithFocusSync = (props: any) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      DeviceEventEmitter.emit('watchedStatusChanged');
    });
    return () => unsubscribe();
  }, [navigation]);
  return <HomeScreenTV {...props} />;
};

export default React.memo(HomeScreenWithFocusSync);
