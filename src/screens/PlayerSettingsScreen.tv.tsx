/**
 * PlayerSettingsScreen.tv.tsx
 *
 * TV-specific player settings screen with complete D-pad navigation support.
 *
 * Features:
 * - All player options are focusable via D-pad navigation
 * - Toggle switches work with the select button
 * - Focus memory persists when navigating between screens
 * - Back button returns to previous screen
 * - Vertical navigation through player options
 *
 * This file is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettings, AppSettings } from '../hooks/useSettings';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import Focusable from '../components/common/Focusable';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// TV-specific setting item with focusable wrapper for selectable options
interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
  isLast?: boolean;
  focusId: string;
  hasTVPreferredFocus?: boolean;
  onFocus?: () => void;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  icon,
  isSelected,
  onPress,
  isLast,
  focusId,
  hasTVPreferredFocus = false,
  onFocus,
}) => {
  const { currentTheme } = useTheme();

  return (
    <Focusable
      onPress={onPress}
      onFocus={onFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        { borderBottomColor: 'rgba(255,255,255,0.08)' },
      ]}
      focusStyle={styles.focusedSettingItem}
      animationConfig={{
        focusScale: 1.02,
        unfocusedOpacity: 0.9,
        showFocusBorder: true,
        focusBorderColor: currentTheme.colors.primary,
        focusBorderWidth: 2,
      }}
      accessibilityLabel={title}
      accessibilityHint={description || 'Press to select this option'}
    >
      <View style={styles.settingContent}>
        <View style={[
          styles.settingIconContainer,
          { backgroundColor: 'rgba(255,255,255,0.1)' }
        ]}>
          <MaterialIcons
            name={icon}
            size={20}
            color={currentTheme.colors.primary}
          />
        </View>
        <View style={styles.settingText}>
          <Text
            style={[
              styles.settingTitle,
              { color: currentTheme.colors.text },
            ]}
          >
            {title}
          </Text>
          {description && (
            <Text
              style={[
                styles.settingDescription,
                { color: currentTheme.colors.textMuted },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
        {isSelected && (
          <MaterialIcons
            name="check"
            size={24}
            color={currentTheme.colors.primary}
            style={styles.checkIcon}
          />
        )}
      </View>
    </Focusable>
  );
};

// TV-specific toggle setting item
interface ToggleSettingItemProps {
  title: string;
  description?: string;
  icon: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  focusId: string;
  hasTVPreferredFocus?: boolean;
  onFocus?: () => void;
  isLast?: boolean;
}

const ToggleSettingItem: React.FC<ToggleSettingItemProps> = ({
  title,
  description,
  icon,
  value,
  onValueChange,
  focusId,
  hasTVPreferredFocus = false,
  onFocus,
  isLast = false,
}) => {
  const { currentTheme } = useTheme();

  // Handle select button to toggle the value
  const handlePress = useCallback(() => {
    onValueChange(!value);
  }, [value, onValueChange]);

  return (
    <Focusable
      onPress={handlePress}
      onFocus={onFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        { borderBottomColor: 'rgba(255,255,255,0.08)' },
      ]}
      focusStyle={styles.focusedSettingItem}
      animationConfig={{
        focusScale: 1.02,
        unfocusedOpacity: 0.9,
        showFocusBorder: true,
        focusBorderColor: currentTheme.colors.primary,
        focusBorderWidth: 2,
      }}
      accessibilityLabel={title}
      accessibilityHint={description || 'Press to toggle'}
    >
      <View style={styles.settingContent}>
        <View style={[
          styles.settingIconContainer,
          { backgroundColor: 'rgba(255,255,255,0.1)' }
        ]}>
          <MaterialIcons
            name={icon}
            size={20}
            color={currentTheme.colors.primary}
          />
        </View>
        <View style={styles.settingText}>
          <Text
            style={[
              styles.settingTitle,
              { color: currentTheme.colors.text },
            ]}
          >
            {title}
          </Text>
          {description && (
            <Text
              style={[
                styles.settingDescription,
                { color: currentTheme.colors.textMuted },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          thumbColor={value ? currentTheme.colors.primary : undefined}
          trackColor={{ false: 'rgba(255,255,255,0.2)', true: currentTheme.colors.primary + '80' }}
        />
      </View>
    </Focusable>
  );
};

const PlayerSettingsScreen: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const { currentTheme } = useTheme();
  const navigation = useNavigation();

  // Spatial navigation for TV
  const spatialNav = useSpatialNavigation('PlayerSettingsScreen', {
    autoRestoreFocus: true,
    defaultFocusId: 'player-back',
  });

  const tvNavigation = useTVNavigationOptional();

  // Track focus for each setting item
  const handleSettingFocus = useCallback((focusId: string) => {
    spatialNav.saveFocus(focusId);
    if (tvNavigation) {
      tvNavigation.setCurrentFocusId(focusId);
    }
  }, [spatialNav, tvNavigation]);

  const playerOptions = [
    {
      id: 'internal',
      title: 'Built-in Player',
      description: 'Use the app\'s default video player',
      icon: 'play-circle-outline',
    },
    ...(Platform.OS === 'ios' ? [
      {
        id: 'vlc',
        title: 'VLC',
        description: 'Open streams in VLC media player',
        icon: 'video-library',
      },
      {
        id: 'infuse',
        title: 'Infuse',
        description: 'Open streams in Infuse player',
        icon: 'smart-display',
      },
      {
        id: 'outplayer',
        title: 'OutPlayer',
        description: 'Open streams in OutPlayer',
        icon: 'slideshow',
      },
      {
        id: 'vidhub',
        title: 'VidHub',
        description: 'Open streams in VidHub player',
        icon: 'ondemand-video',
      },
      {
        id: 'infuse_livecontainer',
        title: 'Infuse Livecontainer',
        description: 'Open streams in Infuse player LiveContainer',
        icon: 'smart-display',
      },
    ] : [
      {
        id: 'external',
        title: 'External Player',
        description: 'Open streams in your preferred video player',
        icon: 'open-in-new',
      },
    ]),
  ];

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: currentTheme.colors.darkBackground },
      ]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <View style={styles.header}>
        <Focusable
          onPress={handleBack}
          style={styles.backButton}
          hasTVPreferredFocus={true}
          animationConfig={{
            focusScale: 1.05,
            showFocusBorder: true,
            focusBorderColor: currentTheme.colors.primary,
            focusBorderWidth: 2,
          }}
          focusId="player-back"
          onFocus={() => handleSettingFocus('player-back')}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={currentTheme.colors.text}
          />
          <Text style={[styles.backText, { color: currentTheme.colors.text }]}>
            Settings
          </Text>
        </Focusable>

        <View style={styles.headerActions}>
          {/* Empty for now, but ready for future actions */}
        </View>
      </View>

      <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
        Video Player
      </Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: currentTheme.colors.textMuted },
            ]}
          >
            PLAYER SELECTION
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: currentTheme.colors.elevation2,
              },
            ]}
          >
            {playerOptions.map((option, index) => (
              <SettingItem
                key={option.id}
                title={option.title}
                description={option.description}
                icon={option.icon}
                isSelected={
                  Platform.OS === 'ios'
                    ? settings.preferredPlayer === option.id
                    : settings.useExternalPlayer === (option.id === 'external')
                }
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    updateSetting('preferredPlayer', option.id as AppSettings['preferredPlayer']);
                  } else {
                    updateSetting('useExternalPlayer', option.id === 'external');
                  }
                }}
                isLast={index === playerOptions.length - 1}
                focusId={`player-option-${option.id}`}
                onFocus={() => handleSettingFocus(`player-option-${option.id}`)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: currentTheme.colors.textMuted },
            ]}
          >
            PLAYBACK OPTIONS
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: currentTheme.colors.elevation2,
              },
            ]}
          >
            <ToggleSettingItem
              title="Auto-play Best Stream"
              description="Automatically start the highest quality stream available."
              icon="play-arrow"
              value={settings.autoplayBestStream}
              onValueChange={(value) => updateSetting('autoplayBestStream', value)}
              focusId="player-autoplay"
              onFocus={() => handleSettingFocus('player-autoplay')}
            />

            <ToggleSettingItem
              title="Always Resume"
              description="Skip the resume prompt and automatically continue where you left off (if less than 85% watched)."
              icon="restore"
              value={settings.alwaysResume}
              onValueChange={(value) => updateSetting('alwaysResume', value)}
              focusId="player-resume"
              onFocus={() => handleSettingFocus('player-resume')}
            />

            {/* External Player for Downloads */}
            {((Platform.OS === 'android' && settings.useExternalPlayer) ||
              (Platform.OS === 'ios' && settings.preferredPlayer !== 'internal')) && (
                <ToggleSettingItem
                  title="External Player for Downloads"
                  description="Play downloaded content in your preferred external player."
                  icon="open-in-new"
                  value={settings.useExternalPlayerForDownloads}
                  onValueChange={(value) => updateSetting('useExternalPlayerForDownloads', value)}
                  focusId="player-external-downloads"
                  onFocus={() => handleSettingFocus('player-external-downloads')}
                  isLast={true}
                />
              )}
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 8 : 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  backText: {
    fontSize: 17,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  focusedSettingItem: {
    borderRadius: 8,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  checkIcon: {
    marginLeft: 16,
  },
});

export default PlayerSettingsScreen;
