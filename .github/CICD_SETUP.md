# CI/CD Setup Guide

This document describes the CI/CD workflows for the NuvioStreamingTV native Android and iOS applications.

## Overview

The project has migrated from Expo/React Native to native Android (Kotlin) and iOS (Swift) applications with a shared Rust SDK. The CI/CD pipelines have been updated to support native-only builds.

## Workflows

### 1. Release Build (`release.yml`)

**Trigger**: Pushed tags matching `v*` (e.g., `v1.0.0`)

**Purpose**: Creates production releases with artifacts for both Android and iOS.

**Jobs**:
- `build-android`: Builds Android APK and AAB
- `build-ios`: Builds iOS archive and IPA
- `create-release`: Creates GitHub release with all artifacts

**Artifacts**:
- Android APK (for distribution outside Play Store)
- Android AAB (for Play Store)
- iOS IPA (for App Store/TestFlight)

**Usage**:
```bash
git tag v1.2.3
git push origin v1.2.3
```

### 2. Android Build (`android-build.yml`)

**Trigger**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Changes in `android/**` or `rust-sdk/**`

**Purpose**: Continuous integration for Android development.

**Jobs**:
- `lint`: Runs Android Lint checks
- `unit-tests`: Runs unit tests
- `build-debug`: Builds debug APK for testing
- `build-release`: Builds release APK and AAB (only on push to main/develop)

**Features**:
- Multi-architecture Rust SDK builds (arm64, armv7, x86_64)
- Gradle caching for faster builds
- Test result artifacts
- Lint report artifacts

### 3. iOS Build (`ios-build.yml`)

**Trigger**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Changes in `ios/**` or `rust-sdk/**`

**Purpose**: Continuous integration for iOS development.

**Jobs**:
- `lint`: Runs SwiftLint checks
- `unit-tests`: Runs unit tests
- `build-debug`: Builds debug configuration
- `build-release`: Builds release archive (only on push to main/develop)

**Features**:
- Multi-architecture Rust SDK builds (iOS device and simulator)
- CocoaPods dependency management
- Test result artifacts
- Unsigned builds for CI purposes

### 4. App Store Deployment (`app-store-deploy.yml`)

**Trigger**: Manual workflow dispatch

**Purpose**: Deploy builds to Google Play Store and Apple App Store.

**Jobs**:
- `deploy-android`: Deploys to Google Play Store
- `deploy-ios`: Deploys to TestFlight/App Store
- `notify-deployment`: Creates deployment summary

**Parameters**:
- `platform`: Choose `android`, `ios`, or `both`
- `release_track`: Choose `internal`, `alpha`, `beta`, or `production`

**Usage**:
1. Go to Actions tab in GitHub
2. Select "App Store Deployment" workflow
3. Click "Run workflow"
4. Choose platform and release track
5. Click "Run workflow" button

### 5. Rust SDK CI (`rust-sdk-ci.yml`)

**Trigger**:
- Push to `main` or `develop` branches
- Pull requests
- Changes in `rust-sdk/**`

**Purpose**: Quality checks and cross-platform builds for Rust SDK.

**Jobs**:
- `build`: Builds Rust SDK for multiple platforms
- `test`: Runs Rust tests
- `clippy`: Runs Rust linter
- `fmt`: Checks code formatting
- `binding-generation`: Generates Kotlin and Swift bindings
- `cross-platform-build`: Builds for all target architectures

## Required Secrets

To use the deployment workflows, configure these secrets in GitHub Settings → Secrets and variables → Actions:

### Android Deployment Secrets

| Secret Name | Description |
|------------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded release keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias in keystore |
| `ANDROID_KEY_PASSWORD` | Key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Play service account JSON |

**Creating the keystore secret**:
```bash
base64 -i release.keystore | pbcopy  # macOS
base64 -i release.keystore | xclip -selection clipboard  # Linux
```

### iOS Deployment Secrets

| Secret Name | Description |
|------------|-------------|
| `IOS_CERTIFICATES_P12_BASE64` | Base64-encoded P12 certificate file |
| `IOS_CERTIFICATES_PASSWORD` | Certificate password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `APPSTORE_ISSUER_ID` | App Store Connect API Issuer ID |
| `APPSTORE_API_KEY_ID` | App Store Connect API Key ID |
| `APPSTORE_API_PRIVATE_KEY` | App Store Connect API Private Key |

**Creating the P12 secret**:
```bash
base64 -i Certificates.p12 | pbcopy  # macOS
base64 -i Certificates.p12 | xclip -selection clipboard  # Linux
```

## Local Build Commands

All build commands are available in `package.json`:

