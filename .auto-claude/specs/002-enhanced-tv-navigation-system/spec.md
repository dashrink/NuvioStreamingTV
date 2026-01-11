# Specification: Enhanced TV Navigation System

## Overview

This specification details the implementation of a production-grade, remote-first navigation system for Apple TV and Android TV platforms. The system addresses Stremio's #1 user complaint (poor TV navigation) and exploits a major market gap where competitors like Kodi struggle with TV/mobile UX. The implementation will deliver a native-feeling experience matching Apple TV+ quality standards, with complete D-pad coverage, intelligent focus management, long-press interactions, and spatial navigation with memory.

## Workflow Type

**Type**: Feature

**Rationale**: This is a new capability addition to the existing React Native codebase. While some TV navigation infrastructure already exists (useTVEventHandler, Focusable.tv.tsx, useSpatialNavigation), this task requires building a comprehensive, production-ready system that transforms the entire app's navigation paradigm. This is not a refactor of existing functionality but rather the implementation of new features (long-press menus, focus memory, voice search integration) alongside enhancement of existing TV support to meet Apple TV+ quality benchmarks.

## Task Scope

### Services Involved
- **main** (primary) - React Native TypeScript frontend containing all UI components, navigation logic, and TV-specific interaction layers

### This Task Will:
- [ ] Implement universal D-pad focusability across all UI components
- [ ] Create consistent, visible focus states with smooth animations
- [ ] Build long-press detection system for context menus and quick actions
- [ ] Develop spatial navigation with focus memory that persists across screen transitions
- [ ] Ensure predictable back button behavior throughout the app
- [ ] Integrate TV remote voice search capabilities
- [ ] Eliminate all focus traps and unreachable UI elements
- [ ] Establish reusable TV navigation primitives for future development

### Out of Scope:
- Web browser TV navigation (focus is Apple TV and Android TV native apps only)
- Mobile phone/tablet touch-optimized navigation improvements
- Smart TV browser apps (Samsung Tizen, LG webOS)
- Game controller support beyond standard TV remotes
- Accessibility features beyond focus management (screen readers, high contrast modes)

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React Native with react-native-tvos
- Navigation: @react-navigation/native v7.1.6
- Animation: react-native-reanimated v4.2.0
- Gesture handling: react-native-gesture-handler v2.29.1
- Key directories: src/, app/, components/

**Entry Point:** `index.ts`

**How to Run:**
```bash
# Standard development mode
npm run start

# TV-specific development mode (APP_VARIANT=tv)
npm run start:tv

# Prebuild TV native projects
npm run prebuild:tv
```

**Port:** 3000

**Platform Detection:**
- Use `Platform.isTV` to detect Apple TV or Android TV
- Metro automatically loads `.tv.tsx` file variants when `APP_VARIANT=tv` is set
- Configuration in `app.json`: `ios.supportsTV: true`

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `/src/hooks/useTVEventHandler.ts` | main | Enhance TV remote event handling to support long-press detection with timing thresholds (Android native, Apple TV custom implementation) |
| `/src/components/common/Focusable.tv.tsx` | main | Add focus state animations using react-native-reanimated, implement `tvParallaxProperties` for Apple TV, ensure proper `isTVSelectable` and focus prop handling |
| `/src/hooks/useSpatialNavigation.ts` | main | Implement focus memory storage/retrieval system, add `nextFocus[Up/Down/Left/Right]` logic with node handle management |
| `/src/contexts/TVNavigationContext.tsx` | main | Add global state for focus history, last focused items per screen, voice search state, and context menu visibility |
| `/src/navigation/AppNavigator.tsx` | main | Integrate `useFocusEffect` with focus restoration logic using `requestAnimationFrame`, store focus state in `navigation.setParams()` |
| **New:** `/src/components/tv/TVContextMenu.tv.tsx` | main | Create context menu component for long-press actions (Add to List, Mark as Watched, etc.) |
| **New:** `/src/components/tv/TVFocusGuard.tv.tsx` | main | Create boundary component to prevent focus escaping containers, handle circular navigation |
| **New:** `/src/hooks/useLongPress.ts` | main | Create platform-aware long-press detection hook (300ms threshold for Apple TV, native event for Android TV) |
| **New:** `/src/components/tv/TVVoiceSearch.tv.tsx` | main | Create voice search modal/overlay triggered by TV remote voice button |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `/src/hooks/useTVEventHandler.ts` | TVEventHandler lifecycle management: `TVEventHandler.enable(component, callback)` on mount, `.disable()` on unmount; existence check before instantiation |
| `/src/components/common/Focusable.tv.tsx` | TV-specific file variant pattern (`.tv.tsx` extension), TV prop handling (`hasTVPreferredFocus`, `isTVSelectable`, `onFocus/onBlur`) |
| `/src/hooks/useSpatialNavigation.ts` | Focus state management patterns, using refs and `findNodeHandle()` for native node access |
| `/src/contexts/TVNavigationContext.tsx` | Global TV state management structure using React Context API |
| `babel.config.js` | Reanimated plugin configuration (must be last plugin in array) |

