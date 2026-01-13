# ADR-002: FFI Binding Strategy for Rust-Native Interop

**Status:** Accepted
**Date:** 2026-01-13
**Decision Makers:** Architecture Team
**Technical Story:** [FFI Binding Strategy for Tri-Layer Architecture]

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

### FFI Boundary Requirements

The tri-layer architecture (ADR-001) requires a robust Foreign Function Interface (FFI) layer to enable communication between the Rust SDK core and native Kotlin (Android) and Swift (iOS/tvOS) platform layers. This FFI boundary must handle:

#### Critical FFI Technical Constraints

Based on Rust's technical limitations and platform requirements:

1. **Rust ABI Instability:** Rust does not have a stable ABI; all FFI functions MUST use `extern "C"` with the C ABI
2. **Panic Safety:** Rust `panic!` across FFI boundaries causes undefined behavior; all FFI functions MUST use `catch_unwind`
3. **Memory Ownership:** Memory allocated by Rust MUST be freed by Rust; requires explicit free functions for Kotlin/Swift
4. **Android Two-Layer Binding:** Android requires Rust → C ABI → JNI → Kotlin (two-layer binding with conversion overhead)
5. **JNI Marshalling Overhead:** Data marshalling at the JNI boundary has performance cost (~50-100μs per call)
6. **String Memory Management:** Strings across FFI require explicit `CString::into_raw()` and corresponding free functions
7. **iOS Single-Layer Advantage:** iOS uses direct Rust → C → Swift binding (single layer, ~20-50μs per call)

#### Functional Requirements

The FFI layer must support:

1. **Type Conversion:** Bidirectional mapping between Rust types and Kotlin/Swift types
   - Primitive types: integers, floats, booleans
   - Complex types: structs, enums, collections
   - Optional types: Rust `Option<T>` → Kotlin nullable / Swift optionals

2. **Memory Management:** Safe memory ownership transfer across language boundaries
   - Opaque pointers for Rust objects
   - Explicit allocation and deallocation functions
   - Prevention of double-free, use-after-free, and memory leaks

3. **Error Handling:** Translation of Rust errors to native exceptions
   - Rust `Result<T, E>` → Kotlin exceptions / Swift `throws`
   - Error code enums for structured error handling
   - Panic handling with `catch_unwind` to prevent undefined behavior

4. **Async Operations:** Bridge between async runtimes
   - Rust async/await → Kotlin coroutines (suspend functions)
   - Rust async/await → Swift async/await
   - Callback-based async for platforms without native async support

5. **Collections:** Efficient handling of arrays, lists, and maps
   - Zero-copy optimizations where possible
   - Proper memory management for dynamically-sized collections

### Scale and Complexity

**API Surface:**
- **~150 FFI-exposed functions** across 12 core modules (account, profile, catalog, library, metadata, stream, download, settings, theme, performance, focus, watch)
- **~50 data types** (structs, enums) crossing FFI boundary
- **~30 error types** requiring translation

**Performance Requirements:**
- **<1ms FFI call overhead** (excluding business logic execution)
- **<5% memory overhead** for FFI layer structures
- **Batching support** for operations requiring multiple FFI calls

**Platforms:**
- **Android:** Kotlin with JNI (two-layer binding)
- **iOS:** Swift with C bridging header (single-layer binding)
- **tvOS:** Swift with C bridging header (single-layer binding)

### Development Constraints

1. **Team Expertise:** Team has limited experience with low-level FFI; automated tooling preferred over manual binding code
2. **Maintenance Burden:** Manual FFI code is error-prone and difficult to maintain; automation critical for long-term sustainability
3. **Type Safety:** Need compile-time guarantees across language boundaries to prevent runtime errors
4. **Build Complexity:** Must integrate with existing build systems (Gradle for Android, Xcode for iOS/tvOS, Cargo for Rust)

---

## Decision

We will use **UniFFI as the primary FFI binding generator** for automated generation of Kotlin and Swift bindings from Rust code, with **cbindgen as a fallback** for edge cases where UniFFI is insufficient or introduces unacceptable overhead.

### Primary Approach: UniFFI

**UniFFI (Unified Foreign Function Interface)** is Mozilla's open-source tool for generating foreign language bindings (Kotlin, Swift, Python) from Rust code. It automates the generation of FFI layer code, reducing boilerplate and preventing common FFI bugs.

