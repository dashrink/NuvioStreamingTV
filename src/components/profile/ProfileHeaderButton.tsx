/**
 * ProfileHeaderButton - Compact profile button for screen headers
 * Shows current user's avatar and optionally name, with badges for Kids/Teen profiles
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions, NavigationProp } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';

import { useProfile } from '../../contexts/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext';
import { triggerLight } from '../../hooks/useHaptics';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  AVATAR_OPTIONS,
  KIDS_AVATAR_OPTIONS,
  TEEN_AVATAR_OPTIONS,
  isKidsProfile,
  isTeenProfile,
} from '../../types/profile';

interface ProfileHeaderButtonProps {
  /**
   * Whether to show the profile name next to the avatar
   */
  showName?: boolean;
  /**
   * Custom style for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Size of the avatar (default: 32)
   */
  size?: number;
}

/**
 * Get avatar details from avatar ID
 */
const getAvatarDetails = (avatarId: string) => {
  // Search in all avatar options
  const allAvatars = [...AVATAR_OPTIONS, ...KIDS_AVATAR_OPTIONS, ...TEEN_AVATAR_OPTIONS];
  return allAvatars.find(a => a.id === avatarId);
};

const ProfileHeaderButton: React.FC<ProfileHeaderButtonProps> = ({
  showName = false,
  style,
  size = 32,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const { activeProfile, isKidsMode } = useProfile();

  const handlePress = useCallback(() => {
    triggerLight();
    // Navigate to profile selector
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'ProfileSelector' }],
      })
    );
  }, [navigation]);

  if (!activeProfile) {
    return null;
  }

  const avatarDetails = getAvatarDetails(activeProfile.avatarId);
  const isKids = isKidsProfile(activeProfile);
  const isTeen = isTeenProfile(activeProfile);
  const isRestricted = isKids || isTeen;

  // Badge color based on profile type
  const badgeColor = isKids ? '#10b981' : isTeen ? '#6366f1' : undefined;
  const badgeText = isKids ? 'Kids' : isTeen ? 'Teen' : undefined;

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Switch profile. Current: ${activeProfile.name}`}
      accessibilityHint="Double tap to switch profiles"
    >
      {/* Avatar Circle */}
      <View
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: avatarDetails?.color || currentTheme.colors.primary,
            borderColor: isRestricted ? badgeColor : currentTheme.colors.elevation3,
            borderWidth: isRestricted ? 2 : 1,
          },
        ]}
      >
        <MaterialIcons
          name={(avatarDetails?.icon || 'person') as any}
          size={size * 0.55}
          color="#FFFFFF"
        />
      </View>

      {/* Profile Name (optional) */}
      {showName && (
        <Text style={[styles.profileName, { color: currentTheme.colors.text }]} numberOfLines={1}>
          {activeProfile.name}
        </Text>
      )}

      {/* Restricted Profile Badge (Kids/Teen) */}
      {isRestricted && badgeText && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}

      {/* Dropdown indicator */}
      <MaterialIcons name="arrow-drop-down" size={20} color={currentTheme.colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 80,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: -2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export { ProfileHeaderButton };
export default ProfileHeaderButton;
