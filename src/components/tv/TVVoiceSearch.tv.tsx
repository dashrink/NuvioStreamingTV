/**
 * TVVoiceSearch.tv.tsx
 *
 * TV-specific voice search modal/overlay triggered by TV remote voice button
 * with speech-to-text processing and keyboard fallback.
 *
 * This component is automatically loaded when APP_VARIANT=tv (Metro file resolution).
 *
 * Features:
 * - Opens on voice button press via TVNavigationContext integration
 * - Displays listening state with animated visual feedback
 * - Shows keyboard fallback if voice unavailable or user prefers typing
 * - Displays search results with D-pad navigation
 * - Handles network errors gracefully with retry options
 * - Closes with back/menu button and returns focus properly
 * - Animated entrance/exit with spring physics
 *
 * @example
 * ```tsx
 * import TVVoiceSearch from '@/components/tv/TVVoiceSearch';
 * import { useTVNavigation } from '@/contexts/TVNavigationContext';
 *
 * function App() {
 *   return (
 *     <TVNavigationProvider>
 *       {/* Your app content *\/}
 *       <TVVoiceSearch onSearch={(query) => navigateToSearch(query)} />
 *     </TVNavigationProvider>
 *   );
 * }
 *
 * // To open voice search from a component:
 * function SearchButton() {
 *   const { openVoiceSearch } = useTVNavigation();
 *   return (
 *     <Focusable onPress={openVoiceSearch}>
 *       <Text>Voice Search</Text>
 *     </Focusable>
 *   );
 * }
 * ```
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import { useTVNavigationOptional } from '../../contexts/TVNavigationContext';
import {
  useTVEventHandler,
  isMenuEvent,
  isNavigationEvent,
  isSelectEvent,
  TVRemoteEvent,
} from '../../hooks/useTVEventHandler';
import useVoiceAvailability, {
  VoiceUnavailableReason,
  hasRemoteVoiceButton,
} from '../../hooks/useVoiceAvailability';
import Focusable, { FocusableRef } from '../common/Focusable';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Search result item
 */
export interface VoiceSearchResult {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Optional subtitle (e.g., year, type) */
  subtitle?: string;
  /** Optional poster/thumbnail URL */
  posterUrl?: string;
  /** Result type (movie, series, etc.) */
  type?: 'movie' | 'series' | 'episode' | 'person' | 'other';
}

/**
 * Props for the TVVoiceSearch component
 */
export interface TVVoiceSearchProps {
  /** Callback when search is submitted */
  onSearch?: (query: string) => void;
  /** Callback when a search result is selected */
  onResultSelect?: (result: VoiceSearchResult) => void;
  /** Optional search results to display */
  searchResults?: VoiceSearchResult[];
  /** Whether search is loading */
  isSearching?: boolean;
  /** Placeholder text for text input */
  placeholder?: string;
  /** Test ID for testing purposes */
  testID?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Animation spring configuration */
const SPRING_CONFIG = {
  damping: 18,
  stiffness: 180,
  mass: 1,
};

/** Modal dimensions */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(600, SCREEN_WIDTH * 0.8);
const MODAL_PADDING = 24;
const INPUT_HEIGHT = 56;
const RESULT_ITEM_HEIGHT = 64;
const MAX_VISIBLE_RESULTS = 5;

/** Voice listening animation duration */
const PULSE_DURATION = 1500;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get human-readable message for voice unavailability reason
 */
function getVoiceUnavailabilityMessage(reason: VoiceUnavailableReason | null): string {
  switch (reason) {
    case 'not_tv_platform':
      return 'Voice search is only available on TV';
    case 'no_native_module':
      return 'Voice search is not configured';
    case 'permission_denied':
      return 'Microphone access is required';
    case 'feature_disabled':
      return 'Voice search has been disabled';
    case 'hardware_unavailable':
      return 'Voice input not available on this device';
    case 'language_unsupported':
      return 'Language not supported for voice';
    case 'network_unavailable':
      return 'Internet connection required for voice';
    case 'api_unavailable':
      return 'Voice search not supported';
    case 'unknown':
    default:
      return 'Voice search is unavailable';
  }
}

// =============================================================================
// Voice Indicator Component
// =============================================================================

interface VoiceIndicatorProps {
  isListening: boolean;
  isAvailable: boolean;
  unavailableReason?: VoiceUnavailableReason | null;
  isChecking?: boolean;
}

/**
 * Animated voice indicator showing listening state
 */
const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening,
  isAvailable,
  unavailableReason = null,
  isChecking = false,
}) => {
  // Animated values for the pulsing effect
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const innerGlow = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      // Start pulsing animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: PULSE_DURATION / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: PULSE_DURATION / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Repeat indefinitely
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: PULSE_DURATION / 2 }),
          withTiming(0.3, { duration: PULSE_DURATION / 2 })
        ),
        -1,
        false
      );
      innerGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: PULSE_DURATION / 2 }),
          withTiming(0.5, { duration: PULSE_DURATION / 2 })
        ),
        -1,
        false
      );
    } else {
      // Stop animation and reset
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      cancelAnimation(innerGlow);
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0.5, { duration: 200 });
      innerGlow.value = withTiming(0, { duration: 200 });
    }

    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      cancelAnimation(innerGlow);
    };
  }, [isListening, pulseScale, pulseOpacity, innerGlow]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: innerGlow.value,
  }));

  return (
    <View style={styles.voiceIndicatorContainer}>
      {/* Outer pulse ring */}
      <Animated.View style={[styles.pulseRing, pulseStyle]} />

      {/* Inner microphone icon container */}
      <View
        style={[
          styles.micContainer,
          isListening && styles.micContainerActive,
          !isAvailable && styles.micContainerDisabled,
        ]}
      >
        {/* Glow effect */}
        <Animated.View style={[styles.micGlow, glowStyle]} />

        {/* Microphone icon (unicode) */}
        <Text style={[styles.micIcon, !isAvailable && styles.micIconDisabled]}>
          {isAvailable ? '\uD83C\uDF99' : '\uD83D\uDEAB'}
        </Text>
      </View>

      {/* Status text */}
      <Text style={styles.voiceStatusText}>
        {isChecking
          ? 'Checking voice availability...'
          : !isAvailable
            ? getVoiceUnavailabilityMessage(unavailableReason)
            : isListening
              ? 'Listening...'
              : 'Press to speak'}
      </Text>

      {/* Additional hint when unavailable */}
      {!isAvailable && !isChecking && (
        <Text style={styles.voiceHintText}>Use keyboard to search instead</Text>
      )}
    </View>
  );
};

