# E2E TV Platform Integration Verification Guide

## Overview

This document provides step-by-step instructions for manually verifying TV platform integration for the Enhanced Multi-Profile Support feature. It covers d-pad navigation, focus management, PIN entry, and profile switching on Apple TV and Android TV platforms.

## Prerequisites

1. App is running in TV mode
2. At least 2 profiles exist (one with PIN protection)
3. Access to TV simulator/emulator or physical TV device

### Start TV Development Server

```bash
# Start development server
npm run start

# iOS - Apple TV Simulator
npm run ios -- --simulator="Apple TV"

# Android TV Emulator
npm run android -- --deviceId=AndroidTV
```

---

## Test Scenario 1: Open Profile Switcher on TV

### Steps:
1. Launch the app on TV platform
2. Navigate to the Home screen
3. Use the remote to focus on the profile icon in the header
4. Press the **Select/OK** button to open the profile switcher

### Expected Results:
- [ ] Profile switcher bottom sheet opens with animation
- [ ] All profiles are visible in a horizontal list
- [ ] TV-specific styling is applied (larger text, more padding)
- [ ] Focus automatically moves to the current active profile
- [ ] Focus ring/highlight is clearly visible around focused profile

### TV-Specific Styling to Verify:
| Element | Mobile | TV |
|---------|--------|-----|
| Profile Card Padding | 12px/16px | 24px/28px |
| Profile Card Border Radius | 16px | 24px |
| Profile Card Min Width | 100px | 160px |
| Avatar Icon Size | 52px | 72px |
| Profile Name Font Size | 14px | 20px |
| PIN Modal Max Width | 320px | 450px |
| PIN Modal Padding | 24px | 36px |

---

## Test Scenario 2: D-Pad Navigation Between Profiles

### Steps:
1. With profile switcher open, note which profile is focused
2. Press **Right** on the d-pad
3. Observe focus movement
4. Press **Left** on the d-pad
5. Observe focus returns to previous profile
6. Continue navigating through all available profiles

### Expected Results:
- [ ] Focus moves smoothly to the next profile on Right press
- [ ] Focus moves back on Left press
- [ ] Focus ring animates with scale effect (1.08x)
- [ ] Profile name/avatar color changes when focused (primary color)
- [ ] Edge boundaries respected (no focus wrap-around unless designed)
- [ ] No navigation lag or stutter

### Visual Focus Indicators:
- Focused profile should have:
  - [ ] Border highlight with primary color (3px border)
  - [ ] Scale transform (1.08x larger)
  - [ ] Animated focus ring (4px outer glow)
  - [ ] Name text color change to primary
  - [ ] Avatar color change to primary

---

## Test Scenario 3: Select Profile with Remote OK Button

### Steps:
1. Navigate focus to a profile WITHOUT PIN protection
2. Press the **Select/OK** button
3. Observe profile switch

### Expected Results:
- [ ] Profile switches immediately without PIN prompt
- [ ] Profile switcher closes smoothly
- [ ] Continue Watching updates to show new profile's content
- [ ] Active profile indicator updates in header
- [ ] No error messages displayed
- [ ] Profile switch completes in under 200ms

---

## Test Scenario 4: PIN Entry Using TV Keyboard

### Steps:
1. Navigate focus to a PIN-protected profile (shows lock icon)
2. Press the **Select/OK** button
3. PIN entry modal should appear
4. Enter PIN using TV on-screen keyboard or remote number buttons
5. Test incorrect PIN first, then correct PIN

### Expected Results:

**PIN Modal Appearance:**
- [ ] Modal is centered and properly sized for TV
- [ ] Title "Enter PIN" is clearly visible
- [ ] Subtitle shows "{Profile Name} is protected by a PIN"
- [ ] PIN input field is focused and ready for input
- [ ] Cancel and Unlock buttons are visible

**Incorrect PIN:**
- [ ] Enter incorrect PIN (e.g., 9999)
- [ ] Error message displays: "Incorrect PIN. Please try again."
- [ ] PIN input is cleared
- [ ] Modal stays open
- [ ] Profile does NOT switch

**Correct PIN:**
- [ ] Enter correct PIN
- [ ] PIN is accepted
- [ ] Modal closes
- [ ] Profile switches successfully
- [ ] Profile switcher closes

**TV-Specific PIN Modal:**
- [ ] Input field height: 72px
- [ ] Font size in input: 32px
- [ ] Button height: 60px
- [ ] Button font size: 18px
- [ ] All interactive elements are TV-focusable

---

## Test Scenario 5: D-Pad Navigation in PIN Modal

### Steps:
1. Open PIN modal for a protected profile
2. Use d-pad to navigate between:
   - PIN input field
   - Cancel button
   - Unlock button

### Expected Results:
- [ ] D-pad navigation works within modal
- [ ] Focus moves between input and buttons
- [ ] hasTVPreferredFocus is on PIN input when modal opens
- [ ] Cancel and Unlock buttons have isTVSelectable: true
- [ ] Focus indicators visible on all focusable elements

---

## Test Scenario 6: Profile Switch Performance

### Steps:
1. Time the profile switch from button press to completion
2. Repeat with cached data
3. Repeat with PIN-protected profile

