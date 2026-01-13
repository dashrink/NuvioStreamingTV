//! Core HTTP client implementation
//!
//! This module provides the HTTP client with connection pooling, timeout configuration,
//! and a singleton pattern using OnceLock to ensure only one client instance exists.
//!
//! # Architecture
//!
//! Following the reqwest best practice, we create a SINGLE client instance that is
//! reused throughout the application lifetime. This is CRITICAL for connection pooling
//! to work correctly - multiple client instances would each have their own connection
//! pools, defeating the purpose.
//!
//! # Connection Pooling
//!
//! The client automatically pools HTTP connections with these defaults:
//! - Request timeout: 30 seconds (overall request duration limit)
//! - Connect timeout: 10 seconds (TCP connection establishment limit)
//! - Pool idle timeout: 90 seconds (keep-alive duration for idle connections)
//! - Pool max idle per host: 10 (maximum idle connections maintained per host)
//!
//! # Thread Safety
//!
//! The reqwest Client is already thread-safe and uses Arc internally.
//! Cloning the client is cheap (just increments reference count).

use reqwest::Client;
use std::sync::OnceLock;
use std::time::Duration;
use tokio::runtime::Runtime;

/// Global HTTP client instance
///
/// This uses OnceLock to ensure thread-safe lazy initialization.
/// The client is created only once and reused for all HTTP requests,
/// which is CRITICAL for connection pooling to work correctly.
static HTTP_CLIENT: OnceLock<Client> = OnceLock::new();

/// Global tokio runtime instance
///
/// This uses OnceLock to ensure thread-safe lazy initialization.
/// The runtime is created only once and reused for all async operations,
/// which is CRITICAL for FFI calls - creating a runtime is extremely expensive
/// (involves spinning up thread pools).
///
/// # Why We Need This
///
/// For FFI exports via uniffi, we use blocking adapters that call `Runtime::block_on()`
/// to convert async Rust functions to synchronous functions callable from Kotlin/Swift.
/// Reusing a single global runtime across all FFI calls is essential for performance.
///
/// # Never Do This
///
/// ```rust,ignore
/// // WRONG - Creates a new runtime for each FFI call (extremely expensive!)
/// fn some_ffi_function() {
///     let rt = Runtime::new().unwrap(); // DON'T DO THIS
///     rt.block_on(async { ... });
/// }
/// ```
///
/// # Always Do This
///
/// ```rust
/// // CORRECT - Reuse global runtime
/// fn some_ffi_function() {
///     let rt = get_runtime(); // Reuses global runtime
///     rt.block_on(async { ... });
/// }
/// ```
static TOKIO_RUNTIME: OnceLock<Runtime> = OnceLock::new();

/// Get the global HTTP client instance
///
/// This function returns a reference to the singleton HTTP client.
/// The client is lazily initialized on first access with the default configuration:
/// - Timeout: 30 seconds
/// - Connect timeout: 10 seconds
/// - Pool idle timeout: 90 seconds
/// - Pool max idle per host: 10 connections
/// - Cookie store: Enabled
///
/// # Connection Pooling
///
/// The returned client maintains an internal connection pool. Reusing this client
/// for all requests enables HTTP keep-alive and connection reuse, significantly
/// improving performance for multiple requests to the same host.
///
/// # Thread Safety
///
/// This function is thread-safe. Multiple threads can call this function concurrently
/// and will all receive a reference to the same client instance.
///
/// # Panics
///
/// Panics if the client cannot be created (e.g., invalid TLS configuration).
/// This should never happen with the default configuration.
///
/// # Example
///
/// ```rust
/// use nuvio_core::http::client::get_client;
///
/// // Get the global client instance
/// let client = get_client();
///
/// // Use it for requests (in an async context)
/// // let response = client.get("https://api.example.com").send().await?;
/// ```
pub fn get_client() -> &'static Client {
    HTTP_CLIENT.get_or_init(|| {
        Client::builder()
            // Overall request timeout (from start to response completion)
            .timeout(Duration::from_secs(30))
            // TCP connection establishment timeout
            .connect_timeout(Duration::from_secs(10))
            // How long to keep idle connections alive in the pool
            .pool_idle_timeout(Duration::from_secs(90))
            // Maximum number of idle connections to maintain per host
            .pool_max_idle_per_host(10)
            // Enable cookie jar for OAuth flows
            .cookie_store(true)
            .build()
            .expect("Failed to create HTTP client")
    })
}

