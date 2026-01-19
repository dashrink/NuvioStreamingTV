# tvOS Focus Indicators Testing Guide

This document provides a comprehensive testing checklist for verifying focus indicators work correctly on Apple TV (tvOS).

## Prerequisites

### Development Environment Setup

1. **Xcode Requirements**
   - Xcode 14.0 or later (preferably latest stable)
   - tvOS SDK installed (Xcode > Preferences > Components)
   - Command Line Tools installed

2. **tvOS Simulator**
   ```bash
   # List available tvOS simulators
   xcrun simctl list devices | grep "Apple TV"

   # Create a tvOS simulator if needed (via Xcode)
   # Window > Devices and Simulators > Simulators > + button
   # Select "Apple TV 4K" or "Apple TV HD"
   ```

3. **Physical Apple TV Device**
   - Apple TV 4K or Apple TV HD with tvOS 15.0+
   - On Apple TV: Settings > Remotes and Devices > Remote App and Devices
   - Pair with Xcode: Window > Devices and Simulators > + button
   - Connect both Mac and Apple TV to same network

4. **Build for tvOS**
   ```bash
   # Build for tvOS simulator
   npx expo run:ios --device "Apple TV"

   # Or via Xcode
   # Open ios/Nuvio.xcworkspace
   # Select tvOS target and Apple TV simulator/device
   # Product > Run (Cmd+R)
   ```

## Siri Remote Navigation

### Understanding tvOS Focus

Unlike Android TV's D-pad, Apple TV uses the Siri Remote with:
- **Touch Surface**: Swipe to navigate, click to select
- **Menu Button**: Go back, exit to home screen
- **Play/Pause Button**: Control media playback
- **Home Button (TV Button)**: Exit to Apple TV home screen
- **Volume Buttons**: Control volume (Siri Remote 2nd gen)
- **Siri Button**: Voice control

### Focus Navigation Gestures

| Gesture | Action |
|---------|--------|
| Swipe Up | Move focus up |
| Swipe Down | Move focus down |
| Swipe Left | Move focus left |
| Swipe Right | Move focus right |
| Click (Press Down) | Select focused item |
| Menu Button | Go back / Exit |

### Simulator Remote Control

In tvOS Simulator, use:
- **Hardware > Show Apple TV Remote** (or Cmd+Shift+R)
- Mouse clicks simulate touch surface
- Keyboard arrows for navigation
- Enter/Return for select
- Escape for Menu button

## Testing Checklist

### 1. Basic Focus Visibility

