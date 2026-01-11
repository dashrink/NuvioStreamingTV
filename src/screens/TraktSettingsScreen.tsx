import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  Linking,
  Switch,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import CustomSwitch from '../components/common/CustomSwitch';
import Focusable from '../components/common/Focusable';
import { useNavigation } from '@react-navigation/native';
import { makeRedirectUri, useAuthRequest, ResponseType, Prompt, CodeChallengeMethod } from 'expo-auth-session';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FastImage from '@d11/react-native-fast-image';
import { traktService, TraktUser } from '../services/traktService';
import { useSettings } from '../hooks/useSettings';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';
import { logger } from '../utils/logger';
import TraktIcon from '../../assets/rating-icons/trakt.svg';
import { useTheme } from '../contexts/ThemeContext';
import { useTraktIntegration } from '../hooks/useTraktIntegration';
import { useTraktAutosyncSettings } from '../hooks/useTraktAutosyncSettings';
import { colors } from '../styles';
import CustomAlert from '../components/CustomAlert';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// Trakt configuration
const TRAKT_CLIENT_ID = process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID as string;

if (!TRAKT_CLIENT_ID) {
  throw new Error('Missing EXPO_PUBLIC_TRAKT_CLIENT_ID environment variable');
}
const discovery = {
  authorizationEndpoint: 'https://trakt.tv/oauth/authorize',
  tokenEndpoint: 'https://api.trakt.tv/oauth/token',
};

// For use with deep linking - use different scheme for TV
const redirectUri = makeRedirectUri({
  scheme: Platform.isTV ? 'nuvio-tv' : 'nuvio',
  path: 'auth/trakt',
});

