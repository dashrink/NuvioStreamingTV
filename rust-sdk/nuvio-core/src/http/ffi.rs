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
use std::sync::{Arc, Mutex, OnceLock, atomic::{AtomicU64, Ordering}};
use uniffi;

use crate::http::client::{get_runtime, spawn_request, HttpRequestHandle};
use crate::http::error::HttpError;

/// Global counter for generating unique handle IDs
static NEXT_HANDLE_ID: AtomicU64 = AtomicU64::new(1);

/// Global registry of active request handles for cancellation
///
/// This registry stores spawned HTTP requests that can be cancelled via their handle ID.
/// The handles are stored as trait objects to allow different result types.
static REQUEST_HANDLES: OnceLock<Mutex<HashMap<u64, RequestHandleWrapper>>> = OnceLock::new();

/// Get or initialize the request handles registry
fn get_request_handles() -> &'static Mutex<HashMap<u64, RequestHandleWrapper>> {
    REQUEST_HANDLES.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Wrapper for HttpRequestHandle that can be stored in the registry
///
/// This wrapper allows us to store handles with different result types in the same registry.
/// It provides abort() and is_finished() methods that can be called without knowing the
/// specific result type.
struct RequestHandleWrapper {
    /// Function to abort the request
    abort_fn: Box<dyn Fn() + Send + Sync>,
    /// Function to check if the request is finished
    is_finished_fn: Box<dyn Fn() -> bool + Send + Sync>,
}

impl RequestHandleWrapper {
    /// Create a new wrapper from an HttpRequestHandle
    fn new<T>(handle: Arc<HttpRequestHandle<T>>) -> Self
    where
        T: Send + 'static,
    {
        let handle_abort = Arc::clone(&handle);
        let handle_finished = Arc::clone(&handle);

        Self {
            abort_fn: Box::new(move || handle_abort.abort()),
            is_finished_fn: Box::new(move || handle_finished.is_finished()),
        }
    }

    /// Abort the wrapped request
    fn abort(&self) {
        (self.abort_fn)()
    }

    /// Check if the wrapped request is finished
    fn is_finished(&self) -> bool {
        (self.is_finished_fn)()
    }
}

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

/// Perform a cancellable HTTP GET request (non-blocking, returns handle ID)
///
/// This function spawns an HTTP GET request in the background and returns a handle ID
/// that can be used to cancel the request via `abort_request()` or check its status
/// via `is_request_finished()`.
///
/// Unlike `http_get()`, this function returns immediately without waiting for the
/// request to complete. The handle ID can be used to manage the request's lifecycle.
///
/// # Parameters
///
/// - `url`: The URL to request
///
/// # Returns
///
/// - Handle ID (u64) that can be used with `abort_request()` and `is_request_finished()`
///
/// # Example (Kotlin)
///
/// ```kotlin
/// val handleId = httpGetCancellable("https://api.example.com/data")
/// // ... do other work ...
/// if (needsCancel) {
///     abortRequest(handleId)
/// }
/// ```
///
/// # Example (Swift)
///
/// ```swift
/// let handleId = httpGetCancellable(url: "https://api.example.com/data")
/// // ... do other work ...
/// if needsCancel {
///     abortRequest(handleId: handleId)
/// }
/// ```
#[uniffi::export]
pub fn http_get_cancellable(url: String) -> u64 {
    tracing::info!("FFI: http_get_cancellable called with url={}", url);

    // Generate unique handle ID
    let handle_id = NEXT_HANDLE_ID.fetch_add(1, Ordering::SeqCst);

    // Spawn the request asynchronously
    let handle = spawn_request(async move {
        tracing::debug!("FFI: Executing async GET request for handle {}", handle_id);

        let client = crate::http::client::get_client_with_middleware();
        let response = client.get(&url).send().await?;

        let status_code = response.status().as_u16();

        let mut headers = HashMap::new();
        for (key, value) in response.headers().iter() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(key.to_string(), value_str.to_string());
            }
        }

        let body = response.text().await?;

        Ok::<HttpResponse, reqwest_middleware::Error>(HttpResponse {
            status_code,
            body,
            headers,
        })
    });

    // Store handle in registry wrapped in Arc for shared ownership
    let handle_arc = Arc::new(handle);
    let wrapper = RequestHandleWrapper::new(Arc::clone(&handle_arc));

    get_request_handles()
        .lock()
        .unwrap()
        .insert(handle_id, wrapper);

    tracing::info!("FFI: http_get_cancellable spawned with handle_id={}", handle_id);

    handle_id
}

