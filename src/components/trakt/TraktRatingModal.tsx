import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTraktContext } from '../../contexts/TraktContext';

const { width } = Dimensions.get('window');

// Responsive breakpoints
const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  tv: 1440,
};

interface TraktRatingModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** IMDb ID of the content (with or without 'tt' prefix) */
  imdbId: string;
  /** Content type */
  type: 'movie' | 'show';
  /** Title of the content for display */
  contentTitle: string;
  /** Optional callback when rating is successfully submitted */
  onRatingSubmit?: (rating: number) => void;
  /** Optional callback when rating is cleared */
  onRatingClear?: () => void;
}

/**
 * TraktRatingModal - A modal component for rating content on Trakt
 *
 * Displays a 1-10 rating selector when the user wants to rate content.
 * Includes confirm/cancel buttons and handles API interactions with
 * loading states and error handling.
 *
 * ## Features
 * - 1-10 rating selector with two rows of buttons
 * - Visual feedback on selection with Trakt brand colors
 * - Current rating display with badge if previously rated
 * - Rating descriptions (e.g., "Totally Ninja!" for 10, "Weak Sauce" for 1)
 * - Confirm/Cancel/Clear action buttons
 * - Loading states during API calls
 * - Error handling with descriptive messages
 * - Responsive sizing for phone/tablet/TV
 *
 * ## Trakt API Integration
 * - Uses useTraktContext for getUserRating, addRating, removeRating
 * - Calls API only on confirm (not on selection)
 * - Rate limited via traktService (500ms between requests)
 * - IMDb IDs are normalized automatically (with 'tt' prefix)
 *
 * ## Data Flow
 * ```
 * Modal opens → loads current rating from context
 *       ↓
 * User selects rating → updates selectedRating state
 *       ↓
 * User taps Confirm → API call (addRating)
 *       ↓
 * Success → triggers onRatingSubmit, closes modal
 * Failure → shows error, stays open for retry
 *
 * User taps Clear → API call (removeRating)
 *       ↓
 * Success → triggers onRatingClear, closes modal
 * ```
 *
 * @see TraktRatingComponent for inline rating alternative
 */
