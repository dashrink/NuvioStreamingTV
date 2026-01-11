import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import { useNavigation } from '@react-navigation/native';
import { useSettings, AppSettings } from '../hooks/useSettings';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import CustomAlert from '../components/CustomAlert';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
  isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  icon,
  isSelected,
  onPress,
  isLast,
}) => {
  const { currentTheme } = useTheme();

  const handlePress = () => {
    triggerLight();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        { borderBottomColor: 'rgba(255,255,255,0.08)' },
      ]}
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
    </TouchableOpacity>
  );
};

const PlayerSettingsScreen: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const { currentTheme } = useTheme();
  const navigation = useNavigation();

  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const openAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

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
    triggerLight();
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
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={currentTheme.colors.text}
          />
          <Text style={[styles.backText, { color: currentTheme.colors.text }]}>
            Settings
          </Text>
        </TouchableOpacity>

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
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <View style={[
                  styles.settingIconContainer,
                  { backgroundColor: 'rgba(255,255,255,0.1)' }
                ]}>
                  <MaterialIcons
                    name="play-arrow"
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
                    Auto-play Best Stream
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: currentTheme.colors.textMuted },
                    ]}
                  >
                    Automatically start the highest quality stream available.
                  </Text>
                </View>
                <CustomSwitch
                  value={settings.autoplayBestStream}
                  onValueChange={(value: boolean) => {
                    triggerMedium();
                    updateSetting('autoplayBestStream', value);
                  }}
                />
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <View style={[
                  styles.settingIconContainer,
                  { backgroundColor: 'rgba(255,255,255,0.1)' }
                ]}>
                  <MaterialIcons
                    name="restore"
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
                    Always Resume
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: currentTheme.colors.textMuted },
                    ]}
                  >
                    Skip the resume prompt and automatically continue where you left off (if less than 85% watched).
                  </Text>
                </View>
                <CustomSwitch
                  value={settings.alwaysResume}
                  onValueChange={(value: boolean) => {
                    triggerMedium();
                    updateSetting('alwaysResume', value);
                  }}
                />
              </View>
            </View>

            {/* Video Player Engine for Android */}
            {Platform.OS === 'android' && !settings.useExternalPlayer && (
              <>
                <View style={[styles.settingItem, styles.settingItemBorder, { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1 }]}>
                  <View style={styles.settingContent}>
                    <View style={[
                      styles.settingIconContainer,
                      { backgroundColor: 'rgba(255,255,255,0.1)' }
                    ]}>
                      <MaterialIcons
                        name="play-circle-filled"
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
                        Video Player Engine
                      </Text>
                      <Text
                        style={[
                          styles.settingDescription,
                          { color: currentTheme.colors.textMuted },
                        ]}
                      >
                        Auto uses ExoPlayer with MPV fallback. Some formats like Dolby Vision and HDR may not be supported by MPV, so Auto is recommended for best compatibility.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.optionButtonsRow}>
                    {([
                      { id: 'auto', label: 'Auto', desc: 'ExoPlayer + MPV fallback' },
                      { id: 'mpv', label: 'MPV', desc: 'MPV only' },
                    ] as const).map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => {
                          triggerLight();
                          updateSetting('videoPlayerEngine', option.id);
                        }}
                        style={[
                          styles.optionButton,
                          styles.optionButtonWide,
                          settings.videoPlayerEngine === option.id && { backgroundColor: currentTheme.colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            { color: settings.videoPlayerEngine === option.id ? '#fff' : currentTheme.colors.text },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Decoder Mode for Android Internal Player */}
                <View style={[styles.settingItem, styles.settingItemBorder, { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1 }]}>
                  <View style={styles.settingContent}>
                    <View style={[
                      styles.settingIconContainer,
                      { backgroundColor: 'rgba(255,255,255,0.1)' }
                    ]}>
                      <MaterialIcons
                        name="memory"
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
                        Decoder Mode
                      </Text>
                      <Text
                        style={[
                          styles.settingDescription,
                          { color: currentTheme.colors.textMuted },
                        ]}
                      >
                        How video is decoded. Auto is recommended for best balance.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.optionButtonsRow}>
                    {([
                      { id: 'auto', label: 'Auto', desc: 'Best balance' },
                      { id: 'sw', label: 'SW', desc: 'Software' },
                      { id: 'hw', label: 'HW', desc: 'Hardware' },
                      { id: 'hw+', label: 'HW+', desc: 'Full HW' },
                    ] as const).map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => {
                          triggerLight();
                          updateSetting('decoderMode', option.id);
                          openAlert(
                            'Restart Required',
                            'Please restart the app for the decoder change to take effect.'
                          );
                        }}
                        style={[
                          styles.optionButton,
                          settings.decoderMode === option.id && { backgroundColor: currentTheme.colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            { color: settings.decoderMode === option.id ? '#fff' : currentTheme.colors.text },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* External Player for Downloads */}
            {((Platform.OS === 'android' && settings.useExternalPlayer) ||
              (Platform.OS === 'ios' && settings.preferredPlayer !== 'internal')) && (
                <View style={[styles.settingItem, styles.settingItemBorder, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }]}>
                  <View style={styles.settingContent}>
                    <View style={[
                      styles.settingIconContainer,
                      { backgroundColor: 'rgba(255,255,255,0.1)' }
                    ]}>
                      <MaterialIcons
                        name="open-in-new"
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
                        External Player for Downloads
                      </Text>
                      <Text
                        style={[
                          styles.settingDescription,
                          { color: currentTheme.colors.textMuted },
                        ]}
                      >
                        Play downloaded content in your preferred external player.
                      </Text>
                    </View>
                    <CustomSwitch
                      value={settings.useExternalPlayerForDownloads}
                      onValueChange={(value) => {
                        triggerMedium();
                        updateSetting('useExternalPlayerForDownloads', value);
                      }}
                    />
                  </View>
                </View>
              )}
          </View>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setAlertVisible(false),
          },
        ]}
        onDismiss={() => setAlertVisible(false)}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 8 : 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
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
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  optionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonWide: {
    flex: 1.5,
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PlayerSettingsScreen;