# React Native to Rust + Native Migration Plan

Complete migration plan for converting NuvioStreamingTV from React Native + Expo to Rust SDK (nuvio-core) with native Kotlin (Android) and Swift (iOS) implementations.

## Overview

**Current State:**
- 399 TypeScript files (React Native + Expo)
- 28 TypeScript business logic services
- Partial Rust SDK (46 files) - Trakt, TMDB, Stremio
- Partial Android app (Kotlin + Compose)
- Minimal iOS (React Native wrapper)

**Target State:**
- Rust SDK (nuvio-core) - All business logic
- Kotlin + Jetpack Compose - Android (Mobile + TV)
- Swift + SwiftUI - iOS/tvOS (iPhone + iPad + Apple TV)
- Zero React Native/Expo code

---

## Phase 1: Expand Rust SDK (7 features)

Migrate all TypeScript business logic to Rust SDK.

### 1.1: Rust SDK Storage Layer (MMKV Replacement)
- **Priority:** 1 (High)
- **Dependencies:** None
- **Description:** Migrate storage layer from TypeScript MMKV to Rust SDK. Implement unified key-value storage abstraction with platform-specific backends.
- **Files to Migrate:** `storageService.ts`, `mmkvStorage.ts`

### 1.2: Rust SDK Cache Management
- **Priority:** 1 (High)
- **Dependencies:** 1.1 Storage Layer
- **Description:** Implement cache management system in Rust. Metadata caching, stream caching, TTL management.
- **Files to Migrate:** `cacheService.ts`, `streamCacheService.ts`

### 1.3: Rust SDK Complete Catalog/Stremio Logic
- **Priority:** 1 (High)
- **Dependencies:** 1.2 Cache
- **Description:** Complete catalog and Stremio service migration. Already partially implemented.
- **Files to Migrate:** `catalogService.ts` (59KB), `stremioService.ts` (72KB)

### 1.4: Rust SDK Notification System
- **Priority:** 2 (Medium)
- **Dependencies:** 1.1 Storage
- **Description:** Migrate notification system to Rust. Local/remote notifications, scheduling.
- **Files to Migrate:** `notificationService.ts` (29KB)

### 1.5: Rust SDK Backup/Restore System
- **Priority:** 2 (Medium)
- **Dependencies:** 1.1 Storage
- **Description:** Migrate backup/restore functionality. Cloud backup, local backup, data export/import.
- **Files to Migrate:** `backupService.ts` (40KB)

### 1.6: Rust SDK Plugin System
- **Priority:** 2 (Medium)
- **Dependencies:** 1.3 Catalog
- **Description:** Migrate plugin system. Local scraper plugins, custom repositories.
- **Files to Migrate:** `pluginService.ts`

### 1.7: Rebuild UniFFI Bindings for Kotlin & Swift
- **Priority:** 1 (High)
- **Dependencies:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
- **Description:** Generate updated Kotlin and Swift bindings for all new Rust modules.

---

## Phase 2: Complete Android (11 features)

Build full Kotlin + Jetpack Compose app (Mobile + TV).

### 2.1: Android Compose Architecture & Theme System
- **Priority:** 1 (High)
- **Dependencies:** Phase 1 complete
- **Description:** MVVM with Hilt DI, Material 3 theme, TV focus management, mobile touch design.

### 2.2: Android Home Screen (TV + Mobile)
- **Priority:** 1 (High)
- **Dependencies:** 2.1 Architecture
- **Description:** Hero carousel, category rows, continue watching. TV: D-pad navigation. Mobile: touch gestures.

### 2.3: Android Catalog Browsing Screens
- **Priority:** 1 (High)
- **Dependencies:** 2.1 Architecture
- **Description:** Grid layouts (6-col TV, 2-3 col mobile), filters, sorting, infinite scroll.

### 2.4: Android Content Details/Metadata Screens
- **Priority:** 1 (High)
- **Dependencies:** 2.1 Architecture
- **Description:** Movie/show details, cast/crew, ratings, trailers, season/episode selection.

