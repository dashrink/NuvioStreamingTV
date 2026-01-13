<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h1 align="center">🦀 Nuvio Rust SDK</h1>
  <p align="center">
    Cross-platform native SDK for Nuvio Streaming TV
    <br />
    UniFFI-powered FFI bindings • Kotlin & Swift • Zero-cost abstractions
    <br />
    <br />
    <a href="#getting-started"><strong>Get Started »</strong></a>
    <br />
    <br />
    <a href="https://github.com/tapframe/NuvioStreaming/issues/new?labels=bug&template=bug_report.md">Report Bug</a>
    ·
    <a href="https://github.com/tapframe/NuvioStreaming/issues/new?labels=enhancement&template=feature_request.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about">About</a></li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#platform-requirements">Platform Requirements</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#building-the-sdk">Building the SDK</a></li>
    <li><a href="#generating-bindings">Generating Bindings</a></li>
    <li><a href="#usage-examples">Usage Examples</a></li>
    <li><a href="#testing">Testing</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#core-types">Core Types</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#built-with">Built With</a></li>
  </ol>
</details>

---

## About

The **Nuvio Rust SDK** provides native, high-performance implementations of core domain types for the Nuvio Streaming TV platform. Built with [Rust](https://www.rust-lang.org/) and [UniFFI](https://mozilla.github.io/uniffi-rs/), it automatically generates type-safe Kotlin and Swift bindings for seamless integration with Android and iOS applications.

**Key Features:**
- 🔒 **Type-Safe FFI** - Automatic Kotlin and Swift binding generation via UniFFI
- 🚀 **Zero-Cost Abstractions** - Native performance without runtime overhead
- 📦 **Cross-Platform** - Single codebase targets iOS, Android, macOS, and Linux
- 🧪 **Well-Tested** - Comprehensive unit tests with serde serialization validation
- 📝 **Structured Logging** - Built-in tracing infrastructure for debugging

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Architecture

The SDK is organized as a Cargo workspace with a modular architecture:

```
rust-sdk/
├── nuvio-core/              # Core library crate
│   ├── src/
│   │   ├── lib.rs           # Library entry point with UniFFI scaffolding
│   │   ├── types/           # Domain type definitions
│   │   │   ├── meta.rs      # Content metadata (movies, TV shows)
│   │   │   ├── stream.rs    # Streaming source definitions
│   │   │   ├── catalog.rs   # Content catalogs
│   │   │   └── profile.rs   # User profiles
│   │   └── error.rs         # FFI-safe error types
│   ├── Cargo.toml           # Crate configuration (cdylib + rlib)
│   └── build.rs             # UniFFI scaffolding generation
├── bindings/                # Generated FFI bindings
│   ├── kotlin/              # Generated Kotlin files
│   └── swift/               # Generated Swift files
├── scripts/
│   └── generate-bindings.sh # Automated binding generation
└── Cargo.toml               # Workspace root configuration
```

**Design Principles:**
- **UniFFI Record Pattern**: All domain types use `#[derive(uniffi::Record)]` for FFI export
- **No Lifetimes/Generics**: Types are `'static` with concrete types only (UniFFI requirement)
- **Option<T> for Nullability**: Use `Option<T>` instead of nullable references
- **Named Enum Fields**: Error variants use named fields for FFI compatibility
- **Serde Integration**: All types support JSON serialization/deserialization

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Platform Requirements

### Development Environment

| Tool | Version | Purpose |
|------|---------|---------|
| **Rust** | 1.70+ (2021 edition) | Core SDK development |
| **Cargo** | Latest stable | Build system and package manager |
| **uniffi-bindgen** | 0.30.0+ | CLI tool for generating bindings |

### Target Platforms

| Platform | Target Triple | Output |
|----------|---------------|--------|
| **iOS** | `aarch64-apple-ios` | `.dylib` |
| **macOS** | `aarch64-apple-darwin` | `.dylib` |
| **Android** | `aarch64-linux-android` | `.so` |
| **Linux** | `x86_64-unknown-linux-gnu` | `.so` |

### Install Rust Toolchain

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add target platforms
rustup target add aarch64-apple-ios
rustup target add aarch64-apple-darwin
rustup target add aarch64-linux-android
rustup target add x86_64-unknown-linux-gnu

# Install UniFFI binding generator
cargo install uniffi-bindgen --version 0.30.0
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Clone and Build

```bash
# Navigate to the rust-sdk directory
cd rust-sdk

# Build the library (debug mode)
cargo build

# Build optimized release version
cargo build --release

# Run all tests
cargo test

# Run tests with logging enabled
RUST_LOG=debug cargo test

# Check code with Clippy linter
cargo clippy -- -D warnings

# Format code
cargo fmt
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Building the SDK

### Standard Build

```bash
# Build for the current platform
cargo build --release

# Build for specific target platforms
cargo build --release --target aarch64-apple-ios       # iOS
cargo build --release --target aarch64-apple-darwin    # macOS (Apple Silicon)
cargo build --release --target aarch64-linux-android   # Android (ARM64)
cargo build --release --target x86_64-unknown-linux-gnu # Linux (x86_64)
```

### Output Artifacts

After building, the compiled library will be located at:

- **macOS/iOS**: `target/release/libnuvio_core.dylib` (or `target/<triple>/release/`)
- **Linux/Android**: `target/release/libnuvio_core.so` (or `target/<triple>/release/`)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Generating Bindings

### Automated Script (Recommended)

The easiest way to generate bindings for both Kotlin and Swift:

```bash
# Run the automated binding generation script
./scripts/generate-bindings.sh
```

This script will:
1. Build the release library for your current platform
2. Generate Kotlin bindings to `bindings/kotlin/`
3. Generate Swift bindings to `bindings/swift/`
4. Display next steps for integrating with your projects

### Manual Generation

#### Kotlin Bindings (Android)

```bash
# Build the library first
cargo build --release

# Generate Kotlin bindings (requires .so or .dylib)
uniffi-bindgen generate \
  --library target/release/libnuvio_core.so \
  --language kotlin \
  --out-dir bindings/kotlin
```

Generated files:
- `bindings/kotlin/nuvio_core.kt` - Kotlin type definitions and FFI glue code

#### Swift Bindings (iOS/macOS)

```bash
# Build the library first
cargo build --release

# Generate Swift bindings (requires .dylib)
uniffi-bindgen generate \
  --library target/release/libnuvio_core.dylib \
  --language swift \
  --out-dir bindings/swift
```

Generated files:
- `bindings/swift/nuvio_core.swift` - Swift type definitions and FFI glue code
- `bindings/swift/nuvio_coreFFI.h` - C header for bridging

### Platform-Specific Notes

- **Linux/Android builds produce `.so` files** - Use these for Kotlin binding generation
- **macOS/iOS builds produce `.dylib` files** - Use these for Swift binding generation
- Ensure the `uniffi-bindgen` CLI version matches the `uniffi` dependency version in `Cargo.toml`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Usage Examples

### HTTP Client

The Nuvio Rust SDK includes a production-grade HTTP networking layer with connection pooling, automatic retry logic, cookie management, and FFI bindings for Kotlin and Swift.

#### Basic HTTP Requests (Rust)

```rust
use nuvio_core::http::{get_client, http_get, HttpError};

// Example 1: Using the async client directly
async fn make_request() -> Result<(), HttpError> {
    let client = get_client();
    let response = client.get("https://api.example.com/data")
        .send()
        .await?;

    let body = response.text().await?;
    println!("Response: {}", body);
    Ok(())
}

// Example 2: Using FFI-exported blocking functions
fn make_request_blocking() -> Result<(), HttpError> {
    let response = http_get("https://api.example.com/data".to_string())?;
    println!("Status: {}", response.status_code);
    println!("Body: {}", response.body);
    Ok(())
}
```

#### HTTP Client Configuration (Rust)

```rust
use nuvio_core::http::{HttpClientConfig, create_client_with_config};
use std::time::Duration;

// Create custom configuration
let config = HttpClientConfig::builder()
    .request_timeout(Duration::from_secs(60))      // Overall request timeout
    .connect_timeout(Duration::from_secs(15))       // TCP connection timeout
    .pool_max_idle_per_host(20)                     // Connection pool size
    .user_agent("my-app/2.0")                       // Custom User-Agent
    .header("X-API-Key", "your-api-key")            // Custom headers
    .cookie_store_enabled(true)                     // Enable cookie jar
    .build();

// Create client with custom config
let client = create_client_with_config(&config)?;
```

#### Request Cancellation (Rust)

```rust
use nuvio_core::http::{spawn_request, get_client};

async fn cancellable_request() {
    let client = get_client();

    // Spawn a cancellable request
    let handle = spawn_request(async move {
        client.get("https://api.example.com/data").send().await
    });

    // Check if finished
    if !handle.is_finished() {
        // Cancel the request
        handle.abort();
    }

    // Wait for result (will be error if cancelled)
    match handle.await {
        Ok(Ok(response)) => println!("Success: {}", response.status()),
        Ok(Err(e)) => println!("Request failed: {}", e),
        Err(e) => println!("Request was cancelled: {}", e),
    }
}
```

### HTTP Client FFI (Kotlin)

```kotlin
import uniffi.nuvio_core.*
import kotlinx.coroutines.*

// Example 1: Simple GET request
suspend fun fetchData(url: String): HttpResponse = withContext(Dispatchers.IO) {
    httpGet(url)
}

// Example 2: POST request with JSON body
suspend fun postData(url: String, jsonBody: String): HttpResponse =
    withContext(Dispatchers.IO) {
        httpPost(url, jsonBody, "application/json")
    }

// Example 3: Custom request with headers
suspend fun customRequest(url: String): HttpResponse = withContext(Dispatchers.IO) {
    val request = HttpRequest(
        url = url,
        body = null,
        headers = mapOf(
            "Authorization" to "Bearer token",
            "X-Custom-Header" to "custom-value"
        )
    )
    httpRequest("GET", request)
}

// Example 4: Cancellable requests
class ApiClient {
    private val scope = CoroutineScope(Dispatchers.IO)

    fun fetchDataAsync(url: String): Job {
        return scope.launch {
            // Start cancellable request
            val handleId = httpGetCancellable(url)

            try {
                // Poll until finished
                while (!isRequestFinished(handleId)) {
                    delay(100)
                }
                println("Request completed")
            } finally {
                // Clean up handle
                removeRequestHandle(handleId)
            }
        }
    }

    fun cancelRequest(job: Job) {
        job.cancel()
    }
}

// Example 5: Error handling
suspend fun fetchWithErrorHandling(url: String) {
    try {
        val response = withContext(Dispatchers.IO) { httpGet(url) }
        when {
            response.statusCode in 200..299 -> {
                println("Success: ${response.body}")
            }
            response.statusCode >= 400 -> {
                println("HTTP error: ${response.statusCode}")
            }
        }
    } catch (e: Exception.HttpError.NetworkError) {
        println("Network error (code ${e.code}): ${e.msg}")
    } catch (e: Exception.HttpError.TimeoutError) {
        println("Request timeout: ${e.msg}")
    } catch (e: Exception.HttpError.HttpStatusError) {
        println("HTTP ${e.statusCode} error: ${e.msg}")
    }
}
```

### HTTP Client FFI (Swift)

```swift
import NuvioCore
import Foundation

// Example 1: Simple GET request
func fetchData(url: String) async throws -> HttpResponse {
    return try await Task {
        try httpGet(url: url)
    }.value
}

// Example 2: POST request with JSON body
func postData(url: String, jsonBody: String) async throws -> HttpResponse {
    return try await Task {
        try httpPost(url: url, body: jsonBody, contentType: "application/json")
    }.value
}

// Example 3: Custom request with headers
func customRequest(url: String) async throws -> HttpResponse {
    return try await Task {
        let request = HttpRequest(
            url: url,
            body: nil,
            headers: [
                "Authorization": "Bearer token",
                "X-Custom-Header": "custom-value"
            ]
        )
        return try httpRequest(method: "GET", request: request)
    }.value
}

// Example 4: Cancellable requests
class ApiClient {
    private var requestHandles: [UInt64] = []

    func fetchDataAsync(url: String) async throws {
        // Start cancellable request
        let handleId = httpGetCancellable(url: url)
        requestHandles.append(handleId)

        defer {
            // Clean up handle when done
            try? removeRequestHandle(handleId: handleId)
            requestHandles.removeAll { $0 == handleId }
        }

        // Poll until finished
        while try !isRequestFinished(handleId: handleId) {
            try await Task.sleep(nanoseconds: 100_000_000) // 100ms
        }

        print("Request completed")
    }

    func cancelAllRequests() {
        for handleId in requestHandles {
            try? abortRequest(handleId: handleId)
        }
    }
}

// Example 5: Error handling
func fetchWithErrorHandling(url: String) async {
    do {
        let response = try await fetchData(url: url)

        switch response.statusCode {
        case 200..<300:
            print("Success: \(response.body)")
        case 400...:
            print("HTTP error: \(response.statusCode)")
        default:
            break
        }
    } catch let error as HttpError.NetworkError {
        print("Network error (code \(error.code)): \(error.msg)")
    } catch let error as HttpError.TimeoutError {
        print("Request timeout: \(error.msg)")
    } catch let error as HttpError.HttpStatusError {
        print("HTTP \(error.statusCode) error: \(error.msg)")
    } catch {
        print("Unexpected error: \(error)")
    }
}

// Example 6: Using with SwiftUI
struct ContentView: View {
    @State private var data: String = ""
    @State private var isLoading = false

    var body: some View {
        VStack {
            if isLoading {
                ProgressView()
            } else {
                Text(data)
            }
        }
        .task {
            await loadData()
        }
    }

    func loadData() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await fetchData(url: "https://api.example.com/data")
            data = response.body
        } catch {
            print("Failed to load data: \(error)")
        }
    }
}
```

### HTTP Client Features

**Connection Pooling**
- Automatic connection reuse with configurable pool size
- Keep-alive connections for improved performance
- Default: 10 idle connections per host, 90s keep-alive

**Automatic Retry Logic**
- Exponential backoff with jitter for transient failures
- Retries 5xx errors and network errors (up to 3 attempts)
- Does NOT retry 4xx client errors
- Configurable retry policy

**Cookie Management**
- Automatic cookie storage and handling
- Supports OAuth flows (like Trakt API)
- RFC6265 compliant cookie handling

**TLS Certificate Pinning**
- Pin specific certificates for critical APIs
- Prevent MITM attacks
- Uses rustls for pure Rust TLS stack

**Request Cancellation**
- Cancel in-flight requests via abort()
- Automatic resource cleanup
- Thread-safe cancellation

**Error Handling**
- Detailed error types (Network, Timeout, HTTP Status, TLS)
- FFI-safe error propagation to Kotlin/Swift
- Structured error information

### Domain Types

#### Rust

```rust
use nuvio_core::types::meta::Meta;
use nuvio_core::error::NuvioError;

