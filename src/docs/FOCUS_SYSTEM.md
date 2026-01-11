# TV Focus System Documentation

This document provides comprehensive documentation for the TV Focus System implementation, which provides clear, consistent focus indicators for TV and remote navigation on both Android TV and tvOS platforms.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Components](#core-components)
  - [Focusable Component](#focusable-component)
  - [useTVFocus Hook](#usetvfocus-hook)
  - [FocusContext](#focuscontext)
  - [Focus Styles](#focus-styles)
- [Usage Patterns](#usage-patterns)
- [Variants](#variants)
- [Best Practices](#best-practices)
- [Platform-Specific Considerations](#platform-specific-considerations)
- [Debugging](#debugging)

## Overview

The focus system provides visual feedback for TV remote navigation, enabling users to:
- See which element is currently focused via border, scale, and glow effects
- Navigate between elements using D-pad (Android TV) or Siri Remote (tvOS)
- Experience smooth 60fps animations during focus transitions
- Receive haptic feedback on focus changes (when enabled)

### Key Features

- **Animated Focus Indicators**: Border, scale, and shadow/glow effects
- **Multiple Variants**: card, button, listItem, hero, nav, modal
- **Platform Detection**: Automatic TV platform detection (Android TV, tvOS)
- **Focus Memory**: Remember and restore focus position per screen
- **Haptic Feedback**: Optional haptic feedback on focus changes
- **Accessibility**: Full screen reader support with labels and hints

## Architecture

```
src/
├── components/
│   └── common/
│       └── Focusable.tsx        # Main reusable wrapper component
├── contexts/
│   └── FocusContext.tsx         # Global focus state management
├── hooks/
│   ├── useTVFocus.ts            # Core focus state hook
│   └── useFocusMemory.ts        # Focus memory/restoration hook
├── styles/
│   └── focusStyles.ts           # Focus style constants
└── utils/
    └── focusSound.ts            # Haptic feedback utility
```

## Core Components

### Focusable Component

The `Focusable` component is the primary way to add focus indicators to interactive elements.

**Location**: `src/components/common/Focusable.tsx`

#### Basic Usage

```tsx
import Focusable from '@/components/common/Focusable';

// Wrap any interactive element
<Focusable variant="card" onPress={() => navigate('Details')}>
  <View style={styles.card}>
    <Image source={{ uri: poster }} />
    <Text>{title}</Text>
  </View>
</Focusable>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `FocusVariant` | `'card'` | Focus style variant |
| `borderRadius` | `number` | Variant default | Custom border radius |
| `enableScale` | `boolean` | `true` | Enable scale animation |
| `enableBorder` | `boolean` | `true` | Enable border animation |
| `enableGlow` | `boolean` | `true` | Enable glow/shadow effect |
| `onPress` | `function` | - | Touch/select handler |
| `onLongPress` | `function` | - | Long press handler |
| `hasTVPreferredFocus` | `boolean` | `false` | Should receive initial focus |
| `disabled` | `boolean` | `false` | Disable interactions |
| `accessibilityLabel` | `string` | - | Screen reader label |
| `accessibilityHint` | `string` | - | Screen reader hint |
| `nativeID` | `string` | - | Android TV D-pad navigation reference |
| `tvParallaxProperties` | `object` | - | tvOS parallax effect properties |

#### Common Patterns

```tsx
// Button with minimal effects
<Focusable
  variant="button"
  enableScale={false}
  enableGlow={false}
  borderRadius={20}
  onPress={handleSubmit}
>
  <Text>Submit</Text>
</Focusable>

// List item
<Focusable variant="listItem" enableScale={false}>
  <SettingsRow title="Notifications" />
</Focusable>

// Modal item with initial focus
<Focusable
  variant="modal"
  hasTVPreferredFocus={isFirstItem}
  enableScale={false}
  onPress={handleSelect}
>
  <Text>{optionLabel}</Text>
</Focusable>

// Card with custom border radius
<Focusable
  variant="card"
  borderRadius={16}
  accessibilityLabel={`${title} poster`}
  onPress={() => goToDetails(id)}
>
  <PosterImage source={{ uri: poster }} />
</Focusable>
```

### useTVFocus Hook

Low-level hook for custom focus handling when you need more control than `Focusable` provides.

**Location**: `src/hooks/useTVFocus.ts`

#### Usage

```tsx
import { useTVFocus } from '@/hooks/useTVFocus';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';

function CustomFocusableComponent({ onPress }) {
  const { isFocused, focusAnim, focusProps, isTV } = useTVFocus({
    onFocus: () => console.log('Focused'),
    onBlur: () => console.log('Blurred'),
    hasTVPreferredFocus: true,
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(focusAnim.value, [0, 1], [1, 1.05]) }],
    borderWidth: 2,
    borderColor: isFocused ? '#2d9cdb' : 'transparent',
  }));

  return (
    <TouchableOpacity {...focusProps} onPress={onPress}>
      <Animated.View style={animatedStyle}>
        {/* Content */}
      </Animated.View>
    </TouchableOpacity>
  );
}
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `isFocused` | `boolean` | Current focus state |
| `focusAnim` | `SharedValue<number>` | Animated value (0-1) for custom animations |
| `focusProps` | `object` | Props to spread on focusable element |
| `setFocused` | `function` | Manual focus control |
| `isTV` | `boolean` | Running on TV platform |
| `isTVFocusEnabled` | `boolean` | TV focus features active |
| `isAndroidTV` | `boolean` | Running on Android TV |
| `isTVOS` | `boolean` | Running on Apple TV |

### FocusContext

Global focus state management for tracking focus across the app.

**Location**: `src/contexts/FocusContext.tsx`

#### Setup

Wrap your app with `FocusProvider` at the root level:

```tsx
import { FocusProvider } from '@/contexts/FocusContext';

function App() {
  return (
    <FocusProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </FocusProvider>
  );
}
```

#### Usage in Components

```tsx
import { useFocus, useFocusOptional } from '@/contexts/FocusContext';

function MyComponent() {
  // Will throw if FocusProvider not found
  const { currentFocusId, setFocus, isFocused } = useFocus();

  // Returns null if FocusProvider not found (safer)
  const focusContext = useFocusOptional();

  return (
    <View>
      <Text>Current focus: {currentFocusId}</Text>
    </View>
  );
}
```

#### Context Value

| Property | Type | Description |
|----------|------|-------------|
| `currentFocusId` | `string \| null` | Currently focused element ID |
| `currentGroupId` | `string \| null` | Active focus group ID |
| `setFocus(id, groupId?)` | `function` | Set focus to element |
| `clearFocus()` | `function` | Clear current focus |
| `isFocused(id)` | `function` | Check if element is focused |
| `registerGroup(id)` | `function` | Register a focus group |
| `focusFirst(groupId?)` | `function` | Focus first element in group |
| `focusNext()` | `function` | Focus next element |
| `focusPrevious()` | `function` | Focus previous element |
| `saveFocusMemory(screen)` | `function` | Save current focus for screen |
| `restoreFocusMemory(screen)` | `function` | Restore focus for screen |

### Focus Styles

Centralized focus style constants for consistent appearance.

**Location**: `src/styles/focusStyles.ts`

#### Available Constants

```tsx
import {
  focusBorder,      // Border colors and widths
  focusScale,       // Scale transform values
  focusShadow,      // Shadow/glow configurations
  focusAnimation,   // Animation timing/easing
  focusSpringConfig,// Spring animation configs
  tvSizing,         // TV-specific sizing adjustments
  getFocusStyleConfig, // Get config for variant
  focusColors,      // Colors for interpolation
  focusScaleValues, // Scale values for interpolation
  focusedStyles,    // Ready-to-use focused styles
  unfocusedStyles,  // Ready-to-use unfocused styles
} from '@/styles/focusStyles';
```

#### Style Values

| Constant | Value | Description |
|----------|-------|-------------|
| `focusBorder.color` | `#2d9cdb` | Primary focus border color |
| `focusBorder.width` | `2-3px` | Standard border width |
| `focusScale.card` | `1.08` | Card scale factor |
| `focusScale.button` | `1.03` | Button scale factor |
| `focusScale.listItem` | `1.02` | List item scale factor |
| `focusShadow.opacity` | `0.6` | Shadow opacity |
| `focusAnimation.durationIn` | `200ms` | Focus-in animation |

## Usage Patterns

### Cards and Posters

```tsx
<Focusable
  variant="card"
  borderRadius={posterBorderRadius}
  onPress={() => navigateToDetail(item)}
  accessibilityLabel={`${item.title} poster`}
  accessibilityHint="Double tap to view details"
>
  <PosterImage source={{ uri: item.poster }} />
  <Text>{item.title}</Text>
</Focusable>
```

### Buttons

```tsx
<Focusable
  variant="button"
  enableScale={false}    // Often disabled to preserve tap animations
  enableGlow={false}     // Cleaner appearance
  borderRadius={24}
  hasTVPreferredFocus={isPrimary}
  onPress={handlePress}
  accessibilityLabel={buttonLabel}
>
  <Icon name="play" />
  <Text>Play</Text>
</Focusable>
```

### Settings/List Items

```tsx
<Focusable
  variant="listItem"
  enableScale={false}
  enableGlow={false}
  onPress={() => toggleSetting(key)}
  accessibilityLabel={settingName}
  accessibilityHint={`Currently ${enabled ? 'enabled' : 'disabled'}`}
>
  <SettingRow title={settingName} value={enabled} />
</Focusable>
```

### Navigation Tabs

```tsx
<Focusable
  variant="nav"
  enableScale={false}
  enableGlow={false}
  hasTVPreferredFocus={isFirstTab}
  borderRadius={isTablet ? 24 : 12}
  onPress={() => navigateToTab(index)}
  accessibilityLabel={tabName}
>
  <Icon name={tabIcon} color={isActive ? primaryColor : inactiveColor} />
  <Text>{tabName}</Text>
</Focusable>
```

### Modal Options

```tsx
{options.map((option, index) => (
  <Focusable
    key={option.id}
    variant="modal"
    enableScale={false}
    enableGlow={false}
    hasTVPreferredFocus={index === 0}  // First option gets initial focus
    onPress={() => selectOption(option)}
    accessibilityLabel={option.label}
  >
    <Text>{option.label}</Text>
  </Focusable>
))}
```

### Hero/Featured Elements

```tsx
<Focusable
  variant="hero"
  hasTVPreferredFocus
  borderRadius={28}
  onPress={playContent}
  accessibilityLabel={`Play ${title}`}
  accessibilityHint="Start playback"
>
  <PlayButton />
</Focusable>
```

## Variants

| Variant | Use Case | Scale | Border Width | Shadow |
|---------|----------|-------|--------------|--------|
| `card` | Poster cards, thumbnails | 1.08 | 2-3px | Default |
| `button` | Action buttons, controls | 1.03 | 1-2px | Subtle |
| `listItem` | Settings rows, list items | 1.02 | 1-2px | Subtle |
| `hero` | Featured content, main CTAs | 1.04 | 3-4px | Large |
| `nav` | Tab bar items, navigation | 1.03 | 1-2px | None |
| `modal` | Modal options, dialogs | 1.02 | 2-3px | Subtle |

## Best Practices

### 1. Always Use Focusable for Interactive Elements

```tsx
// Good - wrapped with Focusable
<Focusable variant="card" onPress={handlePress}>
  <View style={styles.card}>{content}</View>
</Focusable>

// Bad - raw TouchableOpacity won't have focus indicators on TV
<TouchableOpacity onPress={handlePress}>
  <View style={styles.card}>{content}</View>
</TouchableOpacity>
```

### 2. Disable Unnecessary Effects for Cleaner UX

```tsx
// For list items and compact elements
<Focusable
  variant="listItem"
  enableScale={false}   // Prevent list from expanding
  enableGlow={false}    // Reduce visual noise
  onPress={onPress}
>
```

### 3. Set Initial Focus with hasTVPreferredFocus

```tsx
// First tab gets focus when screen loads
<Focusable hasTVPreferredFocus={index === 0}>
  {tabContent}
</Focusable>

// Primary action in modal gets focus
<Focusable hasTVPreferredFocus onPress={confirmAction}>
  <Text>Confirm</Text>
</Focusable>
```

### 4. Always Include Accessibility Properties

```tsx
<Focusable
  variant="card"
  accessibilityLabel={`${movie.title}, ${movie.year}`}
  accessibilityHint="Double tap to view movie details"
  onPress={() => goToMovie(movie.id)}
>
```

### 5. Use Appropriate Border Radius

```tsx
// Match the content's visual style
<Focusable
  variant="card"
  borderRadius={settings.posterBorderRadius}  // Dynamic from settings
>

// Buttons typically use rounded corners
<Focusable variant="button" borderRadius={24}>
```

### 6. Group Related Elements

Use focus groups for logical sections:

```tsx
const { registerGroup, setActiveGroup } = useFocus();

useEffect(() => {
  registerGroup('hero-buttons');
  registerGroup('content-grid');
}, []);
```

## Platform-Specific Considerations

### Android TV

- Uses D-pad for navigation (up/down/left/right)
- Select button triggers `onPress`
- Back button navigates back or closes modals
- Support `nextFocusDown`, `nextFocusUp`, `nextFocusLeft`, `nextFocusRight` for explicit navigation
- Use `nativeID` for D-pad navigation references

```tsx
<Focusable
  nativeID="play-button"
  nextFocusDown={pauseButtonRef}
  nextFocusRight={nextTrackRef}
>
```

### tvOS (Apple TV)

- Uses Siri Remote with touch surface for navigation
- Click/Press triggers `onPress`
- Menu button navigates back
- Support `tvParallaxProperties` for parallax effects

```tsx
<Focusable
  tvParallaxProperties={{
    enabled: true,
    magnification: 1.1,
    tiltAngle: 0.05,
  }}
>
```

## Debugging

### FocusDebugOverlay

Use the debug overlay in development to visualize focus state:

```tsx
import FocusDebugOverlay from '@/components/debug/FocusDebugOverlay';

// In App.tsx
{__DEV__ && <FocusDebugOverlay enabled position="top-right" />}
```

Shows:
- Current platform (Android TV/tvOS/Mobile)
- TV mode status
- Current focus ID
- Active focus group
- Focus history

### Platform Testing

- **Android TV**: See [ANDROID_TV_TESTING.md](./ANDROID_TV_TESTING.md)
- **tvOS**: See [TVOS_TESTING.md](./TVOS_TESTING.md)

## Focus Memory & Restoration

Use `useFocusMemory` hook for automatic focus save/restore when navigating between screens:

```tsx
import { useFocusMemory } from '@/hooks/useFocusMemory';

function LibraryScreen() {
  // Automatically saves focus on navigate away, restores on return
  useFocusMemory();

  return <Content />;
}

// With options
function SearchScreen({ route }) {
  useFocusMemory({
    screenName: 'Search',
    restoreDelay: 200,
    defaultFocusId: 'search-input',
    freshNavigation: route.params?.fresh ?? false,
  });

  return <Content />;
}
```

## Haptic Feedback

Focus changes can trigger haptic feedback (enabled by default on TV):

```tsx
import { triggerFocusFeedback, setFocusFeedbackEnabled } from '@/utils/focusSound';

// Manually trigger feedback
triggerFocusFeedback('selection');

// Disable feedback
setFocusFeedbackEnabled(false);
```

Feedback types:
- `navigation`: Light haptic for focus movement
- `selection`: Selection haptic for item selection
- `action`: Medium haptic for confirming actions

## Migrating Existing Components

To add focus support to an existing component:

1. **Wrap with Focusable**:
   ```tsx
   // Before
   <TouchableOpacity onPress={onPress}>
     <Content />
   </TouchableOpacity>

   // After
   <Focusable variant="card" onPress={onPress}>
     <Content />
   </Focusable>
   ```

2. **Remove Static Focus Styles**:
   ```tsx
   // Remove these from your stylesheet - Focusable handles them
   // borderWidth, borderColor, shadowColor, shadowOpacity, elevation
   ```

3. **Add Accessibility**:
   ```tsx
   <Focusable
     accessibilityLabel={descriptiveLabel}
     accessibilityHint={actionHint}
   >
   ```

4. **Set Initial Focus** (if needed):
   ```tsx
   <Focusable hasTVPreferredFocus={shouldReceiveInitialFocus}>
   ```

## Related Files

| File | Purpose |
|------|---------|
| `src/components/common/Focusable.tsx` | Main focusable wrapper component |
| `src/hooks/useTVFocus.ts` | Core focus state hook |
| `src/hooks/useFocusMemory.ts` | Focus memory/restoration |
| `src/contexts/FocusContext.tsx` | Global focus state context |
| `src/styles/focusStyles.ts` | Focus style constants |
| `src/utils/focusSound.ts` | Haptic feedback utility |
| `src/components/debug/FocusDebugOverlay.tsx` | Development debug overlay |
