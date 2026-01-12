import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Button,
  Linking,
  Clipboard,
} from 'react-native';
import { mmkvStorage } from '../services/mmkvStorage';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';
import FastImage from '@d11/react-native-fast-image';
import LottieView from 'lottie-react-native';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useSettings, DEFAULT_SETTINGS } from '../hooks/useSettings';
import { RootStackParamList } from '../navigation/AppNavigator';
import { stremioService } from '../services/stremioService';
import { useCatalogContext } from '../contexts/CatalogContext';
import { useTraktContext } from '../contexts/TraktContext';
import { useTheme } from '../contexts/ThemeContext';
import { catalogService } from '../services/catalogService';
import { fetchTotalDownloads } from '../services/githubReleaseService';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { getDisplayedAppVersion } from '../utils/version';
import CustomAlert from '../components/CustomAlert';
import ScreenHeader from '../components/common/ScreenHeader';
import PluginIcon from '../components/icons/PluginIcon';
import TraktIcon from '../components/icons/TraktIcon';
import TMDBIcon from '../components/icons/TMDBIcon';
import MDBListIcon from '../components/icons/MDBListIcon';
import { ProfileSwitcherBottomSheet } from '../components/profile/ProfileSwitcherBottomSheet';
import { useProfileContext } from '../contexts/ProfileContext';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// Settings categories for tablet sidebar
const SETTINGS_CATEGORIES = [
  { id: 'account', title: 'Account', icon: 'user' as string },
  { id: 'content', title: 'Content & Discovery', icon: 'compass' as string },
  { id: 'appearance', title: 'Appearance', icon: 'sliders' as string },
  { id: 'integrations', title: 'Integrations', icon: 'layers' as string },
  { id: 'ai', title: 'AI Assistant', icon: 'cpu' as string },
  { id: 'playback', title: 'Playback', icon: 'play-circle' as string },
  { id: 'backup', title: 'Backup & Restore', icon: 'archive' as string },
  { id: 'updates', title: 'Updates', icon: 'refresh-ccw' as string },
  { id: 'about', title: 'About', icon: 'info' as string },
  { id: 'developer', title: 'Developer', icon: 'code' as string },
  { id: 'cache', title: 'Cache', icon: 'database' as string },
];

// Card component with minimalistic style
interface SettingsCardProps {
  children: React.ReactNode;
  title?: string;
  isTablet?: boolean;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ children, title, isTablet = false }) => {
  const { currentTheme } = useTheme();

  return (
    <View style={[styles.cardContainer, isTablet && styles.tabletCardContainer]}>
      {title && (
        <Text
          style={[
            styles.cardTitle,
            { color: currentTheme.colors.mediumEmphasis },
            isTablet && styles.tabletCardTitle,
          ]}
        >
          {title}
        </Text>
      )}
      <View
        style={[
          styles.card,
          {
            backgroundColor: currentTheme.colors.elevation1,
            borderWidth: 1,
            borderColor: currentTheme.colors.elevation2,
          },
          isTablet && styles.tabletCard,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

interface SettingItemProps {
  title: string;
  description?: string;
  icon?: string;
  customIcon?: React.ReactNode;
  renderControl?: () => React.ReactNode;
  isLast?: boolean;
  onPress?: () => void;
  badge?: string | number;
  isTablet?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  icon,
  customIcon,
  renderControl,
  isLast = false,
  onPress,
  badge,
  isTablet = false,
}) => {
  const { currentTheme } = useTheme();

  const handlePress = () => {
    if (onPress) {
      triggerLight();
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={handlePress}
      style={[
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        { borderBottomColor: currentTheme.colors.elevation2 },
        isTablet && styles.tabletSettingItem,
      ]}
    >
      <View
        style={[
          styles.settingIconContainer,
          {
            backgroundColor: currentTheme.colors.primary + '12',
          },
          isTablet && styles.tabletSettingIconContainer,
        ]}
      >
        {customIcon ? (
          customIcon
        ) : (
          <Feather
            name={icon! as any}
            size={isTablet ? 22 : 18}
            color={currentTheme.colors.primary}
          />
        )}
      </View>
      <View style={styles.settingContent}>
        <View style={styles.settingTextContainer}>
          <Text
            style={[
              styles.settingTitle,
              { color: currentTheme.colors.highEmphasis },
              isTablet && styles.tabletSettingTitle,
            ]}
          >
            {title}
          </Text>
          {description && (
            <Text
              style={[
                styles.settingDescription,
                { color: currentTheme.colors.mediumEmphasis },
                isTablet && styles.tabletSettingDescription,
              ]}
              numberOfLines={1}
            >
              {description}
            </Text>
          )}
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: `${currentTheme.colors.primary}20` }]}>
            <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>
              {String(badge)}
            </Text>
          </View>
        )}
      </View>
      {renderControl && <View style={styles.settingControl}>{renderControl()}</View>}
    </TouchableOpacity>
  );
};