### Expected Results:
- [ ] Profile switch without PIN: < 200ms
- [ ] Profile switch with correct PIN: < 300ms
- [ ] No visible lag or frame drops
- [ ] Animations complete smoothly (60fps)

---

## Test Scenario 7: TV Accessibility

### Steps:
1. Enable screen reader / VoiceOver (Apple TV) or TalkBack (Android TV)
2. Navigate through profile switcher
3. Verify announcements

### Expected Results:
- [ ] Each profile announces: "{Name} profile, [currently active], [PIN protected]"
- [ ] PIN modal announces: "Enter PIN" and profile name
- [ ] Buttons announce their purpose
- [ ] Error messages are announced
- [ ] Focus changes are announced

### Expected Accessibility Labels:
| Element | Label |
|---------|-------|
| Profile Card | "{name} profile, currently active, PIN protected" |
| Close Button | "Close profile switcher" |
| PIN Input | "Enter 4 digit PIN" |
| Cancel Button | "Cancel PIN entry" |
| Unlock Button | "Unlock profile" |

---

## Test Scenario 8: Edge Cases

### 8.1 Empty Profile List
- [ ] App handles gracefully if no profiles exist
- [ ] Create profile option is accessible

### 8.2 Single Profile
- [ ] Navigation works with only one profile
- [ ] Profile is selectable

### 8.3 Maximum Profiles
- [ ] All profiles are navigable
- [ ] Horizontal scroll works if needed

### 8.4 Focus Loss
- [ ] Focus returns to last focused profile when reopening
- [ ] Focus doesn't get stuck or lost

### 8.5 Remote Back Button
- [ ] Pressing Back/Menu closes profile switcher
- [ ] Returns focus to previous screen element

---

## Automated Test Execution

### Running Programmatic Tests:

```typescript
import { runTVIntegrationTests } from './src/__tests__/e2e/tv-integration.test';

// Run full test suite
const results = await runTVIntegrationTests();
console.log('Platform:', results.platform);
console.log('All tests passed:', results.allPassed);
console.log('Individual results:', results.results);
```

### Expected Test Output:
```
[TVIntegrationTest] Starting E2E TV Platform Integration Test Suite
[TVIntegrationTest] Platform: TV
[TVIntegrationTest] Created test profiles with PIN protection enabled
[TVIntegrationTest] TV Mode Detection: { screenWidth: 1920, screenHeight: 1080, detectedAsTV: true }
[TVIntegrationTest] D-Pad navigation simulated: ['profile-1', 'profile-2', 'profile-1']
[TVIntegrationTest] Remote selection result: true
[TVIntegrationTest] PIN entry verification: { incorrectPinRejected: true, correctPinAccepted: true }
[TVIntegrationTest] Profile switch time: 45 ms
[TVIntegrationTest] Cleaned up test data
[TVIntegrationTest] Test Suite Complete
[TVIntegrationTest] Platform: TV
[TVIntegrationTest] Overall Result: PASSED
[TVIntegrationTest] Tests Passed: 9/9
```

---

## Quick Verification Utility

```typescript
import { quickTVVerification } from './src/utils/tvIntegrationVerification';

const verification = await quickTVVerification();
console.log('Passed:', verification.passed);
console.log('Summary:', verification.summary);
console.log('Platform Info:', verification.details.platformInfo);
```

---

## Platform-Specific Notes

### Apple TV (tvOS)
- Uses Siri Remote with touchpad for d-pad navigation
- Select button is touchpad click
- Back button returns to previous screen
- Menu button can open/close profile switcher

### Android TV
- Uses D-pad controller (physical or on-screen)
- Select is center button
- Back button returns to previous screen
- Home button exits app

### Fire TV
- Similar to Android TV
- Voice remote with d-pad
- Back and Home buttons behave as expected

---

## Troubleshooting

### Focus Not Working:
- Verify `isTVSelectable: true` is set on interactive elements
- Check that `hasTVPreferredFocus` is set for initial focus
- Ensure component is wrapped in proper parent container

### D-Pad Not Navigating:
- Verify focusable elements are in a flat list (not nested)
- Check that focus order follows horizontal layout
- Ensure no element is blocking focus events

### PIN Input Issues:
- Verify TextInput has TV-specific props
- Check keyboard type is numeric
- Ensure secureTextEntry is working

### Styling Not Applied:
- Verify TV mode detection is working (Platform.isTV or width >= 1440)
- Check dimension listener is active
- Verify TV-specific styles are conditional on isTV

---

## Sign-off Checklist

Before marking this verification complete:

- [ ] All 8 test scenarios pass on Apple TV
- [ ] All 8 test scenarios pass on Android TV
- [ ] Performance requirements met (< 200ms switch)
- [ ] Accessibility verified with screen reader
- [ ] Automated tests pass
- [ ] No console errors during TV operations
- [ ] Focus management works smoothly throughout

**Verified By:** _____________________
**Date:** _____________________
**Platforms Tested:**
- [ ] Apple TV Simulator
- [ ] Apple TV Physical Device
- [ ] Android TV Emulator
- [ ] Android TV Physical Device
- [ ] Fire TV

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________
