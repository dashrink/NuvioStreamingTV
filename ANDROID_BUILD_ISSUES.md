# Android Build Issues - Diagnosis Report

Generated: 2026-01-19

## Summary

The Android build process was failing due to multiple issues that have been identified and partially resolved. This document tracks the issues found and their status.

## Issues Found and Fixed

### 1. ✅ Merge Conflicts in Source Files
- **Files Affected**:
  - `rust-sdk/nuvio-core/Cargo.toml`
  - `rust-sdk/nuvio-core/src/lib.rs`
  - `rust-sdk/nuvio-core/src/error.rs`
  - `rust-sdk/Cargo.lock`
- **Status**: FIXED
- **Solution**: Resolved all git merge conflict markers and regenerated Cargo.lock

### 2. ✅ Missing Android Rust Targets
- **Issue**: Android cross-compilation targets not installed
- **Status**: FIXED
- **Solution**: Installed targets:
  - `aarch64-linux-android`
  - `armv7-linux-androideabi`
  - `x86_64-linux-android`
  - `i686-linux-android`

### 3. ✅ OpenSSL Cross-Compilation Issues
- **Issue**: `reqwest` was configured with both `native-tls` and `rustls-tls` features
- **Status**: FIXED
- **Solution**: Modified `rust-sdk/Cargo.toml` to use only `rustls-tls` with `default-features = false`
- **Change**:
  ```toml
  # Before
  reqwest = { version = "0.12", features = ["json", "cookies", "native-tls", "rustls-tls"] }

  # After
  reqwest = { version = "0.12", features = ["json", "cookies", "rustls-tls"], default-features = false }
  ```

### 4. ✅ Missing Cargo Config for Android Linkers
- **Issue**: Cargo didn't know which linkers to use for Android targets
- **Status**: FIXED
- **Solution**: Created `rust-sdk/.cargo/config.toml` with Android NDK linker configuration

### 5. ✅ Missing Dependencies
- **Issue**: Several dependencies were used in code but not declared in Cargo.toml
- **Status**: FIXED
- **Dependencies Added**:
  - `urlencoding = "2.1"`
  - `rustls-pemfile` (from workspace)
  - `rustls-native-certs` (from workspace)
  - `argon2` (from workspace)
  - `uuid` (from workspace)

### 6. ✅ Missing Error Type Variants
- **Issue**: Code was calling `NuvioError::invalid_manifest()` and `NuvioError::profile()` which didn't exist
- **Status**: FIXED
- **Solution**:
  - Replaced all `invalid_manifest` calls with `validation`
  - Added `ProfileError` variant to `NuvioError` enum

## Issues Remaining (Require Code Fixes)

### 7. ⚠️ Rustls API Incompatibility
- **Issue**: Code written for older rustls 0.21.x API, but ecosystem has moved forward
- **Status**: NEEDS FIX
- **Affected Files**:
  - `rust-sdk/nuvio-core/src/http/tls.rs` (lines 190-217)
  - `rust-sdk/nuvio-core/src/http/middleware.rs` (lines 175, 343)
- **Specific Problems**:
  1. `rustls_pemfile::certs()` API changed - no longer returns an iterator
  2. `rustls_native_certs::load_native_certs()` API changed - returns `Result<Vec<Certificate>, Error>` instead of struct with `certs` and `errors` fields
  3. `ClientConfig::builder_with_provider()` doesn't exist in rustls 0.21
  4. `http` crate version mismatch (0.2 vs 1.4) causing type conflicts

**Recommendation**: Update the TLS configuration code to match rustls 0.21 API or upgrade to rustls 0.23+

### 8. ⚠️ HTTP Crate Version Conflict
- **Issue**: Two versions of `http` crate in dependency tree (0.2 and 1.4)
- **Status**: NEEDS FIX
- **Cause**: `reqwest-middleware 0.4` uses older `http 0.2`, but some dependencies expect `http 1.x`
- **Solution Options**:
  1. Upgrade to `reqwest-middleware 0.5+` which uses `http 1.x`
  2. Ensure all dependencies use compatible `http` versions

