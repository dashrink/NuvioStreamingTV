import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  Dimensions,
  StatusBar,
  FlatList,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ColorPicker from 'react-native-wheel-color-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../styles/colors';
import { useTheme, Theme, DEFAULT_THEMES } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../hooks/useSettings';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// Theme categories for organization
const THEME_CATEGORIES = [
  { id: 'all', name: 'All Themes' },
  { id: 'dark', name: 'Dark Themes' },
  { id: 'colorful', name: 'Colorful' },
  { id: 'custom', name: 'My Themes' },
];

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  theme,
  isSelected,
  onSelect,
  onEdit,
  onDelete
}) => {
  const handleSelect = () => {
    triggerMedium();
    onSelect();
  };

  const handleEdit = () => {
    triggerLight();
    onEdit?.();
  };

  const handleDelete = () => {
    triggerHeavy();
    onDelete?.();
  };

  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        isSelected && styles.selectedThemeCard,
        {
          borderColor: isSelected ? theme.colors.primary : 'transparent',
          backgroundColor: Platform.OS === 'ios'
            ? `${theme.colors.darkBackground}60`
            : 'rgba(255, 255, 255, 0.07)'
        }
      ]}
      onPress={handleSelect}
      activeOpacity={0.7}
    >
      <View style={styles.themeCardHeader}>
        <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>
          {theme.name}
        </Text>
        {isSelected && (
          <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />
        )}
      </View>
      
      <View style={styles.colorPreviewContainer}>
        <View style={[styles.colorPreview, { backgroundColor: theme.colors.primary }, styles.colorPreviewShadow]} />
        <View style={[styles.colorPreview, { backgroundColor: theme.colors.secondary }, styles.colorPreviewShadow]} />
        <View style={[styles.colorPreview, { backgroundColor: theme.colors.darkBackground }, styles.colorPreviewShadow]} />
      </View>
      
      {theme.isEditable && (
        <View style={styles.themeCardActions}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.themeCardAction, styles.buttonShadow]}
              onPress={handleEdit}
            >
              <MaterialIcons name="edit" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.themeCardAction, styles.buttonShadow]}
              onPress={handleDelete}
            >
              <MaterialIcons name="delete" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Filter tab component
interface FilterTabProps {
  category: { id: string; name: string };
  isActive: boolean;
  onPress: () => void;
  primaryColor: string;
}

const FilterTab: React.FC<FilterTabProps> = ({
  category,
  isActive,
  onPress,
  primaryColor
}) => {
  const handlePress = () => {
    triggerLight();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.filterTab,
        isActive && { backgroundColor: primaryColor },
        styles.buttonShadow
      ]}
      onPress={handlePress}
    >
      <Text
        style={[
          styles.filterTabText,
          isActive && { color: '#FFFFFF' }
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

type ColorKey = 'primary' | 'secondary' | 'darkBackground';

interface ThemeColorEditorProps {
  initialColors: {
    primary: string;
    secondary: string;
    darkBackground: string;
  };
  onSave: (colors: {
    primary: string;
    secondary: string;
    darkBackground: string;
    name: string;
  }) => void;
  onCancel: () => void;
}

// Accept alert state setters as props
const ThemeColorEditor: React.FC<ThemeColorEditorProps & {
  setAlertTitle: (s: string) => void;
  setAlertMessage: (s: string) => void;
  setAlertActions: (a: any[]) => void;
  setAlertVisible: (v: boolean) => void;
}> = ({
  initialColors,
  onSave,
  onCancel,
  setAlertTitle,
  setAlertMessage,
  setAlertActions,
  setAlertVisible
}) => {
  const [themeName, setThemeName] = useState('Custom Theme');
  const [selectedColorKey, setSelectedColorKey] = useState<ColorKey>('primary');
  const [themeColors, setThemeColors] = useState({
    primary: initialColors.primary,
    secondary: initialColors.secondary,
    darkBackground: initialColors.darkBackground,
  });

  const handleColorChange = useCallback((color: string) => {
    setThemeColors(prev => ({
      ...prev,
      [selectedColorKey]: color,
    }));
  }, [selectedColorKey]);

  const handleSave = () => {
    triggerMedium();
    if (!themeName.trim()) {
      setAlertTitle('Invalid Name');
      setAlertMessage('Please enter a valid theme name');
      setAlertActions([{ label: 'OK', onPress: () => {} }]);
      setAlertVisible(true);
      return;
    }
    onSave({
      ...themeColors,
      name: themeName
    });
  };

  const handleCancel = () => {
    triggerLight();
    onCancel();
  };

  const handleColorKeySelect = (colorKey: ColorKey) => {
    triggerLight();
    setSelectedColorKey(colorKey);
  };

  // Compact preview component
  const ThemePreview = () => (
    <View style={[styles.previewContainer, { backgroundColor: themeColors.darkBackground }]}>
      <View style={styles.previewContent}>
        {/* App header */}
        <View style={styles.previewHeader}>
          <View style={styles.previewHeaderTitle} />
          <View style={styles.previewIconGroup}>
            <View style={styles.previewIcon} />
            <View style={styles.previewIcon} />
          </View>
        </View>
        
        {/* Content area */}
        <View style={styles.previewBody}>
          {/* Featured content poster */}
          <View style={styles.previewFeatured}>
            <View style={styles.previewPosterGradient} />
            <View style={styles.previewTitle} />
            <View style={styles.previewButtonRow}>
              <View style={[styles.previewPlayButton, { backgroundColor: themeColors.primary }]} />
              <View style={styles.previewActionButton} />
            </View>
          </View>
          
          {/* Content row */}
          <View style={styles.previewSectionHeader}>
            <View style={styles.previewSectionTitle} />
          </View>
          <View style={styles.previewPosterRow}>
            <View style={styles.previewPoster} />
            <View style={styles.previewPoster} />
            <View style={styles.previewPoster} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.editorContainer}>
      <View style={styles.editorHeader}>
        <TouchableOpacity
          style={styles.editorBackButton}
          onPress={handleCancel}
        >
          <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TextInput
          style={styles.editorTitleInput}
          value={themeName}
          onChangeText={setThemeName}
          placeholder="Theme name"
          placeholderTextColor="rgba(255,255,255,0.5)"
        />
        <TouchableOpacity
          style={styles.editorSaveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.editorBody}>
        <View style={styles.colorSectionRow}>
          <ThemePreview />
          
          <View style={styles.colorButtonsColumn}>
            <TouchableOpacity
              style={[
                styles.colorSelectorButton,
                selectedColorKey === 'primary' && styles.selectedColorButton,
                { backgroundColor: themeColors.primary }
              ]}
              onPress={() => handleColorKeySelect('primary')}
            >
              <Text style={styles.colorButtonText}>Primary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.colorSelectorButton,
                selectedColorKey === 'secondary' && styles.selectedColorButton,
                { backgroundColor: themeColors.secondary }
              ]}
              onPress={() => handleColorKeySelect('secondary')}
            >
              <Text style={styles.colorButtonText}>Secondary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.colorSelectorButton,
                selectedColorKey === 'darkBackground' && styles.selectedColorButton,
                { backgroundColor: themeColors.darkBackground }
              ]}
              onPress={() => handleColorKeySelect('darkBackground')}
            >
              <Text style={styles.colorButtonText}>Background</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.colorPickerContainer}>
          <ColorPicker
            color={themeColors[selectedColorKey]}
            onColorChange={handleColorChange}
            thumbSize={22}
            sliderSize={22}
            noSnap={true}
            row={false}
          />
        </View>
      </View>
    </View>
  );
};

