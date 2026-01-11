/**
 * ProfileEditModal - Modal for creating and editing profiles
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { AvatarSelector } from './AvatarSelector';
import {
  ProfileType,
  AgeRating,
  AVATAR_OPTIONS,
  AGE_RATING_LEVELS,
  CreateProfileInput,
  UpdateProfileInput,
  Profile,
  MAX_PROFILES,
  PROFILE_AGE_RATING_BOUNDS,
  isAgeRatingWithinBounds,
} from '../../types/profile';

interface ProfileEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  profile?: Profile | null;
  currentProfileCount: number;
  onSave: (data: CreateProfileInput | UpdateProfileInput) => Promise<boolean>;
  onCancel: () => void;
  onSetupPin?: () => void;
  onRemovePin?: () => void;
}

// Available age ratings for selection
const AGE_RATING_OPTIONS: { value: AgeRating; label: string; description: string }[] = [
  { value: 'TV-Y', label: 'TV-Y / G', description: 'All ages' },
  { value: 'TV-PG', label: 'TV-PG / PG', description: 'Parental guidance' },
  { value: 'TV-14', label: 'TV-14 / PG-13', description: 'Parents strongly cautioned' },
  { value: 'TV-MA', label: 'TV-MA / R', description: 'Mature audiences' },
  { value: 'NC-17', label: 'NC-17', description: 'Adults only (no restrictions)' },
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  visible,
  mode,
  profile,
  currentProfileCount,
  onSave,
  onCancel,
  onSetupPin,
  onRemovePin,
}) => {
  const { currentTheme } = useTheme();
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0].id);
  const [profileType, setProfileType] = useState<ProfileType>('standard');
  const [maxAgeRating, setMaxAgeRating] = useState<AgeRating>('NC-17');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when modal opens or profile changes
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && profile) {
        setName(profile.name);
        setAvatarId(profile.avatarId);
        setProfileType(profile.type);
        setMaxAgeRating(profile.maxAgeRating);
      } else {
        setName('');
        setAvatarId(AVATAR_OPTIONS[0].id);
        setProfileType('standard');
        setMaxAgeRating('NC-17');
      }
      setError(null);
    }
  }, [visible, mode, profile]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a profile name');
      return;
    }

    if (mode === 'create' && currentProfileCount >= MAX_PROFILES) {
      setError(`Maximum profiles reached (${MAX_PROFILES}/${MAX_PROFILES})`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let data: CreateProfileInput | UpdateProfileInput;

      if (mode === 'create') {
        data = {
          name: name.trim(),
          type: profileType,
          avatarId,
          maxAgeRating: profileType === 'kids' ? 'TV-PG' : maxAgeRating,
        } as CreateProfileInput;
      } else {
        data = {
          name: name.trim(),
          avatarId,
          maxAgeRating: profileType === 'kids' ? 'TV-PG' : maxAgeRating,
        } as UpdateProfileInput;
      }

      const success = await onSave(data);
      if (!success) {
        setError('Failed to save profile');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileTypeChange = (type: ProfileType) => {
    setProfileType(type);
    // Automatically set appropriate age rating based on profile type
    if (type === 'kids') {
      setMaxAgeRating('TV-PG');
    } else if (type === 'teen') {
      setMaxAgeRating('TV-14');
    } else {
      setMaxAgeRating('NC-17');
    }
  };

  const isKidsProfile = profileType === 'kids';
  const isTeenProfile = profileType === 'teen';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: currentTheme.colors.text }]}>
              {mode === 'create' ? 'Create Profile' : 'Edit Profile'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, { backgroundColor: currentTheme.colors.primary }]}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>{isLoading ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Error message */}
            {error && (
              <View
                style={[styles.errorBanner, { backgroundColor: `${currentTheme.colors.error}20` }]}
              >
                <MaterialIcons name="error" size={20} color={currentTheme.colors.error} />
                <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>
                  {error}
                </Text>
              </View>
            )}

            {/* Profile Name */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>
                Profile Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: currentTheme.colors.elevation2,
                    color: currentTheme.colors.text,
                    borderColor: currentTheme.colors.border,
                  },
                ]}
                placeholder="Enter name"
                placeholderTextColor={currentTheme.colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={20}
                autoFocus={mode === 'create'}
              />
            </View>

            {/* Profile Type (only for create mode) */}
            {mode === 'create' && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>
                  Profile Type
                </Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor:
                          profileType === 'standard'
                            ? currentTheme.colors.primary
                            : currentTheme.colors.elevation2,
                        borderColor:
                          profileType === 'standard'
                            ? currentTheme.colors.primary
                            : currentTheme.colors.border,
                      },
                    ]}
                    onPress={() => handleProfileTypeChange('standard')}
                  >
                    <MaterialIcons
                      name="person"
                      size={24}
                      color={profileType === 'standard' ? '#FFF' : currentTheme.colors.text}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        {
                          color: profileType === 'standard' ? '#FFF' : currentTheme.colors.text,
                        },
                      ]}
                    >
                      Adult
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor:
                          profileType === 'teen' ? '#6366f1' : currentTheme.colors.elevation2,
                        borderColor:
                          profileType === 'teen' ? '#6366f1' : currentTheme.colors.border,
                      },
                    ]}
                    onPress={() => handleProfileTypeChange('teen')}
                  >
                    <MaterialIcons
                      name="school"
                      size={24}
                      color={profileType === 'teen' ? '#FFF' : currentTheme.colors.text}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        {
                          color: profileType === 'teen' ? '#FFF' : currentTheme.colors.text,
                        },
                      ]}
                    >
                      Teen
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor:
                          profileType === 'kids' ? '#FF6B6B' : currentTheme.colors.elevation2,
                        borderColor:
                          profileType === 'kids' ? '#FF6B6B' : currentTheme.colors.border,
                      },
                    ]}
                    onPress={() => handleProfileTypeChange('kids')}
                  >
                    <MaterialIcons
                      name="child-care"
                      size={24}
                      color={profileType === 'kids' ? '#FFF' : currentTheme.colors.text}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        {
                          color: profileType === 'kids' ? '#FFF' : currentTheme.colors.text,
                        },
                      ]}
                    >
                      Kids
                    </Text>
                  </TouchableOpacity>
                </View>
                {isKidsProfile && (
                  <Text style={[styles.hint, { color: currentTheme.colors.textMuted }]}>
                    Kids profiles only show age-appropriate content (G, PG, TV-Y, TV-Y7, TV-G,
                    TV-PG)
                  </Text>
                )}
                {isTeenProfile && (
                  <Text style={[styles.hint, { color: currentTheme.colors.textMuted }]}>
                    Teen profiles show content up to PG-13/TV-14. Admin can adjust the limit.
                  </Text>
                )}
              </View>
            )}

            {/* Avatar Selector */}
            <AvatarSelector
              selectedAvatarId={avatarId}
              onSelect={setAvatarId}
              isKidsProfile={isKidsProfile}
              isTeenProfile={isTeenProfile}
            />

            {/* Age Rating (not for kids profiles - they have fixed rating) */}
            {!isKidsProfile && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>
                  Content Rating Limit
                  {isTeenProfile && ' (Admin configurable within bounds)'}
                </Text>
                <View style={styles.ratingOptions}>
                  {AGE_RATING_OPTIONS.filter(option =>
                    isAgeRatingWithinBounds(option.value, profileType)
                  ).map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.ratingOption,
                        {
                          backgroundColor:
                            maxAgeRating === option.value
                              ? `${currentTheme.colors.primary}20`
                              : currentTheme.colors.elevation2,
                          borderColor:
                            maxAgeRating === option.value
                              ? currentTheme.colors.primary
                              : currentTheme.colors.border,
                        },
                      ]}
                      onPress={() => setMaxAgeRating(option.value)}
                    >
                      <View style={styles.ratingOptionContent}>
                        <Text
                          style={[
                            styles.ratingLabel,
                            {
                              color:
                                maxAgeRating === option.value
                                  ? currentTheme.colors.primary
                                  : currentTheme.colors.text,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.ratingDescription,
                            { color: currentTheme.colors.textMuted },
                          ]}
                        >
                          {option.description}
                        </Text>
                      </View>
                      {maxAgeRating === option.value && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={currentTheme.colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* PIN Settings (only for edit mode and non-kids profiles) */}
            {mode === 'edit' && profile && !isKidsProfile && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>
                  PIN Protection
                </Text>
                <View
                  style={[
                    styles.pinSection,
                    {
                      backgroundColor: currentTheme.colors.elevation2,
                      borderColor: currentTheme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.pinInfo}>
                    <MaterialIcons
                      name="lock"
                      size={24}
                      color={
                        profile.isPinProtected
                          ? currentTheme.colors.primary
                          : currentTheme.colors.textMuted
                      }
                    />
                    <View style={styles.pinTextContainer}>
                      <Text style={[styles.pinTitle, { color: currentTheme.colors.text }]}>
                        Profile PIN
                      </Text>
                      <Text
                        style={[styles.pinDescription, { color: currentTheme.colors.textMuted }]}
                      >
                        {profile.isPinProtected
                          ? 'This profile is PIN protected'
                          : 'Add a PIN to lock this profile'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.pinButton,
                      {
                        backgroundColor: profile.isPinProtected
                          ? currentTheme.colors.error
                          : currentTheme.colors.primary,
                      },
                    ]}
                    onPress={profile.isPinProtected ? onRemovePin : onSetupPin}
                  >
                    <Text style={styles.pinButtonText}>
                      {profile.isPinProtected ? 'Remove' : 'Set PIN'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  ratingOptions: {
    gap: 8,
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ratingOptionContent: {
    flex: 1,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  ratingDescription: {
    fontSize: 12,
  },
  pinSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  pinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  pinTextContainer: {
    flex: 1,
  },
  pinTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  pinDescription: {
    fontSize: 12,
  },
  pinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pinButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ProfileEditModal;