// =============================================================================
// Search Result Item Component
// =============================================================================

interface SearchResultItemProps {
  result: VoiceSearchResult;
  index: number;
  isSelected: boolean;
  onFocus: (index: number) => void;
  onSelect: () => void;
  hasTVPreferredFocus?: boolean;
  itemRef?: React.RefObject<FocusableRef>;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  index,
  isSelected,
  onFocus,
  onSelect,
  hasTVPreferredFocus = false,
  itemRef,
}) => {
  const handleFocus = useCallback(() => {
    onFocus(index);
  }, [onFocus, index]);

  // Type indicator icon
  const typeIcon = useMemo(() => {
    switch (result.type) {
      case 'movie':
        return '\uD83C\uDFAC'; // Film
      case 'series':
        return '\uD83D\uDCFA'; // TV
      case 'episode':
        return '\uD83D\uDCFC'; // Tape
      case 'person':
        return '\uD83D\uDC64'; // Person
      default:
        return '\uD83D\uDD0D'; // Search
    }
  }, [result.type]);

  return (
    <Focusable
      ref={itemRef}
      onPress={onSelect}
      onFocus={handleFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={styles.resultItem}
      focusStyle={styles.resultItemFocused}
      animationConfig={{
        focusScale: 1.02,
        unfocusedOpacity: 0.85,
        showFocusBorder: true,
        focusBorderColor: '#007AFF',
        focusBorderWidth: 2,
        animateShadow: false,
      }}
      testID={`voice-search-result-${result.id}`}
      accessibilityLabel={`${result.title}${result.subtitle ? `, ${result.subtitle}` : ''}`}
    >
      <View style={styles.resultItemContent}>
        {/* Type icon */}
        <Text style={styles.resultTypeIcon}>{typeIcon}</Text>

        {/* Text content */}
        <View style={styles.resultTextContainer}>
          <Text style={styles.resultTitle} numberOfLines={1} ellipsizeMode="tail">
            {result.title}
          </Text>
          {result.subtitle && (
            <Text style={styles.resultSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {result.subtitle}
            </Text>
          )}
        </View>

        {/* Arrow indicator */}
        <Text style={styles.resultArrow}>{'\u203A'}</Text>
      </View>
    </Focusable>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * TV Voice Search Component
 *
 * Renders a modal voice search overlay with animated listening indicator,
 * text input fallback, and search results display.
 */
const TVVoiceSearch: React.FC<TVVoiceSearchProps> = ({
  onSearch,
  onResultSelect,
  searchResults = [],
  isSearching = false,
  placeholder = 'Search for movies, shows, or people...',
  testID = 'tv-voice-search',
}) => {
  // Get context - may be null if not within provider
  const tvNav = useTVNavigationOptional();

  // Use the voice availability hook for proper platform detection
  const voiceStatus = useVoiceAvailability({
    checkOnMount: true,
    onAvailabilityChange: status => {
      // Update context when availability changes
      tvNav?.setVoiceAvailable?.(status.isAvailable);
    },
  });

  // Local state
  const [isVisible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1); // -1 = input focused
  const [inputValue, setInputValue] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  // Use the hook's availability status
  const voiceAvailable = voiceStatus.isAvailable;

  // Refs
  const inputRef = useRef<TextInput>(null);
  const resultRefs = useRef<React.RefObject<FocusableRef>[]>([]);
  const keyboardButtonRef = useRef<FocusableRef>(null);
  const voiceButtonRef = useRef<FocusableRef>(null);

  // Animation values
  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Get voice search state from context
  const voiceSearch = tvNav?.voiceSearch;
  const closeVoiceSearch = tvNav?.closeVoiceSearch;
  const setVoiceListening = tvNav?.setVoiceListening;
  const setVoiceQuery = tvNav?.setVoiceQuery;
  const setVoiceError = tvNav?.setVoiceError;
  const setVoiceAvailableCtx = tvNav?.setVoiceAvailable;

  // Memoized check for whether we have results
  const hasResults = searchResults.length > 0;

  // Create refs for result items
  useEffect(() => {
    if (searchResults.length > 0) {
      resultRefs.current = searchResults.map(() => React.createRef<FocusableRef>());
    }
  }, [searchResults.length]);

  // =============================================================================
  // Animation Handlers
  // =============================================================================

  const animateIn = useCallback(() => {
    backdropOpacity.value = withTiming(1, { duration: 200 });
    modalScale.value = withSpring(1, SPRING_CONFIG);
    modalOpacity.value = withSpring(1, SPRING_CONFIG);
  }, [backdropOpacity, modalScale, modalOpacity]);

  const animateOut = useCallback(
    (onComplete: () => void) => {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      modalScale.value = withSpring(0.9, {
        ...SPRING_CONFIG,
        damping: 25,
      });
      modalOpacity.value = withTiming(0, { duration: 150 }, finished => {
        if (finished) {
          runOnJS(onComplete)();
        }
      });
    },
    [backdropOpacity, modalScale, modalOpacity]
  );

  // =============================================================================
  // Visibility Effect
  // =============================================================================

  useEffect(() => {
    if (voiceSearch?.isOpen) {
      // Use the hook's availability status - gracefully handle unavailable voice
      const available = voiceStatus.isAvailable && !voiceStatus.isChecking;
      setVoiceAvailableCtx?.(available);

      // Reset state
      setInputValue(voiceSearch.query || '');
      setSelectedIndex(-1);

      // Automatically show keyboard fallback if voice is not available
      // This ensures users always have a way to search
      const shouldShowKeyboardFallback = !available || voiceStatus.shouldShowKeyboardFallback;
      setShowKeyboard(shouldShowKeyboardFallback);

      // Show modal with animation
      setIsVisible(true);
      requestAnimationFrame(() => {
        animateIn();
      });

      // Auto-start listening only if voice is truly available and not showing keyboard
      if (available && !shouldShowKeyboardFallback) {
        setTimeout(() => {
          startListening();
        }, 500);
      } else if (!available && voiceStatus.reason) {
        // If voice is not available, don't set an error - just use keyboard gracefully
        // The UI will already show the keyboard fallback
      }
    } else if (!voiceSearch?.isOpen && isVisible) {
      // Stop listening if active
      if (voiceSearch?.isListening) {
        stopListening();
      }

      // Hide modal with animation
      animateOut(() => {
        setIsVisible(false);
        setSelectedIndex(-1);
        setInputValue('');
        setShowKeyboard(false);
      });
    }
  }, [voiceSearch?.isOpen, voiceStatus.isAvailable, voiceStatus.isChecking]);

  // Sync input value with context query
  useEffect(() => {
    if (voiceSearch?.query && voiceSearch.query !== inputValue) {
      setInputValue(voiceSearch.query);
    }
  }, [voiceSearch?.query]);

  // =============================================================================
  // Voice Recognition Handlers
  // =============================================================================

  /**
   * Start listening for voice input
   * Note: This is a placeholder - actual implementation would use
   * platform-specific voice recognition APIs
   */
  const startListening = useCallback(() => {
    if (!voiceAvailable) {
      setVoiceError?.('Voice input is not available on this device');
      return;
    }

    setVoiceListening?.(true);

    // TODO: Integrate with actual voice recognition API
    // For now, simulate voice input with a timeout
    // In production, this would use:
    // - Apple TV: SiriKit or Speech framework via native module
    // - Android TV: SpeechRecognizer via native module

    // Simulate voice recognition (for demo purposes)
    // In real implementation, this would be replaced with actual voice recognition
  }, [voiceAvailable, setVoiceListening, setVoiceError]);

  /**
   * Stop listening for voice input
   */
  const stopListening = useCallback(() => {
    setVoiceListening?.(false);
  }, [setVoiceListening]);

  /**
   * Toggle voice listening state
   */
  const toggleListening = useCallback(() => {
    if (voiceSearch?.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [voiceSearch?.isListening, startListening, stopListening]);

  // =============================================================================
  // Navigation Handlers
  // =============================================================================

  const handleClose = useCallback(() => {
    closeVoiceSearch?.();
  }, [closeVoiceSearch]);

  const handleSearch = useCallback(() => {
    const query = inputValue.trim();
    if (query) {
      setVoiceQuery?.(query);
      onSearch?.(query);
    }
  }, [inputValue, setVoiceQuery, onSearch]);

  const handleResultSelect = useCallback(
    (result: VoiceSearchResult) => {
      onResultSelect?.(result);
      handleClose();
    },
    [onResultSelect, handleClose]
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setInputValue(text);
      setVoiceQuery?.(text);
    },
    [setVoiceQuery]
  );

  const handleInputSubmit = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  const switchToKeyboard = useCallback(() => {
    stopListening();
    setShowKeyboard(true);
    // Focus the text input after switching
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [stopListening]);

  const switchToVoice = useCallback(() => {
    if (voiceAvailable) {
      setShowKeyboard(false);
      setTimeout(() => {
        startListening();
      }, 100);
    }
  }, [voiceAvailable, startListening]);

  // =============================================================================
  // D-Pad Navigation
  // =============================================================================

  const navigateDown = useCallback(() => {
    if (hasResults) {
      setSelectedIndex(prev => {
        const next = prev + 1;
        return next >= searchResults.length ? 0 : next;
      });
    }
  }, [hasResults, searchResults.length]);

  const navigateUp = useCallback(() => {
    if (hasResults) {
      setSelectedIndex(prev => {
        const next = prev - 1;
        return next < 0 ? searchResults.length - 1 : next;
      });
    }
  }, [hasResults, searchResults.length]);

  // =============================================================================
  // TV Event Handler
  // =============================================================================

  const handleTVEvent = useCallback(
    (event: TVRemoteEvent) => {
      if (!isVisible) return;

      if (isMenuEvent(event)) {
        handleClose();
        return;
      }

      if (isNavigationEvent(event)) {
        switch (event.eventType) {
          case 'up':
            navigateUp();
            break;
          case 'down':
            navigateDown();
            break;
          case 'left':
          case 'right':
            // Could be used for switching between voice/keyboard modes
            break;
        }
        return;
      }

      if (isSelectEvent(event)) {
        // If a result is selected, trigger its action
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleResultSelect(searchResults[selectedIndex]);
        } else if (!showKeyboard && voiceAvailable) {
          // Toggle voice listening
          toggleListening();
        }
      }
    },
    [
      isVisible,
      handleClose,
      navigateUp,
      navigateDown,
      selectedIndex,
      searchResults,
      handleResultSelect,
      showKeyboard,
      voiceAvailable,
      toggleListening,
    ]
  );

  useTVEventHandler(handleTVEvent, { enabled: isVisible });

  // =============================================================================
  // Focus Effect
  // =============================================================================

  useEffect(() => {
    if (isVisible && selectedIndex >= 0 && resultRefs.current[selectedIndex]?.current) {
      const timeoutId = setTimeout(() => {
        resultRefs.current[selectedIndex]?.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, selectedIndex]);

  // =============================================================================
  // Animated Styles
  // =============================================================================

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  // =============================================================================
  // Render
  // =============================================================================

  // Don't render if not on TV or no context
  if (!Platform.isTV || !tvNav) {
    return null;
  }

  // Don't render modal if not visible
  if (!isVisible) {
    return null;
  }

  const modalHeight =
    MODAL_PADDING * 2 +
    (showKeyboard ? INPUT_HEIGHT + 16 : 200) + // Voice indicator or input
    (hasResults
      ? Math.min(searchResults.length, MAX_VISIBLE_RESULTS) * RESULT_ITEM_HEIGHT + 16
      : 0) +
    (isSearching ? 50 : 0) +
    60; // Buttons row

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      testID={testID}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        {/* Modal Container */}
        <Animated.View
          style={[
            styles.modalContainer,
            modalAnimatedStyle,
            {
              width: MODAL_WIDTH,
              minHeight: modalHeight,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{voiceAvailable ? 'Voice Search' : 'Search'}</Text>
            {/* Show error from context if present */}
            {voiceSearch?.error && <Text style={styles.errorText}>{voiceSearch.error}</Text>}
            {/* Show availability status message when voice is unavailable (but not as error) */}
            {!voiceAvailable && !voiceStatus.isChecking && !voiceSearch?.error && (
              <Text style={styles.infoText}>
                {getVoiceUnavailabilityMessage(voiceStatus.reason)}
              </Text>
            )}
          </View>

          {/* Voice Indicator or Text Input */}
          {showKeyboard ? (
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputValue}
                onChangeText={handleInputChange}
                onSubmitEditing={handleInputSubmit}
                placeholder={placeholder}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                returnKeyType="search"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {voiceAvailable && (
                <Focusable
                  ref={voiceButtonRef}
                  onPress={switchToVoice}
                  style={styles.modeButton}
                  testID="switch-to-voice-button"
                  accessibilityLabel="Switch to voice input"
                >
                  <Text style={styles.modeButtonIcon}>{'\uD83C\uDF99'}</Text>
                </Focusable>
              )}
            </View>
          ) : (
            <View style={styles.voiceContainer}>
              <VoiceIndicator
                isListening={voiceSearch?.isListening || false}
                isAvailable={voiceAvailable}
                unavailableReason={voiceStatus.reason}
                isChecking={voiceStatus.isChecking}
              />
              <Focusable
                ref={keyboardButtonRef}
                onPress={switchToKeyboard}
                style={styles.keyboardButton}
                testID="switch-to-keyboard-button"
                accessibilityLabel="Switch to keyboard input"
              >
                <Text style={styles.keyboardButtonText}>{'\u2328'} Type instead</Text>
              </Focusable>
            </View>
          )}

          {/* Loading Indicator */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#007AFF" size="small" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {/* Search Results */}
          {hasResults && !isSearching && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Results</Text>
              <View style={styles.resultsList}>
                {searchResults.slice(0, MAX_VISIBLE_RESULTS).map((result, index) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    index={index}
                    isSelected={selectedIndex === index}
                    onFocus={setSelectedIndex}
                    onSelect={() => handleResultSelect(result)}
                    hasTVPreferredFocus={selectedIndex === index}
                    itemRef={resultRefs.current[index]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {inputValue.trim().length > 0 && (
              <Focusable
                onPress={handleSearch}
                style={styles.searchButton}
                focusStyle={styles.searchButtonFocused}
                testID="voice-search-submit"
                accessibilityLabel="Search"
              >
                <Text style={styles.searchButtonText}>Search</Text>
              </Focusable>
            )}
            <Focusable
              onPress={handleClose}
              style={styles.cancelButton}
              testID="voice-search-cancel"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Focusable>
          </View>

          {/* Hint */}
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>Press BACK to close</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: MODAL_PADDING,
    paddingHorizontal: MODAL_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    textAlign: 'center',
  },

  // Voice indicator styles
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  voiceIndicatorContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
  },
  micContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3A3A3C',
  },
  micContainerActive: {
    borderColor: '#007AFF',
    backgroundColor: '#1C1C1E',
  },
  micContainerDisabled: {
    opacity: 0.5,
    borderColor: '#555',
  },
  micGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  micIcon: {
    fontSize: 32,
  },
  micIconDisabled: {
    opacity: 0.5,
  },
  voiceStatusText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
  },
  voiceHintText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  keyboardButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginTop: 16,
  },
  keyboardButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Text input styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    height: INPUT_HEIGHT,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3A3A3C',
  },
  modeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modeButtonIcon: {
    fontSize: 24,
  },

  // Loading styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
  },

  // Results styles
  resultsContainer: {
    marginVertical: 16,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultsList: {
    gap: 4,
  },
  resultItem: {
    height: RESULT_ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultItemFocused: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  resultItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  resultTypeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  resultSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  resultArrow: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 8,
  },

  // Button styles
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  searchButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  searchButtonFocused: {
    backgroundColor: '#0056B3',
  },
  searchButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Hint styles
  hintContainer: {
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
  },
});

// =============================================================================
// Exports
// =============================================================================

export default TVVoiceSearch;

export type { TVVoiceSearchProps, VoiceSearchResult };
