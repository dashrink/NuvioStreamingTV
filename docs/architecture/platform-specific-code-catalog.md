# Platform-Specific Code Catalog

**Document Version**: 1.0
**Last Updated**: 2024-01-13
**Project**: NuvioStreamingTV React Native App
**Purpose**: Comprehensive catalog of all platform-specific code (iOS/Android/TV) for migration planning to tri-layer native architecture

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [TV Platform Files (.tv.tsx)](#tv-platform-files-tvtsx)
3. [iOS Native Code](#ios-native-code)
4. [Android Native Code](#android-native-code)
5. [Native Modules & Components](#native-modules--components)
6. [Platform-Specific Runtime Checks](#platform-specific-runtime-checks)
7. [TV-Specific Infrastructure](#tv-specific-infrastructure)
8. [Platform-Specific Dependencies](#platform-specific-dependencies)
9. [Migration Strategy](#migration-strategy)
10. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Statistics

| Category | Count | Notes |
|----------|-------|-------|
| **TV-Specific Files (.tv.tsx)** | 28 | Metro bundler auto-resolves based on platform |
| **iOS Native Files** | 2 | Swift + Bridging Header |
| **Android Native Files** | 2 | Kotlin MainActivity + MainApplication |
| **Native Component Modules** | 2 | KSPlayer (iOS), MpvPlayer (Android) |
| **TV Hooks** | 6 | Focus management, event handling, player controls |
| **TV Utilities** | 3 | Integration verification, styling utilities |
| **Platform.isTV References** | 131 | Runtime checks throughout codebase |
| **Platform.OS References** | 503 | iOS/Android differentiation |
| **Platform.select References** | 9 | Style/config selection |

### Key Findings

1. **TV Platform Abstraction Pattern**: The codebase uses a sophisticated `.tv.tsx` file extension pattern with Metro bundler resolution, enabling clean separation of TV and mobile code at build time.

2. **Native Video Players**: Platform-specific video player implementations:
   - **iOS**: KSPlayer (native Swift component)
   - **Android**: MpvPlayer (native Kotlin/Java component)

3. **Google Cast Integration**: Both iOS and Android have native Google Cast SDK integration in their AppDelegate/MainActivity.

4. **Heavy Runtime Checks**: 131 `Platform.isTV` checks and 503 `Platform.OS` checks indicate significant platform-specific logic that should be extracted during migration.

5. **TV-First Architecture**: Extensive TV infrastructure (6 hooks, 8 TV-specific components, 28 .tv.tsx files) suggests TV is a primary platform, not an afterthought.

---

## TV Platform Files (.tv.tsx)

The codebase uses Metro bundler's platform-specific file resolution pattern. When `APP_VARIANT=tv`, Metro prioritizes `.tv.tsx` and `.tv.ts` files over standard `.tsx`/`.ts` files.

### Metro Configuration
**File**: `metro.config.js`
```javascript
const isTV = process.env.APP_VARIANT === 'tv';
if (isTV) {
  sourceExts.unshift('tv.tsx', 'tv.ts');
}
```

### TV Screen Components (9 files)

| File | Purpose | Mobile Counterpart | Migration Strategy |
|------|---------|-------------------|-------------------|
| `src/screens/CatalogScreen.tv.tsx` | TV catalog with spatial navigation | `CatalogScreen.tsx` | **Kotlin/Swift UI**: Migrate to native RecyclerView/UICollectionView with focus management |
| `src/screens/HomeScreen.tv.tsx` | TV home with D-pad navigation | `HomeScreen.tsx` | **Kotlin/Swift UI**: Native grid layouts with leanback/tvOS focus engine |
| `src/screens/LibraryScreen.tv.tsx` | TV library with grid layout | `LibraryScreen.tsx` | **Kotlin/Swift UI**: Native library browser with platform focus APIs |
| `src/screens/MetadataScreen.tv.tsx` | TV metadata with 10-foot UI | `MetadataScreen.tsx` | **Kotlin/Swift UI**: Detail screen with tvOS/Leanback patterns |
| `src/screens/PlayerSettingsScreen.tv.tsx` | TV player settings | `PlayerSettingsScreen.tsx` | **Kotlin/Swift UI**: Settings list with platform focus |
| `src/screens/SettingsScreen.tv.tsx` | TV settings navigation | `SettingsScreen.tsx` | **Kotlin/Swift UI**: Native settings with platform patterns |
| `src/screens/SearchScreen.tv.tsx` | TV search with voice/D-pad | `SearchScreen.tsx` | **Kotlin/Swift UI**: SearchFragment/UISearchController |
| `src/screens/StreamsScreen.tv.tsx` | TV streams browser | `StreamsScreen.tsx` | **Kotlin/Swift UI**: Streams grid with focus |
| `src/screens/ThemeScreen.tv.tsx` | TV theme selector | `ThemeScreen.tsx` | **Kotlin/Swift UI**: Theme picker |

### TV Components (19 files)

#### Core TV Infrastructure Components

| File | Purpose | Migration Strategy |
|------|---------|-------------------|
| `src/components/common/Focusable.tv.tsx` | TV focus wrapper component | **Keep in UI Layer**: Wrap Kotlin `View.setFocusable()` / Swift `UIFocusEnvironment` |
| `src/components/common/TVTextInput.tv.tsx` | TV text input with D-pad support | **Keep in UI Layer**: Use platform EditText/UITextField with IME |
| `src/components/tv/TVBackHandler.tv.tsx` | TV back button handling | **Keep in UI Layer**: Use platform back handling (onBackPressed/menuPress) |
| `src/components/tv/TVFocusGuard.tv.tsx` | TV focus boundary management | **Keep in UI Layer**: Wrap platform focus APIs |
| `src/components/tv/TVContextMenu.tv.tsx` | TV context menu (long-press) | **Keep in UI Layer**: Use platform context menus |
| `src/components/tv/TVNavigationBackHandlerProvider.tv.tsx` | TV navigation back handler | **Keep in UI Layer**: Integrate with platform navigation |
| `src/components/tv/TVVoiceSearch.tv.tsx` | TV voice search integration | **Keep in UI Layer**: Use platform voice APIs (RecognizerIntent/Siri) |
| `src/components/tv/TVScreenWrapper.tv.tsx` | TV screen container with focus | **Keep in UI Layer**: Base Activity/ViewController for TV |

#### TV Content Components

| File | Purpose | Migration Strategy |
|------|---------|-------------------|
| `src/components/ProviderFilter.tv.tsx` | TV provider filter grid | **Keep in UI Layer**: Native filter chips with focus |
| `src/components/StreamCard.tv.tsx` | TV stream card with focus | **Keep in UI Layer**: ViewHolder/UICollectionViewCell |
| `src/components/home/ContentItem.tv.tsx` | TV content card | **Keep in UI Layer**: Card view with focus animation |
| `src/components/home/AppleTVHero.tv.tsx` | TV hero carousel | **Keep in UI Layer**: ViewPager2/UIPageViewController |
| `src/components/home/CatalogSection.tv.tsx` | TV catalog section row | **Keep in UI Layer**: Horizontal RecyclerView/UICollectionView |
| `src/components/home/HeroCarousel.tv.tsx` | TV hero with auto-scroll | **Keep in UI Layer**: Native carousel with timer |
| `src/components/metadata/CastSection.tv.tsx` | TV cast details | **Keep in UI Layer**: List/TableView for cast |
| `src/components/metadata/HeroSection.tv.tsx` | TV metadata hero | **Keep in UI Layer**: Hero detail with backdrop |
| `src/components/metadata/SeriesContent.tv.tsx` | TV series episodes grid | **Keep in UI Layer**: Grid for episodes |

#### TV Player Components

| File | Purpose | Migration Strategy |
|------|---------|-------------------|
| `src/components/player/AndroidVideoPlayer.tv.tsx` | TV video player for Android | **Keep in UI Layer**: ExoPlayer with D-pad controls |
| `src/components/player/controls/PlayerControls.tv.tsx` | TV player controls overlay | **Keep in UI Layer**: Custom D-pad control overlay |

---

## iOS Native Code

### Files

| File | Language | Purpose | Migration Strategy |
|------|----------|---------|-------------------|
| `ios/NuvioTV/AppDelegate.swift` | Swift | App lifecycle, Google Cast setup, React Native initialization | **Expand**: Add Rust FFI initialization, native view controllers |
| `ios/NuvioTV/NuvioTV-Bridging-Header.h` | Objective-C | Bridge for Objective-C/Swift interop | **Expand**: Add Rust FFI C headers |

### Key Integration Points

#### Google Cast Integration
```swift
#if canImport(GoogleCast) && os(iOS)
import GoogleCast
// ... GCKCastContext.setSharedInstanceWith(options)
```
**Migration**: Keep in native layer, call Rust SDK for content metadata

#### React Native Factory
```swift
let delegate = ReactNativeDelegate()
let factory = ExpoReactNativeFactory(delegate: delegate)
```
**Migration**: Replace with native SwiftUI/UIKit view controllers, Rust SDK calls

#### Deep Linking
```swift
RCTLinkingManager.application(app, open: url, options: options)
```
**Migration**: Keep native URL handling, route to Rust SDK for business logic

---

## Android Native Code

### Files

| File | Language | Purpose | Migration Strategy |
|------|----------|---------|-------------------|
| `android/app/src/main/java/com/nuvio/app/tv/MainActivity.kt` | Kotlin | Main activity, Google Cast setup, React Native host | **Expand**: Add Rust FFI initialization, native fragments |
| `android/app/src/main/java/com/nuvio/app/tv/MainApplication.kt` | Kotlin | Application class, React Native host, package list | **Expand**: Initialize Rust SDK, set up native DI |

### Key Integration Points

#### Google Cast Integration
```kotlin
RNGCCastContext.getSharedInstance(this)
```
**Migration**: Keep in native layer, call Rust SDK for content metadata

#### New Architecture Support
```kotlin
override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
```
**Migration Note**: Currently supports both Legacy Bridge and New Architecture (0.76+). Migration will bypass React Native entirely.

#### Back Button Handling
```kotlin
override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
        if (!moveTaskToBack(false)) {
            super.invokeDefaultOnBackPressed()
        }
        return
    }
    super.invokeDefaultOnBackPressed()
}
```
**Migration**: Keep native back handling, integrate with Rust SDK navigation state

---

## Native Modules & Components

### Video Players (Platform-Specific)

#### 1. KSPlayer (iOS Only)

**File**: `src/components/player/KSPlayerComponent.tsx`

```typescript
const KSPlayerViewManager = requireNativeComponent<KSPlayerViewProps>('KSPlayerView');
const KSPlayerModule = NativeModules.KSPlayerModule;
```

**Features**:
- Native Swift video player
- AirPlay support (`showAirPlayPicker`, `getAirPlayState`)
- Audio/subtitle track selection
- Custom subtitle styling
- Seek, rate control, volume

**Migration Strategy**:
- **Rust SDK**: Extract playback state management, track selection logic, subtitle sync
- **Swift Native**: Keep `KSPlayerView` as native component, call Rust SDK for state
- **FFI Boundary**: Playback events, track changes, error handling
- **Risk**: AirPlay integration may need special handling across FFI

#### 2. MpvPlayer (Android Only)

**File**: `src/components/player/android/MpvPlayer.tsx`

```typescript
const MpvPlayerNative = Platform.OS === 'android'
    ? requireNativeComponent<any>('MpvPlayer')
    : null;
```

**Features**:
- Native libmpv video player
- Hardware/software decoding modes
- GPU rendering options
- Advanced subtitle styling (position, shadow, border, alignment)
- Subtitle delay synchronization
- Audio/subtitle track selection

**Migration Strategy**:
- **Rust SDK**: Extract playback state, track management, subtitle timing logic
- **Kotlin Native**: Keep `MpvPlayer` as native view, call Rust SDK for state
- **FFI Boundary**: Playback events, decoder mode selection, subtitle configuration
- **Risk**: libmpv C library integration needs careful memory management

### Native Module Usage Patterns

| Usage Pattern | Count | Files | Migration Strategy |
|---------------|-------|-------|-------------------|
| `requireNativeComponent` | 2 | KSPlayer, MpvPlayer | Keep as native views, connect to Rust SDK |
| `NativeModules.*` | 4 | Player controls, device features | Replace with Rust SDK + platform APIs |

---

## Platform-Specific Runtime Checks

### Platform.isTV Checks (131 occurrences)

**Distribution Analysis**:
- **Hooks**: `useTVMode`, `useTVBackHandler`, `useTVEventHandler`, `useTVFocusRestoration`, `useTVFocus`, `useTVPlayerControls`
- **Components**: Focus management, layout switching, control overlays
- **Utilities**: Device detection, focus sound, module resolver, player selection, TV integration verification
- **Contexts**: `TVNavigationContext`, `PerformanceContext`

**Migration Strategy for Platform.isTV**:
1. **Build-Time Resolution**: Prioritize `.tv.tsx` pattern over runtime checks
2. **Rust SDK**: Move platform detection to Rust, expose via FFI
3. **Compile-Time Flags**: Use Kotlin/Swift conditional compilation where possible
4. **Configuration**: Platform capabilities exposed as feature flags from Rust

### Platform.OS Checks (503 occurrences)

**Common Patterns**:
```typescript
Platform.OS === 'ios'      // iOS-specific code
Platform.OS === 'android'  // Android-specific code
Platform.OS === 'web'      // Web fallback (not in scope for migration)
```

**High-Frequency Usage Areas**:
- Video player selection (KSPlayer vs MpvPlayer)
- Native module imports
- Gesture handling differences
- Status bar / system UI differences
- Navigation behavior

**Migration Strategy**:
1. **Split at Build Time**: Separate Kotlin and Swift codebases eliminate runtime checks
2. **Rust SDK**: Platform-agnostic business logic
3. **Feature Detection**: Use Rust SDK feature flags instead of OS checks
4. **Protocol/Interface**: Define common contracts, implement per-platform

### Platform.select Checks (9 occurrences)

**Usage Pattern**:
```typescript
Platform.select({
  ios: iosValue,
  android: androidValue,
  default: defaultValue
})
```

**Migration Strategy**: Replace with platform-specific constants in Kotlin/Swift

---

## TV-Specific Infrastructure

### TV Hooks (6 files)

| Hook | File | Purpose | Migration Strategy |
|------|------|---------|-------------------|
| `useTVBackHandler` | `src/hooks/useTVBackHandler.ts` | TV back button event handling | **Keep in UI Layer**: Wrap platform back APIs |
| `useTVEventHandler` | `src/hooks/useTVEventHandler.ts` | D-pad/remote event handling | **Keep in UI Layer**: Wrap platform input events |
| `useTVFocusRestoration` | `src/hooks/useTVFocusRestoration.ts` | Focus state persistence | **Rust SDK**: Focus state, **UI Layer**: Restoration logic |
| `useTVFocus` | `src/hooks/useTVFocus.ts` | Focus management utilities | **Keep in UI Layer**: Platform focus APIs |
| `useTVMode` | `src/hooks/useTVMode.ts` | TV platform detection | **Rust SDK**: Platform capability detection |
| `useTVPlayerControls` | `src/hooks/useTVPlayerControls.ts` | TV player D-pad controls | **Rust SDK**: Playback commands, **UI Layer**: D-pad input |

### TV Utilities (3 items)

| Utility | File | Purpose | Migration Strategy |
|---------|------|---------|-------------------|
| `tvIntegrationVerification` | `src/utils/tvIntegrationVerification.ts` | Verify TV integration | **Testing**: Platform integration tests |
| `tvStyles` | `src/utils/tvStyles/` | TV styling utilities | **Keep in UI Layer**: Platform-specific styles |
| `tvStyles.ts` | `src/utils/tvStyles.ts` | TV style exports | **Keep in UI Layer**: Style configuration |

### TV Contexts

| Context | File | Purpose | Migration Strategy |
|---------|------|---------|-------------------|
| `TVNavigationContext` | `src/contexts/TVNavigationContext.tsx` | TV focus zones, spatial navigation | **Rust SDK**: Navigation state, **UI Layer**: Focus management |

### TV Infrastructure Module

**File**: `src/tv/index.ts`

**Exports**:
- `TVNavigationProvider`, `useTVNavigation`, `useTVNavigationSafe`
- `useTVMode`, `useTVBackHandler`, `useTVEventHandler`
- `useSpatialNavigation`, `useFocusGroup`
- `Focusable`, `FocusableList`
- `TVLibraryGrid`, `TVLibraryFolders`

**Migration Strategy**:
- **Rust SDK**: Navigation state machine, focus zone logic
- **Kotlin/Swift UI**: Platform focus APIs, spatial navigation wrappers
- **Keep Modular**: Maintain clean TV abstraction for platform layers

---

## Platform-Specific Dependencies

### Critical Native Dependencies (from package.json)

| Dependency | Platform | Purpose | Migration Strategy |
|------------|----------|---------|-------------------|
| `react-native-google-cast` v4.9.1 | iOS, Android | Google Cast SDK | **Keep Native**: iOS/Android SDKs, Rust SDK for state |
| `expo-libvlc-player` v2.2.3 | Android, iOS | VLC-based player | **Keep Native**: VLC integration, Rust SDK for controls |
| `react-native-video` v6.17.0 | iOS, Android | Video playback | **Replace**: With KSPlayer/MpvPlayer + Rust SDK |
| `@sentry/react-native` v7.6.0 | iOS, Android | Crash reporting | **Rust SDK**: Sentry Rust client, native bridge |
| `posthog-react-native` v4.4.0 | iOS, Android | Analytics | **Rust SDK**: PostHog events, native integration |
| `react-native-mmkv` v4.0.0 | iOS, Android | Key-value storage | **Rust SDK**: Use Rust storage, or keep as FFI wrapper |
| `@react-native-community/netinfo` v11.4.1 | iOS, Android | Network detection | **Rust SDK**: Network monitoring, native listeners |
| `react-native-reanimated` v4.2.0 | iOS, Android | Animations | **Keep Native**: Use platform animations (Compose/SwiftUI) |
| `react-native-gesture-handler` v2.29.1 | iOS, Android | Gesture handling | **Keep Native**: Use platform gesture APIs |
| `react-native-immersive-mode` v2.0.2 | Android | Fullscreen mode | **Keep Native**: System UI APIs |
| `expo-brightness` ~14.0.7 | iOS, Android | Screen brightness | **Rust SDK**: Brightness state, native FFI calls |
| `expo-haptics` ~15.0.7 | iOS, Android | Haptic feedback | **Keep Native**: Platform haptic APIs |
| `expo-notifications` ~0.32.12 | iOS, Android | Push notifications | **Rust SDK**: Notification logic, native display |

### Expo Modules (Platform Abstraction)

Expo modules provide cross-platform abstraction. During migration:
- **Evaluate Per-Module**: Some can move to Rust SDK (crypto, random, file system)
- **Keep UI-Related**: Haptics, brightness, screen orientation (platform-specific)
- **Replace Storage**: `expo-file-system` → Rust filesystem abstraction

---

## Migration Strategy

### Phase 1: Business Logic Extraction (Rust SDK)

#### High Priority for Rust SDK

| Component | Current Location | Rust Module | FFI Complexity |
|-----------|-----------------|-------------|----------------|
| Authentication | `src/services/` | `nuvio_auth` | Medium (token storage) |
| API Client | `src/services/` | `nuvio_api` | Medium (HTTP, cookies) |
| Playback State | `src/components/player/` | `nuvio_player` | High (real-time events) |
| Content Metadata | `src/services/` | `nuvio_metadata` | Low (CRUD) |
| User Settings | `src/contexts/` | `nuvio_settings` | Low (key-value) |
| Offline Storage | `src/services/` | `nuvio_storage` | Medium (file I/O) |
| Search/Filter | `src/screens/SearchScreen.*` | `nuvio_search` | Low (text processing) |

#### Keep in Native UI Layer

| Component | Reason | Platform API |
|-----------|--------|--------------|
| TV Focus Management | Platform-specific API | `UIFocusEnvironment`, `View.setFocusable()` |
| Video Rendering | Native player views | `KSPlayerView`, `MpvPlayer`, `ExoPlayer` |
| Navigation | Platform patterns | Jetpack Navigation, UINavigationController |
| Animations | Platform APIs | Compose Animations, SwiftUI Animations |
| Google Cast UI | Native SDKs required | `GCKUICastButton`, `MediaRouteButton` |
| Haptics/Brightness | System APIs | `UIImpactFeedbackGenerator`, `Settings.System` |

### Phase 2: Platform-Specific File Migration

#### TV Files (.tv.tsx) → Native TV Implementation

**Approach**:
1. Start with simplest screen (e.g., `ThemeScreen.tv.tsx`)
2. Implement in Kotlin Compose / SwiftUI
3. Connect to Rust SDK via FFI
4. Test focus navigation, D-pad input
5. Iterate to complex screens (HomeScreen, MetadataScreen)

**Timeline Estimate**: 2-3 months (28 files, ~2-3 days per file avg)

#### Native Modules Replacement

**KSPlayer (iOS)**:
1. Create Swift wrapper around KSPlayer framework
2. Implement `PlayerProtocol` to connect to Rust SDK
3. FFI bridge for playback commands, events
4. Test AirPlay integration

**MpvPlayer (Android)**:
1. Create Kotlin wrapper around libmpv
2. Implement `PlayerProtocol` to connect to Rust SDK
3. FFI bridge for playback commands, events
4. Test hardware decoding modes

### Phase 3: Runtime Check Elimination

**Platform.isTV (131 occurrences)**:
- Replace with build-time compilation (separate TV builds)
- Use Rust SDK capability detection for shared code

**Platform.OS (503 occurrences)**:
- Separate Kotlin and Swift codebases eliminate need
- Rust SDK provides platform-agnostic interfaces

**Platform.select (9 occurrences)**:
- Replace with platform constants in Kotlin/Swift

### Phase 4: Dependency Migration

**Replace**:
- `react-native-video` → Native `ExoPlayer` / `AVPlayer` + Rust SDK
- `react-native-mmkv` → Rust persistent storage (or keep as thin FFI wrapper)
- `@sentry/react-native` → `sentry-rust` + native Sentry SDKs
- `posthog-react-native` → PostHog Rust client + native analytics

**Keep (Native Wrappers)**:
- `react-native-google-cast` SDK (iOS/Android native)
- `expo-libvlc-player` (if still used)
- Platform-specific modules (haptics, brightness, immersive mode)

---

## Risk Assessment

### High Risk Items

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| **Video Playback Performance** | Critical | Prototype FFI bridge for player events early; benchmark latency |
| **TV Focus Engine Integration** | High | Keep focus APIs in native layer; Rust SDK only manages state |
| **Google Cast Compatibility** | High | Test Cast SDK integration with Rust SDK; ensure metadata flow works |
| **Memory Management Across FFI** | Critical | Use UniFFI for safe memory handling; extensive leak testing |
| **Real-Time Player Events** | High | Minimize FFI calls; batch events; use async channels |
| **AirPlay Integration (iOS)** | Medium | Test KSPlayer AirPlay with Rust SDK state management |
| **libmpv Integration (Android)** | Medium | Validate libmpv C FFI with Rust; test decoder modes |

### Medium Risk Items

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| **131 Platform.isTV Checks** | Medium | Phased migration; prioritize `.tv.tsx` pattern first |
| **503 Platform.OS Checks** | Medium | Separate build process; gradual elimination |
| **Offline Content Access** | Medium | Design Rust SDK storage layer early; test file I/O performance |
| **State Synchronization** | Medium | Define clear FFI boundaries; use immutable data structures |
| **Navigation State Management** | Medium | Rust SDK owns navigation state; UI layers observe |

### Low Risk Items

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| **Theme Configuration** | Low | Simple FFI for theme colors; platform-specific styling |
| **Settings Persistence** | Low | Rust SDK key-value store; straightforward FFI |
| **Search/Filter Logic** | Low | Pure Rust implementation; minimal FFI |

---

## Migration Complexity Matrix

### Complexity by Component Type

| Component Type | Count | Complexity | Estimated Effort | Notes |
|----------------|-------|------------|------------------|-------|
| **TV Screens** | 9 | High | 3-4 weeks | Spatial navigation, focus management |
| **TV Components** | 19 | Medium-High | 4-5 weeks | Focus wrappers, D-pad controls |
| **TV Hooks** | 6 | Medium | 2 weeks | Some logic to Rust, some stays in UI |
| **Native Players** | 2 | High | 2-3 weeks | Critical path; FFI performance testing |
| **iOS Native** | 2 | Medium | 1 week | Expand existing Swift code |
| **Android Native** | 2 | Medium | 1 week | Expand existing Kotlin code |
| **Runtime Checks** | 640+ | Low-Medium | 2-3 weeks | Gradual replacement |
| **Dependencies** | 20+ | Varies | 3-4 weeks | Some keep, some replace, some refactor |

**Total Estimated Migration Effort**: 18-25 weeks (4.5-6 months) with 2-3 developers

---

## Appendix: File Listings

### Complete TV File List (.tv.tsx)

```
src/components/ProviderFilter.tv.tsx
src/components/StreamCard.tv.tsx
src/components/common/Focusable.tv.tsx
src/components/common/TVTextInput.tv.tsx
src/components/home/ContentItem.tv.tsx
src/components/home/AppleTVHero.tv.tsx
src/components/home/CatalogSection.tv.tsx
src/components/home/HeroCarousel.tv.tsx
src/components/metadata/CastSection.tv.tsx
src/components/metadata/HeroSection.tv.tsx
src/components/metadata/SeriesContent.tv.tsx
src/components/player/AndroidVideoPlayer.tv.tsx
src/components/player/controls/PlayerControls.tv.tsx
src/components/tv/TVBackHandler.tv.tsx
src/components/tv/TVFocusGuard.tv.tsx
src/components/tv/TVContextMenu.tv.tsx
src/components/tv/TVNavigationBackHandlerProvider.tv.tsx
src/components/tv/TVVoiceSearch.tv.tsx
src/components/tv/TVScreenWrapper.tv.tsx
src/screens/CatalogScreen.tv.tsx
src/screens/HomeScreen.tv.tsx
src/screens/LibraryScreen.tv.tsx
src/screens/MetadataScreen.tv.tsx
src/screens/PlayerSettingsScreen.tv.tsx
src/screens/SettingsScreen.tv.tsx
src/screens/SearchScreen.tv.tsx
src/screens/StreamsScreen.tv.tsx
src/screens/ThemeScreen.tv.tsx
```

### Complete TV Infrastructure Files

#### Hooks
```
src/hooks/useTVBackHandler.ts
src/hooks/useTVEventHandler.ts
src/hooks/useTVFocusRestoration.ts
src/hooks/useTVFocus.ts
src/hooks/useTVMode.ts
src/hooks/useTVPlayerControls.ts
```

#### Utilities
```
src/utils/tvIntegrationVerification.ts
src/utils/tvStyles/
src/utils/tvStyles.ts
```

#### Components (Non-.tv.tsx)
```
src/components/tv/TVBackHandler.tsx (mobile fallback)
src/components/tv/TVContextMenu.tsx (mobile fallback)
src/components/tv/TVContinueWatchingSection.tsx
src/components/tv/TVFocusGuard.tsx (mobile fallback)
src/components/tv/TVLibraryFolders.tsx
src/components/tv/TVLibraryGrid.tsx
src/components/tv/TVNavigationBackHandlerProvider.tsx (mobile fallback)
src/components/tv/TVScreenWrapper.tsx (mobile fallback)
src/components/tv/TVVoiceSearch.tsx (mobile fallback)
```

#### Contexts
```
src/contexts/TVNavigationContext.tsx
```

#### Index
```
src/tv/index.ts (TV module exports)
```

### iOS Native Files

```
ios/NuvioTV/AppDelegate.swift
ios/NuvioTV/NuvioTV-Bridging-Header.h
```

### Android Native Files

```
android/app/src/main/java/com/nuvio/app/tv/MainActivity.kt
android/app/src/main/java/com/nuvio/app/tv/MainApplication.kt
```

### Native Component Files

```
src/components/player/KSPlayerComponent.tsx (iOS native component)
src/components/player/android/MpvPlayer.tsx (Android native component)
```

---

## Document Metadata

- **Author**: Auto-Claude Architecture Analysis Agent
- **Task**: Subtask-2-2 - Platform-Specific Code Identification
- **Phase**: Pattern & State Management Analysis
- **Related Documents**:
  - `src/PLATFORM_ABSTRACTION_PATTERN.md`
  - `TV_REFACTORING_INDEX.md`
  - `TV_REFACTORING_SUMMARY.md`
  - `TESTING_PLATFORM_ABSTRACTION.md`
  - `MIGRATION_STATUS.md`

---

**Next Steps**:
1. Review this catalog with development team
2. Prioritize components for Phase 1 Rust SDK extraction
3. Design FFI interfaces for high-risk components (video players)
4. Create proof-of-concept for TV screen migration (start with ThemeScreen)
5. Establish testing strategy for FFI boundaries
6. Set up build toolchains (rustup, cargo-ndk, uniffi_bindgen, Xcode)

