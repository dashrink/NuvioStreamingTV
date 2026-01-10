import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFocusOptional } from '../../contexts/FocusContext';
import { isAndroidTV, isTVOS, isTV } from '../../hooks/useTVFocus';

/**
 * Props for the FocusDebugOverlay component
 */
interface FocusDebugOverlayProps {
  /** Whether to show the debug overlay */
  enabled?: boolean;
  /** Position of the overlay */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Debug overlay for testing focus indicators on TV platforms
 *
 * Shows:
 * - Current platform (Android TV, tvOS, mobile)
 * - Current focus ID
 * - Current focus group
 * - TV focus features status
 *
 * @example
 * ```tsx
 * // Add to your App.tsx or root component (only in development)
 * {__DEV__ && <FocusDebugOverlay enabled position="top-right" />}
 * ```
 */
const FocusDebugOverlay: React.FC<FocusDebugOverlayProps> = ({
  enabled = true,
  position = 'top-left',
}) => {
  const focusContext = useFocusOptional();
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusHistory, setFocusHistory] = useState<string[]>([]);

  // Track focus history
  useEffect(() => {
    if (focusContext?.currentFocusId) {
      setFocusHistory((prev) => {
        const newHistory = [focusContext.currentFocusId!, ...prev.slice(0, 4)];
        return newHistory;
      });
    }
  }, [focusContext?.currentFocusId]);

  // Don't render if not enabled or not in development
  if (!enabled || !__DEV__) {
    return null;
  }

  // Platform info
  const platformInfo = {
    isTV: isTV(),
    isAndroidTV: isAndroidTV(),
    isTVOS: isTVOS(),
    platform: Platform.OS,
    version: Platform.Version,
  };

  const getPlatformLabel = () => {
    if (platformInfo.isAndroidTV) return 'Android TV';
    if (platformInfo.isTVOS) return 'tvOS';
    if (platformInfo.isTV) return 'TV (Unknown)';
    return Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Web';
  };

  const positionStyle = {
    'top-left': { top: 50, left: 10 },
    'top-right': { top: 50, right: 10 },
    'bottom-left': { bottom: 50, left: 10 },
    'bottom-right': { bottom: 50, right: 10 },
  }[position];

  return (
    <View style={[styles.container, positionStyle]} pointerEvents="box-none">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={[
          styles.badge,
          platformInfo.isTV ? styles.badgeTV : styles.badgeMobile,
        ]}
        activeOpacity={0.8}
      >
        <Text style={styles.badgeText}>
          {getPlatformLabel()} {platformInfo.isTV ? '(TV Mode)' : '(Touch Mode)'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Platform Info</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Platform:</Text>
            <Text style={styles.value}>{getPlatformLabel()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Version:</Text>
            <Text style={styles.value}>{String(platformInfo.version)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>TV Mode:</Text>
            <Text style={[styles.value, platformInfo.isTV ? styles.enabled : styles.disabled]}>
              {platformInfo.isTV ? 'ENABLED' : 'DISABLED'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Focus State</Text>
          {focusContext ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Current ID:</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {focusContext.currentFocusId || 'none'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Group:</Text>
                <Text style={styles.value}>
                  {focusContext.currentGroupId || 'none'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Groups Count:</Text>
                <Text style={styles.value}>{focusContext.focusGroups.size}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.warning}>FocusProvider not found</Text>
          )}

          {focusHistory.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Focus History</Text>
              {focusHistory.map((id, index) => (
                <Text key={index} style={styles.historyItem} numberOfLines={1}>
                  {index + 1}. {id}
                </Text>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Testing Tips</Text>
          <Text style={styles.tip}>
            {platformInfo.isTVOS
              ? '• Swipe on Siri Remote to navigate\n• Click/Press to select\n• Menu button = go back\n• Play/Pause for media'
              : platformInfo.isAndroidTV
              ? '• Use D-pad to navigate\n• Select/Enter = press\n• Back button = go back'
              : '• Long-press to simulate focus\n• Tap to interact'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  badgeTV: {
    backgroundColor: 'rgba(45, 156, 219, 0.9)',
  },
  badgeMobile: {
    backgroundColor: 'rgba(128, 128, 128, 0.9)',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  panel: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    padding: 12,
    minWidth: 200,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionTitle: {
    color: '#2d9cdb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  value: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 120,
  },
  enabled: {
    color: '#4CAF50',
  },
  disabled: {
    color: '#ff6b6b',
  },
  warning: {
    color: '#ff9800',
    fontSize: 11,
    fontStyle: 'italic',
  },
  historyItem: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    paddingVertical: 1,
  },
  tip: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    lineHeight: 14,
  },
});

export default FocusDebugOverlay;
