import { Feather } from '@expo/vector-icons';
import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Dimensions,
  findNodeHandle,
} from 'react-native';

import Focusable from '../../components/common/Focusable';
import { useTheme } from '../../contexts/ThemeContext';
import { isTV } from '../../utils/tvStyles/deviceDetection';
import { TV_FOCUS_CONFIG } from '../../utils/tvStyles/focus';
import { TV_SPACING } from '../../utils/tvStyles/spacing';
import { TV_TOUCH_TARGETS } from '../../utils/tvStyles/touchTargets';
import { TV_TYPOGRAPHY } from '../../utils/tvStyles/typography';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Card component with minimalistic style - TV optimized
interface SettingsCardProps {
  children: React.ReactNode;
  title?: string;
  isTablet?: boolean;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  children,
  title,
  isTablet: isTabletProp = false,
}) => {
  const { currentTheme } = useTheme();
  const useTabletStyle = isTabletProp || isTablet;
  const useTVStyle = isTV;

  return (
    <View
      style={[
        styles.cardContainer,
        useTabletStyle && styles.tabletCardContainer,
        useTVStyle && styles.tvCardContainer,
      ]}
    >
      {title && (
        <Text
          style={[
            styles.cardTitle,
            { color: currentTheme.colors.mediumEmphasis },
            useTabletStyle && styles.tabletCardTitle,
            useTVStyle && styles.tvCardTitle,
          ]}
        >
          {title}
        </Text>
      )}
      <View
        style={[
          styles.card,
          {
            backgroundColor: currentTheme.colors.elevation1,
            borderWidth: 1,
            borderColor: currentTheme.colors.elevation2,
          },
          useTabletStyle && styles.tabletCard,
          useTVStyle && styles.tvCard,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

interface SettingItemProps {
  title: string;
  description?: string;
  icon?: string;
  customIcon?: React.ReactNode;
  renderControl?: () => React.ReactNode;
  isLast?: boolean;
  onPress?: () => void;
  badge?: string | number;
  isTablet?: boolean;
  /** TV Navigation Props */
  hasTVPreferredFocus?: boolean;
  nextFocusUp?: number | React.RefObject<any>;
  nextFocusDown?: number | React.RefObject<any>;
  nextFocusLeft?: number | React.RefObject<any>;
  nextFocusRight?: number | React.RefObject<any>;
  focusRef?: React.RefObject<any>;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  icon,
  customIcon,
  renderControl,
  isLast = false,
  onPress,
  badge,
  isTablet: isTabletProp = false,
  hasTVPreferredFocus,
  nextFocusUp,
  nextFocusDown,
  nextFocusLeft,
  nextFocusRight,
  focusRef,
}) => {
  const { currentTheme } = useTheme();
  const useTabletStyle = isTabletProp || isTablet;
  const useTVStyle = isTV;

  // On TV, use Focusable component for proper D-pad navigation
  const ItemWrapper = useTVStyle ? Focusable : TouchableOpacity;

  const wrapperProps = useTVStyle
    ? {
        onPress,
        hasTVPreferredFocus,
        nextFocusUp,
        nextFocusDown,
        nextFocusLeft,
        nextFocusRight,
        ref: focusRef,
        scaleOnFocus: TV_FOCUS_CONFIG.focusScaleSubtle,
        style: [
          styles.settingItem,
          styles.tvSettingItem,
          !isLast && styles.settingItemBorder,
          { borderBottomColor: currentTheme.colors.elevation2 },
        ],
      }
    : {
        activeOpacity: 0.6,
        onPress,
        style: [
          styles.settingItem,
          !isLast && styles.settingItemBorder,
          { borderBottomColor: currentTheme.colors.elevation2 },
          useTabletStyle && styles.tabletSettingItem,
        ],
      };

  return (
    <ItemWrapper {...wrapperProps}>
      <View
        style={[
          styles.settingIconContainer,
          {
            backgroundColor: `${currentTheme.colors.primary}12`,
          },
          useTabletStyle && styles.tabletSettingIconContainer,
          useTVStyle && styles.tvSettingIconContainer,
        ]}
      >
        {customIcon ? (
          customIcon
        ) : (
          <Feather
            name={icon! as any}
            size={useTVStyle ? 26 : useTabletStyle ? 22 : 18}
            color={currentTheme.colors.primary}
          />
        )}
      </View>
      <View style={styles.settingContent}>
        <View style={styles.settingTextContainer}>
          <Text
            style={[
              styles.settingTitle,
              { color: currentTheme.colors.highEmphasis },
              useTabletStyle && styles.tabletSettingTitle,
              useTVStyle && styles.tvSettingTitle,
            ]}
          >
            {title}
          </Text>
          {description && (
            <Text
              style={[
                styles.settingDescription,
                { color: currentTheme.colors.mediumEmphasis },
                useTabletStyle && styles.tabletSettingDescription,
                useTVStyle && styles.tvSettingDescription,
              ]}
              numberOfLines={useTVStyle ? 2 : 1}
            >
              {description}
            </Text>
          )}
        </View>
        {badge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: `${currentTheme.colors.primary}20` },
              useTVStyle && styles.tvBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: currentTheme.colors.primary },
                useTVStyle && styles.tvBadgeText,
              ]}
            >
              {String(badge)}
            </Text>
          </View>
        )}
      </View>
      {renderControl && (
        <View style={[styles.settingControl, useTVStyle && styles.tvSettingControl]}>
          {renderControl()}
        </View>
      )}
    </ItemWrapper>
  );
};

