# API Documentation Generation Guide

## Overview

This guide explains how to generate and verify the API documentation for the Nuvio Core SDK.

## Prerequisites

- Rust toolchain installed (1.70.0 or later)
- All source files properly documented with doc comments

## Documentation Standards

All public types, functions, and modules in the Nuvio Core SDK follow Rust documentation conventions:

### Crate-Level Documentation
The main library file (`src/lib.rs`) uses `//!` doc comments to provide:
- Overview of the SDK
- List of core types
- Error handling explanation
- Usage examples

### Module-Level Documentation
Each module uses `//!` doc comments at the top of the file to describe:
- Module purpose
- Available types
- Usage patterns

### Type-Level Documentation
Each public struct, enum, and function uses `///` doc comments with:
- Description of the type/function
- Field descriptions
- Usage examples where appropriate
- Notes about FFI compatibility

## Generating Documentation

### Command

To generate the API documentation without dependencies:

```bash
cd rust-sdk
cargo doc --no-deps
```

### Output Location

Documentation is generated in:
```
rust-sdk/target/doc/nuvio_core/index.html
```

### Verification

After generation, verify the documentation was created:

```bash
ls target/doc/nuvio_core/index.html
```

Expected output: `target/doc/nuvio_core/index.html`

### Opening Documentation

To generate and open the documentation in your browser:

```bash
cargo doc --no-deps --open
```

## Documentation Structure

The generated documentation includes:

### Main Page (`nuvio_core`)
- Crate overview
- Core types listing
- Error handling information
- Example usage

### Modules

#### `nuvio_core::types`
- Overview of all domain types
- Links to individual type documentation

#### `nuvio_core::error`
- Error type documentation
- Error variant descriptions

#### `nuvio_core::http`
- HTTP networking layer module
- HTTP client with connection pooling
- Request/response middleware
- Retry logic with exponential backoff
- Cookie management for OAuth flows
- TLS configuration and certificate pinning
- FFI exports for Kotlin/Swift

### Types

Each type has detailed documentation including:

1. **Meta** (`nuvio_core::types::Meta`)
   - Content metadata structure
   - Field descriptions
   - Constructor methods
   - Serialization examples

2. **Stream** (`nuvio_core::types::Stream`)
   - Video stream information
   - Quality and format fields
   - Constructor methods
   - Usage examples

3. **Catalog** (`nuvio_core::types::Catalog`)
   - Content collection structure
   - Item ID references
   - Constructor methods
   - Collection management

4. **Profile** (`nuvio_core::types::Profile`)
   - User profile settings
   - Parental controls
   - Personalization options
   - Constructor methods

5. **NuvioError** (`nuvio_core::error::NuvioError`)
   - Error variants
   - Error construction methods
   - Conversion traits

### HTTP Client Types

6. **HttpResponse** (`nuvio_core::http::HttpResponse`)
   - FFI-safe HTTP response structure
   - Status code (u16)
   - Response body (String)
   - Headers (HashMap<String, String>)
   - Used by all FFI-exported HTTP functions

7. **HttpRequest** (`nuvio_core::http::HttpRequest`)
   - FFI-safe HTTP request configuration
   - URL (String)
   - Optional body (Option<String>)
   - Headers (HashMap<String, String>)
   - Used by `http_request()` FFI function

8. **HttpError** (`nuvio_core::http::error::HttpError`)
   - NetworkError - DNS failures, connection errors
   - TimeoutError - Request/connection timeouts
   - HttpStatusError - HTTP 4xx/5xx status codes
   - TlsError - Certificate validation failures
   - CancellationError - Request was cancelled
   - ConfigurationError - Invalid configuration
   - Unknown - Unclassified errors

9. **HttpClientConfig** (`nuvio_core::http::config::HttpClientConfig`)
   - Client configuration structure
   - Timeout settings
   - Connection pool parameters
   - Cookie store enable/disable
   - Default headers
   - Custom TLS configuration

## HTTP Client API

The HTTP networking layer provides FFI-exported functions for making HTTP requests from Kotlin and Swift, as well as internal Rust APIs for advanced usage.

### FFI-Exported Functions (Kotlin/Swift)

These functions are exported via UniFFI and can be called from Kotlin (Android) and Swift (iOS/macOS).

#### Basic HTTP Methods

