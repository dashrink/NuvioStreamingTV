import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Profile, AVATAR_OPTIONS, KIDS_AVATAR_OPTIONS } from '../../types/profile';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

// TV detection breakpoint - matches ProfileSwitcherBottomSheet
const TV_BREAKPOINT = 1440;

// Focus animation duration
const FOCUS_ANIMATION_DURATION = 200;

export interface ProfileCardProps {
  profile: Profile;
  isActive?: boolean;
  hasPinProtection?: boolean;
  isEditMode?: boolean;
  onPress: (profile: Profile) => void;
  onEdit?: (profile: Profile) => void;
  onFocus?: (profileId: string) => void;
  onBlur?: () => void;
  hasTVPreferredFocus?: boolean;
  isFocused?: boolean;
  testID?: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Helper to get avatar info from avatarId
const getAvatarInfo = (avatarId: string, profileType: string) => {
  const allAvatars = [...AVATAR_OPTIONS, ...KIDS_AVATAR_OPTIONS];
  const avatar = allAvatars.find(a => a.id === avatarId);
  return avatar || AVATAR_OPTIONS[0];
};

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isActive = false,
  hasPinProtection = false,
  isEditMode = false,
  onPress,
  onEdit,
  onFocus,
  onBlur,
  hasTVPreferredFocus = false,
  isFocused: externalIsFocused,
  testID,
}) => {
  const { currentTheme } = useTheme();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [internalFocused, setInternalFocused] = useState(false);
  const cardRef = useRef<React.ElementRef<typeof TouchableOpacity> | null>(null);

  // Animation values
  const focusScale = useSharedValue(1);
  const focusBorderOpacity = useSharedValue(0);

  // Detect TV mode based on screen dimensions or Platform.isTV
  const isTV = useMemo(() => {
    return dimensions.width >= TV_BREAKPOINT || Platform.isTV;
  }, [dimensions.width]);

  // Use external focus state if provided, otherwise internal
  const isFocused = externalIsFocused !== undefined ? externalIsFocused : internalFocused;

  // Listen for dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Animate on focus change
  useEffect(() => {
    if (isFocused) {
      focusScale.value = withTiming(1.08, { duration: FOCUS_ANIMATION_DURATION });
      focusBorderOpacity.value = withTiming(1, { duration: FOCUS_ANIMATION_DURATION });
    } else {
      focusScale.value = withTiming(1, { duration: FOCUS_ANIMATION_DURATION });
      focusBorderOpacity.value = withTiming(0, { duration: FOCUS_ANIMATION_DURATION });
    }
  }, [isFocused, focusScale, focusBorderOpacity]);

  // Handle press
  const handlePress = useCallback(() => {
    if (isEditMode && onEdit) {
      onEdit(profile);
    } else {
      onPress(profile);
    }
  }, [isEditMode, onEdit, onPress, profile]);

  // Handle TV focus
  const handleFocus = useCallback(() => {
    setInternalFocused(true);
    onFocus?.(profile.id);
  }, [onFocus, profile.id]);

  // Handle TV blur
  const handleBlur = useCallback(() => {
    setInternalFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Animated styles for TV focus effects
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: focusScale.value }],
    };
  });

  const animatedFocusRingStyle = useAnimatedStyle(() => {
    return {
      opacity: focusBorderOpacity.value,
    };
  });

  // Dynamic styles based on state - filter out false values
  const containerStyles: ViewStyle[] = [
    styles.container,
    ...(isTV ? [styles.containerTV] : []),
    ...(isActive
      ? [
          {
            backgroundColor: `${currentTheme.colors.primary}30`,
            borderColor: currentTheme.colors.primary,
            borderWidth: 1,
          },
        ]
      : []),
    ...(isEditMode
      ? [
          {
            opacity: 0.8,
          },
        ]
      : []),
  ];

  // Get avatar info
  const avatarInfo = useMemo(() => {
    return getAvatarInfo(profile.avatarId, profile.type);
  }, [profile.avatarId, profile.type]);

  // Get avatar color based on profile or theme
  const avatarColor = useMemo(() => {
    // Use avatar's own color if available
    if (avatarInfo.color && !isFocused && !isActive) {
      return avatarInfo.color;
    }
    if (isFocused) return currentTheme.colors.primary;
    if (isActive) return currentTheme.colors.primary;
    return currentTheme.colors.text;
  }, [
    isFocused,
    isActive,
    avatarInfo.color,
    currentTheme.colors.primary,
    currentTheme.colors.text,
  ]);

  // Get name text style
  const nameTextStyle: TextStyle = useMemo(() => {
    return {
      color: isFocused || isActive ? currentTheme.colors.primary : currentTheme.colors.text,
      fontWeight: isFocused || isActive ? '600' : '400',
    };
  }, [isFocused, isActive, currentTheme.colors.primary, currentTheme.colors.text]);

  // Check if profile has PIN - use isPinProtected from profile or passed prop
  const showPinBadge = hasPinProtection || profile.isPinProtected;

  return (
    <AnimatedTouchableOpacity
      ref={cardRef}
      style={[containerStyles, animatedContainerStyle]}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={`${profile.name} profile${isActive ? ', currently active' : ''}${showPinBadge ? ', PIN protected' : ''}${isEditMode ? ', tap to edit' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      testID={testID || `profile-card-${profile.id}`}
      // TV-specific props for focus management
      {...(isTV && {
        hasTVPreferredFocus: hasTVPreferredFocus,
        isTVSelectable: true,
      })}
    >
      {/* Avatar Container */}
      <View style={[styles.avatarContainer, ...(isTV ? [styles.avatarContainerTV] : [])]}>
        {/* Use MaterialIcons with the avatar's icon name */}
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: `${avatarColor}20` },
            ...(isTV ? [styles.avatarCircleTV] : []),
          ]}
        >
          <MaterialIcons name={avatarInfo.icon as any} size={isTV ? 48 : 32} color={avatarColor} />
        </View>

        {/* PIN Protection Badge */}
        {showPinBadge && (
          <View
            style={[
              styles.pinBadge,
              { backgroundColor: currentTheme.colors.primary },
              ...(isTV ? [styles.pinBadgeTV] : []),
            ]}
          >
            <MaterialIcons name="lock" size={isTV ? 16 : 12} color="#FFFFFF" />
          </View>
        )}

        {/* Edit Mode Overlay */}
        {isEditMode && (
          <View style={styles.editOverlay}>
            <MaterialIcons name="edit" size={isTV ? 24 : 18} color="#FFFFFF" />
          </View>
        )}

        {/* Profile Type Badge for Kids/Teen */}
        {(profile.type === 'kids' || profile.type === 'teen') && (
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: profile.type === 'kids' ? '#FF6B6B' : '#6366f1',
              },
            ]}
          >
            <Text style={styles.typeBadgeText}>{profile.type === 'kids' ? 'Kids' : 'Teen'}</Text>
          </View>
        )}
      </View>

      {/* Profile Name */}
      <Text
        style={[styles.profileName, ...(isTV ? [styles.profileNameTV] : []), nameTextStyle]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {profile.name}
      </Text>

      {/* Active Indicator Dot */}
      {isActive && (
        <View
          style={[
            styles.activeIndicator,
            { backgroundColor: currentTheme.colors.primary },
            ...(isTV ? [styles.activeIndicatorTV] : []),
          ]}
        />
      )}

      {/* TV Focus Ring - Outer glow effect */}
      {isTV && (
        <Animated.View
          style={[
            styles.tvFocusRing,
            { borderColor: currentTheme.colors.primary },
            animatedFocusRingStyle,
          ]}
          pointerEvents="none"
        />
      )}

      {/* TV Focus Border - Inner highlight */}
      {isTV && isFocused && (
        <View
          style={[styles.tvFocusBorder, { borderColor: currentTheme.colors.primary }]}
          pointerEvents="none"
        />
      )}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base Container - Mobile
  container: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 100,
    marginRight: 12,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },

  // Container - TV specific
  containerTV: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 24,
    minWidth: 160,
    marginRight: 24,
    borderWidth: 3,
  },

  // Avatar Container - Mobile
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },

  // Avatar Container - TV specific
  avatarContainerTV: {
    marginBottom: 16,
  },

  // Avatar Circle
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarCircleTV: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // PIN Protection Badge - Mobile
  pinBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // PIN Badge - TV specific
  pinBadgeTV: {
    width: 28,
    height: 28,
    borderRadius: 14,
    bottom: -4,
    right: -4,
  },

  // Edit Mode Overlay
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Type Badge
  typeBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // Profile Name - Mobile
  profileName: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 90,
  },

  // Profile Name - TV specific
  profileNameTV: {
    fontSize: 20,
    maxWidth: 140,
    letterSpacing: 0.3,
  },

  // Active Indicator - Mobile
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },

  // Active Indicator - TV specific
  activeIndicatorTV: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 12,
  },

  // TV Focus Ring - Outer animated glow
  tvFocusRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderWidth: 4,
    borderRadius: 30,
    opacity: 0, // Controlled by animation
  },

  // TV Focus Border - Inner highlight when focused
  tvFocusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderRadius: 24,
  },
});

export default ProfileCard;
