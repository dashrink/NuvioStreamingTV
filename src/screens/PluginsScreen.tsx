import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  Image,
  Switch,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import CustomAlert from '../components/CustomAlert';
import FastImage from '@d11/react-native-fast-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../hooks/useSettings';
import { localScraperService, pluginService, ScraperInfo, RepositoryInfo } from '../services/pluginService';
import { logger } from '../utils/logger';
import { useTheme } from '../contexts/ThemeContext';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';

const { width: screenWidth } = Dimensions.get('window');

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  backText: {
    fontSize: 17,
    color: colors.primary,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.elevation1,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.mediumGray,
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyContainer: {
    backgroundColor: colors.elevation2,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
  pluginItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevation2,
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pluginLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 6,
    backgroundColor: colors.elevation3,
  },
  pluginInfo: {
    flex: 1,
  },
  pluginName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  pluginDescription: {
    fontSize: 13,
    color: colors.mediumGray,
    marginBottom: 4,
    lineHeight: 18,
  },
  pluginMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pluginVersion: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  pluginDot: {
    fontSize: 12,
    color: colors.mediumGray,
    marginHorizontal: 8,
  },
  pluginTypes: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  pluginLanguage: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.mediumEmphasis,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: colors.darkBackground,
    borderRadius: 8,
    padding: 12,
    color: colors.white,
    marginBottom: 16,
    fontSize: 15,
  },
  button: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.elevation3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: colors.elevation3,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
    textAlign: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  currentRepoContainer: {
    backgroundColor: colors.elevation1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  currentRepoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  currentRepoUrl: {
    fontSize: 14,
    color: colors.white,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  urlHint: {
    fontSize: 12,
    color: colors.mediumGray,
    marginBottom: 8,
    lineHeight: 16,
  },
  defaultRepoButton: {
    backgroundColor: colors.elevation3,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  defaultRepoButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.mediumEmphasis,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: colors.mediumGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  pluginsList: {
    gap: 12,
  },
  pluginsContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  lastSection: {
    borderBottomWidth: 0,
  },
  disabledSection: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.elevation3,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  disabledInput: {
    backgroundColor: colors.elevation1,
    opacity: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledImage: {
    opacity: 0.3,
  },
  availableIndicator: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  availableIndicatorText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  qualityChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  qualityChip: {
    backgroundColor: colors.elevation2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.elevation3,
  },
  qualityChipSelected: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },
  qualityChipText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  qualityChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  // New styles for improved UX
  collapsibleSection: {
    backgroundColor: colors.darkBackground,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.elevation2,
  },
  collapsibleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  collapsibleContent: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: colors.white,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.elevation2,
    borderWidth: 1,
    borderColor: colors.elevation3,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  // Repository tabs
  repositoryTabsContainer: {
    marginBottom: 16,
  },
  repositoryTabsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  repositoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.elevation2,
    borderWidth: 1,
    borderColor: colors.elevation3,
    minWidth: 80,
    alignItems: 'center',
  },
  repositoryTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  repositoryTabText: {
    color: colors.mediumGray,
    fontSize: 14,
    fontWeight: '500',
  },
  repositoryTabTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  repositoryTabCount: {
    fontSize: 12,
    color: colors.mediumGray,
    marginTop: 2,
  },
  repositoryTabCountSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  bulkActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
  },
  bulkActionButtonEnabled: {
    backgroundColor: 'transparent',
    borderColor: '#34C759',
  },
  bulkActionButtonDisabled: {
    backgroundColor: 'transparent',
    borderColor: colors.elevation3,
  },
  bulkActionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.51,
        shadowRadius: 13.16,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: '#AAAAAA',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Compact modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  compactTextInput: {
    backgroundColor: colors.darkBackground,
    borderRadius: 8,
    padding: 12,
    color: colors.white,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.elevation3,
    marginBottom: 12,
  },
  compactExamples: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevation2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.elevation3,
  },
  quickButtonText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '500',
  },
  formatHint: {
    fontSize: 12,
    color: colors.mediumGray,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
    lineHeight: 16,
  },
  compactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  cancelButton: {
    backgroundColor: colors.elevation2,
    borderWidth: 1,
    borderColor: colors.elevation3,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  quickSetupContainer: {
    backgroundColor: colors.elevation2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  quickSetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  quickSetupText: {
    fontSize: 14,
    color: colors.mediumGray,
    lineHeight: 20,
    marginBottom: 12,
  },
  quickSetupButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  quickSetupButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '500',
  },
  pluginCard: {
    backgroundColor: colors.elevation2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.elevation3,
    minHeight: 120,
  },
  pluginCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pluginCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  pluginCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  pluginCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  pluginCardMetaText: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  // Repository management styles
  repositoriesList: {
    marginBottom: 16,
  },
  repositoryItem: {
    backgroundColor: colors.elevation2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.elevation3,
  },
  repositoryInfo: {
    flex: 1,
    marginBottom: 12,
  },
  repositoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  repositoryUrl: {
    fontSize: 13,
    color: colors.mediumGray,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  repositoryStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  repositoryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repositoryStatLabel: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  repositoryStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  repositoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  repositoryActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.elevation3,
  },
  repositoryActionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  repositoryActionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.white,
  },
  addRepositoryForm: {
    backgroundColor: colors.elevation1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addRepositoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  addRepositoryInput: {
    backgroundColor: colors.darkBackground,
    borderRadius: 8,
    padding: 12,
    color: colors.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.elevation3,
    marginBottom: 12,
  },
  addRepositoryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  addRepositoryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

interface PluginsScreenProps {
  navigation: any;
}

interface ScraperWithState extends ScraperInfo {
  enabled?: boolean;
}

export const PluginsScreen: React.FC<PluginsScreenProps> = ({ navigation }) => {
  const [scrapers, setScrapers] = useState<ScraperWithState[]>([]);
  const [repositories, setRepositories] = useState<RepositoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customRepository, setCustomRepository] = useState('');
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [newRepositoryUrl, setNewRepositoryUrl] = useState('');
  const [qualityFilter, setQualityFilter] = useState<string[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<RepositoryInfo | null>(null);
  const [showAddRepositoryModal, setShowAddRepositoryModal] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedScrapers, setSelectedScrapers] = useState<Set<string>>(new Set());
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scrapersData, repositoriesData] = await Promise.all([
        pluginService.getScrapers(),
        pluginService.getRepositories(),
      ]);

      setScrapers(scrapersData);
      setRepositories(repositoriesData);

      const currentRepo = await localScraperService.getCurrentRepository();
      if (currentRepo) {
        setCustomRepository(currentRepo.url);
      }
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleBackPress = () => {
    triggerLight();
    navigation.goBack();
  };

  const handleRepositorySelect = (repository: RepositoryInfo) => {
    triggerMedium();
    setSelectedRepository(repository);
  };

  const handleAddRepository = async () => {
    if (!newRepositoryUrl.trim()) {
      CustomAlert.alert('Error', 'Please enter a repository URL');
      return;
    }

    try {
      triggerHeavy();
      // Add repository logic
      setNewRepositoryUrl('');
      setShowAddRepositoryModal(false);
      await loadData();
    } catch (error) {
      logger.error('Failed to add repository:', error);
      CustomAlert.alert('Error', 'Failed to add repository');
    }
  };

  const handleScraperToggle = (scraperId: string) => {
    triggerLight();
    setScrapers((prev) =>
      prev.map((s) =>
        s.id === scraperId ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const handleBulkSelect = (scraperId: string) => {
    triggerLight();
    const newSelection = new Set(selectedScrapers);
    if (newSelection.has(scraperId)) {
      newSelection.delete(scraperId);
    } else {
      newSelection.add(scraperId);
    }
    setSelectedScrapers(newSelection);
  };

  const handleBulkAction = (action: string) => {
    triggerMedium();
    // Bulk action logic
  };

  const handleQualityFilterChange = (quality: string) => {
    triggerLight();
    setQualityFilter((prev) =>
      prev.includes(quality)
        ? prev.filter((q) => q !== quality)
        : [...prev, quality]
    );
  };

  const handleResetRepository = async () => {
    try {
      triggerMedium();
      await localScraperService.resetRepository();
      setCustomRepository('');
      await loadData();
      CustomAlert.alert('Success', 'Repository reset to default');
    } catch (error) {
      logger.error('Failed to reset repository:', error);
      CustomAlert.alert('Error', 'Failed to reset repository');
    }
  };

  const handleSetCustomRepository = async () => {
    if (!customRepository.trim()) {
      CustomAlert.alert('Error', 'Please enter a repository URL');
      return;
    }

    try {
      triggerHeavy();
      await localScraperService.setRepository(customRepository);
      CustomAlert.alert('Success', 'Repository updated');
      await loadData();
    } catch (error) {
      logger.error('Failed to set repository:', error);
      CustomAlert.alert('Error', 'Failed to set repository');
    }
  };

  const filteredScrapers = useMemo(() => {
    if (qualityFilter.length === 0) {
      return scrapers;
    }
    return scrapers.filter((scraper) =>
      qualityFilter.includes(scraper.quality || 'unknown')
    );
  }, [scrapers, qualityFilter]);

  const renderPluginItem = (scraper: ScraperWithState) => (
    <TouchableOpacity
      key={scraper.id}
      style={styles.pluginItem}
      onPress={() => {
        triggerLight();
        if (bulkSelectMode) {
          handleBulkSelect(scraper.id);
        }
      }}
      onLongPress={() => {
        triggerMedium();
        setBulkSelectMode(true);
        handleBulkSelect(scraper.id);
      }}
    >
      {bulkSelectMode && (
        <View style={{ marginRight: 12 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: selectedScrapers.has(scraper.id)
                ? colors.primary
                : colors.elevation3,
              borderWidth: selectedScrapers.has(scraper.id) ? 0 : 1,
              borderColor: colors.elevation3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selectedScrapers.has(scraper.id) && (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            )}
          </View>
        </View>
      )}
      {scraper.logo && (
        <FastImage
          source={{ uri: scraper.logo }}
          style={[styles.pluginLogo, scraper.enabled === false && styles.disabledImage]}
        />
      )}
      <View style={styles.pluginInfo}>
        <Text style={styles.pluginName}>{scraper.name}</Text>
        <Text style={styles.pluginDescription}>{scraper.description}</Text>
        <View style={styles.pluginMeta}>
          {scraper.version && (
            <Text style={styles.pluginVersion}>v{scraper.version}</Text>
          )}
          {scraper.version && (scraper.types || scraper.language) && (
            <Text style={styles.pluginDot}>•</Text>
          )}
          {scraper.types && (
            <Text style={styles.pluginTypes}>{scraper.types.join(', ')}</Text>
          )}
          {scraper.language && (
            <>
              {scraper.types && <Text style={styles.pluginDot}>•</Text>}
              <Text style={styles.pluginLanguage}>{scraper.language}</Text>
            </>
          )}
        </View>
      </View>
      <CustomSwitch
        value={scraper.enabled ?? true}
        onValueChange={() => handleScraperToggle(scraper.id)}
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.content, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              triggerLight();
              setBulkSelectMode(!bulkSelectMode);
              setSelectedScrapers(new Set());
            }}
          >
            <Ionicons
              name={bulkSelectMode ? 'close' : 'checkmark-done'}
              size={24}
              color={bulkSelectMode ? colors.primary : colors.mediumGray}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.headerTitle}>Plugins</Text>

        {bulkSelectMode && selectedScrapers.size > 0 && (
          <View style={[styles.section, { marginHorizontal: 16 }]}>
            <View style={styles.bulkActionsContainer}>
              <TouchableOpacity
                style={[
                  styles.bulkActionButton,
                  styles.bulkActionButtonEnabled,
                ]}
                onPress={() => handleBulkAction('enable')}
              >
                <Text style={styles.bulkActionButtonText}>Enable</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.bulkActionButton,
                  styles.bulkActionButtonEnabled,
                ]}
                onPress={() => handleBulkAction('disable')}
              >
                <Text style={styles.bulkActionButtonText}>Disable</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Plugins</Text>
          <View style={styles.qualityChipsContainer}>
            {['high', 'medium', 'low'].map((quality) => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.qualityChip,
                  qualityFilter.includes(quality) &&
                    styles.qualityChipSelected,
                ]}
                onPress={() => handleQualityFilterChange(quality)}
              >
                <Text
                  style={[
                    styles.qualityChipText,
                    qualityFilter.includes(quality) &&
                      styles.qualityChipTextSelected,
                  ]}
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredScrapers.length > 0 ? (
            <View style={styles.pluginsList}>
              {filteredScrapers.map(renderPluginItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="cube-outline"
                size={48}
                color={colors.mediumGray}
              />
              <Text style={styles.emptyStateTitle}>No Plugins</Text>
              <Text style={styles.emptyStateDescription}>
                No plugins match your filters
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repository Management</Text>

          {repositories.length > 0 && (
            <View style={styles.repositoriesList}>
              {repositories.map((repo) => (
                <TouchableOpacity
                  key={repo.id}
                  style={styles.repositoryItem}
                  onPress={() => handleRepositorySelect(repo)}
                >
                  <View style={styles.repositoryInfo}>
                    <Text style={styles.repositoryName}>{repo.name}</Text>
                    <Text style={styles.repositoryUrl}>{repo.url}</Text>
                  </View>
                  <View style={styles.repositoryActions}>
                    <TouchableOpacity
                      style={[
                        styles.repositoryActionButton,
                        selectedRepository?.id === repo.id &&
                          styles.repositoryActionButtonPrimary,
                      ]}
                      onPress={() => {
                        triggerMedium();
                        handleRepositorySelect(repo);
                      }}
                    >
                      <Text style={styles.repositoryActionButtonText}>
                        {selectedRepository?.id === repo.id
                          ? 'Selected'
                          : 'Select'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.currentRepoContainer}>
            <Text style={styles.currentRepoLabel}>Current Repository</Text>
            <Text style={styles.currentRepoUrl}>
              {customRepository || 'Default'}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter custom repository URL"
              placeholderTextColor={colors.mediumGray}
              value={customRepository}
              onChangeText={setCustomRepository}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSetCustomRepository}
              >
                <Text style={styles.buttonText}>Set Repository</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={handleResetRepository}
              >
                <Text style={styles.buttonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PluginsScreen;