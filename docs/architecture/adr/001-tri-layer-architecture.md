# ADR-001: Tri-Layer Architecture for Native Platform Migration

**Status:** Accepted
**Date:** 2026-01-13
**Decision Makers:** Architecture Team
**Technical Story:** [Migration from React Native to Native Platforms with Shared Rust Core]

---

## Table of Contents

1. [Context](#context)
2. [Decision](#decision)
3. [Alternatives Considered](#alternatives-considered)
4. [Consequences](#consequences)
5. [Implementation Strategy](#implementation-strategy)
6. [References](#references)

---

## Context

### Current Architecture Limitations

NuvioStreamingTV is currently built on **React Native 0.81.4** with the **Legacy Bridge architecture**. While this has enabled rapid development and cross-platform deployment, several critical limitations have emerged:

#### Performance Constraints
- **JavaScript Bridge Overhead:** All communication between JavaScript and native modules goes through an asynchronous JSON-serialization bridge, adding latency to critical operations
- **Video Playback Performance:** React Native's abstraction layer introduces unnecessary overhead for real-time video streaming and playback control
- **TV Platform Optimization:** TV hardware (limited CPU/memory) requires highly optimized code paths that JavaScript cannot efficiently provide
- **Memory Pressure:** JavaScript runtime memory overhead compounds on memory-constrained TV devices

#### Development Complexity
- **810+ Platform-Specific Conditionals:** Codebase is littered with `if (Platform.isTV)` checks, making code difficult to maintain and test
- **Mixed Concerns:** Business logic intertwined with UI rendering code, violating separation of concerns
- **Type Safety Gaps:** TypeScript provides compile-time checks, but runtime errors at FFI boundaries and external API integrations remain common
- **Testing Difficulties:** Integration testing across JavaScript-native boundaries requires complex mocking and environment simulation

#### Strategic Concerns
- **React Native Legacy Architecture:** Current RN 0.81.4 uses the old Bridge architecture; upgrading to New Architecture (0.76+) requires significant refactoring
- **Third-Party Dependency Risk:** Heavy reliance on community-maintained packages (30+ native modules) introduces stability and maintenance risks
- **Platform API Access:** Direct access to platform-specific APIs (ExoPlayer, AVPlayer, TV navigation) requires complex native module bridges
- **Code Reuse Limitations:** Business logic written in TypeScript cannot be reused outside React Native context

### Business Requirements

The migration must address:
1. **Performance:** Achieve native-level performance for video playback and UI interactions on TV platforms
2. **Maintainability:** Reduce code duplication and platform-specific conditionals by 90%+
3. **Code Reuse:** Share business logic across iOS, Android, and potentially future platforms (web, desktop)
4. **Type Safety:** Eliminate runtime errors through compile-time guarantees across all layers
5. **Developer Experience:** Provide clear architectural boundaries with platform-native development patterns
6. **Incremental Migration:** Support phased migration without "big bang" rewrite

### Technical Constraints

- **TV Platform Priority:** Apple TV and Android TV are primary deployment targets
- **Existing Rust SDK Foundation:** `rust-sdk/nuvio-core` already contains type definitions and foundation
- **External Integrations:** Must maintain integrations with TMDB, Trakt, MDBList, Stremio addons, Google Cast
- **Offline Support:** Download management and offline playback must remain functional
- **Multi-Profile Support:** Complex account and profile management logic
- **Performance Monitoring:** Real-time performance metrics and adaptive quality selection

---

## Decision

We will adopt a **tri-layer native architecture** consisting of:

### Layer 1: Rust SDK Core (`nuvio-core`)
**Platform-agnostic business logic layer written in Rust**

**Responsibilities:**
- Account and profile management (authentication, profile switching, validation)
- Catalog and library operations (content organization, filtering, sorting)
- Metadata enrichment (TMDB/Trakt/MDBList integration)
- Stream resolution and quality selection
- Download management state machine
- Watch progress tracking and synchronization
- Settings and preferences management
- Performance monitoring and adaptive optimization
- Caching and storage abstraction
- External API clients (HTTP, retry logic, rate limiting)

**Key Technologies:**
- **Language:** Rust (stable)
- **Async Runtime:** Tokio
- **HTTP Client:** reqwest
- **Serialization:** serde (JSON/MessagePack/Protobuf)
- **Storage:** Platform-agnostic traits implemented by native layers
- **Build Target:** Multi-arch static libraries (ARM64, x86_64 for iOS/Android/tvOS)

### Layer 2: Native Platform UI (`kotlin-app`, `swift-app`)
**Platform-specific UI implementations in Kotlin (Android/TV) and Swift (iOS/tvOS)**

**Responsibilities:**
- UI components and layouts (Jetpack Compose, SwiftUI)
- Navigation (Compose Navigation, NavigationStack)
- Video players (ExoPlayer for Android, AVPlayer for iOS)
- Platform APIs (Android SDK, iOS SDK, TV frameworks)
- Focus management and D-pad input handling
- Theme presentation (colors, fonts, animations)
- Deep links and notifications
- Local file system access
- Platform-specific optimizations

**Key Technologies:**
- **Android:** Kotlin, Jetpack Compose, ExoPlayer, AndroidX, Kotlin Coroutines
- **iOS/tvOS:** Swift, SwiftUI, AVFoundation, Combine
- **Build Tools:** Gradle (Android), Xcode (iOS/tvOS)

### Layer 3: FFI Boundary Layer (UniFFI)
**Type-safe interface contracts between Rust and native platforms**

**Responsibilities:**
- Type conversion (Rust ↔ Kotlin/Swift)
- Memory management (ownership transfer, lifetime management)
- Error translation (Rust Result → platform exceptions)
- Async bridge (Rust futures ↔ Kotlin coroutines/Swift async/await)
- Serialization for complex types

**Key Technologies:**
- **Primary:** UniFFI (Mozilla's FFI binding generator)
- **Fallback:** cbindgen (for cases where UniFFI insufficient)
- **Memory Safety:** Explicit ownership semantics with Rust's type system
- **Build Integration:** cargo-ndk (Android multi-arch), xcodebuild (iOS)

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                           │
│                                                                       │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │   Kotlin Native (Android)    │  │   Swift Native (iOS/tvOS)    │  │
│  ├─────────────────────────────┤  ├─────────────────────────────┤  │
│  │ • Jetpack Compose UI        │  │ • SwiftUI Components        │  │
│  │ • Compose Navigation        │  │ • NavigationStack           │  │
│  │ • ExoPlayer Integration     │  │ • AVPlayer Integration      │  │
│  │ • D-Pad Focus Manager       │  │ • Focus Engine (tvOS)       │  │
│  │ • Android TV Leanback       │  │ • UIFocusSystem             │  │
│  │ • Material Design 3         │  │ • SF Symbols                │  │
│  │ • Kotlin Coroutines         │  │ • Combine Framework         │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
│              │                              │                        │
└──────────────┼──────────────────────────────┼────────────────────────┘
               │                              │
               │     FFI BOUNDARY LAYER       │
               │        (UniFFI)              │
               │                              │
               ▼                              ▼
      ┌────────────────────────────────────────────────┐
      │      Generated Kotlin Bindings (JNI)          │
      │      Generated Swift Bindings (C Headers)     │
      ├────────────────────────────────────────────────┤
      │ • Type Conversion (Rust ↔ Native)             │
      │ • Memory Management (Arc, lifetimes)          │
      │ • Error Translation (Result → Exception)      │
      │ • Async Bridge (Future → Coroutine/async)    │
      │ • Callback Handlers                           │
      └────────────────┬───────────────────────────────┘
                       │
                       │ C ABI (extern "C")
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      RUST SDK CORE LAYER                              │
│                        (nuvio-core)                                   │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Core Modules     │  │ Integration      │  │ Platform         │  │
│  │                  │  │ Modules          │  │ Abstraction      │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤  │
│  │ • account        │  │ • tmdb_client    │  │ • storage trait  │  │
│  │ • profile        │  │ • trakt_client   │  │ • http trait     │  │
│  │ • catalog        │  │ • stremio_client │  │ • cache trait    │  │
│  │ • library        │  │ • mdblist_client │  │ • logger trait   │  │
│  │ • metadata       │  │ • cast_discovery │  │                  │  │
│  │ • stream         │  └──────────────────┘  └──────────────────┘  │
│  │ • download       │                                               │
│  │ • settings       │  ┌──────────────────────────────────────┐   │
│  │ • theme          │  │ Cross-Cutting Concerns               │   │
│  │ • performance    │  ├──────────────────────────────────────┤   │
│  │ • focus          │  │ • Error handling (thiserror)         │   │
│  │ • watch          │  │ • Logging (tracing)                  │   │
│  └──────────────────┘  │ • Async runtime (tokio)              │   │
│                        │ • HTTP client (reqwest)              │   │
│                        │ • Serialization (serde)              │   │
│                        │ • Testing utilities (mockall)        │   │
│                        └──────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow Example: Loading Content Catalog

```
User Action (Native UI)
    │
    ├─ User taps "Movies" tab
    │
    ▼
Kotlin/Swift Layer
    │
    ├─ CatalogScreen.kt/CatalogView.swift
    ├─ Call: catalogManager.loadCatalog(type: .movies)
    │
    ▼
FFI Boundary (UniFFI)
    │
    ├─ Generated binding converts call
    ├─ Rust type: catalog_load_catalog(catalog_type: CatalogType)
    │
    ▼
Rust Core Layer
    │
    ├─ catalog::load_catalog(type)
    ├─ Check cache → if miss, fetch from addons
    ├─ addon_manager::query_all_addons(type)
    ├─ HTTP requests (async, parallel)
    ├─ Parse responses, deduplicate, sort
    ├─ Store in cache
    ├─ Return: Result<Vec<CatalogItem>, CatalogError>
    │
    ▼
FFI Boundary (UniFFI)
    │
    ├─ Convert Result to native types
    ├─ Rust Vec<CatalogItem> → Kotlin List<CatalogItem> or Swift [CatalogItem]
    ├─ Error handling: Result::Err → Exception/Error
    │
    ▼
Kotlin/Swift Layer
    │
    ├─ Update UI state with catalog items
    ├─ Compose recomposition / SwiftUI view update
    ├─ Render grid/list with focus management
    │
    ▼
Display to User
```

### Design Principles

1. **Platform Agnostic Core:** Rust core contains ZERO platform-specific code; all platform concerns stay in Kotlin/Swift
2. **UI in Native Layer:** All UI rendering, user interaction, and visual presentation implemented natively
3. **FFI as Contract:** FFI layer is a pure translation layer with NO business logic
4. **Single Source of Truth:** Business logic lives in ONE place: Rust core
5. **Performance at Boundaries:** Minimize FFI crossings; batch operations where possible (target: <10 FFI calls per user interaction)
6. **Type Safety Everywhere:** Strong typing across all layers with compile-time guarantees
7. **Memory Safety:** Rust's ownership system prevents memory leaks; clear ownership semantics at FFI boundary
8. **Testability:** Each layer independently testable; Rust core has 80%+ unit test coverage

---

## Alternatives Considered

### Alternative 1: Continue with React Native (Status Quo)

**Description:** Upgrade to React Native 0.76+ with New Architecture (Fabric renderer, TurboModules, JSI)

**Pros:**
- No migration effort required beyond upgrade
- Maintains existing JavaScript/TypeScript codebase
- Large ecosystem of libraries and community support
- Familiar development patterns for existing team
- Hot reload and fast iteration cycle

**Cons:**
- **Performance ceiling:** JavaScript runtime overhead remains, even with JSI improvements
- **TV platform limitations:** React Native TV support is community-maintained, not officially supported
- **Dependency risk:** Reliance on third-party packages for critical functionality (video, casting, navigation)
- **New Architecture migration:** Upgrading from Legacy Bridge to New Architecture is itself a large refactoring effort
- **Memory overhead:** JavaScript VM memory consumption problematic on TV hardware
- **Type safety gaps:** Runtime errors at native boundaries persist despite TypeScript

**Why Rejected:** Does not address fundamental performance and maintainability concerns. TV platform support remains second-class citizen. Migration effort to New Architecture comparable to native migration, without long-term benefits.

### Alternative 2: Pure Native (Kotlin + Swift, No Shared Core)

**Description:** Rewrite app entirely in Kotlin (Android) and Swift (iOS) with duplicated business logic

**Pros:**
- Maximum platform optimization and access to platform APIs
- No FFI overhead or complexity
- Native development patterns throughout
- Full control over performance tuning
- Standard platform build tooling

**Cons:**
- **Code duplication:** Business logic must be written twice (Kotlin + Swift)
- **Inconsistent behavior:** Risk of logic divergence between platforms
- **Double maintenance:** Bug fixes and features require implementation in both codebases
- **Testing burden:** Integration tests must be written twice
- **Slower feature development:** Every feature requires 2x implementation effort
- **API integration duplication:** External API clients (TMDB, Trakt, Stremio) implemented twice

**Why Rejected:** Violates DRY principle. Business logic complexity (~15,000 lines) makes duplication unsustainable. Team velocity would be halved for new features.

### Alternative 3: C++ Core (Instead of Rust)

**Description:** Shared core written in C++ with platform-native UI layers (similar to chosen approach)

**Pros:**
- Mature ecosystem and tooling
- Direct interop with Android NDK and iOS Objective-C++
- Well-understood FFI patterns
- Large talent pool with C++ expertise
- Battle-tested in mobile apps (e.g., Dropbox, Facebook)

**Cons:**
- **Memory safety:** C++ lacks ownership system; manual memory management error-prone
- **Undefined behavior:** C++ has numerous footguns (null pointers, buffer overflows, data races)
- **Build complexity:** C++ build systems (CMake, Bazel) more complex than Cargo
- **Async programming:** C++ async patterns less ergonomic than Rust's async/await
- **Error handling:** Exception-based error handling difficult to reason about in async code
- **Dependency management:** No standard package manager (Conan, vcpkg fragmentation)
- **Type safety:** Weaker type system than Rust; runtime errors more common

**Why Rejected:** Memory safety is critical for TV app stability (cannot afford crashes on user's TV). Rust's ownership system and modern tooling (Cargo, async/await) provide significant developer experience and safety advantages. Existing `rust-sdk/nuvio-core` foundation already in place.

### Alternative 4: Flutter

**Description:** Migrate to Flutter (Dart) for cross-platform UI with platform channels for native features

**Pros:**
- Cross-platform UI with single codebase
- Good performance with compiled Dart
- Rich widget library and tooling
- Growing ecosystem and Google backing
- Hot reload for fast iteration

**Cons:**
- **TV platform support:** Flutter TV support immature; limited community adoption
- **Video playback:** Flutter video players less optimized than native (ExoPlayer, AVPlayer)
- **UI customization:** Achieving platform-native feel requires significant customization
- **Platform APIs:** Still requires platform channels (FFI) for native features
- **Bundle size:** Flutter engine adds ~4MB overhead
- **Learning curve:** Team would need to learn Dart and Flutter paradigms

**Why Rejected:** TV platform support not production-ready. Does not provide native UI feel required for premium streaming experience. Still requires FFI layer for platform features, so does not eliminate complexity.

### Alternative 5: React Native with Hermes + JSI + Turbo Native Modules

**Description:** Optimize current React Native with Hermes engine, JSI for synchronous native calls, custom Turbo Modules

**Pros:**
- Incremental improvement to current architecture
- Leverages existing React Native expertise
- Synchronous JSI calls reduce bridge overhead
- Hermes bytecode compilation improves startup time

**Cons:**
- **Limited TV support:** New Architecture support for TV platforms experimental
- **Still JavaScript:** Fundamental performance ceiling remains
- **Custom Turbo Modules:** Must write custom modules for all business logic (equivalent effort to Rust migration)
- **Memory overhead:** Hermes reduces but does not eliminate JS VM overhead
- **Type safety:** JSI boundaries still dynamically typed at runtime

**Why Rejected:** Does not provide sufficient performance improvement for TV platforms. Effort to write custom Turbo Modules comparable to Rust migration, without benefits of type safety, memory safety, and code sharing beyond React Native ecosystem.

---

## Consequences

### Positive Consequences

#### Performance Improvements
- **Rust Core Efficiency:** Compiled Rust code with zero-cost abstractions provides 10-50x performance improvement over JavaScript for compute-intensive operations (e.g., metadata processing, stream filtering)
- **Native UI Performance:** Direct use of ExoPlayer and AVPlayer eliminates React Native video abstraction overhead
- **Reduced Memory Footprint:** Removing JavaScript VM reduces memory consumption by ~30-50MB on TV devices
- **Optimized FFI Calls:** Batched FFI operations minimize boundary crossing overhead (target: <1ms per call)
- **Zero-Copy Optimizations:** Rust's ownership system enables zero-copy data sharing where possible

#### Code Quality & Maintainability
- **Separation of Concerns:** Clear architectural boundaries between business logic (Rust), platform APIs (Kotlin/Swift), and UI (native)
- **Reduced Conditional Logic:** Eliminates 810+ platform-specific conditionals by separating `.tv` implementations
- **Type Safety:** Compile-time guarantees across Rust, Kotlin, and Swift; eliminates entire classes of runtime errors
- **Memory Safety:** Rust's ownership system prevents use-after-free, double-free, null pointer dereferences, and data races
- **Single Source of Truth:** Business logic in Rust ensures consistent behavior across platforms
- **Testability:** Rust core achieves 80%+ unit test coverage; native layers tested with platform-specific tools

#### Developer Experience
- **Platform-Native Patterns:** Kotlin developers use Jetpack Compose idioms; Swift developers use SwiftUI/Combine patterns
- **Clear Module Boundaries:** Module boundary specifications define what belongs in each layer
- **Modern Tooling:** Cargo (Rust), Gradle (Kotlin), Xcode (Swift) provide best-in-class development experience
- **Fast Compilation:** Rust incremental compilation faster than JavaScript bundling for large codebases
- **IDE Support:** Full IntelliJ IDEA (Kotlin), Xcode (Swift), VSCode/RustRover (Rust) support

#### Strategic Benefits
- **Code Reuse Beyond Mobile:** Rust core can be reused in web (WASM), desktop (Tauri), or server contexts
- **Independent Deployment:** Rust core can be updated independently via dynamic library updates (with versioning)
- **Future-Proof:** Not dependent on React Native's evolution or Facebook's priorities
- **Platform API Access:** Direct access to latest platform APIs without waiting for React Native bridges
- **Team Growth:** Easier to hire platform-specialized engineers (Kotlin, Swift) vs. React Native specialists

### Negative Consequences

#### Increased Complexity
- **Multi-Language Codebase:** Team must maintain expertise in Rust, Kotlin, and Swift (3 languages vs. 1)
- **FFI Debugging:** Debugging issues across FFI boundary more complex than single-language debugging
- **Build Toolchain:** Must maintain Rust compilation for multiple targets (ARM64, x86_64, Android, iOS, tvOS)
- **Dependency Management:** Three package managers (Cargo, Gradle, CocoaPods/SPM) instead of one (npm)

#### Development Velocity Impact
- **Migration Effort:** Initial migration estimated at 6-12 months (see migration roadmap in separate document)
- **Learning Curve:** Team members must learn Rust (estimated 2-3 months for proficiency)
- **Slower Iteration:** Native compilation slower than JavaScript hot reload (though Rust incremental compilation mitigates this)
- **Platform-Specific Features:** Features requiring UI changes must be implemented twice (Kotlin + Swift)

#### Operational Overhead
- **CI/CD Complexity:** Build pipeline must compile Rust for 6 targets (Android: arm64-v8a, armeabi-v7a, x86_64; iOS: arm64, x86_64-simulator; tvOS: arm64, x86_64-simulator)
- **Binary Size:** Static Rust libraries add ~2-5MB per platform (though eliminates React Native bundle ~10MB)
- **Crash Reporting:** Must integrate crash reporting across Rust (panic handling), Kotlin (exceptions), Swift (errors)
- **Performance Monitoring:** Requires instrumentation at FFI boundaries to track performance metrics

#### Migration Risks
- **Feature Parity:** Must achieve 100% feature parity with React Native before full cutover
- **Regression Risk:** Rewriting business logic introduces risk of behavior changes or bugs
- **Team Disruption:** Significant learning curve may temporarily reduce team productivity
- **Parallel Maintenance:** During migration, must maintain both React Native and native codebases simultaneously

### Risk Mitigation Strategies

1. **Phased Migration:** Implement migration in 5 phases (see ADR-005) with parallel operation of old and new architectures
2. **Training Program:** 3-month Rust training program for team members; external Rust consultant during months 1-3
3. **Build Automation:** Comprehensive CI/CD pipeline with automated cross-compilation, testing, and deployment
4. **FFI Testing:** Dedicated FFI testing strategy (see separate document) with memory leak detection, error handling verification
5. **Feature Flags:** Use feature flags to enable progressive rollout of native modules
6. **Rollback Plan:** Ability to rollback to React Native for each migrated module
7. **Documentation:** Comprehensive architectural documentation (this ADR + 15 supporting documents)

---

## Implementation Strategy

### Migration Phases Overview

The migration is structured as a **5-phase incremental rollout** (detailed in ADR-005: Migration Sequencing):

1. **Phase 1: Foundation (Months 1-2)** - Rust SDK infrastructure, FFI boundary setup, build tooling
2. **Phase 2: Core Business Logic (Months 3-5)** - Migrate account, catalog, metadata modules to Rust
3. **Phase 3: Native UI Framework (Months 6-8)** - Build Kotlin/Swift UI frameworks, navigation, basic screens
4. **Phase 4: Advanced Features (Months 9-10)** - Download management, watch progress, settings
5. **Phase 5: Rollout & Optimization (Months 11-12)** - Performance tuning, bug fixes, gradual user rollout

### Success Criteria

Migration phase is considered successful when:
- **Feature Parity:** 100% of React Native features working in native apps
- **Performance:** Video playback latency <100ms; UI interactions <16ms (60fps)
- **Stability:** Crash-free rate >99.5% (same as React Native baseline)
- **Test Coverage:** Rust core >80%, Kotlin/Swift >70%
- **User Acceptance:** Beta testing with 100+ users; <5% critical bug reports
- **Team Readiness:** All engineers trained and productive in new architecture

### Build Toolchain Requirements

The following tools are required (see ADR-006: Build Toolchain for details):

**Rust Environment:**
- `rustup` with targets: `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android`, `aarch64-apple-ios`, `aarch64-apple-ios-sim`, `aarch64-apple-tvos`, `aarch64-apple-tvos-sim`
- `cargo-ndk` for Android cross-compilation
- UniFFI CLI: `cargo install uniffi_bindgen`

**Android Environment:**
- Android Studio with NDK 25+
- Gradle 8+
- Kotlin 1.9+

**iOS/tvOS Environment:**
- Xcode 15+
- Swift 5.9+
- CocoaPods or Swift Package Manager

### Documentation and Architectural Artifacts

The following documents support this ADR (all located in `docs/architecture/`):

1. **Analysis Documents:**
   - `component-inventory.md` - Complete React Native component catalog
   - `service-layer-catalog.md` - All service modules and their responsibilities
   - `state-management-map.md` - React Context providers and data flow
   - `platform-specific-code-catalog.md` - iOS/Android/TV-specific code inventory
   - `external-integrations-map.md` - External API and SDK integrations
   - `dependency-graph.md` - Module dependency visualization

2. **Design Documents:**
   - `module-boundaries.md` - Clear boundaries between Rust/Kotlin/Swift layers
   - `rust-sdk-design.md` - Rust core module structure and responsibilities
   - `ffi-boundary-design.md` - FFI interface contracts and memory management
   - `kotlin-native-design.md` - Android/TV native architecture
   - `swift-native-design.md` - iOS/tvOS native architecture
   - `build-toolchain-requirements.md` - Complete build tool setup guide

3. **Supporting ADRs:**
   - ADR-002: FFI Binding Strategy (UniFFI vs cbindgen)
   - ADR-003: State Management Approach
   - ADR-004: Platform UI Patterns
   - ADR-005: Migration Sequencing
   - ADR-006: Build Toolchain Decisions

---

## References

### Internal Documentation
- [Module Boundary Specifications](../module-boundaries.md)
- [Rust SDK Core Design](../rust-sdk-design.md)
- [FFI Boundary Design](../ffi-boundary-design.md)
- [Kotlin Native Architecture](../kotlin-native-design.md)
- [Swift Native Architecture](../swift-native-design.md)
- [Dependency Graph](../dependency-graph.md)
- [Service Layer Catalog](../service-layer-catalog.md)
- [State Management Map](../state-management-map.md)
- [Build Toolchain Requirements](../build-toolchain-requirements.md)
- [TV Refactoring Summary](../../../TV_REFACTORING_SUMMARY.md)
- [Platform Abstraction Pattern](../../../src/PLATFORM_ABSTRACTION_PATTERN.md)

### External Resources
- [UniFFI Book](https://mozilla.github.io/uniffi-rs/) - Mozilla's FFI binding generator documentation
- [Rust FFI Omnibus](http://jakegoulding.com/rust-ffi-omnibus/) - Comprehensive FFI examples
- [Kotlin/Native Memory Management](https://kotlinlang.org/docs/native-memory-manager.html)
- [Swift C Interoperability](https://developer.apple.com/documentation/swift/c-interoperability)
- [Android NDK Guide](https://developer.android.com/ndk/guides)
- [iOS tvOS Focus Engine](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection)
- [Jetpack Compose for TV](https://developer.android.com/jetpack/compose/tv)

### Research Papers and Case Studies
- Mozilla Firefox: Rust components in production iOS/Android apps
- Dropbox: Migration from C++ to Rust for sync engine
- Discord: Rust performance improvements in mobile app
- 1Password: Rust core shared across web/mobile/desktop

---

**Revision History:**
- 2026-01-13: Initial version (v1.0) - Architecture team consensus
