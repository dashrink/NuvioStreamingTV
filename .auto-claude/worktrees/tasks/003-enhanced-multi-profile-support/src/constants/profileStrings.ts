/**
 * Profile-related UI strings
 * Centralized for easier internationalization
 */

export const PROFILE_STRINGS = {
  // Profile switcher
  switchProfile: 'Switch Profile',
  closeProfileSwitcher: 'Close profile switcher',
  doubleTapToClose: 'Double-tap to close',
  currentProfile: 'Current Profile:',
  currentlyActive: 'currently active',
  pinProtected: 'PIN protected',
  currentlyActiveProfile: 'Currently active profile',
  doubleTapToSwitch: 'Double-tap to switch to this profile',

  // PIN modal
  enterPin: 'Enter PIN',
  profileProtected: (name: string) => `${name} is protected by a PIN`,
  pinPlaceholder: '****',
  enterFourDigitPin: 'Enter 4 digit PIN',
  incorrectPin: 'Incorrect PIN. Please try again.',
  pinMustBeFourDigits: 'PIN must be 4 digits',

  // PIN modal buttons
  cancel: 'Cancel',
  unlock: 'Unlock',
  cancelPinEntry: 'Cancel PIN entry',
  doubleTapToCancel: 'Double-tap to cancel',
  unlockProfile: 'Unlock profile',
  doubleTapToUnlock: 'Double-tap to unlock with entered PIN',
} as const;
