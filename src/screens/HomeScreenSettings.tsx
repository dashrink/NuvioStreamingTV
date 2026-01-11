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
  useColorScheme,
  Animated,
  Dimensions
} from 'react-native';
import { useSettings } from '../hooks/useSettings';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import CustomSwitch from '../components/common/CustomSwitch';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

interface SettingsCardProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  colors: any;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ children, isDarkMode, colors }) => (
  <View style={[
    styles.card,
    { backgroundColor: isDarkMode ? colors.elevation2 : colors.white }
  ]}>
    {children}
  </View>
);

// Restrict icon names to those available in MaterialIcons
type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface SettingItemProps {
  title: string;
  description?: string;
  icon: MaterialIconName;
  renderControl: () => React.ReactNode;
  isLast?: boolean;
  onPress?: () => void;
  isDarkMode: boolean;
  colors: any;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  icon,
  renderControl,
  isLast = false,
  onPress,
  isDarkMode,
  colors
}) => {
  const isTabletDevice = Platform.OS !== 'web' && (Dimensions.get('window').width >= 768);

  const handlePress = onPress
    ? () => {
        triggerLight();
        onPress();
      }
    : undefined;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={handlePress}
      style={[
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
      ]}
    >
      <View style={styles.settingIconContainer}>
        <MaterialIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <View style={styles.settingTitleRow}>
          <Text style={[styles.settingTitle, { color: isDarkMode ? colors.highEmphasis : colors.textDark }]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.settingDescription, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingControl}>
        {renderControl()}
      </View>
    </TouchableOpacity>
  );
};

