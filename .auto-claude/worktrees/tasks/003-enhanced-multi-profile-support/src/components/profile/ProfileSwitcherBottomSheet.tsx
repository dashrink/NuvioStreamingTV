import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Platform,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileContext, Profile } from '../../contexts/ProfileContext';
import { mmkvStorage } from '../../services/mmkvStorage';
import { colors } from '../../styles/colors';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useTVBackHandler } from '../../hooks/useTVMode';
import { useFocusGroup } from '../../hooks/useFocusGroup';
import Focusable from '../common/Focusable';

// TV detection breakpoint
const TV_BREAKPOINT = 1440;

// Extended Profile interface with PIN support
export interface ProfileWithPin extends Profile {
  pinHash?: string;
}

interface ProfileSwitcherBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onProfileSwitch?: (profile: Profile) => void;
}

const PIN_STORAGE_PREFIX = 'profile_pin_hash_';

// Simple hash function for PIN validation (for local storage only)
const hashPin = (pin: string): string => {
  // Simple hash using base64 encoding of a salted PIN
  // In production, use a proper crypto library
  const salted = `nuvio_pin_salt_${pin}_end`;
  return btoa(salted);
};

export const ProfileSwitcherBottomSheet: React.FC<ProfileSwitcherBottomSheetProps> = ({
  visible,
  onClose,
  onProfileSwitch
}) => {
  const translateY = useSharedValue(400);
  const opacity = useSharedValue(0);
  const { currentTheme } = useTheme();
  const { profiles, activeProfile, setActiveProfile, loadProfiles } = useProfileContext();
  const SNAP_THRESHOLD = 100;

  // PIN entry state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithPin | null>(null);
  const [profilePins, setProfilePins] = useState<Record<string, string>>({});

  // TV focus management state
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  // Detect TV mode based on screen dimensions
  const isTV = useMemo(() => {
    return dimensions.width >= TV_BREAKPOINT || Platform.isTV;
  }, [dimensions.width]);

  // TV Back button handler
  useTVBackHandler(
    useCallback(() => {
      if (visible) {
        if (showPinModal) {
          // Close PIN modal
          setShowPinModal(false);
          setPinInput('');
          setPinError('');
          setSelectedProfile(null);
          return true;
        }
        onClose();
        return true;
      }
      return false;
    }, [visible, showPinModal, onClose])
  );

  // Focus groups for profile list and PIN modal
  const profileFocusGroup = useFocusGroup({
    id: 'profile-switcher-list',
    autoFocus: visible && !showPinModal && isTV,
    trapFocus: false,
    rememberFocus: true,
    onFocusChange: (index) => {
      if (index >= 0 && index < profiles.length && scrollToFocused && isTV) {
        // Auto-scroll to focused profile if needed
      }
    },
  });

  const pinButtonFocusGroup = useFocusGroup({
    id: 'pin-modal-buttons',
    autoFocus: showPinModal && isTV,
    trapFocus: true,
    rememberFocus: false,
  });

  const scrollToFocused = true;

  // Listen for dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Load profile PINs from storage
  useEffect(() => {
    const loadPins = async () => {
      const pins: Record<string, string> = {};
      for (const profile of profiles) {
        const pinHash = await mmkvStorage.getItem(`${PIN_STORAGE_PREFIX}${profile.id}`);
        if (pinHash) {
          pins[profile.id] = pinHash;
        }
      }
      setProfilePins(pins);
    };

    if (profiles.length > 0) {
      loadPins();
    }
  }, [profiles]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 300 });
      loadProfiles();

      // Focus first profile on TV when opening
      if (isTV && profiles.length > 0 && !showPinModal) {
        setTimeout(() => {
          // Find active profile index or use 0
          const activeIndex = profiles.findIndex(p => p.id === activeProfile?.id);
          const initialIndex = activeIndex >= 0 ? activeIndex : 0;
          profileFocusGroup.focusItem(initialIndex);
        }, 100);
      }
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(400, { duration: 300 });
      // Reset PIN state when closing
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      setSelectedProfile(null);
    }
  }, [visible, isTV, profiles, activeProfile, showPinModal]);

  // Focus PIN modal buttons when PIN modal opens
  useEffect(() => {
    if (showPinModal && isTV) {
      setTimeout(() => {
        pinButtonFocusGroup.focusFirst();
      }, 150);
    }
  }, [showPinModal, isTV]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      // Store initial position if needed
    })
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = interpolate(
          event.translationY,
          [0, 400],
          [1, 0],
          Extrapolate.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (event.translationY > SNAP_THRESHOLD || event.velocityY > 500) {
        translateY.value = withTiming(400, { duration: 300 });
        opacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 300 });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  }));

  const hasPin = useCallback((profileId: string): boolean => {
    return !!profilePins[profileId];
  }, [profilePins]);

  const verifyPin = useCallback((profileId: string, pin: string): boolean => {
    const storedHash = profilePins[profileId];
    if (!storedHash) return true; // No PIN set
    return hashPin(pin) === storedHash;
  }, [profilePins]);

  const handleProfileSelect = useCallback(async (profile: Profile) => {
    // If it's already the active profile, just close
    if (profile.id === activeProfile?.id) {
      onClose();
      return;
    }

    // Check if profile has a PIN
    if (hasPin(profile.id)) {
      setSelectedProfile(profile as ProfileWithPin);
      setShowPinModal(true);
      setPinInput('');
      setPinError('');
    } else {
      // No PIN, switch directly
      await setActiveProfile(profile.id);
      onProfileSwitch?.(profile);
      onClose();
    }
  }, [activeProfile, hasPin, setActiveProfile, onProfileSwitch, onClose]);

  const handlePinSubmit = useCallback(async () => {
    if (!selectedProfile) return;

    if (pinInput.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }

    if (verifyPin(selectedProfile.id, pinInput)) {
      // PIN correct, switch profile
      await setActiveProfile(selectedProfile.id);
      onProfileSwitch?.(selectedProfile);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      setSelectedProfile(null);
      onClose();
    } else {
      setPinError('Incorrect PIN. Please try again.');
      setPinInput('');
    }
  }, [selectedProfile, pinInput, verifyPin, setActiveProfile, onProfileSwitch, onClose]);

  const handlePinCancel = useCallback(() => {
    setShowPinModal(false);
    setPinInput('');
    setPinError('');
    setSelectedProfile(null);
  }, []);

  const backgroundColor = currentTheme.colors.elevation2 || '#1A1A1A';

  const renderProfileItem = (profile: Profile, index: number) => {
    const isActive = profile.id === activeProfile?.id;
    const hasPinProtection = hasPin(profile.id);
    const isFocused = isTV && profileFocusGroup.focusedIndex === index;

    return (
      <Focusable
        key={profile.id}
        ref={profileFocusGroup.getItemRef(index)}
        variant="card"
        style={[
          styles.profileItem,
          isTV && styles.profileItemTV,
          isActive && {
            backgroundColor: `${currentTheme.colors.primary}30`,
            borderColor: currentTheme.colors.primary,
            borderWidth: 1,
          },
        ]}
        focusedStyle={
          isTV
            ? {
                backgroundColor: `${currentTheme.colors.primary}40`,
              }
            : undefined
        }
        onPress={() => handleProfileSelect(profile)}
        onFocus={profileFocusGroup.handleItemFocus(index)}
        onBlur={profileFocusGroup.handleItemBlur}
        hasTVPreferredFocus={isTV && index === profileFocusGroup.focusedIndex}
        accessibilityLabel={`${profile.name} profile${isActive ? ', currently active' : ''}${hasPinProtection ? ', PIN protected' : ''}`}
        accessibilityHint={isActive ? 'Currently active profile' : 'Double-tap to switch to this profile'}
        enableScale={isTV}
        enableGlow={isTV}
        enableBorder={isTV}
        borderRadius={isTV ? 20 : 16}
      >
        <View style={[styles.avatarContainer, isTV && styles.avatarContainerTV]}>
          <MaterialIcons
            name="account-circle"
            size={isTV ? 64 : 48}
            color={
              isFocused
                ? currentTheme.colors.primary
                : isActive
                ? currentTheme.colors.primary
                : currentTheme.colors.text
            }
          />
          {hasPinProtection && (
            <View
              style={[
                styles.pinBadge,
                { backgroundColor: currentTheme.colors.primary },
                isTV && styles.pinBadgeTV,
              ]}
            >
              <MaterialIcons name="lock" size={isTV ? 14 : 12} color="#FFFFFF" />
            </View>
          )}
        </View>
        <Text
          style={[
            styles.profileName,
            isTV && styles.profileNameTV,
            { color: currentTheme.colors.text },
            (isActive || isFocused) && {
              color: currentTheme.colors.primary,
              fontWeight: '600',
            },
          ]}
          numberOfLines={1}
        >
          {profile.name}
        </Text>
        {isActive && (
          <View
            style={[
              styles.activeIndicator,
              { backgroundColor: currentTheme.colors.primary },
              isTV && styles.activeIndicatorTV,
            ]}
          />
        )}
      </Focusable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[styles.modalOverlay, overlayStyle]}>
          <Pressable style={styles.modalOverlayPressable} onPress={onClose} />
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.menuContainer, menuStyle, { backgroundColor }]}>
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={[styles.header, isTV && styles.headerTV]}>
                <Text style={[
                  styles.headerTitle,
                  isTV && styles.headerTitleTV,
                  { color: currentTheme.colors.text }
                ]}>
                  Switch Profile
                </Text>
                <Focusable
                  variant="button"
                  style={[styles.closeButton, isTV && styles.closeButtonTV]}
                  onPress={onClose}
                  accessibilityLabel="Close profile switcher"
                  accessibilityHint="Double-tap to close"
                  enableScale={isTV}
                  enableGlow={false}
                  enableBorder={isTV}
                  borderRadius={isTV ? 8 : 4}
                >
                  <MaterialIcons
                    name="close"
                    size={isTV ? 32 : 24}
                    color={currentTheme.colors.textMuted}
                  />
                </Focusable>
              </View>

              {/* Profiles List */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.profilesContainer,
                  isTV && styles.profilesContainerTV
                ]}
              >
                {profiles.map((profile, index) => renderProfileItem(profile, index))}
              </ScrollView>

              {/* Active Profile Info */}
              {activeProfile && (
                <View style={styles.activeProfileInfo}>
                  <Text style={[styles.activeProfileLabel, { color: currentTheme.colors.textMuted }]}>
                    Current Profile:
                  </Text>
                  <Text style={[styles.activeProfileName, { color: currentTheme.colors.text }]}>
                    {activeProfile.name}
                  </Text>
                </View>
              )}
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureHandlerRootView>

      {/* PIN Entry Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={handlePinCancel}
      >
        <View style={styles.pinModalOverlay}>
          <View style={[styles.pinModalContent, isTV && styles.pinModalContentTV, { backgroundColor }]}>
            <Text style={[
              styles.pinModalTitle,
              isTV && styles.pinModalTitleTV,
              { color: currentTheme.colors.text }
            ]}>
              Enter PIN
            </Text>
            <Text style={[
              styles.pinModalSubtitle,
              isTV && styles.pinModalSubtitleTV,
              { color: currentTheme.colors.textMuted }
            ]}>
              {selectedProfile?.name} is protected by a PIN
            </Text>

            <TextInput
              style={[
                styles.pinInput,
                isTV && styles.pinInputTV,
                {
                  backgroundColor: `${currentTheme.colors.textMuted}20`,
                  color: currentTheme.colors.text,
                  borderColor: pinError ? currentTheme.colors.error : currentTheme.colors.border
                }
              ]}
              value={pinInput}
              onChangeText={(text) => {
                // Only allow digits
                const digits = text.replace(/\D/g, '').slice(0, 4);
                setPinInput(digits);
                setPinError('');
              }}
              placeholder="****"
              placeholderTextColor={currentTheme.colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus={!isTV}
              accessible={true}
              accessibilityLabel="Enter 4 digit PIN"
              {...(isTV && {
                hasTVPreferredFocus: showPinModal,
                isTVSelectable: true,
              })}
            />

            {pinError ? (
              <Text style={[
                styles.pinError,
                isTV && styles.pinErrorTV,
                { color: currentTheme.colors.error }
              ]}>
                {pinError}
              </Text>
            ) : null}

            <View style={[styles.pinModalButtons, isTV && styles.pinModalButtonsTV]}>
              <Focusable
                ref={pinButtonFocusGroup.getItemRef(0)}
                variant="button"
                style={[styles.pinButton, styles.pinCancelButton, isTV && styles.pinButtonTV]}
                onPress={handlePinCancel}
                onFocus={pinButtonFocusGroup.handleItemFocus(0)}
                onBlur={pinButtonFocusGroup.handleItemBlur}
                accessibilityLabel="Cancel PIN entry"
                accessibilityHint="Double-tap to cancel"
                hasTVPreferredFocus={isTV && showPinModal && pinButtonFocusGroup.focusedIndex === 0}
                enableScale={isTV}
                enableGlow={isTV}
                enableBorder={isTV}
                borderRadius={isTV ? 16 : 12}
              >
                <Text
                  style={[
                    { color: currentTheme.colors.textMuted },
                    isTV && styles.pinButtonTextTV,
                  ]}
                >
                  Cancel
                </Text>
              </Focusable>
              <Focusable
                ref={pinButtonFocusGroup.getItemRef(1)}
                variant="button"
                style={[
                  styles.pinButton,
                  styles.pinSubmitButton,
                  isTV && styles.pinButtonTV,
                  { backgroundColor: currentTheme.colors.primary },
                ]}
                onPress={handlePinSubmit}
                onFocus={pinButtonFocusGroup.handleItemFocus(1)}
                onBlur={pinButtonFocusGroup.handleItemBlur}
                accessibilityLabel="Unlock profile"
                accessibilityHint="Double-tap to unlock with entered PIN"
                hasTVPreferredFocus={isTV && showPinModal && pinButtonFocusGroup.focusedIndex === 1}
                enableScale={isTV}
                enableGlow={isTV}
                enableBorder={isTV}
                borderRadius={isTV ? 16 : 12}
              >
                <Text
                  style={[
                    { color: '#FFFFFF', fontWeight: '600' },
                    isTV && styles.pinButtonTextTV,
                  ]}
                >
                  Unlock
                </Text>
              </Focusable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.transparentDark,
  },
  modalOverlayPressable: {
    flex: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.transparentLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  menuContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.select({ ios: 40, android: 24 }),
    minHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  profilesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
  },
  profileItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 100,
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  pinBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 80,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  activeProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  activeProfileLabel: {
    fontSize: 13,
  },
  activeProfileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  // PIN Modal Styles
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pinModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  pinModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  pinModalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  pinInput: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  pinError: {
    fontSize: 13,
    marginBottom: 16,
  },
  pinModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  pinButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pinSubmitButton: {},

  // TV-specific styles
  headerTV: {
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitleTV: {
    fontSize: 28,
    fontWeight: '700',
  },
  closeButtonTV: {
    padding: 8,
    borderRadius: 8,
  },
  profilesContainerTV: {
    paddingHorizontal: 32,
    paddingVertical: 32,
    gap: 24,
  },
  profileItemTV: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 20,
    minWidth: 140,
    marginRight: 20,
  },
  avatarContainerTV: {
    marginBottom: 12,
  },
  pinBadgeTV: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  profileNameTV: {
    fontSize: 18,
    maxWidth: 120,
  },
  activeIndicatorTV: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  // TV PIN Modal Styles
  pinModalContentTV: {
    maxWidth: 450,
    padding: 36,
    borderRadius: 20,
  },
  pinModalTitleTV: {
    fontSize: 28,
    marginBottom: 12,
  },
  pinModalSubtitleTV: {
    fontSize: 18,
    marginBottom: 32,
  },
  pinInputTV: {
    height: 72,
    fontSize: 32,
    borderRadius: 16,
    letterSpacing: 12,
    marginBottom: 24,
  },
  pinErrorTV: {
    fontSize: 16,
    marginBottom: 24,
  },
  pinModalButtonsTV: {
    gap: 20,
  },
  pinButtonTV: {
    height: 60,
    borderRadius: 16,
  },
  pinButtonTextTV: {
    fontSize: 18,
  },
});

export default ProfileSwitcherBottomSheet;
