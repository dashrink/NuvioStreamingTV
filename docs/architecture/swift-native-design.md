# Swift (iOS/tvOS) Native Layer Architecture Design

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Project:** NuvioStreamingTV Tri-Layer Architecture Migration
**Purpose:** Define Swift native layer architecture, C bridging patterns, UI component design (UIKit/SwiftUI), and data binding strategies for iOS and tvOS platforms

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Swift Package Structure](#swift-package-structure)
3. [C Bridging Header Requirements](#c-bridging-header-requirements)
4. [C Interop Patterns](#c-interop-patterns)
5. [UI Component Architecture](#ui-component-architecture)
6. [Data Binding Patterns](#data-binding-patterns)
7. [iOS/tvOS Lifecycle Integration](#iostvos-lifecycle-integration)
8. [Threading Model](#threading-model)
9. [tvOS Focus Management](#tvos-focus-management)
10. [Navigation Architecture](#navigation-architecture)
11. [Video Player Integration](#video-player-integration)
12. [State Management](#state-management)
13. [Build Configuration](#build-configuration)
14. [Testing Strategy](#testing-strategy)
15. [Performance Optimization](#performance-optimization)
16. [Migration Strategy](#migration-strategy)

---

## Executive Summary

This document defines the Swift native layer architecture for NuvioStreamingTV's iOS and tvOS platforms. The design bridges the Rust SDK core with native Apple UI through a single-layer FFI binding pattern (Rust → C ABI → Swift), leveraging modern iOS/tvOS best practices including SwiftUI, Combine, async/await, and UIKit/TVUIKit for platform-specific components.

### Design Principles

1. **UniFFI-Generated Bindings** - Automated FFI layer with zero-overhead C bridging
2. **Swift Concurrency** - Async operations bridge seamlessly from Rust futures to Swift async/await
3. **SwiftUI-First** - Modern declarative UI for both iOS and tvOS, UIKit for legacy components
4. **MVVM Architecture** - Clean separation: View (SwiftUI) ↔ ViewModel (business logic bridge) ↔ Repository (FFI layer)
5. **TVUIKit Integration** - tvOS-optimized focus engine with D-pad navigation
6. **Lifecycle-Aware** - All FFI resources managed by iOS/tvOS lifecycle (deinit, didReceiveMemoryWarning)
7. **Type-Safe** - Leverage Swift's optionals, Result types, and error handling
8. **Testable** - Dependency injection with protocol-oriented design; repository pattern enables testing without FFI

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         iOS/tvOS Application                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              UI Layer (SwiftUI/UIKit)                        │   │
│  │  • SwiftUI Views & Screens                                   │   │
│  │  • UIKit Components (TVBrowserViewController, etc.)          │   │
│  │  • TVUIKit Focus Management                                  │   │
│  │  • Theme System (Environment + PreferenceKey)                │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                        │
│  ┌───────────────────────────▼──────────────────────────────────┐   │
│  │          Presentation Layer (ViewModels)                     │   │
│  │  • @Published properties for reactive UI                     │   │
│  │  • ObservableObject conformance                              │   │
│  │  • Swift async/await bridge to Rust                          │   │
│  │  • Combine publishers for complex data flows                 │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                        │
│  ┌───────────────────────────▼──────────────────────────────────┐   │
│  │            Repository Layer (Data Sources)                   │   │
│  │  • AccountRepository, CatalogRepository, etc.                │   │
│  │  • FFI call abstraction & error mapping                      │   │
│  │  • Combine publishers for reactive data streams              │   │
│  │  • AsyncSequence for streaming data                          │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                        │
│  ┌───────────────────────────▼──────────────────────────────────┐   │
│  │          FFI Binding Layer (UniFFI-Generated)                │   │
│  │  • Swift structs/classes (Profile, Stream, Catalog)          │   │
│  │  • async function wrappers                                   │   │
│  │  • Swift Error conformance                                   │   │
│  │  • Memory management (ARC + Rust Arc<T>)                     │   │
│  │  • C bridging header for FFI functions                       │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────────┘
                               │ C ABI Boundary
                               │ (UniFFI-generated C functions)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    C FFI Layer (UniFFI-Generated)                     │
│  • extern "C" functions                                               │
│  • catch_unwind for panic safety                                     │
│  • Memory management (Box::into_raw, Arc cloning)                    │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Rust SDK Core (nuvio-core)                      │
│  • Business logic (account, catalog, stream, etc.)                   │
│  • External API integrations (TMDB, Trakt, Stremio)                  │
│  • Storage & caching                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Metrics

- **Swift Modules:** 1 main target + 1 FFI framework module
- **ViewModel Classes:** ~20 (one per major screen + shared ViewModels)
- **Repository Protocols:** ~12 (matching Rust SDK modules)
- **SwiftUI Views:** ~25 (iOS + tvOS variants)
- **FFI-Generated Swift Types:** ~50 structs/classes
- **Target iOS Version:** iOS 15.0+ (SwiftUI 3.0 features)
- **Target tvOS Version:** tvOS 15.0+ (TVUIKit focus improvements)

### Performance Advantage: Single-Layer FFI

Unlike Android's two-layer binding (Rust → C → JNI → Kotlin), iOS/tvOS uses **single-layer** C bridging:

```
Rust → C ABI → Swift
```

**Performance Benefits:**
- **2x faster FFI calls** (~20-50μs vs ~50-100μs on Android)
- **Direct memory mapping** (no JVM marshalling)
- **Zero-copy string passing** (UTF-8 pointers)
- **Simpler memory management** (ARC + manual Rust free functions)

---

## Swift Package Structure

### Top-Level Module Organization

```
NuvioTV/                                      # Main iOS/tvOS app target
├── App/
│   ├── NuvioTVApp.swift                      # App entry point (@main)
│   ├── AppDelegate.swift                     # AppDelegate lifecycle (Google Cast, etc.)
│   └── SceneDelegate.swift                   # Scene lifecycle (iOS only)
│
├── Core/                                     # Core infrastructure
│   ├── Config/
│   │   ├── Configuration.swift               # App configuration
│   │   └── Environment.swift                 # Environment variables
│   │
│   ├── Extensions/
│   │   ├── View+Extensions.swift             # SwiftUI View extensions
│   │   ├── String+Extensions.swift           # String utilities
│   │   ├── Date+Extensions.swift             # Date formatting
│   │   ├── Color+Extensions.swift            # Color utilities
│   │   └── Image+Extensions.swift            # Image loading helpers
│   │
│   ├── Utilities/
│   │   ├── Logger.swift                      # Logging facade
│   │   ├── NetworkMonitor.swift              # Reachability monitoring
│   │   ├── PerformanceMonitor.swift          # FPS & memory tracking
│   │   └── DeepLinkHandler.swift             # Universal link handling
│   │
│   └── Constants/
│       ├── AppConstants.swift                # Global constants
│       ├── ColorConstants.swift              # Semantic colors
│       └── LayoutConstants.swift             # Spacing, sizing
│
├── UI/                                       # UI Layer
│   ├── Theme/
│   │   ├── ThemeManager.swift                # Theme state management
│   │   ├── ColorPalette.swift                # Color definitions
│   │   ├── Typography.swift                  # Text styles
│   │   ├── Spacing.swift                     # Layout spacing
│   │   └── CornerRadius.swift                # Border radius values
│   │
│   ├── Components/                           # Reusable UI components
│   │   ├── Common/                           # Shared iOS + tvOS components
│   │   │   ├── FocusableCard.swift           # Focus-aware card (tvOS optimized)
│   │   │   ├── LoadingView.swift             # Loading indicators
│   │   │   ├── ErrorView.swift               # Error display
│   │   │   ├── AsyncImageView.swift          # Lazy-loaded images
│   │   │   ├── MetadataCard.swift            # Content metadata display
│   │   │   ├── RatingBadge.swift             # Rating display (stars, numbers)
│   │   │   ├── GenrePill.swift               # Genre tag pill
│   │   │   └── ProgressBar.swift             # Watch progress indicator
│   │   │
│   │   ├── iOS/                              # iOS-specific components
│   │   │   ├── TabBarView.swift              # Bottom tab navigation
│   │   │   ├── NavigationBar.swift           # Custom nav bar
│   │   │   ├── PullToRefreshView.swift       # Swipe to refresh
│   │   │   ├── BottomSheet.swift             # Bottom sheet modal
│   │   │   └── ContextMenu.swift             # Long-press menu
│   │   │
│   │   └── tvOS/                             # tvOS-specific components
│   │       ├── TVCardButton.swift            # Focusable card for tvOS
│   │       ├── TVTopShelfView.swift          # Top Shelf UI
│   │       ├── TVSidebarMenu.swift           # Side navigation menu
│   │       ├── TVFocusGuide.swift            # Focus guide helpers
│   │       ├── TVContextualMenu.swift        # Play button menu
│   │       ├── TVParallaxView.swift          # Parallax card effect
│   │       └── TVVoiceSearchButton.swift     # Siri search integration
│   │
│   ├── Screens/                              # Screen-level views
│   │   ├── Home/
│   │   │   ├── HomeView.swift                # iOS home screen
│   │   │   ├── HomeViewTV.swift              # tvOS home (horizontal rows)
│   │   │   ├── HomeViewModel.swift           # Shared ViewModel
│   │   │   └── HomeUiState.swift             # UI state struct
│   │   │
│   │   ├── Catalog/
│   │   │   ├── CatalogView.swift             # iOS catalog browse
│   │   │   ├── CatalogViewTV.swift           # tvOS catalog grid
│   │   │   ├── CatalogViewModel.swift        # Catalog business logic
│   │   │   └── CatalogUiState.swift          # Catalog state
│   │   │
│   │   ├── Detail/
│   │   │   ├── DetailView.swift              # iOS content detail
│   │   │   ├── DetailViewTV.swift            # tvOS detail (split view)
│   │   │   ├── DetailViewModel.swift         # Detail logic
│   │   │   └── DetailUiState.swift           # Detail state
│   │   │
│   │   ├── Player/
│   │   │   ├── PlayerView.swift              # iOS video player
│   │   │   ├── PlayerViewTV.swift            # tvOS player (AVPlayerViewController)
│   │   │   ├── PlayerViewModel.swift         # Player control logic
│   │   │   ├── PlayerControlsView.swift      # Custom playback controls
│   │   │   ├── SubtitleSelectionView.swift   # Subtitle picker
│   │   │   └── PlaybackInfoView.swift        # Playback metadata overlay
│   │   │
│   │   ├── Library/
│   │   │   ├── LibraryView.swift             # iOS library
│   │   │   ├── LibraryViewTV.swift           # tvOS library grid
│   │   │   ├── LibraryViewModel.swift        # Library logic
│   │   │   └── LibraryUiState.swift          # Library state
│   │   │
│   │   ├── Search/
│   │   │   ├── SearchView.swift              # iOS search
│   │   │   ├── SearchViewTV.swift            # tvOS search (keyboard + voice)
│   │   │   ├── SearchViewModel.swift         # Search logic
│   │   │   └── SearchUiState.swift           # Search state
│   │   │
│   │   ├── Settings/
│   │   │   ├── SettingsView.swift            # iOS settings
│   │   │   ├── SettingsViewTV.swift          # tvOS settings
│   │   │   ├── PlayerSettingsView.swift      # Player config
│   │   │   ├── ThemeSettingsView.swift       # Theme picker
│   │   │   ├── SettingsViewModel.swift       # Settings logic
│   │   │   └── SettingsUiState.swift         # Settings state
│   │   │
│   │   ├── Profile/
│   │   │   ├── ProfileSelectionView.swift    # Profile picker
│   │   │   ├── ProfileSelectionViewTV.swift  # tvOS profile picker
│   │   │   ├── ProfileEditorView.swift       # Profile editor
│   │   │   ├── ProfilePinView.swift          # PIN entry
│   │   │   ├── ProfileViewModel.swift        # Profile logic
│   │   │   └── ProfileUiState.swift          # Profile state
│   │   │
│   │   ├── Downloads/
│   │   │   ├── DownloadsView.swift           # iOS downloads
│   │   │   ├── DownloadsViewTV.swift         # tvOS downloads
│   │   │   ├── DownloadsViewModel.swift      # Download manager logic
│   │   │   └── DownloadsUiState.swift        # Download state
│   │   │
│   │   └── Onboarding/
│   │       ├── OnboardingView.swift          # First-run onboarding
│   │       ├── OnboardingViewTV.swift        # tvOS onboarding
│   │       └── OnboardingViewModel.swift     # Onboarding logic
│   │
│   └── Navigation/
│       ├── Router.swift                      # Navigation coordinator
│       ├── Route.swift                       # Route enum
│       ├── NavigationStack.swift             # iOS navigation stack
│       └── NavigationTV.swift                # tvOS UIKit navigation
│
├── Presentation/                             # Presentation Layer (ViewModels)
│   ├── Base/
│   │   ├── BaseViewModel.swift               # Common ViewModel logic
│   │   ├── UiState.swift                     # Base UI state protocol
│   │   └── UiEvent.swift                     # UI event enum
│   │
│   └── ViewModels/
│       ├── AccountViewModel.swift            # Account management
│       ├── CatalogViewModel.swift            # Catalog browsing
│       ├── MetadataViewModel.swift           # Content metadata
│       ├── LibraryViewModel.swift            # User library
│       ├── StreamViewModel.swift             # Stream resolution
│       ├── PlayerViewModel.swift             # Video playback
│       ├── DownloadViewModel.swift           # Offline downloads
│       ├── TraktViewModel.swift              # Trakt sync
│       ├── SettingsViewModel.swift           # App settings
│       ├── ThemeViewModel.swift              # Theme engine
│       └── PerformanceViewModel.swift        # Performance monitoring
│
├── Domain/                                   # Domain Layer (Business Logic)
│   ├── Models/                               # Domain models (Swift structs)
│   │   ├── Account.swift                     # Account model
│   │   ├── Profile.swift                     # Profile model
│   │   ├── Catalog.swift                     # Catalog model
│   │   ├── ContentItem.swift                 # Content item model
│   │   ├── Metadata.swift                    # Content metadata
│   │   ├── Stream.swift                      # Stream model
│   │   ├── Subtitle.swift                    # Subtitle model
│   │   ├── Episode.swift                     # Episode model
│   │   ├── Download.swift                    # Download model
│   │   ├── TraktItem.swift                   # Trakt item model
│   │   └── Settings.swift                    # Settings model
│   │
│   ├── Repositories/                         # Repository protocols & implementations
│   │   ├── Protocols/
│   │   │   ├── AccountRepository.swift       # Account operations protocol
│   │   │   ├── ProfileRepository.swift       # Profile management protocol
│   │   │   ├── CatalogRepository.swift       # Catalog browsing protocol
│   │   │   ├── LibraryRepository.swift       # User library protocol
│   │   │   ├── MetadataRepository.swift      # Content metadata protocol
│   │   │   ├── StreamRepository.swift        # Stream resolution protocol
│   │   │   ├── DownloadRepository.swift      # Download management protocol
│   │   │   ├── TraktRepository.swift         # Trakt sync protocol
│   │   │   ├── SettingsRepository.swift      # Settings persistence protocol
│   │   │   ├── ThemeRepository.swift         # Theme state protocol
│   │   │   ├── PerformanceRepository.swift   # Performance metrics protocol
│   │   │   └── WatchProgressRepository.swift # Watch progress protocol
│   │   │
│   │   └── Implementations/
│   │       ├── AccountRepositoryImpl.swift
│   │       ├── CatalogRepositoryImpl.swift
│   │       ├── StreamRepositoryImpl.swift
│   │       └── ...                           # One impl per repository protocol
│   │
│   └── UseCases/                             # Use cases (for complex operations)
│       ├── SyncLibraryUseCase.swift          # Sync with Trakt
│       ├── ResolveStreamUseCase.swift        # Multi-addon stream resolution
│       ├── DownloadContentUseCase.swift      # Orchestrate download
│       └── SwitchProfileUseCase.swift        # Profile switching logic
│
├── Data/                                     # Data Layer (FFI Integration)
│   ├── FFI/                                  # FFI binding layer (UniFFI-generated)
│   │   ├── NuvioCore.swift                   # Main FFI interface (generated)
│   │   ├── NuvioSDK-Bridging-Header.h        # C bridging header
│   │   ├── Types/                            # FFI types (generated)
│   │   │   ├── FFIAccount.swift              # FFI Account type
│   │   │   ├── FFIProfile.swift              # FFI Profile type
│   │   │   ├── FFICatalog.swift              # FFI Catalog type
│   │   │   ├── FFIMetadata.swift             # FFI Metadata type
│   │   │   ├── FFIStream.swift               # FFI Stream type
│   │   │   ├── FFIError.swift                # FFI NuvioError enum
│   │   │   └── ...                           # ~50 generated types
│   │   │
│   │   └── Callbacks/                        # FFI callback protocols
│   │       ├── ProgressCallback.swift        # Download/sync progress
│   │       ├── EventCallback.swift           # Event bus listener
│   │       └── LogCallback.swift             # Rust log forwarding
│   │
│   ├── Mappers/                              # FFI ↔ Domain model mappers
│   │   ├── AccountMapper.swift               # Map FFI Account to domain Account
│   │   ├── ProfileMapper.swift               # Map FFI Profile to domain Profile
│   │   ├── CatalogMapper.swift               # Map FFI Catalog to domain Catalog
│   │   ├── MetadataMapper.swift              # Map FFI Metadata to domain Metadata
│   │   ├── StreamMapper.swift                # Map FFI Stream to domain Stream
│   │   ├── ErrorMapper.swift                 # Map FFI NuvioError to domain errors
│   │   └── ...                               # Mapper per domain model
│   │
│   └── Local/                                # Platform-specific storage
│       ├── UserDefaults+Extensions.swift     # UserDefaults wrapper
│       └── KeychainManager.swift             # Secure storage (tokens, PINs)
│
├── Player/                                   # Video player integration
│   ├── AVPlayerManager.swift                 # AVPlayer wrapper
│   ├── PlayerEventHandler.swift              # Playback event handling
│   ├── SubtitleRenderer.swift                # Subtitle overlay (AVTextStyleRule)
│   ├── CastIntegration.swift                 # Google Cast integration
│   ├── AirPlayManager.swift                  # AirPlay support
│   └── PlaybackState.swift                   # Playback state struct
│
├── TV/                                       # tvOS-specific code
│   ├── Focus/
│   │   ├── FocusManager.swift                # Focus state tracking (Rust FFI bridge)
│   │   ├── FocusHelper.swift                 # Focus utilities
│   │   └── FocusConstants.swift              # Focus-related constants
│   │
│   ├── Input/
│   │   ├── RemoteHandler.swift               # Siri Remote gesture handling
│   │   ├── VoiceSearchHandler.swift          # Siri voice search
│   │   └── MenuButtonHandler.swift           # tvOS Menu button
│   │
│   └── TopShelf/
│       ├── TopShelfProvider.swift            # Top Shelf content provider
│       └── TopShelfItem.swift                # Top Shelf item model
│
├── Services/                                 # System services
│   ├── BackgroundTasks/
│   │   ├── DownloadService.swift             # Background download URLSession
│   │   └── SyncService.swift                 # Trakt background sync
│   │
│   └── Notifications/
│       ├── NotificationManager.swift         # Local notifications
│       └── NotificationHandler.swift         # Notification actions
│
└── DI/                                       # Dependency Injection
    ├── DIContainer.swift                     # DI container (manual or Swinject)
    ├── AppAssembly.swift                     # App-level dependencies
    ├── RepositoryAssembly.swift              # Repository bindings
    ├── ViewModelAssembly.swift               # ViewModel factories
    └── FFIAssembly.swift                     # FFI/Rust SDK initialization

NuvioTVTests/                                 # Unit tests
├── ViewModelTests/
├── RepositoryTests/
├── MapperTests/
└── MockFFI/                                  # Mock FFI layer for testing

NuvioTVUITests/                               # UI tests
└── ...

NuvioSDK/                                     # FFI Framework (separate target)
├── libnuvio_core.a                           # Rust static library
└── include/
    └── nuvio_ffi.h                           # C header (UniFFI-generated)
```

### Module Naming Conventions

- **Main Target:** `NuvioTV` (matches existing iOS/tvOS app)
- **FFI Framework:** `NuvioSDK` (contains Rust static library + C headers)
- **Feature Folders:** Group by feature (Catalog, Player, Library) rather than layer
- **TV-Specific:** `TV/` folder for tvOS-only code
- **Generated Code:** Keep FFI-generated Swift in `Data/FFI/` folder

---

## C Bridging Header Requirements

### Overview

iOS/tvOS uses a **bridging header** to expose C APIs to Swift. UniFFI generates C functions that are bridged to Swift through this header.

### Single-Layer FFI (Advantage over Android)

Unlike Android's two-layer binding (Rust → C → JNI → Kotlin), iOS uses a **direct C bridge**:

```
Rust Code → C ABI → Swift Code
   (Rust)      (C)     (Swift)
```

**Performance Benefits:**
- **2x faster FFI calls** (~20-50μs vs ~50-100μs on Android)
- **No marshalling overhead** (direct memory access)
- **Zero-copy strings** (UTF-8 pointers)

### Bridging Header Setup

**File:** `ios/NuvioTV/NuvioTV-Bridging-Header.h`

```c
//
// NuvioTV-Bridging-Header.h
// Bridging header for NuvioTV iOS/tvOS app
//

#ifndef NuvioTV_Bridging_Header_h
#define NuvioTV_Bridging_Header_h

// Import the UniFFI-generated C header
#import "nuvio_ffi.h"

// Additional C libraries (if needed)
#import <CommonCrypto/CommonCrypto.h>  // For SHA-256 hashing

#endif /* NuvioTV_Bridging_Header_h */
```

### C Header Structure (UniFFI-Generated)

**File:** `rust-sdk/bindings/include/nuvio_ffi.h` (generated by UniFFI)

```c
// nuvio_ffi.h - UniFFI-generated C header
// Auto-generated from rust-sdk/bindings/nuvio.udl

#ifndef NUVIO_FFI_H
#define NUVIO_FFI_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// Opaque pointer types (Rust objects)
typedef void* NuvioAccountManager;
typedef void* NuvioProfileManager;
typedef void* NuvioCatalogManager;
typedef void* NuvioMetadataManager;
typedef void* NuvioStreamManager;
// ... other manager types

// FFI data types (C-compatible structs)
typedef struct {
    const char* id;
    const char* username;
    int64_t created_at;
    int64_t last_active;
} NuvioAccount;

typedef struct {
    const char* id;
    const char* name;
    uint8_t avatar_index;
    int64_t created_at;
    int64_t last_used;
    bool has_pin;
} NuvioProfile;

// Error handling
typedef enum {
    NUVIO_ERROR_NONE = 0,
    NUVIO_ERROR_STORAGE = 1,
    NUVIO_ERROR_NETWORK = 2,
    NUVIO_ERROR_AUTH = 3,
    NUVIO_ERROR_NOT_FOUND = 4,
    NUVIO_ERROR_INVALID_INPUT = 5,
    NUVIO_ERROR_RATE_LIMITED = 6,
    NUVIO_ERROR_TIMEOUT = 7,
    NUVIO_ERROR_SERIALIZATION = 8,
    NUVIO_ERROR_UNKNOWN = 99,
} NuvioErrorCode;

typedef struct {
    NuvioErrorCode code;
    const char* message;
} NuvioError;

// Initialization
void nuvio_initialize(const char* storage_path, const char* log_level);
void nuvio_shutdown(void);
const char* nuvio_get_version(void);

// AccountManager functions
NuvioAccountManager nuvio_account_manager_new(void);
void nuvio_account_manager_free(NuvioAccountManager manager);
NuvioError nuvio_account_manager_initialize(NuvioAccountManager manager);
NuvioAccount* nuvio_account_manager_get_current_account(NuvioAccountManager manager, NuvioError* error);
NuvioAccount* nuvio_account_manager_create_local_account(NuvioAccountManager manager, const char* username, NuvioError* error);
bool nuvio_account_manager_is_authenticated(NuvioAccountManager manager);
const char* nuvio_account_manager_get_storage_scope(NuvioAccountManager manager);

// ProfileManager functions
NuvioProfileManager nuvio_profile_manager_new(void);
void nuvio_profile_manager_free(NuvioProfileManager manager);
NuvioProfile* nuvio_profile_manager_create_profile(NuvioProfileManager manager, const char* name, const char* pin, NuvioError* error);
void nuvio_profile_manager_delete_profile(NuvioProfileManager manager, const char* profile_id, NuvioError* error);
void nuvio_profile_manager_switch_profile(NuvioProfileManager manager, const char* profile_id, const char* pin, NuvioError* error);
bool nuvio_profile_manager_verify_pin(NuvioProfileManager manager, const char* profile_id, const char* pin, NuvioError* error);
NuvioProfile** nuvio_profile_manager_get_all_profiles(NuvioProfileManager manager, size_t* count, NuvioError* error);
NuvioProfile* nuvio_profile_manager_get_active_profile(NuvioProfileManager manager);

// Memory management functions (CRITICAL)
void nuvio_free_string(const char* s);
void nuvio_free_profile(NuvioProfile* profile);
void nuvio_free_profile_array(NuvioProfile** profiles, size_t count);
void nuvio_free_error(NuvioError error);

// ... additional functions for other managers

#ifdef __cplusplus
}
#endif

#endif /* NUVIO_FFI_H */
```

### Build Configuration

**Xcode Build Settings:**

1. **Bridging Header Path:**
   ```
   Build Settings > Swift Compiler - General > Objective-C Bridging Header
   → $(PROJECT_DIR)/NuvioTV/NuvioTV-Bridging-Header.h
   ```

2. **C Header Search Paths:**
   ```
   Build Settings > Search Paths > Header Search Paths
   → $(PROJECT_DIR)/../rust-sdk/bindings/include
   ```

3. **Library Search Paths:**
   ```
   Build Settings > Search Paths > Library Search Paths
   → $(PROJECT_DIR)/../rust-sdk/target/$(CONFIGURATION)/
   ```

4. **Link Binary With Libraries:**
   ```
   Build Phases > Link Binary With Libraries
   → libnuvio_core.a (iOS)
   → libnuvio_core_tvos.a (tvOS)
   ```

5. **Other Linker Flags:**
   ```
   Build Settings > Linking > Other Linker Flags
   → -lnuvio_core
   → -lresolv (for Rust networking)
   → -lc++   (for C++ stdlib, if Rust uses it)
   ```

---

## C Interop Patterns

### Memory Management Rules

**CRITICAL:** Memory allocated by Rust **MUST** be freed by Rust. Swift ARC only manages Swift objects.

#### Pattern 1: Opaque Pointer Management

**Rust Side:**
```rust
// Rust implementation (in nuvio-core)
pub struct ProfileManager {
    profiles: Vec<Profile>,
    storage: Arc<dyn StorageBackend>,
}

#[no_mangle]
pub extern "C" fn nuvio_profile_manager_new() -> *mut ProfileManager {
    let manager = Box::new(ProfileManager::new());
    Box::into_raw(manager) // Transfer ownership to caller
}

#[no_mangle]
pub extern "C" fn nuvio_profile_manager_free(manager: *mut ProfileManager) {
    if !manager.is_null() {
        unsafe {
            // Reclaim ownership and drop
            let _ = Box::from_raw(manager);
        }
    }
}
```

**Swift Side:**
```swift
// Swift wrapper class
class ProfileManager {
    // Opaque pointer to Rust object
    private let handle: OpaquePointer

    init() {
        // Call Rust constructor
        self.handle = nuvio_profile_manager_new()
    }

    deinit {
        // Free Rust memory when Swift object deallocates
        nuvio_profile_manager_free(handle)
    }

    func createProfile(name: String, pin: String?) throws -> Profile {
        var error = NuvioError()

        let cName = name.cString(using: .utf8)!
        let cPin = pin?.cString(using: .utf8)

        let profilePtr = nuvio_profile_manager_create_profile(
            handle,
            cName,
            cPin,
            &error
        )

        // Check for errors
        if error.code != NUVIO_ERROR_NONE {
            defer { nuvio_free_error(error) }
            throw NuvioSDKError.from(ffiError: error)
        }

        // Convert C struct to Swift struct
        guard let ptr = profilePtr else {
            throw NuvioSDKError.unknown("Failed to create profile")
        }
        defer { nuvio_free_profile(ptr) }

        return Profile.from(ffiProfile: ptr.pointee)
    }
}
```

#### Pattern 2: String Ownership

**Rust Side:**
```rust
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

#[no_mangle]
pub extern "C" fn nuvio_get_username(account: *const Account) -> *const c_char {
    if account.is_null() {
        return std::ptr::null();
    }

    let account = unsafe { &*account };
    let username = CString::new(account.username.clone()).unwrap();
    username.into_raw() // Caller MUST call nuvio_free_string
}

#[no_mangle]
pub extern "C" fn nuvio_free_string(s: *const c_char) {
    if !s.is_null() {
        unsafe {
            // Reclaim ownership and drop
            let _ = CString::from_raw(s as *mut c_char);
        }
    }
}
```

**Swift Side:**
```swift
extension Account {
    var username: String {
        let cString = nuvio_get_username(handle)
        defer { nuvio_free_string(cString) } // CRITICAL: Free Rust string
        return String(cString: cString)
    }
}
```

#### Pattern 3: Array Ownership

**Rust Side:**
```rust
#[repr(C)]
pub struct ProfileArray {
    data: *const *const Profile,
    len: usize,
}

#[no_mangle]
pub extern "C" fn nuvio_profile_manager_get_all_profiles(
    manager: *const ProfileManager,
    out_count: *mut usize,
    out_error: *mut NuvioError,
) -> *mut *mut Profile {
    let manager = unsafe { &*manager };
    let profiles = manager.get_all_profiles();

    // Convert Vec<Profile> to array of pointers
    let profile_ptrs: Vec<*mut Profile> = profiles
        .into_iter()
        .map(|p| Box::into_raw(Box::new(p)))
        .collect();

    let len = profile_ptrs.len();
    let data = profile_ptrs.as_ptr();

    unsafe { *out_count = len; }
    std::mem::forget(profile_ptrs); // Prevent drop

    data as *mut *mut Profile
}

#[no_mangle]
pub extern "C" fn nuvio_free_profile_array(profiles: *mut *mut Profile, count: usize) {
    if !profiles.is_null() {
        unsafe {
            // Reconstruct Vec to drop
            let profile_vec = Vec::from_raw_parts(profiles, count, count);

            // Free each profile
            for profile_ptr in profile_vec {
                if !profile_ptr.is_null() {
                    let _ = Box::from_raw(profile_ptr);
                }
            }
        }
    }
}
```

**Swift Side:**
```swift
class ProfileManager {
    func getAllProfiles() throws -> [Profile] {
        var count: Int = 0
        var error = NuvioError()

        let arrayPtr = nuvio_profile_manager_get_all_profiles(
            handle,
            &count,
            &error
        )

        if error.code != NUVIO_ERROR_NONE {
            defer { nuvio_free_error(error) }
            throw NuvioSDKError.from(ffiError: error)
        }

        guard let ptr = arrayPtr else {
            return []
        }
        defer { nuvio_free_profile_array(ptr, count) } // CRITICAL: Free array

        // Convert C array to Swift array
        var profiles: [Profile] = []
        for i in 0..<count {
            if let profilePtr = ptr.advanced(by: i).pointee {
                profiles.append(Profile.from(ffiProfile: profilePtr.pointee))
            }
        }

        return profiles
    }
}
```

### Error Handling

**Swift Error Type:**
```swift
enum NuvioSDKError: Error, LocalizedError {
    case storage(String)
    case network(String)
    case auth(String)
    case notFound(String)
    case invalidInput(String)
    case rateLimited(String)
    case timeout
    case serialization(String)
    case unknown(String)

    static func from(ffiError: NuvioError) -> NuvioSDKError {
        let message = String(cString: ffiError.message)

        switch ffiError.code {
        case NUVIO_ERROR_STORAGE:
            return .storage(message)
        case NUVIO_ERROR_NETWORK:
            return .network(message)
        case NUVIO_ERROR_AUTH:
            return .auth(message)
        case NUVIO_ERROR_NOT_FOUND:
            return .notFound(message)
        case NUVIO_ERROR_INVALID_INPUT:
            return .invalidInput(message)
        case NUVIO_ERROR_RATE_LIMITED:
            return .rateLimited(message)
        case NUVIO_ERROR_TIMEOUT:
            return .timeout
        case NUVIO_ERROR_SERIALIZATION:
            return .serialization(message)
        default:
            return .unknown(message)
        }
    }

    var errorDescription: String? {
        switch self {
        case .storage(let msg):
            return "Storage error: \(msg)"
        case .network(let msg):
            return "Network error: \(msg)"
        case .auth(let msg):
            return "Authentication error: \(msg)"
        case .notFound(let msg):
            return "Not found: \(msg)"
        case .invalidInput(let msg):
            return "Invalid input: \(msg)"
        case .rateLimited(let msg):
            return "Rate limited: \(msg)"
        case .timeout:
            return "Operation timed out"
        case .serialization(let msg):
            return "Serialization error: \(msg)"
        case .unknown(let msg):
            return "Unknown error: \(msg)"
        }
    }
}
```

### Async FFI Bridge

**Rust Async Function:**
```rust
// Rust async function (using tokio)
pub async fn fetch_metadata(tmdb_id: u32) -> Result<Movie, NuvioError> {
    let response = http_client.get(url).await?;
    let movie: Movie = response.json().await?;
    Ok(movie)
}
```

**C FFI Async Bridge (Callback-Based):**
```rust
type FetchMetadataCallback = extern "C" fn(*mut c_void, *mut Movie, NuvioError);

#[no_mangle]
pub extern "C" fn nuvio_fetch_metadata_async(
    tmdb_id: u32,
    callback: FetchMetadataCallback,
    user_data: *mut c_void,
) {
    tokio::spawn(async move {
        match fetch_metadata(tmdb_id).await {
            Ok(movie) => {
                let movie_ptr = Box::into_raw(Box::new(movie));
                callback(user_data, movie_ptr, NuvioError::success());
            }
            Err(err) => {
                callback(user_data, std::ptr::null_mut(), NuvioError::from(err));
            }
        }
    });
}
```

**Swift Async/Await Bridge:**
```swift
extension MetadataManager {
    func fetchMetadata(tmdbId: UInt32) async throws -> Movie {
        // Bridge C callback to Swift async/await
        return try await withCheckedThrowingContinuation { continuation in
            // Wrap continuation in UnsafeMutablePointer for C callback
            let contextPtr = Unmanaged.passRetained(continuation as AnyObject).toOpaque()

            nuvio_fetch_metadata_async(
                tmdbId,
                { contextPtr, moviePtr, error in
                    let continuation = Unmanaged<AnyObject>.fromOpaque(contextPtr!).takeRetainedValue()
                        as! CheckedContinuation<Movie, Error>

                    if error.code != NUVIO_ERROR_NONE {
                        defer { nuvio_free_error(error) }
                        continuation.resume(throwing: NuvioSDKError.from(ffiError: error))
                    } else {
                        guard let ptr = moviePtr else {
                            continuation.resume(throwing: NuvioSDKError.unknown("Null pointer"))
                            return
                        }
                        defer { nuvio_free_movie(ptr) }

                        let movie = Movie.from(ffiMovie: ptr.pointee)
                        continuation.resume(returning: movie)
                    }
                },
                contextPtr
            )
        }
    }
}
```

---

## UI Component Architecture

### iOS/tvOS Platform Split

The app uses **target-specific** UI implementations:

- **iOS:** SwiftUI + UIKit (UINavigationController, UITabBarController)
- **tvOS:** SwiftUI + UIKit (UIFocusEnvironment, TVUIKit)

### SwiftUI vs UIKit Decision Matrix

| Component | iOS | tvOS | Rationale |
|-----------|-----|------|-----------|
| **Navigation** | SwiftUI NavigationStack | UIKit UINavigationController | tvOS focus requires UIKit |
| **Tab Bar** | SwiftUI TabView | UIKit UITabBarController | tvOS needs custom focus |
| **Video Player** | AVPlayerViewController | AVPlayerViewController | Native player for both |
| **Settings** | SwiftUI List | UIKit UITableViewController | tvOS focus engine |
| **Browse/Catalog** | SwiftUI LazyVGrid | UIKit UICollectionView | tvOS parallax effects |
| **Detail Screen** | SwiftUI ScrollView | UIKit + SwiftUI hybrid | tvOS split layout |
| **Search** | SwiftUI SearchableView | UISearchController | tvOS keyboard UI |

### SwiftUI Component Examples

#### FocusableCard (Cross-Platform)

```swift
// UI/Components/Common/FocusableCard.swift

import SwiftUI

struct FocusableCard<Content: View>: View {
    let content: Content
    let onSelect: () -> Void

    @Environment(\.isFocused) private var isFocused
    @State private var isPressed = false

    init(onSelect: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.onSelect = onSelect
        self.content = content()
    }

    var body: some View {
        content
            .frame(width: 300, height: 450)
            .background(Color.cardBackground)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
            // tvOS focus effect
            .scaleEffect(isFocused ? 1.1 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isFocused)
            // tvOS press effect
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .onPressGesture {
                isPressed = true
            } onRelease: {
                isPressed = false
                onSelect()
            }
            // Accessibility
            .accessibilityElement(children: .contain)
            .accessibilityAddTraits(isFocused ? [.isButton, .isSelected] : .isButton)
    }
}

// Environment key for focus state
private struct IsFocusedKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var isFocused: Bool {
        get { self[IsFocusedKey.self] }
        set { self[IsFocusedKey.self] = newValue }
    }
}
```

#### MetadataCard

```swift
// UI/Components/Common/MetadataCard.swift

import SwiftUI

struct MetadataCard: View {
    let metadata: ContentMetadata
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Poster image
            AsyncImageView(url: metadata.posterURL)
                .aspectRatio(2/3, contentMode: .fill)
                .clipped()

            VStack(alignment: .leading, spacing: 6) {
                // Title
                Text(metadata.title)
                    .font(.headline)
                    .lineLimit(2)

                // Metadata row (year, rating)
                HStack {
                    if let year = metadata.year {
                        Text(year)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    RatingBadge(rating: metadata.rating)
                }

                // Genres
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(metadata.genres, id: \.self) { genre in
                            GenrePill(text: genre)
                        }
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .background(Color.cardBackground)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        .onTapGesture {
            onTap()
        }
    }
}
```

### tvOS-Specific Components

#### TVCardButton (TVUIKit-Style Parallax)

```swift
// UI/Components/tvOS/TVCardButton.swift

#if os(tvOS)
import SwiftUI

struct TVCardButton<Content: View>: View {
    let content: Content
    let onSelect: () -> Void

    @FocusState private var isFocused: Bool
    @State private var parallaxOffset: CGSize = .zero

    init(onSelect: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.onSelect = onSelect
        self.content = content()
    }

    var body: some View {
        content
            .frame(width: 400, height: 600)
            .background(Color.cardBackground)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
            // Parallax effect on focus
            .offset(parallaxOffset)
            .scaleEffect(isFocused ? 1.15 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isFocused)
            .focusable(isFocused: $isFocused)
            // Parallax motion
            .onChange(of: isFocused) { focused in
                if focused {
                    // Add subtle motion when focused
                    withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                        parallaxOffset = CGSize(width: 5, height: 5)
                    }
                } else {
                    parallaxOffset = .zero
                }
            }
            .onPlayPauseCommand {
                onSelect()
            }
            .onExitCommand {
                isFocused = false
            }
    }
}
#endif
```

#### TVTopShelfView (Top Shelf Content Provider)

```swift
// TV/TopShelf/TopShelfProvider.swift

#if os(tvOS)
import TVServices

class TopShelfProvider: TVTopShelfContentProvider {
    override func loadTopShelfContent(completionHandler: @escaping (TVTopShelfContent?) -> Void) {
        // Fetch continue watching from Rust SDK
        Task {
            do {
                let watchProgress = try await WatchProgressRepository.shared.getContinueWatching(limit: 5)
                let items = watchProgress.map { item in
                    TVTopShelfSectionedItem(identifier: item.contentId)
                        .setImageURL(item.posterURL, for: .screenScale1x)
                        .setTitle(item.title)
                        .setPlayAction(URL(string: "nuvio://play/\(item.contentId)")!)
                }

                let section = TVTopShelfItemCollection(items: items)
                section.title = "Continue Watching"

                let content = TVTopShelfSectionedContent(sections: [section])
                completionHandler(content)
            } catch {
                completionHandler(nil)
            }
        }
    }
}
#endif
```

### Accessibility Support

```swift
// UI/Components/Common/AccessibleCard.swift

import SwiftUI

extension View {
    func makeAccessible(
        label: String,
        hint: String? = nil,
        traits: AccessibilityTraits = []
    ) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(traits)
    }
}

// Usage
MetadataCard(metadata: movie, onTap: { /* ... */ })
    .makeAccessible(
        label: "\(movie.title), rated \(movie.rating) stars",
        hint: "Double-tap to view details",
        traits: .isButton
    )
```

---

## Data Binding Patterns

### MVVM Architecture

```
View (SwiftUI) ↔ ViewModel (@Published) ↔ Repository (FFI) ↔ Rust SDK
```

### ViewModel Pattern

```swift
// Presentation/ViewModels/CatalogViewModel.swift

import Foundation
import Combine

@MainActor
class CatalogViewModel: ObservableObject {
    // MARK: - Published Properties (UI Binding)

    @Published var state: CatalogUiState = .loading
    @Published var catalogItems: [ContentItem] = []
    @Published var selectedAddon: Addon?
    @Published var errorMessage: String?

    // MARK: - Dependencies

    private let catalogRepository: CatalogRepository
    private let metadataRepository: MetadataRepository
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init(
        catalogRepository: CatalogRepository,
        metadataRepository: MetadataRepository
    ) {
        self.catalogRepository = catalogRepository
        self.metadataRepository = metadataRepository
    }

    // MARK: - Public Methods

    func loadCatalog(addonId: String, catalogId: String) async {
        state = .loading

        do {
            let items = try await catalogRepository.loadCatalog(
                addonId: addonId,
                catalogId: catalogId
            )

            catalogItems = items
            state = .loaded(items)
        } catch {
            errorMessage = error.localizedDescription
            state = .error(error)
        }
    }

    func searchCatalog(query: String) async {
        guard !query.isEmpty else {
            catalogItems = []
            return
        }

        state = .searching

        do {
            let results = try await catalogRepository.search(query: query)
            catalogItems = results
            state = .loaded(results)
        } catch {
            errorMessage = error.localizedDescription
            state = .error(error)
        }
    }

    func refreshCatalogs() async {
        do {
            try await catalogRepository.refreshCatalogs()

            // Reload current catalog
            if let addon = selectedAddon, let catalogId = addon.catalogs.first?.id {
                await loadCatalog(addonId: addon.id, catalogId: catalogId)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - UI State

enum CatalogUiState {
    case loading
    case searching
    case loaded([ContentItem])
    case error(Error)
    case empty
}
```

### Repository Pattern

```swift
// Domain/Repositories/Protocols/CatalogRepository.swift

import Foundation

protocol CatalogRepository {
    func addAddon(url: String) async throws -> Addon
    func removeAddon(addonId: String) async throws
    func getAllAddons() async throws -> [Addon]
    func loadCatalog(addonId: String, catalogId: String) async throws -> [ContentItem]
    func search(query: String) async throws -> [ContentItem]
    func refreshCatalogs() async throws
}

// Data/Repositories/Implementations/CatalogRepositoryImpl.swift

import Foundation

class CatalogRepositoryImpl: CatalogRepository {
    private let catalogManager: NuvioCatalogManager
    private let mapper: CatalogMapper

    init(catalogManager: NuvioCatalogManager, mapper: CatalogMapper) {
        self.catalogManager = catalogManager
        self.mapper = mapper
    }

    func loadCatalog(addonId: String, catalogId: String) async throws -> [ContentItem] {
        // Call Rust FFI function (async)
        return try await withCheckedThrowingContinuation { continuation in
            var error = NuvioError()
            var count: Int = 0

            let itemsPtr = nuvio_catalog_manager_load_catalog(
                catalogManager.handle,
                addonId,
                catalogId,
                &count,
                &error
            )

            if error.code != NUVIO_ERROR_NONE {
                defer { nuvio_free_error(error) }
                continuation.resume(throwing: NuvioSDKError.from(ffiError: error))
                return
            }

            guard let ptr = itemsPtr else {
                continuation.resume(returning: [])
                return
            }
            defer { nuvio_free_content_item_array(ptr, count) }

            // Map FFI types to domain types
            var items: [ContentItem] = []
            for i in 0..<count {
                if let itemPtr = ptr.advanced(by: i).pointee {
                    items.append(mapper.mapContentItem(from: itemPtr.pointee))
                }
            }

            continuation.resume(returning: items)
        }
    }

    func search(query: String) async throws -> [ContentItem] {
        // Similar implementation...
        fatalError("Not yet implemented")
    }

    // ... other methods
}
```

### Combine Publishers for Reactive Data

```swift
// Domain/Repositories/Protocols/WatchProgressRepository.swift

import Foundation
import Combine

protocol WatchProgressRepository {
    func startSession(contentId: String) async throws -> String
    func updateProgress(sessionId: String, position: UInt32, duration: UInt32) async throws
    func endSession(sessionId: String) async throws
    func getResumePoint(contentId: String) async throws -> UInt32?

    // Combine publisher for watch progress updates
    var watchProgressPublisher: AnyPublisher<WatchProgress, Never> { get }
}

// Implementation
class WatchProgressRepositoryImpl: WatchProgressRepository {
    private let watchProgressTracker: NuvioWatchProgressTracker
    private let progressSubject = PassthroughSubject<WatchProgress, Never>()

    var watchProgressPublisher: AnyPublisher<WatchProgress, Never> {
        progressSubject.eraseToAnyPublisher()
    }

    func updateProgress(sessionId: String, position: UInt32, duration: UInt32) async throws {
        // Update progress in Rust SDK
        try await withCheckedThrowingContinuation { continuation in
            var error = NuvioError()

            nuvio_watch_progress_tracker_update_progress(
                watchProgressTracker.handle,
                sessionId,
                position,
                duration,
                &error
            )

            if error.code != NUVIO_ERROR_NONE {
                defer { nuvio_free_error(error) }
                continuation.resume(throwing: NuvioSDKError.from(ffiError: error))
                return
            }

            continuation.resume()
        }

        // Emit progress update to subscribers
        let progress = WatchProgress(sessionId: sessionId, position: position, duration: duration)
        progressSubject.send(progress)
    }
}

// Usage in ViewModel
class PlayerViewModel: ObservableObject {
    @Published var watchProgress: WatchProgress?

    private let watchProgressRepository: WatchProgressRepository
    private var cancellables = Set<AnyCancellable>()

    init(watchProgressRepository: WatchProgressRepository) {
        self.watchProgressRepository = watchProgressRepository

        // Subscribe to watch progress updates
        watchProgressRepository.watchProgressPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] progress in
                self?.watchProgress = progress
            }
            .store(in: &cancellables)
    }
}
```

---

## iOS/tvOS Lifecycle Integration

### App Lifecycle

```swift
// App/NuvioTVApp.swift

import SwiftUI

@main
struct NuvioTVApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var appState = AppState()

    init() {
        // Initialize Rust SDK on app launch
        initializeSDK()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .onAppear {
                    appState.onAppear()
                }
                .onDisappear {
                    appState.onDisappear()
                }
        }
    }

    private func initializeSDK() {
        let storageURL = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .path

        nuvio_initialize(storageURL, "Info")
    }
}

// App state manager
class AppState: ObservableObject {
    @Published var isInitialized = false

    private let accountRepository: AccountRepository
    private let performanceMonitor: PerformanceMonitor

    init() {
        // Inject dependencies
        self.accountRepository = DIContainer.shared.resolve()
        self.performanceMonitor = DIContainer.shared.resolve()
    }

    func onAppear() {
        Task {
            // Initialize account state
            try? await accountRepository.initialize()
            isInitialized = true
        }
    }

    func onDisappear() {
        // Save state before app terminates
        performanceMonitor.recordAppSessionEnd()
    }
}
```

### AppDelegate (Legacy Lifecycle Events)

```swift
// App/AppDelegate.swift

import UIKit
import GoogleCast

class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Google Cast setup (existing code)
        #if canImport(GoogleCast) && os(iOS)
        let receiverAppID = "CC1AD845"
        let criteria = GCKDiscoveryCriteria(applicationID: receiverAppID)
        let options = GCKCastOptions(discoveryCriteria: criteria)
        options.disableDiscoveryAutostart = false
        options.startDiscoveryAfterFirstTapOnCastButton = true
        options.suspendSessionsWhenBackgrounded = true
        GCKCastContext.setSharedInstanceWith(options)
        GCKCastContext.sharedInstance().useDefaultExpandedMediaControls = true
        #endif

        return true
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Shutdown Rust SDK
        nuvio_shutdown()
    }

    func applicationDidReceiveMemoryWarning(_ application: UIApplication) {
        // Notify Rust SDK to clear caches
        // (implement FFI function nuvio_clear_caches)
        // nuvio_clear_caches()
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey : Any] = [:]
    ) -> Bool {
        // Handle deep links
        return DeepLinkHandler.shared.handle(url: url)
    }
}
```

### Memory Pressure Handling

```swift
// Core/Utilities/MemoryPressureMonitor.swift

import Foundation

class MemoryPressureMonitor {
    static let shared = MemoryPressureMonitor()

    private var dispatchSource: DispatchSourceMemoryPressure?

    func startMonitoring() {
        dispatchSource = DispatchSource.makeMemoryPressureSource(
            eventMask: [.warning, .critical],
            queue: .main
        )

        dispatchSource?.setEventHandler { [weak self] in
            guard let self = self else { return }

            let event = self.dispatchSource?.data

            if event?.contains(.warning) == true {
                // Memory warning: clear caches
                self.handleMemoryWarning()
            }

            if event?.contains(.critical) == true {
                // Critical: aggressively free memory
                self.handleMemoryCritical()
            }
        }

        dispatchSource?.resume()
    }

    private func handleMemoryWarning() {
        // Clear image caches
        URLCache.shared.removeAllCachedResponses()

        // Notify Rust SDK (if FFI function exists)
        // nuvio_clear_caches()
    }

    private func handleMemoryCritical() {
        handleMemoryWarning()

        // More aggressive cleanup
        // nuvio_clear_all_caches()
    }
}
```

---

## Threading Model

### Swift Concurrency (async/await)

**Primary Threading Model:** Swift's structured concurrency (iOS 15+, tvOS 15+)

```swift
// ViewModel using async/await
@MainActor
class MetadataViewModel: ObservableObject {
    @Published var movie: Movie?
    @Published var isLoading = false
    @Published var error: Error?

    private let metadataRepository: MetadataRepository

    func loadMovie(tmdbId: UInt32) async {
        isLoading = true
        defer { isLoading = false }

        do {
            // FFI call bridged to async/await
            movie = try await metadataRepository.getMovie(tmdbId: tmdbId)
        } catch {
            self.error = error
        }
    }

    // Multiple async operations in parallel
    func loadMovieWithCredits(tmdbId: UInt32) async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Run both operations concurrently
            async let movieTask = metadataRepository.getMovie(tmdbId: tmdbId)
            async let creditsTask = metadataRepository.getCredits(tmdbId: tmdbId, contentType: .movie)

            let (movie, credits) = try await (movieTask, creditsTask)

            self.movie = movie
            // Process credits...
        } catch {
            self.error = error
        }
    }
}
```

### Grand Central Dispatch (GCD) for Legacy Code

```swift
// Background work with GCD
class DownloadService {
    private let queue = DispatchQueue(
        label: "com.nuvio.download",
        qos: .userInitiated,
        attributes: .concurrent
    )

    func startDownload(url: URL) {
        queue.async {
            // Perform download on background queue
            // Call Rust FFI download function

            DispatchQueue.main.async {
                // Update UI on main queue
            }
        }
    }
}
```

### Main Actor Isolation

```swift
@MainActor
class ThemeViewModel: ObservableObject {
    // All properties and methods run on main thread
    @Published var currentTheme: Theme = .light

    func applyTheme(_ theme: Theme) {
        // Automatically runs on main thread
        currentTheme = theme
    }
}
```

### Task Cancellation

```swift
class SearchViewModel: ObservableObject {
    private var searchTask: Task<Void, Never>?

    func search(query: String) {
        // Cancel previous search
        searchTask?.cancel()

        searchTask = Task {
            // Add debounce
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms

            guard !Task.isCancelled else { return }

            do {
                let results = try await catalogRepository.search(query: query)

                guard !Task.isCancelled else { return }

                await MainActor.run {
                    self.searchResults = results
                }
            } catch {
                // Handle error
            }
        }
    }
}
```

---

## tvOS Focus Management

### Focus Engine Integration

tvOS uses a **focus engine** for D-pad navigation. The Rust SDK stores focus state, but the UI layer manages focus traversal.

### Rust FFI Focus State

```rust
// Rust FocusManager (in nuvio-core)
pub struct FocusManager {
    focus_tree: HashMap<String, FocusNode>,
    current_screen: Option<String>,
    focus_history: Vec<FocusEntry>,
}

#[no_mangle]
pub extern "C" fn nuvio_focus_manager_set_focus(
    manager: *mut FocusManager,
    screen_id: *const c_char,
    element_id: *const c_char,
) {
    // Store focus state in Rust
}

#[no_mangle]
pub extern "C" fn nuvio_focus_manager_get_focused_element(
    manager: *const FocusManager,
    screen_id: *const c_char,
) -> *const c_char {
    // Retrieve last focused element for screen
}
```

### Swift Focus Management

```swift
// TV/Focus/FocusManager.swift

#if os(tvOS)
import SwiftUI

class TVFocusManager: ObservableObject {
    @Published var focusedElement: String?

    private let focusManagerHandle: OpaquePointer

    init() {
        // Initialize Rust FocusManager
        self.focusManagerHandle = nuvio_focus_manager_new()
    }

    deinit {
        nuvio_focus_manager_free(focusManagerHandle)
    }

    func setFocus(screenId: String, elementId: String) {
        nuvio_focus_manager_set_focus(
            focusManagerHandle,
            screenId,
            elementId
        )
        focusedElement = elementId
    }

    func getFocusedElement(screenId: String) -> String? {
        let cString = nuvio_focus_manager_get_focused_element(
            focusManagerHandle,
            screenId
        )

        guard let ptr = cString else { return nil }
        defer { nuvio_free_string(ptr) }

        return String(cString: ptr)
    }

    func restoreFocus(screenId: String) {
        if let elementId = getFocusedElement(screenId: screenId) {
            focusedElement = elementId
        }
    }
}
#endif
```

### SwiftUI Focus Management

```swift
// UI/Screens/Catalog/CatalogViewTV.swift

#if os(tvOS)
import SwiftUI

struct CatalogViewTV: View {
    @StateObject private var viewModel: CatalogViewModel
    @EnvironmentObject private var focusManager: TVFocusManager
    @FocusState private var focusedItem: String?

    var body: some View {
        ScrollView {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 400))],
                spacing: 40
            ) {
                ForEach(viewModel.catalogItems) { item in
                    TVCardButton(onSelect: {
                        viewModel.selectItem(item)
                    }) {
                        MetadataCard(metadata: item, onTap: {})
                    }
                    .focused($focusedItem, equals: item.id)
                    .onChange(of: focusedItem) { newValue in
                        if newValue == item.id {
                            // Notify Rust SDK of focus change
                            focusManager.setFocus(
                                screenId: "catalog",
                                elementId: item.id
                            )
                        }
                    }
                }
            }
            .padding(60)
        }
        .onAppear {
            // Restore focus when screen appears
            focusManager.restoreFocus(screenId: "catalog")
            focusedItem = focusManager.focusedElement
        }
    }
}
#endif
```

### Focus Guide (Custom Navigation)

```swift
// TV/Focus/TVFocusGuide.swift

#if os(tvOS)
import SwiftUI

struct TVFocusGuideView: View {
    let from: AnyView
    let to: AnyView

    var body: some View {
        // Use UIKit UIFocusGuide for custom focus navigation
        FocusGuideRepresentable(from: from, to: to)
    }
}

struct FocusGuideRepresentable: UIViewRepresentable {
    let from: AnyView
    let to: AnyView

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        let focusGuide = UIFocusGuide()
        view.addLayoutGuide(focusGuide)

        // Configure focus guide to redirect focus
        // (requires UIKit integration)

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        // Update focus guide if needed
    }
}
#endif
```

---

## Navigation Architecture

### iOS Navigation (SwiftUI)

```swift
// UI/Navigation/Router.swift

import SwiftUI

@MainActor
class Router: ObservableObject {
    @Published var path = NavigationPath()

    func navigate(to route: Route) {
        path.append(route)
    }

    func pop() {
        guard !path.isEmpty else { return }
        path.removeLast()
    }

    func popToRoot() {
        path = NavigationPath()
    }
}

enum Route: Hashable {
    case home
    case catalog(addonId: String)
    case detail(contentId: String)
    case player(contentId: String, streamURL: URL)
    case search
    case library
    case settings
    case profile
    case downloads
}

// UI/Navigation/NavigationStack.swift

struct RootView: View {
    @StateObject private var router = Router()

    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: Route.self) { route in
                    destination(for: route)
                }
        }
        .environmentObject(router)
    }

    @ViewBuilder
    private func destination(for route: Route) -> some View {
        switch route {
        case .home:
            HomeView()
        case .catalog(let addonId):
            CatalogView(addonId: addonId)
        case .detail(let contentId):
            DetailView(contentId: contentId)
        case .player(let contentId, let streamURL):
            PlayerView(contentId: contentId, streamURL: streamURL)
        case .search:
            SearchView()
        case .library:
            LibraryView()
        case .settings:
            SettingsView()
        case .profile:
            ProfileSelectionView()
        case .downloads:
            DownloadsView()
        }
    }
}
```

### tvOS Navigation (UIKit + SwiftUI Hybrid)

```swift
// UI/Navigation/NavigationTV.swift

#if os(tvOS)
import UIKit
import SwiftUI

class TVNavigationController: UINavigationController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Set up root view controller
        let homeVC = UIHostingController(rootView: HomeViewTV())
        setViewControllers([homeVC], animated: false)

        // Hide navigation bar (custom TV UI)
        navigationBar.isHidden = true
    }

    func navigate(to route: Route) {
        let viewController: UIViewController

        switch route {
        case .catalog(let addonId):
            viewController = UIHostingController(rootView: CatalogViewTV(addonId: addonId))
        case .detail(let contentId):
            viewController = UIHostingController(rootView: DetailViewTV(contentId: contentId))
        case .player(let contentId, let streamURL):
            viewController = TVPlayerViewController(contentId: contentId, streamURL: streamURL)
        default:
            viewController = UIHostingController(rootView: HomeViewTV())
        }

        pushViewController(viewController, animated: true)
    }
}
#endif
```

---

## Video Player Integration

### AVPlayer Integration

```swift
// Player/AVPlayerManager.swift

import AVFoundation
import AVKit
import Combine

class AVPlayerManager: ObservableObject {
    @Published var player: AVPlayer?
    @Published var playerItem: AVPlayerItem?
    @Published var playbackState: PlaybackState = .idle
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var isPlaying = false

    private var timeObserver: Any?
    private var cancellables = Set<AnyCancellable>()

    private let watchProgressRepository: WatchProgressRepository
    private var sessionId: String?

    init(watchProgressRepository: WatchProgressRepository) {
        self.watchProgressRepository = watchProgressRepository
    }

    func loadStream(contentId: String, url: URL, subtitles: [Subtitle] = []) {
        // Create AVPlayerItem
        playerItem = AVPlayerItem(url: url)

        // Add subtitles
        for subtitle in subtitles {
            if let subtitleURL = URL(string: subtitle.url) {
                let subtitleAsset = AVURLAsset(url: subtitleURL)
                let subtitleGroup = AVMediaSelectionGroup()
                // Configure subtitle track
            }
        }

        // Create AVPlayer
        player = AVPlayer(playerItem: playerItem)

        // Add observers
        addObservers()

        // Start watch session
        Task {
            sessionId = try? await watchProgressRepository.startSession(contentId: contentId)
        }

        playbackState = .ready
    }

    func play() {
        player?.play()
        isPlaying = true
        playbackState = .playing
    }

    func pause() {
        player?.pause()
        isPlaying = false
        playbackState = .paused
    }

    func seek(to time: Double) {
        let cmTime = CMTime(seconds: time, preferredTimescale: 600)
        player?.seek(to: cmTime)
    }

    private func addObservers() {
        // Periodic time observer (for watch progress)
        timeObserver = player?.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 1, preferredTimescale: 600),
            queue: .main
        ) { [weak self] time in
            guard let self = self else { return }

            self.currentTime = time.seconds

            // Update watch progress every 5 seconds
            if Int(time.seconds) % 5 == 0, let sessionId = self.sessionId {
                Task {
                    try? await self.watchProgressRepository.updateProgress(
                        sessionId: sessionId,
                        position: UInt32(time.seconds),
                        duration: UInt32(self.duration)
                    )
                }
            }
        }

        // Duration observer
        playerItem?.publisher(for: \.duration)
            .sink { [weak self] duration in
                self?.duration = duration.seconds
            }
            .store(in: &cancellables)

        // Playback state observer
        player?.publisher(for: \.rate)
            .sink { [weak self] rate in
                self?.isPlaying = rate > 0
            }
            .store(in: &cancellables)

        // Playback end observer
        NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime)
            .sink { [weak self] _ in
                self?.onPlaybackEnd()
            }
            .store(in: &cancellables)
    }

    private func onPlaybackEnd() {
        playbackState = .ended

        // End watch session
        if let sessionId = sessionId {
            Task {
                try? await watchProgressRepository.endSession(sessionId: sessionId)
            }
        }
    }

    deinit {
        if let observer = timeObserver {
            player?.removeTimeObserver(observer)
        }
    }
}

enum PlaybackState {
    case idle
    case ready
    case playing
    case paused
    case buffering
    case ended
    case error(Error)
}
```

### PlayerView (SwiftUI)

```swift
// UI/Screens/Player/PlayerView.swift

import SwiftUI
import AVKit

struct PlayerView: View {
    let contentId: String
    let streamURL: URL

    @StateObject private var viewModel: PlayerViewModel
    @StateObject private var playerManager: AVPlayerManager
    @Environment(\.dismiss) private var dismiss

    init(contentId: String, streamURL: URL) {
        self.contentId = contentId
        self.streamURL = streamURL

        // Inject dependencies
        let watchProgressRepo = DIContainer.shared.resolve(WatchProgressRepository.self)!
        _playerManager = StateObject(wrappedValue: AVPlayerManager(watchProgressRepository: watchProgressRepo))
        _viewModel = StateObject(wrappedValue: PlayerViewModel(contentId: contentId))
    }

    var body: some View {
        ZStack {
            if let player = playerManager.player {
                VideoPlayer(player: player) {
                    // Custom controls overlay
                    PlayerControlsView(
                        playerManager: playerManager,
                        onClose: {
                            dismiss()
                        }
                    )
                }
                .ignoresSafeArea()
            } else {
                LoadingView()
            }
        }
        .onAppear {
            playerManager.loadStream(
                contentId: contentId,
                url: streamURL,
                subtitles: viewModel.subtitles
            )
        }
    }
}
```

### tvOS Player (AVPlayerViewController)

```swift
// UI/Screens/Player/PlayerViewTV.swift

#if os(tvOS)
import UIKit
import AVKit

class TVPlayerViewController: AVPlayerViewController {
    private let contentId: String
    private let streamURL: URL
    private let playerManager: AVPlayerManager

    init(contentId: String, streamURL: URL) {
        self.contentId = contentId
        self.streamURL = streamURL

        // Inject dependencies
        let watchProgressRepo = DIContainer.shared.resolve(WatchProgressRepository.self)!
        self.playerManager = AVPlayerManager(watchProgressRepository: watchProgressRepo)

        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Load stream
        playerManager.loadStream(
            contentId: contentId,
            url: streamURL
        )

        player = playerManager.player

        // Auto-play
        playerManager.play()
    }
}
#endif
```

---

## State Management

### ObservableObject + @Published

**Primary State Management Pattern:** SwiftUI's `ObservableObject` protocol with `@Published` properties.

```swift
class AppStateManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentProfile: Profile?
    @Published var theme: Theme = .dark

    private let accountRepository: AccountRepository
    private let profileRepository: ProfileRepository

    init(
        accountRepository: AccountRepository,
        profileRepository: ProfileRepository
    ) {
        self.accountRepository = accountRepository
        self.profileRepository = profileRepository

        // Load state on init
        Task {
            await loadState()
        }
    }

    @MainActor
    private func loadState() async {
        // Load authentication state
        isAuthenticated = await accountRepository.isAuthenticated()

        // Load active profile
        currentProfile = try? await profileRepository.getActiveProfile()
    }
}
```

### Environment Objects

```swift
// App/NuvioTVApp.swift

@main
struct NuvioTVApp: App {
    @StateObject private var appState = AppStateManager(
        accountRepository: DIContainer.shared.resolve()!,
        profileRepository: DIContainer.shared.resolve()!
    )

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
        }
    }
}

// Usage in views
struct HomeView: View {
    @EnvironmentObject private var appState: AppStateManager

    var body: some View {
        if appState.isAuthenticated {
            ContentView()
        } else {
            LoginView()
        }
    }
}
```

### Combine for Complex Flows

```swift
// Example: Combine multiple publishers
class DownloadViewModel: ObservableObject {
    @Published var downloads: [Download] = []
    @Published var usedStorage: UInt64 = 0
    @Published var quotaLimit: UInt64 = 10 * 1024 * 1024 * 1024 // 10 GB

    private let downloadRepository: DownloadRepository
    private var cancellables = Set<AnyCancellable>()

    init(downloadRepository: DownloadRepository) {
        self.downloadRepository = downloadRepository

        // Combine publishers for reactive updates
        Publishers.CombineLatest(
            downloadRepository.downloadsPublisher,
            downloadRepository.storagePublisher
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] downloads, storage in
            self?.downloads = downloads
            self?.usedStorage = storage
        }
        .store(in: &cancellables)
    }
}
```

---

## Build Configuration

### Xcode Build Targets

1. **NuvioTV (iOS)** - iPhone/iPad target
2. **NuvioTV (tvOS)** - Apple TV target
3. **NuvioSDK** - FFI framework (static library wrapper)
4. **NuvioTVTests** - Unit tests
5. **NuvioTVUITests** - UI tests

### Rust Static Library Integration

**Build Script:** `ios/build-rust-ios.sh`

```bash
#!/bin/bash
# Build Rust static library for iOS/tvOS

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUST_DIR="$PROJECT_ROOT/rust-sdk"
OUTPUT_DIR="$PROJECT_ROOT/ios/NuvioSDK/lib"

# Build for iOS (ARM64 + Simulator)
cd "$RUST_DIR"

# iOS device (arm64)
cargo build --release --target aarch64-apple-ios

# iOS simulator (arm64, x86_64)
cargo build --release --target aarch64-apple-ios-sim
cargo build --release --target x86_64-apple-ios

# Create universal library for simulator
lipo -create \
    target/aarch64-apple-ios-sim/release/libnuvio_core.a \
    target/x86_64-apple-ios/release/libnuvio_core.a \
    -output target/universal-ios-sim/release/libnuvio_core.a

# Build for tvOS (ARM64 + Simulator)
cargo build --release --target aarch64-apple-tvos

# tvOS simulator (arm64, x86_64)
cargo build --release --target aarch64-apple-tvos-sim
cargo build --release --target x86_64-apple-tvos

# Create universal library for simulator
lipo -create \
    target/aarch64-apple-tvos-sim/release/libnuvio_core.a \
    target/x86_64-apple-tvos/release/libnuvio_core.a \
    -output target/universal-tvos-sim/release/libnuvio_core.a

# Copy libraries to output directory
mkdir -p "$OUTPUT_DIR/ios"
mkdir -p "$OUTPUT_DIR/ios-sim"
mkdir -p "$OUTPUT_DIR/tvos"
mkdir -p "$OUTPUT_DIR/tvos-sim"

cp target/aarch64-apple-ios/release/libnuvio_core.a "$OUTPUT_DIR/ios/"
cp target/universal-ios-sim/release/libnuvio_core.a "$OUTPUT_DIR/ios-sim/"
cp target/aarch64-apple-tvos/release/libnuvio_core.a "$OUTPUT_DIR/tvos/"
cp target/universal-tvos-sim/release/libnuvio_core.a "$OUTPUT_DIR/tvos-sim/"

echo "✅ Rust libraries built successfully"
```

### Xcode Build Phases

**Run Script Phase (Build Rust Before Compile):**

```bash
# Run script phase in Xcode: Build > New Run Script Phase

# Build Rust library before compiling Swift
"$PROJECT_DIR/build-rust-ios.sh"

# Generate UniFFI bindings
cd "$PROJECT_DIR/../rust-sdk"
uniffi-bindgen generate \
    --library ./target/aarch64-apple-ios/release/libnuvio_core.a \
    --language swift \
    --out-dir "$PROJECT_DIR/NuvioTV/Data/FFI/Generated"
```

### Info.plist Configuration

```xml
<!-- ios/NuvioTV/Info.plist -->
<dict>
    <key>CFBundleDisplayName</key>
    <string>NuvioTV</string>

    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>

    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
        <!-- Allow loading streams from HTTP if needed -->
    </dict>

    <!-- tvOS Top Shelf Extension -->
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.tv.top-shelf-provider</string>
    </dict>
</dict>
```

---

## Testing Strategy

### Unit Tests (XCTest)

```swift
// NuvioTVTests/ViewModelTests/CatalogViewModelTests.swift

import XCTest
@testable import NuvioTV

class CatalogViewModelTests: XCTestCase {
    var viewModel: CatalogViewModel!
    var mockRepository: MockCatalogRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockCatalogRepository()
        viewModel = CatalogViewModel(
            catalogRepository: mockRepository,
            metadataRepository: MockMetadataRepository()
        )
    }

    func testLoadCatalog_Success() async throws {
        // Given
        let expectedItems = [
            ContentItem(id: "1", title: "Movie 1"),
            ContentItem(id: "2", title: "Movie 2"),
        ]
        mockRepository.catalogItems = expectedItems

        // When
        await viewModel.loadCatalog(addonId: "addon1", catalogId: "catalog1")

        // Then
        XCTAssertEqual(viewModel.catalogItems, expectedItems)
        XCTAssertEqual(viewModel.state, .loaded(expectedItems))
    }

    func testSearchCatalog_ReturnsResults() async throws {
        // Given
        let query = "action"
        let expectedResults = [ContentItem(id: "1", title: "Action Movie")]
        mockRepository.searchResults = expectedResults

        // When
        await viewModel.searchCatalog(query: query)

        // Then
        XCTAssertEqual(viewModel.catalogItems, expectedResults)
    }
}

// Mock repository for testing (no FFI calls)
class MockCatalogRepository: CatalogRepository {
    var catalogItems: [ContentItem] = []
    var searchResults: [ContentItem] = []

    func loadCatalog(addonId: String, catalogId: String) async throws -> [ContentItem] {
        return catalogItems
    }

    func search(query: String) async throws -> [ContentItem] {
        return searchResults
    }

    // ... other methods
}
```

### Repository Tests (with Mock FFI)

```swift
// NuvioTVTests/RepositoryTests/ProfileRepositoryTests.swift

import XCTest
@testable import NuvioTV

class ProfileRepositoryTests: XCTestCase {
    var repository: ProfileRepositoryImpl!
    var mockFFI: MockProfileManager!

    override func setUp() {
        super.setUp()
        mockFFI = MockProfileManager()
        repository = ProfileRepositoryImpl(
            profileManager: mockFFI,
            mapper: ProfileMapper()
        )
    }

    func testCreateProfile_Success() async throws {
        // Given
        let name = "Test Profile"
        let pin = "1234"

        // When
        let profile = try await repository.createProfile(name: name, pin: pin)

        // Then
        XCTAssertEqual(profile.name, name)
        XCTAssertTrue(profile.hasPin)
    }
}

// Mock FFI layer for testing (no Rust calls)
class MockProfileManager {
    var profiles: [Profile] = []

    func createProfile(name: String, pin: String?) -> Profile {
        let profile = Profile(
            id: UUID().uuidString,
            name: name,
            hasPin: pin != nil,
            avatarIndex: 0,
            createdAt: Date().timeIntervalSince1970,
            lastUsed: Date().timeIntervalSince1970
        )
        profiles.append(profile)
        return profile
    }
}
```

### UI Tests (XCUITest)

```swift
// NuvioTVUITests/HomeViewUITests.swift

import XCTest

class HomeViewUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app.launch()
    }

    func testHomeScreenLoads() {
        // Wait for home screen to load
        let homeTitle = app.staticTexts["Home"]
        XCTAssertTrue(homeTitle.waitForExistence(timeout: 5))
    }

    func testNavigateToCatalog() {
        // Tap on catalog button
        app.buttons["Catalog"].tap()

        // Verify catalog screen loads
        let catalogTitle = app.staticTexts["Catalog"]
        XCTAssertTrue(catalogTitle.waitForExistence(timeout: 5))
    }
}
```

### Performance Tests

```swift
// NuvioTVTests/PerformanceTests/FFIPerformanceTests.swift

import XCTest
@testable import NuvioTV

class FFIPerformanceTests: XCTestCase {
    func testProfileLoadingPerformance() {
        let repository = DIContainer.shared.resolve(ProfileRepository.self)!

        measure {
            // Measure FFI call performance
            let expectation = self.expectation(description: "Load profiles")

            Task {
                _ = try? await repository.getAllProfiles()
                expectation.fulfill()
            }

            waitForExpectations(timeout: 1)
        }
    }

    func testCatalogSearchPerformance() {
        let repository = DIContainer.shared.resolve(CatalogRepository.self)!

        measure {
            let expectation = self.expectation(description: "Search catalog")

            Task {
                _ = try? await repository.search(query: "action")
                expectation.fulfill()
            }

            waitForExpectations(timeout: 2)
        }
    }
}
```

---

## Performance Optimization

### Image Loading & Caching

```swift
// UI/Components/Common/AsyncImageView.swift

import SwiftUI
import Kingfisher // or native AsyncImage in iOS 15+

struct AsyncImageView: View {
    let url: URL?
    var contentMode: ContentMode = .fit

    var body: some View {
        if let url = url {
            // Use Kingfisher for advanced caching
            KFImage(url)
                .placeholder {
                    ProgressView()
                }
                .retry(maxCount: 3, interval: .seconds(1))
                .cacheMemoryOnly()
                .fade(duration: 0.25)
                .resizable()
                .aspectRatio(contentMode: contentMode)
        } else {
            placeholderView
        }
    }

    private var placeholderView: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.3))
    }
}
```

### Memory Optimization

```swift
// Core/Utilities/MemoryOptimizer.swift

class MemoryOptimizer {
    static let shared = MemoryOptimizer()

    func optimizeForLowMemory() {
        // Clear image cache
        KingfisherManager.shared.cache.clearMemoryCache()

        // Clear URL cache
        URLCache.shared.removeAllCachedResponses()

        // Notify Rust SDK to clear caches (if FFI function exists)
        // nuvio_clear_caches()
    }

    func getMemoryUsage() -> UInt64 {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4

        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                         task_flavor_t(MACH_TASK_BASIC_INFO),
                         $0,
                         &count)
            }
        }

        return result == KERN_SUCCESS ? info.resident_size : 0
    }
}
```

### Lazy Loading

```swift
// UI/Components/Common/LazyContentGrid.swift

import SwiftUI

struct LazyContentGrid: View {
    let items: [ContentItem]
    let onItemTap: (ContentItem) -> Void

    var body: some View {
        ScrollView {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 300))],
                spacing: 20
            ) {
                ForEach(items) { item in
                    MetadataCard(metadata: item, onTap: {
                        onItemTap(item)
                    })
                    .onAppear {
                        // Prefetch next page when approaching end
                        if item == items[items.count - 5] {
                            // Trigger pagination
                        }
                    }
                }
            }
            .padding()
        }
    }
}
```

---

## Migration Strategy

### Phase 1: FFI Foundation (Weeks 1-4)

**Objective:** Establish Rust SDK integration with basic FFI wrapper.

1. **Build Rust SDK static libraries for iOS/tvOS**
   - Configure cargo targets (aarch64-apple-ios, aarch64-apple-tvos)
   - Set up Xcode build scripts

2. **Generate UniFFI bindings**
   - Create `.udl` interface definition
   - Generate Swift wrapper code
   - Configure bridging header

3. **Implement core repositories**
   - AccountRepository
   - ProfileRepository
   - PerformanceRepository

4. **Basic UI integration**
   - Replace existing account/profile logic with Rust SDK calls
   - Test on iOS and tvOS devices

### Phase 2: Content & Catalog (Weeks 5-8)

**Objective:** Migrate content browsing and metadata logic.

1. **Implement catalog repositories**
   - CatalogRepository
   - MetadataRepository
   - StreamRepository

2. **Update UI screens**
   - Home screen (browse catalogs)
   - Catalog screen (content grid)
   - Detail screen (metadata display)

3. **Performance testing**
   - Measure FFI call overhead
   - Optimize image loading
   - Test on low-end tvOS devices

### Phase 3: Playback & Watch Progress (Weeks 9-12)

**Objective:** Migrate video playback and watch progress tracking.

1. **Implement playback repositories**
   - StreamRepository (stream resolution)
   - WatchProgressRepository (scrobbling)

2. **Update player integration**
   - AVPlayer with Rust SDK watch progress
   - Subtitle synchronization

3. **Google Cast integration**
   - Maintain existing Cast functionality
   - Bridge watch progress to Rust SDK

### Phase 4: Downloads & Settings (Weeks 13-16)

**Objective:** Complete remaining features.

1. **Implement remaining repositories**
   - DownloadRepository
   - SettingsRepository
   - ThemeRepository

2. **Update UI screens**
   - Downloads screen
   - Settings screen

3. **Background tasks**
   - Background download service
   - Trakt sync service

### Phase 5: Testing & Optimization (Weeks 17-18)

**Objective:** Comprehensive testing and performance optimization.

1. **End-to-end testing**
   - UI tests on all screens
   - tvOS focus engine validation

2. **Performance optimization**
   - FFI call optimization
   - Memory leak detection (Instruments)
   - Battery usage profiling

3. **App Store preparation**
   - Privacy manifest
   - Compliance review

### Rollback Strategy

**Feature Flags:**
```swift
enum FeatureFlag: String {
    case useRustSDK = "use_rust_sdk"
    case rustCatalog = "rust_catalog"
    case rustProfile = "rust_profile"

    var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: rawValue)
    }
}

// Usage
if FeatureFlag.useRustSDK.isEnabled {
    // Use Rust SDK
    return try await rustCatalogRepository.loadCatalog(...)
} else {
    // Fallback to old implementation
    return try await legacyCatalogService.loadCatalog(...)
}
```

---

## Summary

This Swift native layer design provides a comprehensive architecture for migrating NuvioStreamingTV to a native iOS/tvOS implementation with Rust SDK core. The design leverages modern iOS/tvOS best practices while maintaining performance and developer ergonomics.

**Key Takeaways:**

1. **Single-Layer FFI:** iOS/tvOS benefits from direct C bridging (2x faster than Android's JNI)
2. **UniFFI-Generated Bindings:** Automated Swift wrapper generation with memory safety
3. **SwiftUI + UIKit Hybrid:** SwiftUI for declarative UI, UIKit for tvOS focus engine
4. **MVVM Architecture:** Clean separation with ObservableObject ViewModels
5. **Swift Concurrency:** async/await for FFI bridging, structured concurrency
6. **tvOS Focus Management:** Rust SDK stores state, SwiftUI manages UI focus
7. **AVPlayer Integration:** Native video playback with watch progress tracking
8. **18-Week Migration Plan:** Phased approach with feature flags for rollback

**Performance Expectations:**

- **FFI Call Overhead:** 20-50μs (2x faster than Android)
- **Memory Footprint:** 100-160 MB (30-40% reduction vs React Native)
- **Startup Time:** 1-2 seconds (2-3x faster than React Native)
- **Battery Life:** 10-15% improvement (native efficiency)

**Next Steps:**

1. Review and approve this Swift native layer design
2. Set up Rust SDK build scripts for iOS/tvOS
3. Generate UniFFI bindings and configure Xcode project
4. Implement Phase 1 repositories (Account, Profile, Performance)
5. Begin SwiftUI screen development with FFI integration

---

**Document Status:** Complete ✅
**Review Required:** iOS/tvOS engineers, architecture team
**Implementation Ready:** Yes (pending approval)
