# UniFFI Bindings for Nuvio Core SDK

This directory contains the generated Kotlin and Swift bindings for the Rust HTTP networking layer.

## Prerequisites

The bindings are generated using the `uniffi-bindgen` tool. To install it:

```bash
cargo install uniffi-bindgen --version 0.30.0
```

## Generating Bindings

### Option 1: Using the generate-bindings script (recommended)

```bash
cd rust-sdk
./generate-bindings.sh
```

### Option 2: Manual generation

1. First, build the library:
```bash
cd rust-sdk/nuvio-core
cargo build --release
```

2. Generate Kotlin bindings:
```bash
uniffi-bindgen generate \
    --library target/release/libnuvio_core.so \
    --language kotlin \
    --out-dir ../bindings/kotlin \
    --config uniffi.toml
```

3. Generate Swift bindings:
```bash
uniffi-bindgen generate \
    --library target/release/libnuvio_core.dylib \
    --language swift \
    --out-dir ../bindings/swift \
    --config uniffi.toml
```

Note: The library extension varies by platform (.so on Linux, .dylib on macOS, .dll on Windows)

## Configuration

The bindings are configured via `nuvio-core/uniffi.toml`:

- **Kotlin**: Package `com.nuvio.sdk.core`
- **Swift**: Module `NuvioCore`

## What Gets Exported

The FFI exports include:

### HTTP Networking Functions
- `http_get(url: String) -> Result<HttpResponse, HttpError>`
- `http_post(url: String, body: String, content_type: String) -> Result<HttpResponse, HttpError>`
- `http_put(url: String, body: String, content_type: String) -> Result<HttpResponse, HttpError>`
- `http_delete(url: String) -> Result<HttpResponse, HttpError>`
- `http_request(method: String, request: HttpRequest) -> Result<HttpResponse, HttpError>`

### Data Types
- `HttpResponse` - HTTP response with status_code, body, and headers
- `HttpRequest` - HTTP request with url, body, and headers
- `HttpError` - Error types (NetworkError, TimeoutError, HttpStatusError, TlsError, etc.)

### Core Domain Types
- `Meta` - Content metadata
- `Stream` - Video stream information
- `Catalog` - Content collections
- `Profile` - User profiles
- `NuvioError` - General SDK errors

## Usage Examples

### Kotlin

```kotlin
import com.nuvio.sdk.core.*

// Use within a coroutine for async operations
suspend fun makeRequest() = withContext(Dispatchers.IO) {
    try {
        val response = httpGet("https://httpbin.org/get")
        println("Status: ${response.statusCode}")
        println("Body: ${response.body}")
    } catch (e: HttpError.NetworkError) {
        println("Network error: ${e.message}")
    }
}
```

### Swift

```swift
import NuvioCore

// Use within an async context
func makeRequest() async {
    do {
        let response = try httpGet(url: "https://httpbin.org/get")
        print("Status: \(response.statusCode)")
        print("Body: \(response.body)")
    } catch let error as HttpError {
        print("HTTP error: \(error)")
    }
}
```

## Verification

To verify bindings were generated successfully:

```bash
ls -la bindings/kotlin/
ls -la bindings/swift/
```

You should see:
- Kotlin: `.kt` files with the generated Kotlin code
- Swift: `.swift` files with the generated Swift code, plus a module map

## CI Integration

In CI/CD pipelines, add a step to generate bindings:

```yaml
- name: Generate UniFFI bindings
  run: |
    cargo install uniffi-bindgen --version 0.30.0
    cd rust-sdk
    ./generate-bindings.sh
```

## Troubleshooting

### "uniffi-bindgen: command not found"
Install the tool: `cargo install uniffi-bindgen --version 0.30.0`

### "cannot find library"
Make sure you build the library first: `cargo build --release`

### Library extension doesn't match
Check your platform:
- Linux: `libnuvio_core.so`
- macOS: `libnuvio_core.dylib`
- Windows: `nuvio_core.dll`
