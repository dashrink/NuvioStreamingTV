/**
 * ProfileSelectorScreen - Screen for selecting user profiles
 * Displays at app launch or when switching profiles
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import {
  ProfileCard,
  PinEntryModal,
  ProfileEditModal,
} from '../components/profile';
import {
  Profile,
  CreateProfileInput,
  MAX_PROFILES,
} from '../types/profile';
import CustomAlert from '../components/CustomAlert';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileSelectorScreenProps {
  onProfileSelected?: () => void;
}

const ProfileSelectorScreen: React.FC<ProfileSelectorScreenProps> = ({
  onProfileSelected,
}) => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const {
    profiles,
    activeProfile,
    isLoading,
    canCreateProfile,
    profileCount,
    switchProfile,
    createProfile,
    checkProfileHasPin,
    getLockoutInfo,
    loadProfiles,
  } = useProfile();

  // Modal states
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pinLockoutInfo, setPinLockoutInfo] = useState<{
    lockedUntil?: number;
    attemptsRemaining?: number;
  }>({});

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

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleProfilePress = useCallback(async (profile: Profile) => {
    if (isEditMode) {
      // In edit mode, tapping a profile navigates to edit
      navigation.navigate('ProfileSettings' as never, { profileId: profile.id } as never);
      return;
    }

    // Check if PIN is required
    const hasPin = await checkProfileHasPin(profile.id);
    if (hasPin) {
      // Check lockout status
      const lockout = await getLockoutInfo(profile.id);
      setPinLockoutInfo({
        lockedUntil: lockout.lockedUntil || undefined,
        attemptsRemaining: lockout.attemptsRemaining,
      });
      setSelectedProfile(profile);
      setShowPinModal(true);
      return;
    }

    // No PIN - switch directly
    const result = await switchProfile(profile.id);
    if (result.success) {
      onProfileSelected?.();
    } else {
      openAlert('Error', result.error || 'Failed to switch profile');
    }
  }, [isEditMode, checkProfileHasPin, getLockoutInfo, switchProfile, navigation, onProfileSelected]);

  const handlePinSubmit = useCallback(async (pin: string) => {
    if (!selectedProfile) {
      return { success: false };
    }

    const result = await switchProfile(selectedProfile.id, pin);

    if (result.success) {
      setShowPinModal(false);
      setSelectedProfile(null);
      onProfileSelected?.();
    }

    return {
      success: result.success,
      attemptsRemaining: result.attemptsRemaining,
      lockedUntil: result.lockedUntil,
    };
  }, [selectedProfile, switchProfile, onProfileSelected]);

  const handleCreateProfile = useCallback(async (input: CreateProfileInput) => {
    const newProfile = await createProfile(input);
    if (newProfile) {
      setShowCreateModal(false);
      return true;
    }
    return false;
  }, [createProfile]);

  const handleAddProfile = useCallback(() => {
    if (!canCreateProfile) {
      openAlert(
        'Maximum Profiles Reached',
        `You can only have ${MAX_PROFILES} profiles. Please delete an existing profile to create a new one.`
      );
      return;
    }
    setShowCreateModal(true);
  }, [canCreateProfile]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: currentTheme.colors.text }]}>
        Who's Watching?
      </Text>
      <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
        Select your profile to continue
      </Text>
    </View>
  );

  const renderProfiles = () => {
    // Calculate items per row based on screen width
    const cardWidth = 116; // card width + margin
    const maxPerRow = Math.floor(SCREEN_WIDTH / cardWidth);
    const itemsPerRow = Math.min(maxPerRow, profiles.length + 1);

    return (
      <View style={styles.profilesContainer}>
        <ScrollView
          contentContainerStyle={[
            styles.profilesGrid,
            { justifyContent: itemsPerRow <= 3 ? 'center' : 'flex-start' },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {profiles.map((profile) => (
            <View key={profile.id} style={styles.profileCardWrapper}>
              <ProfileCard
                profile={profile}
                isActive={profile.id === activeProfile?.id}
                isEditMode={isEditMode}
                onPress={() => handleProfilePress(profile)}
                onEdit={() => {
                  navigation.navigate('ProfileSettings' as never, { profileId: profile.id } as never);
                }}
              />
            </View>
          ))}

          {/* Add Profile Button */}
          {canCreateProfile && !isEditMode && (
            <View style={styles.profileCardWrapper}>
              <TouchableOpacity
                style={[
                  styles.addProfileCard,
                  { backgroundColor: currentTheme.colors.elevation2 },
                ]}
                onPress={handleAddProfile}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.addIconContainer,
                    { backgroundColor: currentTheme.colors.primary },
                  ]}
                >
                  <MaterialIcons name="add" size={32} color="#FFFFFF" />
                </View>
                <Text
                  style={[
                    styles.addProfileText,
                    { color: currentTheme.colors.textMuted },
                  ]}
                >
                  Add Profile
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[
          styles.manageButton,
          {
            backgroundColor: isEditMode
              ? currentTheme.colors.primary
              : currentTheme.colors.elevation2,
          },
        ]}
        onPress={() => setIsEditMode(!isEditMode)}
      >
        <MaterialIcons
          name={isEditMode ? 'check' : 'edit'}
          size={20}
          color={isEditMode ? '#FFF' : currentTheme.colors.text}
        />
        <Text
          style={[
            styles.manageButtonText,
            { color: isEditMode ? '#FFF' : currentTheme.colors.text },
          ]}
        >
          {isEditMode ? 'Done' : 'Manage Profiles'}
        </Text>
      </TouchableOpacity>

      {/* Profile count indicator */}
      <Text style={[styles.profileCount, { color: currentTheme.colors.textMuted }]}>
        {profileCount} / {MAX_PROFILES} profiles
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: currentTheme.colors.darkBackground },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {renderHeader()}
      {renderProfiles()}
      {renderFooter()}

      {/* PIN Entry Modal */}
      <PinEntryModal
        visible={showPinModal}
        profileName={selectedProfile?.name || ''}
        onSubmit={handlePinSubmit}
        onCancel={() => {
          setShowPinModal(false);
          setSelectedProfile(null);
        }}
        lockedUntil={pinLockoutInfo.lockedUntil}
        attemptsRemaining={pinLockoutInfo.attemptsRemaining}
      />

      {/* Create Profile Modal */}
      <ProfileEditModal
        visible={showCreateModal}
        mode="create"
        currentProfileCount={profileCount}
        onSave={handleCreateProfile}
        onCancel={() => setShowCreateModal(false)}
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
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 40 : 40,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  profilesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  profileCardWrapper: {
    margin: 8,
  },
  addProfileCard: {
    width: 100,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  addIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addProfileText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginBottom: 12,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  profileCount: {
    fontSize: 12,
  },
});

export default ProfileSelectorScreen;