### 9. ⚠️ Type Inference Errors
- **Issue**: Rust compiler cannot infer error types in some closures
- **Files**: `rust-sdk/nuvio-core/src/profile/security.rs` (lines 17, 25)
- **Status**: NEEDS FIX
- **Solution**: Add explicit type annotations to closure parameters

### 10. ⚠️ Unused Variable Warnings
- **File**: `rust-sdk/nuvio-core/src/notifications/manager.rs` (lines 334-335)
- **Status**: MINOR
- **Solution**: Prefix unused variables with underscore: `_downloaded_bytes`, `_total_bytes`

## Build Environment Setup

### Prerequisites Verified
- ✅ Rust toolchain installed
- ✅ Android NDK 27.1.12297006 installed at `~/Android/Sdk/ndk/27.1.12297006`
- ✅ Android targets added to Rust
- ✅ Cargo linker configuration created

### Environment Variables Required
```bash
export ANDROID_NDK_HOME="$HOME/Android/Sdk/ndk/27.1.12297006"
export PATH="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH"
```

## Build Scripts Created

### 1. `rust-sdk/build-android.sh`
- Automated Android build script with NDK detection
- Automatically sets up environment variables
- Verifies toolchain availability
- Builds for aarch64-linux-android
- Copies output to Android project if available

### Usage
```bash
cd rust-sdk
./build-android.sh
```

## Recommended Next Steps

1. **Fix Rustls API Issues** (Priority: HIGH)
   - Update `rust-sdk/nuvio-core/src/http/tls.rs` to use correct rustls 0.21 APIs
   - Or consider upgrading to rustls 0.23+ for better Android support

2. **Fix HTTP Crate Conflict** (Priority: HIGH)
   - Upgrade `reqwest-middleware` to 0.5.x
   - Update workspace Cargo.toml: `reqwest-middleware = "0.5"`
   - Update http workspace dependency: `http = "1.0"`

3. **Fix Remaining Compilation Errors** (Priority: MEDIUM)
   - Add type annotations to closures in `profile/security.rs`
   - Fix unused variable warnings

4. **Test Full Build** (Priority: HIGH)
   - Once compilation succeeds, test `npm run rust:bindings`
   - Test `npm run android:build`
   - Test `npm run android:install`

## Files Modified

### Created
- `rust-sdk/.cargo/config.toml` - Android linker configuration
- `rust-sdk/build-android.sh` - Automated build script
- `ANDROID_BUILD_ISSUES.md` - This file

### Modified
- `rust-sdk/Cargo.toml` - Changed reqwest to rustls-only
- `rust-sdk/nuvio-core/Cargo.toml` - Resolved merge conflicts, added dependencies
- `rust-sdk/nuvio-core/src/lib.rs` - Resolved merge conflicts
- `rust-sdk/nuvio-core/src/error.rs` - Resolved merge conflicts, added ProfileError
- `rust-sdk/nuvio-core/src/stremio_service/*.rs` - Replaced invalid_manifest with validation
- `rust-sdk/nuvio-core/src/stremio_service/validation.rs` - Fixed response_too_large call
- `rust-sdk/Cargo.lock` - Regenerated

## Build Command Reference

```bash
# Full Android build (when code is fixed)
cd rust-sdk
ANDROID_NDK_HOME="$HOME/Android/Sdk/ndk/27.1.12297006" \
PATH="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH" \
cargo build --release --target aarch64-linux-android

# Or use the wrapper script
./build-android.sh

# Generate bindings (after Rust build succeeds)
./generate-bindings.sh

# Build Android app
cd ../android
./gradlew assembleDebug
```

## Error Count Progress

- **Initial**: 52+ compilation errors + merge conflicts
- **Current**: 23 compilation errors (mostly rustls API incompatibilities)
- **Target**: 0 errors

## Conclusion

Significant progress has been made in resolving the Android build issues. The main remaining blockers are:
1. Rustls API incompatibilities (requires code updates)
2. HTTP crate version conflicts (requires dependency updates)

Once these are resolved, the build should complete successfully.
