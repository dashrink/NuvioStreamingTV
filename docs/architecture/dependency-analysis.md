# Third-Party SDK Dependency Analysis & Migration Impact

This document provides a comprehensive analysis of all third-party SDK dependencies in the Nuvio React Native application, with a focus on identifying native modules and assessing their migration impact for the tri-layer native architecture (Rust SDK core + Kotlin/Swift UI layers).

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Dependency Categories](#dependency-categories)
3. [Critical Native Modules](#critical-native-modules)
4. [Expo SDK Modules](#expo-sdk-modules)
5. [UI & Navigation Libraries](#ui--navigation-libraries)
6. [Media Playback Dependencies](#media-playback-dependencies)
7. [Storage & State Management](#storage--state-management)
8. [Developer Tools & Testing](#developer-tools--testing)
9. [Migration Impact Assessment](#migration-impact-assessment)
10. [Recommendations by Phase](#recommendations-by-phase)

---

## Executive Summary

### Key Findings

- **Total Dependencies:** 83 production dependencies, 16 development dependencies
- **Native Modules Identified:** 25+ modules with native code (iOS/Android)
- **Critical Native SDKs:** Google Cast, Sentry, MMKV, Video Players
- **Expo SDK Version:** 54 (uses New Architecture-compatible modules)
- **React Native Version:** 0.81.4 (pre-New Architecture, but compatible)
- **Migration Complexity:** HIGH - extensive native module usage

### Migration Strategy Recommendation

**Phased Approach Required:**
1. **Phase 1:** Migrate core business logic to Rust SDK (no dependency changes)
2. **Phase 2:** Replace React Native UI with Kotlin/Swift (requires native alternatives for all UI libraries)
3. **Phase 3:** Replace React Native bridge modules with native equivalents (Google Cast, Video Players, etc.)
4. **Phase 4:** Integrate Rust SDK with native UI layers via UniFFI

**Estimated Effort:** 6-12 months for complete migration

---

## Dependency Categories

### Category Breakdown

| Category | Count | Native Modules | Migration Complexity |
|----------|-------|----------------|---------------------|
| Core Framework | 3 | 3 | HIGH (requires full replacement) |
| Native Modules | 25 | 25 | HIGH (requires native equivalents) |
| Expo SDK | 23 | 23 | MEDIUM (good native APIs available) |
| UI Components | 15 | 5 | HIGH (requires UI rewrite) |
| Navigation | 5 | 2 | HIGH (different paradigm in native) |
| Media & Video | 4 | 4 | HIGH (critical functionality) |
| Storage | 2 | 2 | MEDIUM (good native alternatives) |
| Utilities | 12 | 0 | LOW (can migrate to Rust/native utils) |
| Analytics & Monitoring | 2 | 2 | MEDIUM (native SDKs available) |
| Development Tools | 16 | 0 | N/A (build-time only) |

---

## Critical Native Modules

### 1. Google Cast SDK

**Package:** `react-native-google-cast@4.9.1`

#### Current Implementation
- **Native Dependencies:**
  - Android: `com.google.android.gms:play-services-cast-framework` (configured in `android/app/build.gradle:165`)
  - iOS: Cast Framework via CocoaPods
- **Integration Points:**
  - `src/hooks/useChromecast.ts` - Primary hook for cast functionality
  - `src/contexts/ChromecastContext.tsx` - Global cast state management
  - `src/services/chromecastService.ts` - Service layer abstraction
- **Features Used:**
  - Device discovery
  - Session management
  - Media control (play, pause, seek, volume)
  - Queue management
  - Metadata display

#### Native Module Analysis
- **Android Native Code:** Uses JNI bindings to Google Cast Framework
- **iOS Native Code:** Objective-C/Swift bindings to Cast Framework
- **Bridge Overhead:** HIGH - frequent updates for playback state

#### Migration Impact: **CRITICAL - HIGH COMPLEXITY**

**Replacement Strategy:**
- **Android:** Direct integration of `com.google.android.gms:play-services-cast-framework` in Kotlin
- **iOS:** Direct integration of Google Cast SDK in Swift
- **Benefits:** Lower latency, better performance, no bridge overhead
- **Challenges:**
  - Complete rewrite of cast logic required
  - State synchronization between Rust core and native UI
  - Complex lifecycle management

**Migration Approach:**
```
Phase 3: Native Module Migration
├── Implement Kotlin Cast Manager (Android)
├── Implement Swift Cast Manager (iOS)
├── Create FFI interface for cast state (Rust SDK)
└── Bidirectional sync: Native Cast State ↔ Rust Core
```

**Estimated Effort:** 3-4 weeks
**Risk Level:** HIGH - Mission-critical feature

---

### 2. Sentry Error Tracking

**Package:** `@sentry/react-native@7.6.0`

#### Current Implementation
- **Native Dependencies:**
  - Android: Sentry Gradle plugin (configured in `android/app/build.gradle:90`)
  - iOS: Sentry iOS SDK via CocoaPods
- **Configuration Files:**
  - `android/sentry.properties`
  - `ios/sentry.properties`
- **Integration:**
  - Error boundary integration
  - Automatic crash reporting
  - Performance monitoring
  - Release tracking

#### Native Module Analysis
- **Android Native Code:** Native crash handler, ANR detection
- **iOS Native Code:** Native crash handler, symbolication
- **Bridge Overhead:** LOW - only on error events

#### Migration Impact: **HIGH PRIORITY - MEDIUM COMPLEXITY**

**Replacement Strategy:**
- **Android:** Sentry Android SDK (`io.sentry:sentry-android`)
- **iOS:** Sentry Cocoa SDK (`Sentry`)
- **Rust Integration:** `sentry-rust` crate for Rust SDK errors
- **Benefits:** Better crash reporting, native stack traces, Rust panic handling

**Migration Approach:**
```
Phase 2: Error Monitoring Setup
├── Integrate sentry-rust in Rust SDK (capture panics via catch_unwind)
├── Configure Sentry Android SDK in Kotlin app
├── Configure Sentry Cocoa SDK in Swift app
└── Unified error aggregation with custom tags per layer
```

**Estimated Effort:** 1 week
**Risk Level:** LOW - Well-documented native SDKs

**Key Consideration:** Ensure Rust panics are caught and reported via FFI error handling pattern.

---

### 3. MMKV Storage

**Package:** `react-native-mmkv@4.0.0`

#### Current Implementation
- **Native SDK:** Tencent MMKV (WeChat team)
- **Native Dependencies:**
  - Android: C++ MMKV library via JNI
  - iOS: C++ MMKV library via Objective-C++ wrapper
- **Usage:**
  - User preferences (150+ keys documented)
  - Authentication tokens (Trakt, TMDB, MDBList)
  - Cache storage (metadata, API responses)
  - Watch history and progress tracking
- **Performance:** Very fast (mmap-based), synchronous API

#### Native Module Analysis
- **Native Code:** C++ core with platform bindings
- **Bridge Overhead:** LOW - synchronous, no callbacks
- **Data Migration:** CRITICAL - extensive stored data

#### Migration Impact: **CRITICAL - HIGH COMPLEXITY**

**Replacement Strategy:**
- **Option 1: Keep MMKV Native (Recommended)**
  - Android: MMKV Android SDK (`com.tencent:mmkv`)
  - iOS: MMKV CocoaPods (`MMKV`)
  - Benefits: Same performance, easy migration, proven stability
  - Challenges: Data layer in native code (not Rust)

- **Option 2: Migrate to Rust Storage**
  - Use `sled` or `redb` (embedded databases in Rust)
  - Benefits: Unified data layer in Rust SDK, better architecture
  - Challenges: Data migration required, performance testing needed

**Recommended Approach:**
```
Phase 1: Hybrid Storage Strategy
├── Keep MMKV for UI preferences (native layer)
├── Migrate business data to Rust SDK storage (sled/redb)
└── FFI methods for cross-layer data access when needed

Phase 3: Data Migration
├── Export existing MMKV data during migration
├── Import critical data to Rust SDK storage
└── Maintain MMKV compatibility during transition
```

**Data Migration Complexity:**
- **150+ preference keys** to categorize (UI vs business logic)
- **Auth tokens** must be securely migrated
- **Watch history** (~1000s of records per user)
- **API caches** can be regenerated

**Estimated Effort:** 2-3 weeks
**Risk Level:** HIGH - Data loss potential

---

### 4. React Native Video

**Package:** `react-native-video@6.17.0`

#### Current Implementation
- **Native Players:**
  - Android: ExoPlayer
  - iOS: AVPlayer
- **Features Used:**
  - HLS/DASH streaming
  - Subtitles (SRT, VTT)
  - Playback rate control
  - DRM support (optional)
  - Picture-in-Picture (PiP)
  - Background audio
- **Integration:**
  - `src/components/VideoPlayer/VideoPlayer.tsx`
  - `src/hooks/useVideoPlayer.ts`
  - Custom controls UI

#### Native Module Analysis
- **Android Native Code:** ExoPlayer integration (Java/Kotlin)
- **iOS Native Code:** AVPlayer integration (Objective-C/Swift)
- **Bridge Overhead:** HIGH - frequent playback state updates

#### Migration Impact: **CRITICAL - MEDIUM COMPLEXITY**

**Replacement Strategy:**
- **Android:** Direct ExoPlayer integration in Kotlin
  - `com.google.android.exoplayer:exoplayer`
- **iOS:** Direct AVPlayer integration in Swift
  - `AVFoundation` framework
- **Benefits:** Lower latency, better control, no bridge overhead
- **Challenges:** Complex UI synchronization with video state

**Migration Approach:**
```
Phase 3: Video Player Migration
├── Implement Kotlin VideoPlayerManager (ExoPlayer)
├── Implement Swift VideoPlayerManager (AVPlayer)
├── Create FFI interface for playback state (Rust SDK)
├── Expose playback events to UI layer
└── Implement custom native video controls
```

**Estimated Effort:** 4-5 weeks
**Risk Level:** MEDIUM - Well-documented native APIs

---

### 5. Expo VLC Player

**Package:** `expo-libvlc-player@2.2.3`

#### Current Implementation
- **Native SDK:** VLC Media Player (libVLC)
- **Usage:** Alternative video player for certain formats
- **Features:**
  - Wide format support
  - Advanced codec support
  - Network streaming

#### Migration Impact: **MEDIUM - MEDIUM COMPLEXITY**

**Replacement Strategy:**
- Evaluate if VLC is still needed with native ExoPlayer/AVPlayer
- If needed:
  - Android: libVLC Android SDK
  - iOS: MobileVLCKit
- **Recommendation:** Prefer native players (ExoPlayer/AVPlayer) and only use VLC for edge cases

**Estimated Effort:** 2 weeks (if needed)
**Risk Level:** LOW - Optional feature

---

### 6. React Native Reanimated

**Package:** `react-native-reanimated@4.2.0`

#### Current Implementation
- **Native SDK:** C++ Reanimated runtime
- **Usage:**
  - Smooth animations throughout UI
  - Gesture handling integration
  - 60/120 FPS animations on UI thread
- **Native Dependencies:**
  - Android: C++ worklets runtime
  - iOS: C++ worklets runtime

#### Migration Impact: **HIGH - REPLACED BY NATIVE**

**Replacement Strategy:**
- **Android:** Jetpack Compose animations, MotionLayout
- **iOS:** SwiftUI animations, UIKit Core Animation
- **Benefits:** Native performance, platform-appropriate animations
- **Challenges:** Complete animation rewrite, different animation paradigms

**Estimated Effort:** Ongoing throughout UI migration
**Risk Level:** MEDIUM - Different animation concepts per platform

---

## Expo SDK Modules

### Core Expo Modules (23 packages)

| Package | Version | Purpose | Native Alternative | Migration Complexity |
|---------|---------|---------|-------------------|---------------------|
| `expo` | 54 | Core framework | N/A | Removed entirely |
| `expo-application` | 7.0.7 | App metadata | `PackageManager` (Android), `Bundle` (iOS) | LOW |
| `expo-auth-session` | 7.0.8 | OAuth flow helper | Custom implementation | MEDIUM |
| `expo-blur` | 15.0.7 | Blur effects | Native blur views | LOW |
| `expo-brightness` | 14.0.7 | Screen brightness | `Settings.System` (Android), `UIScreen` (iOS) | LOW |
| `expo-crypto` | 15.0.7 | Crypto operations | Rust `ring`/`rustcrypto` | LOW |
| `expo-dev-client` | 6.0.15 | Development client | N/A | Removed |
| `expo-device` | 8.0.9 | Device info | `Build` (Android), `UIDevice` (iOS) | LOW |
| `expo-document-picker` | 14.0.7 | File picker | `Intent.ACTION_OPEN_DOCUMENT` (Android), `UIDocumentPickerViewController` (iOS) | MEDIUM |
| `expo-file-system` | 19.0.17 | File operations | `java.io.File` (Android), `FileManager` (iOS) | MEDIUM |
| `expo-glass-effect` | 0.1.4 | Glass morphism | Custom shaders/blur | MEDIUM |
| `expo-haptics` | 15.0.7 | Haptic feedback | `Vibrator` (Android), `UIImpactFeedbackGenerator` (iOS) | LOW |
| `expo-intent-launcher` | 13.0.7 | Android intents | Direct `Intent` usage | LOW |
| `expo-libvlc-player` | 2.2.3 | VLC player | See above | MEDIUM |
| `expo-linear-gradient` | 15.0.7 | Gradients | Native gradient drawables | LOW |
| `expo-localization` | 17.0.7 | Locale/timezone | `Locale`, `TimeZone` (both) | LOW |
| `expo-notifications` | 0.32.12 | Push notifications | `FCM` (Android), `APNs` (iOS) | HIGH |
| `expo-random` | 14.0.1 | Random bytes | Rust `getrandom` crate | LOW |
| `expo-screen-orientation` | 9.0.7 | Orientation lock | `requestedOrientation` (Android), orientation masks (iOS) | LOW |
| `expo-sharing` | 14.0.7 | Share sheet | `Intent.ACTION_SEND` (Android), `UIActivityViewController` (iOS) | LOW |
| `expo-status-bar` | 3.0.8 | Status bar styling | `Window` (Android), `UIStatusBar` (iOS) | LOW |
| `expo-system-ui` | 6.0.7 | System UI control | `WindowInsetsController` (Android), `UIView` (iOS) | LOW |
| `expo-updates` | 29.0.12 | OTA updates | Custom update mechanism or CodePush | HIGH |
| `expo-web-browser` | 15.0.8 | In-app browser | `Chrome Custom Tabs` (Android), `SFSafariViewController` (iOS) | LOW |

### Migration Strategy for Expo Modules

**General Approach:**
1. **Phase 2:** Replace Expo modules with direct native APIs during UI migration
2. **Advantages:**
   - More control, better performance
   - No Expo runtime overhead
   - Platform-appropriate UX
3. **Challenges:**
   - Significant API rewrite
   - Different APIs per platform
   - No unified abstraction layer

**High-Priority Modules:**
- **expo-notifications:** Complex migration to FCM/APNs
- **expo-updates:** Requires custom OTA solution
- **expo-file-system:** Extensive usage in app

**Estimated Effort:** 6-8 weeks across all Expo modules
**Risk Level:** MEDIUM - Well-documented native alternatives

---

## UI & Navigation Libraries

### UI Component Libraries

| Package | Version | Purpose | Native Alternative | Migration Effort |
|---------|---------|---------|-------------------|------------------|
| `react-native-paper` | 5.14.5 | Material Design components | Material 3 (Android), UIKit (iOS) | HIGH (8-10 weeks) |
| `@gorhom/bottom-sheet` | 5.2.6 | Bottom sheet modal | `BottomSheetDialogFragment` (Android), `UISheetPresentationController` (iOS) | MEDIUM |
| `@react-native-community/blur` | 4.4.1 | Blur effects | Native blur | LOW |
| `@react-native-community/slider` | 5.1.1 | Slider component | `SeekBar` (Android), `UISlider` (iOS) | LOW |
| `@react-native-picker/picker` | 2.11.4 | Picker/dropdown | `Spinner` (Android), `UIPickerView` (iOS) | LOW |
| `@d11/react-native-fast-image` | 8.13.0 | Optimized images | `Coil`/`Glide` (Android), `Kingfisher`/`SDWebImage` (iOS) | MEDIUM |
| `@shopify/flash-list` | 2.2.0 | Performant lists | `RecyclerView` (Android), `UICollectionView` (iOS) | MEDIUM |
| `lottie-react-native` | 7.3.1 | Lottie animations | Lottie Android/iOS SDKs | LOW |
| `react-native-svg` | 15.12.1 | SVG rendering | Native vector drawables (Android), CoreGraphics (iOS) | MEDIUM |

### Navigation Libraries

| Package | Version | Purpose | Native Alternative | Migration Effort |
|---------|---------|---------|-------------------|------------------|
| `@react-navigation/native` | 7.1.6 | Core navigation | Native navigation controllers | HIGH |
| `@react-navigation/native-stack` | 7.3.10 | Stack navigation | `NavHostFragment` (Android), `UINavigationController` (iOS) | HIGH |
| `@react-navigation/stack` | 7.2.10 | Custom stack | Custom navigation | HIGH |
| `@react-navigation/bottom-tabs` | 7.3.10 | Tab navigation | `BottomNavigationView` (Android), `UITabBarController` (iOS) | MEDIUM |
| `@bottom-tabs/react-navigation` | 1.0.2 | Enhanced tabs | Custom implementation | MEDIUM |

### Migration Impact: UI & Navigation

**Total Effort:** 12-16 weeks
**Risk Level:** HIGH - Requires complete UI rewrite
**Complexity:** Very high - Different paradigms per platform

**Migration Strategy:**
```
Phase 2: UI Layer Rewrite
├── Design System Definition
│   ├── Android: Material 3 Design System in Kotlin/Compose
│   └── iOS: iOS Design System in Swift/SwiftUI
├── Core Navigation
│   ├── Android: Jetpack Navigation Component
│   └── iOS: UIKit/SwiftUI Navigation
├── Shared UI Components
│   ├── Button, Text, Image, List, Modal, etc.
│   └── Platform-specific customization
└── Screen Migration (50+ screens)
    ├── Home, Browse, Details, Player, Settings, etc.
    └── Progressive migration with feature parity verification
```

**Key Considerations:**
- **Design Consistency:** Maintain Nuvio branding across platforms
- **Platform Guidelines:** Follow Material Design (Android) and HIG (iOS)
- **Shared Business Logic:** Use Rust SDK for business logic, native UI for presentation
- **Testing:** Extensive UI testing required per platform

---

## Media Playback Dependencies

| Package | Version | Purpose | Migration Strategy | Risk |
|---------|---------|---------|-------------------|------|
| `react-native-video` | 6.17.0 | Primary video player | Native ExoPlayer/AVPlayer | HIGH |
| `expo-libvlc-player` | 2.2.3 | Alternative player | Optional: Native VLC SDK | MEDIUM |
| `react-native-google-cast` | 4.9.1 | Chromecast | Native Cast SDK integration | HIGH |
| `@adrianso/react-native-device-brightness` | 1.2.7 | Brightness control | Native APIs | LOW |

**Combined Migration Effort:** 6-8 weeks
**Risk Level:** HIGH - Core functionality

**Migration Plan:**
1. Implement native video players first (ExoPlayer/AVPlayer)
2. Add Chromecast support to native players
3. Integrate brightness controls
4. Migrate VLC if needed for edge cases

---

## Storage & State Management

### Storage

| Package | Version | Purpose | Native Alternative | Migration |
|---------|---------|---------|-------------------|-----------|
| `react-native-mmkv` | 4.0.0 | Key-value storage | Native MMKV or Rust storage | HIGH |
| `react-native-get-random-values` | 2.0.0 | Crypto random | Native SecureRandom | LOW |

### State Management

**Current:** React Context API (18 contexts documented in `contexts-and-hooks-inventory.md`)

**Migration Strategy:**
```
State Layer Separation:
├── Rust SDK State (Business Logic)
│   ├── Authentication state
│   ├── Watch history
│   ├── Content metadata
│   ├── Playback state
│   └── User preferences (business logic)
├── Native UI State (Presentation)
│   ├── Android: ViewModel + StateFlow (Jetpack)
│   ├── iOS: ObservableObject + @Published (SwiftUI) or Delegates (UIKit)
│   ├── UI theme preferences
│   ├── Navigation state
│   └── Transient UI state
└── FFI Synchronization
    ├── Rust → Native: Callbacks/observers
    └── Native → Rust: Method calls
```

**Key Challenge:** State synchronization across FFI boundary
**Recommended Pattern:** Unidirectional data flow (Rust SDK as single source of truth)

---

## Developer Tools & Testing

### Build Tools

| Package | Version | Purpose | Migration Impact |
|---------|---------|---------|------------------|
| `@babel/core` | 7.25.2 | JavaScript transpiler | Removed (native builds) |
| `typescript` | 5.3.3 | Type checking | TypeScript in Rust via types |
| `patch-package` | 8.0.1 | Dependency patching | Not needed |
| `xcode` | 3.0.1 | Xcode automation | Native build system |

### Testing

| Package | Version | Purpose | Native Alternative |
|---------|---------|---------|-------------------|
| `jest` | 30.2.0 | Test framework | `cargo test` (Rust), JUnit (Android), XCTest (iOS) |
| `@testing-library/react-native` | 13.3.3 | Component testing | Compose Testing (Android), SwiftUI Testing (iOS) |
| `@testing-library/jest-native` | 5.4.3 | Native matchers | Native test frameworks |
| `react-test-renderer` | 19.1.0 | Snapshot testing | Native snapshot testing |

**Testing Strategy Post-Migration:**
```
Multi-Layer Testing:
├── Rust SDK Tests (cargo test)
│   ├── Unit tests (business logic)
│   ├── Integration tests (API mocking)
│   └── FFI boundary tests
├── Android Tests (JUnit + Espresso)
│   ├── Unit tests (ViewModels, utilities)
│   ├── Integration tests (UI + SDK)
│   └── UI tests (Compose Testing)
├── iOS Tests (XCTest)
│   ├── Unit tests (ViewModels, utilities)
│   ├── Integration tests (UI + SDK)
│   └── UI tests (XCTest UI)
└── E2E Tests (Maestro or Appium)
    └── Cross-platform critical user flows
```

---

## Migration Impact Assessment

### Complexity Matrix

| Dependency Type | Count | Migration Effort (weeks) | Risk Level | Priority |
|----------------|-------|-------------------------|------------|----------|
| Core Framework (React Native) | 3 | N/A (removed) | HIGH | Phase 2 |
| Critical Native Modules | 4 | 8-10 | HIGH | Phase 3 |
| Expo Modules | 23 | 6-8 | MEDIUM | Phase 2 |
| UI Components | 15 | 12-16 | HIGH | Phase 2 |
| Navigation | 5 | 4-6 | HIGH | Phase 2 |
| Media & Video | 4 | 6-8 | HIGH | Phase 3 |
| Storage | 2 | 2-3 | HIGH | Phase 1/3 |
| Utilities | 12 | 2-4 | LOW | Phase 1 |
| Monitoring | 2 | 1-2 | MEDIUM | Phase 2 |
| **TOTAL** | **70** | **41-57** | **HIGH** | **6-12 months** |

### Critical Path Analysis

**Blocking Dependencies (Must migrate first):**
1. **Rust SDK Core** (Phase 1)
   - Business logic extraction
   - API client implementation
   - Storage layer design
   - FFI interface definition

2. **UI Framework** (Phase 2)
   - Navigation structure
   - Component library
   - Screen layout system
   - Theme/design system

3. **Native Modules** (Phase 3)
   - Video playback (ExoPlayer/AVPlayer)
   - Google Cast integration
   - MMKV storage access
   - Sentry error tracking

### Risk Assessment by Dependency

#### HIGH RISK (Migration Blockers)
- **react-native-google-cast:** Mission-critical feature, complex state management
- **react-native-video:** Core functionality, extensive usage
- **react-native-mmkv:** Data migration complexity, 150+ keys
- **@sentry/react-native:** Error tracking continuity during migration
- **React Navigation:** 50+ screens to migrate

#### MEDIUM RISK (Significant Effort)
- **expo-notifications:** Complex setup with FCM/APNs
- **expo-updates:** Need alternative OTA solution
- **expo-file-system:** Extensive file operations
- **UI component libraries:** Large rewrite effort
- **react-native-reanimated:** Different animation paradigms

#### LOW RISK (Straightforward Migration)
- **expo-haptics:** Simple native APIs
- **expo-brightness:** Direct native access
- **expo-localization:** Standard platform APIs
- **Utility libraries:** Pure JavaScript, can port to Rust

---

## Recommendations by Phase

### Phase 1: Rust SDK Core (Weeks 1-8)

**Focus:** Extract business logic to Rust, no dependency changes yet

**Dependencies to Address:**
- **Migrate to Rust:**
  - `axios` → `reqwest` (HTTP client)
  - `crypto-js` → `ring`/`rustcrypto` (cryptography)
  - `lodash` → Rust standard library + `itertools`
  - `date-fns` → `chrono` (date/time)
  - `cheerio-without-node-native` → `scraper` (HTML parsing)

**New Rust Dependencies:**
```toml
[dependencies]
reqwest = { version = "0.11", features = ["json", "cookies"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
ring = "0.17"
uniffi = "0.26"  # FFI bindings
tracing = "0.1"  # Logging
```

**Output:** Rust SDK with core APIs, ready for FFI integration

---

### Phase 2: Native UI Layer (Weeks 9-24)

**Focus:** Replace React Native UI with Kotlin/Swift

**Android Dependencies:**
```gradle
// Core
implementation "androidx.core:core-ktx:1.12.0"
implementation "androidx.appcompat:appcompat:1.6.1"

// UI
implementation "com.google.android.material:material:1.11.0"
implementation "androidx.compose.ui:ui:1.6.0"
implementation "androidx.compose.material3:material3:1.2.0"

// Navigation
implementation "androidx.navigation:navigation-compose:2.7.6"

// Image Loading
implementation "io.coil-kt:coil-compose:2.5.0"

// Lottie
implementation "com.airbnb.android:lottie-compose:6.3.0"

// Lifecycle
implementation "androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0"
implementation "androidx.lifecycle:lifecycle-runtime-compose:2.7.0"
```

**iOS Dependencies (CocoaPods):**
```ruby
# Core
pod 'Alamofire', '~> 5.8'  # HTTP client (if not using Rust SDK directly)

# Image Loading
pod 'Kingfisher', '~> 7.10'

# Lottie
pod 'lottie-ios', '~> 4.3'

# UI Utilities
pod 'SnapKit', '~> 5.7'  # Auto Layout DSL
```

**Expo Module Replacements:**
- All 23 Expo modules replaced with native equivalents (see table above)
- Navigation: Jetpack Navigation (Android), UIKit Navigation (iOS)
- UI Components: Material 3 (Android), UIKit/SwiftUI (iOS)

---

### Phase 3: Native Modules Integration (Weeks 25-36)

**Focus:** Migrate critical native modules

**Video Playback:**

Android:
```gradle
implementation "com.google.android.exoplayer:exoplayer:2.19.1"
implementation "com.google.android.exoplayer:extension-cast:2.19.1"
```

iOS:
```ruby
# AVFoundation is built-in
# For VLC (if needed):
pod 'MobileVLCKit', '~> 3.5'
```

**Google Cast:**

Android:
```gradle
implementation "com.google.android.gms:play-services-cast-framework:21.4.0"
```

iOS:
```ruby
pod 'google-cast-sdk', '~> 4.8'
```

**Storage:**

Android:
```gradle
implementation "com.tencent:mmkv:1.3.3"
```

iOS:
```ruby
pod 'MMKV', '~> 1.3'
```

**Error Tracking:**

Android:
```gradle
implementation "io.sentry:sentry-android:7.2.0"
```

iOS:
```ruby
pod 'Sentry', '~> 8.17'
```

Rust:
```toml
sentry = { version = "0.32", features = ["backtrace", "contexts", "panic"] }
```

**Notifications:**

Android:
```gradle
implementation "com.google.firebase:firebase-messaging:23.4.0"
```

iOS:
```ruby
# APNs is built-in
pod 'Firebase/Messaging', '~> 10.20'
```

---

### Phase 4: FFI Integration & Optimization (Weeks 37-48)

**Focus:** Optimize FFI boundary, performance tuning

**UniFFI Setup:**

Rust:
```toml
[build-dependencies]
uniffi = { version = "0.26", features = ["build"] }

[lib]
crate-type = ["cdylib", "staticlib"]
```

**Build Tools:**

Android:
```bash
# cargo-ndk for cross-compilation
cargo install cargo-ndk

# Build for all Android architectures
cargo ndk -t armeabi-v7a -t arm64-v8a -t x86 -t x86_64 build --release
```

iOS:
```bash
# Add iOS targets
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios

# Build universal library
cargo build --target aarch64-apple-ios --release
cargo build --target x86_64-apple-ios --release
lipo -create target/aarch64-apple-ios/release/libnuvio.a \
             target/x86_64-apple-ios/release/libnuvio.a \
             -output libnuvio.a
```

**FFI Performance Optimization:**
- Minimize FFI calls (batch operations)
- Use async callbacks for long operations
- Implement efficient serialization (prefer primitive types over JSON)
- Memory profiling (LeakCanary on Android, Instruments on iOS)

---

## Dependency Removal Impact

### Packages to Remove Entirely

**React/React Native Ecosystem (58 packages):**
- `react`, `react-native`, `react-test-renderer`
- All `@react-navigation/*` packages (5)
- All Expo packages (23)
- React Native community packages (8)
- UI component libraries (15)
- Development tools (16)

**Bundle Size Reduction:**
- **Before:** ~50-80 MB app bundle (React Native + dependencies)
- **After:** ~20-30 MB app bundle (native only + Rust SDK)
- **Savings:** 50-60% bundle size reduction

**Performance Improvements:**
- **Startup Time:** 30-50% faster (no JS bundle loading)
- **Runtime Performance:** 2-3x faster (no bridge overhead)
- **Memory Usage:** 40-60% lower (no JS runtime)
- **Battery Life:** 10-20% better (more efficient native code)

---

## Critical Migration Patterns

### Pattern 1: Storage Migration (MMKV → Rust/Native)

```rust
// Rust SDK - New storage layer
pub struct StorageManager {
    db: sled::Db,
}

#[uniffi::export]
impl StorageManager {
    pub fn get_string(&self, key: &str) -> Option<String> {
        self.db.get(key).ok().flatten()
            .map(|v| String::from_utf8(v.to_vec()).ok())
            .flatten()
    }

    pub fn set_string(&self, key: &str, value: &str) -> Result<()> {
        self.db.insert(key, value.as_bytes())?;
        Ok(())
    }
}
```

```kotlin
// Android - MMKV data migration
class MigrationHelper {
    fun migrateMMKVToRustSDK(mmkv: MMKV, rustSdk: StorageManager) {
        val keys = mmkv.allKeys() ?: return
        keys.forEach { key ->
            val value = mmkv.getString(key, null)
            value?.let { rustSdk.setString(key, it) }
        }
    }
}
```

### Pattern 2: Video Player Migration

```kotlin
// Android - Native ExoPlayer
class VideoPlayerManager(context: Context) {
    private val player = ExoPlayer.Builder(context).build()

    fun play(url: String, position: Long) {
        val mediaItem = MediaItem.fromUri(url)
        player.setMediaItem(mediaItem)
        player.seekTo(position)
        player.prepare()
        player.play()
    }

    fun observeState(callback: (PlaybackState) -> Unit) {
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                callback(mapState(state))
            }
        })
    }
}
```

```swift
// iOS - Native AVPlayer
class VideoPlayerManager {
    private var player: AVPlayer?

    func play(url: String, position: TimeInterval) {
        let asset = AVAsset(url: URL(string: url)!)
        let item = AVPlayerItem(asset: asset)
        player = AVPlayer(playerItem: item)
        player?.seek(to: CMTime(seconds: position, preferredTimescale: 1))
        player?.play()
    }

    func observeState(callback: @escaping (PlaybackState) -> Void) {
        player?.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 1), queue: .main) { time in
            callback(self.mapState())
        }
    }
}
```

### Pattern 3: Cast Integration

```rust
// Rust SDK - Cast state FFI interface
#[derive(uniffi::Record)]
pub struct CastState {
    pub is_connected: bool,
    pub device_name: Option<String>,
    pub volume: f32,
    pub is_muted: bool,
}

#[uniffi::export(callback_interface)]
pub trait CastStateObserver: Send + Sync {
    fn on_state_changed(&self, state: CastState);
}

pub struct CastManager {
    observer: Arc<Mutex<Option<Arc<dyn CastStateObserver>>>>,
}

#[uniffi::export]
impl CastManager {
    pub fn set_observer(&self, observer: Arc<dyn CastStateObserver>) {
        *self.observer.lock().unwrap() = Some(observer);
    }
}
```

```kotlin
// Android - Native Cast implementation
class CastManagerImpl(context: Context) : CastStateObserver {
    private val castContext = CastContext.getSharedInstance(context)
    private var rustCastManager: CastManager? = null

    init {
        castContext.addCastStateListener { state ->
            rustCastManager?.notifyStateChanged(mapCastState(state))
        }
    }

    override fun onStateChanged(state: CastState) {
        // Update UI in response to Rust SDK state changes
    }
}
```

---

## Testing Strategy for Migrated Dependencies

### FFI Boundary Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_ffi_round_trip() {
        let storage = StorageManager::new();
        storage.set_string("test_key", "test_value").unwrap();
        assert_eq!(storage.get_string("test_key"), Some("test_value".to_string()));
    }

    #[test]
    fn test_panic_handling() {
        let result = std::panic::catch_unwind(|| {
            panic!("Test panic");
        });
        assert!(result.is_err()); // Panics are caught, not propagated across FFI
    }
}
```

### Memory Leak Detection

Android:
```kotlin
class MemoryLeakTest {
    @Test
    fun testRustSDKDoesNotLeak() {
        // Use LeakCanary or manual heap dump analysis
        val sdk = NuvioSDK()
        val weakRef = WeakReference(sdk)

        // Use SDK
        sdk.performOperation()

        // Release reference
        sdk = null
        System.gc()

        // Verify collection
        assertNull(weakRef.get())
    }
}
```

iOS:
```swift
func testMemoryLeak() {
    weak var weakSDK: NuvioSDK?

    autoreleasepool {
        let sdk = NuvioSDK()
        weakSDK = sdk
        sdk.performOperation()
    }

    XCTAssertNil(weakSDK, "SDK should be deallocated")
}
```

---

## Appendix: Full Dependency List

### Production Dependencies (83)

#### React & Core (3)
- react@19.1.0
- react-native@0.81.4
- react-native-web@0.21.0

#### Navigation (5)
- @react-navigation/bottom-tabs@7.3.10
- @react-navigation/native@7.1.6
- @react-navigation/native-stack@7.3.10
- @react-navigation/stack@7.2.10
- @bottom-tabs/react-navigation@1.0.2

#### Expo SDK (23)
- expo@54
- expo-application@7.0.7
- expo-auth-session@7.0.8
- expo-blur@15.0.7
- expo-brightness@14.0.7
- expo-crypto@15.0.7
- expo-dev-client@6.0.15
- expo-device@8.0.9
- expo-document-picker@14.0.7
- expo-file-system@19.0.17
- expo-glass-effect@0.1.4
- expo-haptics@15.0.7
- expo-intent-launcher@13.0.7
- expo-libvlc-player@2.2.3
- expo-linear-gradient@15.0.7
- expo-localization@17.0.7
- expo-notifications@0.32.12
- expo-random@14.0.1
- expo-screen-orientation@9.0.7
- expo-sharing@14.0.7
- expo-status-bar@3.0.8
- expo-system-ui@6.0.7
- expo-updates@29.0.12
- expo-web-browser@15.0.8

#### UI Components (15)
- @gorhom/bottom-sheet@5.2.6
- @react-native-community/blur@4.4.1
- @react-native-community/slider@5.1.1
- @react-native-picker/picker@2.11.4
- @d11/react-native-fast-image@8.13.0
- @shopify/flash-list@2.2.0
- lottie-react-native@7.3.1
- @lottiefiles/dotlottie-react@0.17.7
- react-native-bottom-tabs@1.0.2
- react-native-gesture-handler@2.29.1
- react-native-markdown-display@7.0.2
- react-native-paper@5.14.5
- react-native-reanimated@4.2.0
- react-native-reanimated-carousel@4.0.3
- react-native-svg@15.12.1

#### Media & Video (4)
- react-native-video@6.17.0
- expo-libvlc-player@2.2.3
- react-native-google-cast@4.9.1
- @adrianso/react-native-device-brightness@1.2.7

#### Storage (2)
- react-native-mmkv@4.0.0
- react-native-get-random-values@2.0.0

#### Native Modules (8)
- @react-native-community/netinfo@11.4.1
- react-native-boost@0.6.2
- react-native-image-colors@2.5.0
- react-native-immersive-mode@2.0.2
- react-native-nitro-modules@0.31.2
- react-native-safe-area-context@5.6.0
- react-native-screens@4.18.0
- react-native-worklets@0.7.1

#### Utilities (12)
- axios@1.12.2
- axios-cookiejar-support@6.0.4
- cheerio-without-node-native@0.20.2
- crypto-js@4.2.0
- date-fns@4.1.0
- eventemitter3@5.0.1
- lodash@4.17.21
- react-native-url-polyfill@3.0.0
- react-native-vector-icons@10.3.0
- react-native-wheel-color-picker@1.3.1
- @types/lodash@4.17.16
- @types/react-native-video@5.0.20

#### Analytics & Monitoring (2)
- @sentry/react-native@7.6.0
- posthog-react-native@4.4.0

#### Supporting Libraries (9)
- @expo/vector-icons@15.0.2
- @expo/env@2.0.7
- @expo/metro-runtime@6.1.2
- @backpackapp-io/react-native-toast@0.15.1
- @legendapp/list@2.0.13
- @types/crypto-js@4.2.2

### Development Dependencies (16)

- @babel/core@7.25.2
- @testing-library/jest-native@5.4.3
- @testing-library/react-native@13.3.3
- @types/react@18.3.12
- @types/react-native@0.72.8
- @types/react-native-vector-icons@6.4.18
- @typescript-eslint/eslint-plugin@7.18.0
- @typescript-eslint/parser@7.18.0
- babel-plugin-transform-remove-console@6.9.4
- eslint@8.57.0
- eslint-config-prettier@9.1.0
- eslint-plugin-prettier@5.2.1
- jest@30.2.0
- jest-expo@54.0.16
- patch-package@8.0.1
- typescript@5.3.3

---

## Summary & Next Steps

### Key Takeaways

1. **High Dependency Complexity:** 83 production dependencies, 25+ native modules
2. **Critical Native Modules:** Google Cast, Sentry, MMKV, Video Players require careful migration
3. **Complete UI Rewrite:** All React Native UI components must be replaced with native equivalents
4. **Data Migration Risk:** MMKV storage contains critical user data (auth tokens, watch history, preferences)
5. **Estimated Timeline:** 6-12 months for complete migration
6. **Estimated Effort:** 41-57 weeks of development work

### Immediate Next Steps

1. **Create ADR-002: FFI Binding Strategy**
   - Document UniFFI as primary FFI generator
   - Define memory management patterns
   - Establish error handling strategy

2. **Prototype Critical Paths**
   - Rust SDK ↔ Kotlin/Swift video player integration
   - Rust SDK ↔ Kotlin/Swift cast state synchronization
   - FFI performance benchmarking

3. **Design Native UI Architecture**
   - Material 3 design system (Android)
   - iOS design system (SwiftUI/UIKit)
   - Shared design tokens and patterns

4. **Plan Data Migration Strategy**
   - MMKV export/import tooling
   - Categorize 150+ storage keys (UI vs business logic)
   - Design Rust SDK storage schema

5. **Set Up Build Toolchain**
   - rustup with iOS/Android targets
   - cargo-ndk for Android multi-arch builds
   - uniffi_bindgen for FFI code generation
   - CI/CD for multi-language builds

---

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Author:** Architecture Analysis Task
**Related Documents:**
- `external-integrations-map.md` - External API dependencies
- `platform-specific-code-catalog.md` - Native code patterns
- `state-management-map.md` - State architecture
- `media-playback-analysis.md` - Video player details