| Test | Expected | Status |
|------|----------|--------|
| Focus border appears on focused elements | Clear teal border (#2d9cdb) visible | [ ] |
| Scale animation on focus (cards) | Element scales up slightly (1.05-1.08x) | [ ] |
| Glow/shadow effect on focus | Subtle glow appears behind focused element | [ ] |
| Focus visible on dark backgrounds | Border has sufficient contrast | [ ] |
| Focus visible on light backgrounds | Border remains visible | [ ] |
| Focus parallax effect (if enabled) | Natural depth feel on focus | [ ] |

### 2. Siri Remote Navigation

| Test | Expected | Status |
|------|----------|--------|
| Swipe Up moves focus upward | Focus moves to element above | [ ] |
| Swipe Down moves focus downward | Focus moves to element below | [ ] |
| Swipe Left moves focus left | Focus moves to element on left | [ ] |
| Swipe Right moves focus right | Focus moves to element on right | [ ] |
| Focus wraps in horizontal lists | Scrolls to next visible element | [ ] |
| Focus wraps in vertical lists | Scrolls to next visible element | [ ] |
| Diagonal swipes work | Focus moves diagonally when appropriate | [ ] |
| Fast swipes accelerate focus movement | Quick navigation through lists | [ ] |

### 3. Select/Click Button

| Test | Expected | Status |
|------|----------|--------|
| Click on focused button triggers onPress | Action executes | [ ] |
| Click on focused card navigates to detail | Navigation occurs | [ ] |
| Click on focused toggle switches state | Toggle changes | [ ] |
| Click on focused modal option closes modal | Modal closes with selection | [ ] |
| Long press triggers onLongPress | Context menu appears | [ ] |

### 4. Menu Button

| Test | Expected | Status |
|------|----------|--------|
| Menu button navigates to previous screen | Navigation occurs | [ ] |
| Menu button closes open modal | Modal closes | [ ] |
| Menu button closes dropdown menu | Menu closes | [ ] |
| Menu button from home screen shows exit dialog | tvOS behavior | [ ] |
| Menu button during video playback shows controls | Player controls appear | [ ] |

### 5. Play/Pause Button

| Test | Expected | Status |
|------|----------|--------|
| Play/Pause toggles video playback | Video pauses/resumes | [ ] |
| Works from any screen with active playback | Control accessible | [ ] |

### 6. Screen-by-Screen Testing

#### Home Screen
| Component | Focus Working | Navigation | Select Action |
|-----------|---------------|------------|---------------|
| Hero Play button | [ ] | [ ] | [ ] |
| Hero Save button | [ ] | [ ] | [ ] |
| Hero Info button | [ ] | [ ] | [ ] |
| Catalog section "View All" | [ ] | [ ] | [ ] |
| Content cards (posters) | [ ] | [ ] | [ ] |
| Top/Bottom navigation tabs | [ ] | [ ] | [ ] |

#### Metadata Screen (Detail)
| Component | Focus Working | Navigation | Select Action |
|-----------|---------------|------------|---------------|
| Play/Watch button | [ ] | [ ] | [ ] |
| Save to library button | [ ] | [ ] | [ ] |
| Season selector buttons | [ ] | [ ] | [ ] |
| Episode cards | [ ] | [ ] | [ ] |
| Cast member cards | [ ] | [ ] | [ ] |
| Backdrop gallery buttons | [ ] | [ ] | [ ] |

#### Player Controls
| Component | Focus Working | Navigation | Select Action |
|-----------|---------------|------------|---------------|
| Play/Pause button | [ ] | [ ] | [ ] |
| Seek backward (-10s) | [ ] | [ ] | [ ] |
| Seek forward (+10s) | [ ] | [ ] | [ ] |
| AirPlay button | [ ] | [ ] | [ ] |
| Subtitles button | [ ] | [ ] | [ ] |
| Sources button | [ ] | [ ] | [ ] |
| Audio tracks button | [ ] | [ ] | [ ] |
| Close/Back button | [ ] | [ ] | [ ] |

#### Search Screen
| Component | Focus Working | Navigation | Select Action |
|-----------|---------------|------------|---------------|
| Search input field | [ ] | [ ] | [ ] |
| Clear search button | [ ] | [ ] | [ ] |
| Search result cards | [ ] | [ ] | [ ] |
| Recent search items | [ ] | [ ] | [ ] |
| Delete recent search | [ ] | [ ] | [ ] |

#### Library Screen
| Component | Focus Working | Navigation | Select Action |
|-----------|---------------|------------|---------------|
| Filter buttons | [ ] | [ ] | [ ] |
| Library content cards | [ ] | [ ] | [ ] |
| Trakt folder items | [ ] | [ ] | [ ] |
| Empty state action button | [ ] | [ ] | [ ] |

#### Settings Screen
| Component | Focus Working | Navigation | Select Action |
|-----------|---------------|------------|---------------|
| Settings list items | [ ] | [ ] | [ ] |
| Radio options | [ ] | [ ] | [ ] |
| Segmented controls | [ ] | [ ] | [ ] |
| Back button | [ ] | [ ] | [ ] |
| External link buttons | [ ] | [ ] | [ ] |

#### Modals
| Component | Focus Working | Navigation | Select Action |
|-----------|---------------|------------|---------------|
| Sources modal items | [ ] | [ ] | [ ] |
| Subtitle modal tabs | [ ] | [ ] | [ ] |
| Subtitle track items | [ ] | [ ] | [ ] |
| Audio track modal items | [ ] | [ ] | [ ] |
| Episodes modal seasons | [ ] | [ ] | [ ] |
| DropUpMenu options | [ ] | [ ] | [ ] |

### 7. Animation Performance

| Test | Expected | Status |
|------|----------|--------|
| Focus animations run at 60fps | No visible stuttering | [ ] |
| Scale animations smooth | No jank during scale | [ ] |
| Border color transitions smooth | No flickering | [ ] |
| Shadow/glow animations smooth | No performance issues | [ ] |
| Animations maintain 60fps during scrolling | Smooth experience | [ ] |

### 8. Focus Memory

| Test | Expected | Status |
|------|----------|--------|
| Focus position saved on navigate away | Position remembered | [ ] |
| Focus restored when returning to screen | Focus returns to last position | [ ] |
| Fresh navigation clears focus memory | Default focus applied | [ ] |
| Menu button preserves focus hierarchy | Back navigation restores focus | [ ] |

### 9. Initial Focus (hasTVPreferredFocus)

| Test | Expected | Status |
|------|----------|--------|
| Home screen: First element has focus | Element focused on load | [ ] |
| Metadata: Play button has focus | Button focused on load | [ ] |
| Modal: First option has focus | Option focused on open | [ ] |
| Search: Search input has focus | Input focused on load | [ ] |

### 10. tvOS-Specific Features

| Test | Expected | Status |
|------|----------|--------|
| Native focus engine integrates properly | React Native focus syncs with tvOS | [ ] |
| Haptic feedback works (Siri Remote) | Subtle vibration on focus change | [ ] |
| VoiceOver accessibility works | Screen reader announces focused element | [ ] |
| Focus guides work correctly | Focus moves in expected patterns | [ ] |

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
- Current platform (tvOS detected)
- TV mode status
- Current focus ID
- Active focus group
- Focus history (last 5 elements)

## tvOS-Specific Focus Considerations

### Native Focus Engine

tvOS has its own native focus engine that works alongside React Native's focus system:

1. **Focus Engine Priority**
   - tvOS prefers elements in the direction of swipe
   - Larger visible elements may attract focus more easily
   - Partially visible elements may not receive focus

2. **Scroll Behavior**
   - Lists automatically scroll to keep focused element visible
   - Horizontal lists should scroll smoothly with focus
   - Vertical lists behave similarly

3. **Focus Movement Sound**
   - tvOS plays subtle system sounds on focus change
   - App can provide additional haptic feedback via settings

### Apple TV Human Interface Guidelines

Follow Apple's guidelines for TV apps:
- Focus indicators should be clearly visible
- Avoid too many focusable elements on screen
- Group related items logically
- Support expected tvOS gestures

## Common Issues & Solutions

### Issue: Focus not visible
- **Cause**: Border color too similar to background
- **Solution**: Use variant with higher contrast or customize border color

### Issue: Focus jumps unexpectedly
- **Cause**: tvOS focus engine finding closer target
- **Solution**: Adjust element layout or use focus guides

### Issue: Focus doesn't move to expected element
- **Cause**: Element not properly configured for focus
- **Solution**: Ensure Focusable wrapper is applied with proper props

### Issue: Animation lag on focus change
- **Cause**: Too many simultaneous animations or complex components
- **Solution**: Use `enableScale={false}` or `enableGlow={false}` to simplify

### Issue: Menu button not working
- **Cause**: Custom gesture handlers intercepting button
- **Solution**: Check TVMenuControl setup and BackHandler configuration

### Issue: Siri Remote swipes not detected
- **Cause**: ScrollView or other gesture responder blocking
- **Solution**: Ensure proper gesture handling hierarchy

### Issue: Focus gets stuck in modal
- **Cause**: Modal focus trap not properly configured
- **Solution**: Ensure modal has properly focusable dismiss option

## Testing Commands

```bash
# List available tvOS simulators
xcrun simctl list devices | grep "Apple TV"

# Boot a specific simulator
xcrun simctl boot "Apple TV 4K (3rd generation)"

# Install app on simulator
xcrun simctl install booted /path/to/Nuvio.app

# Launch app on simulator
xcrun simctl launch booted com.nuvio.app

# Take screenshot from simulator
xcrun simctl io booted screenshot ~/Desktop/tvos_screenshot.png

# Record video from simulator
xcrun simctl io booted recordVideo ~/Desktop/tvos_recording.mov

# View app logs
xcrun simctl spawn booted log stream --predicate 'subsystem == "com.nuvio.app"'

# Reset simulator (clear all data)
xcrun simctl erase booted
```

## Keyboard Shortcuts (Simulator)

| Shortcut | Action |
|----------|--------|
| Arrow Keys | Navigate focus |
| Enter/Return | Select |
| Escape | Menu button |
| Cmd+Shift+R | Show/hide Apple TV Remote |
| Cmd+Left Arrow | Volume down |
| Cmd+Right Arrow | Volume up |

## Accessibility Testing

### VoiceOver Testing

1. **Enable VoiceOver on Apple TV**
   - Settings > Accessibility > VoiceOver > On

2. **Test Announcements**
   - All focusable elements should announce properly
   - Button roles should be spoken
   - State changes should be announced

3. **Accessibility Labels**
   - Verify accessibilityLabel text is meaningful
   - Check accessibilityHint provides useful context

### Testing with VoiceOver

| Test | Expected | Status |
|------|----------|--------|
| Focused element is announced | Clear description spoken | [ ] |
| Button role announced | "Button" or action spoken | [ ] |
| Selected state announced | "Selected" when applicable | [ ] |
| Disabled state announced | "Dimmed" when disabled | [ ] |
| Hint announced after label | Additional context provided | [ ] |

## Reporting Issues

When reporting focus-related issues on tvOS, include:
1. Apple TV model and tvOS version
2. Simulator vs physical device
3. Screen where issue occurs
4. Steps to reproduce
5. Expected vs actual behavior
6. Screenshot/video if possible
7. FocusDebugOverlay output if available
8. Console logs from Xcode

## Resources

- [Apple TV Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/tvos)
- [tvOS Simulator Help](https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device)
- [React Native TV Documentation](https://reactnative.dev/docs/building-for-tv)
- [Focus Engine Documentation](https://developer.apple.com/documentation/uikit/focus-based_navigation)
