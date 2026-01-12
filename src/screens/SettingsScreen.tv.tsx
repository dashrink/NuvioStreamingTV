/**
 * SettingsScreen.tv.tsx
 *
 * TV-specific settings screen with complete D-pad navigation support.
 *
 * Features:
 * - All settings items are focusable via D-pad navigation
 * - Toggle switches work with the select button
 * - Focus memory persists when navigating between screens
 * - Back button returns to previous screen
 * - Vertical navigation through settings categories
 * - Tablet sidebar is fully navigable on TV
 *
 * This file is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 */

import FastImage from '@d11/react-native-fast-image';
import { Feather } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import * as WebBrowser from 'expo-web-browser';
import LottieView from 'lottie-react-native';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Linking,
  FlatList,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalogContext } from '../contexts/CatalogContext';
import { useSettings, DEFAULT_SETTINGS } from '../hooks/useSettings';
import { mmkvStorage } from '../services/mmkvStorage';

import { RootStackParamList } from '../navigation/AppNavigator';
import { stremioService } from '../services/stremioService';
import { useTraktContext } from '../contexts/TraktContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchTotalDownloads } from '../services/githubReleaseService';


import { getDisplayedAppVersion } from '../utils/version';
import CustomAlert from '../components/CustomAlert';
import ScreenHeader from '../components/common/ScreenHeader';
import PluginIcon from '../components/icons/PluginIcon';
import TraktIcon from '../components/icons/TraktIcon';
import TMDBIcon from '../components/icons/TMDBIcon';
import MDBListIcon from '../components/icons/MDBListIcon';
import Focusable from '../components/common/Focusable';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { useTVNavigationOptional } from '../contexts/TVNavigationContext';

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

// TV-specific Card component with focusable wrapper
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