#### Why UniFFI?

1. **Production-Proven:** Battle-tested by Mozilla in Firefox iOS, Firefox Android, and Firefox Focus
2. **Automated Binding Generation:** Generates both Kotlin and Swift bindings from single `.udl` interface definition
3. **Memory Safety:** Automates correct memory management patterns (`Box::into_raw()`, `Box::from_raw()`)
4. **Type System Integration:** Maps Rust types to idiomatic Kotlin/Swift types
5. **Async Support:** Built-in bridging for Rust async/await → Kotlin coroutines / Swift async/await
6. **Error Handling:** Automatic translation of Rust `Result<T, E>` to platform exceptions
7. **Active Development:** Well-maintained by Mozilla with comprehensive documentation

#### UniFFI Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Define Interface in .udl (UniFFI Definition Language)    │
│    - Specify types, functions, errors, callbacks            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Implement Rust API Matching .udl Definition              │
│    - Business logic in Rust modules                         │
│    - Annotate with #[uniffi::export] attributes            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Run uniffi_bindgen Code Generator                        │
│    - uniffi-bindgen generate nuvio.udl --language kotlin    │
│    - uniffi-bindgen generate nuvio.udl --language swift     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ├────────────────────┬────────────────┐
                         ▼                    ▼                ▼
         ┌───────────────────┐  ┌────────────────────┐  ┌───────────────┐
         │ nuvio.kt          │  │ nuvio.swift        │  │ nuvio_ffi.rs  │
         │ (Kotlin bindings) │  │ (Swift bindings)   │  │ (FFI layer)   │
         └───────────────────┘  └────────────────────┘  └───────────────┘
```

#### Toolchain Components

1. **uniffi_bindgen CLI:** Rust binary for generating bindings
   - Installation: `cargo install uniffi_bindgen`
   - Version: 0.25.0+ (latest stable)

2. **uniffi Rust Crate:** Runtime support library
   - Add to `Cargo.toml`: `uniffi = "0.25"`
   - Provides macros and traits for FFI

3. **Build Integration:**
   - **Android:** Gradle task to invoke `uniffi-bindgen` during build
   - **iOS:** Xcode build phase script to generate Swift bindings
   - **CI/CD:** Automated binding generation in GitHub Actions

### Fallback Approach: cbindgen

**cbindgen** is a tool that generates C header files from Rust code. It's used as a fallback for scenarios where UniFFI is insufficient.

#### When to Use cbindgen

Use cbindgen ONLY when:
1. **Performance-Critical Code:** UniFFI overhead is unacceptable (measured, not assumed)
2. **C++ Interop:** Need to integrate with existing C++ libraries
3. **Low-Level Control:** Require fine-grained control over FFI boundary
4. **UniFFI Limitations:** Complex FFI patterns not supported by UniFFI

#### cbindgen Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Annotate Rust Code with #[repr(C)] and #[no_mangle]     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Run cbindgen to Generate C Header                        │
│    - cbindgen --config cbindgen.toml --output nuvio.h      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Manually Write Kotlin JNI Wrapper / Swift C Bridge      │
│    - Kotlin: JNI function declarations + JNI wrapper code   │
│    - Swift: Import C header in bridging header             │
└─────────────────────────────────────────────────────────────┘
```

**Note:** cbindgen requires significant manual work for Kotlin JNI wrappers and error handling. Use only when absolutely necessary.

### Memory Management Strategy

All FFI operations follow these memory management rules:

#### Rule 1: Rust Owns Rust Memory

- Memory allocated by Rust (e.g., `Box::new()`, `Vec::new()`) MUST be freed by Rust
- Kotlin/Swift receives **opaque pointers** to Rust objects
- Kotlin/Swift calls Rust **free functions** to deallocate memory

**Example (UniFFI):**
```rust
// UniFFI automatically generates this pattern
#[uniffi::export]
fn profile_create(name: String, pin: Option<String>) -> Arc<Profile> {
    Arc::new(Profile::new(name, pin))
}

// Kotlin side (generated by UniFFI)
// val profile = profileCreate("John", "1234")
// profile is automatically freed when Kotlin object is garbage collected
```

#### Rule 2: Strings are Owned by Rust

