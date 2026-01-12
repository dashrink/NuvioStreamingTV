import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';

import ScreenHeader from '../components/common/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { triggerMedium, triggerLight } from '../hooks/useHaptics';
import { useSettings } from '../hooks/useSettings';

const Top10SettingsScreen: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const { currentTheme } = useTheme();
  const navigation = useNavigation();

  const top10Settings = settings?.top10Settings || {
    enabled: false,
    timeWindow: 'week' as const,
    displayStyle: 'disney' as const,
  };

  const handleToggle = (value: boolean) => {
    triggerMedium();
    updateSetting('top10Settings', {
      ...top10Settings,
      enabled: value,
    });
  };

  const handleTimeWindowChange = (timeWindow: 'day' | 'week') => {
    triggerLight();
    updateSetting('top10Settings', {
      ...top10Settings,
      timeWindow,
    });
  };

  const handleDisplayStyleChange = (
    displayStyle: 'disney' | 'appletv' | 'numbered' | 'minimal'
  ) => {
    triggerLight();
    updateSetting('top10Settings', {
      ...top10Settings,
      displayStyle,
    });
  };

  const SettingItem: React.FC<{
    title: string;
    description?: string;
    icon?: string;
    renderControl?: () => React.ReactNode;
    isLast?: boolean;
    onPress?: () => void;
  }> = ({ title, description, icon, renderControl, isLast = false, onPress }) => (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={[
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        { borderBottomColor: currentTheme.colors.elevation2 },
      ]}
    >
      {icon && (
        <View
          style={[
            styles.settingIconContainer,
            { backgroundColor: `${currentTheme.colors.primary}12` },
          ]}
        >
          <Feather name={icon as any} size={18} color={currentTheme.colors.primary} />
        </View>
      )}
      <View style={styles.settingContent}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: currentTheme.colors.highEmphasis }]}>
            {title}
          </Text>
          {description && (
            <Text
              style={[styles.settingDescription, { color: currentTheme.colors.mediumEmphasis }]}
            >
              {description}
            </Text>
          )}
        </View>
      </View>
      {renderControl && <View style={styles.settingControl}>{renderControl()}</View>}
    </TouchableOpacity>
  );

  const OptionButton: React.FC<{
    title: string;
    selected: boolean;
    onPress: () => void;
  }> = ({ title, selected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        {
          backgroundColor: selected
            ? `${currentTheme.colors.primary}20`
            : currentTheme.colors.elevation2,
          borderColor: selected ? currentTheme.colors.primary : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.optionButtonText,
          {
            color: selected ? currentTheme.colors.primary : currentTheme.colors.mediumEmphasis,
            fontWeight: selected ? '600' : '500',
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
      <ScreenHeader title="Top 10 Content" showBackButton />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Enable/Disable */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.mediumEmphasis }]}>
            DISPLAY
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: currentTheme.colors.elevation1,
                borderColor: currentTheme.colors.elevation2,
              },
            ]}
          >
            <SettingItem
              title="Show Top 10 Section"
              description="Display trending content on home screen"
              icon="trending-up"
              renderControl={() => (
                <Switch
                  value={top10Settings.enabled}
                  onValueChange={handleToggle}
                  trackColor={{
                    false: currentTheme.colors.elevation2,
                    true: currentTheme.colors.primary,
                  }}
                  thumbColor={
                    top10Settings.enabled
                      ? currentTheme.colors.white
                      : currentTheme.colors.mediumEmphasis
                  }
                  ios_backgroundColor={currentTheme.colors.elevation2}
                />
              )}
              isLast
            />
          </View>
        </View>

        {/* Time Window */}
        {top10Settings.enabled && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.mediumEmphasis }]}>
              TIME WINDOW
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: currentTheme.colors.elevation1,
                  borderColor: currentTheme.colors.elevation2,
                },
              ]}
            >
              <View style={styles.optionsContainer}>
                <OptionButton
                  title="Daily"
                  selected={top10Settings.timeWindow === 'day'}
                  onPress={() => handleTimeWindowChange('day')}
                />
                <OptionButton
                  title="Weekly"
                  selected={top10Settings.timeWindow === 'week'}
                  onPress={() => handleTimeWindowChange('week')}
                />
              </View>
            </View>
          </View>
        )}

        {/* Display Style */}
        {top10Settings.enabled && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.mediumEmphasis }]}>
              BADGE STYLE
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: currentTheme.colors.elevation1,
                  borderColor: currentTheme.colors.elevation2,
                },
              ]}
            >
              <View style={styles.optionsContainer}>
                <OptionButton
                  title="Disney+"
                  selected={top10Settings.displayStyle === 'disney'}
                  onPress={() => handleDisplayStyleChange('disney')}
                />
                <OptionButton
                  title="Apple TV+"
                  selected={top10Settings.displayStyle === 'appletv'}
                  onPress={() => handleDisplayStyleChange('appletv')}
                />
              </View>
              <View style={[styles.optionsContainer, { marginTop: 12 }]}>
                <OptionButton
                  title="Numbered"
                  selected={top10Settings.displayStyle === 'numbered'}
                  onPress={() => handleDisplayStyleChange('numbered')}
                />
                <OptionButton
                  title="Minimal"
                  selected={top10Settings.displayStyle === 'minimal'}
                  onPress={() => handleDisplayStyleChange('minimal')}
                />
              </View>
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: currentTheme.colors.mediumEmphasis }]}>
            Top 10 content is based on TMDB trending data and updates automatically.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  settingItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIconContainer: {
    marginRight: 14,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 13,
    opacity: 0.7,
  },
  settingControl: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  optionButtonText: {
    fontSize: 14,
  },
  infoSection: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default Top10SettingsScreen;
