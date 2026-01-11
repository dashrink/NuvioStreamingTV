import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Linking,
  ScrollView,
  Keyboard,
  Clipboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { mmkvStorage } from '../services/mmkvStorage';
import FastImage from '@d11/react-native-fast-image';
import { tmdbService } from '../services/tmdbService';
import { useSettings } from '../hooks/useSettings';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';
import { logger } from '../utils/logger';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';
// (duplicate import removed)

const TMDB_API_KEY_STORAGE_KEY = 'tmdb_api_key';
const USE_CUSTOM_TMDB_API_KEY = 'use_custom_tmdb_api_key';
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';

// Define example shows with their IMDB IDs and TMDB IDs
const EXAMPLE_SHOWS = [
  {
    name: 'Breaking Bad',
    imdbId: 'tt0903747',
    tmdbId: '1396',
    type: 'tv' as const
  },
  {
    name: 'Friends',
    imdbId: 'tt0108778',
    tmdbId: '1668',
    type: 'tv' as const
  },
  {
    name: 'Stranger Things',
    imdbId: 'tt4574334',
    tmdbId: '66732',
    type: 'tv' as const
  },
  {
    name: 'Avatar',
    imdbId: 'tt0499549',
    tmdbId: '19995',
    type: 'movie' as const
  },
];

