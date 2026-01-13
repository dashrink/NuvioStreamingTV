# Kotlin (Android) Native Layer Architecture Design

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Project:** NuvioStreamingTV Tri-Layer Architecture Migration
**Purpose:** Define Kotlin native layer architecture, JNI integration patterns, UI component design, and data binding strategies for Android/Android TV platforms

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Kotlin Package Structure](#kotlin-package-structure)
3. [JNI Two-Layer Binding Pattern](#jni-two-layer-binding-pattern)
4. [UI Component Architecture](#ui-component-architecture)
5. [Data Binding Patterns](#data-binding-patterns)
6. [Android Lifecycle Integration](#android-lifecycle-integration)
7. [Threading Model](#threading-model)
8. [Android TV Focus Management](#android-tv-focus-management)
9. [Navigation Architecture](#navigation-architecture)
10. [Video Player Integration](#video-player-integration)
11. [State Management](#state-management)
12. [Build Configuration](#build-configuration)
13. [Testing Strategy](#testing-strategy)
14. [Performance Optimization](#performance-optimization)
15. [Migration Strategy](#migration-strategy)

---

## Executive Summary

This document defines the Kotlin native layer architecture for NuvioStreamingTV's Android and Android TV platforms. The design bridges the Rust SDK core with native Android UI through a two-layer FFI binding pattern (Rust → C ABI → JNI → Kotlin), leveraging modern Android best practices including Jetpack Compose, Coroutines, Flow, and the Android TV Leanback library.

### Design Principles

1. **UniFFI-Generated Bindings** - Automated FFI layer reduces boilerplate and prevents memory bugs
2. **Kotlin Coroutines** - Async operations bridge seamlessly from Rust futures to Kotlin suspend functions
3. **Jetpack Compose** - Modern declarative UI for both mobile and TV
4. **MVVM Architecture** - Clean separation: View (Compose) ↔ ViewModel (business logic bridge) ↔ Repository (FFI layer)
5. **Android TV Leanback** - TV-optimized navigation with D-pad focus management
6. **Lifecycle-Aware** - All FFI resources managed by Android lifecycle components
7. **Type-Safe** - Leverage Kotlin's null safety and sealed classes for error handling
8. **Testable** - Dependency injection with Hilt; repository pattern enables testing without FFI

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Android/Android TV Application                │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              UI Layer (Jetpack Compose)                      │   │
│  │  • Composable Screens                                         │   │
│  │  • TV Leanback Components (BrowseFragment, DetailsFragment)  │   │
│  │  • Focus Management (FocusRequester, FocusGroup)             │   │
│  │  • Theme System                                               │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                        │
│  ┌───────────────────────────▼──────────────────────────────────┐   │
│  │          Presentation Layer (ViewModels)                     │   │
│  │  • StateFlow<UiState> for reactive UI updates                │   │
│  │  • Lifecycle-aware (viewModelScope)                          │   │
│  │  • Coroutines bridge to Rust async                           │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                        │
│  ┌───────────────────────────▼──────────────────────────────────┐   │
│  │            Repository Layer (Data Sources)                   │   │
│  │  • AccountRepository, CatalogRepository, etc.                │   │
│  │  • FFI call abstraction & error mapping                      │   │
│  │  • Flow-based reactive data streams                          │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                        │
│  ┌───────────────────────────▼──────────────────────────────────┐   │
│  │          FFI Binding Layer (UniFFI-Generated)                │   │
│  │  • Kotlin data classes (Profile, Stream, Catalog)            │   │
│  │  • Suspend function wrappers                                 │   │
│  │  • Sealed class error types                                  │   │
│  │  • Memory management (Arc<T> handled by UniFFI)              │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────────┘
                               │ JNI Boundary
                               │ (UniFFI-generated JNI wrappers)
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

- **Package Count:** ~15 Kotlin packages
- **ViewModel Classes:** ~20 (one per major screen + shared ViewModels)
- **Repository Classes:** ~12 (matching Rust SDK modules)
- **Jetpack Compose Screens:** ~20 (mobile + TV variants)
- **FFI-Generated Kotlin Classes:** ~50 data classes/interfaces
- **Target Android API:** 35 (Android 15), Min API: 21 (Android 5.0)
- **Target Android TV API:** 35, Min API: 21 (Lollipop TV)

---

## Kotlin Package Structure

### Top-Level Package Organization

```
com.nuvio.app/
├── NuvioApplication.kt                    # Application class (DI initialization)
│
├── ui/                                    # UI Layer (Jetpack Compose)
│   ├── theme/                             # Theme system
│   │   ├── Theme.kt                       # Material3/TV theme definitions
│   │   ├── Color.kt                       # Color palette
│   │   ├── Typography.kt                  # Text styles
│   │   └── Shapes.kt                      # Corner radius, elevation
│   │
│   ├── components/                        # Reusable UI components
│   │   ├── common/                        # Shared mobile + TV components
│   │   │   ├── FocusableCard.kt           # Focus-aware card (TV optimization)
│   │   │   ├── LoadingIndicator.kt        # Loading states
│   │   │   ├── ErrorDisplay.kt            # Error UI
│   │   │   ├── VideoThumbnail.kt          # Lazy-loaded thumbnails (Coil)
│   │   │   ├── MetadataCard.kt            # Content metadata display
│   │   │   └── BottomSheet.kt             # Bottom sheet dialogs
│   │   │
│   │   ├── mobile/                        # Mobile-specific components
│   │   │   ├── BottomNavigation.kt        # Bottom nav bar
│   │   │   ├── TopAppBar.kt               # App bar with actions
│   │   │   └── PullToRefresh.kt           # Swipe refresh
│   │   │
│   │   └── tv/                            # TV-specific components
│   │       ├── TVBackHandler.kt           # D-pad back button handling
│   │       ├── TVFocusGroup.kt            # Focus boundary management
│   │       ├── TVContextMenu.kt           # Long-press context menu
│   │       ├── TVVoiceSearch.kt           # Voice search integration
│   │       └── TVScreenWrapper.kt         # TV screen container (focus restore)
│   │
│   ├── screens/                           # Screen-level composables
│   │   ├── home/                          # Home screen
│   │   │   ├── HomeScreen.kt              # Mobile home screen
│   │   │   ├── HomeScreenTV.kt            # TV home screen (Leanback BrowseFragment)
│   │   │   ├── HomeViewModel.kt           # Shared ViewModel
│   │   │   └── HomeUiState.kt             # UI state data class
│   │   │
│   │   ├── catalog/                       # Catalog browsing
│   │   │   ├── CatalogScreen.kt           # Mobile catalog
│   │   │   ├── CatalogScreenTV.kt         # TV catalog (grid with focus)
│   │   │   ├── CatalogViewModel.kt        # Catalog business logic
│   │   │   └── CatalogUiState.kt          # Catalog state
│   │   │
│   │   ├── metadata/                      # Content details
│   │   │   ├── MetadataScreen.kt          # Mobile detail screen
│   │   │   ├── MetadataScreenTV.kt        # TV detail (Leanback DetailsFragment)
│   │   │   ├── MetadataViewModel.kt       # Metadata logic
│   │   │   └── MetadataUiState.kt         # Detail state
│   │   │
│   │   ├── player/                        # Video player
│   │   │   ├── PlayerScreen.kt            # Mobile player UI
│   │   │   ├── PlayerScreenTV.kt          # TV player (PlaybackFragment)
│   │   │   ├── PlayerViewModel.kt         # Player controls logic
│   │   │   ├── PlayerControls.kt          # Playback controls overlay
│   │   │   └── SubtitleSelector.kt        # Subtitle picker
│   │   │
│   │   ├── library/                       # User library
│   │   │   ├── LibraryScreen.kt           # Mobile library
│   │   │   ├── LibraryScreenTV.kt         # TV library grid
│   │   │   ├── LibraryViewModel.kt        # Library logic
│   │   │   └── LibraryUiState.kt          # Library state
│   │   │
│   │   ├── search/                        # Search
│   │   │   ├── SearchScreen.kt            # Mobile search
│   │   │   ├── SearchScreenTV.kt          # TV search (voice + D-pad)
│   │   │   ├── SearchViewModel.kt         # Search logic
│   │   │   └── SearchUiState.kt           # Search state
│   │   │
│   │   ├── settings/                      # Settings
│   │   │   ├── SettingsScreen.kt          # Mobile settings
│   │   │   ├── SettingsScreenTV.kt        # TV settings (GuidedStepFragment)
│   │   │   ├── PlayerSettingsScreen.kt    # Player settings
│   │   │   ├── ThemeScreen.kt             # Theme picker
│   │   │   ├── SettingsViewModel.kt       # Settings logic
│   │   │   └── SettingsUiState.kt         # Settings state
│   │   │
│   │   ├── profile/                       # Profile management
│   │   │   ├── ProfileScreen.kt           # Profile picker/editor
│   │   │   ├── ProfileScreenTV.kt         # TV profile picker
│   │   │   ├── ProfileViewModel.kt        # Profile logic
│   │   │   └── ProfileUiState.kt          # Profile state
│   │   │
│   │   └── downloads/                     # Offline content
│   │       ├── DownloadsScreen.kt         # Mobile downloads
│   │       ├── DownloadsScreenTV.kt       # TV downloads
│   │       ├── DownloadsViewModel.kt      # Download manager logic
│   │       └── DownloadsUiState.kt        # Download state
│   │
│   └── navigation/                        # Navigation logic
│       ├── NavGraph.kt                    # Compose Navigation graph
│       ├── NavGraphTV.kt                  # TV navigation (fragments)
│       ├── Screen.kt                      # Screen route sealed class
│       └── Navigator.kt                   # Navigation helper
│
├── presentation/                          # Presentation Layer (ViewModels)
│   ├── base/                              # Base classes
│   │   ├── BaseViewModel.kt               # Common ViewModel logic
│   │   ├── UiState.kt                     # Base UI state interface
│   │   └── UiEvent.kt                     # UI event sealed class
│   │
│   └── viewmodels/                        # Feature ViewModels
│       ├── AccountViewModel.kt            # Account management
│       ├── CatalogViewModel.kt            # Catalog browsing
│       ├── MetadataViewModel.kt           # Content metadata
│       ├── LibraryViewModel.kt            # User library
│       ├── StreamViewModel.kt             # Stream resolution
│       ├── PlayerViewModel.kt             # Video playback
│       ├── DownloadViewModel.kt           # Offline downloads
│       ├── TraktViewModel.kt              # Trakt sync
│       ├── SettingsViewModel.kt           # App settings
│       ├── ThemeViewModel.kt              # Theme engine
│       └── PerformanceViewModel.kt        # Performance monitoring
│
├── domain/                                # Domain Layer (Business Logic)
│   ├── model/                             # Domain models (Kotlin data classes)
│   │   ├── Account.kt                     # Account model
│   │   ├── Profile.kt                     # Profile model
│   │   ├── Catalog.kt                     # Catalog model
│   │   ├── Meta.kt                        # Content metadata
│   │   ├── Stream.kt                      # Stream model
│   │   ├── Episode.kt                     # Episode model
│   │   ├── Download.kt                    # Download model
│   │   ├── TraktItem.kt                   # Trakt item model
│   │   └── Settings.kt                    # Settings model
│   │
│   ├── repository/                        # Repository interfaces & implementations
│   │   ├── AccountRepository.kt           # Account operations
│   │   ├── ProfileRepository.kt           # Profile management
│   │   ├── CatalogRepository.kt           # Catalog browsing
│   │   ├── LibraryRepository.kt           # User library
│   │   ├── MetadataRepository.kt          # Content metadata
│   │   ├── StreamRepository.kt            # Stream resolution
│   │   ├── DownloadRepository.kt          # Download management
│   │   ├── TraktRepository.kt             # Trakt sync
│   │   ├── SettingsRepository.kt          # Settings persistence
│   │   ├── ThemeRepository.kt             # Theme state
│   │   ├── PerformanceRepository.kt       # Performance metrics
│   │   └── WatchProgressRepository.kt     # Watch progress tracking
│   │
│   └── usecase/                           # Use cases (optional, for complex operations)
│       ├── SyncLibraryUseCase.kt          # Sync with Trakt
│       ├── ResolveStreamUseCase.kt        # Multi-addon stream resolution
│       ├── DownloadContentUseCase.kt      # Orchestrate download
│       └── SwitchProfileUseCase.kt        # Profile switching logic
│
├── data/                                  # Data Layer (FFI Integration)
│   ├── ffi/                               # FFI binding layer (UniFFI-generated)
│   │   ├── NuvioCore.kt                   # Main FFI interface (generated)
│   │   ├── types/                         # FFI types (generated)
│   │   │   ├── Account.kt                 # FFI Account type
│   │   │   ├── Profile.kt                 # FFI Profile type
│   │   │   ├── Catalog.kt                 # FFI Catalog type
│   │   │   ├── Meta.kt                    # FFI Meta type
│   │   │   ├── Stream.kt                  # FFI Stream type
│   │   │   ├── Error.kt                   # FFI NuvioError sealed class
│   │   │   └── ...                        # ~50 generated types
│   │   │
│   │   └── callbacks/                     # FFI callback interfaces
│   │       ├── ProgressCallback.kt        # Download/sync progress
│   │       ├── EventCallback.kt           # Event bus listener
│   │       └── LogCallback.kt             # Rust log forwarding
│   │
│   ├── mapper/                            # FFI ↔ Domain model mappers
│   │   ├── AccountMapper.kt               # Map FFI Account to domain Account
│   │   ├── ProfileMapper.kt               # Map FFI Profile to domain Profile
│   │   ├── CatalogMapper.kt               # Map FFI Catalog to domain Catalog
│   │   ├── MetaMapper.kt                  # Map FFI Meta to domain Meta
│   │   ├── StreamMapper.kt                # Map FFI Stream to domain Stream
│   │   ├── ErrorMapper.kt                 # Map FFI NuvioError to domain exceptions
│   │   └── ...                            # Mapper per domain model
│   │
│   ├── repository/                        # Repository implementations
│   │   ├── AccountRepositoryImpl.kt       # AccountRepository FFI impl
│   │   ├── CatalogRepositoryImpl.kt       # CatalogRepository FFI impl
│   │   ├── StreamRepositoryImpl.kt        # StreamRepository FFI impl
│   │   └── ...                            # One impl per repository interface
│   │
│   └── local/                             # Platform-specific storage (MMKV, SQLite)
│       ├── preferences/                   # Shared preferences wrapper
│       │   └── PreferencesManager.kt      # Key-value storage
│       │
│       └── database/                      # SQLite Room database (if needed)
│           ├── AppDatabase.kt             # Room database definition
│           └── dao/                       # Data Access Objects
│
├── player/                                # Video player integration
│   ├── ExoPlayerManager.kt                # ExoPlayer wrapper
│   ├── PlayerEventListener.kt             # Playback event handling
│   ├── SubtitleRenderer.kt                # Subtitle overlay
│   ├── CastIntegration.kt                 # Google Cast integration
│   └── PlaybackState.kt                   # Playback state data class
│
├── tv/                                    # Android TV specific code
│   ├── leanback/                          # Leanback library integration
│   │   ├── BrowseFragment.kt              # TV home browse fragment
│   │   ├── DetailsFragment.kt             # TV detail fragment
│   │   ├── PlaybackFragment.kt            # TV playback fragment
│   │   ├── SearchFragment.kt              # TV search fragment
│   │   └── GuidedStepFragment.kt          # TV settings wizard
│   │
│   ├── focus/                             # TV focus management
│   │   ├── FocusManager.kt                # Focus state tracking
│   │   ├── FocusHelper.kt                 # Focus utilities
│   │   └── FocusConstants.kt              # Focus-related constants
│   │
│   └── input/                             # TV input handling
│       ├── DPadHandler.kt                 # D-pad key event handling
│       ├── RemoteControlHandler.kt        # Remote control events
│       └── VoiceInputHandler.kt           # Voice search integration
│
├── service/                               # Android services
│   ├── DownloadService.kt                 # Background download service
│   ├── SyncService.kt                     # Trakt sync service
│   └── CastService.kt                     # Google Cast session service
│
├── receiver/                              # Broadcast receivers
│   ├── NetworkChangeReceiver.kt           # Network connectivity changes
│   └── DownloadCompleteReceiver.kt        # Download completion notifications
│
├── util/                                  # Utilities
│   ├── ext/                               # Kotlin extensions
│   │   ├── ContextExt.kt                  # Context extensions
│   │   ├── ViewExt.kt                     # View extensions
│   │   ├── FlowExt.kt                     # Flow extensions
│   │   └── CoroutineExt.kt                # Coroutine utilities
│   │
│   ├── Constants.kt                       # App constants
│   ├── Logger.kt                          # Logging utility
│   ├── NetworkMonitor.kt                  # Network connectivity monitor
│   └── PermissionHelper.kt                # Permission handling
│
├── di/                                    # Dependency Injection (Hilt)
│   ├── AppModule.kt                       # App-level dependencies
│   ├── RepositoryModule.kt                # Repository bindings
│   ├── ViewModelModule.kt                 # ViewModel factories
│   ├── FFIModule.kt                       # FFI/Rust SDK initialization
│   ├── PlayerModule.kt                    # Video player dependencies
│   └── NetworkModule.kt                   # Network client (if needed)
│
└── NuvioApplication.kt                    # Application class
```

### Package Naming Conventions

- **Base Package:** `com.nuvio.app` (matches existing Android project)
- **Feature Packages:** Group by feature (catalog, player, library) rather than layer
- **TV-Specific:** `com.nuvio.app.tv.*` for Android TV code
- **FFI Bindings:** `com.nuvio.app.data.ffi.*` (UniFFI-generated)
- **Generated Code:** Keep in separate `generated/` source set to avoid conflicts

---

## JNI Two-Layer Binding Pattern

### Overview

Android requires **two layers** of FFI bindings due to the JVM:

```
Rust Code → C ABI → JNI Layer → Kotlin Code
   (Rust)     (C)     (JNI)      (Kotlin)
```

UniFFI automates both layers:
1. **Layer 1 (Rust → C):** Generates C-compatible `extern "C"` functions
2. **Layer 2 (C → Kotlin):** Generates JNI wrapper code that bridges C to Kotlin

### UniFFI Binding Generation Workflow

#### Step 1: Define Interface in .udl File

**File:** `rust-sdk/bindings/nuvio.udl` (excerpt)

```udl
namespace nuvio {
    // Initialize the Rust SDK
    void initialize(string storage_path);

    // Shutdown and cleanup resources
    void shutdown();
};

// Profile management interface
interface ProfileManager {
    constructor(string storage_path);

    // Create a new profile
    [Throws=NuvioError]
    Profile create_profile(string name, string? pin);

    // Get all profiles
    [Throws=NuvioError]
    sequence<Profile> get_profiles();

    // Switch to a profile
    [Throws=NuvioError]
    void switch_profile(string profile_id, string? pin);

    // Delete a profile
    [Throws=NuvioError]
    void delete_profile(string profile_id);
};

// Profile data type
dictionary Profile {
    string id;
    string name;
    boolean has_pin;
    string? avatar_url;
    i64 created_at;
    i64 last_used_at;
};

// Error type
[Error]
enum NuvioError {
    "InvalidInput",
    "Unauthorized",
    "NotFound",
    "NetworkError",
    "StorageError",
    "UnknownError",
};
```

#### Step 2: Generate Bindings

**Command:**
```bash
cd rust-sdk
cargo build --release

# Generate Kotlin bindings
uniffi-bindgen generate \
    --library ./target/release/libnuvio_core.so \
    --language kotlin \
    --out-dir ../android/app/src/main/kotlin/com/nuvio/app/data/ffi
```

**Generated Files:**
- `NuvioCore.kt` - Main FFI interface
- `Profile.kt` - Profile data class
- `ProfileManager.kt` - ProfileManager wrapper
- `NuvioError.kt` - Error sealed class
- `nuvio_core_jni.c` - JNI glue code (compiled into .so)

#### Step 3: Generated Kotlin Code Example

**Generated File:** `ProfileManager.kt` (simplified)

```kotlin
package com.nuvio.app.data.ffi

import com.sun.jna.Pointer

/**
 * ProfileManager wrapper class (UniFFI-generated)
 *
 * This class wraps the Rust ProfileManager and provides a Kotlin-friendly API.
 * Memory management is handled automatically through the Cleaner API.
 */
class ProfileManager(storagePath: String) : AutoCloseable {
    // Opaque pointer to Rust object (Arc<ProfileManager>)
    private val handle: Pointer

    init {
        // Call FFI constructor (Rust → C → JNI → Kotlin)
        handle = _uniffi_nuvio_profile_manager_new(storagePath)

        // Register cleaner to free Rust memory when GC'd
        cleaner.register(this) {
            _uniffi_nuvio_profile_manager_free(handle)
        }
    }

    /**
     * Create a new profile
     *
     * @param name Profile display name
     * @param pin Optional 4-digit PIN (null if no PIN)
     * @return Profile object
     * @throws NuvioException if creation fails
     */
    @Throws(NuvioException::class)
    suspend fun createProfile(name: String, pin: String?): Profile {
        return withContext(Dispatchers.IO) {
            // Call FFI function (crosses JNI boundary)
            val resultPointer = _uniffi_nuvio_profile_manager_create_profile(
                handle,
                name,
                pin
            )

            // Check for error
            if (_uniffi_is_error(resultPointer)) {
                val error = _uniffi_read_error(resultPointer)
                throw error.toException()
            }

            // Deserialize Profile from C struct to Kotlin data class
            val profile = _uniffi_deserialize_profile(resultPointer)

            // Free C memory
            _uniffi_free_result(resultPointer)

            profile
        }
    }

    /**
     * Get all profiles
     *
     * @return List of profiles
     * @throws NuvioException if fetch fails
     */
    @Throws(NuvioException::class)
    suspend fun getProfiles(): List<Profile> {
        return withContext(Dispatchers.IO) {
            val resultPointer = _uniffi_nuvio_profile_manager_get_profiles(handle)

            if (_uniffi_is_error(resultPointer)) {
                val error = _uniffi_read_error(resultPointer)
                throw error.toException()
            }

            val profiles = _uniffi_deserialize_profile_list(resultPointer)
            _uniffi_free_result(resultPointer)

            profiles
        }
    }

    override fun close() {
        // Explicit cleanup (called when using .use { })
        _uniffi_nuvio_profile_manager_free(handle)
    }

    // Private native methods (JNI bindings)
    private external fun _uniffi_nuvio_profile_manager_new(storagePath: String): Pointer
    private external fun _uniffi_nuvio_profile_manager_create_profile(
        handle: Pointer,
        name: String,
        pin: String?
    ): Pointer
    private external fun _uniffi_nuvio_profile_manager_get_profiles(handle: Pointer): Pointer
    private external fun _uniffi_nuvio_profile_manager_free(handle: Pointer)
    // ... more JNI methods

    companion object {
        // Load native library (.so file)
        init {
            System.loadLibrary("nuvio_core")
        }

        // Cleaner for automatic memory management
        private val cleaner = java.lang.ref.Cleaner.create()
    }
}
```

**Generated File:** `Profile.kt` (simplified)

```kotlin
package com.nuvio.app.data.ffi

/**
 * Profile data class (UniFFI-generated)
 *
 * Represents a user profile from the Rust SDK.
 */
data class Profile(
    val id: String,
    val name: String,
    val hasPin: Boolean,
    val avatarUrl: String?,
    val createdAt: Long,      // Unix timestamp (milliseconds)
    val lastUsedAt: Long      // Unix timestamp (milliseconds)
)
```

**Generated File:** `NuvioError.kt` (simplified)

```kotlin
package com.nuvio.app.data.ffi

/**
 * NuvioError sealed class (UniFFI-generated)
 *
 * Represents errors from the Rust SDK.
 */
sealed class NuvioError {
    object InvalidInput : NuvioError()
    object Unauthorized : NuvioError()
    object NotFound : NuvioError()
    object NetworkError : NuvioError()
    object StorageError : NuvioError()
    data class UnknownError(val message: String) : NuvioError()

    /**
     * Convert to exception for Kotlin throw
     */
    fun toException(): NuvioException {
        return when (this) {
            is InvalidInput -> NuvioException.InvalidInputException()
            is Unauthorized -> NuvioException.UnauthorizedException()
            is NotFound -> NuvioException.NotFoundException()
            is NetworkError -> NuvioException.NetworkException()
            is StorageError -> NuvioException.StorageException()
            is UnknownError -> NuvioException.UnknownException(message)
        }
    }
}

/**
 * Base exception class for Nuvio errors
 */
sealed class NuvioException(message: String? = null) : Exception(message) {
    class InvalidInputException : NuvioException("Invalid input provided")
    class UnauthorizedException : NuvioException("Unauthorized access")
    class NotFoundException : NuvioException("Resource not found")
    class NetworkException : NuvioException("Network error occurred")
    class StorageException : NuvioException("Storage operation failed")
    class UnknownException(msg: String) : NuvioException(msg)
}
```

### JNI Layer Deep Dive

#### Memory Management Across JNI

**Rust Side (in nuvio-core):**

```rust
use std::sync::Arc;
use std::panic::catch_unwind;
use std::ffi::{CString, CStr};
use std::os::raw::c_char;

// Profile struct in Rust
pub struct Profile {
    pub id: String,
    pub name: String,
    pub has_pin: bool,
    pub avatar_url: Option<String>,
    pub created_at: i64,
    pub last_used_at: i64,
}

// ProfileManager (reference-counted for FFI)
pub struct ProfileManager {
    storage_path: String,
    // ... internal state
}

// UniFFI macro generates FFI layer
uniffi::include_scaffolding!("nuvio");

// Manual FFI implementation (if needed, bypassing UniFFI)
// Note: This is what UniFFI generates automatically

#[no_mangle]
pub extern "C" fn nuvio_profile_manager_new(
    storage_path: *const c_char,
    out_error: *mut *mut u8
) -> *mut ProfileManager {
    // CRITICAL: Catch panics to prevent UB across FFI boundary
    let result = catch_unwind(|| {
        // Convert C string to Rust string
        let c_str = unsafe { CStr::from_ptr(storage_path) };
        let storage_path = c_str.to_str()?.to_owned();

        // Create ProfileManager
        let manager = ProfileManager::new(storage_path)?;

        // Box and convert to raw pointer (transfer ownership to Kotlin)
        Ok(Box::into_raw(Box::new(manager)))
    });

    match result {
        Ok(Ok(ptr)) => ptr,
        Ok(Err(e)) => {
            // Write error to out_error
            unsafe { *out_error = error_to_ptr(e) };
            std::ptr::null_mut()
        }
        Err(_panic) => {
            // Panic occurred - write panic error
            unsafe { *out_error = panic_error_ptr() };
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub extern "C" fn nuvio_profile_manager_free(ptr: *mut ProfileManager) {
    if !ptr.is_null() {
        // Convert raw pointer back to Box and drop it (free memory)
        unsafe { Box::from_raw(ptr) };
    }
}
```

**JNI Layer (C code, generated by UniFFI):**

```c
// nuvio_core_jni.c (simplified)

#include <jni.h>
#include <stdlib.h>
#include "nuvio_core.h"

// JNI function called from Kotlin
JNIEXPORT jlong JNICALL
Java_com_nuvio_app_data_ffi_ProfileManager__1uniffi_1nuvio_1profile_1manager_1new(
    JNIEnv *env,
    jobject thiz,
    jstring storage_path
) {
    // Convert Java String to C string
    const char *c_storage_path = (*env)->GetStringUTFChars(env, storage_path, NULL);

    // Call Rust FFI function
    uint8_t *error = NULL;
    void *manager = nuvio_profile_manager_new(c_storage_path, &error);

    // Release Java string
    (*env)->ReleaseStringUTFChars(env, storage_path, c_storage_path);

    // Check for error
    if (error != NULL) {
        // Throw Java exception
        jclass exception_class = (*env)->FindClass(env, "com/nuvio/app/data/ffi/NuvioException");
        char *error_msg = (char*)error;
        (*env)->ThrowNew(env, exception_class, error_msg);
        free(error);
        return 0;
    }

    // Return opaque pointer as jlong (8 bytes)
    return (jlong)manager;
}

JNIEXPORT void JNICALL
Java_com_nuvio_app_data_ffi_ProfileManager__1uniffi_1nuvio_1profile_1manager_1free(
    JNIEnv *env,
    jobject thiz,
    jlong handle
) {
    // Free Rust object
    nuvio_profile_manager_free((void*)handle);
}
```

**Kotlin Side (usage in Repository):**

```kotlin
package com.nuvio.app.data.repository

import com.nuvio.app.data.ffi.ProfileManager
import com.nuvio.app.data.ffi.Profile as FFIProfile
import com.nuvio.app.data.ffi.NuvioException
import com.nuvio.app.domain.model.Profile
import com.nuvio.app.domain.repository.ProfileRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepositoryImpl @Inject constructor(
    private val profileManager: ProfileManager
) : ProfileRepository {

    override suspend fun createProfile(name: String, pin: String?): Result<Profile> {
        return try {
            val ffiProfile = profileManager.createProfile(name, pin)
            val domainProfile = ffiProfile.toDomain()
            Result.success(domainProfile)
        } catch (e: NuvioException) {
            Result.failure(e)
        }
    }

    override suspend fun getProfiles(): Result<List<Profile>> {
        return try {
            val ffiProfiles = profileManager.getProfiles()
            val domainProfiles = ffiProfiles.map { it.toDomain() }
            Result.success(domainProfiles)
        } catch (e: NuvioException) {
            Result.failure(e)
        }
    }

    override fun observeProfiles(): Flow<List<Profile>> = flow {
        // Poll profiles every 1 second (or use event bus callback)
        while (true) {
            val result = getProfiles()
            result.onSuccess { profiles ->
                emit(profiles)
            }
            kotlinx.coroutines.delay(1000)
        }
    }
}

// Mapper extension function
private fun FFIProfile.toDomain(): Profile {
    return Profile(
        id = id,
        name = name,
        hasPin = hasPin,
        avatarUrl = avatarUrl,
        createdAt = createdAt,
        lastUsedAt = lastUsedAt
    )
}
```

### Performance Considerations for JNI

#### JNI Call Overhead

**Measurement (per FFI call):**
- Direct C call (iOS): ~5-10ns
- JNI call (Android): ~50-100μs (1000x slower)

**Breakdown:**
1. Java → JNI transition: 20-40μs
2. Data marshalling (String, arrays): 20-50μs
3. C → Rust FFI: 5-10ns
4. Rust execution: <business logic time>
5. Return path: Same overhead in reverse

**Mitigation Strategies:**

1. **Batch API Calls**
   ```kotlin
   // ❌ BAD: Multiple FFI calls
   for (id in ids) {
       val meta = metadataRepository.getMeta(id)  // 100μs per call
   }

   // ✅ GOOD: Single batched FFI call
   val metas = metadataRepository.getBatchMetas(ids)  // 100μs for all
   ```

2. **Coarse-Grained APIs**
   ```kotlin
   // ❌ BAD: Fine-grained API
   val catalog = catalogRepository.getCatalog(id)
   val metas = catalog.metaIds.map { metadataRepository.getMeta(it) }

   // ✅ GOOD: Coarse-grained API (single FFI call)
   val catalogWithMetas = catalogRepository.getCatalogWithMetas(id)
   ```

3. **Long-Lived Objects**
   ```kotlin
   // ✅ Create FFI objects once, reuse many times
   @Singleton
   class ProfileRepositoryImpl @Inject constructor(
       private val profileManager: ProfileManager  // Created once at app start
   ) { ... }
   ```

4. **Async Callbacks (Avoid Polling)**
   ```kotlin
   // ❌ BAD: Poll for updates (high FFI overhead)
   while (true) {
       val progress = downloadManager.getProgress(id)  // 100μs every 100ms
       delay(100)
   }

   // ✅ GOOD: Register callback (one FFI call, Rust pushes updates)
   downloadManager.registerProgressCallback(id) { progress ->
       // Called from Rust via JNI (amortized cost)
   }
   ```

5. **Thread Affinity**
   ```kotlin
   // Use dedicated background thread for FFI calls
   @Singleton
   class FFIDispatcher @Inject constructor() {
       private val ffiThread = newSingleThreadContext("FFIThread")

       suspend fun <T> call(block: suspend () -> T): T {
           return withContext(ffiThread) {
               block()
           }
       }
   }
   ```

---

## UI Component Architecture

### Jetpack Compose Foundation

NuvioStreamingTV uses **Jetpack Compose** for declarative UI on both mobile and Android TV platforms. Compose simplifies state management, focus handling, and platform-specific UI variants.

### UI State Pattern

All screens follow a consistent **UI State** pattern:

```kotlin
package com.nuvio.app.ui.screens.catalog

import androidx.compose.runtime.Immutable

/**
 * UI state for CatalogScreen
 *
 * Immutable data class representing the complete UI state.
 * ViewModels emit this via StateFlow, Composables observe it.
 */
@Immutable
data class CatalogUiState(
    val isLoading: Boolean = false,
    val catalogs: List<CatalogItem> = emptyList(),
    val selectedCatalogId: String? = null,
    val error: String? = null,
    val isRefreshing: Boolean = false
)

/**
 * UI events for CatalogScreen
 *
 * Sealed class representing user actions.
 */
sealed class CatalogUiEvent {
    data class SelectCatalog(val catalogId: String) : CatalogUiEvent()
    object RefreshCatalogs : CatalogUiEvent()
    object RetryLoad : CatalogUiEvent()
    data class SearchQuery(val query: String) : CatalogUiEvent()
}
```

### Screen Composable Pattern

**Mobile Screen Example:**

```kotlin
package com.nuvio.app.ui.screens.catalog

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun CatalogScreen(
    onNavigateToMeta: (String) -> Unit,
    viewModel: CatalogViewModel = hiltViewModel()
) {
    // Collect UI state as Compose State
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Event handler
    val onEvent: (CatalogUiEvent) -> Unit = { event ->
        viewModel.onEvent(event)
    }

    Scaffold(
        topBar = {
            CatalogTopBar(
                onSearchClick = { /* Navigate to search */ }
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                LoadingIndicator(modifier = Modifier.fillMaxSize())
            }

            uiState.error != null -> {
                ErrorDisplay(
                    message = uiState.error!!,
                    onRetry = { onEvent(CatalogUiEvent.RetryLoad) }
                )
            }

            else -> {
                CatalogGrid(
                    catalogs = uiState.catalogs,
                    onCatalogClick = { catalog ->
                        onNavigateToMeta(catalog.id)
                    },
                    modifier = Modifier
                        .padding(paddingValues)
                        .fillMaxSize()
                )
            }
        }
    }
}

@Composable
private fun CatalogGrid(
    catalogs: List<CatalogItem>,
    onCatalogClick: (CatalogItem) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 150.dp),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = modifier
    ) {
        items(catalogs.size) { index ->
            CatalogCard(
                catalog = catalogs[index],
                onClick = { onCatalogClick(catalogs[index]) }
            )
        }
    }
}
```

**Android TV Screen Example:**

```kotlin
package com.nuvio.app.ui.screens.catalog

import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.runtime.*
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.*
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.nuvio.app.tv.focus.rememberTVFocusManager

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun CatalogScreenTV(
    onNavigateToMeta: (String) -> Unit,
    viewModel: CatalogViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val focusManager = rememberTVFocusManager()

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            uiState.isLoading -> {
                LoadingIndicator(modifier = Modifier.fillMaxSize())
            }

            uiState.error != null -> {
                ErrorDisplay(
                    message = uiState.error!!,
                    onRetry = { viewModel.onEvent(CatalogUiEvent.RetryLoad) },
                    modifier = Modifier.fillMaxSize()
                )
            }

            else -> {
                CatalogGridTV(
                    catalogs = uiState.catalogs,
                    onCatalogClick = { catalog ->
                        onNavigateToMeta(catalog.id)
                    },
                    focusManager = focusManager,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}

@OptIn(ExperimentalComposeUiApi::class)
@Composable
private fun CatalogGridTV(
    catalogs: List<CatalogItem>,
    onCatalogClick: (CatalogItem) -> Unit,
    focusManager: TVFocusManager,
    modifier: Modifier = Modifier
) {
    val focusRequesters = remember(catalogs.size) {
        List(catalogs.size) { FocusRequester() }
    }

    // Request focus on first item when grid loads
    LaunchedEffect(catalogs) {
        if (catalogs.isNotEmpty()) {
            focusRequesters[0].requestFocus()
        }
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(5),  // TV: 5 columns
        contentPadding = PaddingValues(48.dp),  // TV: Larger padding for safe area
        horizontalArrangement = Arrangement.spacedBy(24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
        modifier = modifier
    ) {
        items(catalogs.size) { index ->
            FocusableCatalogCard(
                catalog = catalogs[index],
                onClick = { onCatalogClick(catalogs[index]) },
                focusRequester = focusRequesters[index],
                modifier = Modifier
                    .onPreviewKeyEvent { keyEvent ->
                        // Handle D-pad navigation
                        handleDPadNavigation(
                            keyEvent = keyEvent,
                            currentIndex = index,
                            totalItems = catalogs.size,
                            columns = 5,
                            focusRequesters = focusRequesters
                        )
                    }
            )
        }
    }
}

@OptIn(ExperimentalComposeUiApi::class)
private fun handleDPadNavigation(
    keyEvent: KeyEvent,
    currentIndex: Int,
    totalItems: Int,
    columns: Int,
    focusRequesters: List<FocusRequester>
): Boolean {
    if (keyEvent.type != KeyEventType.KeyDown) return false

    val targetIndex = when (keyEvent.key) {
        Key.DirectionUp -> (currentIndex - columns).takeIf { it >= 0 }
        Key.DirectionDown -> (currentIndex + columns).takeIf { it < totalItems }
        Key.DirectionLeft -> (currentIndex - 1).takeIf { it >= 0 && it / columns == currentIndex / columns }
        Key.DirectionRight -> (currentIndex + 1).takeIf { it < totalItems && it / columns == currentIndex / columns }
        else -> null
    }

    return if (targetIndex != null) {
        focusRequesters[targetIndex].requestFocus()
        true
    } else {
        false
    }
}
```

### Reusable TV Components

**Focusable Card Component:**

```kotlin
package com.nuvio.app.ui.components.tv

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Focusable card component for Android TV
 *
 * Provides visual feedback when focused (scale, border, elevation).
 * Essential for TV D-pad navigation.
 */
@Composable
fun FocusableCard(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    focusRequester: FocusRequester = remember { FocusRequester() },
    focusedScale: Float = 1.1f,
    focusedElevation: Dp = 8.dp,
    unfocusedElevation: Dp = 2.dp,
    focusedBorderColor: Color = MaterialTheme.colorScheme.primary,
    unfocusedBorderColor: Color = Color.Transparent,
    content: @Composable ColumnScope.() -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    // Animate scale when focused
    val scale by animateFloatAsState(
        targetValue = if (isFocused) focusedScale else 1f
    )

    // Animate elevation when focused
    val elevation by animateDpAsState(
        targetValue = if (isFocused) focusedElevation else unfocusedElevation
    )

    // Animate border color when focused
    val borderColor by animateColorAsState(
        targetValue = if (isFocused) focusedBorderColor else unfocusedBorderColor
    )

    Card(
        onClick = onClick,
        modifier = modifier
            .focusRequester(focusRequester)
            .focusable(interactionSource = interactionSource)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            },
        elevation = CardDefaults.cardElevation(defaultElevation = elevation),
        border = BorderStroke(width = 2.dp, color = borderColor),
        interactionSource = interactionSource
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            content()
        }
    }
}
```

**TV Voice Search Component:**

```kotlin
package com.nuvio.app.ui.components.tv

import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

/**
 * Voice search button for Android TV
 *
 * Launches Android voice recognition activity when clicked.
 * Typically triggered by microphone button on TV remote.
 */
@Composable
fun TVVoiceSearchButton(
    onVoiceResult: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    // Activity result launcher for voice recognition
    val voiceSearchLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        if (!matches.isNullOrEmpty()) {
            // Return first match (highest confidence)
            onVoiceResult(matches[0])
        }
    }

    IconButton(
        onClick = {
            // Launch voice search intent
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                )
                putExtra(RecognizerIntent.EXTRA_PROMPT, "Search for content...")
            }
            voiceSearchLauncher.launch(intent)
        },
        modifier = modifier.focusable()
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Mic,
                contentDescription = "Voice Search"
            )
            Text("Voice Search")
        }
    }
}
```

---

## Data Binding Patterns

### Repository Pattern with FFI

All FFI calls are abstracted through the **Repository** layer, which provides:
1. FFI-to-Domain model mapping
2. Error handling and conversion
3. Flow-based reactive streams
4. Caching and optimistic updates

### Repository Implementation Example

```kotlin
package com.nuvio.app.data.repository

import com.nuvio.app.data.ffi.CatalogManager
import com.nuvio.app.data.ffi.Catalog as FFICatalog
import com.nuvio.app.data.ffi.Meta as FFIMeta
import com.nuvio.app.data.ffi.NuvioException
import com.nuvio.app.data.mapper.toDomain
import com.nuvio.app.domain.model.Catalog
import com.nuvio.app.domain.model.Meta
import com.nuvio.app.domain.repository.CatalogRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject
import javax.inject.Singleton

/**
 * CatalogRepository implementation using Rust FFI
 *
 * Provides catalog browsing functionality by calling Rust SDK.
 */
@Singleton
class CatalogRepositoryImpl @Inject constructor(
    private val catalogManager: CatalogManager,
    private val ffiDispatcher: FFIDispatcher
) : CatalogRepository {

    override suspend fun getCatalogs(): Result<List<Catalog>> {
        return ffiDispatcher.call {
            try {
                val ffiCatalogs = catalogManager.getCatalogs()
                val domainCatalogs = ffiCatalogs.map { it.toDomain() }
                Result.success(domainCatalogs)
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
    }

    override suspend fun getCatalogMetas(
        catalogId: String,
        type: String,
        page: Int
    ): Result<List<Meta>> {
        return ffiDispatcher.call {
            try {
                val ffiMetas = catalogManager.getCatalogMetas(catalogId, type, page)
                val domainMetas = ffiMetas.map { it.toDomain() }
                Result.success(domainMetas)
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
    }

    override fun observeCatalogs(): Flow<List<Catalog>> = flow {
        // Register FFI callback for catalog updates
        catalogManager.registerCatalogCallback { ffiCatalogs ->
            val domainCatalogs = ffiCatalogs.map { it.toDomain() }
            emit(domainCatalogs)
        }

        // Initial load
        val result = getCatalogs()
        result.onSuccess { catalogs ->
            emit(catalogs)
        }
    }.flowOn(Dispatchers.IO)

    override suspend fun refreshCatalog(catalogId: String): Result<Unit> {
        return ffiDispatcher.call {
            try {
                catalogManager.refreshCatalog(catalogId)
                Result.success(Unit)
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
    }
}
```

### Domain Model vs FFI Model

**Why separate models?**
1. **Decouple UI from FFI:** Changes in Rust FFI don't break UI
2. **Kotlin-friendly types:** Use Kotlin idioms (nullable types, sealed classes)
3. **Additional UI logic:** Add computed properties, UI-specific methods
4. **Testability:** Mock domain models without FFI dependency

**FFI Model (Generated by UniFFI):**

```kotlin
package com.nuvio.app.data.ffi

data class Catalog(
    val id: String,
    val name: String,
    val type: String,
    val posterUrl: String?,
    val genres: List<String>
)
```

**Domain Model (UI-friendly):**

```kotlin
package com.nuvio.app.domain.model

data class Catalog(
    val id: String,
    val name: String,
    val type: CatalogType,
    val posterUrl: String?,
    val genres: List<String>
) {
    // Computed property for UI
    val displayName: String
        get() = name.uppercase()

    // UI-specific method
    fun hasGenre(genre: String): Boolean {
        return genres.contains(genre, ignoreCase = true)
    }
}

enum class CatalogType {
    MOVIE,
    SERIES,
    CHANNEL;

    companion object {
        fun fromString(value: String): CatalogType {
            return when (value.lowercase()) {
                "movie" -> MOVIE
                "series" -> SERIES
                "channel" -> CHANNEL
                else -> throw IllegalArgumentException("Unknown catalog type: $value")
            }
        }
    }
}
```

**Mapper:**

```kotlin
package com.nuvio.app.data.mapper

import com.nuvio.app.data.ffi.Catalog as FFICatalog
import com.nuvio.app.domain.model.Catalog as DomainCatalog
import com.nuvio.app.domain.model.CatalogType

fun FFICatalog.toDomain(): DomainCatalog {
    return DomainCatalog(
        id = id,
        name = name,
        type = CatalogType.fromString(type),
        posterUrl = posterUrl,
        genres = genres
    )
}

fun DomainCatalog.toFFI(): FFICatalog {
    return FFICatalog(
        id = id,
        name = name,
        type = type.name.lowercase(),
        posterUrl = posterUrl,
        genres = genres
    )
}
```

### ViewModel with FFI Integration

```kotlin
package com.nuvio.app.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.domain.model.Catalog
import com.nuvio.app.domain.model.Meta
import com.nuvio.app.domain.repository.CatalogRepository
import com.nuvio.app.ui.screens.catalog.CatalogUiState
import com.nuvio.app.ui.screens.catalog.CatalogUiEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val catalogRepository: CatalogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CatalogUiState())
    val uiState: StateFlow<CatalogUiState> = _uiState.asStateFlow()

    init {
        loadCatalogs()
        observeCatalogUpdates()
    }

    fun onEvent(event: CatalogUiEvent) {
        when (event) {
            is CatalogUiEvent.SelectCatalog -> selectCatalog(event.catalogId)
            is CatalogUiEvent.RefreshCatalogs -> refreshCatalogs()
            is CatalogUiEvent.RetryLoad -> loadCatalogs()
            is CatalogUiEvent.SearchQuery -> searchCatalogs(event.query)
        }
    }

    private fun loadCatalogs() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            catalogRepository.getCatalogs()
                .onSuccess { catalogs ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            catalogs = catalogs.map { catalog ->
                                CatalogItem(
                                    id = catalog.id,
                                    name = catalog.displayName,
                                    posterUrl = catalog.posterUrl,
                                    genres = catalog.genres
                                )
                            }
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load catalogs"
                        )
                    }
                }
        }
    }

    private fun observeCatalogUpdates() {
        viewModelScope.launch {
            catalogRepository.observeCatalogs()
                .catch { error ->
                    _uiState.update {
                        it.copy(error = error.message ?: "Error observing catalogs")
                    }
                }
                .collect { catalogs ->
                    _uiState.update {
                        it.copy(
                            catalogs = catalogs.map { catalog ->
                                CatalogItem(
                                    id = catalog.id,
                                    name = catalog.displayName,
                                    posterUrl = catalog.posterUrl,
                                    genres = catalog.genres
                                )
                            }
                        )
                    }
                }
        }
    }

    private fun refreshCatalogs() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }

            // Refresh all catalogs
            val selectedId = _uiState.value.selectedCatalogId
            if (selectedId != null) {
                catalogRepository.refreshCatalog(selectedId)
                    .onSuccess {
                        loadCatalogs()
                    }
                    .onFailure { error ->
                        _uiState.update {
                            it.copy(
                                isRefreshing = false,
                                error = "Refresh failed: ${error.message}"
                            )
                        }
                    }
            }

            _uiState.update { it.copy(isRefreshing = false) }
        }
    }

    private fun selectCatalog(catalogId: String) {
        _uiState.update { it.copy(selectedCatalogId = catalogId) }
    }

    private fun searchCatalogs(query: String) {
        // Filter catalogs by query
        val filteredCatalogs = _uiState.value.catalogs.filter { catalog ->
            catalog.name.contains(query, ignoreCase = true) ||
            catalog.genres.any { it.contains(query, ignoreCase = true) }
        }

        _uiState.update { it.copy(catalogs = filteredCatalogs) }
    }
}

data class CatalogItem(
    val id: String,
    val name: String,
    val posterUrl: String?,
    val genres: List<String>
)
```

---

## Android Lifecycle Integration

### FFI Resource Management

FFI resources (Rust objects) MUST be tied to Android lifecycle to prevent memory leaks.

### Application-Level FFI Initialization

```kotlin
package com.nuvio.app

import android.app.Application
import com.nuvio.app.data.ffi.NuvioCore
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

@HiltAndroidApp
class NuvioApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize logging
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }

        // Initialize Rust SDK (FFI)
        val storagePath = filesDir.absolutePath
        NuvioCore.initialize(storagePath)

        Timber.i("Nuvio SDK initialized at: $storagePath")
    }

    override fun onTerminate() {
        // Shutdown Rust SDK (free all resources)
        NuvioCore.shutdown()

        super.onTerminate()
    }
}
```

### Activity-Level Lifecycle

```kotlin
package com.nuvio.app.ui.activity

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import com.nuvio.app.data.ffi.EventCallback
import com.nuvio.app.ui.theme.NuvioTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var eventCallback: EventCallback

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Register FFI event callback for app lifecycle
        lifecycleScope.launch {
            eventCallback.registerLifecycleCallback { event ->
                when (event) {
                    is AppEvent.LowMemory -> onLowMemory()
                    is AppEvent.NetworkChanged -> onNetworkChanged(event.isConnected)
                    else -> {}
                }
            }
        }

        setContent {
            NuvioTheme {
                NavGraph()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Notify Rust SDK that app resumed
        lifecycleScope.launch {
            eventCallback.notifyAppState(AppState.RESUMED)
        }
    }

    override fun onPause() {
        super.onPause()
        // Notify Rust SDK that app paused (pause background tasks)
        lifecycleScope.launch {
            eventCallback.notifyAppState(AppState.PAUSED)
        }
    }

    override fun onStop() {
        super.onStop()
        // Notify Rust SDK that app stopped
        lifecycleScope.launch {
            eventCallback.notifyAppState(AppState.STOPPED)
        }
    }

    override fun onLowMemory() {
        super.onLowMemory()
        // Request Rust SDK to free caches
        lifecycleScope.launch {
            eventCallback.notifyLowMemory()
        }
    }
}
```

### ViewModel Lifecycle

```kotlin
package com.nuvio.app.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.domain.repository.DownloadRepository
import kotlinx.coroutines.cancel
import javax.inject.Inject

class DownloadViewModel @Inject constructor(
    private val downloadRepository: DownloadRepository
) : ViewModel() {

    init {
        // Start observing downloads
        observeDownloads()
    }

    private fun observeDownloads() {
        viewModelScope.launch {
            downloadRepository.observeDownloads()
                .collect { downloads ->
                    // Update UI state
                }
        }
    }

    override fun onCleared() {
        // ViewModel is being destroyed
        // viewModelScope automatically cancels all coroutines
        // No manual FFI cleanup needed (handled by Repository lifecycle)
        super.onCleared()
    }
}
```

---

## Threading Model

### Android Threading Constraints

1. **Main Thread (UI Thread):** Only UI operations; no FFI calls
2. **Background Threads:** FFI calls MUST run on background threads
3. **JNI Thread Safety:** JNI calls are NOT thread-safe by default

### Coroutine Dispatchers

```kotlin
package com.nuvio.app.data.ffi

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.asCoroutineDispatcher
import java.util.concurrent.Executors
import javax.inject.Inject
import javax.inject.Singleton

/**
 * FFI Dispatcher for running FFI calls on dedicated thread
 *
 * Uses single-threaded executor to ensure FFI calls are serialized.
 * This prevents JNI thread safety issues.
 */
@Singleton
class FFIDispatcher @Inject constructor() {
    // Single-threaded executor for FFI calls
    private val ffiExecutor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "FFI-Thread").apply {
            isDaemon = true
            priority = Thread.NORM_PRIORITY
        }
    }

    val dispatcher: CoroutineDispatcher = ffiExecutor.asCoroutineDispatcher()

    /**
     * Run FFI call on FFI thread
     */
    suspend fun <T> call(block: suspend () -> T): T {
        return kotlinx.coroutines.withContext(dispatcher) {
            block()
        }
    }

    fun shutdown() {
        ffiExecutor.shutdown()
    }
}
```

### Thread-Safe FFI Pattern

```kotlin
package com.nuvio.app.data.repository

import com.nuvio.app.data.ffi.FFIDispatcher
import com.nuvio.app.data.ffi.StreamManager
import com.nuvio.app.domain.model.Stream
import com.nuvio.app.domain.repository.StreamRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StreamRepositoryImpl @Inject constructor(
    private val streamManager: StreamManager,
    private val ffiDispatcher: FFIDispatcher
) : StreamRepository {

    override suspend fun resolveStream(metaId: String, type: String): Result<List<Stream>> {
        // FFI call runs on FFI thread via dispatcher
        return ffiDispatcher.call {
            try {
                val ffiStreams = streamManager.resolveStream(metaId, type)
                val domainStreams = ffiStreams.map { it.toDomain() }
                Result.success(domainStreams)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    override fun observeStreamProgress(streamUrl: String): Flow<Int> = flow {
        // Register callback with Rust SDK
        streamManager.registerProgressCallback(streamUrl) { progress ->
            emit(progress)  // Emit on collector's thread
        }
    }.flowOn(ffiDispatcher.dispatcher)  // Run callback registration on FFI thread
}
```

---

## Android TV Focus Management

### TV Focus System Overview

Android TV uses a **focus-based navigation** system (D-pad, not touch). Jetpack Compose provides focus APIs that integrate with Android's native focus system.

### Focus Management Strategy

1. **FocusRequester:** Programmatically request focus
2. **FocusGroup:** Define focus boundaries
3. **onPreviewKeyEvent:** Handle D-pad navigation
4. **focusable():** Mark composables as focusable
5. **Visual Feedback:** Scale, border, elevation when focused

### TV Focus Manager

```kotlin
package com.nuvio.app.tv.focus

import androidx.compose.runtime.*
import androidx.compose.ui.focus.FocusRequester

/**
 * TV Focus Manager
 *
 * Manages focus state for TV screens.
 * Provides helpers for focus restoration, focus groups, and focus history.
 */
@Stable
class TVFocusManager {
    private val focusHistory = mutableListOf<FocusRequester>()

    var currentFocus by mutableStateOf<FocusRequester?>(null)
        private set

    /**
     * Request focus and track in history
     */
    fun requestFocus(focusRequester: FocusRequester) {
        focusHistory.add(focusRequester)
        currentFocus = focusRequester
        focusRequester.requestFocus()
    }

    /**
     * Restore focus to previous item (back navigation)
     */
    fun restorePreviousFocus() {
        if (focusHistory.size > 1) {
            focusHistory.removeLast()
            val previous = focusHistory.last()
            previous.requestFocus()
            currentFocus = previous
        }
    }

    /**
     * Clear focus history (screen change)
     */
    fun clearHistory() {
        focusHistory.clear()
        currentFocus = null
    }
}

/**
 * Remember TV focus manager
 */
@Composable
fun rememberTVFocusManager(): TVFocusManager {
    return remember { TVFocusManager() }
}
```

### TV Back Handler

```kotlin
package com.nuvio.app.ui.components.tv

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.*
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.input.key.*
import com.nuvio.app.tv.focus.TVFocusManager

/**
 * TV Back Handler
 *
 * Handles back button press on TV remote.
 * Restores focus to previous item or navigates back.
 */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun TVBackHandler(
    focusManager: TVFocusManager,
    onBack: () -> Unit
) {
    var backPressHandled by remember { mutableStateOf(false) }

    BackHandler(enabled = !backPressHandled) {
        // Restore focus if there's focus history
        if (focusManager.currentFocus != null) {
            focusManager.restorePreviousFocus()
            backPressHandled = true
        } else {
            // Navigate back
            onBack()
        }
    }

    // Reset backPressHandled after short delay
    LaunchedEffect(backPressHandled) {
        if (backPressHandled) {
            kotlinx.coroutines.delay(300)
            backPressHandled = false
        }
    }
}
```

---

## Navigation Architecture

### Jetpack Compose Navigation (Mobile)

```kotlin
package com.nuvio.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.nuvio.app.ui.screens.home.HomeScreen
import com.nuvio.app.ui.screens.catalog.CatalogScreen
import com.nuvio.app.ui.screens.metadata.MetadataScreen
import com.nuvio.app.ui.screens.player.PlayerScreen

@Composable
fun NavGraph(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToCatalog = { navController.navigate(Screen.Catalog.route) },
                onNavigateToMeta = { metaId ->
                    navController.navigate(Screen.Metadata.createRoute(metaId))
                }
            )
        }

        composable(Screen.Catalog.route) {
            CatalogScreen(
                onNavigateToMeta = { metaId ->
                    navController.navigate(Screen.Metadata.createRoute(metaId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.Metadata.route,
            arguments = Screen.Metadata.arguments
        ) { backStackEntry ->
            val metaId = backStackEntry.arguments?.getString("metaId")!!
            MetadataScreen(
                metaId = metaId,
                onNavigateToPlayer = { streamUrl ->
                    navController.navigate(Screen.Player.createRoute(streamUrl))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.Player.route,
            arguments = Screen.Player.arguments
        ) { backStackEntry ->
            val streamUrl = backStackEntry.arguments?.getString("streamUrl")!!
            PlayerScreen(
                streamUrl = streamUrl,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Catalog : Screen("catalog")

    object Metadata : Screen("metadata/{metaId}") {
        fun createRoute(metaId: String) = "metadata/$metaId"
        val arguments = listOf(
            navArgument("metaId") { type = NavType.StringType }
        )
    }

    object Player : Screen("player/{streamUrl}") {
        fun createRoute(streamUrl: String) = "player/$streamUrl"
        val arguments = listOf(
            navArgument("streamUrl") { type = NavType.StringType }
        )
    }
}
```

### Fragment Navigation (Android TV Leanback)

For Android TV, use **Fragments** with Leanback library for optimized TV UI:

```kotlin
package com.nuvio.app.tv.leanback

import android.os.Bundle
import androidx.leanback.app.BrowseFragment
import androidx.leanback.widget.*
import androidx.lifecycle.lifecycleScope
import com.nuvio.app.R
import com.nuvio.app.presentation.viewmodels.CatalogViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * TV Browse Fragment (Leanback)
 *
 * Main browsing UI for Android TV.
 * Displays rows of content categories.
 */
@AndroidEntryPoint
class TVBrowseFragment : BrowseFragment() {

    @Inject
    lateinit var viewModel: CatalogViewModel

    private lateinit var rowsAdapter: ArrayObjectAdapter

    override fun onActivityCreated(savedInstanceState: Bundle?) {
        super.onActivityCreated(savedInstanceState)

        setupUI()
        loadRows()
        observeViewModel()
    }

    private fun setupUI() {
        title = getString(R.string.app_name)
        headersState = HEADERS_ENABLED
        isHeadersTransitionOnBackEnabled = true

        // Set brand color for search icon
        brandColor = resources.getColor(R.color.primary, null)

        // Set search icon
        searchAffordanceColor = resources.getColor(R.color.accent, null)
    }

    private fun loadRows() {
        rowsAdapter = ArrayObjectAdapter(ListRowPresenter())
        adapter = rowsAdapter
    }

    private fun observeViewModel() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                if (!state.isLoading && state.catalogs.isNotEmpty()) {
                    updateRows(state.catalogs)
                }
            }
        }
    }

    private fun updateRows(catalogs: List<CatalogItem>) {
        rowsAdapter.clear()

        for (catalog in catalogs) {
            val listRowAdapter = ArrayObjectAdapter(CardPresenter())

            // Add items to row (fetch metas from catalog)
            lifecycleScope.launch {
                val metas = viewModel.getCatalogMetas(catalog.id)
                metas.forEach { meta ->
                    listRowAdapter.add(meta)
                }
            }

            val header = HeaderItem(catalog.id.hashCode().toLong(), catalog.name)
            val listRow = ListRow(header, listRowAdapter)
            rowsAdapter.add(listRow)
        }
    }
}
```

---

## Video Player Integration

### ExoPlayer Integration

```kotlin
package com.nuvio.app.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ExoPlayer Manager
 *
 * Manages ExoPlayer instance for video playback.
 * Integrates with Rust SDK for stream resolution and playback tracking.
 */
@Singleton
class ExoPlayerManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var player: ExoPlayer? = null

    private val _playbackState = MutableStateFlow<PlaybackState>(PlaybackState.Idle)
    val playbackState: StateFlow<PlaybackState> = _playbackState

    /**
     * Initialize ExoPlayer
     */
    fun initialize() {
        if (player == null) {
            player = ExoPlayer.Builder(context)
                .build()
                .also { exoPlayer ->
                    exoPlayer.addListener(object : Player.Listener {
                        override fun onPlaybackStateChanged(playbackState: Int) {
                            _playbackState.value = when (playbackState) {
                                Player.STATE_IDLE -> PlaybackState.Idle
                                Player.STATE_BUFFERING -> PlaybackState.Buffering
                                Player.STATE_READY -> PlaybackState.Ready
                                Player.STATE_ENDED -> PlaybackState.Ended
                                else -> PlaybackState.Idle
                            }
                        }

                        override fun onIsPlayingChanged(isPlaying: Boolean) {
                            if (isPlaying) {
                                _playbackState.value = PlaybackState.Playing
                            } else {
                                _playbackState.value = PlaybackState.Paused
                            }
                        }
                    })
                }
        }
    }

    /**
     * Play stream URL
     */
    fun play(streamUrl: String) {
        player?.let { exoPlayer ->
            val mediaItem = MediaItem.fromUri(streamUrl)
            exoPlayer.setMediaItem(mediaItem)
            exoPlayer.prepare()
            exoPlayer.play()
        }
    }

    /**
     * Pause playback
     */
    fun pause() {
        player?.pause()
    }

    /**
     * Resume playback
     */
    fun resume() {
        player?.play()
    }

    /**
     * Seek to position (milliseconds)
     */
    fun seekTo(positionMs: Long) {
        player?.seekTo(positionMs)
    }

    /**
     * Get current position (milliseconds)
     */
    fun getCurrentPosition(): Long {
        return player?.currentPosition ?: 0
    }

    /**
     * Get duration (milliseconds)
     */
    fun getDuration(): Long {
        return player?.duration ?: 0
    }

    /**
     * Release ExoPlayer resources
     */
    fun release() {
        player?.release()
        player = null
        _playbackState.value = PlaybackState.Idle
    }

    /**
     * Attach player to PlayerView
     */
    fun attachToView(playerView: PlayerView) {
        playerView.player = player
    }
}

sealed class PlaybackState {
    object Idle : PlaybackState()
    object Buffering : PlaybackState()
    object Ready : PlaybackState()
    object Playing : PlaybackState()
    object Paused : PlaybackState()
    object Ended : PlaybackState()
}
```

---

## State Management

### MVVM with StateFlow

All ViewModels expose **StateFlow<UiState>** for reactive UI updates:

```kotlin
// ViewModel exposes StateFlow
val uiState: StateFlow<CatalogUiState>

// Composable observes StateFlow
val uiState by viewModel.uiState.collectAsStateWithLifecycle()
```

### SharedFlow for Events

One-time events (toasts, navigation) use **SharedFlow**:

```kotlin
package com.nuvio.app.presentation.base

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

abstract class BaseViewModel : ViewModel() {

    private val _events = MutableSharedFlow<UiEvent>()
    val events: SharedFlow<UiEvent> = _events.asSharedFlow()

    protected suspend fun sendEvent(event: UiEvent) {
        _events.emit(event)
    }
}

sealed class UiEvent {
    data class ShowToast(val message: String) : UiEvent()
    data class Navigate(val route: String) : UiEvent()
    object NavigateBack : UiEvent()
}
```

---

## Build Configuration

### Gradle Configuration

**File:** `android/app/build.gradle.kts`

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.dagger.hilt.android")
    id("kotlin-kapt")
}

android {
    namespace = "com.nuvio.app.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.nuvio.app.tv"
        minSdk = 21
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // Enable New Architecture
        buildConfigField("boolean", "IS_NEW_ARCHITECTURE_ENABLED", "true")

        // Native library ABIs (match Rust build targets)
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.3"
    }

    // JNI libraries directory
    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("src/main/jniLibs")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Jetpack Compose
    implementation(platform("androidx.compose:compose-bom:2024.01.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.navigation:navigation-compose:2.7.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")

    // Android TV Leanback
    implementation("androidx.leanback:leanback:1.2.0-alpha04")
    implementation("androidx.leanback:leanback-preference:1.2.0-alpha04")
    implementation("androidx.leanback:leanback-tab:1.1.0-beta01")
    implementation("androidx.tvprovider:tvprovider:1.0.0")

    // ExoPlayer (video playback)
    implementation("androidx.media3:media3-exoplayer:1.2.0")
    implementation("androidx.media3:media3-ui:1.2.0")
    implementation("androidx.media3:media3-cast:1.2.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Hilt (Dependency Injection)
    implementation("com.google.dagger:hilt-android:2.48.1")
    kapt("com.google.dagger:hilt-compiler:2.48.1")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

    // Coil (Image Loading)
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Timber (Logging)
    implementation("com.jakewharton.timber:timber:5.0.1")

    // UniFFI-generated Rust bindings (local .so files)
    implementation(fileTree(mapOf("dir" to "src/main/jniLibs", "include" to listOf("*.so"))))
}
```

### Rust Library Build Script

**File:** `rust-sdk/build-android.sh`

```bash
#!/bin/bash
# Build Rust library for Android (all ABIs)

set -e

# Android NDK targets
TARGETS=(
    "aarch64-linux-android"    # arm64-v8a (64-bit ARM, primary)
    "armv7-linux-androideabi"  # armeabi-v7a (32-bit ARM)
    "x86_64-linux-android"     # x86_64 (emulator)
    "i686-linux-android"       # x86 (emulator)
)

# Build for each target
for TARGET in "${TARGETS[@]}"; do
    echo "Building for $TARGET..."
    cargo ndk --target $TARGET --platform 21 -- build --release
done

# Generate UniFFI bindings
echo "Generating UniFFI Kotlin bindings..."
uniffi-bindgen generate \
    --library ./target/aarch64-linux-android/release/libnuvio_core.so \
    --language kotlin \
    --out-dir ../android/app/src/main/kotlin/com/nuvio/app/data/ffi

# Copy .so files to jniLibs
echo "Copying .so files to jniLibs..."
mkdir -p ../android/app/src/main/jniLibs/arm64-v8a
mkdir -p ../android/app/src/main/jniLibs/armeabi-v7a
mkdir -p ../android/app/src/main/jniLibs/x86_64
mkdir -p ../android/app/src/main/jniLibs/x86

cp ./target/aarch64-linux-android/release/libnuvio_core.so ../android/app/src/main/jniLibs/arm64-v8a/
cp ./target/armv7-linux-androideabi/release/libnuvio_core.so ../android/app/src/main/jniLibs/armeabi-v7a/
cp ./target/x86_64-linux-android/release/libnuvio_core.so ../android/app/src/main/jniLibs/x86_64/
cp ./target/i686-linux-android/release/libnuvio_core.so ../android/app/src/main/jniLibs/x86/

echo "✅ Android build complete!"
```

---

## Testing Strategy

### Unit Tests (Repository Layer)

```kotlin
package com.nuvio.app.data.repository

import com.nuvio.app.data.ffi.ProfileManager
import com.nuvio.app.data.ffi.Profile as FFIProfile
import com.nuvio.app.domain.model.Profile
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ProfileRepositoryImplTest {

    private lateinit var profileManager: ProfileManager
    private lateinit var repository: ProfileRepositoryImpl

    @Before
    fun setup() {
        profileManager = mockk()
        repository = ProfileRepositoryImpl(profileManager)
    }

    @Test
    fun `createProfile success`() = runTest {
        // Given
        val ffiProfile = FFIProfile(
            id = "123",
            name = "John",
            hasPin = true,
            avatarUrl = null,
            createdAt = 1000L,
            lastUsedAt = 1000L
        )
        coEvery { profileManager.createProfile("John", "1234") } returns ffiProfile

        // When
        val result = repository.createProfile("John", "1234")

        // Then
        assertTrue(result.isSuccess)
        val profile = result.getOrNull()!!
        assertEquals("123", profile.id)
        assertEquals("John", profile.name)
        assertTrue(profile.hasPin)
    }

    @Test
    fun `createProfile failure`() = runTest {
        // Given
        coEvery { profileManager.createProfile(any(), any()) } throws Exception("Error")

        // When
        val result = repository.createProfile("John", "1234")

        // Then
        assertTrue(result.isFailure)
    }
}
```

### Integration Tests (FFI Layer)

```kotlin
package com.nuvio.app.data.ffi

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ProfileManagerIntegrationTest {

    private lateinit var profileManager: ProfileManager

    @Before
    fun setup() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val storagePath = context.filesDir.absolutePath
        profileManager = ProfileManager(storagePath)
    }

    @Test
    fun testCreateProfile() = runTest {
        // Create profile via FFI
        val profile = profileManager.createProfile("Test User", null)

        assertNotNull(profile)
        assertEquals("Test User", profile.name)
        assertFalse(profile.hasPin)
    }

    @Test
    fun testGetProfiles() = runTest {
        // Create two profiles
        profileManager.createProfile("User 1", null)
        profileManager.createProfile("User 2", "1234")

        // Get all profiles
        val profiles = profileManager.getProfiles()

        assertTrue(profiles.size >= 2)
    }
}
```

### UI Tests (Compose)

```kotlin
package com.nuvio.app.ui.screens.catalog

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.nuvio.app.ui.theme.NuvioTheme
import io.mockk.*
import org.junit.Rule
import org.junit.Test

class CatalogScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testCatalogScreenLoading() {
        // Given
        val uiState = CatalogUiState(isLoading = true)

        // When
        composeTestRule.setContent {
            NuvioTheme {
                CatalogScreen(
                    viewModel = mockk {
                        every { uiState } returns MutableStateFlow(uiState)
                    },
                    onNavigateToMeta = {}
                )
            }
        }

        // Then
        composeTestRule.onNodeWithContentDescription("Loading").assertExists()
    }

    @Test
    fun testCatalogScreenError() {
        // Given
        val uiState = CatalogUiState(error = "Network error")

        // When
        composeTestRule.setContent {
            NuvioTheme {
                CatalogScreen(
                    viewModel = mockk {
                        every { uiState } returns MutableStateFlow(uiState)
                    },
                    onNavigateToMeta = {}
                )
            }
        }

        // Then
        composeTestRule.onNodeWithText("Network error").assertExists()
        composeTestRule.onNodeWithText("Retry").assertExists()
    }
}
```

---

## Performance Optimization

### FFI Call Batching

```kotlin
// ❌ BAD: Multiple FFI calls
for (id in metaIds) {
    val meta = metadataRepository.getMeta(id)  // N FFI calls
}

// ✅ GOOD: Single batched FFI call
val metas = metadataRepository.getBatchMetas(metaIds)  // 1 FFI call
```

### LazyColumn Optimization

```kotlin
@Composable
fun CatalogList(catalogs: List<Catalog>) {
    LazyColumn {
        items(
            count = catalogs.size,
            key = { index -> catalogs[index].id }  // ✅ Stable keys for recomposition
        ) { index ->
            CatalogCard(catalog = catalogs[index])
        }
    }
}
```

### Image Loading (Coil)

```kotlin
@Composable
fun VideoThumbnail(url: String) {
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(url)
            .crossfade(true)
            .memoryCacheKey(url)  // ✅ Memory cache
            .diskCacheKey(url)    // ✅ Disk cache
            .build(),
        contentDescription = "Thumbnail"
    )
}
```

---

## Migration Strategy

### Phase 1: FFI Foundation (Weeks 1-4)
- Set up Rust SDK build for Android
- Generate UniFFI bindings
- Create Repository layer with FFI integration
- Implement 2-3 core repositories (Profile, Catalog, Settings)
- Write integration tests for FFI layer

### Phase 2: Core UI Migration (Weeks 5-10)
- Migrate HomeScreen to Jetpack Compose
- Migrate CatalogScreen with FFI data binding
- Migrate MetadataScreen
- Implement StateFlow-based reactive UI
- Create TV variants for migrated screens

### Phase 3: Video Player Integration (Weeks 11-14)
- Integrate ExoPlayer with Rust stream resolution
- Migrate PlayerScreen to Compose
- Implement playback progress tracking via FFI
- Test on Android TV devices

### Phase 4: Feature Parity (Weeks 15-20)
- Migrate remaining screens
- Implement all TV-specific features
- Full Trakt integration via FFI
- Download management via FFI
- End-to-end testing

---

## Summary

This Kotlin native layer architecture provides:

1. **UniFFI-Generated Bindings** - Automated JNI two-layer binding pattern
2. **MVVM with Jetpack Compose** - Modern declarative UI for mobile and TV
3. **Repository Pattern** - Clean FFI abstraction with domain model mapping
4. **Android TV Leanback** - TV-optimized navigation and focus management
5. **Coroutine-Based Async** - Seamless bridge from Rust async to Kotlin coroutines
6. **ExoPlayer Integration** - Native video playback with FFI stream resolution
7. **Lifecycle-Aware FFI** - Proper resource management tied to Android lifecycle
8. **Thread-Safe FFI** - Dedicated FFI dispatcher prevents JNI threading issues

The architecture is production-ready, testable, and optimized for Android TV platforms while maintaining full mobile compatibility.