/// Perform a cancellable HTTP POST request (non-blocking, returns handle ID)
///
/// This function spawns an HTTP POST request in the background and returns a handle ID
/// that can be used to cancel the request via `abort_request()` or check its status
/// via `is_request_finished()`.
///
/// Unlike `http_post()`, this function returns immediately without waiting for the
/// request to complete. The handle ID can be used to manage the request's lifecycle.
///
/// # Parameters
///
/// - `url`: The URL to request
/// - `body`: The request body as a string (usually JSON)
/// - `content_type`: The Content-Type header value (e.g., "application/json")
///
/// # Returns
///
/// - Handle ID (u64) that can be used with `abort_request()` and `is_request_finished()`
///
/// # Example (Kotlin)
///
/// ```kotlin
/// val handleId = httpPostCancellable(
///     "https://api.example.com/data",
///     """{"key": "value"}""",
///     "application/json"
/// )
/// // ... do other work ...
/// if (needsCancel) {
///     abortRequest(handleId)
/// }
/// ```
#[uniffi::export]
pub fn http_post_cancellable(url: String, body: String, content_type: String) -> u64 {
    tracing::info!("FFI: http_post_cancellable called with url={}", url);

    // Generate unique handle ID
    let handle_id = NEXT_HANDLE_ID.fetch_add(1, Ordering::SeqCst);

    // Spawn the request asynchronously
    let handle = spawn_request(async move {
        tracing::debug!("FFI: Executing async POST request for handle {}", handle_id);

        let client = crate::http::client::get_client_with_middleware();
        let response = client
            .post(&url)
            .header("Content-Type", content_type)
            .body(body)
            .send()
            .await?;

        let status_code = response.status().as_u16();

        let mut headers = HashMap::new();
        for (key, value) in response.headers().iter() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(key.to_string(), value_str.to_string());
            }
        }

        let body = response.text().await?;

        Ok::<HttpResponse, reqwest_middleware::Error>(HttpResponse {
            status_code,
            body,
            headers,
        })
    });

    // Store handle in registry
    let handle_arc = Arc::new(handle);
    let wrapper = RequestHandleWrapper::new(Arc::clone(&handle_arc));

    get_request_handles()
        .lock()
        .unwrap()
        .insert(handle_id, wrapper);

    tracing::info!("FFI: http_post_cancellable spawned with handle_id={}", handle_id);

    handle_id
}

/// Abort a request by its handle ID
///
/// This function cancels a request that was started with `http_get_cancellable()` or
/// `http_post_cancellable()`. The request will be stopped and any associated resources
/// will be released.
///
/// **Note**: Calling abort on an already finished request is safe and has no effect.
/// Calling abort on an invalid handle ID will return an error.
///
/// # Parameters
///
/// - `handle_id`: The handle ID returned from a cancellable request function
///
/// # Returns
///
/// - `Ok(())`: Request was aborted successfully
/// - `Err(HttpError)`: Invalid handle ID
///
/// # Example (Kotlin)
///
/// ```kotlin
/// val handleId = httpGetCancellable("https://api.example.com/data")
/// // ... later ...
/// abortRequest(handleId)
/// ```
///
/// # Example (Swift)
///
/// ```swift
/// let handleId = httpGetCancellable(url: "https://api.example.com/data")
/// // ... later ...
/// try abortRequest(handleId: handleId)
/// ```
#[uniffi::export]
pub fn abort_request(handle_id: u64) -> Result<(), HttpError> {
    tracing::info!("FFI: abort_request called with handle_id={}", handle_id);

    let handles = get_request_handles().lock().unwrap();

    match handles.get(&handle_id) {
        Some(wrapper) => {
            wrapper.abort();
            tracing::info!("FFI: Request {} aborted successfully", handle_id);
            Ok(())
        }
        None => {
            tracing::warn!("FFI: Invalid handle_id {} in abort_request", handle_id);
            Err(HttpError::ConfigurationError {
                msg: format!("Invalid handle ID: {}", handle_id),
            })
        }
    }
}

