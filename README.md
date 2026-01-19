<!-- Improved compatibility of back to top link -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <img src="assets/titlelogo.png" alt="Nuvio Logo" width="120" />
  <h1 align="center">Nuvio Media Hub</h1>
  <p align="center">
    A modern, cross-platform media streaming hub with a high-performance Rust core
    <br />
    <strong>Rust SDK | Kotlin (Android) | Swift (iOS/tvOS)</strong>
    <br />
    <br />
    Stremio Addon Ecosystem | Trakt.tv Integration | Multi-Profile Support
    <br />
    <br />
    <a href="#getting-started"><strong>Get Started</strong></a>
    &nbsp;|&nbsp;
    <a href="#architecture"><strong>Architecture</strong></a>
    &nbsp;|&nbsp;
    <a href="#rust-sdk"><strong>Rust SDK</strong></a>
    <br />
    <br />
    <a href="https://github.com/tapframe/NuvioStreaming/issues/new?labels=bug&template=bug_report.md">Report Bug</a>
    &middot;
    <a href="https://github.com/tapframe/NuvioStreaming/issues/new?labels=enhancement&template=feature_request.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#architecture">Architecture</a>
      <ul>
        <li><a href="#system-overview">System Overview</a></li>
        <li><a href="#rust-sdk">Rust SDK</a></li>
        <li><a href="#android-kotlin">Android (Kotlin)</a></li>
        <li><a href="#iostvos-swift">iOS/tvOS (Swift)</a></li>
        <li><a href="#ffi-integration">FFI Integration</a></li>
      </ul>
    </li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#building-the-rust-sdk">Building the Rust SDK</a></li>
        <li><a href="#building-android">Building Android</a></li>
        <li><a href="#building-ios">Building iOS</a></li>
      </ul>
    </li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#key-features">Key Features</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#support">Support</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

---

<!-- ABOUT THE PROJECT -->
## About The Project

Nuvio Media Hub is a production-grade, cross-platform media streaming application that combines the performance of **Rust** with native **Kotlin** (Android) and **Swift** (iOS/tvOS) implementations. The architecture enables a shared, high-performance core while delivering native user experiences on each platform.

### Key Highlights

- **High-Performance Core**: Rust SDK provides blazing-fast catalog management, stream resolution, and data processing
- **Native UIs**: Jetpack Compose (Android) and SwiftUI (iOS/tvOS) for fluid, platform-specific experiences
- **Stremio Integration**: Full addon ecosystem support for discovering and streaming content
- **Trakt.tv Sync**: Watch history, ratings, and personalized recommendations
- **Multi-Profile Support**: Separate profiles with PIN protection and isolated watch histories
- **Offline-First**: Multi-tier caching (memory + disk) for offline access
- **Cloud Backup**: Compressed backups with integrity verification

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Nuvio Media Hub                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────┐           ┌─────────────────────────┐         │
│  │    Android (Kotlin)     │           │    iOS/tvOS (Swift)     │         │
│  │  ┌───────────────────┐  │           │  ┌───────────────────┐  │         │
│  │  │   Jetpack Compose │  │           │  │      SwiftUI      │  │         │
│  │  │    Material 3     │  │           │  │                   │  │         │
│  │  └─────────┬─────────┘  │           │  └─────────┬─────────┘  │         │
│  │            │            │           │            │            │         │
│  │  ┌─────────▼─────────┐  │           │  ┌─────────▼─────────┐  │         │
│  │  │    ViewModels     │  │           │  │    ViewModels     │  │         │
│  │  │   (Hilt DI)       │  │           │  │  (DIContainer)    │  │         │
│  │  └─────────┬─────────┘  │           │  └─────────┬─────────┘  │         │
│  │            │            │           │            │            │         │
│  │  ┌─────────▼─────────┐  │           │  ┌─────────▼─────────┐  │         │
│  │  │   Repositories    │  │           │  │   Repositories    │  │         │
│  │  │  (Kotlin APIs)    │  │           │  │  (Swift APIs)     │  │         │
│  │  └─────────┬─────────┘  │           │  └─────────┬─────────┘  │         │
│  └────────────┼────────────┘           └────────────┼────────────┘         │
│               │                                     │                       │
│               │         UniFFI Bindings             │                       │
│               └──────────────────┬──────────────────┘                       │
│                                  │                                          │
│  ┌───────────────────────────────▼───────────────────────────────────────┐ │
│  │                         Rust SDK (nuvio-core)                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                        FFI Layer (UniFFI)                       │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                  │                                     │ │
│  │  ┌───────────┬───────────┬───────┴────┬───────────┬───────────────┐   │ │
│  │  │  Stremio  │   Trakt   │   Cache    │  Profile  │    Backup     │   │ │
│  │  │  Service  │  Service  │  Manager   │  Manager  │    Manager    │   │ │
│  │  └───────────┴───────────┴────────────┴───────────┴───────────────┘   │ │
│  │                                  │                                     │ │
│  │  ┌───────────────────────────────▼───────────────────────────────────┐│ │
│  │  │                    Core Infrastructure                            ││ │
│  │  │  HTTP Client | Caching (Moka/Sled) | Rate Limiting | Crypto       ││ │
│  │  └───────────────────────────────────────────────────────────────────┘│ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### Rust SDK