// Custom Switch component - TV optimized with larger touch target
interface CustomSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const CustomSwitch: React.FC<CustomSwitchProps> = ({ value, onValueChange }) => {
  const { currentTheme } = useTheme();

  return (
    <View style={isTV && styles.tvSwitchContainer}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: currentTheme.colors.elevation2, true: currentTheme.colors.primary }}
        thumbColor={value ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis}
        ios_backgroundColor={currentTheme.colors.elevation2}
        style={isTV && styles.tvSwitch}
      />
    </View>
  );
};

// Chevron Right component - TV optimized
export const ChevronRight: React.FC<{ isTablet?: boolean }> = ({
  isTablet: isTabletProp = false,
}) => {
  const { currentTheme } = useTheme();
  const useTabletStyle = isTabletProp || isTablet;
  const useTVStyle = isTV;

  return (
    <Feather
      name="chevron-right"
      size={useTVStyle ? 28 : useTabletStyle ? 24 : 20}
      color={currentTheme.colors.mediumEmphasis}
    />
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  tabletCardContainer: {
    marginBottom: 28,
    paddingHorizontal: 0,
  },
  // TV Card Container - more padding and spacing for 10-foot viewing
  tvCardContainer: {
    marginBottom: TV_SPACING.xl,
    paddingHorizontal: TV_SPACING.screenPadding,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  tabletCardTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  // TV Card Title - larger for readability
  tvCardTitle: {
    fontSize: TV_TYPOGRAPHY.labelLarge,
    marginBottom: TV_SPACING.md,
    letterSpacing: 1,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabletCard: {
    borderRadius: 20,
  },
  // TV Card - larger border radius
  tvCard: {
    borderRadius: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  tabletSettingItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 68,
  },
  // TV Setting Item - larger touch targets and spacing
  tvSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: TV_SPACING.lg,
    paddingHorizontal: TV_SPACING.xl,
    minHeight: TV_TOUCH_TARGETS.standard.height + TV_SPACING.lg,
    borderRadius: 12,
  },
  settingItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tabletSettingIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 16,
  },
  // TV Icon Container - larger for visibility
  tvSettingIconContainer: {
    width: TV_TOUCH_TARGETS.standard.width,
    height: TV_TOUCH_TARGETS.standard.height,
    borderRadius: 16,
    marginRight: TV_SPACING.lg,
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  tabletSettingTitle: {
    fontSize: 17,
  },
  // TV Setting Title - larger for 10-foot viewing
  tvSettingTitle: {
    fontSize: TV_TYPOGRAPHY.titleLarge,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  tabletSettingDescription: {
    fontSize: 14,
  },
  // TV Setting Description - larger and more readable
  tvSettingDescription: {
    fontSize: TV_TYPOGRAPHY.bodyMedium,
    marginTop: 4,
    lineHeight: TV_TYPOGRAPHY.bodyMedium * 1.4,
  },
  settingControl: {
    marginLeft: 12,
  },
  // TV Setting Control - more spacing
  tvSettingControl: {
    marginLeft: TV_SPACING.lg,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // TV Badge - larger for visibility
  tvBadge: {
    paddingHorizontal: TV_SPACING.md,
    paddingVertical: TV_SPACING.sm,
    borderRadius: 12,
    marginLeft: TV_SPACING.md,
  },
  tvBadgeText: {
    fontSize: TV_TYPOGRAPHY.labelMedium,
    fontWeight: '700',
  },
  // TV Switch styles
  tvSwitchContainer: {
    transform: [{ scale: 1.3 }],
  },
  tvSwitch: {
    // Additional TV switch styling
  },
});

export default SettingsCard;
