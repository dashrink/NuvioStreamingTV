import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { Share } from 'react-native';
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
  SafeAreaView,
  StatusBar,
  Animated as RNAnimated,
  ActivityIndicator,
  Platform,
  ScrollView,
  BackHandler,
} from 'react-native';
import Focusable from '../components/common/Focusable';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import FastImage from '@d11/react-native-fast-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useScrollToTop } from '../contexts/ScrollToTopContext';
import { TVLibraryGrid, TVLibraryItem } from '../components/tv/TVLibraryGrid';
import { TVLibraryFolders, LibraryFolder } from '../components/tv/TVLibraryFolders';
import { isTV, TV_SPACING, TV_TYPOGRAPHY } from '../utils/tvStyles';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';

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

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

function getGridLayout(screenWidth: number): { numColumns: number; itemWidth: number } {
  const horizontalPadding = 16;
  const gutter = 12;
  let numColumns = 3;
  if (screenWidth >= 1200) numColumns = 5;
  else if (screenWidth >= 1000) numColumns = 4;
  else if (screenWidth >= 700) numColumns = 3;
  else numColumns = 3;
  const available = screenWidth - horizontalPadding - (numColumns - 1) * gutter;
  const itemWidth = Math.floor(available / numColumns);
  return { numColumns, itemWidth };
}

const TraktItem = React.memo(({
  item,
  width,
  navigation,
  currentTheme,
  showTitles
}: {
  item: TraktDisplayItem;
  width: number;
  navigation: any;
  currentTheme: any;
  showTitles: boolean;
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
    triggerLight();
    if (item.imdbId) {
      navigation.navigate('Metadata', { id: item.imdbId, type: item.type });
    }
  }, [navigation, item.imdbId, item.type]);

  return (
    <Focusable
      style={[styles.itemContainer, { width }]}
      onPress={handlePress}
    >
      <View>
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
          <Text style={[styles.cardTitle, { color: currentTheme.colors.mediumEmphasis }]}>
            {item.name}
          </Text>
        )}
      </View>
    </Focusable>
  );
});

const SkeletonLoader = () => {
  const pulseAnim = React.useRef(new RNAnimated.Value(0)).current;
  const { width, height } = useWindowDimensions();
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
        <View key={index} style={{ width: itemWidth, marginBottom: 16 }}>
          {renderSkeletonItem()}
        </View>
      ))}
    </View>
  );
};

const LibraryScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isDarkMode = useColorScheme() === 'dark';
  const { width, height } = useWindowDimensions();
  const { numColumns, itemWidth } = useMemo(() => getGridLayout(width), [width]);
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
  const flashListRef = useRef<any>(null);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  useScrollToTop('Library', scrollToTop);

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

  const filteredItems = libraryItems.filter(item => {
    if (filter === 'movies') return item.type === 'movie';
    if (filter === 'series') return item.type === 'series';
    return true;
  });

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

  const renderItem = ({ item }: { item: LibraryItem }) => (
    <Focusable
      style={[styles.itemContainer, { width: itemWidth }]}
      onPress={() => {
        triggerLight();
        navigation.navigate('Metadata', { id: item.id, type: item.type });
      }}
      onLongPress={() => {
        triggerLight();
        setSelectedItem(item);
        setMenuVisible(true);
      }}
    >
      <View>
        <View style={[styles.posterContainer, { shadowColor: currentTheme.colors.black, borderRadius: settings.posterBorderRadius ?? 12 }]}>
          <FastImage
            source={{ uri: item.poster || 'https://via.placeholder.com/300x450' }}
            style={[styles.poster, { borderRadius: settings.posterBorderRadius ?? 12 }]}
            resizeMode={FastImage.resizeMode.cover}
          />
          {item.watched && (
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
        {settings.showPosterTitles && (
          <Text style={[styles.cardTitle, { color: currentTheme.colors.mediumEmphasis }]}>
            {item.name}
          </Text>
        )}
      </View>
    </Focusable>
  );

  const renderTraktCollectionFolder = ({ folder }: { folder: TraktFolder }) => (
    <Focusable
      style={[styles.itemContainer, { width: itemWidth }]}
      onPress={() => {
        triggerLight();
        setSelectedTraktFolder(folder.id);
        loadAllCollections();
      }}
    >
      <View style={[styles.posterContainer, styles.folderContainer, { shadowColor: currentTheme.colors.black, backgroundColor: currentTheme.colors.elevation1 }]}>
        <View style={styles.folderGradient}>
          <MaterialIcons
            name={folder.icon}
            size={48}
            color={currentTheme.colors.white}
            style={{ marginBottom: 8 }}
          />
          <Text style={[styles.folderTitle, { color: currentTheme.colors.white }]}>
            {folder.name}
          </Text>
          <Text style={styles.folderCount}>
            {folder.itemCount} items
          </Text>
        </View>
      </View>
    </Focusable>
  );

  const renderTraktFolder = () => (
    <Focusable
      style={[styles.itemContainer, { width: itemWidth }]}
      onPress={() => {
        triggerLight();
        if (!traktAuthenticated) {
          navigation.navigate('TraktSettings');
        } else {
          setShowTraktContent(true);
          setSelectedTraktFolder(null);
        }
      }}
    >
      <View style={[styles.posterContainer, styles.folderContainer, { shadowColor: currentTheme.colors.black, backgroundColor: currentTheme.colors.elevation1 }]}>
        <View style={styles.folderGradient}>
          <MaterialIcons
            name="star"
            size={48}
            color={currentTheme.colors.white}
            style={{ marginBottom: 8 }}
          />
          <Text style={[styles.folderTitle, { color: currentTheme.colors.white }]}>
            {traktAuthenticated ? 'Collections' : 'Connect Trakt'}
          </Text>
          {traktAuthenticated && (
            <Text style={styles.folderCount}>
              {traktFolders.length} collections
            </Text>
          )}
        </View>
      </View>
    </Focusable>
  );

  if (showTraktContent) {
    if (selectedTraktFolder) {
      let folderContent: TraktDisplayItem[] = [];
      const folderConfig = {
        watched: () => [...(watchedMovies || []), ...(watchedShows || [])],
        'continue-watching': () => continueWatching || [],
        watchlist: () => [...(watchlistMovies || []), ...(watchlistShows || [])],
        collection: () => [...(collectionMovies || []), ...(collectionShows || [])],
        ratings: () => ratedContent || [],
      };

      const getContent = folderConfig[selectedTraktFolder as keyof typeof folderConfig];
      if (getContent) {
        folderContent = getContent().map(item => ({
          id: item.imdbId || `trakt-${item.traktId}`,
          name: item.name,
          type: item.type,
          poster: item.poster,
          year: item.year,
          imdbId: item.imdbId,
          traktId: item.traktId,
          images: item.images,
        }));
      }

      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
          <View style={{ paddingHorizontal: 8, paddingTop: 16, marginBottom: 16 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}
              onPress={() => setSelectedTraktFolder(null)}
            >
              <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.primary} />
              <Text style={{ marginLeft: 8, color: currentTheme.colors.primary, fontSize: 16, fontWeight: '600' }}>
                Back
              </Text>
            </TouchableOpacity>
          </View>
          <FlashList
            data={folderContent}
            renderItem={({ item }) => <TraktItem item={item} width={itemWidth} navigation={navigation} currentTheme={currentTheme} showTitles={true} />}
            numColumns={numColumns}
            estimatedItemSize={300}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
            columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
        <View style={{ paddingHorizontal: 8, paddingTop: 16, marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}
            onPress={() => setShowTraktContent(false)}
          >
            <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.primary} />
            <Text style={{ marginLeft: 8, color: currentTheme.colors.primary, fontSize: 16, fontWeight: '600' }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
        <FlashList
          data={traktFolders}
          renderItem={({ item: folder }) => <TraktItem item={{
            id: folder.id,
            name: folder.name,
            type: 'movie',
            poster: '',
            traktId: 0,
          }} width={itemWidth} navigation={navigation} currentTheme={currentTheme} showTitles={true} />}
          numColumns={numColumns}
          estimatedItemSize={300}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          scrollEnabled={false}
        />
        <FlashList
          ref={flashListRef}
          data={traktFolders}
          renderItem={({ item: folder }) => renderTraktCollectionFolder({ folder })}
          numColumns={numColumns}
          estimatedItemSize={300}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <ScreenHeader
        title="Library"
        navigation={navigation}
        onMenuPress={() => setMenuVisible(!menuVisible)}
      />

      <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginVertical: 12, gap: 8 }}>
        <Focusable
          style={[
            styles.filterButton,
            { 
              backgroundColor: filter === 'movies' ? currentTheme.colors.primary : currentTheme.colors.elevation1,
            }
          ]}
          onPress={() => {
            triggerLight();
            setFilter('movies');
          }}
        >
          <Text
            style={{
              color: filter === 'movies' ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis,
              fontWeight: '600',
            }}
          >
            Movies
          </Text>
        </Focusable>

        <Focusable
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === 'series' ? currentTheme.colors.primary : currentTheme.colors.elevation1,
            }
          ]}
          onPress={() => {
            triggerLight();
            setFilter('series');
          }}
        >
          <Text
            style={{
              color: filter === 'series' ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis,
              fontWeight: '600',
            }}
          >
            Series
          </Text>
        </Focusable>

        {traktAuthenticated && (
          <Focusable
            style={[
              styles.filterButton,
              {
                backgroundColor: filter === 'trakt' ? currentTheme.colors.primary : currentTheme.colors.elevation1,
              }
            ]}
            onPress={() => {
              triggerLight();
              setFilter('trakt');
              setShowTraktContent(true);
            }}
          >
            <TraktIcon width={20} height={20} />
          </Focusable>
        )}
      </View>

      {loading && !libraryItems.length ? (
        <SkeletonLoader />
      ) : (
        <FlashList
          ref={flashListRef}
          data={filteredItems}
          renderItem={renderItem}
          numColumns={numColumns}
          estimatedItemSize={300}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
              <MaterialIcons name="library-books" size={48} color={currentTheme.colors.mediumEmphasis} />
              <Text style={{ color: currentTheme.colors.mediumEmphasis, marginTop: 12, fontSize: 16 }}>
                {filter === 'trakt' ? 'No Trakt collections' : `No ${filter} yet`}
              </Text>
            </View>
          }
        />
      )}

      {menuVisible && selectedItem && (
        <DropUpMenu
          item={selectedItem}
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          navigation={navigation}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    marginHorizontal: 4,
  },
  posterContainer: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    numberOfLines: 2,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchedIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  progressBar: {
    height: '100%',
  },
  folderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  folderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  folderCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  skeletonTitle: {
    height: 16,
    marginTop: 8,
    borderRadius: 4,
  },
});

export default LibraryScreen;