The Rust SDK (`rust-sdk/nuvio-core/`) is the computational backbone of Nuvio, providing cross-platform functionality via UniFFI bindings.

#### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| FFI | UniFFI 0.30.0 | Generate Kotlin/Swift bindings |
| Async Runtime | Tokio | Multi-threaded async execution |
| HTTP Client | Reqwest 0.12 | HTTP requests with middleware |
| Serialization | Serde | JSON serialization |
| Memory Cache | Moka | High-performance in-memory cache |
| Disk Cache | Sled | Embedded persistent database |
| Rate Limiting | Governor | GCRA-based rate limiting |
| Crypto | Argon2 / Rustls | Password hashing and TLS |
| Compression | flate2 | Backup compression |
| Auth | OAuth2 4.4 | OAuth authentication flows |

#### Core Modules

```
rust-sdk/nuvio-core/src/
├── lib.rs                 # SDK entry point & initialization
├── ffi.rs                 # UniFFI bindings layer
├── error.rs               # FFI-safe error types
├── config/                # SDK configuration
│   ├── sdk_config.rs      # Builder pattern configuration
│   ├── environment.rs     # Dev/Staging/Prod environments
│   └── log_level.rs       # Logging configuration
├── types/                 # Core domain types
│   ├── meta.rs            # Content metadata (movies, shows)
│   ├── stream.rs          # Video stream information
│   ├── catalog.rs         # Content catalogs
│   └── profile.rs         # User profiles
├── stremio_service/       # Stremio addon integration
│   ├── addon.rs           # Addon management
│   ├── manifest.rs        # Manifest parsing
│   ├── catalog.rs         # Catalog fetching
│   ├── stream.rs          # Stream resolution
│   ├── meta.rs            # Metadata aggregation
│   └── fetcher.rs         # Parallel fetcher
├── trakt/                 # Trakt.tv integration
│   ├── auth.rs            # OAuth2 authentication
│   ├── client.rs          # API client
│   ├── sync.rs            # Watch history sync
│   ├── recommendations.rs # Personalized recommendations
│   └── calendar.rs        # Upcoming releases
├── cache/                 # Multi-tier caching
│   ├── memory.rs          # Moka in-memory cache
│   ├── disk.rs            # Sled persistent cache
│   └── http_cache.rs      # HTTP response caching
├── http/                  # HTTP infrastructure
│   ├── client.rs          # Reqwest client
│   ├── middleware.rs      # Custom middleware
│   ├── retry.rs           # Exponential backoff
│   └── cookies.rs         # Cookie management
├── profile/               # Profile management
│   ├── manager.rs         # CRUD operations
│   ├── store.rs           # Persistence layer
│   └── security.rs        # PIN encryption
├── backup/                # Backup & restore
│   ├── manager.rs         # Backup orchestration
│   ├── compression.rs     # gzip compression
│   └── storage.rs         # Local/cloud storage
└── notifications/         # Push notifications
    ├── manager.rs         # Notification handling
    └── models.rs          # Notification types
```

