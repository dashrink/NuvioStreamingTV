# Android TV Focus Indicators Testing Guide

This document provides a comprehensive testing checklist for verifying focus indicators work correctly on Android TV.

## Prerequisites

### Development Environment Setup

1. **Android TV Emulator**
   ```bash
   # Create an Android TV emulator via Android Studio
   # Device: Android TV (1080p)
   # API Level: 30+ (Android 11+)
   # Target: Android TV (Google APIs)
   ```

2. **Physical Android TV Device**
   - Enable Developer Options: Settings > Device Preferences > About > Build (click 7 times)
   - Enable USB Debugging: Settings > Developer Options > USB Debugging
   - Connect via ADB: `adb connect <device-ip>:5555`

3. **Build for Android TV**
   ```bash
   # Development build
   npx expo run:android

   # Or create an APK
   cd android && ./gradlew assembleDebug
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

## Testing Checklist

### 1. Basic Focus Visibility

| Test | Expected | Status |
|------|----------|--------|
| Focus border appears on focused elements | Clear teal border (#2d9cdb) visible | [ ] |
| Scale animation on focus (cards) | Element scales up slightly (1.05-1.08x) | [ ] |
| Glow/shadow effect on focus | Subtle glow appears behind focused element | [ ] |
| Focus visible on dark backgrounds | Border has sufficient contrast | [ ] |
| Focus visible on light backgrounds | Border remains visible | [ ] |

### 2. D-Pad Navigation

| Test | Expected | Status |
|------|----------|--------|
| D-pad Up moves focus upward | Focus moves to element above | [ ] |
| D-pad Down moves focus downward | Focus moves to element below | [ ] |
| D-pad Left moves focus left | Focus moves to element on left | [ ] |
| D-pad Right moves focus right | Focus moves to element on right | [ ] |
| Focus wraps in horizontal lists | Scrolls to next visible element | [ ] |
| Focus wraps in vertical lists | Scrolls to next visible element | [ ] |

### 3. Select/Enter Button

| Test | Expected | Status |
|------|----------|--------|
| Select on focused button triggers onPress | Action executes | [ ] |
| Select on focused card navigates to detail | Navigation occurs | [ ] |
| Select on focused toggle switches state | Toggle changes | [ ] |
| Select on focused modal option closes modal | Modal closes with selection | [ ] |

### 4. Back Button

| Test | Expected | Status |
|------|----------|--------|
| Back button navigates to previous screen | Navigation occurs | [ ] |
| Back button closes open modal | Modal closes | [ ] |
| Back button closes dropdown menu | Menu closes | [ ] |
| Back button from home screen exits app | App exits/minimizes | [ ] |

### 5. Screen-by-Screen Testing

#### Home Screen
| Component | Focus Working | D-Pad Navigation | Select Action |
|-----------|---------------|------------------|---------------|
| Hero Play button | [ ] | [ ] | [ ] |
| Hero Save button | [ ] | [ ] | [ ] |
| Hero Info button | [ ] | [ ] | [ ] |
| Catalog section "View All" | [ ] | [ ] | [ ] |
| Content cards (posters) | [ ] | [ ] | [ ] |
| Bottom/Top navigation tabs | [ ] | [ ] | [ ] |

#### Metadata Screen (Detail)
| Component | Focus Working | D-Pad Navigation | Select Action |
|-----------|---------------|------------------|---------------|
| Play/Watch button | [ ] | [ ] | [ ] |
| Save to library button | [ ] | [ ] | [ ] |
| Season selector buttons | [ ] | [ ] | [ ] |
| Episode cards | [ ] | [ ] | [ ] |
| Cast member cards | [ ] | [ ] | [ ] |
| Backdrop gallery buttons | [ ] | [ ] | [ ] |

#### Player Controls
| Component | Focus Working | D-Pad Navigation | Select Action |
|-----------|---------------|------------------|---------------|
| Play/Pause button | [ ] | [ ] | [ ] |
| Seek backward (-10s) | [ ] | [ ] | [ ] |
| Seek forward (+10s) | [ ] | [ ] | [ ] |
| Subtitles button | [ ] | [ ] | [ ] |
| Sources button | [ ] | [ ] | [ ] |
| Audio tracks button | [ ] | [ ] | [ ] |
| Close/Back button | [ ] | [ ] | [ ] |

#### Search Screen
| Component | Focus Working | D-Pad Navigation | Select Action |
|-----------|---------------|------------------|---------------|
| Search input field | [ ] | [ ] | [ ] |
| Clear search button | [ ] | [ ] | [ ] |
| Search result cards | [ ] | [ ] | [ ] |
| Recent search items | [ ] | [ ] | [ ] |
| Delete recent search | [ ] | [ ] | [ ] |

#### Library Screen
| Component | Focus Working | D-Pad Navigation | Select Action |
|-----------|---------------|------------------|---------------|
| Filter buttons | [ ] | [ ] | [ ] |
| Library content cards | [ ] | [ ] | [ ] |
| Trakt folder items | [ ] | [ ] | [ ] |
| Empty state action button | [ ] | [ ] | [ ] |

#### Settings Screen
| Component | Focus Working | D-Pad Navigation | Select Action |
|-----------|---------------|------------------|---------------|
| Settings list items | [ ] | [ ] | [ ] |
| Radio options | [ ] | [ ] | [ ] |
| Segmented controls | [ ] | [ ] | [ ] |
| Back button | [ ] | [ ] | [ ] |
| External link buttons | [ ] | [ ] | [ ] |

#### Modals
| Component | Focus Working | D-Pad Navigation | Select Action |
|-----------|---------------|------------------|---------------|
| Sources modal items | [ ] | [ ] | [ ] |
| Subtitle modal tabs | [ ] | [ ] | [ ] |
| Subtitle track items | [ ] | [ ] | [ ] |
| Audio track modal items | [ ] | [ ] | [ ] |
| Episodes modal seasons | [ ] | [ ] | [ ] |
| DropUpMenu options | [ ] | [ ] | [ ] |

### 6. Animation Performance

| Test | Expected | Status |
|------|----------|--------|
| Focus animations run at 60fps | No visible stuttering | [ ] |
| Scale animations smooth | No jank during scale | [ ] |
| Border color transitions smooth | No flickering | [ ] |
| Shadow/glow animations smooth | No performance issues | [ ] |

### 7. Focus Memory

| Test | Expected | Status |
|------|----------|--------|
| Focus position saved on navigate away | Position remembered | [ ] |
| Focus restored when returning to screen | Focus returns to last position | [ ] |
| Fresh navigation clears focus memory | Default focus applied | [ ] |

### 8. Initial Focus (hasTVPreferredFocus)

| Test | Expected | Status |
|------|----------|--------|
| Home screen: First tab has focus | Tab focused on load | [ ] |
| Metadata: Play button has focus | Button focused on load | [ ] |
| Modal: First option has focus | Option focused on open | [ ] |
| Search: Search input has focus | Input focused on load | [ ] |

## Debug Overlay Usage

Enable the FocusDebugOverlay in development to visualize focus state:

```tsx
// In App.tsx or root component
import { FocusDebugOverlay } from './components/debug';