const TraktSettingsScreen: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const isDarkMode = settings.enableDarkMode;
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<TraktUser | null>(null);
  const { currentTheme } = useTheme();

  const {
    settings: autosyncSettings,
    isSyncing,
    setAutosyncEnabled,
    performManualSync
  } = useTraktAutosyncSettings();

  const {
    isLoading: traktLoading,
    refreshAuthStatus
  } = useTraktIntegration();

  const [showSyncFrequencyModal, setShowSyncFrequencyModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<Array<{ label: string; onPress: () => void; style?: object }>>([
    { label: 'OK', onPress: () => setAlertVisible(false) },
  ]);

  // TV Device Code Authentication State
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

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

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const authenticated = await traktService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const profile = await traktService.getUserProfile();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      logger.error('[TraktSettingsScreen] Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Setup expo-auth-session hook with PKCE
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: TRAKT_CLIENT_ID,
      scopes: [],
      redirectUri: redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true,
      codeChallengeMethod: CodeChallengeMethod.S256,
    },
    discovery
  );

  const [isExchangingCode, setIsExchangingCode] = useState(false);

  // Handle the response from the auth request
  useEffect(() => {
    if (response) {
      setIsExchangingCode(true);
      if (response.type === 'success' && request?.codeVerifier) {
        const { code } = response.params;
        logger.log('[TraktSettingsScreen] Auth code received:', code);
        traktService.exchangeCodeForToken(code, request.codeVerifier)
          .then(success => {
            if (success) {
              logger.log('[TraktSettingsScreen] Token exchange successful');
              checkAuthStatus().then(() => {
                // Show success message
                openAlert(
                  'Successfully Connected',
                  'Your Trakt account has been connected successfully.',
                  [
                    {
                      label: 'OK',
                      onPress: () => navigation.goBack(),
                    }
                  ]
                );
              });
            } else {
              logger.error('[TraktSettingsScreen] Token exchange failed');
              openAlert('Authentication Error', 'Failed to complete authentication with Trakt.');
            }
          })
          .catch(error => {
            logger.error('[TraktSettingsScreen] Token exchange error:', error);
            openAlert('Authentication Error', 'An error occurred during authentication.');
          })
          .finally(() => {
            setIsExchangingCode(false);
          });
      } else if (response.type === 'error') {
        logger.error('[TraktSettingsScreen] Authentication error:', response.error);
        openAlert('Authentication Error', response.error?.message || 'An error occurred during authentication.');
        setIsExchangingCode(false);
      } else {
        logger.log('[TraktSettingsScreen] Auth response type:', response.type);
        setIsExchangingCode(false);
      }
    }
  }, [response, checkAuthStatus, request?.codeVerifier, navigation]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // TV Device Code Flow
  const startDeviceCodeFlow = async () => {
    setIsExchangingCode(true);
    try {
      const codeData = await traktService.getDeviceCode();
      if (codeData) {
        setDeviceCode(codeData.device_code);
        setUserCode(codeData.user_code);
        setVerificationUrl(codeData.verification_url);
        setIsPolling(true);

        // Start polling for token
        const pollInterval = (codeData.interval || 5) * 1000;
        pollingIntervalRef.current = setInterval(async () => {
          const result = await traktService.pollDeviceToken(codeData.device_code);

          if (result === 'success') {
            // Stop polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            setIsPolling(false);
            setDeviceCode(null);
            setUserCode(null);
            setVerificationUrl(null);
            setIsExchangingCode(false);

            checkAuthStatus().then(() => {
              openAlert(
                'Successfully Connected',
                'Your Trakt account has been connected successfully.',
                [{ label: 'OK', onPress: () => navigation.goBack() }]
              );
            });
          } else if (result === 'expired' || result === 'error') {
            // Stop polling on error
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            setIsPolling(false);
            setDeviceCode(null);
            setUserCode(null);
            setVerificationUrl(null);
            setIsExchangingCode(false);

            openAlert(
              'Authentication Failed',
              result === 'expired'
                ? 'The code has expired. Please try again.'
                : 'An error occurred during authentication. Please try again.'
            );
          }
          // If 'pending', continue polling
        }, pollInterval);
      } else {
        setIsExchangingCode(false);
        openAlert('Error', 'Failed to get device code. Please try again.');
      }
    } catch (error) {
      setIsExchangingCode(false);
      logger.error('[TraktSettingsScreen] Device code flow error:', error);
      openAlert('Error', 'An error occurred. Please try again.');
    }
  };

  const cancelDeviceCodeFlow = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setIsPolling(false);
    setDeviceCode(null);
    setUserCode(null);
    setVerificationUrl(null);
    setIsExchangingCode(false);
  };

  const handleSignIn = () => {
    if (Platform.isTV) {
      // Use device code flow for TV
      startDeviceCodeFlow();
    } else {
      // Use standard OAuth flow for mobile
      promptAsync();
    }
  };

  const handleSignOut = async () => {
    openAlert(
      'Sign Out',
      'Are you sure you want to sign out of your Trakt account?',
      [
        { label: 'Cancel', onPress: () => {} },
        {
          label: 'Sign Out',
          onPress: async () => {
            setIsLoading(true);
            try {
              await traktService.logout();
              setIsAuthenticated(false);
              setUserProfile(null);
              // Refresh auth status in the integration hook to ensure UI consistency
              await refreshAuthStatus();
            } catch (error) {
              logger.error('[TraktSettingsScreen] Error signing out:', error);
              openAlert('Error', 'Failed to sign out of Trakt.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? currentTheme.colors.darkBackground : '#F2F2F7' }
    ]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <Focusable
          onPress={() => {
            triggerLight();
            navigation.goBack();
          }}
          style={styles.backButton}
          hasTVPreferredFocus={true}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark}
          />
          <Text style={[styles.backText, { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }]}>
            Settings
          </Text>
        </Focusable>

        <View style={styles.headerActions}>
          {/* Empty for now, but ready for future actions */}
        </View>
      </View>

      <Text style={[styles.headerTitle, { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }]}>
        Trakt Settings
      </Text>

      {/* Maintenance Mode Banner */}
      {traktService.isMaintenanceMode() && (
        <View style={styles.maintenanceBanner}>
          <MaterialIcons name="engineering" size={24} color="#FFF" />
          <View style={styles.maintenanceBannerTextContainer}>
            <Text style={styles.maintenanceBannerTitle}>Under Maintenance</Text>
            <Text style={styles.maintenanceBannerMessage}>
              {traktService.getMaintenanceMessage()}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[
          styles.card,
          { backgroundColor: currentTheme.colors.elevation2 }
        ]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={currentTheme.colors.primary} />
            </View>
          ) : traktService.isMaintenanceMode() ? (
            <View style={styles.signInContainer}>
              <TraktIcon
                width={120}
                height={120}
                style={[styles.traktLogo, { opacity: 0.5 }]}
              />
              <Text style={[
                styles.signInTitle,
                { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
              ]}>
                Trakt Unavailable
              </Text>
              <Text style={[
                styles.signInDescription,
                { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
              ]}>
                The Trakt integration is temporarily paused for maintenance. All syncing and authentication is disabled until maintenance is complete.
              </Text>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: currentTheme.colors.border, opacity: 0.6 }
                ]}
                disabled={true}
              >
                <MaterialIcons name="engineering" size={20} color={currentTheme.colors.mediumEmphasis} style={{ marginRight: 8 }} />
                <Text style={[styles.buttonText, { color: currentTheme.colors.mediumEmphasis }]}>
                  Service Under Maintenance
                </Text>
              </TouchableOpacity>
            </View>
          ) : isAuthenticated && userProfile ? (
            <View style={styles.profileContainer}>
              <View style={styles.profileHeader}>
                {userProfile.avatar ? (
                  <FastImage
                    source={{ uri: userProfile.avatar }}
                    style={styles.avatar}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: currentTheme.colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {userProfile.name?.charAt(0) || userProfile.username.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={[
                    styles.profileName,
                    { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
                  ]}>
                    {userProfile.name || userProfile.username}
                  </Text>
                  <Text style={[
                    styles.profileUsername,
                    { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
                  ]}>
                    @{userProfile.username}
                  </Text>
                  {userProfile.vip && (
                    <View style={styles.vipBadge}>
                      <MaterialIcons name="star" size={14} color="#FFF" />
                      <Text style={styles.vipText}>VIP</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.statsContainer}>
                <Text style={[
                  styles.joinedDate,
                  { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
                ]}>
                  Joined {new Date(userProfile.joined_at).toLocaleDateString()}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.signOutButton,
                  { backgroundColor: currentTheme.colors.error }
                ]}
                onPress={() => {
                  triggerHeavy();
                  handleSignOut();
                }}
              >
                <Text style={styles.buttonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.signInContainer}>
              <TraktIcon
                width={120}
                height={120}
                style={styles.traktLogo}
              />
              <Text style={[
                styles.signInTitle,
                { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
              ]}>
                Connect with Trakt
              </Text>
              <Text style={[
                styles.signInDescription,
                { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
              ]}>
                Sync your watch history, watchlist, and collection with Trakt.tv
              </Text>

              {deviceCode && userCode && verificationUrl ? (
                <View style={styles.deviceCodeContainer}>
                  <QRCode
                    value={verificationUrl}
                    size={200}
                    color={isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark}
                    backgroundColor={isDarkMode ? currentTheme.colors.elevation1 : '#FFF'}
                  />
                  <Text style={[
                    styles.deviceCodeLabel,
                    { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
                  ]}>
                    Or enter code:
                  </Text>
                  <Text style={[
                    styles.deviceCode,
                    { color: currentTheme.colors.primary }
                  ]}>
                    {userCode}
                  </Text>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: currentTheme.colors.border }]}
                    onPress={() => {
                      triggerLight();
                      cancelDeviceCodeFlow();
                    }}
                  >
                    <Text style={[styles.buttonText, { color: currentTheme.colors.highEmphasis }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: isDarkMode ? currentTheme.colors.primary : currentTheme.colors.primary }
                  ]}
                  onPress={() => {
                    triggerMedium();
                    handleSignIn();
                  }}
                  disabled={!request || isExchangingCode}
                >
                  {isExchangingCode ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Sign In with Trakt
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {isAuthenticated && (
          <View style={[
            styles.card,
            { backgroundColor: isDarkMode ? currentTheme.colors.elevation2 : currentTheme.colors.white }
          ]}>
            <View style={styles.settingsSection}>
              <Text style={[
                styles.sectionTitle,
                { color: currentTheme.colors.highEmphasis }
              ]}>
                Sync Settings
              </Text>
              <View style={[
                styles.infoBox,
                { backgroundColor: currentTheme.colors.elevation1, borderColor: currentTheme.colors.border }
              ]}>
                <Text style={[
                  styles.infoText,
                  { color: currentTheme.colors.mediumEmphasis }
                ]}>
                  When connected to Trakt, Continue Watching is sourced from Trakt. Account sync for watch progress is disabled to avoid conflicts.
                </Text>
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <View style={styles.settingTextContainer}>
                    <Text style={[
                      styles.settingLabel,
                      { color: currentTheme.colors.highEmphasis }
                    ]}>
                      Auto-sync playback progress
                    </Text>
                    <Text style={[
                      styles.settingDescription,
                      { color: currentTheme.colors.mediumEmphasis }
                    ]}>
                      Automatically sync watch progress to Trakt
                    </Text>
                  </View>
                  <View style={styles.settingToggleContainer}>
                    <CustomSwitch
                      value={autosyncSettings.enabled}
                      onValueChange={(value) => {
                        triggerMedium();
                        setAutosyncEnabled(value);
                      }}
                      trackColor={{
                        false: currentTheme.colors.border,
                        true: currentTheme.colors.primary
                      }}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  triggerLight();
                  performManualSync();
                }}
                disabled={isSyncing}
              >
                <View style={styles.settingContent}>
                  <View style={styles.settingTextContainer}>
                    <Text style={[
                      styles.settingLabel,
                      { color: isSyncing ? currentTheme.colors.mediumEmphasis : currentTheme.colors.highEmphasis }
                    ]}>
                      Manual Sync
                    </Text>
                    <Text style={[
                      styles.settingDescription,
                      { color: currentTheme.colors.mediumEmphasis }
                    ]}>
                      {isSyncing ? 'Syncing...' : 'Sync now'}
                    </Text>
                  </View>
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                  ) : (
                    <MaterialIcons name="chevron-right" size={24} color={currentTheme.colors.mediumEmphasis} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.isTV ? 20 : 0,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  maintenanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  maintenanceBannerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  maintenanceBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  maintenanceBannerMessage: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  profileContainer: {
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    marginBottom: 8,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  vipText: {
    marginLeft: 4,
    color: '#FFD700',
    fontWeight: '600',
    fontSize: 12,
  },
  statsContainer: {
    marginBottom: 16,
  },
  joinedDate: {
    fontSize: 12,
    textAlign: 'center',
  },
  signInContainer: {
    alignItems: 'center',
  },
  traktLogo: {
    marginBottom: 24,
  },
  signInTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  signInDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  deviceCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceCodeLabel: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  deviceCode: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 16,
    width: '100%',
  },
  settingsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  settingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  settingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
  },
  settingToggleContainer: {
    marginLeft: 12,
  },
});

export default TraktSettingsScreen;