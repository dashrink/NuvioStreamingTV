/**
 * LibraryScreen.tv.tsx
 *
 * TV-specific library/favorites screen with complete D-pad navigation support,
 * navigable filter tabs, and focus memory per tab.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - Library tabs (Trakt, Movies, TV Shows) navigable via D-pad
 * - Grid of items navigable via D-pad with focus states
 * - Long-press (300ms+) triggers TV context menu
 * - Focus memory persists per tab across screen navigation
 * - Trakt folder navigation with D-pad support
 * - Integration with TVNavigationContext for global focus state
 *
 * @example
 * ```tsx
 * // This file is automatically loaded by Metro when APP_VARIANT=tv
 * // No explicit import needed - use LibraryScreen and the correct variant loads
 * ```
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DeviceEventEmitter, Share } from 'react-native';
import { mmkvStorage } from '../services/mmkvStorage';
import { useToast } from '../contexts/ToastContext';
import DropUpMenu from '../components/home/DropUpMenu';
import ScreenHeader from '../components/common/ScreenHeader';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  StatusBar,
  Animated as RNAnimated,
  ActivityIndicator,
  Platform,
  ScrollView,
  BackHandler,
  FlatList,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import FastImage from '@d11/react-native-fast-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { catalogService } from '../services/catalogService';
import type { StreamingContent } from '../services/catalogService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { logger } from '../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useTraktContext } from '../contexts/TraktContext';
import TraktIcon from '../../assets/rating-icons/trakt.svg';
import { traktService, TraktService, TraktImages } from '../services/traktService';
import { TraktLoadingSpinner } from '../components/common/TraktLoadingSpinner';
import { useSettings } from '../hooks/useSettings';

// TV-specific imports
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';
import { useTVEventHandler } from '../hooks/useTVEventHandler';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import Focusable, { FocusableRef } from '../components/common/Focusable';
import { useContextMenu } from '../hooks/useContextMenu';
import TVContextMenu from '../components/tv/TVContextMenu';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface LibraryItem extends StreamingContent {
  progress?: number;
  lastWatched?: string;
  gradient: [string, string];
  imdbId?: string;
  traktId: number;
  images?: TraktImages;
  watched?: boolean;
}

interface TraktDisplayItem {
  id: string;
  name: string;
  type: 'movie' | 'series';
  poster: string;
  year?: number;
  lastWatched?: string;
  plays?: number;
  rating?: number;
  imdbId?: string;
  traktId: number;
  images?: TraktImages;
}

interface TraktFolder {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  itemCount: number;
}

// =============================================================================
// Constants
// =============================================================================

const { width, height } = require('react-native').Dimensions.get('window');

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
const isTV = deviceType === 'tv' || Platform.isTV;

// TV-optimized sizes
const HORIZONTAL_ITEM_WIDTH = isTV ? width * 0.12 : width * 0.22;
const HORIZONTAL_POSTER_HEIGHT = HORIZONTAL_ITEM_WIDTH * 1.5;

function getGridLayout(screenWidth: number): { numColumns: number; itemWidth: number } {
  const horizontalPadding = isTV ? 32 : 16;
  const gutter = isTV ? 16 : 12;
  let numColumns = 3;
  if (screenWidth >= 1440) numColumns = 6;
  else if (screenWidth >= 1200) numColumns = 5;
  else if (screenWidth >= 1000) numColumns = 4;
  else if (screenWidth >= 700) numColumns = 3;
  else numColumns = 3;
  const available = screenWidth - horizontalPadding - (numColumns - 1) * gutter;
  const itemWidth = Math.floor(available / numColumns);
  return { numColumns, itemWidth };
}

// =============================================================================
// TV Library Item Component
// =============================================================================

interface TVLibraryItemProps {
  item: LibraryItem;
  width: number;
  navigation: any;
  currentTheme: any;
  showTitles: boolean;
  focusId: string;
  onFocus: (focusId: string) => void;
  hasTVPreferredFocus?: boolean;
  inLibrary?: boolean;
}

const TVLibraryItem: React.FC<TVLibraryItemProps> = React.memo(({
  item,
  width: itemWidth,
  navigation,
  currentTheme,
  showTitles,
  focusId,
  onFocus,
  hasTVPreferredFocus = false,
  inLibrary = true,
}) => {
  const [watched, setWatched] = useState(item.watched || false);
  const { openContextMenu, isAvailable: isContextMenuAvailable } = useContextMenu();
  const { showInfo, showError, showSuccess } = useToast();

  // Watch for watched status changes
  useEffect(() => {
    const updateWatched = () => {
      mmkvStorage.getItem(`watched:${item.type}:${item.id}`).then(val => setWatched(val === 'true'));
    };
    updateWatched();
    const sub = DeviceEventEmitter.addListener('watchedStatusChanged', updateWatched);
    return () => sub.remove();
  }, [item.id, item.type]);

  const handlePress = useCallback(() => {
    navigation.navigate('Metadata', { id: item.id, type: item.type });
  }, [navigation, item.id, item.type]);

  const handleLongPress = useCallback(() => {
    if (isContextMenuAvailable) {
      openContextMenu({
        targetId: focusId,
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
          showSuccess('Added to Library', 'Added to your library');
        },
        onRemoveFromList: async () => {
          await catalogService.removeFromLibrary(item.type, item.id);
          showInfo('Removed from Library', 'Removed from your library');
        },
        onMarkWatched: async () => {
          await mmkvStorage.setItem(`watched:${item.type}:${item.id}`, 'true');
          setWatched(true);
          showInfo('Marked as Watched', 'Item marked as watched');
          DeviceEventEmitter.emit('watchedStatusChanged');
        },
        onMarkUnwatched: async () => {
          await mmkvStorage.setItem(`watched:${item.type}:${item.id}`, 'false');
          setWatched(false);
          showInfo('Marked as Unwatched', 'Item marked as unwatched');
          DeviceEventEmitter.emit('watchedStatusChanged');
        },
        onShare: () => {
          const url = item.id ? `https://www.imdb.com/title/${item.id}/` : '';
          const message = `${item.name}\n${url}`;
          Share.share({ message, url, title: item.name });
        },
        onGetInfo: () => {
          navigation.navigate('Metadata', { id: item.id, type: item.type });
        },
      });
    }
  }, [
    isContextMenuAvailable,
    openContextMenu,
    focusId,
    item,
    inLibrary,
    watched,
    navigation,
    showInfo,
    showSuccess,
  ]);

  const handleFocus = useCallback(() => {
    onFocus(focusId);
  }, [onFocus, focusId]);

  return (
    <Focusable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onFocus={handleFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[styles.itemContainer, { width: itemWidth }]}
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
      accessibilityLabel={`${item.name}${item.year ? `, ${item.year}` : ''}`}
      accessibilityHint="Press to view details, hold for more options"
    >
      <View style={[styles.posterContainer, { shadowColor: currentTheme.colors.black }]}>
        <FastImage
          source={{ uri: item.poster || 'https://via.placeholder.com/300x450' }}
          style={styles.poster}
          resizeMode={FastImage.resizeMode.cover}
        />
        {watched && (
          <View style={styles.watchedIndicator}>
            <MaterialIcons name="check-circle" size={22} color={currentTheme.colors.success || '#4CAF50'} />
          </View>
        )}
        {item.progress !== undefined && item.progress < 1 && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${item.progress * 100}%`, backgroundColor: currentTheme.colors.primary }
              ]}
            />
          </View>
        )}
      </View>
      {showTitles && (
        <Text style={[styles.cardTitle, { color: currentTheme.colors.mediumEmphasis, fontSize: isTV ? 16 : 13 }]}>
          {item.name}
        </Text>
      )}
    </Focusable>
  );
});

// =============================================================================
// TV Trakt Item Component
// =============================================================================

interface TVTraktItemProps {
  item: TraktDisplayItem;
  width: number;
  navigation: any;
  currentTheme: any;
  showTitles: boolean;
  focusId: string;
  onFocus: (focusId: string) => void;
  hasTVPreferredFocus?: boolean;
}

const TVTraktItem: React.FC<TVTraktItemProps> = React.memo(({
  item,
  width: itemWidth,
  navigation,
  currentTheme,
  showTitles,
  focusId,
  onFocus,
  hasTVPreferredFocus = false,
}) => {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPoster = async () => {
      if (item.images) {
        const url = TraktService.getTraktPosterUrl(item.images);
        if (isMounted && url) {
          setPosterUrl(url);
        }
      }
    };
    fetchPoster();
    return () => { isMounted = false; };
  }, [item.images]);

  const handlePress = useCallback(() => {
    if (item.imdbId) {
      navigation.navigate('Metadata', { id: item.imdbId, type: item.type });
    }
  }, [navigation, item.imdbId, item.type]);

  const handleFocus = useCallback(() => {
    onFocus(focusId);
  }, [onFocus, focusId]);

  return (
    <Focusable
      onPress={handlePress}
      onFocus={handleFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[styles.itemContainer, { width: itemWidth }]}
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
      accessibilityLabel={`${item.name}${item.year ? `, ${item.year}` : ''}`}
      accessibilityHint="Press to view details"
    >
      <View style={[styles.posterContainer, { shadowColor: currentTheme.colors.black }]}>
        {posterUrl ? (
          <FastImage
            source={{ uri: posterUrl }}
            style={styles.poster}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[styles.poster, { backgroundColor: currentTheme.colors.elevation1, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={currentTheme.colors.primary} />
          </View>
        )}
      </View>
      {showTitles && (
        <Text style={[styles.cardTitle, { color: currentTheme.colors.mediumEmphasis, fontSize: isTV ? 16 : 13 }]}>
          {item.name}
        </Text>
      )}
    </Focusable>
  );
});

// =============================================================================
// TV Trakt Folder Component
// =============================================================================

interface TVTraktFolderProps {
  folder: TraktFolder;
  width: number;
  currentTheme: any;
  onPress: () => void;
  focusId: string;
  onFocus: (focusId: string) => void;
  hasTVPreferredFocus?: boolean;
}

const TVTraktFolder: React.FC<TVTraktFolderProps> = React.memo(({
  folder,
  width: itemWidth,
  currentTheme,
  onPress,
  focusId,
  onFocus,
  hasTVPreferredFocus = false,
}) => {
  const handleFocus = useCallback(() => {
    onFocus(focusId);
  }, [onFocus, focusId]);

  return (
    <Focusable
      onPress={onPress}
      onFocus={handleFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[styles.itemContainer, { width: itemWidth }]}
      animationConfig={{
        focusScale: 1.05,
        unfocusedOpacity: 0.85,
        showFocusBorder: true,
        focusBorderColor: currentTheme.colors.primary,
        focusBorderWidth: 3,
      }}
      accessibilityLabel={`${folder.name} folder with ${folder.itemCount} items`}
      accessibilityHint="Press to open this folder"
    >
      <View style={[styles.posterContainer, styles.folderContainer, { shadowColor: currentTheme.colors.black, backgroundColor: currentTheme.colors.elevation1 }]}>
        <View style={styles.folderGradient}>
          <MaterialIcons
            name={folder.icon}
            size={isTV ? 56 : 48}
            color={currentTheme.colors.white}
            style={{ marginBottom: isTV ? 12 : 8 }}
          />
          <Text style={[styles.folderTitle, { color: currentTheme.colors.white, fontSize: isTV ? 20 : 16 }]}>
            {folder.name}
          </Text>
          <Text style={[styles.folderCount, { fontSize: isTV ? 14 : 12 }]}>
            {folder.itemCount} items
          </Text>
        </View>
      </View>
    </Focusable>
  );
});

// =============================================================================
// TV Filter Tab Component
// =============================================================================

interface TVFilterTabProps {
  filterType: 'trakt' | 'movies' | 'series';
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  isActive: boolean;
  onPress: () => void;
  focusId: string;
  onFocus: (focusId: string) => void;
  hasTVPreferredFocus?: boolean;
  currentTheme: any;
  traktAuthenticated?: boolean;
}

const TVFilterTab: React.FC<TVFilterTabProps> = React.memo(({
  filterType,
  label,
  iconName,
  isActive,
  onPress,
  focusId,
  onFocus,
  hasTVPreferredFocus = false,
  currentTheme,
  traktAuthenticated = false,
}) => {
  const handleFocus = useCallback(() => {
    onFocus(focusId);
  }, [onFocus, focusId]);

  return (
    <Focusable
      onPress={onPress}
      onFocus={handleFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[
        styles.filterButton,
        isActive && { backgroundColor: currentTheme.colors.primary },
        { shadowColor: currentTheme.colors.black }
      ]}
      animationConfig={{
        focusScale: 1.05,
        unfocusedOpacity: isActive ? 1 : 0.8,
        showFocusBorder: true,
        focusBorderColor: isActive ? currentTheme.colors.white : currentTheme.colors.primary,
        focusBorderWidth: 2,
      }}
      accessibilityLabel={`Filter by ${label}`}
      accessibilityHint={isActive ? 'Currently selected' : 'Press to filter'}
    >
      {filterType === 'trakt' ? (
        <View style={[styles.filterIcon, { justifyContent: 'center', alignItems: 'center' }]}>
          <TraktIcon width={isTV ? 22 : 18} height={isTV ? 22 : 18} style={{ opacity: isActive ? 1 : 0.6 }} />
        </View>
      ) : (
        <MaterialIcons
          name={iconName}
          size={isTV ? 26 : 22}
          color={isActive ? currentTheme.colors.white : currentTheme.colors.mediumGray}
          style={styles.filterIcon}
        />
      )}
      <Text
        style={[
          styles.filterText,
          { color: currentTheme.colors.mediumGray, fontSize: isTV ? 18 : 15 },
          isActive && { color: currentTheme.colors.white, fontWeight: '600' }
        ]}
      >
        {label}
      </Text>
    </Focusable>
  );
});

// =============================================================================
// Skeleton Loader
// =============================================================================

const SkeletonLoader = () => {
  const pulseAnim = React.useRef(new RNAnimated.Value(0)).current;
  const { width } = useWindowDimensions();
  const { numColumns, itemWidth } = getGridLayout(width);
  const { currentTheme } = useTheme();

  React.useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const renderSkeletonItem = () => (
    <View style={[styles.itemContainer, { width: itemWidth }]}>
      <RNAnimated.View
        style={[
          styles.posterContainer,
          { opacity, backgroundColor: currentTheme.colors.darkBackground }
        ]}
      />
      <RNAnimated.View
        style={[
          styles.skeletonTitle,
          { opacity, backgroundColor: currentTheme.colors.darkBackground }
        ]}
      />
    </View>
  );

  const skeletonCount = numColumns * 2;
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <View key={index} style={{ width: itemWidth, marginBottom: isTV ? 24 : 16 }}>
          {renderSkeletonItem()}
        </View>
      ))}
    </View>
  );
};

// =============================================================================
// Main LibraryScreen Component
// =============================================================================

const LibraryScreenTV = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isDarkMode = useColorScheme() === 'dark';
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { numColumns, itemWidth } = useMemo(() => getGridLayout(windowWidth), [windowWidth]);
  const [loading, setLoading] = useState(true);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [filter, setFilter] = useState<'trakt' | 'movies' | 'series'>('movies');
  const [showTraktContent, setShowTraktContent] = useState(false);
  const [selectedTraktFolder, setSelectedTraktFolder] = useState<string | null>(null);
  const { showInfo, showError } = useToast();
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { settings } = useSettings();

  // TV Navigation
  const tvNav = useTVNavigationOptional();
  const spatialNav = useSpatialNavigation('LibraryScreen', {
    autoRestoreFocus: true,
    defaultFocusId: 'filter-movies',
  });

  // Refs for focus management
  const listRef = useRef<FlashList<any>>(null);
  const filterRefs = useRef<Map<string, FocusableRef>>(new Map());

  // Trakt context
  const {
    isAuthenticated: traktAuthenticated,
    isLoading: traktLoading,
    watchedMovies,
    watchedShows,
    watchlistMovies,
    watchlistShows,
    collectionMovies,
    collectionShows,
    continueWatching,
    ratedContent,
    loadWatchedItems,
    loadAllCollections
  } = useTraktContext();

  // =============================================================================
  // Focus Memory Per Tab
  // =============================================================================

  const getFocusKeyForTab = useCallback((tabId: string) => {
    return `library-${tabId}${selectedTraktFolder ? `-${selectedTraktFolder}` : ''}`;
  }, [selectedTraktFolder]);

  const handleItemFocus = useCallback((focusId: string) => {
    spatialNav.saveFocus(focusId);
    if (tvNav) {
      tvNav.setScreenFocus(getFocusKeyForTab(filter), focusId);
      tvNav.setCurrentFocusId(focusId);
    }
  }, [spatialNav, tvNav, filter, getFocusKeyForTab]);

  const handleFilterFocus = useCallback((focusId: string) => {
    spatialNav.saveFocus(focusId);
    if (tvNav) {
      tvNav.setCurrentFocusId(focusId);
    }
  }, [spatialNav, tvNav]);

  // =============================================================================
  // TV Event Handler
  // =============================================================================

  useTVEventHandler(
    useCallback((event) => {
      // Handle voice button to open voice search
      if (event.eventType === 'playPause' && tvNav) {
        tvNav.openVoiceSearch();
      }
    }, [tvNav]),
    { enabled: Platform.isTV }
  );

  // =============================================================================
  // Status Bar
  // =============================================================================

  useEffect(() => {
    const applyStatusBarConfig = () => {
      StatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
      }
    };

    applyStatusBarConfig();
    const unsubscribe = navigation.addListener('focus', applyStatusBarConfig);
    return unsubscribe;
  }, [navigation]);

  // =============================================================================
  // Back Button Handling
  // =============================================================================

  useEffect(() => {
    const backAction = () => {
      if (showTraktContent) {
        if (selectedTraktFolder) {
          setSelectedTraktFolder(null);
        } else {
          setShowTraktContent(false);
        }
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showTraktContent, selectedTraktFolder]);

  // =============================================================================
  // Load Library Data
  // =============================================================================

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      try {
        const items = await catalogService.getLibraryItems();

        const sortedItems = items.sort((a, b) => {
          const timeA = (a as any).addedToLibraryAt || 0;
          const timeB = (b as any).addedToLibraryAt || 0;
          return timeB - timeA;
        });

        const updatedItems = await Promise.all(sortedItems.map(async (item) => {
          const libraryItem: LibraryItem = {
            ...item,
            gradient: Array.isArray((item as any).gradient) ? (item as any).gradient : ['#222', '#444'],
            traktId: typeof (item as any).traktId === 'number' ? (item as any).traktId : 0,
          };
          const key = `watched:${item.type}:${item.id}`;
          const watched = await mmkvStorage.getItem(key);
          return {
            ...libraryItem,
            watched: watched === 'true'
          };
        }));
        setLibraryItems(updatedItems);
      } catch (error) {
        logger.error('Failed to load library:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLibrary();

    const unsubscribe = catalogService.subscribeToLibraryUpdates(async (items) => {
      const sortedItems = items.sort((a, b) => {
        const timeA = (a as any).addedToLibraryAt || 0;
        const timeB = (b as any).addedToLibraryAt || 0;
        return timeB - timeA;
      });

      const updatedItems = await Promise.all(sortedItems.map(async (item) => {
        const libraryItem: LibraryItem = {
          ...item,
          gradient: Array.isArray((item as any).gradient) ? (item as any).gradient : ['#222', '#444'],
          traktId: typeof (item as any).traktId === 'number' ? (item as any).traktId : 0,
        };
        const key = `watched:${item.type}:${item.id}`;
        const watched = await mmkvStorage.getItem(key);
        return {
          ...libraryItem,
          watched: watched === 'true'
        };
      }));
      setLibraryItems(updatedItems);
    });

    const watchedSub = DeviceEventEmitter.addListener('watchedStatusChanged', loadLibrary);
    const focusSub = navigation.addListener('focus', loadLibrary);

    return () => {
      unsubscribe();
      watchedSub.remove();
      focusSub();
    };
  }, [navigation]);

  // =============================================================================
  // Filtered Items
  // =============================================================================

  const filteredItems = useMemo(() => {
    return libraryItems.filter(item => {
      if (filter === 'movies') return item.type === 'movie';
      if (filter === 'series') return item.type === 'series';
      return true;
    });
  }, [libraryItems, filter]);

  // =============================================================================
  // Trakt Folders
  // =============================================================================

  const traktFolders = useMemo((): TraktFolder[] => {
    if (!traktAuthenticated) return [];

    const folders: TraktFolder[] = [
      {
        id: 'watched',
        name: 'Watched',
        icon: 'visibility',
        itemCount: (watchedMovies?.length || 0) + (watchedShows?.length || 0),
      },
      {
        id: 'continue-watching',
        name: 'Continue',
        icon: 'play-circle-outline',
        itemCount: continueWatching?.length || 0,
      },
      {
        id: 'watchlist',
        name: 'Watchlist',
        icon: 'bookmark',
        itemCount: (watchlistMovies?.length || 0) + (watchlistShows?.length || 0),
      },
      {
        id: 'collection',
        name: 'Collection',
        icon: 'library-add',
        itemCount: (collectionMovies?.length || 0) + (collectionShows?.length || 0),
      },
      {
        id: 'ratings',
        name: 'Rated',
        icon: 'star',
        itemCount: ratedContent?.length || 0,
      }
    ];

    return folders.filter(folder => folder.itemCount > 0);
  }, [traktAuthenticated, watchedMovies, watchedShows, watchlistMovies, watchlistShows, collectionMovies, collectionShows, continueWatching, ratedContent]);

  // =============================================================================
  // Get Trakt Folder Items
  // =============================================================================

  const getTraktFolderItems = useCallback((folderId: string): TraktDisplayItem[] => {
    const items: TraktDisplayItem[] = [];

    switch (folderId) {
      case 'watched':
        if (watchedMovies) {
          for (const watchedMovie of watchedMovies) {
            const movie = watchedMovie.movie;
            if (movie) {
              items.push({
                id: String(movie.ids.trakt),
                name: movie.title,
                type: 'movie',
                poster: 'placeholder',
                year: movie.year,
                lastWatched: watchedMovie.last_watched_at,
                plays: watchedMovie.plays,
                imdbId: movie.ids.imdb,
                traktId: movie.ids.trakt,
                images: movie.images,
              });
            }
          }
        }
        if (watchedShows) {
          for (const watchedShow of watchedShows) {
            const show = watchedShow.show;
            if (show) {
              items.push({
                id: String(show.ids.trakt),
                name: show.title,
                type: 'series',
                poster: 'placeholder',
                year: show.year,
                lastWatched: watchedShow.last_watched_at,
                plays: watchedShow.plays,
                imdbId: show.ids.imdb,
                traktId: show.ids.trakt,
                images: show.images,
              });
            }
          }
        }
        break;

      case 'continue-watching':
        if (continueWatching) {
          for (const item of continueWatching) {
            if (item.type === 'movie' && item.movie) {
              items.push({
                id: String(item.movie.ids.trakt),
                name: item.movie.title,
                type: 'movie',
                poster: 'placeholder',
                year: item.movie.year,
                lastWatched: item.paused_at,
                imdbId: item.movie.ids.imdb,
                traktId: item.movie.ids.trakt,
                images: item.movie.images,
              });
            } else if (item.type === 'episode' && item.show && item.episode) {
              items.push({
                id: `${item.show.ids.trakt}:${item.episode.season}:${item.episode.number}`,
                name: `${item.show.title} S${item.episode.season}E${item.episode.number}`,
                type: 'series',
                poster: 'placeholder',
                year: item.show.year,
                lastWatched: item.paused_at,
                imdbId: item.show.ids.imdb,
                traktId: item.show.ids.trakt,
                images: item.show.images,
              });
            }
          }
        }
        break;

      case 'watchlist':
        if (watchlistMovies) {
          for (const watchlistMovie of watchlistMovies) {
            const movie = watchlistMovie.movie;
            if (movie) {
              items.push({
                id: String(movie.ids.trakt),
                name: movie.title,
                type: 'movie',
                poster: 'placeholder',
                year: movie.year,
                lastWatched: watchlistMovie.listed_at,
                imdbId: movie.ids.imdb,
                traktId: movie.ids.trakt,
                images: movie.images,
              });
            }
          }
        }
        if (watchlistShows) {
          for (const watchlistShow of watchlistShows) {
            const show = watchlistShow.show;
            if (show) {
              items.push({
                id: String(show.ids.trakt),
                name: show.title,
                type: 'series',
                poster: 'placeholder',
                year: show.year,
                lastWatched: watchlistShow.listed_at,
                imdbId: show.ids.imdb,
                traktId: show.ids.trakt,
                images: show.images,
              });
            }
          }
        }
        break;

      case 'collection':
        if (collectionMovies) {
          for (const collectionMovie of collectionMovies) {
            const movie = collectionMovie.movie;
            if (movie) {
              items.push({
                id: String(movie.ids.trakt),
                name: movie.title,
                type: 'movie',
                poster: 'placeholder',
                year: movie.year,
                lastWatched: collectionMovie.collected_at,
                imdbId: movie.ids.imdb,
                traktId: movie.ids.trakt,
                images: movie.images,
              });
            }
          }
        }
        if (collectionShows) {
          for (const collectionShow of collectionShows) {
            const show = collectionShow.show;
            if (show) {
              items.push({
                id: String(show.ids.trakt),
                name: show.title,
                type: 'series',
                poster: 'placeholder',
                year: show.year,
                lastWatched: collectionShow.collected_at,
                imdbId: show.ids.imdb,
                traktId: show.ids.trakt,
                images: show.images,
              });
            }
          }
        }
        break;

      case 'ratings':
        if (ratedContent) {
          for (const ratedItem of ratedContent) {
            if (ratedItem.movie) {
              const movie = ratedItem.movie;
              items.push({
                id: String(movie.ids.trakt),
                name: movie.title,
                type: 'movie',
                poster: 'placeholder',
                year: movie.year,
                lastWatched: ratedItem.rated_at,
                rating: ratedItem.rating,
                imdbId: movie.ids.imdb,
                traktId: movie.ids.trakt,
                images: movie.images,
              });
            } else if (ratedItem.show) {
              const show = ratedItem.show;
              items.push({
                id: String(show.ids.trakt),
                name: show.title,
                type: 'series',
                poster: 'placeholder',
                year: show.year,
                lastWatched: ratedItem.rated_at,
                rating: ratedItem.rating,
                imdbId: show.ids.imdb,
                traktId: show.ids.trakt,
                images: show.images,
              });
            }
          }
        }
        break;
    }

    return items.sort((a, b) => {
      const dateA = a.lastWatched ? new Date(a.lastWatched).getTime() : 0;
      const dateB = b.lastWatched ? new Date(b.lastWatched).getTime() : 0;
      return dateB - dateA;
    });
  }, [watchedMovies, watchedShows, watchlistMovies, watchlistShows, collectionMovies, collectionShows, continueWatching, ratedContent]);

  // =============================================================================
  // Filter Tab Handlers
  // =============================================================================

  const handleFilterPress = useCallback((filterType: 'trakt' | 'movies' | 'series') => {
    if (filterType === 'trakt') {
      if (!traktAuthenticated) {
        navigation.navigate('TraktSettings');
      } else {
        setShowTraktContent(true);
        setSelectedTraktFolder(null);
        loadAllCollections();
      }
      return;
    }
    setFilter(filterType);
  }, [traktAuthenticated, navigation, loadAllCollections]);

  const handleTraktFolderPress = useCallback((folderId: string) => {
    setSelectedTraktFolder(folderId);
    loadAllCollections();
  }, [loadAllCollections]);

  // =============================================================================
  // Render Trakt Content
  // =============================================================================

  const renderTraktContent = useCallback(() => {
    if (traktLoading) {
      return <TraktLoadingSpinner />;
    }

    if (!selectedTraktFolder) {
      if (traktFolders.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <TraktIcon width={80} height={80} style={{ opacity: 0.7, marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: currentTheme.colors.white, fontSize: isTV ? 24 : 20 }]}>No Trakt collections</Text>
            <Text style={[styles.emptySubtext, { color: currentTheme.colors.mediumGray, fontSize: isTV ? 18 : 15 }]}>
              Your Trakt collections will appear here once you start using Trakt
            </Text>
            <Focusable
              onPress={loadAllCollections}
              style={[styles.exploreButton, {
                backgroundColor: currentTheme.colors.primary,
                shadowColor: currentTheme.colors.black
              }]}
              hasTVPreferredFocus={true}
              animationConfig={{
                focusScale: 1.05,
                showFocusBorder: true,
                focusBorderColor: currentTheme.colors.white,
                focusBorderWidth: 2,
              }}
              accessibilityLabel="Load collections"
            >
              <Text style={[styles.exploreButtonText, { color: currentTheme.colors.white, fontSize: isTV ? 18 : 16 }]}>Load Collections</Text>
            </Focusable>
          </View>
        );
      }

      // Render Trakt folders in horizontal rows
      return (
        <View style={styles.traktFoldersContainer}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.white, fontSize: isTV ? 24 : 18, marginBottom: isTV ? 24 : 16 }]}>
            Trakt Collections
          </Text>
          <FlatList
            data={traktFolders}
            renderItem={({ item, index }) => (
              <TVTraktFolder
                folder={item}
                width={itemWidth}
                currentTheme={currentTheme}
                onPress={() => handleTraktFolderPress(item.id)}
                focusId={`trakt-folder-${item.id}`}
                onFocus={handleItemFocus}
                hasTVPreferredFocus={index === 0}
              />
            )}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
          />
        </View>
      );
    }

    // Render folder items
    const folderItems = getTraktFolderItems(selectedTraktFolder);

    if (folderItems.length === 0) {
      const folderName = traktFolders.find(f => f.id === selectedTraktFolder)?.name || 'Collection';
      return (
        <View style={styles.emptyContainer}>
          <TraktIcon width={80} height={80} style={{ opacity: 0.7, marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: currentTheme.colors.white, fontSize: isTV ? 24 : 20 }]}>No content in {folderName}</Text>
          <Text style={[styles.emptySubtext, { color: currentTheme.colors.mediumGray, fontSize: isTV ? 18 : 15 }]}>
            This collection is empty
          </Text>
          <Focusable
            onPress={loadAllCollections}
            style={[styles.exploreButton, {
              backgroundColor: currentTheme.colors.primary,
              shadowColor: currentTheme.colors.black
            }]}
            hasTVPreferredFocus={true}
            animationConfig={{
              focusScale: 1.05,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.white,
              focusBorderWidth: 2,
            }}
            accessibilityLabel="Refresh"
          >
            <Text style={[styles.exploreButtonText, { color: currentTheme.colors.white, fontSize: isTV ? 18 : 16 }]}>Refresh</Text>
          </Focusable>
        </View>
      );
    }

    return (
      <FlashList
        ref={listRef}
        data={folderItems}
        renderItem={({ item, index }) => (
          <TVTraktItem
            item={item}
            width={itemWidth}
            navigation={navigation}
            currentTheme={currentTheme}
            showTitles={settings.showPosterTitles}
            focusId={`trakt-item-${item.type}-${item.id}`}
            onFocus={handleItemFocus}
            hasTVPreferredFocus={index === 0}
          />
        )}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        numColumns={numColumns}
        estimatedItemSize={itemWidth * 1.5 + 40}
        contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + (isTV ? 120 : 90) }]}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [
    traktLoading,
    selectedTraktFolder,
    traktFolders,
    getTraktFolderItems,
    itemWidth,
    numColumns,
    currentTheme,
    navigation,
    settings.showPosterTitles,
    handleItemFocus,
    handleTraktFolderPress,
    loadAllCollections,
    insets.bottom,
  ]);

  // =============================================================================
  // Render Library Content
  // =============================================================================

  const renderContent = useCallback(() => {
    if (loading) {
      return <SkeletonLoader />;
    }

    if (filteredItems.length === 0) {
      const emptyTitle = filter === 'movies' ? 'No movies yet' : filter === 'series' ? 'No TV shows yet' : 'No content yet';
      const emptySubtitle = 'Add some content to your library to see it here';
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="video-library"
            size={isTV ? 80 : 64}
            color={currentTheme.colors.lightGray}
          />
          <Text style={[styles.emptyText, { color: currentTheme.colors.white, fontSize: isTV ? 24 : 20 }]}>
            {emptyTitle}
          </Text>
          <Text style={[styles.emptySubtext, { color: currentTheme.colors.mediumGray, fontSize: isTV ? 18 : 15 }]}>
            {emptySubtitle}
          </Text>
          <Focusable
            onPress={() => navigation.navigate('Search')}
            style={[styles.exploreButton, {
              backgroundColor: currentTheme.colors.primary,
              shadowColor: currentTheme.colors.black
            }]}
            hasTVPreferredFocus={true}
            animationConfig={{
              focusScale: 1.05,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.white,
              focusBorderWidth: 2,
            }}
            accessibilityLabel="Find something to watch"
          >
            <Text style={[styles.exploreButtonText, { color: currentTheme.colors.white, fontSize: isTV ? 18 : 16 }]}>Find something to watch</Text>
          </Focusable>
        </View>
      );
    }

    return (
      <FlashList
        ref={listRef}
        data={filteredItems}
        renderItem={({ item, index }) => (
          <TVLibraryItem
            item={item}
            width={itemWidth}
            navigation={navigation}
            currentTheme={currentTheme}
            showTitles={settings.showPosterTitles}
            focusId={`library-item-${item.type}-${item.id}`}
            onFocus={handleItemFocus}
            hasTVPreferredFocus={index === 0}
            inLibrary={true}
          />
        )}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        estimatedItemSize={itemWidth * 1.5 + 40}
        contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + (isTV ? 120 : 90) }]}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [loading, filteredItems, filter, itemWidth, numColumns, currentTheme, navigation, settings.showPosterTitles, handleItemFocus, insets.bottom]);

  // =============================================================================
  // Tablet Detection
  // =============================================================================

  const isTablet = useMemo(() => {
    const smallestDimension = Math.min(windowWidth, windowHeight);
    return Platform.isTV || (Platform.OS === 'ios' ? (Platform as any).isPad === true : smallestDimension >= 768);
  }, [windowWidth, windowHeight]);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScreenHeader
        title={showTraktContent
          ? (selectedTraktFolder
            ? traktFolders.find(f => f.id === selectedTraktFolder)?.name || 'Collection'
            : 'Trakt Collection')
          : 'Library'
        }
        showBackButton={showTraktContent}
        onBackPress={showTraktContent ? () => {
          if (selectedTraktFolder) {
            setSelectedTraktFolder(null);
          } else {
            setShowTraktContent(false);
          }
        } : undefined}
        useMaterialIcons={showTraktContent}
        rightActionIcon={!showTraktContent ? 'calendar' : undefined}
        onRightActionPress={!showTraktContent ? () => navigation.navigate('Calendar') : undefined}
        isTablet={isTablet}
      />

      <View style={[styles.contentContainer, { backgroundColor: currentTheme.colors.darkBackground }]}>
        {!showTraktContent && (
          <View style={styles.filtersContainer}>
            <TVFilterTab
              filterType="trakt"
              label="Trakt"
              iconName="pan-tool"
              isActive={false}
              onPress={() => handleFilterPress('trakt')}
              focusId="filter-trakt"
              onFocus={handleFilterFocus}
              currentTheme={currentTheme}
              traktAuthenticated={traktAuthenticated}
            />
            <TVFilterTab
              filterType="movies"
              label="Movies"
              iconName="movie"
              isActive={filter === 'movies'}
              onPress={() => handleFilterPress('movies')}
              focusId="filter-movies"
              onFocus={handleFilterFocus}
              hasTVPreferredFocus={filter === 'movies'}
              currentTheme={currentTheme}
            />
            <TVFilterTab
              filterType="series"
              label="TV Shows"
              iconName="live-tv"
              isActive={filter === 'series'}
              onPress={() => handleFilterPress('series')}
              focusId="filter-series"
              onFocus={handleFilterFocus}
              hasTVPreferredFocus={filter === 'series'}
              currentTheme={currentTheme}
            />
          </View>
        )}

        {showTraktContent ? renderTraktContent() : renderContent()}
      </View>

      {/* TV Context Menu */}
      <TVContextMenu />

      {/* Non-TV DropUpMenu fallback */}
      {selectedItem && (
        <DropUpMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          item={selectedItem}
          isWatched={!!selectedItem.watched}
          isSaved={true}
          onOptionSelect={async (option) => {
            if (!selectedItem) return;
            switch (option) {
              case 'library': {
                try {
                  await catalogService.removeFromLibrary(selectedItem.type, selectedItem.id);
                  showInfo('Removed from Library', 'Item removed from your library');
                  setLibraryItems(prev => prev.filter(item => !(item.id === selectedItem.id && item.type === selectedItem.type)));
                  setMenuVisible(false);
                } catch (error) {
                  showError('Failed to update Library', 'Unable to remove item from library');
                }
                break;
              }
              case 'watched': {
                try {
                  const key = `watched:${selectedItem.type}:${selectedItem.id}`;
                  const newWatched = !selectedItem.watched;
                  await mmkvStorage.setItem(key, newWatched ? 'true' : 'false');
                  showInfo(newWatched ? 'Marked as Watched' : 'Marked as Unwatched', newWatched ? 'Item marked as watched' : 'Item marked as unwatched');
                  setLibraryItems(prev => prev.map(item =>
                    item.id === selectedItem.id && item.type === selectedItem.type
                      ? { ...item, watched: newWatched }
                      : item
                  ));
                } catch (error) {
                  showError('Failed to update watched status', 'Unable to update watched status');
                }
                break;
              }
              case 'share': {
                let url = '';
                if (selectedItem.id) {
                  url = `https://www.imdb.com/title/${selectedItem.id}/`;
                }
                const message = `${selectedItem.name}\n${url}`;
                Share.share({ message, url, title: selectedItem.name });
                break;
              }
              default:
                break;
            }
          }}
        />
      )}
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
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: isTV ? 32 : 16,
    paddingBottom: isTV ? 24 : 16,
    paddingTop: isTV ? 12 : 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    zIndex: 10,
    gap: isTV ? 16 : 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isTV ? 14 : 10,
    paddingHorizontal: isTV ? 24 : 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterIcon: {
    marginRight: isTV ? 12 : 8,
  },
  filterText: {
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: isTV ? 24 : 8,
    paddingVertical: isTV ? 24 : 16,
  },
  horizontalListContent: {
    paddingHorizontal: isTV ? 24 : 12,
    gap: isTV ? 16 : 12,
  },
  traktFoldersContainer: {
    paddingTop: isTV ? 24 : 16,
    paddingHorizontal: isTV ? 8 : 0,
  },
  sectionTitle: {
    fontWeight: '700',
    paddingHorizontal: isTV ? 32 : 16,
  },
  itemContainer: {
    marginBottom: isTV ? 24 : 20,
    marginHorizontal: isTV ? 8 : 4,
  },
  posterContainer: {
    borderRadius: isTV ? 16 : 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    aspectRatio: 2 / 3,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  poster: {
    width: '100%',
    height: '100%',
    borderRadius: isTV ? 16 : 12,
  },
  cardTitle: {
    fontWeight: '500',
    lineHeight: isTV ? 22 : 18,
    marginTop: isTV ? 12 : 8,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  watchedIndicator: {
    position: 'absolute',
    top: isTV ? 12 : 8,
    right: isTV ? 12 : 8,
    borderRadius: 12,
    padding: 2,
    zIndex: 2,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: isTV ? 6 : 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressBar: {
    height: '100%',
  },
  folderContainer: {
    borderRadius: isTV ? 16 : 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    aspectRatio: 2 / 3,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  folderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: isTV ? 24 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  folderTitle: {
    fontWeight: '600',
    marginBottom: isTV ? 8 : 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  folderCount: {
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: isTV ? 24 : 12,
    paddingTop: isTV ? 24 : 16,
    justifyContent: 'space-between',
  },
  skeletonTitle: {
    height: isTV ? 18 : 14,
    marginTop: isTV ? 12 : 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTV ? 64 : 32,
    paddingBottom: isTV ? 120 : 90,
  },
  emptyText: {
    fontWeight: '700',
    marginTop: isTV ? 24 : 16,
    marginBottom: isTV ? 12 : 8,
  },
  emptySubtext: {
    textAlign: 'center',
    marginBottom: isTV ? 32 : 24,
  },
  exploreButton: {
    paddingVertical: isTV ? 16 : 12,
    paddingHorizontal: isTV ? 32 : 24,
    borderRadius: 24,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exploreButtonText: {
    fontWeight: '600',
  },
});

export default LibraryScreenTV;