const TraktRatingModal: React.FC<TraktRatingModalProps> = memo(({
  visible,
  onClose,
  imdbId,
  type,
  contentTitle,
  onRatingSubmit,
  onRatingClear,
}) => {
  const { currentTheme } = useTheme();
  const { isAuthenticated, getUserRating, addRating, removeRating } = useTraktContext();

  // Local state
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get device type for responsive sizing
  const deviceWidth = Dimensions.get('window').width;
  const getDeviceType = useCallback(() => {
    if (deviceWidth >= BREAKPOINTS.tv) return 'tv';
    if (deviceWidth >= BREAKPOINTS.largeTablet) return 'largeTablet';
    if (deviceWidth >= BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
  }, [deviceWidth]);

  const deviceType = getDeviceType();

  // Get current rating from context when modal opens
  const currentRating = useMemo(() => {
    return getUserRating(imdbId, type);
  }, [getUserRating, imdbId, type]);

  // Initialize selected rating when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedRating(currentRating);
      setError(null);
    }
  }, [visible, currentRating]);

  // Trakt brand colors
  const traktColors = useMemo(() => ({
    primary: '#ED1C24', // Trakt red
    primaryHover: '#FF3B42',
    primaryDark: '#c41921',
  }), []);

  // Modal sizing based on device
  const modalWidth = useMemo(() => {
    if (deviceType === 'tv') return Math.min(width * 0.5, 600);
    if (deviceType === 'largeTablet') return Math.min(width * 0.6, 500);
    if (deviceType === 'tablet') return Math.min(width * 0.7, 450);
    return width * 0.9;
  }, [deviceType]);

  // Rating button size based on device
  const ratingButtonSize = useMemo(() => {
    if (deviceType === 'tv') return 56;
    if (deviceType === 'largeTablet') return 48;
    if (deviceType === 'tablet') return 44;
    return 40;
  }, [deviceType]);

  // Handle rating selection
  const handleRatingSelect = useCallback((rating: number) => {
    setSelectedRating(rating);
    setError(null);
  }, []);

  // Handle confirm/submit rating
  const handleConfirm = useCallback(async () => {
    if (!isAuthenticated || !imdbId || selectedRating === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = await addRating(imdbId, type, selectedRating);
      if (success) {
        onRatingSubmit?.(selectedRating);
        onClose();
      } else {
        setError('Failed to save rating. Please try again.');
      }
    } catch (err) {
      setError('Failed to save rating. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, imdbId, type, selectedRating, addRating, onRatingSubmit, onClose]);

  // Handle clear/remove rating
  const handleClearRating = useCallback(async () => {
    if (!isAuthenticated || !imdbId || currentRating === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = await removeRating(imdbId, type);
      if (success) {
        setSelectedRating(null);
        onRatingClear?.();
        onClose();
      } else {
        setError('Failed to remove rating. Please try again.');
      }
    } catch (err) {
      setError('Failed to remove rating. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, imdbId, type, currentRating, removeRating, onRatingClear, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setSelectedRating(currentRating);
    setError(null);
    onClose();
  }, [currentRating, onClose]);

  // Render rating buttons (1-10)
  const renderRatingButtons = useCallback(() => {
    const buttons = [];
    for (let i = 1; i <= 10; i++) {
      const isSelected = selectedRating === i;
      const isCurrentRating = currentRating === i;

      buttons.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleRatingSelect(i)}
          disabled={isLoading}
          style={[
            styles.ratingButton,
            {
              width: ratingButtonSize,
              height: ratingButtonSize,
              borderRadius: ratingButtonSize / 2,
              backgroundColor: isSelected
                ? traktColors.primary
                : currentTheme.colors.surface || 'rgba(255,255,255,0.08)',
              borderWidth: isCurrentRating && !isSelected ? 2 : 1,
              borderColor: isCurrentRating && !isSelected
                ? traktColors.primary
                : isSelected
                  ? traktColors.primary
                  : 'rgba(255,255,255,0.15)',
              opacity: isLoading ? 0.5 : 1,
            },
          ]}
          activeOpacity={0.7}
          accessibilityLabel={`Rate ${i} out of 10`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Text
            style={[
              styles.ratingButtonText,
              {
                color: isSelected ? '#FFFFFF' : currentTheme.colors.highEmphasis || '#FFFFFF',
                fontSize: deviceType === 'tv' ? 20 : deviceType === 'tablet' ? 18 : 16,
                fontWeight: isSelected ? '700' : '600',
              },
            ]}
          >
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return buttons;
  }, [
    selectedRating,
    currentRating,
    isLoading,
    ratingButtonSize,
    traktColors,
    currentTheme.colors,
    deviceType,
    handleRatingSelect,
  ]);

  // Get rating description text
  const getRatingDescription = useCallback((rating: number | null) => {
    if (rating === null) return 'Select a rating';

    const descriptions: Record<number, string> = {
      1: 'Weak Sauce :(',
      2: 'Terrible',
      3: 'Bad',
      4: 'Poor',
      5: 'Meh',
      6: 'Fair',
      7: 'Good',
      8: 'Great',
      9: 'Superb',
      10: 'Totally Ninja!',
    };

    return descriptions[rating] || '';
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            {
              width: modalWidth,
              backgroundColor: currentTheme.colors.background || '#1a1a1a',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <MaterialIcons
                name="star"
                size={deviceType === 'tv' ? 28 : 24}
                color={traktColors.primary}
              />
              <Text
                style={[
                  styles.headerTitle,
                  {
                    color: currentTheme.colors.highEmphasis || '#FFFFFF',
                    fontSize: deviceType === 'tv' ? 22 : 18,
                  },
                ]}
              >
                Rate on Trakt
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.closeButton}
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              disabled={isLoading}
              accessibilityLabel="Close modal"
              accessibilityRole="button"
            >
              <MaterialIcons
                name="close"
                size={deviceType === 'tv' ? 28 : 24}
                color={currentTheme.colors.textMuted || '#888'}
              />
            </TouchableOpacity>
          </View>

          {/* Content Title */}
          <Text
            style={[
              styles.contentTitle,
              {
                color: currentTheme.colors.textMuted || '#888',
                fontSize: deviceType === 'tv' ? 16 : 14,
              },
            ]}
            numberOfLines={2}
          >
            {contentTitle}
          </Text>

          {/* Current Rating Display */}
          {currentRating !== null && (
            <View
              style={[
                styles.currentRatingBadge,
                { backgroundColor: 'rgba(237, 28, 36, 0.15)' },
              ]}
            >
              <MaterialIcons name="star" size={16} color={traktColors.primary} />
              <Text style={[styles.currentRatingText, { color: traktColors.primary }]}>
                Current rating: {currentRating}/10
              </Text>
            </View>
          )}

          {/* Rating Selector */}
          <View style={styles.ratingContainer}>
            <View style={styles.ratingButtonsRow}>
              {renderRatingButtons().slice(0, 5)}
            </View>
            <View style={styles.ratingButtonsRow}>
              {renderRatingButtons().slice(5, 10)}
            </View>
          </View>

          {/* Selected Rating Description */}
          <View style={styles.ratingDescriptionContainer}>
            <Text
              style={[
                styles.ratingDescription,
                {
                  color: selectedRating !== null
                    ? traktColors.primary
                    : currentTheme.colors.textMuted || '#888',
                  fontSize: deviceType === 'tv' ? 18 : 16,
                },
              ]}
            >
              {getRatingDescription(selectedRating)}
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={16} color="#ff4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Clear Rating Button (only if already rated) */}
            {currentRating !== null && (
              <TouchableOpacity
                onPress={handleClearRating}
                disabled={isLoading}
                style={[
                  styles.actionButton,
                  styles.clearButton,
                  {
                    borderColor: currentTheme.colors.textMuted || '#888',
                    opacity: isLoading ? 0.5 : 1,
                  },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Clear rating"
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={currentTheme.colors.textMuted} />
                ) : (
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: currentTheme.colors.textMuted || '#888' },
                    ]}
                  >
                    Clear
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isLoading}
              style={[
                styles.actionButton,
                styles.cancelButton,
                {
                  backgroundColor: currentTheme.colors.surface || 'rgba(255,255,255,0.08)',
                  opacity: isLoading ? 0.5 : 1,
                },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.actionButtonText,
                  { color: currentTheme.colors.highEmphasis || '#FFFFFF' },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isLoading || selectedRating === null}
              style={[
                styles.actionButton,
                styles.confirmButton,
                {
                  backgroundColor: selectedRating !== null
                    ? traktColors.primary
                    : 'rgba(255,255,255,0.1)',
                  opacity: isLoading || selectedRating === null ? 0.5 : 1,
                },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Confirm rating"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color: '#FFFFFF',
                      fontWeight: '700',
                    },
                  ]}
                >
                  Confirm
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

TraktRatingModal.displayName = 'TraktRatingModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  contentTitle: {
    marginBottom: 16,
    fontWeight: '500',
  },
  currentRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
    gap: 6,
  },
  currentRatingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonText: {
    textAlign: 'center',
  },
  ratingDescriptionContainer: {
    alignItems: 'center',
    minHeight: 28,
    marginBottom: 20,
  },
  ratingDescription: {
    fontWeight: '600',
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 6,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButton: {},
  confirmButton: {},
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TraktRatingModal;