- Rust allocates strings with `CString::into_raw()`
- Kotlin/Swift receives `*const c_char` pointer
- Kotlin/Swift must NOT free string memory (Rust handles it)

**Example (Manual C FFI with cbindgen):**
```rust
use std::ffi::CString;
use std::os::raw::c_char;

#[no_mangle]
pub extern "C" fn nuvio_get_profile_name(profile_ptr: *const Profile) -> *const c_char {
    let profile = unsafe { &*profile_ptr };
    let name = CString::new(profile.name.clone()).unwrap();
    name.into_raw() // Ownership transferred to FFI
}

#[no_mangle]
pub extern "C" fn nuvio_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe { CString::from_raw(ptr) }; // Deallocates string
    }
}
```

#### Rule 3: Collections Require Length + Pointer

- `Vec<T>` passed as `*const T` + `usize` length
- Kotlin/Swift iterates with length, does NOT assume null termination
- Rust provides free function to deallocate Vec

**Example (Manual C FFI with cbindgen):**
```rust
#[repr(C)]
pub struct FFIProfileList {
    pub profiles: *const FFIProfile,
    pub len: usize,
}

#[no_mangle]
pub extern "C" fn nuvio_get_profiles(out_list: *mut FFIProfileList) {
    let profiles = get_profiles_internal();
    let ffi_profiles = profiles.into_iter()
        .map(|p| p.to_ffi())
        .collect::<Vec<_>>();

    let boxed = Box::new(ffi_profiles);
    unsafe {
        (*out_list).profiles = boxed.as_ptr();
        (*out_list).len = boxed.len();
        std::mem::forget(boxed); // Prevent deallocation
    }
}

#[no_mangle]
pub extern "C" fn nuvio_free_profile_list(list: FFIProfileList) {
    if !list.profiles.is_null() {
        unsafe {
            Vec::from_raw_parts(list.profiles as *mut FFIProfile, list.len, list.len);
        } // Automatically deallocates
    }
}
```

**Note:** UniFFI automates this pattern, generating correct allocation and deallocation code.

### Panic Handling Strategy

**Critical Rule:** Panics must NEVER propagate across FFI boundaries (causes undefined behavior).

#### Panic Catching with catch_unwind

All FFI entry points use `std::panic::catch_unwind` to convert panics to FFI-safe errors:

**Example (Manual C FFI):**
```rust
use std::panic::catch_unwind;

#[no_mangle]
pub extern "C" fn nuvio_profile_create(
    name: *const c_char,
    pin: *const c_char,
    out_error: *mut *mut FFIError,
) -> *mut Profile {
    let result = catch_unwind(|| {
        // FFI implementation that may panic
        let name = unsafe { CStr::from_ptr(name).to_str().unwrap() };
        let profile = create_profile_internal(name);
        Box::into_raw(Box::new(profile))
    });

    match result {
        Ok(profile_ptr) => profile_ptr,
        Err(panic) => {
            // Convert panic to FFI error
            let error_msg = if let Some(s) = panic.downcast_ref::<String>() {
                s.clone()
            } else if let Some(s) = panic.downcast_ref::<&str>() {
                s.to_string()
            } else {
                "Unknown panic".to_string()
            };

            unsafe {
                *out_error = FFIError::new(ErrorCode::InternalError, error_msg);
            }
            std::ptr::null_mut()
        }
    }
}
```

**UniFFI Advantage:** UniFFI automatically wraps all functions with `catch_unwind`, eliminating manual boilerplate.

### Error Handling Strategy

Errors are translated from Rust `Result<T, E>` to platform-native exceptions:

#### Error Translation

**Rust Side:**
```rust
#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum NuvioError {
    #[error("Profile not found: {0}")]
    ProfileNotFound(String),

    #[error("Invalid PIN")]
    InvalidPin,

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Storage error: {0}")]
    StorageError(String),
}

#[uniffi::export]
fn profile_get(id: String) -> Result<Profile, NuvioError> {
    profiles_db.get(&id)
        .ok_or_else(|| NuvioError::ProfileNotFound(id))
}
```

