import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useRealtimeConfig } from '../hooks/useRealtimeConfig';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Dimensions,
  Linking,
  BackHandler,
} from 'react-native';
import Focusable from '../components/common/Focusable';
import { isTV, TV_TYPOGRAPHY, TV_SPACING, TV_TOUCH_TARGETS, TV_FOCUS_CONFIG } from '../utils/tvStyles';
import { useTVMode } from '../hooks/useTVMode';

import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useSharedValue,
} from 'react-native-reanimated';
import { mmkvStorage } from '../services/mmkvStorage';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';
import LottieView from 'lottie-react-native';
import { Feather } from '@expo/vector-icons';
import { useSettings, DEFAULT_SETTINGS } from '../hooks/useSettings';
import { RootStackParamList } from '../navigation/AppNavigator';
import { stremioService } from '../services/stremioService';
import { useCatalogContext } from '../contexts/CatalogContext';
import { useTraktContext } from '../contexts/TraktContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchTotalDownloads } from '../services/githubReleaseService';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDisplayedAppVersion } from '../utils/version';
import CustomAlert from '../components/CustomAlert';
import ScreenHeader from '../components/common/ScreenHeader';
import TraktIcon from '../components/icons/TraktIcon';
import { campaignService } from '../services/campaignService';
import { useScrollToTop } from '../contexts/ScrollToTopContext';

// Import reusable content components from settings screens
import { PlaybackSettingsContent } from './settings/PlaybackSettingsScreen';
import { ContentDiscoverySettingsContent } from './settings/ContentDiscoverySettingsScreen';
import { AppearanceSettingsContent } from './settings/AppearanceSettingsScreen';
import { IntegrationsSettingsContent } from './settings/IntegrationsSettingsScreen';
import { AboutSettingsContent, AboutFooter } from './settings/AboutSettingsScreen';
import { SettingsCard, SettingItem, ChevronRight, CustomSwitch } from './settings/SettingsComponents';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Settings categories for tablet sidebar
const SETTINGS_CATEGORIES = [
  { id: 'account', title: 'Account', icon: 'user' as string },
  { id: 'content', title: 'Content & Discovery', icon: 'compass' as string },
  { id: 'appearance', title: 'Appearance', icon: 'sliders' as string },
  { id: 'integrations', title: 'Integrations', icon: 'layers' as string },
  { id: 'playback', title: 'Playback', icon: 'play-circle' as string },
  { id: 'backup', title: 'Backup & Restore', icon: 'archive' as string },
  { id: 'updates', title: 'Updates', icon: 'refresh-ccw' as string },
  { id: 'about', title: 'About', icon: 'info' as string },
  { id: 'developer', title: 'Developer', icon: 'code' as string },
  { id: 'cache', title: 'Cache', icon: 'database' as string },
];

