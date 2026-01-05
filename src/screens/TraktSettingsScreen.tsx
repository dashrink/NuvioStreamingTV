import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  Linking,
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
        { label: 'Cancel', onPress: () => { } },
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
          onPress={() => navigation.goBack()}
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

              <Focusable
                style={[
                  styles.button,
                  styles.signOutButton,
                  { backgroundColor: currentTheme.colors.error }
                ]}
                onPress={handleSignOut}
              >
                <Text style={styles.buttonText}>Sign Out</Text>
              </Focusable>
            </View>
          ) : (
            <View style={styles.signInContainer}>
              <TraktIcon
                width={120}
                height={120}
                style={styles.traktLogo}
              />

              {/* TV Device Code Display */}
              {Platform.isTV && userCode && verificationUrl ? (
                <>
                  <Text style={[
                    styles.signInTitle,
                    { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
                  ]}>
                    Enter Code on Your Phone
                  </Text>
                  <Text style={[
                    styles.signInDescription,
                    { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
                  ]}>
                    Scan the QR code or visit the URL below on your phone or computer:
                  </Text>

                  {/* QR Code */}
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={verificationUrl}
                      size={250}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>

                  <View style={[styles.codeContainer, { backgroundColor: currentTheme.colors.elevation1 }]}>
                    <Text style={[styles.urlText, { color: currentTheme.colors.primary }]}>
                      {verificationUrl}
                    </Text>
                    <Text style={[styles.codeLabel, { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }]}>
                      Enter this code:
                    </Text>
                    <Text style={[styles.codeText, { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }]}>
                      {userCode}
                    </Text>
                  </View>
                  {isPolling && (
                    <View style={styles.pollingContainer}>
                      <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                      <Text style={[styles.pollingText, { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }]}>
                        Waiting for authentication...
                      </Text>
                    </View>
                  )}
                  <Focusable
                    style={[
                      styles.button,
                      { backgroundColor: currentTheme.colors.error, marginTop: 16 }
                    ]}
                    onPress={cancelDeviceCodeFlow}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </Focusable>
                </>
              ) : (
                <>
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
                    {Platform.isTV
                      ? 'Sign in using a code on your phone or computer'
                      : 'Sync your watch history, watchlist, and collection with Trakt.tv'
                    }
                  </Text>
                  <Focusable
                    style={[
                      styles.button,
                      { backgroundColor: isDarkMode ? currentTheme.colors.primary : currentTheme.colors.primary }
                    ]}
                    onPress={handleSignIn}
                    disabled={(!Platform.isTV && !request) || isExchangingCode}
                  >
                    {isExchangingCode ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.buttonText}>
                        Sign In with Trakt
                      </Text>
                    )}
                  </Focusable>
                </>
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
                  When connected to Trakt, full history is synced directly from the API and is not written to local storage. Your Continue Watching list reflects your global Trakt progress.
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
                      onValueChange={setAutosyncEnabled}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <View style={styles.settingTextContainer}>
                    <Text style={[
                      styles.settingLabel,
                      { color: currentTheme.colors.highEmphasis }
                    ]}>
                      Import watched history
                    </Text>
                    <Text style={[
                      styles.settingDescription,
                      { color: currentTheme.colors.mediumEmphasis }
                    ]}>
                      Use "Sync Now" to import your watch history and progress from Trakt
                    </Text>
                  </View>
                </View>
              </View>
              <Focusable
                style={[
                  styles.button,
                  {
                    backgroundColor: currentTheme.colors.card,
                    opacity: isSyncing ? 0.6 : 1
                  }
                ]}
                disabled={isSyncing}
                onPress={async () => {
                  const success = await performManualSync();
                  openAlert(
                    'Sync Complete',
                    success ? 'Successfully synced your watch progress with Trakt.' : 'Sync failed. Please try again.'
                  );
                }}
              >
                {isSyncing ? (
                  <ActivityIndicator
                    size="small"
                    color={currentTheme.colors.primary}
                  />
                ) : (
                  <Text style={[
                    styles.buttonText,
                    { color: currentTheme.colors.primary }
                  ]}>
                    Sync Now
                  </Text>
                )}
              </Focusable>

              {/* Display Settings Section */}
              <Text style={[
                styles.sectionTitle,
                { color: currentTheme.colors.highEmphasis, marginTop: 24 }
              ]}>
                Display Settings
              </Text>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <View style={styles.settingTextContainer}>
                    <Text style={[
                      styles.settingLabel,
                      { color: currentTheme.colors.highEmphasis }
                    ]}>
                      Show Trakt Comments
                    </Text>
                    <Text style={[
                      styles.settingDescription,
                      { color: currentTheme.colors.mediumEmphasis }
                    ]}>
                      Display Trakt comments in metadata screens when available
                    </Text>
                  </View>
                  <View style={styles.settingToggleContainer}>
                    <CustomSwitch
                      value={settings.showTraktComments}
                      onValueChange={(value: boolean) => updateSetting('showTraktComments', value)}
                    />
                  </View>
                </View>
              </View>


            </View>
          </View>
        )}
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
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
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInContainer: {
    padding: 24,
    alignItems: 'center',
  },
  traktLogo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  signInTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  signInDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  button: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signOutButton: {
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  profileContainer: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
  },
  vipBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  vipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  statsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  joinedDate: {
    fontSize: 14,
  },
  settingsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingToggleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
<<<<<<< HEAD
  // TV Device Code styles
  codeContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  urlText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },
  pollingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  pollingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
=======
  // Maintenance mode styles
  maintenanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E67E22',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  maintenanceBannerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  maintenanceBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  maintenanceBannerMessage: {
    fontSize: 13,
    color: '#FFF',
    opacity: 0.9,
>>>>>>> origin/main
  },
});

export default TraktSettingsScreen; 