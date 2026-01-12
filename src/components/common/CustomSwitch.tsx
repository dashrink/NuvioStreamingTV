import React, { useEffect } from 'react';
import { Platform, StyleSheet, Switch } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useSharedValue,
} from 'react-native-reanimated';

import Focusable from './Focusable';
import { useTheme } from '../../contexts/ThemeContext';

interface CustomSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({ value, onValueChange, disabled }) => {
  const { currentTheme } = useTheme();
  const thumbPos = useSharedValue(value ? 20 : 0);

  useEffect(() => {
    thumbPos.value = withTiming(value ? 20 : 0, { duration: 200 });
  }, [value]);

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbPos.value }],
  }));

  const animatedTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      thumbPos.value,
      [0, 20],
      [currentTheme.colors.elevation2, currentTheme.colors.primary]
    ),
  }));

  if (Platform.isTV) {
    return (
      <Focusable
        onPress={() => onValueChange(!value)}
        disabled={disabled}
        style={styles.tvContainer}
      >
        <Animated.View style={[styles.track, animatedTrackStyle]}>
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: currentTheme.colors.white },
              animatedThumbStyle,
            ]}
          />
        </Animated.View>
      </Focusable>
    );
  }

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: currentTheme.colors.elevation2,
        true: currentTheme.colors.primary,
      }}
      thumbColor={value ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis}
      ios_backgroundColor={currentTheme.colors.elevation2}
    />
  );
};

const styles = StyleSheet.create({
  tvContainer: {
    width: 51,
    height: 31,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  track: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
});

export default React.memo(CustomSwitch);
