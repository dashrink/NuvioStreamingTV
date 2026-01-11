import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  Pressable,
  Button,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import Focusable from '../components/common/Focusable';
import { mmkvStorage } from '../services/mmkvStorage';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';
import { stremioService } from '../services/stremioService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useCatalogContext } from '../contexts/CatalogContext';
import { logger } from '../utils/logger';
import { clearCustomNameCache } from '../utils/catalogNameUtils';
import { BlurView } from 'expo-blur';
import CustomAlert from '../components/CustomAlert';

// Optional iOS Glass effect (expo-glass-effect) with safe fallback for CatalogSettingsScreen
let GlassViewComp: any = null;
let liquidGlassAvailable = false;
if (Platform.OS === 'ios') {
  try {
    // Dynamically require so app still runs if the package isn't installed yet
    const glass = require('expo-glass-effect');
    GlassViewComp = glass.GlassView;
    liquidGlassAvailable = typeof glass.isLiquidGlassAvailable === 'function' ? glass.isLiquidGlassAvailable() : false;
  } catch {
    GlassViewComp = null;
    liquidGlassAvailable = false;
  }
}

interface CatalogSetting {
  addonId: string;
  catalogId: string;
  type: string;
  name: string;
  enabled: boolean;
  customName?: string;
}

interface CatalogSettingsStorage {
  [key: string]: boolean | number;
  _lastUpdate: number;
}

interface GroupedCatalogs {
  [addonId: string]: {
    name: string;
    catalogs: CatalogSetting[];
    expanded: boolean;
    enabledCount: number;
  };
}

const CATALOG_SETTINGS_KEY = 'catalog_settings';
const CATALOG_CUSTOM_NAMES_KEY = 'catalog_custom_names';
const CATALOG_MOBILE_COLUMNS_KEY = 'catalog_mobile_columns';
const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// Create a styles creator function that accepts the theme colors
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  addonSection: {
    marginBottom: 24,
  },
  addonTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mediumGray,
    marginHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.elevation2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
  },
  optionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: {
    color: colors.mediumGray,
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: colors.white,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hintText: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  enabledCount: {
    fontSize: 15,
    color: colors.mediumGray,
    marginRight: 8,
  },
  catalogItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    // Ensure last item doesn't have border if needed (check logic)
  },
  catalogItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle feedback for press
  },
  catalogInfo: {
    flex: 1,
    marginRight: 8, // Add space before switch
  },
  catalogName: {
    fontSize: 15,
    color: colors.white,
    marginBottom: 2,
  },
  catalogType: {
    fontSize: 13,
    color: colors.mediumGray,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: Platform.OS === 'ios' ? undefined : colors.elevation3,
    borderRadius: 14,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.elevation1, // Darker input background
    color: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Adjust as needed (e.g., 'flex-end')
  },
});

const CatalogSettingsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CatalogSetting[]>([]);
  const [groupedSettings, setGroupedSettings] = useState<GroupedCatalogs>({});
  const [mobileColumns, setMobileColumns] = useState<'auto' | 2 | 3>('auto');
  const [showTitles, setShowTitles] = useState(true); // Default to showing titles
  const navigation = useNavigation();
  const { refreshCatalogs } = useCatalogContext();
  const { currentTheme } = useTheme();
  const colors = currentTheme.colors;
  const styles = createStyles(colors);
  const isDarkMode = true; // Force dark mode

  // Modal State
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [catalogToRename, setCatalogToRename] = useState<CatalogSetting | null>(null);
  const [currentRenameValue, setCurrentRenameValue] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<any[]>([]);

  // Load saved settings and available catalogs
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Get installed addons and their catalogs
      const addons = await stremioService.getInstalledAddonsAsync();
      const availableCatalogs: CatalogSetting[] = [];

      // Get saved enable/disable settings
      const savedSettingsJson = await mmkvStorage.getItem(CATALOG_SETTINGS_KEY);
      const savedEnabledSettings: { [key: string]: boolean } = savedSettingsJson ? JSON.parse(savedSettingsJson) : {};

      // Get saved custom names
      const savedCustomNamesJson = await mmkvStorage.getItem(CATALOG_CUSTOM_NAMES_KEY);
      const savedCustomNames: { [key: string]: string } = savedCustomNamesJson ? JSON.parse(savedCustomNamesJson) : {};

      // Process each addon's catalogs
      addons.forEach(addon => {
        if (addon.catalogs && addon.catalogs.length > 0) {
          const uniqueCatalogs = new Map<string, CatalogSetting>();

          addon.catalogs.forEach(catalog => {
            const settingKey = `${addon.id}:${catalog.type}:${catalog.id}`;
            let displayName = catalog.name || catalog.id;
            const catalogType = catalog.type === 'movie' ? 'Movies' : catalog.type === 'series' ? 'TV Shows' : catalog.type.charAt(0).toUpperCase() + catalog.type.slice(1);

            // Clean duplicate words within the catalog name (e.g., "Popular Popular")
            if (displayName) {
              const words = displayName.split(' ').filter(Boolean);
              const uniqueWords: string[] = [];
              const seen = new Set<string>();
              for (const w of words) {
                const lw = w.toLowerCase();
                if (!seen.has(lw)) {
                  uniqueWords.push(w);
                  seen.add(lw);
                }
              }
              displayName = uniqueWords.join(' ');
            }

            // Append content type if not already present (case-insensitive)
            if (!displayName.toLowerCase().includes(catalogType.toLowerCase())) {
              displayName = `${displayName} ${catalogType}`.trim();
            }

            uniqueCatalogs.set(settingKey, {
              addonId: addon.id,
              catalogId: catalog.id,
              type: catalog.type,
              name: displayName,
              enabled: savedEnabledSettings[settingKey] !== undefined ? savedEnabledSettings[settingKey] : true,
              customName: savedCustomNames[settingKey]
            });
          });

          availableCatalogs.push(...uniqueCatalogs.values());
        }
      });

      // Group settings by addon name
      const grouped: GroupedCatalogs = {};
      availableCatalogs.forEach(setting => {
        const addon = addons.find(a => a.id === setting.addonId);
        if (!addon) return;

        if (!grouped[setting.addonId]) {
          grouped[setting.addonId] = {
            name: addon.name,
            catalogs: [],
            expanded: true,
            enabledCount: 0
          };
        }

        grouped[setting.addonId].catalogs.push(setting);
        if (setting.enabled) {
          grouped[setting.addonId].enabledCount++;
        }
      });

      setSettings(availableCatalogs);
      setGroupedSettings(grouped);

      // Load mobile columns preference (phones only)
      try {
        const pref = await mmkvStorage.getItem(CATALOG_MOBILE_COLUMNS_KEY);
        if (pref === '2') setMobileColumns(2);
        else if (pref === '3') setMobileColumns(3);
        else setMobileColumns('auto');

        // Load show titles preference (default: true)
        const titlesPref = await mmkvStorage.getItem('catalog_show_titles');
        setShowTitles(titlesPref !== 'false'); // Default to true if not set
      } catch (e) {
        // ignore
      }
    } catch (error) {
      logger.error('Failed to load catalog settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save settings when they change (ENABLE/DISABLE ONLY)
  const saveEnabledSettings = async (newSettings: CatalogSetting[]) => {
    try {
      const settingsObj: CatalogSettingsStorage = {
        _lastUpdate: Date.now()
      };
      newSettings.forEach(setting => {
        const key = `${setting.addonId}:${setting.type}:${setting.catalogId}`;
        settingsObj[key] = setting.enabled;
      });
      await mmkvStorage.setItem(CATALOG_SETTINGS_KEY, JSON.stringify(settingsObj));

      // Small delay to ensure AsyncStorage has fully persisted before triggering refresh
      setTimeout(() => {
        refreshCatalogs(); // Trigger catalog refresh after saving settings
      }, 100);
    } catch (error) {
      logger.error('Failed to save catalog enabled settings:', error);
    }
  };

  // Toggle individual catalog enabled state
  const toggleCatalog = (addonId: string, index: number) => {
    triggerMedium();
    const newSettings = [...settings];
    const catalogsForAddon = groupedSettings[addonId].catalogs;
    const setting = catalogsForAddon[index];

    const updatedSetting = {
      ...setting,
      enabled: !setting.enabled
    };

    const flatIndex = newSettings.findIndex(s =>
      s.addonId === setting.addonId &&
      s.type === setting.type &&
      s.catalogId === setting.catalogId
    );

    if (flatIndex !== -1) {
      newSettings[flatIndex] = updatedSetting;
    }

    const newGroupedSettings = { ...groupedSettings };
    newGroupedSettings[addonId].catalogs[index] = updatedSetting;
    newGroupedSettings[addonId].enabledCount += updatedSetting.enabled ? 1 : -1;

    setSettings(newSettings);
    setGroupedSettings(newGroupedSettings);
    saveEnabledSettings(newSettings); // Use specific save function
  };

  // Toggle expansion of a group
  const toggleExpansion = (addonId: string) => {
    triggerLight();
    setGroupedSettings(prev => ({
      ...prev,
      [addonId]: {
        ...prev[addonId],
        expanded: !prev[addonId].expanded
      }
    }));
  };

  // Handle long press on catalog item
  const handleLongPress = (setting: CatalogSetting) => {
    triggerMedium();
    setCatalogToRename(setting);
    setCurrentRenameValue(setting.customName || setting.name);
    setIsRenameModalVisible(true);
  };

  // Handle saving the renamed catalog
  const handleSaveRename = async () => {
    if (!catalogToRename || !currentRenameValue) return;

    const settingKey = `${catalogToRename.addonId}:${catalogToRename.type}:${catalogToRename.catalogId}`;

    try {
      const savedCustomNamesJson = await mmkvStorage.getItem(CATALOG_CUSTOM_NAMES_KEY);
      const customNames: { [key: string]: string } = savedCustomNamesJson ? JSON.parse(savedCustomNamesJson) : {};

      const trimmedNewName = currentRenameValue.trim();

      if (trimmedNewName === catalogToRename.name || trimmedNewName === '') {
        delete customNames[settingKey];
      } else {
        customNames[settingKey] = trimmedNewName;
      }

      await mmkvStorage.setItem(CATALOG_CUSTOM_NAMES_KEY, JSON.stringify(customNames));
      // Clear in-memory cache so new name is used immediately
      try { clearCustomNameCache(); } catch { }

      // --- Reload settings to reflect the change --- 
      await loadSettings();
      // Also trigger home/catalog consumers to refresh
      try { refreshCatalogs(); } catch { }
      // --- No need to manually update local state anymore --- 

    } catch (error) {
      logger.error('Failed to save custom catalog name:', error);
      setAlertTitle('Error');
      setAlertMessage('Failed to save custom name');
      setAlertActions([{ text: 'OK', onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
    } finally {
      setIsRenameModalVisible(false);
    }
  };

  // Handle cancel rename
  const handleCancelRename = () => {
    setIsRenameModalVisible(false);
    setCatalogToRename(null);
    setCurrentRenameValue('');
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Focusable onPress={() => navigation.goBack()}>
          <View style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            <Text style={styles.backText}>Settings</Text>
          </View>
        </Focusable>
      </View>

      <Text style={styles.headerTitle}>Catalogs</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {Object.entries(groupedSettings).map(([addonId, group]) => (
          <View key={addonId} style={styles.addonSection}>
            <Text style={styles.addonTitle}>{group.name.toUpperCase()}</Text>

            <View style={styles.card}>
              {/* Group Header - Expandable */}
              <Focusable onPress={() => toggleExpansion(addonId)}>
                <View style={styles.groupHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupTitle}>{group.name}</Text>
                  </View>
                  <View style={styles.groupHeaderRight}>
                    <Text style={styles.enabledCount}>
                      {group.enabledCount}/{group.catalogs.length}
                    </Text>
                    <MaterialIcons
                      name={group.expanded ? 'expand-less' : 'expand-more'}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                </View>
              </Focusable>

              {/* Catalog Items */}
              {group.expanded &&
                group.catalogs.map((catalog, index) => (
                  <Focusable
                    key={`${catalog.addonId}:${catalog.type}:${catalog.catalogId}`}
                    onPress={() => toggleCatalog(addonId, index)}
                    onLongPress={() => handleLongPress(catalog)}
                  >
                    <View style={styles.catalogItem}>
                      <View style={styles.catalogInfo}>
                        <Text style={styles.catalogName}>
                          {catalog.customName || catalog.name}
                        </Text>
                        <Text style={styles.catalogType}>{catalog.type}</Text>
                      </View>
                      <CustomSwitch
                        value={catalog.enabled}
                        onValueChange={() => toggleCatalog(addonId, index)}
                      />
                    </View>
                  </Focusable>
                ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Rename Modal */}
      <Modal transparent animationType="fade" visible={isRenameModalVisible}>
        {Platform.OS === 'ios' && liquidGlassAvailable && GlassViewComp ? (
          <GlassViewComp style={styles.modalOverlay}>
            <BlurView intensity={90} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Rename "{catalogToRename?.name}"
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new name"
                  placeholderTextColor={colors.mediumGray}
                  value={currentRenameValue}
                  onChangeText={setCurrentRenameValue}
                  maxLength={50}
                />
                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={handleCancelRename}
                    color={colors.primary}
                  />
                  <Button
                    title="Save"
                    onPress={handleSaveRename}
                    color={colors.primary}
                  />
                </View>
              </View>
            </BlurView>
          </GlassViewComp>
        ) : (
          <View style={styles.modalOverlay}>
            <BlurView intensity={90} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Rename "{catalogToRename?.name}"
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new name"
                  placeholderTextColor={colors.mediumGray}
                  value={currentRenameValue}
                  onChangeText={setCurrentRenameValue}
                  maxLength={50}
                />
                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={handleCancelRename}
                    color={colors.primary}
                  />
                  <Button
                    title="Save"
                    onPress={handleSaveRename}
                    color={colors.primary}
                  />
                </View>
              </View>
            </BlurView>
          </View>
        )}
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
      />
    </SafeAreaView>
  );
};

export default CatalogSettingsScreen;