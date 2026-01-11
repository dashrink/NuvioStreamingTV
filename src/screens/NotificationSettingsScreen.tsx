import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import CustomAlert from '../components/CustomAlert';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { notificationService, NotificationSettings } from '../services/notificationService';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { logger } from '../utils/logger';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    newEpisodeNotifications: true,
    reminderNotifications: true,
    upcomingShowsNotifications: true,
    timeBeforeAiring: 24,
  });
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [testNotificationId, setTestNotificationId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationStats, setNotificationStats] = useState({ total: 0, upcoming: 0, thisWeek: 0 });

  // Custom alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<any[]>([]);
  // Load settings and stats on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await notificationService.getSettings();
        setSettings(savedSettings);
        
        // Load notification stats
        const stats = notificationService.getNotificationStats();
        setNotificationStats(stats);
      } catch (error) {
        logger.error('Error loading notification settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Refresh stats when settings change
  useEffect(() => {
    if (!loading) {
      const stats = notificationService.getNotificationStats();
      setNotificationStats(stats);
    }
  }, [settings, loading]);

  // Add countdown effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (countdown !== null && countdown > 0) {
      intervalId = setInterval(() => {
        setCountdown(prev => prev !== null ? prev - 1 : null);
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      setTestNotificationId(null);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [countdown]);

  // Update a setting
  const updateSetting = async (key: keyof NotificationSettings, value: boolean | number) => {
    try {
      const updatedSettings = {
        ...settings,
        [key]: value,
      };
      
      // Special case: if enabling notifications, make sure permissions are granted
      if (key === 'enabled' && value === true) {
        // Permissions are handled in the service
      }
      
      // Update settings in the service
      await notificationService.updateSettings({ [key]: value });
      
      // Update local state
      setSettings(updatedSettings);
    } catch (error) {
      logger.error('Error updating notification settings:', error);
  setAlertTitle('Error');
  setAlertMessage('Failed to update notification settings');
  setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
  setAlertVisible(true);
    }
  };

  // Set time before airing
  const setTimeBeforeAiring = (hours: number) => {
    triggerMedium();
    updateSetting('timeBeforeAiring', hours);
  };

  const resetAllNotifications = async () => {
    setAlertTitle('Reset Notifications');
    setAlertMessage('This will cancel all scheduled notifications, but will not remove anything from your saved library. Are you sure?');
    setAlertActions([
      { label: 'Cancel', onPress: () => setAlertVisible(false), style: { color: currentTheme.colors.mediumGray } },
      {
        label: 'Reset',
        onPress: async () => {
          try {
            const scheduledNotifications = notificationService.getScheduledNotifications?.() || [];
            for (const notification of scheduledNotifications) {
              await notificationService.cancelNotification(notification.id);
            }
            setAlertTitle('Success');
            setAlertMessage('All notifications have been reset');
            setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
            setAlertVisible(true);
          } catch (error) {
            logger.error('Error resetting notifications:', error);
            setAlertTitle('Error');
            setAlertMessage('Failed to reset notifications');
            setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
            setAlertVisible(true);
          }
        },
        style: { color: currentTheme.colors.error }
      },
    ]);
    setAlertVisible(true);
  };

  const handleSyncNotifications = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      await notificationService.syncAllNotifications();
      
      // Refresh stats after sync
      const stats = notificationService.getNotificationStats();
      setNotificationStats(stats);
      
      setAlertTitle('Sync Complete');
      setAlertMessage(`Successfully synced notifications for your library and Trakt items.\n\nScheduled: ${stats.upcoming} upcoming episodes\nThis week: ${stats.thisWeek} episodes`);
      setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
    } catch (error) {
      logger.error('Error syncing notifications:', error);
  setAlertTitle('Error');
  setAlertMessage('Failed to sync notifications. Please try again.');
  setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
  setAlertVisible(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      // Remove all previous test notifications before scheduling a new one
      const scheduled = notificationService.getScheduledNotifications?.() || [];
      const testNotifications = scheduled.filter(n => n.id.startsWith('test-notification-'));
      if (testNotifications.length > 0 && typeof notificationService.cancelNotification === 'function') {
        for (const n of testNotifications) {
          await notificationService.cancelNotification(n.id);
        }
      }


      // Temporarily override timeBeforeAiring to 0 for the test notification
      let originalTimeBeforeAiring: number | undefined = undefined;
      if (typeof notificationService.getSettings === 'function') {
        const currentSettings = await notificationService.getSettings();
        originalTimeBeforeAiring = currentSettings.timeBeforeAiring;
        if (typeof notificationService.updateSettings === 'function') {
          await notificationService.updateSettings({ timeBeforeAiring: 0 });
        }
      }

      const testNotification = {
        id: 'test-notification-' + Date.now(),
        seriesId: 'test-series',
        seriesName: 'Test Show',
        episodeTitle: 'Test Episode',
        season: 1,
        episode: 1,
        releaseDate: new Date(Date.now() + 5000).toISOString(), // 5 seconds from now
        notified: false
      };

      const notificationId = await notificationService.scheduleEpisodeNotification(testNotification);

      // Restore original timeBeforeAiring
      if (
        typeof notificationService.updateSettings === 'function' &&
        originalTimeBeforeAiring !== undefined
      ) {
        await notificationService.updateSettings({ timeBeforeAiring: originalTimeBeforeAiring });
      }

      if (notificationId) {
        setTestNotificationId(notificationId);
        setCountdown(0); // No countdown for instant notification
  setAlertTitle('Success');
  setAlertMessage('Test notification scheduled to fire instantly');
  setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
  setAlertVisible(true);
      } else {
  setAlertTitle('Error');
  setAlertMessage('Failed to schedule test notification. Make sure notifications are enabled.');
  setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
  setAlertVisible(true);
      }
    } catch (error) {
      logger.error('Error scheduling test notification:', error);
  setAlertTitle('Error');
  setAlertMessage('Failed to schedule test notification');
  setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
  setAlertVisible(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
        <View style={[styles.header, { borderBottomColor: currentTheme.colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              triggerLight();
              navigation.goBack();
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>Notification Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: currentTheme.colors.text }]}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            triggerLight();
            navigation.goBack();
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.text} />
          <Text style={[styles.backText, { color: currentTheme.colors.text }]}>
            Settings
          </Text>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          {/* Empty for now, but ready for future actions */}
        </View>
      </View>
      
      <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
        Notification Settings
      </Text>
      
      <ScrollView style={styles.content}>
        <Animated.View 
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <View style={[styles.section, { borderBottomColor: currentTheme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>General</Text>
            
            <View style={[styles.settingItem, { borderBottomColor: currentTheme.colors.border + '50' }]}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="notifications" size={24} color={currentTheme.colors.text} />
                <Text style={[styles.settingText, { color: currentTheme.colors.text }]}>Enable Notifications</Text>
              </View>
              <CustomSwitch
                value={settings.enabled}
                onValueChange={(value: boolean) => {
                  triggerMedium();
                  updateSetting('enabled', value);
                }}
              />
            </View>
          </View>
          
          {settings.enabled && (
            <>
              <View style={[styles.section, { borderBottomColor: currentTheme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Notification Types</Text>
                
                <View style={[styles.settingItem, { borderBottomColor: currentTheme.colors.border + '50' }]}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="new-releases" size={24} color={currentTheme.colors.text} />
                    <Text style={[styles.settingText, { color: currentTheme.colors.text }]}>New Episodes</Text>
                  </View>
                  <CustomSwitch
                    value={settings.newEpisodeNotifications}
                    onValueChange={(value: boolean) => {
                      triggerMedium();
                      updateSetting('newEpisodeNotifications', value);
                    }}
                  />
                </View>
                
                <View style={[styles.settingItem, { borderBottomColor: currentTheme.colors.border + '50' }]}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="event" size={24} color={currentTheme.colors.text} />
                    <Text style={[styles.settingText, { color: currentTheme.colors.text }]}>Upcoming Shows</Text>
                  </View>
                  <CustomSwitch
                    value={settings.upcomingShowsNotifications}
                    onValueChange={(value: boolean) => {
                      triggerMedium();
                      updateSetting('upcomingShowsNotifications', value);
                    }}
                  />
                </View>
                
                <View style={[styles.settingItem, { borderBottomColor: currentTheme.colors.border + '50' }]}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="alarm" size={24} color={currentTheme.colors.text} />
                    <Text style={[styles.settingText, { color: currentTheme.colors.text }]}>Reminders</Text>
                  </View>
                  <CustomSwitch
                    value={settings.reminderNotifications}
                    onValueChange={(value: boolean) => {
                      triggerMedium();
                      updateSetting('reminderNotifications', value);
                    }}
                  />
                </View>
              </View>
              
              <View style={[styles.section, { borderBottomColor: currentTheme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Notification Timing</Text>
                
                <Text style={[styles.settingDescription, { color: currentTheme.colors.lightGray }]}>
                  When should you be notified before an episode airs?
                </Text>
                
                <View style={styles.timingOptions}>
                  {[1, 6, 12, 24].map((hours) => (
                    <TouchableOpacity
                      key={hours}
                      style={[
                        styles.timingOption,
                        { 
                          backgroundColor: currentTheme.colors.elevation1,
                          borderColor: currentTheme.colors.border 
                        },
                        settings.timeBeforeAiring === hours && {
                          backgroundColor: currentTheme.colors.primary + '30',
                          borderColor: currentTheme.colors.primary,
                        },
                      ]}
                      onPress={() => setTimeBeforeAiring(hours)}
                    >
                      <Text 
                        style={[
                          styles.timingOptionText,
                          { color: currentTheme.colors.text },
                          settings.timeBeforeAiring === hours && {
                            color: currentTheme.colors.primary,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {hours}h
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={[styles.section, { borderBottomColor: currentTheme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Statistics</Text>
                
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.lightGray }]}>Total Scheduled</Text>
                    <Text style={[styles.statValue, { color: currentTheme.colors.primary }]}>
                      {notificationStats.total}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.lightGray }]}>Upcoming</Text>
                    <Text style={[styles.statValue, { color: currentTheme.colors.primary }]}>
                      {notificationStats.upcoming}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.lightGray }]}>This Week</Text>
                    <Text style={[styles.statValue, { color: currentTheme.colors.primary }]}>
                      {notificationStats.thisWeek}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={[styles.section, { borderBottomColor: currentTheme.colors.border }]}>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: currentTheme.colors.primary }]}
                  onPress={handleTestNotification}
                >
                  <Text style={[styles.buttonText, { color: currentTheme.colors.darkBackground }]}>
                    Send Test Notification
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.section, { borderBottomColor: currentTheme.colors.border }]}>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: currentTheme.colors.elevation1 }]}
                  onPress={handleSyncNotifications}
                  disabled={isSyncing}
                >
                  <Text style={[styles.buttonText, { color: currentTheme.colors.text }]}>
                    {isSyncing ? 'Syncing...' : 'Sync All Notifications'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.section, { borderBottomColor: currentTheme.colors.border }]}>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: currentTheme.colors.error + '20' }]}
                  onPress={resetAllNotifications}
                >
                  <Text style={[styles.buttonText, { color: currentTheme.colors.error }]}>
                    Reset All Notifications
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>
      
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT : 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 16,
  },
  headerActions: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  timingOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  timingOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timingOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});

export default NotificationSettingsScreen;