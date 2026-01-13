# Migration Roadmap: React Native to Tri-Layer Native Architecture

**Document Version:** 1.0
**Date:** 2026-01-13
**Status:** Active Planning
**Project:** NuvioStreamingTV Architecture Migration

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Migration Overview](#migration-overview)
3. [Phase 1: Foundation & Proof-of-Concept](#phase-1-foundation--proof-of-concept)
4. [Phase 2: Core Business Logic](#phase-2-core-business-logic)
5. [Phase 3: Native UI Framework](#phase-3-native-ui-framework)
6. [Phase 4: Advanced Features](#phase-4-advanced-features)
7. [Phase 5: Rollout & Deprecation](#phase-5-rollout--deprecation)
8. [Timeline & Resources](#timeline--resources)
9. [Risk Management](#risk-management)
10. [Success Metrics](#success-metrics)
11. [Dependencies & Constraints](#dependencies--constraints)
12. [References](#references)

---

## Executive Summary

### Migration Goal

Transform the NuvioStreamingTV application from a React Native JavaScript/TypeScript codebase to a tri-layer native architecture:

```
┌─────────────────────────────────────────────────────────┐
│           KOTLIN (Android/TV) + SWIFT (iOS/tvOS)        │
│                    Native UI Layers                      │
└────────────────────────┬────────────────────────────────┘
                         │ FFI (UniFFI)
┌────────────────────────▼────────────────────────────────┐
│                    RUST SDK CORE                         │
│               Platform-Agnostic Business Logic           │
└──────────────────────────────────────────────────────────┘
```

### Strategic Approach

**5-Phase Incremental Migration** with parallel operation of React Native and native architectures, feature flags for progressive rollout, and per-phase rollback capabilities.

### Key Outcomes

- **Performance:** 2-5x improvement across app startup, screen rendering, and data operations
- **Memory:** 30-40% reduction in memory footprint
- **Battery:** 10-15% improvement in battery efficiency
- **Bundle Size:** 50-60% reduction in app bundle size
- **Maintainability:** Unified business logic in Rust, platform-native UI patterns
- **Developer Experience:** Type-safe FFI boundaries, clear layer separation

### Timeline

**Total Duration:** 12 months (48 weeks)
- Phase 1: Weeks 1-8 (2 months)
- Phase 2: Weeks 9-20 (3 months)
- Phase 3: Weeks 21-32 (3 months)
- Phase 4: Weeks 33-40 (2 months)
- Phase 5: Weeks 41-48 (2 months)

### Resource Requirements

- **Rust Engineers:** 2-3 FTE
- **Android/Kotlin Engineers:** 2 FTE
- **iOS/Swift Engineers:** 2 FTE
- **DevOps/Build Engineer:** 1 FTE
- **QA Engineers:** 2 FTE
- **Total Team:** 9-10 FTE

---

## Migration Overview

### Current State

**Technology Stack:**
- **Framework:** React Native 0.81.4 with Expo 54
- **Language:** TypeScript/JavaScript
- **UI:** React Navigation, React Native Paper, 170+ components
- **State:** React Context API (15 providers)
- **Storage:** MMKV (150+ keys)
- **Dependencies:** 83 production packages, 25+ native modules

**Architecture Challenges:**
- JavaScript performance ceiling for data-intensive operations
- Bridge overhead for native module communication
- Complex state synchronization across React Context providers
- Duplicated business logic across platforms (TV vs mobile)
- Maintenance burden of React Native ecosystem

### Target State

**Technology Stack:**
- **Business Logic:** Rust SDK (nuvio-core) with platform abstraction traits
- **Android UI:** Kotlin, Jetpack Compose, Material 3, ExoPlayer, Android TV Leanback
- **iOS UI:** Swift, SwiftUI/UIKit, AVPlayer, tvOS focus engine
- **FFI Binding:** UniFFI for automated Kotlin/Swift binding generation
- **Build System:** Cargo (Rust), Gradle (Android), Xcode (iOS)

**Architecture Benefits:**
- Single source of truth for business logic (Rust SDK)
- Native performance and platform conventions
- Clear layer boundaries with type-safe FFI
- Improved testability and maintainability
- Better TV platform support with native focus management

### Migration Principles

1. **Incremental Progress:** Ship working code every 2-4 weeks, not big-bang migration
2. **Zero Downtime:** Existing users continue using app during migration
3. **Feature Parity:** New architecture matches 100% of React Native functionality before cutover
4. **Parallel Operation:** React Native and native code coexist during transition (Phases 2-4)
5. **Progressive Rollout:** A/B testing with gradual user rollout (10% → 50% → 100%)
6. **Rollback Safety:** Each phase independently reversible via feature flags
7. **Risk Mitigation:** Validate critical assumptions early (FFI performance in Phase 1)
8. **Continuous Delivery:** Maintain feature development velocity throughout migration

---

## Phase 1: Foundation & Proof-of-Concept

**Duration:** 8 weeks (Months 1-2)
**Team Focus:** Rust SDK infrastructure, build toolchain, low-risk module validation

### Goal

Validate FFI technical feasibility, establish build tooling, and migrate a low-risk module end-to-end to prove the tri-layer architecture works.

### Scope

#### 1.1 Rust SDK Infrastructure (Weeks 1-3)

**Deliverables:**
- [ ] Cargo workspace structure (`nuvio-core`, `nuvio-ffi`)
- [ ] UniFFI configuration for Kotlin/Swift binding generation
- [ ] Platform abstraction traits (StorageProvider, HttpClient, Logger, TimeProvider)
- [ ] Error handling framework (`NuvioError` enum with FFI-safe representation)
- [ ] Async runtime setup (Tokio with multi-threaded scheduler)
- [ ] Unit test framework with mocking (mockall crate)
- [ ] Logging infrastructure (tracing crate)
- [ ] Serialization/deserialization patterns (serde)

**Key Files:**
```
rust-sdk/
├── Cargo.toml               # Workspace definition
├── nuvio-core/
│   ├── Cargo.toml          # Core library dependencies
│   ├── src/
│   │   ├── lib.rs          # Library entry point
│   │   ├── error.rs        # NuvioError enum
│   │   ├── traits/         # Platform abstraction traits
│   │   └── ffi.rs          # FFI entry points
│   └── nuvio.udl           # UniFFI interface definition
└── build.rs                # Build script for UniFFI
```

**Complexity:** MEDIUM - Foundation work with many moving parts
**Estimated Effort:** 3 weeks (2 Rust engineers)

#### 1.2 Build Toolchain Setup (Weeks 2-4)

**Deliverables:**
- [ ] Install rustup with all target architectures:
  - Android: `aarch64-linux-android`, `armv7-linux-androideabi`, `x86_64-linux-android`, `i686-linux-android`
  - iOS: `aarch64-apple-ios`, `aarch64-apple-ios-sim`, `x86_64-apple-ios`
  - tvOS: `aarch64-apple-tvos`, `aarch64-apple-tvos-sim`
- [ ] Configure cargo-ndk for Android multi-arch builds
- [ ] Create Gradle task to compile Rust before Android build
- [ ] Create Xcode build phase script to compile Rust before iOS/tvOS build
- [ ] Set up CI/CD (GitHub Actions) for cross-compilation
- [ ] Automated uniffi_bindgen integration in build pipeline
- [ ] Code signing configuration for iOS/tvOS

**Build Scripts:**

Android (Gradle):
```gradle
// android/app/build.gradle
task buildRustLib(type: Exec) {
    workingDir '../../rust-sdk'
    commandLine 'cargo', 'ndk',
        '-t', 'armeabi-v7a',
        '-t', 'arm64-v8a',
        '-t', 'x86',
        '-t', 'x86_64',
        'build', '--release'
}

preBuild.dependsOn buildRustLib
```

iOS (Xcode Build Phase):
```bash
#!/bin/bash
cd "${SRCROOT}/../../rust-sdk"
cargo build --target aarch64-apple-ios --release
cargo build --target x86_64-apple-ios --release
lipo -create \
    target/aarch64-apple-ios/release/libnuvio.a \
    target/x86_64-apple-ios/release/libnuvio.a \
    -output "${BUILT_PRODUCTS_DIR}/libnuvio.a"
```

**Complexity:** HIGH - Multi-platform build complexity
**Estimated Effort:** 3 weeks (1 Rust + 1 DevOps engineer)

#### 1.3 Low-Risk Module Migration: Settings (Weeks 4-7)

**Deliverables:**

**Rust Implementation:**
- [ ] Settings module in Rust (`rust-sdk/nuvio-core/src/core/settings.rs`)
  - Theme settings (dark mode, accent color)
  - Playback preferences (autoplay, quality, speed)
  - Subtitle defaults (language, size, color)
  - Parental controls (rating limits, PIN)
  - Download settings (quality, storage location)
- [ ] FFI boundary definitions in `.udl` file
- [ ] Unit tests with 80%+ coverage
- [ ] Integration tests for FFI boundary

**Kotlin Wrapper:**
- [ ] `SettingsRepository.kt` wrapping Rust FFI calls
- [ ] ViewModel (`SettingsViewModel.kt`) with StateFlow
- [ ] Repository pattern implementation

**Swift Wrapper:**
- [ ] `SettingsRepository.swift` wrapping Rust FFI calls
- [ ] ViewModel (`SettingsViewModel.swift`) with @Published
- [ ] ObservableObject conformance

**Complexity:** MEDIUM - Full end-to-end integration
**Estimated Effort:** 4 weeks (2 Rust + 1 Kotlin + 1 Swift engineer)

#### 1.4 Basic UI Scaffolding (Weeks 6-8)

**Deliverables:**

**Android:**
- [ ] Kotlin project structure (`android-app/mobile`, `android-app/tv`)
- [ ] Jetpack Compose setup with Material 3 theme
- [ ] Basic Settings screen in Compose
- [ ] Hilt dependency injection setup
- [ ] Navigation scaffold

**iOS:**
- [ ] Swift project structure (`ios-app/Mobile`, `ios-app/TV`)
- [ ] SwiftUI setup with custom theme
- [ ] Basic Settings screen in SwiftUI
- [ ] SwiftUI dependency injection
- [ ] Navigation scaffold

**Complexity:** MEDIUM - Initial project setup
**Estimated Effort:** 3 weeks (1 Kotlin + 1 Swift engineer)

### Success Criteria

**Performance Targets:**

| Metric | React Native Baseline | Phase 1 Target | Measurement |
|--------|----------------------|----------------|-------------|
| Settings read (cold) | 15ms | <5ms (3x faster) | FFI benchmark |
| Settings write | 20ms | <7ms (3x faster) | FFI benchmark |
| Memory overhead | 2MB (TS + MMKV) | <1MB (Rust) | Memory profiler |
| FFI call latency | N/A | <1ms avg | 1000 call benchmark |

**Validation Checklist:**
- ✅ Rust Settings module achieves 2-3x faster read/write vs TypeScript MMKV
- ✅ FFI call overhead <1ms (measured via performance benchmarks)
- ✅ Zero memory leaks detected (Valgrind on Rust, LeakCanary on Android, Instruments on iOS)
- ✅ Settings screen functional in Kotlin and Swift apps
- ✅ Build pipeline compiles Rust for all 7 targets without errors
- ✅ 80%+ unit test coverage for Rust Settings module
- ✅ FFI integration tests pass on Android and iOS
- ✅ UniFFI bindings generate correctly for both platforms
- ✅ No panics across FFI boundary (all errors handled gracefully)

### Dependencies

**Upstream (None - Phase 1 is the foundation)**

**Downstream (Blocking for):**
- Phase 2: Core Business Logic
- Phase 3: Native UI Framework

### Rollback Plan

**Trigger Conditions:**
- FFI performance <1.5x speedup vs TypeScript
- Memory leak >10MB/hour detected
- Build pipeline unreliable (>50% failure rate)
- Unresolvable UniFFI binding issues

**Rollback Actions:**
1. Disable `rust_settings` feature flag in `Cargo.toml`
2. Settings revert to TypeScript `SettingsService`
3. Remove Rust library integration from Gradle/Xcode
4. Redeploy React Native app without Rust SDK

**Impact:** Settings functionality unchanged for users
**Timeline:** <4 hours (rebuild and redeploy to staging)

### Complexity Estimate

**Overall Complexity:** HIGH
**Risk Level:** MEDIUM - Foundation work with unknowns
**Confidence:** 70% - Novel technology stack integration

**Breakdown:**
- Rust SDK Setup: MEDIUM (well-documented patterns)
- Build Toolchain: HIGH (multi-platform complexity)
- UniFFI Integration: MEDIUM (good documentation, some edge cases)
- Settings Module: LOW (simple business logic)
- UI Scaffolding: MEDIUM (new frameworks for team)

---

## Phase 2: Core Business Logic

**Duration:** 12 weeks (Months 3-5)
**Team Focus:** Migrate platform-agnostic business logic to Rust, integrate into React Native via FFI

### Goal

Migrate core business logic modules to Rust SDK and integrate into existing React Native app via FFI, demonstrating performance improvements while maintaining 100% feature parity.

### Scope

#### 2.1 Account & Profile Module (Weeks 9-11)

**Deliverables:**

**Rust Implementation:**
- [ ] Account authentication (local mode, no remote auth yet)
- [ ] Profile management (create, switch, delete, PIN validation)
- [ ] Session state management (current user, current profile)
- [ ] Storage integration via StorageProvider trait
- [ ] Profile limits enforcement (max 5 profiles)
- [ ] Avatar management
- [ ] Last selected profile persistence

**FFI Interface (`.udl`):**
```udl
interface AccountManager {
    constructor(StorageProvider storage);

    [Throws=NuvioError]
    Account? get_current_account();

    [Throws=NuvioError]
    void set_current_account(Account account);
};

interface ProfileManager {
    constructor(StorageProvider storage);

    [Throws=NuvioError]
    sequence<Profile> list_profiles();

    [Throws=NuvioError]
    Profile create_profile(string name, string? avatar);

    [Throws=NuvioError]
    void delete_profile(string profile_id);

    [Throws=NuvioError]
    Profile? get_current_profile();

    [Throws=NuvioError]
    void switch_profile(string profile_id);

    [Throws=NuvioError]
    boolean validate_pin(string profile_id, string pin);
};
```

**React Native Integration:**
- [ ] Create `RustAccountService` wrapper calling NativeModules
- [ ] Feature flag: `USE_RUST_ACCOUNT` (Firebase Remote Config)
- [ ] Fallback to TypeScript `AccountService` when flag disabled
- [ ] State migration from React Context to Rust SDK

**Complexity:** MEDIUM
**Estimated Effort:** 3 weeks (2 Rust + 1 RN engineer)

#### 2.2 Catalog & Library Module (Weeks 12-15)

**Deliverables:**

**Rust Implementation:**
- [ ] Catalog loading from Stremio addons
- [ ] Catalog filtering (genre, rating, year, type)
- [ ] Catalog sorting (popularity, rating, release date)
- [ ] Deduplication logic
- [ ] Library management (add to library, remove, organize)
- [ ] Continue watching list
- [ ] Recently added tracking
- [ ] Cache management (7-day TTL, LRU eviction)
- [ ] Pagination support

**API Integration:**
- [ ] Stremio addon protocol implementation
- [ ] Parallel addon queries with timeout
- [ ] Error handling and retry logic
- [ ] Response normalization

**React Native Integration:**
- [ ] `RustCatalogService` wrapper
- [ ] Feature flag: `USE_RUST_CATALOG`
- [ ] Progress indicators for long operations
- [ ] Optimistic updates for library operations

**Complexity:** HIGH
**Estimated Effort:** 4 weeks (3 Rust + 1 RN engineer)

#### 2.3 Metadata Enrichment Module (Weeks 16-18)

**Deliverables:**

**Rust Implementation:**
- [ ] TMDB API client (search, movie/show details, credits, images, seasons, episodes)
- [ ] Trakt API client (watchlist, watched history, ratings, collections)
- [ ] MDBList API client (aggregated ratings from multiple sources)
- [ ] Metadata merging algorithm (combine data from 3 sources)
- [ ] Rate limiting (40 req/10s for TMDB)
- [ ] Request retry with exponential backoff
- [ ] Response caching (7-day TTL for TMDB, 1-day for Trakt)
- [ ] Image URL resolution
- [ ] Parallel API requests with tokio::try_join!

**React Native Integration:**
- [ ] `RustMetadataService` wrapper
- [ ] Feature flag: `USE_RUST_METADATA`
- [ ] Cache warming on app startup
- [ ] Background refresh for stale data

**Complexity:** MEDIUM-HIGH
**Estimated Effort:** 3 weeks (2 Rust + 1 RN engineer)

#### 2.4 Stream Resolution Module (Weeks 19-20)

**Deliverables:**

**Rust Implementation:**
- [ ] Query Stremio addons for streams
- [ ] Filter by quality (4K, 1080p, 720p, etc.)
- [ ] Filter by seeders/availability
- [ ] Debrid service integration (Real-Debrid, Premiumize API clients)
- [ ] Stream ranking algorithm (quality + seeds + debrid availability)
- [ ] Subtitle stream extraction
- [ ] Stream deduplication
- [ ] Timeout handling for slow addons

**React Native Integration:**
- [ ] `RustStreamService` wrapper
- [ ] Feature flag: `USE_RUST_STREAM`
- [ ] Loading states with cancel support
- [ ] Stream preview/info display

**Complexity:** MEDIUM
**Estimated Effort:** 2 weeks (2 Rust + 1 RN engineer)

### Success Criteria

**Performance Targets:**

| Operation | React Native Baseline | Phase 2 Target | Improvement |
|-----------|----------------------|----------------|-------------|
| App startup (cold) | 3-5s | 1.5-2s | 2-3x faster |
| Profile switch | 800-1200ms | 150-250ms | 4-5x faster |
| Catalog load (cold) | 2-3s | 350-500ms | 5-6x faster |
| Catalog load (cache) | 200ms | 50ms | 4x faster |
| Metadata fetch (TMDB) | 800ms | 100ms | 8x faster |
| Stream resolution | 1.5-2s | 400-600ms | 3-4x faster |
| Memory usage | 150-250MB | 100-160MB | 30-40% reduction |

**Validation Checklist:**
- ✅ Account operations (login, profile switch) 4-5x faster than TypeScript
- ✅ Catalog load (cold cache) 5-6x faster than TypeScript
- ✅ Metadata enrichment 8-10x faster (parallel HTTP requests in Rust)
- ✅ Stream resolution 3-4x faster than TypeScript
- ✅ React Native app functions identically with Rust SDK vs TypeScript services
- ✅ FFI call count <10 per user interaction (batching applied)
- ✅ 80%+ unit test coverage for all Rust modules
- ✅ Integration tests validate FFI contracts
- ✅ Feature flags enable/disable modules reliably
- ✅ No regression in app functionality

### Dependencies

**Upstream (Requires):**
- Phase 1: Rust SDK infrastructure and build toolchain

**Downstream (Blocking for):**
- Phase 3: Native UI Framework (needs Rust SDK APIs)
- Phase 4: Advanced Features (builds on core modules)

### Rollback Plan

**Trigger Conditions:**
- Crash rate >1% (vs React Native baseline <0.5%)
- Data corruption in Rust-managed state
- Performance regression >20% vs React Native
- Critical bugs (P0/P1) affecting core functionality

**Rollback Actions:**
1. Flip runtime feature flags via Firebase Remote Config:
   ```
   USE_RUST_ACCOUNT: false
   USE_RUST_CATALOG: false
   USE_RUST_METADATA: false
   USE_RUST_STREAM: false
   ```
2. React Native immediately reverts to TypeScript services
3. Monitor for restoration of baseline metrics
4. Investigate root cause offline

**Impact:** Users experience React Native performance/behavior (no data loss)
**Timeline:** <15 minutes (remote config propagation)

### Complexity Estimate

**Overall Complexity:** HIGH
**Risk Level:** MEDIUM-HIGH - Core functionality migration
**Confidence:** 75% - Well-defined scope, some API integration unknowns

**Breakdown:**
- Account & Profile: MEDIUM (straightforward business logic)
- Catalog & Library: HIGH (complex filtering, caching, deduplication)
- Metadata Enrichment: HIGH (3 APIs, merging logic, rate limiting)
- Stream Resolution: MEDIUM-HIGH (addon protocol, ranking algorithm)
- React Native Integration: MEDIUM (feature flags, fallback logic)

---

## Phase 3: Native UI Framework

**Duration:** 12 weeks (Months 6-8)
**Team Focus:** Build native UI layers in Kotlin/Swift, migrate high-traffic screens, A/B test with users

### Goal

Build native UI layers using Jetpack Compose (Android) and SwiftUI (iOS), migrate 3-5 core screens, and progressively roll out to users via A/B testing to validate performance and UX improvements.

### Scope

#### 3.1 Native UI Foundation - Android (Weeks 21-24)

**Deliverables:**

**Jetpack Compose Setup:**
- [ ] Material 3 design system implementation
- [ ] Custom theme (colors, typography, shapes from Figma tokens)
- [ ] Reusable component library (Button, Card, Text, Image, etc.)
- [ ] Dark/light theme support
- [ ] TV-specific components (Focusable wrappers)

**Navigation:**
- [ ] Jetpack Compose Navigation setup
- [ ] Deep link handling
- [ ] Back stack management
- [ ] Android TV navigation (D-pad support)

**Video Player Integration:**
- [ ] ExoPlayer wrapper (`VideoPlayerManager.kt`)
- [ ] Custom controls UI in Compose
- [ ] Subtitle rendering
- [ ] Picture-in-Picture support
- [ ] Background audio playback

**TV Focus Management:**
- [ ] FocusRequester integration
- [ ] D-pad navigation handling
- [ ] Focus indicators (scale, border, shadow)
- [ ] Spatial navigation (up/down/left/right)
- [ ] Focus memory (restore focus after screen return)

**State Management:**
- [ ] ViewModel architecture
- [ ] StateFlow for UI state
- [ ] Repository pattern for Rust SDK access
- [ ] Hilt dependency injection

**Complexity:** HIGH
**Estimated Effort:** 4 weeks (2 Kotlin engineers)

#### 3.2 Native UI Foundation - iOS (Weeks 21-24)

**Deliverables:**

**SwiftUI Setup:**
- [ ] Custom design system (colors, fonts, spacing)
- [ ] Reusable component library (Button, Card, Text, AsyncImage, etc.)
- [ ] Dark/light mode support
- [ ] tvOS-specific components (focus wrappers)

**Navigation:**
- [ ] NavigationStack setup (iOS 16+)
- [ ] Deep link handling
- [ ] Programmatic navigation
- [ ] tvOS navigation (focus engine integration)

**Video Player Integration:**
- [ ] AVPlayer wrapper (`AVPlayerManager.swift`)
- [ ] Custom controls UI in SwiftUI
- [ ] Subtitle rendering
- [ ] Picture-in-Picture support
- [ ] Background audio playback

**tvOS Focus Management:**
- [ ] @FocusState integration
- [ ] Focus engine customization
- [ ] Focus indicators (scale, shadow)
- [ ] UIFocusGuide for complex layouts
- [ ] Focus debugging

**State Management:**
- [ ] ObservableObject ViewModels
- [ ] @Published properties
- [ ] Repository pattern for Rust SDK access
- [ ] Dependency injection via @EnvironmentObject

**Complexity:** HIGH
**Estimated Effort:** 4 weeks (2 Swift engineers)

#### 3.3 Core Screen Migration (Weeks 25-32)

**Screens to Migrate:**

**1. Home Screen (Weeks 25-27)**

Features:
- Continue watching section (horizontal scroll)
- Recommended content (grid)
- Recent library additions
- Quick actions (search, settings)
- Platform-specific layouts:
  - TV: 6-column grid, large focus indicators
  - Mobile: 3-column grid, compact layout

**Rust SDK Integration:**
- Fetch continue watching from WatchProgressTracker
- Fetch recommendations from CatalogManager
- Real-time updates via callbacks

**Complexity:** HIGH
**Estimated Effort:** 3 weeks (1 Kotlin + 1 Swift + 1 Rust engineer)

**2. Catalog Screen (Weeks 27-29)**

Features:
- Grid of catalog items
- Filter controls (genre, rating, year)
- Sort controls (popularity, rating, date)
- Infinite scroll/pagination
- Platform-specific:
  - TV: Focusable grid, D-pad navigation
  - Mobile: ScrollView with pull-to-refresh

**Rust SDK Integration:**
- CatalogManager.get_catalog() with filters
- Pagination support
- Cache warming

**Complexity:** MEDIUM-HIGH
**Estimated Effort:** 2 weeks (1 Kotlin + 1 Swift engineer)

**3. Metadata/Details Screen (Weeks 29-31)**

Features:
- Poster, backdrop images
- Title, rating, description
- Cast & crew list
- Season/episode selector (for TV shows)
- Stream sources list
- Action buttons (play, add to library, share)
- Platform-specific:
  - TV: 10-foot UI, large text, high contrast
  - Mobile: Compact layout, scrollable content

**Rust SDK Integration:**
- MetadataEnricher.enrich_show()/enrich_movie()
- StreamResolver.resolve_streams()
- Library operations (add/remove)

**Complexity:** HIGH
**Estimated Effort:** 3 weeks (1 Kotlin + 1 Swift + 1 Rust engineer)

#### 3.4 A/B Testing & Rollout (Weeks 30-32)

**Rollout Schedule:**

**Week 30 (Internal Testing):**
- Native screens at 0% (internal dogfooding only)
- QA team validates feature parity
- Fix critical bugs before user rollout
- Performance benchmarking

**Week 31 (10% Rollout):**
- Enable native Home screen for 10% of users via Firebase Remote Config:
  ```typescript
  remoteConfig.set('native_home_screen_rollout', 10);
  remoteConfig.set('native_home_screen', true);
  ```
- Monitor metrics:
  - Crash-free rate (target: ≥99.5%)
  - Screen load time (target: <500ms)
  - User engagement (session duration, clicks)
  - Error rates
- Collect user feedback

**Week 32 (50% Rollout):**
- Expand to 50% if metrics positive
- Add Catalog and Metadata screens at 10%
- Monitor performance and stability
- Iterate on UI polish

**Post-Phase 3 (100% Rollout in Phase 5):**
- Full rollout to all users
- Native screens become default
- React Native screens deprecated

**Complexity:** MEDIUM
**Estimated Effort:** 3 weeks (1 Kotlin + 1 Swift + 1 DevOps + 2 QA engineers)

### Success Criteria

**Performance Targets:**

| Metric | React Native | Native (Kotlin/Swift) | Improvement |
|--------|--------------|----------------------|-------------|
| Home screen render | 800-1200ms | 300-500ms | 2-3x faster |
| Catalog scroll (60fps) | Drops to 45fps | Solid 60fps | Smoother |
| Metadata screen render | 600-900ms | 200-400ms | 2-3x faster |
| TV focus latency | 50-100ms | <16ms | 3-6x faster |
| Memory (per screen) | 40-60MB | 20-30MB | 40-50% reduction |

**Validation Checklist:**
- ✅ 3 core screens (Home, Catalog, Metadata) functional in Kotlin and Swift
- ✅ 100% feature parity with React Native screens
- ✅ Screen load time <500ms (vs React Native 800-1200ms)
- ✅ Crash-free rate ≥99.5% in A/B test
- ✅ User engagement metrics neutral or positive vs React Native
- ✅ TV focus navigation smooth (<16ms per frame, 60fps)
- ✅ Design QA passes (visual parity with Figma)
- ✅ Accessibility features functional (TalkBack, VoiceOver)
- ✅ Deep links work correctly
- ✅ Transition animations polished

### Dependencies

**Upstream (Requires):**
- Phase 1: Rust SDK infrastructure
- Phase 2: Core business logic modules (Account, Catalog, Metadata)

**Downstream (Blocking for):**
- Phase 4: Advanced features (builds on native UI patterns)
- Phase 5: Remaining screen migrations

### Rollback Plan

**Trigger Conditions:**
- Crash rate >1% on native screens
- User feedback indicates major UX regression
- Critical functional bug (e.g., can't play videos, can't add to library)
- Performance regression >20% vs React Native

**Rollback Actions:**
1. Disable native screen routing flags via Firebase Remote Config:
   ```typescript
   remoteConfig.set('native_home_screen', false);
   remoteConfig.set('native_catalog_screen', false);
   remoteConfig.set('native_metadata_screen', false);
   ```
2. Users immediately revert to React Native screens
3. Monitor for restoration of baseline metrics
4. **Partial Rollback Support:** Can disable individual screens independently (e.g., keep Home native, rollback Catalog)

**Impact:** Users see React Native screens (familiar UX, no data loss)
**Timeline:** <15 minutes (remote config propagation)

### Complexity Estimate

**Overall Complexity:** VERY HIGH
**Risk Level:** HIGH - Major user-facing changes
**Confidence:** 65% - New frameworks, UX unknowns

**Breakdown:**
- Jetpack Compose Setup: HIGH (new for team)
- SwiftUI Setup: HIGH (new for team)
- TV Focus Management: VERY HIGH (complex, platform-specific)
- Screen Migration: HIGH (3 complex screens)
- A/B Testing: MEDIUM (infrastructure setup)
- Rollback: LOW (feature flags proven in Phase 2)

---

## Phase 4: Advanced Features

**Duration:** 8 weeks (Months 9-10)
**Team Focus:** Migrate complex, high-risk features to Rust + native UI

### Goal

Migrate advanced features (downloads, watch progress, video playback, Trakt sync) to Rust SDK + native UI, achieving performance improvements and feature parity with React Native.

### Scope

#### 4.1 Download Management Module (Weeks 33-35)

**Deliverables:**

**Rust Implementation:**
- [ ] Download state machine (Queued → Downloading → Paused → Completed → Failed)
- [ ] File download with progress tracking (bytes downloaded, speed, ETA)
- [ ] Pause/resume/cancel operations
- [ ] Concurrent download limit (3 active downloads)
- [ ] Download queue management
- [ ] Storage management (check available space before download)
- [ ] File integrity validation (checksum verification)
- [ ] Download metadata storage (SQLite or sled)
- [ ] Platform file system abstraction (via traits)

**FFI Interface:**
```udl
enum DownloadState {
    "Queued",
    "Downloading",
    "Paused",
    "Completed",
    "Failed",
};

dictionary Download {
    string id;
    string title;
    string url;
    DownloadState state;
    u64 bytes_downloaded;
    u64 bytes_total;
    f32 progress_percent;
    u64 speed_bytes_per_sec;
    u64 eta_seconds;
};

[Trait, WithForeign]
interface DownloadProgressObserver {
    void on_progress_updated(Download download);
    void on_state_changed(Download download);
};

interface DownloadManager {
    constructor();

    [Throws=NuvioError]
    string start_download(string title, string url);

    [Throws=NuvioError]
    void pause_download(string download_id);

    [Throws=NuvioError]
    void resume_download(string download_id);

    [Throws=NuvioError]
    void cancel_download(string download_id);

    [Throws=NuvioError]
    sequence<Download> list_downloads();

    void set_observer(DownloadProgressObserver observer);
};
```

**Native Integration:**
- [ ] Android: Background Service for downloads, Notification with progress
- [ ] iOS: URLSession background downloads, NotificationCenter updates
- [ ] Downloads screen UI (list, controls, progress bars)
- [ ] Storage usage indicator

**Complexity:** HIGH
**Estimated Effort:** 3 weeks (2 Rust + 1 Kotlin + 1 Swift engineer)

#### 4.2 Watch Progress Tracking Module (Weeks 34-36)

**Deliverables:**

**Rust Implementation:**
- [ ] Session tracking (start, pause, resume, stop)
- [ ] Progress calculation (current position, duration, percentage)
- [ ] Continue watching list (sort by last watched)
- [ ] Trakt scrobble integration (auto-scrobble at 80% watched)
- [ ] Multi-device sync (conflict resolution: last-write-wins)
- [ ] Watch history storage
- [ ] Progress persistence in SQLite/sled

**FFI Interface:**
```udl
dictionary WatchSession {
    string id;
    string content_id;
    u64 position_ms;
    u64 duration_ms;
    f32 progress_percent;
    timestamp last_updated;
};

interface WatchProgressTracker {
    constructor();

    [Throws=NuvioError]
    string start_session(string content_id, u64 duration_ms);

    [Throws=NuvioError]
    void update_progress(string session_id, u64 position_ms);

    [Throws=NuvioError]
    void end_session(string session_id);

    [Throws=NuvioError]
    sequence<WatchSession> get_continue_watching();

    [Throws=NuvioError]
    WatchSession? get_session(string content_id);
};
```

**Native Integration:**
- [ ] Android: ExoPlayer position observer
- [ ] iOS: AVPlayer periodic time observer
- [ ] Continue watching UI updates
- [ ] Auto-resume from last position

**Complexity:** MEDIUM
**Estimated Effort:** 2 weeks (1 Rust + 1 Kotlin + 1 Swift engineer)

#### 4.3 Video Playback Integration (Weeks 35-37)

**Deliverables:**

**Native Video Players:**
- [ ] Android: ExoPlayer full integration (HLS, DASH, subtitles, DRM)
- [ ] iOS: AVPlayer full integration (HLS, FairPlay, subtitles)
- [ ] Custom controls UI (play/pause, seek, volume, quality, subtitles, cast button)
- [ ] Fullscreen mode
- [ ] Picture-in-Picture mode
- [ ] TV remote control integration (Android TV, tvOS)
- [ ] Playback error handling

**Rust SDK Integration:**
- [ ] Stream selection logic
- [ ] Watch progress tracking
- [ ] Error reporting
- [ ] Analytics events (play, pause, seek, complete)

**Complexity:** VERY HIGH
**Estimated Effort:** 3 weeks (2 Kotlin + 2 Swift engineers)

#### 4.4 Trakt Synchronization Module (Weeks 36-38)

**Deliverables:**

**Rust Implementation:**
- [ ] OAuth 2.0 flow (authorization, token exchange, refresh)
- [ ] Watchlist sync (fetch from Trakt, merge with local)
- [ ] Collection sync (movies, shows)
- [ ] Ratings sync (bidirectional)
- [ ] Watch history sync (scrobble on completion)
- [ ] Background sync worker (every 5 minutes)
- [ ] Conflict resolution (last-write-wins)
- [ ] Optimistic updates (update UI immediately, sync in background)
- [ ] Rate limiting (40 req/5min)

**FFI Interface:**
```udl
dictionary TraktAuth {
    string access_token;
    string refresh_token;
    u64 expires_at;
};

interface TraktSyncManager {
    constructor();

    [Throws=NuvioError]
    string start_oauth_flow();

    [Throws=NuvioError]
    TraktAuth complete_oauth(string code);

    [Throws=NuvioError]
    void sync_watchlist();

    [Throws=NuvioError]
    void sync_watched_history();

    [Throws=NuvioError]
    void scrobble(string content_id, f32 progress_percent);

    [Throws=NuvioError]
    void rate_content(string content_id, u8 rating);
};
```

**Native Integration:**
- [ ] Android: Deep link handling for OAuth callback
- [ ] iOS: Universal Links for OAuth callback
- [ ] Sync status UI (last synced, sync in progress)
- [ ] Manual sync trigger

**Complexity:** HIGH
**Estimated Effort:** 3 weeks (2 Rust + 1 Kotlin + 1 Swift engineer)

### Success Criteria

**Performance Targets:**

| Operation | React Native | Native + Rust | Improvement |
|-----------|--------------|---------------|-------------|
| Download start | 500ms | 50ms | 10x faster |
| Download pause/resume | 300ms | 30ms | 10x faster |
| Watch progress update | 100ms | 10ms | 10x faster |
| Video playback start | 300-500ms | 50-100ms | 3-5x faster |
| Trakt sync (100 items) | 5-8s | 1-2s | 4-5x faster |

**Validation Checklist:**
- ✅ Download management 10x faster than TypeScript (state updates in Rust, no JS thread blocking)
- ✅ Watch progress sync latency <200ms (Rust → Trakt API)
- ✅ Trakt OAuth flow works on all platforms (deep linking functional)
- ✅ Video playback start time <100ms (ExoPlayer/AVPlayer direct integration)
- ✅ Zero download corruption (file integrity validated)
- ✅ Crash-free rate ≥99.5%
- ✅ Background downloads continue when app backgrounded (Android Service, iOS URLSession)
- ✅ PiP works correctly on supported devices
- ✅ TV remote controls work (pause, play, seek, volume)

### Dependencies

**Upstream (Requires):**
- Phase 1: Rust SDK infrastructure
- Phase 2: Core business logic (Catalog, Metadata for content info)
- Phase 3: Native UI Framework (Player UI, Downloads UI)

**Downstream (Blocking for):**
- Phase 5: Feature parity completion

### Rollback Plan

**Trigger Conditions:**
- Download corruption or data loss
- Video playback failures (>5% failure rate)
- Trakt sync broken (OAuth issues, data corruption)
- Critical bugs (P0/P1)

**Rollback Actions:**
1. Disable feature flags per module via Firebase Remote Config:
   ```typescript
   USE_RUST_DOWNLOAD: false   // Revert downloads
   USE_RUST_WATCH: false       // Revert watch progress
   USE_RUST_TRAKT: false       // Revert Trakt sync
   native_player_screen: false // Revert to RN video player
   ```
2. Individual features revert to React Native implementation
3. Monitor for restoration of baseline metrics

**Impact:** Specific features revert to React Native behavior (others remain native)
**Timeline:** <15 minutes per feature (remote config)

### Complexity Estimate

**Overall Complexity:** VERY HIGH
**Risk Level:** HIGH - Complex features, high user impact
**Confidence:** 60% - Significant unknowns (OAuth flow, background tasks, video DRM)

**Breakdown:**
- Download Management: HIGH (state machine, background service, storage)
- Watch Progress: MEDIUM (straightforward tracking logic)
- Video Playback: VERY HIGH (platform-specific, many edge cases)
- Trakt Sync: HIGH (OAuth, rate limiting, conflict resolution)

---

## Phase 5: Rollout & Deprecation

**Duration:** 8 weeks (Months 11-12)
**Team Focus:** Complete migration, achieve 100% feature parity, deprecate React Native

### Goal

Migrate all remaining screens, complete 100% feature parity with React Native, progressively roll out to 100% of users, and deprecate React Native codebase.

### Scope

#### 5.1 Remaining Screen Migrations (Weeks 41-44)

**Screens to Migrate:**

**1. Search Screen (Week 41)**
- [ ] Search input with autocomplete
- [ ] Search history
- [ ] Results grid (movies, shows, actors)
- [ ] Filter controls
- [ ] Empty state UI
- Platform-specific: TV voice search integration

**2. Library Screen (Week 42)**
- [ ] User's library grid
- [ ] Filter/sort controls
- [ ] Bulk actions (remove, organize)
- [ ] Empty state UI
- Rust SDK: LibraryManager integration

**3. Profile Management Screen (Week 42)**
- [ ] Profile list
- [ ] Create/edit/delete profile
- [ ] Avatar selection
- [ ] PIN setup
- Rust SDK: ProfileManager integration

**4. Settings Screen (Week 43)**
- [ ] Complete Settings UI (expand Phase 1 PoC)
- [ ] All setting categories (playback, appearance, downloads, account, about)
- [ ] Theme switcher
- [ ] Language selector
- [ ] Cache management
- Rust SDK: SettingsManager integration

**5. Minor Screens (Week 44)**
- [ ] About screen (version, credits, licenses)
- [ ] Help/FAQ screen
- [ ] Legal (privacy policy, terms of service)
- [ ] Chromecast device selector
- [ ] Download quality selector

**Complexity:** MEDIUM
**Estimated Effort:** 4 weeks (2 Kotlin + 2 Swift engineers)

#### 5.2 Edge Cases & Polish (Weeks 45-46)

**Deliverables:**

**Error Handling:**
- [ ] Network error states (no internet, timeout)
- [ ] Empty states (no content, no search results)
- [ ] Error dialogs with retry actions
- [ ] Offline mode messaging

**Accessibility:**
- [ ] TalkBack support (Android) - all screens
- [ ] VoiceOver support (iOS) - all screens
- [ ] Screen reader announcements
- [ ] Focus order optimization
- [ ] Semantic labels
- [ ] Dynamic type/font scaling

**Deep Linking:**
- [ ] All screen deep links working
- [ ] Link handling from notifications
- [ ] Link handling from widgets
- [ ] Shared content intents (Android)
- [ ] Universal Links (iOS)

**Notifications:**
- [ ] Download complete notifications
- [ ] New content notifications
- [ ] Watch reminders
- [ ] Push notification handling
- [ ] Notification actions (play, dismiss)

**Widgets (Optional):**
- [ ] Android widget (continue watching, quick actions)
- [ ] iOS widget (continue watching, new content)

**Complexity:** MEDIUM-HIGH
**Estimated Effort:** 2 weeks (1 Kotlin + 1 Swift + 2 QA engineers)

#### 5.3 User Rollout (Weeks 47-48)

**Rollout Schedule:**

**Week 47 (100% Native Screens):**
- Enable all native screens for 100% of users via Firebase Remote Config:
  ```typescript
  // All screen flags set to true
  native_home_screen: true
  native_catalog_screen: true
  native_metadata_screen: true
  native_search_screen: true
  native_library_screen: true
  native_player_screen: true
  native_settings_screen: true
  // etc.
  ```
- Monitor crash rates, error rates, performance metrics
- Collect user feedback
- Fix critical bugs rapidly

**Week 48 (React Native Deprecation):**
- Validate 100% feature parity achieved
- Confirm crash-free rate ≥99.5%
- Confirm performance targets met
- Get stakeholder approval for React Native removal

#### 5.4 React Native Deprecation (Week 48)

**Deprecation Checklist:**

**Code Removal:**
- [ ] Remove React Native dependency from `package.json`
- [ ] Remove all `@react-navigation/*` packages
- [ ] Remove all Expo packages
- [ ] Remove React Native community packages
- [ ] Remove UI component libraries (Paper, Reanimated, etc.)
- [ ] Archive `react-native-app/` code to `archive/react-native-legacy/`

**Build System:**
- [ ] Remove Metro bundler from CI/CD
- [ ] Remove JavaScript bundling step
- [ ] Remove Babel configuration
- [ ] Update build pipeline to only build Kotlin/Swift apps
- [ ] Simplify CI/CD workflows (no more dual builds)

**Documentation:**
- [ ] Update README with new architecture
- [ ] Update developer onboarding guide
- [ ] Document Rust SDK usage
- [ ] Document FFI integration patterns
- [ ] Archive React Native documentation

**App Store:**
- [ ] Update app descriptions (remove "React Native")
- [ ] Update screenshots if needed
- [ ] Submit final native builds to stores
- [ ] Monitor app review process

**Complexity:** LOW
**Estimated Effort:** 1 week (1 engineer)

### Success Criteria

**Final Performance Targets:**

| Metric | React Native Baseline | Native (Final) | Improvement |
|--------|----------------------|----------------|-------------|
| App startup (cold) | 3-5s | 1-2s | 2-3x faster |
| Screen transitions | 300-500ms | 100-200ms | 2-3x faster |
| Memory usage | 150-250MB | 100-160MB | 30-40% reduction |
| APK/IPA size | 80-100MB | 60-75MB | 20-30% smaller |
| Battery drain | Baseline | 10-15% improvement | User testing |
| Crash-free rate | 99.3% | ≥99.5% | More stable |
| Frame rate (60fps) | 85-90% | 95-98% | Smoother |

**Validation Checklist:**
- ✅ 100% feature parity with React Native app
- ✅ All 50+ screens migrated to native
- ✅ Crash-free rate ≥99.5% across all platforms
- ✅ Performance targets met (see table above)
- ✅ Zero critical bugs (P0/P1) outstanding
- ✅ React Native codebase fully deprecated
- ✅ All dependencies removed from package.json
- ✅ Build pipeline simplified (no Metro bundler)
- ✅ Documentation updated
- ✅ Team trained on new architecture

### Dependencies

**Upstream (Requires):**
- Phase 1-4: All previous phases completed

**Downstream (Blocking for):**
- None - Migration complete!

### Rollback Plan (Emergency Only)

**Trigger Conditions (Extremely Rare):**
- Critical production incident requiring React Native
- Unrecoverable data loss
- App store rejection (platform policy violation)
- Showstopper bug discovered post-launch

**Rollback Actions:**
1. Retrieve previous React Native build from artifact storage
2. Submit to app stores as emergency hotfix
3. Disable all native feature flags
4. Redeploy React Native app to all users
5. Conduct incident postmortem
6. Plan remediation strategy

**Impact:** Complete revert to React Native (lose all migration progress)
**Timeline:** ~2-4 hours (build + app store submission + review)
**Approval:** Requires CEO + CTO sign-off + incident postmortem

**Note:** This should be **extremely rare** - Phase 1-4 rollbacks should catch issues before this point.

### Complexity Estimate

**Overall Complexity:** MEDIUM-HIGH
**Risk Level:** MEDIUM - Remaining work is lower risk
**Confidence:** 80% - Most patterns established in previous phases

**Breakdown:**
- Remaining Screens: MEDIUM (patterns established)
- Edge Cases & Polish: MEDIUM-HIGH (accessibility, testing)
- User Rollout: LOW (proven in Phase 3)
- React Native Deprecation: LOW (straightforward cleanup)

---

## Timeline & Resources

### Gantt Chart Overview

```
Month 1-2:  ████████ Phase 1: Foundation & Proof-of-Concept
Month 3-5:  ████████████ Phase 2: Core Business Logic
Month 6-8:  ████████████ Phase 3: Native UI Framework
Month 9-10: ████████ Phase 4: Advanced Features
Month 11-12: ████████ Phase 5: Rollout & Deprecation
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            1  2  3  4  5  6  7  8  9  10 11 12 (months)
```

### Team Structure by Phase

**Phase 1: Foundation (Months 1-2)**
- Rust Engineers: 2 FTE
- Kotlin Engineer: 1 FTE
- Swift Engineer: 1 FTE
- DevOps Engineer: 1 FTE
- **Total:** 5 FTE

**Phase 2: Core Business Logic (Months 3-5)**
- Rust Engineers: 3 FTE (peak)
- React Native Engineer: 1 FTE (integration)
- DevOps Engineer: 0.5 FTE
- QA Engineer: 1 FTE
- **Total:** 5.5 FTE

**Phase 3: Native UI Framework (Months 6-8)**
- Rust Engineers: 1 FTE (support)
- Kotlin Engineers: 2 FTE
- Swift Engineers: 2 FTE
- DevOps Engineer: 0.5 FTE
- QA Engineers: 2 FTE
- **Total:** 7.5 FTE

**Phase 4: Advanced Features (Months 9-10)**
- Rust Engineers: 2 FTE
- Kotlin Engineers: 2 FTE
- Swift Engineers: 2 FTE
- QA Engineers: 2 FTE
- **Total:** 8 FTE

**Phase 5: Rollout & Deprecation (Months 11-12)**
- Rust Engineer: 1 FTE (bug fixes)
- Kotlin Engineers: 2 FTE
- Swift Engineers: 2 FTE
- DevOps Engineer: 1 FTE
- QA Engineers: 2 FTE
- **Total:** 8 FTE

### Total Effort Estimate

| Phase | Duration | Engineering Weeks | Risk-Adjusted Estimate |
|-------|----------|-------------------|------------------------|
| Phase 1 | 8 weeks | 40 weeks | 48 weeks (+20% buffer) |
| Phase 2 | 12 weeks | 66 weeks | 79 weeks (+20% buffer) |
| Phase 3 | 12 weeks | 90 weeks | 108 weeks (+20% buffer) |
| Phase 4 | 8 weeks | 64 weeks | 77 weeks (+20% buffer) |
| Phase 5 | 8 weeks | 64 weeks | 77 weeks (+20% buffer) |
| **Total** | **48 weeks** | **324 weeks** | **389 weeks** |

**Average Team Size:** ~8 FTE
**Calendar Duration:** 12 months (with parallelization)

---

## Risk Management

### High-Risk Areas

#### 1. FFI Performance & Memory Safety (Phase 1-2)

**Risk:** FFI boundary overhead degrades performance, or memory leaks across FFI

**Probability:** MEDIUM
**Impact:** HIGH
**Mitigation:**
- Validate in Phase 1 with Settings module (low-risk PoC)
- Extensive performance benchmarking (target: <1ms FFI overhead)
- Memory leak detection with Valgrind, LeakCanary, Instruments
- Minimize FFI crossings via batching
- Use `catch_unwind` to prevent panics across FFI

**Contingency:**
- If FFI overhead >5ms, redesign API to be more coarse-grained
- If memory leaks unresolvable, rollback affected module

#### 2. Data Migration from MMKV (Phase 1-2)

**Risk:** User data loss or corruption during migration from MMKV to Rust storage

**Probability:** MEDIUM
**Impact:** VERY HIGH
**Mitigation:**
- Keep MMKV for UI preferences (native layer)
- Migrate only business data to Rust SDK storage
- Export/import tooling with validation
- Extensive testing with production-like data volumes
- Gradual migration (not all data at once)

**Contingency:**
- Maintain MMKV fallback during Phase 2-3
- Rollback migration if >1% data loss detected
- User-facing data recovery tool

#### 3. TV Focus Management (Phase 3)

**Risk:** TV navigation breaks or becomes unusable with native UI

**Probability:** MEDIUM-HIGH
**Impact:** HIGH
**Mitigation:**
- Extensive TV testing (Android TV, Fire TV, tvOS)
- Focus debugging tools
- Fallback to React Native TV screens if needed
- TV-specific QA engineer

**Contingency:**
- Partial rollback: keep TV on React Native, mobile on native
- Extended Phase 3 timeline if TV focus issues

#### 4. Video Playback Regressions (Phase 4)

**Risk:** Video playback breaks (DRM, subtitles, quality switching, cast)

**Probability:** MEDIUM
**Impact:** CRITICAL
**Mitigation:**
- Comprehensive video testing matrix (formats, DRM, devices)
- Fallback to React Native video player
- Gradual rollout with monitoring
- Video playback expert on team

**Contingency:**
- Feature flag rollback to React Native video
- Delay Phase 4 until playback stable

#### 5. Team Learning Curve (Phase 1-3)

**Risk:** Team unfamiliar with Rust, Jetpack Compose, SwiftUI

**Probability:** HIGH
**Impact:** MEDIUM
**Mitigation:**
- Training period before Phase 1 (2-4 weeks)
- Pair programming with experienced engineers
- Code reviews focused on learning
- Documentation and best practices guides

**Contingency:**
- Hire external Rust/Kotlin/Swift consultants
- Extend Phase 1-3 timelines if needed

#### 6. Scope Creep (All Phases)

**Risk:** New features added during migration, extending timeline

**Probability:** HIGH
**Impact:** HIGH
**Mitigation:**
- Strict scope control: no new features during migration
- Feature requests deferred to post-migration backlog
- Stakeholder alignment on scope freeze
- Regular progress reviews

**Contingency:**
- Formal change request process for scope additions
- Re-baseline timeline if major scope changes

### Risk Matrix

| Risk Area | Probability | Impact | Severity | Mitigation Phase |
|-----------|-------------|--------|----------|------------------|
| FFI Performance | MEDIUM | HIGH | **HIGH** | Phase 1 |
| Data Migration | MEDIUM | VERY HIGH | **CRITICAL** | Phase 1-2 |
| TV Focus | MEDIUM-HIGH | HIGH | **HIGH** | Phase 3 |
| Video Playback | MEDIUM | CRITICAL | **CRITICAL** | Phase 4 |
| Team Learning Curve | HIGH | MEDIUM | **MEDIUM** | Phase 1-3 |
| Scope Creep | HIGH | HIGH | **HIGH** | All Phases |
| Build Complexity | MEDIUM | MEDIUM | **MEDIUM** | Phase 1 |
| App Store Rejection | LOW | HIGH | **MEDIUM** | Phase 5 |
| Platform API Changes | LOW | MEDIUM | **LOW** | Ongoing |

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Performance Metrics:**
- App startup time (cold): ≤2s (target), ≤1.5s (stretch)
- Screen transition time: ≤200ms
- Catalog load time (cold): ≤500ms
- Video playback start: ≤100ms
- Memory usage: ≤160MB

**Stability Metrics:**
- Crash-free rate: ≥99.5%
- ANR rate (Android): <0.1%
- Hang rate (iOS): <0.1%
- Error rate: <1%

**User Experience Metrics:**
- Session duration: Neutral or better vs React Native
- User retention (7-day): ≥95% of React Native baseline
- User engagement (screens per session): ≥baseline
- App Store rating: ≥4.5 stars

**Development Metrics:**
- Build time: ≤10 minutes (Android + iOS)
- Test coverage: ≥80% (Rust), ≥70% (native UI)
- Code review turnaround: ≤24 hours
- Bug fix time (P1): ≤48 hours

### Phase-Specific Success Gates

Each phase has explicit success criteria that must be met before proceeding to the next phase (see individual phase sections above).

**Go/No-Go Decision Framework:**
- **GO:** All success criteria met, risk acceptable
- **GO with reservations:** Most criteria met, mitigation plan for gaps
- **NO-GO:** Critical criteria missed, risk unacceptable → rollback or extend phase

---

## Dependencies & Constraints

### External Dependencies

**Third-Party Services:**
- TMDB API (metadata)
- Trakt API (watchlist, sync)
- Stremio Addon ecosystem (content sources)
- Google Cast SDK (Chromecast)
- Firebase (Remote Config, Analytics, Crashlytics)
- Sentry (error tracking)

**Platform Dependencies:**
- Android API Level 24+ (Android 7.0+)
- iOS 14+ (iPhone, iPad)
- tvOS 14+ (Apple TV)
- Android TV API Level 24+
- Amazon Fire TV support

### Internal Constraints

**Team Availability:**
- Team size limited to 8-10 FTE
- No team scaling during migration
- Limited Rust expertise initially

**Timeline Constraints:**
- 12-month maximum timeline
- Must maintain feature development velocity
- No extended code freeze acceptable

**Budget Constraints:**
- No significant additional hiring budget
- Must use existing team + limited consulting

**Technical Constraints:**
- Must support existing devices (no iOS 15+ requirement)
- Must maintain TV platform support
- Must not break existing user data

---

## References

### Internal Documentation

1. **[ADR-001: Tri-Layer Architecture](./adr/001-tri-layer-architecture.md)** - Overall architecture decision
2. **[ADR-002: FFI Binding Strategy](./adr/002-ffi-binding-strategy.md)** - UniFFI implementation
3. **[ADR-003: State Management Strategy](./adr/003-state-management-strategy.md)** - Rust vs native state split
4. **[ADR-004: Platform UI Patterns](./adr/004-platform-ui-patterns.md)** - Kotlin/Swift UI architecture
5. **[ADR-005: Migration Sequencing](./adr/005-migration-sequencing.md)** - Detailed migration strategy (basis for this roadmap)
6. **[ADR-006: Build Toolchain](./adr/006-build-toolchain.md)** - Build tooling decisions
7. **[Rust SDK Design](./rust-sdk-design.md)** - Module structure and API contracts
8. **[FFI Boundary Design](./ffi-boundary-design.md)** - C-compatible interfaces and memory management
9. **[Kotlin Native Design](./kotlin-native-design.md)** - Android/TV architecture
10. **[Swift Native Design](./swift-native-design.md)** - iOS/tvOS architecture
11. **[Module Boundaries](./module-boundaries.md)** - Clear layer responsibility definitions
12. **[Dependency Analysis](./dependency-analysis.md)** - Third-party SDK migration impact

### External Resources

- **UniFFI Documentation:** https://mozilla.github.io/uniffi-rs/
- **Rust FFI Guide:** https://doc.rust-lang.org/nomicon/ffi.html
- **Jetpack Compose:** https://developer.android.com/jetpack/compose
- **SwiftUI:** https://developer.apple.com/xcode/swiftui/
- **Strangler Fig Pattern:** https://martinfowler.com/bliki/StranglerFigApplication.html
- **Feature Toggles:** https://www.martinfowler.com/articles/feature-toggles.html

### Migration Case Studies

- **Dropbox:** [Sync Engine in Rust](https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine)
- **Discord:** [Rust in Mobile](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)
- **1Password:** [Rust Core](https://blog.1password.com/1password-8-the-story-so-far/)

---

## Appendix: Quick Reference

### Phase Durations

| Phase | Weeks | Months |
|-------|-------|--------|
| Phase 1 | 8 | 2 |
| Phase 2 | 12 | 3 |
| Phase 3 | 12 | 3 |
| Phase 4 | 8 | 2 |
| Phase 5 | 8 | 2 |
| **Total** | **48** | **12** |

### Phase Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Core Business Logic)
    ↓
Phase 3 (Native UI Framework)
    ↓
Phase 4 (Advanced Features)
    ↓
Phase 5 (Rollout & Deprecation)
```

### Rollback Timelines

| Rollback Type | Timeline | Impact |
|---------------|----------|--------|
| Feature Flag (Runtime) | <15 min | No user data loss |
| Build Rollback (Rust Module) | <4 hours | Requires rebuild |
| Emergency React Native Revert | 2-4 hours | Full revert |

---

**Document Status:** Active Planning
**Next Review:** After Phase 1 completion
**Owner:** Architecture Team
**Stakeholders:** Engineering Leadership, Product, QA

**Revision History:**
- 2026-01-13: v1.0 - Initial migration roadmap created

---

**End of Migration Roadmap**