const TMDBSettingsScreen = () => {
  const navigation = useNavigation();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isKeySet, setIsKeySet] = useState(false);
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<Array<{ label: string; onPress: () => void; style?: object }>>([
    { label: 'OK', onPress: () => setAlertVisible(false) },
  ]);
  const apiKeyInputRef = useRef<TextInput>(null);
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting } = useSettings();
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');

  // Logo preview state
  const [selectedShow, setSelectedShow] = useState(EXAMPLE_SHOWS[0]);
  const [tmdbLogo, setTmdbLogo] = useState<string | null>(null);
  const [tmdbBanner, setTmdbBanner] = useState<string | null>(null);
  const [loadingLogos, setLoadingLogos] = useState(true);
  const [previewLanguage, setPreviewLanguage] = useState<string>('');
  const [isPreviewFallback, setIsPreviewFallback] = useState<boolean>(false);
  const [cacheSize, setCacheSize] = useState<string>('0 KB');

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

  useEffect(() => {
    logger.log('[TMDBSettingsScreen] Component mounted');
    loadSettings();
    calculateCacheSize();
    return () => {
      logger.log('[TMDBSettingsScreen] Component unmounted');
    };
  }, []);

  const calculateCacheSize = async () => {
    try {
      const keys = await mmkvStorage.getAllKeys();
      const tmdbKeys = keys.filter(key => key.startsWith('tmdb_cache_'));

      let totalSize = 0;
      for (const key of tmdbKeys) {
        const value = mmkvStorage.getString(key);
        if (value) {
          totalSize += value.length;
        }
      }

      // Convert to KB/MB
      let sizeStr = '';
      if (totalSize < 1024) {
        sizeStr = `${totalSize} B`;
      } else if (totalSize < 1024 * 1024) {
        sizeStr = `${(totalSize / 1024).toFixed(2)} KB`;
      } else {
        sizeStr = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
      }

      setCacheSize(sizeStr);
    } catch (error) {
      logger.error('[TMDBSettingsScreen] Error calculating cache size:', error);
      setCacheSize('Unknown');
    }
  };

  const handleClearCache = () => {
    openAlert(
      'Clear TMDB Cache',
      `This will clear all cached TMDB data (${cacheSize}). This may temporarily slow down loading until cache rebuilds.`,
      [
        {
          label: 'Cancel',
          onPress: () => logger.log('[TMDBSettingsScreen] Clear cache cancelled'),
        },
        {
          label: 'Clear',
          onPress: async () => {
            logger.log('[TMDBSettingsScreen] Proceeding with cache clear');
            try {
              await tmdbService.clearAllCache();
              setCacheSize('0 KB');
              logger.log('[TMDBSettingsScreen] Cache cleared successfully');
              openAlert('Success', 'TMDB cache cleared successfully.');
            } catch (error) {
              logger.error('[TMDBSettingsScreen] Failed to clear cache:', error);
              openAlert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  const loadSettings = async () => {
    logger.log('[TMDBSettingsScreen] Loading settings from storage');
    try {
      const [savedKey, savedUseCustomKey] = await Promise.all([
        mmkvStorage.getItem(TMDB_API_KEY_STORAGE_KEY),
        mmkvStorage.getItem(USE_CUSTOM_TMDB_API_KEY)
      ]);

      logger.log('[TMDBSettingsScreen] API key status:', savedKey ? 'Found' : 'Not found');
      logger.log('[TMDBSettingsScreen] Use custom API setting:', savedUseCustomKey);

      if (savedKey) {
        setApiKey(savedKey);
        setIsKeySet(true);
      } else {
        setIsKeySet(false);
      }

      setUseCustomKey(savedUseCustomKey === 'true');
    } catch (error) {
      logger.error('[TMDBSettingsScreen] Failed to load settings:', error);
      setIsKeySet(false);
      setUseCustomKey(false);
    } finally {
      setIsLoading(false);
      logger.log('[TMDBSettingsScreen] Finished loading settings');
    }
  };

  const saveApiKey = async () => {
    logger.log('[TMDBSettingsScreen] Starting API key save');
    Keyboard.dismiss();

    try {
      const trimmedKey = apiKey.trim();
      if (!trimmedKey) {
        logger.warn('[TMDBSettingsScreen] Empty API key provided');
        setTestResult({ success: false, message: 'API Key cannot be empty.' });
        return;
      }

      // Test the API key to make sure it works
      if (await testApiKey(trimmedKey)) {
        logger.log('[TMDBSettingsScreen] API key test successful, saving key');
        await mmkvStorage.setItem(TMDB_API_KEY_STORAGE_KEY, trimmedKey);
        await mmkvStorage.setItem(USE_CUSTOM_TMDB_API_KEY, 'true');
        setIsKeySet(true);
        setUseCustomKey(true);
        setTestResult({ success: true, message: 'API key verified and saved successfully.' });
        logger.log('[TMDBSettingsScreen] API key saved successfully');
      } else {
        logger.warn('[TMDBSettingsScreen] API key test failed');
        setTestResult({ success: false, message: 'Invalid API key. Please check and try again.' });
      }
    } catch (error) {
      logger.error('[TMDBSettingsScreen] Error saving API key:', error);
      setTestResult({
        success: false,
        message: 'An error occurred while saving. Please try again.'
      });
    }
  };

  const testApiKey = async (key: string): Promise<boolean> => {
    try {
      // Simple API call to test the key using the API key parameter method
      const response = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${key}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      return response.ok;
    } catch (error) {
      logger.error('[TMDBSettingsScreen] API key test error:', error);
      return false;
    }
  };

  const clearApiKey = async () => {
    logger.log('[TMDBSettingsScreen] Clear API key requested');
    openAlert(
      'Clear API Key',
      'Are you sure you want to remove your custom API key and revert to the default?',
      [
        {
          label: 'Cancel',
          onPress: () => logger.log('[TMDBSettingsScreen] Clear API key cancelled'),
        },
        {
          label: 'Clear',
          onPress: async () => {
            logger.log('[TMDBSettingsScreen] Proceeding with API key clear');
            try {
              await mmkvStorage.removeItem(TMDB_API_KEY_STORAGE_KEY);
              await mmkvStorage.setItem(USE_CUSTOM_TMDB_API_KEY, 'false');
              setApiKey('');
              setIsKeySet(false);
              setUseCustomKey(false);
              setTestResult(null);
              logger.log('[TMDBSettingsScreen] API key cleared successfully');
            } catch (error) {
              logger.error('[TMDBSettingsScreen] Failed to clear API key:', error);
              openAlert('Error', 'Failed to clear API key');
            }
          },
        },
      ]
    );
  };

  const toggleUseCustomKey = async (value: boolean) => {
    logger.log('[TMDBSettingsScreen] Toggle use custom key:', value);
    try {
      await mmkvStorage.setItem(USE_CUSTOM_TMDB_API_KEY, value ? 'true' : 'false');
      setUseCustomKey(value);

      if (!value) {
        // If switching to built-in key, show confirmation
        logger.log('[TMDBSettingsScreen] Switching to built-in API key');
        setTestResult({
          success: true,
          message: 'Now using the built-in TMDb API key.'
        });
      } else if (apiKey && isKeySet) {
        // If switching to custom key and we have a key
        logger.log('[TMDBSettingsScreen] Switching to custom API key');
        setTestResult({
          success: true,
          message: 'Now using your custom TMDb API key.'
        });
      } else {
        // If switching to custom key but don't have a key yet
        logger.log('[TMDBSettingsScreen] No custom key available yet');
        setTestResult({
          success: false,
          message: 'Please enter and save your custom TMDb API key.'
        });
      }
    } catch (error) {
      logger.error('[TMDBSettingsScreen] Failed to toggle custom key setting:', error);
    }
  };

  const pasteFromClipboard = async () => {
    logger.log('[TMDBSettingsScreen] Attempting to paste from clipboard');
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        logger.log('[TMDBSettingsScreen] Content pasted from clipboard');
        setApiKey(clipboardContent);
        setTestResult(null);
      } else {
        logger.warn('[TMDBSettingsScreen] No content in clipboard');
      }
    } catch (error) {
      logger.error('[TMDBSettingsScreen] Error pasting from clipboard:', error);
    }
  };

  const openTMDBWebsite = () => {
    logger.log('[TMDBSettingsScreen] Opening TMDb website');
    Linking.openURL('https://www.themoviedb.org/settings/api').catch(error => {
      logger.error('[TMDBSettingsScreen] Error opening website:', error);
    });
  };

  // Logo preview functions
  const fetchExampleLogos = async (show: typeof EXAMPLE_SHOWS[0]) => {
    setLoadingLogos(true);
    setTmdbLogo(null);
    setTmdbBanner(null);

    try {
      const tmdbId = show.tmdbId;
      const contentType = show.type;

      logger.log(`[TMDBSettingsScreen] Fetching ${show.name} with TMDB ID: ${tmdbId}`);

      const preferredTmdbLanguage = settings.tmdbLanguagePreference || 'en';

      const apiKey = TMDB_API_KEY;
      const endpoint = contentType === 'tv' ? 'tv' : 'movie';
      const response = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/images?api_key=${apiKey}`);
      const imagesData = await response.json();

      if (imagesData.logos && imagesData.logos.length > 0) {
        let logoPath: string | null = null;
        let logoLanguage = preferredTmdbLanguage;

        // Try to find logo in preferred language
        const preferredLogo = imagesData.logos.find((logo: { iso_639_1: string; file_path: string }) => logo.iso_639_1 === preferredTmdbLanguage);

        if (preferredLogo) {
          logoPath = preferredLogo.file_path;
          logoLanguage = preferredTmdbLanguage;
          setIsPreviewFallback(false);
        } else {
          // Fallback to English
          const englishLogo = imagesData.logos.find((logo: { iso_639_1: string; file_path: string }) => logo.iso_639_1 === 'en');

          if (englishLogo) {
            logoPath = englishLogo.file_path;
            logoLanguage = 'en';
            setIsPreviewFallback(true);
          } else if (imagesData.logos[0]) {
            // Fallback to first available
            logoPath = imagesData.logos[0].file_path;
            logoLanguage = imagesData.logos[0].iso_639_1 || 'unknown';
            setIsPreviewFallback(true);
          }
        }

        if (logoPath) {
          setTmdbLogo(`https://image.tmdb.org/t/p/original${logoPath}`);
          setPreviewLanguage(logoLanguage);
        } else {
          setPreviewLanguage('');
          setIsPreviewFallback(false);
        }
      } else {
        setPreviewLanguage('');
        setIsPreviewFallback(false);
      }

      // Get TMDB banner (backdrop)
      if (imagesData.backdrops && imagesData.backdrops.length > 0) {
        const backdropPath = imagesData.backdrops[0].file_path;
        setTmdbBanner(`https://image.tmdb.org/t/p/original${backdropPath}`);
      } else {
        const detailsResponse = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${apiKey}`);
        const details = await detailsResponse.json();

        if (details.backdrop_path) {
          setTmdbBanner(`https://image.tmdb.org/t/p/original${details.backdrop_path}`);
        }
      }
    } catch (err) {
      logger.error(`[TMDBSettingsScreen] Error fetching ${show.name} preview:`, err);
    } finally {
      setLoadingLogos(false);
    }
  };

  const handleShowSelect = (show: typeof EXAMPLE_SHOWS[0]) => {
    triggerLight();
    setSelectedShow(show);
    try {
      mmkvStorage.setItem('tmdb_settings_selected_show', show.imdbId);
    } catch (e) {
      if (__DEV__) console.error('Error saving selected show:', e);
    }
  };

  const renderLogoExample = () => {
    return (
      <View style={styles.logoContainer}>
        {loadingLogos ? (
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        ) : tmdbLogo ? (
          <View style={styles.logoWrapper}>
            <FastImage
              source={{ uri: tmdbLogo }}
              style={styles.logo}
              resizeMode={FastImage.resizeMode.contain}
            />
            {isPreviewFallback && (
              <Text style={[styles.fallbackText, { color: currentTheme.colors.text }]}>
                (Fallback: {previewLanguage})
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.noLogoText, { color: currentTheme.colors.textSecondary }]}>
            No logo available for this title
          </Text>
        )}
      </View>
    );
  };

  const renderPreview = () => {
    return (
      <View style={[styles.previewSection, { backgroundColor: currentTheme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
          TMDB Logo Preview
        </Text>
        <Text style={[styles.previewDescription, { color: currentTheme.colors.textSecondary }]}>
          This shows how TMDB logos appear in the app
        </Text>

        {/* Show Selector */}
        <View style={styles.showSelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EXAMPLE_SHOWS.map((show) => (
              <TouchableOpacity
                key={show.imdbId}
                style={[
                  styles.showButton,
                  selectedShow.imdbId === show.imdbId && [
                    styles.selectedShowButton,
                    { backgroundColor: currentTheme.colors.primary },
                  ],
                  { borderColor: currentTheme.colors.primary }
                ]}
                onPress={() => {
                  handleShowSelect(show);
                  fetchExampleLogos(show);
                }}
              >
                <Text
                  style={[
                    styles.showButtonText,
                    selectedShow.imdbId === show.imdbId
                      ? { color: currentTheme.colors.onPrimary }
                      : { color: currentTheme.colors.text },
                  ]}
                >
                  {show.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Logo Display */}
        {renderLogoExample()}

        {/* Banner Display */}
        {tmdbBanner && (
          <View style={styles.bannerContainer}>
            <Text style={[styles.bannerLabel, { color: currentTheme.colors.text }]}>
              Background Image
            </Text>
            <FastImage
              source={{ uri: tmdbBanner }}
              style={styles.banner}
              resizeMode={FastImage.resizeMode.cover}
            />
          </View>
        )}
      </View>
    );
  };

  const renderLanguageOption = (lang: { name: string; code: string }) => {
    const isSelected = settings.tmdbLanguagePreference === lang.code;

    return (
      <TouchableOpacity
        key={lang.code}
        style={[
          styles.languageOption,
          isSelected && [styles.selectedLanguageOption, { backgroundColor: currentTheme.colors.primary }],
          { borderBottomColor: currentTheme.colors.border },
        ]}
        onPress={() => {
          triggerLight();
          updateSetting('tmdbLanguagePreference', lang.code);
          setLanguagePickerVisible(false);
          // Refresh preview with new language
          if (selectedShow) {
            fetchExampleLogos(selectedShow);
          }
        }}
      >
        <Text
          style={[
            styles.languageOptionText,
            isSelected && { color: currentTheme.colors.onPrimary },
            !isSelected && { color: currentTheme.colors.text },
          ]}
        >
          {lang.name}
        </Text>
        {isSelected && (
          <MaterialIcons
            name="check"
            size={20}
            color={currentTheme.colors.onPrimary}
          />
        )}
      </TouchableOpacity>
    );
  };

  const availableLanguages = [
    { name: 'English', code: 'en' },
    { name: 'Spanish', code: 'es' },
    { name: 'French', code: 'fr' },
    { name: 'German', code: 'de' },
    { name: 'Italian', code: 'it' },
    { name: 'Portuguese', code: 'pt' },
    { name: 'Russian', code: 'ru' },
    { name: 'Japanese', code: 'ja' },
    { name: 'Chinese (Simplified)', code: 'zh' },
    { name: 'Korean', code: 'ko' },
  ];

  const filteredLanguages = availableLanguages.filter(lang =>
    lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
    lang.code.includes(languageSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <StatusBar barStyle={currentTheme.dark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* API Key Section */}
          <View style={[styles.section, { backgroundColor: currentTheme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
              TMDB API Key
            </Text>

            {/* Current Status */}
            <View style={styles.statusContainer}>
              {useCustomKey && isKeySet ? (
                <View style={styles.statusBadge}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.statusText}>Custom API Key Set</Text>
                </View>
              ) : (
                <View style={styles.statusBadge}>
                  <MaterialIcons name="info" size={16} color={currentTheme.colors.primary} />
                  <Text style={styles.statusText}>Using Built-in API Key</Text>
                </View>
              )}
            </View>

            {/* Toggle Use Custom Key */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <Text style={[styles.settingLabelText, { color: currentTheme.colors.text }]}>
                  Use Custom API Key
                </Text>
                <Text style={[styles.settingDescription, { color: currentTheme.colors.textSecondary }]}>
                  {useCustomKey ? 'Currently using your custom key' : 'Currently using built-in key'}
                </Text>
              </View>
              <CustomSwitch
                value={useCustomKey}
                onValueChange={toggleUseCustomKey}
              />
            </View>

            {/* Test Result */}
            {testResult && (
              <View
                style={[
                  styles.testResultContainer,
                  {
                    backgroundColor: testResult.success
                      ? 'rgba(76, 175, 80, 0.1)'
                      : 'rgba(244, 67, 54, 0.1)',
                    borderColor: testResult.success ? '#4CAF50' : '#F44336',
                  },
                ]}
              >
                <MaterialIcons
                  name={testResult.success ? 'check-circle' : 'error'}
                  size={18}
                  color={testResult.success ? '#4CAF50' : '#F44336'}
                />
                <Text
                  style={[
                    styles.testResultText,
                    { color: testResult.success ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            {/* API Key Input */}
            {useCustomKey && (
              <View style={styles.apiKeyInputContainer}>
                <TextInput
                  ref={apiKeyInputRef}
                  style={[
                    styles.apiKeyInput,
                    {
                      backgroundColor: currentTheme.colors.background,
                      color: currentTheme.colors.text,
                      borderColor: isInputFocused
                        ? currentTheme.colors.primary
                        : currentTheme.colors.border,
                    },
                  ]}
                  placeholder="Enter your TMDB API key"
                  placeholderTextColor={currentTheme.colors.textSecondary}
                  value={apiKey}
                  onChangeText={setApiKey}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  secureTextEntry={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.pasteButton}
                  onPress={pasteFromClipboard}
                  disabled={isLoading}
                >
                  <MaterialIcons
                    name="content-paste"
                    size={20}
                    color={currentTheme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {useCustomKey && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.primaryButton,
                      { backgroundColor: currentTheme.colors.primary },
                    ]}
                    onPress={saveApiKey}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.buttonText}>Save API Key</Text>
                    )}
                  </TouchableOpacity>
                  {isKeySet && (
                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton]}
                      onPress={clearApiKey}
                      disabled={isLoading}
                    >
                      <Text style={[styles.buttonText, { color: currentTheme.colors.primary }]}>
                        Clear API Key
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* Get API Key Link */}
            <TouchableOpacity
              style={styles.linkContainer}
              onPress={openTMDBWebsite}
            >
              <MaterialIcons name="open-in-new" size={16} color={currentTheme.colors.primary} />
              <Text style={[styles.link, { color: currentTheme.colors.primary }]}>
                Get your API key from TMDB
              </Text>
            </TouchableOpacity>
          </View>

          {/* Language Preference Section */}
          <View style={[styles.section, { backgroundColor: currentTheme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
              Logo Language Preference
            </Text>
            <Text style={[styles.sectionDescription, { color: currentTheme.colors.textSecondary }]}>
              Select your preferred language for TMDB logo text
            </Text>

            <TouchableOpacity
              style={[
                styles.languageSelector,
                {
                  backgroundColor: currentTheme.colors.background,
                  borderColor: currentTheme.colors.border,
                },
              ]}
              onPress={() => setLanguagePickerVisible(true)}
            >
              <Text style={[styles.languageSelectorText, { color: currentTheme.colors.text }]}>
                {availableLanguages.find(l => l.code === settings.tmdbLanguagePreference)?.name ||
                  'English'}
              </Text>
              <MaterialIcons
                name="expand-more"
                size={24}
                color={currentTheme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Cache Management Section */}
          <View style={[styles.section, { backgroundColor: currentTheme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
              Cache Management
            </Text>

            <View style={styles.cacheInfoContainer}>
              <View>
                <Text style={[styles.cacheLabel, { color: currentTheme.colors.textSecondary }]}>
                  Cache Size
                </Text>
                <Text style={[styles.cacheSize, { color: currentTheme.colors.text }]}>
                  {cacheSize}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  { borderColor: currentTheme.colors.primary },
                ]}
                onPress={handleClearCache}
              >
                <Text style={[styles.buttonText, { color: currentTheme.colors.primary }]}>
                  Clear Cache
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Logo Preview */}
          {renderPreview()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Picker Modal */}
      <Modal
        visible={languagePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <TouchableWithoutFeedback onPress={() => setLanguagePickerVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: currentTheme.colors.surface },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>
                    Select Language
                  </Text>
                  <TouchableOpacity
                    onPress={() => setLanguagePickerVisible(false)}
                  >
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={currentTheme.colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {/* Search Input */}
                <View
                  style={[
                    styles.searchContainer,
                    { backgroundColor: currentTheme.colors.background },
                  ]}
                >
                  <MaterialIcons
                    name="search"
                    size={20}
                    color={currentTheme.colors.textSecondary}
                  />
                  <TextInput
                    style={[
                      styles.searchInput,
                      { color: currentTheme.colors.text },
                    ]}
                    placeholder="Search languages..."
                    placeholderTextColor={currentTheme.colors.textSecondary}
                    value={languageSearch}
                    onChangeText={setLanguageSearch}
                  />
                </View>

                {/* Language Options */}
                <ScrollView style={styles.languageList}>
                  {filteredLanguages.length > 0 ? (
                    filteredLanguages.map(lang => renderLanguageOption(lang))
                  ) : (
                    <Text
                      style={[
                        styles.noResultsText,
                        { color: currentTheme.colors.textSecondary },
                      ]}
                    >
                      No languages found
                    </Text>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Alert */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingVertical: 16,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  previewDescription: {
    fontSize: 13,
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  settingLabel: {
    flex: 1,
  },
  settingLabelText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  testResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  testResultText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  apiKeyInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 14,
    marginRight: 8,
  },
  pasteButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  link: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  languageSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  languageSelectorText: {
    fontSize: 16,
  },
  cacheInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cacheLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  cacheSize: {
    fontSize: 18,
    fontWeight: '600',
  },
  previewSection: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  showSelectorContainer: {
    marginBottom: 16,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  showButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 8,
  },
  selectedShowButton: {
    borderWidth: 0,
  },
  showButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 100,
  },
  fallbackText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  noLogoText: {
    fontSize: 14,
  },
  bannerContainer: {
    marginBottom: 16,
  },
  bannerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  banner: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 0,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  languageList: {
    maxHeight: 300,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderRadius: 4,
  },
  selectedLanguageOption: {
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  languageOptionText: {
    fontSize: 16,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default TMDBSettingsScreen;