### 2.5: Android Video Player with Controls
- **Priority:** 1 (High)
- **Dependencies:** 2.1 Architecture
- **Description:** Custom player controls overlay. TV: D-pad controls. Mobile: touch gestures (double-tap, swipe).

### 2.6: Android Settings Screens
- **Priority:** 2 (Medium)
- **Dependencies:** 2.1 Architecture
- **Description:** 20+ settings pages. Player settings, Trakt auth, TMDB config, parental controls.

### 2.7: Android Profile/Search/Watchlist Screens
- **Priority:** 2 (Medium)
- **Dependencies:** 2.1 Architecture
- **Description:** Profile switching with PIN, search with voice (TV), watchlist management.

### 2.8: Android Rust SDK Integration
- **Priority:** 1 (High)
- **Dependencies:** Phase 1, 2.1 Architecture
- **Description:** Integrate Rust SDK Kotlin bindings throughout app. Replace all TypeScript service calls.

### 2.9: Android ExoPlayer Full Features
- **Priority:** 1 (High)
- **Dependencies:** 2.5 Player
- **Description:** Subtitles with custom styling, multi-audio tracks, adaptive bitrate, quality selector.

### 2.10: Android Media Features (Cast/PiP/Background)
- **Priority:** 2 (Medium)
- **Dependencies:** 2.9 ExoPlayer
- **Description:** Google Cast (Chromecast), Picture-in-Picture, background playback, media session controls.

### 2.11: Android Testing & Bug Fixes
- **Priority:** 1 (High)
- **Dependencies:** 2.8, 2.9, 2.10
- **Description:** Unit tests, UI tests, integration tests, E2E tests. Test on phones, tablets, Android TV.

---

## Phase 3: Build iOS/tvOS (11 features)

Build complete Swift + SwiftUI app (iOS + tvOS).

### 3.1: iOS/tvOS Xcode Project Setup with SwiftUI
- **Priority:** 1 (High)
- **Dependencies:** Phase 1 complete
- **Description:** Multi-target project (iOS + tvOS), MVVM architecture, Combine/async-await, navigation.

### 3.2: iOS Rust SDK Swift Bindings Integration
- **Priority:** 1 (High)
- **Dependencies:** 3.1 Project Setup, Phase 1
- **Description:** Link Swift bindings, compile Rust for iOS/tvOS targets, DI setup, async/await wrappers.

### 3.3: iOS/tvOS Home Screen with Carousels
- **Priority:** 1 (High)
- **Dependencies:** 3.2 SDK Integration
- **Description:** Hero carousel (TabView), category rows (LazyHStack). tvOS: focus navigation. iOS: swipe gestures.

### 3.4: iOS/tvOS Catalog Browsing Screens
- **Priority:** 1 (High)
- **Dependencies:** 3.2 SDK Integration
- **Description:** LazyVGrid layouts (6 col tvOS, 4-5 iPad, 2-3 iPhone), filters, sorting, pagination.

### 3.5: iOS/tvOS Content Details/Metadata Screens
- **Priority:** 1 (High)
- **Dependencies:** 3.2 SDK Integration
- **Description:** ScrollView layouts, cast/crew lists, trailer playback, season/episode picker.

### 3.6: iOS/tvOS Video Player with AVPlayer
- **Priority:** 1 (High)
- **Dependencies:** 3.2 SDK Integration
- **Description:** Custom SwiftUI controls. tvOS: Siri Remote gestures. iOS: touch gestures, pinch zoom.

### 3.7: iOS/tvOS Settings Screens
- **Priority:** 2 (Medium)
- **Dependencies:** 3.2 SDK Integration
- **Description:** Settings app-style Form/List views. 20+ pages including Trakt OAuth, parental controls.

### 3.8: iOS/tvOS Profile/Search/Watchlist Screens
- **Priority:** 2 (Medium)
- **Dependencies:** 3.2 SDK Integration
- **Description:** Profile switching with PIN, search (tvOS: on-screen keyboard), watchlist with swipe actions.

### 3.9: iOS/tvOS Media Features (AirPlay/PiP/Background)
- **Priority:** 2 (Medium)
- **Dependencies:** 3.6 Player
- **Description:** AirPlay, Picture-in-Picture (iPad/iPhone), background audio, Now Playing (Control Center).