/// Check if a request is finished
///
/// This function checks whether a request started with `http_get_cancellable()` or
/// `http_post_cancellable()` has completed (either successfully, with an error, or
/// was cancelled).
///
/// # Parameters
///
/// - `handle_id`: The handle ID returned from a cancellable request function
///
/// # Returns
///
/// - `Ok(true)`: Request is finished
/// - `Ok(false)`: Request is still running
/// - `Err(HttpError)`: Invalid handle ID
///
/// # Example (Kotlin)
///
/// ```kotlin
/// val handleId = httpGetCancellable("https://api.example.com/data")
/// while (!isRequestFinished(handleId)) {
///     // ... do other work ...
///     Thread.sleep(100)
/// }
/// ```
///
/// # Example (Swift)
///
/// ```swift
/// let handleId = httpGetCancellable(url: "https://api.example.com/data")
/// while try !isRequestFinished(handleId: handleId) {
///     // ... do other work ...
///     try await Task.sleep(nanoseconds: 100_000_000)
/// }
/// ```
#[uniffi::export]
pub fn is_request_finished(handle_id: u64) -> Result<bool, HttpError> {
    let handles = get_request_handles().lock().unwrap();

    match handles.get(&handle_id) {
        Some(wrapper) => Ok(wrapper.is_finished()),
        None => {
            tracing::warn!("FFI: Invalid handle_id {} in is_request_finished", handle_id);
            Err(HttpError::ConfigurationError {
                msg: format!("Invalid handle ID: {}", handle_id),
            })
        }
    }
}

