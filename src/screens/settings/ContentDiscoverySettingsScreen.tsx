import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsCard, SettingItem, CustomSwitch, ChevronRight } from './SettingsComponents';
import ScreenHeader from '../../components/common/ScreenHeader';
import PluginIcon from '../../components/icons/PluginIcon';
import { useTheme } from '../../contexts/ThemeContext';
import { useRealtimeConfig } from '../../hooks/useRealtimeConfig';
import { useSettings } from '../../hooks/useSettings';
import { useTVMode } from '../../hooks/useTVMode';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { mmkvStorage } from '../../services/mmkvStorage';
import { stremioService } from '../../services/stremioService';
import { isTV } from '../../utils/tvStyles/deviceDetection';
import { TV_SPACING } from '../../utils/tvStyles/spacing';

const { width } = Dimensions.get('window');

interface ContentDiscoverySettingsContentProps {
  isTablet?: boolean;
}

/**
 * Reusable ContentDiscoverySettingsContent component
 * Can be used inline (tablets) or wrapped in a screen (mobile)
 */
export const ContentDiscoverySettingsContent: React.FC<ContentDiscoverySettingsContentProps> = ({
  isTablet = false,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const { settings, updateSetting } = useSettings();
  const config = useRealtimeConfig();

  const [addonCount, setAddonCount] = useState<number>(0);
  const [catalogCount, setCatalogCount] = useState<number>(0);

  const loadData = useCallback(async () => {
    try {
      const addons = await stremioService.getInstalledAddonsAsync();
      setAddonCount(addons.length);

      let totalCatalogs = 0;
      addons.forEach(addon => {
        if (addon.catalogs && addon.catalogs.length > 0) {
          totalCatalogs += addon.catalogs.length;
        }
      });

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
    } catch (error) {
      if (__DEV__) console.error('Error loading content data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const isItemVisible = (itemId: string) => {
    if (!config?.items) return true;
    const item = config.items[itemId];
    if (item && item.visible === false) return false;
    return true;
  };

  const hasVisibleItems = (itemIds: string[]) => {
    return itemIds.some(id => isItemVisible(id));
  };

  return (
    <>
      {hasVisibleItems(['addons', 'debrid', 'plugins']) && (
        <SettingsCard title="SOURCES" isTablet={isTablet}>
          {isItemVisible('addons') && (
            <SettingItem
              title="Addons"
              description={`${addonCount} installed`}
              icon="layers"
              renderControl={() => <ChevronRight />}
              onPress={() => navigation.navigate('Addons')}
              isTablet={isTablet}
            />
          )}
          {isItemVisible('debrid') && (
            <SettingItem
              title="Debrid Integration"
              description="Connect Torbox for premium streams"
              icon="link"
              renderControl={() => <ChevronRight />}
              onPress={() => navigation.navigate('DebridIntegration')}
              isTablet={isTablet}
            />
          )}
          {isItemVisible('plugins') && (
            <SettingItem
              title="Plugins"
              description="Manage plugins and repositories"
              customIcon={
                <PluginIcon size={isTablet ? 22 : 18} color={currentTheme.colors.primary} />
              }
              renderControl={() => <ChevronRight />}
              onPress={() => navigation.navigate('ScraperSettings')}
              isLast
              isTablet={isTablet}
            />
          )}
        </SettingsCard>
      )}

      {hasVisibleItems(['catalogs', 'home_screen', 'continue_watching']) && (
        <SettingsCard title="CATALOGS" isTablet={isTablet}>
          {isItemVisible('catalogs') && (
            <SettingItem
              title="Catalogs"
              description={`${catalogCount} active`}
              icon="list"
              renderControl={() => <ChevronRight />}
              onPress={() => navigation.navigate('CatalogSettings')}
              isTablet={isTablet}
            />
          )}
          {isItemVisible('home_screen') && (
            <SettingItem
              title="Home Screen"
              description="Layout and content"
              icon="home"
              renderControl={() => <ChevronRight />}
              onPress={() => navigation.navigate('HomeScreenSettings')}
              isTablet={isTablet}
            />
          )}
          {isItemVisible('continue_watching') && (
            <SettingItem
              title="Continue Watching"
              description="Cache and playback behavior"
              icon="play-circle"
              renderControl={() => <ChevronRight />}
              onPress={() => navigation.navigate('ContinueWatchingSettings')}
              isLast
              isTablet={isTablet}
            />
          )}
        </SettingsCard>
      )}

      {hasVisibleItems(['show_discover']) && (
        <SettingsCard title="DISCOVERY" isTablet={isTablet}>
          {isItemVisible('show_discover') && (
            <SettingItem
              title="Show Discover Section"
              description="Display discover content in Search"
              icon="compass"
              renderControl={() => (
                <CustomSwitch
                  value={settings?.showDiscover ?? true}
                  onValueChange={value => updateSetting('showDiscover', value)}
                />
              )}
              isLast
              isTablet={isTablet}
            />
          )}
        </SettingsCard>
      )}
    </>
  );
};

/**
 * ContentDiscoverySettingsScreen - Wrapper for mobile/TV navigation
 */
const ContentDiscoverySettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const screenIsTablet = width >= 768;
  const useTVStyle = isTV;

  // TV Mode hook for back button handling
  useTVMode();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentTheme.colors.darkBackground },
        useTVStyle && styles.tvContainer,
      ]}
    >
      <StatusBar barStyle="light-content" />
      <ScreenHeader
        title="Content & Discovery"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={[styles.scrollView, useTVStyle && styles.tvScrollView]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
          useTVStyle && styles.tvScrollContent,
        ]}
      >
        <ContentDiscoverySettingsContent isTablet={screenIsTablet || useTVStyle} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tvContainer: {
    paddingHorizontal: TV_SPACING.screenPadding,
  },
  scrollView: {
    flex: 1,
  },
  tvScrollView: {
    paddingHorizontal: TV_SPACING.lg,
  },
  scrollContent: {
    paddingTop: 16,
  },
  tvScrollContent: {
    paddingTop: TV_SPACING.xl,
    paddingBottom: TV_SPACING.xxl,
  },
});

export default ContentDiscoverySettingsScreen;