// Initialize tracing (call once at startup)
nuvio_core::init_tracing();

// Create a new Meta instance
let meta = Meta::new(
    "tt0133093".to_string(),
    "The Matrix".to_string(),
);

// Create with full details
let detailed_meta = Meta::with_details(
    "tt0133093".to_string(),
    "The Matrix".to_string(),
    Some("A computer hacker learns about the true nature of reality.".to_string()),
    Some("https://example.com/poster.jpg".to_string()),
    Some("https://example.com/background.jpg".to_string()),
    Some("tt0133093".to_string()),
    Some(603),
);

// Serialize to JSON
let json = serde_json::to_string(&meta)?;

// Deserialize from JSON
let deserialized: Meta = serde_json::from_str(&json)?;
```

#### Kotlin (Android)

```kotlin
import uniffi.nuvio_core.*

// Create a new Meta instance
val meta = Meta(
    id = "tt0133093",
    name = "The Matrix",
    description = "A computer hacker learns about the true nature of reality.",
    posterUrl = "https://example.com/poster.jpg",
    backgroundUrl = "https://example.com/background.jpg",
    imdbId = "tt0133093",
    tmdbId = 603
)

// Access properties
println("Title: ${meta.name}")
println("IMDB ID: ${meta.imdbId}")

// Handle errors
try {
    // ... SDK operations
} catch (e: NuvioException.SerializationError) {
    Log.e("Nuvio", "Serialization failed: ${e.msg}")
} catch (e: NuvioException.ValidationError) {
    Log.e("Nuvio", "Validation failed: ${e.msg}")
}
```

#### Swift (iOS/macOS)

```swift
import nuvio_core

