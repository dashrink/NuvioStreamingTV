import React from 'react';
<<<<<<< HEAD
import { View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
=======
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions, StyleSheet, Platform } from 'react-native';
>>>>>>> origin/main
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
<<<<<<< HEAD
import { getTrackDisplayName } from '../utils/playerUtils';
import Focusable from '../../common/Focusable';
=======
import { getTrackDisplayName, DEBUG_MODE } from '../utils/playerUtils';
import { logger } from '../../../utils/logger';
>>>>>>> origin/main

interface AudioTrackModalProps {
  showAudioModal: boolean;
  setShowAudioModal: (show: boolean) => void;
  ksAudioTracks: Array<{ id: number, name: string, language?: string }>;
  selectedAudioTrack: number | null;
  selectAudioTrack: (trackId: number) => void;
}

export const AudioTrackModal: React.FC<AudioTrackModalProps> = ({
  showAudioModal,
  setShowAudioModal,
  ksAudioTracks,
  selectedAudioTrack,
  selectAudioTrack,
}) => {
  const { width, height } = useWindowDimensions();

  // Size constants matching SubtitleModal aesthetics
  const menuWidth = Math.min(width * 0.9, 420);
  const menuMaxHeight = height * 0.9;

  const handleClose = () => setShowAudioModal(false);

  if (!showAudioModal) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
<<<<<<< HEAD
      <Focusable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      </Focusable>
=======
      {/* Backdrop matching SubtitleModal */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        />
      </TouchableOpacity>
>>>>>>> origin/main

      {/* Center Alignment Container */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(250)}
          style={{
            width: menuWidth,
            maxHeight: menuMaxHeight,
            backgroundColor: 'rgba(15, 15, 15, 0.98)', // Matches SubtitleModal
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}
        >
<<<<<<< HEAD
          <View style={{ gap: 8 }}>
            {ksAudioTracks.map((track, index) => {
              const isSelected = selectedAudioTrack === track.id;

              return (
                <Focusable
                  key={track.id}
                  hasTVPreferredFocus={Platform.isTV && index === 0}
                  onPress={() => {
                    selectAudioTrack(track.id);
                    setTimeout(handleClose, 200);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: isSelected ? 'white' : 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor: isSelected ? 'white' : 'rgba(255,255,255,0.1)',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: isSelected ? 'black' : 'white',
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: 15
                    }}>
                      {getTrackDisplayName(track)}
                    </Text>
                  </View>
                  {isSelected && <MaterialIcons name="check" size={18} color="black" />}
                </Focusable>
              );
            })}

            {ksAudioTracks.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center', opacity: 0.5 }}>
                <MaterialIcons name="volume-off" size={32} color="white" />
                <Text style={{ color: 'white', marginTop: 10 }}>No audio tracks available</Text>
              </View>
            )}
=======
          {/* Header with shared aesthetics */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, position: 'relative' }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Audio Tracks</Text>
>>>>>>> origin/main
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          >
            <View style={{ gap: 8 }}>
              {ksAudioTracks.map((track) => {
                const isSelected = selectedAudioTrack === track.id;

                return (
                  <TouchableOpacity
                    key={track.id}
                    onPress={() => {
                      selectAudioTrack(track.id);
                      setTimeout(handleClose, 200);
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      backgroundColor: isSelected ? 'white' : 'rgba(255,255,255,0.05)', // Matches SubtitleModal item colors
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: isSelected ? 'black' : 'white',
                        fontWeight: isSelected ? '700' : '400',
                        fontSize: 15
                      }}>
                        {getTrackDisplayName(track)}
                      </Text>
                    </View>
                    {isSelected && <MaterialIcons name="check" size={18} color="black" />}
                  </TouchableOpacity>
                );
              })}

              {ksAudioTracks.length === 0 && (
                <View style={{ padding: 40, alignItems: 'center', opacity: 0.5 }}>
                  <MaterialIcons name="volume-off" size={32} color="white" />
                  <Text style={{ color: 'white', marginTop: 10 }}>No audio tracks available</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
};

export default AudioTrackModal;
