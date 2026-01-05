import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, FlatList, FlatListProps } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CatalogContent, StreamingContent } from '../../services/catalogService';
import { useTheme } from '../../contexts/ThemeContext';
import ContentItem from './ContentItem';
import Focusable from '../common/Focusable';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { RootStackParamList } from '../../navigation/AppNavigator';

interface CatalogSectionProps {
  catalog: CatalogContent;
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
  // Always treat TV devices as 'tv' regardless of reported dp width
  if (Platform.isTV) return 'tv';
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
  const MIN_POSTER_WIDTH = 100; // Reduced minimum for more posters
  const MAX_POSTER_WIDTH = 130; // Reduced maximum for more posters
  const LEFT_PADDING = 16; // Left padding
  const SPACING = 8; // Space between posters

  // Calculate available width for posters (reserve space for left padding)
  const availableWidth = screenWidth - LEFT_PADDING;

  // Try different numbers of full posters to find the best fit
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
    partialPosterWidth: bestLayout.posterWidth * 0.25 // 1/4 of next poster
  };
};

const posterLayout = calculatePosterLayout(width);
const POSTER_WIDTH = posterLayout.posterWidth;
const separatorWidth = isTV ? 12 : isLargeTablet ? 10 : isTablet ? 8 : 8;

const CatalogSection = ({ catalog }: CatalogSectionProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const flatListRef = useRef<FlatList<StreamingContent>>(null);

  // Debug: log catalog name to understand what's happening
  const catalogTitle = catalog.name || catalog.id || 'Movies';
  if (__DEV__ && isTV) {
    console.log('[CatalogSection] Rendering catalog:', { name: catalog.name, id: catalog.id, displayTitle: catalogTitle });
  }

  const handleContentPress = useCallback((id: string, type: string) => {
    navigation.navigate('Metadata', { id, type, addonId: catalog.addon });
  }, [navigation, catalog.addon]);

  // Handle focus change on TV - scroll to bring focused item into view
  const handleItemFocus = useCallback((index: number) => {
    if (Platform.isTV && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.15, // Slight offset so item is not at edge
      });
    }
  }, []);

  // Provide accurate item layout for smooth scrolling
  const getItemLayout = useCallback((_data: ArrayLike<StreamingContent> | null | undefined, index: number) => ({
    length: POSTER_WIDTH + separatorWidth,
    offset: (POSTER_WIDTH + separatorWidth) * index,
    index,
  }), []);

  // Handle scroll to index failures gracefully
  const onScrollToIndexFailed = useCallback((info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
    flatListRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: true,
    });
  }, []);

  const renderContentItem = useCallback(({ item, index }: { item: StreamingContent, index: number }) => {
    return (
      <ContentItem
        item={item}
        index={index}
        onPress={handleContentPress}
        onItemFocus={handleItemFocus}
      />
    );
  }, [handleContentPress, handleItemFocus]);

  // Memoize the ItemSeparatorComponent to prevent re-creation (responsive spacing)
  const ItemSeparator = useCallback(() => <View style={{ width: separatorWidth }} />, []);

  // Memoize the keyExtractor to prevent re-creation
  const keyExtractor = useCallback((item: StreamingContent) => `${item.id}-${item.type}`, []);

  return (
    <View
      style={styles.catalogContainer}
    >
      <View style={[
        styles.catalogHeader,
        { paddingHorizontal: isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16 }
      ]}>
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.catalogTitle,
              {
                color: currentTheme.colors.text,
                fontSize: isTV ? 28 : isLargeTablet ? 26 : isTablet ? 24 : 22,
              }
            ]}
            numberOfLines={1}
          >
            {catalogTitle}
          </Text>
          <View
            style={[
              styles.titleUnderline,
              {
                backgroundColor: currentTheme.colors.primary,
                width: isTV ? 64 : isLargeTablet ? 56 : isTablet ? 48 : 40,
                height: isTV ? 4 : isLargeTablet ? 3 : 3,
              }
            ]}
          />
        </View>
        <Focusable
          onPress={() =>
            navigation.navigate('Catalog', {
              id: catalog.id,
              type: catalog.type,
              addonId: catalog.addon
            })
          }
          style={[
            styles.viewAllButton,
            {
              paddingVertical: isTV ? 10 : isLargeTablet ? 9 : isTablet ? 8 : 8,
              paddingHorizontal: isTV ? 12 : isLargeTablet ? 11 : isTablet ? 10 : 10,
              borderRadius: isTV ? 22 : isLargeTablet ? 20 : isTablet ? 20 : 20,
            }
          ]}
        >
          <Text style={[
            styles.viewAllText,
            {
              color: currentTheme.colors.textMuted,
              fontSize: isTV ? 16 : isLargeTablet ? 15 : isTablet ? 14 : 14,
              marginRight: isTV ? 6 : isLargeTablet ? 5 : 4,
            }
          ]}>View All</Text>
          <MaterialIcons
            name="chevron-right"
            size={isTV ? 24 : isLargeTablet ? 22 : isTablet ? 20 : 20}
            color={currentTheme.colors.textMuted}
          />
        </Focusable>
      </View>

      <FlatList
        ref={flatListRef}
        data={catalog.items}
        renderItem={renderContentItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={POSTER_WIDTH + separatorWidth}
        snapToAlignment="start"
        scrollEnabled={!Platform.isTV}
        nestedScrollEnabled={true}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        contentContainerStyle={StyleSheet.flatten([
          styles.catalogList,
          {
            paddingHorizontal: isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16,
            paddingRight: (isTV ? 32 : isLargeTablet ? 28 : isTablet ? 24 : 16) - posterLayout.partialPosterWidth,
          }
        ])}
        ItemSeparatorComponent={ItemSeparator}
        removeClippedSubviews={true}
        initialNumToRender={isTV ? 6 : isLargeTablet ? 5 : isTablet ? 4 : 3}
        maxToRenderPerBatch={isTV ? 4 : isLargeTablet ? 4 : 3}
        windowSize={isTV ? 4 : isLargeTablet ? 4 : 3}
        updateCellsBatchingPeriod={50}
      />
    </View >
  );
};

const styles = StyleSheet.create({
  catalogContainer: {
    marginBottom: 28,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    position: 'relative',
    flex: 1,
    marginRight: 16,
  },
  catalogTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    width: 40,
    height: 3,
    borderRadius: 2,
    opacity: 0.8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  catalogList: {
  },
});

export default React.memo(CatalogSection, (prevProps, nextProps) => {
  return (
    prevProps.catalog.addon === nextProps.catalog.addon &&
    prevProps.catalog.id === nextProps.catalog.id &&
    prevProps.catalog.name === nextProps.catalog.name &&
    prevProps.catalog.items.length === nextProps.catalog.items.length &&
    prevProps.catalog.items.slice(0, 3).every((item, index) =>
      nextProps.catalog.items[index] &&
      item.id === nextProps.catalog.items[index].id &&
      item.poster === nextProps.catalog.items[index].poster
    )
  );
});