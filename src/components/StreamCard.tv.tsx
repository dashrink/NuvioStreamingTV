/**
 * StreamCard.tv.tsx
 *
 * TV-specific stream selection card component with D-pad focusability,
 * visible focus states, and long-press context menu support.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - D-pad focusable via Focusable wrapper
 * - Visible focus states with scale animation (1.0-1.03)
 * - Long-press (300ms+) triggers TV context menu with Copy URL, Download options
 * - Short press plays the stream
 * - Download button separately focusable for TV navigation
 * - Integration with TVNavigationContext for focus tracking
 * - tvParallaxProperties for Apple TV depth effects
 * - Proper focus order: card -> download button (horizontal navigation)
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Clipboard,
  Image,
  findNodeHandle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import FastImage from '@d11/react-native-fast-image';
import { Stream } from '../types/metadata';
import QualityBadge from './metadata/QualityBadge';
import { useSettings } from '../hooks/useSettings';
import { useDownloads } from '../contexts/DownloadsContext';
import { useToast } from '../contexts/ToastContext';
import Focusable, { FocusableRef } from './common/Focusable';
import { useContextMenu } from '../hooks/useContextMenu';
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';

interface StreamCardProps {
  stream: Stream;
  onPress: () => void;
  index: number;
  isLoading?: boolean;
  statusMessage?: string;
  theme: any;
  showLogos?: boolean;
  scraperLogo?: string | null;
  showAlert: (title: string, message: string) => void;
  parentTitle?: string;
  parentType?: 'movie' | 'series';
  parentSeason?: number;
  parentEpisode?: number;
  parentEpisodeTitle?: string;
  parentPosterUrl?: string | null;
  providerName?: string;
  parentId?: string;
  parentImdbId?: string;
  /** Unique focus ID for TV navigation tracking */
  focusId?: string;
  /** Whether this item should receive initial TV focus */
  hasTVPreferredFocus?: boolean;
  /** Callback when this card receives TV focus */
  onFocus?: () => void;
  /** Callback when this card loses TV focus */
  onBlur?: () => void;
  /** Next focus configuration for D-pad navigation */
  nextFocusUp?: number | React.RefObject<any>;
  nextFocusDown?: number | React.RefObject<any>;
  nextFocusLeft?: number | React.RefObject<any>;
  nextFocusRight?: number | React.RefObject<any>;
}