// Create a new Meta instance
let meta = Meta(
    id: "tt0133093",
    name: "The Matrix",
    description: "A computer hacker learns about the true nature of reality.",
    posterUrl: "https://example.com/poster.jpg",
    backgroundUrl: "https://example.com/background.jpg",
    imdbId: "tt0133093",
    tmdbId: 603
)

// Access properties
print("Title: \(meta.name)")
print("IMDB ID: \(meta.imdbId ?? "N/A")")

// Handle errors
do {
    // ... SDK operations
} catch let error as NuvioError.SerializationError {
    print("Serialization failed: \(error.msg)")
} catch let error as NuvioError.ValidationError {
    print("Validation failed: \(error.msg)")
}
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Testing

### Run All Tests

```bash
# Run all unit tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run tests with logging enabled
RUST_LOG=debug cargo test

# Run specific test
cargo test test_meta_serde_roundtrip
```

### Test Coverage

The SDK includes comprehensive tests for:
- **Serde Roundtrip**: Verify types serialize and deserialize without data loss
- **Optional Fields**: Ensure `Option<T>` fields handle `None` and `Some(value)` correctly
- **Error Variants**: Test all error types construct and display properly
- **Clone & Debug**: Verify derived traits work correctly
- **FFI Compatibility**: Ensure types compile with UniFFI macros

