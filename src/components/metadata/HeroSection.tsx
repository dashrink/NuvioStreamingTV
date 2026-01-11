/**
 * HeroSection Component - Main hero section for content detail screens.
 * Composes sub-components for backdrop, trailer, title, actions, and progress.
 * @module HeroSection
 */

import React, { memo, useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, InteractionManager } from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useTraktContext } from '../../contexts/TraktContext';
import { useSettings } from '../../hooks/useSettings';
import { useTrailer } from '../../contexts/TrailerContext';
import TrailerPlayer from '../video/TrailerPlayer';
import {
  HeroBackButton,
  HeroGradientOverlay,
  HeroTitleCard,
  HeroGenres,
  HeroBackdrop,
  ActionButtons,
  WatchProgressDisplay,
  TrailerControls,
  useTrailerPlayback,
  useHeroAnimations,
} from './HeroSection/index';
import type { HeroSectionProps } from './HeroSection/types';

const HeroSection: React.FC<HeroSectionProps> = memo(({
  metadata,
  bannerImage,
  loadingBanner,
  scrollY,
  heroHeight,
  heroOpacity,
  logoOpacity,
  buttonsOpacity,
  buttonsTranslateY,
  watchProgressOpacity,
  watchProgress,
  onStableLogoUriChange,
  type,
  getEpisodeDetails,
  handleShowStreams,
  handleToggleLibrary,
  inLibrary,
  id,
  navigation,
  getPlayButtonText,
  setBannerImage,
  groupedEpisodes,
  dynamicBackgroundColor,
  handleBack,
  tmdbId,
  isAuthenticated,
  isInWatchlist,
  isInCollection,
  onToggleWatchlist,
  onToggleCollection,
}) => {
  const { currentTheme } = useTheme();
  const { isAuthenticated: isTraktAuthenticated } = useTraktContext();
  const { settings, updateSetting } = useSettings();
  const { isTrailerPlaying: globalTrailerPlaying } = useTrailer();

  const interactionComplete = useRef(false);
  const [shouldLoadSecondaryData, setShouldLoadSecondaryData] = useState(false);
  const imageOpacity = useSharedValue(1);
  const imageLoadOpacity = useSharedValue(0);

  const {
    trailerUrl,
    trailerLoading,
    trailerError,
    trailerPreloaded,
    trailerReady,
    trailerOpacity,
    thumbnailOpacity,
    actionButtonsOpacity,
    titleCardTranslateY,
    genreOpacity,
    trailerVideoRef,
    handleTrailerPreloaded,
    handleTrailerReady,
    handleTrailerError,
    handleTrailerEnd,
    handleFullscreenToggle,
  } = useTrailerPlayback({
    metadata,
    tmdbId,
    type,
    scrollY,
    heroHeight,
    showTrailers: settings?.showTrailers ?? false,
    watchProgressOpacity,
    buttonsOpacity,
  });

  const {
    heroAnimatedStyle,
    logoAnimatedStyle,
    buttonsAnimatedStyle,
    titleCardAnimatedStyle,
    genreAnimatedStyle,
    watchProgressAnimatedStyle,
    trailerParallaxStyle,
  } = useHeroAnimations({
    scrollY,
    heroHeight,
    heroOpacity,
    logoOpacity,
    logoLoadOpacity: imageLoadOpacity,
    buttonsOpacity,
    buttonsTranslateY,
    watchProgressOpacity,
    imageOpacity,
    imageLoadOpacity,
    actionButtonsOpacity,
    titleCardTranslateY,
    genreOpacity,
    watchProgress,
  });

  const playButtonText = useMemo(() => getPlayButtonText(), [getPlayButtonText]);
  const trailerMuted = settings?.trailerMuted ?? true;
  const isWatched = useMemo(() => {
    if (!watchProgress) return false;
    if (isTraktAuthenticated && watchProgress.traktProgress !== undefined) {
      return watchProgress.traktProgress >= 95;
    }
    if (watchProgress.duration === 0) return false;
    return (watchProgress.currentTime / watchProgress.duration) * 100 >= 85;
  }, [watchProgress, isTraktAuthenticated]);

  useEffect(() => {
    const timer = InteractionManager.runAfterInteractions(() => {
      if (!interactionComplete.current) {
        interactionComplete.current = true;
        setShouldLoadSecondaryData(true);
      }
    });
    return () => timer.cancel();
  }, []);

  const handleToggleMute = useCallback(() => {
    const newMuted = !trailerMuted;
    updateSetting('trailerMuted', newMuted);
    const opacity = newMuted ? 1 : 0;
    const translateY = newMuted ? 0 : 100;
    actionButtonsOpacity.value = withTiming(opacity, { duration: 300 });
    genreOpacity.value = withTiming(opacity, { duration: 300 });
    titleCardTranslateY.value = withTiming(translateY, { duration: 300 });
    watchProgressOpacity.value = withTiming(opacity, { duration: 300 });
  }, [trailerMuted, updateSetting, actionButtonsOpacity, genreOpacity, titleCardTranslateY, watchProgressOpacity]);

  const handleAIChat = useCallback(() => {
    let episodeData = null;
    if (type === 'series' && watchProgress?.episodeId) {
      const parts = watchProgress.episodeId.split(':');
      if (parts.length >= 3) {
        episodeData = {
          seasonNumber: parseInt(parts[1], 10),
          episodeNumber: parseInt(parts[2], 10),
        };
      }
    }
    navigation.navigate('AIChat', {
      contentId: id,
      contentType: type,
      episodeId: episodeData && watchProgress ? watchProgress.episodeId : undefined,
      seasonNumber: episodeData?.seasonNumber,
      episodeNumber: episodeData?.episodeNumber,
      title: metadata?.name || metadata?.title || 'Unknown',
    });
  }, [type, watchProgress, navigation, id, metadata]);

  return (
    <View style={styles.heroWrapper}>
      <Animated.View style={[styles.heroSection, heroAnimatedStyle]}>
        <View style={[styles.absoluteFill, { backgroundColor: currentTheme.colors.black }]} />

        {shouldLoadSecondaryData && bannerImage && !loadingBanner && (
          <Animated.View style={[styles.absoluteFill, { opacity: thumbnailOpacity }]}>
            <HeroBackdrop
              bannerImage={bannerImage}
              loadingBanner={loadingBanner}
              scrollY={scrollY}
            />
          </Animated.View>
        )}

        {shouldLoadSecondaryData && settings?.showTrailers && trailerUrl && !trailerLoading && !trailerError && !trailerPreloaded && (
          <View style={[styles.absoluteFill, { opacity: 0, pointerEvents: 'none' }]}>
            <TrailerPlayer
              key={`preload-${trailerUrl}`}
              trailerUrl={trailerUrl}
              autoPlay={false}
              muted={true}
              style={styles.absoluteFill}
              hideLoadingSpinner={true}
              onLoad={handleTrailerPreloaded}
              onError={handleTrailerError}
            />
          </View>
        )}

        {shouldLoadSecondaryData && settings?.showTrailers && trailerUrl && !trailerLoading && !trailerError && trailerPreloaded && (
          <Animated.View style={[styles.absoluteFill, { opacity: trailerOpacity }, trailerParallaxStyle]}>
            <TrailerPlayer
              key={`visible-${trailerUrl}`}
              ref={trailerVideoRef}
              trailerUrl={trailerUrl}
              autoPlay={globalTrailerPlaying}
              muted={trailerMuted}
              style={styles.absoluteFill}
              hideLoadingSpinner={true}
              hideControls={true}
              onFullscreenToggle={handleFullscreenToggle}
              onLoad={handleTrailerReady}
              onError={handleTrailerError}
              onEnd={handleTrailerEnd}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded && !trailerReady) {
                  handleTrailerReady();
                }
              }}
            />
          </Animated.View>
        )}

        {settings?.showTrailers && trailerReady && trailerUrl && (
          <TrailerControls
            isMuted={trailerMuted}
            onToggleMute={handleToggleMute}
            onFullscreen={handleFullscreenToggle}
            onAIChat={settings?.aiChatEnabled ? handleAIChat : undefined}
            animatedStyle={{ opacity: trailerOpacity }}
          />
        )}

        {settings?.aiChatEnabled && !(settings?.showTrailers && trailerReady && trailerUrl) && (
          <TrailerControls
            isMuted={true}
            onToggleMute={() => {}}
            onFullscreen={() => {}}
            onAIChat={handleAIChat}
          />
        )}

        <HeroBackButton onPress={handleBack} />

        <HeroGradientOverlay dynamicBackgroundColor={dynamicBackgroundColor}>
          <Animated.View style={titleCardAnimatedStyle}>
            <HeroTitleCard
              metadata={metadata}
              type={type}
              tmdbId={tmdbId}
              logoOpacity={logoOpacity}
              onStableLogoUriChange={onStableLogoUriChange}
            />
          </Animated.View>

          <WatchProgressDisplay
            watchProgress={watchProgress}
            type={type}
            getEpisodeDetails={getEpisodeDetails}
            animatedStyle={watchProgressAnimatedStyle}
            isWatched={isWatched}
            isTrailerPlaying={globalTrailerPlaying}
            trailerMuted={trailerMuted}
            trailerReady={trailerReady}
          />

          {shouldLoadSecondaryData && metadata?.genres?.length > 0 && (
            <HeroGenres
              genres={metadata.genres}
              animatedStyle={genreAnimatedStyle}
            />
          )}

          <ActionButtons
            handleShowStreams={handleShowStreams}
            toggleLibrary={handleToggleLibrary}
            inLibrary={inLibrary}
            type={type}
            id={id}
            navigation={navigation}
            playButtonText={playButtonText}
            animatedStyle={buttonsAnimatedStyle}
            isWatched={isWatched}
            watchProgress={watchProgress}
            groupedEpisodes={groupedEpisodes}
            metadata={metadata}
            settings={settings}
            isAuthenticated={isAuthenticated}
            isInWatchlist={isInWatchlist}
            isInCollection={isInCollection}
            onToggleWatchlist={onToggleWatchlist}
            onToggleCollection={onToggleCollection}
          />
        </HeroGradientOverlay>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  heroWrapper: { width: '100%', marginTop: -150, paddingTop: 150, overflow: 'hidden' },
  heroSection: { width: '100%', backgroundColor: '#000', overflow: 'visible' },
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});

export default HeroSection;