**Kotlin Side (Generated by UniFFI):**
```kotlin
// UniFFI generates Kotlin exception classes
sealed class NuvioException(message: String): Exception(message) {
    class ProfileNotFound(message: String): NuvioException(message)
    class InvalidPin: NuvioException("Invalid PIN")
    class NetworkError(message: String): NuvioException(message)
    class StorageError(message: String): NuvioException(message)
}

// Usage in Kotlin
try {
    val profile = profileGet(profileId)
} catch (e: NuvioException.ProfileNotFound) {
    // Handle profile not found
} catch (e: NuvioException.NetworkError) {
    // Handle network error
}
```

**Swift Side (Generated by UniFFI):**
```swift
// UniFFI generates Swift error enum
public enum NuvioError: Error {
    case profileNotFound(String)
    case invalidPin
    case networkError(String)
    case storageError(String)
}

// Usage in Swift
do {
    let profile = try profileGet(id: profileId)
} catch NuvioError.profileNotFound(let id) {
    // Handle profile not found
} catch NuvioError.networkError(let msg) {
    // Handle network error
}
```

### Async Operations Strategy

UniFFI provides built-in support for bridging Rust async/await to platform-native async patterns.

#### Rust Async Function

```rust
#[uniffi::export]
async fn catalog_load(catalog_type: CatalogType) -> Result<Vec<CatalogItem>, NuvioError> {
    let addons = addon_manager::get_all_addons().await?;
    let items = fetch_catalog_from_addons(addons, catalog_type).await?;
    Ok(items)
}
```

#### Kotlin Side (Suspend Function)

```kotlin
// UniFFI generates Kotlin suspend function
suspend fun catalogLoad(catalogType: CatalogType): List<CatalogItem>

// Usage with Kotlin Coroutines
viewModelScope.launch {
    try {
        val items = catalogLoad(CatalogType.MOVIES)
        _catalogState.value = CatalogState.Success(items)
    } catch (e: NuvioException) {
        _catalogState.value = CatalogState.Error(e.message)
    }
}
```

#### Swift Side (Async/Await)

```swift
// UniFFI generates Swift async function
func catalogLoad(catalogType: CatalogType) async throws -> [CatalogItem]

// Usage with Swift Concurrency
Task {
    do {
        let items = try await catalogLoad(catalogType: .movies)
        await MainActor.run {
            self.catalogItems = items
        }
    } catch let error as NuvioError {
        // Handle error
    }
}
```

---

## Alternatives Considered

### Alternative 1: Manual C FFI with cbindgen (No UniFFI)

**Description:** Write all FFI bindings manually using cbindgen for header generation, then manually write Kotlin JNI wrappers and Swift bridging code.

**Pros:**
- Full control over FFI boundary and performance optimizations
- No dependency on UniFFI (reduces external dependencies)
- Direct mapping to C ABI (simpler mental model for some developers)
- Fine-grained control over memory layout and calling conventions

**Cons:**
- **90% more boilerplate code:** Every function requires manual FFI wrapper, error handling, and panic catching
- **Error-prone:** Easy to introduce memory leaks, double-frees, or use-after-free bugs
- **Maintenance burden:** Changes to Rust API require updating FFI wrappers AND Kotlin/Swift bindings
- **No async support:** Must manually implement callback-based async or Promise/Future bridges
- **Type safety gaps:** Manual type conversions increase risk of type mismatch bugs
- **Kotlin JNI complexity:** Two-layer binding (Rust → C → JNI → Kotlin) requires extensive boilerplate

**Why Rejected:** Maintenance burden too high. Manual FFI code is the primary source of bugs in FFI-based architectures. UniFFI automation eliminates 90% of this complexity while providing better safety guarantees.

### Alternative 2: cxx (C++ Interop Library)

**Description:** Use the `cxx` crate for bidirectional Rust ↔ C++ interop, then bridge C++ to Kotlin/Swift.

**Pros:**
- Modern approach with compile-time safety checks
- Supports bidirectional calls (Rust → C++, C++ → Rust)
- Good integration with C++ build systems (CMake, Bazel)
- Zero-cost abstractions for many operations

**Cons:**
- **Requires C++ layer:** Adds additional language to the stack (Rust + C++ + Kotlin + Swift)
- **Android complexity:** Kotlin JNI must still bridge to C++ (three-layer binding)
- **No native Kotlin/Swift support:** Must manually write JNI/Swift bridging on top of C++
- **Overhead:** Three-layer binding (Rust ↔ C++ ↔ JNI ↔ Kotlin) increases latency
- **Learning curve:** Team must learn cxx-specific patterns and macros

