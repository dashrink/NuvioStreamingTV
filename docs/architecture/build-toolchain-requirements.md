# Build Toolchain Requirements for Tri-Layer Architecture

**Document Version**: 1.0
**Last Updated**: 2026-01-13
**Project**: NuvioStreamingTV Tri-Layer Native Architecture
**Purpose**: Comprehensive documentation of build toolchain requirements for Rust SDK core, Kotlin (Android) and Swift (iOS) native layers with FFI bindings

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Rust Toolchain Requirements](#rust-toolchain-requirements)
3. [Android Build Toolchain](#android-build-toolchain)
4. [iOS Build Toolchain](#ios-build-toolchain)
5. [FFI Binding Generation](#ffi-binding-generation)
6. [Target Architecture Matrix](#target-architecture-matrix)
7. [Build System Integration](#build-system-integration)
8. [CI/CD Requirements](#cicd-requirements)
9. [Development Environment Setup](#development-environment-setup)
10. [Verification & Testing](#verification--testing)

---

## Executive Summary

### Toolchain Overview

The tri-layer architecture requires a multi-language build system supporting:

- **Rust SDK Core**: Cross-platform business logic compiled to native libraries
- **Kotlin Native Layer**: Android TV UI with JNI bindings to Rust
- **Swift Native Layer**: iOS/tvOS UI with C-compatible FFI to Rust
- **FFI Bindings**: Automated generation via UniFFI for both platforms

### Key Components

| Component | Tool | Version Requirement | Purpose |
|-----------|------|---------------------|---------|
| **Rust Compiler** | rustup + rustc | 1.70.0+ (stable) | Compile Rust SDK to native libs |
| **Android Cross-Compiler** | cargo-ndk | 3.4.0+ | Build Rust for Android ABIs |
| **iOS Cross-Compiler** | Apple Clang (Xcode) | 15.0+ | Build Rust for iOS/tvOS targets |
| **FFI Generator** | uniffi_bindgen | 0.25.0+ | Generate Kotlin/Swift bindings |
| **Android NDK** | Android NDK | r26+ | Native Android compilation |
| **Xcode** | Xcode + Command Line Tools | 15.0+ | iOS/tvOS development |
| **Gradle** | Gradle | 8.0+ | Android build orchestration |
| **Swift** | Swift | 5.9+ | iOS native development |
| **Kotlin** | Kotlin | 1.9.0+ | Android native development |

### Build Complexity Assessment

| Platform | Build Layers | Toolchain Complexity | Notes |
|----------|-------------|---------------------|-------|
| **Android** | Rust → C ABI → JNI → Kotlin | **HIGH** | Two-layer FFI bridge, multi-arch builds |
| **iOS** | Rust → C ABI → Swift | **MEDIUM** | Direct FFI, universal binary support |
| **TV Platforms** | Same as mobile + focus APIs | **HIGH** | Additional TV-specific considerations |

---

## Rust Toolchain Requirements

### 1. Rustup Installation

**Purpose**: Manage Rust compiler versions and cross-compilation targets

**Installation (macOS/Linux)**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Installation (Windows)**:
```powershell
# Download and run rustup-init.exe from https://rustup.rs/
```

**Verification**:
```bash
rustup --version  # Expected: rustup 1.26.0+
rustc --version   # Expected: rustc 1.70.0+ (stable)
cargo --version   # Expected: cargo 1.70.0+
```

### 2. Rust Stable Channel

**Configuration**:
```bash
rustup default stable
rustup update stable
```

**Rationale**:
- Stable ABI guarantees (with `extern "C"`)
- Production-ready compiler optimizations
- Compatibility with UniFFI tooling

### 3. Required Cargo Tools

**Install cargo-ndk** (Android cross-compilation):
```bash
cargo install cargo-ndk --version 3.4.0
```

**Install uniffi_bindgen** (FFI binding generation):
```bash
cargo install uniffi_bindgen --version 0.25.0
```

**Install additional development tools**:
```bash
cargo install cargo-watch      # Auto-rebuild on changes
cargo install cargo-audit      # Security vulnerability scanning
cargo install cargo-outdated   # Dependency update checking
```

**Verification**:
```bash
cargo ndk --version      # Expected: cargo-ndk 3.4.0+
uniffi-bindgen --version # Expected: uniffi_bindgen 0.25.0+
```

### 4. Rust Cross-Compilation Targets

#### Android Targets

**Installation**:
```bash
# ARM 64-bit (modern Android devices/TV)
rustup target add aarch64-linux-android

# ARM 32-bit (legacy devices)
rustup target add armv7-linux-androideabi

# x86 64-bit (emulator)
rustup target add x86_64-linux-android

# x86 32-bit (legacy emulator)
rustup target add i686-linux-android
```

**Target Matrix**:
| Target Triple | ABI Name | Usage | Priority |
|--------------|----------|-------|----------|
| `aarch64-linux-android` | arm64-v8a | Modern devices/TV | **CRITICAL** |
| `armv7-linux-androideabi` | armeabi-v7a | Legacy devices | **MEDIUM** |
| `x86_64-linux-android` | x86_64 | Emulator testing | **LOW** |
| `i686-linux-android` | x86 | Legacy emulator | **LOW** |

#### iOS/tvOS Targets

**Installation**:
```bash
# iOS 64-bit (iPhone/iPad)
rustup target add aarch64-apple-ios

# iOS Simulator (ARM Mac)
rustup target add aarch64-apple-ios-sim

# iOS Simulator (Intel Mac)
rustup target add x86_64-apple-ios

# tvOS 64-bit (Apple TV)
rustup target add aarch64-apple-tvos

# tvOS Simulator (ARM Mac)
rustup target add aarch64-apple-tvos-sim

# tvOS Simulator (Intel Mac)
rustup target add x86_64-apple-tvos
```

**Target Matrix**:
| Target Triple | Platform | Usage | Priority |
|--------------|----------|-------|----------|
| `aarch64-apple-ios` | iPhone/iPad (ARM) | Production iOS | **HIGH** |
| `aarch64-apple-ios-sim` | iOS Simulator (M1/M2) | Development | **MEDIUM** |
| `x86_64-apple-ios` | iOS Simulator (Intel) | Legacy dev | **LOW** |
| `aarch64-apple-tvos` | Apple TV (ARM) | Production tvOS | **CRITICAL** |
| `aarch64-apple-tvos-sim` | tvOS Simulator (M1/M2) | Development | **MEDIUM** |
| `x86_64-apple-tvos` | tvOS Simulator (Intel) | Legacy dev | **LOW** |

**Verification**:
```bash
rustup target list --installed
# Should show all installed targets
```

### 5. Rust Compiler Configuration

**Create `.cargo/config.toml`** in rust-sdk root:

```toml
[build]
# Parallel compilation
jobs = 4

[target.aarch64-linux-android]
linker = "aarch64-linux-android-clang"
ar = "aarch64-linux-android-ar"

[target.armv7-linux-androideabi]
linker = "armv7a-linux-androideabi-clang"
ar = "armv7a-linux-androideabi-ar"

[target.x86_64-linux-android]
linker = "x86_64-linux-android-clang"
ar = "x86_64-linux-android-ar"

[target.i686-linux-android]
linker = "i686-linux-android-clang"
ar = "i686-linux-android-ar"

# iOS/tvOS targets use Xcode toolchain (auto-configured)
```

---

## Android Build Toolchain

### 1. Android Studio

**Version**: Android Studio Hedgehog (2023.1.1) or later

**Download**: https://developer.android.com/studio

**Required Components**:
- Android SDK Platform 35 (API 35 - Android 15)
- Android SDK Platform 26 (API 26 - Android 8.0, minimum)
- Android SDK Build-Tools 35.0.0+
- Android Emulator (for testing)
- Android SDK Platform-Tools

**Installation Path**:
- **macOS**: `~/Library/Android/sdk`
- **Linux**: `~/Android/Sdk`
- **Windows**: `C:\Users\<username>\AppData\Local\Android\Sdk`

### 2. Android NDK (Native Development Kit)

**Version**: NDK r26d or later

**Installation via Android Studio**:
1. Open Android Studio
2. Tools → SDK Manager
3. SDK Tools tab
4. Check "NDK (Side by side)"
5. Select version r26d or later
6. Click "Apply" to install

**Installation via Command Line**:
```bash
# Using sdkmanager
sdkmanager --install "ndk;26.3.11579264"
```

**Environment Variables**:
```bash
# Add to ~/.bashrc, ~/.zshrc, or equivalent
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux
# export ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk  # Windows

export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264
export PATH=$ANDROID_HOME/platform-tools:$PATH
export PATH=$ANDROID_HOME/tools:$PATH
```

**Verification**:
```bash
echo $ANDROID_HOME
echo $ANDROID_NDK_HOME
ls $ANDROID_NDK_HOME/toolchains/llvm/prebuilt/*/bin/
# Should show clang, clang++, and target-specific compilers
```

### 3. cargo-ndk Configuration

**Purpose**: Simplifies building Rust for Android by auto-configuring NDK toolchain

**Usage Example**:
```bash
# Build for single architecture
cargo ndk -t arm64-v8a build --release

# Build for multiple architectures
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 build --release

# Output location: target/<target-triple>/release/libnuvio_core.so
```

**Cargo.toml Configuration**:
```toml
[lib]
crate-type = ["cdylib", "staticlib"]
name = "nuvio_core"

[package.metadata.android]
# Minimum API level (Android 8.0+)
minSdkVersion = 26
# Target API level (Android 15)
targetSdkVersion = 35
```

### 4. JNI Integration Requirements

**Java Native Interface (JNI)** bridges Kotlin to C-compatible Rust:

**Key Files**:
- `rust-sdk/src/ffi/android.rs` - JNI entry points
- `android/app/src/main/cpp/` - JNI C++ bridge (if needed)
- `android/app/src/main/jniLibs/` - Compiled .so libraries

**Build Output Structure**:
```
android/app/src/main/jniLibs/
├── arm64-v8a/
│   └── libnuvio_core.so
├── armeabi-v7a/
│   └── libnuvio_core.so
├── x86_64/
│   └── libnuvio_core.so
└── x86/
    └── libnuvio_core.so
```

### 5. Gradle Integration

**build.gradle Configuration**:

```gradle
android {
    // NDK configuration
    ndkVersion "26.3.11579264"

    defaultConfig {
        minSdkVersion 26
        targetSdkVersion 35

        ndk {
            abiFilters 'arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86'
        }
    }

    // Source sets for JNI libs
    sourceSets {
        main {
            jniLibs.srcDirs = ['src/main/jniLibs']
        }
    }
}

// Task to build Rust libraries
tasks.register('buildRustLibs') {
    doLast {
        exec {
            workingDir '../../rust-sdk'
            commandLine 'cargo', 'ndk',
                '-t', 'arm64-v8a',
                '-t', 'armeabi-v7a',
                '-t', 'x86_64',
                '-t', 'x86',
                'build', '--release'
        }

        // Copy .so files to jniLibs
        copy {
            from '../../rust-sdk/target'
            into 'src/main/jniLibs'
            include '**/libnuvio_core.so'
            eachFile { path ->
                // Map target triple to ABI name
                // aarch64-linux-android → arm64-v8a
                // etc.
            }
        }
    }
}

// Make buildRustLibs run before Java compilation
preBuild.dependsOn buildRustLibs
```

### 6. Kotlin Native Module Setup

**NuvioNativeModule.kt** (Example structure):
```kotlin
package com.nuvio.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class NuvioNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        init {
            System.loadLibrary("nuvio_core")
        }
    }

    override fun getName() = "NuvioCore"

    @ReactMethod
    fun initialize(config: String, promise: Promise) {
        try {
            val result = nativeInitialize(config)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    // JNI declarations
    private external fun nativeInitialize(config: String): String
}
```

---

## iOS Build Toolchain

### 1. Xcode Installation

**Version**: Xcode 15.0 or later

**Download**: Mac App Store or https://developer.apple.com/download/

**Required Components**:
- Xcode IDE
- iOS SDK 17.0+
- tvOS SDK 17.0+
- Command Line Tools

**Installation Verification**:
```bash
xcodebuild -version
# Expected: Xcode 15.0+

xcode-select -p
# Expected: /Applications/Xcode.app/Contents/Developer

xcrun --show-sdk-path
# Expected: SDK path for iOS/tvOS
```

**Command Line Tools Installation**:
```bash
xcode-select --install
```

### 2. iOS SDK Requirements

**Minimum Deployment Targets**:
- **iOS**: 15.0+ (to match React Native 0.81.4 requirements)
- **tvOS**: 15.1+ (to match current Podfile configuration)

**SDK Verification**:
```bash
# List available SDKs
xcodebuild -showsdks

# Expected output includes:
# iOS SDKs:
#   iOS 17.2  -sdk iphoneos17.2
# tvOS SDKs:
#   tvOS 17.2  -sdk appletvos17.2
# iOS Simulator SDKs:
#   Simulator - iOS 17.2  -sdk iphonesimulator17.2
# tvOS Simulator SDKs:
#   Simulator - tvOS 17.2  -sdk appletvsimulator17.2
```

### 3. Apple Silicon vs Intel Considerations

**Universal Binary Support**:

The build system must support both Apple Silicon (M1/M2/M3) and Intel Macs:

| Mac Architecture | Rust Host Target | iOS Simulator Target |
|-----------------|------------------|---------------------|
| Apple Silicon (ARM) | `aarch64-apple-darwin` | `aarch64-apple-ios-sim` |
| Intel (x86_64) | `x86_64-apple-darwin` | `x86_64-apple-ios` |

**Build Script Example**:
```bash
#!/bin/bash
# build-ios.sh

# Detect Mac architecture
if [[ $(uname -m) == 'arm64' ]]; then
    SIMULATOR_TARGET="aarch64-apple-ios-sim"
else
    SIMULATOR_TARGET="x86_64-apple-ios"
fi

# Build for device (always ARM)
cargo build --target aarch64-apple-ios --release

# Build for simulator (architecture-specific)
cargo build --target $SIMULATOR_TARGET --release

# Create universal binary for iOS device (future-proofing)
lipo -create \
    target/aarch64-apple-ios/release/libnuvio_core.a \
    -output target/universal/libnuvio_core.a
```

### 4. Rust Library Integration with Xcode

**Swift Package Manager (Recommended)**:

Create `Package.swift` for Rust bindings:
```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "NuvioCore",
    platforms: [
        .iOS(.v15),
        .tvOS(.v15)
    ],
    products: [
        .library(
            name: "NuvioCore",
            targets: ["NuvioCore"]
        )
    ],
    targets: [
        .binaryTarget(
            name: "RustCore",
            path: "../rust-sdk/target/universal/libnuvio_core.xcframework"
        ),
        .target(
            name: "NuvioCore",
            dependencies: ["RustCore"],
            path: "Sources/NuvioCore",
            publicHeadersPath: "include"
        )
    ]
)
```

**Xcode Build Phase**:

Add "Run Script" build phase before "Compile Sources":
```bash
#!/bin/bash
set -e

RUST_SDK_PATH="${PROJECT_DIR}/../rust-sdk"

# Build Rust for current architecture
if [ "$PLATFORM_NAME" == "iphonesimulator" ]; then
    if [ "$(uname -m)" == "arm64" ]; then
        RUST_TARGET="aarch64-apple-ios-sim"
    else
        RUST_TARGET="x86_64-apple-ios"
    fi
elif [ "$PLATFORM_NAME" == "appletvsimulator" ]; then
    if [ "$(uname -m)" == "arm64" ]; then
        RUST_TARGET="aarch64-apple-tvos-sim"
    else
        RUST_TARGET="x86_64-apple-tvos"
    fi
elif [ "$PLATFORM_NAME" == "appletvos" ]; then
    RUST_TARGET="aarch64-apple-tvos"
else
    RUST_TARGET="aarch64-apple-ios"
fi

echo "Building Rust for target: $RUST_TARGET"
cd "$RUST_SDK_PATH"
cargo build --target "$RUST_TARGET" --release

# Copy library to expected location
cp "target/$RUST_TARGET/release/libnuvio_core.a" \
   "${BUILT_PRODUCTS_DIR}/libnuvio_core.a"
```

### 5. Bridging Header Configuration

**NuvioCore-Bridging-Header.h**:
```c
#ifndef NuvioCore_Bridging_Header_h
#define NuvioCore_Bridging_Header_h

#include "nuvio_core.h"  // Generated by UniFFI

#endif
```

**Xcode Configuration**:
- **Build Settings** → **Swift Compiler - General**
- **Objective-C Bridging Header**: `$(PROJECT_DIR)/NuvioCore-Bridging-Header.h`

### 6. Swift Native Module Setup

**NuvioNativeModule.swift** (Example structure):
```swift
import Foundation
import NuvioCore

@objc(NuvioCore)
class NuvioNativeModule: NSObject {

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc
    func initialize(_ config: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        do {
            // Call Rust FFI via UniFFI-generated bindings
            let result = try nuvioInitialize(config: config)
            resolve(result)
        } catch {
            reject("INIT_ERROR", error.localizedDescription, error)
        }
    }
}
```

---

## FFI Binding Generation

### 1. UniFFI Overview

**What is UniFFI?**
- Mozilla-developed FFI binding generator
- Generates idiomatic Kotlin and Swift from Rust
- Handles memory management automatically
- Supports complex types (strings, enums, structs, callbacks)
- Battle-tested in Firefox mobile apps

**Why UniFFI for Nuvio?**
| Requirement | UniFFI Solution |
|-------------|----------------|
| Kotlin + Swift bindings | ✅ Both generated from single source |
| Complex data structures | ✅ Automatic serialization |
| Memory safety | ✅ Automatic cleanup, no manual free() |
| Async operations | ✅ Coroutines (Kotlin), async/await (Swift) |
| Error handling | ✅ Exceptions mapped across FFI |
| Maintenance burden | ✅ Low - update .udl, regenerate bindings |

**Alternative Considered**: cbindgen
- **Pros**: C header generation, fine-grained control
- **Cons**: Manual JNI layer for Android, manual memory management, no async support
- **Decision**: UniFFI for automation, cbindgen as fallback for low-level needs

### 2. UniFFI Installation

**Via cargo**:
```bash
cargo install uniffi_bindgen --version 0.25.0
```

**Verification**:
```bash
uniffi-bindgen --version
# Expected: uniffi_bindgen 0.25.0

uniffi-bindgen --help
# Shows available commands: generate, scaffolding, etc.
```

### 3. UniFFI Project Structure

**Rust SDK Layout**:
```
rust-sdk/
├── Cargo.toml
├── src/
│   ├── lib.rs              # Main library entry
│   ├── ffi.rs              # FFI interface definitions
│   └── nuvio_core.udl      # UniFFI definition language
├── uniffi-bindings/
│   ├── android/            # Generated Kotlin bindings
│   │   └── com/nuvio/core/
│   │       └── NuvioCore.kt
│   └── ios/                # Generated Swift bindings
│       ├── NuvioCore.swift
│       └── NuvioCore.h
└── target/
    └── <various build artifacts>
```

### 4. UniFFI Definition Language (UDL)

**nuvio_core.udl Example**:
```rust
namespace nuvio_core {
    // Initialize the SDK
    [Throws=NuvioError]
    string initialize(string config);

    // Get catalog data
    [Throws=NuvioError]
    sequence<CatalogItem> get_catalog(string source_id);
};

// Error type for all FFI operations
[Error]
enum NuvioError {
    "NetworkError",
    "ParseError",
    "AuthenticationError",
    "ConfigurationError",
};

// Catalog item model
dictionary CatalogItem {
    string id;
    string title;
    string? description;
    string thumbnail_url;
    string source;
    CatalogItemType item_type;
};

enum CatalogItemType {
    "Movie",
    "TvShow",
    "Episode",
};

// Async operations (callback-based)
[Trait]
interface StreamCallback {
    void on_progress(u32 percent);
    void on_complete(string result);
    void on_error(NuvioError error);
};
```

### 5. Binding Generation Commands

**Generate Kotlin Bindings**:
```bash
uniffi-bindgen generate \
    --language kotlin \
    --out-dir uniffi-bindings/android \
    src/nuvio_core.udl
```

**Generate Swift Bindings**:
```bash
uniffi-bindgen generate \
    --language swift \
    --out-dir uniffi-bindings/ios \
    src/nuvio_core.udl
```

**Automated Build Script** (`build-bindings.sh`):
```bash
#!/bin/bash
set -e

echo "🔨 Building Rust libraries..."
cargo build --release

echo "📦 Generating Kotlin bindings..."
uniffi-bindgen generate \
    --language kotlin \
    --out-dir uniffi-bindings/android \
    src/nuvio_core.udl

echo "📦 Generating Swift bindings..."
uniffi-bindgen generate \
    --language swift \
    --out-dir uniffi-bindings/ios \
    src/nuvio_core.udl

echo "✅ FFI bindings generated successfully"
```

### 6. Rust Implementation with UniFFI

**Cargo.toml Dependencies**:
```toml
[dependencies]
uniffi = "0.25.0"

[build-dependencies]
uniffi = { version = "0.25.0", features = ["build"] }

[lib]
crate-type = ["cdylib", "staticlib"]
```

**build.rs** (Build script):
```rust
fn main() {
    uniffi::generate_scaffolding("src/nuvio_core.udl")
        .expect("Failed to generate UniFFI scaffolding");
}
```

**src/ffi.rs** (Implementation):
```rust
use uniffi;

// UniFFI macro generates FFI glue
uniffi::include_scaffolding!("nuvio_core");

// Error type matching UDL
#[derive(Debug, thiserror::Error)]
pub enum NuvioError {
    #[error("Network error: {0}")]
    NetworkError(String),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("Authentication error: {0}")]
    AuthenticationError(String),
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}

// Structs matching UDL
#[derive(uniffi::Record)]
pub struct CatalogItem {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub thumbnail_url: String,
    pub source: String,
    pub item_type: CatalogItemType,
}

#[derive(uniffi::Enum)]
pub enum CatalogItemType {
    Movie,
    TvShow,
    Episode,
}

// Public API matching UDL namespace
pub fn initialize(config: String) -> Result<String, NuvioError> {
    // Implementation
    Ok("Initialized".to_string())
}

pub fn get_catalog(source_id: String) -> Result<Vec<CatalogItem>, NuvioError> {
    // Implementation
    Ok(vec![])
}
```

### 7. Memory Management with UniFFI

**Automatic Resource Cleanup**:

UniFFI handles memory management across FFI boundaries:

```rust
// Rust allocates, UniFFI tracks lifecycle
#[derive(uniffi::Object)]
pub struct NuvioSession {
    connection: DatabaseConnection,
}

#[uniffi::export]
impl NuvioSession {
    #[uniffi::constructor]
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            connection: DatabaseConnection::new(),
        })
    }

    pub fn query(&self, sql: String) -> Result<Vec<Row>, NuvioError> {
        // Query implementation
    }
}

// Kotlin usage (automatic cleanup)
val session = NuvioSession()
try {
    val results = session.query("SELECT * FROM catalog")
    // Use results
} finally {
    // session is automatically cleaned up when out of scope
}

// Swift usage (automatic cleanup via ARC)
let session = NuvioSession()
let results = try session.query(sql: "SELECT * FROM catalog")
// session automatically deallocated when out of scope
```

**Key Benefits**:
1. ✅ No manual `free()` functions needed
2. ✅ Kotlin uses try-with-resources pattern
3. ✅ Swift uses ARC (Automatic Reference Counting)
4. ✅ Rust `Drop` trait ensures cleanup
5. ✅ Prevents double-free and use-after-free bugs

---

## Target Architecture Matrix

### Comprehensive Build Target Table

| Platform | Architecture | Rust Target | ABI/Framework | Build Priority | Notes |
|----------|-------------|-------------|---------------|----------------|-------|
| **Android Device** | ARM 64-bit | `aarch64-linux-android` | arm64-v8a | ⭐⭐⭐ CRITICAL | Modern phones/TV |
| **Android Device** | ARM 32-bit | `armv7-linux-androideabi` | armeabi-v7a | ⭐⭐ HIGH | Legacy devices |
| **Android Emulator** | x86 64-bit | `x86_64-linux-android` | x86_64 | ⭐ MEDIUM | Dev/testing |
| **Android Emulator** | x86 32-bit | `i686-linux-android` | x86 | ⭐ LOW | Legacy emulator |
| **iOS Device** | ARM 64-bit | `aarch64-apple-ios` | N/A (static lib) | ⭐⭐⭐ HIGH | iPhone/iPad |
| **iOS Simulator** | ARM 64-bit | `aarch64-apple-ios-sim` | N/A (static lib) | ⭐⭐ MEDIUM | M1/M2/M3 Mac |
| **iOS Simulator** | x86 64-bit | `x86_64-apple-ios` | N/A (static lib) | ⭐ LOW | Intel Mac |
| **tvOS Device** | ARM 64-bit | `aarch64-apple-tvos` | N/A (static lib) | ⭐⭐⭐ CRITICAL | Apple TV 4K |
| **tvOS Simulator** | ARM 64-bit | `aarch64-apple-tvos-sim` | N/A (static lib) | ⭐⭐ MEDIUM | M1/M2/M3 Mac |
| **tvOS Simulator** | x86 64-bit | `x86_64-apple-tvos` | N/A (static lib) | ⭐ LOW | Intel Mac |

### Build Configuration by Environment

**Development (Local Machine)**:
```bash
# Android: arm64 device + x86_64 emulator
cargo ndk -t arm64-v8a -t x86_64 build --release

# iOS/tvOS: Device + simulator for current Mac architecture
if [[ $(uname -m) == 'arm64' ]]; then
    TARGETS="aarch64-apple-ios aarch64-apple-ios-sim aarch64-apple-tvos aarch64-apple-tvos-sim"
else
    TARGETS="aarch64-apple-ios x86_64-apple-ios aarch64-apple-tvos x86_64-apple-tvos"
fi

for target in $TARGETS; do
    cargo build --target $target --release
done
```

**CI/CD (GitHub Actions)**:
```yaml
# Build all production targets
- Android: arm64-v8a, armeabi-v7a
- iOS: aarch64-apple-ios (device only)
- tvOS: aarch64-apple-tvos (device only)
```

**Testing**:
```bash
# Full matrix for comprehensive testing
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 build --release
# iOS/tvOS: All simulator + device targets
```

### Architecture-Specific Considerations

**Android ARM64 (arm64-v8a)**:
- **Importance**: Primary Android architecture (95%+ modern devices)
- **Performance**: Native 64-bit performance
- **TV Support**: All Android TV devices are ARM64
- **Build Time**: ~30-60s (baseline)

**Android ARM32 (armeabi-v7a)**:
- **Importance**: Legacy device support
- **Performance**: 32-bit limitations
- **TV Support**: Very old Android TV boxes
- **Build Time**: ~30-60s
- **Considerations**: May drop in future (Google deprecated 32-bit)

**Apple ARM64 (aarch64-apple-tvos)**:
- **Importance**: CRITICAL - All Apple TV 4K devices
- **Performance**: Excellent (Apple Silicon)
- **TV Support**: Primary target for tvOS
- **Build Time**: ~45-90s
- **Considerations**: Only architecture for modern Apple TV

**Simulator Targets**:
- **Purpose**: Development and testing only
- **Performance**: Not representative of device performance
- **Build Strategy**: Include Mac-architecture-specific simulator only
- **Deployment**: Never deployed to production

---

## Build System Integration

### 1. Gradle Integration (Android)

**Project Structure**:
```
android/
├── app/
│   ├── build.gradle         # App-level build config
│   ├── src/
│   │   └── main/
│   │       ├── java/com/nuvio/app/
│   │       │   ├── NuvioNativeModule.kt
│   │       │   └── ...
│   │       └── jniLibs/     # Rust .so libraries
│   │           ├── arm64-v8a/
│   │           ├── armeabi-v7a/
│   │           ├── x86_64/
│   │           └── x86/
│   └── ...
├── build.gradle             # Project-level build config
└── settings.gradle
```

**Root build.gradle** (Project-level):
```gradle
buildscript {
    ext {
        kotlinVersion = '1.9.0'
        rustVersion = '1.70.0'  // Documentation only
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"
    }
}
```

**app/build.gradle** (App-level):
```gradle
plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    namespace 'com.nuvio.app'
    compileSdk 35
    ndkVersion "26.3.11579264"

    defaultConfig {
        applicationId "com.nuvio.app"
        minSdk 26
        targetSdk 35

        ndk {
            abiFilters 'arm64-v8a', 'armeabi-v7a'  // Production targets
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
        }
    }

    sourceSets {
        main {
            jniLibs.srcDirs = ['src/main/jniLibs']
        }
    }
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlinVersion"
    // ... other dependencies
}

// Custom tasks for Rust compilation
def rustProjectDir = file('../../rust-sdk')
def jniLibsDir = file('src/main/jniLibs')

task buildRustRelease(type: Exec) {
    description = 'Build Rust libraries for Android'
    workingDir rustProjectDir

    commandLine 'cargo', 'ndk',
        '-t', 'arm64-v8a',
        '-t', 'armeabi-v7a',
        'build', '--release'
}

task copyRustLibs(type: Copy, dependsOn: buildRustRelease) {
    description = 'Copy Rust .so files to jniLibs'

    from("${rustProjectDir}/target") {
        include 'aarch64-linux-android/release/libnuvio_core.so'
        include 'armv7-linux-androideabi/release/libnuvio_core.so'
    }

    into jniLibsDir

    eachFile { fileCopyDetails ->
        def targetPath = fileCopyDetails.path
        if (targetPath.contains('aarch64-linux-android')) {
            fileCopyDetails.path = "arm64-v8a/libnuvio_core.so"
        } else if (targetPath.contains('armv7-linux-androideabi')) {
            fileCopyDetails.path = "armeabi-v7a/libnuvio_core.so"
        }
    }
}

task generateUniFFIBindings(type: Exec) {
    description = 'Generate Kotlin FFI bindings via UniFFI'
    workingDir rustProjectDir

    commandLine 'uniffi-bindgen', 'generate',
        '--language', 'kotlin',
        '--out-dir', '../android/app/src/main/java',
        'src/nuvio_core.udl'
}

// Ensure Rust builds before Java/Kotlin compilation
preBuild.dependsOn copyRustLibs
preBuild.dependsOn generateUniFFIBindings
```

### 2. Xcode Integration (iOS/tvOS)

**Xcode Build Phase Script**:

Add "Run Script" phase named "Build Rust Libraries":

```bash
#!/bin/bash
set -e

RUST_SDK="${PROJECT_DIR}/../../rust-sdk"
BUILD_DIR="${BUILT_PRODUCTS_DIR}"

# Determine target architecture
if [ "${PLATFORM_NAME}" == "iphonesimulator" ]; then
    if [ "$(uname -m)" == "arm64" ]; then
        RUST_TARGET="aarch64-apple-ios-sim"
    else
        RUST_TARGET="x86_64-apple-ios"
    fi
elif [ "${PLATFORM_NAME}" == "appletvsimulator" ]; then
    if [ "$(uname -m)" == "arm64" ]; then
        RUST_TARGET="aarch64-apple-tvos-sim"
    else
        RUST_TARGET="x86_64-apple-tvos"
    fi
elif [ "${PLATFORM_NAME}" == "appletvos" ]; then
    RUST_TARGET="aarch64-apple-tvos"
else
    RUST_TARGET="aarch64-apple-ios"
fi

echo "Building Rust for ${RUST_TARGET}"

# Build Rust
cd "${RUST_SDK}"
cargo build --target "${RUST_TARGET}" --release

# Generate UniFFI bindings
uniffi-bindgen generate \
    --language swift \
    --out-dir "${PROJECT_DIR}/Generated" \
    src/nuvio_core.udl

# Copy static library
cp "target/${RUST_TARGET}/release/libnuvio_core.a" \
   "${BUILD_DIR}/libnuvio_core.a"

echo "✅ Rust build complete for ${RUST_TARGET}"
```

**Build Settings**:
- **Library Search Paths**: `$(BUILT_PRODUCTS_DIR)`
- **Header Search Paths**: `$(PROJECT_DIR)/Generated`
- **Other Linker Flags**: `-lnuvio_core`
- **Swift Bridging Header**: `$(PROJECT_DIR)/NuvioCore-Bridging-Header.h`

### 3. Unified Build Script

**build-all.sh** (Cross-platform build orchestrator):

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUST_SDK_DIR="${SCRIPT_DIR}/rust-sdk"
ANDROID_DIR="${SCRIPT_DIR}/android"
IOS_DIR="${SCRIPT_DIR}/ios"

echo "🔨 Nuvio Tri-Layer Build System"
echo "================================"

# Parse arguments
BUILD_ANDROID=false
BUILD_IOS=false
BUILD_ALL=false
RELEASE_MODE=false

for arg in "$@"; do
    case $arg in
        --android) BUILD_ANDROID=true ;;
        --ios) BUILD_IOS=true ;;
        --all) BUILD_ALL=true ;;
        --release) RELEASE_MODE=true ;;
        *) echo "Unknown argument: $arg" ;;
    esac
done

if [ "$BUILD_ALL" == "true" ]; then
    BUILD_ANDROID=true
    BUILD_IOS=true
fi

# Determine build profile
if [ "$RELEASE_MODE" == "true" ]; then
    BUILD_PROFILE="--release"
    PROFILE_DIR="release"
else
    BUILD_PROFILE=""
    PROFILE_DIR="debug"
fi

# Build Android
if [ "$BUILD_ANDROID" == "true" ]; then
    echo ""
    echo "📱 Building Android..."
    echo "---------------------"

    cd "$RUST_SDK_DIR"

    cargo ndk \
        -t arm64-v8a \
        -t armeabi-v7a \
        build $BUILD_PROFILE

    echo "📦 Generating Kotlin bindings..."
    uniffi-bindgen generate \
        --language kotlin \
        --out-dir "${ANDROID_DIR}/app/src/main/java" \
        src/nuvio_core.udl

    echo "✅ Android build complete"
fi

# Build iOS/tvOS
if [ "$BUILD_IOS" == "true" ]; then
    echo ""
    echo "🍎 Building iOS/tvOS..."
    echo "----------------------"

    cd "$RUST_SDK_DIR"

    # Determine simulator targets based on Mac architecture
    if [[ $(uname -m) == 'arm64' ]]; then
        IOS_SIM_TARGET="aarch64-apple-ios-sim"
        TVOS_SIM_TARGET="aarch64-apple-tvos-sim"
    else
        IOS_SIM_TARGET="x86_64-apple-ios"
        TVOS_SIM_TARGET="x86_64-apple-tvos"
    fi

    # Build all iOS/tvOS targets
    for target in \
        aarch64-apple-ios \
        $IOS_SIM_TARGET \
        aarch64-apple-tvos \
        $TVOS_SIM_TARGET
    do
        echo "Building $target..."
        cargo build --target "$target" $BUILD_PROFILE
    done

    echo "📦 Generating Swift bindings..."
    uniffi-bindgen generate \
        --language swift \
        --out-dir "${IOS_DIR}/Generated" \
        src/nuvio_core.udl

    echo "✅ iOS/tvOS build complete"
fi

echo ""
echo "🎉 Build complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "  • Android: Open Android Studio and build/run the app"
echo "  • iOS: Open Xcode and build/run the app"
```

**Usage Examples**:
```bash
# Build everything in debug mode
./build-all.sh --all

# Build Android only in release mode
./build-all.sh --android --release

# Build iOS only
./build-all.sh --ios
```

---

## CI/CD Requirements

### GitHub Actions Workflow Configuration

**File**: `.github/workflows/rust-build.yml`

```yaml
name: Rust SDK Multi-Platform Build

on:
  push:
    branches: [main, develop]
    paths:
      - 'rust-sdk/**'
      - '.github/workflows/rust-build.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'rust-sdk/**'

env:
  CARGO_TERM_COLOR: always
  RUST_VERSION: 1.70.0

jobs:
  # Android build
  build-android:
    name: Build Android Libraries
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}
          targets: aarch64-linux-android,armv7-linux-androideabi

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install Android NDK
        run: |
          sdkmanager --install "ndk;26.3.11579264"
          echo "ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264" >> $GITHUB_ENV

      - name: Install cargo-ndk
        run: cargo install cargo-ndk --version 3.4.0

      - name: Install UniFFI
        run: cargo install uniffi_bindgen --version 0.25.0

      - name: Cache Cargo
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            rust-sdk/target
          key: ${{ runner.os }}-cargo-android-${{ hashFiles('**/Cargo.lock') }}

      - name: Build Rust for Android
        working-directory: rust-sdk
        run: |
          cargo ndk \
            -t arm64-v8a \
            -t armeabi-v7a \
            build --release

      - name: Generate Kotlin bindings
        working-directory: rust-sdk
        run: |
          uniffi-bindgen generate \
            --language kotlin \
            --out-dir ../android/app/src/main/java \
            src/nuvio_core.udl

      - name: Upload Android artifacts
        uses: actions/upload-artifact@v3
        with:
          name: android-rust-libs
          path: |
            rust-sdk/target/aarch64-linux-android/release/libnuvio_core.so
            rust-sdk/target/armv7-linux-androideabi/release/libnuvio_core.so
          retention-days: 7

  # iOS/tvOS build
  build-ios:
    name: Build iOS/tvOS Libraries
    runs-on: macos-14  # M1 runner for native ARM builds

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}
          targets: aarch64-apple-ios,aarch64-apple-tvos,aarch64-apple-ios-sim,aarch64-apple-tvos-sim

      - name: Install UniFFI
        run: cargo install uniffi_bindgen --version 0.25.0

      - name: Cache Cargo
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            rust-sdk/target
          key: ${{ runner.os }}-cargo-ios-${{ hashFiles('**/Cargo.lock') }}

      - name: Build Rust for iOS/tvOS
        working-directory: rust-sdk
        run: |
          # Device targets
          cargo build --target aarch64-apple-ios --release
          cargo build --target aarch64-apple-tvos --release

          # Simulator targets (ARM for M1 runner)
          cargo build --target aarch64-apple-ios-sim --release
          cargo build --target aarch64-apple-tvos-sim --release

      - name: Generate Swift bindings
        working-directory: rust-sdk
        run: |
          uniffi-bindgen generate \
            --language swift \
            --out-dir ../ios/Generated \
            src/nuvio_core.udl

      - name: Upload iOS artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ios-rust-libs
          path: |
            rust-sdk/target/aarch64-apple-ios/release/libnuvio_core.a
            rust-sdk/target/aarch64-apple-tvos/release/libnuvio_core.a
          retention-days: 7

  # Rust tests
  test-rust:
    name: Test Rust SDK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}

      - name: Cache Cargo
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            rust-sdk/target
          key: ${{ runner.os }}-cargo-test-${{ hashFiles('**/Cargo.lock') }}

      - name: Run Rust tests
        working-directory: rust-sdk
        run: cargo test --all-features

      - name: Run Rust lints
        working-directory: rust-sdk
        run: |
          cargo fmt -- --check
          cargo clippy -- -D warnings
```

### CI/CD Environment Requirements

**GitHub Actions Runner Images**:
- **Android**: `ubuntu-latest` (Ubuntu 22.04)
- **iOS/tvOS**: `macos-14` (macOS 14 Sonoma with M1 chip)

**Required Secrets** (None for build - all public tooling):
- No secrets required for Rust compilation
- API keys for deployment only (separate workflow)

**Build Time Estimates** (on GitHub Actions):
- **Android build**: ~5-8 minutes (with caching)
- **iOS build**: ~6-10 minutes (with caching)
- **Tests**: ~3-5 minutes
- **Total parallel**: ~10 minutes

**Artifact Storage**:
- `.so` files (Android): ~2-5 MB per architecture
- `.a` files (iOS): ~3-7 MB per architecture
- Retention: 7 days for PR builds, 30 days for releases

---

## Development Environment Setup

### Complete Setup Guide for New Developers

#### Prerequisites

**Operating System Requirements**:
- **macOS**: 12.0+ (for iOS/tvOS development)
- **Linux**: Ubuntu 20.04+ or equivalent (for Android only)
- **Windows**: Windows 10+ with WSL2 (Android only, limited support)

**Minimum Hardware**:
- **CPU**: Quad-core Intel/AMD or Apple Silicon
- **RAM**: 16 GB (32 GB recommended for full builds)
- **Storage**: 50 GB free space (SSD recommended)

#### Step-by-Step Setup (macOS - Full Development)

**1. Install Xcode** (iOS/tvOS development):
```bash
# Install from Mac App Store or:
xcode-select --install

# Verify
xcodebuild -version
```

**2. Install Homebrew** (Package manager):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**3. Install Rust**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Verify
rustc --version
```

**4. Install Rust Targets**:
```bash
# Android
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi

# iOS/tvOS
rustup target add aarch64-apple-ios
rustup target add aarch64-apple-ios-sim
rustup target add aarch64-apple-tvos
rustup target add aarch64-apple-tvos-sim
```

**5. Install Cargo Tools**:
```bash
cargo install cargo-ndk --version 3.4.0
cargo install uniffi_bindgen --version 0.25.0
cargo install cargo-watch
```

**6. Install Android Studio**:
- Download from https://developer.android.com/studio
- Install Android SDK Platform 35
- Install Android NDK r26d
- Set environment variables:

```bash
# Add to ~/.zshrc or ~/.bash_profile
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264
export PATH=$ANDROID_HOME/platform-tools:$PATH
```

**7. Clone and Build**:
```bash
git clone https://github.com/your-org/nuvio.git
cd nuvio

# Build Rust SDK
cd rust-sdk
cargo build --release

# Build Android
./build-all.sh --android --release

# Build iOS
./build-all.sh --ios --release
```

#### Step-by-Step Setup (Linux - Android Only)

**1. Install Rust**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**2. Install Android SDK/NDK**:
```bash
# Install via apt
sudo apt update
sudo apt install -y openjdk-17-jdk

# Download Android command-line tools
cd ~
wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
unzip commandlinetools-linux-9477386_latest.zip
mkdir -p Android/Sdk/cmdline-tools
mv cmdline-tools Android/Sdk/cmdline-tools/latest

# Set environment variables
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
export PATH=$ANDROID_HOME/platform-tools:$PATH

# Install SDK components
sdkmanager "platforms;android-35"
sdkmanager "build-tools;35.0.0"
sdkmanager "ndk;26.3.11579264"
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264
```

**3. Install Rust Targets**:
```bash
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
```

**4. Install Cargo Tools**:
```bash
cargo install cargo-ndk --version 3.4.0
cargo install uniffi_bindgen --version 0.25.0
```

**5. Build**:
```bash
git clone https://github.com/your-org/nuvio.git
cd nuvio/rust-sdk
cargo ndk -t arm64-v8a -t armeabi-v7a build --release
```

### IDE Configuration

#### Visual Studio Code (Recommended for Rust)

**Extensions**:
```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "vadimcn.vscode-lldb",
    "serayuzgur.crates",
    "tamasfe.even-better-toml"
  ]
}
```

**settings.json**:
```json
{
  "rust-analyzer.check.command": "clippy",
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.cargo.target": "aarch64-linux-android"
}
```

#### Android Studio (Kotlin/Android)

**Plugins**:
- Kotlin
- Android NDK Support
- Rust (optional, for .rs file syntax)

**Build Configuration**:
- Ensure "Build Rust Libraries" task runs before app build
- Configure jniLibs source directory

#### Xcode (Swift/iOS)

**Build Phases**:
1. **Run Script**: Build Rust Libraries (before Compile Sources)
2. **Compile Sources**: Swift + generated bindings
3. **Link Binary With Libraries**: Add libnuvio_core.a

**Build Settings**:
- **Library Search Paths**: `$(BUILT_PRODUCTS_DIR)`
- **Header Search Paths**: `$(PROJECT_DIR)/Generated`

---

## Verification & Testing

### Build Verification Checklist

**Rust SDK Core**:
```bash
cd rust-sdk

# 1. Build succeeds for all targets
cargo build --release

# 2. Tests pass
cargo test --all-features

# 3. No clippy warnings
cargo clippy -- -D warnings

# 4. Code is formatted
cargo fmt -- --check

# 5. No security vulnerabilities
cargo audit
```

**Android Build**:
```bash
# 1. cargo-ndk builds succeed
cargo ndk -t arm64-v8a build --release

# 2. Libraries exist in correct locations
ls -lh target/aarch64-linux-android/release/libnuvio_core.so

# 3. UniFFI bindings generate successfully
uniffi-bindgen generate --language kotlin --out-dir /tmp src/nuvio_core.udl

# 4. Gradle build succeeds
cd ../android
./gradlew assembleRelease

# 5. APK contains Rust libraries
unzip -l app/build/outputs/apk/release/app-release.apk | grep libnuvio_core.so
```

**iOS Build**:
```bash
# 1. iOS targets build successfully
cargo build --target aarch64-apple-ios --release
cargo build --target aarch64-apple-tvos --release

# 2. Libraries exist
ls -lh target/aarch64-apple-ios/release/libnuvio_core.a
ls -lh target/aarch64-apple-tvos/release/libnuvio_core.a

# 3. UniFFI bindings generate successfully
uniffi-bindgen generate --language swift --out-dir /tmp src/nuvio_core.udl

# 4. Xcode build succeeds
cd ../ios
xcodebuild -workspace NuvioApp.xcworkspace -scheme NuvioTV build
```

### FFI Integration Testing

**Test Scenarios**:

1. **Memory Leak Detection**:
   - **Android**: Use LeakCanary library
   - **iOS**: Use Xcode Instruments (Leaks template)
   - **Rust**: Use Valgrind on Linux

2. **Error Handling Across FFI**:
   ```rust
   // Rust: Ensure all public functions use Result<T, E>
   pub fn risky_operation() -> Result<Data, NuvioError> {
       // Use catch_unwind if calling external code
       std::panic::catch_unwind(|| {
           // Potentially panicking code
       }).map_err(|_| NuvioError::InternalError)?;

       Ok(Data::new())
   }
   ```

3. **Performance Benchmarks**:
   ```bash
   # Rust benchmarks
   cargo bench

   # Measure FFI call overhead (Android)
   # Profile JNI calls using Android Profiler

   # Measure FFI call overhead (iOS)
   # Profile using Xcode Instruments (Time Profiler)
   ```

4. **Cross-Platform Consistency**:
   - Same input data should produce identical output on Android and iOS
   - Use property-based testing (proptest in Rust)
   - Verify serialization/deserialization is symmetric

### Automated Testing Strategy

**Unit Tests** (Rust):
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initialize() {
        let result = initialize("{}".to_string());
        assert!(result.is_ok());
    }

    #[test]
    fn test_ffi_string_round_trip() {
        let original = "Test データ 🚀".to_string();
        // Test UniFFI string conversion
        let result = process_string(original.clone());
        assert_eq!(result.unwrap(), original);
    }
}
```

**Integration Tests** (Kotlin):
```kotlin
class NuviolCoreTest {
    @Test
    fun testInitialize() {
        val core = NuvioCore()
        val result = core.initialize("{}")
        assertNotNull(result)
    }

    @Test
    fun testErrorHandling() {
        val core = NuvioCore()
        assertThrows<NuvioError.NetworkError> {
            core.fetchCatalog("invalid_source")
        }
    }
}
```

**Integration Tests** (Swift):
```swift
class NuvioCoreTests: XCTestCase {
    func testInitialize() {
        let core = NuvioCore()
        XCTAssertNoThrow(try core.initialize(config: "{}"))
    }

    func testErrorHandling() {
        let core = NuvioCore()
        XCTAssertThrowsError(try core.fetchCatalog(sourceId: "invalid")) { error in
            XCTAssertTrue(error is NuvioError.NetworkError)
        }
    }
}
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Rust Compilation Errors

**Issue**: `error: linker 'aarch64-linux-android-clang' not found`
```bash
# Solution: Install Android NDK and set environment variable
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264
```

**Issue**: `error: could not compile 'uniffi'`
```bash
# Solution: Update uniffi version in Cargo.toml
[dependencies]
uniffi = "0.25.0"
```

#### Android Build Errors

**Issue**: `FAILED: :app:buildRustLibs`
```bash
# Solution 1: Check cargo-ndk is installed
cargo install cargo-ndk

# Solution 2: Verify ANDROID_NDK_HOME is set
echo $ANDROID_NDK_HOME

# Solution 3: Check Rust targets are installed
rustup target list --installed
```

**Issue**: `UnsatisfiedLinkError: dlopen failed: library "libnuvio_core.so" not found`
```bash
# Solution: Verify .so files are in jniLibs directory
ls -R android/app/src/main/jniLibs/

# Rebuild if missing:
./build-all.sh --android --release
```

#### iOS Build Errors

**Issue**: `library not found for -lnuvio_core`
```bash
# Solution: Check Rust library was built and copied
ls target/aarch64-apple-ios/release/libnuvio_core.a

# Verify Xcode build script ran
# Check Build Phases → "Build Rust Libraries"
```

**Issue**: `Could not find module 'NuvioCore'`
```bash
# Solution: Regenerate Swift bindings
cd rust-sdk
uniffi-bindgen generate --language swift --out-dir ../ios/Generated src/nuvio_core.udl

# Add Generated/ folder to Xcode project if not present
```

#### UniFFI Binding Issues

**Issue**: `TypeError: Expected Foo, found Bar`
```bash
# Solution: Ensure .udl matches Rust types exactly
# Rebuild bindings after any .udl changes:
uniffi-bindgen generate --language kotlin --out-dir [...] src/nuvio_core.udl
uniffi-bindgen generate --language swift --out-dir [...] src/nuvio_core.udl
```

### Performance Optimization Tips

1. **Minimize FFI Calls**: Batch operations to reduce FFI overhead
2. **Use Zero-Copy Where Possible**: Pass byte buffers instead of serialized JSON
3. **Profile Before Optimizing**: Use Android Profiler / Xcode Instruments
4. **Cache Rust Objects**: Reuse `Arc<T>` references across FFI boundary
5. **Async Operations**: Use UniFFI callbacks for long-running tasks

---

## Appendix: Toolchain Version Matrix

### Tested Configurations

| Component | Minimum Version | Recommended Version | Tested Version | Notes |
|-----------|----------------|--------------------|-|---------------|
| **Rust** | 1.70.0 | 1.75.0+ | 1.75.0 | Stable channel |
| **cargo-ndk** | 3.0.0 | 3.4.0+ | 3.4.0 | Latest stable |
| **uniffi_bindgen** | 0.23.0 | 0.25.0+ | 0.25.0 | Breaking changes in 0.24+ |
| **Android NDK** | r25 | r26d+ | r26d | C++ support |
| **Android SDK** | 26 (8.0) | 35 (15) | 35 | Target API |
| **Gradle** | 7.5 | 8.1+ | 8.1.1 | AGP 8.1+ |
| **Kotlin** | 1.8.0 | 1.9.0+ | 1.9.0 | Coroutines support |
| **Xcode** | 14.3 | 15.0+ | 15.2 | tvOS 17+ |
| **Swift** | 5.7 | 5.9+ | 5.9 | Async/await |

### Upgrade Path

**From Current Setup (React Native 0.81.4)**:
1. ✅ Install Rust toolchain (new)
2. ✅ Install cargo-ndk (new)
3. ✅ Install uniffi_bindgen (new)
4. ⚠️ Update Android NDK: r23 → r26d
5. ⚠️ Update Xcode: Current → 15.0+
6. ✅ Kotlin/Swift already at compatible versions

**Breaking Changes to Watch**:
- UniFFI 0.24+ changed callback API (use 0.25+ for latest)
- Android NDK r26+ requires CMake 3.22+ for C++ projects
- Xcode 15+ requires macOS 13.5+

---

## Summary

### Critical Toolchain Components

**MUST HAVE** (Build will fail without these):
1. ✅ rustup + rustc 1.70.0+
2. ✅ cargo-ndk 3.4.0+
3. ✅ uniffi_bindgen 0.25.0+
4. ✅ Android NDK r26+
5. ✅ Xcode 15.0+ (macOS only)
6. ✅ Rust targets installed (Android: aarch64-linux-android, iOS: aarch64-apple-ios/tvos)

**RECOMMENDED** (Quality of life):
- cargo-watch (auto-rebuild on file changes)
- cargo-audit (security scanning)
- Android Studio (GUI for Android development)
- Visual Studio Code with rust-analyzer

### Next Steps After Setup

1. ✅ **Verify toolchain**: Run all verification commands in this document
2. ✅ **Build Rust SDK**: `cargo build --release`
3. ✅ **Generate bindings**: Run uniffi-bindgen for Kotlin and Swift
4. ✅ **Test FFI integration**: Build sample Android and iOS apps
5. ✅ **Set up CI/CD**: Implement GitHub Actions workflow
6. ✅ **Document team onboarding**: Create quickstart guide based on this doc

---

**Document prepared for**: Nuvio Tri-Layer Architecture Migration
**Target completion**: Q1 2026
**Owner**: Platform Engineering Team

