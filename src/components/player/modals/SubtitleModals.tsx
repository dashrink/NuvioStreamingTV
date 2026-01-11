import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Platform, useWindowDimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { WyzieSubtitle, SubtitleCue } from '../utils/playerTypes';
import { getTrackDisplayName, formatLanguage } from '../utils/playerUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Focusable from '../../common/Focusable';
import { triggerLight, triggerMedium } from '../../../hooks/useHaptics';

interface SubtitleModalsProps {
  showSubtitleModal: boolean;
  setShowSubtitleModal: (show: boolean) => void;
  showSubtitleLanguageModal: boolean;
  setShowSubtitleLanguageModal: (show: boolean) => void;
  isLoadingSubtitleList: boolean;
  isLoadingSubtitles: boolean;
  customSubtitles: SubtitleCue[];
  availableSubtitles: WyzieSubtitle[];
  ksTextTracks: Array<{ id: number, name: string, language?: string }>;
  selectedTextTrack: number;
  useCustomSubtitles: boolean;
  isKsPlayerActive?: boolean;
  // Whether ExoPlayer is being used (limits subtitle styling options)
  useExoPlayer?: boolean;
  subtitleSize: number;
  subtitleBackground: boolean;
  fetchAvailableSubtitles: () => void;
  loadWyzieSubtitle: (subtitle: WyzieSubtitle) => void;
  selectTextTrack: (trackId: number) => void;
  disableCustomSubtitles: () => void;
  setSubtitlesAutoSelect?: (autoSelect: boolean) => void;
  increaseSubtitleSize: () => void;
  decreaseSubtitleSize: () => void;
  toggleSubtitleBackground: () => void;
  subtitleTextColor: string;
  setSubtitleTextColor: (c: string) => void;
  subtitleBgOpacity: number;
  setSubtitleBgOpacity: (o: number) => void;
  subtitleTextShadow: boolean;
  setSubtitleTextShadow: (b: boolean) => void;
  subtitleOutline: boolean;
  setSubtitleOutline: (b: boolean) => void;
  subtitleOutlineColor: string;
  setSubtitleOutlineColor: (c: string) => void;
  subtitleOutlineWidth: number;
  setSubtitleOutlineWidth: (n: number) => void;
  subtitleAlign: 'center' | 'left' | 'right';
  setSubtitleAlign: (a: 'center' | 'left' | 'right') => void;
  subtitleBottomOffset: number;
  setSubtitleBottomOffset: (n: number) => void;
  subtitleLetterSpacing: number;
  setSubtitleLetterSpacing: (n: number) => void;
  subtitleLineHeightMultiplier: number;
  setSubtitleLineHeightMultiplier: (n: number) => void;
  subtitleOffsetSec: number;
  setSubtitleOffsetSec: (n: number) => void;
  selectedExternalSubtitleId?: string | null; // ID of currently selected external/addon subtitle
  onOpenSyncModal?: () => void; // Callback to open the visual sync modal
}