### Android Commands
```bash
npm run android:build              # Debug APK
npm run android:build:release      # Release APK
npm run android:bundle:release     # Release AAB for Play Store
npm run android:install            # Install debug APK to device
npm run android:test               # Run unit tests
npm run android:lint               # Run lint checks
npm run android:clean              # Clean build artifacts
```

### iOS Commands
```bash
npm run ios:build                  # Debug build
npm run ios:build:release          # Release archive
npm run ios:test                   # Run unit tests
npm run ios:pods                   # Install CocoaPods
npm run ios:clean                  # Clean build artifacts
```

### Rust SDK Commands
```bash
npm run rust:build                 # Build Rust SDK
npm run rust:build:android         # Build for Android
npm run rust:build:ios             # Build for iOS
npm run rust:test                  # Run Rust tests
npm run rust:bindings              # Generate language bindings
npm run rust:clippy                # Run Rust linter
npm run rust:fmt                   # Check Rust formatting
```

### Unified Commands
```bash
npm run build:all                  # Build everything
npm run ci:validate                # Run format and lint checks
```

## Architecture

### Build Flow

1. **Rust SDK Build**
   - Rust code is compiled for target architectures
   - Bindings are generated for Kotlin and Swift
   - Libraries are placed in platform-specific directories

2. **Android Build**
   - Gradle picks up Rust libraries from `jniLibs`
   - Kotlin code is compiled
   - Jetpack Compose UI is bundled
   - APK/AAB is signed (for release)

3. **iOS Build**
   - CocoaPods installs dependencies
   - Rust libraries are linked via bridging header
   - Swift code is compiled
   - Archive is created and exported as IPA

### Artifact Retention

- Debug builds: 7 days
- Release builds: 30 days
- Test results: 7 days
- Lint reports: 7 days

## Migration from Expo/EAS

The following changes were made during the migration:

### Removed
- ✗ Node.js/npm setup in release workflow
- ✗ Expo CLI commands
- ✗ EAS build commands
- ✗ Metro bundler steps
- ✗ React Native build process
- ✗ `eas.json` (archived to `eas.json.archived`)

### Added
- ✓ Native Android Gradle builds
- ✓ Native iOS Xcode builds
- ✓ Rust SDK compilation for all targets
- ✓ Multi-architecture support
- ✓ Direct app store deployment
- ✓ Comprehensive testing pipelines

## Troubleshooting

### Android Build Fails

**Issue**: Gradle build fails with "SDK not found"
```bash
# Solution: Set ANDROID_HOME environment variable
export ANDROID_HOME=/path/to/android/sdk
```

**Issue**: NDK not found
```bash
# Solution: Install NDK via Android Studio or SDK Manager
sdkmanager --install "ndk;25.1.8937393"
```

### iOS Build Fails

**Issue**: CocoaPods installation fails
```bash
# Solution: Update CocoaPods and repo
gem install cocoapods
pod repo update
cd ios && pod install
```

**Issue**: Xcode version mismatch
```bash
# Solution: Select correct Xcode version
sudo xcode-select -s /Applications/Xcode.app
```

### Rust Build Fails

**Issue**: Target not installed
```bash
# Solution: Add required targets
rustup target add aarch64-linux-android
rustup target add aarch64-apple-ios
```

**Issue**: Cargo build fails
```bash
# Solution: Clean and rebuild
cd rust-sdk
cargo clean
cargo build --release
```

## Performance Optimization

### Gradle Caching

The workflows use Gradle caching to speed up builds:
```yaml
cache: 'gradle'
```

### Rust Caching

Rust compilation is cached via:
```yaml
uses: actions-rust-lang/setup-rust-toolchain@v1
with:
  cache: true
```

### Parallel Builds

Android builds use parallel execution:
```properties
org.gradle.parallel=true
org.gradle.daemon=false
```

## Best Practices

1. **Always run tests locally before pushing**
   ```bash
   npm run android:test
   npm run ios:test
   npm run rust:test
   ```

2. **Use feature branches for development**
   ```bash
   git checkout -b feature/my-feature
   # Make changes
   git push origin feature/my-feature
   # Create PR to main/develop
   ```

3. **Tag releases properly**
   ```bash
   git tag -a v1.2.3 -m "Release version 1.2.3"
   git push origin v1.2.3
   ```

4. **Monitor workflow runs**
   - Check Actions tab for failures
   - Review artifacts for build outputs
   - Check deployment summaries

## Support

For issues with CI/CD workflows:
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Check `TROUBLESHOOTING.md` (if available)
4. Create an issue in the repository

## Additional Resources

- [Android Gradle Plugin Documentation](https://developer.android.com/studio/releases/gradle-plugin)
- [Xcode Build Settings Reference](https://developer.apple.com/documentation/xcode)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Rust Cross-Compilation Guide](https://rust-lang.github.io/rustup/cross-compilation.html)