#### Build Targets

| Platform | Target | Output |
|----------|--------|--------|
| Android arm64 | `aarch64-linux-android` | `.so` |
| Android armv7 | `armv7-linux-androideabi` | `.so` |
| Android x86_64 | `x86_64-linux-android` | `.so` |
| Android x86 | `i686-linux-android` | `.so` |
| iOS arm64 | `aarch64-apple-ios` | `.a` / `.dylib` |
| iOS Simulator | `x86_64-apple-ios` | `.a` / `.dylib` |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### Android (Kotlin)

The Android implementation uses modern Kotlin with Jetpack Compose for a reactive, declarative UI.

#### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Framework | Jetpack Compose | Declarative UI |
| Design System | Material 3 | Modern design language |
| DI | Hilt | Dependency injection |
| Database | Room | Local persistence |
| Preferences | DataStore | Key-value storage |
| Video Player | ExoPlayer | Media playback |
| Navigation | Navigation Component | Screen navigation |
| Async | Kotlin Coroutines | Asynchronous operations |
| FFI | JNA / UniFFI | Rust SDK integration |

#### Module Structure

```
android/
├── app/                   # Main phone/tablet app
│   └── src/main/java/com/nuvio/app/tv/
│       ├── di/            # Hilt dependency modules
│       │   ├── AppModule.kt
│       │   └── RustModule.kt
│       ├── data/
│       │   └── repository/
│       │       ├── CatalogRepository.kt
│       │       ├── WatchlistRepository.kt
│       │       └── ProfileRepository.kt
│       ├── player/        # ExoPlayer implementation
│       │   └── PlayerViewModel.kt
│       └── ui/            # Compose screens
│           ├── home/
│           ├── catalog/
│           ├── details/
│           ├── search/
│           ├── library/
│           └── settings/
├── tv/                    # Android TV app
│   └── src/main/kotlin/com/nuvio/streaming/tv/
│       └── ... (TV-optimized layouts with Leanback)
├── shared/                # Shared library module
│   ├── src/main/jniLibs/  # Rust SDK native libraries
│   │   ├── arm64-v8a/
│   │   ├── armeabi-v7a/
│   │   ├── x86_64/
│   │   └── x86/
│   └── src/main/java/
│       └── ... (Shared repositories, Room DB, DataStore)
├── build.gradle           # Root build configuration
└── settings.gradle.kts    # Module settings
```

#### SDK Versions

| Property | Version |
|----------|---------|
| Min SDK | 26 (Android 8.0) |
| Target SDK | 35 |
| Compile SDK | 35 |
| NDK | 27.0.12077973 |
| Kotlin | 1.9+ |
| Compose BOM | Latest |

#### Data Flow Pattern

```
┌──────────────────┐
│  Compose Screen  │
└────────┬─────────┘
         │ observeAsState()
         ▼
┌──────────────────┐
│    ViewModel     │ ◄── StateFlow<UiState>
│   (Hilt-injected)│
└────────┬─────────┘
         │ suspend fun
         ▼
┌──────────────────┐
│   Repository     │ ◄── Interface
│ (RustRepository) │
└────────┬─────────┘
         │ FFI call
         ▼
┌──────────────────┐
│    Rust SDK      │ ◄── UniFFI generated
│  (nuvio_core)    │
└──────────────────┘
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### iOS/tvOS (Swift)

The iOS/tvOS implementation uses SwiftUI with a modular architecture via Swift Package Manager.

#### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Framework | SwiftUI | Declarative UI |
| Architecture | MVVM | State management |
| DI | Custom DIContainer | Dependency injection |
| Navigation | NavigationCoordinator | Screen navigation |
| Async | async/await | Asynchronous operations |
| FFI | UniFFI | Rust SDK integration |
| Package Manager | SPM | Modular dependency management |

#### Project Structure

```
nuvio-ios/                 # Swift Package
├── Package.swift          # SPM manifest
├── Sources/
│   ├── NuvioCore/         # Core framework
│   │   ├── Architecture/
│   │   │   └── BaseViewModel.swift
│   │   ├── DI/
│   │   │   └── DIContainer.swift
│   │   ├── Navigation/
│   │   │   ├── NavigationCoordinator.swift
│   │   │   └── NavigationManager.swift
│   │   └── Models/
│   │       └── Loadable.swift
│   └── NuvioFeatures/     # Feature modules
│       ├── Settings/
│       │   ├── SettingsView.swift
│       │   └── SettingsViewModel.swift
│       └── Common/
│           └── Constants.swift
└── Tests/                 # Test targets