## Patterns to Follow

### Pattern 1: TV-Specific File Variants

From Metro bundler configuration:

```typescript
// File structure pattern
src/components/common/Button.tsx        // Default (mobile/web)
src/components/common/Button.tv.tsx     // TV variant (auto-loaded when APP_VARIANT=tv)

// Platform detection
import { Platform } from 'react-native';

if (Platform.isTV) {
  // TV-specific logic
}
```

**Key Points:**
- Metro automatically resolves `.tv.tsx` when `APP_VARIANT=tv` environment variable is set
- Always provide fallback `.tsx` for non-TV platforms
- Use `Platform.isTV` for runtime conditional logic within shared files

### Pattern 2: Reanimated Focus Animations

From react-native-reanimated best practices:

```typescript
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const scale = useSharedValue(1);
const opacity = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
  opacity: opacity.value
}));

const handleFocus = () => {
  scale.value = withSpring(1.1, { damping: 15, stiffness: 150 });
  opacity.value = withSpring(1.0);
};

const handleBlur = () => {
  scale.value = withSpring(1.0, { damping: 15, stiffness: 150 });
  opacity.value = withSpring(0.7);
};
```

**Key Points:**
- Keep TV animations subtle (scale 1.0-1.1 range)
- Use spring animations with damping: 15, stiffness: 150 for native feel
- Avoid complex animations on Android TV (limited GPU on many devices)

### Pattern 3: Focus Memory with React Navigation

From @react-navigation/native integration patterns:

```typescript
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';

const lastFocusedId = useRef<string | null>(null);

useFocusEffect(
  useCallback(() => {
    // Restore focus after screen layout completes
    requestAnimationFrame(() => {
      const savedFocusId = navigation.getState().routes[navigation.getState().index].params?.lastFocusId;

      if (savedFocusId && focusableRefs[savedFocusId]) {
        focusableRefs[savedFocusId].setNativeProps({ hasTVPreferredFocus: true });
      }
    });

    // Save focus on screen blur
    return () => {
      if (lastFocusedId.current) {
        navigation.setParams({ lastFocusId: lastFocusedId.current });
      }
    };
  }, [navigation])
);
```

**Key Points:**
- Store focus ID in route params via `navigation.setParams()`
- Use `requestAnimationFrame` because screen focus fires before layout completion
- Wrap in `useCallback` to prevent infinite loop in `useFocusEffect`
- Use `setNativeProps({ hasTVPreferredFocus: true })` for runtime focus (not props, which only work on mount)

### Pattern 4: TVEventHandler Lifecycle

From existing `/src/hooks/useTVEventHandler.ts` pattern:

```typescript
import { TVEventHandler } from 'react-native';
import { useEffect, useRef } from 'react';

export const useTVEventHandler = (callback: (evt: any) => void) => {
  const tvEventHandler = useRef<any>(null);

  useEffect(() => {
    // Critical: Check existence before instantiation (may not exist in all Expo builds)
    if (TVEventHandler) {
      tvEventHandler.current = new TVEventHandler();
      tvEventHandler.current.enable(null, callback);
    }

    return () => {
      if (tvEventHandler.current) {
        tvEventHandler.current.disable();
        tvEventHandler.current = null;
      }
    };
  }, [callback]);
};
```

**Key Points:**
- Always check `if (TVEventHandler)` before instantiation
- Clean up with `.disable()` in effect cleanup
- Events: `up`, `down`, `left`, `right`, `select`, `menu`, `playPause`, `longSelect` (Android only)

## Requirements

### Functional Requirements

1. **Universal D-Pad Focusability**
   - Description: Every interactive UI element (buttons, cards, inputs, tabs) must be reachable using only D-pad navigation (up/down/left/right arrows)
   - Acceptance: Manual navigation test covering all screens confirms zero unreachable elements

2. **Visible Focus States**
   - Description: Focused elements must have clear visual feedback (border, scale animation, shadow, or color change) with smooth transitions
   - Acceptance: Focus state is immediately obvious in screenshots/recordings; animations run at 60fps without jank

3. **Long-Press Context Menus**
   - Description: Holding the select button on TV remote for 300ms+ triggers context menus with quick actions (Add to List, Mark as Watched, Share, etc.)
   - Acceptance: Long-press on any content card shows context menu; short press performs primary action (e.g., play/navigate)

