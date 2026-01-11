import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { DeviceEventEmitter } from 'react-native';
import { View, ActivityIndicator, StyleSheet, Dimensions, Platform, Text, Share } from 'react-native';
import Focusable from '../common/Focusable';
import FastImage from '@d11/react-native-fast-image';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';
import { catalogService, StreamingContent } from '../../services/catalogService';
import { DropUpMenu } from './DropUpMenu';
import { mmkvStorage } from '../../services/mmkvStorage';
import { storageService } from '../../services/storageService';
import { TraktService } from '../../services/traktService';
import { useTraktContext } from '../../contexts/TraktContext';
import Animated, { FadeIn } from 'react-native-reanimated';
import { triggerLight } from '../../hooks/useHaptics';
import {
  isTV as isTVDevice,
  TV_SPACING,
  TV_TYPOGRAPHY,
  TV_CATALOG,
} from '../../utils/tvStyles';

interface ContentItemProps {
  item: StreamingContent;
  onPress: (id: string, type: string) => void;
  index?: number;
  onItemFocus?: (index: number) => void;
  shouldLoadImage?: boolean;
  deferMs?: number;
  // TV spatial navigation props
  nextFocusUp?: number | React.RefObject<any>;
  nextFocusDown?: number | React.RefObject<any>;
  nextFocusLeft?: number | React.RefObject<any>;
  nextFocusRight?: number | React.RefObject<any>;
  hasTVPreferredFocus?: boolean;
  focusableRef?: React.RefObject<any>;
}

const { width } = Dimensions.get('window');

// Enhanced responsive breakpoints
const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