const MorphingTab = ({ label, isSelected, onPress }: any) => {
  const animatedStyle = useAnimatedStyle(() => ({
    borderRadius: withTiming(isSelected ? 10 : 40, { duration: 250 }),
    backgroundColor: withTiming(isSelected ? 'white' : 'rgba(255,255,255,0.06)', { duration: 250 }),
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1 }}>
      <Animated.View style={[{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
        <Text style={{ color: isSelected ? 'black' : 'white', fontWeight: isSelected ? '700' : '400', fontSize: 13 }}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const SubtitleModals: React.FC<SubtitleModalsProps> = ({
  showSubtitleModal, setShowSubtitleModal, isLoadingSubtitleList, isLoadingSubtitles,
  availableSubtitles, ksTextTracks, selectedTextTrack, useCustomSubtitles,
  subtitleSize, subtitleBackground, fetchAvailableSubtitles,
  loadWyzieSubtitle, selectTextTrack, increaseSubtitleSize,
  decreaseSubtitleSize, toggleSubtitleBackground, subtitleTextColor, setSubtitleTextColor,
  useExoPlayer = false,
  subtitleBgOpacity, setSubtitleBgOpacity, subtitleTextShadow, setSubtitleTextShadow,
  subtitleOutline, setSubtitleOutline, subtitleOutlineColor, setSubtitleOutlineColor,
  subtitleOutlineWidth, setSubtitleOutlineWidth, subtitleAlign, setSubtitleAlign,
  subtitleBottomOffset, setSubtitleBottomOffset, subtitleLetterSpacing, setSubtitleLetterSpacing,
  subtitleLineHeightMultiplier, setSubtitleLineHeightMultiplier, subtitleOffsetSec, setSubtitleOffsetSec,
  setSubtitlesAutoSelect,
  selectedExternalSubtitleId,
  onOpenSyncModal,
  isKsPlayerActive,
  disableCustomSubtitles,
}) => {
  const { width, height } = useWindowDimensions();
  const isIos = Platform.OS === 'ios';
  const isLandscape = width > height;

  const insets = useSafeAreaInsets();
  // Use prop value if provided (for auto-selected subtitles), otherwise use local state
  const [localSelectedId, setLocalSelectedId] = React.useState<string | null>(null);
  const [loadingSubtitleId, setLoadingSubtitleId] = React.useState<string | null>(null);
  const selectedOnlineSubtitleId = selectedExternalSubtitleId ?? localSelectedId;
  const setSelectedOnlineSubtitleId = setLocalSelectedId;
  const [activeTab, setActiveTab] = React.useState<'built-in' | 'addon' | 'appearance'>('built-in');

  const isCompact = width < 360 || height < 640;
  // Internal subtitle is active when a built-in track is selected AND not using custom/addon subtitles
  const isUsingInternalSubtitle = selectedTextTrack >= 0 && !useCustomSubtitles;
  // ExoPlayer has limited styling support - hide unsupported options when using ExoPlayer with internal subs
  const isExoPlayerInternal = useExoPlayer && isUsingInternalSubtitle;
  const sectionPad = isCompact ? 12 : 16;
  const chipPadH = isCompact ? 8 : 12;
  const chipPadV = isCompact ? 6 : 8;
  const controlBtn = { size: isCompact ? 28 : 32, radius: isCompact ? 14 : 16 };
  const previewHeight = isCompact ? 90 : (isIos && isLandscape ? 100 : 120);

  const menuWidth = Math.min(width * 0.9, 420);
  const menuMaxHeight = height * 0.95;

  React.useEffect(() => {
    if (showSubtitleModal && !isLoadingSubtitleList && availableSubtitles.length === 0) fetchAvailableSubtitles();
  }, [showSubtitleModal]);

  if (!showSubtitleModal) return null;

  // Keep tab in sync with current usage
  React.useEffect(() => {
    setActiveTab(useCustomSubtitles ? 'addon' : 'built-in');
  }, [useCustomSubtitles]);

  const handleClose = () => {
    triggerLight();
    setShowSubtitleModal(false);
  };

  const handleLoadWyzieSubtitle = (subtitle: WyzieSubtitle) => {
    setSelectedOnlineSubtitleId(subtitle.id);
    setLoadingSubtitleId(subtitle.id);
    loadWyzieSubtitle(subtitle);
  };

  const getFileNameFromUrl = (url?: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    try {
      // Prefer URL parsing to safely strip query/hash
      const u = new URL(url);
      const raw = u.pathname.split('/').pop() || '';
      const decoded = decodeURIComponent(raw);
      return decoded || null;
    } catch {
      // Fallback for non-standard URLs
      const path = url.split('?')[0].split('#')[0];
      const raw = path.split('/').pop() || '';
      try { return decodeURIComponent(raw) || null; } catch { return raw || null; }
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
      {/* Backdrop */}
      <Focusable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      </Focusable>

      {/* Centered Modal Container */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(250)}
          style={{
            width: menuWidth,
            maxHeight: menuMaxHeight,
            backgroundColor: '#0f0f0f',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, position: 'relative' }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Subtitles</Text>
          </View>

          {/* Segmented Tabs */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
            {([
              { key: 'built-in', label: 'Built‑in' },
              { key: 'addon', label: 'Addons' },
              { key: 'appearance', label: 'Appearance' },
            ] as const).map((tab, index) => (
              <Focusable
                key={tab.key}
                hasTVPreferredFocus={Platform.isTV && activeTab === tab.key}
                onPress={() => {
                  triggerLight();
                  setActiveTab(tab.key);
                }}
                style={{
                  paddingHorizontal: chipPadH,
                  paddingVertical: chipPadV,
                  borderRadius: 16,
                  backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: isCompact ? 12 : 13 }}>{tab.label}</Text>
              </Focusable>
            ))}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: (isCompact ? 24 : 40) + (isIos ? insets.bottom : 0) }}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'built-in' && (
              <View style={{ marginBottom: 30 }}>
                <Text style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 15,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Built-in Subtitles
                </Text>

                {/* Built-in subtitles now enabled for KSPlayer */}
                {isKsPlayerActive && (
                  <View style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: 12,
                    padding: sectionPad,
                    marginBottom: 15,
                    borderWidth: 1,
                    borderColor: 'rgba(34, 197, 94, 0.3)',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <MaterialIcons name="check-circle" size={18} color="#22C55E" />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: '#22C55E',
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: '600',
                          marginBottom: 4,
                        }}>
                          Built-in subtitles enabled for KSPlayer
                        </Text>
                        <Text style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: isCompact ? 11 : 12,
                          lineHeight: isCompact ? 16 : 18,
                        }}>
                          KSPlayer built-in subtitle rendering is now available. You can select from embedded subtitle tracks below.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Disable Subtitles Button */}
                <Focusable
                  style={{
                    backgroundColor: selectedTextTrack === -1 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: sectionPad,
                    borderWidth: 1,
                    borderColor: selectedTextTrack === -1 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    marginBottom: 8,
                  }}
                  onPress={() => {
                    triggerLight();
                    selectTextTrack(-1);
                    setSelectedOnlineSubtitleId(null);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{
                      color: selectedTextTrack === -1 ? '#EF4444' : '#FFFFFF',
                      fontSize: isCompact ? 14 : 15,
                      fontWeight: '500',
                      flex: 1,
                    }}>
                      Disable All Subtitles
                    </Text>
                    {selectedTextTrack === -1 && (
                      <MaterialIcons name="check" size={20} color="#EF4444" />
                    )}
                  </View>
                </Focusable>

                {/* Always show built-in subtitles */}
                {ksTextTracks.length > 0 && (
                  <View style={{ gap: 8 }}>
                    {ksTextTracks.map((track) => {
                      const isSelected = selectedTextTrack === track.id && !useCustomSubtitles;
                      return (
                        <Focusable
                          key={track.id}
                          style={{
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 16,
                            padding: sectionPad,
                            borderWidth: 1,
                            borderColor: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                          }}
                          onPress={() => {
                            triggerLight();
                            selectTextTrack(track.id);
                            setSelectedOnlineSubtitleId(null);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{
                              color: '#FFFFFF',
                              fontSize: isCompact ? 14 : 15,
                              fontWeight: '500',
                              flex: 1,
                            }}>
                              {getTrackDisplayName(track)}
                            </Text>
                            {isSelected && (
                              <MaterialIcons name="check" size={20} color="#3B82F6" />
                            )}
                          </View>
                        </Focusable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'addon' && (
              <View style={{ marginBottom: 30 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: 14,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    Add-on Subtitles
                  </Text>
                  <Focusable onPress={() => {
                    triggerLight();
                    fetchAvailableSubtitles();
                  }} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>
                      Refresh
                    </Text>
                  </Focusable>
                </View>

                {isLoadingSubtitleList ? (
                  <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                ) : availableSubtitles.length === 0 ? (
                  <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 14, textAlign: 'center', paddingVertical: 20 }}>
                    No available subtitles
                  </Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {availableSubtitles.map((subtitle) => {
                      const isSelected = selectedOnlineSubtitleId === subtitle.id;
                      const isLoading = loadingSubtitleId === subtitle.id;
                      return (
                        <Focusable
                          key={subtitle.id}
                          style={{
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 16,
                            padding: sectionPad,
                            borderWidth: 1,
                            borderColor: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                            opacity: isLoading ? 0.6 : 1,
                          }}
                          onPress={() => {
                            triggerMedium();
                            handleLoadWyzieSubtitle(subtitle);
                          }}
                          disabled={isLoading}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{
                                color: '#FFFFFF',
                                fontSize: isCompact ? 13 : 14,
                                fontWeight: '600',
                                marginBottom: 4,
                              }}>
                                {subtitle.fileName}
                              </Text>
                              <Text style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: 12,
                              }}>
                                {formatLanguage(subtitle.language)} • {subtitle.score}%
                              </Text>
                            </View>
                            {isLoading ? (
                              <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 8 }} />
                            ) : isSelected ? (
                              <MaterialIcons name="check" size={20} color="#3B82F6" style={{ marginLeft: 8 }} />
                            ) : null}
                          </View>
                        </Focusable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'appearance' && (
              <View>
                {!isExoPlayerInternal && (
                  <>
                    {/* Color Customization */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 12,
                      }}>
                        Text Color
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                        {['#FFFFFF', '#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3'].map((color) => (
                          <Focusable
                            key={color}
                            onPress={() => {
                              triggerLight();
                              setSubtitleTextColor(color);
                            }}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              backgroundColor: color,
                              borderWidth: 2,
                              borderColor: subtitleTextColor === color ? 'white' : 'transparent',
                            }}
                          />
                        ))}
                      </View>
                    </View>

                    {/* Outline Options */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 12,
                      }}>
                        Outline
                      </Text>
                      <Focusable
                        onPress={() => {
                          triggerLight();
                          setSubtitleOutline(!subtitleOutline);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          marginBottom: 12,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}>
                          Enable Outline
                        </Text>
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          backgroundColor: subtitleOutline ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          {subtitleOutline && (
                            <MaterialIcons name="check" size={14} color="white" />
                          )}
                        </View>
                      </Focusable>

                      {subtitleOutline && (
                        <>
                          <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '500' }}>
                                Outline Color
                              </Text>
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  backgroundColor: subtitleOutlineColor,
                                  borderWidth: 2,
                                  borderColor: 'rgba(255, 255, 255, 0.3)',
                                }}
                              />
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                              {['#000000', '#FF0000', '#000080', '#808080'].map((color) => (
                                <Focusable
                                  key={color}
                                  onPress={() => {
                                    triggerLight();
                                    setSubtitleOutlineColor(color);
                                  }}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: color,
                                    borderWidth: 2,
                                    borderColor: subtitleOutlineColor === color ? 'white' : 'transparent',
                                  }}
                                />
                              ))}
                            </View>
                          </View>

                          <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '500' }}>
                                Outline Width: {subtitleOutlineWidth.toFixed(1)}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                              <Focusable
                                onPress={() => {
                                  triggerLight();
                                  setSubtitleOutlineWidth(Math.max(0.5, subtitleOutlineWidth - 0.5));
                                }}
                                style={{
                                  width: controlBtn.size,
                                  height: controlBtn.size,
                                  borderRadius: controlBtn.radius,
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <MaterialIcons name="remove" size={18} color="white" />
                              </Focusable>
                              <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3 }}>
                                <View
                                  style={{
                                    width: `${(subtitleOutlineWidth / 3) * 100}%`,
                                    height: '100%',
                                    backgroundColor: '#3B82F6',
                                    borderRadius: 3,
                                  }}
                                />
                              </View>
                              <Focusable
                                onPress={() => {
                                  triggerLight();
                                  setSubtitleOutlineWidth(Math.min(3, subtitleOutlineWidth + 0.5));
                                }}
                                style={{
                                  width: controlBtn.size,
                                  height: controlBtn.size,
                                  borderRadius: controlBtn.radius,
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <MaterialIcons name="add" size={18} color="white" />
                              </Focusable>
                            </View>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Text Shadow Toggle */}
                    <View style={{ marginBottom: 24 }}>
                      <Focusable
                        onPress={() => {
                          triggerLight();
                          setSubtitleTextShadow(!subtitleTextShadow);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}>
                          Text Shadow
                        </Text>
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          backgroundColor: subtitleTextShadow ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          {subtitleTextShadow && (
                            <MaterialIcons name="check" size={14} color="white" />
                          )}
                        </View>
                      </Focusable>
                    </View>

                    {/* Background Opacity */}
                    <View style={{ marginBottom: 24 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '500' }}>
                          Background Opacity: {(subtitleBgOpacity * 100).toFixed(0)}%
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleBgOpacity(Math.max(0, subtitleBgOpacity - 0.1));
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="remove" size={18} color="white" />
                        </Focusable>
                        <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3 }}>
                          <View
                            style={{
                              width: `${subtitleBgOpacity * 100}%`,
                              height: '100%',
                              backgroundColor: '#3B82F6',
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleBgOpacity(Math.min(1, subtitleBgOpacity + 0.1));
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="add" size={18} color="white" />
                        </Focusable>
                      </View>
                    </View>

                    {/* Text Alignment */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 12,
                      }}>
                        Text Alignment
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <Focusable
                            key={align}
                            onPress={() => {
                              triggerLight();
                              setSubtitleAlign(align);
                            }}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 12,
                              backgroundColor: subtitleAlign === align ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              borderWidth: 1,
                              borderColor: subtitleAlign === align ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                              alignItems: 'center',
                            }}
                          >
                            <MaterialIcons
                              name={`format_align_${align}`}
                              size={18}
                              color={subtitleAlign === align ? '#3B82F6' : 'rgba(255, 255, 255, 0.5)'}
                            />
                          </Focusable>
                        ))}
                      </View>
                    </View>

                    {/* Size Preview */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 12,
                      }}>
                        Size Preview
                      </Text>
                      <View style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 12,
                        padding: 12,
                        minHeight: previewHeight,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Text style={{
                          color: subtitleTextColor,
                          fontSize: subtitleSize,
                          fontWeight: '500',
                          textAlign: subtitleAlign,
                          textShadowColor: subtitleTextShadow ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
                          textShadowOffset: subtitleTextShadow ? { width: 1, height: 1 } : { width: 0, height: 0 },
                          textShadowRadius: subtitleTextShadow ? 3 : 0,
                        }}>
                          Sample Subtitle Text
                        </Text>
                      </View>
                    </View>

                    {/* Size Adjustment */}
                    <View style={{ marginBottom: 24 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '500' }}>
                          Subtitle Size: {subtitleSize}px
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            decreaseSubtitleSize();
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="remove" size={18} color="white" />
                        </Focusable>
                        <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3 }}>
                          <View
                            style={{
                              width: `${((subtitleSize - 8) / (32 - 8)) * 100}%`,
                              height: '100%',
                              backgroundColor: '#3B82F6',
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            increaseSubtitleSize();
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="add" size={18} color="white" />
                        </Focusable>
                      </View>
                    </View>

                    {/* Subtitle Offset */}
                    <View style={{ marginBottom: 24 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '500' }}>
                          Sync Offset: {subtitleOffsetSec.toFixed(2)}s
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleOffsetSec(subtitleOffsetSec - 0.5);
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="remove" size={18} color="white" />
                        </Focusable>
                        <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3 }}>
                          <View
                            style={{
                              width: `${Math.max(0, Math.min(1, (subtitleOffsetSec + 5) / 10)) * 100}%`,
                              height: '100%',
                              backgroundColor: '#3B82F6',
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleOffsetSec(subtitleOffsetSec + 0.5);
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="add" size={18} color="white" />
                        </Focusable>
                      </View>
                    </View>

                    {/* Letter Spacing */}
                    <View style={{ marginBottom: 24 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '500' }}>
                          Letter Spacing: {subtitleLetterSpacing.toFixed(1)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleLetterSpacing(Math.max(-2, subtitleLetterSpacing - 0.5));
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="remove" size={18} color="white" />
                        </Focusable>
                        <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3 }}>
                          <View
                            style={{
                              width: `${((subtitleLetterSpacing + 2) / 4) * 100}%`,
                              height: '100%',
                              backgroundColor: '#3B82F6',
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleLetterSpacing(Math.min(2, subtitleLetterSpacing + 0.5));
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="add" size={18} color="white" />
                        </Focusable>
                      </View>
                    </View>

                    {/* Line Height Multiplier */}
                    <View style={{ marginBottom: 24 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '500' }}>
                          Line Height: {subtitleLineHeightMultiplier.toFixed(1)}x
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleLineHeightMultiplier(Math.max(0.8, subtitleLineHeightMultiplier - 0.1));
                          }}
style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="remove" size={18} color="white" />
                        </Focusable>
                        <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3 }}>
                          <View
                            style={{
                              width: `${((subtitleLineHeightMultiplier - 0.8) / (1.6 - 0.8)) * 100}%`,
                              height: '100%',
                              backgroundColor: '#3B82F6',
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleLineHeightMultiplier(Math.min(1.6, subtitleLineHeightMultiplier + 0.1));
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="add" size={18} color="white" />
                        </Focusable>
                      </View>
                    </View>

                    {/* Bottom Offset */}
                    <View style={{ marginBottom: 24 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '500' }}>
                          Bottom Offset: {subtitleBottomOffset}px
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleBottomOffset(Math.max(0, subtitleBottomOffset - 5));
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="remove" size={18} color="white" />
                        </Focusable>
                        <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3 }}>
                          <View
                            style={{
                              width: `${Math.min(1, subtitleBottomOffset / 100) * 100}%`,
                              height: '100%',
                              backgroundColor: '#3B82F6',
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Focusable
                          onPress={() => {
                            triggerLight();
                            setSubtitleBottomOffset(Math.min(100, subtitleBottomOffset + 5));
                          }}
                          style={{
                            width: controlBtn.size,
                            height: controlBtn.size,
                            borderRadius: controlBtn.radius,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="add" size={18} color="white" />
                        </Focusable>
                      </View>
                    </View>

                    {/* Sync Modal Button */}
                    {onOpenSyncModal && (
                      <Focusable
                        onPress={() => {
                          triggerLight();
                          onOpenSyncModal();
                        }}
                        style={{
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(34, 197, 94, 0.3)',
                          marginTop: 12,
                        }}
                      >
                        <Text style={{ color: '#22C55E', fontSize: 14, fontWeight: '600' }}>
                          Visual Sync
                        </Text>
                      </Focusable>
                    )}
                  </>
                )}

                {isExoPlayerInternal && (
                  <View style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 12,
                    padding: sectionPad,
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <MaterialIcons name="info" size={18} color="#EF4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: '#EF4444',
                          fontSize: 13,
                          fontWeight: '600',
                          marginBottom: 4,
                        }}>
                          ExoPlayer Limitations
                        </Text>
                        <Text style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: 12,
                          lineHeight: 18,
                        }}>
                          ExoPlayer provides limited subtitle customization. Advanced styling options are unavailable when using built-in subtitles.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
};