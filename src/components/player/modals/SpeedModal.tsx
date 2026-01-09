
import React, { useRef } from 'react';
import { View, Text, Platform, useWindowDimensions, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import Focusable from '../../common/Focusable';

interface SpeedModalProps {
  showSpeedModal: boolean;
  setShowSpeedModal: (show: boolean) => void;
  currentSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  holdToSpeedEnabled: boolean;
  setHoldToSpeedEnabled: (enabled: boolean) => void;
  holdToSpeedValue: number;
  setHoldToSpeedValue: (speed: number) => void;
}

const SpeedModal: React.FC<SpeedModalProps> = ({
  showSpeedModal,
  setShowSpeedModal,
  currentSpeed,
  setPlaybackSpeed,
  holdToSpeedEnabled,
  setHoldToSpeedEnabled,
  holdToSpeedValue,
  setHoldToSpeedValue,
}) => {
  const { width } = useWindowDimensions();
  const firstSpeedRef = useRef<any>(null);

  const speedPresets = [0.5, 1.0, 1.25, 1.5, 2.0, 2.5];
  const holdSpeedOptions = [1.5, 2.0, 2.5, 3.0];

  const handleClose = () => {
    setShowSpeedModal(false);
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleHoldSpeedSelect = (speed: number) => {
    setHoldToSpeedValue(speed);
  };

  if (!showSpeedModal) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
      <Focusable style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} disabled={Platform.isTV}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      </Focusable>

      <View pointerEvents="box-none" style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingBottom: 20 }}>
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(250)}
          style={{
            width: Math.min(width * 0.9, 420),
            backgroundColor: 'rgba(15, 15, 15, 0.95)',
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)'
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Playback Speed</Text>
          </View>

          {/* Speed Presets */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 14,
              fontWeight: '600',
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Speed Presets
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {speedPresets.map((speed, index) => {
                const isSelected = currentSpeed === speed;
                return (
                  <Focusable
                    key={speed}
                    ref={index === 0 ? firstSpeedRef : undefined}
                    hasTVPreferredFocus={Platform.isTV && index === 0}
                    onPress={() => handleSpeedSelect(speed)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? 'white' : 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: isSelected ? 'white' : 'rgba(255,255,255,0.1)',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minWidth: 80
                    }}
                  >
                    <Text style={{
                      color: isSelected ? 'black' : 'white',
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: 15
                    }}>
                      {speed}x
                    </Text>
                    {isSelected && <MaterialIcons name="check" size={18} color="black" />}
                  </Focusable>
                );
              })}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 14 }} />

          {/* Hold-to-Speed Settings */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <MaterialIcons name="touch-app" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginLeft: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Hold-to-Speed
              </Text>
            </View>

            {/* Enable Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Enable Hold Speed</Text>
              <Focusable
                style={{
                  width: 54,
                  height: 30,
                  backgroundColor: holdToSpeedEnabled ? '#22C55E' : 'rgba(255,255,255,0.25)',
                  borderRadius: 15,
                  justifyContent: 'center',
                  alignItems: holdToSpeedEnabled ? 'flex-end' : 'flex-start',
                  paddingHorizontal: 3
                }}
                onPress={() => setHoldToSpeedEnabled(!holdToSpeedEnabled)}
              >
                <View style={{ width: 24, height: 24, backgroundColor: 'white', borderRadius: 12 }} />
              </Focusable>
            </View>

            {/* Hold Speed Selector */}
            {holdToSpeedEnabled && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: 'white', fontWeight: '600', marginBottom: 10, fontSize: 15 }}>Hold Speed</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {holdSpeedOptions.map((speed) => {
                    const isSelected = holdToSpeedValue === speed;
                    return (
                      <Focusable
                        key={speed}
                        onPress={() => handleHoldSpeedSelect(speed)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: isSelected ? 'white' : 'rgba(255,255,255,0.06)',
                          borderWidth: 1,
                          borderColor: isSelected ? 'white' : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <Text style={{
                          color: isSelected ? 'black' : 'white',
                          fontWeight: isSelected ? '700' : '500',
                          fontSize: 14
                        }}>
                          {speed}x
                        </Text>
                      </Focusable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

export default SpeedModal;