### 3.10: iOS/tvOS Focus Engine & Navigation
- **Priority:** 1 (High)
- **Dependencies:** 3.1 Project Setup
- **Description:** tvOS: preferredFocusEnvironments, focus guides. iOS: NavigationStack/SplitView, deep linking.

### 3.11: iOS/tvOS Testing & Bug Fixes
- **Priority:** 1 (High)
- **Dependencies:** 3.2, 3.6, 3.9, 3.10
- **Description:** XCTest unit tests, SwiftUI UI tests, integration tests. Test on iPhone, iPad, Apple TV.

---

## Phase 4: Cleanup & Remove RN (6 features)

Remove all React Native and Expo code.

### 4.1: Remove React Native TypeScript Code
- **Priority:** 1 (High)
- **Dependencies:** Phase 2 & 3 complete
- **Description:** Delete src/ directory (399 TS files). Archive business logic docs. Verify Rust SDK parity.

### 4.2: Remove Expo Dependencies & Config
- **Priority:** 1 (High)
- **Dependencies:** 4.1
- **Description:** Delete app.json, metro.config.js, babel.config.js. Remove expo-* packages, node_modules.

### 4.3: Update Android Build Config (Remove RN)
- **Priority:** 1 (High)
- **Dependencies:** 4.2
- **Description:** Remove RN autolinking, Hermes config from build.gradle. Delete RN MainActivity. Pure Kotlin/Compose.

### 4.4: Update iOS Build Config (Remove RN)
- **Priority:** 1 (High)
- **Dependencies:** 4.2
- **Description:** Remove RN pods from Podfile. Delete AppDelegate RN bridge code. Pure Swift/SwiftUI.

### 4.5: Update CI/CD for Native Builds
- **Priority:** 1 (High)
- **Dependencies:** 4.3, 4.4
- **Description:** Remove Node.js/Expo steps. Add Gradle (Android) and xcodebuild (iOS). Configure app store uploads.

### 4.6: Final Testing of Native Apps
- **Priority:** 1 (High)
- **Dependencies:** 4.3, 4.4, 4.5
- **Description:** E2E testing on all platforms. Feature parity verification. Performance testing. Beta testing.

---

## Summary Statistics

**Total Features:** 35
- Phase 1 (Rust SDK): 7 features
- Phase 2 (Android): 11 features
- Phase 3 (iOS/tvOS): 11 features
- Phase 4 (Cleanup): 6 features

**Priority Breakdown:**
- Priority 1 (High): 24 features
- Priority 2 (Medium): 11 features

**Estimated Timeline:**
- Phase 1: 2-3 weeks
- Phase 2: 4-6 weeks
- Phase 3: 4-6 weeks
- Phase 4: 1 week
- **Total: 11-16 weeks** (2.5-4 months)

---

## Key Technologies

### Rust SDK (nuvio-core)
- UniFFI 0.30.0 (FFI bindings)
- Reqwest 0.12 (HTTP)
- Tokio 1.36 (async runtime)
- Serde 1.0 (serialization)
- OAuth2 4.4 (authentication)

### Android
- Kotlin with Jetpack Compose
- Hilt (Dependency Injection)
- ExoPlayer (video playback)
- Material 3 (UI design)
- Gradle (build system)

### iOS/tvOS
- Swift with SwiftUI
- Combine/async-await
- AVPlayer (video playback)
- Swift Package Manager or CocoaPods
- Xcode (build system)

---

## Migration Strategy

**Incremental Approach:** Keep React Native working while building native apps. Switch when ready. Safer but larger codebase temporarily.

**Platform Priority:** Android first (already has partial implementation), then iOS/tvOS.

**Rust Scope:** Migrate all 28 TypeScript services to Rust for unified business logic across platforms.

---

## Feature Files Location

All features are stored in:
```
.automaker/features/migration-phase{1-4}-*/feature.json
```

Use Automaker to work through features in dependency order.

---

**Generated:** 2026-01-18
**Status:** Ready to begin Phase 1
