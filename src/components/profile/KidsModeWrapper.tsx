/**
 * KidsModeWrapper - Wrapper component for kids mode UI restrictions
 * Applies kid-friendly styling and restrictions when active
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { useProfile } from '../../contexts/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext';
import { kidsModeColors, kidsModeStyles } from '../../styles/kidsModeTheme';
import { isKidsProfile, isTeenProfile } from '../../types/profile';

interface KidsModeWrapperProps {
  children: ReactNode;
  showIndicator?: boolean;
  indicatorPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Wrapper that provides kids mode context and styling
 */
export const KidsModeWrapper: React.FC<KidsModeWrapperProps> = ({
  children,
  showIndicator = true,
  indicatorPosition = 'top-right',
}) => {
  const { isKidsMode, activeProfile } = useProfile();
  const { currentTheme } = useTheme();

  if (!isKidsMode) {
    return <>{children}</>;
  }

  const getIndicatorStyle = () => {
    switch (indicatorPosition) {
      case 'top-left':
        return { top: 8, left: 8 };
      case 'top-right':
        return { top: 8, right: 8 };
      case 'bottom-left':
        return { bottom: 8, left: 8 };
      case 'bottom-right':
        return { bottom: 8, right: 8 };
    }
  };

  return (
    <View style={styles.container}>
      {children}
      {showIndicator && (
        <View style={[styles.indicator, getIndicatorStyle()]}>
          <View style={[styles.indicatorBadge, { backgroundColor: kidsModeColors.primary }]}>
            <MaterialIcons name="child-care" size={14} color="#FFF" />
            <Text style={styles.indicatorText}>KIDS</Text>
          </View>
        </View>
      )}
    </View>
  );
};

interface KidsModeBlockedContentProps {
  message?: string;
  showSwitchProfileButton?: boolean;
  onSwitchProfile?: () => void;
}

/**
 * Component shown when content is blocked in kids mode
 */
export const KidsModeBlockedContent: React.FC<KidsModeBlockedContentProps> = ({
  message = 'This content is not available in Kids mode',
  showSwitchProfileButton = false,
  onSwitchProfile,
}) => {
  const { currentTheme } = useTheme();

  return (
    <View style={[styles.blockedContainer, { backgroundColor: currentTheme.colors.elevation2 }]}>
      <View style={[styles.blockedIcon, { backgroundColor: kidsModeColors.primary }]}>
        <MaterialIcons name="block" size={32} color="#FFF" />
      </View>
      <Text style={[styles.blockedTitle, { color: currentTheme.colors.text }]}>
        Content Restricted
      </Text>
      <Text style={[styles.blockedMessage, { color: currentTheme.colors.textMuted }]}>
        {message}
      </Text>
      {showSwitchProfileButton && onSwitchProfile && (
        <TouchableOpacity
          style={[styles.switchButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={onSwitchProfile}
        >
          <MaterialIcons name="switch-account" size={20} color="#FFF" />
          <Text style={styles.switchButtonText}>Switch Profile</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface KidsModeIndicatorProps {
  style?: object;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Standalone kids/teen mode indicator badge
 * Shows "KIDS" or "TEEN" based on active profile type
 */
export const KidsModeIndicator: React.FC<KidsModeIndicatorProps> = ({ style, size = 'medium' }) => {
  const { isKidsMode, activeProfile } = useProfile();

  // Check for both kids and teen profiles
  const isKids = activeProfile ? isKidsProfile(activeProfile) : false;
  const isTeen = activeProfile ? isTeenProfile(activeProfile) : false;

  if (!isKids && !isTeen) return null;

  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, iconSize: 10, fontSize: 8 },
    medium: { paddingHorizontal: 8, paddingVertical: 4, iconSize: 14, fontSize: 10 },
    large: { paddingHorizontal: 12, paddingVertical: 6, iconSize: 18, fontSize: 12 },
  };

  const currentSize = sizeStyles[size];

  // Different colors and labels for kids vs teen
  const badgeColor = isKids ? kidsModeColors.primary : '#6366f1'; // Green for kids, indigo for teen
  const badgeLabel = isKids ? 'KIDS' : 'TEEN';
  const badgeIcon = isKids ? 'child-care' : 'school';

  return (
    <View
      style={[
        styles.standaloneIndicator,
        {
          backgroundColor: badgeColor,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
        style,
      ]}
    >
      <MaterialIcons name={badgeIcon as any} size={currentSize.iconSize} color="#FFF" />
      <Text style={[styles.standaloneIndicatorText, { fontSize: currentSize.fontSize }]}>
        {badgeLabel}
      </Text>
    </View>
  );
};

interface ContentAgeWarningProps {
  rating: string;
  onContinue: () => void;
  onGoBack: () => void;
}

/**
 * Warning modal for content near the age limit
 */
export const ContentAgeWarning: React.FC<ContentAgeWarningProps> = ({
  rating,
  onContinue,
  onGoBack,
}) => {
  const { currentTheme } = useTheme();

  return (
    <View
      style={[styles.warningContainer, { backgroundColor: currentTheme.colors.darkBackground }]}
    >
      <View style={[styles.warningIcon, { backgroundColor: currentTheme.colors.warning }]}>
        <MaterialIcons name="warning" size={40} color="#FFF" />
      </View>
      <Text style={[styles.warningTitle, { color: currentTheme.colors.text }]}>
        Content Advisory
      </Text>
      <Text style={[styles.warningMessage, { color: currentTheme.colors.textMuted }]}>
        This content is rated {rating} and may not be suitable for all viewers.
      </Text>
      <View style={styles.warningButtons}>
        <TouchableOpacity
          style={[styles.warningButton, { backgroundColor: currentTheme.colors.elevation2 }]}
          onPress={onGoBack}
        >
          <Text style={[styles.warningButtonText, { color: currentTheme.colors.text }]}>
            Go Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.warningButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={onContinue}
        >
          <Text style={styles.warningButtonTextPrimary}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    zIndex: 100,
  },
  indicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  indicatorText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blockedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  blockedMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  switchButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  standaloneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    gap: 4,
  },
  standaloneIndicatorText: {
    color: '#FFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  warningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  warningMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 300,
  },
  warningButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  warningButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  warningButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  warningButtonTextPrimary: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default KidsModeWrapper;