const StreamCard = memo(({
  stream,
  onPress,
  index,
  isLoading,
  statusMessage,
  theme,
  showLogos,
  scraperLogo,
  showAlert,
  parentTitle,
  parentType,
  parentSeason,
  parentEpisode,
  parentEpisodeTitle,
  parentPosterUrl,
  providerName,
  parentId,
  parentImdbId,
  focusId,
  hasTVPreferredFocus = false,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  nextFocusUp,
  nextFocusDown,
  nextFocusLeft,
  nextFocusRight,
}: StreamCardProps) => {
  const { settings } = useSettings();
  const { startDownload } = useDownloads();
  const { showSuccess, showInfo, showError } = useToast();

  // TV Navigation context for focus tracking
  const tvNav = useTVNavigationOptional();

  // TV Context Menu hook
  const { openContextMenu, isAvailable: isContextMenuAvailable } = useContextMenu();

  // Refs for focus navigation between card and download button
  const cardRef = useRef<FocusableRef>(null);
  const downloadButtonRef = useRef<FocusableRef>(null);

  // Generate unique focus ID
  const cardFocusId = focusId || `stream-card-${index}`;
  const downloadFocusId = `stream-download-${index}`;

  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);

  const streamInfo = useMemo(() => {
    const title = stream.title || '';
    const name = stream.name || '';

    // Helper function to format size from bytes
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get size from title (legacy format) or from stream.size field
    let sizeDisplay = title.match(/\u{1F4BE}\s*([\d.]+\s*[GM]B)/u)?.[1];
    if (!sizeDisplay && stream.size && typeof stream.size === 'number' && stream.size > 0) {
      sizeDisplay = formatSize(stream.size);
    }

    // Extract quality for badge display
    const basicQuality = title.match(/(\d+)p/)?.[1] || null;

    return {
      quality: basicQuality,
      isHDR: title.toLowerCase().includes('hdr'),
      isDolby: title.toLowerCase().includes('dolby') || title.includes('DV'),
      size: sizeDisplay,
      isDebrid: stream.behaviorHints?.cached,
      displayName: name || 'Unnamed Stream',
      subTitle: title && title !== name ? title : null
    };
  }, [stream.name, stream.title, stream.behaviorHints, stream.size]);

  /**
   * Copy stream URL to clipboard
   */
  const copyStreamUrl = useCallback(async () => {
    if (stream.url) {
      try {
        await Clipboard.setString(stream.url);
        showSuccess('URL Copied', 'Stream URL copied to clipboard!');
      } catch {
        showError('Copy Failed', 'Could not copy URL to clipboard');
      }
    }
  }, [stream.url, showSuccess, showError]);

  /**
   * Handle download action
   */
  const handleDownload = useCallback(async () => {
    try {
      const url = stream.url;
      if (!url) return;
      // Prevent duplicate downloads for the same exact URL
      try {
        const downloadsModule = require('../contexts/DownloadsContext');
        if (downloadsModule && downloadsModule.isDownloadingUrl && downloadsModule.isDownloadingUrl(url)) {
          showAlert('Already Downloading', 'This download has already started for this exact link.');
          return;
        }
      } catch {}
      // Show immediate feedback
      showInfo('Starting Download', 'Download will be started.');
      const parent: any = stream as any;
      const inferredTitle = parentTitle || stream.name || stream.title || parent.metaName || 'Content';
      const inferredType: 'movie' | 'series' = parentType || (parent.kind === 'series' || parent.type === 'series' ? 'series' : 'movie');
      const season = typeof parentSeason === 'number' ? parentSeason : (parent.season || parent.season_number);
      const episode = typeof parentEpisode === 'number' ? parentEpisode : (parent.episode || parent.episode_number);
      const episodeTitle = parentEpisodeTitle || parent.episodeTitle || parent.episode_name;
      // Prefer the stream's display name (often includes provider + resolution)
      const provider = (stream.name as any) || (stream.title as any) || providerName || parent.addonName || parent.addonId || (stream.addonName as any) || (stream.addonId as any) || 'Provider';

      // Use parentId first (from route params), fallback to stream metadata
      const idForContent = parentId || parent.imdbId || parent.tmdbId || parent.addonId || inferredTitle;

      // Extract tmdbId if available (from parentId or parent metadata)
      let tmdbId: number | undefined = undefined;
      if (parentId && parentId.startsWith('tmdb:')) {
        tmdbId = parseInt(parentId.split(':')[1], 10);
      } else if (typeof parent.tmdbId === 'number') {
        tmdbId = parent.tmdbId;
      }

      await startDownload({
        id: String(idForContent),
        type: inferredType,
        title: String(inferredTitle),
        providerName: String(provider),
        season: inferredType === 'series' ? (season ? Number(season) : undefined) : undefined,
        episode: inferredType === 'series' ? (episode ? Number(episode) : undefined) : undefined,
        episodeTitle: inferredType === 'series' ? (episodeTitle ? String(episodeTitle) : undefined) : undefined,
        quality: streamInfo.quality || undefined,
        posterUrl: parentPosterUrl || parent.poster || parent.backdrop || null,
        url,
        headers: (stream.headers as any) || undefined,
        // Pass metadata for progress tracking
        imdbId: parentImdbId || parent.imdbId || undefined,
        tmdbId: tmdbId,
      });
      showSuccess('Download Started', 'Your download has been added to the queue.');
    } catch {
      showError('Download Failed', 'Could not start the download.');
    }
  }, [startDownload, stream.url, stream.headers, streamInfo.quality, showAlert, showSuccess, showInfo, showError, stream.name, stream.title, parentId, parentImdbId, parentTitle, parentType, parentSeason, parentEpisode, parentEpisodeTitle, parentPosterUrl, providerName]);

  /**
   * Handle long press - open TV context menu on TV, show alert on non-TV
   */
  const handleLongPress = useCallback(() => {
    if (isContextMenuAvailable) {
      // Open TV context menu with stream-specific actions
      const actions: Array<'play' | 'copyLink' | 'download'> = ['play', 'copyLink'];
      if (settings?.enableDownloads !== false) {
        actions.push('download');
      }

      openContextMenu({
        targetId: cardFocusId,
        title: streamInfo.displayName,
        mediaItem: {
          id: cardFocusId,
          title: streamInfo.displayName,
          type: parentType || 'movie',
        },
        actions,
        onPlay: onPress,
        onCopyLink: copyStreamUrl,
        onDownload: handleDownload,
      });
    } else {
      // Fall back to copy URL on non-TV
      copyStreamUrl();
    }
  }, [
    isContextMenuAvailable,
    openContextMenu,
    cardFocusId,
    streamInfo.displayName,
    parentType,
    onPress,
    copyStreamUrl,
    handleDownload,
    settings?.enableDownloads,
  ]);

  /**
   * Handle TV focus events - track in context
   */
  const handleFocus = useCallback(() => {
    tvNav?.setCurrentFocusId(cardFocusId);
    onFocusProp?.();
  }, [cardFocusId, tvNav, onFocusProp]);

  /**
   * Handle TV blur events
   */
  const handleBlur = useCallback(() => {
    onBlurProp?.();
  }, [onBlurProp]);

  /**
   * Handle download button focus
   */
  const handleDownloadFocus = useCallback(() => {
    tvNav?.setCurrentFocusId(downloadFocusId);
  }, [downloadFocusId, tvNav]);

  // Build next focus props for card (navigate right to download button if enabled)
  const cardNextFocus = useMemo(() => {
    const props: any = {};
    if (nextFocusUp) props.nextFocusUp = nextFocusUp;
    if (nextFocusDown) props.nextFocusDown = nextFocusDown;
    if (nextFocusLeft) props.nextFocusLeft = nextFocusLeft;
    // Navigate right to download button if downloads are enabled
    if (settings?.enableDownloads !== false && downloadButtonRef.current) {
      try {
        const handle = findNodeHandle(downloadButtonRef.current as any);
        if (handle) props.nextFocusRight = handle;
      } catch {}
    } else if (nextFocusRight) {
      props.nextFocusRight = nextFocusRight;
    }
    return props;
  }, [nextFocusUp, nextFocusDown, nextFocusLeft, nextFocusRight, settings?.enableDownloads]);

  // Build next focus props for download button (navigate left back to card)
  const downloadNextFocus = useMemo(() => {
    const props: any = {};
    if (nextFocusUp) props.nextFocusUp = nextFocusUp;
    if (nextFocusDown) props.nextFocusDown = nextFocusDown;
    if (nextFocusRight) props.nextFocusRight = nextFocusRight;
    // Navigate left back to card
    if (cardRef.current) {
      try {
        const handle = findNodeHandle(cardRef.current as any);
        if (handle) props.nextFocusLeft = handle;
      } catch {}
    }
    return props;
  }, [nextFocusUp, nextFocusDown, nextFocusRight]);

  const isDebrid = streamInfo.isDebrid;
  const showDownloadButton = settings?.enableDownloads !== false;

  return (
    <View style={styles.cardContainer}>
      <Focusable
        ref={cardRef}
        onPress={onPress}
        onLongPress={handleLongPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        hasTVPreferredFocus={hasTVPreferredFocus}
        isTVSelectable={!isLoading}
        disabled={isLoading}
        focusId={cardFocusId}
        style={[
          styles.streamCard,
          isLoading && styles.streamCardLoading,
          isDebrid && styles.streamCardHighlighted
        ]}
        focusStyle={styles.focusedCard}
        animationConfig={{
          focusScale: 1.03,
          unfocusedOpacity: 0.95,
          showFocusBorder: true,
          focusBorderColor: theme.colors.primary || '#007AFF',
          focusBorderWidth: 2,
          animateShadow: Platform.OS === 'ios',
        }}
        tvParallaxProperties={{
          enabled: Platform.OS === 'ios',
          shiftDistanceX: 1,
          shiftDistanceY: 1,
          tiltAngle: 0.02,
          magnification: 1.0,
          pressMagnification: 1.01,
          pressDuration: 0.2,
        }}
        nextFocus={cardNextFocus}
        accessibilityLabel={`${streamInfo.displayName}${streamInfo.quality ? `, ${streamInfo.quality}p` : ''}${streamInfo.size ? `, ${streamInfo.size}` : ''}${isDebrid ? ', cached on debrid' : ''}`}
        accessibilityHint="Press to play this stream. Long press for more options."
        testID={`stream-card-${index}`}
      >
        {/* Scraper Logo */}
        {showLogos && scraperLogo && (
          <View style={styles.scraperLogoContainer}>
            {scraperLogo.toLowerCase().endsWith('.svg') || scraperLogo.toLowerCase().includes('.svg?') ? (
              <Image
                source={{ uri: scraperLogo }}
                style={styles.scraperLogo}
                resizeMode="contain"
              />
            ) : (
              <FastImage
                source={{ uri: scraperLogo }}
                style={styles.scraperLogo}
                resizeMode={FastImage.resizeMode.contain}
              />
            )}
          </View>
        )}

        <View style={styles.streamDetails}>
          <View style={styles.streamNameRow}>
            <View style={styles.streamTitleContainer}>
              <Text style={[styles.streamName, { color: theme.colors.highEmphasis }]}>
                {streamInfo.displayName}
              </Text>
              {streamInfo.subTitle && (
                <Text style={[styles.streamAddonName, { color: theme.colors.mediumEmphasis }]}>
                  {streamInfo.subTitle}
                </Text>
              )}
            </View>

            {/* Show loading indicator if stream is loading */}
            {isLoading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.primary }]}>
                  {statusMessage || "Loading..."}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.streamMetaRow}>
            {streamInfo.isDolby && (
              <QualityBadge type="VISION" />
            )}

            {streamInfo.size && (
              <View style={[styles.chip, { backgroundColor: theme.colors.darkGray }]}>
                <Text style={[styles.chipText, { color: theme.colors.white }]}>{streamInfo.size}</Text>
              </View>
            )}

            {streamInfo.isDebrid && (
              <View style={[styles.chip, { backgroundColor: theme.colors.success }]}>
                <Text style={[styles.chipText, { color: theme.colors.white }]}>DEBRID</Text>
              </View>
            )}
          </View>
        </View>
      </Focusable>

      {/* Download button - separately focusable for TV navigation */}
      {showDownloadButton && (
        <Focusable
          ref={downloadButtonRef}
          onPress={handleDownload}
          onFocus={handleDownloadFocus}
          isTVSelectable={!isLoading}
          disabled={isLoading}
          focusId={downloadFocusId}
          style={[styles.downloadButton, { backgroundColor: theme.colors.elevation2 }]}
          focusStyle={styles.focusedDownloadButton}
          animationConfig={{
            focusScale: 1.1,
            unfocusedOpacity: 0.8,
            showFocusBorder: true,
            focusBorderColor: theme.colors.primary || '#007AFF',
            focusBorderWidth: 2,
            animateShadow: Platform.OS === 'ios',
          }}
          tvParallaxProperties={{
            enabled: Platform.OS === 'ios',
            shiftDistanceX: 1,
            shiftDistanceY: 1,
            tiltAngle: 0.02,
            magnification: 1.0,
            pressMagnification: 1.05,
            pressDuration: 0.15,
          }}
          nextFocus={downloadNextFocus}
          accessibilityLabel="Download stream"
          accessibilityHint="Press to download this stream for offline viewing"
          testID={`stream-download-${index}`}
        >
          <MaterialIcons
            name="download"
            size={20}
            color={theme.colors.highEmphasis}
          />
        </Focusable>
      )}
    </View>
  );
});

