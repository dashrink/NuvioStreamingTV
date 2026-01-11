/**
 * ForgotPinModal - Modal for recovering access via Master PIN
 * Allows users to reset their profile PIN using the master PIN
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
import { masterPinService } from '../../services/MasterPinService';
import { pinService } from '../../services/PinService';

interface ForgotPinModalProps {
  visible: boolean;
  profileId: string;
  profileName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = 'enter_master_pin' | 'create_new_pin' | 'confirm_new_pin';

export const ForgotPinModal: React.FC<ForgotPinModalProps> = ({
  visible,
  profileId,
  profileName,
  onSuccess,
  onCancel,
}) => {
  const { currentTheme } = useTheme();
  const [step, setStep] = useState<Step>('enter_master_pin');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(PIN_CONFIG.maxAttempts);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('enter_master_pin');
      setPin('');
      setNewPin('');
      setError(null);
      setAttemptsRemaining(PIN_CONFIG.maxAttempts);
      setLockedUntil(null);
    }
  }, [visible]);

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

  const handleDigitPress = useCallback(
    (digit: string) => {
      if (lockedUntil || pin.length >= PIN_CONFIG.pinMaxLength) return;

      const newPinValue = pin + digit;
      setPin(newPinValue);
      setError(null);

      // Auto-submit when PIN reaches minimum length
      if (newPinValue.length >= PIN_CONFIG.pinMinLength) {
        setTimeout(() => handleSubmit(newPinValue), 100);
      }
    },
    [pin, lockedUntil, step]
  );

  const handleBackspace = useCallback(() => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  }, [pin]);

  const handleSubmit = useCallback(
    async (pinToSubmit: string) => {
      if (isLoading || lockedUntil) return;

      setIsLoading(true);
      setError(null);

      try {
        if (step === 'enter_master_pin') {
          // Verify master PIN
          const result = await masterPinService.verifyMasterPin(pinToSubmit);

          if (result.success) {
            // Master PIN verified - move to create new PIN step
            setStep('create_new_pin');
            setPin('');
          } else {
            shake();
            setPin('');

            if (result.lockedUntil) {
              setLockedUntil(result.lockedUntil);
              setError('Too many failed attempts');
            } else if (result.attemptsRemaining !== undefined) {
              setAttemptsRemaining(result.attemptsRemaining);
              setError(`Incorrect Master PIN. ${result.attemptsRemaining} attempts remaining`);
            } else {
              setError('Incorrect Master PIN');
            }
          }
        } else if (step === 'create_new_pin') {
          // Store new PIN and move to confirm step
          setNewPin(pinToSubmit);
          setStep('confirm_new_pin');
          setPin('');
        } else if (step === 'confirm_new_pin') {
          // Confirm new PIN matches
          if (pinToSubmit !== newPin) {
            shake();
            setPin('');
            setError('PINs do not match. Try again.');
            setStep('create_new_pin');
            setNewPin('');
          } else {
            // Set new PIN for profile
            const success = await pinService.setPin(profileId, pinToSubmit);
            if (success) {
              onSuccess();
            } else {
              shake();
              setPin('');
              setError('Failed to set new PIN. Please try again.');
              setStep('create_new_pin');
              setNewPin('');
            }
          }
        }
      } catch (err) {
        setError('An error occurred');
        shake();
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, lockedUntil, step, newPin, profileId, onSuccess, shake]
  );

  const getTitle = () => {
    switch (step) {
      case 'enter_master_pin':
        return 'Enter Master PIN';
      case 'create_new_pin':
        return 'Create New PIN';
      case 'confirm_new_pin':
        return 'Confirm New PIN';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'enter_master_pin':
        return `Enter the master PIN to reset ${profileName}'s PIN`;
      case 'create_new_pin':
        return 'Enter a new PIN for this profile';
      case 'confirm_new_pin':
        return 'Re-enter the new PIN to confirm';
    }
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < PIN_CONFIG.pinMaxLength; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor:
                i < pin.length ? currentTheme.colors.primary : currentTheme.colors.border,
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
                    <MaterialIcons name="backspace" size={24} color={currentTheme.colors.text} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={keyIndex}
                  style={[styles.keypadButton, { backgroundColor: currentTheme.colors.elevation2 }]}
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

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            {['enter_master_pin', 'create_new_pin', 'confirm_new_pin'].map((s, index) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      step === s
                        ? currentTheme.colors.primary
                        : index <
                            ['enter_master_pin', 'create_new_pin', 'confirm_new_pin'].indexOf(step)
                          ? currentTheme.colors.success
                          : currentTheme.colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    step === 'enter_master_pin'
                      ? currentTheme.colors.warning
                      : currentTheme.colors.primary,
                },
              ]}
            >
              <MaterialIcons
                name={step === 'enter_master_pin' ? 'vpn-key' : 'lock-reset'}
                size={32}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.title, { color: currentTheme.colors.text }]}>{getTitle()}</Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
              {getSubtitle()}
            </Text>
          </View>

          {/* PIN dots */}
          <View style={styles.dotsContainer}>{renderPinDots()}</View>

          {/* Error message or lockout */}
          {lockedUntil ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="timer" size={20} color={currentTheme.colors.error} />
              <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>
                Try again in {lockoutCountdown} seconds
              </Text>
            </View>
          ) : error ? (
            <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>
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
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
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

export default ForgotPinModal;
