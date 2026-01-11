import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import { useToast } from '../contexts/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UpdateService from '../services/updateService';
import CustomAlert from '../components/CustomAlert';
import { mmkvStorage } from '../services/mmkvStorage';
import { useGithubMajorUpdate } from '../hooks/useGithubMajorUpdate';
import { getDisplayedAppVersion } from '../utils/version';
import { isAnyUpgrade } from '../services/githubReleaseService';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Card component with minimalistic style
interface SettingsCardProps {
  children: React.ReactNode;
  title?: string;
  isTablet?: boolean;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ children, title, isTablet = false }) => {
  const { currentTheme } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        isTablet && styles.tabletCardContainer
      ]}
    >
      {title && (
        <Text style={[
          styles.cardTitle,
          { color: currentTheme.colors.mediumEmphasis },
          isTablet && styles.tabletCardTitle
        ]}>
          {title}
        </Text>
      )}
      <View style={[
        styles.card,
        { backgroundColor: currentTheme.colors.elevation1 },
        isTablet && styles.tabletCard
      ]}>
        {children}
      </View>
    </View>
  );
};

const UpdateScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const github = useGithubMajorUpdate();
  const { showInfo } = useToast();

  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<Array<{ label: string; onPress: () => void; style?: object }>>([
    { label: 'OK', onPress: () => setAlertVisible(false) },
  ]);

  const openAlert = (
    title: string,
    message: string,
    actions?: Array<{ label: string; onPress?: () => void; style?: object }>
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    if (actions && actions.length > 0) {
      setAlertActions(
        actions.map(a => ({
          label: a.label,
          style: a.style,
          onPress: () => { a.onPress?.(); },
        }))
      );
    } else {
      setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
    }
    setAlertVisible(true);
  };

  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [currentInfo, setCurrentInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  // Logs removed
  const [lastOperation, setLastOperation] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'success' | 'error'>('idle');

  // Update notification settings
  const [otaAlertsEnabled, setOtaAlertsEnabled] = useState(true);
  const [majorAlertsEnabled, setMajorAlertsEnabled] = useState(true);

  // Load notification settings on mount
  useEffect(() => {
    (async () => {
      try {
        const otaSetting = await mmkvStorage.getItem('@ota_updates_alerts_enabled');
        const majorSetting = await mmkvStorage.getItem('@major_updates_alerts_enabled');
        // Default to true if not set
        setOtaAlertsEnabled(otaSetting !== 'false');
        setMajorAlertsEnabled(majorSetting !== 'false');
      } catch { }
    })();
  }, []);

  // Handle toggling OTA alerts with warning
  const handleOtaAlertsToggle = async (value: boolean) => {
    triggerMedium();
    if (!value) {
      openAlert(
        'Disable OTA Update Alerts?',
        'You will no longer receive automatic notifications for OTA updates.\n\n⚠️ Warning: Staying on the latest version is important for:\n• Bug fixes and stability improvements\n• New features and enhancements\n• Providing accurate feedback and crash reports\n\nYou can still manually check for updates in this screen.',
        [
          { label: 'Cancel', onPress: () => setAlertVisible(false) },
          {
            label: 'Disable',
            onPress: async () => {
              await mmkvStorage.setItem('@ota_updates_alerts_enabled', 'false');
              setOtaAlertsEnabled(false);
              setAlertVisible(false);
            }
          }
        ]
      );
    } else {
      await mmkvStorage.setItem('@ota_updates_alerts_enabled', 'true');
      setOtaAlertsEnabled(true);
    }
  };

  // Handle toggling Major update alerts with warning
  const handleMajorAlertsToggle = async (value: boolean) => {
    triggerMedium();
    if (!value) {
      openAlert(
        'Disable Major Update Alerts?',
        'You will no longer receive notifications for major app updates that require reinstallation.\n\n⚠️ Warning: Major updates often include:\n• Critical security patches\n• Breaking changes that require app reinstall\n• Important compatibility fixes\n\nYou can still check for updates manually.',
        [
          { label: 'Cancel', onPress: () => setAlertVisible(false) },
          {
            label: 'Disable',
            onPress: async () => {
              await mmkvStorage.setItem('@major_updates_alerts_enabled', 'false');
              setMajorAlertsEnabled(false);
              setAlertVisible(false);
            }
          }
        ]
      );
    } else {
      await mmkvStorage.setItem('@major_updates_alerts_enabled', 'true');
      setMajorAlertsEnabled(true);
    }
  };

  const checkForUpdates = async () => {
    try {
      setIsChecking(true);
      setUpdateStatus('checking');
      setUpdateProgress(0);
      setLastOperation('Checking for updates...');

      const info = await UpdateService.checkForUpdates();
      setUpdateInfo(info);
      setLastChecked(new Date());

      // Logs disabled

      if (info.isAvailable) {
        setUpdateStatus('available');
        setLastOperation(`Update available: ${info.manifest?.id || 'unknown'}`);
      } else {
        setUpdateStatus('idle');
        setLastOperation('No updates available');
      }
    } catch (error) {
      if (__DEV__) console.error('Error checking for updates:', error);
      setUpdateStatus('error');
      setLastOperation(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      openAlert('Error', 'Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check on mount and keep section visible
  useEffect(() => {
    if (Platform.OS === 'android') {
      // ensure badge clears when entering this screen
      (async () => {
        try { await mmkvStorage.removeItem('@update_badge_pending'); } catch { }
      })();
    }
    checkForUpdates();
    // Also refresh GitHub section on mount (works in dev and prod)
    try { github.refresh(); } catch { }
    if (Platform.OS === 'android') {
      showInfo('Checking for Updates', 'Checking for updates…');
    }
  }, []);

  const installUpdate = async () => {
    try {
      setIsInstalling(true);
      setUpdateStatus('downloading');
      setUpdateProgress(0);
      setLastOperation('Downloading update...');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUpdateProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      const success = await UpdateService.downloadAndInstallUpdate();

      clearInterval(progressInterval);
      setUpdateProgress(100);
      setUpdateStatus('installing');
      setLastOperation('Installing update...');

      // Logs disabled

      if (success) {
        setUpdateStatus('success');
        setLastOperation('Update installed successfully');
        openAlert('Success', 'Update will be applied on next app restart');
      } else {
        setUpdateStatus('error');
        setLastOperation('No update available to install');
        openAlert('No Update', 'No update available to install');
      }
    } catch (error) {
      if (__DEV__) console.error('Error installing update:', error);
      setUpdateStatus('error');
      setLastOperation(`Installation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      openAlert('Error', 'Failed to install update');
    } finally {
      setIsInstalling(false);
    }
  };

  const getCurrentUpdateInfo = async () => {
    const info = await UpdateService.getCurrentUpdateInfo();
    setCurrentInfo(info);
    // Logs disabled
  };

  // Extract release notes from various possible manifest fields
  const getReleaseNotes = () => {
    const manifest: any = updateInfo?.manifest || {};
    return (
      manifest.description ||
      manifest.releaseNotes ||
      manifest.extra?.releaseNotes ||
      manifest.metadata?.releaseNotes ||
      ''
    );
  };

  // Extract release notes for the currently running version
  const getCurrentReleaseNotes = () => {
    const manifest: any = currentInfo?.manifest || {};
    return (
      manifest.description ||
      manifest.releaseNotes ||
      manifest.extra?.releaseNotes ||
      manifest.metadata?.releaseNotes ||
      ''
    );
  };

  // Logs disabled: remove actions

  const testConnectivity = async () => {
    try {
      setLastOperation('Testing connectivity...');
      const isReachable = await UpdateService.testUpdateConnectivity();

      if (isReachable) {
        setLastOperation('Update server is reachable');
      } else {
        setLastOperation('Update server is not reachable');
      }
    } catch (error) {
      if (__DEV__) console.error('Error testing connectivity:', error);
      setLastOperation(`Connectivity test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Logs disabled
    }
  };

  const testAssetUrls = async () => {
    try {
      setLastOperation('Testing asset URLs...');
      await UpdateService.testAllAssetUrls();
      setLastOperation('Asset URL testing completed');
    } catch (error) {
      if (__DEV__) console.error('Error testing asset URLs:', error);
      setLastOperation(`Asset URL test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Logs disabled
    }
  };

  // Load current update info on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await getCurrentUpdateInfo();
    };
    loadInitialData();
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  const getStatusIcon = () => {
    switch (updateStatus) {
      case 'checking':
        return <MaterialIcons name="refresh" size={20} color={currentTheme.colors.primary} />;
      case 'available':
        return <MaterialIcons name="new-releases" size={20} color={currentTheme.colors.success || '#4CAF50'} />;
      case 'downloading':
        return <MaterialIcons name="cloud-download" size={20} color={currentTheme.colors.primary} />;
      case 'installing':
        return <MaterialIcons name="install-mobile" size={20} color={currentTheme.colors.primary} />;
      case 'success':
        return <MaterialIcons name="check-circle" size={20} color={currentTheme.colors.success || '#4CAF50'} />;
      case 'error':
        return <MaterialIcons name="error" size={20} color={currentTheme.colors.error || '#ff4444'} />;
      default:
        return <MaterialIcons name="system-update" size={20} color={currentTheme.colors.mediumEmphasis} />;
    }
  };

  const getStatusText = () => {
    switch (updateStatus) {
      case 'checking':
        return 'Checking for updates...';
      case 'available':
        return 'Update available!';
      case 'downloading':
        return 'Downloading update...';
      case 'installing':
        return 'Installing update...';
      case 'success':
        return 'Update installed successfully!';
      case 'error':
        return 'Update failed';
      default:
        return 'Ready to check for updates';
    }
  };

  const getStatusColor = () => {
    switch (updateStatus) {
      case 'available':
      case 'success':
        return currentTheme.colors.success || '#4CAF50';
      case 'error':
        return currentTheme.colors.error || '#ff4444';
      case 'checking':
      case 'downloading':
      case 'installing':
        return currentTheme.colors.primary;
      default:
        return currentTheme.colors.mediumEmphasis;
    }
  };


  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: currentTheme.colors.darkBackground }
    ]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            triggerLight();
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.highEmphasis} />
          <Text style={[styles.backText, { color: currentTheme.colors.highEmphasis }]}>
            Settings
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {/* Empty for now, but ready for future actions */}
        </View>
      </View>

      <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
        App Updates
      </Text>

      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <SettingsCard title="APP UPDATES" isTablet={isTablet}>
            {/* Main Update Card */}
            <View style={styles.updateMainCard}>
              {/* Status Section */}
              <View style={styles.updateStatusSection}>
                <View style={[styles.statusIndicator, { backgroundColor: `${getStatusColor()}20` }]}>
                  {getStatusIcon()}
                </View>
                <View style={styles.statusContent}>
                  <Text style={[styles.statusMainText, { color: currentTheme.colors.highEmphasis }]}>
                    {getStatusText()}
                  </Text>
                  <Text style={[styles.statusDetailText, { color: currentTheme.colors.mediumEmphasis }]}>
                    {lastOperation}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              {(updateStatus === 'downloading' || updateStatus === 'installing') && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${updateProgress}%`, backgroundColor: getStatusColor() }
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: currentTheme.colors.mediumEmphasis }]}>
                    {Math.round(updateProgress)}%
                  </Text>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  {
                    backgroundColor: updateStatus === 'available'
                      ? currentTheme.colors.primary
                      : currentTheme.colors.mediumEmphasis,
                    opacity: isChecking || isInstalling ? 0.6 : 1,
                  }
                ]}
                onPress={updateStatus === 'available' ? installUpdate : checkForUpdates}
                disabled={isChecking || isInstalling}
              >
                <Text style={[styles.mainButtonText, { color: currentTheme.colors.darkBackground }]}>
                  {updateStatus === 'available' ? 'Install Update' : 'Check for Updates'}
                </Text>
              </TouchableOpacity>

              {/* Version Info */}
              <View style={styles.versionInfoContainer}>
                <View style={styles.versionInfoRow}>
                  <Text style={[styles.versionInfoLabel, { color: currentTheme.colors.mediumEmphasis }]}>
                    Current Version:
                  </Text>
                  <Text style={[styles.versionInfoValue, { color: currentTheme.colors.highEmphasis }]}>
                    {getDisplayedAppVersion()}
                  </Text>
                </View>
                {lastChecked && (
                  <View style={styles.versionInfoRow}>
                    <Text style={[styles.versionInfoLabel, { color: currentTheme.colors.mediumEmphasis }]}>
                      Last Checked:
                    </Text>
                    <Text style={[styles.versionInfoValue, { color: currentTheme.colors.highEmphasis }]}>
                      {formatDate(lastChecked)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </SettingsCard>

          {/* Release Notes Section */}
          {updateInfo?.isAvailable && getReleaseNotes() && (
            <SettingsCard title="RELEASE NOTES" isTablet={isTablet}>
              <View style={styles.releaseNotesContainer}>
                <Text style={[styles.releaseNotesTitle, { color: currentTheme.colors.highEmphasis }]}>
                  Update {updateInfo?.manifest?.version || 'Available'}
                </Text>
                <Text style={[styles.releaseNotesText, { color: currentTheme.colors.mediumEmphasis }]}>
                  {getReleaseNotes()}
                </Text>
              </View>
            </SettingsCard>
          )}

          {/* Current Version Release Notes */}
          {currentInfo && getCurrentReleaseNotes() && (
            <SettingsCard title="CURRENT VERSION NOTES" isTablet={isTablet}>
              <View style={styles.releaseNotesContainer}>
                <Text style={[styles.releaseNotesTitle, { color: currentTheme.colors.highEmphasis }]}>
                  Version {getDisplayedAppVersion()}
                </Text>
                <Text style={[styles.releaseNotesText, { color: currentTheme.colors.mediumEmphasis }]}>
                  {getCurrentReleaseNotes()}
                </Text>
              </View>
            </SettingsCard>
          )}

          {/* Major Updates Section */}
          {isAnyUpgrade() && (
            <SettingsCard title="MAJOR UPDATES" isTablet={isTablet}>
              <View style={styles.majorUpdatesContainer}>
                <View style={styles.updateRow}>
                  <View style={styles.updateInfo}>
                    <Text style={[styles.updateTitle, { color: currentTheme.colors.highEmphasis }]}>
                      {github.data?.name || 'New Version Available'}
                    </Text>
                    <Text style={[styles.updateDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                      A new version of the app is available on the App Store.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: currentTheme.colors.primary, borderWidth: 1 }]}
                  onPress={() => {
                    triggerLight();
                    Linking.openURL(github.data?.downloadUrl || '');
                  }}
                >
                  <Text style={[styles.secondaryButtonText, { color: currentTheme.colors.primary }]}>
                    View on Store
                  </Text>
                </TouchableOpacity>
              </View>
            </SettingsCard>
          )}

          {/* Update Notification Settings */}
          <SettingsCard title="UPDATE NOTIFICATIONS" isTablet={isTablet}>
            {/* OTA Updates Alert Setting */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: currentTheme.colors.highEmphasis }]}>
                  OTA Updates
                </Text>
                <Text style={[styles.settingDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                  Automatic notifications for quick fixes
                </Text>
              </View>
              <CustomSwitch
                value={otaAlertsEnabled}
                onValueChange={handleOtaAlertsToggle}
              />
            </View>

            {/* Major Updates Alert Setting */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: currentTheme.colors.highEmphasis }]}>
                  Major Updates
                </Text>
                <Text style={[styles.settingDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                  Notifications for important version updates
                </Text>
              </View>
              <CustomSwitch
                value={majorAlertsEnabled}
                onValueChange={handleMajorAlertsToggle}
              />
            </View>
          </SettingsCard>

          {/* Developer Testing Section */}
          {__DEV__ && (
            <SettingsCard title="DEVELOPER TESTING" isTablet={isTablet}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={testConnectivity}
              >
                <Text style={[styles.testButtonText, { color: currentTheme.colors.primary }]}>
                  Test Connectivity
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.testButton, styles.testButtonLast]}
                onPress={testAssetUrls}
              >
                <Text style={[styles.testButtonText, { color: currentTheme.colors.primary }]}>
                  Test Asset URLs
                </Text>
              </TouchableOpacity>
            </SettingsCard>
          )}
        </ScrollView>
      </View>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
        onDismiss={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
};

export default UpdateScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    width: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  cardContainer: {
    marginBottom: 0,
  },
  tabletCardContainer: {
    paddingHorizontal: 32,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tabletCardTitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  tabletCard: {
    borderRadius: 16,
    padding: 20,
  },
  updateMainCard: {
    gap: 16,
  },
  updateStatusSection: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  statusContent: {
    flex: 1,
    gap: 2,
  },
  statusMainText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDetailText: {
    fontSize: 13,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  mainButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  versionInfoContainer: {
    gap: 8,
    marginTop: 4,
  },
  versionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionInfoLabel: {
    fontSize: 13,
  },
  versionInfoValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  releaseNotesContainer: {
    gap: 12,
  },
  releaseNotesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  releaseNotesText: {
    fontSize: 13,
    lineHeight: 20,
  },
  majorUpdatesContainer: {
    gap: 12,
  },
  updateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  updateInfo: {
    flex: 1,
    gap: 4,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  updateDescription: {
    fontSize: 13,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
  },
  testButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  testButtonLast: {
    marginBottom: 0,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});