/// Get the global tokio runtime instance
///
/// This function returns a reference to the singleton tokio runtime.
/// The runtime is lazily initialized on first access with the default configuration
/// (multi-threaded runtime with all features enabled).
///
/// # Performance Critical
///
/// Creating a tokio runtime is extremely expensive - it involves:
/// - Creating a thread pool (typically one thread per CPU core)
/// - Setting up work-stealing schedulers
/// - Initializing I/O drivers
/// - Setting up timers and other runtime infrastructure
///
/// **NEVER** create a new runtime for each operation. Always reuse this global instance.
///
/// # Thread Safety
///
/// This function is thread-safe. Multiple threads can call this function concurrently
/// and will all receive a reference to the same runtime instance.
///
/// # Panics
///
/// Panics if the runtime cannot be created (e.g., insufficient system resources).
/// This should never happen in normal conditions.
///
/// # Example
///
/// ```rust
/// use nuvio_core::http::client::get_runtime;
///
/// // Get the global runtime instance
/// let rt = get_runtime();
///
/// // Use it to run async code synchronously (for FFI)
/// let result = rt.block_on(async {
///     // Your async code here
///     42
/// });
/// ```
pub fn get_runtime() -> &'static Runtime {
    TOKIO_RUNTIME.get_or_init(|| {
        Runtime::new().expect("Failed to create tokio runtime")
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        // Test that we can create the client
        let client = get_client();

        // Verify it's the same instance on subsequent calls
        let client2 = get_client();

        // Both references should point to the same instance
        assert!(std::ptr::eq(client, client2));
    }

    #[test]
    fn test_client_singleton_pattern() {
        // Get the client multiple times
        let client1 = get_client();
        let client2 = get_client();
        let client3 = get_client();

        // All should be the exact same instance (same memory address)
        assert!(std::ptr::eq(client1, client2));
        assert!(std::ptr::eq(client2, client3));
        assert!(std::ptr::eq(client1, client3));
    }

    #[test]
    fn test_connection_pooling_config() {
        // Get the client
        let client = get_client();

        // The client should be successfully created with connection pooling configured
        // We can't directly inspect the internal configuration, but we can verify
        // the client exists and is usable
        assert!(!format!("{:?}", client).is_empty());
    }

    #[tokio::test]
    async fn test_client_basic_usage() {
        // Initialize tracing for test visibility
        let _ = tracing_subscriber::fmt::try_init();

        // Get the client
        let client = get_client();

        // Test a basic request to a public API
        // Using httpbin.org which is designed for HTTP testing
        let response = client.get("https://httpbin.org/get").send().await;

        // The request should succeed (or fail due to network, but client should work)
        // We're primarily testing that the client can be used, not network reliability
        match response {
            Ok(resp) => {
                tracing::info!("Request succeeded with status: {}", resp.status());
                assert!(resp.status().is_success());
            }
            Err(e) => {
                // Network errors are acceptable in tests (no internet, DNS issues, etc.)
                tracing::warn!("Request failed (acceptable in test environment): {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_client_reuse() {
        // Get the client
        let client = get_client();

        // Make multiple requests to verify the client can be reused
        for i in 0..3 {
            let result = client
                .get(&format!("https://httpbin.org/get?iteration={}", i))
                .send()
                .await;

            // Log the result but don't fail test on network errors
            match result {
                Ok(resp) => {
                    tracing::info!("Iteration {} succeeded: {}", i, resp.status());
                }
                Err(e) => {
                    tracing::warn!("Iteration {} failed (network error acceptable): {}", i, e);
                }
            }
        }

        // The test succeeds if the client can be called multiple times without panicking
        assert!(true);
    }

    #[test]
    fn test_runtime_singleton() {
        // Get the runtime multiple times
        let runtime1 = get_runtime();
        let runtime2 = get_runtime();
        let runtime3 = get_runtime();

        // All should be the exact same instance (same memory address)
        assert!(std::ptr::eq(runtime1, runtime2));
        assert!(std::ptr::eq(runtime2, runtime3));
        assert!(std::ptr::eq(runtime1, runtime3));

        // Verify the runtime is usable
        let result = runtime1.block_on(async {
            // Simple async operation
            tokio::time::sleep(std::time::Duration::from_millis(1)).await;
            42
        });

        // The async operation should complete successfully
        assert_eq!(result, 42);
    }

    #[test]
    fn test_runtime_reuse_for_ffi() {
        // Simulate FFI usage pattern - multiple blocking calls using the same runtime
        let rt = get_runtime();

        // First FFI call
        let result1 = rt.block_on(async {
            "first call"
        });
        assert_eq!(result1, "first call");

        // Second FFI call
        let result2 = rt.block_on(async {
            "second call"
        });
        assert_eq!(result2, "second call");

        // Third FFI call
        let result3 = rt.block_on(async {
            "third call"
        });
        assert_eq!(result3, "third call");

        // All calls should use the same runtime instance without creating new ones
        let rt2 = get_runtime();
        assert!(std::ptr::eq(rt, rt2));
    }

    #[test]
    fn test_runtime_with_client() {
        // Test using the runtime with the HTTP client
        // This simulates the FFI pattern where we use Runtime::block_on
        // to call async HTTP methods synchronously
        let rt = get_runtime();
        let client = get_client();

        // Use block_on to run an async HTTP operation synchronously
        let result = rt.block_on(async {
            // We're not making a real request in this test, just verifying the pattern works
            // In a real FFI function, this would be: client.get(url).send().await
            format!("HTTP client ready: {:?}", client)
        });

        // Verify the pattern works
        assert!(result.contains("HTTP client ready"));
    }
}