##### `http_get(url: String) -> Result<HttpResponse, HttpError>`

Performs a synchronous HTTP GET request.

**Parameters:**
- `url` - The URL to request (e.g., "https://api.example.com/data")

**Returns:**
- `Ok(HttpResponse)` - Successful response with status, body, and headers
- `Err(HttpError)` - Network error, timeout, or HTTP status error

**Example (Kotlin):**
```kotlin
suspend fun fetchData(url: String): HttpResponse = withContext(Dispatchers.IO) {
    httpGet(url)
}
```

**Example (Swift):**
```swift
func fetchData(url: String) async throws -> HttpResponse {
    return try await Task {
        try httpGet(url: url)
    }.value
}
```

##### `http_post(url: String, body: String, content_type: String) -> Result<HttpResponse, HttpError>`

Performs a synchronous HTTP POST request.

**Parameters:**
- `url` - The URL to request
- `body` - The request body as a string (usually JSON)
- `content_type` - The Content-Type header value (e.g., "application/json")

**Returns:**
- `Ok(HttpResponse)` - Successful response with status, body, and headers
- `Err(HttpError)` - Network error, timeout, or HTTP status error

**Example (Kotlin):**
```kotlin
suspend fun postData(url: String, json: String): HttpResponse = withContext(Dispatchers.IO) {
    httpPost(url, json, "application/json")
}
```

##### `http_put(url: String, body: String, content_type: String) -> Result<HttpResponse, HttpError>`

Performs a synchronous HTTP PUT request.

**Parameters:**
- `url` - The URL to request
- `body` - The request body as a string
- `content_type` - The Content-Type header value

**Returns:**
- `Ok(HttpResponse)` - Successful response
- `Err(HttpError)` - Error occurred

##### `http_delete(url: String) -> Result<HttpResponse, HttpError>`

Performs a synchronous HTTP DELETE request.

**Parameters:**
- `url` - The URL to request

**Returns:**
- `Ok(HttpResponse)` - Successful response
- `Err(HttpError)` - Error occurred

##### `http_request(method: String, request: HttpRequest) -> Result<HttpResponse, HttpError>`

Performs a custom HTTP request with full control over method, headers, and body.

**Parameters:**
- `method` - HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD)
- `request` - HttpRequest structure with url, body, and headers

**Returns:**
- `Ok(HttpResponse)` - Successful response
- `Err(HttpError)` - Error occurred (including ConfigurationError for unsupported methods)

**Example (Kotlin):**
```kotlin
val headers = mapOf("Authorization" to "Bearer token")
val request = HttpRequest(
    url = "https://api.example.com/data",
    body = """{"key": "value"}""",
    headers = headers
)
val response = httpRequest("POST", request)
```

#### Cancellable Requests

These functions spawn requests in the background and return a handle ID for cancellation.

##### `http_get_cancellable(url: String) -> u64`

Spawns an HTTP GET request in the background and returns a handle ID.

**Parameters:**
- `url` - The URL to request

**Returns:**
- `u64` - Handle ID that can be used with `abort_request()` and `is_request_finished()`

**Example (Kotlin):**
```kotlin
val handleId = httpGetCancellable("https://api.example.com/data")
// ... do other work ...
if (needsCancel) {
    abortRequest(handleId)
}
```

##### `http_post_cancellable(url: String, body: String, content_type: String) -> u64`

Spawns an HTTP POST request in the background and returns a handle ID.

**Parameters:**
- `url` - The URL to request
- `body` - The request body as a string
- `content_type` - The Content-Type header value

**Returns:**
- `u64` - Handle ID for request management

##### `abort_request(handle_id: u64) -> Result<(), HttpError>`

Cancels a request by its handle ID.

**Parameters:**
- `handle_id` - The handle ID returned from a cancellable request function

**Returns:**
- `Ok(())` - Request was aborted successfully
- `Err(HttpError::ConfigurationError)` - Invalid handle ID

**Note:** Calling abort on an already finished request is safe and has no effect.

##### `is_request_finished(handle_id: u64) -> Result<bool, HttpError>`

Checks whether a request has completed.

**Parameters:**
- `handle_id` - The handle ID to check

**Returns:**
- `Ok(true)` - Request is finished (successfully, with error, or cancelled)
- `Ok(false)` - Request is still running
- `Err(HttpError::ConfigurationError)` - Invalid handle ID

