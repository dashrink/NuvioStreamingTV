/**
 * ProfileCard - Card component for displaying a profile in the selector
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Profile,
  AVATAR_OPTIONS,
  KIDS_AVATAR_OPTIONS,
  AvatarOption,
} from '../../types/profile';

interface ProfileCardProps {
  profile: Profile;
  isActive?: boolean;
  isEditMode?: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isActive = false,
  isEditMode = false,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { currentTheme } = useTheme();

  // Find avatar
  const allAvatars = [...AVATAR_OPTIONS, ...KIDS_AVATAR_OPTIONS];
  const avatar: AvatarOption = allAvatars.find(a => a.id === profile.avatarId) || AVATAR_OPTIONS[0];

  const isKidsProfile = profile.type === 'kids';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isActive
              ? `${currentTheme.colors.primary}20`
              : currentTheme.colors.elevation2,
            borderColor: isActive
              ? currentTheme.colors.primary
              : isKidsProfile
                ? '#FF6B6B50'
                : 'transparent',
          },
        ]}
        onPress={isEditMode ? onEdit : onPress}
        activeOpacity={0.7}
      >
        {/* Edit mode overlay */}
        {isEditMode && (
          <View style={styles.editOverlay}>
            <View
              style={[
                styles.editIcon,
                { backgroundColor: currentTheme.colors.primary },
              ]}
            >
              <MaterialIcons name="edit" size={16} color="#FFF" />
            </View>
          </View>
        )}

        {/* Avatar */}
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: avatar.color },
          ]}
        >
          <MaterialIcons
            name={avatar.icon as any}
            size={32}
            color="#FFFFFF"
          />
          {/* PIN indicator */}
          {profile.isPinProtected && !isEditMode && (
            <View
              style={[
                styles.pinIndicator,
                { backgroundColor: currentTheme.colors.darkBackground },
              ]}
            >
              <MaterialIcons name="lock" size={12} color={currentTheme.colors.text} />
            </View>
          )}
        </View>

        {/* Profile name */}
        <Text
          style={[
            styles.name,
            {
              color: isActive
                ? currentTheme.colors.primary
                : currentTheme.colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {profile.name}
        </Text>

        {/* Kids badge */}
        {isKidsProfile && (
          <View style={[styles.kidsBadge, { backgroundColor: '#FF6B6B' }]}>
            <Text style={styles.kidsBadgeText}>KIDS</Text>
          </View>
        )}

        {/* Admin badge */}
        {profile.isAdmin && !isKidsProfile && (
          <View
            style={[
              styles.adminBadge,
              { backgroundColor: currentTheme.colors.primary },
            ]}
          >
            <MaterialIcons name="admin-panel-settings" size={10} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Delete button (only in edit mode and not for last/admin profile) */}
      {isEditMode && onDelete && (
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: currentTheme.colors.error },
          ]}
          onPress={onDelete}
        >
          <MaterialIcons name="close" size={16} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  card: {
    width: 100,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  pinIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  kidsBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kidsBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  adminBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

export default ProfileCard;