4. **Spatial Navigation with Focus Memory**
   - Description: When navigating between screens, the system remembers the last focused item and restores focus to that item (or logical equivalent) on return
   - Acceptance: Navigate Home → Details → Back to Home restores focus to previously selected content card

5. **Consistent Back Button Behavior**
   - Description: TV remote back/menu button consistently navigates to previous screen in stack, never causes unexpected app exit or navigation jumps
   - Acceptance: Back button behavior audit across all screens shows predictable navigation stack behavior

6. **Voice Search Integration**
   - Description: TV remote voice button triggers voice search overlay; speech-to-text processed and search results displayed
   - Acceptance: Voice button press opens search UI; spoken query returns relevant content results

7. **Zero Focus Traps**
   - Description: No UI state exists where user cannot navigate away using D-pad; focus never gets stuck in loops or dead-ends
   - Acceptance: Exhaustive navigation testing confirms all UI states have escape paths

### Edge Cases

1. **Empty Content Lists** - When a list/grid has no items, focus should move to next available focusable element (search bar, navigation tabs) rather than getting trapped
2. **Modals and Overlays** - Focus must be constrained within modal boundaries; back button should close modal and restore focus to trigger element
3. **Rapid D-Pad Input** - Fast directional input (button mashing) should not skip over elements or break focus state
4. **Long-Press During Animation** - Starting long-press during a focus animation or transition should queue the action, not cancel it
5. **Platform Differences** - Handle lack of native `longSelect` event on Apple TV by implementing custom timer-based detection
6. **Low-End Android TV Devices** - Detect device performance and reduce/disable focus animations on devices with limited GPU
7. **Voice Search Unavailability** - Gracefully handle platforms/devices where voice input is not supported (show keyboard fallback)
8. **Network Interruption During Voice Search** - Handle failed speech-to-text API calls with retry/fallback to text input

## Implementation Notes

### DO
- Follow the `.tv.tsx` file variant pattern for TV-specific components (Metro auto-resolution)
- Use `Platform.isTV` to detect TV platform at runtime
- Reuse `useTVEventHandler` hook pattern for all remote event handling
- Apply subtle reanimated spring animations (scale 1.0-1.1, damping: 15, stiffness: 150) for focus effects
- Store focus state in `navigation.setParams()` for cross-screen persistence
- Use `requestAnimationFrame` when restoring focus in `useFocusEffect`
- Wrap focus restoration callbacks in `useCallback` to prevent infinite loops
- Use `findNodeHandle(ref)` to get native node handles for `nextFocus*` props
- Check `if (TVEventHandler)` before instantiation (may not exist in all builds)
- Implement 300ms threshold for long-press detection on Apple TV
- Use native `longSelect` event on Android TV (available in TVEventHandler)

### DON'T
- Create new TV event handling systems when `TVEventHandler` already exists
- Use complex or heavy animations on TV (Android TV has limited GPU)
- Rely on `hasTVPreferredFocus` prop for runtime focus changes (only works on mount; use `setNativeProps` instead)
- Pass component refs directly to `nextFocus*` props (requires node handles from `findNodeHandle`)
- Create circular `nextFocus*` dependencies (causes focus traps)
- Use touch gestures or hover states in TV-specific code paths
- Skip focus restoration in `useFocusEffect` cleanup (causes focus loss on back navigation)
- Forget to disable `TVEventHandler` in cleanup (causes memory leaks)

## Development Environment

### Start Services

```bash
# Install dependencies
npm install

# Start Metro bundler in TV mode
npm run start:tv

# In separate terminal, run iOS (Apple TV)
npm run ios -- --simulator="Apple TV"

# Or run Android TV
npm run android
```

### Service URLs
- Metro Bundler: http://localhost:8081
- Development Server: http://localhost:3000

### Required Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL (from .env.local)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (from .env.local)
- `EXPO_PUBLIC_MOVIEBOX_PRIMARY_KEY`: MovieBox API key (from .env.local)
- `EXPO_PUBLIC_MOVIEBOX_TMDB_API_KEY`: TMDB API key (from .env.local)
- `EXPO_PUBLIC_TRAKT_CLIENT_ID`: Trakt API client ID (from .env.local)
- `EXPO_PUBLIC_TRAKT_CLIENT_SECRET`: Trakt API secret (from .env.local)
- `APP_VARIANT`: Set to `tv` for TV-specific builds (used by Metro bundler)

### Build Configuration
- `app.json`: Ensure `ios.supportsTV: true` is set
- `babel.config.js`: Verify `react-native-reanimated/plugin` is the **last plugin** in plugins array

## Success Criteria

The task is complete when:

