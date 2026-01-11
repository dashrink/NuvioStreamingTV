import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Linking,
  ScrollView,
  Keyboard,
  Clipboard,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import Focusable from '../components/common/Focusable';
import CustomAlert from '../components/CustomAlert';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { mmkvStorage } from '../services/mmkvStorage';
import { useTheme } from '../contexts/ThemeContext';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';
import { logger } from '../utils/logger';
// Import from shared constants to avoid circular dependency
import {
  RATING_PROVIDERS,
  MDBLIST_API_KEY_STORAGE_KEY,
  RATING_PROVIDERS_STORAGE_KEY,
  MDBLIST_ENABLED_STORAGE_KEY,
  isMDBListEnabled,
  getMDBListAPIKey
} from '../constants/mdblistConstants';

// Re-export for backward compatibility with any code that imports from this file
export {
  MDBLIST_API_KEY_STORAGE_KEY,
  RATING_PROVIDERS_STORAGE_KEY,
  MDBLIST_ENABLED_STORAGE_KEY,
  isMDBListEnabled,
  getMDBListAPIKey
};

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// Create a styles creator function that accepts the theme colors
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
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
    fontWeight: '400',
    color: colors.primary,
    marginLeft: 0,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.mediumGray,
  },
  card: {
    backgroundColor: colors.elevation2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: colors.elevation1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoCard: {
    backgroundColor: colors.elevation1,
    borderRadius: 10,
    padding: 12,
  },
  statusIcon: {
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 13,
    color: colors.mediumGray,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.lightGray,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevation2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    color: colors.white,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  pasteButton: {
    padding: 8,
    marginRight: 2,
  },
  testResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
  },
  testResultSuccess: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '40',
  },
  testResultError: {
    backgroundColor: colors.error + '15',
    borderColor: colors.error + '40',
  },
  testResultText: {
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 12,
    gap: 10,
  },
  buttonIcon: {
    marginRight: 6,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.elevation2,
    opacity: 0.8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error + '40',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  clearButtonDisabled: {
    borderColor: colors.border,
  },
  clearButtonText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
  clearButtonTextDisabled: {
    color: colors.darkGray,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  infoSteps: {
    marginBottom: 12,
    gap: 6,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoStepNumber: {
    fontSize: 13,
    color: colors.mediumGray,
    width: 20,
  },
  infoStepText: {
    color: colors.mediumGray,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '600',
    color: colors.lightGray,
  },
  websiteButton: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  websiteButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  websiteButtonDisabled: {
    backgroundColor: colors.elevation1,
  },
  websiteButtonTextDisabled: {
    color: colors.darkGray,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.mediumGray,
    marginBottom: 12,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '500',
  },
  masterToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  masterToggleInfo: {
    flex: 1,
  },
  masterToggleTitle: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '600',
  },
  masterToggleDescription: {
    fontSize: 13,
    color: colors.mediumGray,
    marginTop: 2,
  },
  disabledCard: {
    opacity: 0.7,
  },
  disabledInput: {
    borderColor: colors.border,
    backgroundColor: colors.elevation1,
  },
  disabledText: {
    color: colors.darkGray,
  },
  disabledBoldText: {
    color: colors.darkGray,
  },
  darkGray: {
    color: colors.darkGray || '#555555',
  },
});