ios/NuvioTV/               # Xcode project (tvOS)
├── NuvioTV.xcodeproj
├── Sources/
│   ├── NuvioTVApp.swift   # App entry point
│   ├── ViewModels/        # State management
│   │   ├── HomeViewModel.swift
│   │   ├── CatalogBrowseViewModel.swift
│   │   ├── DetailsViewModel.swift
│   │   ├── SearchViewModel.swift
│   │   ├── LibraryViewModel.swift
│   │   ├── WatchlistViewModel.swift
│   │   ├── PlayerViewModel.swift
│   │   └── ProfileViewModel.swift
│   ├── Models/            # Data models
│   ├── Data/
│   │   ├── Rust/          # Rust SDK wrapper
│   │   └── Repository/    # Data access layer
│   └── UI/                # SwiftUI views
│       ├── Home/
│       ├── Catalog/
│       ├── Details/
│       ├── Search/
│       ├── Library/
│       ├── Watchlist/
│       ├── Player/
│       ├── Profile/
│       └── Components/
└── Podfile                # CocoaPods (if needed)
```

#### Supported Platforms

| Platform | Minimum Version |
|----------|-----------------|
| iOS | 15.0 |
| tvOS | 15.0 |
| Swift | 5.9 |

#### Data Flow Pattern

```
┌──────────────────┐
│   SwiftUI View   │
└────────┬─────────┘
         │ @StateObject / @ObservedObject
         ▼
┌──────────────────┐
│    ViewModel     │ ◄── @Published properties
│ (ObservableObject)│
└────────┬─────────┘
         │ async func
         ▼
┌──────────────────┐
│   Repository     │ ◄── Protocol
│ (RustRepository) │
└────────┬─────────┘
         │ FFI call
         ▼
┌──────────────────┐
│    Rust SDK      │ ◄── UniFFI generated
│  (nuvio_core)    │
└──────────────────┘
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### FFI Integration

The Foreign Function Interface (FFI) layer enables seamless communication between Rust and Kotlin/Swift through UniFFI.

#### UniFFI Workflow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Build Process                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Rust Source          2. UniFFI Definition       3. Generated Code    │
│  ┌─────────────┐         ┌─────────────────┐        ┌─────────────────┐  │
│  │  lib.rs     │         │  nuvio_core.udl │        │ NuvioCore.kt    │  │
│  │  types.rs   │ ──────► │  (interface     │ ─────► │ NuvioCore.swift │  │
│  │  services   │         │   definitions)  │        │ libnuvio_core   │  │
│  └─────────────┘         └─────────────────┘        └─────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### FFI-Safe Types

| Rust Type | Kotlin Type | Swift Type |
|-----------|-------------|------------|
| `String` | `String` | `String` |
| `i32`, `i64` | `Int`, `Long` | `Int32`, `Int64` |
| `f32`, `f64` | `Float`, `Double` | `Float`, `Double` |
| `bool` | `Boolean` | `Bool` |
| `Vec<T>` | `List<T>` | `[T]` |
| `Option<T>` | `T?` | `T?` |
| `Result<T, E>` | `throws` | `throws` |
| Custom `struct` | `data class` | `struct` |
| Custom `enum` | `sealed class` | `enum` |

#### Error Handling Across FFI

```rust
// Rust
#[derive(Debug, thiserror::Error)]
pub enum NuvioError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("Parse error: {0}")]
    Parse(String),
    // ...
}
```

