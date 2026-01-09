import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { Episode } from '../../../types/metadata';
import { Stream } from '../../../types/streams';
import { stremioService } from '../../../services/stremioService';
import { logger } from '../../../utils/logger';
import Focusable from '../../common/Focusable';

interface EpisodeStreamsModalProps {
  visible: boolean;
  episode: Episode | null;
  onClose: () => void;
  onSelectStream: (stream: Stream) => void;
  metadata?: { id?: string; name?: string };
}

const QualityBadge = ({ quality }: { quality: string | null | undefined }) => {
  if (!quality) return null;

  const qualityNum = parseInt(quality);
  let color = '#8B5CF6';
  let label = `${quality}p`;

  if (qualityNum >= 2160) {
    color = '#F59E0B';
    label = '4K';
  } else if (qualityNum >= 1080) {
    color = '#3B82F6';
    label = '1080p';
  } else if (qualityNum >= 720) {
    color = '#10B981';
    label = '720p';
  }

  return (
    <View style={{
      backgroundColor: color,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    }}>
      <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{label}</Text>
    </View>
  );
};

export const EpisodeStreamsModal: React.FC<EpisodeStreamsModalProps> = ({
  visible,
  episode,
  onClose,
  onSelectStream,
  metadata,
}) => {
  const { width } = useWindowDimensions();
  const MENU_WIDTH = Math.min(width * 0.85, 400);

  const [availableStreams, setAvailableStreams] = useState<{ [providerId: string]: { streams: Stream[]; addonName: string } }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasErrors, setHasErrors] = useState<string[]>([]);

  useEffect(() => {
    if (visible && episode && metadata?.id) {
      fetchStreams();
    } else {
      setAvailableStreams({});
      setIsLoading(false);
      setHasErrors([]);
    }
  }, [visible, episode, metadata?.id]);

  const fetchStreams = async () => {
    if (!episode || !metadata?.id) return;

    setIsLoading(true);
    setHasErrors([]);
    setAvailableStreams({});

    try {
      const episodeId = episode.stremioId || `${metadata.id}:${episode.season_number}:${episode.episode_number}`;
      let completedProviders = 0;
      const expectedProviders = new Set<string>();
      const respondedProviders = new Set<string>();

      const installedAddons = stremioService.getInstalledAddons();
      const streamAddons = installedAddons.filter((addon: any) =>
        addon.resources && addon.resources.includes('stream')
      );

      streamAddons.forEach((addon: any) => expectedProviders.add(addon.id));

      logger.log(`[EpisodeStreamsModal] Fetching streams for ${episodeId}, expecting ${expectedProviders.size} providers`);

      await stremioService.getStreams('series', episodeId, (streams: any, addonId: any, addonName: any, error: any) => {
        completedProviders++;
        respondedProviders.add(addonId);

        if (error) {
          setHasErrors(prev => [...prev, `${addonName || addonId}: ${error.message || 'Unknown error'}`]);
        } else if (streams && streams.length > 0) {
          setAvailableStreams(prev => ({
            ...prev,
            [addonId]: {
              streams: streams,
              addonName: addonName || addonId
            }
          }));
        }

        if (completedProviders >= expectedProviders.size) {
          setIsLoading(false);
        }
      });

      setTimeout(() => {
        if (respondedProviders.size === 0) {
          setIsLoading(false);
        }
      }, 8000);

    } catch (error) {
      setIsLoading(false);
    }
  };

  const getQualityFromTitle = (title?: string): string | null => {
    if (!title) return null;
    const match = title.match(/(\d+)p/);
    return match ? match[1] : null;
  };

  if (!visible) return null;

  const sortedProviders = Object.entries(availableStreams);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
      {/* Backdrop */}
      <Focusable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        />
      </Focusable>

      <Animated.View
        entering={SlideInRight.duration(300)}
        exiting={SlideOutRight.duration(250)}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: MENU_WIDTH,
          backgroundColor: '#0f0f0f',
          borderLeftWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <View style={{
          paddingTop: Platform.OS === 'ios' ? 60 : 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }} numberOfLines={1}>
                {episode?.name || 'Sources'}
              </Text>
              {episode && (
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
                  S{episode.season_number} • E{episode.episode_number}
                </Text>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}
        >
          {isLoading && sortedProviders.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color="white" />
              <Text style={{ color: 'white', marginTop: 15, opacity: 0.6 }}>Finding sources...</Text>
            </View>
          )}

          {!isLoading && sortedProviders.length > 0 && (
            sortedProviders.map(([providerId, providerData]) => (
              <View key={providerId} style={{ marginBottom: 30 }}>
                <Text style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 15,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {providerData.addonName} ({providerData.streams.length})
                </Text>

                <View style={{ gap: 8 }}>
                  {providerData.streams.map((stream, index) => {
                    const quality = getQualityFromTitle(stream.title) || stream.quality;
                    // First stream of first provider gets TV focus
                    const isFirstFocusable = Platform.isTV && sortedProviders[0][0] === providerId && index === 0;

                    return (
                      <Focusable
                        key={`${providerId}-${index}`}
                        hasTVPreferredFocus={isFirstFocusable}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.1)',
                        }}
                        onPress={() => onSelectStream(stream)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginBottom: 8,
                              gap: 8,
                            }}>
                              <Text style={{
                                color: 'white',
                                fontSize: 15,
                                fontWeight: '500',
                                flex: 1,
                              }}>
                                {stream.title || stream.name || `Stream ${index + 1}`}
                              </Text>
                              {quality && <QualityBadge quality={quality} />}
                            </View>

                            {(stream.size || stream.lang) && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                {stream.size && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialIcons name="storage" size={14} color="rgba(255,255,255,0.5)" />
                                    <Text style={{
                                      color: 'rgba(255,255,255,0.5)',
                                      fontSize: 12,
                                      fontWeight: '600',
                                      marginLeft: 4,
                                    }}>
                                      {(stream.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                                    </Text>
                                  </View>
                                )}
                                {stream.lang && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialIcons name="language" size={14} color="rgba(59,130,246,0.8)" />
                                    <Text style={{
                                      color: 'rgba(59,130,246,0.8)',
                                      fontSize: 12,
                                      fontWeight: '600',
                                      marginLeft: 4,
                                    }}>
                                      {stream.lang.toUpperCase()}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>

                          <View style={{ marginLeft: 12, alignItems: 'center' }}>
                            <MaterialIcons name="play-arrow" size={20} color="rgba(255,255,255,0.4)" />
                          </View>
                        </View>
                      </Focusable>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {!isLoading && sortedProviders.length === 0 && hasErrors.length === 0 && (
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
            }}>
              <MaterialIcons name="error-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 16,
                marginTop: 16,
                textAlign: 'center',
              }}>
                No sources available
              </Text>
            </View>
          )}

          {!isLoading && sortedProviders.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center', opacity: 0.5 }}>
              <MaterialIcons name="cloud-off" size={48} color="white" />
              <Text style={{ color: 'white', marginTop: 16, textAlign: 'center', fontWeight: '600' }}>No sources found</Text>
            </View>
          )}

          {hasErrors.length > 0 && (
            <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, padding: 12, marginTop: 10 }}>
              <Text style={{ color: '#EF4444', fontSize: 11 }}>Sources might be limited due to provider errors.</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default EpisodeStreamsModal;