function App() {
  return (
    <FocusProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      {__DEV__ && <FocusDebugOverlay enabled position="top-right" />}
    </FocusProvider>
  );
}
```

The overlay shows:
- Current platform (Android TV/tvOS/Mobile)
- TV mode status
- Current focus ID
- Active focus group
- Focus history (last 5 elements)

## Common Issues & Solutions

### Issue: Focus not visible
- **Cause**: Border color too similar to background
- **Solution**: Use variant with higher contrast or customize border color

### Issue: D-pad navigation skips elements
- **Cause**: Elements not marked as focusable
- **Solution**: Ensure `focusable={true}` or element has Focusable wrapper

### Issue: Focus gets stuck
- **Cause**: Isolated focusable element with no neighbors
- **Solution**: Use nextFocusDown/Up/Left/Right props to define explicit navigation

### Issue: Animation lag on focus change
- **Cause**: Too many simultaneous animations or complex components
- **Solution**: Use `enableScale={false}` or `enableGlow={false}` to simplify

### Issue: Select button not working
- **Cause**: onPress not properly bound
- **Solution**: Ensure onPress is passed to Focusable component

### Issue: Back button not working
- **Cause**: Custom BackHandler not properly configured
- **Solution**: Check BackHandler.addEventListener in screen components

## Testing Commands

```bash
# Install on connected device
adb install -r app/build/outputs/apk/debug/app-debug.apk

# View logs
adb logcat -s ReactNativeJS

# Send D-pad events
adb shell input keyevent KEYCODE_DPAD_UP
adb shell input keyevent KEYCODE_DPAD_DOWN
adb shell input keyevent KEYCODE_DPAD_LEFT
adb shell input keyevent KEYCODE_DPAD_RIGHT
adb shell input keyevent KEYCODE_DPAD_CENTER  # Select
adb shell input keyevent KEYCODE_BACK

# Simulate TV remote
adb shell input keyevent KEYCODE_HOME
adb shell input keyevent KEYCODE_MENU
```

## Accessibility Considerations

- All focusable elements should have `accessibilityLabel`
- Use `accessibilityHint` for elements with non-obvious actions
- Ensure `accessibilityRole` is correct (button, link, etc.)
- Test with TalkBack enabled for screen reader support

## Reporting Issues

When reporting focus-related issues, include:
1. Device/emulator model and Android version
2. Screen where issue occurs
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshot/video if possible
6. FocusDebugOverlay output if available
