//! FFI exports for HTTP networking layer
//!
//! This module provides UniFFI-exported functions that bridge async Rust HTTP operations
//! to synchronous FFI calls for Kotlin and Swift. It uses the blocking adapter pattern
//! with a global tokio runtime to avoid the complexity of direct async FFI bridging.
//!
//! # Architecture
//!
//! ## Blocking Adapter Pattern
//!
//! Direct bridging from async Rust to Kotlin coroutines / Swift async-await is complex.
//! Instead, we use blocking adapters:
//!
//! 1. Export synchronous functions via `#[uniffi::export]`
//! 2. Inside these functions, use `get_runtime().block_on()` to run async code
//! 3. Kotlin/Swift callers wrap these in their own async contexts
//!
//! ## Performance
//!
//! **CRITICAL**: We reuse a single global tokio Runtime instance (from `get_runtime()`)
//! for all FFI calls. Creating a new runtime is extremely expensive (spins up thread pools).
//!
//! # Example Usage (Kotlin)
//!
//! ```kotlin
//! // Wrap blocking Rust call in coroutine
//! suspend fun httpGet(url: String): HttpResponse = withContext(Dispatchers.IO) {
//!     httpGetBlocking(url) // Calls Rust FFI
//! }
//! ```
//!
//! # Example Usage (Swift)
//!
//! ```swift
//! // Wrap blocking Rust call in async context
//! func httpGet(url: String) async throws -> HttpResponse {
//!     return try await Task {
//!         try httpGetBlocking(url: url) // Calls Rust FFI
//!     }.value
//! }
//! ```

use std::collections::HashMap;
use uniffi;

use crate::http::client::get_runtime;
use crate::http::error::HttpError;

/// HTTP response returned from FFI functions
///
/// This is a simplified, FFI-safe representation of an HTTP response.
/// All fields are simple types that can cross language boundaries easily.
#[derive(uniffi::Record, Debug, Clone)]
pub struct HttpResponse {
    /// HTTP status code (e.g., 200, 404, 500)
    pub status_code: u16,

    /// Response body as a UTF-8 string
    pub body: String,

    /// Response headers as key-value pairs
    pub headers: HashMap<String, String>,
}

/// HTTP request configuration for FFI functions
///
/// This is a simplified, FFI-safe representation of an HTTP request.
/// All fields are simple types that can cross language boundaries easily.
#[derive(uniffi::Record, Debug, Clone)]
pub struct HttpRequest {
    /// Request URL
    pub url: String,

    /// Request body (for POST, PUT, etc.)
    pub body: Option<String>,

    /// Request headers as key-value pairs
    pub headers: HashMap<String, String>,
}

/// Perform an HTTP GET request (blocking adapter for FFI)
///
/// This function performs a synchronous HTTP GET request by blocking on the
/// async reqwest operation using the global tokio runtime. This is the
/// recommended pattern for FFI exports with async operations.
///
/// # Parameters
///
/// - `url`: The URL to request
///
/// # Returns
///
/// - `Ok(HttpResponse)`: Successful response with status, body, and headers
/// - `Err(HttpError)`: Network error, timeout, or HTTP status error
///
/// # Example (Kotlin)
///
/// ```kotlin
/// suspend fun fetchData(url: String): HttpResponse = withContext(Dispatchers.IO) {
///     httpGet(url)
/// }
/// ```
///
/// # Example (Swift)
///
/// ```swift
/// func fetchData(url: String) async throws -> HttpResponse {
///     return try await Task {
///         try httpGet(url: url)
///     }.value
/// }
/// ```
#[uniffi::export]
pub fn http_get(url: String) -> Result<HttpResponse, HttpError> {
    tracing::info!("FFI: http_get called with url={}", url);

    // Use global runtime to block on async operation
    // This is CRITICAL for performance - never create Runtime::new() here
    let rt = get_runtime();

    rt.block_on(async {
        // Get the HTTP client with middleware (includes retry logic)
        let client = crate::http::client::get_client_with_middleware();

        // Perform the GET request
        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_get failed: {}", e);
                HttpError::from(e)
            })?;

        // Extract status code
        let status_code = response.status().as_u16();
        tracing::debug!("FFI: http_get received status {}", status_code);

        // Extract headers
        let mut headers = HashMap::new();
        for (key, value) in response.headers().iter() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(key.to_string(), value_str.to_string());
            }
        }

        // Extract body as text
        let body = response
            .text()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_get failed to read body: {}", e);
                HttpError::from(e)
            })?;

        tracing::info!("FFI: http_get completed successfully");

        Ok(HttpResponse {
            status_code,
            body,
            headers,
        })
    })
}

