import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';

type IconLibrary = 'MaterialIcons' | 'Ionicons' | 'MaterialCommunityIcons';

interface IconConfig {
  name: string;
  size?: number;
  library?: IconLibrary;
}

interface ActionConfig {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon: IconConfig;
  title: string;
  subtitle?: string;
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
  style?: object;
}

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  style,
}) => {
  const { currentTheme } = useTheme();

  const getIconSize = () => {
    return icon.size || 64;
  };

  const renderIcon = () => {
    const iconSize = getIconSize();
    const iconColor = currentTheme.colors.lightGray;
    const iconName = icon.name;
    const library = icon.library || 'MaterialIcons';

    switch (library) {
      case 'Ionicons':
        return (
          <Ionicons
            name={iconName as keyof typeof Ionicons.glyphMap}
            size={iconSize}
            color={iconColor}
          />
        );
      case 'MaterialCommunityIcons':
        return (
          <MaterialCommunityIcons
            name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
            size={iconSize}
            color={iconColor}
          />
        );
      case 'MaterialIcons':
      default:
        return (
          <MaterialIcons
            name={iconName as keyof typeof MaterialIcons.glyphMap}
            size={iconSize}
            color={iconColor}
          />
        );
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>{renderIcon()}</View>
      <Text style={[styles.title, { color: currentTheme.colors.white }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: currentTheme.colors.lightGray }]}>{subtitle}</Text>
      )}
      {primaryAction && (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: currentTheme.colors.primary,
              shadowColor: currentTheme.colors.black,
            },
          ]}
          onPress={primaryAction.onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.primaryButtonText, { color: currentTheme.colors.white }]}>
            {primaryAction.label}
          </Text>
        </TouchableOpacity>
      )}
      {secondaryAction && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={secondaryAction.onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryButtonText, { color: currentTheme.colors.primary }]}>
            {secondaryAction.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 64 : 32,
    paddingBottom: isTablet ? 120 : 100,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isTablet ? 16 : 14,
    textAlign: 'center',
    lineHeight: isTablet ? 24 : 20,
    marginBottom: 24,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: isTablet ? 32 : 24,
    borderRadius: 24,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EmptyState;