const createStyles = (colors: any) => StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  streamCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    minHeight: 68,
    backgroundColor: colors.card,
    borderWidth: 0,
    zIndex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
  },
  focusedCard: {
    // Additional styles applied when focused (handled by Focusable animation)
    // Border is animated by Focusable component
  },
  scraperLogoContainer: {
    width: 32,
    height: 32,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.elevation2,
    borderRadius: 6,
  },
  scraperLogo: {
    width: 24,
    height: 24,
  },
  streamCardLoading: {
    opacity: 0.7,
  },
  streamCardHighlighted: {
    backgroundColor: colors.elevation2,
    shadowOpacity: 0.18,
  },
  streamDetails: {
    flex: 1,
  },
  streamNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    flexWrap: 'wrap',
    gap: 8
  },
  streamTitleContainer: {
    flex: 1,
  },
  streamName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    lineHeight: 20,
    color: colors.highEmphasis,
    letterSpacing: 0.1,
  },
  streamAddonName: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mediumEmphasis,
    marginBottom: 6,
  },
  streamMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: colors.elevation2,
  },
  chipText: {
    color: colors.highEmphasis,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  loadingText: {
    color: colors.primary,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  focusedDownloadButton: {
    // Additional styles applied when focused (handled by Focusable animation)
  },
});

StreamCard.displayName = 'StreamCard';

export default StreamCard;