**Why Rejected:** Adds C++ as an intermediate layer, increasing complexity without providing benefits over UniFFI. UniFFI directly generates Kotlin/Swift bindings, eliminating the need for C++ middleware.

### Alternative 3: WASM with JavaScript Bridge

**Description:** Compile Rust to WebAssembly (WASM), run in JavaScript runtime, bridge JavaScript to native via React Native's JSI or similar.

**Pros:**
- Platform-agnostic: Same WASM binary runs on all platforms
- Mature tooling: wasm-pack, wasm-bindgen well-established
- Potential for web reuse (same WASM module in browser)

**Cons:**
- **Performance overhead:** JavaScript bridge negates Rust performance benefits
- **Memory overhead:** WASM runtime + JavaScript VM on top of native platform
- **TV platform constraints:** WASM runtime too heavy for memory-constrained TV devices
- **Loss of native integration:** Cannot directly access platform APIs (ExoPlayer, AVPlayer)
- **Async complexity:** WASM async must bridge to JavaScript Promises, then to native
- **Defeats architecture goal:** The entire point is to ELIMINATE JavaScript layer

**Why Rejected:** Fundamentally contradicts the architecture goal of removing JavaScript overhead and achieving native performance. WASM is excellent for web, but inappropriate for native mobile/TV applications.

### Alternative 4: Protocol Buffers + gRPC

**Description:** Use Protocol Buffers for serialization and gRPC for inter-process communication between Rust and native layers.

**Pros:**
- Strong schema validation and versioning
- Efficient binary serialization
- Cross-language support (Rust, Kotlin, Swift)
- Streaming support for async operations

**Cons:**
- **IPC overhead:** Requires inter-process communication (sockets, shared memory) instead of in-process FFI
- **Latency:** IPC latency (milliseconds) vs. FFI latency (microseconds)
- **Complexity:** Must manage separate processes, lifecycle, crash recovery
- **Memory overhead:** Protobuf serialization/deserialization on every call
- **Overkill:** gRPC designed for distributed systems, not in-process communication

**Why Rejected:** IPC overhead too high for in-process communication. FFI provides microsecond latency vs. milliseconds for IPC. gRPC is designed for network communication, not in-app module boundaries.

### Alternative 5: gobject-introspection

**Description:** Use GObject Introspection (GIR) to generate language bindings from GObject-based Rust API.

**Pros:**
- Mature tooling used by GNOME ecosystem
- Supports many languages (Python, JavaScript, Lua, etc.)
- Well-documented binding generation

**Cons:**
- **GObject requirement:** Rust code must use GObject type system (heavy runtime overhead)
- **Limited Kotlin/Swift support:** GIR primarily targets GTK-based languages
- **GNOME-centric:** Designed for Linux desktop applications, not mobile/TV
- **Memory model mismatch:** GObject reference counting conflicts with Rust ownership
- **Poor mobile support:** Not designed for iOS/Android platforms

**Why Rejected:** GObject type system adds significant overhead and is not designed for mobile/TV platforms. UniFFI is purpose-built for Rust → mobile FFI.

---

## Consequences

### Positive Consequences

#### Developer Productivity

1. **90% Reduction in Boilerplate:** UniFFI automates FFI wrapper generation, memory management, error translation
2. **Type Safety Across Boundaries:** Compile-time guarantees prevent type mismatch bugs at FFI boundary
3. **Single Source of Truth:** `.udl` file defines FFI contract; bindings generated automatically
4. **Faster Iteration:** Changes to Rust API reflected in Kotlin/Swift bindings via re-generation (no manual updates)
5. **Reduced Onboarding Time:** New developers work with generated idiomatic Kotlin/Swift, not low-level FFI

#### Safety and Reliability

1. **Memory Safety:** UniFFI automates correct `Box::into_raw()` / `Box::from_raw()` patterns
2. **Panic Safety:** Automatic `catch_unwind` wrapping prevents undefined behavior
3. **Error Handling:** Automatic translation of Rust `Result` to platform exceptions
4. **Fewer Bugs:** Eliminates manual FFI code (primary source of FFI bugs)

#### Maintainability