const getDeviceType = (screenWidth: number) => {
  // Always treat TV devices as 'tv' regardless of reported dp width
  if (Platform.isTV) return 'tv';
  if (screenWidth >= BREAKPOINTS.tv) return 'tv';
  if (screenWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
  if (screenWidth >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
};

// Dynamic poster calculation based on screen width - show 1/4 of next poster
// TV-specific: Larger posters for viewing distance, more spacing for focus rings
// Uses TV_CATALOG constants for consistent 10-foot experience
const calculatePosterLayout = (screenWidth: number, forceTV = false) => {
  // For TV, use forceTV parameter since Platform.isTV is available
  const isTVDeviceCalc = forceTV || Platform.isTV;
  const deviceType = isTVDeviceCalc ? 'tv' : getDeviceType(screenWidth);

  // Responsive sizing based on device type
  // TV: Uses TV_CATALOG constants for optimal viewing from couch distance (8-12 feet)
  const MIN_POSTER_WIDTH = deviceType === 'tv' ? TV_CATALOG.posterWidth : deviceType === 'largeTablet' ? 160 : deviceType === 'tablet' ? 140 : 100;
  const MAX_POSTER_WIDTH = deviceType === 'tv' ? TV_CATALOG.posterWidth + 40 : deviceType === 'largeTablet' ? 200 : deviceType === 'tablet' ? 180 : 130;
  const LEFT_PADDING = deviceType === 'tv' ? TV_SPACING.screenPadding : deviceType === 'largeTablet' ? 28 : deviceType === 'tablet' ? 24 : 16;
  const SPACING = deviceType === 'tv' ? TV_CATALOG.posterSpacing : deviceType === 'largeTablet' ? 10 : deviceType === 'tablet' ? 8 : 8;

  // Calculate available width for posters (reserve space for left padding)
  const availableWidth = screenWidth - LEFT_PADDING;

  // Try different numbers of full posters to find the best fit
  // TV should show 5-6 posters to fit 960dp viewport
  const defaultPosterWidth = deviceType === 'tv' ? 140 : deviceType === 'largeTablet' ? 180 : deviceType === 'tablet' ? 160 : 120;
  let bestLayout = {
    numFullPosters: deviceType === 'tv' ? 5 : 3,
    posterWidth: defaultPosterWidth
  };

  const minPosters = deviceType === 'tv' ? 5 : 3;
  const maxPosters = deviceType === 'tv' ? 7 : 6;

  for (let n = minPosters; n <= maxPosters; n++) {
    // Calculate poster width needed for N full posters + 0.25 partial poster
    // Formula: N * posterWidth + (N-1) * spacing + 0.25 * posterWidth = availableWidth - rightPadding
    // Simplified: posterWidth * (N + 0.25) + (N-1) * spacing = availableWidth - rightPadding
    // We'll use minimal right padding (8px) to maximize space
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
    partialPosterWidth: bestLayout.posterWidth * 0.25 // 1/4 of next poster
  };
};

const posterLayout = calculatePosterLayout(width);
const POSTER_WIDTH = posterLayout.posterWidth;

const ContentItem = ({
  item,
  onPress,
  index,
  onItemFocus,
  shouldLoadImage: shouldLoadImageProp,
  deferMs = 0,
  nextFocusUp,
  nextFocusDown,
  nextFocusLeft,
  nextFocusRight,
  hasTVPreferredFocus,
  focusableRef,
}: ContentItemProps) => {
  // Track inLibrary status locally to force re-render
  const [inLibrary, setInLibrary] = useState(!!item.inLibrary);

  useEffect(() => {
    // Subscribe to library updates and update local state if this item's status changes
    const unsubscribe = catalogService.subscribeToLibraryUpdates((items) => {
      const found = items.find((libItem) => libItem.id === item.id && libItem.type === item.type);
      const newInLibrary = !!found;
      // Only update state if the value actually changed to prevent unnecessary re-renders
      setInLibrary(prev => prev !== newInLibrary ? newInLibrary : prev);
    });
    return () => unsubscribe();
  }, [item.id, item.type]);

  // Load watched state from AsyncStorage when item changes
  useEffect(() => {
    const updateWatched = () => {
      mmkvStorage.getItem(`watched:${item.type}:${item.id}`).then((val: string | null) => setIsWatched(val === 'true'));
    };
    updateWatched();
    const sub = DeviceEventEmitter.addListener('watchedStatusChanged', updateWatched);
    return () => sub.remove();
  }, [item.id, item.type]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Trakt integration
  const { isAuthenticated, isInWatchlist, isInCollection, addToWatchlist, removeFromWatchlist, addToCollection, removeFromCollection } = useTraktContext();

  useEffect(() => {
    // Reset image error state when item changes, allowing for retry on re-render
    setImageError(false);
  }, [item.id, item.poster]);

  const { currentTheme } = useTheme();
  const { settings, isLoaded } = useSettings();
  const { showSuccess, showInfo } = useToast();
  const posterRadius = typeof settings.posterBorderRadius === 'number' ? settings.posterBorderRadius : 12;
  // Memoize poster width calculation to avoid recalculating on every render
  const posterWidth = React.useMemo(() => {
    const deviceType = getDeviceType(width);
    const sizeMultiplier = deviceType === 'tv' ? 1.2 : deviceType === 'largeTablet' ? 1.1 : deviceType === 'tablet' ? 1.0 : 0.9;

    switch (settings.posterSize) {
      case 'small':
        return Math.max(90, POSTER_WIDTH - 15) * sizeMultiplier;
      case 'medium':
        return Math.max(110, POSTER_WIDTH + 10) * sizeMultiplier;
      case 'large':
        return Math.max(130, POSTER_WIDTH + 25) * sizeMultiplier;
      default:
        return POSTER_WIDTH * sizeMultiplier;
    }
  }, [settings.posterSize, width]);

  // Determine dimensions based on poster shape
  const { finalWidth, finalAspectRatio, borderRadius } = React.useMemo(() => {
    const shape = item.posterShape || 'poster';
    const baseHeight = posterWidth / (2 / 3); // Standard height derived from portrait width

    let w = posterWidth;
    let ratio = 2 / 3;

    if (shape === 'landscape') {
      ratio = 16 / 9;
      // Maintain same height as portrait posters
      w = baseHeight * ratio;
    } else if (shape === 'square') {
      ratio = 1;
      w = baseHeight;
    }

    return {
      finalWidth: w,
      finalAspectRatio: ratio,
      borderRadius: typeof settings.posterBorderRadius === 'number' ? settings.posterBorderRadius : 12
    };
  }, [posterWidth, item.posterShape, settings.posterBorderRadius]);

  // Intersection observer simulation for lazy loading
  const itemRef = useRef<View>(null);

  const handleLongPress = useCallback(() => {
    triggerLight(); // Haptic feedback for opening context menu
    setMenuVisible(true);
  }, []);

  const handlePress = useCallback(() => {
    // Validate ID before pressing to prevent errors with NaN/undefined IDs
    if (item.id && item.id !== 'NaN' && item.id !== 'undefined') {
      triggerLight(); // Haptic feedback for navigation to details
      onPress(item.id, item.type);
    }
  }, [item.id, item.type, onPress]);

  // Handle focus event for TV D-pad navigation - notify parent to scroll
  const handleFocus = useCallback(() => {
    if (index !== undefined && onItemFocus) {
      onItemFocus(index);
    }
  }, [index, onItemFocus]);

  const handleOptionSelect = useCallback(async (option: string) => {
    switch (option) {
      case 'library':
        if (inLibrary) {
          catalogService.removeFromLibrary(item.type, item.id);
          showInfo('Removed from Library', 'Removed from your local library');
        } else {
          catalogService.addToLibrary(item);
          showSuccess('Added to Library', 'Added to your local library');
        }
        break;
      case 'watched': {
        const targetWatched = !isWatched;
        setIsWatched(targetWatched);
        try {
          await mmkvStorage.setItem(`watched:${item.type}:${item.id}`, targetWatched ? 'true' : 'false');
        } catch { }
        showInfo(targetWatched ? 'Marked as Watched' : 'Marked as Unwatched', targetWatched ? 'Item marked as watched' : 'Item marked as unwatched');
        setTimeout(() => {
          DeviceEventEmitter.emit('watchedStatusChanged');
        }, 100);

        // Best-effort sync: record local progress and push to Trakt if available
        if (targetWatched) {
          try {
            await storageService.setWatchProgress(
              item.id,
              item.type,
              { currentTime: 1, duration: 1, lastUpdated: Date.now() },
              undefined,
              { forceNotify: true, forceWrite: true }
            );
          } catch { }

          if (item.type === 'movie') {
            try {
              const trakt = TraktService.getInstance();
              if (await trakt.isAuthenticated()) {
                await trakt.addToWatchedMovies(item.id);
                try {
                  await storageService.updateTraktSyncStatus(item.id, item.type, true, 100);
                } catch { }
              }
            } catch { }
          }
        }
        setMenuVisible(false);
        break;
      }
      case 'playlist':
        break;
      case 'share': {
        let url = '';
        if (item.id) {
          url = `https://www.imdb.com/title/${item.id}/`;
        }
        const message = `${item.name}\n${url}`;
        Share.share({ message, url, title: item.name });
        break;
      }
      case 'trakt-watchlist': {
        if (isInWatchlist(item.id, item.type as 'movie' | 'show')) {
          await removeFromWatchlist(item.id, item.type as 'movie' | 'show');
          showInfo('Removed from Watchlist', 'Removed from your Trakt watchlist');
        } else {
          await addToWatchlist(item.id, item.type as 'movie' | 'show');
          showSuccess('Added to Watchlist', 'Added to your Trakt watchlist');
        }
        setMenuVisible(false);
        break;
      }
      case 'trakt-collection': {
        if (isInCollection(item.id, item.type as 'movie' | 'show')) {
          await removeFromCollection(item.id, item.type as 'movie' | 'show');
          showInfo('Removed from Collection', 'Removed from your Trakt collection');
        } else {
          await addToCollection(item.id, item.type as 'movie' | 'show');
          showSuccess('Added to Collection', 'Added to your Trakt collection');
        }
        setMenuVisible(false);
        break;
      }
    }
  }, [item, inLibrary, isWatched, isInWatchlist, isInCollection, addToWatchlist, removeFromWatchlist, addToCollection, removeFromCollection, showSuccess, showInfo]);

  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
  }, []);

  // Memoize optimized poster URL to prevent recalculating
  const optimizedPosterUrl = React.useMemo(() => {
    if (!item.poster || item.poster.includes('placeholder')) {
      return 'https://via.placeholder.com/154x231/333/666?text=No+Image';
    }
    if (item.poster.includes('image.tmdb.org')) {
      return item.poster.replace(/\/w\d+\//, '/w154/');
    }
    if (item.poster.includes('placeholder')) {
      return item.poster.replace('/medium/', '/small/');
    }
    return item.poster;
  }, [item.poster, item.id]);

  if (!isLoaded) {
    return (
      <View style={[styles.itemContainer, { width: finalWidth }]}>
        <View
          style={[
            styles.contentItem,
            {
              width: finalWidth,
              aspectRatio: finalAspectRatio,
              borderRadius,
              backgroundColor: currentTheme.colors.elevation1,
            },
          ]}
        />
        <View style={{ height: 18, marginTop: 4 }} />
      </View>
    );
  }

  return (
    <>
      <Animated.View style={[styles.itemContainer, { width: finalWidth }]} entering={FadeIn.duration(300)}>
        <Focusable
          ref={focusableRef}
          style={[styles.contentItem, { width: finalWidth, aspectRatio: finalAspectRatio, borderRadius }]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          onFocus={handleFocus}
          nextFocusUp={nextFocusUp}
          nextFocusDown={nextFocusDown}
          nextFocusLeft={nextFocusLeft}
          nextFocusRight={nextFocusRight}
          hasTVPreferredFocus={hasTVPreferredFocus}
        >
          <View ref={itemRef} style={[styles.contentItemContainer, { borderRadius }]}>
            {/* Image with FastImage for aggressive caching */}
            {item.poster ? (
              <FastImage
                source={{
                  uri: optimizedPosterUrl,
                  priority: FastImage.priority.normal,
                  cache: FastImage.cacheControl.immutable
                }}
                style={[styles.poster, { backgroundColor: currentTheme.colors.elevation1, borderRadius }]}
                resizeMode={FastImage.resizeMode.cover}
                onLoad={() => {
                  setImageError(false);
                }}
                onError={() => {
                  if (__DEV__) console.warn('Image load error for:', item.poster);
                  setImageError(true);
                }}
              />
            ) : (
              // Show placeholder for items without posters
              <View style={[styles.poster, { backgroundColor: currentTheme.colors.elevation1, justifyContent: 'center', alignItems: 'center', borderRadius: posterRadius }]}>
                <Text style={{ color: currentTheme.colors.textMuted, fontSize: 10, textAlign: 'center' }}>
                  {item.name.substring(0, 20)}...
                </Text>
              </View>
            )}
            {imageError && (
              <View style={[styles.loadingOverlay, { backgroundColor: currentTheme.colors.elevation1 }]}>
                <MaterialIcons name="broken-image" size={24} color={currentTheme.colors.textMuted} />
              </View>
            )}
            {isWatched && (
              <View style={styles.watchedIndicator}>
                <MaterialIcons name="check-circle" size={22} color={currentTheme.colors.success} />
              </View>
            )}
            {inLibrary && (
              <View style={styles.libraryBadge}>
                <Feather name="bookmark" size={16} color={currentTheme.colors.white} />
              </View>
            )}
            {isAuthenticated && isInWatchlist(item.id, item.type as 'movie' | 'show') && (
              <View style={styles.traktWatchlistIcon}>
                <MaterialIcons name="playlist-add-check" size={16} color="#E74C3C" />
              </View>
            )}
            {isAuthenticated && isInCollection(item.id, item.type as 'movie' | 'show') && (
              <View style={styles.traktCollectionIcon}>
                <MaterialIcons name="video-library" size={16} color="#3498DB" />
              </View>
            )}
          </View>
        </Focusable>
        {settings.showPosterTitle && item.name && (
          <Text numberOfLines={1} style={[styles.posterTitle, { color: currentTheme.colors.text, marginTop: 4 }]}>
            {item.name}
          </Text>
        )}
      </Animated.View>
      {menuVisible && (
        <DropUpMenu
          item={item}
          inLibrary={inLibrary}
          isWatched={isWatched}
          onOptionSelect={handleOptionSelect}
          onClose={handleMenuClose}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    justifyContent: 'flex-start',
  },
  contentItem: {
    overflow: 'hidden',
  },
  contentItemContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchedIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 2,
  },
  libraryBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
  traktWatchlistIcon: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
  traktCollectionIcon: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
});

export default ContentItem;