// Tablet Sidebar Component
interface SidebarProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  currentTheme: any;
  categories: typeof SETTINGS_CATEGORIES;
  extraTopPadding?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedCategory,
  onCategorySelect,
  currentTheme,
  categories,
  extraTopPadding = 0,
}) => {
  const handleCategorySelect = (categoryId: string) => {
    triggerLight();
    onCategorySelect(categoryId);
  };

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: currentTheme.colors.elevation1,
          borderRightColor: currentTheme.colors.elevation2,
        },
      ]}
    >
      <View
        style={[
          styles.sidebarHeader,
          {
            paddingTop:
              (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 48) +
              extraTopPadding,
            borderBottomColor: currentTheme.colors.elevation2,
          },
        ]}
      >
        <Text style={[styles.sidebarTitle, { color: currentTheme.colors.highEmphasis }]}>
          Settings
        </Text>
      </View>

      <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.sidebarItem,
              selectedCategory === category.id && [
                styles.sidebarItemActive,
                { backgroundColor: currentTheme.colors.primary + '10' },
              ],
            ]}
            onPress={() => handleCategorySelect(category.id)}
            activeOpacity={0.6}
          >
            <View
              style={[
                styles.sidebarItemIconContainer,
                {
                  backgroundColor:
                    selectedCategory === category.id
                      ? currentTheme.colors.primary + '15'
                      : 'transparent',
                },
              ]}
            >
              <Feather
                name={category.icon as any}
                size={20}
                color={
                  selectedCategory === category.id
                    ? currentTheme.colors.primary
                    : currentTheme.colors.mediumEmphasis
                }
              />
            </View>
            <Text
              style={[
                styles.sidebarItemText,
                {
                  color:
                    selectedCategory === category.id
                      ? currentTheme.colors.highEmphasis
                      : currentTheme.colors.mediumEmphasis,
                  fontWeight: selectedCategory === category.id ? '600' : '500',
                },
              ]}
            >
              {category.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const SettingsScreen: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const [hasUpdateBadge, setHasUpdateBadge] = useState(false);
  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<
    Array<{ label: string; onPress: () => void; style?: object }>
  >([]);

  const openAlert = (
    title: string,
    message: string,
    actions?: Array<{ label: string; onPress: () => void; style?: object }>
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertActions(actions && actions.length > 0 ? actions : [{ label: 'OK', onPress: () => {} }]);
    setAlertVisible(true);
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let mounted = true;
    (async () => {
      try {
        const flag = await mmkvStorage.getItem('@update_badge_pending');
        if (mounted) setHasUpdateBadge(flag === 'true');
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { lastUpdate } = useCatalogContext();
  const { isAuthenticated, userProfile, refreshAuthStatus } = useTraktContext();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeProfile, profiles } = useProfileContext();

  // Tablet-specific state
  const [selectedCategory, setSelectedCategory] = useState('account');

  // Profile switcher state
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  // States for dynamic content
  const [addonCount, setAddonCount] = useState<number>(0);
  const [catalogCount, setCatalogCount] = useState<number>(0);
  const [mdblistKeySet, setMdblistKeySet] = useState<boolean>(false);
  const [openRouterKeySet, setOpenRouterKeySet] = useState<boolean>(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [totalDownloads, setTotalDownloads] = useState<number | null>(null);
  const [displayDownloads, setDisplayDownloads] = useState<number | null>(null);
  const [isCountingUp, setIsCountingUp] = useState<boolean>(false);

  // Add a useEffect to check Trakt authentication status on focus
  useEffect(() => {
    // This will reload the Trakt auth status whenever the settings screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      // Force a re-render when returning to this screen
      // This will reflect the updated isAuthenticated state from the TraktContext
      // Refresh auth status
      if (isAuthenticated || userProfile) {
        // Just to be cautious, log the current state
        if (__DEV__)
          console.log('SettingsScreen focused, refreshing auth status. Current state:', {
            isAuthenticated,
            userProfile: userProfile?.username,
          });
      }
      refreshAuthStatus();
    });

    return unsubscribe;
  }, [navigation, isAuthenticated, userProfile, refreshAuthStatus]);

  const loadData = useCallback(async () => {
    try {
      // Load addon count and get their catalogs
      const addons = await stremioService.getInstalledAddonsAsync();
      setAddonCount(addons.length);
      setInitialLoadComplete(true);

      // Count total available catalogs
      let totalCatalogs = 0;
      addons.forEach(addon => {
        if (addon.catalogs && addon.catalogs.length > 0) {
          totalCatalogs += addon.catalogs.length;
        }
      });

      // Load saved catalog settings
      const catalogSettingsJson = await mmkvStorage.getItem('catalog_settings');
      if (catalogSettingsJson) {
        const catalogSettings = JSON.parse(catalogSettingsJson);
        // Filter out _lastUpdate key and count only explicitly disabled catalogs
        const disabledCount = Object.entries(catalogSettings).filter(
          ([key, value]) => key !== '_lastUpdate' && value === false
        ).length;
        // Since catalogs are enabled by default, subtract disabled ones from total
        setCatalogCount(totalCatalogs - disabledCount);
      } else {
        // If no settings saved, all catalogs are enabled by default
        setCatalogCount(totalCatalogs);
      }

      // Check MDBList API key status
      const mdblistKey = await mmkvStorage.getItem('mdblist_api_key');
      setMdblistKeySet(!!mdblistKey);

      // Check OpenRouter API key status
      const openRouterKey = await mmkvStorage.getItem('openrouter_api_key');
      setOpenRouterKeySet(!!openRouterKey);

      // Load GitHub total downloads (initial load only, polling happens in useEffect)
      const downloads = await fetchTotalDownloads();
      if (downloads !== null) {
        setTotalDownloads(downloads);
        setDisplayDownloads(downloads);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading settings data:', error);
    }
  }, []);

  // Load data initially and when catalogs are updated
  useEffect(() => {
    loadData();
  }, [loadData, lastUpdate]);

  // Add focus listener to reload data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation, loadData]);

  // Poll GitHub downloads every 10 seconds when on the About section
  useEffect(() => {
    // Only poll when viewing the About section (where downloads counter is shown)
    const shouldPoll = isTablet ? selectedCategory === 'about' : true;

    if (!shouldPoll) return;

    const pollInterval = setInterval(async () => {
      try {
        const downloads = await fetchTotalDownloads();
        if (downloads !== null && downloads !== totalDownloads) {
          setTotalDownloads(downloads);
        }
      } catch (error) {
        if (__DEV__) console.error('Error polling downloads:', error);
      }
    }, 3600000); // 3600000 milliseconds (1 hour)

    return () => clearInterval(pollInterval);
  }, [selectedCategory, isTablet, totalDownloads]);

  // Animate the downloads number
  useEffect(() => {
    if (!displayDownloads || !totalDownloads || displayDownloads === totalDownloads) {
      setIsCountingUp(false);
      return;
    }

    setIsCountingUp(true);
    const difference = totalDownloads - displayDownloads;
    const stepSize = Math.max(1, Math.ceil(difference / 30)); // 30 steps over the animation
    const stepDuration = 20; // milliseconds per step

    const interval = setInterval(() => {
      setDisplayDownloads(prev => {
        if (!prev) return prev;
        const newValue = prev + stepSize;
        if (newValue >= totalDownloads) {
          clearInterval(interval);
          setIsCountingUp(false);
          return totalDownloads;
        }
        return newValue;
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, [totalDownloads]);

  const renderSettingsContent = () => {
    // Account Section
    if (selectedCategory === 'account' || !isTablet) {
      if (isTablet && selectedCategory !== 'account') return null;

      return (
        <ScrollView key="account" showsVerticalScrollIndicator={false}>
          <SettingsCard title="Trakt" isTablet={isTablet}>
            <SettingItem
              title={isAuthenticated && userProfile ? userProfile.username : 'Not Connected'}
              description={
                isAuthenticated
                  ? userProfile?.username
                    ? `ID: ${userProfile.id}`
                    : 'Connected'
                  : 'Connect to Trakt to sync'
              }
              customIcon={<TraktIcon size={24} />}
              onPress={() => {
                if (isAuthenticated) {
                  openAlert(
                    'Disconnect Trakt?',
                    'Are you sure you want to disconnect your Trakt account?',
                    [
                      {
                        label: 'Cancel',
                        onPress: () => {},
                        style: { color: currentTheme.colors.primary },
                      },
                      {
                        label: 'Disconnect',
                        onPress: () => {
                          updateSetting('traktApiKey', '');
                          updateSetting('traktRefreshToken', '');
                        },
                        style: { color: currentTheme.colors.notification },
                      },
                    ]
                  );
                } else {
                  navigation.navigate('AuthScreen', { provider: 'trakt' });
                }
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>

          <SettingsCard title="Profiles" isTablet={isTablet}>
            <SettingItem
              title={activeProfile?.name || 'Default'}
              description={`${profiles.length} profile${profiles.length !== 1 ? 's' : ''} available`}
              icon="users"
              onPress={() => setShowProfileSwitcher(true)}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // Content & Discovery Section
    if (selectedCategory === 'content') {
      return (
        <ScrollView key="content" showsVerticalScrollIndicator={false}>
          <SettingsCard title="Add-ons" isTablet={isTablet}>
            <SettingItem
              title="Installed Add-ons"
              description={
                initialLoadComplete
                  ? `${addonCount} add-on${addonCount !== 1 ? 's' : ''} installed`
                  : 'Loading...'
              }
              icon="package"
              onPress={() => {
                navigation.navigate('AddonStoreScreen');
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>

          <SettingsCard title="Catalogs" isTablet={isTablet}>
            <SettingItem
              title="Browse & Manage"
              description={
                initialLoadComplete
                  ? `${catalogCount} enabled`
                  : 'Loading...'
              }
              icon="grid"
              onPress={() => {
                navigation.navigate('CatalogScreen');
              }}
              badge={addonCount > 0 ? addonCount : undefined}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>

          <SettingsCard title="Search & Discovery" isTablet={isTablet}>
            <SettingItem
              title="Trakt Lists"
              description={isAuthenticated ? 'Connected' : 'Not connected'}
              icon="bookmark"
              onPress={() => navigation.navigate('SearchScreen')}
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Search Providers"
              description="Configure search sources"
              icon="search"
              onPress={() => {}}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // Appearance Section
    if (selectedCategory === 'appearance') {
      return (
        <ScrollView key="appearance" showsVerticalScrollIndicator={false}>
          <SettingsCard title="Theme" isTablet={isTablet}>
            <SettingItem
              title="Theme Mode"
              description={
                settings.themeMode === 'auto'
                  ? 'System'
                  : settings.themeMode === 'light'
                    ? 'Light'
                    : 'Dark'
              }
              icon="sun"
              renderControl={() => (
                <Picker
                  selectedValue={settings.themeMode || 'auto'}
                  style={{ width: 120, height: 50 }}
                  onValueChange={value => {
                    updateSetting('themeMode', value);
                  }}
                >
                  <Picker.Item label="System" value="auto" />
                  <Picker.Item label="Light" value="light" />
                  <Picker.Item label="Dark" value="dark" />
                </Picker>
              )}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>

          <SettingsCard title="Display" isTablet={isTablet}>
            <SettingItem
              title="Compact Mode"
              description="Show less content per screen"
              icon="minimize-2"
              renderControl={() => (
                <Switch
                  value={settings.compactMode || false}
                  onValueChange={value => updateSetting('compactMode', value)}
                />
              )}
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Show Images"
              description="Display poster and banner images"
              icon="image"
              renderControl={() => (
                <Switch
                  value={settings.showImages !== false}
                  onValueChange={value => updateSetting('showImages', value)}
                />
              )}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // Integrations Section
    if (selectedCategory === 'integrations') {
      return (
        <ScrollView key="integrations" showsVerticalScrollIndicator={false}>
          <SettingsCard title="TMDB" isTablet={isTablet}>
            <SettingItem
              title="API Key"
              description={settings.tmdbApiKey ? 'Connected' : 'Not configured'}
              customIcon={<TMDBIcon size={24} />}
              onPress={() => {
                navigation.navigate('SettingDetailScreen', {
                  setting: 'tmdb',
                  title: 'TMDB Configuration',
                });
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>

          <SettingsCard title="MDBList" isTablet={isTablet}>
            <SettingItem
              title="API Key"
              description={mdblistKeySet ? 'Connected' : 'Not configured'}
              customIcon={<MDBListIcon size={24} />}
              onPress={() => {
                navigation.navigate('SettingDetailScreen', {
                  setting: 'mdblist',
                  title: 'MDBList Configuration',
                });
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>

          <SettingsCard title="OpenRouter" isTablet={isTablet}>
            <SettingItem
              title="API Key"
              description={openRouterKeySet ? 'Connected' : 'Not configured'}
              icon="key"
              onPress={() => {
                navigation.navigate('SettingDetailScreen', {
                  setting: 'openrouter',
                  title: 'OpenRouter Configuration',
                });
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // AI Assistant Section
    if (selectedCategory === 'ai') {
      return (
        <ScrollView key="ai" showsVerticalScrollIndicator={false}>
          <SettingsCard title="AI Assistant" isTablet={isTablet}>
            <SettingItem
              title="Enable AI Assistant"
              description="Get personalized recommendations"
              icon="zap"
              renderControl={() => (
                <Switch
                  value={settings.aiAssistantEnabled !== false}
                  onValueChange={value => updateSetting('aiAssistantEnabled', value)}
                />
              )}
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Provider"
              description={settings.aiProvider || 'Not configured'}
              icon="cpu"
              onPress={() => {
                navigation.navigate('SettingDetailScreen', {
                  setting: 'ai',
                  title: 'AI Provider',
                });
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // Playback Section
    if (selectedCategory === 'playback') {
      return (
        <ScrollView key="playback" showsVerticalScrollIndicator={false}>
          <SettingsCard title="Playback" isTablet={isTablet}>
            <SettingItem
              title="Default Player"
              description={settings.defaultPlayer || 'System Default'}
              icon="play-circle"
              onPress={() => {}}
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Resume Playback"
              description="Continue where you left off"
              icon="bookmark"
              renderControl={() => (
                <Switch
                  value={settings.resumePlayback !== false}
                  onValueChange={value => updateSetting('resumePlayback', value)}
                />
              )}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // Backup & Restore Section
    if (selectedCategory === 'backup') {
      return (
        <ScrollView key="backup" showsVerticalScrollIndicator={false}>
          <SettingsCard title="Backup & Restore" isTablet={isTablet}>
            <SettingItem
              title="Backup Settings"
              description="Export your configuration"
              icon="download"
              onPress={() => {
                openAlert(
                  'Backup Settings',
                  'This feature is coming soon. You will be able to export your settings as a file.'
                );
              }}
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Restore Settings"
              description="Import configuration file"
              icon="upload"
              onPress={() => {
                openAlert(
                  'Restore Settings',
                  'This feature is coming soon. You will be able to import settings from a file.'
                );
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // Updates Section
    if (selectedCategory === 'updates') {
      return (
        <ScrollView key="updates" showsVerticalScrollIndicator={false}>
          <SettingsCard title="Check for Updates" isTablet={isTablet}>
            <SettingItem
              title="Current Version"
              description={getDisplayedAppVersion()}
              icon="info"
              onPress={() => {
                openAlert(
                  'Check for Updates',
                  'You are using the latest version of the app.',
                  [{ label: 'OK', onPress: () => {} }]
                );
              }}
              badge={hasUpdateBadge ? 'New' : undefined}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // About Section
    if (selectedCategory === 'about') {
      return (
        <ScrollView key="about" showsVerticalScrollIndicator={false}>
          <SettingsCard title="About" isTablet={isTablet}>
            <SettingItem
              title="Downloads"
              description={
                displayDownloads !== null
                  ? displayDownloads.toLocaleString('en-US')
                  : 'Loading...'
              }
              icon="download"
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Report Issue"
              description="GitHub Issues"
              icon="alert-circle"
              onPress={() => {
                Linking.openURL('https://github.com/Safar-Gu/Kinema/issues');
              }}
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Website"
              description="Learn more"
              icon="globe"
              onPress={() => {
                Linking.openURL('https://kinema.watch');
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>

          <SettingsCard title="Legal" isTablet={isTablet}>
            <SettingItem
              title="Privacy Policy"
              description="How we use your data"
              icon="shield"
              onPress={() => {
                WebBrowser.openBrowserAsync('https://kinema.watch/privacy');
              }}
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Terms of Service"
              description="Our terms"
              icon="file-text"
              onPress={() => {
                WebBrowser.openBrowserAsync('https://kinema.watch/terms');
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // Developer Section
    if (selectedCategory === 'developer') {
      return (
        <ScrollView key="developer" showsVerticalScrollIndicator={false}>
          <SettingsCard title="Developer Options" isTablet={isTablet}>
            <SettingItem
              title="Debug Logging"
              description="Enable detailed logs"
              icon="code"
              renderControl={() => (
                <Switch
                  value={settings.debugLogging || false}
                  onValueChange={value => updateSetting('debugLogging', value)}
                />
              )}
              isLast={false}
              isTablet={isTablet}
            />
            <SettingItem
              title="Clear Cache"
              description="Free up storage"
              icon="trash-2"
              onPress={() => {
                openAlert(
                  'Clear Cache?',
                  'This will delete cached data but keep your settings.',
                  [
                    {
                      label: 'Cancel',
                      onPress: () => {},
                      style: { color: currentTheme.colors.primary },
                    },
                    {
                      label: 'Clear',
                      onPress: () => {
                        catalogService.clearCache();
                      },
                      style: { color: currentTheme.colors.notification },
                    },
                  ]
                );
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>

          <SettingsCard title="Advanced" isTablet={isTablet}>
            <SettingItem
              title="API Base URL"
              description={settings.apiBaseUrl || 'Default'}
              icon="server"
              onPress={() => {
                navigation.navigate('SettingDetailScreen', {
                  setting: 'apiBaseUrl',
                  title: 'API Base URL',
                });
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    // Cache Section
    if (selectedCategory === 'cache') {
      return (
        <ScrollView key="cache" showsVerticalScrollIndicator={false}>
          <SettingsCard title="Cache Management" isTablet={isTablet}>
            <SettingItem
              title="Clear All Cache"
              description="Remove all cached data"
              icon="trash-2"
              onPress={() => {
                openAlert(
                  'Clear All Cache?',
                  'This will delete all cached data including images, metadata, and search results.',
                  [
                    {
                      label: 'Cancel',
                      onPress: () => {},
                      style: { color: currentTheme.colors.primary },
                    },
                    {
                      label: 'Clear',
                      onPress: () => {
                        catalogService.clearCache();
                        setDisplayDownloads(totalDownloads);
                      },
                      style: { color: currentTheme.colors.notification },
                    },
                  ]
                );
              }}
              isLast={true}
              isTablet={isTablet}
            />
          </SettingsCard>
        </ScrollView>
      );
    }

    return null;
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: currentTheme.colors.background,
          paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT : 0,
        },
      ]}
    >
      <StatusBar barStyle={currentTheme.dark ? 'light-content' : 'dark-content'} />

      {isTablet ? (
        <View style={styles.tabletContainer}>
          <Sidebar
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            currentTheme={currentTheme}
            categories={SETTINGS_CATEGORIES}
            extraTopPadding={0}
          />
          <View style={styles.tabletContent}>{renderSettingsContent()}</View>
        </View>
      ) : (
        <View style={styles.mobileContainer}>
          <ScreenHeader
            title="Settings"
            showBackButton={false}
            rightAction={() => {
              setShowProfileSwitcher(true);
            }}
            rightIcon="users"
          />
          {renderSettingsContent()}
        </View>
      )}

      <ProfileSwitcherBottomSheet
        visible={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
      />

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileContainer: {
    flex: 1,
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    paddingHorizontal: 0,
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sidebarTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sidebarContent: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  sidebarItemActive: {
    borderRadius: 8,
  },
  sidebarItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sidebarItemText: {
    fontSize: 15,
    flex: 1,
  },
  tabletContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  mobileContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardContainer: {
    marginBottom: 16,
  },
  tabletCardContainer: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tabletCardTitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabletCard: {
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tabletSettingItem: {
    paddingVertical: 20,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tabletSettingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 16,
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
  },
  tabletSettingTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  tabletSettingDescription: {
    fontSize: 14,
    marginTop: 6,
  },
  settingControl: {
    marginLeft: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SettingsScreen;