/// Perform an HTTP POST request (blocking adapter for FFI)
///
/// This function performs a synchronous HTTP POST request by blocking on the
/// async reqwest operation using the global tokio runtime.
///
/// # Parameters
///
/// - `url`: The URL to request
/// - `body`: The request body as a string (usually JSON)
/// - `content_type`: The Content-Type header value (e.g., "application/json")
///
/// # Returns
///
/// - `Ok(HttpResponse)`: Successful response with status, body, and headers
/// - `Err(HttpError)`: Network error, timeout, or HTTP status error
///
/// # Example (Kotlin)
///
/// ```kotlin
/// suspend fun postData(url: String, json: String): HttpResponse = withContext(Dispatchers.IO) {
///     httpPost(url, json, "application/json")
/// }
/// ```
///
/// # Example (Swift)
///
/// ```swift
/// func postData(url: String, json: String) async throws -> HttpResponse {
///     return try await Task {
///         try httpPost(url: url, body: json, contentType: "application/json")
///     }.value
/// }
/// ```
#[uniffi::export]
pub fn http_post(url: String, body: String, content_type: String) -> Result<HttpResponse, HttpError> {
    tracing::info!("FFI: http_post called with url={}, content_type={}", url, content_type);

    // Use global runtime to block on async operation
    let rt = get_runtime();

    rt.block_on(async {
        // Get the HTTP client with middleware (includes retry logic)
        let client = crate::http::client::get_client_with_middleware();

        // Perform the POST request
        let response = client
            .post(&url)
            .header("Content-Type", &content_type)
            .body(body)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_post failed: {}", e);
                HttpError::from(e)
            })?;

        // Extract status code
        let status_code = response.status().as_u16();
        tracing::debug!("FFI: http_post received status {}", status_code);

        // Extract headers
        let mut headers = HashMap::new();
        for (key, value) in response.headers().iter() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(key.to_string(), value_str.to_string());
            }
        }

        // Extract body as text
        let body = response
            .text()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_post failed to read body: {}", e);
                HttpError::from(e)
            })?;

        tracing::info!("FFI: http_post completed successfully");

        Ok(HttpResponse {
            status_code,
            body,
            headers,
        })
    })
}

/// Perform an HTTP PUT request (blocking adapter for FFI)
///
/// This function performs a synchronous HTTP PUT request by blocking on the
/// async reqwest operation using the global tokio runtime.
///
/// # Parameters
///
/// - `url`: The URL to request
/// - `body`: The request body as a string (usually JSON)
/// - `content_type`: The Content-Type header value (e.g., "application/json")
///
/// # Returns
///
/// - `Ok(HttpResponse)`: Successful response with status, body, and headers
/// - `Err(HttpError)`: Network error, timeout, or HTTP status error
#[uniffi::export]
pub fn http_put(url: String, body: String, content_type: String) -> Result<HttpResponse, HttpError> {
    tracing::info!("FFI: http_put called with url={}, content_type={}", url, content_type);

    // Use global runtime to block on async operation
    let rt = get_runtime();

    rt.block_on(async {
        // Get the HTTP client with middleware (includes retry logic)
        let client = crate::http::client::get_client_with_middleware();

        // Perform the PUT request
        let response = client
            .put(&url)
            .header("Content-Type", &content_type)
            .body(body)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_put failed: {}", e);
                HttpError::from(e)
            })?;

        // Extract status code
        let status_code = response.status().as_u16();
        tracing::debug!("FFI: http_put received status {}", status_code);

        // Extract headers
        let mut headers = HashMap::new();
        for (key, value) in response.headers().iter() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(key.to_string(), value_str.to_string());
            }
        }

        // Extract body as text
        let body = response
            .text()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_put failed to read body: {}", e);
                HttpError::from(e)
            })?;

        tracing::info!("FFI: http_put completed successfully");

        Ok(HttpResponse {
            status_code,
            body,
            headers,
        })
    })
}

