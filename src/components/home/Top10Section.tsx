import { MaterialIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';

import ContentItem from './ContentItem';
import { Top10Badge, BadgeStyle } from './Top10Badge';
import { useTheme } from '../../contexts/ThemeContext';
import { triggerLight } from '../../hooks/useHaptics';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { StreamingContent } from '../../services/catalogService';
import { TMDBService, TMDBTrendingResult } from '../../services/tmdbService';

interface Top10SectionProps {
  type: 'movie' | 'tv';
  timeWindow?: 'day' | 'week';
  displayStyle?: BadgeStyle;
  enabled?: boolean;
}

const { width } = Dimensions.get('window');

// Enhanced responsive breakpoints
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
const isTV = deviceType === 'tv';

// Dynamic poster calculation based on screen width - show 1/4 of next poster
const calculatePosterLayout = (screenWidth: number) => {
  const MIN_POSTER_WIDTH = 100;
  const MAX_POSTER_WIDTH = 130;
  const LEFT_PADDING = 16;
  const SPACING = 8;

  const availableWidth = screenWidth - LEFT_PADDING;

  let bestLayout = { numFullPosters: 3, posterWidth: 120 };

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

const Top10Section = ({
  type,
  timeWindow = 'week',
  displayStyle = 'disney',
  enabled = true,
}: Top10SectionProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const [trending, setTrending] = useState<StreamingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchTrending = async () => {
      try {
        setLoading(true);
        setError(null);

        const tmdb = TMDBService.getInstance();
        const results = await tmdb.getTrending(type, timeWindow);

        // Convert TMDB results to StreamingContent format and take top 10
        const top10: StreamingContent[] = results.slice(0, 10).map((item: TMDBTrendingResult) => ({
          id: item.external_ids?.imdb_id || item.id.toString(),
          type: type === 'movie' ? 'movie' : 'series',
          name: item.title || item.name || 'Unknown',
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          posterShape: 'poster',
          description: item.overview || '',
        }));

        setTrending(top10);
      } catch (err) {
        setError('Failed to load trending content');
        if (__DEV__) console.error('Error fetching trending:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [type, timeWindow, enabled]);

  const handleContentPress = useCallback(
    (id: string, contentType: string) => {
      navigation.navigate('Metadata', { id, type: contentType });
    },
    [navigation]
  );

  const renderContentItem = useCallback(
    ({ item, index }: { item: StreamingContent; index: number }) => {
      return (
        <View style={styles.itemWrapper}>
          <ContentItem item={item} onPress={handleContentPress} />
          <Top10Badge rank={index + 1} style={displayStyle} />
        </View>
      );
    },
    [handleContentPress, displayStyle]
  );

  // Memoize the ItemSeparatorComponent to prevent re-creation (responsive spacing)
  const separatorWidth = isTV ? 12 : isLargeTablet ? 10 : isTablet ? 8 : 8;
  const ItemSeparator = useCallback(
    () => <View style={{ width: separatorWidth }} />,
    [separatorWidth]
  );

  // Memoize the keyExtractor to prevent re-creation
  const keyExtractor = useCallback(
    (item: StreamingContent, index: number) => `top10-${item.id}-${index}`,
    []
  );

  if (!enabled) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  if (error || trending.length === 0) {
    return null;
  }

  return (
    <View style={styles.catalogContainer}>
      <View
        style={[
          styles.catalogHeader,
          { paddingHorizontal: isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16 },
        ]}
      >
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.catalogTitle,
              {
                color: currentTheme.colors.text,
                fontSize: isTV ? 28 : isLargeTablet ? 26 : isTablet ? 24 : 22,
              },
            ]}
            numberOfLines={1}
          >
            Top 10 {type === 'movie' ? 'Movies' : 'Series'}
          </Text>
          <View
            style={[
              styles.titleUnderline,
              {
                backgroundColor: currentTheme.colors.primary,
                width: isTV ? 64 : isLargeTablet ? 56 : isTablet ? 48 : 40,
                height: isTV ? 4 : isLargeTablet ? 3 : 3,
              },
            ]}
          />
        </View>
        <TouchableOpacity
          onPress={() => {
            triggerLight();
          }}
          style={[
            styles.viewAllButton,
            {
              paddingVertical: isTV ? 10 : isLargeTablet ? 9 : isTablet ? 8 : 8,
              paddingHorizontal: isTV ? 12 : isLargeTablet ? 11 : isTablet ? 10 : 10,
              borderRadius: isTV ? 22 : isLargeTablet ? 20 : isTablet ? 20 : 20,
            },
          ]}
        >
          <MaterialIcons
            name="trending-up"
            size={isTV ? 24 : isLargeTablet ? 22 : isTablet ? 20 : 20}
            color={currentTheme.colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={trending}
        renderItem={renderContentItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        scrollEnabled={true}
        nestedScrollEnabled={true}
        contentContainerStyle={StyleSheet.flatten([
          styles.catalogList,
          {
            paddingHorizontal: isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16,
            paddingRight:
              (isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16) -
              posterLayout.partialPosterWidth,
          },
        ])}
        ItemSeparatorComponent={ItemSeparator}
        removeClippedSubviews={true}
        initialNumToRender={isTV ? 6 : isLargeTablet ? 5 : isTablet ? 4 : 3}
        maxToRenderPerBatch={isTV ? 4 : isLargeTablet ? 4 : 3}
        windowSize={isTV ? 4 : isLargeTablet ? 4 : 3}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  catalogContainer: {
    marginBottom: 28,
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  catalogTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  catalogList: {
    paddingBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemWrapper: {
    position: 'relative',
  },
});

export default Top10Section;