const SectionHeader: React.FC<{ title: string; isDarkMode: boolean; colors: any }> = ({ title, isDarkMode, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={[
      styles.sectionHeaderText,
      { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }
    ]}>
      {title}
    </Text>
  </View>
);

const HomeScreenSettings: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const systemColorScheme = useColorScheme();
  const { currentTheme } = useTheme();
  const colors = currentTheme.colors;
  const isDarkMode = systemColorScheme === 'dark' || settings.enableDarkMode;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const isTabletDevice = Platform.OS !== 'web' && (Dimensions.get('window').width >= 768);

  // Prevent iOS entrance flicker by restoring a non-translucent StatusBar
  useFocusEffect(
    React.useCallback(() => {
      try {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor(isDarkMode ? colors.darkBackground : '#F2F2F7');
        StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
        if (Platform.OS === 'ios') {
          StatusBar.setHidden(false);
        }
      } catch { }
      return () => { };
    }, [isDarkMode, colors.darkBackground])
  );

  const handleBack = useCallback(() => {
    triggerLight();
    navigation.goBack();
  }, [navigation]);

  // Fade in/out animation for the "Changes saved" indicator
  useEffect(() => {
    if (showSavedIndicator) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.delay(1000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => setShowSavedIndicator(false));
    }
  }, [showSavedIndicator, fadeAnim]);

  const handleUpdateSetting = useCallback(<K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    updateSetting(key, value);
    setShowSavedIndicator(true);
  }, [updateSetting]);

  // Ensure carousel is the default hero layout on tablets for all users
  useEffect(() => {
    try {
      // Don't force carousel on TV platforms - let user choose their preferred hero style
      if (isTabletDevice && !Platform.isTV && settings.heroStyle !== 'carousel') {
        updateSetting('heroStyle', 'carousel' as any);
      }
    } catch { }
  }, [isTabletDevice, settings.heroStyle, updateSetting]);

  // Radio button component for content source selection
  const RadioOption = ({ selected, onPress, label }: { selected: boolean, onPress: () => void, label: string }) => (
    <TouchableOpacity
      style={styles.radioOption}
      onPress={() => {
        triggerLight();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.radioContainer}>
        <View style={[
          styles.radio,
          { borderColor: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }
        ]}>
          {selected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
        </View>
        <Text style={[
          styles.radioLabel,
          { color: isDarkMode ? colors.highEmphasis : colors.textDark }
        ]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Compact segmented control for nicer toggles
  const SegmentedControl = ({
    options,
    value,
    onChange
  }: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (val: string) => void;
  }) => (
    <View style={[styles.segmentContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
      {options.map((opt, idx) => {
        const selected = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => {
              triggerLight();
              onChange(opt.value);
            }}
            activeOpacity={0.85}
            style={[
              styles.segment,
              idx === 0 && styles.segmentFirst,
              idx === options.length - 1 && styles.segmentLast,
              selected && { backgroundColor: colors.primary },
            ]}
          >
            <Text style={{
              color: selected ? colors.white : (isDarkMode ? colors.highEmphasis : colors.textDark),
              fontWeight: '700',
              fontSize: 13,
            }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Format selected catalogs text
  const getSelectedCatalogsText = useCallback(() => {
    if (!settings.selectedHeroCatalogs || settings.selectedHeroCatalogs.length === 0) {
      return "All catalogs";
    } else {
      return `${settings.selectedHeroCatalogs.length} selected`;
    }
  }, [settings.selectedHeroCatalogs]);

  const ChevronRight = () => (
    <MaterialIcons
      name="chevron-right"
      size={24}
      color={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
    />
  );

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? colors.darkBackground : '#F2F2F7' }
    ]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={isDarkMode ? colors.highEmphasis : colors.textDark}
          />
          <Text style={[styles.backText, { color: isDarkMode ? colors.highEmphasis : colors.textDark }]}>
            Settings
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {/* Empty for now, but ready for future actions */}
        </View>
      </View>

      <Text style={[styles.headerTitle, { color: isDarkMode ? colors.highEmphasis : colors.textDark }]}>
        Home Screen Settings
      </Text>

      {/* Saved indicator */}
      <Animated.View
        style={[
          styles.savedIndicator,
          {
            opacity: fadeAnim,
            backgroundColor: isDarkMode ? 'rgba(0, 180, 150, 0.9)' : 'rgba(0, 180, 150, 0.9)'
          }
        ]}
        pointerEvents="none"
      >
        <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
        <Text style={styles.savedIndicatorText}>Changes Applied</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SectionHeader title="DISPLAY OPTIONS" isDarkMode={isDarkMode} colors={colors} />
        <SettingsCard isDarkMode={isDarkMode} colors={colors}>
          <SettingItem
            title="Show Hero Section"
            description="Featured content at the top"
            icon="movie-filter"
            isDarkMode={isDarkMode}
            colors={colors}
            renderControl={() => (
              <CustomSwitch
                value={settings.showHeroSection}
                onValueChange={(value) => {
                  triggerMedium();
                  handleUpdateSetting('showHeroSection', value);
                }}
              />
            )}
          />
          <SettingItem
            title="Show This Week Section"
            description="New episodes from current week"
            icon="date-range"
            isDarkMode={isDarkMode}
            colors={colors}
            renderControl={() => (
              <CustomSwitch
                value={settings.showThisWeekSection}
                onValueChange={(value) => {
                  triggerMedium();
                  handleUpdateSetting('showThisWeekSection', value);
                }}
              />
            )}
          />
          {settings.showHeroSection && (
            <SettingItem
              title="Select Catalogs"
              description={getSelectedCatalogsText()}
              icon="list"
              isDarkMode={isDarkMode}
              colors={colors}
              renderControl={ChevronRight}
              onPress={() => navigation.navigate('HeroCatalogs')}
              isLast={true}
            />
          )}
        </SettingsCard>

        {settings.showHeroSection && (
          <>
            {!isTabletDevice && (
              <View style={styles.segmentCard}>
                <Text style={[styles.segmentTitle, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>Hero Layout</Text>
                <SegmentedControl
                  options={[
                    { label: 'Legacy', value: 'legacy' },
                    { label: 'Carousel', value: 'carousel' },
                    { label: 'Apple TV', value: 'appletv' }
                  ]}
                  value={settings.heroStyle}
                  onChange={(val) => handleUpdateSetting('heroStyle', val as any)}
                />
                <Text style={[styles.segmentHint, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>Full-width banner, swipeable cards, or Apple TV style</Text>
              </View>
            )}

            <View style={styles.segmentCard}>
              <Text style={[styles.segmentTitle, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>Featured Source</Text>
              <Text style={[styles.segmentHint, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>Using Catalogs</Text>
              <TouchableOpacity
                onPress={() => {
                  triggerLight();
                  navigation.navigate('HeroCatalogs');
                }}
                style={[styles.manageLink, { backgroundColor: isDarkMode ? colors.elevation1 : 'rgba(0,0,0,0.04)' }]}
                activeOpacity={0.8}
              >
                <Text style={{ color: isDarkMode ? colors.highEmphasis : colors.textDark, fontWeight: '600' }}>Manage selected catalogs</Text>
                <MaterialIcons name="chevron-right" size={20} color={isDarkMode ? colors.mediumEmphasis : colors.textMutedDark} />
              </TouchableOpacity>
            </View>

            {settings.heroStyle === 'carousel'&& (
              <SettingsCard isDarkMode={isDarkMode} colors={colors}>
                <SettingItem
                  title="Dynamic Hero Background"
                  description="Blurred banner behind carousel"
                  icon="wallpaper"
                  isDarkMode={isDarkMode}
                  colors={colors}
                  renderControl={() => (
                    <CustomSwitch
                      value={settings.enableHomeHeroBackground}
                      onValueChange={(value) => {
                        triggerMedium();
                        handleUpdateSetting('enableHomeHeroBackground', value);
                      }}
                    />
                  )}
                />
                <Text style={[styles.settingInlineNote, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>May impact performance on low-end devices.</Text>
              </SettingsCard>
            )}
          </>
        )}

        <SettingsCard isDarkMode={isDarkMode} colors={colors}>
          <Text style={[styles.cardHeader, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>Posters</Text>
          <View style={styles.settingsRowInline}>
            <Text style={[styles.rowLabel, { color: isDarkMode ? colors.highEmphasis : colors.textDark }]}>Show Titles</Text>
            <CustomSwitch
              value={settings.showPosterTitles}
              onValueChange={(value) => {
                triggerMedium();
                handleUpdateSetting('showPosterTitles', value);
              }}
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: isDarkMode ? colors.highEmphasis : colors.textDark }]}>Poster Size</Text>
            <SegmentedControl
              options={[{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }]}
              value={settings.posterSize}
              onChange={(val) => handleUpdateSetting('posterSize', val as any)}
            />
          </View>

          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: isDarkMode ? colors.highEmphasis : colors.textDark }]}>Poster Corners</Text>
            <SegmentedControl
              options={[{ label: 'Sharp', value: 'sharp' }, { label: 'Round', value: 'round' }]}
              value={settings.posterCorners}
              onChange={(val) => handleUpdateSetting('posterCorners', val as any)}
            />
          </View>
        </SettingsCard>

        <SettingsCard isDarkMode={isDarkMode} colors={colors}>
          <Text style={[styles.cardHeader, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>Appearance</Text>
          <View style={styles.settingsRowInline}>
            <Text style={[styles.rowLabel, { color: isDarkMode ? colors.highEmphasis : colors.textDark }]}>Dark Mode</Text>
            <CustomSwitch
              value={settings.enableDarkMode}
              onValueChange={(value) => {
                triggerMedium();
                handleUpdateSetting('enableDarkMode', value);
              }}
            />
          </View>
        </SettingsCard>

        <SettingsCard isDarkMode={isDarkMode} colors={colors}>
          <Text style={[styles.cardHeader, { color: isDarkMode ? colors.mediumEmphasis : colors.textMutedDark }]}>Content</Text>
          <View style={styles.settingsRowInline}>
            <Text style={[styles.rowLabel, { color: isDarkMode ? colors.highEmphasis : colors.textDark }]}>NSFW Content</Text>
            <CustomSwitch
              value={settings.showNSFW}
              onValueChange={(value) => {
                triggerMedium();
                handleUpdateSetting('showNSFW', value);
              }}
            />
          </View>
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 16
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginHorizontal: 16,
    marginBottom: 16
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden'
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  settingItemBorder: {
    borderBottomWidth: 1
  },
  settingIconContainer: {
    marginRight: 16,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingContent: {
    flex: 1
  },
  settingTitleRow: {
    marginBottom: 4
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2
  },
  settingControl: {
    marginLeft: 12
  },
  radioOption: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500'
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginVertical: 12
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6
  },
  segmentFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6
  },
  segmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6
  },
  segmentCard: {
    marginBottom: 16,
    paddingHorizontal: 0
  },
  segmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16
  },
  segmentHint: {
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 16
  },
  manageLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingTop: 8
  },
  settingsRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  settingsRow: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8
  },
  settingInlineNote: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic'
  },
  savedIndicator: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000
  },
  savedIndicatorText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14
  }
});

export default HomeScreenSettings;