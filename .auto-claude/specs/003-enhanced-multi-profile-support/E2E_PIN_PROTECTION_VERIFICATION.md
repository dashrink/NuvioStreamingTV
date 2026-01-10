# E2E PIN Protection Verification Guide

## Overview

This document provides step-by-step instructions for manually verifying PIN protection functionality in the Enhanced Multi-Profile Support feature.

## Verification Steps

### Prerequisites

1. App is running (`npm run start`)
2. At least 2 profiles exist in the system
3. Access to Profile Management screen (Settings > Manage Profiles)

---

## Test Scenario 1: Enable PIN on Profile A

### Steps:
1. Open the app and navigate to **Settings**
2. Select **Manage Profiles** or **Profiles**
3. Select **Profile A** to edit
4. Find the **PIN Protection** or **Set PIN** option
5. Enable PIN protection
6. Enter a 4-digit PIN (e.g., `1234`)
7. Confirm the PIN
8. Save changes

### Expected Results:
- [ ] PIN setup completes without errors
- [ ] Profile A now shows a lock icon/badge indicating PIN protection
- [ ] Returning to Profile A's settings shows PIN is enabled

---

## Test Scenario 2: Switch to Profile B (Unprotected)

### Steps:
1. Open the Profile Switcher (header icon or Settings > Switch Profile)
2. Select **Profile B** (which has no PIN)

### Expected Results:
- [ ] Profile switches immediately without PIN prompt
- [ ] Profile B is now the active profile
- [ ] Continue Watching shows Profile B's content
- [ ] No error messages displayed

---

## Test Scenario 3: Attempt Switch to Profile A with Incorrect PIN

### Steps:
1. Open the Profile Switcher
2. Select **Profile A** (PIN-protected)
3. PIN entry modal should appear
4. Enter an incorrect PIN (e.g., `9999`)
5. Tap **Unlock** or submit

### Expected Results:
- [ ] PIN entry modal appears with profile name
- [ ] Modal title shows "Enter PIN"
- [ ] Subtitle shows "[Profile A] is protected by a PIN"
- [ ] After entering wrong PIN:
  - [ ] Error message displays: "Incorrect PIN. Please try again."
  - [ ] PIN input field is cleared
  - [ ] Modal stays open
  - [ ] Profile does NOT switch
- [ ] Active profile remains Profile B

---

## Test Scenario 4: Switch to Profile A with Correct PIN

### Steps:
1. While PIN modal is still open (or reopen Profile Switcher)
2. Select **Profile A** again if needed
3. Enter the correct PIN (`1234`)
4. Tap **Unlock** or submit

### Expected Results:
- [ ] PIN is accepted immediately
- [ ] Profile switches to Profile A
- [ ] Profile Switcher closes
- [ ] Active profile is now Profile A
- [ ] Continue Watching shows Profile A's content
- [ ] No error messages displayed

---

## Test Scenario 5: PIN Cancel Functionality

### Steps:
1. Switch to Profile B first
2. Open Profile Switcher
3. Select Profile A (PIN-protected)
4. When PIN modal appears, tap **Cancel**

### Expected Results:
- [ ] PIN modal closes
- [ ] Profile does NOT switch
- [ ] Profile Switcher remains visible (or closes gracefully)
- [ ] Active profile remains Profile B

---

## Test Scenario 6: PIN Validation Rules

### Steps:
1. Open Profile Switcher
2. Select Profile A (PIN-protected)
3. Try the following invalid inputs:
   - Empty input (tap Unlock with no PIN)
   - Less than 4 digits (e.g., `123`)
   - Non-numeric characters (if keyboard allows)

### Expected Results:
- [ ] Empty input: "PIN must be 4 digits" error
- [ ] Less than 4 digits: "PIN must be 4 digits" error
- [ ] Input is restricted to numeric characters only
- [ ] Max length is 4 characters

---

## Test Scenario 7: Disable PIN Protection

### Steps:
1. While on Profile A (correct PIN already entered)
2. Navigate to Settings > Manage Profiles
3. Select Profile A to edit
4. Find PIN Protection option
5. Disable/Remove PIN

### Expected Results:
- [ ] PIN can be disabled
- [ ] Profile A no longer shows lock icon
- [ ] Switching to Profile A no longer requires PIN

---

## TV Platform Verification

### Steps (on Apple TV or Android TV):
1. Open Profile Switcher using TV remote
2. Navigate to PIN-protected profile using D-pad
3. PIN modal should appear
4. Enter PIN using TV keyboard/remote

### Expected Results:
- [ ] PIN modal is properly sized for TV
- [ ] Text is readable at TV viewing distance
- [ ] PIN input can be focused with remote
- [ ] D-pad navigation works in PIN modal
- [ ] Cancel and Unlock buttons are TV-focusable

---

## Security Verification

### Verify PIN is Hashed:
Using developer tools or app inspection:
1. Find stored PIN in MMKV storage
2. Key format: `profile_pin_hash_{profileId}`
3. Value should NOT be the plaintext PIN

### Expected Results:
- [ ] PIN is stored as a hash (base64 encoded string)
- [ ] Original 4-digit PIN is not visible in storage
- [ ] Hash is longer than 4 characters

---

## Automated Test Execution

### Running Programmatic Tests:

```typescript
import { runPINProtectionTests } from './src/__tests__/e2e/pin-protection.test';

// Run full test suite
const results = await runPINProtectionTests();
console.log('All tests passed:', results.allPassed);
console.log('Individual results:', results.results);
```

### Expected Test Output:
```
[PINProtectionTest] Starting E2E PIN Protection Test Suite
[PINProtectionTest] Created test profiles: PIN Test Profile A (Protected), PIN Test Profile B (Unprotected)
[PINProtectionTest] PIN enabled on Profile A, hash stored: true
[PINProtectionTest] Switched to Profile B, active: true
[PINProtectionTest] Wrong PIN test - rejected: true
[PINProtectionTest] Correct PIN test - accepted: true switched: true
[PINProtectionTest] Cleaned up test data
[PINProtectionTest] Test Suite Complete
[PINProtectionTest] Overall Result: PASSED
[PINProtectionTest] Tests Passed: 9/9
```

---

## Quick Verification Utility

```typescript
import { quickPINVerification } from './src/utils/pinProtectionVerification';

const verification = await quickPINVerification();
console.log('Passed:', verification.passed);
console.log('Summary:', verification.summary);
```

---

## Troubleshooting

### PIN Modal Not Appearing:
- Verify profile has PIN enabled (check storage for `profile_pin_hash_{id}`)
- Check ProfileSwitcherBottomSheet has `hasPin` function returning true
- Verify PIN storage prefix matches: `profile_pin_hash_`

### PIN Verification Always Failing:
- Check hash algorithm matches between storage and verification
- Verify salt string is consistent: `nuvio_pin_salt_${pin}_end`
- Check base64 encoding is available (btoa function)

### PIN Not Persisting:
- Verify MMKV storage is working
- Check for storage errors in logs
- Verify profile ID is consistent

---

## Sign-off Checklist

Before marking this verification complete:

- [ ] All 7 test scenarios pass
- [ ] TV platform verification complete (if applicable)
- [ ] Security verification confirms PIN hashing
- [ ] Automated tests pass
- [ ] No console errors during PIN operations
- [ ] PIN protection integrates with Profile Switcher correctly

**Verified By:** _____________________
**Date:** _____________________
**Platform(s) Tested:** _____________________