1. [ ] All UI elements across all screens are focusable and reachable via D-pad (verified by manual navigation test on Apple TV and Android TV simulators/devices)
2. [ ] Focus states are clearly visible with smooth animations (60fps, scale 1.0-1.1, no jank)
3. [ ] Long-press (300ms+) on select button triggers context menus with quick actions on both platforms
4. [ ] Focus memory persists across screen navigation: navigating back to a screen restores focus to last selected item
5. [ ] Back button behavior is consistent: always returns to previous screen in stack, never causes unexpected exits
6. [ ] Voice search via TV remote opens search UI and processes spoken queries (with keyboard fallback if voice unavailable)
7. [ ] Zero focus traps: exhaustive testing finds no UI states where focus gets stuck or becomes unreachable
8. [ ] No console errors or warnings related to TV navigation, focus management, or remote event handling
9. [ ] Existing unit tests still pass (no regressions introduced)
10. [ ] New functionality verified via Apple TV simulator and Android TV emulator (or physical devices if available)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| TVEventHandler lifecycle | `__tests__/hooks/useTVEventHandler.test.ts` | Hook properly enables/disables handler, cleans up on unmount, handles missing TVEventHandler gracefully |
| Long-press detection | `__tests__/hooks/useLongPress.test.ts` | Distinguishes between short press (<300ms) and long press (>=300ms), platform-specific behavior (native event on Android, timer on iOS) |
| Focus memory storage/retrieval | `__tests__/hooks/useSpatialNavigation.test.ts` | Correctly stores focus IDs, retrieves last focused item, handles missing refs gracefully |
| Context menu state management | `__tests__/contexts/TVNavigationContext.test.tsx` | Context provides correct state, updates on actions, handles concurrent context menus |
| Focus restoration | `__tests__/navigation/AppNavigator.test.tsx` | Navigation properly stores/restores focus state in route params, uses requestAnimationFrame |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| D-pad navigation flow | main | Navigate from Home → Browse → Details → Back using only D-pad events; verify focus moves correctly |
| Long-press context menu | main | Trigger long-press on content card → verify context menu appears → select action → verify action executes |
| Focus memory across screens | main | Select item on Home → navigate to Details → press back → verify focus restored to original item |
| Voice search flow | main | Trigger voice button → verify search overlay opens → (mock) process speech → verify results display |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Complete app navigation (TV remote only) | 1. Launch app on Apple TV simulator 2. Navigate entire app using only D-pad and select 3. Attempt to reach every screen and interactive element | All screens accessible, no unreachable elements, no focus traps |
| Context menu workflow | 1. Focus on content card 2. Long-press select (300ms+) 3. Navigate context menu with D-pad 4. Select "Add to List" 5. Verify item added | Context menu appears, actions execute correctly, focus returns to card |
| Focus memory persistence | 1. Browse grid of content cards 2. Focus on card in middle of grid 3. Select to view details 4. Press back button 5. Verify focus returns to same card | Focus restored to exact card position in grid |
| Voice search full flow | 1. Press voice button on remote 2. Speak query 3. View search results 4. Select result 5. Navigate to detail page | Voice search opens, processes query, displays results, selection works |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| N/A - TV native app | N/A | Testing via Apple TV simulator and Android TV emulator only |

### Device/Simulator Verification
| Platform | Device/Simulator | Checks |
|----------|------------------|--------|
| Apple TV | Apple TV 4K (tvOS 16+) simulator | D-pad navigation, focus states, long-press detection (timer-based), voice search, focus memory, back button |
| Android TV | Android TV emulator (API 31+) | D-pad navigation, focus states, long-press detection (native event), voice search, focus memory, back button |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | N/A | No database schema changes required for this feature |

### QA Sign-off Requirements
- [ ] All unit tests pass (focus on TV-specific hooks and navigation logic)
- [ ] All integration tests pass (D-pad flows, long-press, focus memory, voice search)
- [ ] All E2E tests pass on both Apple TV and Android TV simulators
- [ ] Manual verification on Apple TV simulator confirms all acceptance criteria
- [ ] Manual verification on Android TV emulator confirms all acceptance criteria
- [ ] Physical device testing (if available): Apple TV 4K and/or Android TV box
- [ ] No regressions in existing mobile/tablet navigation (focus changes are TV-only)
- [ ] Code follows established patterns: `.tv.tsx` variants, TVEventHandler lifecycle, reanimated animations
- [ ] No security vulnerabilities introduced (voice search input sanitization, no sensitive data in logs)
- [ ] Performance verified: focus animations run at 60fps, no memory leaks from TVEventHandler
- [ ] Focus trap audit complete: exhaustive testing finds zero unreachable UI states
- [ ] Context menus do not block critical UI or cause navigation issues
- [ ] Voice search gracefully handles unavailable/disabled voice input
