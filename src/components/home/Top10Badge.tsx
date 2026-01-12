import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';

export type BadgeStyle = 'disney' | 'appletv' | 'numbered' | 'minimal';

interface Top10BadgeProps {
  rank: number;
  style?: BadgeStyle;
}

export const Top10Badge: React.FC<Top10BadgeProps> = ({ rank, style = 'disney' }) => {
  const { currentTheme } = useTheme();

  if (rank < 1 || rank > 10) {
    return null;
  }

  const renderDisneyStyle = () => (
    <View style={styles.disneyContainer}>
      <LinearGradient
        colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.disneyGradient}
      >
        <View style={styles.disneyInner}>
          <Text style={styles.disneyRank}>{rank}</Text>
          <Text style={styles.disneyLabel}>TOP 10</Text>
        </View>
      </LinearGradient>
      <View style={[styles.disneyShadow, { backgroundColor: currentTheme.colors.background }]} />
    </View>
  );

  const renderAppleTVStyle = () => (
    <View style={styles.appleContainer}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.appleGradient}
      >
        <View style={styles.appleInner}>
          <Text style={styles.appleNumber}>{rank}</Text>
        </View>
      </LinearGradient>
      <View style={styles.appleBadge}>
        <Text style={styles.appleText}>TOP 10</Text>
      </View>
    </View>
  );

  const renderNumberedStyle = () => (
    <View style={[styles.numberedContainer, { backgroundColor: currentTheme.colors.primary }]}>
      <Text style={[styles.numberedText, { color: currentTheme.colors.primaryText }]}>#{rank}</Text>
    </View>
  );

  const renderMinimalStyle = () => (
    <View
      style={[
        styles.minimalContainer,
        {
          backgroundColor: currentTheme.colors.background,
          borderColor: currentTheme.colors.primary,
        },
      ]}
    >
      <Text style={[styles.minimalText, { color: currentTheme.colors.text }]}>{rank}</Text>
    </View>
  );

  const renderBadge = () => {
    switch (style) {
      case 'disney':
        return renderDisneyStyle();
      case 'appletv':
        return renderAppleTVStyle();
      case 'numbered':
        return renderNumberedStyle();
      case 'minimal':
        return renderMinimalStyle();
      default:
        return renderDisneyStyle();
    }
  };

  return <View style={styles.container}>{renderBadge()}</View>;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  // Disney+ Style
  disneyContainer: {
    position: 'relative',
  },
  disneyGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  disneyInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disneyRank: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disneyLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginTop: -2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  disneyShadow: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    opacity: 0.1,
    zIndex: -1,
  },
  // Apple TV+ Style
  appleContainer: {
    position: 'relative',
  },
  appleGradient: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  appleInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
  },
  appleBadge: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  appleText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Numbered Style
  numberedContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 6,
    borderBottomRightRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  numberedText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // Minimal Style
  minimalContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  minimalText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
