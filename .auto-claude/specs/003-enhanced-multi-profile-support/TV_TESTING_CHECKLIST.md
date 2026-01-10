# TV Profile Switcher Testing Checklist

## Overview

This document provides a comprehensive testing checklist for verifying TV profile switcher functionality on tvOS (Apple TV) and Android TV platforms.

## Prerequisites

### Environment Setup

1. **Apple TV Testing**
   ```bash
   # Install Xcode with tvOS simulator support
   # Open Xcode > Preferences > Components > tvOS Simulator

   # Launch the app on Apple TV simulator
   npm run ios -- --simulator="Apple TV"
   # or
   npx expo run:ios --device "Apple TV"
   ```

2. **Android TV Testing**
   ```bash
   # Create Android TV emulator via Android Studio AVD Manager
   # Select "Android TV" device type

   # Launch the app on Android TV emulator
   npm run android -- --deviceId=<AndroidTV_emulator_id>
   # or
   npx expo run:android --device <AndroidTV_emulator_id>
   ```

## Test Scenarios

### 1. Profile Switcher Navigation (D-Pad)

| Test Case | Steps | Expected Result | Platform |
|-----------|-------|-----------------|----------|
| Open profile switcher | Navigate to header > Press Select on profile icon | Profile switcher bottom sheet opens | Both |
| Navigate between profiles | Press Left/Right on remote | Focus moves between profile cards | Both |
| Visual focus indicator | Navigate between profiles | Focused profile shows: border highlight, scale transform (1.08x), focus ring | Both |
| Select profile | Focus on profile > Press Select/OK | Profile switches (or PIN modal opens if protected) | Both |
| Close switcher | Press Menu/Back | Bottom sheet closes | Both |
| Initial focus | Open profile switcher | Active profile has initial focus | Both |

### 2. PIN Entry on TV

| Test Case | Steps | Expected Result | Platform |
|-----------|-------|-----------------|----------|
| PIN modal opens | Select PIN-protected profile | PIN entry modal appears with TV keyboard | Both |
| PIN input focused | PIN modal opens | PIN input field has initial focus | Both |
| Enter PIN digits | Type using TV keyboard | PIN field shows masked input (****) | Both |
| Incorrect PIN | Enter wrong 4-digit PIN > Press Unlock | Error message displays, PIN clears | Both |
| Correct PIN | Enter correct 4-digit PIN > Press Unlock | Profile switches, modal closes | Both |
| Cancel PIN entry | Press Cancel button | Returns to profile selector | Both |
| Navigate buttons | Press Down from PIN input | Focus moves to Cancel/Unlock buttons | Both |

### 3. Visual Appearance on TV

| Check | Expected | Passed |
|-------|----------|--------|
| Profile cards are large enough for TV viewing (min 160px width) | ✓ | [ ] |
| Font sizes are readable from 10 feet distance (20px profile names) | ✓ | [ ] |
| Avatar icons are appropriately sized (72px on TV) | ✓ | [ ] |
| Focus indicators are clearly visible | ✓ | [ ] |
| PIN badge scales appropriately for TV (28x28px) | ✓ | [ ] |
| Header title is large (28px font) | ✓ | [ ] |
| PIN modal is appropriately sized (450px max width) | ✓ | [ ] |
| PIN input has larger font (32px) for TV readability | ✓ | [ ] |

### 4. Accessibility on TV

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Screen reader announces profile | Focus on profile with screen reader enabled | Announces: "{name} profile, {active status}, {PIN protection}" |
| Screen reader announces buttons | Focus on Unlock/Cancel buttons | Announces button label and role |
| All interactive elements focusable | Tab through all elements | All buttons/inputs receive focus |

### 5. Edge Cases

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Single profile | User has only 1 profile | Profile card centered, navigation limited |
| Many profiles (7+) | User has maximum profiles | Horizontal scroll works with d-pad |
| Long profile name | Profile name > 10 characters | Text truncates with ellipsis |
| Rapid navigation | Press d-pad quickly multiple times | Focus moves smoothly without lag |
| Profile switch during animation | Select profile while opening animation runs | Completes without crash |

## Platform-Specific Notes

### Apple TV (tvOS)

- **Remote Controls**: Support Siri Remote (2nd gen) with touch surface and clickpad
- **Focus Engine**: Uses native tvOS focus engine with `hasTVPreferredFocus`
- **Menu Button**: Should close bottom sheet and return to previous screen
- **Play/Pause Button**: No action expected in profile switcher

### Android TV

- **Remote Controls**: Support standard D-pad remotes and game controllers
- **Focus Handling**: Uses React Native's `isTVSelectable` prop
- **Back Button**: Should close bottom sheet
- **Voice Commands**: Not tested in this scope

## Implementation Verification

### Code Review Checklist

- [x] `Platform.isTV` detection implemented
- [x] Dimension-based TV detection (>= 1440px width)
- [x] `hasTVPreferredFocus` set for initial focus
- [x] `isTVSelectable` set on all interactive elements
- [x] Focus state tracked and visually indicated
- [x] TV-specific styles applied (larger fonts, padding, icons)
- [x] Animated focus effects using Reanimated
- [x] Accessibility labels on all elements
- [x] PIN modal supports TV navigation

### Files Reviewed

1. `src/components/profile/ProfileSwitcherBottomSheet.tsx`
   - TV mode detection: Lines 84-87
   - Focus management: Lines 76-78, 239-253
   - TV props: Lines 289-293
   - TV styles: Lines 666-756

2. `src/components/profile/ProfileCard.tsx`
   - TV mode detection: Lines 63-66
   - Animated focus effects: Lines 79-88, 107-118
   - TV props: Lines 159-163
   - TV styles: Lines 265-370

## Test Results Template

```
Date: _______________
Tester: _____________
Platform: [ ] tvOS [ ] Android TV
Device/Simulator: _______________

Test Results:
- [ ] D-Pad Navigation: PASS / FAIL
- [ ] Visual Focus Indicators: PASS / FAIL
- [ ] Profile Selection: PASS / FAIL
- [ ] PIN Entry: PASS / FAIL
- [ ] Close/Back Navigation: PASS / FAIL
- [ ] Accessibility: PASS / FAIL

Issues Found:
1. _______________
2. _______________

Overall: PASS / FAIL with issues / FAIL
```

## Known Limitations

1. **No automated TV E2E tests**: Manual testing required
2. **Simulator limitations**: Physical remote may behave differently than simulator keyboard shortcuts
3. **Android TV variability**: Different manufacturers may have different remote layouts

## Recommended Test Frequency

- **Initial Implementation**: Full test suite on both platforms
- **After UI Changes**: Visual appearance and navigation tests
- **Before Release**: Full regression on both platforms