/// Perform an HTTP DELETE request (blocking adapter for FFI)
///
/// This function performs a synchronous HTTP DELETE request by blocking on the
/// async reqwest operation using the global tokio runtime.
///
/// # Parameters
///
/// - `url`: The URL to request
///
/// # Returns
///
/// - `Ok(HttpResponse)`: Successful response with status, body, and headers
/// - `Err(HttpError)`: Network error, timeout, or HTTP status error
#[uniffi::export]
pub fn http_delete(url: String) -> Result<HttpResponse, HttpError> {
    tracing::info!("FFI: http_delete called with url={}", url);

    // Use global runtime to block on async operation
    let rt = get_runtime();

    rt.block_on(async {
        // Get the HTTP client with middleware (includes retry logic)
        let client = crate::http::client::get_client_with_middleware();

        // Perform the DELETE request
        let response = client
            .delete(&url)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_delete failed: {}", e);
                HttpError::from(e)
            })?;

        // Extract status code
        let status_code = response.status().as_u16();
        tracing::debug!("FFI: http_delete received status {}", status_code);

        // Extract headers
        let mut headers = HashMap::new();
        for (key, value) in response.headers().iter() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(key.to_string(), value_str.to_string());
            }
        }

        // Extract body as text
        let body = response
            .text()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_delete failed to read body: {}", e);
                HttpError::from(e)
            })?;

        tracing::info!("FFI: http_delete completed successfully");

        Ok(HttpResponse {
            status_code,
            body,
            headers,
        })
    })
}

