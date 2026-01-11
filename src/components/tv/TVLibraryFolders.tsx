import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Focusable from '../common/Focusable';
import { useFocusGroup } from '../../hooks/useFocusGroup';
import { useTheme } from '../../contexts/ThemeContext';
import { TV_SPACING } from '../../utils/tvStyles/spacing';
import { TV_TYPOGRAPHY } from '../../utils/tvStyles/typography';
import { TV_FOCUS_CONFIG } from '../../utils/tvStyles/focus';
import { isTV, getDeviceType } from '../../utils/tvStyles/deviceDetection';
import { scaleForTV } from '../../utils/tvStyles/helpers';

/**
 * Folder definition for library collections
 */
export interface LibraryFolder {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  itemCount: number;
  description?: string;
  color?: string;
}

/**
 * Props for TVLibraryFolders component
 */
export interface TVLibraryFoldersProps {
  /** Array of folders to display */
  folders: LibraryFolder[];
  /** Callback when a folder is selected */
  onFolderPress: (folder: LibraryFolder) => void;
  /** Currently selected folder ID */
  selectedFolderId?: string | null;
  /** Title for the folders section */
  title?: string;
  /** Whether folders should auto-focus */
  autoFocus?: boolean;
  /** Focus group ID */
  focusGroupId?: string;
}

/**
 * Calculate folder grid layout for TV
 */
const getFolderGridLayout = (screenWidth: number, folderCount: number): {
  numColumns: number;
  itemWidth: number;
  horizontalPadding: number;
} => {
  const deviceType = getDeviceType(screenWidth);
  const horizontalPadding = TV_SPACING.screenPadding;
  const gutter = TV_SPACING.cardGap;

  // Show folders in a single row on TV for easy navigation
  let numColumns = Math.min(folderCount, isTV ? 5 : 4);
  if (deviceType === 'phone') {
    numColumns = Math.min(folderCount, 3);
  }

  const availableWidth = screenWidth - (horizontalPadding * 2) - ((numColumns - 1) * gutter);
  const itemWidth = Math.floor(availableWidth / numColumns);

  return { numColumns, itemWidth, horizontalPadding };
};

/**
 * Individual folder card component
 */
const FolderCard = React.memo<{
  folder: LibraryFolder;
  width: number;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onPress: () => void;
  onFocus: () => void;
  currentTheme: any;
  getItemRef: (index: number) => (ref: any) => void;
}>(({
  folder,
  width,
  index,
  isSelected,
  isFocused,
  onPress,
  onFocus,
  currentTheme,
  getItemRef,
}) => {
  const folderColor = folder.color || currentTheme.colors.primary;

  return (
    <Focusable
      ref={getItemRef(index)}
      style={[
        styles.folderCard,
        {
          width,
          backgroundColor: isSelected
            ? currentTheme.colors.elevation2
            : currentTheme.colors.elevation1,
        },
      ]}
      onPress={onPress}
      onFocus={onFocus}
      hasTVPreferredFocus={isFocused && index === 0}
      scaleOnFocus={TV_FOCUS_CONFIG.focusScale}
    >
      <View style={styles.folderContent}>
        {/* Icon container with colored background */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${folderColor}20` },
          ]}
        >
          <MaterialIcons
            name={folder.icon}
            size={scaleForTV(32)}
            color={folderColor}
          />
        </View>

        {/* Folder info */}
        <View style={styles.folderInfo}>
          <Text
            style={[
              styles.folderName,
              { color: currentTheme.colors.white },
            ]}
            numberOfLines={1}
          >
            {folder.name}
          </Text>

          <Text
            style={[
              styles.folderCount,
              { color: currentTheme.colors.mediumGray },
            ]}
          >
            {folder.itemCount} {folder.itemCount === 1 ? 'item' : 'items'}
          </Text>

          {folder.description && (
            <Text
              style={[
                styles.folderDescription,
                { color: currentTheme.colors.mediumGray },
              ]}
              numberOfLines={1}
            >
              {folder.description}
            </Text>
          )}
        </View>

        {/* Selected indicator */}
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialIcons
              name="check-circle"
              size={scaleForTV(20)}
              color={currentTheme.colors.primary}
            />
          </View>
        )}

        {/* Navigation arrow for TV */}
        {isTV && (
          <MaterialIcons
            name="chevron-right"
            size={scaleForTV(24)}
            color={currentTheme.colors.mediumGray}
            style={styles.chevron}
          />
        )}
      </View>
    </Focusable>
  );
});

FolderCard.displayName = 'FolderCard';

/**
 * TVLibraryFolders - A TV-optimized component for displaying library folders
 *
 * Features:
 * - Horizontal folder navigation with D-pad support
 * - Visual focus indicators for TV
 * - Selected folder highlighting
 * - Accessible folder cards with icons and counts
 */
export const TVLibraryFolders: React.FC<TVLibraryFoldersProps> = ({
  folders,
  onFolderPress,
  selectedFolderId,
  title = 'Collections',
  autoFocus = false,
  focusGroupId = 'tv-library-folders',
}) => {
  const { width } = useWindowDimensions();
  const { currentTheme } = useTheme();

  // Calculate grid layout
  const { numColumns, itemWidth, horizontalPadding } = useMemo(
    () => getFolderGridLayout(width, folders.length),
    [width, folders.length]
  );

  // Use focus group for folder navigation
  const {
    focusedIndex,
    focusItem,
    getItemRef,
  } = useFocusGroup({
    id: focusGroupId,
    autoFocus: autoFocus && isTV,
    trapFocus: false,
    rememberFocus: true,
  });

  // Handle folder press
  const handleFolderPress = useCallback(
    (folder: LibraryFolder, index: number) => {
      focusItem(index);
      onFolderPress(folder);
    },
    [onFolderPress, focusItem]
  );

  // Handle focus change
  const handleFocusChange = useCallback(
    (index: number) => {
      focusItem(index);
    },
    [focusItem]
  );

  if (folders.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      {/* Section title */}
      {title && (
        <Text
          style={[
            styles.sectionTitle,
            { color: currentTheme.colors.white },
          ]}
        >
          {title}
        </Text>
      )}

      {/* Folder grid */}
      <View style={styles.foldersGrid}>
        {folders.map((folder, index) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            width={itemWidth}
            index={index}
            isSelected={selectedFolderId === folder.id}
            isFocused={focusedIndex === index}
            onPress={() => handleFolderPress(folder, index)}
            onFocus={() => handleFocusChange(index)}
            currentTheme={currentTheme}
            getItemRef={getItemRef}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: TV_SPACING.xl,
  },
  sectionTitle: {
    fontSize: TV_TYPOGRAPHY.headlineSmall,
    fontWeight: '700',
    marginBottom: TV_SPACING.md,
    letterSpacing: 0.5,
  },
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TV_SPACING.cardGap,
  },
  folderCard: {
    borderRadius: 12,
    overflow: 'hidden',
    // Shadow/elevation
    elevation: Platform.OS === 'android' ? 2 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  folderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TV_SPACING.md,
  },
  iconContainer: {
    width: scaleForTV(56),
    height: scaleForTV(56),
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: TV_SPACING.md,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: TV_TYPOGRAPHY.titleMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  folderCount: {
    fontSize: TV_TYPOGRAPHY.labelMedium,
  },
  folderDescription: {
    fontSize: TV_TYPOGRAPHY.labelSmall,
    marginTop: 2,
  },
  selectedIndicator: {
    marginLeft: TV_SPACING.sm,
  },
  chevron: {
    marginLeft: TV_SPACING.sm,
  },
});

export default TVLibraryFolders;