##### `remove_request_handle(handle_id: u64) -> Result<(), HttpError>`

Removes a finished request handle from the registry to free resources.

**Parameters:**
- `handle_id` - The handle ID to remove

**Returns:**
- `Ok(())` - Handle removed successfully
- `Err(HttpError::ConfigurationError)` - Invalid handle ID

**Best Practice:** Call this after a request completes to clean up resources.

### Internal Rust API

These functions are available for Rust code but are not exported to FFI.

#### Client Management

##### `get_client() -> &'static reqwest::Client`

Returns the global HTTP client instance with connection pooling.

**CRITICAL:** Only ONE client instance should exist for connection pooling to work. This function returns a singleton.

**Example:**
```rust
let client = get_client();
let response = client.get("https://api.example.com").send().await?;
```

##### `get_client_with_middleware() -> &'static ClientWithMiddleware`

Returns the global HTTP client wrapped with middleware (includes retry logic).

**Example:**
```rust
let client = get_client_with_middleware();
let response = client.get("https://api.example.com").send().await?;
// This request will automatically retry on transient failures (5xx, network errors)
```

##### `create_client_with_config(config: HttpClientConfig) -> Result<Client, HttpError>`

Creates a new HTTP client with custom configuration. Only use this if you need a separate client instance with different settings.

**Example:**
```rust
use std::time::Duration;

let config = HttpClientConfig::builder()
    .request_timeout(Duration::from_secs(60))
    .connect_timeout(Duration::from_secs(15))
    .pool_max_idle_per_host(20)
    .build();

let client = create_client_with_config(config)?;
```

##### `get_runtime() -> &'static tokio::runtime::Runtime`

Returns the global tokio runtime instance. Used internally for FFI blocking adapters.

**CRITICAL:** Do NOT create new Runtime instances - this is extremely expensive. Always reuse the global runtime.

#### Configuration Builder

##### `HttpClientConfig::builder() -> HttpClientConfigBuilder`

Creates a new configuration builder.

**Builder Methods:**
- `request_timeout(Duration)` - Overall request timeout (default: 30s)
- `connect_timeout(Duration)` - TCP connection timeout (default: 10s)
- `pool_idle_timeout(Duration)` - Keep-alive timeout (default: 90s)
- `pool_max_idle_per_host(usize)` - Max connections per host (default: 10)
- `cookie_store_enabled(bool)` - Enable cookie jar (default: true)
- `user_agent(&str)` - Set User-Agent header (default: "nuvio-sdk/1.0")
- `header(&str, &str)` - Add a default header
- `tls_config(ClientConfig)` - Set custom TLS configuration
- `build()` - Build the configuration

**Example:**
```rust
let config = HttpClientConfig::builder()
    .request_timeout(Duration::from_secs(60))
    .user_agent("my-app/2.0")
    .header("X-API-Key", "secret-key")
    .build();
```

### Error Handling

All HTTP functions return `Result<T, HttpError>` where `HttpError` can be:

**NetworkError**
- Code 0: General network error
- Code 1: DNS resolution failure
- Code 2: Connection refused
- Code 3: Connection reset
- Code 4: Other connection error

**TimeoutError**
- Request timeout (overall request took too long)
- Connect timeout (TCP connection took too long)

**HttpStatusError**
- 4xx client errors (400, 401, 403, 404, etc.)
- 5xx server errors (500, 502, 503, etc.)

**TlsError**
- Certificate validation failures
- TLS handshake errors

**CancellationError**
- Request was cancelled via `abort_request()`

**ConfigurationError**
- Invalid HTTP method
- Invalid handle ID
- Invalid client configuration

**Unknown**
- Unexpected or unclassified errors

### Connection Pooling

The HTTP client uses a singleton pattern to enable connection pooling:

- **CRITICAL:** Only ONE client instance exists throughout the application
- Connection pool settings:
  - `pool_idle_timeout`: How long idle connections stay alive (default: 90s)
  - `pool_max_idle_per_host`: Maximum idle connections per host (default: 10)
- Connections are automatically reused for multiple requests to the same host
- HTTP/1.1 keep-alive is enabled by default

### Retry Logic

The client with middleware (`get_client_with_middleware()`) includes automatic retry:

