/**
 * MasterPinSetupModal - Modal for setting up the master PIN
 * Shown to the first admin user when they first set a profile PIN
 */

import { MaterialIcons } from '@expo/vector-icons';
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
  ScrollView,
} from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { masterPinService } from '../../services/MasterPinService';
import { PIN_CONFIG } from '../../types/profile';

interface MasterPinSetupModalProps {
  visible: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

type Step = 'info' | 'create_pin' | 'confirm_pin';

export const MasterPinSetupModal: React.FC<MasterPinSetupModalProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const { currentTheme } = useTheme();
  const [step, setStep] = useState<Step>('info');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('info');
      setPin('');
      setNewPin('');
      setError(null);
    }
  }, [visible]);

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

      const newPinValue = pin + digit;
      setPin(newPinValue);
      setError(null);

      // Auto-submit when PIN reaches minimum length
      if (newPinValue.length >= PIN_CONFIG.pinMinLength) {
        setTimeout(() => handleSubmit(newPinValue), 100);
      }
    },
    [pin, step]
  );

  const handleBackspace = useCallback(() => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  }, [pin]);

  const handleSubmit = useCallback(
    async (pinToSubmit: string) => {
      if (isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        if (step === 'create_pin') {
          // Store new PIN and move to confirm step
          setNewPin(pinToSubmit);
          setStep('confirm_pin');
          setPin('');
        } else if (step === 'confirm_pin') {
          // Confirm new PIN matches
          if (pinToSubmit !== newPin) {
            shake();
            setPin('');
            setError('PINs do not match. Try again.');
            setStep('create_pin');
            setNewPin('');
          } else {
            // Set master PIN
            const result = await masterPinService.setupMasterPin(pinToSubmit);
            if (result.success) {
              onComplete();
            } else {
              shake();
              setPin('');
              setError(result.error || 'Failed to set master PIN. Please try again.');
              setStep('create_pin');
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
    [isLoading, step, newPin, onComplete, shake]
  );

  const renderInfoStep = () => (
    <ScrollView contentContainerStyle={styles.infoContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.warning }]}>
        <MaterialIcons name="vpn-key" size={40} color="#FFFFFF" />
      </View>

      <Text style={[styles.title, { color: currentTheme.colors.text }]}>Set Up Master PIN</Text>

      <Text style={[styles.description, { color: currentTheme.colors.textMuted }]}>
        The Master PIN is a recovery PIN that can be used to reset any profile's PIN if forgotten.
      </Text>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <MaterialIcons name="check-circle" size={20} color={currentTheme.colors.success} />
          <Text style={[styles.featureText, { color: currentTheme.colors.text }]}>
            Reset forgotten profile PINs
          </Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="check-circle" size={20} color={currentTheme.colors.success} />
          <Text style={[styles.featureText, { color: currentTheme.colors.text }]}>
            Works for all profiles on this device
          </Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="warning" size={20} color={currentTheme.colors.warning} />
          <Text style={[styles.featureText, { color: currentTheme.colors.text }]}>
            Keep this PIN safe - it cannot be recovered!
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: currentTheme.colors.primary }]}
        onPress={() => setStep('create_pin')}
      >
        <Text style={styles.primaryButtonText}>Create Master PIN</Text>
      </TouchableOpacity>

      {onSkip && (
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={[styles.skipButtonText, { color: currentTheme.colors.textMuted }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

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

  const renderPinStep = () => (
    <Animated.View style={[styles.pinContent, { transform: [{ translateX: shakeAnim }] }]}>
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {['create_pin', 'confirm_pin'].map((s, index) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              {
                backgroundColor:
                  step === s
                    ? currentTheme.colors.primary
                    : index < ['create_pin', 'confirm_pin'].indexOf(step)
                      ? currentTheme.colors.success
                      : currentTheme.colors.border,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.iconContainerSmall, { backgroundColor: currentTheme.colors.primary }]}>
        <MaterialIcons name="vpn-key" size={28} color="#FFFFFF" />
      </View>

      <Text style={[styles.pinTitle, { color: currentTheme.colors.text }]}>
        {step === 'create_pin' ? 'Create Master PIN' : 'Confirm Master PIN'}
      </Text>

      <Text style={[styles.pinSubtitle, { color: currentTheme.colors.textMuted }]}>
        {step === 'create_pin'
          ? 'Enter a PIN you will remember'
          : 'Re-enter your Master PIN to confirm'}
      </Text>

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

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (step === 'confirm_pin') {
            setStep('create_pin');
            setPin('');
            setNewPin('');
          } else {
            setStep('info');
            setPin('');
          }
        }}
      >
        <MaterialIcons name="arrow-back" size={20} color={currentTheme.colors.textMuted} />
        <Text style={[styles.backButtonText, { color: currentTheme.colors.textMuted }]}>Back</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
          {step === 'info' ? renderInfoStep() : renderPinStep()}
        </View>
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
    maxHeight: '90%',
    borderRadius: 20,
    padding: 24,
  },
  infoContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainerSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
  },
  pinContent: {
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  pinSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 8,
  },
  backButtonText: {
    fontSize: 14,
  },
});

export default MasterPinSetupModal;