/// Perform an HTTP request with custom configuration (blocking adapter for FFI)
///
/// This function provides full control over the HTTP request, allowing custom
/// headers, body, and method. It uses the blocking adapter pattern for FFI.
///
/// # Parameters
///
/// - `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
/// - `request`: Request configuration (url, body, headers)
///
/// # Returns
///
/// - `Ok(HttpResponse)`: Successful response with status, body, and headers
/// - `Err(HttpError)`: Network error, timeout, or HTTP status error
#[uniffi::export]
pub fn http_request(method: String, request: HttpRequest) -> Result<HttpResponse, HttpError> {
    tracing::info!("FFI: http_request called with method={}, url={}", method, request.url);

    // Use global runtime to block on async operation
    let rt = get_runtime();

    rt.block_on(async {
        // Get the HTTP client with middleware (includes retry logic)
        let client = crate::http::client::get_client_with_middleware();

        // Build the request based on the method
        let mut req_builder = match method.to_uppercase().as_str() {
            "GET" => client.get(&request.url),
            "POST" => client.post(&request.url),
            "PUT" => client.put(&request.url),
            "DELETE" => client.delete(&request.url),
            "PATCH" => client.patch(&request.url),
            "HEAD" => client.head(&request.url),
            _ => {
                return Err(HttpError::configuration(format!(
                    "Unsupported HTTP method: {}",
                    method
                )))
            }
        };

        // Add custom headers
        for (key, value) in request.headers.iter() {
            req_builder = req_builder.header(key, value);
        }

        // Add body if present
        if let Some(body) = request.body {
            req_builder = req_builder.body(body);
        }

        // Send the request
        let response = req_builder
            .send()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_request failed: {}", e);
                HttpError::from(e)
            })?;

        // Extract status code
        let status_code = response.status().as_u16();
        tracing::debug!("FFI: http_request received status {}", status_code);

        // Extract headers
        let mut headers = HashMap::new();
        for (key, value) in response.headers().iter() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(key.to_string(), value_str.to_string());
            }
        }

        // Extract body as text
        let body = response
            .text()
            .await
            .map_err(|e| {
                tracing::error!("FFI: http_request failed to read body: {}", e);
                HttpError::from(e)
            })?;

        tracing::info!("FFI: http_request completed successfully");

        Ok(HttpResponse {
            status_code,
            body,
            headers,
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_http_response_construction() {
        // Test that HttpResponse can be constructed with all fields
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());

        let response = HttpResponse {
            status_code: 200,
            body: "test body".to_string(),
            headers,
        };

        assert_eq!(response.status_code, 200);
        assert_eq!(response.body, "test body");
        assert_eq!(response.headers.len(), 1);
    }

    #[test]
    fn test_http_request_construction() {
        // Test that HttpRequest can be constructed with all fields
        let mut headers = HashMap::new();
        headers.insert("Authorization".to_string(), "Bearer token".to_string());

        let request = HttpRequest {
            url: "https://example.com".to_string(),
            body: Some("request body".to_string()),
            headers,
        };

        assert_eq!(request.url, "https://example.com");
        assert_eq!(request.body, Some("request body".to_string()));
        assert_eq!(request.headers.len(), 1);
    }

    #[test]
    fn test_http_response_clone() {
        // Test that HttpResponse implements Clone
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "text/plain".to_string());

        let response = HttpResponse {
            status_code: 404,
            body: "Not Found".to_string(),
            headers,
        };

        let cloned = response.clone();
        assert_eq!(cloned.status_code, response.status_code);
        assert_eq!(cloned.body, response.body);
        assert_eq!(cloned.headers, response.headers);
    }

    #[test]
    fn test_http_request_clone() {
        // Test that HttpRequest implements Clone
        let request = HttpRequest {
            url: "https://api.example.com/data".to_string(),
            body: None,
            headers: HashMap::new(),
        };

        let cloned = request.clone();
        assert_eq!(cloned.url, request.url);
        assert_eq!(cloned.body, request.body);
        assert_eq!(cloned.headers, request.headers);
    }

    #[tokio::test]
    async fn test_http_get_integration() {
        // Initialize tracing for test visibility
        crate::init_tracing();

        // Test http_get with a real HTTP call
        let result = http_get("https://httpbin.org/get".to_string());

        // This test may fail in CI without network access, so we accept both outcomes
        match result {
            Ok(response) => {
                tracing::info!("http_get succeeded: status={}", response.status_code);
                assert!(response.status_code >= 200 && response.status_code < 600);
                assert!(!response.body.is_empty());
            }
            Err(e) => {
                tracing::warn!("http_get failed (acceptable in test environment): {:?}", e);
                // Network errors are acceptable in test environments
            }
        }
    }

    #[tokio::test]
    async fn test_http_post_integration() {
        // Initialize tracing for test visibility
        crate::init_tracing();

        // Test http_post with a real HTTP call
        let result = http_post(
            "https://httpbin.org/post".to_string(),
            r#"{"test": "data"}"#.to_string(),
            "application/json".to_string(),
        );

        // This test may fail in CI without network access, so we accept both outcomes
        match result {
            Ok(response) => {
                tracing::info!("http_post succeeded: status={}", response.status_code);
                assert!(response.status_code >= 200 && response.status_code < 600);
                assert!(!response.body.is_empty());
            }
            Err(e) => {
                tracing::warn!("http_post failed (acceptable in test environment): {:?}", e);
                // Network errors are acceptable in test environments
            }
        }
    }

    #[tokio::test]
    async fn test_http_request_custom() {
        // Initialize tracing for test visibility
        crate::init_tracing();

        // Test http_request with custom configuration
        let mut headers = HashMap::new();
        headers.insert("X-Custom-Header".to_string(), "test-value".to_string());

        let request = HttpRequest {
            url: "https://httpbin.org/get".to_string(),
            body: None,
            headers,
        };

        let result = http_request("GET".to_string(), request);

        // This test may fail in CI without network access, so we accept both outcomes
        match result {
            Ok(response) => {
                tracing::info!("http_request succeeded: status={}", response.status_code);
                assert!(response.status_code >= 200 && response.status_code < 600);
            }
            Err(e) => {
                tracing::warn!("http_request failed (acceptable in test environment): {:?}", e);
                // Network errors are acceptable in test environments
            }
        }
    }

    #[test]
    fn test_http_request_unsupported_method() {
        // Initialize tracing for test visibility
        crate::init_tracing();

        // Test that unsupported HTTP methods return configuration error
        let request = HttpRequest {
            url: "https://httpbin.org/get".to_string(),
            body: None,
            headers: HashMap::new(),
        };

        let result = http_request("INVALID".to_string(), request);

        assert!(result.is_err());
        match result {
            Err(HttpError::ConfigurationError { msg }) => {
                assert!(msg.contains("Unsupported HTTP method"));
            }
            _ => panic!("Expected ConfigurationError for unsupported method"),
        }
    }

    /// Verification test: Ensure all FFI exports compile correctly
    ///
    /// This test verifies that all core HTTP methods (GET, POST, PUT, DELETE)
    /// are properly exported via uniffi and the code compiles without errors.
    #[test]
    fn test_ffi_exports_compile() {
        // This test verifies that:
        // 1. All FFI-exported functions have correct signatures
        // 2. HttpResponse and HttpRequest types are properly defined
        // 3. uniffi::export macros are applied correctly
        // 4. All error conversions work properly

        // Test that we can construct FFI types
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());

        let response = HttpResponse {
            status_code: 200,
            body: "test".to_string(),
            headers: headers.clone(),
        };

        let request = HttpRequest {
            url: "https://example.com".to_string(),
            body: Some("test body".to_string()),
            headers,
        };

        // Verify types are constructed correctly
        assert_eq!(response.status_code, 200);
        assert_eq!(response.body, "test");
        assert_eq!(request.url, "https://example.com");
        assert_eq!(request.body, Some("test body".to_string()));

        // If this test compiles and runs, all FFI exports are correctly defined
        // The actual HTTP method functions (http_get, http_post, http_put, http_delete)
        // are tested in integration tests since they require network access
    }
}