- **Retries transient failures:** 5xx server errors, network errors, timeouts
- **Does NOT retry:** 4xx client errors (not transient)
- **Exponential backoff:** Delays increase exponentially (1s → 2s → 4s → ...)
- **Jitter:** Random delay added to prevent thundering herd
- **Default max retries:** 3 attempts
- **Known limitation:** Do NOT use streaming request bodies with retry (known reqwest-retry bug)

### Cookie Management

Cookie jar is enabled by default for OAuth flows:

- Cookies automatically stored from `Set-Cookie` headers
- Cookies automatically sent with subsequent requests to matching domains
- Follows RFC6265 rules for domain/path/secure/httponly
- Thread-safe across concurrent requests

### Thread Safety

The HTTP client is fully thread-safe:

- Client can be safely shared across threads using Arc (internal)
- Connection pool designed for concurrent access
- Cookie store is synchronized
- Safe to make concurrent requests from multiple threads

## Checking for Documentation Warnings

To ensure all public items are documented, run:

```bash
cargo doc --no-deps 2>&1 | grep warning
```

Expected output: No warnings (empty output)

## Documentation Best Practices

### For Future Contributions

When adding new types or functions to the SDK:

1. **Use proper doc comment syntax:**
   - `//!` for crate and module-level docs
   - `///` for type, function, and field-level docs

2. **Include these sections:**
   - Brief description
   - Field/parameter descriptions
   - Examples for public functions
   - Notes about FFI compatibility

3. **Follow Rust conventions:**
   - Use markdown formatting
   - Include code examples in fenced blocks
   - Link to related types with backticks and square brackets: `` [`TypeName`] ``

4. **FFI-specific notes:**
   - Mention UniFFI compatibility
   - Note any type restrictions (no generics, no lifetimes)
   - Explain thread-safety guarantees

## Continuous Integration

The documentation generation is verified in CI/CD:

```yaml
- name: Check documentation
  run: cd rust-sdk && cargo doc --no-deps
```

This ensures documentation builds without errors on every commit.

## Publishing Documentation

For future releases, documentation can be published to:
- docs.rs (when published to crates.io)
- GitHub Pages
- Internal documentation server

### Hosting on GitHub Pages

```bash
# Generate documentation
cargo doc --no-deps

# Copy to docs directory
mkdir -p docs
cp -r target/doc/* docs/

# Commit and push to gh-pages branch
git checkout -b gh-pages
git add docs/
git commit -m "Update API documentation"
git push origin gh-pages
```

## Related Files

### Core Types
- `src/lib.rs` - Crate-level documentation
- `src/types/mod.rs` - Types module documentation
- `src/types/meta.rs` - Meta type documentation
- `src/types/stream.rs` - Stream type documentation
- `src/types/catalog.rs` - Catalog type documentation
- `src/types/profile.rs` - Profile type documentation
- `src/error.rs` - Error type documentation

### HTTP Client
- `src/http/mod.rs` - HTTP module documentation
- `src/http/client.rs` - HTTP client implementation with connection pooling
- `src/http/config.rs` - HTTP client configuration builder
- `src/http/error.rs` - HTTP error types
- `src/http/ffi.rs` - FFI exports for Kotlin and Swift
- `src/http/middleware.rs` - Request/response interceptor implementations
- `src/http/retry.rs` - Retry logic with exponential backoff
- `src/http/cookies.rs` - Cookie jar management
- `src/http/tls.rs` - TLS configuration and certificate pinning

## Troubleshooting

### Missing Documentation

If documentation doesn't appear for a type:
1. Ensure the type is marked `pub`
2. Check for `///` doc comments (not `//`)
3. Verify the module is exported in parent `mod.rs`

### Broken Links

If documentation links are broken:
1. Use proper path syntax: `` [`crate::module::Type`] ``
2. Ensure the target type is public
3. Check module re-exports

### Build Errors

If `cargo doc` fails:
1. Run `cargo check` first to fix compilation errors
2. Check for invalid markdown in doc comments
3. Ensure all code examples in docs are valid

## Summary

✅ All source files have proper documentation comments
✅ Crate-level docs in `src/lib.rs`
✅ Module-level docs in `src/types/mod.rs`
✅ Type-level docs on all public structs and enums
✅ Function-level docs on constructors and helpers
✅ Examples included where appropriate
✅ FFI compatibility noted

The SDK is ready for documentation generation with `cargo doc --no-deps`.