1. **Centralized Interface Definition:** `.udl` file is single source of truth for FFI contract
2. **Versioning Support:** UniFFI supports schema evolution and backward compatibility
3. **Refactoring Safety:** Changes to Rust types automatically reflected in generated bindings
4. **Testing:** Generated bindings are testable; UniFFI provides test helpers

#### Performance

1. **Optimized Code Generation:** UniFFI generates efficient FFI code (comparable to manual FFI)
2. **Zero-Copy Optimizations:** UniFFI supports zero-copy patterns where possible
3. **Async Integration:** Native async/await bridges eliminate callback boilerplate and reduce latency

### Negative Consequences

#### Dependency and Learning Curve

1. **UniFFI Dependency:** External dependency on Mozilla project (mitigated by active maintenance and open-source nature)
2. **Learning `.udl` Syntax:** Team must learn UniFFI Definition Language (mitigated by comprehensive documentation)
3. **Build Complexity:** Additional build step to generate bindings (mitigated by build system integration)

#### Flexibility Constraints

1. **UniFFI Limitations:** Some advanced FFI patterns not supported by UniFFI (mitigated by cbindgen fallback)
2. **Generated Code Size:** Generated bindings add ~50-100KB per platform (acceptable tradeoff for safety)
3. **Debugging Difficulty:** Generated code can be harder to debug than manual FFI (mitigated by UniFFI logging and clear error messages)

#### Android-Specific Overhead

1. **JNI Layer:** Android still requires two-layer binding (Rust → C → JNI → Kotlin) with ~50-100μs overhead per call
2. **JNI Memory Copies:** Data marshalling at JNI boundary requires memory copies (mitigated by batching and coarse-grained APIs)

### Risk Mitigation Strategies

1. **UniFFI Version Pinning:** Pin to stable UniFFI version (0.25.x); test upgrades in staging
2. **Fallback to cbindgen:** Maintain cbindgen capability for edge cases where UniFFI insufficient
3. **FFI Testing Strategy:** Comprehensive FFI testing (memory leaks, error handling, panic safety) - see `ffi-testing-strategy.md`
4. **Performance Monitoring:** Instrument FFI boundary to measure call overhead and identify bottlenecks
5. **Documentation:** Comprehensive developer guide for working with UniFFI and `.udl` files

---

## Implementation Guide

### Step 1: Install UniFFI Toolchain

#### Rust Dependencies

Add to `rust-sdk/Cargo.toml`:

```toml
[dependencies]
uniffi = "0.25"
thiserror = "1.0"  # For #[uniffi::Error]

[build-dependencies]
uniffi = { version = "0.25", features = ["build"] }
```

#### CLI Installation

```bash
# Install uniffi_bindgen CLI
cargo install uniffi_bindgen --version 0.25.0

# Verify installation
uniffi-bindgen --version
```

### Step 2: Define FFI Interface in .udl

Create `rust-sdk/src/nuvio.udl`:

```udl
namespace nuvio {
  // Initialization
  void initialize(string storage_path);
};

// Error types
[Error]
enum NuvioError {
  "ProfileNotFound",
  "InvalidPin",
  "NetworkError",
  "StorageError",
};

// Profile types
dictionary Profile {
  string id;
  string name;
  u8 avatar_index;
  i64 created_at;
  boolean is_locked;
};

// Profile interface
interface ProfileManager {
  constructor();

  [Throws=NuvioError]
  Profile create_profile(string name, string? pin);

  [Throws=NuvioError]
  Profile get_profile(string id);

  [Throws=NuvioError]
  sequence<Profile> list_profiles();

  [Throws=NuvioError]
  void delete_profile(string id);

  [Throws=NuvioError]
  boolean verify_pin(string id, string pin);
};

// Async example
interface CatalogManager {
  constructor();

  [Throws=NuvioError]
  sequence<CatalogItem> load_catalog_sync(CatalogType catalog_type);

  // Async function (generates suspend fun in Kotlin, async func in Swift)
  [Async, Throws=NuvioError]
  sequence<CatalogItem> load_catalog(CatalogType catalog_type);
};

enum CatalogType {
  "Movies",
  "Series",
  "Anime",
};

dictionary CatalogItem {
  string id;
  string name;
  string poster_url;
  f32 rating;
};
```

### Step 3: Implement Rust API

Create `rust-sdk/src/profile.rs`:

```rust
use std::sync::Arc;
use thiserror::Error;

#[derive(Debug, Error, uniffi::Error)]
pub enum NuvioError {
    #[error("Profile not found: {0}")]
    ProfileNotFound(String),

    #[error("Invalid PIN")]
    InvalidPin,

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Storage error: {0}")]
    StorageError(String),
}

#[derive(uniffi::Record)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub avatar_index: u8,
    pub created_at: i64,
    pub is_locked: bool,
}

#[derive(uniffi::Object)]
pub struct ProfileManager {
    // Internal state
}

#[uniffi::export]
impl ProfileManager {
    #[uniffi::constructor]
    pub fn new() -> Arc<Self> {
        Arc::new(ProfileManager { /* ... */ })
    }

    pub fn create_profile(&self, name: String, pin: Option<String>) -> Result<Profile, NuvioError> {
        // Implementation
        Ok(Profile {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            avatar_index: 0,
            created_at: chrono::Utc::now().timestamp(),
            is_locked: pin.is_some(),
        })
    }

    pub fn get_profile(&self, id: String) -> Result<Profile, NuvioError> {
        // Implementation
        Err(NuvioError::ProfileNotFound(id))
    }

    pub fn list_profiles(&self) -> Result<Vec<Profile>, NuvioError> {
        // Implementation
        Ok(vec![])
    }

    pub fn delete_profile(&self, id: String) -> Result<(), NuvioError> {
        // Implementation
        Ok(())
    }

    pub fn verify_pin(&self, id: String, pin: String) -> Result<bool, NuvioError> {
        // Implementation
        Ok(true)
    }
}

// Module initialization
#[uniffi::export]
pub fn initialize(storage_path: String) {
    // Initialize storage, logging, etc.
}

// Include generated FFI code
uniffi::include_scaffolding!("nuvio");
```

### Step 4: Generate Bindings

#### Build Script

Create `rust-sdk/build.rs`:

```rust
fn main() {
    uniffi::generate_scaffolding("src/nuvio.udl").unwrap();
}
```

#### Generate Kotlin Bindings

```bash
cd rust-sdk
uniffi-bindgen generate src/nuvio.udl --language kotlin --out-dir ../android/app/src/main/java/com/nuvio/generated/
```

#### Generate Swift Bindings

```bash
cd rust-sdk
uniffi-bindgen generate src/nuvio.udl --language swift --out-dir ../ios/NuvioTV/Generated/
```

### Step 5: Integrate with Native Code

#### Kotlin Usage

```kotlin
// android/app/src/main/java/com/nuvio/repository/ProfileRepository.kt
import com.nuvio.generated.ProfileManager
import com.nuvio.generated.NuvioException
import com.nuvio.generated.Profile

class ProfileRepository {
    private val profileManager = ProfileManager()

    suspend fun createProfile(name: String, pin: String?): Result<Profile> {
        return try {
            val profile = profileManager.createProfile(name, pin)
            Result.success(profile)
        } catch (e: NuvioException.ProfileNotFound) {
            Result.failure(Exception("Profile creation failed: ${e.message}"))
        } catch (e: NuvioException) {
            Result.failure(e)
        }
    }

    suspend fun getProfile(id: String): Result<Profile> {
        return try {
            val profile = profileManager.getProfile(id)
            Result.success(profile)
        } catch (e: NuvioException.ProfileNotFound) {
            Result.failure(Exception("Profile not found: $id"))
        }
    }
}
```

#### Swift Usage

```swift
// ios/NuvioTV/Repository/ProfileRepository.swift
import Foundation

class ProfileRepository {
    private let profileManager = ProfileManager()

    func createProfile(name: String, pin: String?) async throws -> Profile {
        do {
            let profile = try profileManager.createProfile(name: name, pin: pin)
            return profile
        } catch let error as NuvioError {
            throw ProfileError.creationFailed(error.localizedDescription)
        }
    }

    func getProfile(id: String) async throws -> Profile {
        do {
            let profile = try profileManager.getProfile(id: id)
            return profile
        } catch NuvioError.profileNotFound(let id) {
            throw ProfileError.notFound(id)
        } catch {
            throw ProfileError.unknown(error.localizedDescription)
        }
    }
}
```

### Step 6: Build System Integration

#### Gradle (Android)

Add to `android/app/build.gradle.kts`:

