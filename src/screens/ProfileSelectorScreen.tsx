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
import { useNavigation, NavigationProp, CommonActions } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import {
  ProfileCard,
  PinEntryModal,
  ProfileEditModal,
  ForgotPinModal,
} from '../components/profile';
import { Profile, CreateProfileInput, UpdateProfileInput, MAX_PROFILES } from '../types/profile';
import CustomAlert from '../components/CustomAlert';
import { RootStackParamList } from '../navigation/AppNavigator';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileSelectorScreenProps {
  onProfileSelected?: () => void;
}

const ProfileSelectorScreen: React.FC<ProfileSelectorScreenProps> = ({ onProfileSelected }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
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
  const [alertActions, setAlertActions] = useState<
    Array<{
      label: string;
      onPress: () => void;
      style?: object;
    }>
  >([]);

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

  // Navigate to MainTabs after profile is selected
  const navigateToMain = useCallback(() => {
    onProfileSelected?.();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      })
    );
  }, [navigation, onProfileSelected]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleProfilePress = useCallback(
    async (profile: Profile) => {
      if (isEditMode) {
        // In edit mode, tapping a profile opens edit modal (ProfileSettings screen will be added later)
        // For now, just show an alert
        openAlert('Edit Profile', `Edit mode for ${profile.name} - feature coming soon`);
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
        navigateToMain();
      } else {
        openAlert('Error', result.error || 'Failed to switch profile');
      }
    },
    [isEditMode, checkProfileHasPin, getLockoutInfo, switchProfile, navigateToMain]
  );

  const handlePinSubmit = useCallback(
    async (pin: string) => {
      if (!selectedProfile) {
        return { success: false };
      }

      const result = await switchProfile(selectedProfile.id, pin);

      if (result.success) {
        setShowPinModal(false);
        setSelectedProfile(null);
        navigateToMain();
      }

      return {
        success: result.success,
        attemptsRemaining: result.attemptsRemaining,
        lockedUntil: result.lockedUntil,
      };
    },
    [selectedProfile, switchProfile, navigateToMain]
  );

  const handleCreateProfile = useCallback(
    async (input: CreateProfileInput | UpdateProfileInput) => {
      // Type guard to ensure we have CreateProfileInput for create mode
      if (!('type' in input)) {
        return false;
      }
      const newProfile = await createProfile(input as CreateProfileInput);
      if (newProfile) {
        setShowCreateModal(false);
        return true;
      }
      return false;
    },
    [createProfile]
  );

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

  // Handle Quick Continue - continue with the last active profile
  const handleQuickContinue = useCallback(async () => {
    if (!activeProfile) return;

    const hasPin = await checkProfileHasPin(activeProfile.id);
    if (hasPin) {
      // Check lockout status
      const lockout = await getLockoutInfo(activeProfile.id);
      setPinLockoutInfo({
        lockedUntil: lockout.lockedUntil || undefined,
        attemptsRemaining: lockout.attemptsRemaining,
      });
      setSelectedProfile(activeProfile);
      setShowPinModal(true);
      return;
    }

    // No PIN - continue directly
    navigateToMain();
  }, [activeProfile, checkProfileHasPin, getLockoutInfo, navigateToMain]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: currentTheme.colors.text }]}>Who's Watching?</Text>
      <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
        Select your profile to continue
      </Text>
      {/* Quick Continue Button - shown when there's an active profile */}
      {activeProfile && !isEditMode && (
        <TouchableOpacity
          style={[styles.quickContinueButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={handleQuickContinue}
          activeOpacity={0.8}
        >
          <MaterialIcons name="play-arrow" size={20} color="#FFF" />
          <Text style={styles.quickContinueText}>Continue as {activeProfile.name}</Text>
        </TouchableOpacity>
      )}
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
          {profiles.map(profile => (
            <View key={profile.id} style={styles.profileCardWrapper}>
              <ProfileCard
                profile={profile}
                isActive={profile.id === activeProfile?.id}
                isEditMode={isEditMode}
                onPress={() => handleProfilePress(profile)}
                onEdit={() => {
                  // ProfileSettings screen will be added later
                  openAlert('Edit Profile', `Edit mode for ${profile.name} - feature coming soon`);
                }}
              />
            </View>
          ))}

          {/* Add Profile Button */}
          {canCreateProfile && !isEditMode && (
            <View style={styles.profileCardWrapper}>
              <TouchableOpacity
                style={[styles.addProfileCard, { backgroundColor: currentTheme.colors.elevation2 }]}
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
                <Text style={[styles.addProfileText, { color: currentTheme.colors.textMuted }]}>
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
      style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {renderHeader()}
      {renderProfiles()}
      {renderFooter()}

      {/* PIN Entry Modal */}
      <PinEntryModal
        visible={showPinModal}
        profileName={selectedProfile?.name || ''}
        profileId={selectedProfile?.id}
        onSubmit={handlePinSubmit}
        onCancel={() => {
          setShowPinModal(false);
          setSelectedProfile(null);
        }}
        onForgotPin={() => {
          setShowPinModal(false);
          setShowForgotPinModal(true);
        }}
        lockedUntil={pinLockoutInfo.lockedUntil}
        attemptsRemaining={pinLockoutInfo.attemptsRemaining}
      />

      {/* Forgot PIN Modal */}
      <ForgotPinModal
        visible={showForgotPinModal}
        profileId={selectedProfile?.id || ''}
        profileName={selectedProfile?.name || ''}
        onSuccess={() => {
          setShowForgotPinModal(false);
          setSelectedProfile(null);
          openAlert(
            'Success',
            'Your PIN has been reset. You can now use your new PIN to access this profile.'
          );
        }}
        onCancel={() => {
          setShowForgotPinModal(false);
          // Re-open PIN entry modal
          if (selectedProfile) {
            setShowPinModal(true);
          }
        }}
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
  quickContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  quickContinueText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
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
