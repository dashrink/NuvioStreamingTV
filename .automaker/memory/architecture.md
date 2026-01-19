---
tags: [architecture]
summary: architecture implementation decisions and patterns
relevantTo: [architecture]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 8
  referenced: 8
  successfulFeatures: 8
---
# architecture

#### [Pattern] Service-based abstraction (`WatchPartyService`) for real-time feature state management (2026-01-18)
- **Problem solved:** Implementing chat logic that needs to transition from mock data to real-time WebSockets
- **Why this works:** Decouples the UI (`WatchPartyChat`) from the transport layer, allowing the backend implementation to be swapped from mocks to WebSockets without refactoring UI components
- **Trade-offs:** Adds indirection; service must carefully manage observable state to ensure UI updates trigger correctly

### Interface-based Rust Repository Binding (2026-01-18)
- **Context:** Connecting the Android ViewModel layer to the underlying Rust core logic.
- **Why:** Binding `RustCatalogRepository` to the `CatalogRepository` interface via Hilt allows the ViewModel to remain pure and testable, isolating the complexities of the JNI/Rust bridge.
- **Rejected:** Direct instantiation of Rust wrappers in ViewModels, which would hinder unit testing and tightly couple UI logic to native implementation details.
- **Breaking if changed:** Changing the Hilt module binding logic disrupts the dependency chain required for the `HomeViewModel` to access data.

### Intermediate Mock Data injection for User State features (2026-01-18)
- **Context:** Implementing Watchlist/Continue Watching UI before backing repositories exist
- **Why:** Decouples UI layout development from backend/SDK dependencies, allowing the Home Screen structure to be finalized first
- **Rejected:** Waiting for full SDK implementation
- **Trade-offs:** Creates technical debt requiring a specific cleanup phase to wire real data sources
- **Breaking if changed:** The ViewModel interface must remain consistent when swapping mocks for real repositories

### Adopted Swift Package Manager (SPM) for local modularization (NuvioCore, NuvioFeatures) instead of a monolithic Xcode project structure (2026-01-18)
- **Context:** Setting up a greenfield native codebase for both iOS and tvOS
- **Why:** Enforces strict dependency boundaries between core logic and features; enables cleaner code sharing between iOS and tvOS targets compared to complex Xcode target membership management
- **Rejected:** Monolithic .xcodeproj with folders
- **Trade-offs:** Requires managing Package.swift manifests; slightly higher initial friction for developers used to drag-and-drop Xcode file management
- **Breaking if changed:** Dependency graphs defined in Package.swift must be maintained manually

#### [Pattern] Lightweight custom DIContainer for Service Locator pattern (2026-01-18)
- **Problem solved:** Establishing core architecture for dependency management
- **Why this works:** Avoids overhead and compile-time penalties of heavy third-party DI libraries (like Swinject) or the implicit nature of SwiftUI EnvironmentObjects for service-layer logic
- **Trade-offs:** Less 'magic' than auto-wiring libraries; manual registration required

### Pause local playback immediately upon Google Cast session start (2026-01-18)
- **Context:** Integrating `react-native-google-cast` within `AndroidVideoPlayer`
- **Why:** Prevents double audio (local device + TV) and signifies the handoff of playback responsibility to the receiver app
- **Trade-offs:** User must explicitly disconnect to resume local playback; requires seamless state handoff (position) to the receiver to avoid restarting video
- **Breaking if changed:** If local playback continues, audio sync issues and bandwidth waste occur

#### [Pattern] Type-safe navigation state management using `AppRoute` enum and `NavigationManager` observable (2026-01-18)
- **Problem solved:** Managing programmatic navigation and deep linking across a multi-platform SwiftUI app
- **Why this works:** Enables strict typing for `NavigationPath` without type erasure (`AnyHashable`), simplifying deep link parsing and preventing invalid route states
- **Trade-offs:** Requires maintaining a central enum for all possible screens, which can grow large in complex apps

#### [Pattern] Unified PlayerViewModel for iOS and tvOS with conditional compilation for Views (2026-01-18)
- **Problem solved:** Supporting both touch (iOS) and focus-based (tvOS) inputs
- **Why this works:** Core playback logic (AVPlayer, KVO observation) is identical; only the UI layer needs divergence via `#if os(tvOS)` for focus management
- **Trade-offs:** Reduces logic duplication but complicates View code with platform checks

### Co-located generated Swift/Rust bindings directly in the application source tree instead of consuming as an external module (2026-01-18)
- **Context:** Integrating Rust SDK bindings (NuvioCore.swift and headers) into the iOS/tvOS target
- **Why:** Eliminated the need for 'import NuvioCore' and simplified build configuration by treating bindings as internal code, avoiding complex module map setups for the static library linkage
- **Rejected:** Using a separate Swift Package Manager module for bindings
- **Trade-offs:** Updates to the SDK require manual file copying; source control now tracks generated code
- **Breaking if changed:** Removing the bindings from the source tree would break compilation as the module import was explicitly removed

### Store subtitle styling configuration as a serialized JSON string within the Rust `ProfilePreferences` struct rather than defining granular fields in the Core SDK. (2026-01-18)
- **Context:** Defining the data schema for user profile preferences in the cross-platform Rust core.
- **Why:** Decouples the core logic from UI-specific presentation details (font, color, shadow, etc.) which may vary significantly between platforms or evolve rapidly.
- **Trade-offs:** Requires client-side (Swift/Kotlin) parsing and serialization logic; Core SDK loses the ability to validate individual styling parameters.
- **Breaking if changed:** Changing this to structured fields later requires a schema migration and updates to all client implementations simultaneously.

### Rust SDK core delegates permission handling and URI resolution to native platform layers (2026-01-18)
- **Context:** Implementing local file system scanning for Android and iOS via a shared Rust library
- **Why:** Rust's `std::fs` and `walkdir` operate on standard paths; abstracted permission handling prevents platform-specific UI logic (permissions dialogs) from leaking into the core library
- **Trade-offs:** Requires strict contract where native code (Kotlin/Swift) must resolve Content URIs to accessible paths and request permissions before invoking Rust methods
- **Breaking if changed:** Calling `LocalMediaScanner` directly without prior native permission grants will result in silent failures or access denied errors