```kotlin
tasks.register<Exec>("generateUniFFIBindings") {
    workingDir = file("../../rust-sdk")
    commandLine = listOf(
        "uniffi-bindgen", "generate", "src/nuvio.udl",
        "--language", "kotlin",
        "--out-dir", "../android/app/src/main/java/com/nuvio/generated/"
    )
}

tasks.named("preBuild") {
    dependsOn("generateUniFFIBindings")
}
```

#### Xcode (iOS/tvOS)

Add build phase script:

```bash
#!/bin/bash
set -e

cd "${SRCROOT}/../../rust-sdk"
uniffi-bindgen generate src/nuvio.udl \
  --language swift \
  --out-dir "${SRCROOT}/NuvioTV/Generated/"
```

---

## References

### Internal Documentation

- [ADR-001: Tri-Layer Architecture](./001-tri-layer-architecture.md)
- [FFI Boundary Design Document](../ffi-boundary-design.md)
- [Rust SDK Core Design](../rust-sdk-design.md)
- [Kotlin Native Architecture](../kotlin-native-design.md)
- [Swift Native Architecture](../swift-native-design.md)
- [FFI Testing Strategy](../ffi-testing-strategy.md)
- [Build Toolchain Requirements](../build-toolchain-requirements.md)

### External Resources

#### UniFFI Documentation

- [UniFFI Book](https://mozilla.github.io/uniffi-rs/) - Official UniFFI documentation
- [UniFFI GitHub Repository](https://github.com/mozilla/uniffi-rs) - Source code and examples
- [UniFFI User Guide](https://mozilla.github.io/uniffi-rs/tutorial/Rust_scaffolding.html) - Tutorial for getting started
- [UniFFI Kotlin Bindings](https://mozilla.github.io/uniffi-rs/kotlin/Kotlin.html) - Kotlin-specific guidance
- [UniFFI Swift Bindings](https://mozilla.github.io/uniffi-rs/swift/Swift.html) - Swift-specific guidance

#### Rust FFI Resources

- [Rust FFI Omnibus](http://jakegoulding.com/rust-ffi-omnibus/) - Comprehensive FFI examples
- [The Rustonomicon - FFI](https://doc.rust-lang.org/nomicon/ffi.html) - Advanced FFI patterns
- [Rust Book - FFI Chapter](https://doc.rust-lang.org/book/ch19-01-unsafe-rust.html#calling-rust-functions-from-other-languages) - Basic FFI concepts

#### cbindgen Resources

- [cbindgen Documentation](https://github.com/mozilla/cbindgen/blob/master/docs.md) - cbindgen user guide
- [cbindgen User Guide](https://github.com/mozilla/cbindgen/blob/master/docs.md#users-guide) - Configuration and usage

#### Platform-Specific Resources

- [Android JNI Guide](https://developer.android.com/ndk/guides/jni) - JNI concepts and best practices
- [Swift C Interoperability](https://developer.apple.com/documentation/swift/c-interoperability) - Swift bridging headers
- [Kotlin Native Memory Management](https://kotlinlang.org/docs/native-memory-manager.html) - Kotlin/Native memory model

### Production Case Studies

#### Mozilla Firefox

- **Firefox iOS:** Uses UniFFI for Application Services (Sync, Places, Logins)
- **Firefox Android:** UniFFI-based components in production since 2020
- **Firefox Focus:** Entire Rust core using UniFFI bindings
- **Scale:** 100+ FFI functions, millions of users

#### Other Projects Using UniFFI

- **1Password:** Uses UniFFI for core crypto and vault operations across platforms
- **Bitwarden:** Migrated to UniFFI for password vault FFI
- **Matrix Rust SDK:** Uses UniFFI for Matrix client bindings

### Research Papers

- [Safe Systems Programming in Rust](https://arxiv.org/abs/1505.07383) - Rust memory safety guarantees
- [Fearless Concurrency in Rust](https://blog.rust-lang.org/2015/04/10/Fearless-Concurrency.html) - Rust concurrency model
- [Rust FFI Safety](https://blog.rust-lang.org/2015/04/24/Rust-Once-Run-Everywhere.html) - FFI best practices

---

**Revision History:**
- 2026-01-13: Initial version (v1.0) - UniFFI selected as primary FFI binding strategy
