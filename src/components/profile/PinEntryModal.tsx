/**
 * PinEntryModal - Modal for entering PIN to unlock profiles
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { PIN_CONFIG } from '../../types/profile';

interface PinEntryModalProps {
  visible: boolean;
  profileName: string;
  onSubmit: (pin: string) => Promise<{
    success: boolean;
    attemptsRemaining?: number;
    lockedUntil?: number;
  }>;
  onCancel: () => void;
  lockedUntil?: number | null;
  attemptsRemaining?: number;
}

export const PinEntryModal: React.FC<PinEntryModalProps> = ({
  visible,
  profileName,
  onSubmit,
  onCancel,
  lockedUntil: initialLockedUntil,
  attemptsRemaining: initialAttempts,
}) => {
  const { currentTheme } = useTheme();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(initialAttempts ?? PIN_CONFIG.maxAttempts);
  const [lockedUntil, setLockedUntil] = useState<number | null>(initialLockedUntil ?? null);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPin('');
      setError(null);
      setAttemptsRemaining(initialAttempts ?? PIN_CONFIG.maxAttempts);
      setLockedUntil(initialLockedUntil ?? null);
    }
  }, [visible, initialAttempts, initialLockedUntil]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) {
      setLockoutCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockoutCountdown(remaining);
      if (remaining === 0) {
        setLockedUntil(null);
        setAttemptsRemaining(PIN_CONFIG.maxAttempts);
        setError(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    if (Platform.OS !== 'web') {
      Vibration.vibrate(200);
    }
  }, [shakeAnim]);

  const handleDigitPress = useCallback((digit: string) => {
    if (lockedUntil || pin.length >= PIN_CONFIG.pinMaxLength) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    // Auto-submit when PIN reaches minimum length
    if (newPin.length >= PIN_CONFIG.pinMinLength) {
      // Small delay to show the filled dot before submitting
      setTimeout(() => handleSubmit(newPin), 100);
    }
  }, [pin, lockedUntil]);

  const handleBackspace = useCallback(() => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  }, [pin]);

  const handleSubmit = useCallback(async (pinToSubmit: string) => {
    if (isLoading || lockedUntil) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onSubmit(pinToSubmit);

      if (result.success) {
        setPin('');
        // Success - modal will be closed by parent
      } else {
        shake();
        setPin('');

        if (result.lockedUntil) {
          setLockedUntil(result.lockedUntil);
          setError('Too many failed attempts');
        } else if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
          setError(`Incorrect PIN. ${result.attemptsRemaining} attempts remaining`);
        } else {
          setError('Incorrect PIN');
        }
      }
    } catch (err) {
      setError('An error occurred');
      shake();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lockedUntil, onSubmit, shake]);

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < PIN_CONFIG.pinMaxLength; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i < pin.length
                ? currentTheme.colors.primary
                : currentTheme.colors.border,
            },
          ]}
        />
      );
    }
    return dots;
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} style={styles.keypadButtonEmpty} />;
              }

              if (key === 'backspace') {
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={[
                      styles.keypadButton,
                      { backgroundColor: currentTheme.colors.elevation2 },
                    ]}
                    onPress={handleBackspace}
                    disabled={lockedUntil !== null}
                  >
                    <MaterialIcons
                      name="backspace"
                      size={24}
                      color={currentTheme.colors.text}
                    />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={keyIndex}
                  style={[
                    styles.keypadButton,
                    { backgroundColor: currentTheme.colors.elevation2 },
                  ]}
                  onPress={() => handleDigitPress(key)}
                  disabled={lockedUntil !== null}
                >
                  <Text style={[styles.keypadButtonText, { color: currentTheme.colors.text }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: currentTheme.colors.darkBackground },
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Profile info */}
          <View style={styles.profileInfo}>
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: currentTheme.colors.primary },
              ]}
            >
              <MaterialIcons name="lock" size={32} color={currentTheme.colors.text} />
            </View>
            <Text style={[styles.profileName, { color: currentTheme.colors.text }]}>
              {profileName}
            </Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
              Enter PIN to access this profile
            </Text>
          </View>

          {/* PIN dots */}
          <View style={styles.dotsContainer}>
            {renderPinDots()}
          </View>

          {/* Error message or lockout */}
          {lockedUntil ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="timer" size={20} color={currentTheme.colors.error} />
              <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>
                Try again in {lockoutCountdown} seconds
              </Text>
            </View>
          ) : error ? (
            <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>
              {error}
            </Text>
          ) : (
            <View style={styles.errorPlaceholder} />
          )}

          {/* Keypad */}
          {renderKeypad()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    padding: 8,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    height: 24,
    marginBottom: 16,
  },
  errorPlaceholder: {
    height: 24,
    marginBottom: 16,
  },
  keypad: {
    width: '100%',
    maxWidth: 280,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 16,
  },
  keypadButton: {
    width: 72,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonEmpty: {
    width: 72,
    height: 56,
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '500',
  },
});

export default PinEntryModal;
