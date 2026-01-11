/**
 * AvatarSelector - Component for selecting profile avatars
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import {
  AVATAR_OPTIONS,
  KIDS_AVATAR_OPTIONS,
  TEEN_AVATAR_OPTIONS,
  AvatarOption,
} from '../../types/profile';

interface AvatarSelectorProps {
  selectedAvatarId: string;
  onSelect: (avatarId: string) => void;
  isKidsProfile?: boolean;
  isTeenProfile?: boolean;
  columns?: number;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatarId,
  onSelect,
  isKidsProfile = false,
  isTeenProfile = false,
  columns = 4,
}) => {
  const { currentTheme } = useTheme();

  // Get available avatars based on profile type
  const availableAvatars = isKidsProfile
    ? [...KIDS_AVATAR_OPTIONS, ...AVATAR_OPTIONS]
    : isTeenProfile
      ? [...TEEN_AVATAR_OPTIONS, ...AVATAR_OPTIONS]
      : AVATAR_OPTIONS;

  const renderAvatar = (avatar: AvatarOption) => {
    const isSelected = avatar.id === selectedAvatarId;

    return (
      <TouchableOpacity
        key={avatar.id}
        style={[
          styles.avatarItem,
          {
            width: `${100 / columns - 4}%`,
            borderColor: isSelected ? currentTheme.colors.primary : 'transparent',
            backgroundColor: isSelected
              ? `${currentTheme.colors.primary}20`
              : currentTheme.colors.elevation2,
          },
        ]}
        onPress={() => onSelect(avatar.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatarCircle, { backgroundColor: avatar.color }]}>
          <MaterialIcons name={avatar.icon as any} size={28} color="#FFFFFF" />
        </View>
        <Text
          style={[
            styles.avatarName,
            {
              color: isSelected ? currentTheme.colors.primary : currentTheme.colors.textMuted,
            },
          ]}
          numberOfLines={1}
        >
          {avatar.name}
        </Text>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: currentTheme.colors.primary }]}>
            <MaterialIcons name="check" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>Choose Avatar</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.avatarGrid}
      >
        {availableAvatars.map(renderAvatar)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scrollView: {
    maxHeight: 280,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarItem: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AvatarSelector;
