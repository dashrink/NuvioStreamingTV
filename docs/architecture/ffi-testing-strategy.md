# FFI Testing Strategy for Tri-Layer Architecture

**Document Version:** 1.0
**Last Updated:** 2026-01-14
**Project:** NuvioStreamingTV Tri-Layer Architecture Migration
**Purpose:** Define comprehensive testing strategy for FFI boundaries including memory leak detection, error handling verification, panic handling, and performance benchmarking

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Testing Philosophy](#testing-philosophy)
3. [Memory Leak Detection](#memory-leak-detection)
4. [Error Handling Test Cases](#error-handling-test-cases)
5. [Panic Handling Verification](#panic-handling-verification)
6. [Performance Benchmarking](#performance-benchmarking)
7. [JNI Conversion Cost Measurement](#jni-conversion-cost-measurement)
8. [Integration Testing Strategy](#integration-testing-strategy)
9. [Test Automation & CI/CD](#test-automation--cicd)
10. [Platform-Specific Testing](#platform-specific-testing)
11. [Test Coverage Requirements](#test-coverage-requirements)
12. [References](#references)

---

## Executive Summary

### Testing Scope

The FFI layer represents the most critical and error-prone component of the tri-layer architecture. This document defines a comprehensive testing strategy to ensure memory safety, correctness, and performance of the Rust ↔ Kotlin/Swift FFI boundaries.

### Critical Testing Focus Areas

Based on the 9 FFI technical constraints identified in the spec:

1. **Memory Safety** - Memory leaks, double-free, use-after-free, dangling pointers
2. **Error Propagation** - Rust errors correctly translated to Kotlin/Swift exceptions
3. **Panic Handling** - Rust panics caught and converted to FFI-safe errors (no UB)
4. **Performance** - FFI call overhead <1ms, minimal JNI marshalling cost
5. **String Management** - Proper allocation/deallocation of CString across FFI
6. **Async Operations** - Deadlock-free async/await across FFI boundary
7. **Type Conversions** - Correct bidirectional type mapping
8. **Concurrency** - Thread-safe FFI operations
9. **Platform Compatibility** - Android (two-layer) vs iOS (single-layer) behavior

### Testing Tools Matrix

| Testing Goal | Rust Tool | Android Tool | iOS Tool |
|--------------|-----------|--------------|----------|
| **Memory Leaks** | Valgrind, AddressSanitizer | LeakCanary, Android Profiler | Instruments (Leaks template) |
| **Memory Errors** | AddressSanitizer, Miri | Valgrind (NDK) | malloc_history, Guard Malloc |
| **Performance** | Criterion.rs | Android Profiler, Systrace | Instruments (Time Profiler) |
| **Threading** | ThreadSanitizer | Android Debug Tools | Thread Sanitizer (Xcode) |
| **Code Coverage** | cargo-tarpaulin | JaCoCo | Xcode Code Coverage |
| **Fuzzing** | cargo-fuzz (libFuzzer) | AFL, LibFuzzer | libFuzzer |
| **Static Analysis** | Clippy, rust-analyzer | Android Lint, Detekt | SwiftLint, Xcode Analyzer |

### Key Metrics & Success Criteria

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Memory Leaks** | 0 leaks detected | Valgrind, LeakCanary, Instruments |
| **FFI Call Overhead** | <1ms per call | Criterion.rs benchmarks |
| **JNI Overhead** | <100μs per call | Android Profiler traces |
| **Error Coverage** | 100% error paths tested | Integration test suite |
| **Panic Handling** | 0 uncaught panics | Crash reporting + tests |
| **Code Coverage** | >80% FFI code | cargo-tarpaulin + platform tools |
| **Performance Regression** | <5% overhead | Continuous benchmarking |

---

## Testing Philosophy

### Layered Testing Approach

The FFI testing strategy employs a layered approach:

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Tests (Kotlin/Swift)                  │
│  Full app tests exercising FFI in realistic scenarios       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│              Integration Tests (FFI Boundary)                │
│  Test FFI functions with real Rust + real native code       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                Unit Tests (Rust Side)                        │
│  Test Rust business logic in isolation (no FFI)             │
└──────────────────────────────────────────────────────────────┘
```

**Layer 1: Unit Tests (Rust)**
- Test Rust business logic without FFI involvement
- Fast, deterministic, no platform dependencies
- Coverage: Core logic, algorithms, data structures

**Layer 2: Integration Tests (FFI Boundary)**
- Test FFI functions from Kotlin/Swift test harness
- Verify memory management, error handling, type conversions
- Coverage: All FFI-exposed functions

**Layer 3: E2E Tests (Platform)**
- Test full application flows through native UI
- Verify realistic usage patterns, performance under load
- Coverage: Critical user journeys

### Test-Driven FFI Development

**Principle:** Write FFI tests BEFORE implementing FFI functions

**Process:**
1. Define UDL interface (UniFFI definition)
2. Write integration tests for FFI function (RED)
3. Generate bindings with `uniffi-bindgen`
4. Implement Rust function (GREEN)
5. Add memory/performance tests (REFACTOR)
6. Verify with sanitizers and profilers

---

## Memory Leak Detection

### Overview

Memory leaks in FFI code are particularly dangerous because:
- Rust's ownership system doesn't extend across FFI boundary
- Manual memory management required for FFI-exposed objects
- Different platforms have different leak detection capabilities
- Leaks accumulate over time, causing OOM crashes

### Critical Leak Scenarios

1. **Rust Objects Not Freed:**
   - Kotlin/Swift holds opaque pointer but never calls destroy function
   - Example: `profile_manager_new()` without `profile_manager_destroy()`

2. **String Memory Leaks:**
   - CString allocated with `into_raw()` but never freed
   - Example: Return string to Kotlin/Swift without free function

3. **Collection Leaks:**
   - Vec/HashMap converted to FFI array but not freed
   - Example: `get_profiles()` returns array without deallocator

4. **Callback Context Leaks:**
   - Async callbacks hold strong references to Rust objects
   - Example: Stream callback never released after completion

### Tool 1: Valgrind (Rust Side)

**Purpose:** Detect memory leaks in Rust code before FFI exposure

**Installation:**
```bash
# macOS (via Homebrew)
brew install valgrind

# Linux (Ubuntu/Debian)
sudo apt-get install valgrind

# Note: Valgrind not available on macOS ARM (M1/M2)
# Use x86_64 build or Docker container
```

**Usage:**
```bash
# Build Rust library with debug symbols
cd rust-sdk
cargo build --lib

# Run Valgrind on test suite
valgrind --leak-check=full \
         --show-leak-kinds=all \
         --track-origins=yes \
         --verbose \
         --log-file=valgrind-out.txt \
         cargo test

# Analyze results
grep "definitely lost" valgrind-out.txt
grep "indirectly lost" valgrind-out.txt
```

**Test Scenarios:**
- Profile creation and destruction
- Catalog loading and cleanup
- Stream resolution with timeout
- Download queue operations
- Settings save/load cycles

**Success Criteria:**
- 0 bytes "definitely lost"
- 0 bytes "indirectly lost"
- All "still reachable" bytes from known safe sources (e.g., tokio runtime)

### Tool 2: AddressSanitizer (Rust Side)

**Purpose:** Detect memory errors including use-after-free, double-free, buffer overflows

**Installation:** Built into Rust toolchain

**Usage:**
```bash
# Set environment variables
export RUSTFLAGS="-Z sanitizer=address"
export ASAN_OPTIONS="detect_leaks=1:halt_on_error=1"

# Build and test with AddressSanitizer
cd rust-sdk
cargo +nightly test -Z build-std --target x86_64-unknown-linux-gnu

# For macOS ARM
cargo +nightly test -Z build-std --target aarch64-apple-darwin
```

**Test Scenarios:**
- FFI function calls with invalid pointers
- Use-after-free attempts via destroyed objects
- Buffer overflow in string conversions
- Double-free via duplicate destroy calls

**Success Criteria:**
- 0 ASan violations
- All tests pass without crashes

### Tool 3: LeakCanary (Android)

**Purpose:** Detect memory leaks in Android JNI layer and Kotlin code

**Installation:**
```kotlin
// app/build.gradle.kts
dependencies {
    debugImplementation("com.squareup.leakcanary:leakcanary-android:2.12")
}
```

**Configuration:**
```kotlin
// Application.kt
class NuvioApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        if (BuildConfig.DEBUG) {
            LeakCanary.config = LeakCanary.config.copy(
                retainedVisibleThreshold = 3,
                dumpHeap = true
            )
        }
    }
}
```

**Test Scenarios:**

**Scenario 1: Profile Manager Lifecycle**
```kotlin
@Test
fun testProfileManagerNoLeak() {
    val profileManager = ProfileManager()
    profileManager.createProfile("Test", "1234")

    // Force GC and check for leaks
    Runtime.getRuntime().gc()
    Thread.sleep(2000)

    // LeakCanary will report if profileManager not freed
}
```

**Scenario 2: Stream Resolution Leaks**
```kotlin
@Test
fun testStreamResolutionRepeated() {
    val streamManager = StreamManager()

    repeat(100) {
        val stream = streamManager.resolveStream("movie:123")
        // Use stream
        streamManager.releaseStream(stream)
    }

    // Check for accumulated leaks
    Runtime.getRuntime().gc()
}
```

**Scenario 3: Catalog Pagination Leaks**
```kotlin
@Test
fun testCatalogPaginationNoLeak() {
    val catalogManager = CatalogManager()

    for (page in 1..10) {
        val items = catalogManager.getCatalog("movies", page, 20)
        // Process items
        catalogManager.releaseCatalog(items)
    }

    Runtime.getRuntime().gc()
}
```

**Success Criteria:**
- 0 leaks reported by LeakCanary
- Heap size remains stable across repeated operations
- GC successfully reclaims FFI-related objects

### Tool 4: Instruments (iOS/tvOS)

**Purpose:** Detect memory leaks in iOS/tvOS C-FFI layer and Swift code

**Usage:**

1. **Open Xcode Project**
2. **Product → Profile** (or Cmd+I)
3. **Select "Leaks" template**
4. **Run app through test scenarios**

**Test Scenarios:**

**Scenario 1: Profile Manager Lifecycle**
```swift
func testProfileManagerNoLeak() {
    autoreleasepool {
        let profileManager = ProfileManager()
        try! profileManager.createProfile(name: "Test", pin: "1234")

        // profileManager should be deallocated here
    }

    // Check Instruments for retained memory
}
```

**Scenario 2: Long-Running Operations**
```swift
func testStreamingSessionNoLeak() {
    let streamManager = StreamManager()

    for _ in 0..<100 {
        autoreleasepool {
            let stream = try! streamManager.resolveStream(id: "movie:123")
            // Use stream
            streamManager.releaseStream(stream)
        }
    }

    // Verify no accumulated leaks in Instruments
}
```

**Scenario 3: Callback Cleanup**
```swift
func testAsyncCallbacksNoLeak() {
    let catalogManager = CatalogManager()
    let expectation = XCTestExpectation(description: "Catalog loaded")

    catalogManager.loadCatalog("movies") { result in
        // Handle result
        expectation.fulfill()
    }

    wait(for: [expectation], timeout: 5.0)

    // Verify callback context released
}
```

**Instruments Analysis:**
- Monitor "Leaks" instrument for red bars (leaks detected)
- Use "Allocations" instrument to track memory growth
- Check "VM Tracker" for unexpected memory regions
- Verify object deallocation in "Object Graph"

**Success Criteria:**
- 0 leaks detected in Instruments
- Memory usage returns to baseline after operations
- Swift objects properly deallocated after scope exit

### Memory Leak Test Automation

**CI/CD Integration:**

```yaml
# .github/workflows/ffi-memory-tests.yml
name: FFI Memory Leak Tests

on: [push, pull_request]

jobs:
  rust-valgrind:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Valgrind
        run: sudo apt-get install -y valgrind
      - name: Run Valgrind tests
        run: |
          cd rust-sdk
          cargo build --lib
          valgrind --leak-check=full --error-exitcode=1 cargo test

  rust-asan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install nightly Rust
        run: rustup toolchain install nightly
      - name: Run AddressSanitizer tests
        run: |
          cd rust-sdk
          RUSTFLAGS="-Z sanitizer=address" cargo +nightly test -Z build-std

  android-leakcanary:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Android instrumented tests
        run: |
          ./gradlew connectedDebugAndroidTest
          # Parse LeakCanary results
          python scripts/check_leakcanary_results.py

  ios-leaks:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run iOS memory tests
        run: |
          xcodebuild test -scheme NuvioTV \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            -enableAddressSanitizer YES
```

---

## Error Handling Test Cases

### Overview

Error handling across FFI boundaries is complex because:
- Rust `Result<T, E>` cannot directly map to Kotlin/Swift exceptions
- Panics across FFI cause undefined behavior
- Error context (messages, backtraces) can be lost
- Different platforms have different error semantics

### Error Propagation Architecture

**Rust Side:**
```rust
// Error type exposed via FFI
#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum NuvioError {
    #[error("Authentication failed: {reason}")]
    AuthError { reason: String },

    #[error("Network error: {message}")]
    NetworkError { message: String },

    #[error("Storage error: {message}")]
    StorageError { message: String },

    #[error("Invalid input: {message}")]
    ValidationError { message: String },

    #[error("Resource not found: {resource}")]
    NotFoundError { resource: String },
}

// FFI function with error handling
#[uniffi::export]
pub fn profile_create(name: String, pin: String) -> Result<Profile, NuvioError> {
    // Input validation
    if name.is_empty() {
        return Err(NuvioError::ValidationError {
            message: "Profile name cannot be empty".to_string(),
        });
    }

    // Business logic with error propagation
    ProfileManager::create_profile(name, pin)
        .map_err(|e| match e {
            CreateProfileError::DuplicateName => NuvioError::ValidationError {
                message: format!("Profile '{}' already exists", name),
            },
            CreateProfileError::StorageError(msg) => NuvioError::StorageError {
                message: msg,
            },
        })
}
```

**Kotlin Side:**
```kotlin
sealed class NuvioException(message: String) : Exception(message) {
    class AuthException(message: String) : NuvioException(message)
    class NetworkException(message: String) : NuvioException(message)
    class StorageException(message: String) : NuvioException(message)
    class ValidationException(message: String) : NuvioException(message)
    class NotFoundException(message: String) : NuvioException(message)
}

// Generated by UniFFI
fun profileCreate(name: String, pin: String): Profile {
    // Throws NuvioException if Rust returns Err
}
```

**Swift Side:**
```swift
enum NuvioError: Error {
    case authError(reason: String)
    case networkError(message: String)
    case storageError(message: String)
    case validationError(message: String)
    case notFoundError(resource: String)
}

// Generated by UniFFI
func profileCreate(name: String, pin: String) throws -> Profile {
    // Throws NuvioError if Rust returns Err
}
```

### Test Case Categories

#### 1. Input Validation Errors

**Test: Empty Profile Name**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profile_create_empty_name() {
        let result = profile_create("".to_string(), "1234".to_string());

        assert!(result.is_err());
        match result.unwrap_err() {
            NuvioError::ValidationError { message } => {
                assert!(message.contains("name cannot be empty"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }
}
```

**Kotlin Test:**
```kotlin
@Test(expected = NuvioException.ValidationException::class)
fun testProfileCreateEmptyName() {
    profileCreate("", "1234")
}

@Test
fun testProfileCreateEmptyNameErrorMessage() {
    try {
        profileCreate("", "1234")
        fail("Expected ValidationException")
    } catch (e: NuvioException.ValidationException) {
        assertTrue(e.message!!.contains("name cannot be empty"))
    }
}
```

**Swift Test:**
```swift
func testProfileCreateEmptyName() {
    XCTAssertThrowsError(try profileCreate(name: "", pin: "1234")) { error in
        guard case NuvioError.validationError(let message) = error else {
            XCTFail("Expected validationError")
            return
        }
        XCTAssertTrue(message.contains("name cannot be empty"))
    }
}
```

#### 2. Network Errors

**Test: API Timeout**
```rust
#[test]
fn test_catalog_load_timeout() {
    let manager = CatalogManager::new();

    // Mock network timeout
    let result = manager.load_catalog_with_timeout(
        "movies".to_string(),
        Duration::from_millis(1)  // 1ms timeout
    );

    assert!(result.is_err());
    match result.unwrap_err() {
        NuvioError::NetworkError { message } => {
            assert!(message.contains("timeout") || message.contains("timed out"));
        }
        _ => panic!("Expected NetworkError"),
    }
}
```

**Kotlin Test:**
```kotlin
@Test(expected = NuvioException.NetworkException::class)
fun testCatalogLoadTimeout() {
    val manager = CatalogManager()
    manager.loadCatalogWithTimeout("movies", 1) // 1ms timeout
}
```

**Swift Test:**
```swift
func testCatalogLoadTimeout() {
    let manager = CatalogManager()

    XCTAssertThrowsError(try manager.loadCatalogWithTimeout(
        catalog: "movies",
        timeoutMs: 1
    )) { error in
        guard case NuvioError.networkError(let message) = error else {
            XCTFail("Expected networkError")
            return
        }
        XCTAssertTrue(message.contains("timeout"))
    }
}
```

#### 3. Storage Errors

**Test: Disk Full**
```rust
#[test]
fn test_download_disk_full() {
    let manager = DownloadManager::new();

    // Mock disk full condition
    let result = manager.start_download_with_limited_space(
        "movie:123".to_string(),
        1024  // Only 1KB available
    );

    assert!(result.is_err());
    match result.unwrap_err() {
        NuvioError::StorageError { message } => {
            assert!(message.contains("disk") || message.contains("space"));
        }
        _ => panic!("Expected StorageError"),
    }
}
```

#### 4. Resource Not Found

**Test: Invalid Movie ID**
```kotlin
@Test(expected = NuvioException.NotFoundException::class)
fun testStreamResolveInvalidId() {
    val manager = StreamManager()
    manager.resolveStream("invalid:999999")
}

@Test
fun testStreamResolveNotFoundMessage() {
    val manager = StreamManager()

    try {
        manager.resolveStream("invalid:999999")
        fail("Expected NotFoundException")
    } catch (e: NuvioException.NotFoundException) {
        assertTrue(e.message!!.contains("invalid:999999"))
    }
}
```

#### 5. Concurrent Access Errors

**Test: Profile Locked**
```swift
func testProfileEditWhileLocked() async {
    let manager = ProfileManager()
    let profile = try! manager.createProfile(name: "Test", pin: "1234")

    // Lock profile
    try! manager.lockProfile(profile.id)

    // Attempt edit while locked
    XCTAssertThrowsError(try manager.editProfile(
        id: profile.id,
        name: "NewName"
    )) { error in
        guard case NuvioError.validationError(let message) = error else {
            XCTFail("Expected validationError for locked profile")
            return
        }
        XCTAssertTrue(message.contains("locked"))
    }
}
```

### Error Recovery Test Cases

**Test: Retry After Network Failure**
```kotlin
@Test
fun testCatalogLoadRetryAfterFailure() {
    val manager = CatalogManager()

    // First attempt fails (mock network error)
    try {
        manager.loadCatalog("movies")
        fail("Expected NetworkException")
    } catch (e: NuvioException.NetworkException) {
        // Expected
    }

    // Second attempt succeeds (network recovered)
    val catalog = manager.loadCatalog("movies")
    assertNotNull(catalog)
}
```

### Error Context Preservation

**Test: Error Chain Preserved**
```rust
#[test]
fn test_error_context_preserved() {
    let result = profile_create("Test".to_string(), "1234".to_string());

    if let Err(e) = result {
        // Verify error message contains context
        let error_message = format!("{}", e);
        assert!(error_message.len() > 0);

        // Verify error source chain
        let mut source = e.source();
        let mut depth = 0;
        while let Some(err) = source {
            depth += 1;
            source = err.source();
        }
        assert!(depth >= 0);
    }
}
```

### Error Handling Coverage Requirements

| Error Category | Test Coverage Target | Verification Method |
|----------------|---------------------|---------------------|
| Validation Errors | 100% | Unit tests for all inputs |
| Network Errors | >90% | Integration tests with mocks |
| Storage Errors | >85% | Tests with limited resources |
| Authentication Errors | 100% | Tests for all auth paths |
| Not Found Errors | 100% | Tests with invalid IDs |
| Concurrent Errors | >75% | Multi-threaded stress tests |

---

## Panic Handling Verification

### Overview

Rust panics across FFI boundaries cause **undefined behavior**. The FFI layer MUST catch all panics and convert them to FFI-safe errors.

### Critical Panic Scenarios

1. **Array Index Out of Bounds**
2. **Unwrap on None**
3. **Division by Zero**
4. **Stack Overflow**
5. **Out of Memory**
6. **Assertion Failures**

### Panic Prevention Strategy

**Rule 1: Never use `.unwrap()` or `.expect()` in FFI functions**

❌ **BAD:**
```rust
#[uniffi::export]
pub fn get_profile(id: u32) -> Profile {
    let manager = get_profile_manager().unwrap();  // PANIC if None!
    manager.get_profile(id).unwrap()  // PANIC if not found!
}
```

✅ **GOOD:**
```rust
#[uniffi::export]
pub fn get_profile(id: u32) -> Result<Profile, NuvioError> {
    let manager = get_profile_manager()
        .ok_or(NuvioError::StorageError {
            message: "Profile manager not initialized".to_string(),
        })?;

    manager.get_profile(id)
        .ok_or(NuvioError::NotFoundError {
            resource: format!("Profile {}", id),
        })
}
```

**Rule 2: Use `catch_unwind` for operations that might panic**

```rust
use std::panic::catch_unwind;
use std::panic::AssertUnwindSafe;

#[uniffi::export]
pub fn process_complex_operation(data: String) -> Result<String, NuvioError> {
    // Wrap potentially panicking code
    let result = catch_unwind(AssertUnwindSafe(|| {
        // Complex operation that might panic
        complex_parsing_logic(&data)
    }));

    match result {
        Ok(value) => Ok(value),
        Err(_) => Err(NuvioError::ValidationError {
            message: "Operation panicked (likely invalid input)".to_string(),
        }),
    }
}
```

### Panic Test Cases

**Test 1: Array Index Out of Bounds**
```rust
#[test]
fn test_no_panic_on_invalid_index() {
    let result = get_profile_at_index(999999);

    // Should return error, not panic
    assert!(result.is_err());
    match result.unwrap_err() {
        NuvioError::NotFoundError { .. } => {
            // Expected
        }
        _ => panic!("Expected NotFoundError"),
    }
}
```

**Test 2: Division by Zero**
```rust
#[test]
fn test_no_panic_on_division_by_zero() {
    let result = calculate_average(vec![], 0);

    // Should return error, not panic
    assert!(result.is_err());
}
```

**Test 3: Unwrap on None**
```rust
#[test]
fn test_no_panic_on_none_value() {
    let result = get_optional_config("nonexistent_key".to_string());

    // Should return None wrapped in Result, not panic
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}
```

### Kotlin Panic Detection Tests

**Test: Verify FFI Never Crashes**
```kotlin
@Test
fun testFFINeverCrashes() {
    val invalidInputs = listOf(
        "",
        "x".repeat(1_000_000),  // Huge string
        "\u0000",  // Null character
        "💀🔥💥",  // Emojis
        "'; DROP TABLE profiles;--",  // SQL injection attempt
    )

    val manager = ProfileManager()

    invalidInputs.forEach { input ->
        try {
            manager.createProfile(input, "1234")
            // May succeed or throw exception
        } catch (e: NuvioException) {
            // Exception is fine
            assertNotNull(e.message)
        } catch (e: Exception) {
            // Native crash or unexpected exception
            fail("FFI crashed with: ${e.message}")
        }
    }
}
```

### Swift Panic Detection Tests

**Test: Verify FFI Never Crashes**
```swift
func testFFINeverCrashes() {
    let invalidInputs = [
        "",
        String(repeating: "x", count: 1_000_000),
        "\u{0000}",
        "💀🔥💥",
        "'; DROP TABLE profiles;--",
    ]

    let manager = ProfileManager()

    for input in invalidInputs {
        do {
            _ = try manager.createProfile(name: input, pin: "1234")
            // May succeed
        } catch {
            // Exception is fine
            XCTAssertNotNil(error.localizedDescription)
        }
    }
}
```

### Panic Monitoring in Production

**Crash Reporting Integration:**
```rust
// Rust side: Set custom panic hook
use std::panic;

pub fn init_panic_handler() {
    panic::set_hook(Box::new(|panic_info| {
        let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic".to_string()
        };

        let location = panic_info.location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "Unknown location".to_string());

        // Log to native crash reporter
        eprintln!("RUST PANIC: {} at {}", message, location);

        // Send to Sentry/Crashlytics
        // (requires FFI callback to platform crash reporter)
    }));
}
```

---

## Performance Benchmarking

### Overview

FFI calls have inherent overhead. The goal is to measure and minimize this overhead to meet the <1ms target per FFI call.

### Performance Targets

| Operation Type | Target | Measurement |
|----------------|--------|-------------|
| **Simple FFI Call** (getter) | <50μs | Criterion.rs benchmark |
| **Complex FFI Call** (with data) | <1ms | Criterion.rs benchmark |
| **Android JNI Call** | <100μs | Android Profiler |
| **iOS C-FFI Call** | <50μs | Instruments Time Profiler |
| **String Conversion** | <20μs | Per string |
| **Collection Conversion** | <5μs per item | Per item in Vec/Array |

### Tool: Criterion.rs (Rust Benchmarks)

**Installation:**
```toml
# Cargo.toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "ffi_benchmarks"
harness = false
```

**Benchmark Suite:**
```rust
// benches/ffi_benchmarks.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use nuvio_core::*;

fn benchmark_profile_create(c: &mut Criterion) {
    c.bench_function("profile_create", |b| {
        b.iter(|| {
            profile_create(
                black_box("TestUser".to_string()),
                black_box("1234".to_string())
            )
        });
    });
}

fn benchmark_profile_get(c: &mut Criterion) {
    // Setup: Create profile first
    let profile = profile_create("TestUser".to_string(), "1234".to_string()).unwrap();

    c.bench_function("profile_get", |b| {
        b.iter(|| {
            profile_get(black_box(profile.id))
        });
    });
}

fn benchmark_catalog_load(c: &mut Criterion) {
    let manager = CatalogManager::new();

    c.bench_function("catalog_load", |b| {
        b.iter(|| {
            manager.load_catalog(black_box("movies".to_string()))
        });
    });
}

fn benchmark_stream_resolve(c: &mut Criterion) {
    let manager = StreamManager::new();

    c.bench_function("stream_resolve", |b| {
        b.iter(|| {
            manager.resolve_stream(black_box("movie:123".to_string()))
        });
    });
}

fn benchmark_string_conversion(c: &mut Criterion) {
    let mut group = c.benchmark_group("string_conversion");

    for size in [10, 100, 1000, 10000].iter() {
        group.bench_with_input(BenchmarkId::from_parameter(size), size, |b, &size| {
            let test_string = "x".repeat(size);
            b.iter(|| {
                // Simulate FFI string conversion
                let c_string = std::ffi::CString::new(test_string.clone()).unwrap();
                black_box(c_string.into_raw());
            });
        });
    }

    group.finish();
}

fn benchmark_collection_conversion(c: &mut Criterion) {
    let mut group = c.benchmark_group("collection_conversion");

    for size in [10, 100, 1000].iter() {
        group.bench_with_input(BenchmarkId::from_parameter(size), size, |b, &size| {
            let profiles: Vec<Profile> = (0..*size)
                .map(|i| Profile {
                    id: i,
                    name: format!("User{}", i),
                    pin: "1234".to_string(),
                })
                .collect();

            b.iter(|| {
                // Simulate FFI array conversion
                let ptr = profiles.as_ptr();
                let len = profiles.len();
                black_box((ptr, len));
            });
        });
    }

    group.finish();
}

criterion_group!(
    benches,
    benchmark_profile_create,
    benchmark_profile_get,
    benchmark_catalog_load,
    benchmark_stream_resolve,
    benchmark_string_conversion,
    benchmark_collection_conversion
);

criterion_main!(benches);
```

**Running Benchmarks:**
```bash
cd rust-sdk
cargo bench

# View HTML report
open target/criterion/report/index.html
```

**Interpreting Results:**
- Look for mean execution time
- Check for outliers (long tail)
- Compare against baseline
- Identify performance regressions

### Android Performance Profiling

**Method 1: Android Profiler (Android Studio)**

1. Open Android Studio
2. Run app on device/emulator
3. Open **Profiler** tab (View → Tool Windows → Profiler)
4. Select **CPU** profiler
5. Start recording with "Trace System Calls"
6. Execute FFI operations
7. Stop recording
8. Analyze flamegraph for JNI overhead

**Method 2: Systrace**

```bash
# Record systrace for 10 seconds
python $ANDROID_SDK/platform-tools/systrace/systrace.py \
    --time=10 \
    -o trace.html \
    sched freq idle am wm gfx view binder_driver hal dalvik camera input res

# Open trace.html in Chrome
# Search for "nuvio_" functions (FFI calls)
# Measure time between JNI entry and exit
```

**Method 3: Instrumentation**

```kotlin
// ProfileManager.kt
class ProfileManager {
    fun createProfile(name: String, pin: String): Profile {
        val startTime = System.nanoTime()

        val result = nativeCreateProfile(name, pin)

        val duration = System.nanoTime() - startTime
        Log.d("FFI_PERF", "createProfile took ${duration / 1000}μs")

        return result
    }

    private external fun nativeCreateProfile(name: String, pin: String): Profile
}
```

### iOS Performance Profiling

**Method 1: Instruments Time Profiler**

1. Open Xcode
2. Product → Profile (Cmd+I)
3. Select **Time Profiler** template
4. Run app and execute FFI operations
5. Stop recording
6. Filter by "nuvio_" to see FFI functions
7. Analyze time distribution

**Method 2: Signposts (Modern Approach)**

```swift
// ProfileManager.swift
import os.signpost

class ProfileManager {
    private let log = OSLog(subsystem: "com.nuvio.app", category: "FFI")
    private let signpostID = OSSignpostID(log: log)

    func createProfile(name: String, pin: String) throws -> Profile {
        os_signpost(.begin, log: log, name: "createProfile", signpostID: signpostID)

        defer {
            os_signpost(.end, log: log, name: "createProfile", signpostID: signpostID)
        }

        return try nativeCreateProfile(name: name, pin: pin)
    }

    private func nativeCreateProfile(name: String, pin: String) throws -> Profile {
        // Generated by UniFFI
    }
}
```

**Viewing Signposts:**
1. Instruments → "os_signpost" instrument
2. Filter by "createProfile"
3. View duration statistics

### Performance Test Suite

**Kotlin Performance Tests:**
```kotlin
@Test
fun testFFICallOverhead() {
    val manager = ProfileManager()
    val iterations = 1000

    val startTime = System.nanoTime()

    repeat(iterations) {
        manager.getProfile(1)  // Simple getter
    }

    val duration = System.nanoTime() - startTime
    val averageMicros = (duration / iterations) / 1000

    // Assert <50μs per call
    assertTrue(averageMicros < 50, "FFI overhead too high: ${averageMicros}μs")
}

@Test
fun testBatchOperationPerformance() {
    val manager = CatalogManager()

    val startTime = System.nanoTime()

    // Batch operation (single FFI call)
    val items = manager.getCatalogBatch("movies", pageSize = 100)

    val duration = System.nanoTime() - startTime
    val milliseconds = duration / 1_000_000

    // Assert <10ms for batch of 100
    assertTrue(milliseconds < 10, "Batch operation too slow: ${milliseconds}ms")
}
```

**Swift Performance Tests:**
```swift
func testFFICallOverhead() {
    let manager = ProfileManager()
    let iterations = 1000

    measure {
        for _ in 0..<iterations {
            _ = try? manager.getProfile(id: 1)
        }
    }

    // XCTest will report average time
    // Verify <50μs per call in results
}

func testBatchOperationPerformance() {
    let manager = CatalogManager()

    measure {
        _ = try? manager.getCatalogBatch(catalog: "movies", pageSize: 100)
    }

    // Verify <10ms for batch operation
}
```

### Continuous Performance Monitoring

**CI/CD Benchmark Comparison:**
```yaml
# .github/workflows/ffi-benchmarks.yml
name: FFI Performance Benchmarks

on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run benchmarks
        run: |
          cd rust-sdk
          cargo bench -- --save-baseline current

      - name: Compare with baseline
        run: |
          cargo bench -- --baseline main

      - name: Check for regressions
        run: |
          python scripts/check_performance_regression.py \
            --threshold 5  # Fail if >5% slower
```

---

## JNI Conversion Cost Measurement

### Overview

Android requires two-layer FFI (Rust → C → JNI → Kotlin), making conversion cost measurement critical.

### JNI Conversion Overhead Sources

1. **Type Marshalling:** Java objects ↔ C types conversion
2. **Memory Copying:** Data copied between JVM heap and native heap
3. **JNI Function Calls:** Overhead of JNI API itself (`GetStringUTFChars`, `NewStringUTF`, etc.)
4. **GC Interaction:** JNI local references tracked by GC
5. **Thread Attachment:** JNI requires threads be attached to JVM

### Measuring JNI Overhead

**Method 1: Direct Timing**

```kotlin
// app/src/main/kotlin/com/nuvio/ffi/JNIBenchmark.kt
object JNIBenchmark {
    fun measureStringConversion(iterations: Int = 1000): Long {
        val testString = "x".repeat(1000)  // 1KB string

        val startTime = System.nanoTime()

        repeat(iterations) {
            nativeStringEcho(testString)  // Round-trip through JNI
        }

        val duration = System.nanoTime() - startTime
        return duration / iterations / 1000  // μs per call
    }

    fun measureIntArrayConversion(size: Int = 1000): Long {
        val array = IntArray(size) { it }

        val startTime = System.nanoTime()

        nativeIntArraySum(array)

        val duration = System.nanoTime() - startTime
        return duration / 1000  // μs
    }

    fun measureStructConversion(iterations: Int = 1000): Long {
        val profile = Profile(
            id = 1,
            name = "TestUser",
            pin = "1234"
        )

        val startTime = System.nanoTime()

        repeat(iterations) {
            nativeProfileEcho(profile)
        }

        val duration = System.nanoTime() - startTime
        return duration / iterations / 1000  // μs per call
    }

    // Native methods (implemented in Rust via UniFFI)
    private external fun nativeStringEcho(input: String): String
    private external fun nativeIntArraySum(array: IntArray): Int
    private external fun nativeProfileEcho(profile: Profile): Profile
}
```

**Method 2: Android Profiler Trace**

```kotlin
@Test
fun measureJNIOverheadWithTrace() {
    Debug.startMethodTracing("jni_trace")

    val manager = ProfileManager()

    // Warm-up
    repeat(100) {
        manager.getProfile(1)
    }

    // Measured run
    repeat(1000) {
        manager.getProfile(1)
    }

    Debug.stopMethodTracing()

    // Analyze jni_trace file:
    // adb pull /sdcard/Android/data/com.nuvio.app/files/jni_trace
    // dmtracedump -g jni_trace.png jni_trace
}
```

### JNI Conversion Test Cases

**Test 1: String Conversion Overhead**
```kotlin
@Test
fun testStringConversionOverhead() {
    val smallString = "Hello"  // 5 bytes
    val mediumString = "x".repeat(1000)  // 1KB
    val largeString = "x".repeat(100000)  // 100KB

    val smallTime = measureStringConversion(smallString)
    val mediumTime = measureStringConversion(mediumString)
    val largeTime = measureStringConversion(largeString)

    println("Small string (5B): ${smallTime}μs")
    println("Medium string (1KB): ${mediumTime}μs")
    println("Large string (100KB): ${largeTime}μs")

    // Verify linear scaling (not worse than O(n))
    assertTrue(largeTime < mediumTime * 200)  // Allow some overhead
}

private fun measureStringConversion(str: String): Long {
    val iterations = 1000
    val startTime = System.nanoTime()

    repeat(iterations) {
        JNIBenchmark.nativeStringEcho(str)
    }

    return (System.nanoTime() - startTime) / iterations / 1000
}
```

**Test 2: Array Conversion Overhead**
```kotlin
@Test
fun testArrayConversionOverhead() {
    val sizes = listOf(10, 100, 1000, 10000)

    sizes.forEach { size ->
        val array = IntArray(size) { it }

        val startTime = System.nanoTime()
        JNIBenchmark.nativeIntArraySum(array)
        val duration = (System.nanoTime() - startTime) / 1000

        val perItemCost = duration / size

        println("Array size $size: ${duration}μs total, ${perItemCost}μs per item")

        // Verify <5μs per item
        assertTrue(perItemCost < 5, "Per-item conversion too expensive: ${perItemCost}μs")
    }
}
```

**Test 3: Struct Conversion Overhead**
```kotlin
@Test
fun testStructConversionOverhead() {
    val profile = Profile(
        id = 1,
        name = "TestUser",
        pin = "1234"
    )

    val iterations = 1000
    val startTime = System.nanoTime()

    repeat(iterations) {
        JNIBenchmark.nativeProfileEcho(profile)
    }

    val averageTime = (System.nanoTime() - startTime) / iterations / 1000

    println("Struct conversion: ${averageTime}μs per call")

    // Verify <100μs (includes JNI + struct marshalling)
    assertTrue(averageTime < 100, "Struct conversion too slow: ${averageTime}μs")
}
```

**Test 4: Collection Conversion Overhead**
```kotlin
@Test
fun testCollectionConversionOverhead() {
    val profiles = (1..100).map { id ->
        Profile(id = id, name = "User$id", pin = "1234")
    }

    val startTime = System.nanoTime()
    JNIBenchmark.nativeProfileListEcho(profiles)
    val duration = (System.nanoTime() - startTime) / 1000

    val perItemCost = duration / profiles.size

    println("Collection (100 items): ${duration}μs total, ${perItemCost}μs per item")

    // Verify reasonable per-item cost
    assertTrue(perItemCost < 10, "Per-item collection conversion too expensive: ${perItemCost}μs")
}
```

### JNI Overhead Mitigation Strategies

**Strategy 1: Batching**
```rust
// Instead of:
for id in ids {
    get_profile(id);  // N JNI calls
}

// Use:
get_profiles_batch(ids);  // 1 JNI call
```

**Strategy 2: Caching**
```kotlin
class ProfileManager {
    private val cache = LruCache<Int, Profile>(100)

    fun getProfile(id: Int): Profile {
        cache.get(id)?.let { return it }

        val profile = nativeGetProfile(id)  // JNI call only on miss
        cache.put(id, profile)
        return profile
    }
}
```

**Strategy 3: Coarse-Grained APIs**
```rust
// Instead of:
struct Profile { id, name, pin }
get_profile_id() -> u32
get_profile_name() -> String
get_profile_pin() -> String

// Use:
struct Profile { id, name, pin }
get_profile() -> Profile  // Single call returns all fields
```

---

## Integration Testing Strategy

### Test Architecture

```
┌─────────────────────────────────────────────────────────┐
│               Integration Test Harness                  │
│  (Kotlin/Swift test suite calling FFI functions)        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Generated FFI Bindings (UniFFI)            │
│  (Kotlin/Swift → C ABI boundary)                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│             Rust SDK Core (nuvio-core)                  │
│  (Business logic with mocked external dependencies)     │
└─────────────────────────────────────────────────────────┘
```

### Integration Test Categories

#### 1. Lifecycle Tests

**Test: Create, Read, Update, Delete (CRUD)**
```kotlin
@Test
fun testProfileCRUD() {
    val manager = ProfileManager()

    // Create
    val profile = manager.createProfile("Alice", "1234")
    assertEquals("Alice", profile.name)

    // Read
    val retrieved = manager.getProfile(profile.id)
    assertEquals(profile.id, retrieved.id)

    // Update
    manager.updateProfile(profile.id, name = "Alicia")
    val updated = manager.getProfile(profile.id)
    assertEquals("Alicia", updated.name)

    // Delete
    manager.deleteProfile(profile.id)
    assertThrows<NuvioException.NotFoundException> {
        manager.getProfile(profile.id)
    }
}
```

#### 2. Concurrency Tests

**Test: Concurrent Profile Creation**
```kotlin
@Test
fun testConcurrentProfileCreation() = runBlocking {
    val manager = ProfileManager()

    val jobs = (1..10).map { index ->
        async(Dispatchers.Default) {
            manager.createProfile("User$index", "1234")
        }
    }

    val profiles = jobs.awaitAll()

    // Verify all profiles created
    assertEquals(10, profiles.size)
    assertEquals(10, profiles.map { it.id }.distinct().size)  // Unique IDs
}
```

**Test: Concurrent Read/Write**
```swift
func testConcurrentReadWrite() async throws {
    let manager = ProfileManager()
    let profile = try manager.createProfile(name: "Test", pin: "1234")

    // Launch concurrent operations
    async let read1 = Task { try manager.getProfile(id: profile.id) }
    async let read2 = Task { try manager.getProfile(id: profile.id) }
    async let write = Task { try manager.updateProfile(id: profile.id, name: "Updated") }

    let (r1, r2, _) = try await (read1.value, read2.value, write.value)

    // Verify no data corruption
    XCTAssertEqual(r1.id, profile.id)
    XCTAssertEqual(r2.id, profile.id)
}
```

#### 3. Long-Running Operation Tests

**Test: Catalog Loading**
```kotlin
@Test(timeout = 10000)  // 10 second timeout
fun testCatalogLoadingLongRunning() {
    val manager = CatalogManager()

    val catalog = manager.loadCatalog("movies")

    assertNotNull(catalog)
    assertTrue(catalog.items.isNotEmpty())
}
```

#### 4. Resource Exhaustion Tests

**Test: Many Profile Creations**
```kotlin
@Test
fun testManyProfileCreations() {
    val manager = ProfileManager()
    val profileCount = 1000

    val profiles = (1..profileCount).map { index ->
        manager.createProfile("User$index", "1234")
    }

    // Verify all created
    assertEquals(profileCount, profiles.size)

    // Verify memory not leaked (check heap size)
    val heapSizeBefore = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()
    Runtime.getRuntime().gc()
    val heapSizeAfter = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()

    // Heap should not grow significantly
    val growthMB = (heapSizeAfter - heapSizeBefore) / (1024 * 1024)
    assertTrue(growthMB < 50, "Heap grew by ${growthMB}MB")
}
```

#### 5. Error Recovery Tests

**Test: Network Failure Recovery**
```swift
func testNetworkFailureRecovery() async throws {
    let manager = StreamManager()

    // First attempt fails (simulated network error)
    do {
        _ = try await manager.resolveStream(id: "movie:123")
        XCTFail("Expected network error")
    } catch NuvioError.networkError {
        // Expected
    }

    // Second attempt succeeds (network recovered)
    let stream = try await manager.resolveStream(id: "movie:123")
    XCTAssertNotNil(stream)
}
```

---

## Test Automation & CI/CD

### CI/CD Pipeline Structure

```yaml
# .github/workflows/ffi-tests.yml
name: FFI Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # Stage 1: Rust Unit Tests
  rust-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run Rust tests
        run: |
          cd rust-sdk
          cargo test --all-features

  # Stage 2: Memory Leak Detection
  memory-tests:
    needs: rust-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Valgrind
        run: |
          sudo apt-get install -y valgrind
          cd rust-sdk
          valgrind --leak-check=full --error-exitcode=1 cargo test
      - name: Run AddressSanitizer
        run: |
          export RUSTFLAGS="-Z sanitizer=address"
          cd rust-sdk
          cargo +nightly test -Z build-std

  # Stage 3: Performance Benchmarks
  benchmarks:
    needs: rust-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run benchmarks
        run: |
          cd rust-sdk
          cargo bench -- --save-baseline pr-${{ github.event.number }}
      - name: Compare with main
        run: |
          cargo bench -- --baseline main

  # Stage 4: Android Integration Tests
  android-tests:
    needs: rust-tests
    runs-on: macos-latest  # macOS for hardware acceleration
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Build Rust library for Android
        run: |
          rustup target add aarch64-linux-android
          cd rust-sdk
          cargo ndk -t arm64-v8a build --release
      - name: Run Android instrumented tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          arch: x86_64
          script: ./gradlew connectedDebugAndroidTest
      - name: Check LeakCanary results
        run: python scripts/check_leakcanary_results.py

  # Stage 5: iOS Integration Tests
  ios-tests:
    needs: rust-tests
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Rust library for iOS
        run: |
          rustup target add aarch64-apple-ios
          cd rust-sdk
          cargo build --release --target aarch64-apple-ios
      - name: Run iOS tests
        run: |
          xcodebuild test \
            -scheme NuvioTV \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            -enableAddressSanitizer YES
      - name: Parse Instruments results
        run: python scripts/parse_instruments_results.py

  # Stage 6: Report Results
  report:
    needs: [memory-tests, benchmarks, android-tests, ios-tests]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Generate test report
        run: |
          python scripts/generate_test_report.py \
            --memory-results ${{ needs.memory-tests.outputs.results }} \
            --benchmark-results ${{ needs.benchmarks.outputs.results }} \
            --android-results ${{ needs.android-tests.outputs.results }} \
            --ios-results ${{ needs.ios-tests.outputs.results }}
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('test-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.name,
              body: report
            });
```

### Pre-Commit Hooks

**`.git/hooks/pre-commit`:**
```bash
#!/bin/bash
set -e

echo "Running FFI pre-commit checks..."

# 1. Rust formatting
cd rust-sdk
cargo fmt --check || {
    echo "Error: Rust code not formatted. Run 'cargo fmt'"
    exit 1
}

# 2. Clippy lints
cargo clippy -- -D warnings || {
    echo "Error: Clippy found issues"
    exit 1
}

# 3. Fast unit tests
cargo test --lib || {
    echo "Error: Unit tests failed"
    exit 1
}

# 4. Check for unwrap() in FFI code
if grep -r "\.unwrap()" src/ --include="*.rs" | grep -v "test"; then
    echo "Error: Found .unwrap() in production code"
    exit 1
fi

# 5. Check for panic! in FFI code
if grep -r "panic!" src/ --include="*.rs" | grep -v "test"; then
    echo "Error: Found panic! in production code"
    exit 1
fi

echo "✓ All pre-commit checks passed"
```

---

## Platform-Specific Testing

### Android-Specific Tests

**Test: Multi-ABI Support**
```kotlin
@Test
fun testMultiABISupport() {
    val supportedABIs = Build.SUPPORTED_ABIS
    println("Device ABIs: ${supportedABIs.joinToString()}")

    // Verify Rust library loaded correctly for this ABI
    val manager = ProfileManager()
    val profile = manager.createProfile("Test", "1234")
    assertNotNull(profile)
}
```

**Test: Android TV Focus**
```kotlin
@Test
fun testAndroidTVFocus() {
    // Only run on TV devices
    assumeTrue(Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1)
    assumeTrue(
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
    )

    val focusManager = FocusManager()
    focusManager.moveFocus(Direction.DOWN)

    // Verify focus state stored correctly in Rust SDK
    val focusState = focusManager.getCurrentFocus()
    assertNotNull(focusState)
}
```

### iOS-Specific Tests

**Test: tvOS Focus Engine**
```swift
func testTVOSFocusEngine() {
    #if os(tvOS)
    let focusManager = FocusManager()
    focusManager.moveFocus(direction: .down)

    let focusState = focusManager.getCurrentFocus()
    XCTAssertNotNil(focusState)
    #endif
}
```

**Test: App Store Compliance**
```swift
func testNoPrivateAPIs() {
    // Verify Rust SDK doesn't use private iOS APIs
    let symbols = try! dlsym(RTLD_DEFAULT, "_private_api")
    XCTAssertNil(symbols, "Rust library should not use private APIs")
}
```

---

## Test Coverage Requirements

### Coverage Targets

| Component | Line Coverage | Branch Coverage | Function Coverage |
|-----------|--------------|-----------------|-------------------|
| **Rust FFI Layer** | >90% | >85% | 100% |
| **Rust Business Logic** | >80% | >75% | >90% |
| **Kotlin Bindings** | >75% | >70% | >85% |
| **Swift Bindings** | >75% | >70% | >85% |
| **Integration Tests** | N/A | N/A | 100% of FFI functions |

### Coverage Measurement

**Rust Coverage:**
```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cd rust-sdk
cargo tarpaulin --out Html --output-dir target/coverage

# View report
open target/coverage/index.html
```

**Android Coverage:**
```kotlin
// build.gradle.kts
android {
    buildTypes {
        debug {
            enableUnitTestCoverage = true
            enableAndroidTestCoverage = true
        }
    }
}

// Run tests with coverage
./gradlew createDebugCoverageReport

// View report: build/reports/coverage/debug/index.html
```

**iOS Coverage:**
```bash
# Enable code coverage in Xcode scheme
# Product → Scheme → Edit Scheme → Test → Options → Code Coverage

# Run tests
xcodebuild test -scheme NuvioTV -enableCodeCoverage YES

# View report in Xcode
# Show Report Navigator → Coverage
```

---

## References

### Documentation

- [UniFFI Documentation](https://mozilla.github.io/uniffi-rs/)
- [FFI Boundary Design](./ffi-boundary-design.md)
- [ADR-002: FFI Binding Strategy](./adr/002-ffi-binding-strategy.md)
- [Build Toolchain Requirements](./build-toolchain-requirements.md)
- [Risk Assessment](./risk-assessment.md)

### Tools

- [Valgrind](https://valgrind.org/)
- [AddressSanitizer](https://github.com/google/sanitizers/wiki/AddressSanitizer)
- [LeakCanary](https://square.github.io/leakcanary/)
- [Instruments](https://developer.apple.com/xcode/features/)
- [Criterion.rs](https://github.com/bheisler/criterion.rs)
- [Android Profiler](https://developer.android.com/studio/profile/android-profiler)

### External Resources

- [Rust FFI Best Practices](https://doc.rust-lang.org/nomicon/ffi.html)
- [JNI Performance Tips](https://developer.android.com/training/articles/perf-jni)
- [Swift/C Interop Guide](https://developer.apple.com/documentation/swift/imported_c_and_objective-c_apis)

---

**Document Status:** Complete
**Next Review:** After Phase 1 implementation
**Maintained By:** Architecture Team
