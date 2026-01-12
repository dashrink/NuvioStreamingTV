/**
 * PinSetupModal - Modal for setting up or changing a profile PIN
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useState, useCallback, useRef } from 'react';
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

import { useTheme } from '../../contexts/ThemeContext';
import { PIN_CONFIG } from '../../types/profile';

type SetupStep = 'enter' | 'confirm';

interface PinSetupModalProps {
  visible: boolean;
  title?: string;
  onComplete: (pin: string) => Promise<boolean>;
  onCancel: () => void;
  requireCurrentPin?: boolean;
  onVerifyCurrentPin?: (pin: string) => Promise<boolean>;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  visible,
  title = 'Set up PIN',
  onComplete,
  onCancel,
  requireCurrentPin = false,
  onVerifyCurrentPin,
}) => {
  const { currentTheme } = useTheme();
  const [step, setStep] = useState<SetupStep>(requireCurrentPin ? 'enter' : 'enter');
  const [currentPinVerified, setCurrentPinVerified] = useState(!requireCurrentPin);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setStep(requireCurrentPin ? 'enter' : 'enter');
      setCurrentPinVerified(!requireCurrentPin);
      setPin('');
      setFirstPin('');
      setError(null);
    }
  }, [visible, requireCurrentPin]);

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
      if (pin.length >= PIN_CONFIG.pinMaxLength) return;

      const newPin = pin + digit;
      setPin(newPin);
      setError(null);

      // Auto-proceed when PIN reaches required length
      if (newPin.length >= PIN_CONFIG.pinMinLength) {
        setTimeout(() => handlePinComplete(newPin), 100);
      }
    },
    [pin]
  );

  const handleBackspace = useCallback(() => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  }, [pin]);

  const handlePinComplete = useCallback(
    async (completedPin: string) => {
      if (isLoading) return;

      setIsLoading(true);

      try {
        // If requiring current PIN verification
        if (requireCurrentPin && !currentPinVerified && onVerifyCurrentPin) {
          const verified = await onVerifyCurrentPin(completedPin);
          if (verified) {
            setCurrentPinVerified(true);
            setPin('');
            setStep('enter');
          } else {
            shake();
            setPin('');
            setError('Incorrect current PIN');
          }
          setIsLoading(false);
          return;
        }

        // Step 1: Enter new PIN
        if (step === 'enter') {
          setFirstPin(completedPin);
          setPin('');
          setStep('confirm');
          setIsLoading(false);
          return;
        }

        // Step 2: Confirm PIN
        if (step === 'confirm') {
          if (completedPin !== firstPin) {
            shake();
            setPin('');
            setError('PINs do not match');
            setStep('enter');
            setFirstPin('');
            setIsLoading(false);
            return;
          }

          // PINs match - complete setup
          const success = await onComplete(completedPin);
          if (!success) {
            shake();
            setPin('');
            setError('Failed to set PIN');
            setStep('enter');
            setFirstPin('');
          }
          // If successful, parent will close modal
        }
      } catch (err) {
        shake();
        setError('An error occurred');
        setPin('');
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      requireCurrentPin,
      currentPinVerified,
      onVerifyCurrentPin,
      step,
      firstPin,
      onComplete,
      shake,
    ]
  );

  const getTitle = () => {
    if (requireCurrentPin && !currentPinVerified) {
      return 'Enter Current PIN';
    }
    return title;
  };

  const getSubtitle = () => {
    if (requireCurrentPin && !currentPinVerified) {
      return 'Enter your current PIN to continue';
    }
    if (step === 'enter') {
      return `Enter a ${PIN_CONFIG.pinMinLength}-${PIN_CONFIG.pinMaxLength} digit PIN`;
    }
    return 'Confirm your PIN';
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

          {/* Title and subtitle */}
          <View style={styles.titleContainer}>
            <View style={[styles.iconCircle, { backgroundColor: currentTheme.colors.primary }]}>
              <MaterialIcons
                name={step === 'confirm' ? 'check' : 'lock'}
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.title, { color: currentTheme.colors.text }]}>{getTitle()}</Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
              {getSubtitle()}
            </Text>
          </View>

          {/* Step indicator */}
          {!requireCurrentPin || currentPinVerified ? (
            <View style={styles.stepIndicator}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      step === 'enter' || step === 'confirm'
                        ? currentTheme.colors.primary
                        : currentTheme.colors.border,
                  },
                ]}
              />
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor:
                      step === 'confirm' ? currentTheme.colors.primary : currentTheme.colors.border,
                  },
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      step === 'confirm' ? currentTheme.colors.primary : currentTheme.colors.border,
                  },
                ]}
              />
            </View>
          ) : null}

          {/* PIN dots */}
          <View style={styles.dotsContainer}>{renderPinDots()}</View>

          {/* Error message */}
          {error ? (
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
  titleContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  iconCircle: {
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
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
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

export default PinSetupModal;
