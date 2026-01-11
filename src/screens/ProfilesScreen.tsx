/**
 * ProfilesScreen - Admin management screen for profiles
 * Allows creating, editing, and deleting profiles
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import { useTraktContext } from '../contexts/TraktContext';
import {
  ProfileCard,
  ProfileEditModal,
  PinSetupModal,
  PinEntryModal,
} from '../components/profile';
import {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
  MAX_PROFILES,
  AVATAR_OPTIONS,
  KIDS_AVATAR_OPTIONS,
} from '../types/profile';
import CustomAlert from '../components/CustomAlert';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

const ProfilesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const { isAuthenticated } = useTraktContext();
  const {
    profiles,
    activeProfile,
    profileCount,
    canCreateProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setProfilePin,
    removeProfilePin,
    verifyProfilePin,
    checkProfileHasPin,
  } = useProfile();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [showPinVerifyModal, setShowPinVerifyModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pendingAction, setPendingAction] = useState<'delete' | 'removePin' | null>(null);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<Array<{
    label: string;
    onPress: () => void;
    style?: object;
  }>>([]);

  const openAlert = (
    title: string,
    message: string,
    actions?: Array<{ label: string; onPress: () => void; style?: object }>
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertActions(actions && actions.length > 0 ? actions : [{ label: 'OK', onPress: () => {} }]);
    setAlertVisible(true);
  };

  // Get avatar for a profile
  const getAvatar = (avatarId: string) => {
    const allAvatars = [...AVATAR_OPTIONS, ...KIDS_AVATAR_OPTIONS];
    return allAvatars.find(a => a.id === avatarId) || AVATAR_OPTIONS[0];
  };

  const handleBack = () => {
    triggerLight(); // Navigation
    navigation.goBack();
  };

  const handleCreateProfile = async (input: CreateProfileInput) => {
    triggerMedium(); // Primary button action
    const newProfile = await createProfile(input);
    if (newProfile) {
      setShowCreateModal(false);
      return true;
    }
    return false;
  };

  const handleEditProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setShowEditModal(true);
  };

  const handleUpdateProfile = async (input: UpdateProfileInput) => {
    if (!selectedProfile) return false;

    const updated = await updateProfile(selectedProfile.id, input);
    if (updated) {
      setShowEditModal(false);
      setSelectedProfile(null);
      return true;
    }
    return false;
  };

  const handleDeleteProfile = async (profile: Profile) => {
    triggerHeavy(); // Destructive action

    // Check if it's the last profile
    if (profileCount <= 1) {
      openAlert('Cannot Delete', 'You must have at least one profile.');
      return;
    }

    // Check if it's the active profile
    if (profile.id === activeProfile?.id) {
      openAlert(
        'Cannot Delete',
        'Cannot delete the active profile. Please switch to another profile first.'
      );
      return;
    }

    // Check if PIN protected
    const hasPin = await checkProfileHasPin(profile.id);
    if (hasPin) {
      setSelectedProfile(profile);
      setPendingAction('delete');
      setShowPinVerifyModal(true);
      return;
    }

    // Confirm deletion
    openAlert(
      'Delete Profile',
      `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
      [
        { label: 'Cancel', onPress: () => {} },
        {
          label: 'Delete',
          onPress: async () => {
            const success = await deleteProfile(profile.id);
            if (!success) {
              openAlert('Error', 'Failed to delete profile.');
            }
          },
        },
      ]
    );
  };

  const handleSetupPin = () => {
    if (!selectedProfile) return;
    setShowEditModal(false);
    setShowPinSetupModal(true);
  };

  const handlePinSetupComplete = async (pin: string) => {
    if (!selectedProfile) return false;

    const success = await setProfilePin(selectedProfile.id, pin);
    if (success) {
      setShowPinSetupModal(false);
      setSelectedProfile(null);
      openAlert('Success', 'PIN has been set successfully.');
      return true;
    }
    return false;
  };

  const handleRemovePin = async () => {
    if (!selectedProfile) return;

    setShowEditModal(false);
    setPendingAction('removePin');
    setShowPinVerifyModal(true);
  };

  const handlePinVerified = async () => {
    if (!selectedProfile || !pendingAction) return;

    setShowPinVerifyModal(false);

    if (pendingAction === 'delete') {
      const success = await deleteProfile(selectedProfile.id);
      if (!success) {
        openAlert('Error', 'Failed to delete profile.');
      }
    } else if (pendingAction === 'removePin') {
      const success = await removeProfilePin(selectedProfile.id);
      if (success) {
        openAlert('Success', 'PIN has been removed.');
      } else {
        openAlert('Error', 'Failed to remove PIN.');
      }
    }

    setSelectedProfile(null);
    setPendingAction(null);
  };

  const handleVerifyPin = async (pin: string) => {
    if (!selectedProfile) return { success: false };

    const result = await verifyProfilePin(selectedProfile.id, pin);
    if (result.success) {
      handlePinVerified();
    }
    return result;
  };

  const renderProfileItem = ({ item }: { item: Profile }) => {
    const avatar = getAvatar(item.avatarId);
    const isActive = item.id === activeProfile?.id;
    const isKids = item.type === 'kids';

    return (
      <View style={styles.profileItem}>
        <TouchableOpacity
          style={[
            styles.profileContent,
            {
              backgroundColor: currentTheme.colors.elevation2,
              borderColor: isActive ? currentTheme.colors.primary : 'transparent',
            },
          ]}
          onPress={() => {
            triggerMedium(); // Profile selection (theme/profile selection pattern)
            handleEditProfile(item);
          }}
          activeOpacity={0.7}
        >
          {/* Avatar */}
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: avatar.color },
            ]}
          >
            <MaterialIcons
              name={avatar.icon as any}
              size={24}
              color="#FFFFFF"
            />
            {item.isPinProtected && (
              <View
                style={[
                  styles.pinBadge,
                  { backgroundColor: currentTheme.colors.darkBackground },
                ]}
              >
                <MaterialIcons name="lock" size={10} color={currentTheme.colors.text} />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: currentTheme.colors.text }]}>
                {item.name}
              </Text>
              {item.isAdmin && (
                <View
                  style={[
                    styles.adminBadge,
                    { backgroundColor: currentTheme.colors.primary },
                  ]}
                >
                  <MaterialIcons name="admin-panel-settings" size={10} color="#FFF" />
                </View>
              )}
              {isKids && (
                <View style={[styles.kidsBadge, { backgroundColor: '#FF6B6B' }]}>
                  <Text style={styles.kidsBadgeText}>KIDS</Text>
                </View>
              )}
            </View>
            <Text style={[styles.profileType, { color: currentTheme.colors.textMuted }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Profile
              {isActive && ' • Active'}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditProfile(item)}
            >
              <MaterialIcons name="edit" size={20} color={currentTheme.colors.primary} />
            </TouchableOpacity>
            {!isActive && profileCount > 1 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteProfile(item)}
              >
                <MaterialIcons name="delete" size={20} color={currentTheme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
        MANAGE PROFILES ({profileCount}/{MAX_PROFILES})
      </Text>
      <Text style={[styles.sectionDescription, { color: currentTheme.colors.textMuted }]}>
        Create and manage profiles for different users. Each profile can have its own content restrictions and PIN protection.
      </Text>
    </>
  );

  const renderFooter = () => (
    <TouchableOpacity
      style={[
        styles.addButton,
        {
          backgroundColor: canCreateProfile
            ? currentTheme.colors.elevation2
            : currentTheme.colors.elevation1,
          opacity: canCreateProfile ? 1 : 0.5,
        },
      ]}
      onPress={() => {
        if (canCreateProfile) {
          triggerLight(); // Modal open
          setShowCreateModal(true);
        }
      }}
      disabled={!canCreateProfile}
    >
      <MaterialIcons
        name="add"
        size={24}
        color={canCreateProfile ? currentTheme.colors.primary : currentTheme.colors.textMuted}
      />
      <Text
        style={[
          styles.addButtonText,
          {
            color: canCreateProfile ? currentTheme.colors.text : currentTheme.colors.textMuted,
          },
        ]}
      >
        Add New Profile
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: currentTheme.colors.darkBackground },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
          Profiles
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          data={profiles}
          renderItem={renderProfileItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Create Profile Modal */}
      <ProfileEditModal
        visible={showCreateModal}
        mode="create"
        currentProfileCount={profileCount}
        onSave={handleCreateProfile}
        onCancel={() => setShowCreateModal(false)}
      />

      {/* Edit Profile Modal */}
      <ProfileEditModal
        visible={showEditModal}
        mode="edit"
        profile={selectedProfile}
        currentProfileCount={profileCount}
        onSave={handleUpdateProfile}
        onCancel={() => {
          setShowEditModal(false);
          setSelectedProfile(null);
        }}
        onSetupPin={handleSetupPin}
        onRemovePin={handleRemovePin}
      />

      {/* PIN Setup Modal */}
      <PinSetupModal
        visible={showPinSetupModal}
        title="Set Profile PIN"
        onComplete={handlePinSetupComplete}
        onCancel={() => {
          setShowPinSetupModal(false);
          setSelectedProfile(null);
        }}
      />

      {/* PIN Verify Modal */}
      <PinEntryModal
        visible={showPinVerifyModal}
        profileName={selectedProfile?.name || ''}
        onSubmit={handleVerifyPin}
        onCancel={() => {
          setShowPinVerifyModal(false);
          setSelectedProfile(null);
          setPendingAction(null);
        }}
      />

      {/* Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 16 : 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  profileItem: {
    marginBottom: 12,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  pinBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  adminBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kidsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kidsBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '700',
  },
  profileType: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ProfilesScreen;