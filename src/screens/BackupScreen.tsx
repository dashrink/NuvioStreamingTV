import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import Focusable from '../components/common/Focusable';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import { useNavigation } from '@react-navigation/native';
import { backupService } from '../services/backupService';
import { useTheme } from '../contexts/ThemeContext';
import { logger } from '../utils/logger';
import CustomAlert from '../components/CustomAlert';
import { useBackupOptions } from '../hooks/useBackupOptions';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';

const BackupScreen: React.FC = () => {
  const { currentTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { preferences, updatePreference, getBackupOptions } = useBackupOptions();

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    coreData: false,
    addonsIntegrations: false,
    settingsPreferences: false,
  });

  // Animated values for each section
  const coreDataAnim = useRef(new Animated.Value(0)).current;
  const addonsAnim = useRef(new Animated.Value(0)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;

  // Chevron rotation animated values
  const coreDataChevron = useRef(new Animated.Value(0)).current;
  const addonsChevron = useRef(new Animated.Value(0)).current;
  const settingsChevron = useRef(new Animated.Value(0)).current;

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<Array<{ label: string; onPress: () => void; style?: object }>>([]);

  const openAlert = (
    title: string,
    message: string,
    actions?: Array<{ label: string; onPress: () => void; style?: object }>
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertActions(actions && actions.length > 0 ? actions : [{ label: 'OK', onPress: () => { } }]);
    setAlertVisible(true);
  };

  const restartApp = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      logger.error('[BackupScreen] Failed to restart app:', error);
      // Fallback: show error message
      openAlert(
        'Restart Failed',
        'Failed to restart the app. Please manually close and reopen the app to see your restored data.',
        [{ label: 'OK', onPress: () => { } }]
      );
    }
  };

  // Toggle section collapse/expand
  const toggleSection = useCallback((section: 'coreData' | 'addonsIntegrations' | 'settingsPreferences') => {
    triggerLight();
    const isExpanded = expandedSections[section];

    let heightAnim: Animated.Value;
    let chevronAnim: Animated.Value;

    if (section === 'coreData') {
      heightAnim = coreDataAnim;
      chevronAnim = coreDataChevron;
    } else if (section === 'addonsIntegrations') {
      heightAnim = addonsAnim;
      chevronAnim = addonsChevron;
    } else {
      heightAnim = settingsAnim;
      chevronAnim = settingsChevron;
    }

    // Animate height and chevron rotation
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 300,
        useNativeDriver: false, // Required for height
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(chevronAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 300,
        useNativeDriver: true, // Transforms support native driver
        easing: Easing.inOut(Easing.ease),
      }),
    ]).start();

    setExpandedSections(prev => ({ ...prev, [section]: !isExpanded }));
  }, [expandedSections, coreDataAnim, addonsAnim, settingsAnim, coreDataChevron, addonsChevron, settingsChevron]);

  // Create backup
  const handleCreateBackup = useCallback(async () => {
    try {
      // First, get backup preview to show what will be backed up
      setIsLoading(true);
      const preview = await backupService.getBackupPreview();
      setIsLoading(false);

      // Filter based on preferences
      const items: string[] = [];
      let total = 0;

      if (preferences.includeLibrary) {
        items.push(`Library: ${preview.library} items`);
        total += preview.library;
      }

      if (preferences.includeWatchProgress) {
        items.push(`Watch Progress: ${preview.watchProgress} entries`);
        total += preview.watchProgress;
        // Include watched status with watch progress
        items.push(`Watched Status: ${preview.watchedStatus} items`);
        total += preview.watchedStatus;
      }

      if (preferences.includeAddons) {
        items.push(`Addons: ${preview.addons} installed`);
        total += preview.addons;
      }

      if (preferences.includeLocalScrapers) {
        items.push(`Plugins: ${preview.scrapers} configurations`);
        total += preview.scrapers;
      }

      // Check if no items are selected
      const message = items.length > 0
        ? `Backup Contents:\n\n${items.join('\n')}\n\nTotal: ${total} items\n\nThis backup includes your selected app settings, themes, watched markers, and integration data.`
        : `No content selected for backup.\n\nPlease enable at least one option in the Backup Options section above.`;

      openAlert(
        'Create Backup',
        message,
        items.length > 0
          ? [
            { label: 'Cancel', onPress: () => { } },
            {
              label: 'Create Backup',
              onPress: async () => {
                try {
                  setIsLoading(true);

                  const backupOptions = getBackupOptions();

                  const fileUri = await backupService.createBackup(backupOptions);

                  // Share the backup file
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, {
                      mimeType: 'application/json',
                      dialogTitle: 'Share Nuvio Backup',
                    });
                  }

                  openAlert(
                    'Backup Created',
                    'Your backup has been created and is ready to share.',
                    [{ label: 'OK', onPress: () => { } }]
                  );
                } catch (error) {
                  logger.error('[BackupScreen] Failed to create backup:', error);
                  openAlert(
                    'Backup Failed',
                    `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
                    [{ label: 'OK', onPress: () => { } }]
                  );
                } finally {
                  setIsLoading(false);
                }
              }
            }
          ]
          : [{ label: 'OK', onPress: () => { } }]
      );
    } catch (error) {
      logger.error('[BackupScreen] Failed to get backup preview:', error);
      openAlert(
        'Error',
        'Failed to prepare backup information. Please try again.',
        [{ label: 'OK', onPress: () => { } }]
      );
      setIsLoading(false);
    }
  }, [openAlert, preferences, getBackupOptions]);

  // Restore backup
  const handleRestoreBackup = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const fileUri = result.assets[0].uri;

      // Validate backup file
      const backupInfo = await backupService.getBackupInfo(fileUri);

      openAlert(
        'Confirm Restore',
        `This will restore your data from a backup created on ${new Date(backupInfo.timestamp || 0).toLocaleDateString()}.\n\nThis action will overwrite your current data. Are you sure you want to continue?`,
        [
          { label: 'Cancel', onPress: () => { } },
          {
            label: 'Restore',
            onPress: async () => {
              try {
                setIsLoading(true);

                const restoreOptions = getBackupOptions();

                await backupService.restoreBackup(fileUri, restoreOptions);

                openAlert(
                  'Restore Complete',
                  'Your data has been successfully restored. Please restart the app to see all changes.',
                  [
                    { label: 'Cancel', onPress: () => { } },
                    {
                      label: 'Restart App',
                      onPress: restartApp,
                      style: { fontWeight: 'bold' }
                    }
                  ]
                );
              } catch (error) {
                logger.error('[BackupScreen] Failed to restore backup:', error);
                openAlert(
                  'Restore Failed',
                  `Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`,
                  [{ label: 'OK', onPress: () => { } }]
                );
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      logger.error('[BackupScreen] Failed to pick backup file:', error);
      openAlert(
        'File Selection Failed',
        `Failed to select backup file: ${error instanceof Error ? error.message : String(error)}`,
        [{ label: 'OK', onPress: () => { } }]
      );
    }
  }, [openAlert]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Focusable
          style={styles.backButton}
          onPress={() => {
            triggerLight();
            navigation.goBack();
          }}
          hasTVPreferredFocus={true}
        >
          <MaterialIcons name="chevron-left" size={28} color={currentTheme.colors.white} />
          <Text style={[styles.backText, { color: currentTheme.colors.primary }]}>Settings</Text>
        </Focusable>

        <View style={styles.headerActions}>
          {/* Empty for now, but keeping structure consistent */}
        </View>
      </View>

      <Text style={[styles.headerTitle, { color: currentTheme.colors.white }]}>
        Backup & Restore
      </Text>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          <CustomAlert
            visible={alertVisible}
            title={alertTitle}
            message={alertMessage}
            actions={alertActions}
            onClose={() => setAlertVisible(false)}
          />

          {/* Backup Options Section */}
          <View style={[styles.section, { backgroundColor: currentTheme.colors.elevation1 }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.highEmphasis }]}>
              Backup Options
            </Text>
            <Text style={[styles.sectionDescription, { color: currentTheme.colors.mediumEmphasis }]}>
              Choose what to include in your backups
            </Text>

            {/* Core Data Group */}
            <Focusable
              style={styles.sectionHeader}
              onPress={() => toggleSection('coreData')}
              activeOpacity={0.7}
            >
              <Text style={[styles.groupLabel, { color: currentTheme.colors.highEmphasis }]}>
                Core Data
              </Text>
              <Animated.View
                style={{
                  transform: [{
                    rotate: coreDataChevron.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['180deg', '0deg']
                    })
                  }]
                }}
              >
                <MaterialIcons name="expand-more" size={24} color={currentTheme.colors.highEmphasis} />
              </Animated.View>
            </Focusable>
            <Animated.View
              style={{
                maxHeight: coreDataAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 2000]
                }),
                overflow: 'hidden',
                opacity: coreDataAnim,
              }}
            >
              <OptionToggle
                label="Library"
                description="Your saved movies and TV shows"
                value={preferences.includeLibrary}
                onValueChange={(v) => updatePreference('includeLibrary', v)}
                theme={currentTheme}
              />
              <OptionToggle
                label="Watch Progress"
                description="Continue watching positions"
                value={preferences.includeWatchProgress}
                onValueChange={(v) => updatePreference('includeWatchProgress', v)}
                theme={currentTheme}
              />
            </Animated.View>

            {/* Addons & Integrations Group */}
            <Focusable
              style={styles.sectionHeader}
              onPress={() => toggleSection('addonsIntegrations')}
              activeOpacity={0.7}
            >
              <Text style={[styles.groupLabel, { color: currentTheme.colors.highEmphasis }]}>
                Addons & Integrations
              </Text>
              <Animated.View
                style={{
                  transform: [{
                    rotate: addonsChevron.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['180deg', '0deg']
                    })
                  }]
                }}
              >
                <MaterialIcons name="expand-more" size={24} color={currentTheme.colors.highEmphasis} />
              </Animated.View>
            </Focusable>
            <Animated.View
              style={{
                maxHeight: addonsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 2000]
                }),
                overflow: 'hidden',
                opacity: addonsAnim,
              }}
            >
              <OptionToggle
                label="Addons"
                description="Installed Stremio addons"
                value={preferences.includeAddons}
                onValueChange={(v) => updatePreference('includeAddons', v)}
                theme={currentTheme}
              />
              <OptionToggle
                label="Plugins"
                description="Custom scraper configurations"
                value={preferences.includeLocalScrapers}
                onValueChange={(v) => updatePreference('includeLocalScrapers', v)}
                theme={currentTheme}
              />
            </Animated.View>

            {/* Settings & Preferences Group */}
            <Focusable
              style={styles.sectionHeader}
              onPress={() => toggleSection('settingsPreferences')}
              activeOpacity={0.7}
            >
              <Text style={[styles.groupLabel, { color: currentTheme.colors.highEmphasis }]}>
                Settings & Preferences
              </Text>
              <Animated.View
                style={{
                  transform: [{
                    rotate: settingsChevron.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['180deg', '0deg']
                    })
                  }]
                }}
              >
                <MaterialIcons name="expand-more" size={24} color={currentTheme.colors.highEmphasis} />
              </Animated.View>
            </Focusable>
            <Animated.View
              style={{
                maxHeight: settingsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 2000]
                }),
                overflow: 'hidden',
                opacity: settingsAnim,
              }}
            >
              <OptionToggle
                label="Theme"
                description="Dark/Light mode preference"
                value={preferences.includeTheme}
                onValueChange={(v) => updatePreference('includeTheme', v)}
                theme={currentTheme}
              />
              <OptionToggle
                label="App Settings"
                description="UI preferences and options"
                value={preferences.includeSettings}
                onValueChange={(v) => updatePreference('includeSettings', v)}
                theme={currentTheme}
              />
            </Animated.View>
          </View>

          {/* Action Buttons Section */}
          <View style={[styles.section, { backgroundColor: currentTheme.colors.elevation1 }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.highEmphasis }]}>
              Actions
            </Text>

            <Focusable
              style={[styles.actionButton, { backgroundColor: currentTheme.colors.primary }]}
              onPress={handleCreateBackup}
            >
              {isLoading ? (
                <ActivityIndicator color={currentTheme.colors.darkBackground} size="small" />
              ) : (
                <>
                  <MaterialIcons name="backup" size={20} color={currentTheme.colors.darkBackground} />
                  <Text style={[styles.buttonText, { color: currentTheme.colors.darkBackground }]}>
                    Create Backup
                  </Text>
                </>
              )}
            </Focusable>

            <Focusable
              style={[styles.actionButton, { backgroundColor: currentTheme.colors.secondary }]}
              onPress={handleRestoreBackup}
            >
              {isLoading ? (
                <ActivityIndicator color={currentTheme.colors.darkBackground} size="small" />
              ) : (
                <>
                  <MaterialIcons name="restore" size={20} color={currentTheme.colors.darkBackground} />
                  <Text style={[styles.buttonText, { color: currentTheme.colors.darkBackground }]}>
                    Restore Backup
                  </Text>
                </>
              )}
            </Focusable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// OptionToggle component
const OptionToggle: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: any;
}> = ({ label, description, value, onValueChange, theme }) => {
  return (
    <View style={styles.optionItem}>
      <View style={styles.optionInfo}>
        <Text style={[styles.optionLabel, { color: theme.colors.highEmphasis }]}>
          {label}
        </Text>
        <Text style={[styles.optionDescription, { color: theme.colors.mediumEmphasis }]}>
          {description}
        </Text>
      </View>
      <CustomSwitch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.elevation2, true: theme.colors.primaryLight }}
        thumbColor={value ? theme.colors.primary : theme.colors.mediumEmphasis}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BackupScreen;