### Code Quality Checks

```bash
# Run Clippy linter (strict mode)
cargo clippy -- -D warnings

# Format code
cargo fmt

# Check formatting without modifying files
cargo fmt -- --check

# Generate documentation
cargo doc --open
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Project Structure

### Workspace Configuration

The SDK uses a Cargo workspace with shared dependencies:

```toml
[workspace]
members = ["nuvio-core"]
resolver = "2"

[workspace.dependencies]
uniffi = "0.30.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tracing = "0.1"
thiserror = "2.0"
```

### Core Library Configuration

`nuvio-core/Cargo.toml` includes critical FFI settings:

```toml
[lib]
crate-type = ["cdylib", "rlib"]  # CRITICAL: cdylib required for FFI

[dependencies]
uniffi = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
tracing = { workspace = true }
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
thiserror = { workspace = true }

[build-dependencies]
uniffi = { workspace = true, features = ["build"] }
```

**Key Points:**
- `crate-type = ["cdylib", "rlib"]` is **MANDATORY** for FFI library compilation
- `cdylib` enables dynamic library output for foreign language bindings
- `rlib` enables Rust-to-Rust linking and testing

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Core Types

### Meta - Content Metadata

Represents metadata for movies, TV shows, and other streaming content.

```rust
pub struct Meta {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub poster_url: Option<String>,
    pub background_url: Option<String>,
    pub imdb_id: Option<String>,
    pub tmdb_id: Option<i32>,
}
```

### Stream - Streaming Source

Represents a streaming source with quality information and URL.

```rust
pub struct Stream {
    pub id: String,
    pub title: String,
    pub url: String,
    pub quality: Option<String>,
    pub size_bytes: Option<i64>,
}
```

### Catalog - Content Catalog

Represents a collection of content items organized by type.

```rust
pub struct Catalog {
    pub id: String,
    pub type_: String,
    pub name: String,
    pub extra: Vec<CatalogExtra>,
}
```

### Profile - User Profile

Represents a user profile with preferences and settings.

```rust
pub struct Profile {
    pub id: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub created_at: i64,
}
```

### NuvioError - Error Handling

FFI-safe error types with named fields for UniFFI compatibility.

```rust
pub enum NuvioError {
    SerializationError { msg: String },
    ValidationError { msg: String },
    Unknown { msg: String },
}
```

**All types support:**
- ✅ UniFFI FFI export (`#[derive(uniffi::Record)]`)
- ✅ Serde JSON serialization (`Serialize`, `Deserialize`)
- ✅ Standard traits (`Debug`, `Clone`, `PartialEq`)
- ✅ Thread-safe (`Send + Sync`)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contributing

