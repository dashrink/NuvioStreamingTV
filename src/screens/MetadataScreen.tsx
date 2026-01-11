import React, { useCallback, useState, useEffect, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  InteractionManager,
  BackHandler,
  Platform,
  Alert,
} from 'react-native';
import Focusable from '../components/common/Focusable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useTraktContext } from '../contexts/TraktContext';
import { useMetadata } from '../hooks/useMetadata';
import { useDominantColor, preloadDominantColor } from '../hooks/useDominantColor';
import { CastSection } from '../components/metadata/CastSection';
import { CastDetailsModal } from '../components/metadata/CastDetailsModal';
import { SeriesContent } from '../components/metadata/SeriesContent';
import { MovieContent } from '../components/metadata/MovieContent';
import { MoreLikeThisSection } from '../components/metadata/MoreLikeThisSection';
import { RatingsSection } from '../components/metadata/RatingsSection';
import { CommentsSection, CommentBottomSheet } from '../components/metadata/CommentsSection';
import TrailersSection from '../components/metadata/TrailersSection';
import CollectionSection from '../components/metadata/CollectionSection';
import { RouteParams, Episode } from '../types/metadata';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  useSharedValue,
  withTiming,
  runOnJS,
  runOnUI,
  Easing,
  interpolateColor,
  withSpring,
  createAnimatedComponent,
} from 'react-native-reanimated';

// Create animated version of SafeAreaView for use with Reanimated styles
const AnimatedSafeAreaView = createAnimatedComponent(SafeAreaView);
import { RouteProp } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../hooks/useSettings';
import { MetadataLoadingScreen, MetadataLoadingScreenRef } from '../components/loading/MetadataLoadingScreen';
import { useTrailer } from '../contexts/TrailerContext';
import FastImage from '@d11/react-native-fast-image';

// Import our optimized components and hooks
import HeroSection from '../components/metadata/HeroSection';
import FloatingHeader from '../components/metadata/FloatingHeader';
import MetadataDetails from '../components/metadata/MetadataDetails';
import { useMetadataAnimations } from '../hooks/useMetadataAnimations';
import { useMetadataAssets } from '../hooks/useMetadataAssets';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { TraktService, TraktPlaybackItem } from '../services/traktService';
import { tmdbService } from '../services/tmdbService';
import { catalogService } from '../services/catalogService';
import { TraktRatingModal } from '../components/trakt';

const { height } = Dimensions.get('window');

// Memoized components for better performance
const MemoizedCastSection = memo(CastSection);
const MemoizedSeriesContent = memo(SeriesContent);
const MemoizedMovieContent = memo(MovieContent);
const MemoizedMoreLikeThisSection = memo(MoreLikeThisSection);
// Enhanced responsive breakpoints for Metadata Screen
const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

const MemoizedRatingsSection = memo(RatingsSection);
const MemoizedCommentsSection = memo(CommentsSection);
const MemoizedCastDetailsModal = memo(CastDetailsModal);

const MetadataScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams & { episodeId?: string; addonId?: string }>, string>>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { id, type, episodeId, addonId } = route.params;

  // Log route parameters for debugging
  React.useEffect(() => {
    console.log('🔍 [MetadataScreen] Route params:', { id, type, episodeId, addonId });
  }, [id, type, episodeId, addonId]);

  // Consolidated hooks for better performance
  const { settings } = useSettings();
  const { currentTheme } = useTheme();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { pauseTrailer } = useTrailer();

  // Trakt integration
  const { isAuthenticated, isInWatchlist, isInCollection, addToWatchlist, removeFromWatchlist, addToCollection, removeFromCollection } = useTraktContext();

  // Enhanced responsive sizing for tablets and TV screens
  const deviceWidth = Dimensions.get('window').width;
  const deviceHeight = Dimensions.get('window').height;

  // Determine device type based on width
  const getDeviceType = useCallback(() => {
    if (deviceWidth >= BREAKPOINTS.tv) return 'tv';
    if (deviceWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
    if (deviceWidth >= BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
  }, [deviceWidth]);

  const deviceType = getDeviceType();
  const isTablet = deviceType === 'tablet';
  const isLargeTablet = deviceType === 'largeTablet';
  const isTV = deviceType === 'tv';
  const isLargeScreen = isTablet || isLargeTablet || isTV;

  // Enhanced spacing and padding for production sections
  const horizontalPadding = useMemo(() => {
    switch (deviceType) {
      case 'tv':
        return 32;
      case 'largeTablet':
        return 28;
      case 'tablet':
        return 24;
      default:
        return 16; // phone
    }
  }, [deviceType]);

  // Optimized state management - reduced state variables
  const [isContentReady, setIsContentReady] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  const [shouldLoadSecondaryData, setShouldLoadSecondaryData] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  // Source switching removed
  const transitionOpacity = useSharedValue(1);
  const interactionComplete = useRef(false);

  // Animation values for network/production sections
  const networkSectionOpacity = useSharedValue(0);
  const productionSectionOpacity = useSharedValue(0);

  // Comment bottom sheet state
  const [commentBottomSheetVisible, setCommentBottomSheetVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  // Trakt Rating Modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const loadingScreenRef = useRef<MetadataLoadingScreenRef>(null);
  const [loadingScreenExited, setLoadingScreenExited] = useState(false);
  // Delay flag to show sections 800ms after cast is rendered (if present)
  const [postCastDelayDone, setPostCastDelayDone] = useState(false);


  // Debug state changes
  React.useEffect(() => {
    console.log('MetadataScreen: commentBottomSheetVisible changed to:', commentBottomSheetVisible);
  }, [commentBottomSheetVisible]);

  React.useEffect(() => {
    console.log('MetadataScreen: selectedComment changed to:', selectedComment?.id);
  }, [selectedComment]);

  const {
    metadata,
    loading,
    error: metadataError,
    cast,
    loadingCast,
    episodes,
    selectedSeason,
    loadingSeasons,
    loadMetadata,
    handleSeasonChange,
    toggleLibrary,
    inLibrary,
    groupedEpisodes,
    recommendations,
    loadingRecommendations,
    setMetadata,
    imdbId,
    tmdbId,
    collectionMovies,
    loadingCollection,
  } = useMetadata({ id, type, addonId });


  // Log useMetadata hook state changes for debugging
  React.useEffect(() => {
    console.log('🔍 [MetadataScreen] useMetadata state:', {
      loading,
      hasMetadata: !!metadata,
      metadataId: metadata?.id,
      metadataName: metadata?.name,
      error: metadataError,
      hasCast: cast.length > 0,
      hasEpisodes: episodes.length > 0,
      seasonsCount: Object.keys(groupedEpisodes).length,
      imdbId,
      tmdbId,
      hasNetworks: !!(metadata as any)?.networks,
      networksCount: metadata?.networks ? metadata.networks.length : 0
    });
  }, [loading, metadata, metadataError, cast.length, episodes.length, Object.keys(groupedEpisodes).length, imdbId, tmdbId]);

  // Animate network section when data becomes available (for series)
  useEffect(() => {
    const hasNetworks = metadata?.networks && metadata.networks.length > 0;
    const hasDescription = !!metadata?.description;
    const isSeries = Object.keys(groupedEpisodes).length > 0;
    // Defer showing until cast (if any) has finished fetching and 800ms delay elapsed
    const shouldShow = shouldLoadSecondaryData && postCastDelayDone && hasNetworks && hasDescription && isSeries;

    if (shouldShow && networkSectionOpacity.value === 0) {
      networkSectionOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [metadata?.networks, metadata?.description, Object.keys(groupedEpisodes).length, shouldLoadSecondaryData, postCastDelayDone, networkSectionOpacity]);

  // Animate production section when data becomes available (for movies)
  useEffect(() => {
    const hasNetworks = metadata?.networks && metadata.networks.length > 0;
    const hasDescription = !!metadata?.description;
    const isMovie = Object.keys(groupedEpisodes).length === 0;
    // Defer showing until cast (if any) has finished fetching and 800ms delay elapsed
    const shouldShow = shouldLoadSecondaryData && postCastDelayDone && hasNetworks && hasDescription && isMovie;

    if (shouldShow && productionSectionOpacity.value === 0) {
      productionSectionOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [metadata?.networks, metadata?.description, Object.keys(groupedEpisodes).length, shouldLoadSecondaryData, postCastDelayDone, productionSectionOpacity]);

  // Manage 800ms delay after cast finishes loading (only if cast is present)
  useEffect(() => {
    if (!shouldLoadSecondaryData) {
      setPostCastDelayDone(false);
      return;
    }

    if (!loadingCast) {
      if (cast && cast.length > 0) {
        setPostCastDelayDone(false);
        const t = setTimeout(() => setPostCastDelayDone(true), 200);
        return () => clearTimeout(t);
      } else {
        // If no cast present, no need to delay
        setPostCastDelayDone(true);
      }
    } else {
      // Reset while cast is loading
      setPostCastDelayDone(false);
    }
  }, [loadingCast, cast.length, shouldLoadSecondaryData]);

  // Optimized hooks with memoization and conditional loading
  const watchProgressData = useWatchProgress(id, Object.keys(groupedEpisodes).length > 0 ? 'series' : type as 'movie' | 'series', episodeId, episodes);
  const assetData = useMetadataAssets(metadata, id, type, imdbId, settings, setMetadata);
  const animations = useMetadataAnimations(safeAreaTop, watchProgressData.watchProgress);

  // Stable logo URI from HeroSection
  const [stableLogoUri, setStableLogoUri] = React.useState<string | null>(null);

  // Extract dominant color from hero image for dynamic background
  const heroImageUri = useMemo(() => {
    if (!settings.useDominantBackgroundColor) return null;
    if (!metadata) return null;
    return assetData.bannerImage || metadata.banner || metadata.poster || null;
  }, [settings.useDominantBackgroundColor, metadata, assetData.bannerImage]);

  // Preload color extraction as soon as we have the URI
  useEffect(() => {
    if (heroImageUri) {
      InteractionManager.runAfterInteractions(() => {
        preloadDominantColor(heroImageUri);
      });
    }
  }, [heroImageUri]);

  const { dominantColor, loading: colorLoading } = useDominantColor(heroImageUri);

  // Create shared values for smooth color interpolation
  const bgFromColor = useSharedValue(currentTheme.colors.darkBackground);
  const bgToColor = useSharedValue(currentTheme.colors.darkBackground);
  const bgProgress = useSharedValue(1);

  // Update the shared value when dominant color changes
  const hasAnimatedInitialColorRef = useRef(false);
  useEffect(() => {
    const base = currentTheme.colors.darkBackground;
    const target = (settings.useDominantBackgroundColor && dominantColor && dominantColor !== '#1a1a1a' && dominantColor !== null)
      ? dominantColor
      : base;

    if (!hasAnimatedInitialColorRef.current) {
      // Initial: animate from base to target smoothly
      bgFromColor.value = base as any;
      bgToColor.value = target as any;
      bgProgress.value = 0;
      bgProgress.value = withSpring(1, {
        damping: 30,
        stiffness: 90,
      });
      hasAnimatedInitialColorRef.current = true;
      return;
    }

    // Subsequent updates: retarget smoothly from the current on-screen color
    runOnUI(() => {
      'worklet';
      const current = interpolateColor(
        bgProgress.value,
        [0, 1],
        [bgFromColor.value as any, bgToColor.value as any]
      );
      bgFromColor.value = current as any;
      bgToColor.value = target as any;
      bgProgress.value = 0;
      bgProgress.value = withSpring(1, {
        damping: 30,
        stiffness: 90,
      });
    })();
  }, [dominantColor, currentTheme.colors.darkBackground, settings.useDominantBackgroundColor]);

  // Create an animated style for the background color
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      bgProgress.value,
      [0, 1],
      [bgFromColor.value as any, bgToColor.value as any]
    );
    return { backgroundColor: color as any };
  });

  // Animated styles for network and production sections
  const networkSectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: networkSectionOpacity.value,
  }));

  const productionSectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: productionSectionOpacity.value,
  }));

  // For compatibility with existing code, maintain the static value as well
  const dynamicBackgroundColor = useMemo(() => {
    if (settings.useDominantBackgroundColor && dominantColor && dominantColor !== '#1a1a1a' && dominantColor !== null && dominantColor !== currentTheme.colors.darkBackground) {
      return dominantColor;
    }
    return currentTheme.colors.darkBackground;
  }, [dominantColor, currentTheme.colors.darkBackground, settings.useDominantBackgroundColor]);

  // Debug logging for color extraction timing
  useEffect(() => {
    if (__DEV__ && heroImageUri && dominantColor) {
      if (__DEV__) console.log('[MetadataScreen] Dynamic background color:', {
        dominantColor,
        fallback: currentTheme.colors.darkBackground,
        finalColor: dynamicBackgroundColor,
        heroImageUri
      });
    }
  }, [dominantColor, dynamicBackgroundColor, heroImageUri, currentTheme.colors.darkBackground]);

  // Focus effect for performance optimization
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      // Delay secondary data loading until interactions are complete
      const timer = setTimeout(() => {
        if (!interactionComplete.current) {
          InteractionManager.runAfterInteractions(() => {
            setShouldLoadSecondaryData(true);
            interactionComplete.current = true;
          });
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Handle back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        pauseTrailer();
        navigation.goBack();
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation, pauseTrailer])
  );

  // Load metadata on mount and when id changes
  useEffect(() => {
    if (id && type) {
      loadMetadata();
    }
  }, [id, type, loadMetadata]);

  // Preload dominant color when route changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      setIsContentReady(false);
      setShowCastModal(false);
      setSelectedCastMember(null);
      setShouldLoadSecondaryData(false);
      setCommentBottomSheetVisible(false);
      setSelectedComment(null);
      setRevealedSpoilers(new Set());
      setShowRatingModal(false);
    });

    return unsubscribe;
  }, [navigation]);

  // Update loading screen state on metadata load completion
  useEffect(() => {
    if (!loading && loadingScreenRef.current && !loadingScreenExited) {
      loadingScreenRef.current.exit(() => {
        setLoadingScreenExited(true);
        setIsContentReady(true);
      });
    }
  }, [loading, loadingScreenExited]);

  // Memoized scroll handler
  const handleScroll = useCallback((event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    const scrollThreshold = 100;

    if (offset > scrollThreshold) {
      animations.headerOpacity.value = withTiming(1, { duration: 200 });
      animations.contentOpacity.value = withTiming(0.8, { duration: 200 });
    } else {
      animations.headerOpacity.value = withTiming(0, { duration: 200 });
      animations.contentOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [animations.headerOpacity, animations.contentOpacity]);

  if (loading || !isContentReady) {
    return (
      <MetadataLoadingScreen ref={loadingScreenRef} isSeries={Object.keys(groupedEpisodes).length > 0} />
    );
  }

  if (metadataError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicBackgroundColor }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={currentTheme.colors.error} />
          <Text style={[styles.errorText, { color: currentTheme.colors.text }]}>
            {metadataError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={() => {
              setIsContentReady(false);
              loadMetadata();
            }}
          >
            <Text style={[styles.retryButtonText, { color: currentTheme.colors.background }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedBackgroundStyle]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.ScrollView
          scrollEventThrottle={16}
          onScroll={handleScroll}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section with poster and basic info */}
          <HeroSection
            metadata={metadata}
            onShowDetails={() => setIsContentReady(true)}
            onLogoLoad={setStableLogoUri}
            bannerImage={assetData.bannerImage}
          />

          {/* Floating header for smooth transitions */}
          <FloatingHeader
            logoUri={stableLogoUri}
            metadata={metadata}
            opacity={animations.headerOpacity}
          />

          {/* Metadatadetails and quick actions */}
          <MetadataDetails
            metadata={metadata}
            watchProgress={watchProgressData.watchProgress}
            onWatchlistPress={() => {
              if (isInWatchlist(id, type)) {
                removeFromWatchlist(id, type);
              } else {
                addToWatchlist(id, type, metadata?.name || '', metadata?.poster || '');
              }
            }}
            onCollectionPress={() => {
              if (isInCollection(id, type)) {
                removeFromCollection(id, type);
              } else {
                addToCollection(id, type, metadata?.name || '', metadata?.poster || '');
              }
            }}
            onRatingPress={() => setShowRatingModal(true)}
            isInWatchlist={isInWatchlist(id, type)}
            isInCollection={isInCollection(id, type)}
            isAuthenticated={isAuthenticated}
          />

          {/* Ratings section */}
          {metadata && (
            <MemoizedRatingsSection
              metadata={metadata}
              imdbId={imdbId}
              tmdbId={tmdbId}
            />
          )}

          {/* Trailers section */}
          {metadata && (
            <TrailersSection
              imdbId={imdbId}
              tmdbId={tmdbId}
              title={metadata.name}
            />
          )}

          {/* Cast section */}
          {cast.length > 0 && isScreenFocused && (
            <MemoizedCastSection
              cast={cast}
              loading={loadingCast}
              onCastPress={(castMember) => {
                setSelectedCastMember(castMember);
                setShowCastModal(true);
              }}
            />
          )}

          {/* Series-specific content (episodes, seasons, networks) */}
          {Object.keys(groupedEpisodes).length > 0 ? (
            <>
              <MemoizedSeriesContent
                episodes={groupedEpisodes}
                selectedSeason={selectedSeason}
                onSeasonChange={handleSeasonChange}
                loadingSeasons={loadingSeasons}
                metadata={metadata}
              />

              {/* Networks section for series */}
              {metadata?.networks && metadata.networks.length > 0 && (
                <Animated.View style={[styles.section, networkSectionAnimatedStyle]}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
                    Networks
                  </Text>
                  <View style={styles.networksContainer}>
                    {metadata.networks.map((network, index) => (
                      <View key={index} style={styles.networkItem}>
                        <Text style={[styles.networkText, { color: currentTheme.colors.text }]}>
                          {network}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}
            </>
          ) : (
            <>
              <MemoizedMovieContent
                metadata={metadata}
                inLibrary={inLibrary}
                onToggleLibrary={toggleLibrary}
              />

              {/* Production section for movies */}
              {metadata?.networks && metadata.networks.length > 0 && (
                <Animated.View style={[styles.section, productionSectionAnimatedStyle]}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
                    Production
                  </Text>
                  <View style={styles.productionContainer}>
                    {metadata.networks.map((company, index) => (
                      <View key={index} style={styles.productionItem}>
                        <Text style={[styles.productionText, { color: currentTheme.colors.text }]}>
                          {company}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}
            </>
          )}

          {/* Collection section */}
          {collectionMovies && collectionMovies.length > 0 && (
            <CollectionSection
              movies={collectionMovies}
              loading={loadingCollection}
              onMoviePress={(movieId) => {
                navigation.navigate('Metadata', { id: movieId, type: 'movie' });
              }}
            />
          )}

          {/* More like this section */}
          {recommendations && recommendations.length > 0 && (
            <MemoizedMoreLikeThisSection
              recommendations={recommendations}
              currentId={id}
              loading={loadingRecommendations}
              onItemPress={(itemId, itemType) => {
                navigation.push('Metadata', { id: itemId, type: itemType });
              }}
            />
          )}

          {/* Comments section */}
          {metadata && (
            <MemoizedCommentsSection
              contentId={id}
              contentType={type}
              onCommentPress={(comment) => {
                setSelectedComment(comment);
                setCommentBottomSheetVisible(true);
              }}
              onSpoilerReveal={(commentId) => {
                setRevealedSpoilers(prev => new Set([...prev, commentId]));
              }}
              revealedSpoilers={revealedSpoilers}
            />
          )}
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Cast details modal */}
      {showCastModal && selectedCastMember && (
        <MemoizedCastDetailsModal
          castMember={selectedCastMember}
          visible={showCastModal}
          onClose={() => {
            setShowCastModal(false);
            setSelectedCastMember(null);
          }}
        />
      )}

      {/* Comments bottom sheet */}
      {selectedComment && (
        <CommentBottomSheet
          visible={commentBottomSheetVisible}
          onClose={() => {
            setCommentBottomSheetVisible(false);
            setSelectedComment(null);
          }}
          comment={selectedComment}
          onSpoilerReveal={() => {
            setRevealedSpoilers(prev => new Set([...prev, selectedComment.id]));
          }}
          isSpoilerRevealed={revealedSpoilers.has(selectedComment.id)}
        />
      )}

      {/* Trakt Rating Modal */}
      {showRatingModal && metadata && (
        <TraktRatingModal
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          contentId={id}
          contentType={type}
          contentTitle={metadata.name}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  networksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  networkItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  networkText: {
    fontSize: 13,
  },
  productionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productionItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  productionText: {
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MetadataScreen;