// Tablet/TV Sidebar Component with focus-based navigation
interface SidebarProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  currentTheme: any;
  categories: typeof SETTINGS_CATEGORIES;
  extraTopPadding?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedCategory, onCategorySelect, currentTheme, categories, extraTopPadding = 0 }) => {
  // For TV, we'll track refs for navigation between sidebar items
  const itemRefs = useRef<{ [key: string]: any }>({});
  const useTVStyle = isTV;

  const handleCategorySelect = (categoryId: string) => {
    triggerLight();
    onCategorySelect(categoryId);
  };

  return (
    <View style={[
      styles.sidebar,
      {
        backgroundColor: currentTheme.colors.elevation1,
        borderRightColor: currentTheme.colors.elevation2,
      },
      useTVStyle && styles.tvSidebar
    ]}>
      <View style={[
        styles.sidebarHeader,
        {
          paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 48) + extraTopPadding,
          borderBottomColor: currentTheme.colors.elevation2,
        },
        useTVStyle && styles.tvSidebarHeader
      ]}>
        <Text style={[
          styles.sidebarTitle,
          { color: currentTheme.colors.highEmphasis },
          useTVStyle && styles.tvSidebarTitle
        ]}>
          Settings
        </Text>
      </View>

      <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
        {categories.map((category, index) => (
          <Focusable
            key={category.id}
            ref={(ref: any) => { itemRefs.current[category.id] = ref; }}
            hasTVPreferredFocus={index === 0 && useTVStyle}
            scaleOnFocus={TV_FOCUS_CONFIG.focusScaleSubtle}
            style={[
              styles.sidebarItem,
              useTVStyle && styles.tvSidebarItem,
              selectedCategory === category.id && [
                styles.sidebarItemActive,
                { backgroundColor: currentTheme.colors.primary + '10' },
                useTVStyle && styles.tvSidebarItemActive
              ]
            ]}
            onPress={() => handleCategorySelect(category.id)}
          >
            <View style={[
              styles.sidebarItemIconContainer,
              useTVStyle && styles.tvSidebarItemIconContainer,
              {
                backgroundColor: selectedCategory === category.id
                  ? currentTheme.colors.primary + '15'
                  : 'transparent',
              }
            ]}>
              <Feather
                name={category.icon as any}
                size={useTVStyle ? 26 : 20}
                color={
                  selectedCategory === category.id
                    ? currentTheme.colors.primary
                    : currentTheme.colors.mediumEmphasis
                }
              />
            </View>
            <Text style={[
              styles.sidebarItemText,
              useTVStyle && styles.tvSidebarItemText,
              {
                color: selectedCategory === category.id
                  ? currentTheme.colors.highEmphasis
                  : currentTheme.colors.mediumEmphasis,
                fontWeight: selectedCategory === category.id ? '600' : '500',
              }
            ]}>
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

  // TV Mode hook for back button handling
  useTVMode();

  // Track if we're in TV mode for layout decisions
  const useTVLayout = isTV;

  // CustomAlert state
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

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let mounted = true;
    (async () => {
      try {
        const flag = await mmkvStorage.getItem('@update_badge_pending');
        if (mounted) setHasUpdateBadge(flag === 'true');
      } catch { }
    })();
    return () => { mounted = false; };
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

  // Use Realtime Config Hook
  const settingsConfig = useRealtimeConfig();

  // Scroll to top ref and handler
  const mobileScrollViewRef = useRef<ScrollView>(null);
  const tabletScrollViewRef = useRef<ScrollView>(null);

  const scrollToTop = useCallback(() => {
    mobileScrollViewRef.current?.scrollTo({ y: 0, animated: true });
    tabletScrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useScrollToTop('Settings', scrollToTop);

  // Refresh Trakt auth status on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshAuthStatus();
    });
    return unsubscribe;
  }, [navigation, refreshAuthStatus]);

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
        const disabledCount = Object.entries(catalogSettings)
          .filter(([key, value]) => key !== '_lastUpdate' && value === false)
          .length;
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

  // Animate counting up when totalDownloads changes
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

  const handleClearMDBListCache = () => {
    openAlert(
      'Clear MDBList Cache',
      'Are you sure you want to clear all cached MDBList data? This cannot be undone.',
      [
        { label: 'Cancel', onPress: () => { } },
        {
          label: 'Clear',
          onPress: async () => {
            try {
              await mmkvStorage.removeItem('mdblist_cache');
              openAlert('Success', 'MDBList cache has been cleared.');
            } catch (error) {
              openAlert('Error', 'Could not clear MDBList cache.');
              if (__DEV__) console.error('Error clearing MDBList cache:', error);
            }
          }
        }
      ]
    );
  };

  // Helper to check item visibility
  const isItemVisible = (itemId: string) => {
    if (!settingsConfig?.items) return true;
    const item = settingsConfig.items[itemId];
    if (item && item.visible === false) return false;
    return true;
  };

  // Filter categories based on conditions
  const visibleCategories = SETTINGS_CATEGORIES.filter(category => {
    if (settingsConfig?.categories?.[category.id]?.visible === false) return false;
    if (category.id === 'developer' && !__DEV__) return false;
    if (category.id === 'cache' && !mdblistKeySet) return false;
    return true;
  });

  // Render tablet category content using reusable components
  const renderCategoryContent = (categoryId: string) => {
    switch (categoryId) {
      case 'account':
        return (
          <SettingsCard title="ACCOUNT" isTablet={isTablet}>
            {isItemVisible('trakt') && (
              <SettingItem
                title="Trakt"
                description={isAuthenticated ? `@${userProfile?.username || 'User'}` : "Sign in to sync"}
                customIcon={<TraktIcon size={isTablet ? 24 : 20} color={currentTheme.colors.primary} />}
                renderControl={() => <ChevronRight />}
                onPress={() => {
                  triggerLight();
                  navigation.navigate('TraktSettings');
                }}
                isLast={true}
                isTablet={isTablet}
              />
            )}
          </SettingsCard>
        );

      case 'content':
        return <ContentDiscoverySettingsContent isTablet={isTablet} />;

      case 'appearance':
        return <AppearanceSettingsContent isTablet={isTablet} />;

      case 'integrations':
        return <IntegrationsSettingsContent isTablet={isTablet} />;

      case 'playback':
        return <PlaybackSettingsContent isTablet={isTablet} />;

      case 'about':
        return <AboutSettingsContent isTablet={isTablet} displayDownloads={displayDownloads} />;

      case 'developer':
        return __DEV__ ? (
          <SettingsCard title="DEVELOPER" isTablet={isTablet}>
            <SettingItem
              title="Test Onboarding"
              icon="play-circle"
              onPress={() => {
                triggerLight();
                navigation.navigate('Onboarding');
              }}
              renderControl={() => <ChevronRight />}
              isTablet={isTablet}
            />
            <SettingItem
              title="Reset Onboarding"
              icon="refresh-ccw"
              onPress={async () => {
                try {
                  triggerLight();
                  await mmkvStorage.removeItem('hasCompletedOnboarding');
                  openAlert('Success', 'Onboarding has been reset. Restart the app to see the onboarding flow.');
                } catch (error) {
                  openAlert('Error', 'Failed to reset onboarding.');
                }
              }}
              renderControl={() => <ChevronRight />}
              isTablet={isTablet}
            />
          </SettingsCard>
        ) : null;

      case 'cache':
        return mdblistKeySet ? (
          <SettingsCard title="CACHE" isTablet={isTablet}>
            <SettingItem
              title="Clear MDBList Cache"
              description="Remove all cached MDBList data"
              icon="trash-2"
              onPress={handleClearMDBListCache}
              renderControl={() => <ChevronRight />}
              isTablet={isTablet}
              isLast={true}
            />
          </SettingsCard>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.colors.background }]}>
        {isTablet ? (
          // Tablet layout with sidebar
          <View style={styles.tabletContainer}>
            <Sidebar
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              currentTheme={currentTheme}
              categories={visibleCategories}
              extraTopPadding={0}
            />
            <View style={[styles.tabletContent, { backgroundColor: currentTheme.colors.background }]}>
              <ScrollView
                ref={tabletScrollViewRef}
                showsVerticalScrollIndicator={false}
                style={styles.contentScroll}
              >
                {renderCategoryContent(selectedCategory)}
                {selectedCategory === 'about' && <AboutFooter />}
              </ScrollView>
            </View>
          </View>
        ) : (
          // Mobile layout with stacked sections
          <ScrollView
            ref={mobileScrollViewRef}
            showsVerticalScrollIndicator={false}
            style={styles.contentScroll}
          >
            <ScreenHeader title="Settings" />
            {/* Render all visible categories */}
            {visibleCategories.map((category) => (
              <View key={category.id}>
                {renderCategoryContent(category.id)}
              </View>
            ))}
            <AboutFooter />
          </ScrollView>
        )}
      </SafeAreaView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
        onDismiss={() => setAlertVisible(false)}
      />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    maxHeight: '100%',
  },
  tvSidebar: {
    width: 280,
  },
  sidebarHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tvSidebarHeader: {
    paddingHorizontal: 20,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tvSidebarTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  tvSidebarItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(255,0,0,0.1)',
  },
  tvSidebarItemActive: {
    backgroundColor: 'rgba(255,0,0,0.15)',
  },
  sidebarItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tvSidebarItemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 16,
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  tvSidebarItemText: {
    fontSize: 18,
    fontWeight: '500',
  },
  tabletContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  contentScroll: {
    flex: 1,
  },
  cardContainer: {
    marginBottom: 16,
  },
  tabletCardContainer: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  tabletCardTitle: {
    fontSize: 13,
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabletCard: {
    borderRadius: 12,
  },
  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabletSettingItem: {
    paddingHorizontal: 18,
    paddingVertical: 14,
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
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  tabletSettingTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  tabletSettingDescription: {
    fontSize: 13,
  },
  settingControl: {
    marginLeft: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SettingsScreen;