Contributions are welcome! When contributing to the Rust SDK, please follow these guidelines:

### Code Quality

- All code must pass `cargo clippy -- -D warnings` (zero warnings)
- Format code with `cargo fmt` before committing
- Add unit tests for new functionality
- Document public APIs with doc comments (`///`)

### UniFFI Constraints

When adding new types, ensure they follow UniFFI requirements:

- ✅ **DO** use `#[derive(uniffi::Record)]` for structs
- ✅ **DO** use `Option<T>` for nullable fields
- ✅ **DO** use named fields in enum variants
- ✅ **DO** keep types `'static` (no lifetimes)
- ❌ **DON'T** use generic type parameters
- ❌ **DON'T** use lifetime parameters
- ❌ **DON'T** use tuple enum variants
- ❌ **DON'T** use references at FFI boundaries

### Pull Request Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Ensure all tests pass (`cargo test`)
4. Ensure code quality checks pass (`cargo clippy` and `cargo fmt`)
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Built With

<p align="left">
  <a href="https://www.rust-lang.org/">
    <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust"/>
  </a>
  <a href="https://mozilla.github.io/uniffi-rs/">
    <img src="https://img.shields.io/badge/UniFFI-0.30.0-orange?style=for-the-badge" alt="UniFFI"/>
  </a>
  <a href="https://serde.rs/">
    <img src="https://img.shields.io/badge/Serde-1.0-blue?style=for-the-badge" alt="Serde"/>
  </a>
</p>

**Core Technologies:**
- **Rust** - Systems programming language with memory safety
- **UniFFI** - Automatic FFI binding generation for Kotlin and Swift
- **Serde** - Serialization framework for Rust
- **Tracing** - Structured logging and diagnostics
- **Thiserror** - Ergonomic error type derivation

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

Distributed under the GNU GPLv3 License. See `LICENSE` in the repository root for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
