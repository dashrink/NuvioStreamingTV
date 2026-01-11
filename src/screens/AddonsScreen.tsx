import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  ScrollView,
  useColorScheme,
  Switch,
  Linking
} from 'react-native';
import { stremioService, Manifest } from '../services/stremioService';
import { MaterialIcons } from '@expo/vector-icons';
import FastImage from '@d11/react-native-fast-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { logger } from '../utils/logger';
import { mmkvStorage } from '../services/mmkvStorage';
import { BlurView as ExpoBlurView } from 'expo-blur';
import CustomAlert from '../components/CustomAlert';

// Optional iOS Glass effect (expo-glass-effect) with safe fallback for AddonsScreen
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
// Removed community blur and expo-constants for Android overlay
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';

// Extend Manifest type to include logo only (remove disabled status)
interface ExtendedManifest extends Manifest {
  logo?: string;
  transport?: string;
  behaviorHints?: {
    configurable?: boolean;
    configurationRequired?: boolean;
    configurationURL?: string;
  };
}

// Interface for Community Addon structure from the JSON URL
interface CommunityAddon {
  transportUrl: string;
  manifest: ExtendedManifest;
}

const { width } = Dimensions.get('window');

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  activeHeaderButton: {
    backgroundColor: 'rgba(45, 156, 219, 0.2)',
    borderRadius: 6,
  },
  reorderModeText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '400',
  },
  reorderInfoBanner: {
    backgroundColor: 'rgba(45, 156, 219, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reorderInfoText: {
    color: colors.white,
    fontSize: 14,
    marginLeft: 8,
  },
  reorderButtons: {
    position: 'absolute',
    left: -12,
    top: '50%',
    marginTop: -40,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  reorderButton: {
    backgroundColor: colors.elevation3,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: colors.elevation2,
  },
  priorityBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mediumGray,
    marginHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    backgroundColor: colors.elevation2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    alignSelf: 'center',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 13,
    color: colors.mediumGray,
  },
  addAddonContainer: {
    marginHorizontal: 16,
    backgroundColor: colors.elevation2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addonInput: {
    backgroundColor: colors.elevation1,
    borderRadius: 8,
    padding: 12,
    color: colors.white,
    marginBottom: 16,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  addonList: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    backgroundColor: colors.elevation2,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    marginTop: 8,
    color: colors.mediumGray,
    fontSize: 15,
  },
  addonItem: {
    backgroundColor: colors.elevation2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  addonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addonIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.elevation3,
  },
  addonIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.elevation3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonTitleContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 16,
  },
  addonName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  addonMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addonVersion: {
    fontSize: 13,
    color: colors.mediumGray,
  },
  addonDot: {
    fontSize: 13,
    color: colors.mediumGray,
    marginHorizontal: 4,
  },
  addonCategory: {
    fontSize: 13,
    color: colors.mediumGray,
    flex: 1,
  },
  addonDescription: {
    fontSize: 14,
    color: colors.mediumEmphasis,
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 20,
    marginLeft: 48, // Align with title, accounting for icon width
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.elevation2,
    borderRadius: 14,
    width: '85%',
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.elevation3,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.white,
  },
  modalScrollContent: {
    maxHeight: 400,
  },
  addonDetailHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.elevation3,
  },
  addonLogo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: colors.elevation3,
  },
  addonLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.elevation3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  addonDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  addonDetailVersion: {
    fontSize: 14,
    color: colors.mediumGray,
  },
  addonDetailSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.elevation3,
  },
  addonDetailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  addonDetailDescription: {
    fontSize: 15,
    color: colors.mediumEmphasis,
    lineHeight: 20,
  },
  addonDetailChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addonDetailChip: {
    backgroundColor: colors.elevation3,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addonDetailChipText: {
    fontSize: 13,
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.elevation3,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.elevation3,
    marginRight: 8,
  },
  installButton: {
    backgroundColor: colors.success,
    borderRadius: 6,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  addonActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 6,
  },
  configButton: {
    padding: 6,
    marginRight: 8,
  },
  communityAddonsList: {
    paddingHorizontal: 20,
  },
  communityAddonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  communityAddonIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 15,
  },
  communityAddonIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 15,
    backgroundColor: colors.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityAddonDetails: {
    flex: 1,
    marginRight: 10,
  },
  communityAddonName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 3,
  },
  communityAddonDesc: {
    fontSize: 13,
    color: colors.lightGray,
    marginBottom: 5,
    opacity: 0.9,
  },
  communityAddonMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.8,
  },
  communityAddonVersion: {
    fontSize: 12,
    color: colors.lightGray,
  },
  communityAddonDot: {
    fontSize: 12,
    color: colors.lightGray,
    marginHorizontal: 5,
  },
  communityAddonCategory: {
    fontSize: 12,
    color: colors.lightGray,
    flexShrink: 1,
  },
  separator: {
    height: 10,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginVertical: 20,
  },
  emptyMessage: {
    textAlign: 'center',
    color: colors.mediumGray,
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  errorMessage: {
    textAlign: 'center',
    color: colors.error,
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  loader: {
    marginTop: 30,
    alignSelf: 'center',
  },
  addonActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.transparentDark,
  },
  androidBlurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  androidBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  androidFallbackBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.darkBackground,
  },
});



const AddonsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [addons, setAddons] = useState<ExtendedManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [addonUrl, setAddonUrl] = useState('');
  const [addonDetails, setAddonDetails] = useState<ExtendedManifest | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [catalogCount, setCatalogCount] = useState(0);
  // Add state for reorder mode
  // Custom alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<any[]>([]);
  const [reorderMode, setReorderMode] = useState(false);
  // Use ThemeContext
  const { currentTheme } = useTheme();
  const colors = currentTheme.colors;
  const styles = createStyles(colors);

  // State for community addons
  const [communityAddons, setCommunityAddons] = useState<CommunityAddon[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState<string | null>(null);

  // Promotional addon: Nuvio Streams
  const PROMO_ADDON_URL = 'https://nuviostreams.hayd.uk/manifest.json';
  const promoAddon: ExtendedManifest = {
    id: 'org.nuvio.streams',
    name: 'Nuvio Streams | Elfhosted',
    version: '0.5.0',
    description: 'Stremio addon for high-quality streaming links.',
    // @ts-ignore - logo not in base manifest type
    logo: 'https://raw.githubusercontent.com/tapframe/NuvioStreaming/refs/heads/appstore/assets/titlelogo.png',
    types: ['movie', 'series'],
    catalogs: [],
    behaviorHints: { configurable: true },
    // help handleConfigureAddon derive configure URL from the transport
    transport: 'http://nuviostreams.hayd.uk:7001',
  };


  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    try {
      setLoading(true);
      // Use the regular method without disabled state
      const installedAddons = await stremioService.getInstalledAddonsAsync();

      // Filter out Torbox addons (managed via DebridIntegrationScreen)
      // Filter out only the official Torbox integration addon (managed via DebridIntegrationScreen)
      // but allow other addons (like Torrentio, MediaFusion) that may be configured with Torbox
      const filteredAddons = installedAddons.filter(addon => {
        const isOfficialTorboxAddon =
          addon.url?.includes('stremio.torbox.app') ||
          (addon as any).transport?.includes('stremio.torbox.app') ||
          // Check for ID but be careful not to catch others if possible, though ID usually comes from URL in stremioService
          (addon.id?.includes('stremio.torbox.app'));

        return !isOfficialTorboxAddon;
      });

      setAddons(filteredAddons as ExtendedManifest[]);

      // Count catalogs
      let totalCatalogs = 0;
      filteredAddons.forEach(addon => {
        if (addon.catalogs && addon.catalogs.length > 0) {
          totalCatalogs += addon.catalogs.length;
        }
      });

      // Get catalog settings to determine enabled count
      const catalogSettingsJson = await mmkvStorage.getItem('catalog_settings');
      if (catalogSettingsJson) {
        const catalogSettings = JSON.parse(catalogSettingsJson);
        const disabledCount = Object.entries(catalogSettings)
          .filter(([key, value]) => key !== '_lastUpdate' && value === false)
          .length;
        setCatalogCount(totalCatalogs - disabledCount);
      } else {
        setCatalogCount(totalCatalogs);
      }
    } catch (error) {
      logger.error('Failed to load addons:', error);
      setAlertTitle('Error');
      setAlertMessage('Failed to load addons');
      setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };



  const handleAddAddon = async (url?: string) => {
    let urlToInstall = url || addonUrl;
    if (!urlToInstall) {
      setAlertTitle('Error');
      setAlertMessage('Please enter an addon URL');
      setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
      return;
    }

    try {
      setAddonUrl('');
      triggerMedium();

      // Validate addon URL and get manifest
      const manifest = await stremioService.validateAddonUrl(urlToInstall);

      if (!manifest) {
        setAlertTitle('Error');
        setAlertMessage('Invalid addon URL');
        setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
        setAlertVisible(true);
        return;
      }

      setAddonDetails(manifest as ExtendedManifest);
      setShowConfirmModal(true);
    } catch (error) {
      logger.error('Error validating addon:', error);
      setAlertTitle('Error');
      setAlertMessage('Failed to validate addon. Please check the URL and try again.');
      setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
    }
  };

  const handleInstallAddon = async () => {
    if (!addonDetails) {
      return;
    }

    try {
      setInstalling(true);
      triggerMedium();

      const urlToInstall = addonUrl || (addonDetails as any).url;

      const result = await stremioService.installAddonAsync(
        urlToInstall || PROMO_ADDON_URL,
        addonDetails
      );

      setShowConfirmModal(false);
      setAddonUrl('');
      setAddonDetails(null);

      if (result) {
        triggerHeavy();
        setAlertTitle('Success');
        setAlertMessage('Addon installed successfully');
        setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
        setAlertVisible(true);
        await loadAddons();
      } else {
        setAlertTitle('Error');
        setAlertMessage('Failed to install addon');
        setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
        setAlertVisible(true);
      }
    } catch (error) {
      logger.error('Error installing addon:', error);
      setAlertTitle('Error');
      setAlertMessage(
        error instanceof Error
          ? error.message
          : 'Failed to install addon. Please try again.'
      );
      setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
    } finally {
      setInstalling(false);
    }
  };

  const handleDeleteAddon = (addon: ExtendedManifest) => {
    triggerMedium();
    setAlertTitle('Delete Addon');
    setAlertMessage(`Are you sure you want to delete "${addon.name}"?`);
    setAlertActions([
      { label: 'Cancel', onPress: () => setAlertVisible(false) },
      {
        label: 'Delete',
        onPress: async () => {
          setAlertVisible(false);
          try {
            triggerMedium();
            const success = await stremioService.deleteAddonAsync(addon.id || addon.name);
            if (success) {
              triggerHeavy();
              setAlertTitle('Success');
              setAlertMessage('Addon deleted successfully');
              setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
              setAlertVisible(true);
              await loadAddons();
            } else {
              setAlertTitle('Error');
              setAlertMessage('Failed to delete addon');
              setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
              setAlertVisible(true);
            }
          } catch (error) {
            logger.error('Error deleting addon:', error);
            setAlertTitle('Error');
            setAlertMessage('Failed to delete addon');
            setAlertActions([{ label: 'OK', onPress: () => setAlertVisible(false) }]);
            setAlertVisible(true);
          }
        },
        style: 'destructive',
      },
    ]);
    setAlertVisible(true);
  };

  const handleConfigureAddon = (addon: ExtendedManifest) => {
    triggerLight();
    const configUrl = (addon.behaviorHints?.configurationURL || 
      (addon as any).transport + '/configure');

    if (configUrl) {
      Linking.openURL(configUrl).catch((err) =>
        logger.error('Failed to open configuration URL:', err)
      );
    }
  };

  const handleReorderAddon = async (addonId: string, direction: 'up' | 'down') => {
    triggerMedium();
    const currentIndex = addons.findIndex(a => a.id === addonId);

    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === addons.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newAddons = [...addons];
    [newAddons[currentIndex], newAddons[newIndex]] = [
      newAddons[newIndex],
      newAddons[currentIndex],
    ];

    setAddons(newAddons);

    try {
      const addonIds = newAddons.map(a => a.id || a.name);
      await mmkvStorage.setItem('addon_order', JSON.stringify(addonIds));
      triggerLight();
    } catch (error) {
      logger.error('Error reordering addons:', error);
      await loadAddons();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const handlePromoAddonPress = () => {
    triggerMedium();
    setAddonDetails(promoAddon);
    setAddonUrl(PROMO_ADDON_URL);
    setShowConfirmModal(true);
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
        onDismiss={() => setAlertVisible(false)}
      />
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              triggerLight();
              navigation.goBack();
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Add-Ons</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, reorderMode && styles.activeHeaderButton]}
            onPress={() => {
              triggerMedium();
              setReorderMode(!reorderMode);
            }}
          >
            <MaterialIcons
              name="drag-handle"
              size={24}
              color={reorderMode ? colors.primary : colors.lightGray}
            />
          </TouchableOpacity>
        </View>
      </View>

      {reorderMode && (
        <View style={styles.reorderInfoBanner}>
          <MaterialIcons name="info" size={20} color={colors.primary} />
          <Text style={styles.reorderInfoText}>Drag to reorder add-ons</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {/* Stats Section */}
        <View style={styles.section}>
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <Text style={styles.statsValue}>{addons.length}</Text>
              <Text style={styles.statsLabel}>Add-Ons</Text>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsCard}>
              <Text style={styles.statsValue}>{catalogCount}</Text>
              <Text style={styles.statsLabel}>Catalogs</Text>
            </View>
          </View>
        </View>

        {/* Add Addon Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New</Text>
          <View style={styles.addAddonContainer}>
            <TextInput
              style={styles.addonInput}
              placeholder="Addon URL"
              placeholderTextColor={colors.mediumGray}
              value={addonUrl}
              onChangeText={setAddonUrl}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                triggerMedium();
                handleAddAddon();
              }}
            >
              <Text style={styles.addButtonText}>Add Addon</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Installed Addons Section */}
        {addons.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Installed</Text>
            <View style={styles.addonList}>
              {addons.map((addon, index) => (
                <View key={addon.id || addon.name} style={{ position: 'relative' }}>
                  {reorderMode && (
                    <View style={styles.reorderButtons}>
                      <TouchableOpacity
                        style={[
                          styles.reorderButton,
                          index === 0 && styles.disabledButton,
                        ]}
                        onPress={() => handleReorderAddon(addon.id || addon.name, 'up')}
                        disabled={index === 0}
                      >
                        <MaterialIcons
                          name="arrow-upward"
                          size={16}
                          color={colors.white}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.reorderButton,
                          index === addons.length - 1 && styles.disabledButton,
                        ]}
                        onPress={() => handleReorderAddon(addon.id || addon.name, 'down')}
                        disabled={index === addons.length - 1}
                      >
                        <MaterialIcons
                          name="arrow-downward"
                          size={16}
                          color={colors.white}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      triggerLight();
                      setAddonDetails(addon);
                      setShowConfirmModal(true);
                    }}
                    disabled={reorderMode}
                  >
                    <View style={styles.addonItem}>
                      <View style={styles.addonHeader}>
                        {addon.logo ? (
                          <FastImage
                            source={{ uri: addon.logo }}
                            style={styles.addonIcon}
                          />
                        ) : (
                          <View style={styles.addonIconPlaceholder}>
                            <MaterialIcons
                              name="extension"
                              size={20}
                              color={colors.primary}
                            />
                          </View>
                        )}

                        <View style={styles.addonTitleContainer}>
                          <Text style={styles.addonName}>{addon.name}</Text>
                          <View style={styles.addonMetaContainer}>
                            {addon.version && (
                              <>
                                <Text style={styles.addonVersion}>v{addon.version}</Text>
                                <Text style={styles.addonDot}>•</Text>
                              </>
                            )}
                            {addon.types && addon.types.length > 0 && (
                              <Text style={styles.addonCategory}>
                                {addon.types.join(', ')}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {addon.description && (
                        <Text
                          style={styles.addonDescription}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {addon.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {addons.length === 0 && !loading && (
          <View style={styles.section}>
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="extension"
                size={48}
                color={colors.mediumGray}
              />
              <Text style={styles.emptyText}>No add-ons installed</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          triggerLight();
          setShowConfirmModal(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.blurOverlay} />
          <View style={styles.modalContent}>
            {addonDetails && (
              <ScrollView>
                {/* Header with Logo and Basic Info */}
                <View style={styles.addonDetailHeader}>
                  {addonDetails.logo ? (
                    <FastImage
                      source={{ uri: addonDetails.logo }}
                      style={styles.addonLogo}
                    />
                  ) : (
                    <View style={styles.addonLogoPlaceholder}>
                      <MaterialIcons
                        name="extension"
                        size={32}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  <Text style={styles.addonDetailName}>{addonDetails.name}</Text>
                  {addonDetails.version && (
                    <Text style={styles.addonDetailVersion}>v{addonDetails.version}</Text>
                  )}
                </View>

                {/* Description Section */}
                {addonDetails.description && (
                  <View style={styles.addonDetailSection}>
                    <Text style={styles.addonDetailSectionTitle}>Description</Text>
                    <Text style={styles.addonDetailDescription}>
                      {addonDetails.description}
                    </Text>
                  </View>
                )}

                {/* Types Section */}
                {addonDetails.types && addonDetails.types.length > 0 && (
                  <View style={styles.addonDetailSection}>
                    <Text style={styles.addonDetailSectionTitle}>Content Types</Text>
                    <View style={styles.addonDetailChips}>
                      {addonDetails.types.map((type) => (
                        <View key={type} style={styles.addonDetailChip}>
                          <Text style={styles.addonDetailChipText}>{type}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Catalogs Section */}
                {addonDetails.catalogs && addonDetails.catalogs.length > 0 && (
                  <View style={styles.addonDetailSection}>
                    <Text style={styles.addonDetailSectionTitle}>Catalogs</Text>
                    <View style={styles.addonDetailChips}>
                      {addonDetails.catalogs.map((catalog, idx) => (
                        <View key={idx} style={styles.addonDetailChip}>
                          <Text style={styles.addonDetailChipText}>
                            {(catalog as any).name || catalog.type}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      triggerLight();
                      setShowConfirmModal(false);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>

                  {addonDetails.id && addons.find(a => a.id === addonDetails.id) ? (
                    <>
                      {addonDetails.behaviorHints?.configurable && (
                        <TouchableOpacity
                          style={styles.installButton}
                          onPress={() => {
                            triggerMedium();
                            handleConfigureAddon(addonDetails);
                          }}
                        >
                          <Text style={styles.modalButtonText}>Configure</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.installButton, { backgroundColor: colors.error}]}
                        onPress={() => {
                          triggerMedium();
                          setShowConfirmModal(false);
                          handleDeleteAddon(addonDetails);
                        }}
                      >
                        <Text style={styles.modalButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.installButton}
                      onPress={handleInstallAddon}
                      disabled={installing}
                    >
                      {installing ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles.modalButtonText}>Install</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AddonsScreen;