// TV-specific focusable setting item
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
  focusId: string;
  hasTVPreferredFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
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
  focusId,
  hasTVPreferredFocus = false,
  onFocus,
  onBlur,
  isToggle = false,
  toggleValue = false,
  onToggleChange,
}) => {
  const { currentTheme } = useTheme();

  // Handle select button for toggles
  const handlePress = useCallback(() => {
    if (isToggle && onToggleChange) {
      onToggleChange(!toggleValue);
    } else if (onPress) {
      onPress();
    }
  }, [isToggle, onToggleChange, toggleValue, onPress]);

  return (
    <Focusable
      onPress={handlePress}
      onFocus={onFocus}
      onBlur={onBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        { borderBottomColor: currentTheme.colors.elevation2 },
        isTablet && styles.tabletSettingItem,
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
      accessibilityHint={description || (isToggle ? 'Press to toggle' : 'Press to open')}
    >
      <View style={styles.settingItemContent}>
        <View
          style={[
            styles.settingIconContainer,
            {
              backgroundColor: `${currentTheme.colors.primary}12`,
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
      </View>
    </Focusable>
  );
};

// TV-specific Sidebar Component
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
  const tvNavigation = useTVNavigationOptional();

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
        {categories.map((category, index) => (
          <Focusable
            key={category.id}
            onPress={() => onCategorySelect(category.id)}
            onFocus={() => {
              if (tvNavigation) {
                tvNavigation.setCurrentFocusId(`sidebar-${category.id}`);
              }
            }}
            hasTVPreferredFocus={index === 0}
            style={[
              styles.sidebarItem,
              selectedCategory === category.id && [
                styles.sidebarItemActive,
                { backgroundColor: `${currentTheme.colors.primary}10` },
              ],
            ]}
            animationConfig={{
              focusScale: 1.02,
              unfocusedOpacity: 0.8,
              showFocusBorder: true,
              focusBorderColor: currentTheme.colors.primary,
              focusBorderWidth: 2,
            }}
            accessibilityLabel={category.title}
          >
            <View
              style={[
                styles.sidebarItemIconContainer,
                {
                  backgroundColor:
                    selectedCategory === category.id
                      ? `${currentTheme.colors.primary}15`
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
          </Focusable>
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

  // Spatial navigation for TV
  const spatialNav = useSpatialNavigation('SettingsScreen', {
    autoRestoreFocus: true,
    defaultFocusId: isTablet ? 'sidebar-account' : 'setting-trakt',
  });

  const tvNavigation = useTVNavigationOptional();

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

  // Tablet-specific state
  const [selectedCategory, setSelectedCategory] = useState('account');

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
    const unsubscribe = navigation.addListener('focus', () => {
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
        const disabledCount = Object.entries(catalogSettings).filter(
          ([key, value]) => key !== '_lastUpdate' && value === false
        ).length;
        setCatalogCount(totalCatalogs - disabledCount);
      } else {
        setCatalogCount(totalCatalogs);
      }

      // Check MDBList API key status
      const mdblistKey = await mmkvStorage.getItem('mdblist_api_key');
      setMdblistKeySet(!!mdblistKey);

      // Check OpenRouter API key status
      const openRouterKey = await mmkvStorage.getItem('openrouter_api_key');
      setOpenRouterKeySet(!!openRouterKey);

      // Load GitHub total downloads
      const downloads = await fetchTotalDownloads();
      if (downloads !== null) {
        setTotalDownloads(downloads);
        setDisplayDownloads(downloads);
      }
    } catch (error) {
      // Handle error silently
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, lastUpdate]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation, loadData]);

  useEffect(() => {
    const shouldPoll = isTablet ? selectedCategory === 'about' : true;

    if (!shouldPoll) return;

    const pollInterval = setInterval(async () => {
      try {
        const downloads = await fetchTotalDownloads();
        if (downloads !== null && downloads !== totalDownloads) {
          setTotalDownloads(downloads);
        }
      } catch (error) {
        // Handle error silently
      }
    }, 3600000);

    return () => clearInterval(pollInterval);
  }, [selectedCategory, isTablet, totalDownloads]);

  useEffect(() => {
    if (totalDownloads === null || displayDownloads === null) return;
    if (totalDownloads === displayDownloads) return;

    setIsCountingUp(true);
    const start = displayDownloads;
    const end = totalDownloads;
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = 1 - Math.pow(1 - progress, 2);
      const current = Math.floor(start + (end - start) * easeProgress);

      setDisplayDownloads(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayDownloads(end);
        setIsCountingUp(false);
      }
    };

    requestAnimationFrame(animate);
  }, [totalDownloads]);

  const handleResetSettings = useCallback(() => {
    openAlert('Reset Settings', 'Are you sure you want to reset all settings to default values?', [
      { label: 'Cancel', onPress: () => {} },
      {
        label: 'Reset',
        onPress: () => {
          (Object.keys(DEFAULT_SETTINGS) as Array<keyof typeof DEFAULT_SETTINGS>).forEach(key => {
            updateSetting(key, DEFAULT_SETTINGS[key]);
          });
        },
      },
    ]);
  }, [updateSetting]);

  const handleClearMDBListCache = () => {
    openAlert(
      'Clear MDBList Cache',
      'Are you sure you want to clear all cached MDBList data? This cannot be undone.',
      [
        { label: 'Cancel', onPress: () => {} },
        {
          label: 'Clear',
          onPress: async () => {
            try {
              await mmkvStorage.removeItem('mdblist_cache');
              openAlert('Success', 'MDBList cache has been cleared.');
            } catch (error) {
              openAlert('Error', 'Could not clear MDBList cache.');
            }
          },
        },
      ]
    );
  };

  const CustomSwitch = ({
    value,
    onValueChange,
  }: {
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: currentTheme.colors.elevation2, true: currentTheme.colors.primary }}
      thumbColor={value ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis}
      ios_backgroundColor={currentTheme.colors.elevation2}
    />
  );

  const ChevronRight = () => (
    <Feather
      name="chevron-right"
      size={isTablet ? 24 : 20}
      color={currentTheme.colors.mediumEmphasis}
    />
  );

  // Filter categories based on conditions
  const visibleCategories = SETTINGS_CATEGORIES.filter(category => {
    if (category.id === 'developer' && !__DEV__) return false;
    if (category.id === 'cache' && !mdblistKeySet) return false;
    return true;
  });

  // Track focus for each setting item
  const handleSettingFocus = useCallback(
    (focusId: string) => {
      spatialNav.saveFocus(focusId);
      if (tvNavigation) {
        tvNavigation.setCurrentFocusId(focusId);
      }
    },
    [spatialNav, tvNavigation]
  );

  const renderCategoryContent = (categoryId: string) => {
    switch (categoryId) {
      case 'account':
        return (
          <SettingsCard title="ACCOUNT" isTablet={isTablet}>
            <SettingItem
              title="Trakt"
              description={
                isAuthenticated ? `@${userProfile?.username || 'User'}` : 'Sign in to sync'
              }
              customIcon={
                <TraktIcon size={isTablet ? 24 : 20} color={currentTheme.colors.primary} />
              }
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('TraktSettings')}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-trakt"
              hasTVPreferredFocus={!isTablet}
              onFocus={() => handleSettingFocus('setting-trakt')}
            />
          </SettingsCard>
        );

      case 'content':
        return (
          <SettingsCard title="CONTENT & DISCOVERY" isTablet={isTablet}>
            <SettingItem
              title="Addons"
              description={`${addonCount} installed`}
              icon="layers"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('Addons')}
              isTablet={isTablet}
              focusId="setting-addons"
              onFocus={() => handleSettingFocus('setting-addons')}
            />
            <SettingItem
              title="Debrid Integration"
              description="Connect Torbox for premium streams"
              icon="link"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('DebridIntegration')}
              isTablet={isTablet}
              focusId="setting-debrid"
              onFocus={() => handleSettingFocus('setting-debrid')}
            />
            <SettingItem
              title="Plugins"
              description="Manage plugins and repositories"
              customIcon={
                <PluginIcon size={isTablet ? 24 : 20} color={currentTheme.colors.primary} />
              }
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('ScraperSettings')}
              isTablet={isTablet}
              focusId="setting-plugins"
              onFocus={() => handleSettingFocus('setting-plugins')}
            />
            <SettingItem
              title="Catalogs"
              description={`${catalogCount} active`}
              icon="list"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('CatalogSettings')}
              isTablet={isTablet}
              focusId="setting-catalogs"
              onFocus={() => handleSettingFocus('setting-catalogs')}
            />
            <SettingItem
              title="Home Screen"
              description="Layout and content"
              icon="home"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('HomeScreenSettings')}
              isTablet={isTablet}
              focusId="setting-homescreen"
              onFocus={() => handleSettingFocus('setting-homescreen')}
            />
            <SettingItem
              title="Continue Watching"
              description="Cache and playback behavior"
              icon="play-circle"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('ContinueWatchingSettings')}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-continuewatching"
              onFocus={() => handleSettingFocus('setting-continuewatching')}
            />
          </SettingsCard>
        );

      case 'appearance':
        return (
          <SettingsCard title="APPEARANCE" isTablet={isTablet}>
            <SettingItem
              title="Theme"
              description={currentTheme.name}
              icon="sliders"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('ThemeSettings')}
              isTablet={isTablet}
              focusId="setting-theme"
              onFocus={() => handleSettingFocus('setting-theme')}
            />
            <SettingItem
              title="Episode Layout"
              description={
                settings?.episodeLayoutStyle === 'horizontal' ? 'Horizontal' : 'Vertical'
              }
              icon="grid"
              isToggle={true}
              toggleValue={settings?.episodeLayoutStyle === 'horizontal'}
              onToggleChange={value =>
                updateSetting('episodeLayoutStyle', value ? 'horizontal' : 'vertical')
              }
              renderControl={() => (
                <CustomSwitch
                  value={settings?.episodeLayoutStyle === 'horizontal'}
                  onValueChange={value =>
                    updateSetting('episodeLayoutStyle', value ? 'horizontal' : 'vertical')
                  }
                />
              )}
              isLast={isTablet}
              isTablet={isTablet}
              focusId="setting-episode-layout"
              onFocus={() => handleSettingFocus('setting-episode-layout')}
            />
            {!isTablet && (
              <SettingItem
                title="Streams Backdrop"
                description="Show blurred backdrop on mobile streams"
                icon="image"
                isToggle={true}
                toggleValue={settings?.enableStreamsBackdrop ?? true}
                onToggleChange={value => updateSetting('enableStreamsBackdrop', value)}
                renderControl={() => (
                  <CustomSwitch
                    value={settings?.enableStreamsBackdrop ?? true}
                    onValueChange={value => updateSetting('enableStreamsBackdrop', value)}
                  />
                )}
                isLast={true}
                isTablet={isTablet}
                focusId="setting-streams-backdrop"
                onFocus={() => handleSettingFocus('setting-streams-backdrop')}
              />
            )}
          </SettingsCard>
        );

      case 'integrations':
        return (
          <SettingsCard title="INTEGRATIONS" isTablet={isTablet}>
            <SettingItem
              title="MDBList"
              description={mdblistKeySet ? 'Connected' : 'Enable to add ratings & reviews'}
              customIcon={
                <MDBListIcon
                  size={isTablet ? 24 : 20}
                  colorPrimary={currentTheme.colors.primary}
                  colorSecondary={currentTheme.colors.white}
                />
              }
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('MDBListSettings')}
              isTablet={isTablet}
              focusId="setting-mdblist"
              onFocus={() => handleSettingFocus('setting-mdblist')}
            />
            <SettingItem
              title="TMDB"
              description="Metadata & logo source provider"
              customIcon={
                <TMDBIcon size={isTablet ? 24 : 20} color={currentTheme.colors.primary} />
              }
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('TMDBSettings')}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-tmdb"
              onFocus={() => handleSettingFocus('setting-tmdb')}
            />
          </SettingsCard>
        );

      case 'ai':
        return (
          <SettingsCard title="AI ASSISTANT" isTablet={isTablet}>
            <SettingItem
              title="OpenRouter API"
              description={openRouterKeySet ? 'Connected' : 'Add your API key to enable AI chat'}
              icon="cpu"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('AISettings')}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-openrouter"
              onFocus={() => handleSettingFocus('setting-openrouter')}
            />
          </SettingsCard>
        );

      case 'playback':
        return (
          <SettingsCard title="PLAYBACK" isTablet={isTablet}>
            <SettingItem
              title="Video Player"
              description={
                Platform.OS === 'ios'
                  ? settings?.preferredPlayer === 'internal'
                    ? 'Built-in'
                    : settings?.preferredPlayer?.toUpperCase() || 'Built-in'
                  : settings?.useExternalPlayer
                    ? 'External'
                    : 'Built-in'
              }
              icon="play-circle"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('PlayerSettings')}
              isTablet={isTablet}
              focusId="setting-player"
              onFocus={() => handleSettingFocus('setting-player')}
            />
            <SettingItem
              title="Show Trailers"
              description="Display trailers in hero section"
              icon="film"
              isToggle={true}
              toggleValue={settings?.showTrailers ?? true}
              onToggleChange={value => updateSetting('showTrailers', value)}
              renderControl={() => (
                <Switch
                  value={settings?.showTrailers ?? true}
                  onValueChange={value => updateSetting('showTrailers', value)}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: currentTheme.colors.primary }}
                  thumbColor={settings?.showTrailers ? '#fff' : '#f4f3f4'}
                />
              )}
              isTablet={isTablet}
              focusId="setting-trailers"
              onFocus={() => handleSettingFocus('setting-trailers')}
            />
            <SettingItem
              title="Enable Downloads (Beta)"
              description="Show Downloads tab and enable saving streams"
              icon="download"
              isToggle={true}
              toggleValue={settings?.enableDownloads ?? false}
              onToggleChange={value => updateSetting('enableDownloads', value)}
              renderControl={() => (
                <Switch
                  value={settings?.enableDownloads ?? false}
                  onValueChange={value => updateSetting('enableDownloads', value)}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: currentTheme.colors.primary }}
                  thumbColor={settings?.enableDownloads ? '#fff' : '#f4f3f4'}
                />
              )}
              isTablet={isTablet}
              focusId="setting-downloads"
              onFocus={() => handleSettingFocus('setting-downloads')}
            />
            <SettingItem
              title="Notifications"
              description="Episode reminders"
              icon="bell"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('NotificationSettings')}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-notifications"
              onFocus={() => handleSettingFocus('setting-notifications')}
            />
          </SettingsCard>
        );

      case 'about':
        return (
          <SettingsCard title="ABOUT" isTablet={isTablet}>
            <SettingItem
              title="Privacy Policy"
              icon="lock"
              onPress={() =>
                Linking.openURL('https://tapframe.github.io/NuvioStreaming/#privacy-policy')
              }
              renderControl={ChevronRight}
              isTablet={isTablet}
              focusId="setting-privacy"
              onFocus={() => handleSettingFocus('setting-privacy')}
            />
            <SettingItem
              title="Report Issue"
              icon="alert-triangle"
              onPress={() => Sentry.showFeedbackWidget()}
              renderControl={ChevronRight}
              isTablet={isTablet}
              focusId="setting-report"
              onFocus={() => handleSettingFocus('setting-report')}
            />
            <SettingItem
              title="Version"
              description={getDisplayedAppVersion()}
              icon="info"
              isTablet={isTablet}
              focusId="setting-version"
              onFocus={() => handleSettingFocus('setting-version')}
            />
            <SettingItem
              title="Contributors"
              description="View all contributors"
              icon="users"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('Contributors')}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-contributors"
              onFocus={() => handleSettingFocus('setting-contributors')}
            />
          </SettingsCard>
        );

      case 'developer':
        return __DEV__ ? (
          <SettingsCard title="DEVELOPER" isTablet={isTablet}>
            <SettingItem
              title="Test Onboarding"
              icon="play-circle"
              onPress={() => navigation.navigate('Onboarding')}
              renderControl={ChevronRight}
              isTablet={isTablet}
              focusId="setting-test-onboarding"
              onFocus={() => handleSettingFocus('setting-test-onboarding')}
            />
            <SettingItem
              title="Reset Onboarding"
              icon="refresh-ccw"
              onPress={async () => {
                try {
                  await mmkvStorage.removeItem('hasCompletedOnboarding');
                  openAlert(
                    'Success',
                    'Onboarding has been reset. Restart the app to see the onboarding flow.'
                  );
                } catch (error) {
                  openAlert('Error', 'Failed to reset onboarding.');
                }
              }}
              renderControl={ChevronRight}
              isTablet={isTablet}
              focusId="setting-reset-onboarding"
              onFocus={() => handleSettingFocus('setting-reset-onboarding')}
            />
            <SettingItem
              title="Test Announcement"
              icon="bell"
              description="Show what's new overlay"
              onPress={async () => {
                try {
                  await mmkvStorage.removeItem('announcement_v1.0.0_shown');
                  openAlert(
                    'Success',
                    'Announcement reset. Restart the app to see the announcement overlay.'
                  );
                } catch (error) {
                  openAlert('Error', 'Failed to reset announcement.');
                }
              }}
              renderControl={ChevronRight}
              isTablet={isTablet}
              focusId="setting-test-announcement"
              onFocus={() => handleSettingFocus('setting-test-announcement')}
            />
            <SettingItem
              title="Clear All Data"
              icon="trash-2"
              onPress={() => {
                openAlert(
                  'Clear All Data',
                  'This will reset all settings and clear all cached data. Are you sure?',
                  [
                    { label: 'Cancel', onPress: () => {} },
                    {
                      label: 'Clear',
                      onPress: async () => {
                        try {
                          await mmkvStorage.clear();
                          openAlert('Success', 'All data cleared. Please restart the app.');
                        } catch (error) {
                          openAlert('Error', 'Failed to clear data.');
                        }
                      },
                    },
                  ]
                );
              }}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-clear-data"
              onFocus={() => handleSettingFocus('setting-clear-data')}
            />
          </SettingsCard>
        ) : null;

      case 'cache':
        return mdblistKeySet ? (
          <SettingsCard title="CACHE MANAGEMENT" isTablet={isTablet}>
            <SettingItem
              title="Clear MDBList Cache"
              icon="database"
              onPress={handleClearMDBListCache}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-clear-mdblist"
              onFocus={() => handleSettingFocus('setting-clear-mdblist')}
            />
          </SettingsCard>
        ) : null;

      case 'backup':
        return (
          <SettingsCard title="BACKUP & RESTORE" isTablet={isTablet}>
            <SettingItem
              title="Backup & Restore"
              description="Create and restore app backups"
              icon="archive"
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('Backup')}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-backup"
              onFocus={() => handleSettingFocus('setting-backup')}
            />
          </SettingsCard>
        );

      case 'updates':
        return (
          <SettingsCard title="UPDATES" isTablet={isTablet}>
            <SettingItem
              title="App Updates"
              description="Check for updates and manage app version"
              icon="refresh-ccw"
              renderControl={ChevronRight}
              badge={Platform.OS === 'android' && hasUpdateBadge ? 1 : undefined}
              onPress={async () => {
                if (Platform.OS === 'android') {
                  try {
                    await mmkvStorage.removeItem('@update_badge_pending');
                  } catch {}
                  setHasUpdateBadge(false);
                }
                navigation.navigate('Update');
              }}
              isLast={true}
              isTablet={isTablet}
              focusId="setting-updates"
              onFocus={() => handleSettingFocus('setting-updates')}
            />
          </SettingsCard>
        );

      default:
        return null;
    }
  };

  // Keep headers below floating top navigator on tablets by adding extra offset
  const tabletNavOffset = isTablet ? 64 : 0;

  if (isTablet) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
        <StatusBar barStyle={'light-content'} />
        <View style={styles.tabletContainer}>
          <Sidebar
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            currentTheme={currentTheme}
            categories={visibleCategories}
            extraTopPadding={tabletNavOffset}
          />

          <View
            style={[
              styles.tabletContent,
              {
                paddingTop:
                  (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 48) +
                  tabletNavOffset,
              },
            ]}
          >
            <ScrollView
              style={styles.tabletScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.tabletScrollContent}
            >
              {renderCategoryContent(selectedCategory)}

              {selectedCategory === 'about' && (
                <>
                  {displayDownloads !== null && (
                    <View style={styles.downloadsContainer}>
                      <Text
                        style={[styles.downloadsNumber, { color: currentTheme.colors.primary }]}
                      >
                        {displayDownloads.toLocaleString()}
                      </Text>
                      <Text
                        style={[
                          styles.downloadsLabel,
                          { color: currentTheme.colors.mediumEmphasis },
                        ]}
                      >
                        downloads and counting
                      </Text>
                    </View>
                  )}

                  <View style={styles.discordContainer}>
                    <Focusable
                      style={[
                        styles.discordButton,
                        {
                          backgroundColor: 'transparent',
                          paddingVertical: 0,
                          paddingHorizontal: 0,
                          marginBottom: 8,
                        },
                      ]}
                      onPress={() =>
                        WebBrowser.openBrowserAsync('https://ko-fi.com/tapframe', {
                          presentationStyle:
                            Platform.OS === 'ios'
                              ? WebBrowser.WebBrowserPresentationStyle.FORM_SHEET
                              : WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
                        })
                      }
                      animationConfig={{
                        focusScale: 1.05,
                        showFocusBorder: true,
                        focusBorderColor: currentTheme.colors.primary,
                        focusBorderWidth: 2,
                      }}
                      focusId="setting-kofi"
                      onFocus={() => handleSettingFocus('setting-kofi')}
                    >
                      <FastImage
                        source={require('../../assets/support_me_on_kofi_red.png')}
                        style={styles.kofiImage}
                        resizeMode={FastImage.resizeMode.contain}
                      />
                    </Focusable>

                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      <Focusable
                        style={[
                          styles.discordButton,
                          { backgroundColor: currentTheme.colors.elevation1 },
                        ]}
                        onPress={() => Linking.openURL('https://discord.gg/6w8dr3TSDN')}
                        animationConfig={{
                          focusScale: 1.05,
                          showFocusBorder: true,
                          focusBorderColor: currentTheme.colors.primary,
                          focusBorderWidth: 2,
                        }}
                        focusId="setting-discord"
                        onFocus={() => handleSettingFocus('setting-discord')}
                      >
                        <View style={styles.discordButtonContent}>
                          <FastImage
                            source={{ uri: 'https://pngimg.com/uploads/discord/discord_PNG3.png' }}
                            style={styles.discordLogo}
                            resizeMode={FastImage.resizeMode.contain}
                          />
                          <Text
                            style={[
                              styles.discordButtonText,
                              { color: currentTheme.colors.highEmphasis },
                            ]}
                          >
                            Discord
                          </Text>
                        </View>
                      </Focusable>

                      <Focusable
                        style={[styles.discordButton, { backgroundColor: '#FF4500' + '15' }]}
                        onPress={() => Linking.openURL('https://www.reddit.com/r/Nuvio/')}
                        animationConfig={{
                          focusScale: 1.05,
                          showFocusBorder: true,
                          focusBorderColor: '#FF4500',
                          focusBorderWidth: 2,
                        }}
                        focusId="setting-reddit"
                        onFocus={() => handleSettingFocus('setting-reddit')}
                      >
                        <View style={styles.discordButtonContent}>
                          <FastImage
                            source={{
                              uri: 'https://www.iconpacks.net/icons/2/free-reddit-logo-icon-2436-thumb.png',
                            }}
                            style={styles.discordLogo}
                            resizeMode={FastImage.resizeMode.contain}
                          />
                          <Text style={[styles.discordButtonText, { color: '#FF4500' }]}>
                            Reddit
                          </Text>
                        </View>
                      </Focusable>
                    </View>
                  </View>

                  {/* Monkey Animation */}
                  <View style={styles.monkeyContainer}>
                    <LottieView
                      source={require('../assets/lottie/monito.json')}
                      autoPlay
                      loop
                      style={styles.monkeyAnimation}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.footer}>
                    <Text
                      style={[styles.footerText, { color: currentTheme.colors.mediumEmphasis }]}
                    >
                      Made with ❤️ by Tapframe and Friends
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
        <CustomAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          actions={alertActions}
          onClose={() => setAlertVisible(false)}
        />
      </View>
    );
  }

  // Mobile Layout
  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
      <StatusBar barStyle={'light-content'} />
      <ScreenHeader title="Settings" />
      <View style={{ flex: 1 }}>
        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderCategoryContent('account')}
            {renderCategoryContent('content')}
            {renderCategoryContent('appearance')}
            {renderCategoryContent('integrations')}
            {renderCategoryContent('ai')}
            {renderCategoryContent('playback')}
            {renderCategoryContent('backup')}
            {renderCategoryContent('updates')}
            {renderCategoryContent('about')}
            {renderCategoryContent('developer')}
            {renderCategoryContent('cache')}

            {displayDownloads !== null && (
              <View style={styles.downloadsContainer}>
                <Text style={[styles.downloadsNumber, { color: currentTheme.colors.primary }]}>
                  {displayDownloads.toLocaleString()}
                </Text>
                <Text
                  style={[styles.downloadsLabel, { color: currentTheme.colors.mediumEmphasis }]}
                >
                  downloads and counting
                </Text>
              </View>
            )}

            {/* Support & Community Buttons */}
            <View style={styles.discordContainer}>
              <Focusable
                style={[
                  styles.discordButton,
                  {
                    backgroundColor: 'transparent',
                    paddingVertical: 0,
                    paddingHorizontal: 0,
                    marginBottom: 8,
                  },
                ]}
                onPress={() =>
                  WebBrowser.openBrowserAsync('https://ko-fi.com/tapframe', {
                    presentationStyle:
                      Platform.OS === 'ios'
                        ? WebBrowser.WebBrowserPresentationStyle.FORM_SHEET
                        : WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
                  })
                }
                animationConfig={{
                  focusScale: 1.05,
                  showFocusBorder: true,
                  focusBorderColor: currentTheme.colors.primary,
                  focusBorderWidth: 2,
                }}
                focusId="setting-kofi"
                onFocus={() => handleSettingFocus('setting-kofi')}
              >
                <FastImage
                  source={require('../../assets/support_me_on_kofi_red.png')}
                  style={styles.kofiImage}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </Focusable>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Focusable
                  style={[
                    styles.discordButton,
                    { backgroundColor: currentTheme.colors.elevation1 },
                  ]}
                  onPress={() => Linking.openURL('https://discord.gg/6w8dr3TSDN')}
                  animationConfig={{
                    focusScale: 1.05,
                    showFocusBorder: true,
                    focusBorderColor: currentTheme.colors.primary,
                    focusBorderWidth: 2,
                  }}
                  focusId="setting-discord"
                  onFocus={() => handleSettingFocus('setting-discord')}
                >
                  <View style={styles.discordButtonContent}>
                    <FastImage
                      source={{ uri: 'https://pngimg.com/uploads/discord/discord_PNG3.png' }}
                      style={styles.discordLogo}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                    <Text
                      style={[
                        styles.discordButtonText,
                        { color: currentTheme.colors.highEmphasis },
                      ]}
                    >
                      Discord
                    </Text>
                  </View>
                </Focusable>

                <Focusable
                  style={[styles.discordButton, { backgroundColor: '#FF4500' + '15' }]}
                  onPress={() => Linking.openURL('https://www.reddit.com/r/Nuvio/')}
                  animationConfig={{
                    focusScale: 1.05,
                    showFocusBorder: true,
                    focusBorderColor: '#FF4500',
                    focusBorderWidth: 2,
                  }}
                  focusId="setting-reddit"
                  onFocus={() => handleSettingFocus('setting-reddit')}
                >
                  <View style={styles.discordButtonContent}>
                    <FastImage
                      source={{
                        uri: 'https://www.iconpacks.net/icons/2/free-reddit-logo-icon-2436-thumb.png',
                      }}
                      style={styles.discordLogo}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                    <Text style={[styles.discordButtonText, { color: '#FF4500' }]}>Reddit</Text>
                  </View>
                </Focusable>
              </View>
            </View>

            {/* Monkey Animation */}
            <View style={styles.monkeyContainer}>
              <LottieView
                source={require('../assets/lottie/monito.json')}
                autoPlay
                loop
                style={styles.monkeyAnimation}
                resizeMode="contain"
              />
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: currentTheme.colors.mediumEmphasis }]}>
                Made with ❤️ by Tapframe and friends
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Mobile styles
  contentContainer: {
    flex: 1,
    zIndex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Tablet-specific styles
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
  },
  sidebarHeader: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 48,
    borderBottomWidth: 1,
  },
  sidebarTitle: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 10,
  },
  sidebarItemActive: {
    borderRadius: 10,
  },
  sidebarItemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarItemText: {
    fontSize: 15,
    marginLeft: 12,
  },
  tabletContent: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 48,
  },
  tabletScrollView: {
    flex: 1,
    paddingHorizontal: 40,
  },
  tabletScrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Common card styles
  cardContainer: {
    width: '100%',
    marginBottom: 24,
  },
  tabletCardContainer: {
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: Math.max(16, width * 0.045),
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  tabletCardTitle: {
    fontSize: 12,
    marginLeft: 4,
    marginBottom: 12,
  },
  card: {
    marginHorizontal: Math.max(16, width * 0.04),
    borderRadius: 14,
    overflow: 'hidden',
    width: undefined,
  },
  tabletCard: {
    marginHorizontal: 0,
    borderRadius: 16,
  },
  settingItem: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: Math.max(60, width * 0.15),
    width: '100%',
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Math.max(10, width * 0.035),
  },
  focusedSettingItem: {
    borderRadius: 8,
  },
  tabletSettingItem: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    minHeight: 68,
  },
  settingItemBorder: {
    // Border styling handled directly in the component with borderBottomWidth
  },
  settingIconContainer: {
    marginRight: 14,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletSettingIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 11,
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
    fontSize: Math.min(16, width * 0.04),
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  tabletSettingTitle: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: Math.min(13, width * 0.034),
    opacity: 0.7,
  },
  tabletSettingDescription: {
    fontSize: 14,
    opacity: 0.6,
  },
  settingControl: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  badge: {
    height: 20,
    minWidth: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 13,
    opacity: 0.5,
    letterSpacing: 0.2,
  },
  // Support buttons
  discordContainer: {
    marginTop: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  discordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    maxWidth: 200,
  },
  discordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discordLogo: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  discordButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  kofiImage: {
    height: 34,
    width: 155,
  },
  downloadsContainer: {
    marginTop: 32,
    marginBottom: 16,
    alignItems: 'center',
  },
  downloadsNumber: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  downloadsLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  loadingSpinner: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderRadius: 8,
    borderTopColor: 'transparent',
    marginRight: 8,
  },
  monkeyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 32,
  },
  monkeyAnimation: {
    width: 180,
    height: 180,
  },
});

export default SettingsScreen;