```kotlin
// Kotlin - Generated
sealed class NuvioException : Exception() {
    class Network(message: String) : NuvioException()
    class Parse(message: String) : NuvioException()
}

// Usage
try {
    val catalog = nuvioCore.getCatalog(addonUrl)
} catch (e: NuvioException.Network) {
    // Handle network error
}
```

```swift
// Swift - Generated
enum NuvioError: Error {
    case network(String)
    case parse(String)
}

// Usage
do {
    let catalog = try nuvioCore.getCatalog(addonUrl: url)
} catch NuvioError.network(let message) {
    // Handle network error
}
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Installation

### Android
[![Download APK](https://img.shields.io/badge/Download-APK-green?style=for-the-badge)](https://github.com/tapframe/NuvioStreaming/releases/latest)

Download the latest APK from [GitHub Releases](https://github.com/tapframe/NuvioStreaming/releases/latest)

### iOS

#### TestFlight (Recommended)
<img src="https://upload.wikimedia.org/wikipedia/fr/b/bc/TestFlight-icon.png" width="24" height="24" align="left"> [![Join TestFlight](https://img.shields.io/badge/Join-TestFlight-blue?style=for-the-badge)](https://testflight.apple.com/join/QkKMGRqp)

#### AltStore
<img src="https://upload.wikimedia.org/wikipedia/commons/2/20/AltStore_logo.png" width="24" height="24" align="left"> [![Add to AltStore](https://img.shields.io/badge/Add%20to-AltStore-blue?style=for-the-badge)](https://tinyurl.com/NuvioAltstore)

#### SideStore
<img src="https://github.com/SideStore/assets/blob/main/icon.png?raw=true" width="24" height="24" align="left"> [![Add to SideStore](https://img.shields.io/badge/Add%20to-SideStore-green?style=for-the-badge)](https://tinyurl.com/NuvioSidestore)

**Manual URL:** `https://raw.githubusercontent.com/tapframe/NuvioStreaming/main/nuvio-source.json`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Prerequisites

#### Rust Toolchain
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add Android targets
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android

# Add iOS targets
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

#### Android Development
- Android Studio (latest)
- JDK 17+
- Android NDK 27.0.12077973
- Android SDK 35

#### iOS Development
- Xcode 15+
- macOS Ventura or later
- CocoaPods (optional)

### Building the Rust SDK

```bash
# Navigate to project root
cd NuvioStreaming

# Build for all platforms (debug)
npm run rust:build

# Build for Android
npm run rust:build:android

# Build for iOS
npm run rust:build:ios

# Generate FFI bindings
npm run rust:bindings

# Run tests
npm run rust:test

# Lint and format
npm run rust:clippy
npm run rust:fmt
```

### Building Android

```bash
# Using Gradle
cd android
./gradlew assembleDebug        # Debug build
./gradlew assembleRelease      # Release build

# Or using npm scripts
npm run android:build
```

### Building iOS

```bash
# Open in Xcode
open ios/NuvioTV/NuvioTV.xcodeproj

# Or build from command line
cd ios/NuvioTV
xcodebuild -scheme NuvioTV -configuration Debug -sdk appletvsimulator build
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Project Structure

```
NuvioStreaming/
├── rust-sdk/                    # Rust SDK workspace
│   ├── Cargo.toml               # Workspace manifest
│   └── nuvio-core/              # Core library
│       ├── Cargo.toml           # Library manifest
│       └── src/                 # Rust source code
├── android/                     # Android apps
│   ├── app/                     # Phone/tablet app
│   ├── tv/                      # Android TV app
│   ├── shared/                  # Shared library
│   ├── build.gradle             # Root build script
│   └── settings.gradle.kts      # Module settings
├── ios/                         # iOS/tvOS apps
│   └── NuvioTV/                 # Xcode project
├── nuvio-ios/                   # Swift Package
│   ├── Package.swift            # SPM manifest
│   └── Sources/                 # Swift source code
├── assets/                      # Shared assets
├── scripts/                     # Build scripts
├── package.json                 # NPM scripts & metadata
└── README.md                    # This file
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Key Features

