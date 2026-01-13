# ADR-006: Build Toolchain & CI/CD Strategy for Tri-Layer Architecture

**Status:** Accepted
**Date:** 2026-01-13
**Decision Makers:** Architecture Team
**Technical Story:** [Build Toolchain & CI/CD Infrastructure for Rust-Native Architecture]

---

## Table of Contents

1. [Context](#context)
2. [Decision](#decision)
3. [Alternatives Considered](#alternatives-considered)
4. [Consequences](#consequences)
5. [Implementation Guide](#implementation-guide)
6. [References](#references)

---

## Context

### Build Requirements for Tri-Layer Architecture

The tri-layer native architecture (ADR-001) introduces significant build complexity compared to the current React Native setup. The migration requires compiling Rust code for multiple platform targets, generating FFI bindings via UniFFI (ADR-002), and integrating with platform-native build systems (Gradle for Android, Xcode for iOS/tvOS).

#### Current Build System Limitations

**React Native Build (Current State):**
- **Single Language:** JavaScript/TypeScript compiled via Metro bundler
- **Simple Toolchain:** Node.js + npm/yarn + platform SDKs (Android Studio, Xcode)
- **Fast Iteration:** Hot reload with <1s code changes
- **Single Build Command:** `npm run ios` or `npm run android`
- **CI/CD:** Basic GitHub Actions workflow (`.github/workflows/release.yml`)

**New Architecture Build Requirements:**
- **Multi-Language Compilation:** Rust → C ABI → Kotlin/Swift (3 language toolchains)
- **Cross-Compilation:** Rust code must compile for 8 platform targets (Android: 4 architectures, iOS: 2 architectures, tvOS: 2 architectures)
- **FFI Binding Generation:** UniFFI must run before native compilation to generate Kotlin/Swift bindings
- **Multi-Arch Android Builds:** Android requires compiling Rust for arm64-v8a, armeabi-v7a, x86, x86_64 (4 separate builds)
- **iOS Universal Binaries:** iOS requires fat binaries combining device (arm64) and simulator (x86_64, arm64-sim) builds
- **Complex Build Order:** Rust SDK → UniFFI bindings → Native compilation → Packaging
- **CI/CD Complexity:** Matrix builds across platforms, architectures, and build types (debug/release)

### Platform Target Requirements

#### Android Target Architectures

**Required Targets:**
1. **arm64-v8a** - ARM 64-bit (primary Android TV, modern phones)
2. **armeabi-v7a** - ARM 32-bit (legacy Android TV devices, older phones)
3. **x86_64** - Intel 64-bit (Android emulators, Intel-based Android devices)
4. **x86** - Intel 32-bit (older Android emulators)

**Build Complexity:**
- Android NDK required for native code compilation
- **cargo-ndk** tool simplifies cross-compilation for Android
- JNI layer requires two-layer binding (Rust → C → JNI → Kotlin)
- Each architecture requires separate Rust compilation (~2-5 minutes per arch)

#### iOS/tvOS Target Architectures

**iOS Targets:**
1. **aarch64-apple-ios** - ARM 64-bit (iPhone, iPad devices)
2. **aarch64-apple-ios-sim** - ARM 64-bit simulator (Apple Silicon Macs)
3. **x86_64-apple-ios** - Intel 64-bit simulator (Intel Macs)

**tvOS Targets:**
1. **aarch64-apple-tvos** - ARM 64-bit (Apple TV 4K, Apple TV HD)
2. **aarch64-apple-tvos-sim** - ARM 64-bit simulator (Apple Silicon Macs)
3. **x86_64-apple-tvos** - Intel 64-bit simulator (Intel Macs)

**Build Complexity:**
- Xcode 15+ required with tvOS SDK
- **lipo** tool combines device + simulator binaries into fat binary (XCFramework)
- Swift bridging header imports C header from UniFFI
- Codesigning required for device deployment

### Development Environment Constraints

#### Team Considerations
- **Mixed Development Environments:** Team has macOS (iOS/tvOS), Linux (Android), and Windows (Android) machines
- **CI/CD Environment:** GitHub Actions runners (Linux, macOS)
- **Build Performance:** Rust incremental compilation must be optimized for local development (<30s for incremental builds)
- **Cache Strategy:** Rust build artifacts (~2GB) must be cached to avoid rebuilding dependencies

#### Performance Requirements
- **Local Builds:** <2 minutes for single-platform debug build
- **CI/CD Builds:** <15 minutes for full multi-platform release build
- **Incremental Compilation:** <30 seconds for Rust code changes
- **Parallel Builds:** Android multi-arch builds must run in parallel (not serial)

### CI/CD Requirements

**Current CI/CD (React Native):**
- Single workflow: `release.yml` (GitHub Actions)
- Triggers on version tags (`v*`)
- Builds Android APK only
- Basic release creation with GitHub Releases

**New CI/CD Requirements:**
1. **Multi-Platform Builds:** Android (4 archs), iOS (3 targets), tvOS (3 targets)
2. **Matrix Strategy:** Parallel builds for debug/release × platforms × architectures
3. **Rust Caching:** Cargo cache (~2GB) to speed up builds
4. **Artifact Management:** Rust static libraries, UniFFI bindings, final app packages
5. **Testing Integration:** Unit tests (Rust), integration tests (FFI), UI tests (native)
6. **Quality Checks:** Linting (clippy), formatting (rustfmt), security audits (cargo-audit)
7. **Release Automation:** Tag-based releases with changelogs, APK/IPA uploads
8. **Deployment:** Staged rollout to Google Play, TestFlight, App Store

---

## Decision

We will establish a **comprehensive multi-stage build toolchain** that orchestrates Rust cross-compilation, FFI binding generation, and native platform builds using industry-standard tools and CI/CD best practices.

### Primary Build Toolchain

#### 1. Rust Toolchain (rustup)

**Tool:** `rustup` - The Rust toolchain installer and version manager

**Why rustup:**
- Official Rust toolchain management tool
- Simplifies installation of cross-compilation targets
- Enables team to pin Rust version for reproducible builds
- Supports component management (rustfmt, clippy, rust-src)

**Required Installation:**
```bash
# Install rustup (Linux/macOS)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install rustup (Windows)
# Download and run: https://win.rustup.rs/x86_64
```

**Required Targets:**
```bash
# Android targets
rustup target add aarch64-linux-android      # ARM64 Android
rustup target add armv7-linux-androideabi    # ARM32 Android
rustup target add i686-linux-android         # x86 Android
rustup target add x86_64-linux-android       # x86_64 Android

# iOS targets
rustup target add aarch64-apple-ios          # ARM64 iOS devices
rustup target add aarch64-apple-ios-sim      # ARM64 iOS simulator
rustup target add x86_64-apple-ios           # x86_64 iOS simulator

# tvOS targets
rustup target add aarch64-apple-tvos         # ARM64 tvOS devices
rustup target add aarch64-apple-tvos-sim     # ARM64 tvOS simulator
rustup target add x86_64-apple-tvos          # x86_64 tvOS simulator
```

**Rust Version Strategy:**
- **Stable Channel:** Use latest stable Rust (currently 1.75+)
- **Version Pinning:** Pin via `rust-toolchain.toml` for reproducible builds
- **MSRV (Minimum Supported Rust Version):** Rust 1.70+ (for async/await stability)

#### 2. Cargo-NDK (Android Cross-Compilation)

**Tool:** `cargo-ndk` - Cargo wrapper for Android NDK cross-compilation

**Why cargo-ndk:**
- Automates Android NDK configuration and linking
- Handles multi-architecture builds with single command
- Configures correct linker, sysroot, and compiler flags
- Eliminates manual NDK path configuration

**Installation:**
```bash
cargo install cargo-ndk
```

**Usage:**
```bash
# Build for single Android architecture
cargo ndk -t arm64-v8a build --release

# Build for all Android architectures (parallel)
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86 -t x86_64 build --release
```

**Configuration:**
- Requires Android NDK 25+ (included in Android Studio)
- Automatically detects NDK path via `ANDROID_NDK_HOME` environment variable
- Generates `jniLibs/` directory structure expected by Gradle

#### 3. UniFFI CLI (FFI Binding Generator)

**Tool:** `uniffi-bindgen` - Mozilla's FFI binding code generator

**Why uniffi-bindgen:**
- Primary FFI strategy (see ADR-002)
- Generates Kotlin and Swift bindings from `.udl` interface definitions
- Must run BEFORE native compilation (bindings required at compile time)

**Installation:**
```bash
cargo install uniffi_bindgen --version 0.25.0
```

**Usage:**
```bash
# Generate Kotlin bindings for Android
uniffi-bindgen generate rust-sdk/src/nuvio.udl \
  --language kotlin \
  --out-dir android/app/src/main/java/com/nuvio/generated/

# Generate Swift bindings for iOS/tvOS
uniffi-bindgen generate rust-sdk/src/nuvio.udl \
  --language swift \
  --out-dir ios/NuvioTV/Generated/
```

**Integration:**
- Gradle task for Android (auto-runs before compilation)
- Xcode build phase for iOS/tvOS (pre-build script)

#### 4. Xcode (iOS/tvOS Development)

**Tool:** Xcode 15+ with Command Line Tools

**Requirements:**
- **Xcode Version:** 15.0+ (required for iOS 17+ SDK, tvOS 17+ SDK)
- **Command Line Tools:** `xcode-select --install`
- **Platforms:** iOS SDK, tvOS SDK (included in Xcode)
- **Swift Version:** 5.9+ (bundled with Xcode 15)

**Build Tools:**
- **xcodebuild:** Command-line build tool for CI/CD
- **lipo:** Creates universal (fat) binaries from multiple architectures
- **codesign:** Signs binaries for device deployment

**Setup:**
```bash
# Install Xcode from App Store (macOS only)
# Install Command Line Tools
xcode-select --install

# Verify installation
xcodebuild -version
swift --version
```

#### 5. Android Studio / SDK (Android Development)

**Tool:** Android Studio 2023.1+ with Android SDK and NDK

**Requirements:**
- **Android Studio:** Latest stable version (Hedgehog 2023.1+)
- **Android SDK:** API Level 33+ (Android 13+, target for Android TV)
- **Android NDK:** Version 25.2.9519653 (latest LTS)
- **Build Tools:** 34.0.0+
- **Kotlin Version:** 1.9.20+ (Jetpack Compose compatibility)

**Setup:**
```bash
# Install via Android Studio SDK Manager:
# - SDK Platform: Android 13 (API 33)
# - NDK (Side by side): 25.2.9519653
# - Build Tools: 34.0.0

# Environment variables
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
```

#### 6. Additional Build Tools

**Essential Tools:**
- **CMake 3.22+:** Required by Android NDK for native builds
- **Ninja:** Fast build system used by Cargo and Android Gradle
- **LLVM/Clang:** C/C++ compiler for Rust FFI and Android NDK
- **Git LFS:** For storing large binary artifacts (optional)

**Rust Development Tools:**
```bash
# Code formatting
rustup component add rustfmt

# Linting
rustup component add clippy

# IDE support (rust-analyzer)
rustup component add rust-src
```

### Build Orchestration Strategy

#### Local Development Workflow

**Step-by-Step Build Process:**

1. **Rust Compilation**
   ```bash
   cd rust-sdk
   cargo build --release
   ```

2. **UniFFI Binding Generation**
   ```bash
   uniffi-bindgen generate src/nuvio.udl --language kotlin --out-dir ../android/app/src/main/java/
   uniffi-bindgen generate src/nuvio.udl --language swift --out-dir ../ios/NuvioTV/Generated/
   ```

3. **Android Multi-Arch Build**
   ```bash
   cd rust-sdk
   cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 build --release
   ```

4. **iOS/tvOS Universal Binary**
   ```bash
   # Build for device
   cargo build --release --target aarch64-apple-ios
   cargo build --release --target aarch64-apple-tvos

   # Build for simulator
   cargo build --release --target aarch64-apple-ios-sim
   cargo build --release --target aarch64-apple-tvos-sim

   # Create universal binary with lipo
   lipo -create \
     target/aarch64-apple-ios/release/libnuvio_core.a \
     target/aarch64-apple-ios-sim/release/libnuvio_core.a \
     -output target/universal/ios/libnuvio_core.a
   ```

5. **Native App Build**
   ```bash
   # Android
   cd android
   ./gradlew assembleRelease

   # iOS
   cd ios
   xcodebuild -scheme NuvioTV -configuration Release -sdk iphoneos

   # tvOS
   xcodebuild -scheme NuvioTV -configuration Release -sdk appletvos
   ```

#### Automated Build Scripts

**Makefile for Build Orchestration:**

```makefile
# rust-sdk/Makefile

.PHONY: all clean android ios tvos bindings test

# Default target
all: bindings android ios tvos

# Generate UniFFI bindings
bindings:
	uniffi-bindgen generate src/nuvio.udl --language kotlin --out-dir ../android/app/src/main/java/com/nuvio/generated/
	uniffi-bindgen generate src/nuvio.udl --language swift --out-dir ../ios/NuvioTV/Generated/

# Build Rust for Android (all architectures)
android:
	cargo ndk -t arm64-v8a -t armeabi-v7a -t x86 -t x86_64 build --release

# Build Rust for iOS (device + simulator)
ios:
	cargo build --release --target aarch64-apple-ios
	cargo build --release --target aarch64-apple-ios-sim
	cargo build --release --target x86_64-apple-ios
	mkdir -p target/universal/ios
	lipo -create \
		target/aarch64-apple-ios/release/libnuvio_core.a \
		target/aarch64-apple-ios-sim/release/libnuvio_core.a \
		-output target/universal/ios/libnuvio_core.a

# Build Rust for tvOS (device + simulator)
tvos:
	cargo build --release --target aarch64-apple-tvos
	cargo build --release --target aarch64-apple-tvos-sim
	cargo build --release --target x86_64-apple-tvos
	mkdir -p target/universal/tvos
	lipo -create \
		target/aarch64-apple-tvos/release/libnuvio_core.a \
		target/aarch64-apple-tvos-sim/release/libnuvio_core.a \
		-output target/universal/tvos/libnuvio_core.a

# Run Rust tests
test:
	cargo test --all-features

# Clean build artifacts
clean:
	cargo clean
	rm -rf target/universal
	rm -rf ../android/app/src/main/java/com/nuvio/generated/
	rm -rf ../ios/NuvioTV/Generated/

# Development build (faster, debug symbols)
dev:
	cargo build
	uniffi-bindgen generate src/nuvio.udl --language kotlin --out-dir ../android/app/src/main/java/com/nuvio/generated/
```

### CI/CD Pipeline Architecture

#### GitHub Actions Workflow Structure

**Multi-Stage Pipeline:**

```yaml
# .github/workflows/rust-native-ci.yml

name: Rust Native Build & Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  release:
    types: [published]

env:
  RUST_VERSION: 1.75.0
  ANDROID_NDK_VERSION: 25.2.9519653

jobs:
  # Stage 1: Rust Checks & Tests
  rust-checks:
    name: Rust Checks (clippy, fmt, test)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}
          components: rustfmt, clippy

      - name: Cache Cargo
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: rust-sdk

      - name: Check Formatting
        run: cd rust-sdk && cargo fmt --all -- --check

      - name: Clippy Linting
        run: cd rust-sdk && cargo clippy --all-targets --all-features -- -D warnings

      - name: Run Tests
        run: cd rust-sdk && cargo test --all-features

  # Stage 2: Build Android (Multi-Arch)
  build-android:
    name: Build Android (${{ matrix.arch }})
    runs-on: ubuntu-latest
    needs: rust-checks
    strategy:
      matrix:
        arch: [arm64-v8a, armeabi-v7a, x86_64, x86]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}
          targets: |
            aarch64-linux-android
            armv7-linux-androideabi
            x86_64-linux-android
            i686-linux-android

      - name: Cache Cargo
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: rust-sdk

      - name: Setup Android NDK
        uses: nttld/setup-ndk@v1
        with:
          ndk-version: ${{ env.ANDROID_NDK_VERSION }}

      - name: Install cargo-ndk
        run: cargo install cargo-ndk

      - name: Build Rust for Android
        run: |
          cd rust-sdk
          cargo ndk -t ${{ matrix.arch }} build --release

      - name: Upload Android Library
        uses: actions/upload-artifact@v3
        with:
          name: android-${{ matrix.arch }}
          path: rust-sdk/target/*/release/libnuvio_core.so

  # Stage 3: Build iOS/tvOS (macOS only)
  build-ios-tvos:
    name: Build iOS & tvOS
    runs-on: macos-13
    needs: rust-checks
    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}
          targets: |
            aarch64-apple-ios
            aarch64-apple-ios-sim
            x86_64-apple-ios
            aarch64-apple-tvos
            aarch64-apple-tvos-sim
            x86_64-apple-tvos

      - name: Cache Cargo
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: rust-sdk

      - name: Build iOS Universal Binary
        run: |
          cd rust-sdk
          make ios

      - name: Build tvOS Universal Binary
        run: |
          cd rust-sdk
          make tvos

      - name: Upload iOS Library
        uses: actions/upload-artifact@v3
        with:
          name: ios-universal
          path: rust-sdk/target/universal/ios/libnuvio_core.a

      - name: Upload tvOS Library
        uses: actions/upload-artifact@v3
        with:
          name: tvos-universal
          path: rust-sdk/target/universal/tvos/libnuvio_core.a

  # Stage 4: Generate UniFFI Bindings
  generate-bindings:
    name: Generate UniFFI Bindings
    runs-on: ubuntu-latest
    needs: rust-checks
    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}

      - name: Install uniffi-bindgen
        run: cargo install uniffi_bindgen --version 0.25.0

      - name: Generate Kotlin Bindings
        run: |
          cd rust-sdk
          uniffi-bindgen generate src/nuvio.udl \
            --language kotlin \
            --out-dir ../android/app/src/main/java/com/nuvio/generated/

      - name: Generate Swift Bindings
        run: |
          cd rust-sdk
          uniffi-bindgen generate src/nuvio.udl \
            --language swift \
            --out-dir ../ios/NuvioTV/Generated/

      - name: Upload Bindings
        uses: actions/upload-artifact@v3
        with:
          name: uniffi-bindings
          path: |
            android/app/src/main/java/com/nuvio/generated/
            ios/NuvioTV/Generated/

  # Stage 5: Build Android App
  build-android-app:
    name: Build Android App
    runs-on: ubuntu-latest
    needs: [build-android, generate-bindings]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Download Android Libraries
        uses: actions/download-artifact@v3
        with:
          path: rust-sdk/target/

      - name: Download UniFFI Bindings
        uses: actions/download-artifact@v3
        with:
          name: uniffi-bindings

      - name: Build Android APK
        run: |
          cd android
          ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: android-apk
          path: android/app/build/outputs/apk/release/*.apk

  # Stage 6: Build iOS/tvOS App
  build-ios-tvos-app:
    name: Build iOS & tvOS App
    runs-on: macos-13
    needs: [build-ios-tvos, generate-bindings]
    steps:
      - uses: actions/checkout@v4

      - name: Download iOS/tvOS Libraries
        uses: actions/download-artifact@v3
        with:
          path: rust-sdk/target/universal/

      - name: Download UniFFI Bindings
        uses: actions/download-artifact@v3
        with:
          name: uniffi-bindings

      - name: Build iOS App
        run: |
          cd ios
          xcodebuild -scheme NuvioTV \
            -configuration Release \
            -sdk iphoneos \
            -archivePath build/NuvioTV-iOS.xcarchive \
            archive

      - name: Build tvOS App
        run: |
          cd ios
          xcodebuild -scheme NuvioTV \
            -configuration Release \
            -sdk appletvos \
            -archivePath build/NuvioTV-tvOS.xcarchive \
            archive

      - name: Upload Archives
        uses: actions/upload-artifact@v3
        with:
          name: ios-tvos-archives
          path: ios/build/*.xcarchive

  # Stage 7: Release (on tags)
  release:
    name: Create Release
    runs-on: ubuntu-latest
    needs: [build-android-app, build-ios-tvos-app]
    if: github.event_name == 'release'
    steps:
      - uses: actions/checkout@v4

      - name: Download All Artifacts
        uses: actions/download-artifact@v3

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            android-apk/*.apk
            ios-tvos-archives/*.xcarchive
          draft: false
          prerelease: false
          generate_release_notes: true
```

#### CI/CD Optimization Strategies

**1. Caching Strategy:**
- **Cargo Cache:** Cache `~/.cargo` and `target/` directories (saves ~5 minutes per build)
- **Gradle Cache:** Cache `~/.gradle` and `android/.gradle` (saves ~2 minutes)
- **Xcode Derived Data:** Cache `~/Library/Developer/Xcode/DerivedData` (saves ~3 minutes)

**2. Parallel Builds:**
- Android architectures build in parallel (matrix strategy)
- Rust checks run in parallel with builds
- iOS and Android builds run independently

**3. Incremental Compilation:**
- Enable Rust incremental compilation in CI: `CARGO_INCREMENTAL=1`
- Use `sccache` for distributed compilation caching (optional, advanced)

**4. Build Time Targets:**
- **Rust Checks:** <3 minutes (fmt, clippy, test)
- **Android Build (single arch):** <5 minutes
- **iOS/tvOS Build:** <8 minutes
- **Full Pipeline:** <15 minutes (parallel)

---

## Alternatives Considered

### Alternative 1: Docker-Based Build Containers

**Description:** Package entire build toolchain (Rust, Android NDK, Xcode) in Docker containers for reproducible builds.

**Pros:**
- **Reproducibility:** Exact same environment for all developers and CI/CD
- **Isolation:** No conflicts with host system tools
- **Versioning:** Docker images versioned and immutable
- **Cross-Platform:** Same Docker image runs on Linux, macOS (Docker Desktop), Windows

**Cons:**
- **macOS/Xcode Limitation:** Xcode cannot run in Docker (requires macOS host); limits iOS/tvOS builds
- **Performance Overhead:** Docker adds I/O overhead (~10-20% slower builds)
- **Complexity:** Requires Docker expertise; increases onboarding time
- **Storage:** Large Docker images (~10GB for full toolchain)
- **CI/CD Costs:** GitHub Actions charges more for Docker-based workflows

**Why Rejected:** Xcode requirement for iOS/tvOS makes Docker impractical for full build. Performance overhead not justified for local development. Direct tool installation simpler for team.

### Alternative 2: Bazel Build System

**Description:** Use Bazel (Google's build system) for unified multi-language builds (Rust, Kotlin, Swift).

**Pros:**
- **Unified Build:** Single build system for all languages
- **Hermetic Builds:** Reproducible builds with explicit dependencies
- **Incremental Builds:** Fine-grained caching (file-level, not project-level)
- **Remote Caching:** Distributed build cache across team
- **Parallelization:** Aggressive parallel builds

**Cons:**
- **Steep Learning Curve:** Bazel significantly more complex than Cargo/Gradle/Xcode
- **Limited Ecosystem:** Fewer rules for Rust, Kotlin, Swift compared to native tools
- **IDE Integration:** Poor support in Android Studio, Xcode (limited autocomplete, debugging)
- **Migration Effort:** Must migrate existing Cargo.toml, build.gradle, Xcode projects to Bazel
- **Maintenance Burden:** Bazel BUILD files require constant updates for new files

**Why Rejected:** Complexity not justified for project scale. Team expertise in native build tools (Cargo, Gradle, Xcode) makes Bazel overhead unacceptable. Poor IDE integration impacts developer experience.

### Alternative 3: CMake for Rust Builds

**Description:** Use CMake (instead of Cargo) as unified build system for Rust and native code.

**Pros:**
- **Unified Build Tool:** CMake already used by Android NDK
- **Cross-Platform:** CMake generates platform-specific build files
- **IDE Support:** Good integration with CLion, Visual Studio

**Cons:**
- **Not Idiomatic Rust:** Cargo is the standard Rust build tool; CMake not well-supported in Rust ecosystem
- **Crate Management:** Cargo.toml dependencies difficult to express in CMake
- **Build Complexity:** CMake scripts significantly more complex than Cargo.toml
- **Limited Rust Tooling:** cargo-fmt, cargo-clippy, cargo-test don't work with CMake
- **Maintenance Burden:** Must manually update CMake scripts for Rust crate changes

**Why Rejected:** Cargo is the standard Rust build tool with excellent ecosystem support. Switching to CMake would lose all Cargo tooling (clippy, rustfmt, cargo-audit). Not worth the migration effort.

### Alternative 4: Manual Cross-Compilation (No cargo-ndk)

**Description:** Manually configure Android NDK toolchain for Rust cross-compilation without cargo-ndk.

**Pros:**
- **No Extra Tool:** One less dependency to install
- **Full Control:** Complete control over compiler flags, linker settings
- **Understanding:** Forces deep understanding of cross-compilation process

**Cons:**
- **Configuration Complexity:** Must manually set `CC`, `AR`, `LINKER`, `SYSROOT` for each architecture
- **Error-Prone:** Easy to misconfigure, leading to obscure linker errors
- **Non-Portable:** Configuration tied to specific NDK paths, doesn't work across machines
- **Maintenance Burden:** NDK updates require reconfiguring toolchain settings
- **Time Waste:** cargo-ndk automates this correctly; manual approach reinvents the wheel

**Why Rejected:** cargo-ndk is well-tested, widely used, and eliminates manual configuration errors. No benefit to manual approach; only increases complexity and error surface.

### Alternative 5: GitLab CI or CircleCI (Instead of GitHub Actions)

**Description:** Use GitLab CI or CircleCI for CI/CD instead of GitHub Actions.

**Pros:**
- **GitLab CI:** Better Docker support, self-hosted runners, more complex pipelines
- **CircleCI:** Mature caching, good macOS support, reusable orbs
- **Cost:** Potentially lower costs for self-hosted runners (GitLab)

**Cons:**
- **GitHub Integration:** Project already on GitHub; GitHub Actions integrates seamlessly
- **Matrix Builds:** GitHub Actions matrix strategy excellent for multi-platform builds
- **Ecosystem:** GitHub Actions has largest marketplace of actions/workflows
- **Migration Cost:** Must migrate existing `.github/workflows/release.yml`
- **Team Familiarity:** Team already familiar with GitHub Actions

**Why Rejected:** GitHub Actions sufficient for requirements. Seamless integration with GitHub repository. Matrix strategy handles multi-platform builds well. No compelling reason to migrate.

---

## Consequences

### Positive Consequences

#### Developer Experience

1. **Simplified Cross-Compilation:** cargo-ndk eliminates manual Android NDK configuration
2. **Consistent Environments:** rustup + Makefile ensures consistent builds across team
3. **Fast Incremental Builds:** Rust incremental compilation <30s for code changes
4. **Automated Binding Generation:** UniFFI bindings auto-generated via Makefile
5. **IDE Support:** Full Rust-analyzer, IntelliJ IDEA, Xcode support

#### Build Performance

1. **Parallel Android Builds:** 4 Android architectures build in parallel (~5 minutes total vs. 20 minutes serial)
2. **Cargo Caching:** Rust dependencies cached (~2GB), rebuild only changed code
3. **CI/CD Optimization:** Matrix builds + caching achieves <15 minute full pipeline
4. **Local Build Speed:** Debug builds <2 minutes; release builds <5 minutes (single platform)

#### Maintainability

1. **Single Source of Truth:** Makefile orchestrates entire build process
2. **Version Pinning:** `rust-toolchain.toml` and `Cargo.lock` ensure reproducibility
3. **Automated Checks:** Clippy, rustfmt, cargo-test run on every commit
4. **Dependency Auditing:** cargo-audit checks for security vulnerabilities in dependencies

#### CI/CD Reliability

1. **Multi-Platform Support:** Builds Android, iOS, tvOS from single pipeline
2. **Artifact Management:** Libraries, bindings, apps stored as artifacts
3. **Release Automation:** Tag-based releases auto-create GitHub Releases with APK/archives
4. **Test Integration:** Rust unit tests, FFI integration tests run before builds

### Negative Consequences

#### Complexity Increase

1. **Multiple Toolchains:** Rust, Android SDK/NDK, Xcode (vs. single Node.js toolchain)
2. **Cross-Compilation Learning Curve:** Team must understand target triples, sysroot, linkers
3. **Build Script Maintenance:** Makefile, Gradle tasks, Xcode build phases require updates
4. **Tool Version Management:** Must track versions of rustup, cargo-ndk, uniffi-bindgen, NDK

#### Developer Onboarding

1. **Setup Time:** Installing Rust + Android NDK + Xcode takes ~2 hours (vs. <30 minutes for Node.js)
2. **Documentation:** Requires comprehensive onboarding guide for new developers
3. **Platform Requirements:** macOS required for iOS/tvOS development (Linux/Windows only Android)

#### Build Performance (Initial Builds)

1. **First Build Slow:** First Rust build downloads ~2GB of dependencies, takes ~10 minutes
2. **CI/CD Cold Start:** Without caching, CI/CD builds take 30+ minutes
3. **Disk Space:** Rust target/ directory ~5GB, Android .gradle cache ~3GB

#### Operational Overhead

1. **CI/CD Costs:** GitHub Actions minutes increase (~3x vs. React Native simple build)
2. **Artifact Storage:** Storing libraries for all architectures increases artifact costs
3. **Dependency Updates:** Must update Rust crates, Android NDK, Xcode versions regularly
4. **Security Audits:** cargo-audit adds additional step to dependency management

### Risk Mitigation Strategies

#### Developer Onboarding

**Solution:** Comprehensive onboarding documentation
- Step-by-step toolchain installation guide
- Video walkthrough of build process
- Troubleshooting common errors (NDK path, Xcode codesigning, etc.)
- Automated setup script (`scripts/setup-dev-env.sh`)

#### Build Performance

**Solution:** Aggressive caching strategy
- Cargo cache via `rust-cache` GitHub Action (saves ~5 minutes)
- Gradle cache via `gradle-cache-action` (saves ~2 minutes)
- Pre-built Docker images with toolchains for CI/CD (optional, advanced)

#### CI/CD Costs

**Solution:** Optimize pipeline and use matrix builds
- Run Rust checks once, build platforms in parallel
- Cache dependencies aggressively
- Use `if` conditions to skip unnecessary jobs (e.g., skip iOS build if only Android files changed)

#### Tool Version Management

**Solution:** Pin versions explicitly
- `rust-toolchain.toml` pins Rust version
- `Cargo.lock` locks Rust dependencies
- `gradle.properties` specifies Android Gradle Plugin version
- CI/CD workflow specifies NDK version, uniffi-bindgen version
- Documentation lists required tool versions

---

## Implementation Guide

### Phase 1: Local Development Setup

#### Step 1: Install Rust Toolchain

**macOS/Linux:**
```bash
# Install rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install required targets
rustup target add aarch64-linux-android armv7-linux-androideabi \
  i686-linux-android x86_64-linux-android \
  aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios \
  aarch64-apple-tvos aarch64-apple-tvos-sim x86_64-apple-tvos

# Install Rust development tools
rustup component add rustfmt clippy rust-src
```

**Windows:**
```powershell
# Download and run rustup installer
# https://win.rustup.rs/x86_64

# Install Android targets only (no iOS/tvOS on Windows)
rustup target add aarch64-linux-android armv7-linux-androideabi `
  i686-linux-android x86_64-linux-android

# Install Rust development tools
rustup component add rustfmt clippy rust-src
```

#### Step 2: Install cargo-ndk

```bash
cargo install cargo-ndk
```

#### Step 3: Install uniffi-bindgen

```bash
cargo install uniffi_bindgen --version 0.25.0
```

#### Step 4: Setup Android Environment

**Install Android Studio:**
- Download from [developer.android.com/studio](https://developer.android.com/studio)
- Install Android SDK, NDK, Build Tools via SDK Manager

**Configure Environment Variables:**
```bash
# Add to ~/.bashrc or ~/.zshrc (Linux/macOS)
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
```

**Verify Installation:**
```bash
echo $ANDROID_HOME
echo $ANDROID_NDK_HOME
adb --version
```

#### Step 5: Setup Xcode (macOS Only)

**Install Xcode:**
```bash
# Install from App Store (Xcode 15+)
# Install Command Line Tools
xcode-select --install

# Accept Xcode license
sudo xcodebuild -license accept

# Verify installation
xcodebuild -version
swift --version
```

#### Step 6: Create Rust Toolchain Configuration

Create `rust-sdk/rust-toolchain.toml`:
```toml
[toolchain]
channel = "1.75.0"
components = ["rustfmt", "clippy", "rust-src"]
targets = [
    "aarch64-linux-android",
    "armv7-linux-androideabi",
    "i686-linux-android",
    "x86_64-linux-android",
    "aarch64-apple-ios",
    "aarch64-apple-ios-sim",
    "x86_64-apple-ios",
    "aarch64-apple-tvos",
    "aarch64-apple-tvos-sim",
    "x86_64-apple-tvos",
]
profile = "default"
```

#### Step 7: Create Build Orchestration Makefile

Create `rust-sdk/Makefile` (see [Build Orchestration Strategy](#build-orchestration-strategy) section above for full Makefile).

#### Step 8: Verify Setup

```bash
# Test Rust build
cd rust-sdk
cargo build

# Test Android cross-compilation
cargo ndk -t arm64-v8a build

# Test UniFFI binding generation
make bindings

# Run Rust tests
cargo test
```

### Phase 2: CI/CD Setup

#### Step 1: Create GitHub Actions Workflows

Create `.github/workflows/rust-native-ci.yml` (see [CI/CD Pipeline Architecture](#cicd-pipeline-architecture) section above for full workflow).

#### Step 2: Configure Repository Secrets

**GitHub Repository Settings → Secrets and Variables → Actions:**
- `ANDROID_KEYSTORE_BASE64`: Base64-encoded Android signing keystore (for releases)
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password
- `ANDROID_KEY_ALIAS`: Key alias
- `ANDROID_KEY_PASSWORD`: Key password
- `IOS_CERTIFICATE_BASE64`: Base64-encoded iOS distribution certificate (for App Store)
- `IOS_PROVISIONING_PROFILE_BASE64`: Provisioning profile

#### Step 3: Enable Caching

**Rust Cache:**
Already configured in workflow via `Swatinem/rust-cache@v2`

**Gradle Cache:**
Add to Android build job:
```yaml
- name: Setup Gradle Cache
  uses: gradle/gradle-build-action@v2
  with:
    cache-read-only: ${{ github.ref != 'refs/heads/main' }}
```

#### Step 4: Test CI/CD Pipeline

```bash
# Push to trigger workflow
git push origin main

# Check workflow status
# GitHub → Actions tab → View workflow run
```

### Phase 3: Integration with Native Build Systems

#### Android Gradle Integration

**android/app/build.gradle.kts:**
```kotlin
// Task to generate UniFFI bindings
tasks.register<Exec>("generateUniFFIBindings") {
    workingDir = file("../../rust-sdk")
    commandLine = listOf(
        "uniffi-bindgen", "generate", "src/nuvio.udl",
        "--language", "kotlin",
        "--out-dir", "../android/app/src/main/java/com/nuvio/generated/"
    )
}

// Task to build Rust libraries
tasks.register<Exec>("buildRustLibraries") {
    workingDir = file("../../rust-sdk")
    commandLine = listOf(
        "cargo", "ndk",
        "-t", "arm64-v8a",
        "-t", "armeabi-v7a",
        "-t", "x86",
        "-t", "x86_64",
        "build", "--release"
    )
}

// Depend on Rust tasks before compilation
tasks.named("preBuild") {
    dependsOn("generateUniFFIBindings")
    dependsOn("buildRustLibraries")
}

// Link Rust libraries
android {
    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("../../rust-sdk/target/jniLibs")
        }
    }
}
```

#### iOS/tvOS Xcode Integration

**Xcode Build Phases:**

1. **Add Pre-Build Script (before Compile Sources):**
```bash
#!/bin/bash
set -e

# Generate UniFFI bindings
cd "${PROJECT_DIR}/../../rust-sdk"
uniffi-bindgen generate src/nuvio.udl \
  --language swift \
  --out-dir "${PROJECT_DIR}/Generated/"

# Build Rust libraries
if [ "$PLATFORM_NAME" == "iphonesimulator" ]; then
  # Simulator build (arm64-sim for Apple Silicon, x86_64 for Intel)
  cargo build --release --target aarch64-apple-ios-sim
  cargo build --release --target x86_64-apple-ios
  lipo -create \
    target/aarch64-apple-ios-sim/release/libnuvio_core.a \
    target/x86_64-apple-ios/release/libnuvio_core.a \
    -output target/universal/ios/libnuvio_core.a
else
  # Device build
  cargo build --release --target aarch64-apple-ios
  cp target/aarch64-apple-ios/release/libnuvio_core.a target/universal/ios/
fi
```

2. **Link Rust Static Library:**
- Xcode → Target → Build Phases → Link Binary With Libraries
- Add `libnuvio_core.a` from `rust-sdk/target/universal/ios/`

3. **Add Library Search Path:**
- Xcode → Build Settings → Library Search Paths
- Add `$(PROJECT_DIR)/../../rust-sdk/target/universal/ios`

4. **Import Swift Bindings:**
```swift
// In your Swift code
import Foundation

// Generated UniFFI code is automatically imported
let profileManager = ProfileManager()
```

### Phase 4: Developer Workflow Documentation

#### Quick Start Guide

Create `docs/development/BUILD_GUIDE.md`:
```markdown
# Build Guide

## Prerequisites

- Rust 1.75+ (via rustup)
- cargo-ndk
- uniffi-bindgen 0.25.0
- Android Studio + NDK 25.2.9519653 (for Android)
- Xcode 15+ (for iOS/tvOS, macOS only)

## First-Time Setup

### Install Toolchain
\`\`\`bash
# Run automated setup script
./scripts/setup-dev-env.sh

# Or manually:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install cargo-ndk uniffi_bindgen
\`\`\`

### Environment Variables (Android)
\`\`\`bash
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
\`\`\`

## Building

### Full Build (All Platforms)
\`\`\`bash
cd rust-sdk
make all
\`\`\`

### Android Only
\`\`\`bash
cd rust-sdk
make bindings android

cd ../android
./gradlew assembleDebug
\`\`\`

### iOS Only
\`\`\`bash
cd rust-sdk
make bindings ios

cd ../ios
xcodebuild -scheme NuvioTV -sdk iphonesimulator
\`\`\`

## Development Workflow

1. Make Rust code changes in \`rust-sdk/src/\`
2. Run tests: \`cargo test\`
3. Rebuild: \`make all\` or platform-specific target
4. Build native app: Gradle (Android) or Xcode (iOS)

## Troubleshooting

### Android NDK Not Found
\`\`\`bash
# Check NDK path
echo $ANDROID_NDK_HOME

# Install via Android Studio SDK Manager
# Settings → Appearance & Behavior → System Settings → Android SDK
# SDK Tools tab → Check "NDK (Side by side)" → Apply
\`\`\`

### Xcode Codesigning Errors
\`\`\`bash
# For simulator (no signing required)
xcodebuild -scheme NuvioTV -sdk iphonesimulator

# For device, configure signing in Xcode:
# Project → Signing & Capabilities → Team
\`\`\`

### cargo-ndk Errors
\`\`\`bash
# Reinstall cargo-ndk
cargo install cargo-ndk --force

# Verify NDK environment variable
echo $ANDROID_NDK_HOME
\`\`\`
```

---

## References

### Internal Documentation

- [ADR-001: Tri-Layer Architecture](./001-tri-layer-architecture.md)
- [ADR-002: FFI Binding Strategy](./002-ffi-binding-strategy.md)
- [ADR-005: Migration Sequencing](./005-migration-sequencing.md)
- [Rust SDK Core Design](../rust-sdk-design.md)
- [FFI Boundary Design](../ffi-boundary-design.md)
- [Build Toolchain Requirements](../build-toolchain-requirements.md)

### External Resources

#### Rust Cross-Compilation

- [rustup Documentation](https://rust-lang.github.io/rustup/) - Rust toolchain installer
- [Rust Platform Support](https://doc.rust-lang.org/nightly/rustc/platform-support.html) - Target triple reference
- [cargo-ndk GitHub](https://github.com/bbqsrc/cargo-ndk) - Android NDK integration

#### UniFFI

- [UniFFI Book](https://mozilla.github.io/uniffi-rs/) - Official UniFFI documentation
- [UniFFI GitHub](https://github.com/mozilla/uniffi-rs) - Source code and examples

#### Android Development

- [Android NDK Guide](https://developer.android.com/ndk/guides) - Official NDK documentation
- [Gradle Plugin Documentation](https://developer.android.com/studio/build) - Android Gradle Plugin
- [JNI Specification](https://docs.oracle.com/javase/8/docs/technotes/guides/jni/) - Java Native Interface

#### iOS/tvOS Development

- [Xcode Build Settings Reference](https://developer.apple.com/documentation/xcode/build-settings-reference) - Xcode configuration
- [Swift Package Manager](https://www.swift.org/package-manager/) - Swift dependency management
- [Creating XCFrameworks](https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle) - Universal binaries

#### CI/CD

- [GitHub Actions Documentation](https://docs.github.com/en/actions) - Workflow syntax and features
- [rust-cache Action](https://github.com/Swatinem/rust-cache) - Cargo caching for GitHub Actions
- [gradle-build-action](https://github.com/gradle/gradle-build-action) - Gradle caching for GitHub Actions

### Production Case Studies

#### Rust Mobile Projects

- **Mozilla Firefox:** Multi-platform Rust core with UniFFI bindings (iOS, Android)
- **Signal:** Rust core with manual FFI (rigorous security requirements)
- **1Password:** Rust core shared across iOS, Android, web, desktop
- **Dropbox:** Rust sync engine replacing C++ (mobile and desktop)

#### Build System Case Studies

- **Bazel at Google:** Massive monorepo builds (not suitable for smaller projects)
- **Facebook Buck2:** Hermetic builds with remote caching (complex setup)
- **CMake:** C/C++ build system (not idiomatic for Rust)

---

**Revision History:**
- 2026-01-13: Initial version (v1.0) - Build toolchain and CI/CD strategy defined