const ThemeScreen: React.FC = () => {
  const {
    currentTheme,
    availableThemes,
    setCurrentTheme,
    addCustomTheme,
    updateCustomTheme,
    deleteCustomTheme
  } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting } = useSettings();

  // Calculate proper header top padding (only needed on Android since iOS uses SafeAreaView)
  const headerTopPadding = Platform.OS === 'android'
    ? ANDROID_STATUSBAR_HEIGHT + 8
    : 8;
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<any[]>([]);

  // Force consistent status bar settings
  useEffect(() => {
    const applyStatusBarConfig = () => {
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
      }
    };
    
    applyStatusBarConfig();
    
    // Re-apply on focus
    const unsubscribe = navigation.addListener('focus', applyStatusBarConfig);
    return unsubscribe;
  }, [navigation]);

  // Filter themes based on selected category
  const filteredThemes = useMemo(() => {
    switch (activeFilter) {
      case 'dark':
        // Themes with darker colors
        return availableThemes.filter(theme => 
          !theme.isEditable && 
          theme.id !== 'neon' && 
          theme.id !== 'retro'
        );
      case 'colorful':
        // Themes with vibrant colors
        return availableThemes.filter(theme => 
          !theme.isEditable && 
          (theme.id === 'neon' || 
           theme.id === 'retro' || 
           theme.id === 'sunset' || 
           theme.id === 'amber')
        );
      case 'custom':
        // User's custom themes
        return availableThemes.filter(theme => theme.isEditable);
      default:
        // All themes
        return availableThemes;
    }
  }, [availableThemes, activeFilter]);

  const handleThemeSelect = useCallback((themeId: string) => {
    setCurrentTheme(themeId);
  }, [setCurrentTheme]);

  const handleEditTheme = useCallback((theme: Theme) => {
    setEditingTheme(theme);
    setIsEditMode(true);
  }, []);

  const handleDeleteTheme = useCallback((theme: Theme) => {
    setAlertTitle('Delete Theme');
    setAlertMessage(`Are you sure you want to delete "${theme.name}"?`);
    setAlertActions([
      { label: 'Cancel', style: { color: '#888' }, onPress: () => {} },
      {
        label: 'Delete',
        style: { color: currentTheme.colors.error },
        onPress: () => deleteCustomTheme(theme.id),
      },
    ]);
    setAlertVisible(true);
  }, [deleteCustomTheme, currentTheme.colors.error]);

  const handleCreateTheme = useCallback(() => {
    setEditingTheme(null);
    setIsEditMode(true);
  }, []);

  const handleSaveTheme = useCallback((themeData: any) => {
    if (editingTheme) {
      // Update existing theme
      updateCustomTheme({
        ...editingTheme,
        name: themeData.name || editingTheme.name,
        colors: {
          ...editingTheme.colors,
          primary: themeData.primary,
          secondary: themeData.secondary,
          darkBackground: themeData.darkBackground,
        }
      });
    } else {
      // Create new theme
      addCustomTheme({
        name: themeData.name || 'Custom Theme',
        colors: {
          ...currentTheme.colors,
          primary: themeData.primary,
          secondary: themeData.secondary,
          darkBackground: themeData.darkBackground,
        }
      });
    }
    
    setIsEditMode(false);
    setEditingTheme(null);
  }, [editingTheme, updateCustomTheme, addCustomTheme, currentTheme]);

  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
    setEditingTheme(null);
  }, []);

  // Handle system back button when in edit mode
  useEffect(() => {
    if (isEditMode) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleCancelEdit();
        return true; // Prevent default behavior
      });

      return () => backHandler.remove();
    }
  }, [isEditMode, handleCancelEdit]);

  // Pass alert state to ThemeColorEditor
  const ThemeColorEditorWithAlert = (props: any) => {
    const handleSave = (themeName: string, themeColors: any, onSave: any) => {
      if (!themeName.trim()) {
        setAlertTitle('Invalid Name');
        setAlertMessage('Please enter a valid theme name');
        setAlertActions([{ label: 'OK', onPress: () => {} }]);
        setAlertVisible(true);
        return false;
      }
      onSave();
      return true;
    };
    return (
      <>
        <ThemeColorEditor {...props} handleSave={handleSave} />
        <CustomAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          actions={alertActions}
          onClose={() => setAlertVisible(false)}
        />
      </>
    );
  };

  if (isEditMode) {
    const initialColors = editingTheme ? {
      primary: editingTheme.colors.primary,
      secondary: editingTheme.colors.secondary,
      darkBackground: editingTheme.colors.darkBackground,
    } : {
      primary: currentTheme.colors.primary,
      secondary: currentTheme.colors.secondary,
      darkBackground: currentTheme.colors.darkBackground,
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
        <ThemeColorEditor
          initialColors={initialColors}
          onSave={handleSaveTheme}
          onCancel={handleCancelEdit}
          setAlertTitle={setAlertTitle}
          setAlertMessage={setAlertMessage}
          setAlertActions={setAlertActions}
          setAlertVisible={setAlertVisible}
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
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
      <View style={[styles.headerContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
            Themes
          </Text>
          <TouchableOpacity 
            style={[styles.createThemeButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handleCreateTheme}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabsContainer}>
          {THEME_CATEGORIES.map(category => (
            <FilterTab
              key={category.id}
              category={category}
              isActive={activeFilter === category.id}
              onPress={() => setActiveFilter(category.id)}
              primaryColor={currentTheme.colors.primary}
            />
          ))}
        </ScrollView>
      </View>

      {/* Themes grid */}
      <FlatList
        data={filteredThemes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.themeGridContainer,
          { paddingBottom: insets.bottom + 20 }
        ]}
        renderItem={({ item: theme }) => (
          <ThemeCard
            theme={theme}
            isSelected={currentTheme.id === theme.id}
            onSelect={() => handleThemeSelect(theme.id)}
            onEdit={() => handleEditTheme(theme)}
            onDelete={() => handleDeleteTheme(theme)}
          />
        )}
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
  headerContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  createThemeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabsContainer: {
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  themeGridContainer: {
    paddingHorizontal: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  themeCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    marginHorizontal: 6,
  },
  selectedThemeCard: {
    borderWidth: 3,
  },
  themeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorPreviewContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  colorPreviewShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  themeCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeCardAction: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  editorBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorTitleInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  editorSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  editorBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  colorSectionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  previewContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    overflow: 'hidden',
  },
  previewContent: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewHeaderTitle: {
    width: 60,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  previewIconGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  previewIcon: {
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  previewBody: {
    flex: 1,
  },
  previewFeatured: {
    marginBottom: 8,
  },
  previewPosterGradient: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 4,
  },
  previewTitle: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 4,
    width: '60%',
  },
  previewButtonRow: {
    flexDirection: 'row',
    gap: 4,
  },
  previewPlayButton: {
    flex: 1,
    height: 20,
    borderRadius: 4,
  },
  previewActionButton: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  previewSectionHeader: {
    marginBottom: 6,
  },
  previewSectionTitle: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    width: 40,
  },
  previewPosterRow: {
    flexDirection: 'row',
    gap: 4,
  },
  previewPoster: {
    flex: 1,
    aspectRatio: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  colorButtonsColumn: {
    gap: 8,
    justifyContent: 'flex-start',
  },
  colorSelectorButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  selectedColorButton: {
    borderColor: '#FFFFFF',
  },
  colorButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  colorPickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ThemeScreen;