const MDBListSettingsScreen = () => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.colors;
  const styles = createStyles(colors);

  // Custom alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isKeySet, setIsKeySet] = useState(false);
  const [isMdbListEnabled, setIsMdbListEnabled] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState<Record<string, boolean>>({});
  const apiKeyInputRef = useRef<TextInput>(null);

  useEffect(() => {
    logger.log('[MDBListSettingsScreen] Component mounted');
    loadApiKey();
    loadProviderSettings();
    loadMdbListEnabledSetting();
    return () => {
      logger.log('[MDBListSettingsScreen] Component unmounted');
    };
  }, []);

  const loadMdbListEnabledSetting = async () => {
    logger.log('[MDBListSettingsScreen] Loading MDBList enabled setting');
    try {
      const savedSetting = await mmkvStorage.getItem(MDBLIST_ENABLED_STORAGE_KEY);
      if (savedSetting !== null) {
        setIsMdbListEnabled(savedSetting === 'true');
        logger.log('[MDBListSettingsScreen] MDBList enabled setting:', savedSetting === 'true');
      } else {
        // Default to disabled if no setting found
        setIsMdbListEnabled(false);
        await mmkvStorage.setItem(MDBLIST_ENABLED_STORAGE_KEY, 'false');
        logger.log('[MDBListSettingsScreen] MDBList enabled setting not found, defaulting to false');
      }
    } catch (error) {
      logger.error('[MDBListSettingsScreen] Failed to load MDBList enabled setting:', error);
      setIsMdbListEnabled(false);
    }
  };

  const toggleMdbListEnabled = async () => {
    logger.log('[MDBListSettingsScreen] Toggling MDBList enabled setting');
    triggerLight();
    try {
      const newValue = !isMdbListEnabled;
      setIsMdbListEnabled(newValue);
      await mmkvStorage.setItem(MDBLIST_ENABLED_STORAGE_KEY, newValue.toString());
      logger.log('[MDBListSettingsScreen] MDBList enabled set to:', newValue);
    } catch (error) {
      logger.error('[MDBListSettingsScreen] Failed to save MDBList enabled setting:', error);
    }
  };

  const loadApiKey = async () => {
    logger.log('[MDBListSettingsScreen] Loading API key from storage');
    try {
      const savedKey = await mmkvStorage.getItem(MDBLIST_API_KEY_STORAGE_KEY);
      logger.log('[MDBListSettingsScreen] API key status:', savedKey ? 'Found' : 'Not found');
      if (savedKey) {
        setApiKey(savedKey);
        setIsKeySet(true);
      } else {
        setIsKeySet(false);
      }
    } catch (error) {
      logger.error('[MDBListSettingsScreen] Failed to load API key:', error);
      setIsKeySet(false);
    } finally {
      setIsLoading(false);
      logger.log('[MDBListSettingsScreen] Finished loading API key');
    }
  };

  const loadProviderSettings = async () => {
    try {
      const savedSettings = await mmkvStorage.getItem(RATING_PROVIDERS_STORAGE_KEY);
      if (savedSettings) {
        setEnabledProviders(JSON.parse(savedSettings));
      } else {
        // Default all providers to enabled
        const defaultSettings = Object.keys(RATING_PROVIDERS).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setEnabledProviders(defaultSettings);
        await mmkvStorage.setItem(RATING_PROVIDERS_STORAGE_KEY, JSON.stringify(defaultSettings));
      }
    } catch (error) {
      logger.error('[MDBListSettingsScreen] Failed to load provider settings:', error);
    }
  };

  const toggleProvider = async (providerId: string) => {
    triggerLight();
    try {
      const newSettings = {
        ...enabledProviders,
        [providerId]: !enabledProviders[providerId]
      };
      setEnabledProviders(newSettings);
      await mmkvStorage.setItem(RATING_PROVIDERS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      logger.error('[MDBListSettingsScreen] Failed to save provider settings:', error);
    }
  };

  const saveApiKey = async () => {
    logger.log('[MDBListSettingsScreen] Starting API key save');
    triggerMedium();
    Keyboard.dismiss();

    try {
      const trimmedKey = apiKey.trim();
      if (!trimmedKey) {
        logger.warn('[MDBListSettingsScreen] Empty API key provided');
        setTestResult({ success: false, message: 'API Key cannot be empty.' });
        return;
      }

      logger.log('[MDBListSettingsScreen] Saving API key');
      await mmkvStorage.setItem(MDBLIST_API_KEY_STORAGE_KEY, trimmedKey);
      setIsKeySet(true);
      setTestResult({ success: true, message: 'API key saved successfully.' });
      logger.log('[MDBListSettingsScreen] API key saved successfully');

    } catch (error) {
      logger.error('[MDBListSettingsScreen] Error saving API key:', error);
      setTestResult({
        success: false,
        message: 'An error occurred while saving. Please try again.'
      });
    }
  };

  const clearApiKey = async () => {
    logger.log('[MDBListSettingsScreen] Clear API key requested');
    triggerLight();
    setAlertTitle('Clear API Key');
    setAlertMessage('Are you sure you want to remove the saved API key?');
    setAlertActions([
      { label: 'Cancel', onPress: () => setAlertVisible(false), style: { color: colors.mediumGray } },
      {
        label: 'Clear',
        onPress: async () => {
          logger.log('[MDBListSettingsScreen] Proceeding with API key clear');
          triggerHeavy();
          try {
            await mmkvStorage.removeItem(MDBLIST_API_KEY_STORAGE_KEY);
            setApiKey('');
            setIsKeySet(false);
            setTestResult(null);
            logger.log('[MDBListSettingsScreen] API key cleared successfully');
          } catch (error) {
            logger.error('[MDBListSettingsScreen] Failed to clear API key:', error);
            setAlertTitle('Error');
            setAlertMessage('Failed to clear API key');
            setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
            setAlertVisible(true);
          }
        },
        style: { color: colors.error }
      },
    ]);
    setAlertVisible(true);
  };

  const pasteFromClipboard = async () => {
    logger.log('[MDBListSettingsScreen] Attempting to paste from clipboard');
    triggerLight();
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        logger.log('[MDBListSettingsScreen] Content pasted from clipboard');
        setApiKey(clipboardContent);
        setTestResult(null);
      } else {
        logger.warn('[MDBListSettingsScreen] No content in clipboard');
      }
    } catch (error) {
      logger.error('[MDBListSettingsScreen] Error pasting from clipboard:', error);
    }
  };

  const openMDBListWebsite = () => {
    logger.log('[MDBListSettingsScreen] Opening MDBList website');
    triggerLight();
    Linking.openURL('https://mdblist.com/preferences').catch(error => {
      logger.error('[MDBListSettingsScreen] Error opening website:', error);
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Focusable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back-ios" size={24} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </Focusable>
      </View>

      <Text style={styles.headerTitle}>MDBList Settings</Text>

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* MDBList Enable/Disable Status Card */}
          <View style={[styles.statusCard, isMdbListEnabled ? {} : styles.disabledCard]}>
            <MaterialIcons
              name={isMdbListEnabled ? 'check-circle' : 'cancel'}
              size={24}
              color={isMdbListEnabled ? colors.success : colors.error}
              style={styles.statusIcon}
            />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {isMdbListEnabled ? 'Enabled' : 'Disabled'}
              </Text>
              <Text style={styles.statusDescription}>
                {isMdbListEnabled
                  ? 'MDBList is currently enabled for ratings.'
                  : 'MDBList is currently disabled.'}
              </Text>
            </View>
            <CustomSwitch
              value={isMdbListEnabled}
              onValueChange={toggleMdbListEnabled}
            />
          </View>

          {/* Main Settings Card */}
          {isMdbListEnabled && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>API Key</Text>

                {/* API Key Input */}
                <View style={[styles.inputWrapper, isInputFocused && styles.inputFocused]}>
                  <TextInput
                    ref={apiKeyInputRef}
                    style={styles.input}
                    placeholder="Paste your MDBList API Key"
                    placeholderTextColor={colors.darkGray}
                    value={apiKey}
                    onChangeText={setApiKey}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    editable={!isLoading}
                    secureTextEntry={true}
                  />
                  <Focusable
                    style={styles.pasteButton}
                    onPress={pasteFromClipboard}
                  >
                    <MaterialIcons
                      name="paste"
                      size={20}
                      color={colors.primary}
                    />
                  </Focusable>
                </View>

                {/* Test Result Display */}
                {testResult && (
                  <View
                    style={[
                      styles.testResultContainer,
                      testResult.success
                        ? styles.testResultSuccess
                        : styles.testResultError,
                    ]}
                  >
                    <MaterialIcons
                      name={testResult.success ? 'check-circle' : 'error'}
                      size={18}
                      color={testResult.success ? colors.success : colors.error}
                    />
                    <Text
                      style={[
                        styles.testResultText,
                        {
                          color: testResult.success
                            ? colors.success
                            : colors.error,
                        },
                      ]}
                    >
                      {testResult.message}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <Focusable
                    style={[
                      styles.saveButton,
                      !apiKey.trim() && styles.saveButtonDisabled,
                    ]}
                    onPress={saveApiKey}
                    disabled={!apiKey.trim()}
                  >
                    <MaterialIcons
                      name="save"
                      size={20}
                      color={colors.white}
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.saveButtonText}>Save API Key</Text>
                  </Focusable>

                  {isKeySet && (
                    <Focusable
                      style={styles.clearButton}
                      onPress={clearApiKey}
                    >
                      <MaterialIcons
                        name="delete"
                        size={20}
                        color={colors.error}
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.clearButtonText}>Clear API Key</Text>
                    </Focusable>
                  )}
                </View>
              </View>

              {/* Rating Providers Section */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Rating Providers</Text>
                <Text style={styles.sectionDescription}>
                  Select which rating providers to include in the metadata.
                </Text>

                <View style={styles.card}>
                  {Object.entries(RATING_PROVIDERS).map(([providerId, provider]: [string, any]) => (
                    <View key={providerId} style={styles.providerItem}>
                      <View style={styles.providerInfo}>
                        <Text style={styles.providerName}>{provider.name}</Text>
                      </View>
                      <CustomSwitch
                        value={enabledProviders[providerId] ?? true}
                        onValueChange={() => toggleProvider(providerId)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Info Card */}
          <View style={[styles.infoCard, !isMdbListEnabled && styles.disabledCard]}>
            <View style={styles.infoHeader}>
              <MaterialIcons
                name="info"
                size={20}
                color={isMdbListEnabled ? colors.primary : colors.darkGray}
              />
              <Text
                style={[
                  styles.infoHeaderText,
                  !isMdbListEnabled && styles.disabledText,
                ]}
              >
                How to get started
              </Text>
            </View>

            <View style={styles.infoSteps}>
              <View style={styles.infoStep}>
                <Text
                  style={[
                    styles.infoStepNumber,
                    !isMdbListEnabled && styles.disabledText,
                  ]}
                >
                  1.
                </Text>
                <Text
                  style={[
                    styles.infoStepText,
                    !isMdbListEnabled && styles.disabledText,
                  ]}
                >
                  Go to{' '}
                  <Text
                    style={[
                      styles.boldText,
                      !isMdbListEnabled && styles.disabledBoldText,
                    ]}
                  >
                    https://mdblist.com/preferences
                  </Text>{' '}
                  and log in to your account.
                </Text>
              </View>

              <View style={styles.infoStep}>
                <Text
                  style={[
                    styles.infoStepNumber,
                    !isMdbListEnabled && styles.disabledText,
                  ]}
                >
                  2.
                </Text>
                <Text
                  style={[
                    styles.infoStepText,
                    !isMdbListEnabled && styles.disabledText,
                  ]}
                >
                  Find your API Key under the <Text
                    style={[
                      styles.boldText,
                      !isMdbListEnabled && styles.disabledBoldText,
                    ]}
                  >
                    API
                  </Text>{' '}
                  section.
                </Text>
              </View>

              <View style={styles.infoStep}>
                <Text
                  style={[
                    styles.infoStepNumber,
                    !isMdbListEnabled && styles.disabledText,
                  ]}
                >
                  3.
                </Text>
                <Text
                  style={[
                    styles.infoStepText,
                    !isMdbListEnabled && styles.disabledText,
                  ]}
                >
                  Copy your API Key and paste it above.
                </Text>
              </View>
            </View>

            <Focusable
              style={[
                styles.websiteButton,
                !isMdbListEnabled && styles.websiteButtonDisabled,
              ]}
              onPress={openMDBListWebsite}
              disabled={!isMdbListEnabled}
            >
              <MaterialIcons
                name="open-in-new"
                size={18}
                color={isMdbListEnabled ? colors.primary : colors.darkGray}
                style={styles.buttonIcon}
              />
              <Text
                style={[
                  styles.websiteButtonText,
                  !isMdbListEnabled && styles.websiteButtonTextDisabled,
                ]}
              >
                Go to MDBList
              </Text>
            </Focusable>
          </View>
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

export default MDBListSettingsScreen;