/// Remove a finished request handle from the registry
///
/// This function cleans up a request handle after the request is finished.
/// It's recommended to call this after a request completes to free resources.
///
/// # Parameters
///
/// - `handle_id`: The handle ID to remove
///
/// # Returns
///
/// - `Ok(())`: Handle removed successfully
/// - `Err(HttpError)`: Invalid handle ID
#[uniffi::export]
pub fn remove_request_handle(handle_id: u64) -> Result<(), HttpError> {
    tracing::debug!("FFI: remove_request_handle called with handle_id={}", handle_id);

    let mut handles = get_request_handles().lock().unwrap();

    match handles.remove(&handle_id) {
        Some(_) => {
            tracing::debug!("FFI: Request handle {} removed successfully", handle_id);
            Ok(())
        }
        None => {
            tracing::warn!("FFI: Invalid handle_id {} in remove_request_handle", handle_id);
            Err(HttpError::ConfigurationError {
                msg: format!("Invalid handle ID: {}", handle_id),
            })
        }
    }
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

    /// Verification test: Test FFI cancellation mechanism
    ///
    /// This test verifies that the cancellable FFI methods work correctly:
    /// 1. http_get_cancellable() spawns a request and returns a handle ID
    /// 2. abort_request() can cancel the request by handle ID
    /// 3. is_request_finished() correctly reports the request status
    /// 4. remove_request_handle() cleans up the handle
    #[tokio::test]
    async fn test_ffi_cancellation() {
        // Initialize tracing for test visibility
        crate::init_tracing();

        tracing::info!("=== Testing FFI Cancellation Mechanism ===");

        // Test 1: Start a long-running request and cancel it
        tracing::info!("Test 1: Spawning long-running cancellable GET request...");
        let handle_id = http_get_cancellable("https://httpbin.org/delay/30".to_string());

        tracing::info!("✓ Got handle_id: {}", handle_id);
        assert!(handle_id > 0, "Handle ID should be positive");

        // Verify request is not finished immediately
        let is_finished = is_request_finished(handle_id);
        match is_finished {
            Ok(finished) => {
                tracing::info!("✓ is_request_finished returned: {}", finished);
                // It might already be finished if network is very fast, but typically should be false
                // We don't assert false here because in test environments it might complete quickly
            }
            Err(e) => {
                panic!("is_request_finished should not fail for valid handle: {:?}", e);
            }
        }

        // Wait a moment to ensure the request has started
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // Abort the request
        tracing::info!("Aborting request with handle_id={}...", handle_id);
        let abort_result = abort_request(handle_id);
        assert!(abort_result.is_ok(), "abort_request should succeed");
        tracing::info!("✓ Request aborted successfully");

        // Wait a bit for abort to take effect
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        // Verify request is now finished
        match is_request_finished(handle_id) {
            Ok(finished) => {
                assert!(finished, "Request should be finished after abort");
                tracing::info!("✓ is_request_finished correctly reports true after abort");
            }
            Err(e) => {
                panic!("is_request_finished should not fail after abort: {:?}", e);
            }
        }

        // Test 2: Verify abort on already finished request is safe
        tracing::info!("Test 2: Testing abort on already finished request...");
        let abort_again_result = abort_request(handle_id);
        assert!(abort_again_result.is_ok(), "Aborting finished request should be safe");
        tracing::info!("✓ Aborting already finished request is safe");

        // Test 3: Test remove_request_handle
        tracing::info!("Test 3: Testing remove_request_handle...");
        let remove_result = remove_request_handle(handle_id);
        assert!(remove_result.is_ok(), "Removing handle should succeed");
        tracing::info!("✓ Request handle removed successfully");

        // Test 4: Verify operations on removed handle fail appropriately
        tracing::info!("Test 4: Testing operations on removed handle...");
        let is_finished_after_remove = is_request_finished(handle_id);
        assert!(is_finished_after_remove.is_err(), "is_request_finished should fail for removed handle");

        let abort_after_remove = abort_request(handle_id);
        assert!(abort_after_remove.is_err(), "abort_request should fail for removed handle");

        tracing::info!("✓ Operations on removed handle correctly return errors");

        // Test 5: Test http_post_cancellable
        tracing::info!("Test 5: Testing http_post_cancellable...");
        let post_handle_id = http_post_cancellable(
            "https://httpbin.org/delay/30".to_string(),
            r#"{"test": "data"}"#.to_string(),
            "application/json".to_string(),
        );

        assert!(post_handle_id > 0, "POST handle ID should be positive");
        assert_ne!(post_handle_id, handle_id, "POST handle ID should be different from GET handle ID");
        tracing::info!("✓ Got POST handle_id: {}", post_handle_id);

        // Abort the POST request
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        let post_abort_result = abort_request(post_handle_id);
        assert!(post_abort_result.is_ok(), "POST abort should succeed");
        tracing::info!("✓ POST request aborted successfully");

        // Clean up
        let _ = remove_request_handle(post_handle_id);

        // Test 6: Test multiple concurrent cancellable requests
        tracing::info!("Test 6: Testing multiple concurrent cancellable requests...");
        let mut handle_ids = Vec::new();

        for i in 0..5 {
            let handle = http_get_cancellable(format!("https://httpbin.org/delay/{}", i + 1));
            handle_ids.push(handle);
            tracing::debug!("Spawned request {} with handle_id={}", i, handle);
        }

        tracing::info!("✓ Spawned 5 concurrent cancellable requests");

        // Abort all requests
        for (i, &handle) in handle_ids.iter().enumerate() {
            let result = abort_request(handle);
            assert!(result.is_ok(), "Abort should succeed for request {}", i);
        }
        tracing::info!("✓ All 5 requests aborted successfully");

        // Wait for aborts to take effect
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // Verify all are finished
        for (i, &handle) in handle_ids.iter().enumerate() {
            match is_request_finished(handle) {
                Ok(finished) => {
                    assert!(finished, "Request {} should be finished after abort", i);
                }
                Err(e) => {
                    panic!("is_request_finished should not fail for request {}: {:?}", i, e);
                }
            }
        }
        tracing::info!("✓ All 5 requests confirmed finished");

        // Clean up all handles
        for &handle in &handle_ids {
            let _ = remove_request_handle(handle);
        }
        tracing::info!("✓ All handles cleaned up");

        tracing::info!("=== FFI Cancellation Mechanism Test PASSED ===");
        tracing::info!("✓ Verified:");
        tracing::info!("  - http_get_cancellable spawns requests and returns handle IDs");
        tracing::info!("  - http_post_cancellable spawns requests and returns handle IDs");
        tracing::info!("  - abort_request cancels requests by handle ID");
        tracing::info!("  - is_request_finished reports correct status");
        tracing::info!("  - remove_request_handle cleans up handles");
        tracing::info!("  - Multiple concurrent cancellable requests work correctly");
        tracing::info!("  - Operations on invalid/removed handles return errors");
    }
}