### Stremio Addon Integration
- Addon discovery and manifest parsing
- Parallel catalog fetching for performance
- Stream resolution with quality selection
- Metadata aggregation from multiple sources
- Health checks and validation

### Trakt.tv Integration
- OAuth2 authentication with automatic token refresh
- Watch history sync (bi-directional)
- Ratings and reviews
- Personalized recommendations
- Calendar for upcoming releases
- GDPR compliance with offline queue

### Multi-Tier Caching
- **Memory Cache (Moka)**: Fast access for frequently used data
- **Disk Cache (Sled)**: Persistent storage for offline access
- **HTTP Cache**: Response caching with TTL support
- **Smart Invalidation**: Automatic cache cleanup

### Profile Management
- Multiple user profiles
- PIN protection with Argon2 hashing
- Isolated watch histories
- Profile-specific preferences
- Secure data encryption

### Backup & Restore
- Selective backup (profiles, settings, history)
- gzip compression for smaller backups
- Integrity verification
- Local and cloud storage options
- Cross-device restore

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contributing

Contributions make the open-source community amazing! Any contributions are greatly appreciated.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- **Rust**: Follow Rust API Guidelines, run `cargo fmt` and `cargo clippy`
- **Kotlin**: Use Kotlin coding conventions, run `ktlint`
- **Swift**: Follow Swift API Design Guidelines, use SwiftFormat

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Support

If you find Nuvio helpful, consider supporting development:

- **Ko-Fi**: [ko-fi.com/tapframe](https://ko-fi.com/tapframe)
- **GitHub Star**: Star the repo to show support
- **Share**: Tell others about the project

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

Distributed under the GNU GPLv3 License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Acknowledgments

### Technologies
- [Rust](https://www.rust-lang.org/) - Systems programming language
- [UniFFI](https://mozilla.github.io/uniffi-rs/) - Multi-language bindings for Rust
- [Jetpack Compose](https://developer.android.com/jetpack/compose) - Android UI toolkit
- [SwiftUI](https://developer.apple.com/xcode/swiftui/) - iOS/tvOS UI framework
- [Tokio](https://tokio.rs/) - Async runtime for Rust
- [ExoPlayer](https://exoplayer.dev/) - Android media player

### Services
- [Stremio](https://www.stremio.com/) - Addon ecosystem
- [Trakt.tv](https://trakt.tv/) - Watch tracking service
- [TMDb](https://www.themoviedb.org/) - Metadata provider

**Disclaimer:** This application functions as a media hub with addon/plugin support. It does not contain any built-in content or host media content. Content access is only available through user-installed plugins and addons. Any legal concerns should be directed to the specific websites providing the content.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Built With

<p align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=rust,kotlin,swift,androidstudio,apple,gradle&theme=light&perline=6" />
  </a>
  <br/>
  <strong>Rust</strong> | <strong>Kotlin</strong> | <strong>Swift</strong> | <strong>Android Studio</strong> | <strong>Xcode</strong> | <strong>Gradle</strong>
</p>

---

## Star History

<a href="https://www.star-history.com/#tapframe/NuvioStreaming&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=tapframe/NuvioStreaming&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=tapframe/NuvioStreaming&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=tapframe/NuvioStreaming&type=date&legend=top-left" />
 </picture>
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/tapframe/NuvioStreaming.svg?style=for-the-badge
[contributors-url]: https://github.com/tapframe/NuvioStreaming/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/tapframe/NuvioStreaming.svg?style=for-the-badge
[forks-url]: https://github.com/tapframe/NuvioStreaming/network/members
[stars-shield]: https://img.shields.io/github/stars/tapframe/NuvioStreaming.svg?style=for-the-badge
[stars-url]: https://github.com/tapframe/NuvioStreaming/stargazers
[issues-shield]: https://img.shields.io/github/issues/tapframe/NuvioStreaming.svg?style=for-the-badge
[issues-url]: https://github.com/tapframe/NuvioStreaming/issues
[license-shield]: https://img.shields.io/github/license/tapframe/NuvioStreaming.svg?style=for-the-badge
[license-url]: http://www.gnu.org/licenses/gpl-3.0.en.html
